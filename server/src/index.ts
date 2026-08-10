import { loadEnvFile } from "node:process";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { handleChat } from "./ws-chat.js";
import { getNews, clearNewsCache } from "./tools/news.js";
import { getMemories, addMemory, deleteMemory, clearAllMemories } from "./tools/memory.js";
import { getDb, saveDb } from "./db.js";
import {
  initAutomator,
  getAllTasks,
  createTask,
  deleteTask,
  toggleTask,
  stopAllJobs,
  type AutomationTask,
} from "./tools/automator.js";
import { webSearch } from "./tools/web-search.js";
import { randomUUID } from "node:crypto";

try { loadEnvFile("../.env"); } catch { /* optional */ }

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "APEX", version: "0.1.0" });
});

const FISH_AUDIO_VOICE = "d54ff84272464629b509682d42db5661";

app.post("/api/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "FISH_AUDIO_API_KEY not set" });

  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        model: "s2.1-pro-free",
      },
      body: JSON.stringify({
        text,
        reference_id: FISH_AUDIO_VOICE,
        format: "mp3",
        latency: "normal",
        normalize: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const buffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: "TTS failed" });
  }
});

// News
app.get("/api/news", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const articles = await getNews(category);
    res.json({ articles, count: articles.length, cached: true });
  } catch {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.post("/api/news/refresh", async (_req, res) => {
  clearNewsCache();
  const articles = await getNews();
  res.json({ articles, count: articles.length, refreshed: true });
});

// Memory
app.get("/api/memory", async (_req, res) => {
  const memories = await getMemories(100);
  res.json({ memories, count: memories.length });
});

app.post("/api/memory", async (req, res) => {
  const { content, category } = req.body;
  if (!content) return res.status(400).json({ error: "content required" });
  const mem = await addMemory(content, category || "general", "api");
  res.json(mem);
});

app.delete("/api/memory/:id", async (req, res) => {
  await deleteMemory(parseInt(req.params.id));
  res.json({ ok: true });
});

app.delete("/api/memory", async (_req, res) => {
  await clearAllMemories();
  res.json({ ok: true });
});

// Automations
async function runAutomationTask(task: AutomationTask): Promise<void> {
  switch (task.type) {
    case "briefing": {
      const params = JSON.parse(task.params || "{}");
      const category = params.category || undefined;
      const articles = await getNews(category);
      console.log(`[APEX] Auto-briefing "${task.name}": ${articles.length} articles fetched`);
      break;
    }
    case "search": {
      const params = JSON.parse(task.params || "{}");
      const query = params.query || "";
      if (query) {
        await webSearch(query);
        console.log(`[APEX] Auto-search "${task.name}": completed`);
      }
      break;
    }
  }
}

const dbReady = getDb().then(async (db) => {
  initAutomator(db, async (task) => {
    await runAutomationTask(task);
    saveDb();
  });
  return db;
});

app.get("/api/automations", async (_req, res) => {
  const db = await dbReady;
  const tasks = getAllTasks(db);
  res.json({ tasks, count: tasks.length });
});

app.post("/api/automations", async (req, res) => {
  try {
    const db = await dbReady;
    const { name, cronExpression, type, params, enabled } = req.body;
    if (!name || !cronExpression) return res.status(400).json({ error: "name and cronExpression required" });

    const task = createTask(
      db,
      {
        name,
        cronExpression,
        type: type || "custom",
        params: JSON.stringify(params || {}),
        enabled: enabled !== false,
      },
      async (t) => { await runAutomationTask(t); saveDb(); },
    );
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put("/api/automations/:id/toggle", async (req, res) => {
  const db = await dbReady;
  const task = await toggleTask(db, parseInt(req.params.id), req.body.enabled, async (t) => {
    await runAutomationTask(t);
    saveDb();
  });
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

app.delete("/api/automations/:id", async (req, res) => {
  const db = await dbReady;
  await deleteTask(db, parseInt(req.params.id));
  saveDb();
  res.json({ ok: true });
});

// WS
const server = createServer(app);
const wss = new WebSocketServer({ server });

const sessions = new Map<WebSocket, string>();

wss.on("connection", (ws) => {
  const sessionId = randomUUID();
  sessions.set(ws, sessionId);
  console.log(`[APEX] Client connected (${sessionId.slice(0, 8)})`);
  handleChat(ws, sessionId);
  ws.on("close", () => { sessions.delete(ws); });
  ws.send(JSON.stringify({
    type: "greeting",
    text: "Good evening, sir. APEX is fully operational. How may I be of service?",
  }));
});

server.listen(port, async () => {
  const key = process.env.OPENROUTER_API_KEY || "";
  const ok = key.startsWith("sk-or-v1-") && !key.includes("placeholder");

  const db = await dbReady;
  const tasks = getAllTasks(db);
  const activeJobs = tasks.filter((t) => t.enabled).length;

  console.log("");
  console.log("   █████╗ ██████╗ ███████╗██╗  ██╗");
  console.log("  ██╔══██╗██╔══██╗██╔════╝╚██╗██╔╝");
  console.log("  ███████║██████╔╝█████╗   ╚███╔╝ ");
  console.log("  ██╔══██║██╔═══╝ ██╔══╝   ██╔██╗ ");
  console.log("  ██║  ██║██║     ███████╗██╔╝ ██╗");
  console.log("  ╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝");
  console.log("");
  console.log(`  Server:    http://localhost:${port}`);
  console.log("  Dashboard: http://localhost:5173");
  console.log("");
  console.log(`  LLM:     ${ok ? "✓ OpenRouter" : "✗ Missing key"}`);
  console.log(`  Memory:  ✓ ${(await getMemories(0)).length} facts stored`);
  console.log(`  Auto:     ${activeJobs} scheduled tasks active`);
  console.log("");
});
