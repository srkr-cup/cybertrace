const BASE = import.meta.env.VITE_API_URL || "http://localhost:8008";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("ct_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem("ct_refresh");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("ct_token", data.access_token);
    localStorage.setItem("ct_refresh", data.refresh_token); // rotated — old one is now dead
    return true;
  } catch {
    return false;
  }
}

async function req(path: string, options: RequestInit = {}, _retried = false): Promise<any> {
  const isForm = options.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...authHeader(),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (res.status === 401 && !_retried && path !== "/api/auth/login" && path !== "/api/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) return req(path, options, true); // access token was just expired, not invalid — retry once
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export interface Case {
  id: string;
  title: string;
  description: string;
  incident_category: string | null;
  incident_date: string | null;
  severity: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GraphSource { evidence_id: string; filename: string; uploaded_at: string; }
export interface GraphNode {
  id: string;
  type: string;
  value: string;
  first_seen_at: string;
  first_seen_evidence_id: string | null;
  sources: GraphSource[];
}
export interface GraphEdge { source: string; target: string; type: string; confidence: string; explanation: string; }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[]; }

export const api = {
  getStats: () => req("/api/stats"),
  getCybercrimeGuides: (language: "en" | "te", q = "") =>
    req(`/api/knowledge/crimes?language=${language}&q=${encodeURIComponent(q)}`),
  getQuiz: (language: "en" | "te") => req(`/api/education/quiz?language=${language}`),
  scoreQuiz: (language: "en" | "te", answers: Record<string, string>) =>
    req("/api/education/quiz/score", { method: "POST", body: JSON.stringify({ language, answers }) }),
  getReportingGuides: (language: "en" | "te") => req(`/api/education/reporting-guide?language=${language}`),
  getOfficialContacts: () => req("/api/contacts"),
  threatIntelStatus: () => req("/api/threat-intel/status"),
  threatIntelLookup: (indicator: string, indicator_type: string) =>
    req("/api/threat-intel/lookup", { method: "POST", body: JSON.stringify({ indicator, indicator_type }) }),
  listCases: (): Promise<Case[]> => req("/api/cases"),
  createCase: (data: { title: string; description?: string; incident_category?: string; incident_date?: string; severity?: string }) =>
    req("/api/cases", { method: "POST", body: JSON.stringify(data) }),
  updateCase: (id: string, data: { title?: string; description?: string; incident_category?: string | null; incident_date?: string | null; status?: string; severity?: string }) =>
    req(`/api/cases/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  listEvidence: (caseId: string) => req(`/api/cases/${caseId}/evidence`),
  uploadTextEvidence: (caseId: string, raw_text: string, evidence_type = "text") => {
    const form = new FormData();
    form.append("raw_text", raw_text);
    form.append("evidence_type", evidence_type);
    return req(`/api/cases/${caseId}/evidence`, { method: "POST", body: form });
  },
  uploadFileEvidence: (caseId: string, file: File, evidence_type = "generic") => {
    const form = new FormData();
    form.append("file", file);
    form.append("evidence_type", evidence_type);
    return req(`/api/cases/${caseId}/evidence`, { method: "POST", body: form });
  },
  getGraph: (caseId: string): Promise<Graph> => req(`/api/cases/${caseId}/graph`),

  // Auth
  register: (email: string, password: string, role = "investigator") =>
    req("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, role }) }),
  login: (email: string, password: string) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req("/api/auth/me"),

  // Analyzers
  analyzeEmail: (raw_email: string) =>
    req("/api/analyze/email", { method: "POST", body: JSON.stringify({ raw_email }) }),
  analyzeUrl: (url: string, resolve_dns = true, lookup_whois = false) =>
    req("/api/analyze/url", { method: "POST", body: JSON.stringify({ url, resolve_dns, lookup_whois }) }),
  analyzeIp: (ip: string) =>
    req("/api/analyze/ip", { method: "POST", body: JSON.stringify({ ip }) }),
  analyzeFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req("/api/analyze/file", { method: "POST", body: form });
  },
  analyzeLogs: (log_text: string) =>
    req("/api/analyze/logs", { method: "POST", body: JSON.stringify({ log_text, format: "auto" }) }),
  analyzeMessage: (text: string, channel: "whatsapp" | "sms" | "normal" = "normal", language: "en" | "te" = "en") =>
    req("/api/analyze/message", { method: "POST", body: JSON.stringify({ text, channel, language }) }),
  analyzePcap: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req("/api/analyze/network", { method: "POST", body: form });
  },

  // AI copilot
  askCopilot: (caseId: string, question: string) =>
    req(`/api/cases/${caseId}/ai/ask`, { method: "POST", body: JSON.stringify({ question }) }),

  // Timeline + reports
  getTimeline: (caseId: string) => req(`/api/cases/${caseId}/timeline`),
  reportJsonUrl: (caseId: string) => `${BASE}/api/cases/${caseId}/report.json`,
  reportPdfUrl: (caseId: string) => `${BASE}/api/cases/${caseId}/report.pdf`,
  downloadReport: async (caseId: string, format: "pdf" | "json") => {
    const path = `/api/cases/${caseId}/report.${format}`;
    const request = () => fetch(`${BASE}${path}`, { headers: authHeader() });
    let response = await request();
    if (response.status === 401 && await tryRefresh()) response = await request();
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${await response.text()}`);
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `case-${caseId.slice(0, 8)}-report.${format}`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  },

  // Audit
  getAuditLogs: () => req("/api/audit-logs?limit=100"),
};
