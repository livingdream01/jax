import { useState, useEffect } from "react";
import Chat from "./pages/Chat";
import News from "./pages/News";
import Automations from "./pages/Automations";
import Settings from "./pages/Settings";

type Page = "chat" | "news" | "automations" | "settings";

export default function App() {
  const [page, setPage] = useState<Page>("chat");
  const [connected, setConnected] = useState(false);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${location.hostname}:3001`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "greeting") setGreeting(data.text);
      } catch {
        // ignore non-JSON
      }
    };

    return () => ws.close();
  }, []);

  const pages: { id: Page; label: string; icon: string }[] = [
    { id: "chat", label: "Chat", icon: "💬" },
    { id: "news", label: "News", icon: "📰" },
    { id: "automations", label: "Automations", icon: "⚡" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ];

  return (
    <div className="flex h-screen bg-apex-dark">
      <nav className="w-16 md:w-56 bg-apex-surface border-r border-apex-border flex flex-col">
        <div className="p-4 border-b border-apex-border">
          <h1 className="text-apex-cyan font-bold text-xl hidden md:block">APEX</h1>
          <span className="text-apex-cyan font-bold text-xl md:hidden">A</span>
        </div>

        <div className="flex-1 py-2">
          {pages.map((p) => (
            <button
              key={p.id}
              onClick={() => setPage(p.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                page === p.id
                  ? "bg-apex-blue/10 text-apex-cyan border-r-2 border-apex-cyan"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <span className="text-xl">{p.icon}</span>
              <span className="hidden md:inline text-sm font-medium">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-apex-border">
          <div className={`flex items-center gap-2 ${connected ? "text-emerald-400" : "text-red-400"}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className="text-xs hidden md:inline">{connected ? "Connected" : "Offline"}</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        {greeting && (
          <div className="bg-apex-blue/10 border-b border-apex-border px-6 py-2 text-sm text-apex-cyan">
            {greeting}
          </div>
        )}
        {page === "chat" && <Chat />}
        {page === "news" && <News />}
        {page === "automations" && <Automations />}
        {page === "settings" && <Settings />}
      </main>
    </div>
  );
}