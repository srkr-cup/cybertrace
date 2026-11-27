import { useEffect, useState } from "react";
import { api, Case } from "../api";

type Tab = "email" | "url" | "file" | "network" | "message";

const TABS: { id: Tab; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "url", label: "URL / Domain" },
  { id: "file", label: "File / Hash" },
  { id: "network", label: "Network / PCAP" },
  { id: "message", label: "WhatsApp / Text Message" },
];

function getHumanExplanation(result: any) {
  if (result.channel && result.risk_level) {
    const category = result.risk_level === "high"
      ? "Several strong warning signs"
      : result.risk_level === "medium"
        ? "Warning signs found"
        : "No strong warning signs found";
    return {
      category,
      summary: result.plain_language_summary,
      reasons: (result.details || []).map((item: any) => item.plain_meaning),
      actions: result.safe_next_steps || [],
      limitations: [result.disclaimer || "This automated check cannot prove who sent a message."],
    };
  }

  if (result.authentication_results) {
    const indicators = result.structural_indicators || [];
    const reasons = indicators
      .filter((item: any) => item.type !== "no_authentication_results_header")
      .map((item: any) => item.detail);
    const failedChecks = ["spf", "dkim", "dmarc"].filter((name) => {
      const value = result.authentication_results[name];
      return value && value.toLowerCase() !== "pass";
    });
    reasons.push(...failedChecks.map((name) => `${name.toUpperCase()} was reported as ${result.authentication_results[name]}.`));
    const missingAuth = indicators.some((item: any) => item.type === "no_authentication_results_header");
    return {
      category: reasons.length ? "Email needs further review" : "Insufficient information to assess this email",
      summary: reasons.length
        ? "The submitted email contains one or more observations that should be checked in context."
        : "This analysis did not find enough information to determine whether the email is genuine.",
      reasons,
      actions: ["Verify the sender using a contact method you already trust.", "Do not open unexpected attachments or share account codes."],
      limitations: [result.disclaimer, ...(missingAuth ? ["Authentication results were not present in the submitted email; their status is unknown."] : [])],
    };
  }

  if (result.structure && result.url) {
    const reasons = [...(result.structural_flags || [])];
    if (result.reputation?.status === "malicious") reasons.push(result.reputation.note || "A threat-intelligence provider reported a match.");
    const providerChecked = (result.reputation?.providers || []).some((provider: any) => provider.status === "ok");
    const hasSignals = reasons.length > 0;
    return {
      category: result.reputation?.status === "malicious" ? "Provider reported a concern" : hasSignals ? "URL needs further review" : "Insufficient information to assess this URL",
      summary: hasSignals
        ? "The URL analysis found observations worth checking; these do not by themselves prove the destination is harmful."
        : "No strong warning was identified by the available checks. This does not establish that the website is safe.",
      reasons,
      actions: ["Do not open an unexpected link. Visit the organization through its official app or a saved address.", "Never enter a password, PIN, or one-time code after following an unsolicited link."],
      limitations: [result.disclaimer, ...(providerChecked ? [] : ["No threat-intelligence provider completed a reputation check."])],
    };
  }

  if (result.hashes || result.yara_matches) {
    const matches = result.yara_matches?.matches || [];
    const reasons = matches.map((match: any) => match.description || `A YARA rule matched: ${match.rule}.`);
    if (result.extension_type_mismatch) reasons.push(result.extension_type_mismatch);
    return {
      category: reasons.length ? "File needs further review" : "Insufficient information to assess this file",
      summary: reasons.length
        ? "The file analysis found a signature or metadata mismatch that merits investigation."
        : "No configured signature or mismatch was reported. This does not prove the file is safe.",
      reasons,
      actions: ["Do not execute or open an unexpected file.", "Use the SHA-256 value to check a trusted reputation source if available."],
      limitations: [result.safety_note, "A clean or unavailable signature scan is not proof that a file is harmless."],
    };
  }

  if (result.structural_observations) {
    const reasons = result.structural_observations.map((item: any) => item.detail);
    return {
      category: reasons.length ? "Network observations need review" : "Insufficient information to assess this capture",
      summary: reasons.length
        ? "Structural patterns were observed in the capture; they can have benign explanations and are not confirmed attacks."
        : "No configured structural pattern was observed. This does not prove the traffic was harmless.",
      reasons,
      actions: ["Correlate these observations with endpoint, firewall, and DNS records."],
      limitations: [result.disclaimer],
    };
  }

  return {
    category: "Insufficient information",
    summary: "The available analysis result does not support a reliable safety assessment.",
    reasons: [],
    actions: ["Review the technical details and verify important findings independently."],
    limitations: [],
  };
}

