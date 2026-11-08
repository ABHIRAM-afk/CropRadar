import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistance,
  encodeGeohash,
  filterReportsWithinRadius,
  evaluateSprayWeather,
  checkChemicalResistance,
  resolveDomainDiseaseProfile,
  findFarmsWithinAlertRadius,
  evaluateBiologicalHostRelevance,
  isMatchScoreEligibleForAlert,
  formatApproximateDistance,
  calculatePesticideQuantity,
  type WeatherCondition,
  type TreatmentRecord,
  type DiseaseReport,
} from './agriculturalLogic';

test('calculateHaversineDistance computes accurate distance between farm points', () => {
  const dist = calculateHaversineDistance(16.3067, 80.4365, 16.5062, 80.648);
  assert.ok(dist >= 30 && dist <= 35, `Expected 30-35km, got ${dist}`);
  assert.equal(calculateHaversineDistance(16.3, 80.4, 16.3, 80.4), 0);
});

test('encodeGeohash generates correct base32 geohash string', () => {
  const hash = encodeGeohash(16.3067, 80.4365, 6);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 6);
  assert.match(hash, /^[0-9bcdefghjkmnpqrstuvwxyz]+$/);
});

test('filterReportsWithinRadius filters and sorts reports within radius', () => {
  const farmLat = 16.3;
  const farmLon = 80.4;
  const reports: DiseaseReport[] = [
    {
      id: 'rep-1',
      crop: 'Chilli',
      diseaseName: 'Chilli Leaf Curl',
      diseaseCategory: 'viral',
      latitude: 16.32,
      longitude: 80.41, // ~2.5km
      timestamp: '2026-11-04T10:00:00Z',
      severity: 'moderate',
      generalizedLocation: 'Prathipadu Sector',
      symptoms: 'Curling and mottling',
    },
    {
      id: 'rep-2',
      crop: 'Cotton',
      diseaseName: 'Bollworm Infestation',
      diseaseCategory: 'pest',
      latitude: 17.5,
      longitude: 81.5, // ~150km away
      timestamp: '2026-11-04T09:00:00Z',
      severity: 'severe',
      generalizedLocation: 'Remote Sector',
      symptoms: 'Boll shedding',
    },
  ];

  const nearby = filterReportsWithinRadius(farmLat, farmLon, reports, 10);
  assert.equal(nearby.length, 1);
  assert.equal(nearby[0].id, 'rep-1');
  assert.ok(nearby[0].distanceKm! < 5);
});

test('evaluateSprayWeather detects high wind spray drift risk', () => {
  const windyWeather: WeatherCondition = {
    temperatureC: 28,
    humidityPercent: 65,
    windSpeedKmH: 22, // exceeds 18 km/h limit
    rainProbabilityPercent: 10,
    expectedRainfallMm: 0,
    description: 'Breezy and partly cloudy',
  };

  const evaluation = evaluateSprayWeather(windyWeather);
  assert.equal(evaluation.isSafeToSpray, false);
  assert.equal(evaluation.driftRisk, 'high');
  assert.equal(evaluation.status, 'unsafe');
  assert.ok(evaluation.reasons.some((r) => r.includes('wind speed')));
});

test('evaluateSprayWeather detects rain wash-off risk', () => {
  const rainyWeather: WeatherCondition = {
    temperatureC: 25,
    humidityPercent: 88,
    windSpeedKmH: 8,
    rainProbabilityPercent: 70,
    expectedRainfallMm: 3.5,
    description: 'Scattered thunderstorms expected',
  };

  const evaluation = evaluateSprayWeather(rainyWeather);
  assert.equal(evaluation.isSafeToSpray, false);
  assert.equal(evaluation.rainfastRisk, 'high');
  assert.equal(evaluation.status, 'unsafe');
  assert.ok(evaluation.recommendations.some((rec) => rec.includes('dry window')));
});

