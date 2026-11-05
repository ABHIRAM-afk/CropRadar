import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  BookmarkPlus,
  CloudSun,
  ShieldCheck,
  HelpCircle,
  Sparkles,
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

  const confidenceBadge =
    data.diagnosisOrProduct.confidenceLevel === 'High'
      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80'
      : data.diagnosisOrProduct.confidenceLevel === 'Moderate'
      ? 'text-amber-400 bg-amber-950/60 border-amber-800/80'
      : 'text-slate-400 bg-slate-800 border-slate-700';

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
    <div className="w-full bg-[#10182A] border border-slate-800 rounded-2xl p-4 sm:p-5 text-slate-200 shadow-xl space-y-4">
      {/* 1. Header: Crop & Confidence Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTe ? 'పంట వ్యాధి నిర్ధారణ' : 'AI Crop Pathology Analysis'}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>{isTe ? data.crop.nameTe : data.crop.nameEn}</span>
            <span className="text-xs font-normal text-slate-400">
              ({data.crop.plantPart})
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Confidence Badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium border ${confidenceBadge}`}
          >
            {isTe ? 'ఖచ్చితత్వం:' : 'Confidence:'}{' '}
            {data.diagnosisOrProduct.confidenceLevel}
          </span>

          {/* Voice Output (Speech Synthesis) */}
          <button
            type="button"
            onClick={speakSummary}
            title={isTe ? 'సారాంశం వినండి' : 'Listen to audio explanation'}
            aria-label="Listen to audio explanation"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
          >
            {isPlayingAudio ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isPlayingAudio ? (isTe ? 'ఆపండి' : 'Stop') : isTe ? 'వినండి' : 'Listen'}</span>
          </button>
        </div>
      </div>

      {/* 2. Suspected Condition */}
      <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
              {isTe ? 'అనుమానిత తెగులు / సమస్య' : 'Suspected Condition'}
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-rose-300 mt-0.5">
              {isTe ? data.diagnosisOrProduct.titleTe : data.diagnosisOrProduct.titleEn}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {isTe
                ? data.diagnosisOrProduct.confidenceNoteTe
                : data.diagnosisOrProduct.confidenceNoteEn}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Supporting Visual Observations */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {isTe ? 'గమనించిన లక్షణాలు (Symptoms)' : 'Supporting Visual Observations'}
        </h4>
        <ul className="space-y-1.5 text-xs text-slate-300">
          {(isTe ? data.observationsTe : data.observationsEn).map((obs, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span>{obs}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Action Protocol: Immediate vs Preventive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* Immediate Steps */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
          <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{isTe ? 'తక్షణ చర్యలు (Immediate Actions)' : 'Immediate Actions'}</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {(isTe ? data.immediateActionsTe : data.immediateActionsEn).map((act, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-400 shrink-0 font-bold">›</span>
                <span>{act}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Preventive Measures */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
          <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isTe ? 'ముందస్తు నివారణ (Preventive IPM)' : 'Preventive IPM Measures'}</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {(isTe ? data.preventiveMeasuresTe : data.preventiveMeasuresEn).map((prev, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-emerald-400 shrink-0 font-bold">›</span>
                <span>{prev}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Expert Verification Advisory Note */}
      {data.requiresExpertVerification && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {isTe
              ? 'గమనిక: ఈ AI నిర్ధారణ ప్రాథమిక సూచన మాత్రమే. సందేహం ఉంటే స్థానిక వ్యవసాయ అధికారి లేదా KVK శాస్త్రవేత్తను సంప్రదించండి.'
              : 'Advisory Note: AI image analysis is preliminary. Confirm with a qualified agricultural officer or KVK extension agent before large-scale application.'}
          </span>
        </div>
      )}

      {/* 5. Quick Actions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveToDiary}
            disabled={isSaved}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isSaved
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isSaved
                ? isTe
                  ? 'డైరీలో భద్రపరచబడింది'
                  : 'Saved to Diary'
                : isTe
                ? 'ఫీల్డ్ డైరీలో భద్రపరచు'
                : 'Save to Field Diary'}
            </span>
          </button>

          <button
            type="button"
            onClick={onCheckWeather}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <CloudSun className="w-3.5 h-3.5 text-amber-400" />
            <span>{isTe ? 'స్ప్రే వాతావరణం చూడండి' : 'Check Spray Weather'}</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500">
          Crop Radar PathoEngine
        </span>
      </div>
    </div>
  );
};
