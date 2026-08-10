import { fetchHackerNews } from "./sources/hackernews.js";
import { fetchRssFeeds } from "./sources/rss.js";
import { fetchReddit } from "./sources/reddit.js";

export interface Article {
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string;
  publishedAt: string;
}

interface CacheEntry {
  articles: Article[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000;

const VALID_CATEGORIES = new Set(["tech", "business", "science"]);

export async function getNews(category?: string): Promise<Article[]> {
  const now = Date.now();
  const cacheKey = category || "all";
  const entry = cache.get(cacheKey);

  if (entry && now - entry.timestamp < CACHE_TTL) {
    return entry.articles;
  }

  const results = await Promise.allSettled([
    fetchHackerNews(),
    fetchRssFeeds(),
    fetchReddit(),
  ]);

  let articles: Article[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") articles.push(...r.value);
  }

  articles = deduplicate(articles);

  // Sort by recognized source priority + date
  const sourcePriority: Record<string, number> = {
    "Nature": 0, "MIT Tech Review": 0, "IEEE Spectrum": 0, "Quanta Magazine": 0,
    "Science Daily": 1, "Ars Technica": 1, "Wired": 1,
    "Fortune": 2, "MarketWatch": 2, "CNBC Tech": 2,
    "New Scientist": 3, "Hacker News": 3,
  };

  articles.sort((a, b) => {
    const pa = sourcePriority[a.source] ?? 5;
    const pb = sourcePriority[b.source] ?? 5;
    if (pa !== pb) return pa - pb;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  cache.set(cacheKey, { articles, timestamp: now });

  if (category && VALID_CATEGORIES.has(category)) {
    return articles.filter((a) => a.category === category);
  }

  return articles;
}

export function clearNewsCache(): void {
  cache.clear();
}

function deduplicate(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}