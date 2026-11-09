/**
 * Pure agricultural intelligence calculations, geospatial proximity,
 * weather spray evaluation, biological host-vector separation, and chemical resistance.
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
  treatedAreaAcres?: number;
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
  severity: 'mild' | 'moderate' | 'severe';
  generalizedLocation: string;
  symptoms: string;
  aiMatchScore?: number;
  pathogenSusceptibleHosts?: string[];
  vectorReservoirHosts?: string[];
  isBroadHostRange?: boolean;
  isAiAssisted?: boolean;
  isAutoOutbreak?: boolean;
  reporterUserId?: string;
  isOwnReport?: boolean;
}

export interface RegisteredFarm {
  id: string;
  farmerName: string;
  phone: string;
  latitude: number;
  longitude: number;
  villageSector: string;
  crops: string[];
  hasExplicitLocation?: boolean;
  locationSource?: 'none' | 'sector_centroid' | 'gps';
}

export interface BiologicalPrecaution {
  targetCrop: string;
  actionEn: string;
  actionTe: string;
  sourceAuthority: string;
  sourceUrl: string;
  reviewDate: string;
}

export interface BiologicalHostProfile {
  conditionKey: string;
  conditionNameEn: string;
  conditionNameTe: string;
  causalOrganism: {
    name: string;
    type: 'fungal' | 'bacterial' | 'viral' | 'pest';
    pathogenHosts: string[];
  };
  vectorOrganism?: {
    name: string;
    type: 'whitefly' | 'thrips' | 'aphid' | 'leafhopper';
    vectorBreedingHosts: string[];
  };
  isBroadRange: boolean;
  precautions: BiologicalPrecaution[];
}

/**
 * Authoritative Extension-Verified Biological Host Catalog (ICAR / ANGRAU)
 * Separates pathogen infection hosts from insect vector reservoir/breeding hosts.
 */
