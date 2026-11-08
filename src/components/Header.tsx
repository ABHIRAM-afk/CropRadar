import React from 'react';
import {
  Radar,
  CloudSun,
  BookOpen,
  Bell,
  User,
  Globe,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Sprout,
} from 'lucide-react';
import { Language, WeatherData } from '../types/agricultural';

interface HeaderProps {
  language: Language;
  onToggleLanguage: () => void;
  weatherData: WeatherData | null;
  onOpenWeather: () => void;
  onOpenRadar: () => void;
  onOpenDiary: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  unreadAlertsCount: number;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onToggleLanguage,
  weatherData,
  onOpenWeather,
  onOpenRadar,
  onOpenDiary,
  onOpenNotifications,
  onOpenProfile,
  unreadAlertsCount,
  onToggleSidebar,
}) => {
  const isTe = language === 'te';

  const sprayStatus = weatherData?.evaluation.status || 'optimal';
  const sprayBg =
    sprayStatus === 'optimal'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
      : sprayStatus === 'caution'
      ? 'bg-amber-50 text-amber-800 border-amber-300'
      : 'bg-rose-50 text-rose-800 border-rose-300';

  const sprayIcon =
    sprayStatus === 'optimal' ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
    ) : sprayStatus === 'caution' ? (
      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
    ) : (
      <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
    );

  const sprayLabel =
    sprayStatus === 'optimal'
      ? isTe
        ? 'పిచికారీకి అనుకూలం'
        : 'Optimal to Spray'
      : sprayStatus === 'caution'
      ? isTe
        ? 'జాగ్రత్త అవసరం'
        : 'Spray with Caution'
      : isTe
      ? 'పిచికారీ వద్దు'
      : 'Unsafe to Spray';

  return (
    <header className="sticky top-0 z-30 w-full bg-[#F8FAF5]/95 backdrop-blur-md border-b border-[#E2E8D8] px-4 lg:px-8 py-3 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Toggle crop sidebar"
              className="md:hidden p-1.5 rounded-xl bg-white border border-[#D9E2CE] text-[#14281D] hover:bg-[#F3F6EF] shadow-xs cursor-pointer"
            >
              <Sprout className="w-4 h-4 text-[#256E3A]" />
            </button>
          )}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#256E3A]/15 to-[#65A30D]/20 border border-[#256E3A]/30 text-[#256E3A] shadow-xs">
            <Radar className="w-5 h-5 text-[#256E3A]" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#65A30D]"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#14281D] flex items-center gap-1.5">
                CropRadar <span className="text-[#256E3A] font-black text-xs sm:text-sm px-1.5 py-0.5 rounded bg-[#256E3A]/10 border border-[#256E3A]/20">AI</span>
              </h1>
            </div>
            <p className="text-[11px] text-[#4A6052] font-medium hidden sm:block">
              {isTe ? 'పంట ఆరోగ్యం & కమ్యూనిటీ రాడార్' : 'Intelligent Crop Pathology & Community Radar'}
            </p>
          </div>
        </div>

        {/* Center: Compact Spray Weather Summary Pill */}
        {weatherData && (
          <button
            type="button"
            onClick={onOpenWeather}
            aria-label="View detailed weather and spray window"
            className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all hover:shadow-xs cursor-pointer ${sprayBg}`}
          >
            <CloudSun className="w-4 h-4" />
            <span className="tabular-nums font-bold">
              {weatherData.weather.temperatureC}°C
            </span>
            <span className="opacity-50">·</span>
            <span className="flex items-center gap-1">
              {sprayIcon}
              <span>{sprayLabel}</span>
            </span>
            <span className="opacity-50">·</span>
            <span className="text-[11px] font-medium opacity-90">
              {isTe ? 'గాలి:' : 'Wind:'} {weatherData.weather.windSpeedKmH} km/h
            </span>
          </button>
        )}

        {/* Right Tools: Radar, Diary, Notifications, Profile, Language */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Weather Pill */}
          {weatherData && (
            <button
              type="button"
              onClick={onOpenWeather}
              aria-label="Weather summary"
              className={`md:hidden flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${sprayBg}`}
            >
              <CloudSun className="w-3.5 h-3.5" />
              <span className="tabular-nums">{weatherData.weather.temperatureC}°C</span>
            </button>
          )}

          {/* Disease Radar Button */}
          <button
            type="button"
            onClick={onOpenRadar}
            title={isTe ? 'కమ్యూనిటీ డిసీజ్ రాడార్ మ్యాప్' : 'Community Disease Radar'}
            aria-label="Community Disease Radar"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3F6EF] border border-[#D9E2CE] text-[#14281D] text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Radar className="w-4 h-4 text-[#256E3A]" />
            <span className="hidden sm:inline">{isTe ? 'డిసీజ్ రాడార్' : 'Disease Radar'}</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#65A30D]"></span>
          </button>

          {/* Field Diary Button */}
          <button
            type="button"
            onClick={onOpenDiary}
            title={isTe ? 'ఫీల్డ్ డైరీ' : 'Field Diary'}
            aria-label="Field Diary"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3F6EF] border border-[#D9E2CE] text-[#14281D] text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#256E3A]" />
            <span className="hidden lg:inline">{isTe ? 'ఫీల్డ్ డైరీ' : 'Field Diary'}</span>
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            onClick={onOpenNotifications}
            title={isTe ? 'పరిసర తెగుళ్ల హెచ్చరికలు' : 'Outbreak Alerts'}
            aria-label="Outbreak notifications"
            className="relative p-2 rounded-xl bg-white hover:bg-[#F3F6EF] border border-[#D9E2CE] text-[#14281D] transition-all shadow-xs cursor-pointer"
          >
            <Bell className="w-4 h-4 text-[#14281D]" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white tabular-nums shadow-xs">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={`Switch language to ${isTe ? 'English' : 'Telugu'}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#256E3A]/10 hover:bg-[#256E3A]/20 border border-[#256E3A]/30 text-[#256E3A] text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isTe ? 'English' : 'తెలుగు'}</span>
          </button>

          {/* User / Farm Profile */}
          <button
            type="button"
            onClick={onOpenProfile}
            title={isTe ? 'రైతు ప్రొఫైల్' : 'Farmer Profile'}
            aria-label="Farmer profile"
            className="p-2 rounded-xl bg-white hover:bg-[#F3F6EF] border border-[#D9E2CE] text-[#14281D] transition-all shadow-xs cursor-pointer"
          >
            <User className="w-4 h-4 text-[#14281D]" />
          </button>
        </div>
      </div>
    </header>
  );
};
