import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import BackToCommunity from "../components/BackToCommunity";

type LocalizedText = Record<"en" | "te", string>;
type Guide = {
  id: string;
  title: LocalizedText;
  definition: LocalizedText;
  how_it_happens: LocalizedText;
  common_methods: LocalizedText;
  warning_signs: Record<"en" | "te", string[]>;
  example: LocalizedText;
  how_to_identify: LocalizedText;
  prevention: LocalizedText;
  if_affected: LocalizedText;
  reporting_resources: { name: string; url: string; purpose: string; source: string }[];
  content_note: string;
};

type GuideGroup = "all" | "financial" | "identity" | "harassment" | "digital";

const GROUPS: { id: GuideGroup; label: Record<"en" | "te", string>; ids: string[] }[] = [
  { id: "all", label: { en: "All topics", te: "అన్ని అంశాలు" }, ids: [] },
  { id: "financial", label: { en: "Money and payment", te: "డబ్బు మరియు చెల్లింపులు" }, ids: ["otp-fraud", "upi-fraud", "fake-bank-call", "fake-job", "lottery-prize", "fake-loan", "kyc-scam", "qr-scam", "investment-scam", "shopping-fraud"] },
  { id: "identity", label: { en: "Accounts and identity", te: "ఖాతాలు మరియు గుర్తింపు" }, ids: ["social-account", "identity-theft", "sim-swap", "impersonation"] },
  { id: "harassment", label: { en: "Harassment and safety", te: "వేధింపులు మరియు భద్రత" }, ids: ["cyberbullying", "sextortion-harassment"] },
  { id: "digital", label: { en: "Links and device threats", te: "లింకులు మరియు పరికర ముప్పులు" }, ids: ["phishing", "remote-access", "malware-ransomware", "website-link-scams"] },
];

const COPY = {
  en: {
    title: "Cybercrime Knowledge Centre",
    intro: "Understand common online risks and practical steps to protect yourself. These guides are educational, not a verdict about a specific person or incident.",
    search: "Search topics",
    filter: "Filter topics",
    loading: "Loading guidance…",
    error: "Could not load the knowledge centre. Check your connection and sign-in, then refresh.",
    definition: "What it is",
    how: "How it happens",
    methods: "Common methods",
    signs: "Warning signs",
    example: "Illustrative example",
    identify: "How to check",
    prevent: "How to prevent it",
    affected: "If this happens to you",
    resources: "Official reporting resources",
    source: "Source",
    note: "This example is illustrative. Similar signs do not prove that a specific message or person is fraudulent.",
    language: "Language",
    noResults: "No topics match your search and filter.",
  },
  te: {
    title: "సైబర్ నేరాల సమాచార కేంద్రం",
    intro: "సాధారణ ఆన్‌లైన్ ప్రమాదాలను అర్థం చేసుకుని, మిమ్మల్ని రక్షించుకునే చర్యలు తెలుసుకోండి. ఈ మార్గదర్శకాలు అవగాహన కోసం మాత్రమే; ఒక నిర్దిష్ట వ్యక్తి లేదా ఘటనపై తీర్పు కావు.",
    search: "అంశాలను వెతకండి",
    filter: "అంశాల వడపోత",
    loading: "సమాచారం లోడ్ అవుతోంది…",
    error: "సమాచార కేంద్రాన్ని తెరవలేకపోయాం. కనెక్షన్ మరియు సైన్-ఇన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.",
    definition: "ఇది ఏమిటి",
    how: "ఇది ఎలా జరుగుతుంది",
    methods: "సాధారణ పద్ధతులు",
    signs: "హెచ్చరిక సూచనలు",
    example: "ఉదాహరణ",
    identify: "ఎలా తనిఖీ చేయాలి",
    prevent: "ఎలా నివారించాలి",
    affected: "ఇది మీకు జరిగితే",
    resources: "అధికారిక ఫిర్యాదు వనరులు",
    source: "మూలం",
    note: "ఈ ఉదాహరణ అవగాహన కోసం మాత్రమే. ఇలాంటి సూచనలు కనిపించడం వల్ల నిర్దిష్ట సందేశం లేదా వ్యక్తి మోసగాడు అని నిరూపించబడదు.",
    language: "భాష",
    noResults: "మీ శోధనకు సరిపోయే అంశాలు లేవు.",
  },
} satisfies Record<"en" | "te", Record<string, string>>;

