import { useState, useRef, useEffect } from "react";
import { useChat } from "../hooks/useChat";

export default function Chat() {
  const { messages, connected, streaming, sendMessage, sendBriefing, clearChat } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    sendMessage(trimmed);
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
    "Give me a tech news briefing",
    "Search the web for latest AI developments",
    "Tell me a joke",
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-jax-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Chat with Jax</h2>
          <p className="text-sm text-gray-500">Your personal assistant — at your service, sir.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => sendBriefing()}
            disabled={streaming}
            className="text-xs bg-jax-blue/10 text-jax-cyan border border-jax-blue/30 px-3 py-1.5 rounded-md hover:bg-jax-blue/20 transition-colors disabled:opacity-50"
          >
            Briefing
          </button>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
          <span className="text-xs text-gray-500">{connected ? "Online" : "Connecting..."}</span>
          <button
            onClick={clearChat}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors ml-2"
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
                    sendMessage(p);
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
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-jax-border p-4 shrink-0">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? "Jax is responding..." : "Message Jax..."}
            disabled={streaming}
            className="flex-1 bg-jax-surface border border-jax-border rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-jax-cyan transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="bg-jax-blue hover:bg-jax-cyan text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
