import { WebSocket } from "ws";
import { chat, clearHistory } from "./llm/router.js";
import { getNews } from "./tools/news.js";
import { webSearch } from "./tools/web-search.js";
import { deepResearch } from "./tools/research.js";
import { getTodayEvents, getTomorrowEvents, getWeekEvents, formatAgenda } from "./tools/calendar.js";
import { getStock, getCrypto, resolveCryptoId, formatTicker } from "./tools/tickers.js";
import { startFocus, stopFocus, getSessionStatus } from "./tools/focus.js";
import {
  addMemory,
  getMemories,
  deleteMemory,
  clearAllMemories,
  extractMemoriesFromChat,
} from "./tools/memory.js";
import { getDb, saveDb } from "./db.js";
import { createTask, getAllTasks, deleteTask as deleteScheduledTask, type AutomationTask } from "./tools/automator.js";

const SEARCH_TRIGGERS = /^(search|look up|find|what is|who is|how to|what are|latest|news about|tell me about)\b/i;

async function runAutomationTask(task: AutomationTask): Promise<void> {
  const { getNews } = await import("./tools/news.js");
  const { webSearch } = await import("./tools/web-search.js");

  switch (task.type) {
    case "briefing": {
      const params = JSON.parse(task.params || "{}");
      await getNews(params.category || undefined);
      break;
    }
    case "search": {
      const params = JSON.parse(task.params || "{}");
      if (params.query) await webSearch(params.query);
      break;
    }
  }
}

