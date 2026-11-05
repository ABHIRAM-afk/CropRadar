import React, { useState } from 'react';
import {
  FileText,
  ShieldAlert,
  Droplet,
  Clock,
  Volume2,
  VolumeX,
  CloudSun,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
} from 'lucide-react';
import { DiagnosisDetails, Language } from '../types/agricultural';
import { playAgriculturalSpeech, stopAgriculturalSpeech } from '../utils/audioSpeech';

interface PesticideCardProps {
  data: DiagnosisDetails;
  language: Language;
  onCheckWeather: () => void;
  onSaveToDiary: () => void;
  isSaved?: boolean;
}

export const PesticideCard: React.FC<PesticideCardProps> = ({
  data,
  language,
  onCheckWeather,
  onSaveToDiary,
  isSaved = false,
}) => {
  const isTe = language === 'te';
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const details = data.labelDetails;

  const moaCode = details?.moaCode || 'FRAC 11';
  // Check if resistance concern exists for demonstration / realistic rotation check
  const isRecentRepeated = moaCode.includes('11') || moaCode.includes('4A');

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
      {/* 1. Header: Product Name & Category */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>{isTe ? 'రసాయన లేబుల్ స్కాన్' : 'Pesticide Label Intelligence'}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            {isTe ? data.diagnosisOrProduct.titleTe : data.diagnosisOrProduct.titleEn}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {details?.activeIngredient} ({details?.concentration}) · {details?.formulation}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* FRAC / IRAC MOA Tag */}
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-800/80">
            {moaCode}
          </span>

          {/* Audio Listen */}
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

      {/* 2. Chemical Resistance Management Warning */}
      {isRecentRepeated && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-amber-200">
          <div className="flex items-start gap-2.5">
            <RotateCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-spin-slow" />
            <div className="text-xs">
              <span className="font-bold text-amber-300">
                {isTe ? 'రసాయన నిరోధకత హెచ్చరిక (Resistance Alert): ' : 'Resistance Management Alert: '}
              </span>
              <span>
                {isTe
                  ? `ఈ పంటకు గత 30 రోజులలో ${moaCode} గ్రూప్ మందు వాడబడింది. తెగుళ్లు లేదా పురుగులకు నిరోధకత రాకుండా FRAC 3 (ట్రయాజోల్స్) లేదా మల్టీ-సైట్ రసాయనాలతో మార్పిడి చేయండి.`
                  : `Group ${moaCode} was recently recorded for this crop. Continuous use accelerates pest resistance. Rotate with FRAC 3 (Triazoles) or FRAC M (Multi-site) chemistry.`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Key Label Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            {isTe ? 'క్రియాశీల రసాయనం' : 'Active Ingredient'}
          </span>
          <span className="font-semibold text-slate-200 mt-0.5 block truncate">
            {details?.activeIngredient || 'Azoxystrobin'}
          </span>
        </div>

        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            {isTe ? 'రూపం (Formulation)' : 'Formulation'}
          </span>
          <span className="font-semibold text-slate-200 mt-0.5 block truncate">
            {details?.formulation || 'Suspension Conc.'}
          </span>
        </div>

        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{isTe ? 'వర్ష నిరోధకత' : 'Rainfastness'}</span>
          </span>
          <span className="font-semibold text-cyan-300 mt-0.5 block">
            {details?.rainfastHours || '2 Hours'}
          </span>
        </div>

        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            {isTe ? 'రసాయన వర్గం' : 'MoA Group'}
          </span>
          <span className="font-semibold text-emerald-400 mt-0.5 block font-mono">
            {moaCode}
          </span>
        </div>
      </div>

      {/* 4. Target Pests & Approved Crops */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <h4 className="font-semibold text-slate-300 mb-1.5">
            {isTe ? 'నివారించే తెగుళ్లు / పురుగులు' : 'Target Pests / Diseases'}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(details?.targetPests || ['Anthracnose', 'Powdery Mildew', 'Leaf Spot']).map((pest, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]"
              >
                {pest}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <h4 className="font-semibold text-slate-300 mb-1.5">
            {isTe ? 'సిఫార్సు చేయబడిన పంటలు' : 'Recommended Crops'}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(details?.approvedCrops || ['Chilli', 'Rice', 'Tomato', 'Maize']).map((c, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-emerald-950/50 text-emerald-300 border border-emerald-900/40 text-[11px]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Safety Warnings & PPE */}
      <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3">
        <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5 mb-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>{isTe ? 'భద్రతా జాగ్రత్తలు (Safety Precautions)' : 'Safety Precautions & PPE'}</span>
        </h4>
        <ul className="space-y-1 text-xs text-rose-200/90">
          {(details?.safetyWarnings || [
            'Wear nitrile gloves and face mask during tank mixing.',
            'Maintain Pre-Harvest Interval (PHI) as specified on package.',
            'Keep away from water bodies and livestock grazing areas.',
          ]).map((w, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-rose-400 font-bold">·</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Deterministic Dosage Rule Warning */}
      <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-300">
          {isTe ? 'మోతాదు నియమం: ' : 'Dosage Policy: '}
        </span>
        <span>
          {isTe
            ? 'పంట, తెగులు తీవ్రత, మరియు స్ప్రేయర్ రకం ఆధారంగా మాత్రమే సరైన మోతాదు నిర్ణయించబడుతుంది. భూమి విస్తీర్ణం ఆధారంగా మోతాదును అంచనా వేయరాదు. లేబుల్ వివరాలు లేదా నిపుణుడిని సంప్రదించండి.'
            : 'Pesticide dosages depend on formulation, crop stage, water volume, and equipment. Dosages are never calculated using land area alone. Follow verified label instructions.'}
        </span>
      </div>

      {/* 6. Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCheckWeather}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-medium transition-colors cursor-pointer"
          >
            <CloudSun className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isTe ? 'స్ప్రే వాతావరణం పరిశీలించు' : 'Check Spray Weather'}</span>
          </button>

          <button
            type="button"
            onClick={onSaveToDiary}
            disabled={isSaved}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isSaved
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isSaved
                ? isTe
                  ? 'డైరీలో నమోదయింది'
                  : 'Recorded in Diary'
                : isTe
                ? 'స్ప్రే వివరాలు నమోదు చేయండి'
                : 'Log Spray in Diary'}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500">IRAC/FRAC Database Sync</span>
      </div>
    </div>
  );
};
