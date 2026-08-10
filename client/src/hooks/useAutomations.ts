import { useState, useEffect, useCallback } from "react";

export interface AutomationTask {
  id: number;
  name: string;
  cronExpression: string;
  type: string;
  params: string;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: string | null;
  createdAt: string;
}

const CRON_LABELS: Record<string, string> = {
  "0 8 * * *": "Every day at 8:00 AM",
  "0 9 * * *": "Every day at 9:00 AM",
  "0 7 * * 1": "Mondays at 7:00 AM",
  "0 */6 * * *": "Every 6 hours",
  "0 0 * * *": "Daily at midnight",
  "*/15 * * * *": "Every 15 minutes",
  "0 8 * * 1-5": "Weekdays at 8:00 AM",
  "0 9 * * 1-5": "Weekdays at 9:00 AM",
  "0 18 * * *": "Every day at 6:00 PM",
};

function describeCron(expr: string): string {
  return CRON_LABELS[expr] || expr;
}

export function useAutomations() {
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleTask = useCallback(async (id: number, enabled: boolean) => {
    const res = await fetch(`/api/automations/${id}/toggle`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, enabled } : t)),
      );
    }
  }, []);

  const deleteTask = useCallback(async (id: number) => {
    const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, toggleTask, deleteTask, refresh: fetchTasks };
}
