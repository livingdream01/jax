import { chat, clearHistory } from "@/lib/llm/router";
import { getNews } from "@/lib/tools/news";
import { webSearch } from "@/lib/tools/web-search";
import { deepResearch, fetchPageContent } from "@/lib/tools/research";
import { addMemory, getMemories, deleteMemory, clearAllMemories, extractMemoriesFromChat } from "@/lib/tools/memory";
import { getDb, saveDb } from "@/lib/db";
import { createTask, getAllTasks, deleteTask as delTask } from "@/lib/tools/automator";
import { getTodayEvents, getTomorrowEvents, getWeekEvents, formatAgenda } from "@/lib/tools/calendar";
import { getStock, getCrypto, resolveCryptoId, formatTicker } from "@/lib/tools/tickers";
import { startFocus, stopFocus, getSessionStatus } from "@/lib/tools/focus";
import { openrouterChat } from "@/lib/llm/openrouter";

const SEARCH_TRIGGERS = /^(search|look up|find|what is|who is|how to|what are|latest|news about|tell me about)\b/i;

function sendSSE(controller: ReadableStreamDefaultController, type: string, data: any) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
}

async function runAutomationTask(task: any): Promise<void> {
  switch (task.type) {
    case "briefing": { const params = JSON.parse(task.params || "{}"); await getNews(params.category); break; }
    case "search": { const params = JSON.parse(task.params || "{}"); if (params.query) await webSearch(params.query); break; }
  }
}

const cronLabels: Record<string, string> = {
  "0 8 * * *": "Every day at 8:00 AM", "0 9 * * 1-5": "Weekdays at 9:00 AM",
  "0 7 * * 1": "Mondays at 7:00 AM", "0 */6 * * *": "Every 6 hours",
  "0 0 * * *": "Daily at midnight", "*/15 * * * *": "Every 15 minutes",
  "0 8 * * 1-5": "Weekdays at 8:00 AM", "0 9 * * *": "Every day at 9:00 AM",
};

function describeCron(expr: string): string { return cronLabels[expr] || `Cron: ${expr}`; }

