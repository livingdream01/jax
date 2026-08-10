"use client";

import { useState, useEffect, useCallback } from "react";

interface AutomationTask {
  id: number; name: string; cronExpression: string; type: string; params: string;
  enabled: boolean; lastRun: string | null; lastStatus: string | null; createdAt: string;
}

const CRON_LABELS: Record<string, string> = {
  "0 8 * * *": "Every day at 8:00 AM", "0 9 * * *": "Every day at 9:00 AM",
  "0 7 * * 1": "Mondays at 7:00 AM", "0 */6 * * *": "Every 6 hours",
  "0 0 * * *": "Daily at midnight", "*/15 * * * *": "Every 15 minutes",
  "0 8 * * 1-5": "Weekdays at 8:00 AM", "0 9 * * 1-5": "Weekdays at 9:00 AM",
  "0 18 * * *": "Every day at 6:00 PM",
};

const TYPE_META: Record<string, { icon: string; color: string }> = {
  briefing: { icon: "\ud83d\udcf0", color: "text-accent-glow" },
  search: { icon: "\ud83d\udd0d", color: "text-warning" },
  custom: { icon: "\u2699", color: "text-text-secondary" },
};

export default function AutomationsPage() {
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try { const res = await fetch("/api/automations"); const d = await res.json(); setTasks(d.tasks || []); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTask = async (id: number, enabled: boolean) => {
    await fetch(`/api/automations?id=${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    setTasks(p => p.map(t => t.id === id ? { ...t, enabled } : t));
  };

  const delTask = async (id: number) => {
    await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
    setTasks(p => p.filter(t => t.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 flex items-center px-6 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-text-secondary">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <h2 className="text-sm font-semibold text-text-primary">Automations</h2>
          <span className="text-[11px] text-text-tertiary">{tasks.filter(t => t.enabled).length} active</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && <div className="flex items-center justify-center min-h-[40vh]"><div className="w-6 h-6 border-2 border-accent-glow border-t-transparent rounded-full animate-spin" /></div>}
        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-text-tertiary">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            <p className="text-sm font-medium text-text-secondary mb-1">No automations yet</p>
            <p className="text-xs mb-4">Create one by chatting with APEX</p>
            <code className="bg-bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-xs text-text-secondary font-mono">/automate every morning at 8am briefing</code>
          </div>
        )}
        <div className="space-y-2">
          {tasks.map(t => {
            const meta = TYPE_META[t.type] || TYPE_META.custom;
            const params = t.params ? JSON.parse(t.params) : {};
            return (
              <div key={t.id} className="bg-bg-surface border border-border-subtle rounded-xl p-4 hover:border-border-default transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-lg shrink-0 mt-0.5">{meta.icon}</span>
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">{t.name}</h3>
                      <p className="text-xs text-text-tertiary mt-0.5">{CRON_LABELS[t.cronExpression] || t.cronExpression}</p>
                      {t.type === "briefing" && params.category && (
                        <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-accent-muted text-accent-glow border border-accent-border/30">{params.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleTask(t.id, !t.enabled)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${t.enabled ? "bg-accent" : "bg-bg-elevated border border-border-default"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${t.enabled ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                    <button onClick={() => delTask(t.id)} className="text-text-tertiary hover:text-danger transition-colors p-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>
                {t.lastRun && (
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-3 text-[10px]">
                    <span className="text-text-tertiary">Last run: {t.lastRun.slice(11, 16)}</span>
                    <span className={`px-1.5 py-0.5 rounded font-medium ${t.lastStatus === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{t.lastStatus}</span>
                    <span className="text-text-tertiary ml-auto font-mono">{t.cronExpression}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-3 border-t border-border-subtle shrink-0">
        <p className="text-[11px] text-text-tertiary">Use <code className="text-accent-glow font-mono">/automate</code> in chat to create tasks</p>
      </div>
    </div>
  );
}