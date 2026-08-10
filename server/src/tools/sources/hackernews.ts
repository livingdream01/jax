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

const TECH_KEYWORDS = /\b(AI|LLM|model|startup|YC|funding|protocol|API|database|compiler|language|framework|open.source|rust|go\b|typescript|python|linux|kernel|security|vulnerability|AWS|cloud|container|Kubernetes|Docker|Nix|GPU|chip|transistor|quantum|browser|WASM|CSS|HTTP|TCP|DNS|encryption|postgres|sqlite|graphql|react|node)\b/i;

export async function fetchHackerNews(): Promise<Article[]> {
  try {
    const topRes = await fetch(`${HN_BASE}/topstories.json`, { signal: AbortSignal.timeout(8000) });
    if (!topRes.ok) return [];
    const ids: number[] = (await topRes.json()) as number[];

    const batch = ids.slice(0, 40);
    const items: HnItem[] = await Promise.all(
      batch.map(async (id) => {
        const res = await fetch(`${HN_BASE}/item/${id}.json`, { signal: AbortSignal.timeout(5000) });
        return (await res.json()) as HnItem;
      }),
    );

    return items
      .filter((item) => {
        if (!item.url || !item.title) return false;
        // Quality gate: must have meaningful engagement
        const score = item.score || 0;
        const comments = item.descendants || 0;
        if (score < 20 && comments < 10) return false;
        // Tech-relevant only
        const relevance = TECH_KEYWORDS.test(item.title)
          || item.type === "job"
          || comments > 50;
        return relevance;
      })
      .map((item) => ({
        title: item.title!,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        source: "Hacker News",
        category: classifyHn(item.title!),
        summary: `${item.score} points · ${item.descendants || 0} comments`,
        publishedAt: new Date((item.time || 0) * 1000).toISOString(),
      }));
  } catch {
    return [];
  }
}

function classifyHn(title: string): string {
  if (/\b(funding|IPO|acquisition|raise[dst]?\$|revenue|market|stock|layoff)\b/i.test(title)) return "business";
  if (/\b(discovery|study|research|physics|biology|gene|protein|climate|nasa)\b/i.test(title)) return "science";
  return "tech";
}
