import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { handleChat } from "./ws-chat.js";
import { randomUUID } from "node:crypto";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "JAX", version: "0.1.0" });
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
  console.log(`[JAX] Server running on port ${port}`);
});
