// Type definitions for the application

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: 'student' | 'lawyer' | 'judge';
}

export interface Session {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  Chat?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  sender: 'user' | 'model';
  message: string;
  sentAt: string;
}

export interface LoginResponse {
  token: string;
  user?: User;
}

export interface ApiError {
  error: string;
  issues?: any[];
}

export interface ChatResponse {
  id: string;
  content?: string;
  message?: string;
  sender: 'user' | 'model';
  timestamp?: string;
  sentAt?: string;
  sessionId: string;
}
