import type { Article } from "../news";

const SUBREDDITS = [
  { sub: "technology", source: "r/technology", category: "tech" },
  { sub: "programming", source: "r/programming", category: "tech" },
  { sub: "MachineLearning", source: "r/MachineLearning", category: "tech" },
  { sub: "business", source: "r/business", category: "business" },
];

async function fetchSub(sub: string, source: string, category: string): Promise<Article[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, { headers: { "User-Agent": "APEX/1.0" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as any;
    const posts = data?.data?.children || [];
    return posts.map((p: any) => {
      const d = p.data;
      return { title: d.title, url: `https://reddit.com${d.permalink}`, source, category, summary: d.selftext?.slice(0, 200) || `${d.score} upvotes | ${d.num_comments} comments`, publishedAt: new Date(d.created_utc * 1000).toISOString() };
    });
  } catch { return []; }
}

export async function fetchReddit(): Promise<Article[]> {
  const results = await Promise.allSettled(SUBREDDITS.map(s => fetchSub(s.sub, s.source, s.category)));
  const articles: Article[] = [];
  for (const r of results) { if (r.status === "fulfilled") articles.push(...r.value); }
  return articles;
}