import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Radar,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Clock,
  PlusCircle,
  Shield,
  Layers,
} from 'lucide-react';
import L from 'leaflet';
import { DiseaseReport, Language } from '../types/agricultural';

interface DiseaseRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: DiseaseReport[];
  farmerLocation: { lat: number; lon: number; name: string };
  onReportOutbreak: (newReport: Partial<DiseaseReport>) => Promise<void>;
  language: Language;
}

export const DiseaseRadarModal: React.FC<DiseaseRadarModalProps> = ({
  isOpen,
  onClose,
  reports,
  farmerLocation,
  onReportOutbreak,
  language,
}) => {
  const isTe = language === 'te';
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'report'>('map');
  const [selectedReport, setSelectedReport] = useState<DiseaseReport | null>(null);

  // Location source: GPS by default with manual override option
  const [locationSource, setLocationSource] = useState<'gps' | 'manual'>('gps');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number }>({
    lat: farmerLocation.lat,
    lon: farmerLocation.lon,
  });
  const [manualLat, setManualLat] = useState<string>(farmerLocation.lat.toString());
  const [manualLon, setManualLon] = useState<string>(farmerLocation.lon.toString());
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // New report form state
  const [formCrop, setFormCrop] = useState('Chilli (మిరప)');
  const [formDisease, setFormDisease] = useState('');
  const [formCategory, setFormCategory] = useState<'fungal' | 'bacterial' | 'viral' | 'pest'>('pest');
  const [formSymptoms, setFormSymptoms] = useState('');
  const [formSector, setFormSector] = useState('Local Farmlands (Sector 1)');
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
    };
  }, [isOpen, activeTab, reports]);

  const initMap = () => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const { lat, lon } = farmerLocation;
    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // 1. Farmer's Farm Marker
    const farmIcon = L.divIcon({
      className: 'custom-farm-icon',
      html: `
        <div style="background:#059669; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 0 15px rgba(16,185,129,0.7);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    L.marker([lat, lon], { icon: farmIcon })
      .addTo(map)
      .bindPopup(`<b>${isTe ? 'మీ వ్యవసాయ క్షేత్రం' : 'Your Farm Location'}</b><br/>${farmerLocation.name}`);

    // 2. 5km Early Warning Perimeter Circle
    L.circle([lat, lon], {
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.08,
      radius: 5000,
      weight: 1.5,
      dashArray: '4, 6',
    })
      .addTo(map)
      .bindPopup(isTe ? '5 కి.మీ ముందస్తు హెచ్చరిక పరిధి' : '5 km Outbreak Warning Perimeter');

    // 3. Disease Outbreak Markers
    reports.forEach((rep) => {
      const isSevere = rep.severity === 'severe';
      const color = isSevere ? '#ef4444' : '#f59e0b';
      const catSymbol = rep.diseaseCategory === 'viral' ? 'V' : rep.diseaseCategory === 'fungal' ? 'F' : 'P';

      const reportIcon = L.divIcon({
        className: 'custom-disease-icon',
        html: `
          <div style="background:${color}; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; font-weight:bold; font-size:12px; box-shadow:0 0 12px ${color}; cursor:pointer;">
            ${catSymbol}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([rep.latitude, rep.longitude], { icon: reportIcon }).addTo(map);

      marker.on('click', () => {
        setSelectedReport(rep);
      });

      marker.bindPopup(`
        <div style="min-width:180px;">
          <b style="color:${color};">${rep.diseaseName}</b><br/>
          <span style="font-size:11px; color:#94a3b8;">${rep.crop} · ${rep.generalizedLocation}</span><br/>
          <span style="font-size:11px; font-weight:600; color:${rep.verified ? '#10b981' : '#f59e0b'}">
            ${rep.verified ? '✓ Verified Outbreak' : '⏳ Pending Review'}
          </span>
        </div>
      `);
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
        generalizedLocation: `${formSector} (${locationSource === 'gps' ? 'GPS Verified' : 'Manual Entry'})`,
        latitude: finalLat,
        longitude: finalLon,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('map');
      }, 1500);
    } catch (err) {
      console.error(err);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Radar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{isTe ? 'కమ్యూనిటీ డిసీజ్ రాడార్' : 'Community Disease Radar'}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  5 km Alert Perimeter
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isTe
                  ? 'పరిసర పొలాల్లో గుర్తించబడిన పంట తెగుళ్ల ముందస్తు పర్యవేక్షణ'
                  : 'Geospatial agricultural outbreak monitoring & early proximity alerts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'map' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isTe ? 'మ్యాప్' : 'Live Map'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'report' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isTe ? 'తెగులు నివేదించండి' : 'Report Outbreak'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close disease radar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {activeTab === 'map' ? (
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-[460px]">
            {/* Map Canvas */}
            <div className="relative flex-1 bg-slate-950 min-h-[300px] lg:min-h-[460px]">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Map floating legend */}
              <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/80 text-[11px] space-y-1.5 shadow-lg text-slate-300">
                <span className="font-bold text-white block uppercase tracking-wider text-[10px]">
                  {isTe ? 'సూచిక' : 'Legend'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>{isTe ? 'మీ పొలం' : 'Your Farm'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>{isTe ? 'తీవ్రమైన తెగులు' : 'Severe Outbreak'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>{isTe ? 'మితమైన తెగులు' : 'Moderate Outbreak'}</span>
                </div>
              </div>
            </div>

            {/* Sidebar Outbreak List & Inspector */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/60 p-4 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {isTe ? 'సమీప నివేదికలు' : 'Nearby Outbreak Reports'} ({reports.length})
                </h3>
                <span className="text-[11px] text-emerald-400 font-mono">Radius: 30 km</span>
              </div>

              {selectedReport ? (
                <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300">{selectedReport.diseaseName}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-slate-300">{selectedReport.crop}</p>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {selectedReport.symptoms}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                    <span>{selectedReport.generalizedLocation}</span>
                    <span className="tabular-nums font-semibold text-slate-300">
                      {selectedReport.distanceKm} km away
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                {reports.map((rep) => (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => {
                      setSelectedReport(rep);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([rep.latitude, rep.longitude], 14);
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {rep.diseaseName}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          rep.verified
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-amber-950 text-amber-400'
                        }`}
                      >
                        {rep.verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{rep.crop}</span>
                      <span className="tabular-nums font-mono text-emerald-400">
                        {rep.distanceKm} km
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                      📍 {rep.generalizedLocation}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Report Suspected Outbreak Form */
          <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-w-xl mx-auto w-full">
            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {isTe
                  ? 'నిబంధన: రైతుల వ్యక్తిగత వివరాలు గోప్యంగా ఉంచబడతాయి. వ్యవసాయ అధికారి ధృవీకరించిన తర్వాత మాత్రమే పరిసర రైతులకు హెచ్చరిక జారీ చేయబడుతుంది.'
                  : 'Privacy & Verification Rule: Your exact farm coordinates are never published publicly. Reports are stored as "Pending" until verified by an agricultural extension officer to avoid panic.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {isTe ? 'పంట పేరు' : 'Affected Crop'}
              </label>
              <select
                value={formCrop}
                onChange={(e) => setFormCrop(e.target.value)}
                className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
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
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isTe ? 'అనుమానిత తెగులు పేరు' : 'Suspected Outbreak Name'}
                </label>
                <input
                  type="text"
                  value={formDisease}
                  onChange={(e) => setFormDisease(e.target.value)}
                  placeholder="e.g. Chilli Leaf Curl / Armyworm"
                  className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isTe ? 'వర్గం' : 'Category'}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="pest">Pest / పురుగు</option>
                  <option value="fungal">Fungal / శిలీంధ్ర తెగులు</option>
                  <option value="viral">Viral / వైరస్ తెగులు</option>
                  <option value="bacterial">Bacterial / బ్యాక్టీరియా</option>
                </select>
              </div>
            </div>

            {/* Location Acquisition: GPS Default with Manual Override */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">
                  {isTe ? 'లొకేషన్ మూలం' : 'Location Source'}
                </label>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLocationSource('gps')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      locationSource === 'gps'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isTe ? '📍 GPS (డిఫాల్ట్)' : '📍 GPS (Default)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationSource('manual')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      locationSource === 'manual'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isTe ? '✏️ మాన్యువల్' : '✏️ Manual'}
                  </button>
                </div>
              </div>

              {locationSource === 'gps' ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-300">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-200">
                        {isTe ? 'GPS లైవ్ లొకేషన్ లాక్ చేయబడింది (డిఫాల్ట్)' : 'GPS Live Coordinate Lock (Default)'}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">
                        {gpsCoords.lat.toFixed(4)}° N, {gpsCoords.lon.toFixed(4)}° E
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={refreshGpsLocation}
                    disabled={isDetectingGps}
                    className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-[11px] font-medium border border-emerald-500/30 cursor-pointer"
                  >
                    {isDetectingGps
                      ? (isTe ? 'గుర్తిస్తోంది...' : 'Acquiring GPS...')
                      : (isTe ? 'GPS రీఫ్రెష్' : 'Refresh GPS')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-700">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isTe ? 'అక్షాంశం (Latitude)' : 'Manual Latitude'}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      placeholder="16.3067"
                      className="w-full py-1.5 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isTe ? 'రేఖాంశం (Longitude)' : 'Manual Longitude'}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={manualLon}
                      onChange={(e) => setManualLon(e.target.value)}
                      placeholder="80.4365"
                      className="w-full py-1.5 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {isTe ? 'ప్రాంతం (సాధారణ పేరు)' : 'Generalized Sector / Block'}
              </label>
              <input
                type="text"
                value={formSector}
                onChange={(e) => setFormSector(e.target.value)}
                placeholder="e.g. Tenali Rural Sector 3"
                className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {isTe ? 'గమనించిన లక్షణాలు' : 'Observed Symptoms & Field Notes'}
              </label>
              <textarea
                rows={3}
                value={formSymptoms}
                onChange={(e) => setFormSymptoms(e.target.value)}
                placeholder={
                  isTe
                    ? 'ఆకులు ముడుచుకోవడం, రంగు మారడం లేదా పురుగులు కనిపించడం వంటి వివరాలు...'
                    : 'Describe leaf curl, spots, stem damage, or pest presence...'
                }
                className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {submitSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {isTe
                    ? 'నివేదిక నమోదు చేయబడింది! వ్యవసాయ అధికారి ధృవీకరణ కోసం పంపబడింది.'
                    : 'Outbreak report recorded! Sent for agricultural officer verification.'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {isTe ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formSymptoms.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting
                  ? isTe
                    ? 'నమోదు అవుతోంది...'
                    : 'Submitting...'
                  : isTe
                  ? 'నివేదిక పంపండి'
                  : 'Submit Outbreak Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
