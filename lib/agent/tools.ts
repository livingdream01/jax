import { getStock, getCrypto, resolveCryptoId, formatTicker } from "@/lib/tools/tickers";
import { webSearch } from "@/lib/tools/web-search";
import { getNews } from "@/lib/tools/news";
import { getTodayEvents, getTomorrowEvents, getWeekEvents, formatAgenda } from "@/lib/tools/calendar";
import { getMemories, addMemory } from "@/lib/tools/memory";
import { fetchPageContent } from "@/lib/tools/research";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: string;
  execute: (args: Record<string, string>) => Promise<string>;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "get_stock_price",
    description: "Get current stock price, daily change, and volume for a ticker symbol",
    parameters: "symbol: string (e.g. AAPL, MSFT, TSLA)",
    execute: async (args) => {
      const ticker = await getStock(args.symbol);
      return ticker ? formatTicker(ticker) : `Stock "${args.symbol}" not found.`;
    },
  },
  {
    name: "get_crypto_price",
    description: "Get current cryptocurrency price, 24h change, and volume",
    parameters: "coin: string (e.g. BTC, ETH, SOL)",
    execute: async (args) => {
      const id = resolveCryptoId(args.coin);
      const ticker = await getCrypto(id);
      return ticker ? formatTicker(ticker) : `Crypto "${args.coin}" not found.`;
    },
  },
  {
    name: "web_search",
    description: "Search the web for current information. Returns titles, URLs, and snippets.",
    parameters: "query: string (search query)",
    execute: async (args) => {
      const { results } = await webSearch(args.query);
      if (results.length === 0) return "No results found.";
      return results
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.content.slice(0, 200)}\n   ${r.url}`)
        .join("\n\n");
    },
  },
  {
    name: "get_news",
    description: "Get latest news headlines. Optionally filter by category.",
    parameters: "category?: string (tech, business, science, or omit for all)",
    execute: async (args) => {
      const articles = await getNews(args.category);
      if (articles.length === 0) return "No articles found.";
      return articles
        .slice(0, 8)
        .map((a, i) => `${i + 1}. ${a.title} — ${a.source} (${a.category})`)
        .join("\n");
    },
  },
  {
    name: "get_calendar",
    description: "Get today's calendar events from the user's schedule",
    parameters: "view?: string (today, tomorrow, week)",
    execute: async (args) => {
      let events: any[];
      switch (args.view) {
        case "tomorrow": events = getTomorrowEvents(); break;
        case "week": events = getWeekEvents(); break;
        default: events = getTodayEvents();
      }
      return formatAgenda(events);
    },
  },
  {
    name: "get_memories",
    description: "Retrieve facts the user has previously told APEX to remember",
    parameters: "query?: string (optional search term)",
    execute: async () => {
      const memories = await getMemories(20);
      if (memories.length === 0) return "No memories stored yet.";
      return memories.map((m: any) => `[${m.category}] ${m.content}`).join("\n");
    },
  },
  {
    name: "remember",
    description: "Store a fact about the user for future reference",
    parameters: "fact: string (what to remember), category?: string (personal, work, preferences, etc.)",
    execute: async (args) => {
      await addMemory(args.fact, args.category || "general", "agent");
      return `Stored: "${args.fact}"`;
    },
  },
  {
    name: "fetch_webpage",
    description: "Fetch and extract content from a URL for summarization",
    parameters: "url: string (full URL)",
    execute: async (args) => {
      const content = await fetchPageContent(args.url);
      return content ? content.slice(0, 3000) : "Could not fetch this page.";
    },
  },
  {
    name: "calculate",
    description: "Perform a mathematical calculation",
    parameters: "expression: string (e.g. '2+2', 'sqrt(16)', '100*1.5')",
    execute: async (args) => {
      try {
        const sanitized = args.expression.replace(/[^0-9+\-*/().%\s]/g, "");
        const result = Function(`"use strict"; return (${sanitized})`)();
        return `${args.expression} = ${result}`;
      } catch {
        return `Could not calculate "${args.expression}".`;
      }
    },
  },
];

export function getToolsDescription(): string {
  return TOOLS.map(
    (t) => `- ${t.name}(${t.parameters}): ${t.description}`,
  ).join("\n");
}

export function findTool(name: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.name === name);
}