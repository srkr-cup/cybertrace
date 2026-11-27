import { useEffect, useState } from "react";
import { api } from "../api";
import BackToCommunity from "../components/BackToCommunity";

type Language = "en" | "te";
type Topic = { id: string; title: string; steps: string[]; financial_helpline_applies: boolean };

const COPY = {
  en: {
    eyebrow: "Community cyber safety",
    title: "Report Cybercrime",
    intro: "Choose what happened to see practical next steps. This guide helps you prepare; it does not submit a complaint for you.",
    language: "Language",
    topic: "What happened?",
    steps: "Steps to take",
    helpline: "Call 1930",
    portal: "Open the official reporting portal",
    warning: "Do not share OTPs, passwords, PINs, or full payment credentials with anyone offering to help.",
    notice: "No complaint is submitted and no personal information is sent by this page.",
    source: "Source: Ministry of Home Affairs, Government of India",
    loading: "Loading reporting steps…",
    error: "Reporting steps could not be loaded. Check your connection and retry.",
  },
  te: {
    eyebrow: "సమాజ సైబర్ భద్రత",
    title: "సైబర్ నేరాన్ని నివేదించండి",
    intro: "ఏమి జరిగిందో ఎంచుకుంటే తదుపరి చర్యలు కనిపిస్తాయి. ఈ మార్గదర్శకం సిద్ధం కావడానికి సహాయపడుతుంది; మీ తరఫున ఫిర్యాదు పంపదు.",
    language: "భాష",
    topic: "ఏమి జరిగింది?",
    steps: "తీసుకోవాల్సిన చర్యలు",
    helpline: "1930కు కాల్ చేయండి",
    portal: "అధికారిక ఫిర్యాదు పోర్టల్ తెరవండి",
    warning: "సహాయం చేస్తామని చెప్పేవారికి ఓటీపీలు, పాస్‌వర్డ్‌లు, పిన్‌లు లేదా పూర్తి చెల్లింపు వివరాలు ఇవ్వవద్దు.",
    notice: "ఈ పేజీ ఫిర్యాదు పంపదు, వ్యక్తిగత సమాచారాన్ని ఎక్కడికీ పంపదు.",
    source: "మూలం: భారత ప్రభుత్వం, హోం వ్యవహారాల మంత్రిత్వ శాఖ",
    loading: "నివేదించే చర్యలు లోడ్ అవుతున్నాయి…",
    error: "నివేదించే చర్యలు తెరవలేకపోయాం. కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.",
  },
} satisfies Record<Language, Record<string, string>>;

export default function ReportingAssistant() {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("ct_knowledge_language") === "te" ? "te" : "en",
  );
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [portal, setPortal] = useState("https://cybercrime.gov.in/");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const text = COPY[language];
  const selectedTopic = topics.find((topic) => topic.id === selectedId) || topics[0];

  useEffect(() => {
    localStorage.setItem("ct_knowledge_language", language);
    setLoading(true);
    setError(false);
    api.getReportingGuides(language)
      .then((response) => {
        setTopics(response.topics);
        setSelectedId((previous) => response.topics.some((topic: Topic) => topic.id === previous) ? previous : response.topics[0]?.id || "");
        setPortal(response.reporting_portal);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [language]);

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 border-b border-slate-200 pb-5">
        <BackToCommunity language={language} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-700">{text.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{text.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text.intro}</p>
          </div>
          <fieldset className="shrink-0">
            <legend className="mb-1 text-xs font-medium text-slate-600">{text.language}</legend>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label={text.language}>
              <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"} className={`rounded-md px-3 py-1.5 text-sm ${language === "en" ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>English</button>
              <button type="button" onClick={() => setLanguage("te")} aria-pressed={language === "te"} className={`rounded-md px-3 py-1.5 text-sm ${language === "te" ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>తెలుగు</button>
            </div>
          </fieldset>
        </div>
      </header>

      {loading && <p className="py-8 text-sm text-slate-500" role="status">{text.loading}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{text.error}</p>}
      {!loading && !error && selectedTopic && (
        <>
          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{text.topic}</span>
            <select value={selectedTopic.id} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
            </select>
          </label>

          <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">{selectedTopic.title}</h2>
            <h3 className="mt-5 text-sm font-semibold text-slate-800">{text.steps}</h3>
            <ol className="mt-3 space-y-3">
              {selectedTopic.steps.map((step, index) => (
                <li key={`${selectedTopic.id}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800">{index + 1}</span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
              {selectedTopic.financial_helpline_applies && (
                <a href="tel:1930" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-red-700 px-5 text-base font-semibold text-white hover:bg-red-800">{text.helpline}</a>
              )}
              <a href={portal} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-brand-700 px-5 text-sm font-semibold text-brand-800 hover:bg-brand-50">{text.portal}</a>
            </div>
            <p className="mt-4 text-xs text-slate-500">{text.source}</p>
          </section>

          <aside className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4" role="note">
            <p className="text-sm font-semibold text-amber-950">{text.warning}</p>
            <p className="mt-2 text-xs leading-5 text-amber-900">{text.notice}</p>
          </aside>
        </>
      )}
    </main>
  );
}
