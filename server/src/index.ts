import { loadEnvFile } from "node:process";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { handleChat } from "./ws-chat.js";
import { getNews, clearNewsCache } from "./tools/news.js";
import { randomUUID } from "node:crypto";

try { loadEnvFile("../.env"); } catch { /* optional */ }

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "JAX", version: "0.1.0" });
});

app.get("/api/news", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const articles = await getNews(category);
    res.json({ articles, count: articles.length, cached: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.post("/api/news/refresh", async (_req, res) => {
  clearNewsCache();
  const articles = await getNews();
  res.json({ articles, count: articles.length, refreshed: true });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

const sessions = new Map<WebSocket, string>();

wss.on("connection", (ws) => {
  const sessionId = randomUUID();
  sessions.set(ws, sessionId);

  console.log(`[JAX] Client connected (${sessionId.slice(0, 8)})`);

  handleChat(ws, sessionId);

  ws.on("close", () => {
    sessions.delete(ws);
    console.log(`[JAX] Client disconnected (${sessionId.slice(0, 8)})`);
  });

  ws.send(
    JSON.stringify({
      type: "greeting",
      text: "Good evening, sir. JAX is fully operational. How may I be of service?",
    }),
  );
});

server.listen(port, () => {
  const key = process.env.OPENROUTER_API_KEY || "";
  const ok = key.startsWith("sk-or-v1-") && !key.includes("placeholder");

  console.log("");
  console.log("  ██╗ █████╗ ██╗  ██╗");
  console.log("  ██║██╔══██╗╚██╗██╔╝");
  console.log("  ██║███████║ ╚███╔╝ ");
  console.log("  ██║██╔══██║ ██╔██╗ ");
  console.log("  ██║██║  ██║██╔╝ ██╗");
  console.log("  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝");
  console.log("");
  console.log(`  Server:    http://localhost:${port}`);
  console.log("  Dashboard: http://localhost:5173");
  console.log("");
  console.log(`  LLM (OpenRouter): ${ok ? "✓ Configured" : "✗ Get free key at openrouter.ai/keys"}`);
  console.log(`  Models: DeepSeek Chat (primary) → Kimi K2.6 (fallback)`);
  console.log("");
});
