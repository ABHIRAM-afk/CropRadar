import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Send,
  X,
  CheckCircle2,
  Radar,
  MapPin,
  Clock,
  Sparkles,
  HelpCircle,
  Loader2,
  AlertCircle,
  Database,
} from 'lucide-react';
import { BiologicalPrecaution, Language } from '../types/agricultural';

interface OutbreakAlertConfirmationCardProps {
  outbreakAlert: {
    outbreakId?: string;
    status:
      | 'sent'
      | 'pending_confirmation'
      | 'cancelled'
      | 'unknown_host_range'
      | 'no_nearby_hosts'
      | 'location_unconfigured'
      | 'failed';
    diseaseName: string;
    crop: string;
    nearbyCount?: number;
    dispatchedTime?: string;
    dispatchedTimestamp?: string;
    lat: number;
    lon: number;
    generalizedLocation?: string;
    aiMatchScore?: number;
    pathogenHosts?: string[];
    vectorHosts?: string[];
    precautions?: BiologicalPrecaution[];
    cancellationReasonEn?: string;
    cancellationReasonTe?: string;
    dbWritesSucceeded?: boolean;
    statusMessageEn?: string;
    statusMessageTe?: string;
  };
  language: Language;
  onConfirmSend?: () => Promise<void>;
  onDismiss?: () => void;
  onOpenRadar: (outbreakId?: string) => void;
}

