import React from 'react';
import {
  Sprout,
  Plus,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  X,
  History,
} from 'lucide-react';
import { CropCycle, Language } from '../types/agricultural';

interface CropSidebarProps {
  cropCycles: CropCycle[];
  activeCropCycleId: string | null;
  onSelectCropCycle: (cycleId: string) => void;
  onOpenNewCropModal: () => void;
  language: Language;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

function getCropEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('paddy') || n.includes('rice') || n.includes('వరి')) return '🌾';
  if (n.includes('tomato') || n.includes('టమోటా')) return '🍅';
  if (n.includes('chilli') || n.includes('మిరప')) return '🌶️';
  if (n.includes('cotton') || n.includes('ప్రత్తి') || n.includes('పత్తి')) return '☁️';
  if (n.includes('maize') || n.includes('మొక్కజొన్న')) return '🌽';
  if (n.includes('groundnut') || n.includes('వేరుశనగ')) return '🥜';
  if (n.includes('turmeric') || n.includes('పసుపు')) return '🟡';
  if (n.includes('pulse') || n.includes('కందులు') || n.includes('red gram')) return '🫘';
  return '🌱';
}

export const CropSidebar: React.FC<CropSidebarProps> = ({
  cropCycles,
  activeCropCycleId,
  onSelectCropCycle,
  onOpenNewCropModal,
  language,
  isOpenMobile,
  onCloseMobile,
}) => {
  const isTe = language === 'te';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#F8FAF5] w-full select-none">
      {/* Top Section: Title & New Crop Button */}
      <div className="p-4 border-b border-[#EAEFE2] space-y-3 bg-[#F4F7F0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#256E3A]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#14281D]">
              {isTe ? 'పంటల చరిత్ర & సంభాషణలు' : 'Crop History & Threads'}
            </h2>
          </div>
          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close crop history drawer"
            className="md:hidden p-2 rounded-xl text-[#5C6F64] hover:text-[#14281D] hover:bg-[#EAEFE2] transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clear Prominent New Crop Button */}
        <button
          type="button"
          onClick={() => {
            onOpenNewCropModal();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-extrabold shadow-sm hover:shadow-md transition-all cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>{isTe ? 'కొత్త పంట సంభాషణ' : 'New Crop Conversation'}</span>
        </button>
      </div>

      {/* Historical Crop Cycle Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E9085] px-2 block">
          {isTe ? 'మీ పంట చరిత్ర' : 'Your Crop Cycles'}
        </span>

        {cropCycles.length === 0 ? (
          <div className="text-center py-10 px-4 text-[#7E9085]">
            <Sprout className="w-8 h-8 text-[#A3B394] mx-auto mb-2 opacity-60" />
            <p className="text-xs font-bold text-[#4A6052]">
              {isTe ? 'ఇంకా పంటలు నమోదు కాలేదు' : 'No crops registered yet'}
            </p>
            <p className="text-[11px] text-[#7E9085] mt-1">
              {isTe
                ? 'పైన ఉన్న "కొత్త పంట" బటన్ నొక్కి ప్రారంభించండి.'
                : 'Click "New Crop Conversation" above to start your first dedicated crop conversation.'}
            </p>
          </div>
        ) : (
          cropCycles.map((cycle) => {
            const isActive = cycle.id === activeCropCycleId;
            const emoji = getCropEmoji(cycle.cropNameEn || '');
            const displayName = isTe
              ? (cycle.cropNameTe || cycle.cropNameEn)
              : (cycle.cropNameEn || cycle.cropNameTe);

            const displayDate = cycle.sowingDate
              ? new Date(cycle.sowingDate).toLocaleDateString([], { month: 'short', year: 'numeric' })
              : 'Active';

            return (
              <button
                key={cycle.id}
                type="button"
                onClick={() => {
                  onSelectCropCycle(cycle.id);
                  onCloseMobile();
                }}
                className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer relative flex items-start gap-3 ${
                  isActive
                    ? 'bg-white border-[#256E3A] shadow-sm ring-1 ring-[#256E3A]/20'
                    : 'bg-[#FBFDF9] hover:bg-white border-[#E2E8D8] text-[#4A6052]'
                }`}
              >
                {/* Crop Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isActive ? 'bg-[#EAEFE2]' : 'bg-[#EAEFE2]/60'
                  }`}
                >
                  {emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className={`text-xs truncate ${isActive ? 'font-extrabold text-[#14281D]' : 'font-bold text-[#14281D]'}`}>
                      {displayName}
                    </h3>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#256E3A] shrink-0"></span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-[#5C6F64] mt-0.5">
                    <Calendar className="w-3 h-3 text-[#256E3A]" />
                    <span>{displayDate}</span>
                    <span>·</span>
                    <span className="truncate">{cycle.stage || 'Vegetative'}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-md font-semibold text-[9px] ${
                        cycle.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cycle.status === 'active'
                        ? isTe ? 'సాగులో ఉంది' : 'Active Cycle'
                        : isTe ? 'పూర్తయింది' : 'Harvested'}
                    </span>
                    <span className="text-[10px] text-[#7E9085] flex items-center gap-0.5">
                      <MessageSquare className="w-2.5 h-2.5" />
                      <span>{isTe ? 'సంభాషణ' : 'Chat'}</span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info: Crop isolation guarantee */}
      <div className="p-3.5 border-t border-[#EAEFE2] bg-[#F4F7F0] text-[10px] text-[#5C6F64] leading-relaxed">
        <p className="flex items-center gap-1 font-bold text-[#256E3A] mb-0.5">
          <Layers className="w-3 h-3" />
          <span>{isTe ? 'పంటల ప్రత్యేకత' : 'Separate Conversations'}</span>
        </p>
        <span>
          {isTe
            ? 'ప్రతి పంటకు ప్రత్యేక హిస్టరీ ఉంటుంది. ఇతర పంటల మెసేజ్‌లతో కలవదు.'
            : 'Each crop cycle retains its own separate conversation until it ends.'}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Static Left Column */}
      <aside className="hidden md:block shrink-0 sticky top-[65px] h-[calc(100vh-65px)] w-72 lg:w-80 border-r border-[#E2E8D8]">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar: Slide-over drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-[85vw] sm:max-w-xs w-full bg-[#F8FAF5] z-50 shadow-2xl h-full border-r border-[#E2E8D8] transform transition-transform duration-300 ease-out">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

