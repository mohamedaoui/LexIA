import axios from "axios";
import { getToken, getUser } from "./auth";
import { Session, ChatMessage, ChatResponse } from "../types";

const API_URL = "/api";

// Create or retrieve a session (deferred until first user prompt)
export async function getSession(prompt: string): Promise<Session> {
  const user = getUser();

  if (!user?.userId) throw new Error("Not authenticated");
  const res = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.userId, prompt }),
  });
  if (!res.ok) throw new Error(`Session creation failed (${res.status})`);
  return res.json();
}

// Fetch chat history for a given session
export const getMessages = async (
  sessionId: string
): Promise<ChatMessage[]> => {
  const token = getToken();
  const response = await axios.get(`${API_URL}/chatbot`, {
    params: { sessionId },
    headers: { Authorization: `Bearer ${token}` },
  });
  // expecting response.data.history to match ChatMessage[]
  return response.data.history || [];
};

// Send a message to the chatbot
export const sendMessage = async (
  sessionId: string,
  prompt: string
): Promise<ChatResponse> => {
  const user = getUser();
  const token = getToken();
  if (!user?.userId) {
    throw new Error("User not authenticated. Please log in.");
  }

  const response = await axios.post(
    `${API_URL}/chatbot`,
    { userId: user.userId, sessionId, prompt },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return {
    id: response.data.id || `msg-${Date.now()}`,
    content: response.data.content || response.data.message || "",
    sender: "model",
    timestamp: response.data.sentAt || new Date().toISOString(),
    sessionId,
  };
};