test('evaluateSprayWeather passes on optimal agricultural weather', () => {
  const optimalWeather: WeatherCondition = {
    temperatureC: 24,
    humidityPercent: 60,
    windSpeedKmH: 7,
    rainProbabilityPercent: 5,
    expectedRainfallMm: 0,
    description: 'Clear calm skies',
  };

  const evaluation = evaluateSprayWeather(optimalWeather);
  assert.equal(evaluation.isSafeToSpray, true);
  assert.equal(evaluation.status, 'optimal');
  assert.equal(evaluation.driftRisk, 'low');
  assert.equal(evaluation.rainfastRisk, 'low');
});

test('checkChemicalResistance flags repeated application of same MoA group', () => {
  const history: TreatmentRecord[] = [
    {
      id: 'tx-1',
      productName: 'Amistar 250 SC',
      activeIngredient: 'Azoxystrobin',
      moaCode: 'FRAC 11',
      crop: 'Chilli',
      targetOrganism: 'Anthracnose',
      applicationDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'tx-2',
      productName: 'Cabrio Top',
      activeIngredient: 'Pyraclostrobin + Metiram',
      moaCode: 'FRAC 11',
      crop: 'Chilli',
      targetOrganism: 'Dieback',
      applicationDate: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  const proposedProduct = {
    productName: 'Custodia',
    activeIngredient: 'Azoxystrobin + Tebuconazole',
    moaCode: 'FRAC 11',
    crop: 'Chilli',
  };

  const warning = checkChemicalResistance(proposedProduct, history, 30);
  assert.equal(warning.hasWarning, true);
  assert.equal(warning.severity, 'high');
  assert.ok(warning.recentMatchingApplications.length >= 2);
  assert.ok(warning.recommendedAlternates.length > 0);
  assert.ok(warning.recommendedAlternates[0].includes('FRAC 3'));
});

test('resolveDomainDiseaseProfile accurately resolves distinct disease per crop', () => {
  const rice = resolveDomainDiseaseProfile('Spindle shaped lesions on paddy leaves', 'Paddy / Rice');
  assert.equal(rice.crop.nameEn, 'Paddy / Rice (Oryza sativa)');
  assert.equal(rice.diagnosisOrProduct.titleEn, 'Rice Leaf Blast (Magnaporthe oryzae)');
  assert.equal(rice.diagnosisOrProduct.category, 'fungal');
  assert.ok(rice.diagnosisOrProduct.aiMatchScore! > 0.700);

  const cotton = resolveDomainDiseaseProfile('Nibbles and holes on cotton squares', 'Cotton');
  assert.equal(cotton.crop.nameEn, 'Cotton (Gossypium hirsutum)');
  assert.ok(cotton.diagnosisOrProduct.titleEn.includes('Bollworm'));
  assert.equal(cotton.diagnosisOrProduct.category, 'pest');
  assert.ok(cotton.diagnosisOrProduct.aiMatchScore! > 0.700);

  const pesticide = resolveDomainDiseaseProfile('Analyze this pesticide label bottle', 'Chilli');
  assert.equal(pesticide.analysisType, 'pesticide_label');
  assert.ok(pesticide.diagnosisOrProduct.titleEn.includes('Azoxystrobin'));
});

test('findFarmsWithinAlertRadius identifies all farms within 5km of outbreak', () => {
  const outbreakLat = 16.3067;
  const outbreakLon = 80.4365;

  const sampleFarms = [
    {
      id: 'f1',
      farmerName: 'Venkat',
      phone: '9848011111',
      latitude: 16.32,
      longitude: 80.44, // ~1.5 km
      villageSector: 'Prathipadu Sector 2',
      crops: ['Chilli', 'Cotton'],
    },
    {
      id: 'f2',
      farmerName: 'Subba Rao',
      phone: '9848022222',
      latitude: 16.34,
      longitude: 80.45, // ~4.0 km
      villageSector: 'Guntur Rural South',
      crops: ['Paddy'],
    },
    {
      id: 'f3',
      farmerName: 'Ramesh',
      phone: '9848033333',
      latitude: 16.50,
      longitude: 80.64, // ~31 km
      villageSector: 'Vijayawada Outskirts',
      crops: ['Paddy'],
    },
  ];

  const nearby = findFarmsWithinAlertRadius(outbreakLat, outbreakLon, sampleFarms, 5);
  assert.equal(nearby.length, 2);
  assert.equal(nearby[0].id, 'f1');
  assert.equal(nearby[1].id, 'f2');
});

test('evaluateBiologicalHostRelevance distinguishes direct pathogen host vs insect vector reservoir host', () => {
  // 1. Chilli farmer -> direct pathogen host of Chilli Leaf Curl
  const chilliResult = evaluateBiologicalHostRelevance('Chilli Leaf Curl Begomovirus', 'Chilli');
  assert.equal(chilliResult.relevance, 'direct_host');
  assert.ok(chilliResult.explanationEn.includes('primary susceptible biological host'));

  // 2. Cotton farmer -> vector breeding host (whitefly reservoir) of Chilli Leaf Curl
  const cottonResult = evaluateBiologicalHostRelevance('Chilli Leaf Curl Begomovirus', 'Cotton');
  assert.equal(cottonResult.relevance, 'vector_host');
  assert.ok(chilliResult.matchedProfile?.vectorOrganism !== undefined);
  assert.ok(cottonResult.explanationEn.includes('vector breeding host'));

  // 3. Paddy farmer -> not a host for Chilli Leaf Curl
  const paddyResult = evaluateBiologicalHostRelevance('Chilli Leaf Curl Begomovirus', 'Paddy');
  assert.equal(paddyResult.relevance, 'general_notice');

  // 4. Unknown crop -> general notice without claiming susceptibility
  const unknownResult = evaluateBiologicalHostRelevance('Chilli Leaf Curl Begomovirus', null);
  assert.equal(unknownResult.relevance, 'general_notice');
});

test('isMatchScoreEligibleForAlert strictly gates at > 0.700', () => {
  assert.equal(isMatchScoreEligibleForAlert(0.701), true);
  assert.equal(isMatchScoreEligibleForAlert(0.85), true);
  assert.equal(isMatchScoreEligibleForAlert(0.700), false);
  assert.equal(isMatchScoreEligibleForAlert(0.699), false);
  assert.equal(isMatchScoreEligibleForAlert(undefined), false);
  assert.equal(isMatchScoreEligibleForAlert(NaN), false);
});

test('formatApproximateDistance labels distance from sector centroid as approximate', () => {
  const labelEn = formatApproximateDistance(3.24, 'sector_centroid', 'Prathipadu Block', 'en');
  assert.ok(labelEn.includes('Approximate distance'));
  assert.ok(labelEn.includes('~3.2 km'));
  assert.ok(labelEn.includes('Prathipadu Block centroid'));

  const labelTe = formatApproximateDistance(3.24, 'sector_centroid', 'ప్రత్తిపాడు', 'te');
  assert.ok(labelTe.includes('సుమారు దూరం'));
  assert.ok(labelTe.includes('~3.2 కి.మీ'));
});

test('calculatePesticideQuantity calculates for treated area only when verified', () => {
  // Label verified for Chilli: 200 ml/acre, 200 L water
  const verifiedCalc = calculatePesticideQuantity(200, 200, 2.5, true);
  assert.equal(verifiedCalc.isCalculable, true);
  assert.equal(verifiedCalc.totalChemicalText, '500 ml / g');
  assert.equal(verifiedCalc.totalWaterLiters, 500);

  // Unverified dosage -> does not calculate, provides warning
  const unverifiedCalc = calculatePesticideQuantity(200, 200, 2.5, false);
  assert.equal(unverifiedCalc.isCalculable, false);
  assert.equal(unverifiedCalc.totalWaterLiters, 0);
  assert.ok(unverifiedCalc.warningNoticeEn?.includes('Never guess dilution rates'));
});
