import React from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Calendar,
  Sparkles,
  ShieldCheck,
  Radar,
  Clock,
} from 'lucide-react';
import { Language, NotificationItem } from '../types/agricultural';
import { authFetch } from '../lib/supabaseClient';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onOpenRadar: (outbreakId?: string) => void;
  notificationsList?: NotificationItem[];
  onMarkAsRead?: (id: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  language,
  onOpenRadar,
  notificationsList,
  onMarkAsRead,
}) => {
  const isTe = language === 'te';
  const [liveNotifications, setLiveNotifications] = React.useState<NotificationItem[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;

    if (notificationsList !== undefined) {
      setLiveNotifications(notificationsList);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const resp = await authFetch('/api/notifications');
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.notifications) {
            setLiveNotifications(data.notifications);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();
  }, [isOpen, notificationsList]);

  if (!isOpen) return null;

  const handleRead = (id: string) => {
    setLiveNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (onMarkAsRead) {
      onMarkAsRead(id);
    } else {
      authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch((e) =>
        console.warn('Failed to mark notification as read:', e)
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Community notifications"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-xl bg-white border border-[#E2E8D8] rounded-2xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEFE2] bg-[#F8FAF5]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#256E3A]/10 text-[#256E3A] border border-[#256E3A]/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#14281D]">
                {isTe ? 'ప్రాంతీయ తెగుళ్ల హెచ్చరికలు' : 'Agricultural Outbreak Alerts'}
              </h2>
              <p className="text-xs text-[#5C6F64]">
                {isTe ? '5 కి.మీ పరిధిలో AI గుర్తించిన తెగుళ్ల సమాచారం' : 'Targeted host notifications within 5 km'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="p-1.5 rounded-lg text-[#5C6F64] hover:text-[#14281D] hover:bg-[#EAEFE2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory AI-Assisted Notice Banner */}
        <div className="px-6 py-2 bg-[#F6FAF1] border-b border-[#DCE8D1] flex items-center gap-2 text-xs text-[#4A6052]">
          <Sparkles className="w-3.5 h-3.5 text-[#256E3A] shrink-0" />
          <span>
            {isTe
              ? 'అన్ని హెచ్చరికలు AI-ఆధారిత పరిశీలనలు · క్షేత్రస్థాయిలో ధృవీకరించబడలేదు'
              : 'All notifications are AI-assisted detections and not field-confirmed.'}
          </span>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {liveNotifications.length === 0 ? (
            <div className="text-center py-12 text-[#5C6F64]">
              <Bell className="w-8 h-8 text-[#A3B394] mx-auto mb-2" />
              <p className="text-sm font-semibold">{isTe ? 'ఎటువంటి హెచ్చరికలు లేవు' : 'No new outbreak alerts'}</p>
              <p className="text-xs text-[#5C6F64] mt-1">
                {isTe
                  ? 'మీ పరిసరాల్లో తెగుళ్లు నమోదైనప్పుడు ఇక్కడ కనిపిస్తాయి.'
                  : 'Targeted alerts will appear here when suspected issues are detected nearby.'}
              </p>
            </div>
          ) : (
            liveNotifications.map((notif) => {
              const relevance = notif.targetRelevance || 'general_notice';

              const badgeStyle =
                relevance === 'direct_host'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : relevance === 'vector_host'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : relevance === 'broad_host'
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : 'bg-slate-50 text-slate-700 border-slate-300';

              const badgeLabel =
                relevance === 'direct_host'
                  ? isTe ? '🚨 మీ పంటకు ప్రత్యక్ష ప్రమాదం' : '🚨 Direct Host Risk'
                  : relevance === 'vector_host'
                  ? isTe ? '🦗 వాహక ఆశ్రయం గమనిక' : '🦗 Vector Reservoir Notice'
                  : relevance === 'broad_host'
                  ? isTe ? '🌐 విస్తృత పంటల తెగులు' : '🌐 Broad Host Range'
                  : isTe ? '📍 పరిసరాల సాధారణ గమనిక' : '📍 General Vicinity Notice';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleRead(notif.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    notif.isRead
                      ? 'bg-white border-[#E2E8D8] opacity-85'
                      : 'bg-[#FBFDF9] border-[#256E3A]/40 shadow-xs ring-1 ring-[#256E3A]/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}>
                      {badgeLabel}
                    </span>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-[#5C6F64] font-bold block">
                        {notif.timestamp}
                      </span>
                      {notif.outbreakTimestamp && (
                        <span className="text-[10px] text-[#7E9085] flex items-center gap-1 mt-0.5 justify-end font-medium">
                          <Clock className="w-3 h-3 text-[#256E3A]" />
                          <span>
                            {isTe ? 'సంభవించిన సమయం: ' : 'Occurred: '}
                            {notif.outbreakTimestamp}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[#14281D] mb-1">
                    {isTe ? notif.titleTe : notif.titleEn}
                  </h3>

                  <p className="text-xs text-[#4A6052] leading-relaxed mb-3">
                    {isTe ? notif.descTe : notif.descEn}
                  </p>

                  {/* Extension Non-Chemical Precautions */}
                  {notif.precautions && notif.precautions.length > 0 && (
                    <div className="p-3 rounded-lg bg-[#FFFDF5] border border-[#F3E7C4] space-y-1.5 text-xs text-[#4A3B00] mb-2.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#8A6100]">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{isTe ? 'అధికారిక నివారణ చర్యలు (రసాయన రహితం)' : 'Recommended Precautions (Non-Chemical)'}</span>
                        </span>
                        {notif.referenceReviewDate && (
                          <span className="font-mono text-[10px]">
                            {isTe ? 'సమీక్ష:' : 'Reviewed:'} {notif.referenceReviewDate}
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed">
                        {isTe ? notif.precautions[0].actionTe : notif.precautions[0].actionEn}
                      </p>
                      {notif.referenceSourceUrl && (
                        <div className="pt-1 border-t border-[#F3E7C4] text-[10px]">
                          <a
                            href={notif.referenceSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[#256E3A] hover:underline font-semibold"
                          >
                            <span>{notif.referenceSourceAuthority || 'ANGRAU Extension'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Distance label or Location unavailable */}
                  {notif.distanceKm !== undefined && notif.distanceKm !== null && notif.distanceKm > 0.05 ? (
                    <div className="flex items-center gap-1 text-[11px] text-[#5C6F64]">
                      <MapPin className="w-3 h-3 text-[#256E3A]" />
                      <span>
                        {isTe
                          ? `సుమారు దూరం (~${notif.distanceKm.toFixed(1)} కి.మీ)`
                          : `Approximate distance (~${notif.distanceKm.toFixed(1)} km from sector centroid)`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-[#7E9085]">
                      <MapPin className="w-3 h-3 text-[#7E9085]" />
                      <span>
                        {isTe ? 'లొకేషన్ అందుబాటులో లేదు' : 'Location unavailable'}
                      </span>
                    </div>
                  )}

                  {/* Direct View on Disease Radar Map Button for Outbreak Alerts */}
                  {notif.outbreakId && (
                    <div className="mt-2.5 pt-2 border-t border-[#EAEFE2] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onOpenRadar(notif.outbreakId);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#256E3A]/10 text-[#256E3A] hover:bg-[#256E3A]/20 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Radar className="w-3.5 h-3.5" />
                        <span>{isTe ? 'మ్యాప్‌లో రాడార్ చూడండి →' : 'View on Disease Radar Map →'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#EAEFE2] bg-[#F8FAF5] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              const firstWithOutbreak = liveNotifications.find((n) => n.outbreakId);
              onOpenRadar(firstWithOutbreak?.outbreakId);
            }}
            className="text-xs font-bold text-[#256E3A] hover:underline cursor-pointer"
          >
            {isTe ? 'మ్యాప్‌లో రాడార్ చూడండి →' : 'View on Disease Radar Map →'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-[#D9E2CE] text-xs font-bold text-[#14281D] hover:bg-[#F3F6EF] cursor-pointer shadow-xs"
          >
            {isTe ? 'మూసివేయి' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
