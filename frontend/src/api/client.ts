import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const ACCESS_KEY = "lexia.access";
const REFRESH_KEY = "lexia.refresh";

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

let refreshing: Promise<string> | null = null;

/** Renouvelle le jeton d'accès avec le jeton de rafraîchissement (une seule requête à la fois). */
export async function refreshAccessToken(): Promise<string> {
  if (!tokens.refresh) throw new Error("Pas de session");
  // Le serveur renvoie aussi un nouveau jeton de rafraîchissement (l'ancien est révoqué).
  refreshing ??= axios
    .post<{ access: string; refresh?: string }>("/api/auth/refresh/", { refresh: tokens.refresh })
    .then(({ data }) => {
      tokens.set(data.access, data.refresh);
      return data.access;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Appelé quand la session est perdue (refresh expiré) : l'AuthProvider redirige vers la connexion. */
export let onSessionExpired = () => {};
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  const isAuthCall = original?.url?.startsWith("/auth/login") || original?.url?.startsWith("/auth/refresh");
  if (error.response?.status === 401 && original && !original._retried && !isAuthCall && tokens.refresh) {
    original._retried = true;
    try {
      const access = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch {
      tokens.clear();
      onSessionExpired();
    }
  }
  throw error;
});

/** Message d'erreur lisible à partir d'une réponse d'erreur DRF. */
export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (data) {
      if (typeof data.detail === "string") return data.detail;
      const first = Object.values(data).flat()[0];
      if (typeof first === "string") return first;
    }
    if (!error.response) return "Serveur injoignable. Le backend Django est-il démarré ?";
  }
  return fallback;
}
