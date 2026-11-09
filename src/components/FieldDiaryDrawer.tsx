import React from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { DiaryEntry, Language } from '../types/agricultural';

interface FieldDiaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entries: DiaryEntry[];
  language: Language;
  onSelectEntryForChat: (entry: DiaryEntry) => void;
}

export const FieldDiaryDrawer: React.FC<FieldDiaryDrawerProps> = ({
  isOpen,
  onClose,
  entries,
  language,
  onSelectEntryForChat,
}) => {
  if (!isOpen) return null;
  const isTe = language === 'te';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop field diary"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full sm:max-w-md bg-slate-900 border-l border-slate-700 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isTe ? 'పంట ఆరోగ్య డైరీ' : 'Field Diary & History'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isTe ? 'మీ పొలం పరిశీలనల కాలక్రమం' : 'Persistent Crop Health Timeline'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close field diary"
            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>{isTe ? 'ఇంకా ఎటువంటి నమోదులు లేవు.' : 'No crop observations recorded yet.'}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {isTe
                  ? 'పంట ఫోటోను విశ్లేషించి "ఫీల్డ్ డైరీలో భద్రపరచు" నొక్కండి.'
                  : 'Analyze a crop leaf and click "Save to Field Diary" to build history.'}
              </p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition-all text-xs"
              >
                {/* Crop & Date */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">{entry.cropName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {entry.confidence}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>

                {/* Thumbnail if available */}
                {entry.imageThumbnail && (
                  <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-800 bg-black">
                    <img
                      src={entry.imageThumbnail}
                      alt={entry.cropName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Diagnosis & Symptoms */}
                <div className="space-y-1">
                  <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{entry.diagnosis}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {entry.symptoms}
                  </p>
                </div>

                {/* Recorded treatments */}
                {entry.treatmentsRecorded && entry.treatmentsRecorded.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      {isTe ? 'నమోదైన పిచికారీ / చర్యలు:' : 'Recorded Treatments:'}
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {entry.treatmentsRecorded.map((t, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weather snapshot */}
                {entry.weatherSnapshot && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    🌦️ {entry.weatherSnapshot}
                  </div>
                )}

                {/* Continue conversation button */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectEntryForChat(entry);
                    onClose();
                  }}
                  className="w-full min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700/80 font-medium transition-colors cursor-pointer text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isTe ? 'దీనిపై తదుపరి ప్రశ్న అడగండి' : 'Ask Follow-up on this Crop'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-500 text-center shrink-0">
          {isTe
            ? 'ప్రతి పరిశీలన తదుపరి విశ్లేషణకు ఉపయోగపడుతుంది'
            : 'Observations feed into continuous crop health monitoring'}
        </div>
      </div>
    </div>
  );
};
