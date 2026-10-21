import { api } from "./client";

export type PeriodKey = "7" | "30" | "90" | "all";

export interface CategoryStat {
  id: number;
  slug: string;
  name_fr: string;
  name_ar: string;
  questions: number;
  positive: number;
  negative: number;
  satisfaction: number | null;
}

export interface Stats {
  period: { days: number | null; start: string | null; end: string };
  totals: {
    questions: number;
    conversations: number;
    active_users: number;
    users: number;
    new_users: number;
    unclassified_questions: number;
    feedback_positive: number;
    feedback_negative: number;
    satisfaction: number | null;
  };
  questions_per_day: { date: string; count: number }[];
  by_category: CategoryStat[];
  by_language: { language: "fr" | "ar"; label: string; count: number }[];
  users_by_role: { role: string; label: string; count: number }[];
  top_laws: {
    document_id: number;
    title: string;
    category: string | null;
    category_ar: string | null;
    citations: number;
    answers: number;
  }[];
  recent_negative_feedback: {
    id: number;
    created_at: string;
    comment: string;
    category: string | null;
    category_ar: string | null;
    question: string;
    answer: string;
    conversation_id: string;
    user_role: string;
  }[];
}

export async function fetchStats(days: PeriodKey): Promise<Stats> {
  const { data } = await api.get<Stats>("/dashboard/stats/", { params: { days } });
  return data;
}

/** Télécharge un export CSV (la requête doit porter le jeton : pas de simple lien). */
export async function downloadExport(kind: "questions" | "feedback", days: PeriodKey): Promise<void> {
  const response = await api.get<Blob>(`/dashboard/export/${kind}.csv`, { params: { days }, responseType: "blob" });
  const disposition = String(response.headers["content-disposition"] ?? "");
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `lexia-${kind}.csv`;
  const url = URL.createObjectURL(response.data);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
