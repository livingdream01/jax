import { useState, useRef, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { useVoice } from "../hooks/useVoice";

export default function Chat() {
  const { messages, connected, streaming, sendMessage, sendBriefing, sendSearch, clearChat } = useChat();
  const {
    isListening,
    transcript,
    toggleListening,
    speak,
    stopSpeaking,
    isSpeaking,
    generatingAudio,
    autoSpeak,
    setAutoSpeak,
    error: voiceError,
  } = useVoice();

  const [input, setInput] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send when voice input captured a complete phrase
  const prevListeningRef = useRef(isListening);
  useEffect(() => {
    if (!isListening && prevListeningRef.current && transcript.trim()) {
      const command = transcript.trim();
      if (command.startsWith("search ") || command.startsWith("look up ")) {
        sendSearch(command.replace(/^(search |look up )/, ""));
      } else {
        sendMessage(command);
      }
    }
    prevListeningRef.current = isListening;
  }, [isListening, transcript]);

  let lastApexId = useRef("");

  useEffect(() => {
    if (!streaming && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "jax" && last.text && last.id !== lastApexId.current && autoSpeak) {
        lastApexId.current = last.id;
        speak(last.text);
      }
    }
  }, [streaming]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    if (isListening) toggleListening();
    if (searchMode) {
      sendSearch(trimmed);
      setSearchMode(false);
    } else {
      sendMessage(trimmed);
    }
    setInput("");
  };

  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    "What can you do for me, Apex?",
    "/research quantum computing market 2026",
    "Search latest AI breakthroughs",
    "Give me a tech news briefing",
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-apex-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Chat with Apex</h2>
          <p className="text-sm text-gray-500">Your personal assistant — at your service, sir.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer" title="Auto-speak responses">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="w-3 h-3 accent-apex-cyan"
            />
            <span className="text-[10px] text-gray-500 hidden sm:inline">Auto</span>
          </label>
          <button
            onClick={() => { setSearchMode(!searchMode); inputRef.current?.focus(); }}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              searchMode
                ? "bg-apex-amber/10 text-apex-amber border border-apex-amber/30"
                : "text-gray-500 border border-transparent hover:text-gray-300"
            }`}
          >
            {searchMode ? "Search" : "Search"}
          </button>
          <button
            onClick={() => sendBriefing()}
            disabled={streaming}
            className="text-xs bg-apex-blue/10 text-apex-cyan border border-apex-blue/30 px-3 py-1.5 rounded-md hover:bg-apex-blue/20 transition-colors disabled:opacity-50"
          >
            Briefing
          </button>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
          <span className="text-xs text-gray-500 hidden sm:inline">{connected ? "Online" : "Connecting..."}</span>
          <button
            onClick={clearChat}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors ml-1"
            title="Clear conversation"
          >
            Clear
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 rounded-full bg-apex-blue/10 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-apex-cyan">A</span>
            </div>
            <p className="text-lg font-medium text-gray-400 mb-2">APEX at your service</p>
            <p className="text-sm mb-6">How can I assist you today, sir?</p>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    if (p.startsWith("Search ")) {
                      sendSearch(p.replace("Search ", ""));
                    } else {
                      sendMessage(p);
                    }
                  }}
                  disabled={streaming}
                  className="text-left text-sm text-gray-400 bg-apex-surface border border-apex-border rounded-lg px-3 py-2 hover:border-apex-cyan hover:text-gray-200 transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "jax" ? (
              <div className="w-8 h-8 rounded-full bg-apex-blue/20 flex items-center justify-center text-apex-cyan text-sm font-bold shrink-0 mt-0.5">
                A
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-apex-amber/20 flex items-center justify-center text-apex-amber text-sm font-bold shrink-0 mt-0.5">
                U
              </div>
            )}

            <div
              className={`rounded-lg px-4 py-3 max-w-2xl ${
                msg.role === "user"
                  ? "bg-apex-blue/10 border border-apex-blue/20"
                  : "bg-apex-surface border border-apex-border"
              }`}
            >
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {msg.text}
                {msg.role === "jax" && streaming && msg.id === messages[messages.length - 1]?.id && (
                  <span className="inline-block w-1.5 h-4 bg-apex-cyan ml-0.5 animate-pulse align-middle" />
                )}
              </p>

              {msg.role === "jax" && msg.text.length > 20 && (
                <button
                  onClick={() => handleSpeak(msg.text)}
                  disabled={generatingAudio}
                  className="mt-2 text-[10px] text-gray-500 hover:text-apex-cyan transition-colors disabled:opacity-50 select-none"
                  title={isSpeaking ? "Stop speaking" : generatingAudio ? "Generating audio..." : "Read aloud"}
                >
                  {generatingAudio ? "⏳ Generating..." : isSpeaking ? "■ Stop" : "🔊 Read aloud"}
                </button>
              )}

              {msg.searchResults && msg.searchResults.length > 0 && (
                <div className="mt-3 pt-3 border-t border-apex-border">
                  <p className="text-xs text-gray-500 mb-2">Sources</p>
                  <div className="space-y-2">
                    {msg.searchResults.map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-left p-2 rounded bg-black/20 border border-apex-border hover:border-apex-cyan/50 transition-colors group"
                      >
                        <p className="text-xs font-medium text-gray-300 group-hover:text-apex-cyan transition-colors">
                          {r.title}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                          {r.content}
                        </p>
                        <p className="text-[10px] text-apex-blue/60 mt-1 truncate">
                          {r.url}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-apex-border p-4 shrink-0">
        {searchMode && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-apex-amber flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-apex-amber" />
              Search mode active — type your query and press Enter
            </span>
          </div>
        )}
        {voiceError && !isListening && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-red-400">{voiceError}</span>
          </div>
        )}
        {isListening && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-apex-cyan flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-apex-cyan animate-pulse" />
              Listening — speak now
            </span>
          </div>
        )}
        <div className="flex gap-3 items-center">
          <button
            onClick={toggleListening}
            disabled={streaming}
            className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
              isListening
                ? "bg-apex-cyan/20 text-apex-cyan border border-apex-cyan/30 animate-pulse"
                : "bg-apex-surface border border-apex-border text-gray-500 hover:text-apex-cyan hover:border-apex-cyan"
            }`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={isListening ? transcript || input : input}
            onChange={(e) => {
              if (!isListening) setInput(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              streaming
                ? "Apex is responding..."
                : isListening
                  ? "Listening..."
                  : searchMode
                    ? "Search the web..."
                    : "Message Apex... (mic for voice, /search for web)"
            }
            disabled={streaming}
            className={`flex-1 border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors disabled:opacity-50 ${
              searchMode
                ? "bg-black/30 border-apex-amber/30 text-gray-200 placeholder-apex-amber/30 focus:border-apex-amber"
                : "bg-apex-surface border-apex-border text-gray-200 placeholder-gray-500 focus:border-apex-cyan"
            }`}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className={`shrink-0 px-6 py-3 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              searchMode
                ? "bg-apex-amber hover:bg-amber-600 text-black"
                : "bg-apex-blue hover:bg-apex-cyan text-white"
            }`}
          >
            {searchMode ? "Search" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
