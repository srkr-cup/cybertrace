import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Case } from "../api";
import { AlertIcon, FolderIcon, NetworkIcon } from "../components/Icons";

type Stats = {
  total_cases: number;
  open_cases: number;
  resolved_cases: number;
  total_evidence: number;
  total_entities: number;
  severity_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  entity_type_distribution: Record<string, number>;
  recent_cases: { id: string; title: string; status: string; severity: string; updated_at: string }[];
};

const SEVERITY_COLOR: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
  informational: "bg-sky-100 text-sky-700",
  unclassified: "bg-slate-100 text-slate-600",
};

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Link to="/cases" aria-label={`${label}: ${value}. View investigations.`} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 hover:border-brand-300 hover:shadow-sm transition-colors">
      <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold leading-tight">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [nextStats, nextCases] = await Promise.all([api.getStats(), api.listCases()]);
      setStats(nextStats);
      setCases(nextCases);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredCases = cases
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .filter((c) => `${c.title} ${c.description} ${c.id}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const knownSeverities = ["critical", "high", "medium", "low", "informational"];
  const severityDistribution = Object.fromEntries(knownSeverities.map((severity) => [
    severity,
    Object.entries(stats?.severity_distribution || {}).reduce((count, [value, total]) =>
      count + (value.toLowerCase() === severity ? total : 0), 0),
  ]));
  severityDistribution.unclassified = Object.entries(stats?.severity_distribution || {}).reduce((count, [value, total]) =>
    count + (knownSeverities.includes(value.toLowerCase()) ? 0 : total), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Security Overview</h1>
            <p className="text-sm text-slate-500">Live data from your investigation database.</p>
            <p className="text-xs text-slate-400 mt-1" aria-live="polite">
              {lastUpdated ? `Last updated ${lastUpdated.toLocaleString()}` : "Not refreshed yet"}
            </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-4">
          Could not reach the API at the configured URL. Is the backend running?
          <div className="mt-1 text-xs opacity-80">{error}</div>
        </div>
      )}

      {loading && !stats && <div className="text-sm text-slate-400">Loading…</div>}

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total cases" value={stats.total_cases} icon={<FolderIcon className="w-5 h-5" />} />
            <StatCard label="Open investigations" value={stats.open_cases} icon={<AlertIcon className="w-5 h-5" />} />
            <StatCard label="Evidence artifacts" value={stats.total_evidence} icon={<FolderIcon className="w-5 h-5" />} />
            <StatCard label="Indicators extracted" value={stats.total_entities} icon={<NetworkIcon className="w-5 h-5" />} />
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold mb-4">Severity distribution</h2>
              {stats.total_cases === 0 && (
                <p className="text-sm text-slate-400">No cases yet.</p>
              )}
              <div className="space-y-2">
                {Object.entries(severityDistribution).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize w-24 text-center ${SEVERITY_COLOR[k]}`}>
                      {k === "unclassified" ? "Unclassified" : k}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${(v / Math.max(stats.total_cases, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold mb-4">Case status</h2>
              {Object.keys(stats.status_distribution).length === 0 && (
                <p className="text-sm text-slate-400">No cases yet.</p>
              )}
              <div className="space-y-2">
                {Object.entries(stats.status_distribution).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 capitalize w-24">{status.replace(/_/g, " ")}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${(count / Math.max(stats.total_cases, 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold mb-4">Indicator types extracted</h2>
              {Object.keys(stats.entity_type_distribution).length === 0 && (
                <p className="text-sm text-slate-400">No evidence uploaded yet.</p>
              )}
              <div className="space-y-2">
                {Object.entries(stats.entity_type_distribution).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase w-20 text-center">{k}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400"
                        style={{ width: `${(v / Math.max(stats.total_entities, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Investigations</h2>
                <p className="text-xs text-slate-400 mt-1">{filteredCases.length} of {cases.length} cases</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search investigations"
                  aria-label="Search investigations"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter investigations by status"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="all">All statuses</option>
                  {[...new Set(cases.map((c) => c.status))].sort().map((status) => (
                    <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            {cases.length === 0 ? (
              <p className="text-sm text-slate-400">No investigations created yet. Go to Investigations to create one.</p>
            ) : filteredCases.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No investigations match those filters.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="py-2 font-medium">Title</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Severity</th>
                    <th className="py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2">{c.title}</td>
                      <td className="py-2 capitalize text-slate-600">{c.status}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${SEVERITY_COLOR[c.severity] || "bg-slate-100 text-slate-600"}`}>
                          {c.severity}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500">{new Date(c.updated_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
