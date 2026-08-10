import * as cheerio from "cheerio";

interface Article {
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string;
  publishedAt: string;
}

interface RssFeed {
  name: string;
  url: string;
  category: string;
}

const FEEDS: RssFeed[] = [
  // TECH
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", category: "tech" },
  { name: "Wired", url: "https://www.wired.com/feed/rss", category: "tech" },
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/feed/", category: "tech" },
  { name: "IEEE Spectrum", url: "https://spectrum.ieee.org/feeds/topic/computing.rss", category: "tech" },
  // BUSINESS
  { name: "CNBC Tech", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910", category: "business" },
  { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories", category: "business" },
  { name: "Fortune", url: "https://fortune.com/feed/", category: "business" },
  // SCIENCE
  { name: "Nature", url: "https://www.nature.com/nature.rss", category: "science" },
  { name: "Science Daily", url: "https://www.sciencedaily.com/rss/top/science.xml", category: "science" },
  { name: "Quanta Magazine", url: "https://www.quantamagazine.org/feed/", category: "science" },
  { name: "New Scientist", url: "https://www.newscientist.com/feed/home", category: "science" },
];

// Keyword-based relevance booster: articles matching these get ranked higher
const RELEVANCE_KEYWORDS: Record<string, RegExp[]> = {
  tech: [/AI\b/i, /model\b/i, /\bchip\b/i, /quantum/i, /cyber/i, /semiconductor/i, /LLM/i, /startup/i, /\bipo\b/i, /robot/i, /autonomous/i],
  business: [/market/i, /\bstock\b/i, /\binvest\b/i, /acquisition/i, /merger/i, /revenue/i, /earnings/i, /regulation/i, /\btrade\b/i, /inflation/i, /rate cut/i],
  science: [/discovery/i, /breakthrough/i, /study\b/i, /research/i, /clinical/i, /gene\b/i, /climate/i, /physics/i, /\bproteins?\b/i, /cancer/i],
};

// Anti-fluff: skip articles matching these patterns
const FLUFF_PATTERNS = [
  /how to (get|make|build|find|watch|use|buy)/i,
  /best .+ (of|for) \d{4}/i,
  /deals? of the (day|week)/i,
  /^\d+ (best|top|ways|things)/i,
  /review:? .+(phone|laptop|headphone|earbud|tablet)/i,
  /gift guide/i,
  /sale on/i,
  /discount code/i,
];

function isFluff(title: string): boolean {
  return FLUFF_PATTERNS.some((p) => p.test(title));
}

function relevanceScore(title: string, category: string): number {
  const keywords = RELEVANCE_KEYWORDS[category] || [];
  return keywords.reduce((score, re) => (re.test(title) ? score + 1 : score), 0);
}

function cleanSummary(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/The post .+ appeared first on .+\.?/g, "")
    .replace(/Read more\.{0,3}\s*$/i, "")
    .trim()
    .slice(0, 400);
}

async function fetchFeed(feed: RssFeed): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "APEX/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const articles: Article[] = [];
    $("item, entry").each((_, el) => {
      const $el = $(el);
      const title = $el.find("title").first().text().trim();
      const link = $el.find("link").first().text().trim() || $el.find("link").attr("href") || "";
      const desc = $el.find("description, summary, content\\:encoded").first().text().trim();
      const pubDate = $el.find("pubDate, published, updated, dc\\:date").first().text().trim();

      if (!title || !link || isFluff(title)) return;

      const clean = cleanSummary(desc);
      if (clean.length < 80) return; // Skip ultra-short items

      articles.push({
        title,
        url: link,
        source: feed.name,
        category: feed.category,
        summary: clean,
        publishedAt: pubDate || new Date().toISOString(),
      });
    });

    return articles.slice(0, 12);
  } catch {
    return [];
  }
}

export async function fetchRssFeeds(): Promise<Article[]> {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  return results.flat();
}