export const OutbreakAlertConfirmationCard: React.FC<OutbreakAlertConfirmationCardProps> = ({
  outbreakAlert,
  language,
  onConfirmSend,
  onDismiss,
  onOpenRadar,
}) => {
  const isTe = language === 'te';
  const [isSending, setIsSending] = useState(false);

  const matchPercent = outbreakAlert.aiMatchScore
    ? Math.round(outbreakAlert.aiMatchScore * 100)
    : 85;

  const pathogenHostsList =
    outbreakAlert.pathogenHosts && outbreakAlert.pathogenHosts.length > 0
      ? outbreakAlert.pathogenHosts.join(', ')
      : outbreakAlert.crop;

  const handleConfirm = async () => {
    if (!onConfirmSend) return;
    setIsSending(true);
    try {
      await onConfirmSend();
    } finally {
      setIsSending(false);
    }
  };

  // 1. Status: Unknown Host Range (Withheld alert)
  if (outbreakAlert.status === 'unknown_host_range') {
    return (
      <div
        role="region"
        aria-label="Community Outbreak Notice Withheld"
        className="w-full rounded-3xl bg-slate-50 border border-slate-200 p-4 sm:p-5 text-xs space-y-2.5 shadow-xs text-slate-800"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold uppercase tracking-wide text-[11px] text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>{isTe ? 'కమ్యూనిటీ అలర్ట్ నిలిపివేయబడింది' : 'Community Outbreak Notice Withheld'}</span>
          </span>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
            {isTe ? 'అస్పష్టమైన హోస్ట్ శ్రేణి' : 'Host Range Unconfirmed'}
          </span>
        </div>
        <p className="text-[#334155] leading-relaxed">
          {isTe
            ? (outbreakAlert.cancellationReasonTe ||
              'ఈ తెగులు వ్యాప్తి చెందే నిర్దిష్ట పంటల హోస్ట్ శ్రేణి ధృవీకరించబడలేదు. రైతులకు తప్పుడు ఆందోళన కలగకుండా ఉండటానికి 5 కి.మీ ముందస్తు హెచ్చరిక పంపబడలేదు. దయచేసి స్థానిక వ్యవసాయ విస్తరణ కేంద్రాన్ని సంప్రదించండి.')
            : (outbreakAlert.cancellationReasonEn ||
              'The host crop range for this suspected condition is unconfirmed by extension authorities. Targeted community alerts were withheld to prevent false alarms. Please provide clearer symptom photos or consult local agricultural extension.')}
        </p>
        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
          <span>{isTe ? 'AI-ఆధారిత పరిశీలన · క్షేత్రస్థాయిలో ధృవీకరించబడలేదు' : 'AI-assisted, not field-confirmed'}</span>
        </div>
      </div>
    );
  }

  // 2. Status: Location Unconfigured
  if (outbreakAlert.status === 'location_unconfigured') {
    return (
      <div
        role="region"
        aria-label="Location Unconfigured Notice"
        className="w-full rounded-3xl bg-[#F8FAF5] border border-[#CBD9BE] p-4 sm:p-5 text-xs space-y-2.5 shadow-xs text-[#374B3F]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold uppercase tracking-wide text-[11px] text-[#256E3A] flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#256E3A]" />
            <span>{isTe ? 'పొలం లొకేషన్ సెట్ చేయబడలేదు' : 'Farm Location Not Configured'}</span>
          </span>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#EAEFE2] text-[#4A6052] font-bold">
            {isTe ? 'గోప్యతా నియమం' : 'Privacy Protection'}
          </span>
        </div>
        <p className="leading-relaxed">
          {isTe
            ? 'మీ పొలం సెక్టార్ కాన్ఫిగర్ చేయబడలేదు లేదా లొకేషన్ అనుమతి ఇవ్వబడలేదు. 5 కి.మీ కమ్యూనిటీ అలర్ట్‌లు ప్రారంభించడానికి పొలం ప్రొఫైల్‌లో మీ సెక్టార్‌ను సెట్ చేయండి.'
            : 'Your farm sector is unconfigured or location consent was not provided. Configure your sector in Farm Profile to enable automatic 5 km community alerts.'}
        </p>
      </div>
    );
  }

  // 3. Status: Database write or delivery failed
  if (outbreakAlert.status === 'failed') {
    return (
      <div
        role="alert"
        aria-label="Outbreak delivery error"
        className="w-full rounded-3xl bg-rose-50 border border-rose-300 p-4 sm:p-5 text-xs space-y-2.5 shadow-xs text-rose-950"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold uppercase tracking-wide text-[11px] text-rose-900 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{isTe ? 'కమ్యూనిటీ అలర్ట్ నమోదు లోపం' : 'Community Outbreak Notice Not Sent'}</span>
          </span>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 font-bold">
            {isTe ? 'డేటాబేస్ లోపం' : 'Write Failed'}
          </span>
        </div>
        <p className="leading-relaxed">
          {isTe
            ? (outbreakAlert.statusMessageTe || 'కమ్యూనిటీ రాడార్‌లో తెగులు నమోదు చేయడంలో లోపం సంభవించింది. మీ వ్యక్తిగత విశ్లేషణ సురక్షితంగా సేవ్ చేయబడింది.')
            : (outbreakAlert.statusMessageEn || 'Could not record outbreak to the community database. Your private crop diagnosis was preserved in your active cycle.')}
        </p>
      </div>
    );
  }

  // 4. Status: Saved to radar, but no nearby host farms
  if (outbreakAlert.status === 'no_nearby_hosts') {
    return (
      <div
        role="region"
        aria-label="Outbreak Saved To Radar"
        className="w-full rounded-3xl bg-[#F6FAF1] border border-[#CBD9BE] p-4 sm:p-5 shadow-xs text-xs space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-[#14281D] uppercase tracking-wide text-[11px] flex items-center gap-1.5">
            <Radar className="w-4 h-4 text-[#256E3A]" />
            <span>{isTe ? '5 కి.మీ కమ్యూనిటీ రాడార్‌లో నమోదు చేయబడింది' : 'Logged to 5 km Community Radar'}</span>
          </span>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#1E582E] font-bold border border-emerald-300">
            {isTe ? 'నమోదైంది' : 'Recorded in DB'}
          </span>
        </div>

        <div className="space-y-1.5 text-[#374B3F] font-medium leading-relaxed">
          <p>
            {isTe
              ? `ఈ తెగులు నివేదిక (${outbreakAlert.generalizedLocation || 'సెక్టార్ సెంట్రాయిడ్'}) పరిధిలో రాడార్‌లో నమోదు చేయబడింది. ప్రస్తుతం 5 కి.మీ పరిధిలో "${pathogenHostsList}" పంటలు సాగుచేస్తున్న ఇతర రైతులు నమోదు కాలేదు కాబట్టి ఎటువంటి అలర్ట్‌లు పంపాల్సిన అవసరం రాలేదు.`
              : `Suspected outbreak recorded on the community radar around ${outbreakAlert.generalizedLocation || 'sector centroid'}. No other registered farms within 5 km currently cultivate susceptible host crops (${pathogenHostsList}), so no notifications were sent.`}
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-[#5C6F64]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#65A30D]"></span>
            <span className="font-semibold text-[#14281D]">
              {isTe ? 'AI-ఆధారిత పరిశీలన · క్షేత్రస్థాయిలో ధృవీకరించబడలేదు' : 'AI-assisted, not field-confirmed'}
            </span>
          </div>
        </div>

        {outbreakAlert.outbreakId && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onOpenRadar(outbreakAlert.outbreakId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Radar className="w-3.5 h-3.5" />
              <span>{isTe ? 'మ్యాప్‌లో రాడార్ చూడండి →' : 'View on Disease Radar Map →'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 5. Status: Cancelled
  if (outbreakAlert.status === 'cancelled') {
    return (
      <div className="w-full rounded-2xl bg-[#F8FAF5] border border-[#E2E8D8] p-3 text-xs text-[#5C6F64] flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <X className="w-4 h-4 text-slate-400" />
          <span>{isTe ? 'రైతు ద్వారా కమ్యూనిటీ అలర్ట్ రద్దు చేయబడింది.' : 'Community outbreak alert was dismissed. No notifications sent.'}</span>
        </span>
      </div>
    );
  }

  // 6. Status: Successfully Dispatched Automatically
  if (outbreakAlert.status === 'sent') {
    return (
      <div
        role="region"
        aria-label="Community Outbreak Alert Dispatched"
        className="w-full rounded-3xl bg-amber-50/90 border border-amber-300 p-4 sm:p-5 shadow-xs text-xs space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-amber-950 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
            <span>🚨</span>
            <span>{isTe ? '5 కి.మీ కమ్యూనిటీ తెగులు హెచ్చరిక స్వయంచాలకంగా పంపబడింది' : '5 km Community Outbreak Alert Automatically Dispatched'}</span>
          </span>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>{isTe ? 'స్వయంచాలక ప్రసారం' : 'Auto-Dispatched'}</span>
          </span>
        </div>

        <div className="space-y-1.5 text-amber-950 font-medium leading-relaxed">
          <p>
            {isTe
              ? `ఈ హెచ్చరిక ${outbreakAlert.dispatchedTime || 'ఇప్పుడే'} నాడు సెక్టార్ పరిధిలోని (${outbreakAlert.lat.toFixed(2)}, ${outbreakAlert.lon.toFixed(2)}) 5 కి.మీ సమీపంలో "${pathogenHostsList}" పంటలు సాగుచేస్తున్న ${outbreakAlert.nearbyCount ?? 0} మంది రైతులకు స్వయంచాలకంగా చేరింది.`
              : `This alert was automatically dispatched at ${outbreakAlert.dispatchedTime || 'Just now'} to ${outbreakAlert.nearbyCount ?? 0} registered nearby farms cultivating plausible host crops (${pathogenHostsList}) within 5 km of sector centroid (${outbreakAlert.lat.toFixed(2)}, ${outbreakAlert.lon.toFixed(2)}).`}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-amber-900/90">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#65A30D]"></span>
              <span className="font-bold">
                {isTe ? 'AI-ఆధారిత పరిశీలన · క్షేత్రస్థాయిలో ధృవీకరించబడలేదు' : 'AI-assisted, not field-confirmed'}
              </span>
            </span>
            <span className="font-mono text-amber-800">
              {isTe ? `AI స్కోర్: ${matchPercent}%` : `AI Match: ${matchPercent}%`}
            </span>
          </div>

          <p className="text-[11px] text-amber-900/80 pt-0.5">
            {isTe
              ? 'ఖచ్చితమైన పొలం కోఆర్డినేట్స్ గోప్యంగా ఉంచబడ్డాయి. సాధారణ సెక్టార్ సెంట్రాయిడ్ మాత్రమే ఉపయోగించబడింది.'
              : 'Exact farm coordinates are shielded for privacy; only the generalized ~2 km sector centroid was shared.'}
          </p>
        </div>

        {/* Precautions shared */}
        {outbreakAlert.precautions && outbreakAlert.precautions.length > 0 && (
          <div className="p-3 rounded-xl bg-white border border-amber-200 text-amber-950 text-xs space-y-1">
            <span className="font-bold text-[11px] block text-amber-900">
              {isTe ? 'సమీప రైతులకు చేరిన అధికారిక నివారణ చర్యలు (రసాయన రహితం):' : 'Precautions shared with nearby farmers (non-chemical):'}
            </span>
            <p className="leading-relaxed">
              {isTe ? outbreakAlert.precautions[0].actionTe : outbreakAlert.precautions[0].actionEn}
            </p>
          </div>
        )}

        {outbreakAlert.outbreakId && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onOpenRadar(outbreakAlert.outbreakId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Radar className="w-3.5 h-3.5" />
              <span>{isTe ? 'మ్యాప్‌లో రాడార్ చూడండి →' : 'View on Disease Radar Map →'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 7. Status: Pending Confirmation (Fallback if ever needed)
  return (
    <div
      role="region"
      aria-label="Confirm Community Outbreak Alert"
      className="w-full rounded-3xl bg-[#FFFDF5] border-2 border-amber-400 p-5 sm:p-6 shadow-md text-xs space-y-4 my-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 block">
              {isTe ? 'కమ్యూనిటీ తెగులు హెచ్చరిక' : 'Community Outbreak Notice'}
            </span>
            <h4 className="text-sm sm:text-base font-extrabold text-[#14281D]">
              {outbreakAlert.diseaseName}
            </h4>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white border border-amber-300 text-amber-900">
          {isTe ? `AI స్కోర్: ${matchPercent}%` : `AI Match: ${matchPercent}%`}
        </span>
      </div>

      <p className="text-xs text-[#374B3F] leading-relaxed">
        {isTe
          ? 'AI-ఆధారిత పరిశీలన · క్షేత్రస్థాయిలో ధృవీకరించబడలేదు. సమీప రైతులకు ముందస్తు నివారణ సమాచారం పంపబడుతుంది.'
          : 'AI-assisted, not field-confirmed. Nearby farmers within 5 km cultivating susceptible host crops can be alerted with preventive guidelines.'}
      </p>

      {onConfirmSend && (
        <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-amber-200">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              disabled={isSending}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#D9E2CE] text-xs font-bold text-[#4A6052] transition-colors cursor-pointer"
            >
              {isTe ? 'రద్దు చేయండి' : 'Dismiss'}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-xs font-extrabold shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isTe ? 'పంపుతున్నాము...' : 'Broadcasting alert...'}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{isTe ? '5 కి.మీ అలర్ట్ పంపండి' : 'Broadcast 5 km Alert'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
