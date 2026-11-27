import { Link } from "react-router-dom";
import { useAuth } from "../auth";

const sections = [
  {
    title: "Check and learn",
    items: [
      { href: "/citizen", label: "Citizen Safety Portal", detail: "Check suspicious messages and website links." },
      { href: "/knowledge", label: "Cybercrime Knowledge Centre", detail: "Read practical guides to common online risks." },
      { href: "/academy", label: "Cyber Safety Academy", detail: "Learn through short lessons and knowledge checks." },
      { href: "/quiz", label: "Cyber Awareness Quiz", detail: "Test safer online habits." },
    ],
  },
  {
    title: "Get help",
    items: [
      { href: "/contacts", label: "Cyber Helpdesk & Contacts", detail: "Find official contact and reporting links." },
      { href: "/report-cybercrime", label: "Report Cybercrime", detail: "Review steps to take after an incident." },
    ],
  },
];

export default function CommunityHub() {
  const { user } = useAuth();
  const returnPath = user ? "/" : "/login";
  const returnLabel = user ? "Back to Investigation Workspace" : "Back to sign in";

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <header className="mb-7 border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase text-brand-700">CyberTrace AI</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Community Cyber Safety</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Practical, plain-language guidance and verified reporting resources. These public pages do not submit complaints or send your personal information.</p>
        <Link to={returnPath} className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-brand-700 hover:underline">← {returnLabel}</Link>
      </header>
      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {section.items.map((item) => (
                <Link key={item.href} to={item.href} className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50">
                  <span className="block text-sm font-semibold text-brand-900">{item.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">{item.detail}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
