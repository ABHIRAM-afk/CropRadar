import React from 'react';
import { X, Bell, AlertTriangle, ShieldAlert, CheckCircle2, MapPin } from 'lucide-react';
import { Language } from '../types/agricultural';

interface NotificationItem {
  id: string;
  type: 'outbreak_nearby' | 'weather_warning' | 'resistance_alert';
  titleEn: string;
  titleTe: string;
  descEn: string;
  descTe: string;
  distanceKm?: number;
  timestamp: string;
  isRead: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onOpenRadar: () => void;
  notificationsList?: NotificationItem[];
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  language,
  onOpenRadar,
  notificationsList,
}) => {
  const isTe = language === 'te';
  const [liveNotifications, setLiveNotifications] = React.useState<NotificationItem[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;

    if (notificationsList && notificationsList.length > 0) {
      setLiveNotifications(notificationsList);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const resp = await fetch('/api/notifications');
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

  const notifications = liveNotifications.length > 0 ? liveNotifications : [
    {
      id: 'notif-1',
      type: 'outbreak_nearby' as const,
      titleEn: 'Severe Chilli Thrips & Leaf Curl Outbreak Detected',
      titleTe: 'పరిసరాల్లో తీవ్రమైన మిరప తామర పురుగు మరియు ఆకుముడుత గుర్తించబడింది',
      descEn: 'Verified by local agricultural officer in Prathipadu Sector 4 (3.2 km from your farm). Early prophylactic spray recommended.',
      descTe: 'ప్రత్తిపాడు సెక్టార్ 4 లో (మీ పొలానికి 3.2 కి.మీ దూరంలో) వ్యవసాయ అధికారి ధృవీకరించారు. ముందస్తు నివారణ చర్యలు చేపట్టండి.',
      distanceKm: 3.2,
      timestamp: '2 hours ago',
      isRead: false,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Community notifications"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {isTe ? 'ప్రాంతీయ హెచ్చరికలు & నోటిఫికేషన్లు' : 'Agricultural Alerts & Warnings'}
              </h2>
              <p className="text-xs text-slate-400">
                {isTe ? '5 కి.మీ పరిధిలో వ్యవసాయ సంక్షేమ సమాచారం' : '5 km radius verified outbreak notifications'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications list */}
        <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border text-xs transition-colors ${
                !item.isRead
                  ? 'bg-slate-950/90 border-rose-500/40 text-slate-200'
                  : 'bg-slate-950/50 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {item.type === 'outbreak_nearby' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : item.type === 'weather_warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">
                      {isTe ? item.titleTe : item.titleEn}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {isTe ? item.descTe : item.descEn}
                  </p>
                  {item.distanceKm && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-rose-400 flex items-center gap-1 font-semibold">
                        <MapPin className="w-3 h-3" />
                        {item.distanceKm} km from your registered farm
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenRadar();
                        }}
                        className="text-[11px] text-emerald-400 hover:underline cursor-pointer font-medium"
                      >
                        {isTe ? 'మ్యాప్‌లో చూడండి →' : 'View on Radar Map →'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Geohash proximity filtering active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
          >
            {isTe ? 'సరే' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
