import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Send,
  Loader2,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

import {
  Language,
  ChatMessage,
  WeatherData,
  DiagnosisDetails,
  DiseaseReport,
  DiaryEntry,
  FarmerProfile,
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

// Sample preloaded assets for immediate testing
const SAMPLE_CHILLI_IMAGE = '/src/assets/images/chilli_leaf_disease_1793889004111.jpg';
const SAMPLE_RICE_IMAGE = '/src/assets/images/rice_leaf_blast_1793889004976.jpg';
const SAMPLE_COTTON_IMAGE = '/src/assets/images/cotton_bollworm_1793889005616.jpg';
const SAMPLE_PESTICIDE_IMAGE = '/src/assets/images/pesticide_bottle_label_1793889006326.jpg';

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const isTe = language === 'te';

  // Farmer profile state
  const [profile, setProfile] = useState<FarmerProfile>({
    name: 'Srinivasa Rao',
    phone: '+91 98480 12345',
    farmLocation: 'Guntur Chilli Belt, Andhra Pradesh',
    latitude: 16.3067,
    longitude: 80.4365,
    primaryCrop: 'Chilli (మిరప)',
    acreage: 4.5,
    preferredLanguage: 'en',
  });

  // Weather data
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  // Disease radar reports
  const [diseaseReports, setDiseaseReports] = useState<DiseaseReport[]>([]);

  // Field diary entries
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

  // Conversational message history
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Modals visibility
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  // GPS status
  const [isGpsActive, setIsGpsActive] = useState(true);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Default GPS auto-detection on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lon = Number(pos.coords.longitude.toFixed(4));
          setProfile((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lon,
          }));
          setIsGpsActive(true);
        },
        (err) => {
          console.warn('Default GPS lookup fallback to regional coordinates:', err);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchWeatherData(profile.latitude, profile.longitude, profile.farmLocation);
    fetchDiseaseReports(profile.latitude, profile.longitude);
    fetchDiaryEntries();
    fetchNotifications();
  }, [profile.latitude, profile.longitude]);

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
      const resp = await fetch('/api/notifications');
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
      const resp = await fetch('/api/field-diary');
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

  // Central unified send handler
  const handleSendMessage = async (text: string, imageBase64?: string) => {
    const userMsgId = `user-${Date.now()}`;
    const newFarmerMsg: ChatMessage = {
      id: userMsgId,
      role: 'farmer',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      textEn: text,
      textTe: text,
      imagePreview: imageBase64,
    };

    setMessages((prev) => [...prev, newFarmerMsg]);
    setIsAnalyzing(true);

    try {
      if (imageBase64) {
        // Multimodal analysis route (Crop pathology or Pesticide label OCR)
        const resp = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            textPrompt: text,
            language,
            cropContext: profile.primaryCrop,
          }),
        });

        const result = await resp.json();
        if (result.success && result.data) {
          const aiData: DiagnosisDetails = result.data;

          let autoOutbreakInfo: any = undefined;

          // If a disease is detected, automatically report outbreak and send alert to nearby farms within 5 km
          if (aiData.analysisType === 'crop_diagnosis') {
            try {
              const outbreakResp = await fetch('/api/disease-radar/auto-outbreak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  crop: isTe ? aiData.crop.nameTe : aiData.crop.nameEn,
                  diseaseName: isTe ? aiData.diagnosisOrProduct.titleTe : aiData.diagnosisOrProduct.titleEn,
                  diseaseCategory: aiData.diagnosisOrProduct.category,
                  latitude: profile.latitude,
                  longitude: profile.longitude,
                  symptoms: (isTe ? aiData.observationsTe : aiData.observationsEn).join('; '),
                  generalizedLocation: profile.farmLocation,
                  farmerName: profile.name,
                  radiusKm: 5,
                }),
              });

              if (outbreakResp.ok) {
                const autoJson = await outbreakResp.json();
                if (autoJson.success) {
                  autoOutbreakInfo = {
                    diseaseName: isTe ? aiData.diagnosisOrProduct.titleTe : aiData.diagnosisOrProduct.titleEn,
                    crop: isTe ? aiData.crop.nameTe : aiData.crop.nameEn,
                    nearbyCount: autoJson.alertedFarmsCount || 5,
                    dispatchedTime: 'Just now',
                    lat: profile.latitude,
                    lon: profile.longitude,
                  };
                  fetchDiseaseReports(profile.latitude, profile.longitude);
                  fetchNotifications();
                }
              }
            } catch (outbreakErr) {
              console.warn('Auto outbreak dispatch error:', outbreakErr);
            }
          }

          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            textEn: aiData.spokenSummaryEn || 'Analysis complete.',
            textTe: aiData.spokenSummaryTe || 'విశ్లేషణ పూర్తయింది.',
            diagnosisData: aiData,
            outbreakAlert: autoOutbreakInfo,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          throw new Error(result.error || 'Failed to analyze crop image');
        }
      } else {
        // Check if query is weather related
        const textLower = text.toLowerCase();
        if (
          textLower.includes('spray') ||
          textLower.includes('weather') ||
          textLower.includes('rain') ||
          textLower.includes('పిచికారీ') ||
          textLower.includes('వాతావరణం')
        ) {
          const evalStatus = weatherData?.evaluation.status || 'optimal';
          const evalReasons = isTe
            ? weatherData?.evaluation.reasonsTe.join(' ')
            : weatherData?.evaluation.reasons.join(' ');

          const replyEn = `Based on current weather at ${profile.farmLocation}: Current status is ${evalStatus.toUpperCase()}. Wind: ${weatherData?.weather.windSpeedKmH} km/h, Rain chance: ${weatherData?.weather.rainProbabilityPercent}%. ${evalReasons}`;
          const replyTe = `మీ పొలం వద్ద ప్రస్తుత వాతావరణం ప్రకారం: పిచికారీ స్థితి "${evalStatus === 'optimal' ? 'అనుకూలం' : 'జాగ్రత్త అవసరం'}". గాలి వేగం: ${weatherData?.weather.windSpeedKmH} km/h, వర్ష సూచన: ${weatherData?.weather.rainProbabilityPercent}%. ${evalReasons}`;

          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            textEn: replyEn,
            textTe: replyTe,
            weatherCard: weatherData || undefined,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          // General conversational chat
          const resp = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              conversationHistory: messages,
              language,
              cropContext: profile.primaryCrop,
            }),
          });

          const json = await resp.json();
          if (json.success) {
            const aiMsg: ChatMessage = {
              id: `ai-${Date.now()}`,
              role: 'assistant',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              textEn: json.replyEn,
              textTe: json.replyTe,
            };
            setMessages((prev) => [...prev, aiMsg]);
          }
        }
      }
    } catch (err: any) {
      console.error('Error in conversation handler:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        textEn: 'I encountered an issue analyzing that request. Please try again or re-upload a clearer image.',
        textTe: 'క్షమించండి, మీ అభ్యర్థనను విశ్లేషించడంలో సమస్య ఎదురైంది. దయచేసి స్పష్టమైన ఫోటోతో మళ్ళీ ప్రయత్నించండి.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Convert an asset image path into a base64 dataUrl for quick sample testing
  const handleSampleClick = async (samplePath: string, promptTextEn: string, promptTextTe: string) => {
    try {
      setIsAnalyzing(true);
      const resp = await fetch(samplePath);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleSendMessage(isTe ? promptTextTe : promptTextEn, reader.result);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error('Failed to load sample asset:', e);
      handleSendMessage(isTe ? promptTextTe : promptTextEn);
    }
  };

  // Save diagnosis to persistent field diary
  const handleSaveToDiary = async (details: DiagnosisDetails, thumbnail?: string) => {
    try {
      const resp = await fetch('/api/field-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropName: details.crop.nameEn,
          symptoms: details.observationsEn.join('; '),
          diagnosis: details.diagnosisOrProduct.titleEn,
          confidence: details.diagnosisOrProduct.confidenceLevel,
          imageThumbnail: thumbnail,
          treatmentsRecorded: details.immediateActionsEn,
        }),
      });

      if (resp.ok) {
        await fetchDiaryEntries();
      }
    } catch (e) {
      console.error('Failed to save diary entry:', e);
    }
  };

  const handleReportOutbreak = async (newReport: Partial<DiseaseReport>) => {
    const resp = await fetch('/api/disease-radar/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReport),
    });
    if (resp.ok) {
      await fetchDiseaseReports(profile.latitude, profile.longitude);
    }
  };

  const handleContinueDiaryChat = (entry: DiaryEntry) => {
    handleSendMessage(
      isTe
        ? `${entry.cropName} పై గతంలో నమోదైన "${entry.diagnosis}" గురించి తదుపరి సలహా ఇవ్వండి.`
        : `Provide follow-up management advice for the previously recorded ${entry.cropName} issue (${entry.diagnosis}).`
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080D1B] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 1. Universal Top Header */}
      <Header
        language={language}
        onToggleLanguage={handleToggleLanguage}
        weatherData={weatherData}
        onOpenWeather={() => setIsWeatherOpen(true)}
        onOpenRadar={() => setIsRadarOpen(true)}
        onOpenDiary={() => setIsDiaryOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        unreadAlertsCount={Math.max(
          unreadNotificationsCount,
          diseaseReports.filter((r) => r.severity === 'severe').length
        )}
      />

      {/* 2. Main Conversational Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-6">
        {/* Welcome Banner / Overview Card (When conversation is fresh) */}
        {messages.length === 0 && (
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>{isTe ? 'క్రాప్ రాడార్ ఆర్టిఫిషియల్ ఇంటెలిజెన్స్' : 'Intelligent Agricultural Assistant'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {isTe
                    ? `స్వాగతం, ${profile.name} గారు`
                    : `Welcome, ${profile.name}`}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                  {isTe
                    ? 'ఒకే చోట పంట తెగుళ్ల గుర్తింపు, పురుగుమందుల లేబుల్ స్కానింగ్, స్ప్రే వాతావరణ సలహాలు మరియు పరిసర ప్రాంతాల తెగుళ్ల హెచ్చరికలు. ఫోటో తీసి లేదా మాట్లాడి వెంటనే ప్రారంభించండి.'
                    : 'One unified conversational assistant for real-time crop disease diagnosis, pesticide label scanning, weather-aware spray advisories, and community disease outbreak tracking.'}
                </p>
              </div>

              {/* Registered Crop Pill */}
              <div className="hidden sm:block text-right shrink-0">
                <span className="text-[11px] text-slate-500 block uppercase">
                  {isTe ? 'నమోదైన పంట' : 'Active Farm'}
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {profile.primaryCrop} ({profile.acreage} ac)
                </span>
              </div>
            </div>

            {/* Quick Demonstration Starters */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
                {isTe ? 'త్వరిత నమూనాలు (పరీక్షించడానికి క్లిక్ చేయండి):' : 'Instant Diagnostic Starters (Click to test):'}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Starter 1: Chilli */}
                <button
                  type="button"
                  onClick={() =>
                    handleSampleClick(
                      SAMPLE_CHILLI_IMAGE,
                      'What is wrong with my chilli leaves? They have yellow spots and are curling.',
                      'నా మిరప ఆకులపై పసుపు మచ్చలు వచ్చి ముడుచుకుంటున్నాయి. ఇది ఏ తెగులు?'
                    )
                  }
                  className="group flex flex-col text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2">
                    <img
                      src={SAMPLE_CHILLI_IMAGE}
                      alt="Chilli leaf disease"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono">
                      Photo
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                    {isTe ? 'మిరప ఆకు ముడుత' : 'Chilli Leaf Spots'}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {isTe ? 'పసుపు మచ్చల విశ్లేషణ' : 'Analyze curl & thrips'}
                  </span>
                </button>

                {/* Starter 2: Rice Blast */}
                <button
                  type="button"
                  onClick={() =>
                    handleSampleClick(
                      SAMPLE_RICE_IMAGE,
                      'Can you identify these lesions on my paddy crop?',
                      'వరి ఆకులపై ఇలాంటి మచ్చలు వచ్చాయి, దీనికి ఏ మందు కొట్టాలి?'
                    )
                  }
                  className="group flex flex-col text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2">
                    <img
                      src={SAMPLE_RICE_IMAGE}
                      alt="Rice blast lesions"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono">
                      Photo
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                    {isTe ? 'వరి అగ్గితెగులు' : 'Rice Leaf Blast'}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {isTe ? 'శిలీంధ్ర లక్షణాలు' : 'Spindle lesion diagnosis'}
                  </span>
                </button>

                {/* Starter 3: Cotton Pest */}
                <button
                  type="button"
                  onClick={() =>
                    handleSampleClick(
                      SAMPLE_COTTON_IMAGE,
                      'Are these holes in my cotton leaves from caterpillars?',
                      'ప్రత్తి ఆకులపై పురుగు తిన్న గుర్తులు ఉన్నాయి, నివారణ చెప్పండి.'
                    )
                  }
                  className="group flex flex-col text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2">
                    <img
                      src={SAMPLE_COTTON_IMAGE}
                      alt="Cotton pest nibbles"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono">
                      Photo
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                    {isTe ? 'ప్రత్తి పురుగు నష్టం' : 'Cotton Leaf Damage'}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {isTe ? 'పురుగు నివారణ' : 'Bollworm IPM protocol'}
                  </span>
                </button>

                {/* Starter 4: Pesticide Label */}
                <button
                  type="button"
                  onClick={() =>
                    handleSampleClick(
                      SAMPLE_PESTICIDE_IMAGE,
                      'Read this pesticide bottle label. Is it safe for my chilli crop and what is the resistance group?',
                      'ఈ మందు డబ్బా లేబుల్ చదివి, నా మిరప తోటకు వాడవచ్చా మరియు భద్రతా సూచనలు చెప్పండి.'
                    )
                  }
                  className="group flex flex-col text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2">
                    <img
                      src={SAMPLE_PESTICIDE_IMAGE}
                      alt="Pesticide label bottle"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 text-[9px] bg-cyan-950 px-1.5 py-0.5 rounded text-cyan-300 font-mono">
                      Label OCR
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                    {isTe ? 'మందు లేబుల్ స్కాన్' : 'Pesticide OCR Scan'}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {isTe ? 'రసాయన వర్గం & భద్రత' : 'FRAC / IRAC & Safety'}
                  </span>
                </button>
              </div>

              {/* Text starter pill */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSendMessage(
                      isTe
                        ? 'ఈరోజు నా పొలంలో మందు పిచికారీ చేయడానికి వాతావరణం అనుకూలమా?'
                        : 'Can I spray fungicide on my crop today? Check weather conditions.'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span>🌦️</span>
                  <span>
                    {isTe
                      ? 'ఈరోజు మందు పిచికారీ చేయవచ్చా?'
                      : 'Can I spray today? (Weather check)'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsRadarOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span>📡</span>
                  <span>
                    {isTe
                      ? 'నా పొలం చుట్టుపక్కల తెగుళ్ల పరిస్థితి ఏమిటి?'
                      : 'What outbreaks are active near my farm?'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        <div className="space-y-4 flex-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'farmer' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message author line */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                {msg.role === 'farmer' ? (
                  <>
                    <span className="font-semibold text-slate-300">
                      {isTe ? 'రైతు' : 'Farmer'} ({profile.name.split(' ')[0]})
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="font-mono">{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">
                      CROP RADAR AI
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="font-mono">{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-2xl rounded-2xl ${
                  msg.role === 'farmer'
                    ? 'bg-emerald-950/80 border border-emerald-700/60 text-slate-100 p-3 sm:p-4 rounded-tr-sm shadow-md'
                    : 'w-full text-slate-100'
                }`}
              >
                {/* Attached image preview if user uploaded one */}
                {msg.imagePreview && (
                  <div className="mb-2 max-w-sm rounded-xl overflow-hidden border border-emerald-700/40 bg-black">
                    <img
                      src={msg.imagePreview}
                      alt="Uploaded crop or label"
                      className="w-full max-h-60 object-contain"
                    />
                  </div>
                )}

                {/* Farmer text prompt */}
                {msg.role === 'farmer' && (
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                    {isTe ? msg.textTe || msg.textEn : msg.textEn}
                  </p>
                )}

                {/* AI Structured Diagnosis Card */}
                {msg.diagnosisData && msg.diagnosisData.analysisType === 'crop_diagnosis' && (
                  <div className="space-y-3">
                    <DiagnosisCard
                      data={msg.diagnosisData}
                      language={language}
                      onSaveToDiary={() =>
                        handleSaveToDiary(msg.diagnosisData!, msg.imagePreview)
                      }
                      onCheckWeather={() => setIsWeatherOpen(true)}
                    />

                    {/* Automatic 5 km Community Outbreak Proximity Alert Card */}
                    {msg.outbreakAlert && (
                      <div className="w-full rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-amber-950/80 border border-rose-500/50 p-4 shadow-xl text-xs space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                            <span className="font-bold text-rose-300 uppercase tracking-wide text-[11px]">
                              {isTe
                                ? '🚨 5 కి.మీ కమ్యూనిటీ తెగులు హెచ్చరిక ఆటోమేటిక్‌గా పంపబడింది!'
                                : '🚨 Automatic 5 km Community Outbreak Alert Dispatched!'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                            {isTe ? 'GPS నిర్ధారణ' : 'GPS Verified (Default)'}
                          </span>
                        </div>

                        <p className="text-slate-200 leading-relaxed">
                          {isTe
                            ? `ఈ తెగులు నిర్ధారణ అయిన వెంటనే మీ GPS లొకేషన్ (${msg.outbreakAlert.lat.toFixed(4)}, ${msg.outbreakAlert.lon.toFixed(4)}) చుట్టూ 5 కి.మీ పరిధిలోని సమీప రైతులకు ముందస్తు నివారణ హెచ్చరిక ఆటోమేటిక్‌గా పంపబడింది.`
                            : `Upon disease confirmation, an outbreak alert was automatically broadcast to all registered farms within a 5 km perimeter around your GPS coordinates (${msg.outbreakAlert.lat.toFixed(4)}, ${msg.outbreakAlert.lon.toFixed(4)}).`}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-900/50 text-[11px]">
                          <span className="text-amber-300 font-medium">
                            {isTe
                              ? `సమీప రైతులు హెచ్చరించబడ్డారు: ${msg.outbreakAlert.nearbyCount} క్షేత్రాలు`
                              : `Nearby farms notified: ${msg.outbreakAlert.nearbyCount} community farms`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsRadarOpen(true)}
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                          >
                            <span>{isTe ? 'రాడార్ మ్యాప్‌లో వీక్షించండి →' : 'View on Radar Map →'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Structured Pesticide Label Card */}
                {msg.diagnosisData && msg.diagnosisData.analysisType === 'pesticide_label' && (
                  <PesticideCard
                    data={msg.diagnosisData}
                    language={language}
                    onCheckWeather={() => setIsWeatherOpen(true)}
                    onSaveToDiary={() =>
                      handleSaveToDiary(msg.diagnosisData!, msg.imagePreview)
                    }
                  />
                )}

                {/* General Advisory or Weather Response */}
                {msg.role === 'assistant' && !msg.diagnosisData && (
                  <div className="bg-[#10182A] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                      {isTe ? msg.textTe || msg.textEn : msg.textEn}
                    </p>

                    {/* Optional embedded weather card button */}
                    {msg.weatherCard && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIsWeatherOpen(true)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-400 cursor-pointer"
                        >
                          <span>🌦️ {isTe ? 'పూర్తి స్ప్రే షెడ్యూల్ చూడండి' : 'Open Full 4-Day Spray Matrix'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isAnalyzing && (
            <div className="flex items-start gap-2 max-w-md p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs animate-pulse">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300">
                  {isTe ? 'క్రాప్ రాడార్ విశ్లేషిస్తోంది...' : 'Crop Radar Multimodal Engine analyzing...'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isTe
                    ? 'లక్షణాలు, వాతావరణం మరియు రసాయన డేటాను సరిపోల్చుతున్నాము'
                    : 'Correlating leaf symptoms, pathology database, and agro-weather parameters'}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 3. Universal Persistent Bottom Composer */}
      <MessageComposer
        onSendMessage={handleSendMessage}
        onOpenCamera={() => setIsCameraOpen(true)}
        language={language}
        disabled={isAnalyzing}
      />

      {/* Modals & Supporting Drawers */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(img) => {
          setIsCameraOpen(false);
          handleSendMessage('', img);
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
        onClose={() => setIsRadarOpen(false)}
        reports={diseaseReports}
        farmerLocation={{
          lat: profile.latitude,
          lon: profile.longitude,
          name: profile.farmLocation,
        }}
        onReportOutbreak={handleReportOutbreak}
        language={language}
      />

      <FieldDiaryDrawer
        isOpen={isDiaryOpen}
        onClose={() => setIsDiaryOpen(false)}
        entries={diaryEntries}
        language={language}
        onSelectEntryForChat={handleContinueDiaryChat}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        language={language}
        onOpenRadar={() => setIsRadarOpen(true)}
        notificationsList={notificationsList}
      />

      <FarmProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onSaveProfile={(updated) => {
          setProfile(updated);
          fetchWeatherData(updated.latitude, updated.longitude, updated.farmLocation);
          fetchDiseaseReports(updated.latitude, updated.longitude);
        }}
        language={language}
      />
    </div>
  );
}
