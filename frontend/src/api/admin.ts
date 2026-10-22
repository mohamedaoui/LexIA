import { api } from "./client";
import type { Category, Paginated, Role } from "./types";

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  preferred_language: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  conversation_count: number;
  question_count: number;
}

export interface UserFilters {
  q?: string;
  role?: Role | "";
  is_active?: "true" | "false" | "";
  page?: number;
}

export async function listUsers(filters: UserFilters): Promise<Paginated<AdminUser>> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined));
  const { data } = await api.get<Paginated<AdminUser>>("/dashboard/users/", { params });
  return data;
}

export async function updateUser(
  id: number,
  changes: Partial<Pick<AdminUser, "first_name" | "last_name" | "role" | "is_active" | "is_staff">>,
): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/dashboard/users/${id}/`, changes);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/dashboard/users/${id}/`);
}

export interface CategoryWithStats extends Category {
  law_count: number;
  faq_count: number;
  question_count: number;
}

export type CategoryInput = Pick<Category, "slug" | "name_fr" | "name_ar" | "description">;

export async function listCategories(): Promise<CategoryWithStats[]> {
  const { data } = await api.get<CategoryWithStats[]>("/categories/");
  return data;
}

export async function saveCategory(input: CategoryInput, id?: number): Promise<void> {
  if (id) await api.patch(`/categories/${id}/`, input);
  else await api.post("/categories/", input);
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}/`);
}

export interface Faq {
  id: number;
  category: number;
  category_name_fr: string;
  category_name_ar: string;
  question: string;
  answer: string;
  language: "fr" | "ar";
  is_published: boolean;
}

export type FaqInput = Pick<Faq, "category" | "question" | "answer" | "language" | "is_published">;

export async function listFaqs(filters: { category?: string; language?: string; page?: number }): Promise<Paginated<Faq>> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined));
  const { data } = await api.get<Paginated<Faq>>("/faqs/", { params });
  return data;
}

export async function saveFaq(input: FaqInput, id?: number): Promise<void> {
  if (id) await api.patch(`/faqs/${id}/`, input);
  else await api.post("/faqs/", input);
}

export async function deleteFaq(id: number): Promise<void> {
  await api.delete(`/faqs/${id}/`);
}
