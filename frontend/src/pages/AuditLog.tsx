import { useEffect, useState } from "react";
import { api } from "../api";

const ACTION_LABELS: Record<string, string> = {
  "case.create": "Created an investigation",
  "case.update": "Updated an investigation",
  "evidence.upload": "Added evidence",
  "auth.register": "Registered an account",
  "auth.role_change": "Changed account access",
};

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAuditLogs()
      .then(setLogs)
      .catch((e) => setError(e.message || "Could not load activity history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Activity History</h1>
      <p className="text-base text-slate-600 mb-5">A record of important actions in plain language.</p>

      <div className="bg-white rounded-xl border border-slate-200 p-5" aria-live="polite">
        {loading && <p className="text-base text-slate-500">Loading the activity history…</p>}
        {error && <p className="text-base text-red-700">{error}</p>}
        {!loading && !error && logs.length === 0 && <p className="text-base text-slate-500">No actions recorded yet.</p>}
        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b border-slate-200">
                  <th scope="col" className="py-3 pr-4 font-semibold">Who</th>
                  <th scope="col" className="py-3 pr-4 font-semibold">What happened</th>
                  <th scope="col" className="py-3 pr-4 font-semibold">Details</th>
                  <th scope="col" className="py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-medium">{log.actor_email || "System"}</td>
                    <td className="py-3 pr-4">{ACTION_LABELS[log.action] || log.action}</td>
                    <td className="py-3 pr-4 text-slate-600">{log.details || "—"}</td>
                    <td className="py-3 text-slate-600 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
