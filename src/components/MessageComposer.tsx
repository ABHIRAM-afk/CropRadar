import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Camera, Mic, MicOff, Send, X, Image as ImageIcon } from 'lucide-react';
import { Language } from '../types/agricultural';

interface MessageComposerProps {
  onSendMessage: (text: string, imageBase64?: string) => void;
  onOpenCamera: () => void;
  language: Language;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onOpenCamera,
  language,
  disabled = false,
}) => {
  const isTe = language === 'te';
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

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
          transcript += event.results[i][0].transcript;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || disabled) return;

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
    <div className="sticky bottom-0 z-20 w-full bg-[#080D1B]/95 backdrop-blur-lg border-t border-slate-800/80 px-3 sm:px-6 py-3 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Attached preview pill */}
        {attachedImage && (
          <div className="mb-2 flex items-center gap-2 p-1.5 pr-3 bg-slate-900 border border-slate-700/80 rounded-xl w-fit">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
              <img
                src={attachedImage}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left text-xs">
              <p className="font-semibold text-slate-200">
                {isTe ? 'చిత్రం జోడించబడింది' : 'Image attached'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isTe ? 'పంట తెగులు లేదా మందు లేబుల్' : 'Crop pathology or chemical label'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              aria-label="Remove attached image"
              className="p-1 text-slate-400 hover:text-rose-400 rounded-lg ml-1 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Listening banner */}
        {isListening && (
          <div className="mb-2 flex items-center justify-between px-3 py-1.5 bg-emerald-950/70 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs animate-pulse">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>
                {isTe ? 'వింటున్నాము... మాట్లాడండి (తెలుగు)' : 'Listening... Speak in English or Telugu'}
              </span>
            </div>
            <button
              type="button"
              onClick={stopVoiceInput}
              className="text-[11px] underline font-semibold text-emerald-200 cursor-pointer"
            >
              {isTe ? 'ఆపండి' : 'Done'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Attachment Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title={isTe ? 'ఫోటో లేదా డాక్యుమెంట్ జోడించండి' : 'Attach crop photo or label'}
            aria-label="Attach file or photo"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-emerald-400 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* 2. Camera Button */}
          <button
            type="button"
            onClick={onOpenCamera}
            disabled={disabled}
            title={isTe ? 'కెమెరాతో ఫోటో తీయండి' : 'Take a photo with camera'}
            aria-label="Open camera"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-emerald-400 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* 3. Text Input (Message Composer) */}
          <div className="flex-1 relative flex items-center">
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={
                isTe
                  ? 'మీ పంట సమస్యను అడగండి లేదా ఫోటో పంపండి...'
                  : 'Ask about your crop, spray timing, or upload a photo...'
              }
              className="w-full resize-none py-2.5 pl-3.5 pr-3 bg-slate-900/90 text-slate-100 placeholder:text-slate-500 rounded-xl border border-slate-700/80 focus:border-emerald-500 focus:outline-none text-xs sm:text-sm max-h-24 transition-colors font-sans"
            />
          </div>

          {/* 4. Microphone Button (Telugu / English Voice) */}
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled}
            title={
              isListening
                ? isTe
                  ? 'రికార్డింగ్ ఆపండి'
                  : 'Stop listening'
                : isTe
                ? 'మైక్రోఫోన్ ద్వారా మాట్లాడండి'
                : 'Speak in Telugu or English'
            }
            aria-label="Voice input"
            className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-emerald-400'
            } disabled:opacity-50`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* 5. Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !attachedImage) || disabled}
            aria-label="Send message"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
