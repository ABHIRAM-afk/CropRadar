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
      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
      : evaluation.status === 'caution'
      ? 'bg-amber-50 border-amber-300 text-amber-950'
      : 'bg-rose-50 border-rose-300 text-rose-950';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white border border-[#E2E8D8] rounded-3xl overflow-hidden shadow-2xl my-8 text-[#14281D]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEFE2] bg-[#F8FAF5]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#256E3A]/10 text-[#256E3A] border border-[#256E3A]/20">
              <CloudSun className="w-5 h-5 text-[#256E3A]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#14281D]">
                {isTe ? 'వ్యవసాయ వాతావరణ సమాచారం & స్ప్రే విండో' : 'Agro-Weather & Spray Advisory'}
              </h2>
              <p className="text-xs text-[#5C6F64] flex items-center gap-1.5 mt-0.5">
                <Compass className="w-3.5 h-3.5 text-[#256E3A]" />
                <span>{data.location}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close weather advisory"
            className="p-1.5 rounded-lg text-[#5C6F64] hover:text-[#14281D] hover:bg-[#EAEFE2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main Spray Suitability Verdict Banner */}
          <div className={`p-4 rounded-2xl border ${statusBg}`}>
            <div className="flex items-start gap-3">
              {evaluation.status === 'optimal' ? (
                <ShieldCheck className="w-5 h-5 text-[#256E3A] shrink-0 mt-0.5" />
              ) : evaluation.status === 'caution' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="text-sm font-extrabold">{statusTitle}</h3>
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
            <div className="p-3 bg-[#F8FAF5] border border-[#E2E8D8] rounded-2xl shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-[#5C6F64] text-xs mb-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                <span>{isTe ? 'ఉష్ణోగ్రత' : 'Temperature'}</span>
              </div>
              <span className="text-xl font-black text-[#14281D] tabular-nums">
                {weather.temperatureC}°C
              </span>
              <span className="text-[11px] text-[#7E9085] block mt-0.5 font-medium">
                {weather.temperatureC > 32
                  ? isTe
                    ? 'ఆవిరయ్యే ప్రమాదం'
                    : 'Evaporation risk'
                  : isTe
                  ? 'సరైన పరిధి'
                  : 'Favorable'}
              </span>
            </div>

            <div className="p-3 bg-[#F8FAF5] border border-[#E2E8D8] rounded-2xl shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-[#5C6F64] text-xs mb-1">
                <Wind className="w-3.5 h-3.5 text-cyan-600" />
                <span>{isTe ? 'గాలి వేగం' : 'Wind Speed'}</span>
              </div>
              <span className="text-xl font-black text-[#14281D] tabular-nums">
                {weather.windSpeedKmH} <span className="text-xs font-normal">km/h</span>
              </span>
              <span className="text-[11px] text-[#7E9085] block mt-0.5 font-medium">
                {isTe ? 'డ్రిఫ్ట్ ప్రమాదం:' : 'Drift risk:'}{' '}
                <span className="capitalize font-semibold text-[#14281D]">
                  {evaluation.driftRisk}
                </span>
              </span>
            </div>

            <div className="p-3 bg-[#F8FAF5] border border-[#E2E8D8] rounded-2xl shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-[#5C6F64] text-xs mb-1">
                <Droplets className="w-3.5 h-3.5 text-blue-600" />
                <span>{isTe ? 'గాలిలో తేమ' : 'Humidity'}</span>
              </div>
              <span className="text-xl font-black text-[#14281D] tabular-nums">
                {weather.humidityPercent}%
              </span>
              <span className="text-[11px] text-[#7E9085] block mt-0.5 font-medium">
                {weather.humidityPercent > 80
                  ? isTe
                    ? 'శిలీంధ్రాలు పెరిగే అవకాశం'
                    : 'High fungal risk'
                  : isTe
                  ? 'సమతుల్యం'
                  : 'Balanced'}
              </span>
            </div>

            <div className="p-3 bg-[#F8FAF5] border border-[#E2E8D8] rounded-2xl shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-[#5C6F64] text-xs mb-1">
                <CloudRain className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isTe ? 'వర్షం అవకాశం' : 'Rain Chance'}</span>
              </div>
              <span className="text-xl font-black text-[#14281D] tabular-nums">
                {weather.rainProbabilityPercent}%
              </span>
              <span className="text-[11px] text-[#7E9085] block mt-0.5 font-medium">
                {isTe ? 'వాష్-ఆఫ్:' : 'Wash-off:'}{' '}
                <span className="capitalize font-semibold text-[#14281D]">
                  {evaluation.rainfastRisk}
                </span>
              </span>
            </div>
          </div>

          {/* Optimal Spray Hours Card */}
          <div className="bg-[#F8FAF5] border border-[#E2E8D8] rounded-2xl p-4 shadow-2xs">
            <h4 className="text-xs font-bold text-[#14281D] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Clock className="w-4 h-4 text-[#256E3A]" />
              <span>{isTe ? 'సిఫార్సు చేయబడిన పిచికారీ వేళలు' : 'Optimal Spray Windows Today'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white border border-[#E2E8D8] flex items-center justify-between shadow-2xs">
                <div>
                  <span className="font-bold text-[#14281D] block">
                    {isTe ? 'ఉదయం సమయం (Morning)' : 'Morning Window'}
                  </span>
                  <span className="text-[#5C6F64] text-[11px]">06:00 AM – 09:30 AM</span>
                </div>
                <span className="text-[11px] px-2.5 py-1 bg-[#256E3A]/10 text-[#256E3A] border border-[#256E3A]/20 rounded-lg font-bold">
                  {isTe ? 'అత్యుత్తమం' : 'Best'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E2E8D8] flex items-center justify-between shadow-2xs">
                <div>
                  <span className="font-bold text-[#14281D] block">
                    {isTe ? 'సాయంత్రం సమయం (Evening)' : 'Late Afternoon Window'}
                  </span>
                  <span className="text-[#5C6F64] text-[11px]">04:00 PM – 06:30 PM</span>
                </div>
                <span className="text-[11px] px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-bold">
                  {isTe ? 'అనుకూలం' : 'Good'}
                </span>
              </div>
            </div>
          </div>

          {/* 4-Day Spray Planning Forecast Table */}
          <div>
            <h4 className="text-xs font-bold text-[#4A6052] uppercase tracking-wider mb-2.5">
              {isTe ? 'రాబోయే 4 రోజుల స్ప్రే ప్రణాళిక' : '4-Day Agricultural Outlook'}
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-[#E2E8D8] bg-white shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F4F7F0] text-[#5C6F64] border-b border-[#EAEFE2]">
                  <tr>
                    <th className="py-2.5 px-3">{isTe ? 'రోజు' : 'Day'}</th>
                    <th className="py-2.5 px-3">{isTe ? 'ఉష్ణోగ్రత' : 'Temp'}</th>
                    <th className="py-2.5 px-3">{isTe ? 'తేమ' : 'Humidity'}</th>
                    <th className="py-2.5 px-3">{isTe ? 'గాలి' : 'Wind'}</th>
                    <th className="py-2.5 px-3">{isTe ? 'వర్షం' : 'Rain'}</th>
                    <th className="py-2.5 px-3 text-right">{isTe ? 'అనుకూలత' : 'Spray Suitability'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEFE2]">
                  {forecast.map((f, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAF5] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#14281D]">{f.day}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.temp}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.humidity}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.wind}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.rainProb}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            f.sprayWindow === 'optimal'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : f.sprayWindow === 'caution'
                              ? 'bg-amber-50 text-amber-800 border border-amber-300'
                              : 'bg-rose-50 text-rose-800 border border-rose-300'
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
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#EAEFE2] bg-[#F8FAF5] text-xs text-[#5C6F64]">
          <span>{isTe ? 'మూలం:' : 'Source:'} {data.source}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-[#F3F6EF] border border-[#D9E2CE] text-[#14281D] font-bold cursor-pointer shadow-2xs transition-colors"
          >
            {isTe ? 'ముగించు' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
