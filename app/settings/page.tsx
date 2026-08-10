export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="h-14 flex items-center px-6 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-text-secondary">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-lg">
        <section className="glass-elevated rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">API Configuration</h3>
          <div className="space-y-4">
            <FormField label="OpenRouter API Key" placeholder="sk-or-v1-..." type="password" />
            <FormField label="Tavily Search Key" placeholder="tvly-..." type="password" />
            <FormField label="Fish Audio TTS Key" placeholder="sk-fish-..." type="password" />
          </div>
        </section>

        <section className="glass-elevated rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">About APEX</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border-subtle">
              <span className="text-text-tertiary">Version</span>
              <span className="text-text-secondary font-mono">0.2.0</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle">
              <span className="text-text-tertiary">Framework</span>
              <span className="text-text-secondary">Next.js 15</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle">
              <span className="text-text-tertiary">LLM</span>
              <span className="text-text-secondary">OpenRouter (DeepSeek + Kimi)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-subtle">
              <span className="text-text-tertiary">Search</span>
              <span className="text-text-secondary">Tavily + DuckDuckGo</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-text-tertiary">TTS</span>
              <span className="text-text-secondary">Fish Audio + Browser</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FormField({ label, placeholder, type = "text" }: { label: string; placeholder: string; type: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
      <input type={type} placeholder={placeholder}
        className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-border focus:ring-1 focus:ring-accent/30 transition-all font-mono" />
    </div>
  );
}