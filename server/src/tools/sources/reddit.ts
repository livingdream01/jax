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
  { name: "r/MachineLearning", category: "tech" },
  { name: "r/business", category: "business" },
];

const FLUFF = [
  /(?:\?|how to|what is|why does|when will|can someone|anyone else|does anyone)/i,
  /^ELI5/i,
  /^PSA/i,
  /my (first|new|latest)/i,
  /upvote|downvote/i,
];

function isUseful(title: string): boolean {
  if (title.length < 40) return false;
  if (FLUFF.some((p) => p.test(title))) return false;
  return true;
}

async function fetchSubreddit(sub: { name: string; category: string }): Promise<Article[]> {
  try {
    const res = await fetch(`https://www.reddit.com/${sub.name}/hot.json?limit=20`, {
      headers: { "User-Agent": "APEX/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as RedditResponse;
    const posts = data.data?.children || [];

    return posts
      .filter((p) => {
        if (p.data.stickied) return false;
        if (p.data.score < 50 && p.data.num_comments < 10) return false;
        if (!isUseful(p.data.title)) return false;
        return true;
      })
      .map((p) => ({
        title: p.data.title,
        url: `https://www.reddit.com${p.data.permalink}`,
        source: sub.name,
        category: sub.category,
        summary: p.data.selftext
          ? p.data.selftext.slice(0, 250).replace(/\n/g, " ")
          : `${p.data.score} upvotes · ${p.data.num_comments} comments`,
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
