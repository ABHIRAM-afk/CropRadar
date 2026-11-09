import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Radar,
  AlertTriangle,
  MapPin,
  Clock,
  PlusCircle,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  EyeOff,
} from 'lucide-react';
import L from 'leaflet';
import { DiseaseReport, Language } from '../types/agricultural';
import { authFetch } from '../lib/supabaseClient';

interface DiseaseRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: DiseaseReport[];
  farmerLocation: { lat: number; lon: number; name: string; hasExplicitLocation?: boolean };
  selectedOutbreakId?: string | null;
  onReportOutbreak: (newReport: Partial<DiseaseReport>) => Promise<void>;
  language: Language;
  currentUserId?: string;
  onRemoveFromMyRadar?: (outbreakId: string) => Promise<void>;
}

export const DiseaseRadarModal: React.FC<DiseaseRadarModalProps> = ({
  isOpen,
  onClose,
  reports,
  farmerLocation,
  selectedOutbreakId,
  onReportOutbreak,
  language,
  currentUserId,
  onRemoveFromMyRadar,
}) => {
  const isTe = language === 'te';
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const [activeTab, setActiveTab] = useState<'map' | 'report'>('map');
  const [mobileViewMode, setMobileViewMode] = useState<'map' | 'list'>('map');
  const [selectedReport, setSelectedReport] = useState<DiseaseReport | null>(null);

  // Account-scoped hidden outbreak IDs loaded from Supabase user_hidden_outbreaks
  const [hiddenOutbreakIds, setHiddenOutbreakIds] = useState<Set<string>>(new Set());
  const [removingOutbreakId, setRemovingOutbreakId] = useState<string | null>(null);

  // Load account-scoped hidden alerts across devices when modal opens or user signs in
  useEffect(() => {
    let isMounted = true;
    if (isOpen && currentUserId) {
      authFetch('/api/disease-radar/hidden-outbreaks')
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (isMounted && json?.success && Array.isArray(json.hiddenOutbreakIds)) {
            setHiddenOutbreakIds(new Set(json.hiddenOutbreakIds));
          }
        })
        .catch((err) => console.warn('Failed to load account hidden outbreaks:', err));
    } else if (!currentUserId) {
      setHiddenOutbreakIds(new Set());
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUserId]);

  const handleRemoveFromMyRadar = async (outbreakId: string) => {
    if (!onRemoveFromMyRadar || removingOutbreakId) return;
    setRemovingOutbreakId(outbreakId);

    try {
      // 1. Await server database confirmation FIRST
      await onRemoveFromMyRadar(outbreakId);

      // 2. Only after database confirms success, update state and map
      setHiddenOutbreakIds((prev) => {
        const next = new Set(prev);
        next.add(outbreakId);
        return next;
      });

      if (selectedReport?.id === outbreakId) {
        setSelectedReport(null);
      }

      // Safely remove marker from map instance
      const marker = markerMapRef.current.get(outbreakId);
      if (marker && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker);
        markerMapRef.current.delete(outbreakId);
      }
    } catch (err: any) {
      // If server write fails, DO NOT hide the report from list or map!
      // Keep alert visible; error toast is shown by App.tsx
      console.error('Failed to remove outbreak from radar:', err);
    } finally {
      setRemovingOutbreakId(null);
    }
  };

  const visibleReports = reports.filter((rep) => !hiddenOutbreakIds.has(rep.id));

  const hasFarmCoords = Boolean(
    farmerLocation?.hasExplicitLocation &&
    Number.isFinite(farmerLocation?.lat) &&
    Number.isFinite(farmerLocation?.lon) &&
    farmerLocation.lat !== 0
  );

  // Location source
  const [locationSource, setLocationSource] = useState<'gps' | 'manual'>('gps');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number }>({
    lat: hasFarmCoords ? farmerLocation.lat : 16.3067,
    lon: hasFarmCoords ? farmerLocation.lon : 80.4365,
  });
  const [manualLat, setManualLat] = useState<string>(hasFarmCoords ? farmerLocation.lat.toString() : '');
  const [manualLon, setManualLon] = useState<string>(hasFarmCoords ? farmerLocation.lon.toString() : '');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // New report form state
  const [formCrop, setFormCrop] = useState('Chilli (మిరప)');
  const [formDisease, setFormDisease] = useState('');
  const [formCategory, setFormCategory] = useState<'fungal' | 'bacterial' | 'viral' | 'pest'>('pest');
  const [formSymptoms, setFormSymptoms] = useState('');
  const [formSector, setFormSector] = useState('Local Farmlands (Sector Centroid)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const refreshGpsLocation = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setIsDetectingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4)),
          });
          setIsDetectingGps(false);
        },
        (err) => {
          console.warn('GPS location request fallback to current farm position:', err);
          setIsDetectingGps(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'map') return;

    const timer = setTimeout(() => {
      initMap();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerMapRef.current.clear();
    };
  }, [isOpen, activeTab, visibleReports, selectedOutbreakId, hasFarmCoords]);

  const initMap = () => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    markerMapRef.current.clear();

    // Determine initial center and target outbreak
    const targetOutbreak = selectedOutbreakId
      ? visibleReports.find((r) => r.id === selectedOutbreakId)
      : null;

    let centerLat = 16.3067;
    let centerLon = 80.4365;
    let initialZoom = 11;

    if (targetOutbreak && Number.isFinite(targetOutbreak.latitude) && Number.isFinite(targetOutbreak.longitude)) {
      centerLat = targetOutbreak.latitude;
      centerLon = targetOutbreak.longitude;
      initialZoom = 13;
      setSelectedReport(targetOutbreak);
    } else if (hasFarmCoords) {
      centerLat = farmerLocation.lat;
      centerLon = farmerLocation.lon;
      initialZoom = 12;
    } else if (visibleReports.length > 0 && Number.isFinite(visibleReports[0].latitude) && Number.isFinite(visibleReports[0].longitude)) {
      centerLat = visibleReports[0].latitude;
      centerLon = visibleReports[0].longitude;
      initialZoom = 11;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLon],
      zoom: initialZoom,
      zoomControl: true,
      touchZoom: true,
      dragging: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Track placed marker positions to de-conflict overlapping coordinates
    const placedPoints: Array<{ lat: number; lon: number }> = [];

    const getDeconflictedCoords = (rawLat: number, rawLon: number): [number, number] => {
      let adjustedLat = rawLat;
      let adjustedLon = rawLon;
      const threshold = 0.0006;
      let attempts = 0;

      while (attempts < 12) {
        const collides = placedPoints.some(
          (p) => Math.hypot(p.lat - adjustedLat, p.lon - adjustedLon) < threshold
        );
        if (!collides) {
          placedPoints.push({ lat: adjustedLat, lon: adjustedLon });
          return [adjustedLat, adjustedLon];
        }
        attempts++;
        const angle = (attempts * 2 * Math.PI) / 6;
        const distance = 0.00075 * Math.ceil(attempts / 6);
        adjustedLat = rawLat + distance * Math.sin(angle);
        adjustedLon = rawLon + distance * Math.cos(angle);
      }

      placedPoints.push({ lat: adjustedLat, lon: adjustedLon });
      return [adjustedLat, adjustedLon];
    };

    // 1. Farmer's Farm Marker (Placed ONLY if farmer has explicit verified coordinates)
    if (hasFarmCoords) {
      const [farmLat, farmLon] = getDeconflictedCoords(farmerLocation.lat, farmerLocation.lon);

      const farmIcon = L.divIcon({
        className: 'custom-farm-icon',
        html: `
          <div style="background:#256E3A; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 10px rgba(37,110,58,0.5);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([farmLat, farmLon], { icon: farmIcon, zIndexOffset: 1500 })
        .addTo(map)
        .bindPopup(`<b>${isTe ? 'మీ పొలం లొకేషన్' : 'Your Farm Location'}</b><br/><span style="font-size:11px; color:#4A6052;">${farmerLocation.name || (isTe ? 'రైతు పొలం' : 'Farmer Farm')}</span>`);

      // 5km Early Warning Perimeter Circle
      L.circle([farmLat, farmLon], {
        color: '#256E3A',
        fillColor: '#256E3A',
        fillOpacity: 0.08,
        radius: 5000,
        weight: 1.5,
        dashArray: '4, 6',
      })
        .addTo(map)
        .bindPopup(isTe ? '5 కి.మీ ముందస్తు హెచ్చరిక పరిధి' : '5 km Outbreak Warning Perimeter');
    }

    // 2. Disease Outbreak Markers (Centroid Coordinates)
    visibleReports.forEach((rep) => {
      if (!Number.isFinite(rep.latitude) || !Number.isFinite(rep.longitude)) return;

      const [repLat, repLon] = getDeconflictedCoords(rep.latitude, rep.longitude);
      const isSelected = selectedOutbreakId ? rep.id === selectedOutbreakId : false;
      const isSevere = rep.severity === 'severe';
      const color = isSevere ? '#DC2626' : '#D97706';
      const catSymbol = rep.diseaseCategory === 'viral' ? 'V' : rep.diseaseCategory === 'fungal' ? 'F' : 'P';

      const highlightRing = isSelected
        ? 'border: 3px solid #F59E0B; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.5), 0 0 16px rgba(220, 38, 38, 0.8); transform: scale(1.15);'
        : 'border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.25);';

      const reportIcon = L.divIcon({
        className: `custom-disease-icon ${isSelected ? 'highlighted-outbreak' : ''}`,
        html: `
          <div style="background:${color}; color:#fff; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; cursor:pointer; transition:all 0.2s ease-in-out; ${highlightRing}">
            ${catSymbol}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([repLat, repLon], {
        icon: reportIcon,
        zIndexOffset: isSelected ? 2500 : 1000,
      }).addTo(map);

      marker.on('click', () => {
        setSelectedReport(rep);
      });

      marker.bindPopup(`
        <div style="min-width:200px; font-family:sans-serif;">
          <b style="color:${color}; font-size:13px;">${rep.diseaseName}</b><br/>
          <span style="font-size:11px; color:#4A6052;">${rep.crop} · ${rep.generalizedLocation}</span><br/>
          <span style="font-size:10px; color:#5C6F64; display:block; margin-top:2px;">
            🕒 ${rep.timestamp ? new Date(rep.timestamp).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent Outbreak'}
          </span>
          <span style="font-size:10px; font-weight:600; color:#256E3A; display:block; margin-top:2px;">
            AI-assisted, not field-confirmed
          </span>
          ${isSelected ? '<span style="display:inline-block; margin-top:4px; padding:1px 6px; border-radius:4px; background:#FEF3C7; color:#92400E; font-size:10px; font-weight:bold;">★ Selected Alert</span>' : ''}
        </div>
      `);

      markerMapRef.current.set(rep.id, marker);

      if (isSelected) {
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    });

    mapInstanceRef.current = map;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSymptoms.trim()) return;

    setIsSubmitting(true);
    try {
      const finalLat =
        locationSource === 'gps'
          ? gpsCoords.lat
          : parseFloat(manualLat) || farmerLocation.lat;
      const finalLon =
        locationSource === 'gps'
          ? gpsCoords.lon
          : parseFloat(manualLon) || farmerLocation.lon;

      await onReportOutbreak({
        crop: formCrop,
        diseaseName: formDisease || 'Suspected Infestation',
        diseaseCategory: formCategory,
        symptoms: formSymptoms,
        generalizedLocation: `${formSector} (~2 km centroid)`,
        latitude: finalLat,
        longitude: finalLon,
        aiMatchScore: 0.85,
        isAiAssisted: true,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('map');
      }, 1000);
    } catch (err) {
      console.error('Error reporting outbreak:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Community disease radar"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-4xl bg-white border border-[#E2E8D8] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-[#EAEFE2] bg-[#F8FAF5]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#256E3A]/10 text-[#256E3A] border border-[#256E3A]/20 shrink-0">
              <Radar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-[#14281D] truncate">
                {isTe ? 'కమ్యూనిటీ డిసీజ్ రాడార్' : 'Community Disease Radar'}
              </h2>
              <p className="text-[10px] sm:text-xs text-[#5C6F64] hidden sm:block truncate">
                {isTe ? 'పరిసర ప్రాంతాల AI తెగుళ్ల నిఘా వ్యవస్థ' : 'AI-assisted community pest & disease intelligence'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Tab switch */}
            <div className="flex bg-[#F3F6EF] p-0.5 sm:p-1 rounded-xl border border-[#D9E2CE]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('map');
                  setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
                }}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-white text-[#14281D] shadow-xs'
                    : 'text-[#5C6F64] hover:text-[#14281D]'
                }`}
              >
                {isTe ? 'మ్యాప్' : 'Radar Map'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-white text-[#14281D] shadow-xs'
                    : 'text-[#5C6F64] hover:text-[#14281D]'
                }`}
              >
                {isTe ? 'తెగులు నమోదు' : 'Report Outbreak'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-[#5C6F64] hover:text-[#14281D] hover:bg-[#EAEFE2] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mandatory AI-Assisted Notice Banner */}
        <div className="px-3.5 sm:px-6 py-2 bg-[#F6FAF1] border-b border-[#DCE8D1] flex items-center justify-between text-[11px] sm:text-xs text-[#4A6052]">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-[#256E3A] shrink-0" />
            <span className="font-semibold text-[#14281D] truncate">
              {isTe
                ? 'అన్ని నివేదికలు AI-ఆధారిత పరిశీలనలు'
                : 'All alerts are AI-assisted detections and not field-confirmed.'}
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-[#5C6F64] hidden sm:inline shrink-0">
            {isTe ? 'గోప్యత కోసం ~2 కి.మీ సెంట్రాయిడ్' : 'Centroid jittered ~2 km for privacy'}
          </span>
        </div>

        {/* Body content */}
        {activeTab === 'map' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Mobile Segmented Toggle (Map vs List) */}
            <div className="md:hidden flex items-center justify-center p-2 bg-[#F4F7F0] border-b border-[#EAEFE2] shrink-0">
              <div className="inline-flex bg-white p-1 rounded-xl border border-[#D9E2CE] shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setMobileViewMode('map');
                    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 120);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mobileViewMode === 'map'
                      ? 'bg-[#256E3A] text-white shadow-xs'
                      : 'text-[#4A6052] hover:text-[#14281D]'
                  }`}
                >
                  🗺️ {isTe ? 'మ్యాప్' : 'Map View'}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('list')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mobileViewMode === 'list'
                      ? 'bg-[#256E3A] text-white shadow-xs'
                      : 'text-[#4A6052] hover:text-[#14281D]'
                  }`}
                >
                  📋 {isTe ? `జాబితా (${visibleReports.length})` : `Outbreaks (${visibleReports.length})`}
                </button>
              </div>
            </div>

            {/* Map Area */}
            <div className={`flex-1 relative min-h-[260px] ${mobileViewMode === 'map' ? 'block' : 'hidden md:block'}`}>
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Floating Bottom Card on Map View when an Outbreak is Selected */}
              {selectedReport && (
                <div className="absolute bottom-3 left-3 right-3 z-[1000] p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#256E3A]/40 shadow-xl space-y-1.5 text-xs text-[#14281D] animate-in fade-in slide-in-from-bottom-2 max-w-lg mx-auto">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-extrabold text-[#14281D] text-sm block">{selectedReport.diseaseName}</span>
                      <span className="text-xs font-semibold text-[#256E3A]">{selectedReport.crop}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(null)}
                      className="p-1 rounded-lg text-[#5C6F64] hover:text-[#14281D] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#4A6052] leading-relaxed line-clamp-2">{selectedReport.symptoms}</p>
                  <div className="pt-1.5 border-t border-[#EAEFE2] flex items-center justify-between text-[10px] text-[#5C6F64]">
                    <span>📍 {selectedReport.generalizedLocation}</span>
                    <span className="font-bold text-[#256E3A]">
                      AI Match: {((selectedReport.aiMatchScore || 0.85) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Outbreaks List & Details Sidebar */}
            <div className={`w-full md:w-80 border-t md:border-t-0 md:border-l border-[#EAEFE2] bg-[#F8FAF5] p-3.5 sm:p-4 overflow-y-auto space-y-3 ${mobileViewMode === 'list' ? 'block flex-1' : 'hidden md:block'}`}>
              {/* Farmer location status banner */}
              <div className="px-3 py-2 rounded-xl bg-white border border-[#E2E8D8] text-[11px] flex items-center justify-between text-[#4A6052]">
                <span className="font-bold flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#256E3A] shrink-0" />
                  <span className="truncate">
                    {hasFarmCoords
                      ? (farmerLocation.name || (isTe ? 'మీ పొలం' : 'Your Farm'))
                      : (isTe ? 'లొకేషన్ అందుబాటులో లేదు' : 'Location unavailable')}
                  </span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  hasFarmCoords
                    ? 'bg-[#256E3A]/10 text-[#256E3A]'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {hasFarmCoords
                    ? (isTe ? 'ధృవీకరించబడింది' : 'GPS Active')
                    : (isTe ? 'అందుబాటులో లేదు' : 'Unavailable')}
                </span>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A6052]">
                {isTe ? `పరిసర ప్రాంతాల తెగుళ్లు (${visibleReports.length})` : `Nearby Outbreak Alerts (${visibleReports.length})`}
              </h3>

              {/* Selected report card if clicked */}
              {selectedReport && (
                <div className="p-3.5 rounded-xl bg-white border border-[#256E3A]/40 shadow-xs space-y-1.5 text-xs text-[#14281D]">
                  <div className="flex items-start justify-between">
                    <span className="font-extrabold text-[#14281D] text-sm">{selectedReport.diseaseName}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(null)}
                      className="text-[#5C6F64] hover:text-[#14281D]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-[#256E3A]">{selectedReport.crop}</p>
                  <p className="text-[11px] text-[#4A6052] leading-relaxed">{selectedReport.symptoms}</p>
                  <div className="pt-1 border-t border-[#EAEFE2] flex items-center justify-between text-[10px] text-[#5C6F64]">
                    <span>📍 {selectedReport.generalizedLocation}</span>
                    <span className="font-bold text-[#256E3A]">
                      AI Match: {((selectedReport.aiMatchScore || 0.85) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Outbreaks List */}
              <div className="space-y-2">
                {visibleReports.map((rep) => {
                  const isItemHighlighted = (selectedReport?.id === rep.id) || (selectedOutbreakId === rep.id);
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => {
                        setSelectedReport(rep);
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          setMobileViewMode('map');
                        }
                        setTimeout(() => {
                          if (mapInstanceRef.current && Number.isFinite(rep.latitude) && Number.isFinite(rep.longitude)) {
                            mapInstanceRef.current.invalidateSize();
                            mapInstanceRef.current.flyTo([rep.latitude, rep.longitude], 13);
                          }
                          const marker = markerMapRef.current.get(rep.id);
                          if (marker) {
                            marker.openPopup();
                          }
                        }, 100);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all shadow-xs cursor-pointer ${
                        isItemHighlighted
                          ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300'
                          : 'bg-white hover:bg-[#F3F6EF] border-[#D9E2CE]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-[#14281D] truncate flex-1 min-w-0">
                          {rep.diseaseName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {rep.isOwnReport ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-[#1E582E] border border-emerald-300 shrink-0">
                              {isTe ? 'మీ నివేదిక' : 'Your outbreak'}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                              {isTe ? 'సమీప నివేదిక' : 'Nearby outbreak'}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#256E3A]/10 text-[#256E3A] border border-[#256E3A]/20 shrink-0">
                            AI-assisted
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#5C6F64] mt-1">
                        <span>{rep.crop}</span>
                        <span className="tabular-nums font-mono text-[#256E3A] font-bold">
                          {rep.distanceKm ? `~${rep.distanceKm.toFixed(1)} km` : 'Near'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#5C6F64] mt-1 pt-1 border-t border-[#EAEFE2]">
                        <span className="truncate max-w-[120px]">📍 {rep.generalizedLocation}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-[#256E3A]" />
                            {rep.timestamp ? new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                          <button
                            type="button"
                            disabled={removingOutbreakId === rep.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromMyRadar(rep.id);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7E9085] hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                            title={isTe ? 'నా రాడార్ నుండి తీసివేయి' : 'Remove from my radar'}
                          >
                            <EyeOff className={`w-3 h-3 ${removingOutbreakId === rep.id ? 'animate-pulse text-amber-600' : ''}`} />
                            <span className="hidden min-[380px]:inline">
                              {removingOutbreakId === rep.id
                                ? (isTe ? 'తీసివేస్తోంది...' : 'Removing...')
                                : (isTe ? 'తీసివేయి' : 'Remove from my radar')}
                            </span>
                            <span className="min-[380px]:hidden">
                              {removingOutbreakId === rep.id
                                ? (isTe ? 'తీసివేస్తోంది...' : '...')
                                : (isTe ? 'తీసివేయి' : 'Remove')}
                            </span>
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Report Suspected Outbreak Form */
          <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-w-xl mx-auto w-full overflow-y-auto">
            <div className="p-3.5 bg-[#FFFDF5] border border-[#F3E7C4] rounded-xl text-xs text-[#4A3B00] flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#8A6100] shrink-0 mt-0.5" />
              <span>
                {isTe
                  ? 'గమనిక: రైతుల ఖచ్చితమైన పొలం కోఆర్డినేట్స్ గోప్యంగా ఉంచబడతాయి. AI గుర్తింపుల ఆధారంగా సమీప 5 కి.మీ రైతులకు ఆటోమేటిక్ అలెర్ట్ పంపబడుతుంది (AI-ఆధారిత పరిశీలన).'
                  : 'Privacy & Automated Dispatch: Exact farm coordinates are private. Reports automatically notify nearby susceptible host crops within 5 km labeled as "AI-assisted, not field-confirmed".'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A6052] mb-1">
                {isTe ? 'పంట పేరు' : 'Affected Crop'}
              </label>
              <select
                value={formCrop}
                onChange={(e) => setFormCrop(e.target.value)}
                className="w-full py-2 px-3 bg-white border border-[#D9E2CE] rounded-xl text-xs text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
              >
                <option value="Chilli (మిరప)">Chilli (మిరప)</option>
                <option value="Paddy / Rice (వరి)">Paddy / Rice (వరి)</option>
                <option value="Cotton (ప్రత్తి)">Cotton (ప్రత్తి)</option>
                <option value="Maize (మొక్కజొన్న)">Maize (మొక్కజొన్న)</option>
                <option value="Tomato (టమోటా)">Tomato (టమోటా)</option>
                <option value="Turmeric (పసుపు)">Turmeric (పసుపు)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#4A6052] mb-1">
                  {isTe ? 'అనుమానిత తెగులు పేరు' : 'Suspected Outbreak Name'}
                </label>
                <input
                  type="text"
                  value={formDisease}
                  onChange={(e) => setFormDisease(e.target.value)}
                  placeholder="e.g. Chilli Leaf Curl / Blast"
                  className="w-full py-2 px-3 bg-white border border-[#D9E2CE] rounded-xl text-xs text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A6052] mb-1">
                  {isTe ? 'వర్గం' : 'Category'}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full py-2 px-3 bg-white border border-[#D9E2CE] rounded-xl text-xs text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
                >
                  <option value="pest">Pest / పురుగు</option>
                  <option value="fungal">Fungal / శిలీంధ్ర తెగులు</option>
                  <option value="viral">Viral / వైరస్ తెగులు</option>
                  <option value="bacterial">Bacterial / బ్యాక్టీరియా</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A6052] mb-1">
                {isTe ? 'గమనించిన లక్షణాలు' : 'Observed Symptoms'}
              </label>
              <textarea
                rows={3}
                value={formSymptoms}
                onChange={(e) => setFormSymptoms(e.target.value)}
                placeholder={isTe ? 'ఆకులు ముడుచుకుపోవడం, మచ్చలు మొదలైనవి...' : 'Describe leaf curling, lesions, or insect feeding...'}
                className="w-full py-2 px-3 bg-white border border-[#D9E2CE] rounded-xl text-xs text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className="px-4 py-2 rounded-xl bg-white border border-[#D9E2CE] text-xs font-bold text-[#14281D] hover:bg-[#F3F6EF] cursor-pointer"
              >
                {isTe ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                {submitSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isTe ? 'హెచ్చరిక జారీ చేయబడింది!' : 'Alert Dispatched!'}</span>
                  </>
                ) : (
                  <span>{isTe ? 'హెచ్చరిక జారీ చేయండి' : 'Dispatch Community Alert'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