export default function KnowledgeCentre() {
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<"en" | "te">(() =>
    localStorage.getItem("ct_knowledge_language") === "te" ? "te" : "en",
  );
  const [guides, setGuides] = useState<Guide[]>([]);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [group, setGroup] = useState<GuideGroup>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const text = COPY[language];

  useEffect(() => {
    localStorage.setItem("ct_knowledge_language", language);
    setLoading(true);
    setError(false);
    api.getCybercrimeGuides(language)
      .then((response) => setGuides(response.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [language]);

  const visibleGuides = useMemo(() => {
    const selectedGroup = GROUPS.find((item) => item.id === group);
    const needle = search.trim().toLocaleLowerCase();
    return guides.filter((guide) => {
      const matchesGroup = !selectedGroup?.ids.length || selectedGroup.ids.includes(guide.id);
      const searchable = [guide.title[language], guide.definition[language], guide.example[language], ...guide.warning_signs[language]]
        .join(" ")
        .toLocaleLowerCase();
      return matchesGroup && (!needle || searchable.includes(needle));
    });
  }, [guides, group, language, search]);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 border-b border-slate-200 pb-5">
        <BackToCommunity language={language} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-700">Community cyber safety</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{text.intro}</p>
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

      <section className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_15rem]" aria-label={text.title}>
        <label className="block">
          <span className="sr-only">{text.search}</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.search} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
        <label className="block">
          <span className="sr-only">{text.filter}</span>
          <select value={group} onChange={(event) => setGroup(event.target.value as GuideGroup)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm capitalize outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
            {GROUPS.map((item) => <option key={item.id} value={item.id}>{item.label[language]}</option>)}
          </select>
        </label>
      </section>

      {loading && <p className="py-8 text-sm text-slate-500" role="status">{text.loading}</p>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{text.error}</div>}
      {!loading && !error && visibleGuides.length === 0 && <p className="py-8 text-sm text-slate-500">{text.noResults}</p>}

      <div className="space-y-3">
        {visibleGuides.map((guide) => (
          <details key={guide.id} className="group rounded-lg border border-slate-200 bg-white open:border-brand-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-medium text-slate-900 marker:hidden sm:px-5">
              <span>{guide.title[language]}</span>
              <span className="shrink-0 text-xs text-brand-700 group-open:hidden">{language === "en" ? "Read guide" : "చదవండి"}</span>
              <span className="hidden shrink-0 text-xs text-slate-500 group-open:inline">{language === "en" ? "Close" : "మూసివేయండి"}</span>
            </summary>
            <div className="grid gap-x-8 gap-y-5 border-t border-slate-100 px-4 py-5 sm:grid-cols-2 sm:px-5">
              <GuideSection heading={text.definition} body={guide.definition[language]} />
              <GuideSection heading={text.how} body={guide.how_it_happens[language]} />
              <GuideSection heading={text.methods} body={guide.common_methods[language]} />
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{text.signs}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                  {guide.warning_signs[language].map((sign) => <li key={sign}>{sign}</li>)}
                </ul>
              </div>
              <GuideSection heading={text.example} body={guide.example[language]} />
              <GuideSection heading={text.identify} body={guide.how_to_identify[language]} />
              <GuideSection heading={text.prevent} body={guide.prevention[language]} />
              <GuideSection heading={text.affected} body={guide.if_affected[language]} />
              <section className="sm:col-span-2">
                <h3 className="text-sm font-semibold text-slate-800">{text.resources}</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {guide.reporting_resources.map((resource) => (
                    <a key={resource.name} href={resource.url} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 p-3 hover:border-brand-300 hover:bg-slate-50">
                      <span className="block text-sm font-medium text-brand-800">{resource.name}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">{resource.purpose}</span>
                      <span className="mt-2 block text-[11px] text-slate-500">{text.source}: {resource.source}</span>
                    </a>
                  ))}
                </div>
              </section>
              <p className="text-xs leading-5 text-slate-500 sm:col-span-2">{text.note}</p>
            </div>
          </details>
        ))}
      </div>
      {!loading && !error && <p className="mt-4 text-xs text-slate-500" aria-live="polite">{visibleGuides.length} / {guides.length}</p>}
    </div>
  );
}

function GuideSection({ heading, body }: { heading: string; body: string }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-800">{heading}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </section>
  );
}
