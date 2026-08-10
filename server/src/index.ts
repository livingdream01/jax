import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "JAX", version: "0.1.0" });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("[JAX] Client connected");

  ws.on("message", (data) => {
    const message = data.toString();
    console.log("[JAX] Received:", message);
    ws.send(`Echo: ${message}`);
  });

  ws.on("close", () => {
    console.log("[JAX] Client disconnected");
  });

  ws.send(JSON.stringify({ type: "greeting", text: "At your service, sir." }));
});

server.listen(port, () => {
  console.log(`[JAX] Server running on port ${port}`);
});