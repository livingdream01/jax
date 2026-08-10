import { WebSocket } from "ws";
import { chat, clearHistory } from "./llm/router.js";
import { getNews } from "./tools/news.js";

export function handleChat(ws: WebSocket, sessionId: string): void {
  ws.on("message", async (raw) => {
    let parsed: { type: string; text?: string; command?: string; category?: string };

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

      case "briefing": {
        ws.send(JSON.stringify({ type: "start" }));

        try {
          ws.send(
            JSON.stringify({
              type: "chunk",
              text: "One moment, sir. Compiling your briefing...\n\n",
            }),
          );

          const category = parsed.category || "all";
          const articles = await getNews(category === "all" ? undefined : category);
          const top = articles.slice(0, 8);

          if (top.length === 0) {
            ws.send(
              JSON.stringify({
                type: "chunk",
                text: "I'm afraid no articles are available at the moment, sir.",
              }),
            );
          } else {
            const prompt = `You are JAX, personal assistant. Deliver a concise, Reuters-style briefing of these top ${top.length} articles. No intro, no filler. For each: bold headline, then one sharp factual sentence. Group by relevance if possible. End with "End of briefing, sir." Do not mention your name or persona in the response.

Articles:
${top
  .map(
    (a, i) =>
      `${i + 1}. [${a.source}] ${a.title}\n   ${a.summary || ""}\n   URL: ${a.url}`,
  )
  .join("\n\n")}`;

            const messages = [
              { role: "system" as const, content: "You are JAX, Tony Stark-style personal assistant." },
              { role: "user" as const, content: prompt },
            ];

            const { openrouterChat } = await import("./llm/openrouter.js");
            await openrouterChat(
              "deepseek/deepseek-chat",
              messages,
              (chunk: string) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                ws.send(JSON.stringify({ type: "chunk", text: chunk }));
              },
            );
          }
        } catch (err) {
          ws.send(
            JSON.stringify({
              type: "chunk",
              text: "Apologies, sir — I couldn't compile the briefing. Try again shortly.",
            }),
          );
        }

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
