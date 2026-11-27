import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import BackToCommunity from "../components/BackToCommunity";

type Language = "en" | "te";
type Checker = "message" | "url";
type MessageChannel = "sms" | "whatsapp";

const COPY = {
  en: {
    eyebrow: "Community cyber safety",
    title: "Citizen Safety Portal",
    intro: "Check a suspicious message or website link, then choose a safe next step. A warning is not proof of fraud, and no warning is not proof of safety.",
    language: "Language",
    messageTab: "Check a message",
    urlTab: "Check a website link",
    channel: "Where did you receive it?",
    whatsapp: "WhatsApp",
    sms: "SMS / text message",
    messageLabel: "Message text",
    messagePlaceholder: "Paste the message here…",
    urlLabel: "Website address",
    urlPlaceholder: "Paste a link, but do not open it here…",
    check: "Check",
    clear: "Clear",
    checking: "Checking…",
    result: "What the check found",
    reasons: "Warning signs observed",
    indicators: "Links and contact numbers found",
    steps: "What you can do",
    risk: "Assessment",
    high: "Several strong warning signs",
    medium: "Warning signs found",
    low: "No strong warning signs found",
    urlFlag: "The link has structural details worth checking.",
    noUrlFlag: "No structural warning was returned. This does not mean the site is safe.",
    actions: ["Do not share OTPs, PINs, passwords, or banking details.", "Do not open an unexpected link or download an unexpected file.", "Verify the sender using a phone number or app you already trust."],
    urlActions: ["Do not open an unexpected link.", "Visit the organization using its official app or a saved address.", "Never enter an OTP, PIN, or password after following an unsolicited link."],
    providerOptIn: "",
    providerNotRequested: "",
    providers: "Separate provider results",
    notConfigured: "Not configured",
    checked: "Response received",
    error: "Provider error",
    notFound: "No match returned",
    limitations: "Limitations",
    messageLimit: "Keyword and pattern checks cannot prove who sent a message or whether it is fraudulent. No warning does not prove a message is safe.",
    urlLimit: "This check does not open the URL or verify the site's content. Structural patterns are not proof of malicious activity.",
    loadingError: "The check could not complete. Try again or verify through an official channel.",
    knowledge: "Cybercrime Knowledge Centre",
    reporting: "Report Cybercrime",
    resources: "Learn and get help",
    noMessage: "Enter a message to check.",
    noUrl: "Enter a link to check.",
    quickLearn: "Quick safety guides",
    otpGuide: "Learn OTP safety",
    upiGuide: "Learn UPI safety",
    jobGuide: "Spot fake job offers",
    loanGuide: "Spot fake loan apps",
    socialGuide: "Protect social media accounts",
    bullyingGuide: "Get help with cyberbullying",
  },
  te: {
    eyebrow: "సమాజ సైబర్ భద్రత",
    title: "పౌరుల భద్రతా కేంద్రం",
    intro: "అనుమానాస్పద సందేశం లేదా వెబ్ లింక్‌ను తనిఖీ చేసి, సురక్షితమైన తదుపరి చర్య ఎంచుకోండి. హెచ్చరిక మోసానికి రుజువు కాదు; హెచ్చరిక లేకపోవడం భద్రతకు రుజువు కాదు.",
    language: "భాష",
    messageTab: "సందేశాన్ని తనిఖీ చేయండి",
    urlTab: "వెబ్ లింక్ తనిఖీ",
    channel: "ఇది ఎక్కడ వచ్చింది?",
    whatsapp: "WhatsApp",
    sms: "SMS / వచన సందేశం",
    messageLabel: "సందేశం",
    messagePlaceholder: "సందేశాన్ని ఇక్కడ అతికించండి…",
    urlLabel: "వెబ్ చిరునామా",
    urlPlaceholder: "లింక్‌ను అతికించండి; ఇక్కడ తెరవవద్దు…",
    check: "తనిఖీ చేయండి",
    clear: "తుడిచివేయండి",
    checking: "తనిఖీ చేస్తోంది…",
    result: "తనిఖీలో కనిపించినవి",
    reasons: "గమనించిన హెచ్చరిక సూచనలు",
    indicators: "కనిపించిన లింకులు, ఫోన్ నంబర్లు",
    steps: "మీరు చేయగలిగేవి",
    risk: "అంచనా",
    high: "పలు బలమైన హెచ్చరిక సూచనలు",
    medium: "హెచ్చరిక సూచనలు ఉన్నాయి",
    low: "బలమైన హెచ్చరిక సూచనలు కనిపించలేదు",
    urlFlag: "ఈ లింక్‌లో తనిఖీ చేయాల్సిన నిర్మాణ వివరాలు ఉన్నాయి.",
    noUrlFlag: "నిర్మాణపరమైన హెచ్చరిక రాలేదు. దీని అర్థం వెబ్‌సైట్ సురక్షితం అని కాదు.",
    actions: ["ఓటీపీలు, పిన్‌లు, పాస్‌వర్డ్‌లు లేదా బ్యాంక్ వివరాలు పంచుకోవద్దు.", "అనుకోని లింక్ తెరవవద్దు; అనుకోని ఫైల్ డౌన్‌లోడ్ చేయవద్దు.", "మీకు తెలిసిన నమ్మకమైన నంబర్ లేదా యాప్ ద్వారా పంపినవారిని ధృవీకరించండి."],
    urlActions: ["అనుకోని లింక్‌ను తెరవవద్దు.", "సంస్థ అధికారిక యాప్ లేదా సేవ్ చేసిన చిరునామా ద్వారా వెళ్లండి.", "అనుకోని లింక్ తెరిచిన తర్వాత ఓటీపీ, పిన్ లేదా పాస్‌వర్డ్ నమోదు చేయవద్దు."],
    providerOptIn: "",
    providerNotRequested: "",
    providers: "వేర్వేరు సేవా ఫలితాలు",
    notConfigured: "సెటప్ చేయలేదు",
    checked: "సమాధానం వచ్చింది",
    error: "సేవా లోపం",
    notFound: "ఫలితం లేదు",
    limitations: "పరిమితులు",
    messageLimit: "పదాలు మరియు నమూనాల తనిఖీ సందేశం ఎవరు పంపారో లేదా అది మోసమో నిరూపించదు. హెచ్చరిక లేకపోవడం సందేశం సురక్షితం అని కాదు.",
    urlLimit: "ఈ తనిఖీ URL‌ను తెరవదు లేదా వెబ్‌సైట్ కంటెంట్‌ను ధృవీకరించదు. నిర్మాణ నమూనాలు హానికర చర్యకు రుజువు కావు.",
    loadingError: "తనిఖీ పూర్తి కాలేదు. మళ్లీ ప్రయత్నించండి లేదా అధికారిక మార్గంలో ధృవీకరించండి.",
    knowledge: "సైబర్ నేరాల సమాచార కేంద్రం",
    reporting: "సైబర్ నేరాన్ని నివేదించండి",
    resources: "నేర్చుకోండి, సహాయం పొందండి",
    noMessage: "తనిఖీ చేయడానికి సందేశం నమోదు చేయండి.",
    noUrl: "తనిఖీ చేయడానికి లింక్ నమోదు చేయండి.",
    quickLearn: "త్వరిత భద్రతా మార్గదర్శకాలు",
    otpGuide: "ఓటీపీ భద్రత తెలుసుకోండి",
    upiGuide: "యూపీఐ భద్రత తెలుసుకోండి",
    jobGuide: "నకిలీ ఉద్యోగ ఆఫర్లను గుర్తించండి",
    loanGuide: "నకిలీ రుణ యాప్‌లను గుర్తించండి",
    socialGuide: "సోషల్ మీడియా ఖాతాలను భద్రపరచండి",
    bullyingGuide: "సైబర్ వేధింపులకు సహాయం పొందండి",
  },
} satisfies Record<Language, Record<string, string | string[]>>;

