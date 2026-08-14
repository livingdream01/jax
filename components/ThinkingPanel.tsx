"use client";

import { useState, useEffect } from "react";
import type { ThinkingStep } from "@/lib/agent/loop";

interface ThinkingPanelProps {
  steps: ThinkingStep[];
  isActive: boolean;
}

export default function ThinkingPanel({ steps, isActive }: ThinkingPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [autoCollapsed, setAutoCollapsed] = useState(false);

  useEffect(() => {
    if (!isActive && steps.length > 0 && !autoCollapsed) {
      const timer = setTimeout(() => {
        setExpanded(false);
        setAutoCollapsed(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
    if (isActive) {
      setExpanded(true);
      setAutoCollapsed(false);
    }
  }, [isActive, steps.length]);

  if (steps.length === 0) return null;

  const stepIcons: Record<string, string> = {
    think: "\ud83e\udde0",
    plan: "\ud83d\udccb",
    action: "\ud83d\udd27",
    observation: "\ud83d\udc41",
    reflect: "\ud83d\udd0d",
    respond: "\u2705",
  };

  const stepLabels: Record<string, string> = {
    think: "Analyzing",
    plan: "Planning",
    action: "Executing",
    observation: "Observing",
    reflect: "Reflecting",
    respond: "Responding",
  };

  const stepColors: Record<string, string> = {
    think: "border-blue-500/30 bg-blue-500/5",
    plan: "border-purple-500/30 bg-purple-500/5",
    action: "border-amber-500/30 bg-amber-500/5",
    observation: "border-emerald-500/30 bg-emerald-500/5",
    reflect: "border-cyan-500/30 bg-cyan-500/5",
    respond: "border-green-500/30 bg-green-500/5",
  };

  const activeStep = steps.find((s) => s.status === "running");

  return (
    <div className="mb-3 animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors w-full group"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium">
          {isActive
            ? activeStep
              ? `${stepLabels[activeStep.type]}...`
              : "Thinking..."
            : `Thinking (${steps.length} ${steps.length === 1 ? "step" : "steps"})`}
        </span>
        {isActive && (
          <span className="flex gap-0.5 ml-1">
            <span className="w-1 h-1 rounded-full bg-accent-glow animate-pulse" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-accent-glow animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-accent-glow animate-pulse" style={{ animationDelay: "300ms" }} />
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all ${
                stepColors[step.type] || "border-border-subtle bg-bg-glass"
              } ${step.status === "running" ? "border-accent-border bg-accent-muted/30" : ""}`}
            >
              <span className="shrink-0 mt-0.5 text-sm">
                {step.status === "running" ? (
                  <span className="inline-block w-4 h-4 border-2 border-accent-glow border-t-transparent rounded-full animate-spin" />
                ) : step.status === "error" ? (
                  "\u274c"
                ) : (
                  stepIcons[step.type] || "\u25cf"
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                  {stepLabels[step.type]}
                  {step.toolName && (
                    <span className="text-accent-glow ml-1">\u2192 {step.toolName}</span>
                  )}
                </span>
                <p className="text-text-secondary mt-0.5 leading-relaxed break-words line-clamp-3">
                  {step.content}
                </p>
              </div>
              {step.status === "done" && (
                <span className="text-success shrink-0 mt-0.5">\u2713</span>
              )}
              {step.status === "error" && (
                <span className="text-danger shrink-0 mt-0.5">\u2717</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}