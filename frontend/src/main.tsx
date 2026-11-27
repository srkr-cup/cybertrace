import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import Dashboard from "./pages/Dashboard";
import Correlation from "./pages/Correlation";
import Cases from "./pages/Cases";
import Analyzers from "./pages/Analyzers";
import AuditLog from "./pages/AuditLog";
import KnowledgeCentre from "./pages/KnowledgeCentre";
import Quiz from "./pages/Quiz";
import ReportingAssistant from "./pages/ReportingAssistant";
import CitizenSafety from "./pages/CitizenSafety";
import Contacts from "./pages/Contacts";
import Academy from "./pages/Academy";
import CommunityHub from "./pages/CommunityHub";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "./auth";
import { ShieldCheckIcon, GridIcon, NetworkIcon, FolderIcon } from "./components/Icons";

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = React.useState(false);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {navOpen && <button onClick={() => setNavOpen(false)} aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" />}
      <aside className={`w-64 shrink-0 border-r border-slate-200 bg-white flex-col ${navOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} lg:flex lg:static`}>
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-100">
          <ShieldCheckIcon className="w-6 h-6 text-brand-600" />
          <div>
            <div className="font-semibold text-sm leading-tight">CyberTrace AI</div>
            <div className="text-[11px] text-slate-400 leading-tight">Investigation Platform</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="px-4 pb-2 text-[10px] font-semibold uppercase text-slate-400">Community Cyber Safety</div>
          <NavLink to="/community" onClick={() => setNavOpen(false)} className={linkClass}><ShieldCheckIcon className="w-4 h-4" /> Community Safety Home</NavLink>
          <NavLink to="/citizen" onClick={() => setNavOpen(false)} className={linkClass}><ShieldCheckIcon className="w-4 h-4" /> Citizen Safety Portal</NavLink>
          <NavLink to="/contacts" onClick={() => setNavOpen(false)} className={linkClass}><FolderIcon className="w-4 h-4" /> Cyber Helpdesk & Contacts</NavLink>
          <NavLink to="/academy" onClick={() => setNavOpen(false)} className={linkClass}><GridIcon className="w-4 h-4" /> Cyber Safety Academy</NavLink>
          <NavLink to="/knowledge" onClick={() => setNavOpen(false)} className={linkClass}><ShieldCheckIcon className="w-4 h-4" /> Cybercrime Knowledge Centre</NavLink>
          <NavLink to="/quiz" onClick={() => setNavOpen(false)} className={linkClass}><GridIcon className="w-4 h-4" /> Cyber Awareness Quiz</NavLink>
          <NavLink to="/report-cybercrime" onClick={() => setNavOpen(false)} className={linkClass}><ShieldCheckIcon className="w-4 h-4" /> Report Cybercrime</NavLink>
          <div className="px-4 pb-2 text-[10px] font-semibold uppercase text-slate-400">Investigation Workspace</div>
          <NavLink to="/" end onClick={() => setNavOpen(false)} className={linkClass}><GridIcon className="w-4 h-4" /> Security Overview</NavLink>
          <NavLink to="/cases" onClick={() => setNavOpen(false)} className={linkClass}><FolderIcon className="w-4 h-4" /> Investigations</NavLink>
          <NavLink to="/correlation" onClick={() => setNavOpen(false)} className={linkClass}><NetworkIcon className="w-4 h-4" /> Evidence Correlation</NavLink>
          <NavLink to="/analyzers" onClick={() => setNavOpen(false)} className={linkClass}><GridIcon className="w-4 h-4" /> Analyzers</NavLink>
          {user?.role === "admin" && (
            <NavLink to="/audit-log" onClick={() => setNavOpen(false)} className={linkClass}><FolderIcon className="w-4 h-4" /> Activity History</NavLink>
          )}
        </nav>
        <div className="px-4 py-4 border-t border-slate-100">
          {user && (
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <div className="font-medium">{user.email}</div>
                <div className="text-slate-400 capitalize">{user.role}</div>
              </div>
              <button onClick={logout} className="text-xs text-brand-600 hover:underline">Sign out</button>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setNavOpen(true)} aria-label="Open navigation" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">Menu</button>
          <span className="text-sm font-semibold">CyberTrace AI</span>
        </div>
        {children}
      </main>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/community" element={<CommunityHub />} />
        <Route path="/citizen" element={<CitizenSafety />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/academy" element={<Academy />} />
        <Route path="/knowledge" element={<KnowledgeCentre />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/report-cybercrime" element={<ReportingAssistant />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Shell>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/cases" element={<Cases />} />
                  <Route path="/correlation" element={<Correlation />} />
                  <Route path="/analyzers" element={<Analyzers />} />
                  <Route path="/audit-log" element={<AuditLog />} />
                </Routes>
              </Shell>
            </RequireAuth>
          }
        />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
