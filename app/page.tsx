"use client";

import { useState, useRef, useEffect } from "react";
import { useVoice } from "@/hooks/useVoice";

interface ApexMessage {
  id: string;
  role: "apex" | "user";
  text: string;
  timestamp: number;
  searchResults?: any[];
  searchAnswer?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ApexMessage[]>([{
    id: "greeting", role: "apex", text: "Good day, sir. APEX is fully operational. How may I be of service?", timestamp: Date.now(),
  }]);
  const [input, setInput] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, transcript, toggleListening, speak, stopSpeaking, isSpeaking, generatingAudio, autoSpeak, setAutoSpeak, error: voiceError } = useVoice();
  const lastApexId = useRef("");

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!streaming && messages.length > 0 && autoSpeak) {
      const last = messages[messages.length - 1];
      if (last.role === "apex" && last.text && last.id !== lastApexId.current) {
        lastApexId.current = last.id;
        speak(last.text);
      }
    }
  }, [streaming, autoSpeak]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    if (isListening) toggleListening();
    setInput("");

    const userMsg: ApexMessage = { id: `user-${Date.now()}`, role: "user", text: trimmed, timestamp: Date.now() };
    setMessages(p => [...p, userMsg]);

    setStreaming(true);
    const controller = new AbortController();
    setAbortCtrl(controller);
    const apexId = `apex-${Date.now()}`;
    setMessages(p => [...p, { id: apexId, role: "apex", text: "", timestamp: Date.now() }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
        signal: controller.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) { setStreaming(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(l.slice(6));
            if (data.type === "chunk") {
              fullText += data.text;
              updateLast(fullText);
            } else if (data.type === "search_results") {
              updateLast(fullText, data.results, data.answer);
            } else if (data.type === "system" || data.type === "error") {
              fullText = data.text;
              updateLast(data.text);
            } else if (data.type === "start") {
              // ignore
            } else if (data.type === "end") {
              setStreaming(false);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") updateLast("Connection lost. Please try again.");
      setStreaming(false);
    }
  };

  const updateLast = (text: string, searchResults?: any[], searchAnswer?: string) => {
    setMessages(p => {
      const updated = [...p];
      const last = updated[updated.length - 1];
      if (last?.role === "apex") {
        updated[updated.length - 1] = { ...last, text, searchResults, searchAnswer };
      }
      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const clearChat = async () => {
    if (abortCtrl) abortCtrl.abort();
    setMessages([{ id: "greeting", role: "apex", text: "Chat cleared, sir. How may I assist?", timestamp: Date.now() }]);
    await fetch("/api/chat", { method: "DELETE" });
  };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-apex-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Chat</h2>
          <p className="text-sm text-gray-500">At your service, sir.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} className="w-3 h-3 accent-apex-cyan" />
            <span className="text-[10px] text-gray-500 hidden sm:inline">Auto</span>
          </label>
          <button onClick={() => { setSearchMode(!searchMode); inputRef.current?.focus(); }} className={`text-xs px-3 py-1.5 rounded-md ${searchMode ? "bg-apex-amber/10 text-apex-amber border border-apex-amber/30" : "text-gray-500 border border-transparent hover:text-gray-300"}`}>
            {searchMode ? "Search" : "Search"}
          </button>
          <button onClick={clearChat} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length <= 1 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 rounded-full bg-apex-blue/10 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-apex-cyan">A</span>
            </div>
            <p className="text-lg font-medium text-gray-400 mb-2">APEX at your service</p>
            <p className="text-sm mb-6">How can I assist you today, sir?</p>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {["/agenda", "/research quantum computing", "/stock AAPL", "/focus 25m coding"].map(p => (
                <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }} className="text-left text-sm text-gray-400 bg-apex-surface border border-apex-border rounded-lg px-3 py-2 hover:border-apex-cyan hover:text-gray-200 transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${msg.role === "apex" ? "bg-apex-blue/20 text-apex-cyan" : "bg-apex-amber/20 text-apex-amber"}`}>
              {msg.role === "apex" ? "A" : "U"}
            </div>
            <div className={`rounded-lg px-4 py-3 max-w-2xl ${msg.role === "user" ? "bg-apex-blue/10 border border-apex-blue/20" : "bg-apex-surface border border-apex-border"}`}>
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {msg.text}
                {msg.role === "apex" && streaming && msg.id === messages[messages.length - 1]?.id && (
                  <span className="inline-block w-1.5 h-4 bg-apex-cyan ml-0.5 animate-pulse align-middle" />
                )}
              </p>
              {msg.role === "apex" && msg.text.length > 20 && (
                <button onClick={() => isSpeaking ? stopSpeaking() : speak(msg.text)} disabled={generatingAudio} className="mt-2 text-[10px] text-gray-500 hover:text-apex-cyan transition-colors">
                  {generatingAudio ? "\u23f3 Generating..." : isSpeaking ? "\u25a0 Stop" : "\ud83d\udd0a Read aloud"}
                </button>
              )}
              {msg.searchResults && msg.searchResults.length > 0 && (
                <div className="mt-3 pt-3 border-t border-apex-border space-y-2">
                  {msg.searchResults.map((r: any, i: number) => (
                    <a key={i} href={r.url} target="_blank" className="block p-2 rounded bg-black/20 border border-apex-border hover:border-apex-cyan/50 transition-colors">
                      <p className="text-xs font-medium text-gray-300 hover:text-apex-cyan">{r.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{r.content}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-apex-border p-4 shrink-0">
        {searchMode && <p className="text-xs text-apex-amber mb-2">Search mode — type query and press Enter</p>}
        {voiceError && !isListening && <p className="text-xs text-red-400 mb-2">{voiceError}</p>}
        {isListening && <p className="text-xs text-apex-cyan mb-2">\u25cf Listening — speak now</p>}
        <div className="flex gap-3 items-center">
          <button onClick={toggleListening} disabled={streaming} className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isListening ? "bg-apex-cyan/20 text-apex-cyan border border-apex-cyan/30" : "bg-apex-surface border border-apex-border text-gray-500 hover:text-apex-cyan hover:border-apex-cyan"}`}>
            \ud83c\udf99
          </button>
          <input ref={inputRef} type="text" value={isListening ? transcript || input : input} onChange={e => { if (!isListening) setInput(e.target.value); }} onKeyDown={handleKeyDown}
            placeholder={streaming ? "APEX is responding..." : isListening ? "Listening..." : searchMode ? "Search the web..." : "Message APEX..."}
            disabled={streaming}
            className={`flex-1 border rounded-lg px-4 py-3 text-sm focus:outline-none ${searchMode ? "bg-black/30 border-apex-amber/30 placeholder-apex-amber/30 focus:border-apex-amber" : "bg-apex-surface border-apex-border placeholder-gray-500 focus:border-apex-cyan"} text-gray-200`}
          />
          <button onClick={handleSend} disabled={!input.trim() || streaming}
            className={`shrink-0 px-6 py-3 rounded-lg font-medium text-sm disabled:opacity-50 ${searchMode ? "bg-apex-amber hover:bg-amber-600 text-black" : "bg-apex-blue hover:bg-apex-cyan text-white"}`}>
            {searchMode ? "Search" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}