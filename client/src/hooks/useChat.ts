import { useState, useEffect, useRef, useCallback } from "react";

interface JaxMessage {
  id: string;
  role: "jax" | "user";
  text: string;
  timestamp: number;
}

export function useChat() {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<JaxMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const streamingRef = useRef("");

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${location.hostname}:3001`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        switch (data.type) {
          case "greeting":
            setMessages([
              {
                id: "greeting",
                role: "jax",
                text: data.text,
                timestamp: Date.now(),
              },
            ]);
            break;

          case "start":
            setStreaming(true);
            streamingRef.current = "";
            setMessages((prev) => [
              ...prev,
              {
                id: `jax-${Date.now()}`,
                role: "jax",
                text: "",
                timestamp: Date.now(),
              },
            ]);
            break;

          case "chunk":
            streamingRef.current += data.text;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "jax") {
                updated[updated.length - 1] = {
                  ...last,
                  text: streamingRef.current,
                };
              }
              return updated;
            });
            break;

          case "end":
            setStreaming(false);
            break;

          case "error":
            setStreaming(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: "jax",
                text: data.text,
                timestamp: Date.now(),
              },
            ]);
            break;

          case "system":
            setMessages((prev) => [
              ...prev,
              {
                id: `sys-${Date.now()}`,
                role: "jax",
                text: data.text,
                timestamp: Date.now(),
              },
            ]);
            break;
        }
      } catch {
        // ignore non-JSON
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text,
        timestamp: Date.now(),
      },
    ]);

    wsRef.current.send(JSON.stringify({ command: "chat", text }));
  }, []);

  const clearChat = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ command: "clear" }));
  }, []);

  return { messages, connected, streaming, sendMessage, clearChat };
}
