interface Article {
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string;
  publishedAt: string;
}

interface RedditPost {
  data: {
    title: string;
    permalink: string;
    selftext: string;
    score: number;
    num_comments: number;
    created_utc: number;
    stickied: boolean;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

const SUBREDDITS = [
  { name: "r/technology", category: "tech" },
  { name: "r/programming", category: "tech" },
  { name: "r/science", category: "science" },
  { name: "r/worldnews", category: "general" },
];

async function fetchSubreddit(sub: { name: string; category: string }): Promise<Article[]> {
  try {
    const res = await fetch(`https://www.reddit.com/${sub.name}/hot.json?limit=15`, {
      headers: { "User-Agent": "JAX/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as RedditResponse;
    const posts = data.data?.children || [];

    return posts
      .filter((p) => !p.data.stickied)
      .map((p) => ({
        title: p.data.title,
        url: `https://www.reddit.com${p.data.permalink}`,
        source: sub.name,
        category: sub.category,
        summary: p.data.selftext
          ? p.data.selftext.slice(0, 250)
          : `${p.data.score} upvotes, ${p.data.num_comments} comments`,
        publishedAt: new Date(p.data.created_utc * 1000).toISOString(),
      }));
  } catch {
    return [];
  }
}

export async function fetchReddit(): Promise<Article[]> {
  const results = await Promise.all(SUBREDDITS.map(fetchSubreddit));
  return results.flat();
}
