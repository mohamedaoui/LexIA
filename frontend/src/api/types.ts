export type Role = "citizen" | "student" | "lawyer" | "judge";
export type Language = "fr" | "ar" | "darija";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  preferred_language: Language;
  is_staff: boolean;
}

export interface Category {
  id: number;
  slug: string;
  name_fr: string;
  name_ar: string;
  description: string;
}

export interface Source {
  article_id: number;
  number: string;
  document_title: string;
  score: number;
}

export interface Feedback {
  rating: 1 | -1;
  comment: string;
  created_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  category: Category | null;
  feedback: Feedback | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface Article {
  id: number;
  document: number;
  document_title: string;
  position: number;
  number: string;
  content: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ChatExchange {
  conversation_id: string;
  question: Message;
  answer: Message;
}