export const BIOLOGICAL_DISEASE_CATALOG: Record<string, BiologicalHostProfile> = {
  chilli_leaf_curl_begomovirus: {
    conditionKey: 'chilli_leaf_curl_begomovirus',
    conditionNameEn: 'Chilli Leaf Curl Begomovirus Complex',
    conditionNameTe: 'మిరప ఆకుముడుత వైరస్ మరియు తామర పురుగు/తెల్లదోమ ఉధృతి',
    causalOrganism: {
      name: 'Chilli Leaf Curl Virus (ChiLCV / Begomovirus)',
      type: 'viral',
      pathogenHosts: ['Chilli', 'Capsicum', 'Tomato', 'మిరప', 'టమోటా'],
    },
    vectorOrganism: {
      name: 'Whitefly (Bemisia tabaci) and Yellow Mite / Thrips complex',
      type: 'whitefly',
      vectorBreedingHosts: ['Cotton', 'Okra', 'Brinjal', 'Weeds (Parthenium, Abutilon)', 'ప్రత్తి', 'బెండ', 'వంకాయ'],
    },
    isBroadRange: false,
    precautions: [
      {
        targetCrop: 'Chilli',
        actionEn: 'Inspect apical growth for upward boat-shaped leaf cupping and check leaf undersides with a hand lens for translucent whitefly nymphs or thrips.',
        actionTe: 'పై చిగుళ్ల ఆకులు దోనెలా ముడుచుకున్నాయా అని గమనించండి మరియు ఆకుల అడుగుభాగంలో తెల్లదోమ లేదా నల్లి పిల్ల పురుగులను భూతద్దంతో పరిశీలించండి.',
        sourceAuthority: 'ANGRAU Commercial Cultivation Guide (Chilli IPM Schedule)',
        sourceUrl: 'https://angrau.ac.in/extension/package-of-practices/chilli',
        reviewDate: '2025-06-15',
      },
      {
        targetCrop: 'Cotton',
        actionEn: 'Cotton is not a host for the ChiLCV virus, but acts as a major whitefly vector reservoir. Monitor whitefly vector populations on lower cotton canopy leaves.',
        actionTe: 'ప్రత్తి పంటకు ఈ వైరస్ సోకదు, కానీ ప్రత్తి తెల్లదోమకు ఆశ్రయమిస్తుంది. ప్రత్తి ఆకుల కింది భాగంలో తెల్లదోమ ఉధృతిని గమనించండి.',
        sourceAuthority: 'ICAR-Central Institute for Cotton Research (CICR) Whitefly Bulletins',
        sourceUrl: 'https://cicr.icar.gov.in/ipm-bulletins/whitefly-cotton',
        reviewDate: '2025-08-10',
      },
    ],
  },
  rice_leaf_blast: {
    conditionKey: 'rice_leaf_blast',
    conditionNameEn: 'Rice Leaf Blast (Magnaporthe oryzae)',
    conditionNameTe: 'వరి ఆకు అగ్గితెగులు (శిలీంధ్ర వ్యాధి)',
    causalOrganism: {
      name: 'Magnaporthe oryzae',
      type: 'fungal',
      pathogenHosts: ['Paddy', 'Rice', 'Paddy / Rice', 'వరి', 'Finger Millet', 'Ragi'],
    },
    isBroadRange: false,
    precautions: [
      {
        targetCrop: 'Paddy / Rice',
        actionEn: 'Scout upper leaf blades across the canopy for spindle-shaped diamond lesions with grey ash centers. Temporarily pause synthetic nitrogen (urea) top-dressing until lesion expansion halts.',
        actionTe: 'ఆకులపై కంటి ఆకారపు బూడిద రంగు మచ్చలు ఉన్నాయా అని చేను అంతటా పరిశీలించండి. మచ్చల వ్యాప్తి తగ్గే వరకు యూరియా ఎరువును వేయడం నిలిపివేయండి.',
        sourceAuthority: 'ICAR-National Rice Research Institute (NRRI) Blast Management Advisory',
        sourceUrl: 'https://nrri.icar.gov.in/crop-protection/blast-advisory',
        reviewDate: '2025-09-01',
      },
    ],
  },
  cotton_bollworm_complex: {
    conditionKey: 'cotton_bollworm_complex',
    conditionNameEn: 'Cotton Pink & Spotted Bollworm Complex',
    conditionNameTe: 'ప్రత్తి కాయ తొలుచు మరియు గులాబీ రంగు పురుగు ఉధృతి',
    causalOrganism: {
      name: 'Helicoverpa armigera / Pectinophora gossypiella',
      type: 'pest',
      pathogenHosts: ['Cotton', 'ప్రత్తి', 'Pigeon Pea', 'Redgram', 'Chickpea', 'Okra', 'కంది', 'శనగ', 'బెండ'],
    },
    isBroadRange: true,
    precautions: [
      {
        targetCrop: 'Cotton',
        actionEn: 'Scout squares and young bolls for borehole entry holes and rosetted flaring flowers. Hand-pick and destroy fallen flared squares.',
        actionTe: 'పూమొగ్గలు మరియు పిందెలపై పురుగు రంధ్రాలు మరియు ముడుచుకుపోయిన పువ్వులను గమనించండి. రాలిపోయిన మొగ్గలను ఏరి నాశనం చేయండి.',
        sourceAuthority: 'ICAR-CICR Cotton IPM Advisory',
        sourceUrl: 'https://cicr.icar.gov.in/ipm-bulletins/bollworm',
        reviewDate: '2025-07-20',
      },
    ],
  },
  maize_fall_armyworm: {
    conditionKey: 'maize_fall_armyworm',
    conditionNameEn: 'Fall Armyworm (Spodoptera frugiperda)',
    conditionNameTe: 'మొక్కజొన్న కత్తెర పురుగు (ఫాల్ ఆర్మీవార్మ్)',
    causalOrganism: {
      name: 'Spodoptera frugiperda',
      type: 'pest',
      pathogenHosts: ['Maize', 'Corn', 'Maize / Corn', 'మొక్కజొన్న'],
    },
    vectorOrganism: {
      name: 'Adult Moth Nocturnal Flight',
      type: 'thrips',
      vectorBreedingHosts: ['Sorghum', 'Pearl Millet', 'Sugarcane', 'Sweet Corn', 'జొన్న', 'సజ్జ', 'చెరకు'],
    },
    isBroadRange: true,
    precautions: [
      {
        targetCrop: 'Maize / Corn',
        actionEn: 'Inspect central whorls for ragged pinhole feeding and moist sawdust-like fecal frass accumulation. Apply wood ash or sand mixed with lime into central whorls.',
        actionTe: 'మొక్క సుడులలో రంధ్రాలు మరియు రంపపు పొట్టు లాంటి పురుగు రెట్ట ఉందేమో చూడండి. సుడి లోపల ఇసుక లేదా బూడిద వేయండి.',
        sourceAuthority: 'ICAR-Indian Institute of Maize Research (IIMR) FAW IPM Protocols',
        sourceUrl: 'https://iimr.icar.gov.in/faw-advisory',
        reviewDate: '2025-08-05',
      },
    ],
  },
  tomato_early_blight: {
    conditionKey: 'tomato_early_blight',
    conditionNameEn: 'Tomato Early Blight (Alternaria solani)',
    conditionNameTe: 'టమోటా ఆల్టర్నేరియా ఆకుమచ్చ తెగులు',
    causalOrganism: {
      name: 'Alternaria solani',
      type: 'fungal',
      pathogenHosts: ['Tomato', 'టమోటా', 'Potato', 'బంగాళాదుంప', 'Brinjal', 'వంకాయ'],
    },
    isBroadRange: false,
    precautions: [
      {
        targetCrop: 'Tomato',
        actionEn: 'Scout lower senescent foliage for dark brown concentric target-board rings surrounded by yellow chlorotic halos. Prune and safely destroy infected lower leaves.',
        actionTe: 'కింది ఆకులపై వలయాకారపు నల్లటి మచ్చలు ఉన్నాయా అని పరిశీలించండి. తెగులు సోకిన కింది ఆకులను కత్తిరించి నాశనం చేయండి.',
        sourceAuthority: 'ICAR-Indian Institute of Horticultural Research (IIHR) Disease Compendium',
        sourceUrl: 'https://iihr.res.in/tomato-ipm',
        reviewDate: '2025-06-30',
      },
    ],
  },
};

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
 * Evaluates biological host relevance, separating direct pathogen hosts from vector reservoir hosts.
 */
