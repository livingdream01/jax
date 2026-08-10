import { useState, useEffect, useCallback } from "react";

export interface Article {
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string;
  publishedAt: string;
}

export function useNews() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [error, setError] = useState("");

  const fetchNews = useCallback(async (cat: string) => {
    setLoading(true);
    setError("");
    try {
      const params = cat !== "all" ? `?category=${cat}` : "";
      const res = await fetch(`/api/news${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (e) {
      setError("Failed to fetch news. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/news/refresh", { method: "POST" });
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      // fallback to regular fetch
      await fetchNews(category);
    } finally {
      setLoading(false);
    }
  }, [category, fetchNews]);

  useEffect(() => {
    fetchNews(category);
    const interval = setInterval(() => fetchNews(category), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [category, fetchNews]);

  const switchCategory = (cat: string) => {
    setCategory(cat);
  };

  const filtered =
    category === "all"
      ? articles
      : articles.filter((a) => a.category === category);

  return { articles: filtered, allArticles: articles, loading, error, category, switchCategory, refresh };
}
