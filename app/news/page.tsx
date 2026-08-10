"use client";

import { useState, useEffect, useCallback } from "react";

interface Article {
  title: string; url: string; source: string; category: string; summary: string; publishedAt: string;
}

const SOURCE_COLORS: Record<string, string> = {
  "Nature": "text-accent-glow border-accent-glow/20 bg-accent-muted",
  "MIT Tech Review": "text-danger border-danger/20 bg-danger/10",
  "Quanta Magazine": "text-purple-400 border-purple-400/20 bg-purple-400/10",
  "Ars Technica": "text-orange-400 border-orange-400/20 bg-orange-400/10",
  "Wired": "text-fuchsia-400 border-fuchsia-400/20 bg-fuchsia-400/10",
  "IEEE Spectrum": "text-blue-400 border-blue-400/20 bg-blue-400/10",
  "Science Daily": "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  "New Scientist": "text-teal-400 border-teal-400/20 bg-teal-400/10",
  "Fortune": "text-amber-400 border-amber-400/20 bg-amber-400/10",
  "MarketWatch": "text-lime-400 border-lime-400/20 bg-lime-400/10",
  "CNBC Tech": "text-sky-400 border-sky-400/20 bg-sky-400/10",
  "Hacker News": "text-orange-300 border-orange-300/20 bg-orange-300/10",
};

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch(`/api/news${category !== "all" ? `?category=${category}` : ""}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {} finally { setLoading(false); }
  }, [category]);

  useEffect(() => { fetchNews(); const i = setInterval(fetchNews, 600000); return () => clearInterval(i); }, [fetchNews]);

  const refresh = async () => { setLoading(true); await fetch("/api/news", { method: "POST" }); await fetchNews(); };

  const cats = ["all", "tech", "business", "science"];

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 flex items-center px-6 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-text-secondary">
            <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />
          </svg>
          <h2 className="text-sm font-semibold text-text-primary">News</h2>
          <span className="text-[11px] text-text-tertiary">{articles.length} articles</span>
        </div>
        <button onClick={refresh} disabled={loading}
          className="ml-auto flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-glass border border-transparent hover:border-border-subtle transition-all disabled:opacity-40">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? "animate-spin" : ""}>
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {loading ? "Refreshing" : "Refresh"}
        </button>
      </header>

      <div className="px-6 py-2 border-b border-border-subtle flex gap-1">
        {cats.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 h-7 rounded-lg text-xs font-medium transition-all ${
              category === c ? "bg-accent-muted text-accent-glow border border-accent-border" : "text-text-tertiary hover:text-text-secondary hover:bg-bg-glass border border-transparent"
            }`}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && articles.length === 0 && (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-bg-surface border border-border-subtle rounded-xl p-4 animate-shimmer h-24" />
          ))}</div>
        )}
        {!loading && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-text-tertiary">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40"><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
            <p className="text-sm">No articles in this category</p>
          </div>
        )}
        <div className="grid gap-2">
          {articles.map((a, i) => (
            <a key={`${a.url}-${i}`} href={a.url} target="_blank" rel="noopener"
              className="block bg-bg-surface border border-border-subtle rounded-xl p-4 hover:border-border-default hover:bg-bg-elevated transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-text-primary group-hover:text-accent-glow transition-colors leading-snug">{a.title}</h3>
                  {a.summary && <p className="text-xs text-text-tertiary mt-1.5 line-clamp-2 leading-relaxed">{a.summary}</p>}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${SOURCE_COLORS[a.source] || "text-text-tertiary border-border-subtle bg-bg-glass"}`}>{a.source}</span>
                    <span className="text-[10px] text-text-tertiary">{formatDate(a.publishedAt)}</span>
                  </div>
                </div>
                <span className="text-text-tertiary group-hover:text-accent-glow shrink-0 mt-0.5 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg></span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso); const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`; if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return d.toLocaleDateString();
  } catch { return ""; }
}