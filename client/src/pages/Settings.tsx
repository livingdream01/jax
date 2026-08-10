export default function Settings() {
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-jax-border px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-200">Settings</h2>
        <p className="text-sm text-gray-500">Configure Jax to your preferences.</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-jax-surface border border-jax-border rounded-lg p-6 max-w-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">LLM Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">DeepSeek API Key (Primary)</label>
              <input
                type="password"
                className="w-full bg-gray-900 border border-jax-border rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-jax-cyan"
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kimi API Key (Fallback)</label>
              <input
                type="password"
                className="w-full bg-gray-900 border border-jax-border rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-jax-cyan"
                placeholder="sk-..."
              />
            </div>
          </div>
        </div>

        <div className="bg-jax-surface border border-jax-border rounded-lg p-6 max-w-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">News API</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">NewsAPI Key</label>
              <input
                type="password"
                className="w-full bg-gray-900 border border-jax-border rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-jax-cyan"
                placeholder="newsapi key"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">GNews Key</label>
              <input
                type="password"
                className="w-full bg-gray-900 border border-jax-border rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-jax-cyan"
                placeholder="gnews key"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}