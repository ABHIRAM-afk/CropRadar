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

export interface BiologicalPrecaution {
  targetCrop: string;
  actionEn: string;
  actionTe: string;
  sourceAuthority: string;
  sourceUrl: string;
  reviewDate: string;
}

export interface CropMismatchInfo {
  isMismatch: boolean;
  detectedCropEn: string;
  detectedCropTe: string;
  activeCropEn: string;
  confidence: number;
  explanationEn: string;
  explanationTe: string;
}

export interface DiagnosisDetails {
  analysisType: 'crop_diagnosis' | 'pesticide_label' | 'agricultural_advisory';
  crop: {
    nameEn: string;
    nameTe: string;
    plantPart: string;
  };
  cropMismatch?: CropMismatchInfo;
  diagnosisOrProduct: {
    titleEn: string;
    titleTe: string;
    category: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutritional' | 'herbicide' | 'insecticide' | 'fungicide' | 'unknown';
    confidenceLevel: 'High' | 'Moderate' | 'Low / Inconclusive';
    confidenceNoteEn: string;
    confidenceNoteTe: string;
    aiMatchScore?: number; // 0.000 - 1.000 (visual match score, threshold > 0.700)
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
    dosagePerAcreMlOrG?: number;
    waterPerAcreLiters?: number;
    dosageVerifiedForActiveCrop?: boolean;
    unverifiedDosageWarningEn?: string;
    unverifiedDosageWarningTe?: string;
  };
  immediateActionsEn: string[];
  immediateActionsTe: string[];
  preventiveMeasuresEn: string[];
  preventiveMeasuresTe: string[];
  followUpQuestionsEn?: string[];
  followUpQuestionsTe?: string[];
  spokenSummaryEn: string;
  spokenSummaryTe: string;
  isAiAssisted?: boolean;
  requiresExpertVerification?: boolean;
  pathogenSusceptibleHosts?: string[];
  vectorReservoirHosts?: string[];
  isBroadHostRange?: boolean;
  extensionPrecautions?: BiologicalPrecaution[];
  autoOutbreakResult?: AutoOutbreakResult;
}

export interface AutoOutbreakResult {
  outbreakCreated: boolean;
  outbreakId?: string;
  alertDispatched: boolean;
  alertedFarmsCount: number;
  reason?: string;
  reasonTe?: string;
  error?: string;
  dispatchedTime?: string;
  dispatchedTimestamp?: string;
  report?: DiseaseReport;
  alertedFarms?: Array<{ id: string; farmerName: string; crop: string; distanceKm: number }>;
  dbWritesSucceeded: boolean;
}

export interface CropCycle {
  id: string;
  userId?: string;
  farmId?: string;
  cropNameEn: string;
  cropNameTe: string;
  cycleLabel: string;
  sowingDate?: string;
  stage?: string;
  status: 'active' | 'harvested' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  cropCycleId?: string;
  role: 'farmer' | 'assistant';
  timestamp: string;
  textEn: string;
  textTe?: string;
  imagePreview?: string;
  imageStoragePath?: string;
  diagnosisData?: DiagnosisDetails;
  weatherCard?: WeatherData;
  isAudioRecording?: boolean;
  outbreakAlert?: {
    outbreakId?: string;
    status: 'sent' | 'pending_confirmation' | 'cancelled' | 'unknown_host_range' | 'no_nearby_hosts' | 'location_unconfigured' | 'failed';
    diseaseName: string;
    crop: string;
    nearbyCount?: number;
    dispatchedTime?: string;
    dispatchedTimestamp?: string;
    lat: number;
    lon: number;
    generalizedLocation?: string;
    aiMatchScore?: number;
    pathogenHosts?: string[];
    vectorHosts?: string[];
    precautions?: BiologicalPrecaution[];
    cancellationReasonEn?: string;
    cancellationReasonTe?: string;
    dbWritesSucceeded?: boolean;
    statusMessageEn?: string;
    statusMessageTe?: string;
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
  severity: 'mild' | 'moderate' | 'severe';
  generalizedLocation: string;
  symptoms: string;
  aiMatchScore?: number;
  pathogenSusceptibleHosts?: string[];
  vectorReservoirHosts?: string[];
  isBroadHostRange?: boolean;
  isAiAssisted?: boolean;
  verified?: boolean;
  reporterUserId?: string;
  isOwnReport?: boolean;
}

export interface NotificationItem {
  id: string;
  outbreakId?: string;
  type: 'outbreak_nearby' | 'weather_warning' | 'resistance_alert';
  targetRelevance?: 'direct_host' | 'vector_host' | 'broad_host' | 'general_notice';
  titleEn: string;
  titleTe: string;
  descEn: string;
  descTe: string;
  distanceKm?: number;
  distanceIsApproximate?: boolean;
  referenceSourceAuthority?: string;
  referenceSourceUrl?: string;
  referenceReviewDate?: string;
  timestamp: string;
  outbreakTimestamp?: string;
  createdAt?: string;
  isRead: boolean;
  precautions?: BiologicalPrecaution[];
}

export interface DiaryEntry {
  id: string;
  cropCycleId?: string;
  cropName: string;
  timestamp: string;
  symptoms: string;
  diagnosis: string;
  confidence: string;
  imageThumbnail?: string;
  imageStoragePath?: string;
  treatedAreaAcres?: number; // Per-application treated area only
  totalChemicalUsed?: string;
  treatmentsRecorded?: string[];
  weatherSnapshot?: string;
  notes?: string;
}

export interface FarmerProfile {
  id?: string;
  name: string;
  phone?: string;
  farmLocation: string;
  latitude: number;
  longitude: number;
  preferredLanguage: Language;
  primaryCrop?: string;
  crops?: string[];
  acreage?: number;
  hasExplicitLocation?: boolean;
  locationSource?: 'none' | 'sector_centroid' | 'gps';
  isAnonymous?: boolean;
  email?: string;
  avatarUrl?: string;
}
