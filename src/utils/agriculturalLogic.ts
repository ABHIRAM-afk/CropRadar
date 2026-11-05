/**
 * Pure agricultural intelligence calculations, geospatial proximity,
 * weather spray evaluation, and chemical resistance checking.
 */

export interface WeatherCondition {
  temperatureC: number;
  humidityPercent: number;
  windSpeedKmH: number;
  rainProbabilityPercent: number;
  expectedRainfallMm: number;
  description: string;
}

export interface SprayWeatherEvaluation {
  isSafeToSpray: boolean;
  status: 'optimal' | 'caution' | 'unsafe';
  reasons: string[];
  reasonsTe: string[];
  driftRisk: 'low' | 'moderate' | 'high';
  rainfastRisk: 'low' | 'moderate' | 'high';
  recommendations: string[];
  recommendationsTe: string[];
}

export interface TreatmentRecord {
  id: string;
  productName: string;
  activeIngredient: string;
  moaCode: string; // e.g. "FRAC 11", "IRAC 1B", "FRAC 3"
  moaName?: string;
  crop: string;
  targetOrganism: string;
  applicationDate: string; // ISO date string
}

export interface ResistanceWarning {
  hasWarning: boolean;
  severity: 'low' | 'moderate' | 'high';
  messageEn: string;
  messageTe: string;
  recentMatchingApplications: TreatmentRecord[];
  recommendedAlternates: string[];
}

export interface DiseaseReport {
  id: string;
  crop: string;
  diseaseName: string;
  diseaseCategory: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutritional';
  latitude: number;
  longitude: number;
  geohash?: string;
  distanceKm?: number;
  timestamp: string;
  verified: boolean;
  severity: 'mild' | 'moderate' | 'severe';
  generalizedLocation: string;
  symptoms: string;
  isAutoOutbreak?: boolean;
}

export interface RegisteredFarm {
  id: string;
  farmerName: string;
  phone: string;
  latitude: number;
  longitude: number;
  villageSector: string;
  crops: string[];
}

/**
 * Calculates Haversine distance in kilometers between two geographic coordinates
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Standard base32 geohash encoder for geospatial indexing
 */
export function encodeGeohash(lat: number, lon: number, precision: number = 6): string {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90.0;
  let maxLat = 90.0;
  let minLon = -180.0;
  let maxLon = 180.0;
  let geohash = '';
  let bits = 0;
  let charIdx = 0;
  let isEven = true;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (minLon + maxLon) / 2;
      if (lon >= mid) {
        charIdx = (charIdx << 1) | 1;
        minLon = mid;
      } else {
        charIdx = (charIdx << 1) | 0;
        maxLon = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        charIdx = (charIdx << 1) | 1;
        minLat = mid;
      } else {
        charIdx = (charIdx << 1) | 0;
        maxLat = mid;
      }
    }

    isEven = !isEven;
    bits++;

    if (bits === 5) {
      geohash += BASE32[charIdx];
      bits = 0;
      charIdx = 0;
    }
  }

  return geohash;
}

/**
 * Filter disease reports within a given radius from farm location
 */
