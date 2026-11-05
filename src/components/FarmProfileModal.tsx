import React, { useState } from 'react';
import { X, User, MapPin, Sprout, Check, Compass } from 'lucide-react';
import { FarmerProfile, Language } from '../types/agricultural';

interface FarmProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FarmerProfile;
  onSaveProfile: (profile: FarmerProfile) => void;
  language: Language;
}

export const FarmProfileModal: React.FC<FarmProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  language,
}) => {
  if (!isOpen) return null;
  const isTe = language === 'te';

  const [name, setName] = useState(profile.name);
  const [farmLocation, setFarmLocation] = useState(profile.farmLocation);
  const [primaryCrop, setPrimaryCrop] = useState(profile.primaryCrop);
  const [acreage, setAcreage] = useState(profile.acreage);
  const [latitude, setLatitude] = useState(profile.latitude);
  const [longitude, setLongitude] = useState(profile.longitude);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const predefinedZones = [
    { name: 'Guntur Chilli Belt, Andhra Pradesh', lat: 16.3067, lon: 80.4365 },
    { name: 'Warangal Cotton & Chilli Hub, Telangana', lat: 17.9689, lon: 79.5941 },
    { name: 'Krishna Delta Paddy Plains, AP', lat: 16.216, lon: 80.95 },
    { name: 'Khammam Maize & Chilli Sector', lat: 17.2473, lon: 80.1514 },
    { name: 'Kurnool Groundnut & Cotton Belt', lat: 15.8281, lon: 78.0373 },
  ];

  const handleSelectZone = (zone: (typeof predefinedZones)[0]) => {
    setFarmLocation(zone.name);
    setLatitude(zone.lat);
    setLongitude(zone.lon);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(4)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(4)));
        setFarmLocation(`GPS Farm Location (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Could not retrieve GPS coordinates. Please select a farm zone.');
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...profile,
      name,
      farmLocation,
      primaryCrop,
      acreage: Number(acreage) || 5,
      latitude,
      longitude,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Farmer profile and farm settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {isTe ? 'రైతు ప్రొఫైల్ & పొలం వివరాలు' : 'Farmer Profile & Farm Settings'}
              </h2>
              <p className="text-xs text-slate-400">
                {isTe ? 'ఖచ్చితమైన వాతావరణం మరియు పరిసర హెచ్చరికల కోసం' : 'Configure location for accurate weather & outbreak radar'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              {isTe ? 'రైతు పేరు' : 'Farmer Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                {isTe ? 'ప్రధాన పంట' : 'Primary Crop'}
              </label>
              <select
                value={primaryCrop}
                onChange={(e) => setPrimaryCrop(e.target.value)}
                className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="Chilli (మిరప)">Chilli (మిరప)</option>
                <option value="Paddy / Rice (వరి)">Paddy / Rice (వరి)</option>
                <option value="Cotton (ప్రత్తి)">Cotton (ప్రత్తి)</option>
                <option value="Maize (మొక్కజొన్న)">Maize (మొక్కజొన్న)</option>
                <option value="Tomato (టమోటా)">Tomato (టమోటా)</option>
                <option value="Turmeric (పసుపు)">Turmeric (పసుపు)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                {isTe ? 'పొలం విస్తీర్ణం (ఎకరాలు)' : 'Land Area (Acres)'}
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={acreage}
                onChange={(e) => setAcreage(parseFloat(e.target.value) || 1)}
                className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 tabular-nums focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Farm Location Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-slate-300">
                {isTe ? 'పొలం ఉన్న ప్రాంతం' : 'Farm Location & Agro-Climatic Zone'}
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Compass className="w-3 h-3" />
                <span>{isTe ? 'GPS స్థానం వాడండి' : 'Detect GPS'}</span>
              </button>
            </div>
            <input
              type="text"
              value={farmLocation}
              onChange={(e) => setFarmLocation(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:border-emerald-500 focus:outline-none mb-2"
            />

            <span className="text-[11px] text-slate-400 block mb-1.5">
              {isTe ? 'త్వరిత వ్యవసాయ జోన్లు:' : 'Quick Agro Zones:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {predefinedZones.map((z, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectZone(z)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition-colors cursor-pointer"
                >
                  {z.name.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Coordinates display */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Coordinates (Geohash Index):</span>
            <span className="font-mono text-emerald-400">
              {latitude}° N, {longitude}° E
            </span>
          </div>

          {savedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isTe ? 'వివరాలు నవీకరించబడ్డాయి!' : 'Profile and location updated successfully!'}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {isTe ? 'రద్దు' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md cursor-pointer"
            >
              {isTe ? 'భద్రపరచు' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
