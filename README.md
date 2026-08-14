# APEX — Personal AI Assistant

A Jarvis-style personal assistant. Witty, sharp, at your service. Built with **Next.js 15 + TypeScript + Tailwind CSS**.

## Architecture

```
Browser (localhost:3001)
    │
    ├── Next.js App Router
    │   ├── /api/chat → SSE streaming (replaces WebSocket)
    │   ├── /api/news → News aggregation
    │   ├── /api/tts  → Fish Audio + browser fallback
    │   ├── /api/memory → Long-term memory (sql.js)
    │   ├── /api/automations → Cron scheduler
    │   └── /api/health → Health check
    │
    └── Pages
        ├── / → Chat (streaming, voice, persona-driven)
        ├── /news → News Hub (aggregated by source)
        ├── /automations → Automation dashboard
        └── /settings → API key configuration
```

## Features

| Feature | Commands | Backend |
|---------|----------|---------|
| Chat | Natural conversation | OpenRouter (DeepSeek + Kimi fallback) |
| Web Search | `/search`, auto-detect | Tavily + DuckDuckGo HTML |
| Deep Research | `/research <topic>` | Multi-source fetch + LLM synthesis |
| URL Fetch | `/fetch <url>` | Cheerio extraction + LLM summary |
| Voice I/O | Mic button (push-to-talk) | Fish Audio TTS + Web Speech API |
| Long-term Memory | `/remember`, `/memories`, `/forget` | SQLite via sql.js |
| Workflow Automation | `/automate` | node-cron + NL-to-cron via LLM |
| News | Chat "briefing" or `/news` page | HN + RSS + Reddit |
| Calendar | `/agenda`, `/today`, `/tomorrow`, `/week` | macOS Calendar via AppleScript |
| Stocks | `/stock AAPL`, `/stock MSFT` | Yahoo Finance |
| Crypto | `/crypto BTC`, `/crypto ETH` | CoinGecko |
| Focus Mode | `/focus 25m`, `/pomo`, `/focus stop` | In-memory timer + macOS notifications |

## Quick Start

### Prerequisites

- Node.js >= 22
- npm >= 11

### 1. Clone & Install

```bash
git clone https://github.com/livingdream01/jax.git
cd jax
cp .env.example .env
npm install
```

### 2. Configure API Keys

Edit `.env` with your keys:

```env
OPENROUTER_API_KEY=sk-or-v1-...     # Required — primary LLM (free)
TAVILY_API_KEY=tvly-...             # Optional — web search
FISH_AUDIO_API_KEY=sk-fish-...      # Optional — TTS voice
```

| Key | Where to Get | Free Tier |
|-----|-------------|-----------|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | Free credits |
| `TAVILY_API_KEY` | [app.tavily.com](https://app.tavily.com) | 1000 searches/month |
| `FISH_AUDIO_API_KEY` | [fish.audio](https://fish.audio) | Free tier |

### 3. Run

```bash
npm run dev
```

Open **http://localhost:3001**.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production
npm run typecheck    # TypeScript check
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| LLM | OpenRouter (DeepSeek primary, Kimi fallback) |
| Search | Tavily API + DuckDuckGo HTML |
| TTS | Fish Audio + Web Speech API fallback |
| Storage | SQLite via sql.js |
| Automation | node-cron |
| Content Extraction | Cheerio |

## Project Structure

```
apex/
├── app/                      # Next.js App Router
│   ├── api/
│   │   ├── chat/route.ts     # SSE chat (all commands)
│   │   ├── news/route.ts     # News aggregation API
│   │   ├── tts/route.ts      # Fish Audio TTS
│   │   ├── memory/route.ts   # Memory CRUD
│   │   ├── automations/route.ts # Scheduler CRUD
│   │   └── health/route.ts   # Health check
│   ├── page.tsx              # Chat page (client component)
│   ├── news/page.tsx         # News hub
│   ├── automations/page.tsx  # Automation dashboard
│   ├── settings/page.tsx     # Settings
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind
├── lib/                      # Shared server logic
│   ├── db.ts                 # SQLite database
│   ├── llm/
│   │   ├── personality.ts    # Jarvis system prompt
│   │   ├── openrouter.ts     # OpenRouter client
│   │   └── router.ts         # LLM router + fallback
│   └── tools/
│       ├── news.ts           # News aggregation
│       ├── web-search.ts     # Tavily + DDG
│       ├── research.ts       # Deep research + fetch
│       ├── memory.ts         # Fact memory + extraction
│       ├── automator.ts      # Cron scheduler
│       ├── calendar.ts       # macOS Calendar
│       ├── tickers.ts        # Stocks + crypto
│       ├── focus.ts          # Focus/Pomodoro timer
│       └── sources/          # News source fetchers
├── hooks/                    # Client hooks
│   └── useVoice.ts           # Speech + TTS hook
├── components/               # Shared components
│   └── ClientLayout.tsx      # Nav sidebar
├── data/                     # SQLite DB (git-ignored)
├── next.config.ts            # Next.js config
└── package.json              # Dependencies
```

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Chat — streaming, persona | Done |
| 2 | News aggregation hub | Done |
| 3 | Web research agent | Done |
| 4 | Task automation | Done |
| 5 | Utilities — calendar, stocks, focus | Done |
| 6 | Voice I/O | Done |
| 7 | Next.js migration | Done |