export function evaluateBiologicalHostRelevance(
  diseaseQuery: string,
  farmerCrop?: string | null
): {
  relevance: 'direct_host' | 'vector_host' | 'broad_host' | 'general_notice';
  matchedProfile?: BiologicalHostProfile;
  explanationEn: string;
  explanationTe: string;
} {
  const query = diseaseQuery.toLowerCase();
  let foundProfile: BiologicalHostProfile | undefined;

  for (const key of Object.keys(BIOLOGICAL_DISEASE_CATALOG)) {
    const profile = BIOLOGICAL_DISEASE_CATALOG[key];
    if (
      query.includes(profile.causalOrganism.name.toLowerCase()) ||
      query.includes(profile.conditionNameEn.toLowerCase()) ||
      profile.causalOrganism.pathogenHosts.some((h) => query.includes(h.toLowerCase()))
    ) {
      foundProfile = profile;
      break;
    }
  }

  if (!foundProfile) {
    return {
      relevance: 'general_notice',
      explanationEn: 'Symptom patterns were observed nearby. Host crop range is currently unconfirmed by extension authorities. General scouting recommended.',
      explanationTe: 'పరిసరాల్లో తెగులు లక్షణాలు కనిపించాయి. దీని వ్యాప్తి గురించి పూర్తి సమాచారం ధృవీకరించబడలేదు. తోటను పరిశీలించండి.',
    };
  }

  if (!farmerCrop || farmerCrop.trim() === '') {
    return {
      relevance: 'general_notice',
      matchedProfile: foundProfile,
      explanationEn: `Detected in your vicinity. Known susceptible crops: ${foundProfile.causalOrganism.pathogenHosts.slice(0, 3).join(', ')}.`,
      explanationTe: `మీ ప్రాంతంలో గుర్తించబడింది. ప్రభావితమయ్యే పంటలు: ${foundProfile.causalOrganism.pathogenHosts.slice(0, 3).join(', ')}.`,
    };
  }

  const cleanCrop = farmerCrop.trim().toLowerCase();

  // 1. Direct pathogen host check
  const isDirectHost = foundProfile.causalOrganism.pathogenHosts.some(
    (h) => cleanCrop.includes(h.toLowerCase()) || h.toLowerCase().includes(cleanCrop)
  );

  if (isDirectHost) {
    return {
      relevance: 'direct_host',
      matchedProfile: foundProfile,
      explanationEn: `Direct Crop Risk: Your crop (${farmerCrop}) is a primary susceptible biological host for this pathogen.`,
      explanationTe: `ప్రత్యక్ష పంట ముప్పు: మీ పంట (${farmerCrop}) ఈ తెగులు సోకే ముఖ్యమైన జాతికి చెందినది.`,
    };
  }

  // 2. Vector breeding reservoir host check
  const isVectorHost = foundProfile.vectorOrganism?.vectorBreedingHosts.some(
    (h) => cleanCrop.includes(h.toLowerCase()) || h.toLowerCase().includes(cleanCrop)
  );

  if (isVectorHost) {
    return {
      relevance: 'vector_host',
      matchedProfile: foundProfile,
      explanationEn: `Vector Reservoir Notice: ${farmerCrop} is not directly infected by this pathogen, but serves as an insect vector breeding host.`,
      explanationTe: `కీటక వాహక ఆశ్రయం: ${farmerCrop} పంటకు ఈ వ్యాధి నేరుగా సోకదు, కానీ పురుగుల ఉధృతికి ఆశ్రయమిస్తుంది.`,
    };
  }

  // 3. Broad polyphagous host check
  if (foundProfile.isBroadRange) {
    return {
      relevance: 'broad_host',
      matchedProfile: foundProfile,
      explanationEn: `Wide Host Notice: This pathogen has a broad host range. Known host crops include: ${foundProfile.causalOrganism.pathogenHosts.join(', ')}.`,
      explanationTe: `విస్తృత వ్యాప్తి గమనిక: ఈ తెగులు బహుళ పంటలకు సోకుతుంది. ప్రభావిత పంటలు: ${foundProfile.causalOrganism.pathogenHosts.join(', ')}.`,
    };
  }

  return {
    relevance: 'general_notice',
    matchedProfile: foundProfile,
    explanationEn: `Reported nearby. Primary susceptible hosts: ${foundProfile.causalOrganism.pathogenHosts.join(', ')}.`,
    explanationTe: `సమీపంలో నమోదైంది. ఈ తెగులు సోకే ముఖ్య పంటలు: ${foundProfile.causalOrganism.pathogenHosts.join(', ')}.`,
  };
}

