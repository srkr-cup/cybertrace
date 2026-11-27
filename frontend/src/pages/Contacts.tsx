import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import BackToCommunity from "../components/BackToCommunity";

type Contact = {
  id: string;
  name: string;
  country: string;
  region: string;
  categories: string[];
  description: string;
  phone: string | null;
  email: string | null;
  additional_email?: string;
  website: string;
  instructions: string;
  source_name: string;
  source_url: string;
  verification_status: string;
  verified_at: string;
};

type Language = "en" | "te";

const COPY = {
  en: {
    eyebrow: "Community cyber safety",
    title: "Cyber Helpdesk & Official Contacts",
    intro: "Use official contacts and reporting pages. Indian resources are listed first; international agencies are separate and do not replace Indian authorities.",
    language: "Language",
    search: "Search contacts",
    country: "Country",
    allCountries: "All countries",
    category: "Category",
    allCategories: "All categories",
    call: "Call now",
    email: "Send email",
    website: "Open official website",
    copy: "Copy contact",
    copied: "Contact copied",
    copyError: "Could not copy contact",
    instructions: "Reporting instructions",
    source: "Official source",
    verified: "Verified",
    unverified: "Verification warning",
    verifiedOn: "Checked",
    noResults: "No contacts match the current search and filters.",
    loading: "Loading official contacts…",
    error: "The directory could not be loaded. Try again.",
    noDirect: "No direct phone or email is published in this directory entry. Use the official website for current instructions.",
    notice: "Do not share OTPs, passwords, PINs, or banking details with anyone claiming they can recover money. This directory does not submit complaints for you.",
  },
  te: {
    eyebrow: "సమాజ సైబర్ భద్రత",
    title: "సైబర్ సహాయ కేంద్రం మరియు అధికారిక సంప్రదింపులు",
    intro: "అధికారిక సంప్రదింపులు, ఫిర్యాదు పేజీలను వాడండి. భారతీయ వనరులు ముందుగా ఉన్నాయి; అంతర్జాతీయ సంస్థలు భారత అధికారులకు ప్రత్యామ్నాయం కావు.",
    language: "భాష",
    search: "సంప్రదింపులను వెతకండి",
    country: "దేశం",
    allCountries: "అన్ని దేశాలు",
    category: "వర్గం",
    allCategories: "అన్ని వర్గాలు",
    call: "ఇప్పుడు కాల్ చేయండి",
    email: "ఈమెయిల్ పంపండి",
    website: "అధికారిక వెబ్‌సైట్ తెరవండి",
    copy: "సంప్రదింపు కాపీ చేయండి",
    copied: "సంప్రదింపు కాపీ అయింది",
    copyError: "సంప్రదింపును కాపీ చేయలేకపోయాం",
    instructions: "నివేదించే సూచనలు",
    source: "అధికారిక మూలం",
    verified: "ధృవీకరించబడింది",
    unverified: "ధృవీకరణ హెచ్చరిక",
    verifiedOn: "తనిఖీ తేదీ",
    noResults: "ఈ శోధన, వడపోతకు సరిపోయే సంప్రదింపులు లేవు.",
    loading: "అధికారిక సంప్రదింపులు లోడ్ అవుతున్నాయి…",
    error: "డైరెక్టరీ తెరవలేకపోయాం. మళ్లీ ప్రయత్నించండి.",
    noDirect: "ఈ నమోదులో ప్రత్యక్ష ఫోన్ లేదా ఈమెయిల్ ప్రచురించలేదు. తాజా సూచనల కోసం అధికారిక వెబ్‌సైట్ వాడండి.",
    notice: "డబ్బు తిరిగి తెస్తామని చెప్పేవారికి ఓటీపీలు, పాస్‌వర్డ్‌లు, పిన్‌లు లేదా బ్యాంక్ వివరాలు ఇవ్వవద్దు. ఈ డైరెక్టరీ మీ తరఫున ఫిర్యాదు పంపదు.",
  },
} satisfies Record<Language, Record<string, string>>;

