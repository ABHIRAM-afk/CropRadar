import { Language } from '../types/agricultural';

let currentAudio: HTMLAudioElement | null = null;

/**
 * Universal speech player for Telugu and English.
 * Prioritizes server-side high-fidelity Gemini TTS (WAV) which guarantees
 * natural Telugu voice output on all devices and browsers, then falls back
 * to browser SpeechSynthesis.
 */
export async function playAgriculturalSpeech(
  text: string,
  language: Language,
  onStart: () => void,
  onEnd: () => void,
  onError?: (err: any) => void
): Promise<() => void> {
  // If already playing audio, stop it
  stopAgriculturalSpeech();

  onStart();

  // Try server-side TTS first
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.audioBase64) {
        const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
        const audio = new Audio(audioSrc);
        currentAudio = audio;

        audio.onended = () => {
          currentAudio = null;
          onEnd();
        };

        audio.onerror = (e) => {
          console.warn('Audio playback error, falling back to speech synthesis:', e);
          currentAudio = null;
          fallbackSpeechSynthesis(text, language, onEnd, onError);
        };

        await audio.play();
        return () => stopAgriculturalSpeech();
      }
    }
  } catch (err) {
    console.warn('Server TTS failed, falling back to browser SpeechSynthesis:', err);
  }

  // Fallback to browser SpeechSynthesis
  fallbackSpeechSynthesis(text, language, onEnd, onError);
  return () => stopAgriculturalSpeech();
}

export function stopAgriculturalSpeech(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudio = null;
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function fallbackSpeechSynthesis(
  text: string,
  language: Language,
  onEnd: () => void,
  onError?: (err: any) => void
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'te' ? 'te-IN' : 'en-IN';
    utterance.rate = 0.95;

    // Pick Telugu voice if browser happens to have one
    const voices = window.speechSynthesis.getVoices();
    if (language === 'te') {
      const teVoice = voices.find((v) => v.lang.includes('te') || v.name.toLowerCase().includes('telugu'));
      if (teVoice) {
        utterance.voice = teVoice;
      }
    }

    utterance.onend = () => onEnd();
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      onEnd();
      if (onError) onError(e);
    };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('SpeechSynthesis error:', e);
    onEnd();
    if (onError) onError(e);
  }
}
