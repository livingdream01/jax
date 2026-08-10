"use client";

import { useState, useEffect, useCallback } from "react";

export interface Article {
  title: string; url: string; source: string; category: string; summary: string; publishedAt: string;
}

const SOURCE_COLORS: Record<string, string> = {
  "Nature": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  "MIT Tech Review": "bg-red-500/10 text-red-400 border-red-500/30",
  "IEEE Spectrum": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Quanta Magazine": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "Ars Technica": "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "Wired": "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
  "Science Daily": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "New Scientist": "bg-teal-500/10 text-teal-400 border-teal-500/30",
  "Fortune": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "MarketWatch": "bg-lime-500/10 text-lime-400 border-lime-500/30",
  "CNBC Tech": "bg-sky-500/10 text-sky-400 border-sky-500/30",
  "Hacker News": "bg-orange-600/10 text-orange-400 border-orange-600/30",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return d.toLocaleDateString();
  } catch { return ""; }
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [all, setAll] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch(`/api/news${category !== "all" ? `?category=${category}` : ""}`);
      const data = await res.json();
      setAll(data.articles || []);
      setArticles(category === "all" ? data.articles || [] : (data.articles || []).filter((a: Article) => a.category === category));
    } catch {} finally { setLoading(false); }
  }, [category]);

  useEffect(() => { fetchNews(); const i = setInterval(fetchNews, 600000); return () => clearInterval(i); }, [fetchNews]);

  const refresh = async () => {
    setLoading(true);
    await fetch("/api/news", { method: "POST" });
    await fetchNews();
  };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-apex-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">News Hub</h2>
          <p className="text-sm text-gray-500">{articles.length} articles</p>
        </div>
        <button onClick={refresh} disabled={loading} className="bg-apex-blue/10 text-apex-cyan border border-apex-blue/30 px-4 py-2 rounded-lg text-sm hover:bg-apex-blue/20 disabled:opacity-50">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>
      <div className="border-b border-apex-border px-6 py-2 flex gap-1 shrink-0">
        {["all", "tech", "business", "science"].map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${category === cat ? "bg-apex-blue/10 text-apex-cyan" : "text-gray-500 hover:text-gray-300"}`}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading && articles.length === 0 && <div className="flex items-center justify-center h-full text-gray-500"><div className="w-8 h-8 border-2 border-apex-cyan border-t-transparent rounded-full animate-spin" /></div>}
        {!loading && articles.length === 0 && <div className="flex flex-col items-center justify-center h-full text-gray-500"><p className="text-4xl mb-3">\ud83d\udcf0</p><p>No articles in this category.</p></div>}
        <div className="grid gap-3">
          {articles.map((a, i) => (
            <a key={`${a.url}-${i}`} href={a.url} target="_blank" className="block bg-apex-surface border border-apex-border rounded-lg p-4 hover:border-apex-cyan/50 transition-colors group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-200 group-hover:text-apex-cyan leading-snug">{a.title}</h3>
                  {a.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.summary}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SOURCE_COLORS[a.source] || "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>{a.source}</span>
                    <span className="text-[10px] text-gray-600">{formatDate(a.publishedAt)}</span>
                  </div>
                </div>
                <span className="text-gray-600 group-hover:text-apex-cyan shrink-0 mt-0.5">\u2197</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}