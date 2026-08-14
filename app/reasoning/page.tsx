"use client";

import { useState, useEffect, useCallback } from "react";
import { getSessionId } from "@/lib/auth";
import type { ThinkingStep } from "@/lib/agent/loop";

interface ReasoningTrace {
  id: number;
  sessionId: string;
  userMessage: string;
  steps: ThinkingStep[];
  response: string;
  createdAt: string;
}

const STEP_META: Record<string, { icon: string; label: string; color: string }> = {
  think: { icon: "\ud83e\udde0", label: "Analyzing", color: "border-blue-500/30 bg-blue-500/5 text-blue-400" },
  plan: { icon: "\ud83d\udccb", label: "Planning", color: "border-purple-500/30 bg-purple-500/5 text-purple-400" },
  action: { icon: "\ud83d\udd27", label: "Executing", color: "border-amber-500/30 bg-amber-500/5 text-amber-400" },
  observation: { icon: "\ud83d\udc41", label: "Observing", color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" },
  reflect: { icon: "\ud83d\udd0d", label: "Reflecting", color: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400" },
  respond: { icon: "\u2705", label: "Responding", color: "border-green-500/30 bg-green-500/5 text-green-400" },
};

export default function ReasoningPage() {
  const [traces, setTraces] = useState<ReasoningTrace[]>([]);
  const [selected, setSelected] = useState<ReasoningTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const sessionId = getSessionId();

  const fetchTraces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reasoning?sessionId=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      setTraces(data.traces || []);
    } catch {} finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { fetchTraces(); }, [fetchTraces]);

  const selectTrace = async (trace: ReasoningTrace) => {
    setSelected(trace);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/reasoning?id=${trace.id}`);
      const data = await res.json();
      if (data.trace) setSelected(data.trace);
    } catch {} finally { setDetailLoading(false); }
  };

  const deleteOne = async (id: number) => {
    await fetch(`/api/reasoning?id=${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    fetchTraces();
  };

  const clearAll = async () => {
    await fetch(`/api/reasoning?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
    setSelected(null);
    fetchTraces();
  };

  return (
    <div className="flex h-full">
      {/* Trace list */}
      <div className="w-72 lg:w-80 border-r border-border-subtle flex flex-col shrink-0">
        <header className="h-14 flex items-center px-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-text-secondary">
              <path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7z" />
            </svg>
            <h2 className="text-sm font-semibold text-text-primary">Reasoning</h2>
          </div>
          {traces.length > 0 && (
            <button onClick={clearAll} className="ml-auto text-[11px] text-text-tertiary hover:text-danger transition-colors">
              Clear all
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg animate-shimmer bg-bg-surface border border-border-subtle" />
              ))}
            </div>
          )}

          {!loading && traces.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
                <path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7z" />
              </svg>
              <p className="text-sm text-text-secondary mb-1">No reasoning traces yet</p>
              <p className="text-xs px-6 text-center">Ask APEX a complex question and its thought process will appear here.</p>
            </div>
          )}

          {traces.map((trace) => {
            const toolCount = trace.steps.filter((s) => s.type === "action").length;
            return (
              <button
                key={trace.id}
                onClick={() => selectTrace(trace)}
                className={`w-full text-left rounded-lg p-3 transition-colors ${
                  selected?.id === trace.id
                    ? "bg-accent-muted border border-accent-border"
                    : "bg-bg-surface border border-border-subtle hover:border-border-default"
                }`}
              >
                <p className="text-xs font-medium text-text-primary line-clamp-2 leading-snug">{trace.userMessage}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-text-tertiary">
                  <span>{formatDate(trace.createdAt)}</span>
                  <span>\u00b7</span>
                  <span>{trace.steps.length} steps</span>
                  {toolCount > 0 && <span>\u00b7 {toolCount} tools</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail viewer */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
              <path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7z" />
            </svg>
            <p className="text-sm">Select a trace to review APEX&apos;s thought process</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] text-text-tertiary mb-1">Query</p>
                <h2 className="text-base font-semibold text-text-primary">{selected.userMessage}</h2>
                <p className="text-[11px] text-text-tertiary mt-1">{formatDate(selected.createdAt)}</p>
              </div>
              <button onClick={() => deleteOne(selected.id)} className="text-[11px] text-text-tertiary hover:text-danger transition-colors shrink-0">
                Delete
              </button>
            </div>

            {detailLoading && <div className="h-20 rounded-xl animate-shimmer bg-bg-surface border border-border-subtle" />}

            {!detailLoading && (
              <div className="space-y-2">
                {selected.steps.map((step, i) => {
                  const meta = STEP_META[step.type] || STEP_META.respond;
                  return (
                    <div key={i} className={`rounded-xl border px-4 py-3 ${meta.color}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{meta.icon}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                          {meta.label}
                          {step.toolName && <span className="ml-2 font-mono text-text-secondary">\u2192 {step.toolName}</span>}
                        </span>
                        {step.status === "error" && <span className="text-danger text-[10px] ml-auto">failed</span>}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words">{step.content}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {selected.response && (
              <div className="mt-6">
                <p className="text-[11px] text-text-tertiary mb-2">Final response</p>
                <div className="rounded-xl bg-bg-surface border border-border-subtle px-4 py-3">
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">{selected.response}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return d.toLocaleDateString();
  } catch { return ""; }
}