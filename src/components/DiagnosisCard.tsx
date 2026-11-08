import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  BookmarkPlus,
  CloudSun,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Calendar,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { DiagnosisDetails, Language } from '../types/agricultural';
import { playAgriculturalSpeech, stopAgriculturalSpeech } from '../utils/audioSpeech';

interface DiagnosisCardProps {
  data: DiagnosisDetails;
  language: Language;
  onSaveToDiary: () => void;
  onCheckWeather: () => void;
  isSaved?: boolean;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({
  data,
  language,
  onSaveToDiary,
  onCheckWeather,
  isSaved = false,
}) => {
  const isTe = language === 'te';
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const matchScore = data.diagnosisOrProduct.aiMatchScore ?? 0.85;
  const isEligibleForAlert = matchScore > 0.70;

  // Determine clear scannable Risk Level
  const isHighRisk = matchScore > 0.80 || data.diagnosisOrProduct.category === 'viral';
  const isModerateRisk = !isHighRisk && (matchScore > 0.60 || data.diagnosisOrProduct.category === 'fungal' || data.diagnosisOrProduct.category === 'bacterial');

  const riskLabelEn = isHighRisk ? 'High Risk' : isModerateRisk ? 'Moderate Risk' : 'Low / Manageable';
  const riskLabelTe = isHighRisk ? 'తీవ్రమైన రిస్క్' : isModerateRisk ? 'మధ్యస్థ రిస్క్' : 'తక్కువ రిస్క్';
  const riskBadgeStyle = isHighRisk
    ? 'bg-rose-50 border-rose-300 text-rose-950 font-black'
    : isModerateRisk
    ? 'bg-amber-50 border-amber-300 text-amber-950 font-black'
    : 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black';

  const speakSummary = () => {
    if (isPlayingAudio) {
      stopAgriculturalSpeech();
      setIsPlayingAudio(false);
      return;
    }

    const textToSpeak = isTe
      ? data.spokenSummaryTe || data.diagnosisOrProduct.titleTe
      : data.spokenSummaryEn || data.diagnosisOrProduct.titleEn;

    playAgriculturalSpeech(
      textToSpeak,
      language,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  return (
    <div className="w-full bg-white border border-[#E2E8D8] rounded-3xl p-5 sm:p-6 text-[#14281D] shadow-sm space-y-5 transition-all">
      {/* 1. Top Section: Crop Header, Audio Button & Risk Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-[#EAEFE2]">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#256E3A] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTe ? 'AI పంట ఆరోగ్య విశ్లేషణ' : 'AI Crop Pathology Analysis'}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#14281D] flex items-center gap-2">
            <span>{isTe ? data.crop.nameTe : data.crop.nameEn}</span>
            <span className="text-xs font-semibold text-[#5C6F64]">
              ({data.crop.plantPart})
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Speech Output */}
          <button
            type="button"
            onClick={speakSummary}
            title={isTe ? 'సారాంశం వినండి' : 'Listen to audio explanation'}
            aria-label="Listen to audio explanation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#256E3A]/10 hover:bg-[#256E3A]/20 border border-[#256E3A]/30 text-[#256E3A] text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            {isPlayingAudio ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#256E3A]" />
            )}
            <span>{isPlayingAudio ? (isTe ? 'ఆపండి' : 'Stop') : isTe ? 'వినండి' : 'Listen'}</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Pathology Diagnosis Banner with Scannable Risk Level */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAF5] border border-[#DCE8D1] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6052] block">
              {isTe ? 'అనుమానిత తెగులు / వ్యాధి' : 'Suspected Condition'}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-[#14281D] tracking-tight">
              {isTe ? data.diagnosisOrProduct.titleTe : data.diagnosisOrProduct.titleEn}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Risk Level Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs border ${riskBadgeStyle} shadow-2xs`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isTe ? riskLabelTe : riskLabelEn}</span>
            </div>

            {/* AI Visual Match Score Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-white border border-[#CBD9BE] text-[#256E3A] shadow-2xs">
              <span>{isTe ? 'స్కోర్:' : 'Match:'}</span>
              <span className="tabular-nums font-black">{(matchScore * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Mandatory AI-Assisted Notice */}
        <div className="pt-2 border-t border-[#EAEFE2] flex items-center justify-between text-xs text-[#5C6F64]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#65A30D]"></span>
            <span className="font-semibold text-[#14281D]">
              {isTe
                ? 'AI-ఆధారిత పరిశీలన · క్షేత్రస్థాయిలో ధృవీకరించబడలేదు'
                : 'AI-assisted, not field-confirmed'}
            </span>
          </div>
          <span className="text-[11px] text-[#7E9085]">
            {isEligibleForAlert
              ? (isTe ? '✓ కమ్యూనిటీ అలెర్ట్ అర్హత (>70%)' : '✓ Alert-eligible pattern (>0.700)')
              : (isTe ? 'పరిమితి లోపు (≤70%)' : 'Sub-threshold match (≤0.700)')}
          </span>
        </div>
      </div>

      {/* 3. Observed Field Symptoms */}
      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#374B3F]">
          {isTe ? 'గుర్తించిన వ్యాధి లక్షణాలు' : 'Key Visual Observations'}
        </h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#14281D]">
          {(isTe ? data.observationsTe : data.observationsEn).map((obs, i) => (
            <li key={i} className="flex items-start gap-2 bg-[#F8FAF5] p-3 rounded-xl border border-[#EAEFE2]">
              <span className="text-[#256E3A] font-bold text-sm leading-none">•</span>
              <span className="font-medium">{obs}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4. University Extension-Verified Non-Chemical Precautions (ANGRAU / ICAR) */}
      {data.extensionPrecautions && data.extensionPrecautions.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF5] border border-[#F3E7C4] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#8A6100]">
              <ShieldCheck className="w-4 h-4 text-[#8A6100]" />
              <span>{isTe ? 'అధికారిక నివారణ సూచనలు (ANGRAU / ICAR)' : 'University Extension Precautions (Non-Chemical)'}</span>
            </div>
            {data.extensionPrecautions[0]?.reviewDate && (
              <span className="text-[10px] text-[#8A6100]/80 font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {isTe ? 'సమీక్ష:' : 'Reviewed:'} {data.extensionPrecautions[0].reviewDate}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {data.extensionPrecautions.map((prec, i) => (
              <div key={i} className="text-xs text-[#3E2F00] bg-white p-3 rounded-xl border border-[#EEDB9F] shadow-2xs space-y-1.5">
                <p className="font-semibold leading-relaxed">
                  {isTe ? prec.actionTe : prec.actionEn}
                </p>
                <div className="flex items-center justify-between text-[10px] text-[#8A6100]/90 pt-1 border-t border-[#F3E7C4]">
                  <span>{prec.sourceAuthority}</span>
                  {prec.sourceUrl && (
                    <a
                      href={prec.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[#256E3A] hover:underline font-bold"
                    >
                      <span>{isTe ? 'అధికారిక మూలం' : 'Official Citation'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Immediate Sustainable Next Actions (IPM) */}
      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#374B3F]">
          {isTe ? 'వెంటనే చేపట్టవలసిన తదుపరి చర్యలు (IPM)' : 'Immediate Management Steps (IPM)'}
        </h4>
        <div className="space-y-2 text-xs text-[#14281D]">
          {(isTe ? data.immediateActionsTe : data.immediateActionsEn).map((act, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-[#F8FAF5] p-3 rounded-xl border border-[#DCE8D1]">
              <CheckCircle2 className="w-4 h-4 text-[#256E3A] shrink-0 mt-0.5" />
              <span className="font-semibold">{act}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Action Footer: Save to Diary & Check Weather */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-[#EAEFE2]">
        <button
          type="button"
          onClick={onCheckWeather}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F3F6EF] border border-[#D9E2CE] text-[#14281D] text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <CloudSun className="w-4 h-4 text-[#256E3A]" />
          <span>{isTe ? 'స్ప్రే వాతావరణం పరిశీలించు' : 'Check Spray Weather'}</span>
        </button>

        <button
          type="button"
          onClick={onSaveToDiary}
          disabled={isSaved}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer ${
            isSaved
              ? 'bg-[#EAEFE2] text-[#5C6F64] border border-[#D9E2CE]'
              : 'bg-[#256E3A] hover:bg-[#1E582E] text-white'
          }`}
        >
          <BookmarkPlus className="w-4 h-4" />
          <span>
            {isSaved
              ? isTe ? 'డైరీలో భద్రపరచబడింది' : 'Saved to Field Diary'
              : isTe ? 'ఫీల్డ్ డైరీలో భద్రపరచు' : 'Save to Field Diary'}
          </span>
        </button>
      </div>
    </div>
  );
};
