"use client";

import { useState, useRef, useEffect } from "react";
import { useVoice } from "@/hooks/useVoice";
import SlashMenu from "@/components/SlashMenu";
import { filterCommands } from "@/lib/commands";
import { getSessionId } from "@/lib/auth";

interface ApexMessage {
  id: string;
  role: "apex" | "user";
  text: string;
  timestamp: number;
  searchResults?: any[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ApexMessage[]>([{
    id: "greeting", role: "apex", text: "Good day, sir. APEX is fully operational. How may I be of service?", timestamp: Date.now(),
  }]);
  const [input, setInput] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
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
    if (slashOpen) setSlashOpen(false);
    setInput("");

    const sessionId = getSessionId();
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
        body: JSON.stringify({ text: trimmed, sessionId }),
        signal: controller.signal,
      });
      const reader = res.body?.getReader();
      if (!reader) { setStreaming(false); return; }
      const decoder = new TextDecoder();
      let buffer = ""; let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const l = line.trim(); if (!l.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(l.slice(6));
            if (data.type === "chunk") { fullText += data.text; updateLast(fullText); }
            else if (data.type === "search_results") { updateLast(fullText, data.results); }
            else if (data.type === "system" || data.type === "error") { fullText = data.text; updateLast(data.text); }
            else if (data.type === "end") { setStreaming(false); }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") updateLast("Connection lost, sir.");
      setStreaming(false);
    }
  };

  const updateLast = (text: string, searchResults?: any[]) => {
    setMessages(p => {
      const u = [...p]; const last = u[u.length - 1];
      if (last?.role === "apex") u[u.length - 1] = { ...last, text, searchResults };
      return u;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isListening) return;
    const val = e.target.value;
    setInput(val);
    if (val.startsWith("/") && !val.includes(" ")) {
      setSlashOpen(true);
    } else {
      setSlashOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !slashOpen) { e.preventDefault(); handleSend(); }
  };

  const clearChat = async () => {
    if (abortCtrl) abortCtrl.abort();
    setMessages([{ id: "greeting", role: "apex", text: "Chat cleared. At your service, sir.", timestamp: Date.now() }]);
    await fetch("/api/chat", { method: "DELETE" });
  };

  const quickActions = [
    { label: "Agenda", cmd: "/agenda", icon: "\ud83d\udcc5" },
    { label: "Research", cmd: "/research ", icon: "\ud83d\udd0d" },
    { label: "Briefing", cmd: "tech briefing", icon: "\ud83d\udcf0" },
    { label: "Focus", cmd: "/focus 25m", icon: "\u26a1" },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <header className="h-14 flex items-center px-6 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-glow absolute inline-flex h-full w-full rounded-full bg-accent-glow opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-glow" />
          </span>
          <h2 className="text-sm font-semibold text-text-primary">Chat</h2>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => { setSearchMode(!searchMode); inputRef.current?.focus(); }}
            className={`text-xs px-3 h-8 rounded-lg font-medium transition-all ${searchMode ? "bg-warning/10 text-warning border border-warning/20" : "text-text-tertiary hover:text-text-secondary hover:bg-bg-glass border border-transparent"}`}>
            {searchMode ? "Search ON" : "Search"}
          </button>
          <button onClick={clearChat} className="h-8 w-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-glass transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {messages.length <= 1 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-14 h-14 rounded-2xl accent-gradient-bg flex items-center justify-center mb-5 shadow-lg shadow-accent/20">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-1.5">APEX at your service</h1>
              <p className="text-sm text-text-tertiary mb-8">How can I assist you today, sir?</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {quickActions.map(a => (
                  <button key={a.cmd} onClick={() => { setInput(a.cmd); inputRef.current?.focus(); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-border-default hover:bg-bg-elevated transition-all">
                    <span>{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.filter(m => m.id !== "greeting" || messages.length > 1).map((msg, i) => (
            <div key={msg.id} className={`flex gap-3 animate-fade-in ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "apex" && (
                <div className="w-8 h-8 rounded-xl accent-gradient-bg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white font-bold text-[11px]">A</span>
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white rounded-br-md"
                    : "bg-bg-surface border border-border-subtle rounded-bl-md"
                }`}>
                  <MessageContent text={msg.text} />
                  {msg.role === "apex" && streaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-5 bg-accent-glow ml-0.5 animate-pulse align-middle rounded-sm" />
                  )}
                </div>
                {msg.role === "apex" && msg.text.length > 20 && (
                  <div className="flex items-center gap-2 mt-1.5 ml-1">
                    <button onClick={() => isSpeaking ? stopSpeaking() : speak(msg.text)} disabled={generatingAudio}
                      className="text-[11px] text-text-tertiary hover:text-accent-glow transition-colors">
                      {generatingAudio ? "\u23f3" : isSpeaking ? "\u25a0 Stop" : "\ud83d\udd0a Read"}
                    </button>
                  </div>
                )}
                {msg.searchResults && msg.searchResults.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {msg.searchResults.slice(0, 4).map((r: any, j: number) => (
                      <a key={j} href={r.url} target="_blank" rel="noopener"
                        className="block p-3 rounded-xl bg-bg-glass border border-border-subtle hover:border-accent-border transition-all text-left">
                        <p className="text-xs font-medium text-text-secondary">{r.title}</p>
                        <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-1">{r.content}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border-subtle shrink-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {searchMode && <p className="text-xs text-warning mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-warning" />Search mode — query and press Enter</p>}
          {voiceError && !isListening && <p className="text-xs text-danger mb-2">{voiceError}</p>}
          {isListening && <p className="text-xs text-accent-glow mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent-glow animate-pulse" />Listening — speak now</p>}

          <div className="relative flex items-end gap-2 bg-bg-surface border border-border-default rounded-2xl p-2 focus-within:border-accent-border focus-within:shadow-sm focus-within:shadow-accent/5 transition-all" ref={inputContainerRef}>
            <button onClick={toggleListening} disabled={streaming}
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${
                isListening ? "bg-accent text-white" : "text-text-tertiary hover:text-text-secondary hover:bg-bg-glass"
              }`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <input ref={inputRef} type="text" value={isListening ? transcript || input : input}
              onChange={handleInputChange} onKeyDown={handleKeyDown}
              placeholder={streaming ? "APEX is responding..." : isListening ? "Listening..." : searchMode ? "Search the web..." : "Type / for commands..."}
              disabled={streaming}
              className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-tertiary py-1.5 min-w-0 disabled:opacity-40" />
            <button onClick={handleSend} disabled={!input.trim() || streaming}
              className="shrink-0 accent-gradient-bg text-white w-9 h-9 rounded-xl flex items-center justify-center font-medium disabled:opacity-30 transition-all hover:shadow-md hover:shadow-accent/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
            <SlashMenu
              isOpen={slashOpen && input.startsWith("/")}
              query={input}
              onSelect={(cmd) => { setInput(cmd); setSlashOpen(false); inputRef.current?.focus(); }}
              onClose={() => setSlashOpen(false)}
              inputRef={inputRef}
            />
          </div>

          <div className="flex items-center justify-between mt-2.5 px-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none" title="Auto-speak responses">
                <span className="text-[11px] text-text-tertiary">Auto-speak</span>
                <input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-accent" />
              </label>
            </div>
            <span className="text-[11px] text-text-tertiary">APEX v0.2 — Next.js</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`|\*\*.*?\*\*|\*[^*\n]+\*)/g);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const code = part.slice(3, -3).replace(/^\w*\n?/, "");
          return <code key={i} className="block bg-black/40 rounded-lg px-3 py-2 my-1 text-[12px] font-mono text-accent-glow overflow-x-auto">{code}</code>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="bg-black/30 rounded px-1.5 py-0.5 text-[12px] font-mono text-accent-glow">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i} className="italic text-text-secondary">{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}