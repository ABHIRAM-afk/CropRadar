import React, { useState } from 'react';
import {
  Radar,
  Globe,
  LogIn,
  UserCheck,
  Shield,
  Sprout,
  ArrowRight,
  AlertCircle,
  Mail,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Language } from '../types/agricultural';
import { signInWithGoogle, getSupabaseClient } from '../lib/supabaseClient';
import cropRadarLoginImg from '../assets/images/crop_radar_login.jpg';

interface LoginPageProps {
  language: Language;
  onToggleLanguage: () => void;
  onGuestLogin: () => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  language,
  onToggleLanguage,
  onGuestLogin,
}) => {
  const isTe = language === 'te';
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [isSigningInGuest, setIsSigningInGuest] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setIsSigningInGoogle(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      const msg = String(err?.message || 'Google sign-in could not be started.');
      if (msg.toLowerCase().includes('unsupported provider') || msg.toLowerCase().includes('disabled')) {
        setErrorMessage(
          isTe
            ? 'గూగుల్ ప్రొవైడర్ సుపాబేస్‌లో కాన్ఫిగర్ చేయబడలేదు. మీరు అతిథిగా లేదా ఇమెయిల్‌తో ప్రవేశించవచ్చు.'
            : 'Google Sign-in is not enabled in Supabase settings. You can continue as Guest or use email.'
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGuestAuth = async () => {
    setErrorMessage('');
    setIsSigningInGuest(true);
    try {
      await onGuestLogin();
    } catch (err: any) {
      console.warn('Guest sign-in error:', err);
      setErrorMessage(
        isTe ? 'అతిథి సెషన్ ప్రారంభించడంలో లోపం ఏర్పడింది.' : 'Could not create guest session. Please try again.'
      );
    } finally {
      setIsSigningInGuest(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setErrorMessage(isTe ? 'దయచేసి సరైన ఇమెయిల్ చిరునామా నమోదు చేయండి.' : 'Please enter a valid email address.');
      return;
    }

    setErrorMessage('');
    setIsSendingOtp(true);
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error('Supabase client is not available.');

      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      setOtpSent(true);
    } catch (err: any) {
      console.warn('Email OTP error:', err);
      setErrorMessage(err?.message || (isTe ? 'ఇమెయిల్ లింక్ పంపడంలో విఫలమైంది.' : 'Failed to send login link.'));
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6FAF1] text-[#14281D] flex flex-col justify-between font-sans">
      {/* Top Header with Brand & Language Toggle */}
      <header className="w-full bg-[#F8FAF5]/95 backdrop-blur-md border-b border-[#E2E8D8] px-4 lg:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#256E3A]/15 to-[#65A30D]/20 border border-[#256E3A]/30 text-[#256E3A] shadow-xs">
              <Radar className="w-5 h-5 text-[#256E3A]" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#65A30D]"></span>
              </span>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#14281D] flex items-center gap-1.5">
                CropRadar{' '}
                <span className="text-[#256E3A] font-black text-xs sm:text-sm px-1.5 py-0.5 rounded bg-[#256E3A]/10 border border-[#256E3A]/20">
                  AI
                </span>
              </h1>
              <p className="text-[11px] text-[#4A6052] font-medium hidden sm:block">
                {isTe ? 'పంట ఆరోగ్యం & కమ్యూనిటీ రాడార్' : 'Intelligent Crop Pathology & Community Radar'}
              </p>
            </div>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={`Switch language to ${isTe ? 'English' : 'Telugu'}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#256E3A]/10 hover:bg-[#256E3A]/20 border border-[#256E3A]/30 text-[#256E3A] text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isTe ? 'English' : 'తెలుగు'}</span>
          </button>
        </div>
      </header>

      {/* Main Login Workspace: Side-by-Side on Desktop, Stacked on Mobile */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-10 flex items-center justify-center">
        <div className="w-full bg-white border border-[#E2E8D8] rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* Left Column (Desktop) / Top Banner (Mobile): Provided Crop Radar Image */}
          <div className="relative bg-[#1E3B27] flex flex-col justify-end p-6 sm:p-8 min-h-[260px] sm:min-h-[360px] md:min-h-[580px] overflow-hidden">
            <img
              src={cropRadarLoginImg}
              alt="Indian farmers managing healthy crops with Crop Radar"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Elegant dark gradient scrim over the image for readable text */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A10]/90 via-[#0A1A10]/40 to-transparent"></div>

            {/* Floating Banner content on the image */}
            <div className="relative z-10 space-y-3 text-white">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-xs">
                <Sprout className="w-3.5 h-3.5 text-lime-400" />
                <span>{isTe ? 'రైతులకు సాంకేతిక అండ' : 'Smart Agricultural Companion'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                {isTe ? 'మీ పొలానికి నమ్మకమైన డిజిటల్ వ్యవసాయ సహాయకుడు' : 'Intelligent Crop Protection for Every Indian Farmer'}
              </h2>
              <p className="text-xs sm:text-sm text-lime-100/90 leading-relaxed max-w-md hidden sm:block">
                {isTe
                  ? 'ఆకు ఫోటోతో తక్షణ వ్యాధి నిర్ధారణ, లేబుల్ మోతాదులు, 5 కి.మీ కమ్యూనిటీ రాడార్ మరియు స్ప్రే వాతావరణ హెచ్చరికలు.'
                  : 'Real-time leaf disease diagnosis, pesticide label scanning, spray weather windows, and 5 km community outbreak radar.'}
              </p>
            </div>
          </div>

          {/* Right Column: Authentication Form Card */}
          <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-center space-y-6">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#256E3A] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>{isTe ? 'సురక్షిత లాగిన్' : 'Welcome to CropRadar'}</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#14281D] tracking-tight">
                {isTe ? 'లాగిన్ చేయండి' : 'Sign in to continue'}
              </h3>
              <p className="text-xs sm:text-sm text-[#5C6F64] leading-relaxed">
                {isTe
                  ? 'మీ పంటల సంభాషణలు, ఫీల్డ్ డైరీ మరియు వాతావరణ సలహాలను భద్రపరచుకోండి.'
                  : 'Manage separate crop conversations, field diaries, and community alerts.'}
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">{errorMessage}</p>
              </div>
            )}

            {/* Primary Action 1: Google OAuth Sign-in */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSigningInGoogle || isSigningInGuest}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white hover:bg-[#F3F6EF] border border-[#CBD9BE] text-[#14281D] text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                {isSigningInGoogle ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#256E3A]" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {isSigningInGoogle
                    ? isTe
                      ? 'గూగుల్ లాగిన్ ప్రారంభమవుతోంది...'
                      : 'Connecting with Google...'
                    : isTe
                    ? 'గూగుల్ ఖాతాతో లాగిన్ చేయండి'
                    : 'Sign in with Google'}
                </span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-[#E2E8D8] w-full"></div>
                <span className="bg-white px-3 text-[11px] uppercase font-bold text-[#7E9085]">
                  {isTe ? 'లేదా' : 'or continue as'}
                </span>
                <div className="border-t border-[#E2E8D8] w-full"></div>
              </div>

              {/* Primary Action 2: Continue as Guest */}
              <button
                type="button"
                onClick={handleGuestAuth}
                disabled={isSigningInGuest || isSigningInGoogle}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#256E3A] hover:bg-[#1E582E] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
              >
                {isSigningInGuest ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <UserCheck className="w-4 h-4 text-lime-300" />
                )}
                <span>
                  {isSigningInGuest
                    ? isTe
                      ? 'అతిథి సెషన్ సిద్ధమవుతోంది...'
                      : 'Setting up guest session...'
                    : isTe
                    ? 'అతిథి రైతుగా కొనసాగండి (ఖాతా అవసరం లేదు)'
                    : 'Continue as Guest Farmer'}
                </span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-80" />
              </button>
            </div>

            {/* Optional Email Sign-in */}
            <div className="pt-2 border-t border-[#EAEFE2]">
              {otpSent ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{isTe ? 'లాగిన్ లింక్ పంపబడింది!' : 'Login link sent!'}</span>
                    <p className="mt-0.5">{emailInput} {isTe ? 'ఇన్‌బాక్స్‌ని పరిశీలించండి.' : 'Check your email inbox to log in.'}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-2">
                  <span className="text-[11px] font-bold text-[#4A6052] block">
                    {isTe ? 'లేదా మీ ఇమెయిల్‌తో సైన్ ఇన్ అవ్వండి:' : 'Or sign in with email link:'}
                  </span>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#7E9085]" />
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={isTe ? 'మీ ఇమెయిల్ చిరునామా' : 'farmer@example.com'}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#FBFDF9] border border-[#D9E2CE] rounded-xl text-[#14281D] focus:ring-2 focus:ring-[#256E3A] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSendingOtp}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F3F6EF] border border-[#CBD9BE] text-[#14281D] text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      {isSendingOtp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#256E3A]" />
                      ) : (
                        <span>{isTe ? 'పంపండి' : 'Send'}</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Privacy Guarantee Footer */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-[#5C6F64]">
              <Shield className="w-4 h-4 text-[#256E3A] shrink-0" />
              <span>
                {isTe
                  ? 'మీ పొలం సమాచారం సురక్షితం. ఖచ్చితమైన GPS ఎప్పుడూ ఇతరులతో పంచుకోబడదు.'
                  : 'Private & secure. Exact coordinates are shielded; only ~2 km generalized centroids are used for community alerts.'}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-[#7E9085] border-t border-[#EAEFE2] bg-[#F8FAF5]">
        <p>© 2026 CropRadar AI · Sustainable Integrated Pest Management (ICAR & ANGRAU Standards)</p>
      </footer>
    </div>
  );
};

