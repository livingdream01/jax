import type { Article } from "../news";

interface FeedDef { url: string; source: string; category: string; }

const FEEDS: FeedDef[] = [
  { url: "https://feeds.arstechnica.com/arstechnica/index", source: "Ars Technica", category: "tech" },
  { url: "https://www.technologyreview.com/feed/", source: "MIT Tech Review", category: "tech" },
  { url: "https://spectrum.ieee.org/feeds/rss.xml", source: "IEEE Spectrum", category: "tech" },
  { url: "https://www.quantamagazine.org/feed/", source: "Quanta Magazine", category: "science" },
  { url: "https://www.nature.com/nature.rss", source: "Nature", category: "science" },
  { url: "https://www.sciencedaily.com/rss/all.xml", source: "Science Daily", category: "science" },
  { url: "https://www.wired.com/feed/rss", source: "Wired", category: "tech" },
  { url: "https://fortune.apps.feed.co/feed.rss", source: "Fortune", category: "business" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC Tech", category: "business" },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories", source: "MarketWatch", category: "business" },
  { url: "https://www.newscientist.com/feed/", source: "New Scientist", category: "science" },
];

async function fetchOne(feed: FeedDef): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, { headers: { "User-Agent": "APEX/1.0" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    return items.slice(0, 6).map(item => {
      const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      const url = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
      const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]*>/g, "").trim().slice(0, 200);
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || new Date().toISOString();
      return { title: title || `${feed.source} article`, url: url || feed.url, source: feed.source, category: feed.category, summary: desc || `Latest from ${feed.source}`, publishedAt: new Date(pubDate).toISOString() };
    }).filter(a => a.title);
  } catch { return []; }
}

export async function fetchRssFeeds(): Promise<Article[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchOne));
  const articles: Article[] = [];
  for (const r of results) { if (r.status === "fulfilled") articles.push(...r.value); }
  return articles;
}