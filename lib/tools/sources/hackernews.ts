import type { Article } from "../news";

function getTextContent(elem: any): string {
  return elem?.textContent?.() || elem?.text?.() || elem?.text || "";
}

function getAttr(elem: any, attr: string): string {
  return elem?.getAttribute?.(attr) || "";
}

function getHref(elem: any): string {
  return getAttr(elem, "href");
}

export async function fetchHackerNews(): Promise<Article[]> {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("HN fetch failed");
    const ids: number[] = (await res.json()).slice(0, 20);
    const items = await Promise.all(ids.map(async (id: number) => {
      try {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(3000) });
        return r.ok ? r.json() : null;
      } catch { return null; }
    }));
    return items.filter(Boolean).map((item: any) => ({
      title: item.title || "Untitled HN story",
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      source: "Hacker News",
      category: "tech",
      summary: item.score ? `${item.score} points | ${item.descendants || 0} comments` : "Top story on Hacker News",
      publishedAt: new Date((item.time || 0) * 1000).toISOString(),
    }));
  } catch { return []; }
}