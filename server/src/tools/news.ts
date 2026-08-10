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
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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

  // Deduplicate by title similarity
  articles = deduplicate(articles);

  // Sort by date, newest first
  articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  cache.set(cacheKey, { articles, timestamp: now });

  if (category && category !== "all") {
    return articles.filter(
      (a) => a.category.toLowerCase() === category.toLowerCase(),
    );
  }

  return articles;
}

export function clearNewsCache(): void {
  cache.clear();
}

export function categorizeArticles(articles: Article[]): Record<string, Article[]> {
  const groups: Record<string, Article[]> = {
    tech: [],
    business: [],
    science: [],
    general: [],
  };

  for (const a of articles) {
    const cat = groups[a.category] ? a.category : "general";
    groups[cat].push(a);
  }

  return groups;
}

function deduplicate(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.title.toLowerCase().slice(0, 60).replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