const URL_FLAG_TRANSLATIONS: Record<string, string> = {
  "URL uses a raw IP address instead of a domain name.": "డొమైన్ పేరుకు బదులుగా నేరుగా IP చిరునామా వాడుతోంది.",
  "URL contains percent-encoded characters.": "URL‌లో శాతం-ఎన్‌కోడ్ చేసిన అక్షరాలు ఉన్నాయి.",
};

export default function CitizenSafety() {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("ct_knowledge_language") === "te" ? "te" : "en",
  );
  const [checker, setChecker] = useState<Checker>("message");
  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const text = COPY[language];
  const learningLinks = [
    { label: text.otpGuide, query: language === "te" ? "ఓటీపీ" : "OTP" },
    { label: text.upiGuide, query: language === "te" ? "యూపీఐ" : "UPI" },
    { label: text.jobGuide, query: language === "te" ? "ఉద్యోగ" : "job" },
    { label: text.loanGuide, query: language === "te" ? "రుణ" : "loan" },
    { label: text.socialGuide, query: language === "te" ? "సోషల్ మీడియా" : "social media" },
    { label: text.bullyingGuide, query: language === "te" ? "సైబర్ వేధింపులు" : "cyberbullying" },
  ];

  const runCheck = async () => {
    if (checker === "message" && !message.trim()) return;
    if (checker === "url" && !url.trim()) return;
    setBusy(true);
    setError(false);
    setResult(null);
    try {
      const response = checker === "message"
        ? await api.analyzeMessage(message, channel, language)
        : await api.analyzeUrl(url, false, false);
      setResult(response);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setMessage("");
    setUrl("");
    setResult(null);
    setError(false);
  };

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    localStorage.setItem("ct_knowledge_language", nextLanguage);
    setResult(null);
    setError(false);
  };

  const riskLabel = result?.risk_level === "high" ? text.high : result?.risk_level === "medium" ? text.medium : text.low;
  const urlFlags: string[] = result?.structural_flags || [];
  const localizedFlags = urlFlags.map((flag) => {
    if (language === "te") {
      const tld = flag.match(/TLD '\.([^']+)'/)?.[1];
      const port = flag.match(/port \((\d+)\)/)?.[1];
      if (tld) return `'.${tld}' చివర ఉన్న డొమైన్‌లు దుర్వినియోగం కావచ్చు; ఇది ఒక్కటే హానికరమని రుజువు కాదు.`;
      if (port) return `ఈ URL ప్రామాణికం కాని పోర్ట్ (${port}) వాడుతోంది.`;
      return URL_FLAG_TRANSLATIONS[flag] || flag;
    }
    return flag;
  });

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 border-b border-slate-200 pb-5">
        <BackToCommunity language={language} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-700">{text.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{text.intro}</p>
          </div>
          <fieldset className="shrink-0">
            <legend className="mb-1 text-xs font-medium text-slate-600">{text.language}</legend>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label={text.language}>
              <button type="button" onClick={() => changeLanguage("en")} aria-pressed={language === "en"} className={`rounded-md px-3 py-1.5 text-sm ${language === "en" ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>English</button>
              <button type="button" onClick={() => changeLanguage("te")} aria-pressed={language === "te"} className={`rounded-md px-3 py-1.5 text-sm ${language === "te" ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>తెలుగు</button>
            </div>
          </fieldset>
        </div>
      </header>

      <div className="mb-5 inline-flex w-full flex-wrap gap-2 sm:w-auto" role="group" aria-label={text.title}>
        <button type="button" onClick={() => { setChecker("message"); setResult(null); setError(false); }} aria-pressed={checker === "message"} className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${checker === "message" ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{text.messageTab}</button>
        <button type="button" onClick={() => { setChecker("url"); setResult(null); setError(false); }} aria-pressed={checker === "url"} className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${checker === "url" ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{text.urlTab}</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          {checker === "message" ? (
            <>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="citizen-channel">{text.channel}</label>
              <select id="citizen-channel" value={channel} onChange={(event) => setChannel(event.target.value as MessageChannel)} className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base">
                <option value="whatsapp">{text.whatsapp}</option>
                <option value="sms">{text.sms}</option>
              </select>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="citizen-message">{text.messageLabel}</label>
              <textarea id="citizen-message" rows={8} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={text.messagePlaceholder} className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base leading-6 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </>
          ) : (
            <>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="citizen-url">{text.urlLabel}</label>
              <input id="citizen-url" type="text" inputMode="url" autoComplete="off" value={url} onChange={(event) => setUrl(event.target.value)} placeholder={text.urlPlaceholder} className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={runCheck} disabled={busy || (checker === "message" ? !message.trim() : !url.trim())} className="min-h-11 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{busy ? text.checking : text.check}</button>
            <button type="button" onClick={clear} disabled={busy} className="min-h-11 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{text.clear}</button>
          </div>
        </section>

        <section aria-live="polite" className="min-h-48 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">{text.result}</h2>
          {busy && <p className="mt-4 text-sm text-slate-500">{text.checking}</p>}
          {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{text.loadingError}</p>}
          {result && checker === "message" && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">{text.risk}</p>
                <p className={`mt-1 text-base font-semibold ${result.risk_level === "high" ? "text-red-800" : result.risk_level === "medium" ? "text-amber-800" : "text-slate-800"}`}>{riskLabel}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{result.plain_language_summary}</p>
              </div>
              {result.details?.length > 0 && <div>
                <h3 className="text-sm font-semibold text-slate-800">{text.reasons}</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{result.details.map((item: any, index: number) => <li key={`${item.type}-${index}`}>{item.plain_meaning} {item.what_to_check}</li>)}</ul>
              </div>}
              {(result.links_found?.length > 0 || result.domains_found?.length > 0 || result.phone_numbers_found?.length > 0) && <div>
                <h3 className="text-sm font-semibold text-slate-800">{text.indicators}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                  {[...result.links_found, ...result.domains_found, ...result.phone_numbers_found].map((indicator: string, index: number) => <li key={`${indicator}-${index}`} className="break-all font-mono">{indicator}</li>)}
                </ul>
              </div>}
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{text.steps}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{result.safe_next_steps.map((step: string, index: number) => <li key={index}>{step}</li>)}</ul>
              </div>
              <p className="border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"><strong>{text.limitations}:</strong> {result.disclaimer}</p>
            </div>
          )}
          {result && checker === "url" && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">{text.risk}</p>
                <p className="mt-1 text-base font-semibold text-slate-800">{urlFlags.length ? text.urlFlag : text.noUrlFlag}</p>
                {localizedFlags.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{localizedFlags.map((flag, index) => <li key={index}>{flag}</li>)}</ul>}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{text.steps}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{text.urlActions.map((step, index) => <li key={index}>{step}</li>)}</ul>
              </div>
              <p className="border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"><strong>{text.limitations}:</strong> {text.urlLimit}</p>
            </div>
          )}
          {!result && !busy && !error && <p className="mt-4 text-sm text-slate-500">{checker === "message" ? text.noMessage : text.noUrl}</p>}
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-800">{text.resources}</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/knowledge" className="font-medium text-brand-700 hover:underline">{text.knowledge}</Link>
          <Link to="/report-cybercrime" className="font-medium text-brand-700 hover:underline">{text.reporting}</Link>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-slate-800">{text.quickLearn}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {learningLinks.map((item) => (
            <Link key={item.query} to={`/knowledge?q=${encodeURIComponent(item.query)}`} className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-brand-800 hover:border-brand-300 hover:bg-brand-50">
              {item.label} <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
