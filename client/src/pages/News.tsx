import { useNews } from "../hooks/useNews";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "tech", label: "Tech" },
  { id: "business", label: "Business" },
  { id: "science", label: "Science" },
];

const SOURCE_COLORS: Record<string, string> = {
  // Tier 1 — premium sources
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
  // Tier 2
  "Hacker News": "bg-orange-600/10 text-orange-400 border-orange-600/30",
  "r/technology": "bg-blue-600/10 text-blue-400 border-blue-600/30",
  "r/programming": "bg-blue-600/10 text-blue-400 border-blue-600/30",
  "r/MachineLearning": "bg-violet-600/10 text-violet-400 border-violet-600/30",
  "r/business": "bg-amber-600/10 text-amber-400 border-amber-600/30",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);

    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function News() {
  const { articles, loading, error, category, switchCategory, refresh } = useNews();

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-jax-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">News Hub</h2>
          <p className="text-sm text-gray-500">
            {loading
              ? "Gathering intelligence..."
              : `${articles.length} articles across ${new Set(articles.map((a) => a.source)).size} sources`}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="bg-jax-blue/10 text-jax-cyan border border-jax-blue/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-jax-blue/20 transition-colors disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <div className="border-b border-jax-border px-6 py-2 flex gap-1 shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => switchCategory(cat.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              category === cat.id
                ? "bg-jax-blue/10 text-jax-cyan"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <div className="w-8 h-8 border-2 border-jax-cyan border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Fetching latest headlines...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && articles.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-4xl mb-3">📰</p>
            <p className="text-lg">No articles in this category yet.</p>
            <p className="text-sm mt-1">Try another category or refresh.</p>
          </div>
        )}

        {articles.length > 0 && (
          <div className="grid gap-3">
            {articles.map((article, i) => {
              const sourceStyle =
                SOURCE_COLORS[article.source] ||
                "bg-gray-500/10 text-gray-400 border-gray-500/30";

              return (
                <a
                  key={`${article.url}-${i}`}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-jax-surface border border-jax-border rounded-lg p-4 hover:border-jax-cyan/50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-200 group-hover:text-jax-cyan transition-colors leading-snug">
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${sourceStyle}`}
                        >
                          {article.source}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {formatDate(article.publishedAt)}
                        </span>
                      </div>
                    </div>
                    <span className="text-gray-600 group-hover:text-jax-cyan transition-colors shrink-0 mt-0.5">
                      ↗
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
