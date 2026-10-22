import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import * as authApi from "./api/auth";
import { setSessionExpiredHandler, tokens } from "./api/client";
import type { User } from "./api/types";

interface Auth {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: authApi.RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(tokens.access));

  const logout = useCallback(() => {
    void authApi.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(logout);
    if (!tokens.access) return;
    authApi
      .fetchMe()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (email: string, password: string) => {
    await authApi.login(email, password);
    setUser(await authApi.fetchMe());
  };

  const register = async (data: authApi.RegisterData) => {
    await authApi.register(data);
    setUser(await authApi.fetchMe());
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** Réservé aux administrateurs (is_staff) ; les autres sont renvoyés vers le chat. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <RequireAuth>{user?.is_staff ? children : <Navigate to="/" replace />}</RequireAuth>;
}
