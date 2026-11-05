export type Language = 'en' | 'te';

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

export interface WeatherData {
  location: string;
  weather: WeatherCondition;
  evaluation: SprayWeatherEvaluation;
  forecast: Array<{
    day: string;
    temp: string;
    humidity: string;
    wind: string;
    rainProb: string;
    sprayWindow: 'optimal' | 'caution' | 'unsafe';
  }>;
  source: string;
}

export interface DiagnosisDetails {
  analysisType: 'crop_diagnosis' | 'pesticide_label' | 'agricultural_advisory';
  crop: {
    nameEn: string;
    nameTe: string;
    plantPart: string;
  };
  diagnosisOrProduct: {
    titleEn: string;
    titleTe: string;
    category: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutritional' | 'herbicide' | 'insecticide' | 'fungicide' | 'unknown';
    confidenceLevel: 'High' | 'Moderate' | 'Low / Inconclusive';
    confidenceNoteEn: string;
    confidenceNoteTe: string;
  };
  observationsEn: string[];
  observationsTe: string[];
  labelDetails?: {
    activeIngredient: string;
    concentration: string;
    formulation: string;
    moaCode: string;
    targetPests: string[];
    approvedCrops: string[];
    rainfastHours: string;
    safetyWarnings: string[];
  };
  immediateActionsEn: string[];
  immediateActionsTe: string[];
  preventiveMeasuresEn: string[];
  preventiveMeasuresTe: string[];
  followUpQuestionsEn?: string[];
  followUpQuestionsTe?: string[];
  spokenSummaryEn: string;
  spokenSummaryTe: string;
  requiresExpertVerification: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'farmer' | 'assistant';
  timestamp: string;
  textEn: string;
  textTe?: string;
  imagePreview?: string;
  diagnosisData?: DiagnosisDetails;
  weatherCard?: WeatherData;
  isAudioRecording?: boolean;
  outbreakAlert?: {
    diseaseName: string;
    crop: string;
    nearbyCount: number;
    dispatchedTime: string;
    lat: number;
    lon: number;
  };
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
}

export interface DiaryEntry {
  id: string;
  cropName: string;
  timestamp: string;
  symptoms: string;
  diagnosis: string;
  confidence: string;
  imageThumbnail?: string;
  treatmentsRecorded?: string[];
  weatherSnapshot?: string;
  notes?: string;
}

export interface FarmerProfile {
  name: string;
  phone: string;
  farmLocation: string;
  latitude: number;
  longitude: number;
  primaryCrop: string;
  acreage: number;
  preferredLanguage: Language;
}
