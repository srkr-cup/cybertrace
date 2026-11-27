import { useEffect, useState } from "react";
import { api, Case } from "../api";
import { useAuth } from "../auth";

const STATUS_OPTIONS = ["new", "investigating", "containment", "resolved", "closed"];
const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"];
const INCIDENT_CATEGORIES = [
  "Phishing",
  "Fake OTP or Bank Message",
  "UPI Fraud",
  "Fake Job Offer",
  "Lottery Scam",
  "Fake Loan Application",
  "Social Media Account Compromise",
  "Cyberbullying",
  "Suspicious Website",
  "Other Cybercrime",
];

export default function Cases() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "investigator";

  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState<Case | null>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [incidentCategory, setIncidentCategory] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [editingCase, setEditingCase] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIncidentCategory, setEditIncidentCategory] = useState("");
  const [editIncidentDate, setEditIncidentDate] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [askBusy, setAskBusy] = useState(false);
  const [timeline, setTimeline] = useState<any[] | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const refreshCases = () => api.listCases().then(setCases).catch(() => {});

  useEffect(() => { refreshCases(); }, []);

  const openCase = (c: Case) => {
    setSelected(c);
    setEditingCase(false);
    setEditTitle(c.title);
    setEditDescription(c.description || "");
    setEditIncidentCategory(c.incident_category || "");
    setEditIncidentDate(c.incident_date || "");
    setUploadMsg(null);
    setAnswer(null);
    setShowTimeline(false);
    setTimeline(null);
    api.listEvidence(c.id).then(setEvidence).catch(() => setEvidence([]));
  };

  const askAi = async () => {
    if (!selected || !question.trim()) return;
    setAskBusy(true); setAnswer(null);
    try {
      const res = await api.askCopilot(selected.id, question);
      if (res.status === "not_configured") {
        setAnswer("AI Copilot isn't configured yet — set ANTHROPIC_API_KEY on the backend to enable it.");
      } else if (res.status === "error") {
        setAnswer(`Error: ${res.detail}`);
      } else {
        setAnswer(res.answer);
      }
    } catch (e: any) {
      setAnswer(`Error: ${e.message}`);
    } finally {
      setAskBusy(false);
    }
  };

  const loadTimeline = async () => {
    if (!selected) return;
    setShowTimeline(true);
    const t = await api.getTimeline(selected.id);
    setTimeline(t.events);
  };

  const createCase = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const c = await api.createCase({
        title,
        description,
        incident_category: incidentCategory || undefined,
        incident_date: incidentDate || undefined,
        severity,
      });
      setTitle(""); setDescription(""); setIncidentCategory(""); setIncidentDate(""); setSeverity("medium");
      await refreshCases();
      openCase(c);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitText = async () => {
    if (!selected || !pasteText.trim()) return;
    setBusy(true);
    try {
      const res = await api.uploadTextEvidence(selected.id, pasteText, "email");
      setUploadMsg(`Extracted ${res.entities_found_total} indicator(s) · SHA-256 ${res.sha256.slice(0, 16)}…`);
      setPasteText("");
      const list = await api.listEvidence(selected.id);
      setEvidence(list);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await api.uploadFileEvidence(selected.id, file);
      setUploadMsg(`Extracted ${res.entities_found_total} indicator(s) · SHA-256 ${res.sha256.slice(0, 16)}…`);
      const list = await api.listEvidence(selected.id);
      setEvidence(list);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    const updated = await api.updateCase(selected.id, { status });
    setSelected(updated);
    refreshCases();
  };

  const saveCaseDetails = async () => {
    if (!selected || !editTitle.trim()) return;
    setBusy(true);
    try {
      const updated = await api.updateCase(selected.id, {
        title: editTitle.trim(),
        description: editDescription,
        incident_category: editIncidentCategory || null,
        incident_date: editIncidentDate || null,
      });
      setSelected(updated);
      setEditingCase(false);
      await refreshCases();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = async (format: "pdf" | "json") => {
    if (!selected) return;
    try {
      await api.downloadReport(selected.id, format);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <h1 className="text-xl font-semibold mb-1">Investigations</h1>
        <p className="text-sm text-slate-500 mb-4">Create a case, then attach evidence to it.</p>

        {!canEdit && (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Viewer access is read-only. You can open investigations and review evidence, but not change or add them.
          </p>
        )}
        {canEdit && <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-2">
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Case title (e.g. Phishing campaign — Finance)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-2">
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={incidentCategory}
              onChange={(e) => setIncidentCategory(e.target.value)}
              aria-label="Incident category"
            >
              <option value="">Incident category (optional)</option>
              {INCIDENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              aria-label="Incident date"
            />
          </div>
          <div className="flex gap-2">
            <select
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              disabled={busy || !title.trim()}
              onClick={createCase}
              className="ml-auto bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg"
            >
              Create case
            </button>
          </div>
        </div>}

        <div className="space-y-2">
          {cases.map((c) => (
            <button
              key={c.id}
              onClick={() => openCase(c)}
              className={`w-full text-left bg-white border rounded-xl px-4 py-3 hover:border-brand-300 transition-colors ${
                selected?.id === c.id ? "border-brand-400 ring-1 ring-brand-200" : "border-slate-200"
              }`}
            >
              <div className="text-sm font-medium">{c.title}</div>
              <div className="text-xs text-slate-400 capitalize">{c.status} · {c.severity}</div>
            </button>
          ))}
          {cases.length === 0 && <p className="text-sm text-slate-400">No cases yet.</p>}
        </div>
      </div>

      <div className="lg:col-span-3">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Select or create a case to add evidence
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{selected.title}</h2>
                  <p className="text-sm text-slate-500">{selected.description || "No description"}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Category: {selected.incident_category || "Not recorded"}
                    <span className="mx-2">·</span>
                    Incident date: {selected.incident_date || "Not recorded"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && <button onClick={() => setEditingCase((value) => !value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 hover:bg-slate-50">{editingCase ? "Cancel edit" : "Edit case"}</button>}
                  <select
                    value={selected.status}
                    onChange={(e) => changeStatus(e.target.value)}
                    disabled={!canEdit}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 capitalize disabled:bg-slate-100"
                    aria-label="Investigation status"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {editingCase && canEdit && (
                <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} aria-label="Case title" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} aria-label="Incident description" rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <div className="grid sm:grid-cols-2 gap-2">
                    <select value={editIncidentCategory} onChange={(e) => setEditIncidentCategory(e.target.value)} aria-label="Edit incident category" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">No category</option>
                      {INCIDENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <input type="date" value={editIncidentDate} onChange={(e) => setEditIncidentDate(e.target.value)} aria-label="Edit incident date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <button disabled={busy || !editTitle.trim()} onClick={saveCaseDetails} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg">{busy ? "Saving…" : "Save case details"}</button>
                </div>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => downloadReport("pdf")}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Download PDF report
                </button>
                <button
                  onClick={() => downloadReport("json")}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Download JSON report
                </button>
                <button
                  onClick={loadTimeline}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  View timeline
                </button>
              </div>
            </div>

            {showTimeline && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold mb-3">Attack timeline</h3>
                {!timeline ? (
                  <p className="text-sm text-slate-400">Loading…</p>
                ) : timeline.length === 0 ? (
                  <p className="text-sm text-slate-400">No events yet.</p>
                ) : (
                  <ol className="relative border-l border-slate-200 pl-4 space-y-3">
                    {timeline.map((ev, i) => (
                      <li key={i} className="text-sm">
                        <div className="text-xs text-slate-400">{new Date(ev.timestamp).toLocaleString()}</div>
                        <div><span className="font-medium capitalize">{ev.type.replace(/_/g, " ")}</span> — {ev.detail}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold mb-3">AI Investigation Copilot</h3>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Summarize this investigation, or: why is this IP suspicious?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askAi()}
                />
                <button
                  disabled={askBusy || !question.trim()}
                  onClick={askAi}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg"
                >
                  Ask
                </button>
              </div>
              {askBusy && <p className="text-sm text-slate-400 mt-3">Thinking…</p>}
              {answer && (
                <div className="mt-3 text-sm bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap">
                  {answer}
                </div>
              )}
            </div>

            {canEdit && <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold mb-3">Add evidence</h3>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                rows={5}
                placeholder="Paste raw email headers, log lines, or any text evidence here…"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  disabled={busy || !pasteText.trim()}
                  onClick={submitText}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg"
                >
                  Analyze & correlate
                </button>
                <span className="text-slate-300 text-sm">or</span>
                <label className="text-sm px-4 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  Upload file
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files && onFile(e.target.files[0])}
                  />
                </label>
              </div>
              {uploadMsg && <p className="text-xs text-emerald-600 mt-2">{uploadMsg}</p>}
            </div>}

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold mb-3">Evidence in this case ({evidence.length})</h3>
              {evidence.length === 0 ? (
                <p className="text-sm text-slate-400">No evidence uploaded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                      <th className="py-2 font-medium">File</th>
                      <th className="py-2 font-medium">Type</th>
                      <th className="py-2 font-medium">SHA-256</th>
                      <th className="py-2 font-medium">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map((e) => (
                      <tr key={e.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2">{e.filename}</td>
                        <td className="py-2 text-slate-500">{e.evidence_type}</td>
                        <td className="py-2 font-mono text-xs text-slate-500">{e.sha256.slice(0, 16)}…</td>
                        <td className="py-2 text-slate-500">{new Date(e.uploaded_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="text-xs text-slate-400 mt-3">
                Open <span className="font-medium">Evidence Correlation</span> in the sidebar to see how these artifacts connect.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
