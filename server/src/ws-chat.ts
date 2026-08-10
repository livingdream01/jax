import { WebSocket } from "ws";
import { chat, clearHistory } from "./llm/router.js";

export function handleChat(ws: WebSocket, sessionId: string): void {
  ws.on("message", async (raw) => {
    let parsed: { type: string; text?: string; command?: string };

    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      ws.send(
        JSON.stringify({
          type: "error",
          text: "I couldn't parse that message, sir.",
        }),
      );
      return;
    }

    switch (parsed.command || parsed.type) {
      case "message":
      case "chat": {
        if (!parsed.text?.trim()) {
          ws.send(
            JSON.stringify({
              type: "error",
              text: "Empty message received, sir.",
            }),
          );
          return;
        }

        ws.send(JSON.stringify({ type: "start" }));

        await chat(sessionId, parsed.text.trim(), (chunk: string) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "chunk", text: chunk }));
        });

        ws.send(JSON.stringify({ type: "end" }));
        break;
      }

      case "clear": {
        clearHistory(sessionId);
        ws.send(
          JSON.stringify({
            type: "system",
            text: "Conversation history cleared, sir.",
          }),
        );
        break;
      }

      default:
        ws.send(
          JSON.stringify({
            type: "error",
            text: `Unknown command: ${parsed.command || parsed.type}`,
          }),
        );
    }
  });
}
