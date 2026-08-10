"use client";

import { useState, useRef, useCallback } from "react";

interface VoiceHook {
  isListening: boolean;
  transcript: string;
  toggleListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  generatingAudio: boolean;
  autoSpeak: boolean;
  setAutoSpeak: (v: boolean) => void;
  error: string;
}

const SpeechRecognitionAPI = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) || null : null;
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

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
    if (!SpeechRecognitionAPI) { setError("Voice not supported."); return; }
    setError("");
    try {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onstart = () => setIsListening(true);
      rec.onresult = (event: any) => {
        let final = "", interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) final += " " + t;
          else interim += " " + t;
        }
        setTranscript((final || interim).trim());
      };
      rec.onerror = (event: any) => {
        const msgs: Record<string, string> = { "not-allowed": "Mic denied.", "no-speech": "No speech.", "audio-capture": "No mic found." };
        if (event.error !== "aborted") setError(msgs[event.error] || `Voice: ${event.error}`);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch { setError("Mic permission required."); }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else { setTranscript(""); startListening(); }
  }, [isListening, startListening, stopListening]);

  const speakApi = useCallback(async (text: string) => {
    let clean = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`{1,3}[\s\S]*?`{1,3}/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/^\s*[-*+]\s+/gm, "").replace(/^\s*\d+\.\s+/gm, "").replace(/^>\s+/gm, "").replace(/[_~]{1,3}/g, "").replace(/\n{2,}/g, ". ").replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim();
    if (!clean) return;
    setGeneratingAudio(true);
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean }) });
      if (res.ok) {
        const blob = await res.blob();
        setGeneratingAudio(false);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setIsSpeaking(false); speakBrowser(clean); };
        setIsSpeaking(true);
        audio.play().catch(() => { setIsSpeaking(false); speakBrowser(clean); });
        return;
      }
    } catch {}
    setGeneratingAudio(false);
    speakBrowser(clean);
  }, []);

  const speakBrowser = (text: string) => {
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92; u.pitch = 0.85;
    const voices = synth.getVoices();
    const v = voices.find(v => v.lang === "en-US" && v.name.includes("Alex")) || voices.find(v => v.lang.startsWith("en"));
    if (v) u.voice = v;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    synth.speak(u);
  };

  return { isListening, transcript, toggleListening, speak: speakApi, stopSpeaking: () => { setGeneratingAudio(false); if (audioRef.current) { audioRef.current.pause(); } if (synth) synth.cancel(); setIsSpeaking(false); }, isSpeaking, generatingAudio, autoSpeak, setAutoSpeak, error };
}