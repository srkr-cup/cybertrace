import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ShieldCheckIcon } from "../components/Icons";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      const message = String(err?.message || "Could not complete request.");
      if (message.includes("401")) setError("Invalid email or password.");
      else if (message.includes("400")) setError("Email is already registered or the submitted data is invalid.");
      else if (message.includes("422")) setError("Use a valid email and a password of at least 10 characters with letters and numbers.");
      else setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheckIcon className="w-7 h-7 text-brand-600" />
          <div>
            <div className="font-semibold">CyberTrace AI</div>
            <div className="text-xs text-slate-400">Investigation Platform</div>
          </div>
        </div>

        <div className="flex gap-2 mb-5 text-sm">
          <button
            className={`flex-1 py-1.5 rounded-lg ${mode === "login" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            className={`flex-1 py-1.5 rounded-lg ${mode === "register" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email" required placeholder="name@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password" required placeholder="Enter your password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {mode === "register" && (
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
              New accounts start as <strong>Investigator</strong>. An administrator assigns Admin or Viewer access.
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg"
          >
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="text-sm text-slate-600 mt-4">
          Keep your password private. Use at least 10 characters, including a letter and a number.
        </p>
        <div className="mt-5 border-t border-slate-100 pt-4 text-sm">
          <p className="font-medium text-slate-700">Community cyber safety</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            <a href="/community" className="text-brand-700 hover:underline">Community Safety Home</a>
            <a href="/citizen" className="text-brand-700 hover:underline">Citizen Safety Portal</a>
            <a href="/contacts" className="text-brand-700 hover:underline">Cyber Helpdesk & Contacts</a>
            <a href="/academy" className="text-brand-700 hover:underline">Cyber Safety Academy</a>
            <a href="/knowledge" className="text-brand-700 hover:underline">Cybercrime Knowledge Centre</a>
            <a href="/quiz" className="text-brand-700 hover:underline">Cyber Awareness Quiz</a>
            <a href="/report-cybercrime" className="text-brand-700 hover:underline">Report Cybercrime</a>
          </div>
        </div>
      </div>
    </div>
  );
}
