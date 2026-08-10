import * as cheerio from "cheerio";
import { webSearch } from "./web-search.js";

interface ResearchResult {
  title: string;
  url: string;
  content: string;
  summary: string;
}

interface ResearchReport {
  topic: string;
  answer: string;
  sources: ResearchResult[];
}

export async function deepResearch(
  topic: string,
  llm: (messages: { role: "system" | "user" | "assistant"; content: string }[], onChunk: (t: string) => void) => Promise<string>,
  onChunk: (t: string) => void,
): Promise<ResearchReport> {
  onChunk(`Researching "${topic}"...\n\n`);

  // Step 1: Search
  onChunk("Searching for sources...\n");
  const { results } = await webSearch(topic);
  const topResults = results.slice(0, 4);

  if (topResults.length === 0) {
    onChunk("No sources found, sir.\n");
    return { topic, answer: "No results found.", sources: [] };
  }

  onChunk(`Found ${results.length} results. Fetching top ${topResults.length} sources...\n\n`);

  // Step 2: Fetch and extract content from each result
  const sources: ResearchResult[] = [];
  for (let i = 0; i < topResults.length; i++) {
    const r = topResults[i];
    onChunk(`Fetching source ${i + 1}/${topResults.length}: ${r.title.slice(0, 60)}...\n`);
    try {
      const content = await fetchPageContent(r.url);
      if (content && content.length > 100) {
        sources.push({
          title: r.title,
          url: r.url,
          content: content.slice(0, 4000),
          summary: content.slice(0, 500),
        });
      } else {
        sources.push({
          title: r.title,
          url: r.url,
          content: r.content || "",
          summary: r.content || "No additional content extracted.",
        });
      }
    } catch {
      sources.push({
        title: r.title,
        url: r.url,
        content: r.content || "",
        summary: r.content || "Could not fetch full content.",
      });
    }
  }

  // Step 3: Synthesize research report
  onChunk("\nSynthesizing research report...\n\n");

  const sourcesText = sources
    .map(
      (s, i) =>
        `Source ${i + 1}: ${s.title}\nURL: ${s.url}\nContent:\n${s.content.slice(0, 3000)}`,
    )
    .join("\n\n---\n\n");

  const prompt = `You are APEX, an AI research assistant. Synthesize a comprehensive research report on the topic "${topic}" using the provided sources. Follow this structure:

1. **Executive Summary** (2-3 sentences)
2. **Key Findings** (3-5 bullet points with specific details from sources)
3. **Analysis** (your synthesis of the findings)
4. **Sources Cited** (list each source by number, include title and URL)

Be factual, cite sources inline as [Source N]. Do not hallucinate — only use information from the provided sources. End with "End of research report, sir."

Sources:
${sourcesText}`;

  const answer = await llm([
    { role: "system" as const, content: "You are APEX, a rigorous research assistant. Only cite provided sources." },
    { role: "user" as const, content: prompt },
  ], (chunk) => {
    onChunk(chunk);
  });

  return { topic, answer, sources };
}

export async function fetchPageContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; APEX/1.0)" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return "";

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove non-content elements
  $("script, style, nav, footer, header, aside, iframe, noscript, .sidebar, .comments, .ads, .nav, .menu, .cookie").remove();

  // Try to get main content
  let content = $("article, main, [role='main'], .post-content, .article-content, .entry-content, .content-body")
    .text()
    .trim();

  // Fallback to body
  if (content.length < 200) {
    content = $("body").text().trim();
  }

  // Clean up
  content = content
    .replace(/\s{3,}/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 5000);

  return content;
}