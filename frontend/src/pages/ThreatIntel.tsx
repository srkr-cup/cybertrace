import { useEffect, useState } from "react";
import { api } from "../api";

export default function ThreatIntel() {
  const [status, setStatus] = useState<Record<string, string> | null>(null);
  const [indicator, setIndicator] = useState("");
  const [type, setType] = useState("ip");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.threatIntelStatus().then(setStatus).catch(() => {}); }, []);

  const lookup = async () => {
    setBusy(true); setResult(null);
    try {
      setResult(await api.threatIntelLookup(indicator, type));
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Threat Intelligence</h1>
      <p className="text-sm text-slate-500 mb-5">Each provider's result is shown separately — never merged into one fabricated verdict.</p>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold mb-3">Provider configuration status</h3>
        {!status ? <p className="text-sm text-slate-400">Loading…</p> : (
          <div className="flex gap-3 flex-wrap">
            {Object.entries(status).map(([provider, st]) => (
              <span
                key={provider}
                className={`text-xs px-3 py-1.5 rounded-full capitalize ${st === "configured" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
              >
                {provider}: {st.replace("_", " ")}
              </span>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-3">
          Set VIRUSTOTAL_API_KEY / ABUSEIPDB_API_KEY as environment variables on the backend to activate those providers. URLhaus needs no key.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold mb-3">Run a lookup</h3>
        <div className="flex gap-2 mb-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-2 text-sm">
            <option value="ip">IP</option>
            <option value="domain">Domain</option>
            <option value="url">URL</option>
            <option value="hash">File hash</option>
          </select>
          <input
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Indicator value"
            value={indicator}
            onChange={(e) => setIndicator(e.target.value)}
          />
          <button
            disabled={busy || !indicator.trim()}
            onClick={lookup}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg"
          >
            Lookup
          </button>
        </div>
        {busy && <p className="text-sm text-slate-400">Querying providers…</p>}
        {result && (
          <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
