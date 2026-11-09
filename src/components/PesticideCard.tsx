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
  BookmarkPlus,
  Calculator,
} from 'lucide-react';
import { DiagnosisDetails, Language } from '../types/agricultural';
import { playAgriculturalSpeech, stopAgriculturalSpeech } from '../utils/audioSpeech';
import { calculatePesticideQuantity } from '../utils/agriculturalLogic';

interface PesticideCardProps {
  data: DiagnosisDetails;
  language: Language;
  onCheckWeather: () => void;
  onSaveToDiary: (treatedArea: number, totalChemical: string) => void;
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

  // On-demand treated area state (never stored as fixed acreage)
  const [treatedAreaInput, setTreatedAreaInput] = useState<string>('2.5');

  const moaCode = details?.moaCode || 'FRAC 11';
  const isRecentRepeated = moaCode.includes('11') || moaCode.includes('4A');

  const parsedArea = parseFloat(treatedAreaInput) || 0;
  const isVerifiedForCrop = Boolean(details?.dosageVerifiedForActiveCrop ?? true);
  const dosagePerAcre = details?.dosagePerAcreMlOrG ?? 250;
  const waterPerAcre = details?.waterPerAcreLiters ?? 200;

  // Dynamic chemical calculation
  const calculation = calculatePesticideQuantity(
    dosagePerAcre,
    waterPerAcre,
    parsedArea,
    isVerifiedForCrop
  );

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

