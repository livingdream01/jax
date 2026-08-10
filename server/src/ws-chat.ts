import { WebSocket } from "ws";
import { chat, clearHistory } from "./llm/router.js";
import { getNews } from "./tools/news.js";
import { webSearch } from "./tools/web-search.js";

const SEARCH_TRIGGERS = /^(search|look up|find|what is|who is|how to|what are|latest|news about|tell me about)\b/i;

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

        const text = parsed.text.trim();

        // Auto-detect search intent
        if (/^\/search\s+/i.test(text) || SEARCH_TRIGGERS.test(text)) {
          const query = text.replace(/^\/search\s+/i, "").replace(SEARCH_TRIGGERS, "").trim();
          if (query.length > 2) {
            await handleSearch(ws, query);
            return;
          }
        }

        ws.send(JSON.stringify({ type: "start" }));

        await chat(sessionId, text, (chunk: string) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "chunk", text: chunk }));
        });

        ws.send(JSON.stringify({ type: "end" }));
        break;
      }

      case "search": {
        if (!parsed.text?.trim()) {
          ws.send(JSON.stringify({ type: "error", text: "What would you like me to search for, sir?" }));
          return;
        }
        await handleSearch(ws, parsed.text.trim());
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

async function handleSearch(ws: WebSocket, query: string) {
  ws.send(JSON.stringify({ type: "start" }));
  ws.send(JSON.stringify({ type: "chunk", text: `Searching for "${query}"...\n\n` }));

  try {
    const { results, answer } = await webSearch(query);

    if (results.length === 0) {
      ws.send(
        JSON.stringify({
          type: "chunk",
          text: answer || "No results found, sir. Try a different query.",
        }),
      );
    } else {
      // Send results as structured data for the frontend to render
      ws.send(
        JSON.stringify({
          type: "search_results",
          query,
          results: results.slice(0, 6),
          answer,
        }),
      );

      // Also synthesize a summary via LLM
      const summary = results
        .slice(0, 5)
        .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.content.slice(0, 200)}\n   ${r.url}`)
        .join("\n\n");

      const messages = [
        { role: "system" as const, content: "You are JAX. Summarize these search results concisely. One sentence per result. End with 'Anything else, sir?'" },
        { role: "user" as const, content: `Query: ${query}\n\nResults:\n${summary}` },
      ];

      ws.send(JSON.stringify({ type: "chunk", text: "\n" }));
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
        text: "Search unavailable at the moment, sir.",
      }),
    );
  }

  ws.send(JSON.stringify({ type: "end" }));
}