function describeCron(expr: string): string {
  const cronHelp: Record<string, string> = {
    "0 8 * * *": "Every day at 8:00 AM",
    "0 9 * * 1-5": "Weekdays at 9:00 AM",
    "0 7 * * 1": "Mondays at 7:00 AM",
    "0 */6 * * *": "Every 6 hours",
    "0 0 * * *": "Daily at midnight",
    "*/15 * * * *": "Every 15 minutes",
    "0 8 * * 1-5": "Weekdays at 8:00 AM",
    "0 9 * * *": "Every day at 9:00 AM",
  };
  return cronHelp[expr] || `Cron: ${expr}`;
}

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

        // Memory commands
        if (/^\/remember\s+/i.test(text)) {
          const fact = text.replace(/^\/remember\s+/i, "").trim();
          if (fact) {
            await addMemory(fact, "manual", "user");
            ws.send(JSON.stringify({ type: "system", text: "Committed to memory, sir." }));
          }
          return;
        }

        if (/^\/forget\s+(\d+)/i.test(text)) {
          const id = parseInt(text.match(/\/forget\s+(\d+)/i)![1]);
          await deleteMemory(id);
          ws.send(JSON.stringify({ type: "system", text: `Forgotten, sir. Memory #${id} removed.` }));
          return;
        }

        if (/^\/memories/i.test(text)) {
          const memories = await getMemories(20);
          if (memories.length === 0) {
            ws.send(JSON.stringify({ type: "system", text: "No memories stored yet, sir." }));
          } else {
            const list = memories
              .map((m) => `#${m.id} [${m.category}] ${m.content}`)
              .join("\n");
            ws.send(JSON.stringify({ type: "system", text: `**Current memories:**\n\n${list}\n\nUse "/forget <id>" to remove one.` }));
          }
          return;
        }

        if (/^\/forgetall/i.test(text)) {
          await clearAllMemories();
          ws.send(JSON.stringify({ type: "system", text: "All memories wiped, sir. Clean slate." }));
          return;
        }

        if (/^\/automate\s+/i.test(text)) {
          const description = text.replace(/^\/automate\s+/i, "").trim();
          if (!description) {
            ws.send(JSON.stringify({ type: "system", text: "Usage: /automate every morning at 8AM compile tech news briefing" }));
            return;
          }

          ws.send(JSON.stringify({ type: "system", text: "Processing your automation request..." }));

          try {
            const cronPrompt = `You are a cron expression generator. Given a natural language description of a recurring schedule, output ONLY a JSON object with:
- "name": a short task name (max 50 chars)
- "cronExpression": a valid 5-field cron expression (minute hour day_of_month month day_of_week)
- "type": "briefing" | "search" | "custom"
- "params": task parameters as JSON

NL: "${description}"

Output ONLY the JSON, no other text:`;

            const { openrouterChat } = await import("./llm/openrouter.js");
            const cronResult = await openrouterChat(
              "deepseek/deepseek-chat",
              [
                { role: "system", content: "You are a cron expression generator. Output only valid JSON." },
                { role: "user", content: cronPrompt },
              ],
              () => {},
            );

            let parsed: { name: string; cronExpression: string; type: string; params: any };
            try {
              const jsonMatch = cronResult.match(/\{[\s\S]*?\}/);
              if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
              } else {
                parsed = JSON.parse(cronResult);
              }
            } catch {
              // Fallback: parse manually
              const lower = description.toLowerCase();
              parsed = {
                name: description.slice(0, 50),
                cronExpression: lower.includes("morning") && lower.includes("8") ? "0 8 * * *" : "0 9 * * 1-5",
                type: lower.includes("briefing") || lower.includes("news") ? "briefing" : lower.includes("search") ? "search" : "custom",
                params: {},
              };
            }

            const db = await getDb();
            const task = createTask(
              db,
              {
                name: parsed.name,
                cronExpression: parsed.cronExpression,
                type: parsed.type as "briefing" | "search" | "custom",
                params: JSON.stringify(parsed.params || {}),
                enabled: true,
              },
              async (t) => { await runAutomationTask(t); saveDb(); },
            );
            saveDb();

            const scheduleDesc = describeCron(parsed.cronExpression);
            ws.send(JSON.stringify({
              type: "system",
              text: `**Automation created, sir.**\n\nName: ${task.name}\nSchedule: ${scheduleDesc} (${parsed.cronExpression})\nType: ${parsed.type}\n\nUse \`\`/automations\`\` to view all scheduled tasks.`,
            }));
          } catch (err) {
            ws.send(JSON.stringify({
              type: "system",
              text: `Failed to create automation: ${(err as Error).message}`,
            }));
          }
          return;
        }

        if (/^\/automations$/i.test(text)) {
          const db = await getDb();
          const tasks = getAllTasks(db);
          if (tasks.length === 0) {
            ws.send(JSON.stringify({ type: "system", text: "No scheduled automations, sir." }));
          } else {
            const list = tasks
              .map((t) => `• **${t.name}** [${t.enabled ? "✓" : "✗"}] — ${describeCron(t.cronExpression)} (${t.cronExpression}) ${t.lastRun ? `| Last: ${t.lastRun} ${t.lastStatus}` : ""}`)
              .join("\n");
            ws.send(JSON.stringify({ type: "system", text: `**Scheduled Automations:**\n\n${list}\n\nUse \`\`/autodelete <name>\`\` to remove one.` }));
          }
          return;
        }

        if (/^\/autodelete\s+/i.test(text)) {
          const name = text.replace(/^\/autodelete\s+/i, "").trim();
          const db = await getDb();
          const tasks = getAllTasks(db);
          const task = tasks.find((t) => t.name === name);
          if (!task) {
            ws.send(JSON.stringify({ type: "system", text: `No automation named "${name}" found, sir.` }));
          } else {
            deleteScheduledTask(db, task.id);
            saveDb();
            ws.send(JSON.stringify({ type: "system", text: `Automation "${name}" removed, sir.` }));
          }
          return;
        }

        if (/^\/research\s+/i.test(text)) {
          const topic = text.replace(/^\/research\s+/i, "").trim();
          if (!topic) {
            ws.send(JSON.stringify({ type: "system", text: "Usage: /research <topic>" }));
            return;
          }
          ws.send(JSON.stringify({ type: "start" }));
          await deepResearch(
            topic,
            async (messages, onChunk) => {
              const { openrouterChat } = await import("./llm/openrouter.js");
              return openrouterChat("deepseek/deepseek-chat", messages, onChunk);
            },
            (chunk) => {
              if (ws.readyState !== WebSocket.OPEN) return;
              ws.send(JSON.stringify({ type: "chunk", text: chunk }));
            },
          );
          ws.send(JSON.stringify({ type: "end" }));
          return;
        }

        if (/^\/fetch\s+/i.test(text)) {
          const url = text.replace(/^\/fetch\s+/i, "").trim();
          if (!url.startsWith("http")) {
            ws.send(JSON.stringify({ type: "system", text: "Usage: /fetch https://..." }));
            return;
          }
          ws.send(JSON.stringify({ type: "start" }));
          ws.send(JSON.stringify({ type: "chunk", text: `Fetching ${url}...\n\n` }));

          const { fetchPageContent } = await import("./tools/research.js");
          const content = await fetchPageContent(url);

          if (!content) {
            ws.send(JSON.stringify({ type: "chunk", text: "Could not fetch this page, sir." }));
          } else {
            const { openrouterChat } = await import("./llm/openrouter.js");
            const prompt = `Summarize this webpage content concisely. Include key points and a brief summary. The content:\n\n${content.slice(0, 4000)}`;
            await openrouterChat(
              "deepseek/deepseek-chat",
              [
                { role: "system" as const, content: "You summarize web pages concisely." },
                { role: "user" as const, content: prompt },
              ],
              (chunk: string) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                ws.send(JSON.stringify({ type: "chunk", text: chunk }));
              },
            );
          }
          ws.send(JSON.stringify({ type: "end" }));
          return;
        }

        // Calendar commands
        if (/^\/agenda$/i.test(text) || /^\/schedule$/i.test(text) || /^\/today$/i.test(text)) {
          const events = getTodayEvents();
          ws.send(JSON.stringify({ type: "system", text: `**Today's agenda:**\n\n${formatAgenda(events)}` }));
          return;
        }

        if (/^\/tomorrow$/i.test(text)) {
          const events = getTomorrowEvents();
          ws.send(JSON.stringify({ type: "system", text: `**Tomorrow's schedule:**\n\n${formatAgenda(events)}` }));
          return;
        }

        if (/^\/week$/i.test(text) || /^\/calendar$/i.test(text)) {
          const events = getWeekEvents();
          ws.send(JSON.stringify({ type: "system", text: `**This week's calendar:**\n\n${formatAgenda(events)}` }));
          return;
        }

        // Stock / crypto commands
        if (/^\/stock\s+/i.test(text)) {
          const symbol = text.replace(/^\/stock\s+/i, "").trim().toUpperCase();
          if (!symbol) {
            ws.send(JSON.stringify({ type: "system", text: "Usage: /stock AAPL" }));
            return;
          }
          const ticker = await getStock(symbol);
          if (!ticker) {
            ws.send(JSON.stringify({ type: "system", text: `Could not find stock "${symbol}". Try a valid ticker like AAPL, TSLA, MSFT.` }));
          } else {
            ws.send(JSON.stringify({ type: "system", text: formatTicker(ticker) }));
          }
          return;
        }

        if (/^\/crypto\s+/i.test(text)) {
          const input = text.replace(/^\/crypto\s+/i, "").trim();
          const coinId = resolveCryptoId(input);
          const ticker = await getCrypto(coinId);
          if (!ticker) {
            ws.send(JSON.stringify({ type: "system", text: `Could not find crypto "${input}". Try BTC, ETH, SOL, DOGE.` }));
          } else {
            ws.send(JSON.stringify({ type: "system", text: formatTicker(ticker) }));
          }
          return;
        }

        // Focus commands
        if (/^\/focus\s+stop(?:\s+(.+))?$/i.test(text)) {
          const match = text.match(/^\/focus\s+stop(?:\s+(.+))?$/i);
          const id = match?.[1]?.trim() || undefined;
          stopFocus(id);
          ws.send(JSON.stringify({ type: "system", text: "Focus session stopped, sir." }));
          return;
        }

        if (/^\/focus\s+status$/i.test(text)) {
          ws.send(JSON.stringify({ type: "system", text: getSessionStatus() }));
          return;
        }

        if (/^\/focus\s+/i.test(text)) {
          const rest = text.replace(/^\/focus\s+/i, "").trim();
          // Parse: /focus 25m task description  OR  /focus 25 task description
          const durationMatch = rest.match(/^(\d+)\s*(min|m?)?\s*(.*)?$/i);
          if (!durationMatch) {
            ws.send(JSON.stringify({ type: "system", text: "Usage: /focus 25m <optional task description>" }));
            return;
          }
          const minutes = parseInt(durationMatch[1]);
          const task = durationMatch[3]?.trim() || undefined;
          if (minutes < 1 || minutes > 480) {
            ws.send(JSON.stringify({ type: "system", text: "Focus sessions must be between 1 and 480 minutes (8 hours), sir." }));
            return;
          }
          const session = startFocus(minutes, task);
          const taskStr = task ? ` on "${task}"` : "";
          ws.send(JSON.stringify({
            type: "system",
            text: `**Focus mode activated.** ${minutes} minutes${taskStr}. Lock in, sir.\n\nSession ID: \`${session.id}\`\nUse \`/focus stop\` to cancel.`,
          }));
          return;
        }

        if (/^\/pomo$/i.test(text)) {
          const session = startFocus(25, "Pomodoro");
          ws.send(JSON.stringify({
            type: "system",
            text: `**Pomodoro started.** 25 minutes of focus. ID: \`${session.id}\``,
          }));
          return;
        }

        ws.send(JSON.stringify({ type: "start" }));

        const response = await chat(sessionId, text, (chunk: string) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "chunk", text: chunk }));
        });

        // Auto-extract memories from this exchange
        extractMemoriesFromChat(text, response, async (messages) => {
          const { openrouterChat } = await import("./llm/openrouter.js");
          return openrouterChat(
            "deepseek/deepseek-chat",
            messages as { role: "system" | "user" | "assistant"; content: string }[],
            () => {},
          );
        }).catch(() => {});

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
            const prompt = `You are APEX, personal assistant. Deliver a concise, Reuters-style briefing of these top ${top.length} articles. No intro, no filler. For each: bold headline, then one sharp factual sentence. Group by relevance if possible. End with "End of briefing, sir." Do not mention your name or persona in the response.

Articles:
${top
  .map(
    (a, i) =>
      `${i + 1}. [${a.source}] ${a.title}\n   ${a.summary || ""}\n   URL: ${a.url}`,
  )
  .join("\n\n")}`;

            const messages = [
              { role: "system" as const, content: "You are APEX, Tony Stark-style personal assistant." },
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
        { role: "system" as const, content: "You are APEX. Summarize these search results concisely. One sentence per result. End with 'Anything else, sir?'" },
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
