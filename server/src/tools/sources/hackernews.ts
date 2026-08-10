interface Article {
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string;
  publishedAt: string;
}

interface HnItem {
  id: number;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
  time?: number;
  type?: string;
}

const HN_BASE = "https://hacker-news.firebaseio.com/v0";

export async function fetchHackerNews(): Promise<Article[]> {
  const topRes = await fetch(`${HN_BASE}/topstories.json`);
  const ids: number[] = (await topRes.json()) as number[];

  const batch = ids.slice(0, 30);
  const items: HnItem[] = await Promise.all(
    batch.map(async (id) => {
      const res = await fetch(`${HN_BASE}/item/${id}.json`);
      return (await res.json()) as HnItem;
    }),
  );

  return items
    .filter((item) => item.url && item.title)
    .map((item) => ({
      title: item.title!,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      source: "Hacker News",
      category: item.type === "job" ? "business" : "tech",
      summary: item.text
        ? String(item.text).slice(0, 200).replace(/<[^>]*>/g, "")
        : `${item.score || 0} points, ${item.descendants || 0} comments`,
      publishedAt: new Date((item.time || 0) * 1000).toISOString(),
    }));
}
