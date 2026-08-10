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
  autoSpeak: boolean;
  setAutoSpeak: (v: boolean) => void;
}

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const synth = window.speechSynthesis;

export function useVoice(): VoiceHook {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        final += event.results[i][0].transcript;
      }
      setTranscript(final);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const speak = useCallback(
    (text: string) => {
      if (!synth) return;

      synth.cancel();
      const cleanText = text.replace(/\*\*/g, "").replace(/`/g, "").replace(/#{1,6}\s/g, "").trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      const voices = synth.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en") && (v.name.includes("Daniel") || v.name.includes("Male") || v.name.includes("Google UK")),
      ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synth.speak(utterance);
    },
    [],
  );

  const stopSpeaking = useCallback(() => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    isSpeaking,
    autoSpeak,
    setAutoSpeak,
  };
}
