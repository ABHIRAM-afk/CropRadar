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
}) => {
  const isTe = language === 'te';

  const sprayStatus = weatherData?.evaluation.status || 'optimal';
  const sprayBg =
    sprayStatus === 'optimal'
      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
      : sprayStatus === 'caution'
      ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
      : 'bg-rose-950/60 text-rose-300 border-rose-800/60';

  const sprayIcon =
    sprayStatus === 'optimal' ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    ) : sprayStatus === 'caution' ? (
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
    ) : (
      <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
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
    <header className="sticky top-0 z-30 w-full bg-[#080D1B]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <Radar className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                CROP RADAR <span className="text-emerald-400 font-extrabold text-sm sm:text-base">AI</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isTe ? 'పంట ఆరోగ్యం & రక్షణ పర్యావరణ వ్యవస్థ' : 'Predictive Agricultural Ecosystem'}
            </p>
          </div>
        </div>

        {/* Center: Compact Spray Weather Summary Pill */}
        {weatherData && (
          <button
            type="button"
            onClick={onOpenWeather}
            aria-label="View detailed weather and spray window"
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:brightness-110 cursor-pointer ${sprayBg}`}
          >
            <CloudSun className="w-4 h-4" />
            <span className="font-semibold tabular-nums text-slate-200">
              {weatherData.weather.temperatureC}°C
            </span>
            <span className="text-slate-500">·</span>
            <span className="flex items-center gap-1">
              {sprayIcon}
              <span>{sprayLabel}</span>
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 text-[11px]">
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
              className={`md:hidden flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium ${sprayBg}`}
            >
              <CloudSun className="w-3.5 h-3.5" />
              <span className="tabular-nums font-semibold">{weatherData.weather.temperatureC}°C</span>
            </button>
          )}

          {/* Disease Radar Button */}
          <button
            type="button"
            onClick={onOpenRadar}
            title={isTe ? 'కమ్యూనిటీ డిసీజ్ రాడార్ మ్యాప్' : 'Community Disease Radar'}
            aria-label="Community Disease Radar"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <Radar className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">{isTe ? 'డిసీజ్ రాడార్' : 'Disease Radar'}</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          </button>

          {/* Field Diary Button */}
          <button
            type="button"
            onClick={onOpenDiary}
            title={isTe ? 'పంట డైరీ' : 'Field Diary'}
            aria-label="Field Diary"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="hidden lg:inline">{isTe ? 'ఫీల్డ్ డైరీ' : 'Field Diary'}</span>
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            onClick={onOpenNotifications}
            title={isTe ? 'పరిసర తెగుళ్ల హెచ్చరికలు' : 'Outbreak Alerts'}
            aria-label="Outbreak notifications"
            className="relative p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white tabular-nums">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={`Switch language to ${isTe ? 'English' : 'Telugu'}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isTe ? 'తెలుగు' : 'EN'}</span>
          </button>

          {/* User / Farm Profile */}
          <button
            type="button"
            onClick={onOpenProfile}
            title={isTe ? 'రైతు ప్రొఫైల్' : 'Farmer Profile'}
            aria-label="Farmer profile"
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <User className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>
    </header>
  );
};
