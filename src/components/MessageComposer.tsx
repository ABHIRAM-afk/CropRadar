import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Camera, Mic, MicOff, Send, X, Loader2 } from 'lucide-react';
import { Language } from '../types/agricultural';
import { optimizeImageForAnalysis } from '../utils/imageOptimizer';

interface MessageComposerProps {
  onSendMessage: (text: string, imageBase64?: string) => void;
  onOpenCamera: () => void;
  language: Language;
  disabled?: boolean;
  onBeforeAttach?: () => boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onOpenCamera,
  language,
  disabled = false,
  onBeforeAttach,
}) => {
  const isTe = language === 'te';
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        isTe
          ? 'మీ బ్రౌజర్ లో నేరుగా వాయిస్ గుర్తించే సదుపాయం లేదు. దయచేసి టైప్ చేయండి.'
          : 'Voice recognition is not supported in this browser. Please type your message.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = isTe ? 'te-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.result[i][0].transcript;
        }
        if (transcript) {
          setInputText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Speech recognition exception:', e);
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleMic = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizingImage(true);
      const optimized = await optimizeImageForAnalysis(file, 1280, 0.85);
      setAttachedImage(optimized.base64);
    } catch (err) {
      console.warn('Image optimization fallback to direct file reader:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsOptimizingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || disabled || isOptimizingImage) return;

    if (attachedImage && onBeforeAttach && !onBeforeAttach()) {
      return;
    }

    if (isListening) {
      stopVoiceInput();
    }

    onSendMessage(inputText.trim(), attachedImage || undefined);
    setInputText('');
    setAttachedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="sticky bottom-0 z-20 w-full bg-[#F8FAF5]/95 backdrop-blur-md border-t border-[#E2E8D8] px-1.5 min-[360px]:px-2.5 sm:px-6 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] transition-colors shadow-xs overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Attached preview pill */}
        {attachedImage && (
          <div className="mb-2.5 flex items-center gap-2.5 p-2 pr-3 bg-white border border-[#CBD9BE] rounded-2xl w-fit max-w-full shadow-xs">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-[#D9E2CE] bg-[#F3F6EF] shrink-0">
              <img
                src={attachedImage}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left text-xs min-w-0 flex-1">
              <p className="font-bold text-[#14281D] truncate">
                {isTe ? 'పంట చిత్రం సిద్ధంగా ఉంది' : 'Photo optimized for AI analysis'}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#5C6F64] truncate">
                {isTe ? 'పంట తెగులు లేదా రసాయన లేబుల్' : 'Crop pathology or pesticide label'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              aria-label="Remove attached image"
              className="p-1.5 text-[#7E9085] hover:text-rose-600 rounded-lg ml-1 cursor-pointer transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Image optimization loader */}
        {isOptimizingImage && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-[#EAEFE2] border border-[#CBD9BE] rounded-xl text-xs text-[#256E3A]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#256E3A] shrink-0" />
            <span className="truncate">{isTe ? 'చిత్రాన్ని వేగవంతమైన AI విశ్లేషణ కోసం పరిమాణం తగ్గిస్తున్నాము...' : 'Optimizing and compressing image for fast Gemini analysis...'}</span>
          </div>
        )}

        {/* Listening banner */}
        {isListening && (
          <div className="mb-2 flex items-center justify-between px-3.5 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs animate-pulse">
            <div className="flex items-center gap-2 font-bold truncate">
              <Mic className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                {isTe ? 'వింటున్నాము... మాట్లాడండి' : 'Listening... Speak in Telugu or English'}
              </span>
            </div>
            <button
              type="button"
              onClick={stopVoiceInput}
              className="text-xs underline font-bold text-emerald-800 cursor-pointer shrink-0 ml-2"
            >
              {isTe ? 'ఆపండి' : 'Done'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-1 sm:gap-2 min-w-0 w-full">
          {/* 1. Attachment Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => {
              if (onBeforeAttach && !onBeforeAttach()) return;
              fileInputRef.current?.click();
            }}
            disabled={disabled || isOptimizingImage}
            title={isTe ? 'ఫోటో లేదా డాక్యుమెంట్ జోడించండి' : 'Attach crop photo or label'}
            aria-label="Attach file or photo"
            style={{ flexShrink: 0 }}
            className="flex items-center justify-center w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 sm:w-10 sm:h-10 rounded-2xl bg-white hover:bg-[#F3F6EF] border border-[#D9E2CE] text-[#4A6052] hover:text-[#256E3A] transition-colors disabled:opacity-50 cursor-pointer shrink-0 shadow-xs"
          >
            <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* 2. Camera Button */}
          <button
            type="button"
            onClick={() => {
              if (onBeforeAttach && !onBeforeAttach()) return;
              onOpenCamera();
            }}
            disabled={disabled || isOptimizingImage}
            title={isTe ? 'కెమెరాతో ఫోటో తీయండి' : 'Take a photo with camera'}
            aria-label="Open camera"
            style={{ flexShrink: 0 }}
            className="flex items-center justify-center w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 sm:w-10 sm:h-10 rounded-2xl bg-white hover:bg-[#F3F6EF] border border-[#D9E2CE] text-[#4A6052] hover:text-[#256E3A] transition-colors disabled:opacity-50 cursor-pointer shrink-0 shadow-xs"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* 3. Text Input (Message Composer) */}
          <div className="flex-1 relative flex items-center min-w-0" style={{ minWidth: 0, width: 0, flex: '1 1 0%' }}>
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={
                isTe
                  ? 'సందేహం లేదా ఫోటో...'
                  : 'Ask question or upload leaf...'
              }
              style={{ minWidth: 0 }}
              className="w-full resize-none py-1.5 sm:py-2.5 pl-2 sm:pl-3 pr-2 sm:pr-3 bg-white text-[#14281D] placeholder:text-[#7E9085] rounded-2xl border border-[#D9E2CE] focus:border-[#256E3A] focus:ring-1 focus:ring-[#256E3A] focus:outline-none text-base sm:text-sm max-h-24 transition-colors font-sans shadow-xs leading-normal"
            />
          </div>

          {/* 4. Microphone Button */}
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled}
            title={
              isListening
                ? isTe ? 'రికార్డింగ్ ఆపండి' : 'Stop listening'
                : isTe ? 'మైక్రోఫోన్ ద్వారా మాట్లాడండి' : 'Speak in Telugu or English'
            }
            aria-label="Voice input"
            style={{ flexShrink: 0 }}
            className={`flex items-center justify-center w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 sm:w-10 sm:h-10 rounded-2xl border transition-all cursor-pointer shrink-0 shadow-xs ${
              isListening
                ? 'bg-rose-100 border-rose-400 text-rose-700 animate-pulse'
                : 'bg-white hover:bg-[#F3F6EF] border-[#D9E2CE] text-[#4A6052] hover:text-[#256E3A]'
            } disabled:opacity-50`}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* 5. Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !attachedImage) || disabled || isOptimizingImage}
            aria-label="Send message"
            style={{ flexShrink: 0 }}
            className="flex items-center justify-center w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#256E3A] hover:bg-[#1E582E] text-white font-bold shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
