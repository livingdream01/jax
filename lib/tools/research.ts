import * as cheerio from "cheerio";
import { webSearch } from "./web-search";

interface ResearchResult { title: string; url: string; content: string; summary: string; }

export async function deepResearch(
  topic: string,
  llm: (messages: { role: "system" | "user" | "assistant"; content: string }[], onChunk: (t: string) => void) => Promise<string>,
  onChunk: (t: string) => void,
): Promise<void> {
  onChunk(`Researching "${topic}"...\n\nSearching for sources...\n`);
  const { results } = await webSearch(topic);
  const topResults = results.slice(0, 4);
  if (topResults.length === 0) { onChunk("No sources found."); return; }
  onChunk(`Found ${results.length} results. Fetching top ${topResults.length} sources...\n\n`);

  const sources: ResearchResult[] = [];
  for (let i = 0; i < topResults.length; i++) {
    const r = topResults[i];
    onChunk(`Fetching source ${i + 1}/${topResults.length}: ${r.title.slice(0, 60)}...\n`);
    try {
      const content = await fetchPageContent(r.url);
      sources.push({ title: r.title, url: r.url, content: (content && content.length > 100 ? content : r.content).slice(0, 4000), summary: content?.slice(0, 500) || r.content });
    } catch {
      sources.push({ title: r.title, url: r.url, content: r.content || "", summary: r.content || "" });
    }
  }

  const sourcesText = sources.map((s, i) => `Source ${i + 1}: ${s.title}\nURL: ${s.url}\nContent:\n${s.content.slice(0, 3000)}`).join("\n\n---\n\n");
  onChunk("\nSynthesizing research report...\n\n");

  const prompt = `Synthesize a research report on "${topic}". Structure:
1. **Executive Summary** (2-3 sentences)
2. **Key Findings** (3-5 bullets with details)
3. **Analysis**
4. **Sources Cited** (numbered with title + URL)
Cite inline as [Source N]. Only use provided sources. End with "End of research report, sir."

Sources:\n${sourcesText}`;

  await llm([{ role: "system" as const, content: "You are APEX, a rigorous research assistant." }, { role: "user" as const, content: prompt }], onChunk);
}

export async function fetchPageContent(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; APEX/1.0)" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return "";
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, aside, iframe, noscript, .sidebar, .comments, .ads, .nav, .menu, .cookie").remove();
  let content = $("article, main, [role='main'], .post-content, .article-content, .entry-content, .content-body").text().trim();
  if (content.length < 200) content = $("body").text().trim();
  return content.replace(/\s{3,}/g, "\n\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 5000);
}