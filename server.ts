import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import {
  evaluateSprayWeather,
  encodeGeohash,
  filterReportsWithinRadius,
  findFarmsWithinAlertRadius,
  resolveDomainDiseaseProfile,
  evaluateBiologicalHostRelevance,
  isMatchScoreEligibleForAlert,
  formatApproximateDistance,
  calculatePesticideQuantity,
  BIOLOGICAL_DISEASE_CATALOG,
  type WeatherCondition,
  type DiseaseReport,
  type TreatmentRecord,
  type RegisteredFarm,
  type BiologicalPrecaution,
} from './src/utils/agriculturalLogic.ts';
import {
  supabaseAdmin,
  isSupabaseConfigured,
  verifyUserToken,
  getSignedImageUrl,
} from './src/lib/supabaseServer.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Express request extension for authenticated Supabase user
export interface AuthenticatedRequest extends Request {
  user?: any;
}

// User-scoped authentication middleware
app.use(async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const user = await verifyUserToken(authHeader);
    if (user) {
      req.user = user;
    }
  }
  next();
});

// Initialize Google GenAI client server-side with dynamic API key resolution
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const getAiClient = () =>
  new GoogleGenAI({
    apiKey: getGeminiApiKey(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

// Registered community farms for 5km proximity broadcasting (in-memory demo pool)
const registeredCommunityFarms: RegisteredFarm[] = [
  {
    id: 'farm-nearby-1',
    farmerName: 'K. Venkat Rao',
    phone: '+91 98481 22334',
    latitude: 16.3195,
    longitude: 80.4485, // ~1.8 km
    villageSector: 'Prathipadu East Sector',
    crops: ['Chilli', 'Cotton'],
  },
  {
    id: 'farm-nearby-2',
    farmerName: 'B. Anjaneyulu',
    phone: '+91 94402 33445',
    latitude: 16.292,
    longitude: 80.428, // ~2.1 km
    villageSector: 'Guntur Rural South Sector',
    crops: ['Chilli', 'Turmeric'],
  },
  {
    id: 'farm-nearby-3',
    farmerName: 'M. Siva Kumar',
    phone: '+91 99890 55667',
    latitude: 16.328,
    longitude: 80.461, // ~3.5 km
    villageSector: 'Pedakakani Agricultural Belt',
    crops: ['Paddy', 'Maize'],
  },
  {
    id: 'farm-nearby-4',
    farmerName: 'Ch. Subba Rao',
    phone: '+91 98661 77889',
    latitude: 16.335,
    longitude: 80.421, // ~3.6 km
    villageSector: 'Gorantla Farmlands',
    crops: ['Chilli', 'Cotton'],
  },
  {
    id: 'farm-nearby-5',
    farmerName: 'G. Nageswara Rao',
    phone: '+91 97012 33990',
    latitude: 16.342,
    longitude: 80.439, // ~3.9 km
    villageSector: 'Namburu North Cluster',
    crops: ['Paddy', 'Chilli'],
  },
  {
    id: 'farm-remote-1',
    farmerName: 'P. Sambasiva Rao',
    phone: '+91 94901 88223',
    latitude: 16.485,
    longitude: 80.612, // ~26 km (Tenali / Vijayawada)
    villageSector: 'Tenali North Basin',
    crops: ['Paddy'],
  },
];

function findCatalogEntry(title?: string): {
  pathogenHosts: string[];
  vectorHosts: string[];
  isBroadHost: boolean;
  precautions: BiologicalPrecaution[];
} {
  if (!title) {
    return { pathogenHosts: [], vectorHosts: [], isBroadHost: false, precautions: [] };
  }
  const query = title.toLowerCase();
  for (const key of Object.keys(BIOLOGICAL_DISEASE_CATALOG)) {
    const profile = BIOLOGICAL_DISEASE_CATALOG[key];
    if (
      query.includes(profile.conditionKey.toLowerCase()) ||
      query.includes(profile.conditionNameEn.toLowerCase()) ||
      query.includes(profile.causalOrganism.name.toLowerCase()) ||
      profile.causalOrganism.pathogenHosts.some((h) => query.includes(h.toLowerCase()))
    ) {
      return {
        pathogenHosts: profile.causalOrganism.pathogenHosts,
        vectorHosts: profile.vectorOrganism?.vectorBreedingHosts || [],
        isBroadHost: profile.isBroadRange,
        precautions: profile.precautions,
      };
    }
  }
  return { pathogenHosts: [], vectorHosts: [], isBroadHost: false, precautions: [] };
}

// In-memory fallback stores for local offline development
const inMemoryCropCycles: Record<string, any[]> = {};
const inMemoryChatMessages: Record<string, any[]> = {};
const inMemoryFarmProfiles: Record<string, any> = {};

const inMemoryFieldDiaryStore: Array<{
  id: string;
  userId?: string;
  cropCycleId?: string;
  cropName: string;
  timestamp: string;
  symptoms: string;
  diagnosis: string;
  confidence: string;
  imageThumbnail?: string;
  imageStoragePath?: string;
  treatedAreaAcres?: number;
  totalChemicalUsed?: string;
  treatmentsRecorded?: string[];
  weatherSnapshot?: string;
  notes?: string;
}> = [
  {
    id: 'diary-demo-1',
    userId: 'guest-session',
    cropName: 'Chilli (మిరప)',
    timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    symptoms: 'Marginal leaf curling, stunted growth, light chlorotic spots',
    diagnosis: 'Chilli Leaf Curl Virus (Begomovirus / Thrips transmission)',
    confidence: 'AI-assisted, not field-confirmed (Match score: 0.84)',
    imageThumbnail: '/src/assets/images/chilli_leaf_disease_1793889004111.jpg',
    treatedAreaAcres: 2.5,
    totalChemicalUsed: 'Neem oil 1500 ppm @ 1.25 L in 500 L water',
    treatmentsRecorded: ['Yellow sticky traps deployed (8 traps/ac)', 'Neem oil 1500 ppm prophylactic spray'],
    weatherSnapshot: '31°C, 62% humidity, calm wind',
    notes: 'Vector management initiated per ANGRAU advisory. Follow up in 5 days.',
  },
  {
    id: 'diary-demo-2',
    userId: 'guest-session',
    cropName: 'Paddy / Rice (వరి)',
    timestamp: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    symptoms: 'Spindle-shaped brown lesions with grey center on upper leaf blades',
    diagnosis: 'Rice Leaf Blast (Magnaporthe oryzae)',
    confidence: 'AI-assisted, not field-confirmed (Match score: 0.89)',
    imageThumbnail: '/src/assets/images/rice_leaf_blast_1793889004976.jpg',
    treatedAreaAcres: 3.0,
    totalChemicalUsed: 'Tricyclazole 75% WP @ 360g in 600 L water',
    treatmentsRecorded: ['Tricyclazole 75% WP applied', 'Excessive nitrogen top-dressing postponed'],
    weatherSnapshot: '27°C, 82% humidity, light drizzle',
    notes: 'Lesions dried up within 4 days. Drainage channels cleared.',
  },
];

// Community Outbreak Reports (generalized centroid coordinates ~2 km)
const communityDiseaseReports: DiseaseReport[] = [
  {
    id: 'outbreak-1',
    crop: 'Chilli (మిరప)',
    diseaseName: 'Black Thrips & Chilli Leaf Curl',
    diseaseCategory: 'pest',
    latitude: 16.315,
    longitude: 80.442,
    timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    severity: 'severe',
    generalizedLocation: 'Prathipadu Block (Sector 4 Centroid)',
    symptoms: 'Upward leaf curling, flower drop, silvering on leaf undersides.',
    aiMatchScore: 0.865,
    isAiAssisted: true,
    pathogenSusceptibleHosts: ['Chilli', 'Paprika', 'Capsicum'],
    vectorReservoirHosts: ['Cotton', 'Tomato', 'Brinjal', 'Weeds (Parthenium)'],
  },
  {
    id: 'outbreak-2',
    crop: 'Paddy (వరి)',
    diseaseName: 'Rice Blast & Sheath Blight',
    diseaseCategory: 'fungal',
    latitude: 16.348,
    longitude: 80.465,
    timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    severity: 'moderate',
    generalizedLocation: 'Tenali Rural Belt (Sector 2 Centroid)',
    symptoms: 'Spindle shaped necrotic lesions and water-soaked sheath spots.',
    aiMatchScore: 0.812,
    isAiAssisted: true,
    pathogenSusceptibleHosts: ['Paddy', 'Rice'],
    vectorReservoirHosts: ['Grasses (Echinochloa)'],
  },
  {
    id: 'outbreak-3',
    crop: 'Cotton (ప్రత్తి)',
    diseaseName: 'Pink Bollworm & Whitefly',
    diseaseCategory: 'pest',
    latitude: 16.275,
    longitude: 80.395,
    timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    severity: 'moderate',
    generalizedLocation: 'Medikonduru Agricultural Zone Centroid',
    symptoms: 'Rosetted flowers and bore holes in young bolls.',
    aiMatchScore: 0.774,
    isAiAssisted: true,
    pathogenSusceptibleHosts: ['Cotton', 'Bt Cotton', 'Okra (Bhendi)'],
    vectorReservoirHosts: ['Chilli', 'Tomato', 'Castor'],
  },
  {
    id: 'outbreak-4',
    crop: 'Maize (మొక్కజొన్న)',
    diseaseName: 'Fall Armyworm (Spodoptera frugiperda)',
    diseaseCategory: 'pest',
    latitude: 16.362,
    longitude: 80.412,
    timestamp: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
    severity: 'severe',
    generalizedLocation: 'Mangalagiri South Farmlands Centroid',
    symptoms: 'Shot holes on whorl leaves and visible frass pellets.',
    aiMatchScore: 0.891,
    isAiAssisted: true,
    pathogenSusceptibleHosts: ['Maize', 'Sweet Corn'],
    vectorReservoirHosts: ['Sorghum', 'Sugarcane', 'Millets'],
  },
];

// Attach geohashes
communityDiseaseReports.forEach((report) => {
  if (!report.geohash) {
    report.geohash = encodeGeohash(report.latitude, report.longitude, 6);
  }
});

// Notifications Queue (in-memory demo fallback)
const inMemoryNotificationsQueue: Array<{
  id: string;
  userId?: string;
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
  isRead: boolean;
  precautions?: BiologicalPrecaution[];
  createdAt?: string;
}> = [
  {
    id: 'notif-1',
    userId: 'guest-session',
    type: 'outbreak_nearby',
    targetRelevance: 'direct_host',
    titleEn: 'Chilli Leaf Curl & Thrips Cluster (AI-assisted, not field-confirmed)',
    titleTe: 'మిరప ఆకుముడుత & తామర పురుగుల గుర్తింపు (AI-ఆధారిత పరిశీలన · క్షేత్రస్థాయిలో ధృవీకరించబడలేదు)',
    descEn: 'AI visual match (score: 0.865) detected ~3.2 km from Prathipadu centroid. High direct host risk for Chilli. Non-chemical preventive action recommended.',
    descTe: 'ప్రత్తిపాడు సెక్టార్ సెంట్రాయిడ్ నుండి ~3.2 కి.మీ పరిధిలో AI నమూనా గుర్తించింది. మిరప పంటకు నేరుగా సోకే అవకాశం ఉంది.',
    distanceKm: 3.2,
    distanceIsApproximate: true,
    referenceSourceAuthority: 'ANGRAU Integrated Pest Management Advisory',
    referenceSourceUrl: 'https://angrau.ac.in',
    referenceReviewDate: '2026-09-15',
    timestamp: '2 hours ago',
    isRead: false,
    createdAt: new Date().toISOString(),
    precautions: [
      {
        targetCrop: 'Chilli',
        actionEn: 'Install 8–10 blue and yellow sticky traps per acre at crop canopy height.',
        actionTe: 'ఎకరాకు 8-10 పసుపు, నీలి రంగు జిగురు అట్టలను పైరు ఎత్తులో అమర్చండి.',
        sourceAuthority: 'ANGRAU',
        sourceUrl: 'https://angrau.ac.in',
        reviewDate: '2026-09-15',
      },
      {
        targetCrop: 'Chilli',
        actionEn: 'Scout leaf undersides in morning hours; avoid broad-spectrum chemical sprays.',
        actionTe: 'ఉదయం వేళల్లో ఆకుల అడుగు భాగాన్ని పరిశీలించండి; రసాయన మందులను విచక్షణారహితంగా వాడవద్దు.',
        sourceAuthority: 'ICAR-IIHR',
        sourceUrl: 'https://iihr.res.in',
        reviewDate: '2026-08-10',
      },
    ],
  },
  {
    id: 'notif-2',
    userId: 'guest-session',
    type: 'weather_warning',
    targetRelevance: 'general_notice',
    titleEn: 'High Spray Drift Window Today (12:00 - 3:30 PM)',
    titleTe: 'నేటి మధ్యాహ్నం అధిక గాలి వేగం వల్ల పిచికారీ అనుకూలం కాదు',
    descEn: 'Wind speed expected to exceed 18 km/h. High chemical drift hazard. Spray only during early morning or late evening.',
    descTe: 'గాలి వేగం 18 km/h కంటే ఎక్కువ ఉండే అవకాశం ఉంది. మందు పక్క పొలాలకు కొట్టుకుపోయే ప్రమాదం ఉంది.',
    timestamp: '5 hours ago',
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * 0. CONFIG ENDPOINT (Supplies public client Supabase keys)
 */
app.get('/api/config', (_req: Request, res: Response) => {
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabasePublishableKey: publishableKey,
    // Keep the old response property for clients that have not been updated yet.
    supabaseAnonKey: publishableKey,
  });
});

/**
 * 1. CROP-CYCLES ENDPOINTS (One continuing conversation per crop cycle)
 */
app.get('/api/crop-cycles', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (userId) {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('crop_cycles')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch crop_cycles error:', error);
          return res.status(500).json({ success: false, error: 'Failed to fetch crop cycles' });
        }

        const cycles = (data || []).map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          farm_id: c.farm_id,
          crop_name_en: c.crop_name_en,
          crop_name_te: c.crop_name_te,
          crop_name: c.crop_name_en,
          cycle_label: c.cycle_label,
          sowing_date: c.sowing_date,
          status: c.status,
          created_at: c.created_at,
        }));

        return res.json({ success: true, cycles });
      } catch (err: any) {
        console.warn('Supabase fetch crop_cycles exception:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // In-memory user-scoped store if Supabase not configured (isolated per user ID)
    const userCycles = inMemoryCropCycles[userId] || [];
    return res.json({ success: true, cycles: userCycles });
  }

  // Unauthenticated / Guest session: Return guest cycles only
  res.json({ success: true, cycles: inMemoryCropCycles['guest-session'] || [] });
});

