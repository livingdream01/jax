import https from "node:https";

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface TavilyResponse {
  results: {
    title: string;
    url: string;
    content: string;
    score: number;
  }[];
  answer?: string;
}

const TAVILY_URL = "https://api.tavily.com/search";

async function tavilySearch(query: string): Promise<{ results: SearchResult[]; answer: string }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");

  const res = await fetch(TAVILY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tavily error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as TavilyResponse;

  return {
    results: (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    })),
    answer: data.answer || "",
  };
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false, headers: { "User-Agent": "APEX/1.0" } }, (res) => {
        let body = "";
        res.on("data", (chunk: string) => (body += chunk));
        res.on("end", () => resolve(body));
        res.on("error", reject);
      })
      .on("error", reject)
      .setTimeout(6000, () => reject(new Error("timeout")));
  });
}

async function ddgSearch(query: string): Promise<{ results: SearchResult[]; answer: string }> {
  try {
    const q = encodeURIComponent(query);
    const html = await httpsGet(`https://html.duckduckgo.com/html/?q=${q}`);

    const results: SearchResult[] = [];
    const resultRegex = /<a\s+rel="nofollow"\s+(?:class="[^"]*"\s*)?href="([^"]+)"[^>]*>([^<]+)<\/a>\s*(?:<br\s*\/?>)?\s*<span\s+class="[^"]*">([^<]*)<\/span>/gi;
    const linkRegex = /<a\s+(?:[^>]*\s+)?rel="nofollow"\s+(?:[^>]*\s+)?href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;

    let match;
    const links: { url: string; title: string }[] = [];
    while ((match = linkRegex.exec(html)) && links.length < 6) {
      links.push({
        url: match[1].replace(/&amp;/g, "&"),
        title: match[2].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(),
      });
    }

    const descRegex = /<span\s+class="[^"]*">([^<]+)<\/span>/gi;
    const descs: string[] = [];
    while ((match = descRegex.exec(html)) && descs.length < links.length) {
      const desc = match[1].trim();
      if (desc && desc.length > 10 && !desc.includes("http")) {
        descs.push(desc);
      }
    }

    links.forEach((link, i) => {
      results.push({
        title: link.title,
        url: link.url,
        content: descs[i] || "",
      });
    });

    return { results, answer: "" };
  } catch {
    return { results: [], answer: "" };
  }
}

export async function webSearch(query: string): Promise<{ results: SearchResult[]; answer: string }> {
  try {
    return await tavilySearch(query);
  } catch (err) {
    console.warn("[APEX] Tavily failed, trying DDG fallback:", (err as Error).message);
    try {
      return await ddgSearch(query);
    } catch (err2) {
      console.error("[APEX] DDG fallback also failed:", (err2 as Error).message);
      return { results: [], answer: "Search engines unavailable at the moment, sir." };
    }
  }
}
