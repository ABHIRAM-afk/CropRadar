import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  MapPin,
  Sprout,
  Check,
  Compass,
  Shield,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
} from 'lucide-react';
import { FarmerProfile, Language } from '../types/agricultural';
import { signInWithGoogle, signOutUser } from '../lib/supabaseClient';

interface FarmProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FarmerProfile;
  onSaveProfile: (profile: FarmerProfile) => void | Promise<void>;
  language: Language;
  onSignOut?: () => void;
}

export const FarmProfileModal: React.FC<FarmProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  language,
  onSignOut,
}) => {
  if (!isOpen) return null;
  const isTe = language === 'te';

  const [name, setName] = useState(profile.name);
  const [farmLocation, setFarmLocation] = useState(profile.farmLocation);
  const [primaryCrop, setPrimaryCrop] = useState(profile.primaryCrop || 'Chilli (మిరప)');
  const [latitude, setLatitude] = useState(profile.latitude);
  const [longitude, setLongitude] = useState(profile.longitude);
  const [hasExplicitLocation, setHasExplicitLocation] = useState(profile.hasExplicitLocation ?? false);
  const [locationSource, setLocationSource] = useState<'none' | 'sector_centroid' | 'gps'>(profile.locationSource ?? 'none');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(profile.name);
    setFarmLocation(profile.farmLocation);
    setPrimaryCrop(profile.primaryCrop || 'Chilli (మిరప)');
    setLatitude(profile.latitude);
    setLongitude(profile.longitude);
    setHasExplicitLocation(profile.hasExplicitLocation ?? false);
    setLocationSource(profile.locationSource ?? 'none');
    setGpsMessage(null);
  }, [isOpen, profile]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      const message = String(error?.message || 'Google sign-in could not start.');
      setAuthError(message.toLowerCase().includes('unsupported provider')
        ? 'Google sign-in is disabled in Supabase. Enable the Google provider and add its OAuth Client ID and Secret.'
        : message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOutClick = async () => {
    await signOutUser();
    if (onSignOut) {
      onSignOut();
    }
    onClose();
  };

  const predefinedZones = [
    { name: 'Prathipadu Agricultural Sector (Centroid)', lat: 16.315, lon: 80.442 },
    { name: 'Guntur Rural South Sector (Centroid)', lat: 16.292, lon: 80.428 },
    { name: 'Pedakakani Agricultural Belt (Centroid)', lat: 16.328, lon: 80.461 },
    { name: 'Tenali Rural Basin (Centroid)', lat: 16.485, lon: 80.612 },
    { name: 'Warangal Cotton & Chilli Hub (Centroid)', lat: 17.968, lon: 79.594 },
    { name: 'Khammam Maize & Chilli Cluster (Centroid)', lat: 17.247, lon: 80.151 },
    { name: 'Kurnool Groundnut & Cotton Zone (Centroid)', lat: 15.828, lon: 78.037 },
    { name: 'Nizamabad Turmeric & Paddy Belt (Centroid)', lat: 18.672, lon: 78.094 },
  ];

  const handleSelectZone = (zone: (typeof predefinedZones)[0]) => {
    setFarmLocation(zone.name);
    setLatitude(zone.lat);
    setLongitude(zone.lon);
    setHasExplicitLocation(true);
    setLocationSource('sector_centroid');
    setGpsMessage({
      type: 'info',
      text: isTe
        ? `ప్రాంతీయ సెంట్రాయిడ్ ఎంచుకోబడింది: ${zone.name}`
        : `Selected regional centroid: ${zone.name}`,
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage({
        type: 'error',
        text: isTe
          ? 'మీ బ్రౌజర్‌లో GPS సదుపాయం లేదు. దయచేసి క్రింద లొకేషన్ వివరాలను నమోదు చేయండి.'
          : 'Geolocation is not supported by your browser. Please enter or select location manually.',
      });
      return;
    }

    setIsDetectingGps(true);
    setGpsMessage(null);

    // Standard accuracy avoids hardware GPS timeouts on laptops/desktops
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        setLatitude(lat);
        setLongitude(lon);
        setFarmLocation(`GPS Farm Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
        setHasExplicitLocation(true);
        setLocationSource('gps');
        setGpsMessage({
          type: 'success',
          text: isTe
            ? `✓ వాస్తవ GPS కోఆర్డినేట్స్ విజయవంతంగా గుర్తించబడ్డాయి (${lat}, ${lon})`
            : `✓ Actual GPS coordinates acquired successfully: (${lat}, ${lon})`,
        });
      },
      (err) => {
        setIsDetectingGps(false);
        console.warn('Geolocation error:', err);
        let errorText = '';
        if (err.code === 1) {
          errorText = isTe
            ? 'లొకేషన్ అనుమతి నిరాకరించబడింది. బ్రౌజర్‌లో అనుమతించండి లేదా క్రింద మీ మండలాన్ని ఎంచుకోండి.'
            : 'Location permission was denied. Please allow permission or select/enter your location manually below.';
        } else if (err.code === 2) {
          errorText = isTe
            ? 'GPS లొకేషన్ సిగ్నల్ అందుబాటులో లేదు. దయచేసి క్రింద మీ వ్యవసాయ ప్రాంతాన్ని ఎంచుకోండి.'
            : 'GPS location unavailable from device/network. Please select your agricultural zone below.';
        } else if (err.code === 3) {
          errorText = isTe
            ? 'GPS సమయం ముగిసింది. దయచేసి మళ్లీ ప్రయత్నించండి లేదా క్రింద మీ మండలాన్ని ఎంచుకోండి.'
            : 'GPS lookup timed out. Please try again or select your zone manually below.';
        } else {
          errorText = isTe
            ? 'GPS గుర్తించడంలో లోపం ఏర్పడింది. దయచేసి లొకేషన్ మాన్యువల్‌గా నమోదు చేయండి.'
            : 'GPS lookup failed. Please enter or select your farm location manually below.';
        }

        setGpsMessage({ type: 'error', text: errorText });
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 30000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveProfile({
      ...profile,
      name,
      farmLocation,
      primaryCrop,
      latitude,
      longitude,
      hasExplicitLocation,
      locationSource,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Farmer profile and farm settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white border border-[#E2E8D8] rounded-3xl overflow-hidden shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EAEFE2] bg-[#F8FAF5]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#256E3A]/10 text-[#256E3A] border border-[#256E3A]/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#14281D]">
                {isTe ? 'రైతు ప్రొఫైల్ & లొకేషన్ వివరాలు' : 'Farmer Profile & Location'}
              </h2>
              <p className="text-xs text-[#5C6F64]">
                {isTe ? 'సమీప కమ్యూనిటీ తెగుళ్ల హెచ్చరికల కోసం' : 'Opt-in for nearby community outbreak alerts'}
              </p>
            </div>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-[#14281D]">
          {/* 1. Account / Supabase Auth Status */}
          <div className="p-3.5 rounded-2xl bg-[#F6FAF1] border border-[#DCE8D1] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6052] block">
                {isTe ? 'ఖాతా స్థితి' : 'Account Status'}
              </span>
              <p className="text-xs font-bold text-[#14281D]">
                {profile.email
                  ? `${profile.email} (Google Account)`
                  : isTe ? 'అతిథి రైతు సెషన్ (Guest Session)' : 'Guest Farmer Session'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!profile.email ? (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#CBD9BE] hover:bg-[#F3F6EF] text-[#14281D] font-bold text-xs shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#256E3A]" />
                  <span>{isSigningIn ? (isTe ? 'వేచి ఉండండి...' : 'Starting…') : isTe ? 'గూగుల్ లింక్' : 'Link Google'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignOutClick}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs shadow-xs cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isTe ? 'లాగౌట్' : 'Sign Out'}</span>
                </button>
              )}
            </div>
          </div>
          {authError && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-700">
              {authError}
            </p>
          )}

          {/* 2. Farmer Name */}
          <div>
            <label className="block text-xs font-bold text-[#4A6052] mb-1">
              {isTe ? 'రైతు పేరు' : 'Farmer Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9E2CE] rounded-xl text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
              placeholder={isTe ? 'మీ పేరు రాయండి' : 'Enter your name'}
            />
          </div>

          {/* 3. Primary Crop Cycle */}
          <div>
            <label className="block text-xs font-bold text-[#4A6052] mb-1">
              {isTe ? 'ప్రస్తుత పంట' : 'Active Primary Crop'}
            </label>
            <select
              value={primaryCrop}
              onChange={(e) => setPrimaryCrop(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9E2CE] rounded-xl text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
            >
              <option value="Paddy / Rice (వరి)">Paddy / Rice (వరి)</option>
              <option value="Tomato (టమోటా)">Tomato (టమోటా)</option>
              <option value="Chilli (మిరప)">Chilli (మిరప)</option>
              <option value="Cotton (ప్రత్తి)">Cotton (ప్రత్తి)</option>
              <option value="Maize (మొక్కజొన్న)">Maize (మొక్కజొన్న)</option>
              <option value="Groundnut (వేరుశనగ)">Groundnut (వేరుశనగ)</option>
              <option value="Turmeric (పసుపు)">Turmeric (పసుపు)</option>
              <option value="Pulses / Red Gram (కందులు)">Pulses / Red Gram (కందులు)</option>
            </select>
          </div>

          {/* 4. Robust GPS & Location Selection */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#FBFDF9] border border-[#EAEFE2]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#14281D] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#256E3A]" />
                <span>{isTe ? 'పొలం లొకేషన్ & అలర్ట్ పరిధి' : 'Farm Location (Actual / Sector)'}</span>
              </label>

              {/* GPS Detection Button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isDetectingGps}
                className="flex items-center gap-1 text-[11px] font-bold text-[#256E3A] hover:bg-[#256E3A]/10 px-2 py-1 rounded-lg border border-[#256E3A]/20 cursor-pointer disabled:opacity-60"
              >
                {isDetectingGps ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#256E3A]" />
                ) : (
                  <Compass className="w-3.5 h-3.5" />
                )}
                <span>
                  {isDetectingGps
                    ? isTe ? 'GPS గుర్తిస్తోంది...' : 'Detecting GPS...'
                    : isTe ? 'GPS ద్వారా గుర్తించు' : 'Detect via GPS'}
                </span>
              </button>
            </div>

            {/* GPS Feedback Message */}
            {gpsMessage && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                  gpsMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : gpsMessage.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                }`}
              >
                {gpsMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <p className="leading-relaxed font-medium">{gpsMessage.text}</p>
              </div>
            )}

            {/* Manual Location Name Input */}
            <div>
              <label className="block text-[11px] font-semibold text-[#5C6F64] mb-1">
                {isTe ? 'గ్రామం / మండలం / ప్రాంతం పేరు (మాన్యువల్):' : 'Village / Mandal / Area Name (Manual):'}
              </label>
              <input
                type="text"
                value={farmLocation}
                onChange={(e) => {
                  setFarmLocation(e.target.value);
                  setHasExplicitLocation(true);
                  if (locationSource === 'none') setLocationSource('sector_centroid');
                }}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#D9E2CE] rounded-xl text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
                placeholder={isTe ? 'ఉదా: ప్రత్తిపాడు, గుంటూరు జిల్లా' : 'e.g. Prathipadu, Guntur District'}
              />
            </div>

            {/* Quick Sector Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-[#5C6F64] mb-1">
                {isTe ? 'లేదా సమీప వ్యవసాయ సెక్టార్ ఎంచుకోండి:' : 'Or pick an agricultural zone centroid:'}
              </label>
              <select
                onChange={(e) => {
                  const zone = predefinedZones.find((z) => z.name === e.target.value);
                  if (zone) handleSelectZone(zone);
                }}
                value={predefinedZones.some((z) => z.name === farmLocation) ? farmLocation : ''}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#D9E2CE] rounded-xl text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
              >
                <option value="">{isTe ? '-- సెక్టార్ ఎంపిక చేసుకోండి --' : '-- Choose a nearby agricultural zone --'}</option>
                {predefinedZones.map((z, idx) => (
                  <option key={idx} value={z.name}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Coordinate inputs */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-[#7E9085]">
                  Latitude (అక్షాంశం)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(parseFloat(e.target.value) || 0);
                    setHasExplicitLocation(true);
                  }}
                  className="w-full px-2.5 py-1 text-xs bg-white border border-[#D9E2CE] rounded-lg text-[#14281D]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#7E9085]">
                  Longitude (రేఖాంశం)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(parseFloat(e.target.value) || 0);
                    setHasExplicitLocation(true);
                  }}
                  className="w-full px-2.5 py-1 text-xs bg-white border border-[#D9E2CE] rounded-lg text-[#14281D]"
                />
              </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="flex items-start gap-1.5 text-[10px] text-[#4A6052] pt-1">
              <Shield className="w-3.5 h-3.5 text-[#256E3A] shrink-0 mt-0.5" />
              <span>
                {isTe
                  ? 'మీ ఖచ్చితమైన పొలం కోఆర్డినేట్స్ ఎవరికీ కనిపించవు. కమ్యూనిటీ రాడార్‌లో ~2 కి.మీ సెంట్రాయిడ్ మాత్రమే చూపబడుతుంది.'
                  : 'Exact farm coordinates are strictly shielded for privacy; only ~2 km generalized centroids are used for community alerts.'}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-[#D9E2CE] text-xs font-bold text-[#14281D] hover:bg-[#F3F6EF] cursor-pointer"
            >
              {isTe ? 'రద్దు' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-extrabold shadow-sm hover:shadow-md cursor-pointer transition-all"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime-300" />
                  <span>{isTe ? 'భద్రపరచబడింది!' : 'Saved!'}</span>
                </>
              ) : (
                <span>{isTe ? 'వివరాలు భద్రపరచు' : 'Save Farm Settings'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
