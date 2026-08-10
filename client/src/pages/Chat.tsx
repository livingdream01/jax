import { useState, useRef, useEffect } from "react";
import { useChat } from "../hooks/useChat";

export default function Chat() {
  const { messages, connected, streaming, sendMessage, sendBriefing, sendSearch, clearChat } = useChat();
  const [input, setInput] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    if (searchMode) {
      sendSearch(trimmed);
      setSearchMode(false);
    } else {
      sendMessage(trimmed);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    "What can you do for me, Jax?",
    "Search latest quantum computing breakthroughs",
    "Give me a tech news briefing",
    "Tell me a joke",
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-jax-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Chat with Jax</h2>
          <p className="text-sm text-gray-500">Your personal assistant — at your service, sir.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSearchMode(!searchMode); inputRef.current?.focus(); }}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              searchMode
                ? "bg-jax-amber/10 text-jax-amber border border-jax-amber/30"
                : "text-gray-500 border border-transparent hover:text-gray-300"
            }`}
          >
            {searchMode ? "Search Mode" : "Search"}
          </button>
          <button
            onClick={() => sendBriefing()}
            disabled={streaming}
            className="text-xs bg-jax-blue/10 text-jax-cyan border border-jax-blue/30 px-3 py-1.5 rounded-md hover:bg-jax-blue/20 transition-colors disabled:opacity-50"
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
            <div className="w-16 h-16 rounded-full bg-jax-blue/10 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-jax-cyan">J</span>
            </div>
            <p className="text-lg font-medium text-gray-400 mb-2">JAX at your service</p>
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
                  className="text-left text-sm text-gray-400 bg-jax-surface border border-jax-border rounded-lg px-3 py-2 hover:border-jax-cyan hover:text-gray-200 transition-colors disabled:opacity-50"
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
              <div className="w-8 h-8 rounded-full bg-jax-blue/20 flex items-center justify-center text-jax-cyan text-sm font-bold shrink-0 mt-0.5">
                J
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-jax-amber/20 flex items-center justify-center text-jax-amber text-sm font-bold shrink-0 mt-0.5">
                U
              </div>
            )}

            <div
              className={`rounded-lg px-4 py-3 max-w-2xl ${
                msg.role === "user"
                  ? "bg-jax-blue/10 border border-jax-blue/20"
                  : "bg-jax-surface border border-jax-border"
              }`}
            >
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {msg.text}
                {msg.role === "jax" && streaming && msg.id === messages[messages.length - 1]?.id && (
                  <span className="inline-block w-1.5 h-4 bg-jax-cyan ml-0.5 animate-pulse align-middle" />
                )}
              </p>

              {msg.searchResults && msg.searchResults.length > 0 && (
                <div className="mt-3 pt-3 border-t border-jax-border">
                  <p className="text-xs text-gray-500 mb-2">Sources</p>
                  <div className="space-y-2">
                    {msg.searchResults.map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-left p-2 rounded bg-black/20 border border-jax-border hover:border-jax-cyan/50 transition-colors group"
                      >
                        <p className="text-xs font-medium text-gray-300 group-hover:text-jax-cyan transition-colors">
                          {r.title}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                          {r.content}
                        </p>
                        <p className="text-[10px] text-jax-blue/60 mt-1 truncate">
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

      <div className="border-t border-jax-border p-4 shrink-0">
        {searchMode && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-jax-amber flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-jax-amber" />
              Search mode active — type your query and press Enter
            </span>
          </div>
        )}
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              streaming
                ? "Jax is responding..."
                : searchMode
                  ? "Search the web..."
                  : "Message Jax... (or type /search to search the web)"
            }
            disabled={streaming}
            className={`flex-1 border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors disabled:opacity-50 ${
              searchMode
                ? "bg-black/30 border-jax-amber/30 text-gray-200 placeholder-jax-amber/30 focus:border-jax-amber"
                : "bg-jax-surface border-jax-border text-gray-200 placeholder-gray-500 focus:border-jax-cyan"
            }`}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className={`px-6 py-3 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              searchMode
                ? "bg-jax-amber hover:bg-amber-600 text-black"
                : "bg-jax-blue hover:bg-jax-cyan text-white"
            }`}
          >
            {searchMode ? "Search" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
