export default function News() {
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-jax-border px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">News Hub</h2>
          <p className="text-sm text-gray-500">Your daily briefing, curated by Jax.</p>
        </div>
        <button className="bg-jax-blue/10 text-jax-cyan border border-jax-blue/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-jax-blue/20 transition-colors">
          Refresh
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-4xl mb-3">📰</p>
          <p className="text-lg">News aggregation engine initializing…</p>
          <p className="text-sm mt-1">Coming in Phase 3</p>
        </div>
      </div>
    </div>
  );
}