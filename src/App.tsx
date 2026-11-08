import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  X,
  Sprout,
  Compass,
  ArrowRight,
  Loader2,
  Calendar,
  Radar,
  Plus,
} from 'lucide-react';

import {
  Language,
  ChatMessage,
  WeatherData,
  DiagnosisDetails,
  DiseaseReport,
  DiaryEntry,
  FarmerProfile,
  CropCycle,
} from './types/agricultural';

import { Header } from './components/Header';
import { MessageComposer } from './components/MessageComposer';
import { CameraModal } from './components/CameraModal';
import { DiagnosisCard } from './components/DiagnosisCard';
import { PesticideCard } from './components/PesticideCard';
import { WeatherModal } from './components/WeatherModal';
import { DiseaseRadarModal } from './components/DiseaseRadarModal';
import { FieldDiaryDrawer } from './components/FieldDiaryDrawer';
import { NotificationsModal } from './components/NotificationsModal';
import { FarmProfileModal } from './components/FarmProfileModal';
import { CropSidebar } from './components/CropSidebar';
import { NewCropModal } from './components/NewCropModal';
import { CropMismatchCard } from './components/CropMismatchCard';
import { OutbreakAlertConfirmationCard } from './components/OutbreakAlertConfirmationCard';
import { LoginPage } from './components/LoginPage';
import { ensureGuestOrAuthSession, getSupabaseClient, signOutUser, authFetch } from './lib/supabaseClient';
import { optimizeImageForAnalysis } from './utils/imageOptimizer';

const PROFILE_STORAGE_KEY = 'cropradar.farmer-profile.v2';
const getProfileStorageKey = (userId?: string) => `${PROFILE_STORAGE_KEY}:${userId || 'guest'}`;

function readStoredProfile(userId?: string): Partial<FarmerProfile> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(getProfileStorageKey(userId));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

