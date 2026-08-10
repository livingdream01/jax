import { useAutomations } from "../hooks/useAutomations";

const TYPE_ICONS: Record<string, string> = {
  briefing: "📰",
  search: "🔍",
  custom: "⚙",
};

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

export default function Automations() {
  const { tasks, loading, toggleTask, deleteTask } = useAutomations();

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-jax-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Automations</h2>
          <p className="text-sm text-gray-500">
            {tasks.length} scheduled {tasks.length === 1 ? "task" : "tasks"} — {tasks.filter((t) => t.enabled).length} active
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="w-6 h-6 border-2 border-jax-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-4xl mb-3">⚡</p>
            <p className="text-lg font-medium text-gray-400 mb-2">No automations yet</p>
            <p className="text-sm mb-4">Create one by chatting with Jax:</p>
            <div className="bg-jax-surface border border-jax-border rounded-lg p-4 max-w-md">
              <p className="text-xs text-gray-400 font-mono">
                /automate every morning at 8am compile tech news briefing
              </p>
            </div>
          </div>
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-jax-surface border border-jax-border rounded-lg p-4 mb-3"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xl">{TYPE_ICONS[task.type] || "⚙"}</span>
                <div>
                  <h3 className="text-sm font-medium text-gray-200">{task.name}</h3>
                  <p className="text-xs text-gray-500">{describeCron(task.cronExpression)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleTask(task.id, !task.enabled)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    task.enabled ? "bg-jax-cyan" : "bg-jax-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      task.enabled ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-gray-600">
              <span className="px-1.5 py-0.5 rounded bg-black/20 border border-jax-border">
                {task.cronExpression}
              </span>
              {task.type === "briefing" && (
                <span className="text-jax-cyan">Briefing · {JSON.parse(task.params || "{}").category || "all"}</span>
              )}
              {task.type === "search" && (
                <span className="text-jax-amber">Search · {JSON.parse(task.params || "{}").query || "custom"}</span>
              )}
              {task.lastRun && (
                <span className={task.lastStatus === "success" ? "text-emerald-400" : "text-red-400"}>
                  Last: {task.lastRun.slice(11, 16)} · {task.lastStatus}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-jax-border px-6 py-3 shrink-0">
        <p className="text-xs text-gray-600">
          Use <code className="text-jax-cyan">/automate</code> in chat to create new tasks via natural language
        </p>
      </div>
    </div>
  );
}