export default function Contacts() {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("ct_knowledge_language") === "te" ? "te" : "en",
  );
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState("");
  const [copiedContactId, setCopiedContactId] = useState<string | null>(null);
  const text = COPY[language];

  useEffect(() => {
    localStorage.setItem("ct_knowledge_language", language);
    api.getOfficialContacts()
      .then((response) => setContacts(response.contacts))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [language]);

  const countries = [...new Set(contacts.map((contact) => contact.country))];
  const categories = [...new Set(contacts.flatMap((contact) => contact.categories))].sort();
  const visibleContacts = useMemo(() => contacts.filter((contact) => {
    const matchesCountry = country === "all" || contact.country === country;
    const matchesCategory = category === "all" || contact.categories.includes(category);
    const searchable = `${contact.name} ${contact.country} ${contact.region} ${contact.description} ${contact.categories.join(" ")}`.toLowerCase();
    return matchesCountry && matchesCategory && searchable.includes(search.toLowerCase().trim());
  }), [contacts, country, category, search]);

  const copyContact = async (contact: Contact) => {
    const details = [contact.name, contact.phone, contact.email, contact.additional_email, contact.website]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(details);
      setNotice(text.copied);
      setCopiedContactId(contact.id);
    } catch {
      setNotice(text.copyError);
      setCopiedContactId(contact.id);
    }
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

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_16rem]">
        <label><span className="sr-only">{text.search}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.search} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" /></label>
        <label><span className="sr-only">{text.country}</span><select value={country} onChange={(event) => setCountry(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">{text.allCountries}</option>{countries.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span className="sr-only">{text.category}</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">{text.allCategories}</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      </section>

      {loading && <p className="py-8 text-sm text-slate-500" role="status">{text.loading}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{text.error}</p>}
      {!loading && !error && visibleContacts.length === 0 && <p className="py-8 text-sm text-slate-500">{text.noResults}</p>}
      {!loading && !error && <div className="space-y-3">
        {visibleContacts.map((contact) => {
          const isVerified = contact.verification_status.startsWith("Verified");
          const copyText = copiedContactId === contact.id ? notice : "";
          return (
            <article key={contact.id} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{contact.name}</h2>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${isVerified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
                      {isVerified ? text.verified : text.unverified}: {contact.verification_status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{contact.country} · {contact.region} · {contact.categories.join(" · ")}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{contact.description}</p>
                </div>
                <button type="button" onClick={() => copyContact(contact)} className="min-h-10 shrink-0 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{text.copy}</button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {contact.phone && <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">{text.call}: {contact.phone}</a>}
                {contact.email && <a href={`mailto:${contact.email}`} className="inline-flex min-h-11 items-center rounded-md border border-brand-700 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50">{text.email}: {contact.email}</a>}
                {contact.additional_email && <a href={`mailto:${contact.additional_email}`} className="inline-flex min-h-11 items-center rounded-md border border-brand-700 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50">{text.email}: {contact.additional_email}</a>}
                <a href={contact.website} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">{text.website}</a>
              </div>

              <details className="mt-4 border-t border-slate-100 pt-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">{text.instructions}</summary>
                <p className="mt-2 text-sm leading-6 text-slate-600">{contact.instructions}</p>
                {!contact.phone && !contact.email && <p className="mt-2 text-xs text-slate-500">{text.noDirect}</p>}
              </details>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{text.source}: <a href={contact.source_url} target="_blank" rel="noreferrer" className="text-brand-700 underline">{contact.source_name}</a></span>
                <span>{text.verifiedOn}: {contact.verified_at}</span>
              </div>
              {copyText && <p className="mt-2 text-xs text-emerald-800" role="status">{copyText}</p>}
            </article>
          );
        })}
      </div>}
      {!loading && !error && <p className="mt-3 text-xs text-slate-500" aria-live="polite">{visibleContacts.length} contacts</p>}
      <aside className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{text.notice}</aside>
    </main>
  );
}
