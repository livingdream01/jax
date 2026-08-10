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
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", category: "tech" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "tech" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "tech" },
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "general" },
  { name: "Reuters", url: "https://www.rss-bridge.org/bridge01/?action=display&bridge=FilterBridge&url=https%3A%2F%2Fwww.reuters.com&content_filter=&content_filter_type=text&title_filter=&title_filter_type=text&inverse=on&case_insensitive=on&fix_encoding=&format=Atom", category: "general" },
];

async function fetchFeed(feed: RssFeed): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "JAX/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const articles: Article[] = [];
    $("item, entry").each((_, el) => {
      const $el = $(el);
      const title = $el.find("title").first().text().trim();
      const link = $el.find("link").first().text().trim() || $el.find("link").attr("href") || "";
      const desc = $el.find("description, summary").first().text().trim();
      const pubDate = $el.find("pubDate, published, updated").first().text().trim();

      if (title && link) {
        articles.push({
          title,
          url: link,
          source: feed.name,
          category: feed.category,
          summary: desc.replace(/<[^>]*>/g, "").slice(0, 250),
          publishedAt: pubDate || new Date().toISOString(),
        });
      }
    });

    return articles.slice(0, 15);
  } catch {
    return [];
  }
}

export async function fetchRssFeeds(): Promise<Article[]> {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  return results.flat();
}