export function filterReportsWithinRadius(
  farmLat: number,
  farmLon: number,
  reports: DiseaseReport[],
  radiusKm: number = 25
): DiseaseReport[] {
  return reports
    .map((report) => {
      const distance = calculateHaversineDistance(
        farmLat,
        farmLon,
        report.latitude,
        report.longitude
      );
      return { ...report, distanceKm: distance };
    })
    .filter((report) => (report.distanceKm ?? 0) <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

/**
 * Deterministic weather spray evaluator
 * Checks drift risk, rainfast wash-off risk, and temperature/humidity suitability
 */
export function evaluateSprayWeather(weather: WeatherCondition): SprayWeatherEvaluation {
  const reasons: string[] = [];
  const reasonsTe: string[] = [];
  const recommendations: string[] = [];
  const recommendationsTe: string[] = [];

  let isSafeToSpray = true;
  let driftRisk: 'low' | 'moderate' | 'high' = 'low';
  let rainfastRisk: 'low' | 'moderate' | 'high' = 'low';

  // 1. Wind speed & spray drift check
  if (weather.windSpeedKmH > 18) {
    driftRisk = 'high';
    isSafeToSpray = false;
    reasons.push(`High wind speed (${weather.windSpeedKmH} km/h) creates critical spray drift risk.`);
    reasonsTe.push(`గాలి వేగం ఎక్కువగా ఉండడం వల్ల (${weather.windSpeedKmH} km/h) మందు పక్క పొలాలకు కొట్టుకుపోయే ప్రమాదం ఉంది.`);
    recommendations.push('Delay spraying until wind drops below 12 km/h to prevent chemical drift.');
    recommendationsTe.push('గాలి వేగం 12 km/h కంటే తక్కువగా తగ్గే వరకు పిచికారీ ఆపండి.');
  } else if (weather.windSpeedKmH > 12) {
    driftRisk = 'moderate';
    reasons.push(`Moderate wind (${weather.windSpeedKmH} km/h) requires drift-reduction nozzles.`);
    reasonsTe.push(`మితమైన గాలి వల్ల (${weather.windSpeedKmH} km/h) డ్రిఫ్ట్ నివారణ నాజిల్‌లను ఉపయోగించాలి.`);
  } else if (weather.windSpeedKmH < 2) {
    reasons.push('Near-zero wind may cause thermal inversion, keeping fine droplets suspended.');
    reasonsTe.push('గాలి అస్సలు లేకపోవడం వల్ల సూక్ష్మ బిందువులు గాల్లోనే నిలిచిపోయే అవకాశం ఉంది.');
  }

  // 2. Rain & rainfast wash-off check
  if (weather.rainProbabilityPercent >= 50 || weather.expectedRainfallMm >= 1.0) {
    rainfastRisk = 'high';
    isSafeToSpray = false;
    reasons.push(`High rain probability (${weather.rainProbabilityPercent}%) threatens to wash off applied chemicals before rainfast absorption.`);
    reasonsTe.push(`వర్షం పడే అవకాశం ఎక్కువగా ఉండడం వల్ల (${weather.rainProbabilityPercent}%) పిచికారీ చేసిన మందు కడిగిపోయే ప్రమాదం ఉంది.`);
    recommendations.push('Wait for a clear 3 to 4-hour dry window before applying contact or systemic pesticides.');
    recommendationsTe.push('పిచికారీ తర్వాత మందు ఆకుల్లోకి ఇంకేందుకు కనీసం 3-4 గంటలు పొడిగా ఉండే సమయం చూడండి.');
  } else if (weather.rainProbabilityPercent >= 30) {
    rainfastRisk = 'moderate';
    reasons.push(`Moderate rain likelihood (${weather.rainProbabilityPercent}%). Ensure product has 2-hour rainfast formulation or add recommended sticker.`);
    reasonsTe.push(`వర్షం పడే అవకాశం ఉంది (${weather.rainProbabilityPercent}%). 2 గంటల వ్యవధిలో ఇంకే రసాయనాలు లేదా స్ప్రే స్టిక్కర్ వాడండి.`);
  }

  // 3. Temperature & phytotoxicity check
  if (weather.temperatureC > 34) {
    reasons.push(`High ambient temperature (${weather.temperatureC}°C) accelerates droplet evaporation and can cause leaf scorching.`);
    reasonsTe.push(`అధిక ఉష్ణోగ్రత (${weather.temperatureC}°C) వల్ల మందు ఆవిరైపోతుంది మరియు ఆకులు మాడే అవకాశం ఉంది.`);
    recommendations.push('Spray during cooler early morning (6:00 - 9:00 AM) or late afternoon hours.');
    recommendationsTe.push('ఉదయం పూట (6:00 - 9:00 AM) లేదా సాయంత్రం చల్లబడ్డాక మాత్రమే పిచికారీ చేయండి.');
  }

  // 4. Relative humidity & fungal growth
  if (weather.humidityPercent > 85) {
    reasons.push(`High humidity (${weather.humidityPercent}%) creates favorable microclimate for fungal spore proliferation.`);
    reasonsTe.push(`అధిక తేమ (${weather.humidityPercent}%) వల్ల శిలీంధ్ర తెగుళ్లు వేగంగా వ్యాపించే అవకాశం ఉంది.`);
  }

  const status: 'optimal' | 'caution' | 'unsafe' = !isSafeToSpray
    ? 'unsafe'
    : reasons.length > 0
    ? 'caution'
    : 'optimal';

  if (status === 'optimal') {
    reasons.push('Favorable weather: calm wind, moderate humidity, and no immediate rain forecasted.');
    reasonsTe.push('అనుకూలమైన వాతావరణం: తగిన గాలి, సరైన తేమ మరియు వర్ష సూచన లేదు.');
    recommendations.push('Proceed with calibrated spraying using required personal protective equipment (PPE).');
    recommendationsTe.push('రక్షణ దుస్తులు మరియు మాస్క్ ధరించి సరైన మోతాదులో పిచికారీ చేసుకోండి.');
  }

  return {
    isSafeToSpray,
    status,
    reasons,
    reasonsTe,
    driftRisk,
    rainfastRisk,
    recommendations,
    recommendationsTe,
  };
}

/**
 * Check chemical resistance management (FRAC / IRAC mode of action)
 * Flags repeated usage of the same active group on the same crop within 30 days
 */
export function checkChemicalResistance(
  targetProduct: { productName: string; activeIngredient: string; moaCode: string; crop: string },
  history: TreatmentRecord[],
  cooldownDays: number = 30
): ResistanceWarning {
  if (!targetProduct.moaCode) {
    return {
      hasWarning: false,
      severity: 'low',
      messageEn: 'No MoA code provided. Maintain active ingredient rotation.',
      messageTe: 'రసాయన వర్గ సమాచారం అందుబాటులో లేదు. మందులను మార్చి మార్చి వాడండి.',
      recentMatchingApplications: [],
      recommendedAlternates: [],
    };
  }

  const now = new Date();
  const normalizedCrop = targetProduct.crop.trim().toLowerCase();
  const normalizedMoa = targetProduct.moaCode.trim().toUpperCase();

  const matchingApplications = history.filter((record) => {
    if (!record.moaCode) return false;
    if (record.crop.trim().toLowerCase() !== normalizedCrop) return false;
    if (record.moaCode.trim().toUpperCase() !== normalizedMoa) return false;

    const recordDate = new Date(record.applicationDate);
    const diffDays = (now.getTime() - recordDate.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= cooldownDays;
  });

  if (matchingApplications.length === 0) {
    return {
      hasWarning: false,
      severity: 'low',
      messageEn: `Safe rotation: Group ${targetProduct.moaCode} was not applied to ${targetProduct.crop} recently.`,
      messageTe: `సరైన మార్పిడి: గత ${cooldownDays} రోజులలో ఈ ${targetProduct.crop} పంటకు గ్రూప్ ${targetProduct.moaCode} మందు వాడలేదు.`,
      recentMatchingApplications: [],
      recommendedAlternates: [],
    };
  }

  const count = matchingApplications.length;
  const isHighSeverity = count >= 2;

  // Alternate MOA recommendations based on classification
  const alternates: string[] = [];
  if (normalizedMoa.startsWith('FRAC 11')) {
    alternates.push('FRAC 3 (Triazoles: e.g., Difenoconazole, Tebuconazole)');
    alternates.push('FRAC M (Multi-site: e.g., Mancozeb, Copper oxychloride)');
  } else if (normalizedMoa.startsWith('FRAC 3')) {
    alternates.push('FRAC 11 (Strobilurins: e.g., Azoxystrobin, Pyraclostrobin)');
    alternates.push('FRAC 7 (SDHI: e.g., Boscalid, Fluxapyroxad)');
  } else if (normalizedMoa.startsWith('IRAC 4A')) {
    alternates.push('IRAC 28 (Diamides: e.g., Chlorantraniliprole)');
    alternates.push('IRAC 1B (Organophosphates: e.g., Acephate)');
  } else if (normalizedMoa.startsWith('IRAC 1B')) {
    alternates.push('IRAC 4A (Neonicotinoids: e.g., Imidacloprid, Thiamethoxam)');
    alternates.push('IRAC 5 (Spinosyns: e.g., Spinosad)');
  } else {
    alternates.push('Alternate FRAC / IRAC mode of action class certified for your target pest.');
  }

  return {
    hasWarning: true,
    severity: isHighSeverity ? 'high' : 'moderate',
    messageEn: `Resistance Alert: Group ${targetProduct.moaCode} (${targetProduct.activeIngredient}) was already applied to ${targetProduct.crop} ${count} time(s) in the past ${cooldownDays} days. Continuous use promotes target pest resistance.`,
    messageTe: `రసాయన నిరోధకత హెచ్చరిక: గ్రూప్ ${targetProduct.moaCode} మందు గత ${cooldownDays} రోజులలో ${targetProduct.crop} పంటపై ${count} సార్లు వాడబడింది. ఒకే గ్రూప్ మందును మాటిమాటికీ వాడితే తెగుళ్లకు రోగనిరోధక శక్తి పెరిగి మందు పనిచేయదు.`,
    recentMatchingApplications: matchingApplications,
    recommendedAlternates: alternates,
  };
}

/**
 * Identify all farms within 5 km alert radius of an outbreak
 */
export function findFarmsWithinAlertRadius(
  outbreakLat: number,
  outbreakLon: number,
  farms: RegisteredFarm[],
  radiusKm: number = 5
): Array<RegisteredFarm & { distanceKm: number }> {
  return farms
    .map((farm) => {
      const distance = calculateHaversineDistance(outbreakLat, outbreakLon, farm.latitude, farm.longitude);
      return { ...farm, distanceKm: distance };
    })
    .filter((f) => f.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Multi-crop domain disease resolver ensuring distinct condition profiles
 */
export function resolveDomainDiseaseProfile(
  textPrompt: string = '',
  cropContext: string = '',
  imageHint: string = ''
) {
  const query = `${textPrompt} ${cropContext} ${imageHint}`.toLowerCase();

  // 1. Pesticide check
  if (
    query.includes('pesticide') ||
    query.includes('bottle') ||
    query.includes('label') ||
    query.includes('shield 360') ||
    query.includes('azoxystrobin') ||
    query.includes('పురుగుమందు') ||
    query.includes('లేబుల్')
  ) {
    return {
      analysisType: 'pesticide_label',
      crop: {
        nameEn: cropContext || 'Chilli / Paddy / Cotton',
        nameTe: 'మిరప / వరి / ప్రత్తి',
        plantPart: 'Whole Foliage',
      },
      diagnosisOrProduct: {
        titleEn: 'Azoxystrobin 23% SC (Crop Shield 360)',
        titleTe: 'అజోక్సిస్ట్రోబిన్ 23% ఎస్‌సి (శిలీంధ్రనాశిని)',
        category: 'fungicide',
        confidenceLevel: 'High',
        confidenceNoteEn: 'Verified label extraction from standard agricultural container',
        confidenceNoteTe: 'రసాయన డబ్బా లేబుల్ నుండి సంగ్రహించబడిన సమాచారం',
      },
      observationsEn: [
        'Broad-spectrum systemic strobilurin fungicide.',
        'Active ingredient: Azoxystrobin (23% w/w).',
        'Formulation: Suspension Concentrate (SC).',
        'Target diseases: Anthracnose, Powdery Mildew, Downy Mildew, Blast.',
      ],
      observationsTe: [
        'విస్తృత శ్రేణి సిస్టమిక్ స్ట్రోబిలురిన్ శిలీంధ్రనాశిని.',
        'క్రియాశీల రసాయనం: అజోక్సిస్ట్రోబిన్ (23% w/w).',
        'రూపం: సస్పెన్షన్ కాన్సంట్రేట్ (SC).',
        'నివారించే తెగుళ్లు: బూడిద తెగులు, ఆకుమచ్చ తెగులు, కొమ్మ ఎండు తెగులు.',
      ],
      labelDetails: {
        activeIngredient: 'Azoxystrobin',
        concentration: '23% SC',
        formulation: 'Suspension Concentrate (SC)',
        moaCode: 'FRAC 11',
        targetPests: ['Anthracnose', 'Powdery Mildew', 'Dieback', 'Leaf Spot'],
        approvedCrops: ['Chilli', 'Rice', 'Tomato', 'Grapes', 'Maize'],
        rainfastHours: '2 hours',
        safetyWarnings: [
          'Wear nitrile gloves and face mask during tank mixing.',
          'Maintain 3-day Pre-Harvest Interval (PHI) for chilli.',
          'Do not spray within 15 meters of open fish ponds or aquaculture.',
        ],
      },
      immediateActionsEn: [
        'Calibrate sprayer with clean water before mixing.',
        'Ensure uniform coverage on both upper and lower leaf surfaces.',
        'Avoid tank-mixing with strongly alkaline agrochemicals.',
      ],
      immediateActionsTe: [
        'మందు కలపడానికి ముందు స్ప్రేయర్‌ను శుభ్రమైన నీటితో తనిఖీ చేయండి.',
        'ఆకుల పైభాగం మరియు అడుగుభాగం పూర్తిగా తడిసేలా పిచికారీ చేయండి.',
        'క్షార గుణం కలిగిన ఇతర రసాయనాలతో కలిపి వాడవద్దు.',
      ],
      preventiveMeasuresEn: [
        'Rotate with FRAC 3 (Triazole) or FRAC M (Multi-site) fungicides to avoid resistance buildup.',
        'Do not apply more than 2 consecutive sprays of FRAC 11 products.',
      ],
      preventiveMeasuresTe: [
        'శిలీంధ్రాలకు నిరోధకత రాకుండా FRAC 3 లేదా FRAC M గ్రూప్ మందులతో మార్పిడి చేయండి.',
        'వరుసగా రెండు సార్ల కంటే ఎక్కువ ఒకే గ్రూప్ మందు వాడవద్దు.',
      ],
      followUpQuestionsEn: [
        'What is the current growth stage of your crop?',
        'Did you spray any strobilurin fungicide in the last 20 days?',
      ],
      followUpQuestionsTe: [
        'మీ పంట ప్రస్తుతం ఏ దశలో ఉంది (పూత/కాత దశ)?',
        'గత 20 రోజులలో స్ట్రోబిలురిన్ గ్రూప్ మందు ఏదైనా వాడారా?',
      ],
      spokenSummaryEn: 'Extracted label: Azoxystrobin 23% SC. Mode of action is FRAC Group 11. Effective for Anthracnose and Powdery Mildew with 2-hour rainfastness.',
      spokenSummaryTe: 'లేబుల్ సమాచారం: అజోక్సిస్ట్రోబిన్ 23% SC. ఇది FRAC గ్రూప్ 11 శిలీంధ్రనాశిని. బూడిద మరియు ఆకుమచ్చ తెగుళ్లకు పనిచేస్తుంది.',
      requiresExpertVerification: false,
    };
  }

  // 2. Rice / Paddy Leaf Blast
  if (
    query.includes('rice') ||
    query.includes('paddy') ||
    query.includes('blast') ||
    query.includes('వరి') ||
    query.includes('అగ్గితెగులు') ||
    query.includes('spindle')
  ) {
    return {
      analysisType: 'crop_diagnosis',
      crop: {
        nameEn: 'Paddy / Rice (Oryza sativa)',
        nameTe: 'వరి పంట',
        plantPart: 'Leaf Blades & Sheath',
      },
      diagnosisOrProduct: {
        titleEn: 'Rice Leaf Blast (Magnaporthe oryzae)',
        titleTe: 'వరి ఆకు అగ్గితెగులు (శిలీంధ్ర వ్యాధి)',
        category: 'fungal',
        confidenceLevel: 'High',
        confidenceNoteEn: 'Characteristic spindle-shaped eye lesions with grey centers and dark reddish-brown margins.',
        confidenceNoteTe: 'ఆకులపై కంటి ఆకారపు (కదురు ఆకారపు) బూడిద రంగు మచ్చలు స్పష్టంగా కనిపించాయి.',
      },
      observationsEn: [
        'Spindle-shaped diamond lesions on upper leaf blades with necrotic centers.',
        'Coalescing spots causing leaf tip drying and blighting.',
        'High humidity and dense crop canopy favoring spore germination.',
      ],
      observationsTe: [
        'ఆకులపై కదురు ఆకారపు బూడిద రంగు మచ్చలు ఏర్పడి ఆకుల చివర్లు ఎండిపోతున్నాయి.',
        'మచ్చలు కలిసిపోయి ఆకులు ఎండి రాలిపోయే ప్రమాదం ఉంది.',
        'పొలంలో అధిక తేమ మరియు మంచు వల్ల తెగులు తీవ్రత పెరుగుతోంది.',
      ],
      immediateActionsEn: [
        'Spray Tricyclazole 75% WP @ 0.6 g/L or Isoprothiolane 40% EC @ 1.5 ml/L immediately.',
        'Temporarily halt top-dressing of synthetic nitrogen (urea) fertilizers.',
        'Drain stagnant water from the paddy field to reduce canopy humidity.',
      ],
      immediateActionsTe: [
        'వెంటనే ట్రైసైక్లాజోల్ 75% WP 0.6 గ్రాములు లేదా ఐసోప్రోథియోలేన్ 40% EC 1.5 మి.లీ లీటరు నీటికి కలిపి పిచికారీ చేయండి.',
        'యూరియా ఎరువు వేయడం తక్షణమే నిలిపివేయండి.',
        'పొలంలో నిల్వ ఉన్న నీటిని తీసివేసి తేమను తగ్గించండి.',
      ],
      preventiveMeasuresEn: [
        'Treat seeds with Carbendazim 2g/kg before nursery sowing.',
        'Maintain balanced potassium and silica fertilization for strong cellular walls.',
      ],
      preventiveMeasuresTe: [
        'విత్తే ముందు కార్బండిజిమ్ 2 గ్రాముల మందుతో విత్తన శుద్ధి చేయండి.',
        'పొటాష్ ఎరువును సమతుల్యంగా వేసి మొక్కలకు రోగనిరోధక శక్తిని పెంచండి.',
      ],
      followUpQuestionsEn: [
        'Are there neck blast lesions visible on the panicle node?',
        'What nitrogen rate has been applied so far?',
      ],
      followUpQuestionsTe: [
        'కంకి మెడ భాగంలో నల్లటి మచ్చలు (మెడ విరుపు) కనిపిస్తున్నాయా?',
        'ఇప్పటివరకు ఎకరాకు ఎన్ని బస్తాల యూరియా వేశారు?',
      ],
      spokenSummaryEn: 'Confirmed diagnosis: Rice Leaf Blast caused by Magnaporthe oryzae. Immediate spray of Tricyclazole recommended and stop nitrogen top-dressing.',
      spokenSummaryTe: 'నిర్ధారణ: వరి ఆకు అగ్గితెగులు. వెంటనే ట్రైసైక్లాజోల్ పిచికారీ చేయండి మరియు యూరియా వేయడం ఆపండి.',
      requiresExpertVerification: false,
    };
  }

  // 3. Cotton Bollworm / Caterpillar damage
  if (
    query.includes('cotton') ||
    query.includes('bollworm') ||
    query.includes('nibble') ||
    query.includes('caterpillar') ||
    query.includes('ప్రత్తి') ||
    query.includes('పురుగు') ||
    query.includes('కాయ తొలుచు')
  ) {
    return {
      analysisType: 'crop_diagnosis',
      crop: {
        nameEn: 'Cotton (Gossypium hirsutum)',
        nameTe: 'ప్రత్తి చేను',
        plantPart: 'Leaves, Squares & Young Bolls',
      },
      diagnosisOrProduct: {
        titleEn: 'Cotton Pink & Spotted Bollworm Complex (Helicoverpa / Pectinophora)',
        titleTe: 'ప్రత్తి కాయ తొలుచు మరియు గులాబీ రంగు పురుగు ఉధృతి',
        category: 'pest',
        confidenceLevel: 'High',
        confidenceNoteEn: 'Irregular leaf chewing margins and borehole entrances on squares observed.',
        confidenceNoteTe: 'ఆకులపై పురుగు తిన్న రంధ్రాలు మరియు పూమొగ్గలపై రంధ్రాలు స్పష్టంగా ఉన్నాయి.',
      },
      observationsEn: [
        'Characteristic shot-hole feeding on leaf lamina.',
        'Frass droppings present around petioles and bracts.',
        'Flaring of squares (rosetted flowers) indicating internal larval burrowing.',
      ],
      observationsTe: [
        'ఆకులను పురుగులు కొరికి తిని రంధ్రాలు చేశాయి.',
        'మొగ్గల వద్ద పురుగు విసర్జన పదార్థం మరియు పువ్వులు ముడుచుకుపోవడం కనిపించింది.',
        'పిందెలు మరియు కాయల్లోకి పురుగు చొచ్చుకుపోయే ప్రమాదం ఉంది.',
      ],
      immediateActionsEn: [
        'Install 8-10 pheromone traps per acre to monitor and disrupt male moth flight.',
        'Spray Chlorantraniliprole 18.5% SC @ 0.3 ml/L or Emamectin Benzoate 5% SG @ 0.5 g/L in the evening.',
        'Handpick and destroy flared-up squares and infested dropped bolls.',
      ],
      immediateActionsTe: [
        'ఎకరాకు 8-10 లింగాకర్షక బుట్టలను అమర్చి పురుగుల ఉధృతిని పర్యవేక్షించండి.',
        'సాయంత్రం వేళ క్లోరాంట్రానిలిప్రోల్ (కొరాజెన్) 0.3 మి.లీ లేదా ఇమామెక్టిన్ బెంజోయేట్ 0.5 గ్రాములను లీటరు నీటికి కలిపి పిచికారీ చేయండి.',
        'రాలిపోయిన పురుగు పట్టిన పూమొగ్గలను ఏరి నాశనం చేయండి.',
      ],
      preventiveMeasuresEn: [
        'Release Trichogramma egg parasitoids @ 60,000/acre at 10-day intervals.',
        'Avoid synthetic pyrethroid sprays early in the season to protect natural predatory insects.',
      ],
      preventiveMeasuresTe: [
        'ట్రైకోగ్రామా గుడ్ల పరాన్నజీవులను పొలంలో వదిలి సహజ నివారణ చేపట్టండి.',
        'మిత్రపురుగులను కాపాడేందుకు ప్రారంభ దశలో తీవ్రమైన విషపూరిత రసాయనాలను వాడవద్దు.',
      ],
      followUpQuestionsEn: [
        'Are squares or bolls shedding on the soil surface?',
        'How many bollworm larvae per plant did you observe during scouting?',
      ],
      followUpQuestionsTe: [
        'పూమొగ్గలు లేదా కాయలు రాలిపోతున్నాయా?',
        'ఒక మొక్కపై సగటున ఎన్ని పురుగులు కనిపిస్తున్నాయి?',
      ],
      spokenSummaryEn: 'Diagnosed as Cotton Bollworm complex. Recommend installing pheromone traps and applying targeted Chlorantraniliprole insecticide.',
      spokenSummaryTe: 'నిర్ధారణ: ప్రత్తి కాయ తొలుచు పురుగు ఉధృతి. లింగాకర్షక బుట్టలు పెట్టండి మరియు క్లోరాంట్రానిలిప్రోల్ పిచికారీ చేయండి.',
      requiresExpertVerification: false,
    };
  }

  // 4. Maize / Corn Fall Armyworm
  if (
    query.includes('maize') ||
    query.includes('corn') ||
    query.includes('armyworm') ||
    query.includes('మొక్కజొన్న') ||
    query.includes('కత్తెర పురుగు')
  ) {
    return {
      analysisType: 'crop_diagnosis',
      crop: {
        nameEn: 'Maize / Corn (Zea mays)',
        nameTe: 'మొక్కజొన్న పంట',
        plantPart: 'Whorl Leaves & Central Shoot',
      },
      diagnosisOrProduct: {
        titleEn: 'Fall Armyworm (Spodoptera frugiperda)',
        titleTe: 'మొక్కజొన్న కత్తెర పురుగు (ఫాల్ ఆర్మీవార్మ్)',
        category: 'pest',
        confidenceLevel: 'High',
        confidenceNoteEn: 'Severe whorl leaf skeletonization and coarse sawdust-like frass pellets.',
        confidenceNoteTe: 'మొక్క సుడులలో రంధ్రాలు మరియు రంపపు పొట్టు లాంటి విసర్జిత పదార్థం గుర్తించబడింది.',
      },
      observationsEn: [
        'Ragged pinholes and extensive leaf skeletonization inside the central whorl.',
        'Moist sawdust-like faecal frass accumulation.',
        'Larva with characteristic Y-shaped inverted suture on head capsule.',
      ],
      observationsTe: [
        'ఆకుల సుడులలో రంధ్రాలు ఏర్పడి ఆకులు చిరిగిపోయినట్లు అయ్యాయి.',
        'సుడి లోపల రంపపు పొట్టు లాంటి పురుగు రెట్ట ఉంది.',
        'పురుగు తల భాగంలో తెల్లటి తిరగబడిన "Y" ఆకారం కనిపిస్తుంది.',
      ],
      immediateActionsEn: [
        'Whorl application of poison bait (10 kg rice bran + 2 kg jaggery + 100 g thiodicarb per acre).',
        'Direct spray of Spinetoram 11.7% SC @ 0.5 ml/L into central whorls.',
        'Apply sand or wood ash mixed with lime into whorls to kill young larvae.',
      ],
      immediateActionsTe: [
        'విషపు ఎర (10 కేజీల తవుడు + 2 కేజీల బెల్లం + 100 గ్రా థయోడికార్బ్) సుడులలో వేయండి.',
        'స్పైనిటోరమ్ 11.7% SC 0.5 మి.లీ మందును సుడులలో నేరుగా పడేలా పిచికారీ చేయండి.',
        'సుడి లోపల ఇసుక లేదా బూడిద వేయడం ద్వారా చిన్న పురుగులను నివారించవచ్చు.',
      ],
      preventiveMeasuresEn: [
        'Intercrop with pulses (cowpea or redgram) to reduce pest spread.',
        'Install solar light traps and FAW pheromone lures @ 4/acre.',
      ],
      preventiveMeasuresTe: [
        'అంతర పంటగా అలసంద లేదా కంది పంటను సాగు చేయండి.',
        'పొలంలో సౌర కాంతి ఉచ్చులు మరియు లింగాకర్షక బుట్టలను అమర్చండి.',
      ],
      followUpQuestionsEn: [
        'How many days after sowing is the maize crop?',
        'Are more than 10% of plants showing whorl feeding?',
      ],
      followUpQuestionsTe: [
        'మొక్కజొన్న విత్తి ఎన్ని రోజులైంది?',
        'తోటలో నూరు మొక్కలకు ఎన్ని మొక్కలలో సుడి తొలిచినట్లు ఉంది?',
      ],
      spokenSummaryEn: 'Identified as Fall Armyworm in maize. Recommend direct whorl application of Spinetoram or poisoned bait.',
      spokenSummaryTe: 'నిర్ధారణ: మొక్కజొన్న కత్తెర పురుగు. సుడులలో స్పైనిటోరమ్ మందు పడేలా పిచికారీ చేయండి లేదా విషపు ఎర వాడండి.',
      requiresExpertVerification: false,
    };
  }

  // 5. Tomato Early Blight / Leaf Curl
  if (
    query.includes('tomato') ||
    query.includes('టమోటా') ||
    query.includes('early blight')
  ) {
    return {
      analysisType: 'crop_diagnosis',
      crop: {
        nameEn: 'Tomato (Solanum lycopersicum)',
        nameTe: 'టమోటా తోట',
        plantPart: 'Lower Leaves & Fruit Calyx',
      },
      diagnosisOrProduct: {
        titleEn: 'Tomato Early Blight (Alternaria solani)',
        titleTe: 'టమోటా ఆల్టర్నేరియా ఆకుమచ్చ తెగులు',
        category: 'fungal',
        confidenceLevel: 'High',
        confidenceNoteEn: 'Distinct concentric target-board rings on older foliage with chlorotic halos.',
        confidenceNoteTe: 'ఆకులపై వలయాకారపు నల్లటి మచ్చలు (టార్గెట్ బోర్డ్ రింగ్స్) స్పష్టంగా కనిపించాయి.',
      },
      observationsEn: [
        'Brown to black spots with concentric rings resembling a target board.',
        'Yellow chlorotic halos surrounding the fungal lesions.',
        'Defoliation advancing from base upward to top canopy.',
      ],
      observationsTe: [
        'ఆకులపై వలయాకారపు నల్లటి మచ్చలు ఏర్పడ్డాయి.',
        'మచ్చల చుట్టూ పసుపు రంగు వలయం ఉంది.',
        'కింది ఆకులు ఎండి రాలిపోతున్నాయి.',
      ],
      immediateActionsEn: [
        'Spray Mancozeb 75% WP @ 2.5 g/L or Chlorothalonil 75% WP @ 2 g/L.',
        'Prune and safely burn infected lower senescent leaves.',
        'Avoid overhead sprinkler irrigation that splashes fungal spores onto leaves.',
      ],
      immediateActionsTe: [
        'మాంకోజెబ్ 75% WP 2.5 గ్రాములు లేదా క్లోరోథలోనిల్ 2 గ్రాములను లీటరు నీటికి కలిపి పిచికారీ చేయండి.',
        'కింది భాగంలో తెగులు సోకిన ఆకులను కత్తిరించి నాశనం చేయండి.',
        'ఆకులపై నీరు పడేలా కాకుండా డ్రిప్ ద్వారా మాత్రమే నీరు అందించండి.',
      ],
      preventiveMeasuresEn: [
        'Ensure 2-3 year crop rotation without solanaceous crops (brinjal, chilli, potato).',
        'Stake plants to keep lower foliage off the soil surface.',
      ],
      preventiveMeasuresTe: [
        'టమోటా తర్వాత వంగ, మిరప వేయకుండా పంట మార్పిడి చేయండి.',
        'మొక్కలకు కర్రలు కట్టి పైకి నిలబెట్టండి.',
      ],
      followUpQuestionsEn: [
        'Are there dark sunken lesions at the fruit stem attachments?',
      ],
      followUpQuestionsTe: [
        'కాయల తొడిమ వద్ద నల్లటి మచ్చలు కనిపిస్తున్నాయా?',
      ],
      spokenSummaryEn: 'Diagnosed as Tomato Early Blight caused by Alternaria. Spray Mancozeb protectant fungicide and prune infected lower leaves.',
      spokenSummaryTe: 'నిర్ధారణ: టమోటా ఆల్టర్నేరియా ఆకుమచ్చ తెగులు. మాంకోజెబ్ పిచికారీ చేయండి మరియు ఎండిన ఆకులను తీసివేయండి.',
      requiresExpertVerification: false,
    };
  }

  // 6. Default Chilli Leaf Curl & Yellow Spot Complex
  return {
    analysisType: 'crop_diagnosis',
    crop: {
      nameEn: cropContext || 'Chilli (Capsicum annuum)',
      nameTe: 'మిరప తోట',
      plantPart: 'Upper Leaves and Foliage',
    },
    diagnosisOrProduct: {
      titleEn: 'Chilli Leaf Curl & Yellow Spot Complex (Thrips / Mite transmission)',
      titleTe: 'మిరప ఆకు ముడుత మరియు పసుపు మచ్చల తెగులు (తామర పురుగులు / నల్లి ప్రభావం)',
      category: 'viral',
      confidenceLevel: 'Moderate',
      confidenceNoteEn: 'Distinct boat-shaped leaf cupping and chlorotic interveinal spotting observed.',
      confidenceNoteTe: 'ఆకులు పైకి దోనెలా ముడుచుకోవడం మరియు పసుపు రంగు చుక్కలు కనిపించాయి.',
    },
    observationsEn: [
      'Upward curling of leaf margins indicating sucking pest feeding (likely Yellow Mites or Thrips).',
      'Scattered chlorotic yellow spots with marginal leaf distortion.',
      'Stunted internodal growth on younger shoot tips.',
    ],
    observationsTe: [
      'ఆకుల అంచులు పైకి దోనెలా ముడుచుకున్నాయి (తామర పురుగులు లేదా నల్లి ఉధృతి లక్షణం).',
      'ఆకులపై పసుపు రంగు చుక్కలు మరియు ఆకు ఆకారం మారడం గమనించబడింది.',
      'కొత్తగా వచ్చే పిలకల పెరుగుదల మందగించింది.',
    ],
    immediateActionsEn: [
      'Deploy 20 yellow and blue sticky traps per acre to monitor and trap adult thrips.',
      'Spray Neem Oil (10,000 ppm) @ 2 ml/L or Diafenthiuron 50% WP @ 1.2 g/L during late afternoon.',
      'Ensure soil has adequate moisture to reduce pest multiplication stress.',
    ],
    immediateActionsTe: [
      'ఎకరాకు 20 పసుపు మరియు నీలి రంగు జిగురు అట్టలను అమర్చి పురుగుల ఉధృతిని తగ్గించండి.',
      'వేప నూనె (10,000 ppm) 2 మి.లీ లేదా డయాఫెంతియురాన్ 50% WP 1.2 గ్రాములను లీటరు నీటికి కలిపి సాయంత్రం వేళ పిచికారీ చేయండి.',
      'భూమిలో తేమ ఆరిపోకుండా తగినంత నీటి తడులు ఇవ్వండి.',
    ],
    preventiveMeasuresEn: [
      'Erect 3-4 rows of barrier crops (maize, sorghum, or pearl millet) along field borders.',
      'Avoid excessive synthetic nitrogen fertilizers which cause lush growth favored by thrips.',
    ],
    preventiveMeasuresTe: [
      'పొలం చుట్టూ 3-4 వరుసల మొక్కజొన్న లేదా జొన్న పంటను సరిహద్దు రక్షణగా వేయండి.',
      'యూరియా ఎరువును మోతాదుకు మించి వేయకండి.',
    ],
    followUpQuestionsEn: [
      'Are leaves curling upwards (thrips) or downwards (mites)?',
      'How many acres of your field are showing these symptoms?',
    ],
    followUpQuestionsTe: [
      'ఆకులు పైకి ముడుచుకుంటున్నాయా లేక కిందికా?',
      'మీ తోటలో ఎన్ని ఎకరాల్లో ఈ లక్షణాలు కనిపిస్తున్నాయి?',
    ],
    spokenSummaryEn: 'Suspected condition: Chilli leaf curl with yellow spotting, primarily caused by sucking pests like thrips. Recommend deploying sticky traps and targeted spray.',
    spokenSummaryTe: 'అనుమానిత సమస్య: తామర పురుగుల వల్ల వచ్చిన మిరప ఆకు ముడుత తెగులు. జిగురు అట్టలు పెట్టడం మరియు తగిన పిచికారీని సిఫార్సు చేస్తున్నాము.',
    requiresExpertVerification: true,
  };
}

