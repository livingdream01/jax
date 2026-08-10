# APEX — Personal AI Assistant

A Jarvis-style personal assistant. Witty, sharp, at your service.

Built with Node.js + TypeScript + React + Docker.

## Architecture

```
Browser (localhost:5173)
    │
    ├── WebSocket ←→ APEX Server (:3001)
    │                    │
    │    ┌───────────────┼───────────────┐
    │    ▼               ▼               ▼
    │  LLM Router    Web Scraper    Automation Engine
    │  ┌────┐┌────┐  ┌─────────┐   ┌──────────┐
    │  │Deep││Kimi│  │NewsAPI  │   │node-cron │
    │  │Seek││(2°)│  │+ GNews  │   │scheduler │
    │  └────┘└────┘  └─────────┘   └──────────┘
    │
    └── React Dashboard
        ├── Chat (streaming, persona-driven)
        ├── News Hub (aggregated, AI summaries)
        ├── Automations (cron, visual editor)
        └── Settings (API keys, preferences)
```

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Monorepo scaffold, Docker, GitHub CI-ready | Done |
| 1 | Apex chat — DeepSeek + Kimi fallback, streaming WebSocket, Jarvis persona | Done |
| 2 | News aggregation hub — NewsAPI/GNews, dashboard, AI briefing | Next |
| 3 | Web research agent — search, fetch, summarize, source citations | Planned |
| 4 | Task automation — natural language &#8594; cron, visual editor, logs | Planned |
| 5 | Utilities — stocks, weather, calendar, focus mode | Planned |
| 6 | Voice I/O, desktop packaging, production hardening | Planned |

---

## Quick Start

### Prerequisites

- Node.js &#8805; 22
- npm &#8805; 11
- Docker (optional, for containerized deployment)

### 1. Clone & Install

```bash
git clone https://github.com/livingdream01/apex.git
cd apex
cp .env.example .env
npm install
```

### 2. Configure API Keys

Edit `.env` with your keys:

```env
DEEPSEEK_API_KEY=sk-your-deepseek-key     # Required — primary LLM
KIMI_API_KEY=sk-your-kimi-key             # Optional — fallback LLM
NEWSAPI_KEY=your-newsapi-key              # Optional — news aggregation
GNEWS_KEY=your-gnews-key                  # Optional — news fallback
```

| Key | Where to Get | Free Tier |
|-----|-------------|-----------|
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) | Pay-as-you-go |
| `KIMI_API_KEY` | [platform.moonshot.cn](https://platform.moonshot.cn) | Free credits |
| `NEWSAPI_KEY` | [newsapi.org/register](https://newsapi.org/register) | 100 req/day |
| `GNEWS_KEY` | [gnews.io](https://gnews.io) | 100 req/day |

### 3. Run

```bash
# Local dev (server + client hot-reload)
npm run dev

# Or with Docker
docker compose up
```

Open **http://localhost:5173** — APEX is ready.

---

## Workflows

### Chat with Apex

```
You: "Apex, what can you do for me?"
Apex: "I'm fully operational, sir. Research, news briefings,
      automation scheduling, technical analysis — name it."
          ▲
          │ Typewriter effect,
          │ streaming in real-time
```

1. Type a message or click a suggested prompt.
2. Apex routes to DeepSeek (primary) — falls back to Kimi if unavailable.
3. Response streams in with a typing indicator.
4. Conversation history persists for the session (last 20 messages).

### LLM Fallback Chain

```
User message
    │
    ▼
DeepSeek API ──success──▶ Stream response
    │
    ▼ fail
Kimi API    ──success──▶ Stream response
    │
    ▼ fail
Graceful error message:
"I'm afraid both systems are unavailable, sir."
```

No single API failure blocks Apex. Two independent providers.

### News Briefing (Phase 2 — coming next)

```
"Apex, morning briefing"
    │
    ▼
Fetch NewsAPI headlines   ──fail──▶ Fetch GNews headlines
    │                                    │
    └──────────── merge + dedupe ────────┘
                    │
                    ▼
            Apex summarizes top 5
            ▶ Displayed in News Hub
            ▶ Spoken if voice enabled
```

### Research Agent (Phase 3 — planned)

```
"Apex, search latest quantum computing breakthroughs"
    │
    ▼
Web search → fetch top 3 pages → extract content
    │
    ▼
Apex summarizes each + cites sources
    │
    ▼
Response with inline citations:
"[1] Nature article on error correction — summary..."
"[2] arXiv preprint on qubit stability — summary..."
```

### Task Automation (Phase 4 — planned)

```
"Apex, every weekday at 7AM, compile tech headlines and summarize"
    │
    ▼
Natural language → parsed cron expression
    │
    ▼
Task saved to SQLite scheduler
    │
    ▼
Visual editor shows all active tasks with:
  • Next run time
  • Last execution status
  • Toggle on/off
  • Run history / logs
```

---

## Deploy to a Server

### Option A — Docker (Recommended)

```bash
# On your server
git clone https://github.com/livingdream01/apex.git
cd apex
cp .env.example .env
# Fill in .env with your API keys

docker compose up -d
```

APEX runs at `http://<your-server-ip>:5173`.

### Option B — Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name apex.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Option C — Caddy (Simplest)

```
apex.yourdomain.com {
    reverse_proxy /api/* 127.0.0.1:3001
    reverse_proxy /ws 127.0.0.1:3001
    reverse_proxy 127.0.0.1:5173
}
```

Then `docker compose up -d` and visit `https://apex.yourdomain.com`.

---

## Project Structure

```
apex/
├── server/                  # Express + TypeScript backend
│   ├── src/
│   │   ├── index.ts         # Entry — Express + WebSocket server
│   │   ├── ws-chat.ts       # WebSocket chat handler
│   │   └── llm/
│   │       ├── personality.ts  # Jarvis system prompt
│   │       ├── deepseek.ts     # DeepSeek API client (streaming)
│   │       ├── kimi.ts         # Kimi API client (fallback)
│   │       └── router.ts       # LLM router with fallback logic
│   └── Dockerfile
├── client/                  # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── App.tsx          # Shell — nav, status, page routing
│   │   ├── hooks/useChat.ts # WebSocket chat hook (streaming)
│   │   └── pages/
│   │       ├── Chat.tsx     # Chat UI with typewriter effect
│   │       ├── News.tsx     # News hub (Phase 2)
│   │       ├── Automations.tsx  # Task editor (Phase 4)
│   │       └── Settings.tsx     # API key configuration
│   └── Dockerfile
├── docker-compose.yml       # Server + client orchestration
├── .env.example             # Required environment variables
└── package.json             # Monorepo root (npm workspaces)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 26 + TypeScript 5 |
| Backend | Express, ws (WebSocket), tsx (dev) |
| Frontend | React 19, Vite 6, Tailwind CSS 4 |
| LLM | DeepSeek API (primary), Kimi API (fallback) |
| News | NewsAPI.org, GNews.io (Phase 2) |
| Storage | In-memory sessions, SQLite (Phase 4) |
| Automation | node-cron (Phase 4) |
| Deployment | Docker Compose, optional nginx/Caddy reverse proxy |

## Commands

```bash
npm run dev          # Start server + client with hot reload
npm run build        # Production build both packages
npm run typecheck    # TypeScript check both packages
docker compose up    # Run in Docker
docker compose down  # Stop Docker
```
