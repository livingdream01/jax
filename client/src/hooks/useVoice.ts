import { useState, useRef, useCallback } from "react";

interface VoiceHook {
  isListening: boolean;
  transcript: string;
  listeningForWake: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  autoSpeak: boolean;
  setAutoSpeak: (v: boolean) => void;
  error: string;
}

const SpeechRecognitionAPI =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

export function useVoice(): VoiceHook {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listeningForWake, setListeningForWake] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<any>(null);

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

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) {
            finalText += " " + text;
          } else {
            interimText += " " + text;
          }
        }

        const displayText = finalText || interimText;
        if (displayText) {
          setTranscript(displayText.trim());
        }

        if (finalText.trim()) {
          setTranscript(finalText.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error, event.message);
        if (event.error === "not-allowed") {
          setError("Microphone access denied. Check your browser permissions.");
        } else if (event.error === "no-speech") {
          setError("No speech detected. Try again.");
        } else if (event.error === "audio-capture") {
          setError("No microphone found.");
        } else if (event.error !== "aborted") {
          setError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
        setListeningForWake(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setListeningForWake(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setError("Failed to start voice. Check microphone permissions.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setListeningForWake(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      setTranscript("");
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const speak = useCallback((text: string) => {
    if (!synth) return;
    synth.cancel();

    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/#{1,6}\s/g, "")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1;

    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => v.lang === "en-GB" && v.name.includes("Daniel")) ||
      voices.find((v) => v.lang === "en-GB") ||
      voices.find((v) => v.lang.startsWith("en"));

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    listeningForWake,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    isSpeaking,
    autoSpeak,
    setAutoSpeak,
    error,
  };
}
