export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-apex-border px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-200">Settings</h2>
        <p className="text-sm text-gray-500">Configure APEX to your preferences.</p>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-apex-surface border border-apex-border rounded-lg p-6 max-w-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">LLM Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">OpenRouter API Key</label>
              <input type="password" className="w-full bg-gray-900 border border-apex-border rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-apex-cyan" placeholder="sk-or-v1-..." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tavily Search API Key</label>
              <input type="password" className="w-full bg-gray-900 border border-apex-border rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-apex-cyan" placeholder="tvly-..." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fish Audio TTS API Key</label>
              <input type="password" className="w-full bg-gray-900 border border-apex-border rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-apex-cyan" placeholder="sk-fish-..." />
            </div>
          </div>
        </div>
        <div className="bg-apex-surface border border-apex-border rounded-lg p-6 max-w-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">About</h3>
          <p className="text-sm text-gray-500">APEX v0.2.0 — Next.js. Your personal JARVIS-style assistant.</p>
          <p className="text-xs text-gray-600 mt-2">LLM: OpenRouter (DeepSeek + Kimi fallback) &bull; Search: Tavily + DDG &bull; TTS: Fish Audio + Browser</p>
        </div>
      </div>
    </div>
  );
}