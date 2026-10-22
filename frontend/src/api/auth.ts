import { api, tokens } from "./client";
import type { Language, Role, User } from "./types";

export interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: Role;
  preferred_language: Language;
}

export async function login(email: string, password: string): Promise<void> {
  const { data } = await api.post<{ access: string; refresh: string }>("/auth/login/", { email, password });
  tokens.set(data.access, data.refresh);
}

/** Révoque le jeton de rafraîchissement côté serveur (au mieux : on se déconnecte quand même). */
export async function logout(): Promise<void> {
  const refresh = tokens.refresh;
  tokens.clear();
  if (refresh) await api.post("/auth/logout/", { refresh }).catch(() => {});
}

export async function register(payload: RegisterData): Promise<void> {
  await api.post("/auth/register/", payload);
  await login(payload.email, payload.password);
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me/");
  return data;
}

export async function updateMe(changes: Partial<Pick<User, "preferred_language" | "role">>): Promise<User> {
  const { data } = await api.patch<User>("/auth/me/", changes);
  return data;
}
