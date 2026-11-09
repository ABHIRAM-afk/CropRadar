import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  Sprout,
  ShieldAlert,
  Check,
} from 'lucide-react';
import { CropMismatchInfo, CropCycle, Language } from '../types/agricultural';

interface CropMismatchCardProps {
  mismatchInfo: CropMismatchInfo;
  activeCycleName: string;
  existingMatchingCycle?: CropCycle;
  language: Language;
  onSwitchToExisting: (cycleId: string) => void;
  onStartNewCrop: (detectedEn: string, detectedTe: string) => void;
  onContinueCurrent: () => void;
}

export const CropMismatchCard: React.FC<CropMismatchCardProps> = ({
  mismatchInfo,
  activeCycleName,
  existingMatchingCycle,
  language,
  onSwitchToExisting,
  onStartNewCrop,
  onContinueCurrent,
}) => {
  const isTe = language === 'te';

  const detectedEn = mismatchInfo.detectedCropEn || 'Other Crop';
  const detectedTe = mismatchInfo.detectedCropTe || detectedEn;

  return (
    <div
      role="alert"
      aria-label="Crop Mismatch Warning"
      className="w-full bg-[#FFFDF5] border-2 border-amber-300 rounded-3xl p-3.5 sm:p-6 text-[#14281D] shadow-md space-y-3.5 sm:space-y-4 my-2 transition-all"
    >
      {/* 1. Header Banner */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-extrabold uppercase tracking-wider bg-amber-200/80 text-amber-950 border border-amber-300 mb-1">
            <span>{isTe ? '⚠️ పంట తేడా గుర్తించబడింది' : '⚠️ Crop Mismatch Detected'}</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#14281D] tracking-tight">
            {isTe
              ? `ఈ చిత్రం "${detectedTe}" పంటగా కనిపిస్తోంది`
              : `This photo appears to show ${detectedEn}`}
          </h3>
          <p className="text-xs text-[#4A6052] mt-0.5 leading-relaxed font-medium">
            {isTe
              ? mismatchInfo.explanationTe || `మీ ప్రస్తుత సంభాషణ ${activeCycleName} కోసం ఉంది. పంటల మధ్య సలహాలు, పురుగుమందులు మరియు నివారణ చర్యలు మారతాయి కాబట్టి సరైన పంటలోనే సేవ్ చేయడం మంచిది.`
              : mismatchInfo.explanationEn || `Your active conversation is set to ${activeCycleName}. Precautions, chemical dosages, and alerts differ across crops—keeping them separate prevents wrong advice.`}
          </p>
        </div>
      </div>

      {/* 2. Visual Comparison Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E9085] flex items-center gap-1">
            <Sprout className="w-3.5 h-3.5 text-amber-600" />
            <span>{isTe ? 'చిత్రంలో గుర్తించిన పంట' : 'Detected In Photo'}</span>
          </span>
          <p className="text-sm font-extrabold text-[#14281D]">
            {isTe ? `${detectedTe} (${detectedEn})` : `${detectedEn} (${detectedTe})`}
          </p>
          <span className="text-[11px] text-[#256E3A] font-semibold block">
            {isTe ? '✓ సంబంధిత శాస్త్రీయ సలహాలు సిద్ధంగా ఉన్నాయి' : '✓ Tailored pathology & IPM ready'}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E2E8D8] shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E9085] flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[#5C6F64]" />
            <span>{isTe ? 'ప్రస్తుత యాక్టివ్ సంభాషణ' : 'Current Active Thread'}</span>
          </span>
          <p className="text-sm font-extrabold text-[#14281D]">
            {activeCycleName}
          </p>
          <span className="text-[11px] text-amber-800 font-semibold block">
            {isTe ? '⚠️ ఇక్కడ సేవ్ చేస్తే చరిత్ర కలుస్తుంది' : '⚠️ History & precautions would mix'}
          </span>
        </div>
      </div>

      {/* 3. Action Guidance Prompt */}
      <div className="p-3 rounded-2xl bg-amber-100/60 border border-amber-200/80 text-xs text-amber-950 font-medium leading-relaxed">
        {isTe
          ? `మీరు ఈ విశ్లేషణను "${detectedTe}" పంట ప్రత్యేక సంభాషణలో భద్రపరచాలనుకుంటున్నారా, లేదా "${activeCycleName}" లోనే విశ్లేషించమంటారా?`
          : `Would you like to file this diagnosis under a dedicated ${detectedEn} conversation, or continue analyzing under ${activeCycleName} anyway?`}
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 pt-2">
        {existingMatchingCycle ? (
          <button
            type="button"
            onClick={() => onSwitchToExisting(existingMatchingCycle.id)}
            className="w-full sm:flex-1 min-h-[42px] flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-2xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>
              {isTe
                ? `ఉన్న "${existingMatchingCycle.cropNameTe || existingMatchingCycle.cropNameEn}" సంభాషణకు మారండి`
                : `Switch to ${existingMatchingCycle.cropNameEn} Conversation`}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStartNewCrop(detectedEn, detectedTe)}
            className="w-full sm:flex-1 min-h-[42px] flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-2xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {isTe
                ? `కొత్త "${detectedTe}" సంభాషణను ప్రారంభించి సేవ్ చేయండి`
                : `Start New ${detectedEn} Conversation & Save`}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onContinueCurrent}
          className="w-full sm:w-auto min-h-[42px] px-4 py-2.5 sm:py-3 rounded-2xl bg-white hover:bg-slate-50 border border-[#CBD9BE] text-xs font-bold text-[#4A6052] hover:text-[#14281D] transition-colors cursor-pointer text-center"
        >
          {isTe
            ? `కాదు, ${activeCycleName} గానే ఇక్కడ విశ్లేషించండి`
            : `Analyze as ${activeCycleName} anyway`}
        </button>
      </div>
    </div>
  );
};