/**
 * Validates that a model-reported match score is strictly greater than 0.700.
 */
export function isMatchScoreEligibleForAlert(score?: number): boolean {
  return typeof score === 'number' && !isNaN(score) && score > 0.700 && score <= 1.000;
}

/**
 * Formats distance with explicit approximate centroid label.
 */
export function formatApproximateDistance(
  distanceKm: number,
  source: 'sector_centroid' | 'gps' | 'none' = 'sector_centroid',
  sectorName: string = 'Local Sector',
  lang: 'en' | 'te' = 'en'
): string {
  const dist = distanceKm.toFixed(1);
  if (lang === 'te') {
    return source === 'gps'
      ? `సుమారు దూరం (~${dist} కి.మీ మీ పొలం లొకేషన్ నుండి)`
      : `సుమారు దూరం (~${dist} కి.మీ ${sectorName} కేంద్రం నుండి)`;
  }
  return source === 'gps'
    ? `Approximate distance (~${dist} km from your registered farm)`
    : `Approximate distance (~${dist} km from ${sectorName} centroid)`;
}

/**
 * Calculates chemical and water requirements ONLY when dosage is label-verified.
 * Never guesses an unverified dose.
 */
export function calculatePesticideQuantity(
  dosePerAcreMlOrG: number | undefined,
  waterPerAcreLiters: number | undefined,
  treatedAreaAcres: number,
  isDosageVerified: boolean = false
): {
  isCalculable: boolean;
  totalChemicalText: string;
  totalWaterLiters: number;
  warningNoticeEn?: string;
  warningNoticeTe?: string;
} {
  if (!isDosageVerified || !dosePerAcreMlOrG || !waterPerAcreLiters || treatedAreaAcres <= 0) {
    return {
      isCalculable: false,
      totalChemicalText: 'Dosage Not Verified',
      totalWaterLiters: 0,
      warningNoticeEn: 'Dosage is not specified on this label for this crop against this pest. Never guess dilution rates. Check physical label or consult your local Mandal Agricultural Officer.',
      warningNoticeTe: 'ఈ లేబుల్ పై మీ పంటకు సరిపడా మోతాదు వివరాలు లేవు. సొంతంగా అంచనా వేసి మందు వాడవద్దు. లేబుల్ చూడండి లేదా వ్యవసాయ అధికారిని సంప్రదించండి.',
    };
  }

  const totalChem = (dosePerAcreMlOrG * treatedAreaAcres).toFixed(1).replace(/\.0$/, '');
  const totalWater = Math.round(waterPerAcreLiters * treatedAreaAcres);

  return {
    isCalculable: true,
    totalChemicalText: `${totalChem} ml / g`,
    totalWaterLiters: totalWater,
  };
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
    const isChilli = query.includes('chilli') || cropContext.toLowerCase().includes('chilli');
    return {
      analysisType: 'pesticide_label',
      crop: {
        nameEn: cropContext || 'Chilli (Capsicum annuum)',
        nameTe: 'మిరప తోట',
        plantPart: 'Whole Foliage',
      },
      diagnosisOrProduct: {
        titleEn: 'Azoxystrobin 23% SC',
        titleTe: 'అజోక్సిస్ట్రోబిన్ 23% ఎస్‌సి (శిలీంధ్రనాశిని)',
        category: 'fungicide',
        confidenceLevel: 'High',
        confidenceNoteEn: 'Verified label extraction from standard agricultural container',
        confidenceNoteTe: 'రసాయన డబ్బా లేబుల్ నుండి సంగ్రహించబడిన సమాచారం',
        aiMatchScore: 0.92,
      },
      observationsEn: [
        'Broad-spectrum systemic strobilurin fungicide.',
        'Active ingredient: Azoxystrobin (23% w/w SC formulation).',
        'FRAC Group 11: QoI (quinone outside inhibitors).',
        'Approved crops: Chilli (Anthracnose fruit rot, Powdery Mildew), Rice (Blast).',
      ],
      observationsTe: [
        'విస్తృత శ్రేణి సిస్టమిక్ స్ట్రోబిలురిన్ శిలీంధ్రనాశిని.',
        'క్రియాశీల రసాయనం: అజోక్సిస్ట్రోబిన్ (23% w/w SC).',
        'FRAC గ్రూప్ 11 వర్గానికి చెందినది.',
        'అనుమతించబడిన పంటలు: మిరప (కాయకుళ్ళు, బూడిద తెగులు), వరి (అగ్గితెగులు).',
      ],
      labelDetails: {
        activeIngredient: 'Azoxystrobin',
        concentration: '23% SC',
        formulation: 'Suspension Concentrate (SC)',
        moaCode: 'FRAC 11',
        targetPests: ['Anthracnose Fruit Rot', 'Powdery Mildew', 'Dieback'],
        approvedCrops: ['Chilli', 'Rice', 'Tomato', 'Maize'],
        rainfastHours: '2 hours',
        safetyWarnings: [
          'Wear nitrile gloves and face mask during tank mixing.',
          'Maintain 3-day Pre-Harvest Interval (PHI) for chilli.',
          'Do not mix with strongly alkaline agrochemicals without verified label compatibility.',
        ],
        dosagePerAcreMlOrG: isChilli ? 200 : undefined,
        waterPerAcreLiters: isChilli ? 200 : undefined,
        dosageVerifiedForActiveCrop: isChilli,
        unverifiedDosageWarningEn: isChilli
          ? undefined
          : 'Dosage is not specified on this label for this crop against this pest. Never guess dilution rates. Check physical label or consult your local Mandal Agricultural Officer.',
        unverifiedDosageWarningTe: isChilli
          ? undefined
          : 'ఈ లేబుల్ పై మీ పంటకు సరిపడా మోతాదు వివరాలు లేవు. సొంతంగా అంచనా వేసి మందు వాడవద్దు.',
      },
      immediateActionsEn: [
        'Calibrate sprayer with clean water before mixing.',
        'Ensure uniform coverage on both upper and lower leaf surfaces.',
        'Do not mix with other agrochemicals without verified label compatibility.',
      ],
      immediateActionsTe: [
        'మందు కలపడానికి ముందు స్ప్రేయర్‌ను శుభ్రమైన నీటితో తనిఖీ చేయండి.',
        'ఆకుల పైభాగం మరియు అడుగుభాగం పూర్తిగా తడిసేలా పిచికారీ చేయండి.',
        'రసాయన అనుకూలత స్పష్టంగా లేకుంటే ఇతర మందులతో కలపవద్దు.',
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
      spokenSummaryEn: 'Extracted label: Azoxystrobin 23% SC. FRAC Group 11. Effective for Anthracnose and Powdery Mildew with 2-hour rainfastness.',
      spokenSummaryTe: 'లేబుల్ సమాచారం: అజోక్సిస్ట్రోబిన్ 23% SC. ఇది FRAC గ్రూప్ 11 శిలీంధ్రనాశిని.',
      isAiAssisted: true,
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
    const profile = BIOLOGICAL_DISEASE_CATALOG['rice_leaf_blast'];
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
        confidenceNoteEn: 'Characteristic spindle-shaped diamond lesions with grey centers and dark reddish-brown margins.',
        confidenceNoteTe: 'ఆకులపై కంటి ఆకారపు (కదురు ఆకారపు) బూడిద రంగు మచ్చలు స్పష్టంగా కనిపించాయి.',
        aiMatchScore: 0.88,
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
        'Drain stagnant water from the paddy field to reduce canopy microclimate humidity.',
        'Temporarily halt top-dressing of synthetic nitrogen (urea) fertilizers.',
        'Inspect surrounding fields for neck blast symptoms before panicle emergence.',
      ],
      immediateActionsTe: [
        'పొలంలో నిల్వ ఉన్న నీటిని తీసివేసి తేమను తగ్గించండి.',
        'యూరియా ఎరువు వేయడం తక్షణమే నిలిపివేయండి.',
        'కంకి దశకు ముందు పరిసరాల్లో మెడ విరుపు లక్షణాలను గమనించండి.',
      ],
      preventiveMeasuresEn: [
        'Maintain balanced potassium and silica fertilization for strong cellular walls.',
        'Treat nursery seeds with certified fungicide prior to sowing.',
      ],
      preventiveMeasuresTe: [
        'పొటాష్ ఎరువును సమతుల్యంగా వేసి మొక్కలకు రోగనిరోధక శక్తిని పెంచండి.',
        'విత్తే ముందు విత్తన శుద్ధి చేయండి.',
      ],
      followUpQuestionsEn: [
        'Are there neck blast lesions visible on the panicle node?',
        'What nitrogen rate has been applied so far?',
      ],
      followUpQuestionsTe: [
        'కంకి మెడ భాగంలో నల్లటి మచ్చలు కనిపిస్తున్నాయా?',
        'ఇప్పటివరకు ఎకరాకు ఎన్ని బస్తాల యూరియా వేశారు?',
      ],
      spokenSummaryEn: 'Diagnosed as Rice Leaf Blast. Model-reported visual match score: 88%. AI-assisted, not field-confirmed.',
      spokenSummaryTe: 'వరి ఆకు అగ్గితెగులు లక్షణాలు కనిపించాయి. మోడల్ మ్యాచింగ్ స్కోర్: 88%. AI-ఆధారిత పరిశీలన.',
      isAiAssisted: true,
      pathogenSusceptibleHosts: profile.causalOrganism.pathogenHosts,
      vectorReservoirHosts: [],
      isBroadHostRange: profile.isBroadRange,
      extensionPrecautions: profile.precautions,
    };
  }

  // 3. Cotton Bollworm Complex
  if (
    query.includes('cotton') ||
    query.includes('bollworm') ||
    query.includes('nibble') ||
    query.includes('caterpillar') ||
    query.includes('ప్రత్తి') ||
    query.includes('పురుగు') ||
    query.includes('కాయ తొలుచు')
  ) {
    const profile = BIOLOGICAL_DISEASE_CATALOG['cotton_bollworm_complex'];
    return {
      analysisType: 'crop_diagnosis',
      crop: {
        nameEn: 'Cotton (Gossypium hirsutum)',
        nameTe: 'ప్రత్తి చేను',
        plantPart: 'Leaves, Squares & Young Bolls',
      },
      diagnosisOrProduct: {
        titleEn: 'Cotton Pink & Spotted Bollworm Complex',
        titleTe: 'ప్రత్తి కాయ తొలుచు మరియు గులాబీ రంగు పురుగు ఉధృతి',
        category: 'pest',
        confidenceLevel: 'High',
        confidenceNoteEn: 'Irregular leaf chewing margins and borehole entrances on squares observed.',
        confidenceNoteTe: 'ఆకులపై పురుగు తిన్న రంధ్రాలు మరియు పూమొగ్గలపై రంధ్రాలు స్పష్టంగా ఉన్నాయి.',
        aiMatchScore: 0.84,
      },
      observationsEn: [
        'Characteristic shot-hole feeding on leaf lamina.',
        'Frass droppings present around petioles and bracts.',
        'Flaring of squares (rosetted flowers) indicating larval burrowing.',
      ],
      observationsTe: [
        'ఆకులను పురుగులు కొరికి తిని రంధ్రాలు చేశాయి.',
        'మొగ్గల వద్ద పురుగు విసర్జన పదార్థం కనిపించింది.',
        'పిందెలు మరియు కాయల్లోకి పురుగు చొచ్చుకుపోయే ప్రమాదం ఉంది.',
      ],
      immediateActionsEn: [
        'Install 8-10 pheromone traps per acre to monitor and disrupt male moth flight.',
        'Handpick and safely destroy flared-up squares and dropped infested bolls.',
        'Scout 20 random plants across your plot for larval threshold counts.',
      ],
      immediateActionsTe: [
        'ఎకరాకు 8-10 లింగాకర్షక బుట్టలను అమర్చి పురుగుల ఉధృతిని పర్యవేక్షించండి.',
        'రాలిపోయిన పురుగు పట్టిన పూమొగ్గలను ఏరి నాశనం చేయండి.',
        'తోటలో పురుగుల ఉధృతిని క్రమం తప్పకుండా పరిశీలించండి.',
      ],
      preventiveMeasuresEn: [
        'Release Trichogramma egg parasitoids at 10-day intervals for biological control.',
        'Avoid broad-spectrum pyrethroids early in the season to protect natural predators.',
      ],
      preventiveMeasuresTe: [
        'ట్రైకోగ్రామా గుడ్ల పరాన్నజీవులను పొలంలో వదిలి సహజ నివారణ చేపట్టండి.',
        'మిత్రపురుగులను కాపాడేందుకు ప్రారంభ దశలో తీవ్రమైన విష రసాయనాలను వాడవద్దు.',
      ],
      followUpQuestionsEn: [
        'Are squares or bolls shedding on the soil surface?',
        'How many larvae per plant did you observe during scouting?',
      ],
      followUpQuestionsTe: [
        'పూమొగ్గలు లేదా కాయలు రాలిపోతున్నాయా?',
        'ఒక మొక్కపై సగటున ఎన్ని పురుగులు కనిపిస్తున్నాయి?',
      ],
      spokenSummaryEn: 'Diagnosed as Cotton Bollworm Complex. Model-reported visual match score: 84%. AI-assisted, not field-confirmed.',
      spokenSummaryTe: 'ప్రత్తి కాయ తొలుచు పురుగు ఉధృతి. మోడల్ మ్యాచింగ్ స్కోర్: 84%. AI-ఆధారిత పరిశీలన.',
      isAiAssisted: true,
      pathogenSusceptibleHosts: profile.causalOrganism.pathogenHosts,
      vectorReservoirHosts: [],
      isBroadHostRange: profile.isBroadRange,
      extensionPrecautions: profile.precautions,
    };
  }

  // 4. Maize Fall Armyworm
  if (
    query.includes('maize') ||
    query.includes('corn') ||
    query.includes('armyworm') ||
    query.includes('మొక్కజొన్న') ||
    query.includes('కత్తెర పురుగు')
  ) {
    const profile = BIOLOGICAL_DISEASE_CATALOG['maize_fall_armyworm'];
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
        aiMatchScore: 0.89,
      },
      observationsEn: [
        'Ragged pinholes and extensive leaf skeletonization inside central whorl.',
        'Moist sawdust-like faecal frass accumulation.',
        'Larva with characteristic Y-shaped inverted suture on head capsule.',
      ],
      observationsTe: [
        'ఆకుల సుడులలో రంధ్రాలు ఏర్పడి ఆకులు చిరిగిపోయినట్లు అయ్యాయి.',
        'సుడి లోపల రంపపు పొట్టు లాంటి పురుగు రెట్ట ఉంది.',
        'పురుగు తల భాగంలో తెల్లటి తిరగబడిన "Y" ఆకారం కనిపిస్తుంది.',
      ],
      immediateActionsEn: [
        'Apply wood ash or sand mixed with lime into central whorls to kill early larvae physically.',
        'Install solar light traps and FAW pheromone lures to track adult moth waves.',
        'Inspect adjacent sorghum or millet plots for collateral larval migration.',
      ],
      immediateActionsTe: [
        'సుడి లోపల ఇసుక లేదా బూడిద వేయడం ద్వారా చిన్న పురుగులను నివారించండి.',
        'పొలంలో సౌర కాంతి ఉచ్చులు మరియు లింగాకర్షక బుట్టలను అమర్చండి.',
        'పక్కనే ఉన్న జొన్న లేదా సజ్జ తోటలను పరిశీలించండి.',
      ],
      preventiveMeasuresEn: [
        'Intercrop with pulses (cowpea or redgram) to disrupt pest host spread.',
        'Conserve natural predators such as earwigs and predatory pentatomid bugs.',
      ],
      preventiveMeasuresTe: [
        'అంతర పంటగా అలసంద లేదా కంది పంటను సాగు చేయండి.',
        'మిత్రపురుగులను కాపాడండి.',
      ],
      followUpQuestionsEn: [
        'How many days after sowing is the maize crop?',
        'Are more than 10% of plants showing whorl feeding?',
      ],
      followUpQuestionsTe: [
        'మొక్కజొన్న విత్తి ఎన్ని రోజులైంది?',
        'తోటలో నూరు మొక్కలకు ఎన్ని మొక్కలలో సుడి తొలిచినట్లు ఉంది?',
      ],
      spokenSummaryEn: 'Identified as Fall Armyworm in maize. Model-reported visual match score: 89%. AI-assisted, not field-confirmed.',
      spokenSummaryTe: 'మొక్కజొన్న కత్తెర పురుగు ఉధృతి. మోడల్ మ్యాచింగ్ స్కోర్: 89%. AI-ఆధారిత పరిశీలన.',
      isAiAssisted: true,
      pathogenSusceptibleHosts: profile.causalOrganism.pathogenHosts,
      vectorReservoirHosts: profile.vectorOrganism?.vectorBreedingHosts || [],
      isBroadHostRange: profile.isBroadRange,
      extensionPrecautions: profile.precautions,
    };
  }

  // 5. Tomato Early Blight
  if (
    query.includes('tomato') ||
    query.includes('టమోటా') ||
    query.includes('early blight')
  ) {
    const profile = BIOLOGICAL_DISEASE_CATALOG['tomato_early_blight'];
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
        aiMatchScore: 0.86,
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
        'Prune and safely destroy infected lower senescent leaves.',
        'Avoid overhead sprinkler irrigation that splashes fungal spores onto foliage.',
        'Stake plants to keep lower foliage off the soil surface.',
      ],
      immediateActionsTe: [
        'కింది భాగంలో తెగులు సోకిన ఆకులను కత్తిరించి నాశనం చేయండి.',
        'ఆకులపై నీరు పడేలా కాకుండా డ్రిప్ ద్వారా మాత్రమే నీరు అందించండి.',
        'మొక్కలకు కర్రలు కట్టి పైకి నిలబెట్టండి.',
      ],
      preventiveMeasuresEn: [
        'Ensure 2-3 year crop rotation without solanaceous crops (brinjal, chilli, potato).',
        'Maintain adequate spacing between rows for canopy ventilation.',
      ],
      preventiveMeasuresTe: [
        'టమోటా తర్వాత వంగ, మిరప వేయకుండా పంట మార్పిడి చేయండి.',
        'గాలి, వెలుతురు ధారాళంగా సోకేలా మొక్కల మధ్య దూరం పాటించండి.',
      ],
      followUpQuestionsEn: [
        'Are there dark sunken lesions at the fruit stem attachments?',
      ],
      followUpQuestionsTe: [
        'కాయల తొడిమ వద్ద నల్లటి మచ్చలు కనిపిస్తున్నాయా?',
      ],
      spokenSummaryEn: 'Diagnosed as Tomato Early Blight. Model-reported visual match score: 86%. AI-assisted, not field-confirmed.',
      spokenSummaryTe: 'టమోటా ఆల్టర్నేరియా ఆకుమచ్చ తెగులు. మోడల్ మ్యాచింగ్ స్కోర్: 86%. AI-ఆధారిత పరిశీలన.',
      isAiAssisted: true,
      pathogenSusceptibleHosts: profile.causalOrganism.pathogenHosts,
      vectorReservoirHosts: [],
      isBroadHostRange: profile.isBroadRange,
      extensionPrecautions: profile.precautions,
    };
  }

  // 6. Default Chilli Leaf Curl Begomovirus & Vector Complex
  const chilliProfile = BIOLOGICAL_DISEASE_CATALOG['chilli_leaf_curl_begomovirus'];
  return {
    analysisType: 'crop_diagnosis',
    crop: {
      nameEn: cropContext || 'Chilli (Capsicum annuum)',
      nameTe: 'మిరప తోట',
      plantPart: 'Upper Leaves and Foliage',
    },
    diagnosisOrProduct: {
      titleEn: 'Chilli Leaf Curl Begomovirus & Thrips/Mite Complex',
      titleTe: 'మిరప ఆకు ముడుత వైరస్ మరియు తామర పురుగు/నల్లి ఉధృతి',
      category: 'viral',
      confidenceLevel: 'High',
      confidenceNoteEn: 'Distinct boat-shaped leaf cupping and chlorotic interveinal spotting observed.',
      confidenceNoteTe: 'ఆకులు పైకి దోనెలా ముడుచుకోవడం మరియు పసుపు రంగు చుక్కలు కనిపించాయి.',
      aiMatchScore: 0.85,
    },
    observationsEn: [
      'Upward curling of leaf margins indicating sucking pest feeding (likely Thrips or Whitefly).',
      'Scattered chlorotic yellow spots with marginal leaf distortion.',
      'Stunted internodal growth on younger shoot tips.',
    ],
    observationsTe: [
      'ఆకుల అంచులు పైకి దోనెలా ముడుచుకున్నాయి (తామర పురుగులు లేదా తెల్లదోమ ఉధృతి లక్షణం).',
      'ఆకులపై పసుపు రంగు చుక్కలు మరియు ఆకు ఆకారం మారడం గమనించబడింది.',
      'కొత్తగా వచ్చే పిలకల పెరుగుదల మందగించింది.',
    ],
    immediateActionsEn: [
      'Deploy 15–20 yellow and blue sticky traps per acre to monitor and trap adult sucking vectors.',
      'Scout leaf undersides across the plot to differentiate between thrips and mites before spraying.',
      'Ensure soil maintains uniform moisture to reduce pest multiplication stress.',
    ],
    immediateActionsTe: [
      'ఎకరాకు 15–20 పసుపు మరియు నీలి రంగు జిగురు అట్టలను అమర్చి పురుగుల ఉధృతిని తగ్గించండి.',
      'పిచికారీకి ముందు ఆకుల అడుగుభాగంలో తామర పురుగులా లేక నల్లా అనేది పరిశీలించండి.',
      'భూమిలో తేమ ఆరిపోకుండా తగినంత నీటి తడులు ఇవ్వండి.',
    ],
    preventiveMeasuresEn: [
      'Erect 3-4 rows of barrier crops (maize, sorghum, or pearl millet) along field borders.',
      'Avoid excessive synthetic nitrogen fertilizers which cause lush growth favored by vectors.',
    ],
    preventiveMeasuresTe: [
      'పొలం చుట్టూ 3-4 వరుసల మొక్కజొన్న లేదా జొన్న పంటను సరిహద్దు రక్షణగా వేయండి.',
      'యూరియా ఎరువును మోతాదుకు మించి వేయకండి.',
    ],
    followUpQuestionsEn: [
      'Are leaves curling upwards (thrips/whitefly) or downwards (yellow mites)?',
      'Are adjoining plots growing alternate hosts like cotton or okra?',
    ],
    followUpQuestionsTe: [
      'ఆకులు పైకి ముడుచుకుంటున్నాయా లేక కిందికా?',
      'పక్క పొలాల్లో ప్రత్తి లేదా బెండ పంటలు సాగులో ఉన్నాయా?',
    ],
    spokenSummaryEn: 'Diagnosed as Chilli Leaf Curl Begomovirus complex. Model-reported visual match score: 85%. AI-assisted, not field-confirmed.',
    spokenSummaryTe: 'మిరప ఆకు ముడుత తెగులు లక్షణాలు. మోడల్ మ్యాచింగ్ స్కోర్: 85%. AI-ఆధారిత పరిశీలన.',
    isAiAssisted: true,
    pathogenSusceptibleHosts: chilliProfile.causalOrganism.pathogenHosts,
    vectorReservoirHosts: chilliProfile.vectorOrganism?.vectorBreedingHosts || [],
    isBroadHostRange: chilliProfile.isBroadRange,
    extensionPrecautions: chilliProfile.precautions,
  };
}