export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({}));
  if (!text?.trim()) {
    return new Response("data: {\"type\":\"error\",\"text\":\"Empty message.\"}\n\n", { headers: { "Content-Type": "text/event-stream" } });
  }

  const sessionId = "default";
  let ended = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: any = {}) => {
        if (ended) return;
        try { sendSSE(controller, type, data); } catch { ended = true; }
      };

      try {
        const msg = text.trim();

        // Commands that return immediately (no streaming)
        if (/^\/remember\s+/i.test(msg)) {
          const fact = msg.replace(/^\/remember\s+/i, "").trim();
          if (fact) { await addMemory(fact, "manual", "user"); send("system", { text: "Committed to memory, sir." }); }
          send("end"); controller.close(); return;
        }
        if (/^\/forget\s+(\d+)/i.test(msg)) {
          const id = parseInt(msg.match(/\/forget\s+(\d+)/i)![1]);
          await deleteMemory(id);
          send("system", { text: `Forgotten, sir. Memory #${id} removed.` });
          send("end"); controller.close(); return;
        }
        if (/^\/memories$/i.test(msg)) {
          const memories = await getMemories(20);
          const list = memories.length === 0 ? "No memories stored yet." : memories.map(m => `#${m.id} [${m.category}] ${m.content}`).join("\n");
          send("system", { text: memories.length ? `**Current memories:**\n\n${list}\n\nUse "/forget <id>" to remove.` : list });
          send("end"); controller.close(); return;
        }
        if (/^\/forgetall$/i.test(msg)) { await clearAllMemories(); send("system", { text: "All memories wiped." }); send("end"); controller.close(); return; }

        if (/^\/agenda$|^\/schedule$|^\/today$/i.test(msg)) {
          send("system", { text: `**Today's agenda:**\n\n${formatAgenda(getTodayEvents())}` });
          send("end"); controller.close(); return;
        }
        if (/^\/tomorrow$/i.test(msg)) {
          send("system", { text: `**Tomorrow's schedule:**\n\n${formatAgenda(getTomorrowEvents())}` });
          send("end"); controller.close(); return;
        }
        if (/^\/week$|^\/calendar$/i.test(msg)) {
          send("system", { text: `**This week's calendar:**\n\n${formatAgenda(getWeekEvents())}` });
          send("end"); controller.close(); return;
        }
        if (/^\/stock\s+/i.test(msg)) {
          const sym = msg.replace(/^\/stock\s+/i, "").trim().toUpperCase();
          const t = await getStock(sym);
          send("system", { text: t ? formatTicker(t) : `Could not find stock "${sym}".` });
          send("end"); controller.close(); return;
        }
        if (/^\/crypto\s+/i.test(msg)) {
          const coin = resolveCryptoId(msg.replace(/^\/crypto\s+/i, "").trim());
          const t = await getCrypto(coin);
          send("system", { text: t ? formatTicker(t) : `Could not find "${coin}". Try BTC, ETH, SOL.` });
          send("end"); controller.close(); return;
        }
        if (/^\/focus\s+stop/i.test(msg)) {
          const id = msg.match(/\/focus\s+stop\s+(.+)/)?.[1]?.trim();
          stopFocus(id);
          send("system", { text: "Focus session stopped." });
          send("end"); controller.close(); return;
        }
        if (/^\/focus\s+status$/i.test(msg)) {
          send("system", { text: getSessionStatus() });
          send("end"); controller.close(); return;
        }
        if (/^\/focus\s+/i.test(msg)) {
          const rest = msg.replace(/^\/focus\s+/i, "").trim();
          const m = rest.match(/^(\d+)\s*(min|m?)?\s*(.*)?$/i);
          if (!m) { send("system", { text: "Usage: /focus 25m <task>" }); send("end"); controller.close(); return; }
          const mins = parseInt(m[1]);
          const task = m[3]?.trim() || undefined;
          if (mins < 1 || mins > 480) { send("system", { text: "1-480 minute range." }); send("end"); controller.close(); return; }
          const session = startFocus(mins, task);
          send("system", { text: `**Focus activated.** ${mins}min${task ? ` on "${task}"` : ""}. ID: \`${session.id}\`` });
          send("end"); controller.close(); return;
        }
        if (/^\/pomo$/i.test(msg)) {
          const s = startFocus(25, "Pomodoro");
          send("system", { text: `**Pomodoro started.** 25min. ID: \`${s.id}\`` });
          send("end"); controller.close(); return;
        }

        if (/^\/automate\s+/i.test(msg)) {
          const desc = msg.replace(/^\/automate\s+/i, "").trim();
          send("system", { text: "Processing automation request..." });
          try {
            const cronPrompt = `Given a natural language schedule, output ONLY JSON: {"name":"str","cronExpression":"5-field cron","type":"briefing|search|custom","params":{}}\n\nNL: "${desc}"\nJSON:`;
            const cronResult = await openrouterChat("deepseek/deepseek-chat", [{ role: "system", content: "Cron generator." }, { role: "user", content: cronPrompt }], () => {});
            let parsed: any;
            try {
              const jsonMatch = cronResult.match(/\{[\s\S]*?\}/);
              parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cronResult);
            } catch {
              const lower = desc.toLowerCase();
              parsed = { name: desc.slice(0, 50), cronExpression: lower.includes("morning") ? "0 8 * * *" : "0 9 * * 1-5", type: lower.includes("briefing") ? "briefing" : lower.includes("search") ? "search" : "custom", params: {} };
            }
            const db = await getDb();
            const task = createTask(db, { name: parsed.name, cronExpression: parsed.cronExpression, type: parsed.type, params: JSON.stringify(parsed.params || {}), enabled: true }, async (t) => { await runAutomationTask(t); saveDb(); });
            saveDb();
            send("system", { text: `**Automation created.**\n\nName: ${task.name}\nSchedule: ${describeCron(parsed.cronExpression)}\nType: ${parsed.type}` });
          } catch (err: any) { send("error", { text: `Failed: ${err.message}` }); }
          send("end"); controller.close(); return;
        }
        if (/^\/automations$/i.test(msg)) {
          const db = await getDb();
          const tasks = getAllTasks(db);
          const list = tasks.length === 0 ? "No scheduled automations." : tasks.map(t => `\u2022 **${t.name}** [${t.enabled ? "\u2713" : "\u2717"}] \u2014 ${describeCron(t.cronExpression)}`).join("\n");
          send("system", { text: tasks.length ? `**Scheduled Automations:**\n\n${list}` : list });
          send("end"); controller.close(); return;
        }
        if (/^\/autodelete\s+/i.test(msg)) {
          const name = msg.replace(/^\/autodelete\s+/i, "").trim();
          const db = await getDb();
          const tasks = getAllTasks(db);
          const task = tasks.find(t => t.name === name);
          if (task) { delTask(db, task.id); saveDb(); send("system", { text: `"${name}" removed.` }); }
          else { send("system", { text: `No automation named "${name}".` }); }
          send("end"); controller.close(); return;
        }

        // Streaming commands
        if (/^\/research\s+/i.test(msg)) {
          const topic = msg.replace(/^\/research\s+/i, "").trim();
          send("start");
          await deepResearch(topic, async (msgs, onChunk) => openrouterChat("deepseek/deepseek-chat", msgs, onChunk), (chunk) => send("chunk", { text: chunk }));
          send("end"); controller.close(); return;
        }

        if (/^\/fetch\s+/i.test(msg)) {
          const url = msg.replace(/^\/fetch\s+/i, "").trim();
          if (!url.startsWith("http")) { send("system", { text: "Usage: /fetch https://..." }); send("end"); controller.close(); return; }
          send("start");
          send("chunk", { text: `Fetching ${url}...\n\n` });
          const content = await fetchPageContent(url);
          if (!content) { send("chunk", { text: "Could not fetch this page." }); send("end"); controller.close(); return; }
          await openrouterChat("deepseek/deepseek-chat", [{ role: "system" as const, content: "Summarize web pages concisely." }, { role: "user" as const, content: `Summarize:\n\n${content.slice(0, 4000)}` }], (chunk) => send("chunk", { text: chunk }));
          send("end"); controller.close(); return;
        }

        // Search
        if (/^\/search\s+/i.test(msg) || SEARCH_TRIGGERS.test(msg)) {
          const query = msg.replace(/^\/search\s+/i, "").replace(SEARCH_TRIGGERS, "").trim();
          if (query.length > 2) {
            send("start");
            send("chunk", { text: `Searching for "${query}"...\n\n` });
            const { results, answer } = await webSearch(query);
            if (results.length > 0) {
              send("search_results", { results, answer });
              send("chunk", { text: answer ? `**Answer:** ${answer}\n\n**Top results:**\n${results.map((r, i) => `${i + 1}. [${r.title}](${r.url})`).join("\n")}` : `**Top results:**\n${results.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.content.slice(0, 150)}\n   ${r.url}`).join("\n\n")}` });
            } else { send("chunk", { text: "No results found." }); }
            send("end"); controller.close(); return;
          }
        }

        // Briefing
        if (/^(briefing|news|daily)\s*(tech|business|science|all)?$/i.test(msg)) {
          const cat = msg.match(/tech|business|science/i)?.[0] || undefined;
          send("start");
          const articles = await getNews(cat);
          const top = articles.slice(0, 8).map((a, i) => `${i + 1}. **${a.title}** — _${a.source}_\n   ${a.summary.slice(0, 120)}\n   ${a.url}`).join("\n\n");
          send("chunk", { text: `**${cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : "Daily"} Briefing**\n\n${top}\n\n${articles.length} articles total.` });
          send("end"); controller.close(); return;
        }

        // Regular chat
        send("start");
        const response = await chat(sessionId, msg, (chunk) => send("chunk", { text: chunk }));
        extractMemoriesFromChat(msg, response, async (msgs) => openrouterChat("deepseek/deepseek-chat", msgs as any, () => {}));
        send("end");
      } catch (err: any) {
        send("error", { text: `Something went wrong, sir. ${err.message}` });
        send("end");
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function DELETE() {
  clearHistory("default");
  return new Response("OK");
}