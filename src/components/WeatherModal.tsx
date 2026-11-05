import React from 'react';
import {
  X,
  CloudSun,
  Wind,
  Droplets,
  CloudRain,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Compass,
} from 'lucide-react';
import { WeatherData, Language } from '../types/agricultural';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WeatherData | null;
  language: Language;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({
  isOpen,
  onClose,
  data,
  language,
}) => {
  if (!isOpen || !data) return null;

  const isTe = language === 'te';
  const { weather, evaluation, forecast } = data;

  const statusBg =
    evaluation.status === 'optimal'
      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
      : evaluation.status === 'caution'
      ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
      : 'bg-rose-950/70 border-rose-500/50 text-rose-300';

  const statusTitle =
    evaluation.status === 'optimal'
      ? isTe
        ? 'పిచికారీకి అత్యంత అనుకూలమైన వాతావరణం'
        : 'Optimal Weather Window for Spraying'
      : evaluation.status === 'caution'
      ? isTe
        ? 'పిచికారీ సమయంలో జాగ్రత్త అవసరం'
        : 'Marginal Spraying Conditions — Exercise Caution'
      : isTe
      ? 'పిచికారీ చేయవద్దు (అనుకూలం కాదు)'
      : 'Unfavorable Conditions — Spraying Not Recommended';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detailed spray weather intelligence"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {isTe ? 'వ్యవసాయ వాతావరణ సమాచారం & స్ప్రే విండో' : 'Agro-Weather & Spray Advisory'}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>{data.location}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close weather advisory"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main Spray Suitability Verdict Banner */}
          <div className={`p-4 rounded-xl border ${statusBg}`}>
            <div className="flex items-start gap-3">
              {evaluation.status === 'optimal' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : evaluation.status === 'caution' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="text-sm font-bold">{statusTitle}</h3>
                <ul className="mt-1.5 space-y-1 text-xs">
                  {(isTe ? evaluation.reasonsTe : evaluation.reasons).map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Current Micro-Weather Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>{isTe ? 'ఉష్ణోగ్రత' : 'Temperature'}</span>
              </div>
              <span className="text-xl font-bold text-white tabular-nums">
                {weather.temperatureC}°C
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {weather.temperatureC > 32
                  ? isTe
                    ? 'ఆవిరయ్యే ప్రమాదం'
                    : 'Evaporation risk'
                  : isTe
                  ? 'సరైన పరిధి'
                  : 'Favorable'}
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isTe ? 'గాలి వేగం' : 'Wind Speed'}</span>
              </div>
              <span className="text-xl font-bold text-white tabular-nums">
                {weather.windSpeedKmH} <span className="text-xs font-normal">km/h</span>
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {isTe ? 'డ్రిఫ్ట్ ప్రమాదం:' : 'Drift risk:'}{' '}
                <span className="capitalize font-semibold text-slate-300">
                  {evaluation.driftRisk}
                </span>
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span>{isTe ? 'గాలిలో తేమ' : 'Humidity'}</span>
              </div>
              <span className="text-xl font-bold text-white tabular-nums">
                {weather.humidityPercent}%
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {weather.humidityPercent > 80
                  ? isTe
                    ? 'శిలీంధ్రాలు పెరిగే అవకాశం'
                    : 'High fungal risk'
                  : isTe
                  ? 'సమతుల్యం'
                  : 'Balanced'}
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                <CloudRain className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isTe ? 'వర్షం అవకాశం' : 'Rain Chance'}</span>
              </div>
              <span className="text-xl font-bold text-white tabular-nums">
                {weather.rainProbabilityPercent}%
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {isTe ? 'వాష్-ఆఫ్:' : 'Wash-off:'}{' '}
                <span className="capitalize font-semibold text-slate-300">
                  {evaluation.rainfastRisk}
                </span>
              </span>
            </div>
          </div>

          {/* Optimal Spray Hours Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>{isTe ? 'సిఫార్సు చేయబడిన పిచికారీ వేళలు' : 'Optimal Spray Windows Today'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-300 block">
                    {isTe ? 'ఉదయం సమయం (Morning)' : 'Morning Window'}
                  </span>
                  <span className="text-slate-400 text-[11px]">06:00 AM – 09:30 AM</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded font-medium">
                  {isTe ? 'అత్యుత్తమం' : 'Best'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-300 block">
                    {isTe ? 'సాయంత్రం సమయం (Evening)' : 'Late Afternoon Window'}
                  </span>
                  <span className="text-slate-400 text-[11px]">04:00 PM – 06:30 PM</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded font-medium">
                  {isTe ? 'అనుకూలం' : 'Good'}
                </span>
              </div>
            </div>
          </div>

          {/* 4-Day Spray Planning Forecast Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              {isTe ? 'రాబోయే 4 రోజుల స్ప్రే ప్రణాళిక' : '4-Day Agricultural Outlook'}
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">{isTe ? 'రోజు' : 'Day'}</th>
                    <th className="py-2.5 px-3">{isTe ? 'ఉష్ణోగ్రత' : 'Temp'}</th>
                    <th className="py-2.5 px-3">{isTe ? 'తేమ' : 'Humidity'}</th>
                    <th className="py-2.5 px-3">{isTe ? 'గాలి' : 'Wind'}</th>
                    <th className="py-2.5 px-3">{isTe ? 'వర్షం' : 'Rain'}</th>
                    <th className="py-2.5 px-3 text-right">{isTe ? 'అనుకూలత' : 'Spray Suitability'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {forecast.map((f, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{f.day}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.temp}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.humidity}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.wind}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.rainProb}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            f.sprayWindow === 'optimal'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : f.sprayWindow === 'caution'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {f.sprayWindow === 'optimal'
                            ? isTe
                              ? 'అనుకూలం'
                              : 'Optimal'
                            : f.sprayWindow === 'caution'
                            ? isTe
                              ? 'జాగ్రత్త'
                              : 'Caution'
                            : isTe
                            ? 'వద్దు'
                            : 'Unsafe'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400">
          <span>{isTe ? 'మూలం:' : 'Source:'} {data.source}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
          >
            {isTe ? 'ముగించు' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