app.post('/api/crop-cycles', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { cropName, cropNameEn, cropNameTe, sowingDate, cycleLabel } = req.body;

  const resolvedCropNameEn = cropNameEn || cropName;
  if (!resolvedCropNameEn) {
    return res.status(400).json({ success: false, error: 'Crop name is required' });
  }
  const resolvedCropNameTe = cropNameTe || resolvedCropNameEn;

  if (userId && isSupabaseConfigured && supabaseAdmin) {
    try {
      // Find or create primary farm for this user using correct schema column (farm_name)
      let farmId: string | null = null;
      const { data: farmData } = await supabaseAdmin
        .from('farms')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (farmData?.id) {
        farmId = farmData.id;
      } else {
        const { data: newFarm, error: farmErr } = await supabaseAdmin
          .from('farms')
          .insert({
            user_id: userId,
            farm_name: 'Primary Farm',
            village_sector: 'Unconfigured Sector',
            has_explicit_location: false,
            location_source: 'none',
          })
          .select('id')
          .single();

        if (farmErr) {
          console.error('Failed to create farm for crop cycle:', farmErr);
          throw farmErr;
        }
        farmId = newFarm?.id || null;
      }

      if (farmId) {
        const { data: newCycle, error: cycleErr } = await supabaseAdmin
          .from('crop_cycles')
          .insert({
            user_id: userId,
            farm_id: farmId,
            crop_name_en: resolvedCropNameEn,
            crop_name_te: resolvedCropNameTe,
            cycle_label: cycleLabel || `${resolvedCropNameEn} (${new Date().getFullYear()})`,
            sowing_date: sowingDate || new Date().toISOString().split('T')[0],
            status: 'active',
          })
          .select('*')
          .single();

        if (cycleErr) {
          console.error('Failed to insert crop_cycle into Supabase:', cycleErr);
          throw cycleErr;
        }

        if (newCycle) {
          return res.json({
            success: true,
            cycle: {
              ...newCycle,
              crop_name: newCycle.crop_name_en,
            },
          });
        }
      }
    } catch (err: any) {
      console.warn('Supabase create crop_cycle error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Could not save crop cycle' });
    }
  }

  // Fallback to in-memory store for guest or when Supabase offline
  const targetId = userId || 'guest-session';
  const fallbackCycle = {
    id: `cycle-${Date.now()}`,
    user_id: targetId,
    crop_name_en: resolvedCropNameEn,
    crop_name_te: resolvedCropNameTe,
    crop_name: resolvedCropNameEn,
    cycle_label: cycleLabel || `${resolvedCropNameEn} (${new Date().getFullYear()})`,
    sowing_date: sowingDate || new Date().toISOString().split('T')[0],
    status: 'active',
    created_at: new Date().toISOString(),
  };

  if (!inMemoryCropCycles[targetId]) inMemoryCropCycles[targetId] = [];
  inMemoryCropCycles[targetId].unshift(fallbackCycle);

  res.json({ success: true, cycle: fallbackCycle });
});

app.get('/api/crop-cycles/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
  const cycleId = req.params.id;
  const userId = req.user?.id;

  if (userId) {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        // Enforce ownership: Verify crop cycle belongs to authenticated user
        const { data: cycle, error: cycleErr } = await supabaseAdmin
          .from('crop_cycles')
          .select('id')
          .eq('id', cycleId)
          .eq('user_id', userId)
          .maybeSingle();

        if (cycleErr || !cycle) {
          // If the cycle does not belong to this user, do not return messages
          return res.json({ success: true, messages: [] });
        }

        const { data, error } = await supabaseAdmin
          .from('chat_messages')
          .select('*')
          .eq('crop_cycle_id', cycleId)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('Supabase fetch messages error:', error);
          return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
        }

        const formatted = (data || []).map((m: any) => ({
          id: m.id,
          cropCycleId: m.crop_cycle_id,
          role: m.role,
          textEn: m.text_en || m.content || '',
          textTe: m.text_te || m.text_en || m.content || '',
          imageStoragePath: m.image_storage_path,
          diagnosisData: m.diagnosis_payload,
          weatherCard: m.weather_card_payload,
          outbreakAlert: m.outbreak_alert_payload,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        return res.json({ success: true, messages: formatted });
      } catch (err) {
        console.warn('Supabase fetch messages error:', err);
        return res.status(500).json({ success: false, error: 'Could not load messages' });
      }
    }

    // In-memory messages isolated per cycle
    return res.json({ success: true, messages: inMemoryChatMessages[cycleId] || [] });
  }

  // Guest session
  res.json({ success: true, messages: inMemoryChatMessages[cycleId] || [] });
});

