import { useState, useRef, useCallback } from "react";

interface VoiceHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  generatingAudio: boolean;
  autoSpeak: boolean;
  setAutoSpeak: (v: boolean) => void;
  error: string;
}

const SpeechRecognitionAPI =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function useVoice(): VoiceHook {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError("Voice not supported in this browser. Try Chrome or Safari.");
      return;
    }
    setError("");
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) { finalText += " " + text; }
          else { interimText += " " + text; }
        }
        const displayText = (finalText || interimText).trim();
        if (displayText) setTranscript(displayText);
        if (finalText.trim()) setTranscript(finalText.trim());
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setError("Microphone access denied.");
        } else if (event.error === "no-speech") {
          setError("No speech detected. Try again.");
        } else if (event.error === "audio-capture") {
          setError("No microphone found.");
        } else if (event.error !== "aborted") {
          setError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setError("Failed to start voice. Check microphone permissions.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) { stopListening(); }
    else { setTranscript(""); startListening(); }
  }, [isListening, startListening, stopListening]);

  const speakApi = useCallback(async (text: string) => {
    const cleanText = text.replace(/\*\*/g, "").replace(/`/g, "").replace(/#{1,6}\s/g, "").trim();
    if (!cleanText) return;

    setGeneratingAudio(true);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText }),
      });

      if (res.ok) {
        const blob = await res.blob();
        setGeneratingAudio(false);
        setIsSpeaking(true);

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setIsSpeaking(false); speakBrowser(cleanText); URL.revokeObjectURL(url); };
        audio.play().catch(() => { setIsSpeaking(false); speakBrowser(cleanText); });
        return;
      }
    } catch {
      // Fall through to browser TTS
    }
    setGeneratingAudio(false);
    speakBrowser(cleanText);
  }, []);

  const speakBrowser = (cleanText: string) => {
    if (!synth || !cleanText) return;

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.92;
    utterance.pitch = 0.85;
    utterance.volume = 1;

    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => v.lang === "en-US" && v.name.includes("Alex")) ||
      voices.find((v) => v.lang === "en-US" && v.name.includes("Fred")) ||
      voices.find((v) => v.lang === "en-GB" && v.name.includes("Daniel")) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  };

  const stopSpeaking = useCallback(() => {
    setGeneratingAudio(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (synth) synth.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    speak: speakApi,
    stopSpeaking,
    isSpeaking,
    generatingAudio,
    autoSpeak,
    setAutoSpeak,
    error,
  };
}