function ResultBlock({ result }: { result: any }) {
  if (!result) return null;
  if (result.error) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <strong>Analysis unavailable</strong>
          <p className="mt-1">{result.error}</p>
        </div>
        <details className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100">
          <summary className="cursor-pointer p-3 text-sm font-medium">View technical details</summary>
          <pre className="text-xs p-4 overflow-auto max-h-[500px] whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </details>
      </div>
    );
  }

  const explanation = getHumanExplanation(result);
  const auth = result.authentication_results;
  const providerResults = result.reputation?.providers;
  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-slate-200 bg-white p-4" aria-live="polite">
        <div className="text-xs uppercase tracking-wide text-slate-500">Simple explanation</div>
        <h4 className="text-base font-semibold mt-1">{explanation.category}</h4>
        <p className="text-sm text-slate-700 mt-2">{explanation.summary}</p>
        {explanation.reasons.length > 0 && (
          <div className="mt-3">
            <h5 className="text-sm font-medium">What the analysis observed</h5>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-600 space-y-1">
              {explanation.reasons.map((reason: string, index: number) => <li key={index}>{reason}</li>)}
            </ul>
          </div>
        )}
        {explanation.actions.length > 0 && (
          <div className="mt-3">
            <h5 className="text-sm font-medium">Recommended actions</h5>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-600 space-y-1">
              {explanation.actions.map((action: string, index: number) => <li key={index}>{action}</li>)}
            </ul>
          </div>
        )}
        {explanation.limitations.filter(Boolean).length > 0 && (
          <p className="text-xs text-slate-500 mt-3">
            <strong>Limitations:</strong> {explanation.limitations.filter(Boolean).join(" ")}
          </p>
        )}
      </section>
      {providerResults && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">Live reputation check</h4>
          {providerResults.map((provider: any) => (
            <div key={provider.provider} className="flex items-start justify-between gap-3 text-sm py-1">
              <span className="font-medium">
                {provider.provider === "virustotal" ? "VirusTotal" : provider.provider === "urlhaus" ? "URLhaus" : provider.provider}
              </span>
              <span className="text-right text-slate-600">
                {provider.status === "ok" ? "Checked successfully" : provider.status === "not_configured" ? "API not configured" : provider.status === "not_found" ? "No reported match" : provider.status === "error" ? "Check could not complete" : provider.status}
              </span>
            </div>
          ))}
        </div>
      )}
      {auth && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">Email authentication explained</h4>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {([['SPF', auth.spf], ['DKIM', auth.dkim], ['DMARC', auth.dmarc]] as [string, string | null | undefined][]).map(([name, value]) => (
              <div key={name} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="font-medium">{name}</div>
                <div className="text-slate-600 mt-1">
                  {!value ? 'Not reported in this email' : value.toLowerCase() === 'pass' ? 'Pass: the sender passed this check' : `Reported: ${value}. This needs context.`}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 mt-3">A pass, fail, or missing result is only one clue. It does not by itself prove an email is safe or fake.</p>
        </div>
      )}
      {result.channel && result.risk_level && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">Message check: {result.channel}</h4>
          <p className="text-sm text-slate-700"><strong>Risk level:</strong> {String(result.risk_level).toUpperCase()}</p>
          <p className="text-sm text-slate-700 mt-2">{result.plain_language_summary}</p>
          {result.details?.length > 0 && (
            <div className="mt-3 space-y-2">
              {result.details.map((item: any, index: number) => (
                <div key={index} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                  <div className="text-sm font-medium">{item.plain_meaning}</div>
                  <div className="text-sm text-slate-600 mt-1">What to do: {item.what_to_check}</div>
                </div>
              ))}
            </div>
          )}
          {result.safe_next_steps?.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium">Safe next steps</div>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                {result.safe_next_steps.map((step: string, index: number) => <li key={index}>{step}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      <details className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100">
        <summary className="cursor-pointer p-3 text-sm font-medium">View technical details</summary>
        <pre className="text-xs p-4 overflow-auto max-h-[500px] whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  );
}

export default function Analyzers() {
  const [tab, setTab] = useState<Tab>("email");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [investigations, setInvestigations] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const [emailText, setEmailText] = useState("");
  const [url, setUrl] = useState("");
  const [lookupWhois, setLookupWhois] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageChannel, setMessageChannel] = useState<"whatsapp" | "sms" | "normal">("whatsapp");

  useEffect(() => {
    api.listCases().then(setInvestigations).catch(() => setInvestigations([]));
  }, []);

  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setResult(null); setSaveNotice(null);
    try {
      setResult(await fn());
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setBusy(false);
    }
  };

  const saveMessageAnalysis = async () => {
    if (!selectedCaseId || !result?.channel) return;
    setSaving(true);
    setSaveNotice(null);
    try {
      const evidenceText = [
        `Channel: ${result.channel}`,
        "Original message:",
        messageText,
        "Analyzer response (JSON):",
        JSON.stringify(result, null, 2),
      ].join("\n\n");
      await api.uploadTextEvidence(selectedCaseId, evidenceText, "text");
      setSaveNotice("Message and analysis saved as case evidence.");
    } catch (e: any) {
      setSaveNotice(`Could not save this analysis: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Analyzers</h1>
      <p className="text-sm text-slate-500 mb-5">Run real, standalone analysis on a single artifact — not tied to a case.</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setResult(null); }}
            className={`text-sm px-3 py-1.5 rounded-lg border ${tab === t.id ? "bg-brand-600 text-white border-brand-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {tab === "email" && (
            <>
              <h3 className="text-sm font-semibold mb-2">Paste raw email (headers + body)</h3>
              <textarea
                rows={10}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                placeholder="From: ...&#10;To: ...&#10;Subject: ...&#10;Authentication-Results: ...&#10;&#10;body text with links"
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
              />
              <button
                disabled={busy || !emailText.trim()}
                onClick={() => run(() => api.analyzeEmail(emailText))}
                className="mt-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg"
              >
                Analyze email
              </button>
            </>
          )}

          {tab === "url" && (
            <>
              <h3 className="text-sm font-semibold mb-2">URL to analyze</h3>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="https://example.com/path?query=1"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <input type="checkbox" checked={lookupWhois} onChange={(e) => setLookupWhois(e.target.checked)} />
                Also look up domain registration (WHOIS) — slower, rate-limited by registries
              </label>
              <button
                disabled={busy || !url.trim()}
                onClick={() => run(() => api.analyzeUrl(url, true, lookupWhois))}
                className="mt-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg"
              >
                Analyze URL
              </button>
              <p className="text-[11px] text-slate-400 mt-2">
                Parses structure locally and resolves DNS (no content is ever fetched from the URL).
              </p>
            </>
          )}

          {tab === "file" && (
            <>
              <h3 className="text-sm font-semibold mb-2">Upload a file</h3>
              <p className="text-xs text-slate-400 mb-3">Computes real hashes and detects true file type from magic bytes — never executed.</p>
              <input
                type="file"
                onChange={(e) => e.target.files && run(() => api.analyzeFile(e.target.files![0]))}
                className="text-sm"
              />
            </>
          )}

          {tab === "network" && (
            <>
              <h3 className="text-sm font-semibold mb-2">Upload a .pcap / .pcapng file</h3>
              <p className="text-xs text-slate-400 mb-3">Parsed with Scapy — real packet/protocol/DNS extraction.</p>
              <input
                type="file" accept=".pcap,.pcapng"
                onChange={(e) => e.target.files && run(() => api.analyzePcap(e.target.files![0]))}
                className="text-sm"
              />
            </>
          )}

          {tab === "message" && (
            <>
              <h3 className="text-sm font-semibold mb-2">Check a WhatsApp or text message</h3>
              <p className="text-sm text-slate-600 mb-3">Paste the complete message. This checks warning signs and explains what to verify; it cannot prove who sent it.</p>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="message-channel">Where did you receive it?</label>
              <select id="message-channel" value={messageChannel} onChange={(e) => setMessageChannel(e.target.value as any)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3">
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS / Text message</option>
                <option value="normal">Other text message</option>
              </select>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="message-text">Message text</label>
              <textarea id="message-text" rows={10} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Paste the full message here…" value={messageText} onChange={(e) => setMessageText(e.target.value)} />
              <div className="flex gap-2 mt-3">
                <button disabled={busy || !messageText.trim()} onClick={() => run(() => api.analyzeMessage(messageText, messageChannel))} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg">
                  Check this message
                </button>
                <button disabled={busy || !messageText} onClick={() => { setMessageText(""); setResult(null); setSaveNotice(null); }} className="border border-slate-200 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-40">
                  Clear
                </button>
              </div>
            </>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Result</h3>
          {busy ? <p className="text-sm text-slate-400">Analyzing…</p> : <ResultBlock result={result} />}
          {!busy && !result && <p className="text-sm text-slate-400">Run an analysis to see results here.</p>}
          {result?.channel && (
            <section className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold">Save to an investigation</h4>
              <p className="text-xs text-slate-500 mt-1">This stores the message text and the analyzer response as evidence in the selected case.</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <select value={selectedCaseId} onChange={(event) => setSelectedCaseId(event.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" aria-label="Select investigation to save message analysis">
                  <option value="">Select an investigation</option>
                  {investigations.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
                <button onClick={saveMessageAnalysis} disabled={saving || !selectedCaseId} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg">
                  {saving ? "Saving…" : "Save evidence"}
                </button>
              </div>
              {saveNotice && <p className="text-sm text-slate-600 mt-2" role="status">{saveNotice}</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
