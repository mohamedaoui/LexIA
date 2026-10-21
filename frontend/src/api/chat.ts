import { api, refreshAccessToken, tokens } from "./client";
import { createSseParser } from "./sse";
import type { Article, ChatExchange, Conversation, ConversationDetail, Paginated, Source } from "./types";

export async function listConversations(): Promise<Conversation[]> {
  const { data } = await api.get<Paginated<Conversation>>("/conversations/");
  return data.results;
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const { data } = await api.get<ConversationDetail>(`/conversations/${id}/`);
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/conversations/${id}/`);
}

export async function getArticle(id: number): Promise<Article> {
  const { data } = await api.get<Article>(`/articles/${id}/`);
  return data;
}

export async function sendFeedback(messageId: string, rating: 1 | -1, comment = ""): Promise<void> {
  await api.post(`/messages/${messageId}/feedback/`, { rating, comment });
}

export interface StreamHandlers {
  onSources: (sources: Source[]) => void;
  onToken: (text: string) => void;
  onDone: (exchange: ChatExchange) => void;
}

/**
 * Envoie une question et reçoit la réponse mot par mot (POST /api/chat/stream/).
 * Axios ne sait pas lire un flux dans le navigateur : on utilise fetch.
 */
export async function streamChat(
  message: string,
  conversationId: string | null,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const body = JSON.stringify(conversationId ? { message, conversation_id: conversationId } : { message });
  const send = () =>
    fetch("/api/chat/stream/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.access}` },
      body,
      signal,
    });

  let response = await send();
  if (response.status === 401 && tokens.refresh) {
    await refreshAccessToken();
    response = await send();
  }
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? `Erreur ${response.status}`);
  }

  let failure: string | null = null;
  const parse = createSseParser(({ event, data }) => {
    if (event === "sources") handlers.onSources(data as Source[]);
    else if (event === "token") handlers.onToken(data as string);
    else if (event === "done") handlers.onDone(data as ChatExchange);
    else if (event === "error") failure = (data as { detail: string }).detail;
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    parse(value);
  }
  if (failure) throw new Error(failure);
}
