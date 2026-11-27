import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import BackToCommunity from "../components/BackToCommunity";

type Language = "en" | "te";
type Guide = {
  id: string;
  title: Record<Language, string>;
  definition: Record<Language, string>;
  how_it_happens: Record<Language, string>;
  common_methods: Record<Language, string>;
  warning_signs: Record<Language, string[]>;
  example: Record<Language, string>;
  prevention: Record<Language, string>;
  if_affected: Record<Language, string>;
  reporting_resources: { name: string; url: string; purpose: string; source: string }[];
};

type Group = "all" | "financial" | "accounts" | "harassment" | "technical";

const GROUPS: { id: Group; label: Record<Language, string>; ids: string[] }[] = [
  { id: "all", label: { en: "All lessons", te: "అన్ని పాఠాలు" }, ids: [] },
  { id: "financial", label: { en: "Money and payments", te: "డబ్బు మరియు చెల్లింపులు" }, ids: ["otp-fraud", "upi-fraud", "fake-bank-call", "fake-job", "lottery-prize", "fake-loan", "kyc-scam", "qr-scam", "investment-scam", "shopping-fraud"] },
  { id: "accounts", label: { en: "Accounts and identity", te: "ఖాతాలు మరియు గుర్తింపు" }, ids: ["social-account", "identity-theft", "sim-swap", "impersonation"] },
  { id: "harassment", label: { en: "Personal safety", te: "వ్యక్తిగత భద్రత" }, ids: ["cyberbullying", "sextortion-harassment"] },
  { id: "technical", label: { en: "Links and devices", te: "లింకులు మరియు పరికరాలు" }, ids: ["phishing", "remote-access", "malware-ransomware", "website-link-scams"] },
];

const COPY = {
  en: {
    eyebrow: "Community cyber safety",
    title: "Cyber Safety Academy",
    intro: "Short, practical lessons based on the Cybercrime Knowledge Centre. Each lesson includes a quick check using the prevention advice shown in that guide.",
    language: "Language",
    search: "Search lessons",
    filter: "Filter lessons",
    definition: "What it is",
    methods: "How it happens",
    signs: "Warning signs",
    example: "Example",
    prevent: "Prevention",
    affected: "If affected",
    check: "Quick knowledge check",
    prompt: "Which action matches this lesson's prevention advice?",
    wrongUrgency: "Act quickly because the message says there is a deadline.",
    wrongSecret: "Share an OTP or password to prove who you are.",
    correct: "Correct. This matches the prevention guidance in this lesson.",
    incorrect: "Review the prevention guidance above and try another option.",
    resources: "Official resources",
    quiz: "Take the full awareness quiz",
    loading: "Loading lessons…",
    error: "Lessons could not be loaded. Try again.",
    empty: "No lessons match your search.",
  },
  te: {
    eyebrow: "సమాజ సైబర్ భద్రత",
    title: "సైబర్ భద్రతా అకాడమీ",
    intro: "సైబర్ నేరాల సమాచార కేంద్రంపై ఆధారపడిన చిన్న, ఉపయోగకరమైన పాఠాలు. ప్రతి పాఠంలో ఆ మార్గదర్శకంలోని నివారణ సూచనపై చిన్న తనిఖీ ఉంటుంది.",
    language: "భాష",
    search: "పాఠాలను వెతకండి",
    filter: "పాఠాల వడపోత",
    definition: "ఇది ఏమిటి",
    methods: "ఇది ఎలా జరుగుతుంది",
    signs: "హెచ్చరిక సూచనలు",
    example: "ఉదాహరణ",
    prevent: "నివారణ",
    affected: "బాధితులైతే",
    check: "చిన్న జ్ఞాన తనిఖీ",
    prompt: "ఈ పాఠంలోని నివారణ సూచనకు సరిపోయే చర్య ఏది?",
    wrongUrgency: "సందేశంలో గడువు ఉందని త్వరగా చర్య తీసుకోండి.",
    wrongSecret: "మీరు ఎవరో నిరూపించడానికి ఓటీపీ లేదా పాస్‌వర్డ్ చెప్పండి.",
    correct: "సరైనది. ఇది ఈ పాఠంలోని నివారణ సూచనతో సరిపోతుంది.",
    incorrect: "పై నివారణ సూచన చదివి మరో ఎంపిక ప్రయత్నించండి.",
    resources: "అధికారిక వనరులు",
    quiz: "పూర్తి అవగాహన క్విజ్ తీసుకోండి",
    loading: "పాఠాలు లోడ్ అవుతున్నాయి…",
    error: "పాఠాలు తెరవలేకపోయాం. మళ్లీ ప్రయత్నించండి.",
    empty: "మీ శోధనకు పాఠాలు లేవు.",
  },
} satisfies Record<Language, Record<string, string>>;

type QuizChoice = { option: "prevention" | "urgency" | "secret"; selected: boolean };