const DEFAULT_PROFILE: FarmerProfile = {
  name: 'Abhiram',
  phone: '',
  farmLocation: 'Location not set',
  latitude: 16.3067,
  longitude: 80.4365,
  primaryCrop: 'Paddy / Rice (వరి)',
  preferredLanguage: 'en',
  hasExplicitLocation: false,
  locationSource: 'none',
};

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const isTe = language === 'te';

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Farmer profile state
  const [profile, setProfile] = useState<FarmerProfile>(() => {
    return { ...DEFAULT_PROFILE, ...readStoredProfile() };
  });

  // Location / GPS status
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'acquired' | 'failed' | 'manual'>('idle');
  const [gpsBannerDismissed, setGpsBannerDismissed] = useState(false);

  // Crop Cycles & Conversations
  const [cropCycles, setCropCycles] = useState<CropCycle[]>([]);
  const [activeCropCycleId, setActiveCropCycleId] = useState<string | null>(null);
  const [isNewCropModalOpen, setIsNewCropModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Weather data
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  // Disease radar reports & Notifications
  const [diseaseReports, setDiseaseReports] = useState<DiseaseReport[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [selectedOutbreakIdForRadar, setSelectedOutbreakIdForRadar] = useState<string | null>(null);

  // Field diary entries
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

  // Dedicated conversation message history per crop cycle (memory isolation)
  const [messagesByCycle, setMessagesByCycle] = useState<Record<string, ChatMessage[]>>({});
  const messages = activeCropCycleId ? (messagesByCycle[activeCropCycleId] || []) : [];
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Modals visibility
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Toast feedback notifications
  const [toast, setToast] = useState<{ id: string; type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: `toast-${Date.now()}`, type, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Helper to append a message to a specific crop cycle and cache it
  const appendMessage = (cycleId: string, msg: ChatMessage) => {
    setMessagesByCycle((prev) => {
      const currentList = prev[cycleId] || [];
      const updated = [...currentList, msg];
      const userIdKey = profile.id || 'guest';
      try {
        localStorage.setItem(`cropradar.chat.${userIdKey}.${cycleId}`, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not cache cycle messages:', e);
      }
      return {
        ...prev,
        [cycleId]: updated,
      };
    });
  };

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  // 1. Initial Authentication Check (Does NOT force auto-login if user signed out)
  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | undefined;

    const applySession = async (session: any) => {
      if (!isMounted) return;
      const user = session?.user;
      if (!user) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setCropCycles([]);
        setActiveCropCycleId(null);
        setMessagesByCycle({});
        setDiaryEntries([]);
        setNotificationsList([]);
        setUnreadNotificationsCount(0);
        setProfile(DEFAULT_PROFILE);
        return;
      }

      setIsAuthenticated(true);
      setIsLoadingAuth(false);

      // Clear previous user's client state on account change
      setCropCycles([]);
      setActiveCropCycleId(null);
      setMessagesByCycle({});
      setDiaryEntries([]);
      setNotificationsList([]);
      setUnreadNotificationsCount(0);

      const isAnonymous = Boolean(user.is_anonymous ?? user.app_metadata?.provider === 'anonymous');
      const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
      const accountProfile = readStoredProfile(user.id);

      const initialProfile: FarmerProfile = {
        ...DEFAULT_PROFILE,
        ...(accountProfile || {}),
        id: user.id,
        email: user.email || undefined,
        isAnonymous,
        name: accountProfile?.name || metadataName || 'Farmer',
        farmLocation: accountProfile?.farmLocation || DEFAULT_PROFILE.farmLocation,
        hasExplicitLocation: Boolean(accountProfile?.hasExplicitLocation),
        locationSource: accountProfile?.locationSource || 'none',
      };
      setProfile(initialProfile);

      // Load saved farm profile from Supabase
      try {
        const response = await authFetch('/api/farm-profile');
        if (response.ok) {
          const result = await response.json();
          const farm = result.farm;
          if (isMounted && farm) {
            setProfile((prev) => ({
              ...prev,
              name: farm.name || prev.name,
              farmLocation: farm.villageSector || prev.farmLocation,
              latitude: Number.isFinite(Number(farm.latitude)) ? Number(farm.latitude) : prev.latitude,
              longitude: Number.isFinite(Number(farm.longitude)) ? Number(farm.longitude) : prev.longitude,
              hasExplicitLocation: Boolean(farm.hasExplicitLocation),
              locationSource: farm.locationSource || 'none',
            }));
            if (farm.hasExplicitLocation) {
              setGpsStatus('manual');
            }
          }
        }
      } catch (error) {
        console.warn('Could not load saved farm profile:', error);
      }

      // Load crop cycles for this authenticated user
      try {
        const resp = await authFetch('/api/crop-cycles');
        if (resp.ok) {
          const json = await resp.json();
          if (json.success && Array.isArray(json.cycles)) {
            const mapped: CropCycle[] = json.cycles.map((c: any) => ({
              id: c.id,
              userId: c.user_id,
              farmId: c.farm_id,
              cropNameEn: c.crop_name_en || c.crop_name || 'Chilli',
              cropNameTe: c.crop_name_te || c.crop_name || 'మిరప',
              cycleLabel: c.cycle_label || `${c.crop_name || 'Crop'} (2026)`,
              sowingDate: c.sowing_date,
              stage: c.stage || 'Vegetative Growth',
              status: c.status || 'active',
              createdAt: c.created_at,
            }));
            setCropCycles(mapped);
            if (mapped.length > 0) {
              const active = mapped.find((c) => c.status === 'active');
              if (active) {
                setActiveCropCycleId(active.id);
                setProfile((p) => ({ ...p, primaryCrop: active.cropNameEn }));
              } else {
                setActiveCropCycleId(null);
                // Prompt farmer to choose or start a crop conversation immediately after login
                setIsNewCropModalOpen(true);
              }
            } else {
              // Empty state for brand new user: prompt farmer to choose or start a crop conversation immediately
              setActiveCropCycleId(null);
              setIsNewCropModalOpen(true);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load crop cycles from server:', err);
      }

      // Fetch user-scoped notifications and field diary
      fetchDiaryEntries();
      fetchNotifications();
    };

    void (async () => {
      const supabase = await getSupabaseClient();
      if (!supabase || !isMounted) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setTimeout(() => { void applySession(session); }, 0);
      });
      subscription = data.subscription;

      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      await applySession(session);
    })();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Save profile to localStorage on change (scoped by user ID)
  useEffect(() => {
    try {
      localStorage.setItem(getProfileStorageKey(profile.id), JSON.stringify(profile));
    } catch (error) {
      console.warn('Could not persist farm profile locally:', error);
    }
  }, [profile]);

  // 2. Load dedicated conversation history when active crop cycle changes (strictly isolated)
  useEffect(() => {
    if (!activeCropCycleId) return;

    const targetCycleId = activeCropCycleId;
    const userIdKey = profile.id || 'guest';
    const cacheKey = `cropradar.chat.${userIdKey}.${targetCycleId}`;

    // Read from localStorage if this cycle is not yet cached in state
    setMessagesByCycle((prev) => {
      if (prev[targetCycleId] && prev[targetCycleId].length > 0) {
        return prev;
      }
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return { ...prev, [targetCycleId]: parsed };
          }
        }
      } catch (e) {
        console.warn('Failed to parse cached cycle messages:', e);
      }
      return prev;
    });

    // Fetch confirmed messages from server strictly scoped to this cycle
    let isSubscribed = true;
    const fetchCycleMessages = async () => {
      try {
        const resp = await authFetch(`/api/crop-cycles/${targetCycleId}/messages`);
        if (resp.ok) {
          const json = await resp.json();
          if (isSubscribed && json.success && Array.isArray(json.messages)) {
            setMessagesByCycle((prev) => ({
              ...prev,
              [targetCycleId]: json.messages,
            }));
            try {
              localStorage.setItem(cacheKey, JSON.stringify(json.messages));
            } catch (e) {
              console.warn('Could not cache cycle messages:', e);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load messages for cycle:', err);
      }
    };

    fetchCycleMessages();

    return () => {
      isSubscribed = false;
    };
  }, [activeCropCycleId, profile.id]);

  // 4. GPS Geolocation Detection (Never silently substitutes Guntur)
  const handleDetectGps = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('failed');
      return;
    }

    setGpsStatus('detecting');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        setProfile((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
          farmLocation: `GPS Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
          hasExplicitLocation: true,
          locationSource: 'gps',
        }));
        setGpsStatus('acquired');
        fetchWeatherData(lat, lon, `GPS (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
        fetchDiseaseReports(lat, lon);
      },
      (err) => {
        console.warn('GPS detection failed or timed out:', err);
        setGpsStatus('failed');
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 30000 }
    );
  };

  // Attempt initial GPS check once
  useEffect(() => {
    if (profile.hasExplicitLocation && profile.locationSource !== 'none') {
      setGpsStatus(profile.locationSource === 'gps' ? 'acquired' : 'manual');
      return;
    }
    handleDetectGps();
  }, []);

  // Fetch weather and disease radar
  useEffect(() => {
    if (profile.hasExplicitLocation || profile.latitude) {
      fetchWeatherData(profile.latitude, profile.longitude, profile.farmLocation);
      fetchDiseaseReports(profile.latitude, profile.longitude);
      fetchDiaryEntries();
      fetchNotifications();
    }
  }, [profile.latitude, profile.longitude, profile.hasExplicitLocation]);

  const fetchWeatherData = async (lat: number, lon: number, locName: string) => {
    try {
      const resp = await fetch(`/api/weather?lat=${lat}&lon=${lon}&location=${encodeURIComponent(locName)}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) {
          setWeatherData(json);
        }
      }
    } catch (e) {
      console.warn('Weather fetch error:', e);
    }
  };

  const fetchDiseaseReports = async (lat: number, lon: number) => {
    try {
      const resp = await fetch(`/api/disease-radar?lat=${lat}&lon=${lon}&radiusKm=35`);
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) {
          setDiseaseReports(json.reports || []);
        }
      }
    } catch (e) {
      console.warn('Disease reports fetch error:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const resp = await authFetch('/api/notifications');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.notifications) {
          setNotificationsList(json.notifications);
          setUnreadNotificationsCount(
            json.unreadCount ?? json.notifications.filter((n: any) => !n.isRead).length
          );
        }
      }
    } catch (e) {
      console.warn('Notifications fetch error:', e);
    }
  };

  const fetchDiaryEntries = async () => {
    try {
      const resp = await authFetch('/api/field-diary');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) {
          setDiaryEntries(json.records || []);
        }
      }
    } catch (e) {
      console.warn('Field diary fetch error:', e);
    }
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'te' : 'en'));
  };

  // Guest login handler from LoginPage
  const handleGuestLogin = async () => {
    await ensureGuestOrAuthSession();
    setIsAuthenticated(true);
  };

  // Save Profile Handler (never stores field size)
  const handleSaveProfile = async (updated: FarmerProfile) => {
    setProfile(updated);
    if (updated.hasExplicitLocation) {
      setGpsStatus('manual');
    }

    try {
      await authFetch('/api/farm-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updated.name,
          primaryCrop: updated.primaryCrop,
          villageSector: updated.farmLocation,
          hasExplicitLocation: updated.hasExplicitLocation,
          locationSource: updated.locationSource,
          latitude: updated.latitude,
          longitude: updated.longitude,
        }),
      });
    } catch (error) {
      console.warn('Farm profile saved locally but not to Supabase:', error);
    }
    fetchWeatherData(updated.latitude, updated.longitude, updated.farmLocation);
    fetchDiseaseReports(updated.latitude, updated.longitude);
  };

  // Create New Crop Cycle (Strictly separate conversation, no field size)
  const handleCreateNewCrop = async ({
    cropNameEn,
    cropNameTe,
    sowingDate,
    stage,
    cycleLabel,
  }: {
    cropNameEn: string;
    cropNameTe: string;
    sowingDate: string;
    stage: string;
    cycleLabel: string;
  }) => {
    const newCycleId = `cycle-${Date.now()}`;
    const newCycle: CropCycle = {
      id: newCycleId,
      cropNameEn,
      cropNameTe,
      cycleLabel,
      sowingDate,
      stage,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    // Save to server with user-scoped auth token
    try {
      const resp = await authFetch('/api/crop-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropName: cropNameEn,
          cropNameEn,
          cropNameTe,
          sowingDate,
          stage,
          cycleLabel,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.cycle) {
          newCycle.id = json.cycle.id || newCycleId;
        }
      }
    } catch (err) {
      console.warn('Crop cycle saved locally:', err);
    }

    setCropCycles((prev) => [newCycle, ...prev]);
    setActiveCropCycleId(newCycle.id);
    setProfile((p) => ({ ...p, primaryCrop: `${cropNameEn} (${cropNameTe})` }));
    setMessagesByCycle((prev) => ({ ...prev, [newCycle.id]: [] })); // Dedicated isolated conversation

    showToast(
      'success',
      isTe
        ? `"${cropNameTe || cropNameEn}" పంట కోసం కొత్త సంభాషణ ప్రారంభమైంది.`
        : `New crop conversation started for ${cropNameEn}.`
    );
  };

  // Select existing crop cycle from sidebar
  const handleSelectCropCycle = (cycleId: string) => {
    setActiveCropCycleId(cycleId);
    const cycle = cropCycles.find((c) => c.id === cycleId);
    if (cycle) {
      setProfile((p) => ({ ...p, primaryCrop: `${cycle.cropNameEn} (${cycle.cropNameTe})` }));
    }
  };

  // Ensure an active crop cycle is selected before photo uploads or camera captures
  const ensureActiveCropCycle = (forAction: 'photo' | 'camera' = 'photo'): boolean => {
    if (activeCropCycleId) {
      return true;
    }

    // Attempt to resume an existing active cycle
    const existingActive = cropCycles.find((c) => c.status === 'active');
    if (existingActive) {
      handleSelectCropCycle(existingActive.id);
      showToast(
        'info',
        isTe
          ? `యాక్టివ్ పంట "${existingActive.cropNameTe || existingActive.cropNameEn}" సంభాషణ కొనసాగుతోంది.`
          : `Resumed active crop conversation for ${existingActive.cropNameEn}.`
      );
      return true;
    }

    // No active cycle exists: prompt user to choose or start one first
    showToast(
      'info',
      isTe
        ? 'ఫోటో విశ్లేషణ కోసం దయచేసి ముందుగా పంట సంభాషణను ఎంచుకోండి లేదా ప్రారంభించండి.'
        : 'Please select or start a crop conversation before uploading a photo for analysis.'
    );
    setIsNewCropModalOpen(true);
    return false;
  };

  // Helper to find existing matching cycle for a detected crop
  const findMatchingCycle = (cropNameQuery: string): CropCycle | undefined => {
    if (!cropNameQuery) return undefined;
    const q = cropNameQuery.toLowerCase();
    return cropCycles.find((c) => {
      const en = (c.cropNameEn || '').toLowerCase();
      const te = (c.cropNameTe || '').toLowerCase();
      return (
        q.includes(en) ||
        en.includes(q.split('/')[0].trim().toLowerCase()) ||
        q.includes(te) ||
        te.includes(q)
      );
    });
  };

  // Switch to an existing crop cycle and apply the diagnosis there
  const handleSwitchToCropAndApply = (targetCycleId: string, originalMsg: ChatMessage) => {
    if (!originalMsg.diagnosisData) return;

    const resolvedDiag: DiagnosisDetails = {
      ...originalMsg.diagnosisData,
      cropMismatch: originalMsg.diagnosisData.cropMismatch
        ? { ...originalMsg.diagnosisData.cropMismatch, isMismatch: false }
        : undefined,
    };

    handleSelectCropCycle(targetCycleId);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      cropCycleId: targetCycleId,
      role: 'farmer',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      textEn: originalMsg.textEn,
      textTe: originalMsg.textTe,
      imagePreview: originalMsg.imagePreview,
    };

    const targetCycle = cropCycles.find((c) => c.id === targetCycleId);
    const targetCropName = targetCycle?.cropNameEn || 'Crop';

    const matchScore = resolvedDiag.diagnosisOrProduct.aiMatchScore ?? 0.85;
    const hasHostRange = Boolean(
      resolvedDiag.pathogenSusceptibleHosts && resolvedDiag.pathogenSusceptibleHosts.length > 0
    );

    const alertInfo = (resolvedDiag.analysisType === 'crop_diagnosis' && matchScore > 0.70 && profile.hasExplicitLocation)
      ? {
          status: hasHostRange ? ('sent' as const) : ('unknown_host_range' as const),
          diseaseName: isTe ? resolvedDiag.diagnosisOrProduct.titleTe : resolvedDiag.diagnosisOrProduct.titleEn,
          crop: isTe ? resolvedDiag.crop.nameTe : resolvedDiag.crop.nameEn,
          lat: profile.latitude,
          lon: profile.longitude,
          generalizedLocation: profile.farmLocation,
          aiMatchScore: matchScore,
          pathogenHosts: resolvedDiag.pathogenSusceptibleHosts,
          vectorHosts: resolvedDiag.vectorReservoirHosts,
          precautions: resolvedDiag.extensionPrecautions,
        }
      : undefined;

    // Automatic outbreak dispatch under target crop
    if (resolvedDiag.analysisType === 'crop_diagnosis' && matchScore > 0.70 && profile.hasExplicitLocation) {
      authFetch('/api/disease-radar/auto-outbreak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: targetCropName,
          diseaseName: resolvedDiag.diagnosisOrProduct.titleEn,
          diseaseCategory: resolvedDiag.diagnosisOrProduct.category,
          aiMatchScore: matchScore,
          symptoms: (resolvedDiag.observationsEn || []).join('; '),
          cropCycleId: targetCycleId,
        }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.alertDispatched) {
            showToast(
              'success',
              isTe
                ? `5 కి.మీ అలర్ట్ స్వయంచాలకంగా ${json.alertedFarmsCount} మంది రైతులకు పంపబడింది.`
                : `5 km alert automatically dispatched to ${json.alertedFarmsCount} nearby farm(s).`
            );
          }
        })
        .catch((e) => console.warn('Auto outbreak dispatch error:', e));
    }

    const assistantMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      cropCycleId: targetCycleId,
      role: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      textEn: resolvedDiag.spokenSummaryEn || 'Analysis complete.',
      textTe: resolvedDiag.spokenSummaryTe || 'విశ్లేషణ పూర్తయింది.',
      diagnosisData: resolvedDiag,
      outbreakAlert: alertInfo,
    };

    appendMessage(targetCycleId, userMsg);
    appendMessage(targetCycleId, assistantMsg);

    showToast(
      'success',
      isTe
        ? `"${targetCycle?.cropNameTe || targetCropName}" సంభాషణకు మార్చబడింది. విశ్లేషణ ఇక్కడ భద్రపరచబడింది.`
        : `Switched to ${targetCropName} conversation. Diagnosis filed under ${targetCropName}.`
    );
  };

  // Start a new crop cycle for the detected crop and apply the diagnosis there
  const handleStartNewCropAndApply = async (
    detectedEn: string,
    detectedTe: string,
    originalMsg: ChatMessage
  ) => {
    if (!originalMsg.diagnosisData) return;

    const newCycleId = `cycle-${Date.now()}`;
    const currentYear = new Date().getFullYear();
    const cycleLabel = `${detectedEn} (${currentYear})`;

    const newCycle: CropCycle = {
      id: newCycleId,
      cropNameEn: detectedEn,
      cropNameTe: detectedTe,
      cycleLabel,
      sowingDate: new Date().toISOString().split('T')[0],
      stage: 'Vegetative Growth',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    try {
      const resp = await authFetch('/api/crop-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropName: detectedEn,
          cropNameEn: detectedEn,
          cropNameTe: detectedTe,
          sowingDate: newCycle.sowingDate,
          stage: newCycle.stage,
          cycleLabel,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.cycle?.id) {
          newCycle.id = json.cycle.id;
        }
      }
    } catch (e) {
      console.warn('Could not save new crop cycle to server:', e);
    }

    setCropCycles((prev) => [newCycle, ...prev]);
    setActiveCropCycleId(newCycle.id);
    setProfile((p) => ({ ...p, primaryCrop: `${detectedEn} (${detectedTe})` }));

    const resolvedDiag: DiagnosisDetails = {
      ...originalMsg.diagnosisData,
      cropMismatch: originalMsg.diagnosisData.cropMismatch
        ? { ...originalMsg.diagnosisData.cropMismatch, isMismatch: false }
        : undefined,
    };

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      cropCycleId: newCycle.id,
      role: 'farmer',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      textEn: originalMsg.textEn,
      textTe: originalMsg.textTe,
      imagePreview: originalMsg.imagePreview,
    };

    const matchScore = resolvedDiag.diagnosisOrProduct.aiMatchScore ?? 0.85;
    const hasHostRange = Boolean(
      resolvedDiag.pathogenSusceptibleHosts && resolvedDiag.pathogenSusceptibleHosts.length > 0
    );

    const alertInfo = (resolvedDiag.analysisType === 'crop_diagnosis' && matchScore > 0.70 && profile.hasExplicitLocation)
      ? {
          status: hasHostRange ? ('sent' as const) : ('unknown_host_range' as const),
          diseaseName: isTe ? resolvedDiag.diagnosisOrProduct.titleTe : resolvedDiag.diagnosisOrProduct.titleEn,
          crop: isTe ? resolvedDiag.crop.nameTe : resolvedDiag.crop.nameEn,
          lat: profile.latitude,
          lon: profile.longitude,
          generalizedLocation: profile.farmLocation,
          aiMatchScore: matchScore,
          pathogenHosts: resolvedDiag.pathogenSusceptibleHosts,
          vectorHosts: resolvedDiag.vectorReservoirHosts,
          precautions: resolvedDiag.extensionPrecautions,
        }
      : undefined;

    // Automatic outbreak dispatch under target crop
    if (resolvedDiag.analysisType === 'crop_diagnosis' && matchScore > 0.70 && profile.hasExplicitLocation) {
      authFetch('/api/disease-radar/auto-outbreak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: detectedEn,
          diseaseName: resolvedDiag.diagnosisOrProduct.titleEn,
          diseaseCategory: resolvedDiag.diagnosisOrProduct.category,
          aiMatchScore: matchScore,
          symptoms: (resolvedDiag.observationsEn || []).join('; '),
          cropCycleId: newCycle.id,
        }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.alertDispatched) {
            showToast(
              'success',
              isTe
                ? `5 కి.మీ అలర్ట్ స్వయంచాలకంగా ${json.alertedFarmsCount} మంది రైతులకు పంపబడింది.`
                : `5 km alert automatically dispatched to ${json.alertedFarmsCount} nearby farm(s).`
            );
          }
        })
        .catch((e) => console.warn('Auto outbreak dispatch error:', e));
    }

    const assistantMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      cropCycleId: newCycle.id,
      role: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      textEn: resolvedDiag.spokenSummaryEn || 'Analysis complete.',
      textTe: resolvedDiag.spokenSummaryTe || 'విశ్లేషణ పూర్తయింది.',
      diagnosisData: resolvedDiag,
      outbreakAlert: alertInfo,
    };

    setMessagesByCycle((prev) => ({
      ...prev,
      [newCycle.id]: [userMsg, assistantMsg],
    }));

    const userIdKey = profile.id || 'guest';
    try {
      localStorage.setItem(`cropradar.chat.${userIdKey}.${newCycle.id}`, JSON.stringify([userMsg, assistantMsg]));
    } catch (e) {
      console.warn(e);
    }

    showToast(
      'success',
      isTe
        ? `కొత్త "${detectedTe}" పంట సంభాషణ ప్రారంభమైంది. విశ్లేషణ ఇక్కడ భద్రపరచబడింది.`
        : `Started new ${detectedEn} conversation. Diagnosis filed under ${detectedEn}.`
    );
  };

  // Continue analyzing under current crop thread
  const handleContinueCurrentCrop = (messageId: string) => {
    if (!activeCropCycleId) return;
    setMessagesByCycle((prev) => {
      const list = prev[activeCropCycleId] || [];
      const updated = list.map((m) => {
        if (m.id === messageId && m.diagnosisData?.cropMismatch) {
          return {
            ...m,
            diagnosisData: {
              ...m.diagnosisData,
              cropMismatch: {
                ...m.diagnosisData.cropMismatch,
                isMismatch: false,
              },
            },
          };
        }
        return m;
      });
      const userIdKey = profile.id || 'guest';
      try {
        localStorage.setItem(`cropradar.chat.${userIdKey}.${activeCropCycleId}`, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return { ...prev, [activeCropCycleId]: updated };
    });
  };

  // Update outbreak alert status within a specific message
  const updateMessageOutbreakStatus = (messageId: string, updates: Partial<any>) => {
    if (!activeCropCycleId) return;
    setMessagesByCycle((prev) => {
      const list = prev[activeCropCycleId] || [];
      const updated = list.map((m) => {
        if (m.id === messageId && m.outbreakAlert) {
          return {
            ...m,
            outbreakAlert: {
              ...m.outbreakAlert,
              ...updates,
            },
          };
        }
        return m;
      });
      const userIdKey = profile.id || 'guest';
      try {
        localStorage.setItem(`cropradar.chat.${userIdKey}.${activeCropCycleId}`, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return { ...prev, [activeCropCycleId]: updated };
    });
  };

  // Confirm and broadcast 5 km outbreak alert to nearby farmers
  const handleConfirmOutbreakAlert = async (messageId: string, alertData: any) => {
    try {
      const resp = await authFetch('/api/disease-radar/auto-outbreak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: alertData.crop,
          diseaseName: alertData.diseaseName,
          diseaseCategory: 'fungal',
          latitude: alertData.lat,
          longitude: alertData.lon,
          symptoms: 'Confirmed by reporting farmer',
          generalizedLocation: alertData.generalizedLocation,
          farmerName: profile.name,
          aiMatchScore: alertData.aiMatchScore,
          cropCycleId: activeCropCycleId,
          radiusKm: 5,
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        const count = json.alertedFarmsCount ?? 0;
        const sentTime = json.dispatchedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        updateMessageOutbreakStatus(messageId, {
          status: 'sent',
          nearbyCount: count,
          dispatchedTime: sentTime,
          outbreakId: json.report?.id,
        });

        if (json.alertDispatched) {
          showToast(
            'success',
            isTe
              ? `🚨 5 కి.మీ కమ్యూనిటీ తెగులు హెచ్చరిక ${count} సమీప రైతులకు పంపబడింది (${sentTime}).`
              : `🚨 5 km Community Outbreak Alert dispatched to ${count} nearby farms (${sentTime}).`
          );
        } else {
          showToast(
            'info',
            isTe
              ? 'సమీప 5 కి.మీ పరిధిలో ప్రభావిత పంటలు సాగుచేస్తున్న పొలాలు ప్రస్తుతం నమోదు కాలేదు.'
              : '0 nearby farms currently cultivate susceptible host crops within 5 km.'
          );
        }

        fetchDiseaseReports(profile.latitude, profile.longitude);
        fetchNotifications();
      }
    } catch (err) {
      console.warn('Failed to confirm outbreak alert:', err);
      showToast('error', isTe ? 'హెచ్చరిక పంపడం విఫలమైంది.' : 'Failed to broadcast outbreak alert.');
    }
  };

  const handleDismissOutbreakAlert = (messageId: string) => {
    updateMessageOutbreakStatus(messageId, { status: 'cancelled' });
    showToast('info', isTe ? 'కమ్యూనిటీ హెచ్చరిక రద్దు చేయబడింది.' : 'Community outbreak alert dismissed.');
  };

  const handleOpenRadar = (outbreakId?: string | null) => {
    setSelectedOutbreakIdForRadar(outbreakId || null);
    setIsRadarOpen(true);
  };

  const handleOpenNotifications = async () => {
    setIsNotificationsOpen(true);

    if (unreadNotificationsCount > 0 || notificationsList.some((n) => !n.isRead)) {
      try {
        const resp = await authFetch('/api/notifications/mark-all-read', {
          method: 'PATCH',
        });
        if (!resp.ok) {
          throw new Error('Failed to update notification read status on server.');
        }
        const json = await resp.json();
        if (!json.success) {
          throw new Error(json.error || 'Server rejected marking notifications as read.');
        }

        // Successfully updated on server: update local state & badge to 0
        setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadNotificationsCount(0);
      } catch (err: any) {
        console.warn('Error marking notifications as read:', err);
        showToast(
          'error',
          isTe
            ? 'నోటిఫికేషన్‌లను చదివినట్లుగా మార్చడంలో విఫలమైంది. దయచేసి నెట్‌వర్క్‌ను పరిశీలించండి.'
            : 'Could not mark notifications as read. Please check your connection.'
        );
      }
    }
  };

  // Central unified send handler
  const handleSendMessage = async (text: string, imageBase64?: string) => {
    if (imageBase64) {
      if (!ensureActiveCropCycle('photo')) {
        return;
      }
    }

    let payloadImage = imageBase64;
    if (imageBase64) {
      try {
        const optimized = await optimizeImageForAnalysis(imageBase64, 1280, 0.82);
        payloadImage = optimized.base64;
      } catch (optErr) {
        console.warn('Pre-send image optimization fallback:', optErr);
      }
    }

    const currentCycleId = activeCropCycleId;
    const activeCycle = cropCycles.find((c) => c.id === currentCycleId);
    const activeCropName = activeCycle?.cropNameEn || profile.primaryCrop;

    const userMsgId = `user-${Date.now()}`;
    const newFarmerMsg: ChatMessage = {
      id: userMsgId,
      cropCycleId: currentCycleId || undefined,
      role: 'farmer',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      textEn: text,
      textTe: text,
      imagePreview: payloadImage,
    };

    if (currentCycleId) {
      appendMessage(currentCycleId, newFarmerMsg);
    }
    setIsAnalyzing(true);
    setAnalysisProgress(payloadImage ? (isTe ? 'చిత్రాన్ని విశ్లేషిస్తున్నాము...' : 'Analyzing crop photo with Gemini AI...') : null);

    try {
      if (payloadImage) {
        // Multimodal analysis route with optimized JPEG
        const resp = await authFetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: payloadImage,
            textPrompt: text,
            language,
            cropContext: activeCropName,
            cropCycleId: currentCycleId,
          }),
        });

        const rawBody = await resp.text();
        let result: any = null;
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json') || rawBody.trim().startsWith('{')) {
          try {
            result = JSON.parse(rawBody);
          } catch {
            result = null;
          }
        }

        // Check for real failure: Do not invent results or pretend failure was success
        if (!resp.ok || !result || !result.success || !result.data) {
          const defaultErrorMessage =
            resp.status === 413
              ? (isTe ? 'ఫోటో పరిమాణం చాలా పెద్దదిగా ఉంది. దయచేసి చిన్న ఫోటో ఎంచుకోండి.' : 'The uploaded photo is too large for serverless processing. Please upload a smaller photo.')
              : resp.status === 504 || resp.status === 502
              ? (isTe ? 'AI విశ్లేషణ సమయం ముగిసింది. దయచేసి స్పష్టమైన ఫోటోతో మళ్లీ ప్రయత్నించండి.' : 'AI model inference timed out. Please try again with a clearer leaf photo.')
              : (isTe ? 'చిత్ర విశ్లేషణ ప్రాసెస్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.' : 'Gemini model analysis could not process this image. Please try again.');

          throw new Error(result?.error || defaultErrorMessage);
        }

        const aiData: DiagnosisDetails = result.data;
        let autoOutbreakInfo: any = undefined;

        const matchScore = aiData.diagnosisOrProduct.aiMatchScore ?? 0.85;
        const isMismatch = Boolean(aiData.cropMismatch?.isMismatch);

        // Process automatic outbreak outcome from server
        if (aiData.autoOutbreakResult) {
          const outcome = aiData.autoOutbreakResult;
          if (outcome.alertDispatched) {
            autoOutbreakInfo = {
              outbreakId: outcome.outbreakId,
              status: 'sent' as const,
              diseaseName: isTe ? aiData.diagnosisOrProduct.titleTe : aiData.diagnosisOrProduct.titleEn,
              crop: isTe ? aiData.crop.nameTe : aiData.crop.nameEn,
              nearbyCount: outcome.alertedFarmsCount,
              dispatchedTime: outcome.dispatchedTime,
              dispatchedTimestamp: outcome.dispatchedTimestamp,
              lat: outcome.report?.latitude ?? profile.latitude,
              lon: outcome.report?.longitude ?? profile.longitude,
              generalizedLocation: outcome.report?.generalizedLocation ?? profile.farmLocation,
              aiMatchScore: outcome.report?.aiMatchScore ?? matchScore,
              pathogenHosts: aiData.pathogenSusceptibleHosts,
              vectorHosts: aiData.vectorReservoirHosts,
              precautions: aiData.extensionPrecautions,
              dbWritesSucceeded: outcome.dbWritesSucceeded,
            };
            showToast(
              'success',
              isTe
                ? `5 కి.మీ కమ్యూనిటీ తెగులు హెచ్చరిక స్వయంచాలకంగా ${outcome.alertedFarmsCount} మంది రైతులకు పంపబడింది.`
                : `5 km community outbreak alert automatically dispatched to ${outcome.alertedFarmsCount} nearby farm(s).`
            );
          } else if (outcome.outbreakCreated && outcome.alertedFarmsCount === 0) {
            autoOutbreakInfo = {
              outbreakId: outcome.outbreakId,
              status: 'no_nearby_hosts' as const,
              diseaseName: isTe ? aiData.diagnosisOrProduct.titleTe : aiData.diagnosisOrProduct.titleEn,
              crop: isTe ? aiData.crop.nameTe : aiData.crop.nameEn,
              nearbyCount: 0,
              dispatchedTime: outcome.dispatchedTime,
              dispatchedTimestamp: outcome.dispatchedTimestamp,
              lat: outcome.report?.latitude ?? profile.latitude,
              lon: outcome.report?.longitude ?? profile.longitude,
              generalizedLocation: outcome.report?.generalizedLocation ?? profile.farmLocation,
              aiMatchScore: outcome.report?.aiMatchScore ?? matchScore,
              pathogenHosts: aiData.pathogenSusceptibleHosts,
              vectorHosts: aiData.vectorReservoirHosts,
              precautions: aiData.extensionPrecautions,
              dbWritesSucceeded: outcome.dbWritesSucceeded,
            };
            showToast(
              'info',
              isTe
                ? 'తెగులు నివేదిక 5 కి.మీ కమ్యూనిటీ రాడార్‌లో నమోదు చేయబడింది.'
                : 'Outbreak report logged to 5 km Community Radar.'
            );
          } else if (outcome.reason) {
            const isLocationIssue = outcome.reason.toLowerCase().includes('location');
            autoOutbreakInfo = {
              status: isLocationIssue ? ('location_unconfigured' as const) : ('unknown_host_range' as const),
              diseaseName: isTe ? aiData.diagnosisOrProduct.titleTe : aiData.diagnosisOrProduct.titleEn,
              crop: isTe ? aiData.crop.nameTe : aiData.crop.nameEn,
              lat: profile.latitude,
              lon: profile.longitude,
              generalizedLocation: profile.farmLocation,
              aiMatchScore: matchScore,
              pathogenHosts: aiData.pathogenSusceptibleHosts,
              vectorHosts: aiData.vectorReservoirHosts,
              precautions: aiData.extensionPrecautions,
              cancellationReasonEn: outcome.reason,
              cancellationReasonTe: outcome.reasonTe,
            };
          }
        } else if (!isMismatch && aiData.analysisType === 'crop_diagnosis' && matchScore > 0.70 && !profile.hasExplicitLocation) {
          autoOutbreakInfo = {
            status: 'location_unconfigured' as const,
            diseaseName: isTe ? aiData.diagnosisOrProduct.titleTe : aiData.diagnosisOrProduct.titleEn,
            crop: isTe ? aiData.crop.nameTe : aiData.crop.nameEn,
            lat: profile.latitude,
            lon: profile.longitude,
            generalizedLocation: profile.farmLocation,
            aiMatchScore: matchScore,
            pathogenHosts: aiData.pathogenSusceptibleHosts,
            vectorHosts: aiData.vectorReservoirHosts,
            precautions: aiData.extensionPrecautions,
          };
        }

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          cropCycleId: currentCycleId || undefined,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          textEn: aiData.spokenSummaryEn || 'Analysis complete.',
          textTe: aiData.spokenSummaryTe || 'విశ్లేషణ పూర్తయింది.',
          diagnosisData: aiData,
          outbreakAlert: autoOutbreakInfo,
        };
        if (currentCycleId) {
          appendMessage(currentCycleId, aiMsg);
        }
      } else {
        // Conversational Chat Route
        const currentCycleHistory = currentCycleId ? (messagesByCycle[currentCycleId] || []) : [];
        const resp = await authFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationHistory: currentCycleHistory,
            language,
            cropContext: activeCropName,
            cropCycleId: currentCycleId,
          }),
        });

        const rawBody = await resp.text();
        let json: any = null;
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json') || rawBody.trim().startsWith('{')) {
          try {
            json = JSON.parse(rawBody);
          } catch {
            json = null;
          }
        }

        if (json && json.success) {
          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            cropCycleId: currentCycleId || undefined,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            textEn: json.replyEn,
            textTe: json.replyTe,
          };
          if (currentCycleId) {
            appendMessage(currentCycleId, aiMsg);
          }
        } else {
          throw new Error(json?.error || (isTe ? 'సందేశం పంపడంలో విఫలమైంది.' : 'Chat response failed. Please try again.'));
        }
      }
    } catch (err: any) {
      console.error('Error in conversation handler:', err);
      const analysisError =
        typeof err?.message === 'string' && err.message
          ? err.message
          : 'I encountered an issue analyzing that request. Please try again with a clearer image.';

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        cropCycleId: currentCycleId || undefined,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        textEn: `⚠️ Analysis notice: ${analysisError}`,
        textTe: isTe ? `⚠️ విశ్లేషణ గమనిక: ${analysisError}` : `⚠️ Analysis notice: ${analysisError}`,
      };
      if (currentCycleId) {
        appendMessage(currentCycleId, errorMsg);
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  // Save diagnosis to field diary with farmer confirmation and explicit feedback
  const handleSaveToDiary = async (details: DiagnosisDetails, thumbnail?: string) => {
    const conditionTitle = isTe
      ? details.diagnosisOrProduct.titleTe || details.diagnosisOrProduct.titleEn
      : details.diagnosisOrProduct.titleEn;

    const confirmed = window.confirm(
      isTe
        ? `ఈ "${conditionTitle}" పరిశీలనను మీ ఫీల్డ్ డైరీలో భద్రపరచాలా?`
        : `Save "${conditionTitle}" to your Field Diary?`
    );
    if (!confirmed) return;

    try {
      const resp = await authFetch('/api/field-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropCycleId: activeCropCycleId,
          cropName: details.crop.nameEn,
          symptoms: details.observationsEn.join('; '),
          diagnosis: details.diagnosisOrProduct.titleEn,
          confidence: details.diagnosisOrProduct.confidenceLevel,
          imageThumbnail: thumbnail,
          treatmentsRecorded: details.immediateActionsEn,
        }),
      });

      if (!resp.ok) {
        throw new Error('Server returned an error status.');
      }

      const json = await resp.json();
      if (!json.success) {
        throw new Error(json.error || 'Server rejected diary entry');
      }

      await fetchDiaryEntries();
      showToast('success', isTe ? 'ఫీల్డ్ డైరీలో సేవ్ చేయబడింది.' : 'Saved to Field Diary.');
    } catch (e) {
      console.error('Failed to save diary entry:', e);
      showToast(
        'error',
        isTe
          ? 'ఫీల్డ్ డైరీలో సేవ్ చేయడం విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.'
          : 'Failed to save to Field Diary. Please try again.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setIsAuthenticated(false);
    setCropCycles([]);
    setActiveCropCycleId(null);
    setMessagesByCycle({});
    setDiaryEntries([]);
    setNotificationsList([]);
    setUnreadNotificationsCount(0);
    setProfile(DEFAULT_PROFILE);
  };

  // 5. Render Loading Spinner while verifying session
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#F6FAF1] flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#256E3A]" />
        <p className="text-xs font-bold text-[#4A6052]">
          {isTe ? 'క్రాప్ రాడార్ సిద్ధమవుతోంది...' : 'Loading Crop Radar AI...'}
        </p>
      </div>
    );
  }

  // 6. Show Login Page when not authenticated
  if (!isAuthenticated) {
    return (
      <LoginPage
        language={language}
        onToggleLanguage={handleToggleLanguage}
        onGuestLogin={handleGuestLogin}
      />
    );
  }

  const activeCycle = cropCycles.find((c) => c.id === activeCropCycleId);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF5] text-[#14281D] font-sans">
      {/* 1. Universal Top Header (Unchanged, with English/Telugu toggle & sidebar toggle) */}
      <Header
        language={language}
        onToggleLanguage={handleToggleLanguage}
        weatherData={weatherData}
        onOpenWeather={() => setIsWeatherOpen(true)}
        onOpenRadar={() => setIsRadarOpen(true)}
        onOpenDiary={() => setIsDiaryOpen(true)}
        onOpenNotifications={handleOpenNotifications}
        onOpenProfile={() => setIsProfileOpen(true)}
        unreadAlertsCount={unreadNotificationsCount}
        onToggleSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* 2. Main Layout with Left Crop Conversations Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar: Historical Crop Conversations & New Crop Button */}
        <CropSidebar
          cropCycles={cropCycles}
          activeCropCycleId={activeCropCycleId}
          onSelectCropCycle={handleSelectCropCycle}
          onOpenNewCropModal={() => setIsNewCropModalOpen(true)}
          language={language}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center / Main Conversational Workspace */}
        <main className="flex-1 flex flex-col p-3 sm:p-5 lg:p-6 space-y-4 max-w-4xl w-full mx-auto min-w-0">
          {/* GPS Location Warning Banner if Location is not configured */}
          {gpsStatus === 'failed' && !gpsBannerDismissed && !profile.hasExplicitLocation && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-700 shrink-0" />
                <p className="leading-relaxed">
                  {isTe
                    ? '📍 ఖచ్చితమైన GPS లొకేషన్ గుర్తించబడలేదు. స్థానిక వాతావరణం మరియు 5 కి.మీ అలర్ట్‌ల కోసం మీ మండలాన్ని ఎంచుకోండి.'
                    : '📍 Location is not set. Enable browser GPS or choose your agricultural sector to get local spray weather and 5 km alerts.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold text-[11px] cursor-pointer"
                >
                  {isTe ? 'సెట్ చేయండి' : 'Set Location'}
                </button>
                <button
                  type="button"
                  onClick={() => setGpsBannerDismissed(true)}
                  className="text-amber-700 hover:text-amber-950 text-xs p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Active Crop Context Strip */}
          {activeCycle && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white border border-[#E2E8D8] text-xs shadow-2xs">
              <div className="flex items-center gap-2 truncate">
                <Sprout className="w-3.5 h-3.5 text-[#256E3A] shrink-0" />
                <span className="font-extrabold text-[#14281D] truncate">
                  {isTe ? (activeCycle.cropNameTe || activeCycle.cropNameEn) : activeCycle.cropNameEn}
                </span>
                <span className="text-[#A3B394]">·</span>
                <span className="text-[#5C6F64] text-[11px] truncate">
                  {activeCycle.stage || 'Vegetative Growth'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#256E3A] bg-[#256E3A]/10 px-2 py-0.5 rounded-full shrink-0">
                {isTe ? 'ప్రత్యేక సంభాషణ' : 'Dedicated Thread'}
              </span>
            </div>
          )}

          {/* Clean Main Screen Greeting (When no messages or empty account) */}
          {(messages.length === 0 || cropCycles.length === 0) && (
            <div className="my-auto py-12 px-6 rounded-3xl bg-white border border-[#E2E8D8] shadow-sm text-center max-w-xl mx-auto space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-[#256E3A]/10 text-[#256E3A] mb-1">
                <Sprout className="w-7 h-7 text-[#256E3A]" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-[#256E3A]">
                  {isTe ? 'క్రాప్ రాడార్ ఆర్టిఫిషియల్ ఇంటెలిజెన్స్' : 'Intelligent Agricultural Assistant'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-black text-[#14281D] tracking-tight">
                  {isTe ? `స్వాగతం, ${profile.name}` : `Welcome, ${profile.name}`}
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#4A6052] italic font-serif leading-relaxed px-4">
                {isTe
                  ? '“రియల్-టైమ్ పంట తెగుళ్ల గుర్తింపు, పురుగుమందుల లేబుల్ స్కానింగ్, వాతావరణ ఆధారిత స్ప్రే సలహాలు మరియు కమ్యూనిటీ తెగుళ్ల సమాచారం అందించే ఏకీకృత సహాయకుడు.”'
                  : '“One unified conversational assistant for real-time crop disease diagnosis, pesticide label scanning, weather-aware spray advisories, and community disease outbreak tracking.”'}
              </p>

              {cropCycles.length === 0 ? (
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setIsNewCropModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isTe ? 'మీ మొదటి పంట సంభాషణ ప్రారంభించండి' : 'Start Your First Crop Conversation'}</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 text-xs text-[#5C6F64]">
                  <p>
                    {isTe
                      ? `${activeCycle?.cropNameTe || activeCycle?.cropNameEn} పంట కోసం ఫోటో తీయండి లేదా ప్రశ్న అడగండి.`
                      : `Ask a question or upload a leaf photo to diagnose health for this ${activeCycle?.cropNameEn || 'crop'}.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isFarmer = msg.role === 'farmer';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isFarmer ? 'items-end' : 'items-start'} space-y-2`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isFarmer
                        ? 'bg-[#256E3A] text-white rounded-tr-xs shadow-xs'
                        : 'bg-white border border-[#E2E8D8] text-[#14281D] rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {/* Attached Photo Preview */}
                    {msg.imagePreview && (
                      <div className="mb-3 rounded-xl overflow-hidden max-h-64 border border-white/20 bg-black/10">
                        <img
                          src={msg.imagePreview}
                          alt="Uploaded crop leaf or label"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <p className="whitespace-pre-line font-medium">
                      {isTe ? msg.textTe || msg.textEn : msg.textEn}
                    </p>
                    <span className={`block text-[10px] mt-1.5 ${isFarmer ? 'text-lime-200' : 'text-[#7E9085]'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Case A: Prominent Crop Mismatch Prompt (Displayed before crop-specific advice or alert) */}
                  {msg.diagnosisData?.cropMismatch?.isMismatch ? (
                    <div className="w-full max-w-[92%] sm:max-w-[85%]">
                      <CropMismatchCard
                        mismatchInfo={msg.diagnosisData.cropMismatch}
                        activeCycleName={activeCycle?.cropNameEn || profile.primaryCrop || 'Current Crop'}
                        existingMatchingCycle={findMatchingCycle(msg.diagnosisData.cropMismatch.detectedCropEn)}
                        language={language}
                        onSwitchToExisting={(cycleId) => handleSwitchToCropAndApply(cycleId, msg)}
                        onStartNewCrop={(detectedEn, detectedTe) => handleStartNewCropAndApply(detectedEn, detectedTe, msg)}
                        onContinueCurrent={() => handleContinueCurrentCrop(msg.id)}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Case B: Render Pathology Diagnosis Card */}
                      {msg.diagnosisData && msg.diagnosisData.analysisType === 'crop_diagnosis' && (
                        <div className="w-full max-w-[92%] sm:max-w-[85%]">
                          <DiagnosisCard
                            data={msg.diagnosisData}
                            language={language}
                            onCheckWeather={() => setIsWeatherOpen(true)}
                            onSaveToDiary={() => handleSaveToDiary(msg.diagnosisData!, msg.imagePreview)}
                          />
                        </div>
                      )}

                      {/* Case C: Render Pesticide Card */}
                      {msg.diagnosisData && msg.diagnosisData.analysisType === 'pesticide_label' && (
                        <div className="w-full max-w-[92%] sm:max-w-[85%]">
                          <PesticideCard
                            data={msg.diagnosisData}
                            language={language}
                            onCheckWeather={() => setIsWeatherOpen(true)}
                            onSaveToDiary={(area, summary) =>
                              handleSaveToDiary(
                                {
                                  ...msg.diagnosisData!,
                                  immediateActionsEn: [summary],
                                },
                                msg.imagePreview
                              )
                            }
                          />
                        </div>
                      )}

                      {/* Case D: Render Outbreak Alert Confirmation Card (Explicit confirmation before notifying nearby farms) */}
                      {msg.outbreakAlert && (
                        <div className="w-full max-w-[92%] sm:max-w-[85%]">
                          <OutbreakAlertConfirmationCard
                            outbreakAlert={msg.outbreakAlert}
                            language={language}
                            onConfirmSend={() => handleConfirmOutbreakAlert(msg.id, msg.outbreakAlert)}
                            onDismiss={() => handleDismissOutbreakAlert(msg.id)}
                            onOpenRadar={(outbreakId) => handleOpenRadar(outbreakId)}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* In-Flight Analysis Progress Indicator */}
            {isAnalyzing && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-[#CBD9BE] text-[#256E3A] text-xs font-bold w-fit shadow-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-[#256E3A]" />
                <span>{analysisProgress || (isTe ? 'AI ఆలోచిస్తోంది...' : 'Crop Radar AI is thinking...')}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Unified Input Message Composer */}
          <MessageComposer
            onSendMessage={handleSendMessage}
            onOpenCamera={() => {
              if (ensureActiveCropCycle('camera')) {
                setIsCameraOpen(true);
              }
            }}
            onBeforeAttach={() => ensureActiveCropCycle('photo')}
            language={language}
            disabled={isAnalyzing}
          />
        </main>
      </div>

      {/* Modals */}
      <NewCropModal
        isOpen={isNewCropModalOpen}
        onClose={() => setIsNewCropModalOpen(false)}
        onCreateCrop={handleCreateNewCrop}
        language={language}
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(imgB64) => {
          setIsCameraOpen(false);
          if (ensureActiveCropCycle('camera')) {
            handleSendMessage('', imgB64);
          }
        }}
        language={language}
      />

      <WeatherModal
        isOpen={isWeatherOpen}
        onClose={() => setIsWeatherOpen(false)}
        data={weatherData}
        language={language}
      />

      <DiseaseRadarModal
        isOpen={isRadarOpen}
        onClose={() => {
          setIsRadarOpen(false);
          setSelectedOutbreakIdForRadar(null);
        }}
        reports={diseaseReports}
        farmerLocation={{
          lat: profile.latitude,
          lon: profile.longitude,
          name: profile.farmLocation,
          hasExplicitLocation: profile.hasExplicitLocation,
        }}
        selectedOutbreakId={selectedOutbreakIdForRadar}
        onReportOutbreak={async (newReport) => {
          try {
            const resp = await authFetch('/api/disease-radar/auto-outbreak', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newReport),
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data.success) {
                showToast(
                  'success',
                  isTe
                    ? `🚨 తెగులు హెచ్చరిక విజయవంతంగా పంపబడింది (${data.alertedFarmsCount ?? 0} పొలాలు).`
                    : `🚨 Outbreak alert broadcast to ${data.alertedFarmsCount ?? 0} nearby farms.`
                );
                fetchDiseaseReports(profile.latitude, profile.longitude);
                fetchNotifications();
              } else {
                showToast('error', isTe ? 'హెచ్చరిక పంపడం విఫలమైంది.' : 'Failed to broadcast outbreak alert.');
              }
            } else {
              showToast('error', isTe ? 'హెచ్చరిక పంపడం విఫలమైంది.' : 'Failed to broadcast outbreak alert.');
            }
          } catch (e) {
            console.warn('Report outbreak error:', e);
            showToast('error', isTe ? 'హెచ్చరిక పంపడం విఫలమైంది.' : 'Failed to broadcast outbreak alert.');
          }
        }}
        language={language}
      />

      <FieldDiaryDrawer
        isOpen={isDiaryOpen}
        onClose={() => setIsDiaryOpen(false)}
        entries={diaryEntries}
        language={language}
        onSelectEntryForChat={(entry) =>
          handleSendMessage(
            isTe
              ? `${entry.cropName} పై గతంలో నమోదైన "${entry.diagnosis}" గురించి తదుపరి సలహా ఇవ్వండి.`
              : `Provide follow-up advice for previously logged ${entry.cropName} issue (${entry.diagnosis}).`
          )
        }
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notificationsList={notificationsList}
        language={language}
        onOpenRadar={(outbreakId) => handleOpenRadar(outbreakId)}
        onMarkAsRead={(id) => {
          setNotificationsList((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
          authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch((e) => console.warn(e));
        }}
      />

      <FarmProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
        language={language}
        onSignOut={handleSignOut}
      />

      {/* Toast Notification Alert */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-white border-[#256E3A]/40 text-[#14281D]'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#256E3A] shrink-0" />}
          {toast.type === 'error' && <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-[#256E3A] shrink-0" />}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-black ml-2 cursor-pointer transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