/**
 * 2. FARM PROFILE & EXPLICIT LOCATION OPT-IN
 * (Default Guntur is purely a viewing demo; alert dispatch requires has_explicit_location = true)
 */
app.get('/api/farm-profile', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (isSupabaseConfigured && supabaseAdmin && userId) {
    try {
      const [{ data: farm, error: farmError }, { data: profile }] = await Promise.all([
        supabaseAdmin
        .from('farms')
        .select('id, farm_name, village_sector, latitude, longitude, has_explicit_location, location_source')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle(),
        supabaseAdmin.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      ]);

      if (farmError) throw farmError;
      return res.json({
        success: true,
        farm: farm ? {
          id: farm.id,
          name: profile?.full_name || farm.farm_name || 'Farmer',
          villageSector: farm.village_sector || '',
          hasExplicitLocation: farm.has_explicit_location || false,
          locationSource: farm.location_source || 'none',
          latitude: farm.latitude == null ? null : Number(farm.latitude),
          longitude: farm.longitude == null ? null : Number(farm.longitude),
        } : null,
      });
    } catch (err) {
      console.warn('Supabase fetch farm profile error:', err);
      return res.status(500).json({ success: false, error: 'Could not load your saved farm profile.' });
    }
  }

  const fallbackMem = inMemoryFarmProfiles[userId || 'guest'];
  res.json({
    success: true,
    farm: fallbackMem ? {
      id: 'saved-farm',
      name: 'Farmer',
      villageSector: fallbackMem.village_sector || 'Unconfigured Sector',
      hasExplicitLocation: fallbackMem.has_explicit_location || false,
      locationSource: fallbackMem.location_source || 'none',
      latitude: fallbackMem.latitude,
      longitude: fallbackMem.longitude,
      crops: ['Chilli (మిరప)'],
    } : {
      id: 'demo-farm',
      name: 'Farmer Guest',
      villageSector: 'Guntur Viewing Region (Demo)',
      hasExplicitLocation: false,
      locationSource: 'none',
      latitude: 16.3067,
      longitude: 80.4365,
      crops: ['Chilli (మిరప)'],
    },
  });
});

app.post('/api/farm-profile', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const {
    name,
    villageSector,
    hasExplicitLocation,
    locationSource,
    latitude,
    longitude,
  } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Sign in to save your farm profile to Supabase.' });
  }
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return res.status(503).json({ success: false, error: 'Supabase server credentials are not configured.' });
  }

  try {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: name || 'Farmer', updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (profileError) throw profileError;

    const { data: existingFarm, error: lookupError } = await supabaseAdmin
      .from('farms')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const farmValues = {
      farm_name: 'My Farm',
      village_sector: villageSector || 'Unconfigured Sector',
      has_explicit_location: Boolean(hasExplicitLocation),
      location_source: locationSource || 'none',
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      updated_at: new Date().toISOString(),
    };

    const result = existingFarm?.id
      ? await supabaseAdmin.from('farms').update(farmValues).eq('id', existingFarm.id).select('id').single()
      : await supabaseAdmin.from('farms').insert({ user_id: userId, ...farmValues }).select('id').single();
    if (result.error) throw result.error;

    inMemoryFarmProfiles[userId] = farmValues;
    return res.json({ success: true });
  } catch (err) {
    console.warn('Supabase save farm profile error:', err);
    return res.status(500).json({ success: false, error: 'Could not save your farm profile.' });
  }
});

