import React, { useState } from 'react';
import {
  X,
  Sprout,
  Calendar,
  Check,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Language } from '../types/agricultural';

interface NewCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCrop: (params: {
    cropNameEn: string;
    cropNameTe: string;
    sowingDate: string;
    stage: string;
    cycleLabel: string;
  }) => void | Promise<void>;
  language: Language;
}

const POPULAR_CROPS = [
  {
    nameEn: 'Paddy / Rice',
    nameTe: 'వరి',
    icon: '🌾',
    defaultStage: 'Vegetative Growth',
  },
  {
    nameEn: 'Tomato',
    nameTe: 'టమోటా',
    icon: '🍅',
    defaultStage: 'Flowering & Fruit Setting',
  },
  {
    nameEn: 'Chilli',
    nameTe: 'మిరప',
    icon: '🌶️',
    defaultStage: 'Flowering & Fruit Setting',
  },
  {
    nameEn: 'Cotton',
    nameTe: 'ప్రత్తి',
    icon: '☁️',
    defaultStage: 'Vegetative / Squaring',
  },
  {
    nameEn: 'Maize',
    nameTe: 'మొక్కజొన్న',
    icon: '🌽',
    defaultStage: 'Whorl Stage',
  },
  {
    nameEn: 'Groundnut',
    nameTe: 'వేరుశనగ',
    icon: '🥜',
    defaultStage: 'Pegging Stage',
  },
  {
    nameEn: 'Turmeric',
    nameTe: 'పసుపు',
    icon: '🟡',
    defaultStage: 'Rhizome Development',
  },
  {
    nameEn: 'Pulses / Red Gram',
    nameTe: 'కందులు / పప్పుధాన్యాలు',
    icon: '🫘',
    defaultStage: 'Pod Formation',
  },
];

const CROP_STAGES = [
  { stageEn: 'Sowing & Nursery', stageTe: 'విత్తనం & నారుమడి దశ' },
  { stageEn: 'Vegetative Growth', stageTe: 'శాఖీయ పెరుగుదల దశ' },
  { stageEn: 'Flowering & Fruit Setting', stageTe: 'పూత & పిందె దశ' },
  { stageEn: 'Grain / Pod Filling', stageTe: 'గింజ / కాయ కట్టే దశ' },
  { stageEn: 'Maturity & Harvesting', stageTe: 'పంట కోత దశ' },
];

