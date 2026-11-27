import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

type AuthUser = { email: string; role: string } | null;

const AuthContext = createContext<{
  user: AuthUser;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
}>({ user: null, loading: true, login: async () => {}, register: async () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = () => {
    const token = localStorage.getItem("ct_token");
    if (!token) { setUser(null); setLoading(false); return; }
    api.me().then((u) => setUser(u)).catch(() => {
      localStorage.removeItem("ct_token");
      localStorage.removeItem("ct_refresh");
      setUser(null);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { refreshMe(); }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem("ct_token", res.access_token);
    localStorage.setItem("ct_refresh", res.refresh_token);
    setUser({ email: res.email, role: res.role });
  };

  const register = async (email: string, password: string, role = "investigator") => {
    const res = await api.register(email, password, role);
    localStorage.setItem("ct_token", res.access_token);
    localStorage.setItem("ct_refresh", res.refresh_token);
    setUser({ email: res.email, role: res.role });
  };

  const logout = () => {
    const refreshToken = localStorage.getItem("ct_refresh");
    if (refreshToken) {
      fetch(`${(import.meta as any).env.VITE_API_URL || "http://localhost:8008"}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem("ct_token");
    localStorage.removeItem("ct_refresh");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