/**
 * 3. WEATHER INTELLIGENCE API
 */
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 16.3067;
    const lon = parseFloat(req.query.lon as string) || 80.4365;
    const locationName = (req.query.location as string) || 'Guntur Agricultural Belt, AP';

    let weatherData: WeatherCondition;
    let rawSource = 'agro-sensor-station';

    if (process.env.OPENWEATHER_API_KEY) {
      try {
        const owmUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`;
        const resp = await fetch(owmUrl);
        if (resp.ok) {
          const owm = await resp.json();
          weatherData = {
            temperatureC: Math.round(owm.main.temp),
            humidityPercent: owm.main.humidity,
            windSpeedKmH: Math.round((owm.wind.speed || 2) * 3.6),
            rainProbabilityPercent: owm.rain ? 70 : 15,
            expectedRainfallMm: owm.rain?.['1h'] || 0,
            description: owm.weather?.[0]?.description || 'Clear sky',
          };
          rawSource = 'OpenWeatherMap API';
        } else {
          throw new Error('OpenWeather API responded with non-200');
        }
      } catch (e) {
        weatherData = generateRealisticAgroWeather(lat, lon);
      }
    } else {
      weatherData = generateRealisticAgroWeather(lat, lon);
    }

    const evaluation = evaluateSprayWeather(weatherData);

    const forecast = [
      {
        day: 'Today (ఈరోజు)',
        temp: `${weatherData.temperatureC}°C`,
        humidity: `${weatherData.humidityPercent}%`,
        wind: `${weatherData.windSpeedKmH} km/h`,
        rainProb: `${weatherData.rainProbabilityPercent}%`,
        sprayWindow: evaluation.status,
      },
      {
        day: 'Tomorrow (రేపు)',
        temp: `${weatherData.temperatureC + 1}°C`,
        humidity: `${Math.max(45, weatherData.humidityPercent - 8)}%`,
        wind: '8 km/h',
        rainProb: '10%',
        sprayWindow: 'optimal' as const,
      },
      {
        day: 'Day 3 (ఎల్లుండి)',
        temp: `${weatherData.temperatureC - 1}°C`,
        humidity: `${weatherData.humidityPercent + 5}%`,
        wind: '14 km/h',
        rainProb: '35%',
        sprayWindow: 'caution' as const,
      },
      {
        day: 'Day 4 (4వ రోజు)',
        temp: `${weatherData.temperatureC}°C`,
        humidity: '58%',
        wind: '9 km/h',
        rainProb: '5%',
        sprayWindow: 'optimal' as const,
      },
    ];

    res.json({
      success: true,
      location: locationName,
      coordinates: { lat, lon },
      weather: weatherData,
      evaluation,
      forecast,
      source: rawSource,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Weather error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function generateRealisticAgroWeather(lat: number, lon: number): WeatherCondition {
  const currentHour = new Date().getHours();
  const baseTemp = currentHour >= 11 && currentHour <= 15 ? 31 : currentHour >= 18 || currentHour <= 6 ? 24 : 28;
  const baseHumidity = currentHour >= 11 && currentHour <= 15 ? 54 : 76;
  const wind = 7 + Math.floor((Math.sin(currentHour) + 1) * 3);

  return {
    temperatureC: baseTemp,
    humidityPercent: baseHumidity,
    windSpeedKmH: wind,
    rainProbabilityPercent: 20,
    expectedRainfallMm: 0,
    description: 'Partly sunny with light breeze',
  };
}

function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export interface OutbreakProcessInput {
  reporterUserId?: string;
  sourceCropCycleId?: string;
  cropName: string;
  diseaseName: string;
  diseaseCategory?: string;
  aiMatchScore: number;
  symptoms?: string;
}

export interface OutbreakProcessResult {
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

/**
 * Core Outbreak Processing & Notification Dispatch Engine
 * - Triggered automatically from actual server image analysis score (>0.700)
 * - Resolves reporter farm from Supabase DB (never trusts browser-supplied score or coordinates)
 * - Identifies nearby farms within 5 km whose active crops match the biological host range
 * - Prevents duplicate notifications for same recipient & outbreak
 * - Returns accurate delivery status & database write verification
 */
async function processOutbreakAndNotifications(
  input: OutbreakProcessInput
): Promise<OutbreakProcessResult> {
  const {
    reporterUserId,
    sourceCropCycleId,
    cropName,
    diseaseName,
    diseaseCategory = 'fungal',
    aiMatchScore,
    symptoms = 'Automated AI multimodal diagnosis verification',
  } = input;

  // 1. Strict Gate: AI Match score must be > 0.700 (and <= 1.000)
  if (!isMatchScoreEligibleForAlert(aiMatchScore)) {
    return {
      outbreakCreated: false,
      alertDispatched: false,
      alertedFarmsCount: 0,
      dbWritesSucceeded: true,
      reason: `AI match score (${(aiMatchScore * 100).toFixed(1)}%) is <= 70.0%. Sub-threshold detections do not trigger community alerts.`,
      reasonTe: `AI స్కోర్ (${(aiMatchScore * 100).toFixed(1)}%) 70.0% కంటే తక్కువగా ఉంది. కమ్యూనిటీ అలెర్ట్ ప్రారంభించబడలేదు.`,
    };
  }

  // 2. Resolve biological host profile from domain catalog
  const entry = findCatalogEntry(diseaseName);
  const pathogenHosts = entry.pathogenHosts;
  const vectorHosts = entry.vectorHosts;
  const isBroadHost = entry.isBroadHost;
  const extensionPrecautions = entry.precautions;

  // Requirement: If the affected crop range is unknown, don't send targeted alerts; explain why.
  if (!pathogenHosts || pathogenHosts.length === 0) {
    return {
      outbreakCreated: false,
      alertDispatched: false,
      alertedFarmsCount: 0,
      dbWritesSucceeded: true,
      reason: 'The host crop range for this suspected condition is unconfirmed by extension authorities. Targeted community alerts were withheld to prevent false alarms. Please provide clearer symptom photos or consult local agricultural extension.',
      reasonTe: 'ఈ తెగులు వ్యాప్తి చెందే నిర్దిష్ట పంటల హోస్ట్ శ్రేణి ధృవీకరించబడలేదు. తప్పుడు అలర్ట్‌లను నివారించడానికి సమాచారం నిలిపివేయబడింది. దయచేసి స్పష్టమైన ఫోటోలను అందించండి లేదా స్థానిక వ్యవసాయ అధికారిని సంప్రదించండి.',
    };
  }

  // 3. Resolve Farmer Location from Database (NEVER trust browser coordinates!)
  let farmerLat: number | null = null;
  let farmerLon: number | null = null;
  let farmerSector = 'Agricultural Belt Centroid';
  let hasLocationConsent = false;

  if (isSupabaseConfigured && supabaseAdmin && reporterUserId && isValidUuid(reporterUserId)) {
    try {
      const { data: farmData, error: farmErr } = await supabaseAdmin
        .from('farms')
        .select('id, village_sector, latitude, longitude, has_explicit_location, location_source')
        .eq('user_id', reporterUserId)
        .eq('has_explicit_location', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(1)
        .maybeSingle();

      if (!farmErr && farmData && farmData.latitude != null && farmData.longitude != null) {
        farmerLat = Number(farmData.latitude);
        farmerLon = Number(farmData.longitude);
        farmerSector = farmData.village_sector || farmerSector;
        hasLocationConsent = Boolean(farmData.has_explicit_location);
      }
    } catch (err: any) {
      console.warn('Could not query reporter farm from Supabase:', err.message);
    }
  }

  // Check in-memory store for guest or offline testing
  if (farmerLat == null || farmerLon == null) {
    const inMem = inMemoryFarmProfiles[reporterUserId || 'guest'];
    if (inMem && inMem.has_explicit_location && inMem.latitude != null && inMem.longitude != null) {
      farmerLat = Number(inMem.latitude);
      farmerLon = Number(inMem.longitude);
      farmerSector = inMem.village_sector || farmerSector;
      hasLocationConsent = true;
    }
  }

  // If farmer has not granted explicit location consent or configured coordinates:
  if (farmerLat == null || farmerLon == null || !hasLocationConsent) {
    return {
      outbreakCreated: false,
      alertDispatched: false,
      alertedFarmsCount: 0,
      dbWritesSucceeded: true,
      reason: 'Farm location is unconfigured or location consent has not been granted. Configure your sector in Farm Profile to enable automatic 5 km community alerts.',
      reasonTe: 'మీ పొలం సెక్టార్ కాన్ఫిగర్ చేయబడలేదు లేదా లొకేషన్ అనుమతి ఇవ్వబడలేదు. పొలం ప్రొఫైల్‌లో మీ సెక్టార్‌ను సెట్ చేయండి.',
    };
  }

  // 4. Compute Generalized Centroid (~2 km grid) to shield exact farmer GPS
  const generalizedLat = Math.round(farmerLat * 50) / 50 + 0.003;
  const generalizedLon = Math.round(farmerLon * 50) / 50 + 0.003;
  const safeSectorLabel = farmerSector.includes('centroid')
    ? farmerSector
    : `${farmerSector} (~2 km centroid)`;

  // 5. Check constraint safe category
  const allowedCategories = ['fungal', 'bacterial', 'viral', 'pest', 'nutritional'] as const;
  const normalizedCategory = allowedCategories.includes(diseaseCategory as any)
    ? (diseaseCategory as 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutritional')
    : 'fungal';

  // 6. Build the report object
  const newReport: DiseaseReport = {
    id: `auto-outbreak-${Date.now()}`,
    crop: cropName,
    diseaseName,
    diseaseCategory: normalizedCategory,
    latitude: generalizedLat,
    longitude: generalizedLon,
    geohash: encodeGeohash(generalizedLat, generalizedLon, 6),
    timestamp: new Date().toISOString(),
    severity: 'severe',
    generalizedLocation: safeSectorLabel,
    symptoms: symptoms || 'Automated AI multimodal diagnosis verification',
    aiMatchScore: Number(aiMatchScore.toFixed(3)),
    isAiAssisted: true,
    pathogenSusceptibleHosts: pathogenHosts,
    vectorReservoirHosts: vectorHosts,
    isBroadHostRange: isBroadHost,
  };

  // 7. Save to Supabase `disease_outbreaks` table (server service role)
  let savedOutbreakId: string | null = null;
  let dbOutbreakSuccess = false;

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const outbreakPayload: any = {
        crop: newReport.crop,
        disease_name: newReport.diseaseName,
        disease_category: newReport.diseaseCategory,
        latitude: generalizedLat,
        longitude: generalizedLon,
        geohash: newReport.geohash,
        severity: newReport.severity,
        generalized_location: newReport.generalizedLocation,
        symptoms: newReport.symptoms,
        ai_match_score: newReport.aiMatchScore,
        pathogen_susceptible_hosts: pathogenHosts,
        vector_reservoir_hosts: vectorHosts,
        is_broad_host_range: isBroadHost,
        is_ai_assisted: true,
      };

      if (reporterUserId && isValidUuid(reporterUserId)) {
        outbreakPayload.reporter_user_id = reporterUserId;
      }
      if (sourceCropCycleId && isValidUuid(sourceCropCycleId)) {
        outbreakPayload.source_crop_cycle_id = sourceCropCycleId;
      }

      const { data: outbreakData, error: outbreakErr } = await supabaseAdmin
        .from('disease_outbreaks')
        .insert(outbreakPayload)
        .select('id')
        .single();

      if (outbreakErr) {
        console.warn('Failed to insert outbreak into Supabase:', outbreakErr.message);
      } else if (outbreakData?.id) {
        savedOutbreakId = outbreakData.id;
        newReport.id = String(savedOutbreakId);
        dbOutbreakSuccess = true;
      }
    } catch (err: any) {
      console.warn('Exception inserting outbreak into Supabase:', err.message);
    }
  }

  // Update in-memory community reports so Disease Radar Map immediately reflects this
  communityDiseaseReports.unshift(newReport);

  // 8. Identify candidate nearby farms from Supabase within 5 km
  let nearbyFarms: Array<RegisteredFarm & { distanceKm: number }> = [];

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      // Clean separate queries to avoid PostgREST relationship embed failures on composite keys
      const { data: dbFarms, error: farmsErr } = await supabaseAdmin
        .from('farms')
        .select('id, user_id, farm_name, village_sector, latitude, longitude, has_explicit_location, location_source')
        .eq('has_explicit_location', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      const { data: dbCycles } = await supabaseAdmin
        .from('crop_cycles')
        .select('id, user_id, farm_id, crop_name_en, crop_name_te, status')
        .eq('status', 'active');

      const { data: dbProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name');

      if (!farmsErr && dbFarms && dbFarms.length > 0) {
        const candidateFarms: RegisteredFarm[] = dbFarms
          .filter((f: any) => !reporterUserId || f.user_id !== reporterUserId) // Exclude self!
          .map((f: any) => {
            const userCycles = (dbCycles || []).filter((c: any) => c.user_id === f.user_id);
            const activeCrops: string[] = userCycles
              .map((c: any) => c.crop_name_en || c.crop_name_te)
              .filter(Boolean);

            const profile = (dbProfiles || []).find((p: any) => p.id === f.user_id);
            const farmerName = profile?.full_name || f.farm_name || 'Farmer';

            return {
              id: f.user_id, // Profile / User ID for notification recipient
              farmerName,
              phone: '',
              latitude: Number(f.latitude),
              longitude: Number(f.longitude),
              villageSector: f.village_sector || 'Agricultural Belt Centroid',
              crops: activeCrops.length > 0 ? activeCrops : ['General Crops'],
              hasExplicitLocation: f.has_explicit_location,
              locationSource: f.location_source,
            };
          });

        nearbyFarms = findFarmsWithinAlertRadius(farmerLat, farmerLon, candidateFarms, 5);
      }
    } catch (queryErr: any) {
      console.warn('Failed to query candidate farms from Supabase:', queryErr.message);
    }
  } else {
    // In-memory demo fallback for local offline testing
    const candidateFarms = registeredCommunityFarms.filter((f) => !reporterUserId || f.id !== reporterUserId);
    nearbyFarms = findFarmsWithinAlertRadius(farmerLat, farmerLon, candidateFarms, 5);
  }

  // 9. Deliver notifications strictly to biologically susceptible hosts (max 5 km)
  const dispatchedAlerts: Array<{ id: string; farmerName: string; crop: string; distanceKm: number }> = [];
  let allNotifWritesSucceeded = true;

  for (const farm of nearbyFarms) {
    let highestRelevance: 'direct_host' | 'vector_host' | 'broad_host' | null = null;
    let matchingCropName = farm.crops[0] || 'Unknown';
    let bestExplanationEn = '';
    let bestExplanationTe = '';

    for (const c of farm.crops) {
      const rel = evaluateBiologicalHostRelevance(diseaseName, c);
      if (rel.relevance === 'direct_host') {
        highestRelevance = 'direct_host';
        matchingCropName = c;
        bestExplanationEn = rel.explanationEn;
        bestExplanationTe = rel.explanationTe;
        break;
      } else if (rel.relevance === 'vector_host') {
        highestRelevance = 'vector_host';
        matchingCropName = c;
        bestExplanationEn = rel.explanationEn;
        bestExplanationTe = rel.explanationTe;
      } else if (rel.relevance === 'broad_host' && !highestRelevance) {
        highestRelevance = 'broad_host';
        matchingCropName = c;
        bestExplanationEn = rel.explanationEn;
        bestExplanationTe = rel.explanationTe;
      }
    }

    // Do NOT notify unrelated crop owners!
    if (!highestRelevance) {
      continue;
    }

    const approxDistLabel = formatApproximateDistance(farm.distanceKm, 'sector_centroid', farm.villageSector, 'en');

    let titleEn = `⚠️ Nearby Outbreak: ${diseaseName}`;
    let titleTe = `⚠️ పరిసరాల్లో తెగులు గమనిక: ${diseaseName}`;

    if (highestRelevance === 'direct_host') {
      titleEn = `🚨 Direct Crop Risk: ${diseaseName} nearby`;
      titleTe = `🚨 మీ పంటకు ప్రత్యక్ష ప్రమాదం: ${diseaseName} సమీపంలో గుర్తించబడింది`;
    } else if (highestRelevance === 'vector_host') {
      titleEn = `🦗 Vector Reservoir Notice: ${diseaseName} host in vicinity`;
      titleTe = `🦗 తెగులు వాహక ఆశ్రయం గమనిక: ${diseaseName} పరిసరాల్లో గమనించబడింది`;
    }

    const nowFormatted = new Date().toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const alertItem = {
      id: `alert-auto-${Date.now()}-${farm.id}`,
      userId: farm.id,
      outbreakId: savedOutbreakId || newReport.id,
      type: 'outbreak_nearby' as const,
      targetRelevance: highestRelevance,
      titleEn,
      titleTe,
      descEn: `${approxDistLabel}. ${bestExplanationEn} (AI-assisted, not field-confirmed · Match score: ${(aiMatchScore * 100).toFixed(1)}%)`,
      descTe: `${approxDistLabel}. ${bestExplanationTe} (AI-ఆధారిత పరిశీలన · క్షేత్రస్థాయిలో ధృవీకరించబడలేదు)`,
      distanceKm: farm.distanceKm,
      distanceIsApproximate: true,
      referenceSourceAuthority: extensionPrecautions[0]?.sourceAuthority || 'State Agricultural University (ANGRAU)',
      referenceSourceUrl: extensionPrecautions[0]?.sourceUrl || 'https://angrau.ac.in',
      referenceReviewDate: extensionPrecautions[0]?.reviewDate || '2026-09-15',
      timestamp: 'Just now (ఇప్పుడే)',
      outbreakTimestamp: nowFormatted,
      isRead: false,
      createdAt: new Date().toISOString(),
      precautions: extensionPrecautions,
    };

    // Prevent duplicate notification in memory
    const isDuplicateInMem = inMemoryNotificationsQueue.some(
      (n) => n.userId === farm.id && (
        (savedOutbreakId && (n as any).outbreakId === savedOutbreakId) ||
        (n.titleEn === titleEn && n.descEn === alertItem.descEn)
      )
    );
    if (!isDuplicateInMem) {
      inMemoryNotificationsQueue.unshift(alertItem);
      dispatchedAlerts.push({
        id: farm.id,
        farmerName: farm.farmerName,
        crop: matchingCropName,
        distanceKm: farm.distanceKm,
      });
    }

    // Save notification to Supabase with duplicate check
    if (isSupabaseConfigured && supabaseAdmin && farm.id && isValidUuid(farm.id)) {
      try {
        if (savedOutbreakId) {
          const { data: existingNotif } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('recipient_user_id', farm.id)
            .eq('outbreak_id', savedOutbreakId)
            .limit(1)
            .maybeSingle();

          if (existingNotif) {
            continue; // Duplicate prevented!
          }
        }

        const notifPayload: any = {
          recipient_user_id: farm.id,
          outbreak_id: savedOutbreakId || null,
          type: 'outbreak_nearby',
          target_relevance: highestRelevance,
          title_en: titleEn,
          title_te: titleTe,
          desc_en: alertItem.descEn,
          desc_te: alertItem.descTe,
          distance_km: farm.distanceKm,
          distance_is_approximate: true,
          reference_source_authority: alertItem.referenceSourceAuthority,
          reference_source_url: alertItem.referenceSourceUrl,
          reference_review_date: alertItem.referenceReviewDate,
          precautions: extensionPrecautions,
        };

        let { error: notifErr } = await supabaseAdmin
          .from('notifications')
          .insert(notifPayload);

        // If precautions column does not exist on table, retry without it
        if (notifErr && (notifErr.message.includes('precautions') || notifErr.code === '42703')) {
          delete notifPayload.precautions;
          const retry = await supabaseAdmin.from('notifications').insert(notifPayload);
          notifErr = retry.error;
        }

        if (notifErr) {
          console.warn('Supabase notification insert error:', notifErr.message);
          allNotifWritesSucceeded = false;
        }
      } catch (err: any) {
        console.warn('Supabase notification insert exception:', err.message);
        allNotifWritesSucceeded = false;
      }
    }
  }

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const nowFullTimestamp = new Date().toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    outbreakCreated: true,
    outbreakId: savedOutbreakId || newReport.id,
    alertDispatched: dispatchedAlerts.length > 0,
    alertedFarmsCount: dispatchedAlerts.length,
    dispatchedTime: nowTime,
    dispatchedTimestamp: nowFullTimestamp,
    report: newReport,
    alertedFarms: dispatchedAlerts,
    dbWritesSucceeded: !isSupabaseConfigured || (dbOutbreakSuccess && allNotifWritesSucceeded),
  };
}

/**
 * 4. MULTIMODAL CROP & PESTICIDE LABEL ANALYZER
 * Returns model-reported visual match score (uncalibrated 0.000 to 1.000).
 * Threshold > 0.700 required for alert eligibility.
 * All alerts labeled "AI-assisted, not field-confirmed".
 */
app.post('/api/analyze', async (req: AuthenticatedRequest, res: Response) => {
  const {
    imageBase64,
    mimeType,
    textPrompt,
    language = 'en',
    cropContext = 'Chilli',
    cropCycleId,
    treatedAreaAcres,
  } = req.body;

  if (!imageBase64 && !textPrompt) {
    return res.status(400).json({
      success: false,
      error: 'Either an image or a question is required.',
    });
  }

  // Upload private crop image if Supabase Storage is configured and user is authenticated
  let imageStoragePath: string | undefined;
  let signedImageUrl: string | undefined;

  if (imageBase64 && isSupabaseConfigured && supabaseAdmin) {
    try {
      const userId = req.user?.id || 'guest';
      const cleanB64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const buffer = Buffer.from(cleanB64, 'base64');
      const filename = `${userId}/${cropCycleId || 'default'}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('crop-images')
        .upload(filename, buffer, {
          contentType: mimeType || 'image/jpeg',
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        imageStoragePath = uploadData.path;
        signedImageUrl = (await getSignedImageUrl(imageStoragePath, 3600)) || undefined;
      }
    } catch (storageErr) {
      console.warn('Storage upload error:', storageErr);
    }
  }

  // Never present a canned catalog result as a live image analysis.
  if (!getGeminiApiKey()) {
    return res.status(503).json({
      success: false,
      error: 'Gemini analysis is not configured. Set GEMINI_API_KEY in the server environment variables and redeploy CropRadar.',
    });
  }

  try {
    const systemInstruction = `You are Crop Radar AI, an expert agricultural pathologist, agronomist, and chemical safety advisor.
Your primary role is to serve Indian farmers (especially in Andhra Pradesh and Telangana cultivating Chilli, Paddy, Cotton, Maize, Pulses, Tomato, Turmeric, Groundnut).
The user communicates in English or Telugu.

IMPORTANT MULTI-CROP CLASSIFICATION & GUARDRAILS:
1. All AI pathology diagnoses MUST be labeled as "AI-assisted, not field-confirmed". Do NOT add agronomist review or verified claims.
2. Produce a model-reported visual match score ("aiMatchScore") between 0.000 and 1.000 representing visual symptom pattern similarity.
3. If scanning a pesticide label:
   - Identify active ingredient, concentration, formulation, FRAC/IRAC code, approved target pests, and approved crops.
   - For dosage per acre: ONLY provide dosage if the active crop exactly matches the approved crops list. If unverified for this crop, do NOT guess a dose or suggest unverified tank mixes. Set dosageVerifiedForActiveCrop: false and provide an anti-guesswork warning.
4. INDEPENDENT VISUAL CROP IDENTIFICATION & MISMATCH GUARDRAILS:
   Do NOT assume the crop shown in the image is "${cropContext}".
   Carefully examine leaf shape, veins, fruit, flowers, and plant architecture:
   - Identify the actual crop visually present (e.g. Paddy / Rice, Chilli, Cotton, Tomato, Turmeric, Maize, Groundnut, Pulses).
   - If the visual crop differs from the active conversation crop context "${cropContext}" (e.g. Paddy / Rice leaf uploaded while in Turmeric):
     Set "cropMismatch": {
       "isMismatch": true,
       "detectedCropEn": "<Identified crop name in English, e.g. Paddy / Rice>",
       "detectedCropTe": "<Identified crop name in Telugu, e.g. వరి>",
       "activeCropEn": "${cropContext}",
       "confidence": 0.90,
       "explanationEn": "This photo appears to show Paddy / Rice (వరి), but your active conversation is for ${cropContext}.",
       "explanationTe": "ఈ చిత్రం వరి (Paddy / Rice) పంటగా కనిపిస్తోంది, అయితే మీ ప్రస్తుత సంభాషణ ${cropContext} కోసం ఉంది."
     }
   - If the visual crop matches "${cropContext}" (or if it is a pesticide label or general query):
     Set "cropMismatch": {
       "isMismatch": false,
       "detectedCropEn": "${cropContext}",
       "detectedCropTe": "",
       "activeCropEn": "${cropContext}",
       "confidence": 0.95,
       "explanationEn": "",
       "explanationTe": ""
     }
   - CRITICAL: The diagnosis, observations, immediate IPM actions, and extension precautions MUST correspond to the DETECTED crop so that the farmer never receives incorrect cross-crop guidance (e.g. never give rice-specific precautions as guidance for turmeric).

You MUST respond in valid JSON format matching this structure:
{
  "analysisType": "crop_diagnosis" | "pesticide_label" | "agricultural_advisory",
  "crop": {
    "nameEn": string,
    "nameTe": string,
    "plantPart": string
  },
  "cropMismatch": {
    "isMismatch": boolean,
    "detectedCropEn": string,
    "detectedCropTe": string,
    "activeCropEn": string,
    "confidence": number,
    "explanationEn": string,
    "explanationTe": string
  },
  "diagnosisOrProduct": {
    "titleEn": string,
    "titleTe": string,
    "category": "fungal" | "bacterial" | "viral" | "pest" | "nutritional" | "herbicide" | "insecticide" | "fungicide" | "unknown",
    "confidenceLevel": "High" | "Moderate" | "Low / Inconclusive",
    "confidenceNoteEn": string,
    "confidenceNoteTe": string,
    "aiMatchScore": number
  },
  "observationsEn": string[],
  "observationsTe": string[],
  "labelDetails": {
    "activeIngredient": string,
    "concentration": string,
    "formulation": string,
    "moaCode": string,
    "targetPests": string[],
    "approvedCrops": string[],
    "rainfastHours": string,
    "safetyWarnings": string[],
    "dosagePerAcreMlOrG": number,
    "waterPerAcreLiters": number,
    "dosageVerifiedForActiveCrop": boolean,
    "unverifiedDosageWarningEn": string,
    "unverifiedDosageWarningTe": string
  },
  "immediateActionsEn": string[],
  "immediateActionsTe": string[],
  "preventiveMeasuresEn": string[],
  "preventiveMeasuresTe": string[],
  "followUpQuestionsEn": string[],
  "followUpQuestionsTe": string[],
  "spokenSummaryEn": string,
  "spokenSummaryTe": string,
  "isAiAssisted": true
}`;

    const parts: any[] = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    const farmerPrompt = textPrompt
      ? `Farmer query: "${textPrompt}". Active crop context: "${cropContext}". Selected language: ${language}. Area being treated: ${treatedAreaAcres || 'unspecified'} acres. Analyze thoroughly.`
      : `Analyze this agricultural image. Identify whether it is a crop health issue or a pesticide label. Active crop context: "${cropContext}". Selected language: ${language}. Area being treated: ${treatedAreaAcres || 'unspecified'} acres.`;

    parts.push({ text: farmerPrompt });

    const client = getAiClient();
    const executeGemini = async (modelName: string) => {
      let timeoutHandle: NodeJS.Timeout | undefined;
      const timeoutLimit = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('AI inference timed out')), 50000);
      });
      const call = client.models.generateContent({
        model: modelName,
        contents: parts,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });
      return (await Promise.race([call, timeoutLimit]).finally(() => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      })) as any;
    };

    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
    ].filter(Boolean) as string[];

    let response: any;
    let lastError: any;
    for (const model of candidateModels) {
      try {
        response = await executeGemini(model);
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, attempting next candidate:`, err?.message || err);
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const rawText = response.text || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (parseErr) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse Gemini JSON response');
      }
    }

    // Always ensure isAiAssisted is true
    parsedResult.isAiAssisted = true;

    // Attach extension-verified biological precautions from domain catalog
    const entry = findCatalogEntry(parsedResult.diagnosisOrProduct?.titleEn);
    parsedResult.extensionPrecautions = entry.precautions;
    parsedResult.pathogenSusceptibleHosts = entry.pathogenHosts;
    parsedResult.vectorReservoirHosts = entry.vectorHosts;
    parsedResult.isBroadHostRange = entry.isBroadHost;

    if (imageStoragePath) {
      parsedResult.imageStoragePath = imageStoragePath;
      parsedResult.signedImageUrl = signedImageUrl;
    }

    if (cropCycleId && !parsedResult.cropMismatch?.isMismatch) {
      if (!inMemoryChatMessages[cropCycleId]) inMemoryChatMessages[cropCycleId] = [];
      inMemoryChatMessages[cropCycleId].push({
        id: `msg-diag-${Date.now()}`,
        cropCycleId,
        role: 'assistant',
        textEn: parsedResult.spokenSummaryEn || 'Analysis complete.',
        textTe: parsedResult.spokenSummaryTe || 'విశ్లేషణ పూర్తయింది.',
        diagnosisData: parsedResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      if (isSupabaseConfigured && supabaseAdmin && req.user?.id) {
        try {
          await supabaseAdmin.from('chat_messages').insert({
            crop_cycle_id: cropCycleId,
            role: 'assistant',
            text_en: parsedResult.spokenSummaryEn || 'Analysis complete.',
            text_te: parsedResult.spokenSummaryTe || 'విశ్లేషణ పూర్తయింది.',
            diagnosis_payload: parsedResult,
            image_storage_path: imageStoragePath || null,
          });
        } catch (e: any) {
          console.warn('Supabase persist diag message error:', e);
        }
      }
    }

    // Automatic 5 km Outbreak Detection & Proximity Notification
    // Triggered strictly from the server's actual model match score (>0.700)
    // Never trusts browser-supplied score or coordinates
    if (
      parsedResult.analysisType === 'crop_diagnosis' &&
      (parsedResult.diagnosisOrProduct?.aiMatchScore ?? 0) > 0.700 &&
      !parsedResult.cropMismatch?.isMismatch
    ) {
      try {
        const autoOutcome = await processOutbreakAndNotifications({
          reporterUserId: req.user?.id,
          sourceCropCycleId: cropCycleId,
          cropName: parsedResult.crop?.nameEn || cropContext,
          diseaseName: parsedResult.diagnosisOrProduct.titleEn,
          diseaseCategory: parsedResult.diagnosisOrProduct.category,
          aiMatchScore: parsedResult.diagnosisOrProduct.aiMatchScore ?? 0.85,
          symptoms: (parsedResult.observationsEn || []).join('; '),
        });
        parsedResult.autoOutbreakResult = autoOutcome;
      } catch (outbreakErr: any) {
        console.warn('Auto-outbreak processing error in /api/analyze:', outbreakErr.message);
      }
    }

    res.json({
      success: true,
      data: parsedResult,
      rawSummary: parsedResult.spokenSummaryEn || 'Analysis complete.',
    });
  } catch (error: any) {
    const rawMsg = error?.message || String(error || '');
    console.error('Gemini analysis failed:', rawMsg);
    const timedOut = rawMsg.includes('timed out') || rawMsg.includes('timeout');

    // Security: Never leak API keys, authorization tokens, or internal URLs in response JSON
    const sanitizedError = timedOut
      ? 'Gemini analysis took too long. Please try again with a smaller or clearer image.'
      : rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')
      ? 'Invalid Gemini API key. Please check GEMINI_API_KEY in your Vercel project settings.'
      : rawMsg.includes('quota') || rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')
      ? 'Gemini API quota exceeded or rate limit reached. Please check your Gemini API plan or try again in a few minutes.'
      : rawMsg.includes('not found') || rawMsg.includes('404')
      ? 'Configured AI model is currently unavailable on this API key. Please verify your GEMINI_API_KEY model access.'
      : 'Gemini analysis failed to process this image. Please try again with a clearer leaf photo.';

    return res.status(timedOut ? 504 : 502).json({
      success: false,
      error: sanitizedError,
    });
  }
});

/**
 * 5. CONVERSATIONAL SIDEKICK CHAT ROUTE
 */
app.post('/api/chat', async (req: AuthenticatedRequest, res: Response) => {
  const { message, conversationHistory = [], language = 'en', cropContext = 'Chilli', cropCycleId } = req.body;
  const userId = req.user?.id || 'guest-session';

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  // Save farmer message to Supabase chat_messages if active
  if (isSupabaseConfigured && supabaseAdmin && req.user?.id && cropCycleId) {
    try {
      await supabaseAdmin.from('chat_messages').insert({
        crop_cycle_id: cropCycleId,
        role: 'farmer',
        text_en: message,
        text_te: message,
      });
    } catch (saveErr) {
      console.warn('Failed to persist user chat message:', saveErr);
    }
  }

  if (cropCycleId) {
    if (!inMemoryChatMessages[cropCycleId]) inMemoryChatMessages[cropCycleId] = [];
    inMemoryChatMessages[cropCycleId].push({
      id: `msg-user-${Date.now()}`,
      cropCycleId,
      role: 'farmer',
      textEn: message,
      textTe: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }

  const currentChatApiKey = getGeminiApiKey();
  if (!currentChatApiKey) {
    const replyEn = `Regarding ${cropContext}: Ensure proper field drainage and monitor for early pest thresholds. You can attach a leaf photo for AI pathology analysis.`;
    const replyTe = `${cropContext} పంటకు సంబంధించి: పొలంలో నీరు నిల్వ ఉండకుండా చూసుకోండి మరియు ప్రారంభ తెగుళ్ల లక్షణాలను గమనించండి. స్పష్టత కోసం ఆకు ఫోటో తీసి పంపవచ్చు.`;

    return res.json({
      success: true,
      replyEn,
      replyTe,
      suggestedActions: ['Scan Leaf', 'Scan Pesticide', 'Check Weather'],
      suggestedActionsTe: ['ఆకు స్కాన్ చేయండి', 'మందు లేబుల్ స్కాన్', 'వాతావరణం చూడండి'],
    });
  }

  try {
    const systemInstruction = `You are Crop Radar AI, a warm, highly knowledgeable agricultural companion for farmers.
Answer the farmer's question directly, clearly, and concisely in BOTH English and Telugu.
All recommendations are AI-assisted, practical, and prioritize sustainable integrated pest management.
Respond in JSON:
{
  "replyEn": "English answer",
  "replyTe": "తెలుగు సమాధానం",
  "suggestedActions": ["Action 1", "Action 2"],
  "suggestedActionsTe": ["చర్య 1", "చర్య 2"]
}`;

    const contextText = conversationHistory
      .slice(-4)
      .map((m: any) => `${m.role === 'farmer' ? 'Farmer' : 'Crop Radar'}: ${m.textEn || m.text}`)
      .join('\n');

    const prompt = `${contextText}\nFarmer: ${message}\nActive Crop: ${cropContext}\nLanguage: ${language}`;

    const client = getAiClient();
    const candidateChatModels = [
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-3.5-flash',
    ].filter(Boolean) as string[];

    let response: any;
    let lastChatErr: any;
    for (const model of candidateChatModels) {
      try {
        const chatCall = client.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const timeoutLimit = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Chat inference timeout')), 25000)
        );

        response = (await Promise.race([chatCall, timeoutLimit])) as any;
        if (response?.text) break;
      } catch (err: any) {
        lastChatErr = err;
        console.warn(`Chat model ${model} failed, trying next:`, err?.message || err);
      }
    }

    if (!response && lastChatErr) {
      throw lastChatErr;
    }
    const parsed = JSON.parse(response.text || '{}');

    // Save assistant reply to chat_messages if active
    if (isSupabaseConfigured && supabaseAdmin && req.user?.id && cropCycleId) {
      try {
        await supabaseAdmin.from('chat_messages').insert({
          crop_cycle_id: cropCycleId,
          role: 'assistant',
          text_en: parsed.replyEn || '',
          text_te: parsed.replyTe || '',
        });
      } catch (saveErr) {
        console.warn('Failed to persist assistant chat message:', saveErr);
      }
    }

    if (cropCycleId) {
      inMemoryChatMessages[cropCycleId].push({
        id: `msg-ai-${Date.now()}`,
        cropCycleId,
        role: 'assistant',
        textEn: parsed.replyEn || '',
        textTe: parsed.replyTe || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    res.json({
      success: true,
      replyEn: parsed.replyEn || 'I understand. Let us inspect the crop further.',
      replyTe: parsed.replyTe || 'నేను అర్థం చేసుకున్నాను. పంటను మరింత నిశితంగా పరిశీలిద్దాం.',
      suggestedActions: parsed.suggestedActions || ['Scan Leaf', 'Scan Pesticide'],
      suggestedActionsTe: parsed.suggestedActionsTe || ['ఆకు స్కాన్ చేయండి', 'మందు లేబుల్ స్కాన్'],
    });
  } catch (error: any) {
    console.warn('Chat API error, using local agro advisory:', error?.message || error);
    res.json({
      success: true,
      replyEn: `Regarding ${cropContext}: Maintain balanced irrigation and scout for early leaf discoloration or insect vectors. You can attach a leaf photo for immediate AI pathology analysis.`,
      replyTe: `${cropContext} పంటకు సంబంధించి: తగినంత నీటి తేమను నిర్వహించండి మరియు ఆకుల రంగు మారడం లేదా పురుగుల ఉధృతిని గమనించండి. స్పష్టమైన నిర్ధారణ కోసం ఆకు ఫోటో తీసి పంపవచ్చు.`,
    });
  }
});

/**
 * 6. TEXT-TO-SPEECH (TTS) ROUTE
 */
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, language = 'en' } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required for TTS' });
    }

    const ttsApiKey = getGeminiApiKey();
    if (!ttsApiKey) {
      return res.json({ success: false, error: 'TTS requires API key' });
    }

    const isTe = language === 'te';
    const client = getAiClient();
    const ttsCall = client.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 300),
              speechMetadata: {
                style: isTe
                  ? 'Natural, warm, crystal-clear Telugu agricultural assistant speaker'
                  : 'Clear, helpful, friendly agricultural advisory assistant',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const timeoutLimit = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TTS inference timeout')), 5000)
    );

    const response = (await Promise.race([ttsCall, timeoutLimit])) as any;
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      return res.json({
        success: true,
        audioBase64: base64Audio,
        format: 'audio/wav',
      });
    }

    throw new Error('No audio returned from Gemini TTS');
  } catch (error: any) {
    console.warn('TTS synthesis failed:', error?.message || error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 7. AUTOMATIC 5KM OUTBREAK REPORTING & TARGETED NOTIFICATIONS
 * - Gated strictly at match score > 0.700
 * - Farm must have opted into location (has_explicit_location = true)
 * - Decouples causal pathogen hosts vs insect vector breeding hosts
 * - Attaches extension-verified non-chemical precautions with source links & review dates
 * - No chemical doses prescribed on unconfirmed alerts
 */
app.post('/api/disease-radar/auto-outbreak', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      crop,
      diseaseName,
      diseaseCategory,
      symptoms,
      cropCycleId,
    } = req.body;

    const score = Number(req.body.aiMatchScore);
    if (!Number.isFinite(score)) {
      return res.status(400).json({ success: false, alertDispatched: false, reason: 'A model match score is required.' });
    }

    const outcome = await processOutbreakAndNotifications({
      reporterUserId: req.user?.id,
      sourceCropCycleId: cropCycleId,
      cropName: crop || 'Chilli (మిరప)',
      diseaseName: diseaseName || 'Detected Outbreak',
      diseaseCategory: diseaseCategory || 'fungal',
      aiMatchScore: score,
      symptoms: symptoms || 'Manual/Switched crop outbreak verification',
    });

    res.json({
      success: outcome.outbreakCreated,
      alertDispatched: outcome.alertDispatched,
      report: outcome.report,
      alertedFarmsCount: outcome.alertedFarmsCount,
      dispatchedTime: outcome.dispatchedTime,
      dispatchedTimestamp: outcome.dispatchedTimestamp,
      alertedFarms: outcome.alertedFarms,
      reason: outcome.reason,
      reasonTe: outcome.reasonTe,
      dbWritesSucceeded: outcome.dbWritesSucceeded,
    });
  } catch (error: any) {
    console.error('Auto-outbreak error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 8. COMMUNITY DISEASE RADAR & NOTIFICATIONS API
 * - Strips exact coordinates, returns generalized ~2 km centroids
 * - Explanatory label: "AI-assisted, not field-confirmed"
 * - No verified status columns
 */
app.get('/api/disease-radar', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string) || 16.3067;
  const lon = parseFloat(req.query.lon as string) || 80.4365;
  const radiusKm = parseFloat(req.query.radiusKm as string) || 35;

  let allReports = communityDiseaseReports;

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('disease_outbreaks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        allReports = data.map((r: any) => ({
          id: r.id,
          crop: r.crop,
          diseaseName: r.disease_name,
          diseaseCategory: r.disease_category,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          timestamp: r.created_at,
          severity: r.severity,
          generalizedLocation: r.generalized_location,
          symptoms: r.symptoms,
          aiMatchScore: r.ai_match_score ? Number(r.ai_match_score) : 0.85,
          isAiAssisted: true,
          pathogenSusceptibleHosts: r.pathogen_susceptible_hosts,
          vectorReservoirHosts: r.vector_reservoir_hosts,
          isBroadHostRange: r.is_broad_host_range,
        }));
      }
    } catch (err) {
      console.warn('Supabase fetch disease_outbreaks error:', err);
    }
  }

  const nearbyReports = filterReportsWithinRadius(lat, lon, allReports, radiusKm);

  const stats = {
    totalNearby: nearbyReports.length,
    severeOutbreaks: nearbyReports.filter((r) => r.severity === 'severe').length,
    cropsAffected: Array.from(new Set(nearbyReports.map((r) => r.crop))),
  };

  res.json({
    success: true,
    userLocation: { lat, lon },
    radiusKm,
    reports: nearbyReports,
    stats,
  });
});

app.get('/api/notifications', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;

  if (userId) {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .select('*')
          .eq('recipient_user_id', userId)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch notifications error:', error);
          return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
        }

        const mapped = (data || []).map((n: any) => ({
          id: n.id,
          outbreakId: n.outbreak_id,
          type: n.type,
          targetRelevance: n.target_relevance,
          titleEn: n.title_en,
          titleTe: n.title_te,
          descEn: n.desc_en,
          descTe: n.desc_te,
          distanceKm: n.distance_km ? Number(n.distance_km) : undefined,
          distanceIsApproximate: n.distance_is_approximate ?? true,
          referenceSourceAuthority: n.reference_source_authority,
          referenceSourceUrl: n.reference_source_url,
          referenceReviewDate: n.reference_review_date,
          precautions: n.precautions,
          timestamp: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          outbreakTimestamp: new Date(n.created_at).toLocaleString([], {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          isRead: n.is_read,
        }));

        return res.json({
          success: true,
          notifications: mapped,
          unreadCount: mapped.filter((n: any) => !n.isRead).length,
        });
      } catch (err: any) {
        console.warn('Supabase fetch notifications exception:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // In-memory notifications isolated to authenticated user (within 30 days)
    const userNotifs = inMemoryNotificationsQueue
      .filter((n) => n.userId === userId && (!n.createdAt || new Date(n.createdAt).getTime() >= cutoffTime))
      .map((n) => ({
        ...n,
        outbreakTimestamp: n.outbreakTimestamp || new Date().toLocaleString([], {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));
    return res.json({
      success: true,
      notifications: userNotifs,
      unreadCount: userNotifs.filter((n) => !n.isRead).length,
    });
  }

  // Unauthenticated / Guest session: Guest only sees guest notifications within 30 days
  const guestNotifs = inMemoryNotificationsQueue
    .filter((n) => n.userId === 'guest-session' && (!n.createdAt || new Date(n.createdAt).getTime() >= cutoffTime))
    .map((n) => ({
      ...n,
      outbreakTimestamp: n.outbreakTimestamp || new Date().toLocaleString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  res.json({
    success: true,
    notifications: guestNotifs,
    unreadCount: guestNotifs.filter((n) => !n.isRead).length,
  });
});

app.patch('/api/notifications/mark-all-read', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (userId && isSupabaseConfigured && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.warn('Supabase mark-all-read error:', error.message);
        return res.status(500).json({ success: false, error: 'Database update failed.' });
      }
    } catch (err: any) {
      console.warn('Supabase mark-all-read exception:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Update in-memory queue
  inMemoryNotificationsQueue.forEach((n) => {
    if (!userId || n.userId === userId || n.userId === 'guest-session') {
      n.isRead = true;
    }
  });

  res.json({ success: true, unreadCount: 0 });
});

app.patch('/api/notifications/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  const notifId = req.params.id;
  const userId = req.user?.id;

  if (userId && isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId)
        .eq('recipient_user_id', userId);
    } catch (err) {
      console.warn('Supabase update notification error:', err);
    }
  }

  const found = inMemoryNotificationsQueue.find((n) => n.id === notifId && (!userId || n.userId === userId));
  if (found) found.isRead = true;

  res.json({ success: true, id: notifId, isRead: true });
});

app.delete('/api/notifications', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (userId) {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { error, count } = await supabaseAdmin
          .from('notifications')
          .delete({ count: 'exact' })
          .eq('recipient_user_id', userId);

        if (error) {
          console.warn('Supabase delete all notifications error:', error.message);
          return res.status(500).json({ success: false, error: 'Database deletion failed.' });
        }

        // Clean up in-memory queue for this user
        for (let i = inMemoryNotificationsQueue.length - 1; i >= 0; i--) {
          if (inMemoryNotificationsQueue[i].userId === userId) {
            inMemoryNotificationsQueue.splice(i, 1);
          }
        }

        return res.json({
          success: true,
          deletedCount: count ?? 0,
          unreadCount: 0,
        });
      } catch (err: any) {
        console.warn('Supabase delete all notifications exception:', err.message);
        return res.status(500).json({ success: false, error: err.message || 'Error deleting notifications' });
      }
    }

    // In-memory queue deletion for authenticated user
    let deletedCount = 0;
    for (let i = inMemoryNotificationsQueue.length - 1; i >= 0; i--) {
      if (inMemoryNotificationsQueue[i].userId === userId) {
        inMemoryNotificationsQueue.splice(i, 1);
        deletedCount++;
      }
    }

    return res.json({
      success: true,
      deletedCount,
      unreadCount: 0,
    });
  }

  // Guest / unauthenticated fallback: clears guest notifications
  let deletedCount = 0;
  for (let i = inMemoryNotificationsQueue.length - 1; i >= 0; i--) {
    if (inMemoryNotificationsQueue[i].userId === 'guest-session') {
      inMemoryNotificationsQueue.splice(i, 1);
      deletedCount++;
    }
  }

  return res.json({
    success: true,
    deletedCount,
    unreadCount: 0,
  });
});

app.delete('/api/notifications/:id', async (req: AuthenticatedRequest, res: Response) => {
  const notifId = req.params.id;
  const userId = req.user?.id;

  if (userId && isSupabaseConfigured && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notifId)
        .eq('recipient_user_id', userId);

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const idx = inMemoryNotificationsQueue.findIndex(
    (n) => n.id === notifId && (!userId || n.userId === userId || n.userId === 'guest-session')
  );
  if (idx !== -1) {
    inMemoryNotificationsQueue.splice(idx, 1);
  }

  res.json({ success: true, id: notifId });
});

/**
 * 9. FIELD DIARY API
 * - Scoped to user_id and active crop_cycle_id
 * - Stores treatedAreaAcres on-demand per application (never fixed farm acreage)
 * - Stores totalChemicalUsed calculated from verified label guidance
 * - Stores private image storage path
 */
app.get('/api/field-diary', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (userId) {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('field_diary_entries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch field diary error:', error);
          return res.status(500).json({ success: false, error: 'Failed to fetch field diary' });
        }

        const enriched = await Promise.all(
          (data || []).map(async (row: any) => {
            let signedThumb = row.image_thumbnail;
            if (row.image_storage_path) {
              const url = await getSignedImageUrl(row.image_storage_path, 3600);
              if (url) signedThumb = url;
            }
            return {
              id: row.id,
              cropCycleId: row.crop_cycle_id,
              cropName: row.crop_name,
              timestamp: row.created_at,
              symptoms: row.symptoms,
              diagnosis: row.diagnosis,
              confidence: row.confidence,
              imageThumbnail: signedThumb,
              imageStoragePath: row.image_storage_path,
              treatedAreaAcres: row.treated_area_acres ? Number(row.treated_area_acres) : undefined,
              totalChemicalUsed: row.total_chemical_used,
              treatmentsRecorded: row.treatments_recorded || [],
              weatherSnapshot: row.weather_snapshot,
              notes: row.notes,
            };
          })
        );

        return res.json({ success: true, records: enriched });
      } catch (err: any) {
        console.warn('Supabase fetch field diary exception:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // Isolated in-memory records for authenticated user
    const userRecords = inMemoryFieldDiaryStore.filter((r) => r.userId === userId);
    return res.json({ success: true, records: userRecords });
  }

  // Unauthenticated / Guest session: Guest only sees guest records
  const guestRecords = inMemoryFieldDiaryStore.filter((r) => r.userId === 'guest-session');
  res.json({
    success: true,
    records: guestRecords,
  });
});

app.post('/api/field-diary', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const {
    cropCycleId,
    cropName,
    symptoms,
    diagnosis,
    confidence,
    imageThumbnail,
    imageStoragePath,
    treatedAreaAcres,
    totalChemicalUsed,
    notes,
    treatmentsRecorded,
    weatherSnapshot,
  } = req.body;

  const targetUserId = userId || 'guest-session';
  const newEntry = {
    id: `diary-${Date.now()}`,
    userId: targetUserId,
    cropCycleId,
    cropName: cropName || 'General Crop Observation',
    timestamp: new Date().toISOString(),
    symptoms: symptoms || 'Visual symptoms documented',
    diagnosis: diagnosis || 'Pending observation',
    confidence: confidence || 'AI-assisted, not field-confirmed',
    imageThumbnail,
    imageStoragePath,
    treatedAreaAcres: treatedAreaAcres ? Number(treatedAreaAcres) : undefined,
    totalChemicalUsed: totalChemicalUsed || '',
    treatmentsRecorded: treatmentsRecorded || [],
    weatherSnapshot: weatherSnapshot || '30°C, 65% humidity',
    notes: notes || '',
  };

  if (userId && isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('field_diary_entries')
        .insert({
          user_id: userId,
          crop_cycle_id: cropCycleId || null,
          crop_name: newEntry.cropName,
          symptoms: newEntry.symptoms,
          diagnosis: newEntry.diagnosis,
          confidence: newEntry.confidence,
          image_thumbnail: imageThumbnail || null,
          image_storage_path: imageStoragePath || null,
          treated_area_acres: newEntry.treatedAreaAcres || null,
          total_chemical_used: newEntry.totalChemicalUsed || null,
          treatments_recorded: newEntry.treatmentsRecorded,
          weather_snapshot: newEntry.weatherSnapshot,
          notes: newEntry.notes,
        })
        .select('*')
        .single();

      if (!error && data) {
        return res.json({ success: true, entry: data });
      }
    } catch (err) {
      console.warn('Supabase insert field diary error:', err);
    }
  }

  inMemoryFieldDiaryStore.unshift(newEntry);
  res.json({ success: true, entry: newEntry });
});

// 404 handler for unmatched API routes - ensures always returning valid JSON
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API route ${req.method} ${req.url} was not found on this server.`,
  });
});

// Global error handling middleware - ensures all server errors return valid JSON without leaking secrets
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const errMessage = typeof err?.message === 'string' ? err.message : String(err || 'Unknown error');
  console.error('Express server error:', errMessage);
  if (res.headersSent) return;

  const status = typeof err.status === 'number' ? err.status : typeof err.statusCode === 'number' ? err.statusCode : 500;
  const isPayloadTooLarge = err.type === 'entity.too.large' || status === 413;

  res.status(status).json({
    success: false,
    error: isPayloadTooLarge
      ? 'The uploaded photo exceeds the server payload limit. Please upload a smaller image.'
      : 'An unexpected server error occurred while processing your request.',
  });
});

// Development vs Production static / vite serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌾 Crop Radar AI Server running on port ${PORT}`);
  });
}

import { fileURLToPath } from 'url';

// Start the HTTP listener in standalone development/production.
// In Vercel serverless environments (VERCEL=1) or when imported as a module, the exported app handles requests.
const isDirectRun = Boolean(
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') === path.resolve(process.argv[1]).replace(/\\/g, '/')
);

if (isDirectRun && process.env.VERCEL !== '1') {
  startServer();
}

export default app;