export const NewCropModal: React.FC<NewCropModalProps> = ({
  isOpen,
  onClose,
  onCreateCrop,
  language,
}) => {
  if (!isOpen) return null;
  const isTe = language === 'te';

  const [selectedCrop, setSelectedCrop] = useState<typeof POPULAR_CROPS[0] | null>(POPULAR_CROPS[0]);
  const [customCropName, setCustomCropName] = useState('');
  const [isCustomCrop, setIsCustomCrop] = useState(false);
  const [sowingDate, setSowingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [stage, setStage] = useState(POPULAR_CROPS[0].defaultStage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectQuickCrop = (crop: typeof POPULAR_CROPS[0]) => {
    setSelectedCrop(crop);
    setIsCustomCrop(false);
    setStage(crop.defaultStage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const cropNameEn = isCustomCrop
      ? (customCropName.trim() || 'Custom Crop')
      : (selectedCrop?.nameEn || 'Chilli');

    const cropNameTe = isCustomCrop
      ? (customCropName.trim() || 'ఇతర పంట')
      : (selectedCrop?.nameTe || 'మిరప');

    const currentYear = new Date(sowingDate).getFullYear();
    const cycleLabel = `${cropNameEn} (${currentYear})`;

    try {
      await onCreateCrop({
        cropNameEn,
        cropNameTe,
        sowingDate,
        stage,
        cycleLabel,
      });
      onClose();
    } catch (err) {
      console.warn('Failed to start new crop cycle:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New crop cycle conversation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-white border border-[#E2E8D8] rounded-3xl overflow-hidden shadow-2xl my-auto sm:my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-5 border-b border-[#EAEFE2] bg-[#F8FAF5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#256E3A]/10 text-[#256E3A] border border-[#256E3A]/20">
              <Sprout className="w-5 h-5 text-[#256E3A]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-extrabold text-[#14281D]">
                {isTe ? 'మీరు ఏ పంట సాగు చేస్తున్నారు?' : 'Which crop are you planting?'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#5C6F64]">
                {isTe
                  ? 'ప్రతి పంటకు ప్రత్యేక AI సంభాషణ మరియు ఆరోగ్య పర్యవేక్షణ ప్రారంభమవుతుంది.'
                  : 'Start a dedicated conversation and health tracking for this crop cycle.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#5C6F64] hover:text-[#14281D] hover:bg-[#EAEFE2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs text-[#14281D] overflow-y-auto flex-1">
          {/* 1. Quick Choice Buttons for Popular Crops */}
          <div>
            <label className="block text-xs font-bold text-[#4A6052] mb-2 uppercase tracking-wider">
              {isTe ? 'ప్రధాన పంటను ఎంచుకోండి:' : 'Select your active crop:'}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {POPULAR_CROPS.map((crop) => {
                const isSelected = !isCustomCrop && selectedCrop?.nameEn === crop.nameEn;
                return (
                  <button
                    key={crop.nameEn}
                    type="button"
                    onClick={() => handleSelectQuickCrop(crop)}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#EAEFE2] border-[#256E3A] text-[#14281D] font-extrabold shadow-xs ring-2 ring-[#256E3A]/20'
                        : 'bg-white hover:bg-[#F3F6EF] border-[#D9E2CE] text-[#4A6052]'
                    }`}
                  >
                    <span className="text-2xl mb-1">{crop.icon}</span>
                    <span className="text-xs font-bold text-[#14281D]">
                      {isTe ? crop.nameTe : crop.nameEn.split(' / ')[0]}
                    </span>
                    <span className="text-[10px] text-[#5C6F64]">
                      {isTe ? crop.nameEn.split(' / ')[0] : crop.nameTe}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#256E3A] text-white flex items-center justify-center text-[10px]">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Crop Option */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setIsCustomCrop(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                  isCustomCrop
                    ? 'bg-[#EAEFE2] border-[#256E3A] text-[#256E3A]'
                    : 'bg-white hover:bg-[#F3F6EF] border-[#D9E2CE] text-[#4A6052]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isTe ? 'ఇతర పంటను నమోదు చేయండి' : 'Other custom crop'}</span>
              </button>

              {isCustomCrop && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={customCropName}
                    onChange={(e) => setCustomCropName(e.target.value)}
                    placeholder={isTe ? 'పంట పేరు రాయండి (ఉదా: ఉల్లి, అరటి, పత్తి)' : 'Enter crop name (e.g. Onion, Banana, Soya)'}
                    className="w-full px-3.5 py-2 text-base sm:text-xs bg-white border border-[#D9E2CE] rounded-xl text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. Sowing Date & Stage (No field size stored) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-[#4A6052] mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-[#256E3A]" />
                <span>{isTe ? 'విత్తిన తేదీ / ప్రారంభం' : 'Sowing Date / Start'}</span>
              </label>
              <input
                type="date"
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="w-full px-3.5 py-2 text-base sm:text-xs bg-white border border-[#D9E2CE] rounded-xl text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A6052] mb-1.5">
                <Sprout className="w-3.5 h-3.5 inline mr-1 text-[#256E3A]" />
                <span>{isTe ? 'ప్రస్తుత పంట దశ' : 'Current Growth Stage'}</span>
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3.5 py-2 text-base sm:text-xs bg-white border border-[#D9E2CE] rounded-xl text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
              >
                {CROP_STAGES.map((s) => (
                  <option key={s.stageEn} value={s.stageEn}>
                    {isTe ? `${s.stageTe} (${s.stageEn})` : `${s.stageEn} (${s.stageTe})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversation Isolation Notice */}
          <div className="p-3.5 rounded-2xl bg-[#F6FAF1] border border-[#DCE8D1] text-[11px] text-[#4A6052] flex items-start gap-2.5">
            <Sprout className="w-4 h-4 text-[#256E3A] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isTe
                ? 'ఈ పంటకు ప్రత్యేక సంభాషణ ఏర్పడుతుంది. మీరు ఎప్పుడు ఈ పంటను ఎంచుకున్నా, దీనికి సంబంధించిన మునుపటి మెసేజ్‌లు, తెగుళ్ల గుర్తింపు మాత్రమే కనిపిస్తాయి.'
                : 'Each crop cycle has its own continuing conversation. Whenever you return to this crop, its past messages and diagnosis history remain intact without mixing with other crops.'}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#EAEFE2] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[40px] rounded-xl bg-white border border-[#D9E2CE] text-xs font-bold text-[#14281D] hover:bg-[#F3F6EF] cursor-pointer text-center"
            >
              {isTe ? 'రద్దు' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (isCustomCrop && !customCropName.trim())}
              className="flex items-center justify-center gap-2 px-5 py-2.5 min-h-[40px] rounded-xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
            >
              <span>{isTe ? 'పంట సంభాషణ ప్రారంభించండి' : 'Start Crop Conversation'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

