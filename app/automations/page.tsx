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
      <header className="border-b border-apex-border px-6 py-4 shrink-0">
        <h2 className="text-lg font-semibold text-gray-200">Automations</h2>
        <p className="text-sm text-gray-500">{tasks.filter(t => t.enabled).length} active</p>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {loading && <div className="flex items-center justify-center h-full text-gray-500"><div className="w-6 h-6 border-2 border-apex-cyan border-t-transparent rounded-full animate-spin" /></div>}
        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-4xl mb-3">\u26a1</p>
            <p className="text-lg font-medium text-gray-400 mb-2">No automations yet</p>
            <div className="bg-apex-surface border border-apex-border rounded-lg p-4 max-w-md"><p className="text-xs text-gray-400 font-mono">/automate every morning at 8am compile tech news</p></div>
          </div>
        )}
        {tasks.map(t => (
          <div key={t.id} className="bg-apex-surface border border-apex-border rounded-lg p-4 mb-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-medium text-gray-200">{t.name}</h3>
                <p className="text-xs text-gray-500">{CRON_LABELS[t.cronExpression] || t.cronExpression}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleTask(t.id, !t.enabled)} className={`relative w-10 h-6 rounded-full ${t.enabled ? "bg-apex-cyan" : "bg-apex-border"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${t.enabled ? "translate-x-4" : ""}`} />
                </button>
                <button onClick={() => delTask(t.id)} className="text-gray-600 hover:text-red-400 text-sm">\u2715</button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-600">
              <span className="px-1.5 py-0.5 rounded bg-black/20 border border-apex-border">{t.cronExpression}</span>
              {t.lastRun && <span className={t.lastStatus === "success" ? "text-emerald-400" : "text-red-400"}>Last: {t.lastRun.slice(11, 16)} \u2022 {t.lastStatus}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-apex-border px-6 py-3 shrink-0"><p className="text-xs text-gray-600">Use <code className="text-apex-cyan">/automate</code> in chat to create tasks.</p></div>
    </div>
  );
}