  const handleSave = () => {
    const summaryText = calculation.isCalculable
      ? `${details?.activeIngredient || 'Product'} @ ${calculation.totalChemicalText} in ${calculation.totalWaterLiters} L water`
      : 'Unverified application recorded';
    onSaveToDiary(parsedArea, summaryText);
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E2E8D8] rounded-2xl p-3.5 sm:p-6 text-[#14281D] shadow-sm space-y-4">
      {/* 1. Header: Product Name, Category & Speech Output */}
      <div className="flex flex-wrap items-start justify-between gap-2.5 pb-3 border-b border-[#EAEFE2]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#256E3A] mb-1">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isTe ? 'రసాయన లేబుల్ స్కాన్' : 'Pesticide Label Analysis'}</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#14281D]">
            {isTe ? data.diagnosisOrProduct.titleTe : data.diagnosisOrProduct.titleEn}
          </h2>
          <p className="text-xs text-[#5C6F64] mt-0.5 font-medium">
            {details?.activeIngredient} ({details?.concentration}) · {details?.formulation}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* FRAC / IRAC MOA Tag */}
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#256E3A]/10 text-[#256E3A] border border-[#256E3A]/30">
            {moaCode}
          </span>

          {/* Voice Output */}
          <button
            type="button"
            onClick={speakSummary}
            title={isTe ? 'సారాంశం వినండి' : 'Listen to audio explanation'}
            aria-label="Listen to audio explanation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#256E3A]/10 hover:bg-[#256E3A]/20 border border-[#256E3A]/30 text-[#256E3A] text-xs font-bold transition-colors cursor-pointer shadow-xs min-h-[36px]"
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

      {/* 2. Chemical Resistance Warning */}
      {isRecentRepeated && (
        <div className="p-3.5 rounded-xl bg-[#FFFDF5] border border-[#F3E7C4] flex items-start gap-3">
          <RotateCw className="w-4 h-4 text-[#8A6100] shrink-0 mt-0.5 animate-spin-slow" />
          <div className="space-y-0.5 text-xs text-[#4A3B00]">
            <p className="font-bold">
              {isTe
                ? `రసాయన నిరోధకత హెచ్చరిక: ${moaCode} వర్గం పునరావృతం అవుతోంది`
                : `Resistance Management Warning: Repeated ${moaCode} Application`}
            </p>
            <p className="text-[11px] leading-relaxed">
              {isTe
                ? 'వరుసగా ఒకే వర్గానికి చెందిన రసాయనం వాడటం వల్ల పురుగులు నిరోధకత పెంచుకుంటాయి. వేరే FRAC/IRAC గ్రూప్ మందుతో మార్చి పిచికారీ చేయండి.'
                : 'Repeated applications of this chemical group increase pest resistance risk. Rotate with an alternate mode of action before re-applying.'}
            </p>
          </div>
        </div>
      )}

      {/* 3. On-Demand Area Input & Verified Spray Calculations */}
      <div className="p-4 rounded-xl bg-[#F6FAF1] border border-[#DCE8D1] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#256E3A]" />
            <span className="text-xs font-bold text-[#14281D]">
              {isTe ? 'పిచికారీ చేయవలసిన విస్తీర్ణం:' : 'Area Being Treated (On-Demand):'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.5"
              value={treatedAreaInput}
              onChange={(e) => setTreatedAreaInput(e.target.value)}
              className="w-20 px-2.5 py-1 text-center font-bold text-sm bg-white border border-[#CBD9BE] rounded-lg text-[#14281D] focus:outline-none focus:ring-2 focus:ring-[#256E3A]"
            />
            <span className="text-xs font-bold text-[#4A6052]">
              {isTe ? 'ఎకరాలు (Acres)' : 'Acres'}
            </span>
          </div>
        </div>

        {/* Calculation Result */}
        {calculation.isCalculable ? (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2EBD6]">
            <div className="bg-white p-3 rounded-lg border border-[#DCE8D1]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6052] block">
                {isTe ? 'మొత్తం మందు పరిమాణం' : 'Total Chemical Required'}
              </span>
              <span className="text-base sm:text-lg font-black text-[#256E3A] tabular-nums">
                {calculation.totalChemicalText}
              </span>
              <span className="block text-[10px] text-[#5C6F64] mt-0.5">
                ({dosagePerAcre} ml/g per acre)
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-[#DCE8D1]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6052] block">
                {isTe ? 'కావలసిన నీటి పరిమాణం' : 'Total Water Required'}
              </span>
              <span className="text-base sm:text-lg font-black text-[#256E3A] tabular-nums">
                {calculation.totalWaterLiters} <span className="text-xs font-normal">Liters</span>
              </span>
              <span className="block text-[10px] text-[#5C6F64] mt-0.5">
                ({waterPerAcre} L per acre)
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#991B1B]">
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isTe
                ? 'ఈ పంటకు లేబుల్ ఆధారిత మోతాదు ధృవీకరించబడలేదు. అంచనాతో మందులు లేదా రసాయనాల కలయికలు (Tank Mix) వాడవద్దు.'
                : 'No approved label dosage verified for this specific crop. Never guess chemical dosage or tank mixes without authorized manufacturer guidance.'}
            </p>
          </div>
        )}
      </div>

      {/* 4. Rainfastness & Safety Warnings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {details?.rainfastHours && (
          <div className="p-2.5 rounded-lg bg-[#FBFDF9] border border-[#EAEFE2] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#256E3A]" />
            <span>
              {isTe ? 'వర్షం నిరోధకత సమయం:' : 'Rainfast Duration:'}{' '}
              <strong className="text-[#14281D]">{details.rainfastHours}</strong>
            </span>
          </div>
        )}
        <div className="p-2.5 rounded-lg bg-[#FBFDF9] border border-[#EAEFE2] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>
            {isTe ? 'రక్షణ సూచన:' : 'Safety Precaution:'}{' '}
            <strong className="text-[#14281D]">Wear PPE mask & gloves</strong>
          </span>
        </div>
      </div>

      {/* 5. Action Footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-[#EAEFE2]">
        <button
          type="button"
          onClick={onCheckWeather}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-[#F3F6EF] border border-[#D9E2CE] text-[#14281D] text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[42px]"
        >
          <CloudSun className="w-4 h-4 text-[#256E3A]" />
          <span>{isTe ? 'స్ప్రే వాతావరణం పరిశీలించు' : 'Check Spray Weather'}</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaved}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[42px] ${
            isSaved
              ? 'bg-[#EAEFE2] text-[#5C6F64] border border-[#D9E2CE]'
              : 'bg-[#256E3A] hover:bg-[#1E582E] text-white'
          }`}
        >
          <BookmarkPlus className="w-4 h-4" />
          <span>
            {isSaved
              ? isTe ? 'డైరీలో భద్రపరచబడింది' : 'Saved to Field Diary'
              : isTe ? 'ఫీల్డ్ డైరీలో నమోదు చేయండి' : 'Log Treatment to Diary'}
          </span>
        </button>
      </div>
    </div>
  );
};
