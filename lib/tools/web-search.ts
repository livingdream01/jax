import https from "node:https";

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

async function tavilySearch(query: string): Promise<{ results: SearchResult[]; answer: string }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, search_depth: "advanced", include_answer: true, max_results: 8 }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json() as any;
  return {
    results: (data.results || []).map((r: any) => ({ title: r.title, url: r.url, content: r.content, score: r.score })),
    answer: data.answer || "",
  };
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false, headers: { "User-Agent": "APEX/1.0" } }, (res) => {
      let body = "";
      res.on("data", (c: string) => body += c);
      res.on("end", () => resolve(body));
      res.on("error", reject);
    }).on("error", reject).setTimeout(6000, () => reject(new Error("timeout")));
  });
}

async function ddgSearch(query: string): Promise<{ results: SearchResult[]; answer: string }> {
  try {
    const html = await httpsGet(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const results: SearchResult[] = [];
    const linkRegex = /<a\s+(?:[^>]*\s+)?rel="nofollow"\s+(?:[^>]*\s+)?href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    const links: { url: string; title: string }[] = [];
    let match;
    while ((match = linkRegex.exec(html)) && links.length < 6) {
      links.push({ url: match[1].replace(/&amp;/g, "&"), title: match[2].replace(/<[^>]*>/g, "").trim() });
    }
    const descRegex = /<span\s+class="[^"]*">([^<]+)<\/span>/gi;
    const descs: string[] = [];
    while ((match = descRegex.exec(html)) && descs.length < links.length) {
      const desc = match[1].trim();
      if (desc && desc.length > 10 && !desc.includes("http")) descs.push(desc);
    }
    links.forEach((link, i) => results.push({ title: link.title, url: link.url, content: descs[i] || "" }));
    return { results, answer: "" };
  } catch { return { results: [], answer: "" }; }
}

export async function webSearch(query: string): Promise<{ results: SearchResult[]; answer: string }> {
  try { return await tavilySearch(query); } catch (err) {
    console.warn("[APEX] Tavily failed, DDG fallback");
    try { return await ddgSearch(query); } catch { return { results: [], answer: "Search engines unavailable." }; }
  }
}