export default function Academy() {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("ct_knowledge_language") === "te" ? "te" : "en",
  );
  const [guides, setGuides] = useState<Guide[]>([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<Group>("all");
  const [choices, setChoices] = useState<Record<string, QuizChoice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const text = COPY[language];

  useEffect(() => {
    localStorage.setItem("ct_knowledge_language", language);
    setLoading(true);
    setError(false);
    setChoices({});
    api.getCybercrimeGuides(language)
      .then((response) => setGuides(response.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [language]);

  const lessons = useMemo(() => {
    const selectedGroup = GROUPS.find((item) => item.id === group);
    const needle = search.toLocaleLowerCase().trim();
    return guides.filter((guide) => {
      const matchesGroup = !selectedGroup?.ids.length || selectedGroup.ids.includes(guide.id);
      const content = `${guide.title[language]} ${guide.definition[language]} ${guide.example[language]}`.toLocaleLowerCase();
      return matchesGroup && (!needle || content.includes(needle));
    });
  }, [guides, group, language, search]);

  const answerQuestion = (guide: Guide, selected: QuizChoice["option"]) => {
    setChoices((previous) => ({
      ...previous,
      [guide.id]: { option: selected, selected: true },
    }));
  };

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 border-b border-slate-200 pb-5">
        <BackToCommunity language={language} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-700">{text.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{text.intro}</p>
            <Link to="/quiz" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">{text.quiz} →</Link>
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

      <section className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <label><span className="sr-only">{text.search}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.search} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" /></label>
        <label><span className="sr-only">{text.filter}</span><select value={group} onChange={(event) => setGroup(event.target.value as Group)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">{GROUPS[0].label[language]}</option>{GROUPS.slice(1).map((item) => <option key={item.id} value={item.id}>{item.label[language]}</option>)}</select></label>
      </section>

      {loading && <p className="py-8 text-sm text-slate-500" role="status">{text.loading}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{text.error}</p>}
      {!loading && !error && lessons.length === 0 && <p className="py-8 text-sm text-slate-500">{text.empty}</p>}
      <div className="space-y-3">
        {lessons.map((guide) => {
          const choice = choices[guide.id];
          return (
            <details key={guide.id} className="group rounded-lg border border-slate-200 bg-white open:border-brand-200">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-medium text-slate-900 sm:px-5">
                <span>{guide.title[language]}</span><span className="text-xs text-brand-700">{language === "en" ? "Open lesson" : "పాఠం తెరవండి"}</span>
              </summary>
              <div className="grid gap-x-8 gap-y-4 border-t border-slate-100 px-4 py-5 sm:grid-cols-2 sm:px-5">
                <LessonSection title={text.definition} body={guide.definition[language]} />
                <LessonSection title={text.methods} body={guide.how_it_happens[language]} />
                <div><h3 className="text-sm font-semibold text-slate-800">{text.signs}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">{guide.warning_signs[language].map((sign) => <li key={sign}>{sign}</li>)}</ul></div>
                <LessonSection title={text.example} body={guide.example[language]} />
                <LessonSection title={text.prevent} body={guide.prevention[language]} />
                <LessonSection title={text.affected} body={guide.if_affected[language]} />
                <section className="sm:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-800">{text.check}</h3>
                  <p className="mt-1 text-sm text-slate-700">{text.prompt}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <QuizOption selected={choice?.selected && choice.option === "prevention"} onClick={() => answerQuestion(guide, "prevention")} text={guide.prevention[language]} />
                    <QuizOption selected={choice?.selected && choice.option === "urgency"} onClick={() => answerQuestion(guide, "urgency")} text={text.wrongUrgency} />
                    <QuizOption selected={choice?.selected && choice.option === "secret"} onClick={() => answerQuestion(guide, "secret")} text={text.wrongSecret} />
                  </div>
                  {choice?.selected && <p className={`mt-2 text-sm ${choice.option === "prevention" ? "text-emerald-800" : "text-amber-900"}`} role="status">{choice.option === "prevention" ? text.correct : text.incorrect}</p>}
                </section>
                <section className="sm:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-800">{text.resources}</h3>
                  <div className="mt-2 flex flex-wrap gap-3">{guide.reporting_resources.map((resource) => <a key={resource.name} href={resource.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-700 underline">{resource.name}</a>)}</div>
                </section>
              </div>
            </details>
          );
        })}
      </div>
    </main>
  );
}

function LessonSection({ title, body }: { title: string; body: string }) {
  return <section><h3 className="text-sm font-semibold text-slate-800">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></section>;
}

function QuizOption({ selected, onClick, text }: { selected?: boolean; onClick: () => void; text: string }) {
  return <button type="button" aria-pressed={Boolean(selected)} onClick={onClick} className={`rounded-md border p-3 text-left text-sm leading-6 ${selected ? "border-brand-500 bg-brand-50 text-brand-950" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{text}</button>;
}
