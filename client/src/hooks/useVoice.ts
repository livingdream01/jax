import { useState, useRef, useCallback, useEffect } from "react";

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
  wakeWordDetected: boolean;
  wakePhrase: string;
  setWakePhrase: (p: string) => void;
}

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const synth = window.speechSynthesis;

export function useVoice(): VoiceHook {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [wakePhrase, setWakePhrase] = useState("hey apex");

  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResultRef = useRef("");

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setIsListening(false);
      // Auto-restart on error
      setTimeout(() => {
        if (recognitionRef.current === recognition) {
          try { recognition.start(); } catch {}
        }
      }, 500);
    };
    recognition.onend = () => {
      // Auto-restart if still in listening mode
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch {}
      } else {
        setIsListening(false);
      }
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim().toLowerCase();
        if (result.isFinal) {
          final += " " + text;
        } else {
          interim += " " + text;
        }
      }

      const combined = (final || interim).trim();
      if (!combined) return;

      lastResultRef.current = combined;

      // Wake word detection
      const wakeRegex = new RegExp(`\\b(hey\\s+)?${wakePhrase.replace("hey ", "")}\\b`, "i");
      if (!wakeWordDetected && wakeRegex.test(combined)) {
        setWakeWordDetected(true);
        setTranscript("");
        // Play a subtle acknowledgment
        const beep = new AudioContext();
        const osc = beep.createOscillator();
        const gain = beep.createGain();
        osc.connect(gain);
        gain.connect(beep.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.value = 0.05;
        osc.start();
        setTimeout(() => { osc.stop(); beep.close(); }, 150);

        // Capture what follows the wake word
        const afterWake = combined.replace(wakeRegex, "").trim();
        if (afterWake) {
          setTranscript(afterWake);
          stopListening();
          return;
        }
        return;
      }

      // After wake word, capture the command
      if (wakeWordDetected && final) {
        const afterWake = final.replace(wakeRegex, "").trim();
        if (afterWake) {
          setTranscript(afterWake);
          setWakeWordDetected(false);
          stopListening();
        }
      }

      // Reset silence timer
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      silenceTimeoutRef.current = setTimeout(() => {
        setWakeWordDetected(false);
      }, 8000);
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}

    // Reset wake state after 8s of no speech
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
  }, [wakeWordDetected, wakePhrase]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try { rec.abort(); } catch {}
    }
    setIsListening(false);
    setWakeWordDetected(false);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const speak = useCallback((text: string) => {
    if (!synth) return;

    synth.cancel();
    const cleanText = text.replace(/\*\*/g, "").replace(/`/g, "").replace(/#{1,6}\s/g, "").trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    // Load voices if needed and pick the best available
    const loadVoicesAndSpeak = () => {
      const voices = synth.getVoices();
      if (voices.length === 0) {
        setTimeout(loadVoicesAndSpeak, 100);
        return;
      }
      const preferred = voices.find(
        (v) => v.name.includes("Daniel") || v.name.includes("Google UK Male") || v.name.includes("Arthur"),
      ) || voices.find((v) => v.lang.startsWith("en-GB")) || voices.find((v) => v.lang.startsWith("en-US"));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synth.speak(utterance);
    };
    loadVoicesAndSpeak();
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synth) { synth.cancel(); setIsSpeaking(false); }
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
    wakeWordDetected,
    wakePhrase,
    setWakePhrase,
  };
}
