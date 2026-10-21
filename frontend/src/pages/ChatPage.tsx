import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteConversation, getConversation, listConversations, streamChat } from "../api/chat";
import type { Conversation } from "../api/types";
import { ChatInput } from "../components/ChatInput";
import { MessageBubble, type DisplayMessage } from "../components/MessageBubble";
import { Sidebar } from "../components/Sidebar";
import { useI18n } from "../i18n";

function localMessage(role: "user" | "assistant", content: string, extra: Partial<DisplayMessage> = {}): DisplayMessage {
  return {
    id: `local-${crypto.randomUUID()}`,
    role,
    content,
    sources: [],
    feedback: null,
    created_at: new Date().toISOString(),
    local: true,
    ...extra,
  };
}

export function ChatPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);
  // Conversation créée par le streaming en cours : déjà affichée, pas besoin de la recharger.
  const createdHere = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(() => {
    listConversations().then(setConversations).catch(() => {});
  }, []);

  useEffect(refreshList, [refreshList]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    if (createdHere.current === conversationId) return;
    abort.current?.abort();
    let cancelled = false;
    getConversation(conversationId)
      .then((c) => !cancelled && setMessages(c.messages))
      .catch(() => !cancelled && navigate("/", { replace: true }));
    return () => {
      cancelled = true;
    };
  }, [conversationId, navigate]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const updateLast = (change: (m: DisplayMessage) => DisplayMessage) =>
    setMessages((list) => [...list.slice(0, -1), change(list[list.length - 1])]);

  const send = async (text: string) => {
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setMessages((list) => [...list, localMessage("user", text), localMessage("assistant", "", { streaming: true })]);

    try {
      await streamChat(
        text,
        conversationId ?? null,
        {
          onSources: (sources) => updateLast((m) => ({ ...m, sources })),
          onToken: (token) => updateLast((m) => ({ ...m, content: m.content + token })),
          onDone: ({ conversation_id, question, answer }) => {
            setMessages((list) => [...list.slice(0, -2), question, answer]);
            if (!conversationId) {
              createdHere.current = conversation_id;
              navigate(`/c/${conversation_id}`, { replace: true });
            }
            refreshList();
          },
        },
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        updateLast((m) => ({ ...m, streaming: false }));
      } else {
        updateLast((m) => ({ ...m, streaming: false, error: error instanceof Error ? error.message : t.errorGeneric }));
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  const newChat = () => {
    abort.current?.abort();
    createdHere.current = null;
    setSidebarOpen(false);
    navigate("/");
  };

  const remove = async (id: string) => {
    await deleteConversation(id);
    setConversations((list) => list.filter((c) => c.id !== id));
    if (id === conversationId) newChat();
  };

  return (
    <div className="flex h-full">
      <div className="hidden md:block">
        <Sidebar conversations={conversations} onNew={newChat} onDelete={remove} onNavigate={() => {}} />
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <Sidebar conversations={conversations} onNew={newChat} onDelete={remove} onNavigate={() => setSidebarOpen(false)} />
          <button type="button" aria-label={t.menu} className="flex-1 bg-slate-900/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 md:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label={t.menu} className="rounded-md p-1.5 hover:bg-slate-100">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M3 5h14v2H3V5Zm0 4h14v2H3V9Zm0 4h14v2H3v-2Z" />
            </svg>
          </button>
          <span className="font-semibold text-slate-900">LexIA</span>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 ? (
              <div className="pt-10 text-center sm:pt-20">
                <h1 className="text-3xl font-bold text-slate-900">{t.welcomeTitle}</h1>
                <p className="mx-auto mt-3 max-w-xl text-slate-600">{t.welcomeText}</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {t.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      dir="auto"
                      onClick={() => send(s)}
                      disabled={busy}
                      className="rounded-xl border border-slate-200 bg-white p-4 text-start text-sm text-slate-700 shadow-sm transition hover:border-brand-500 hover:bg-brand-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </div>
            )}
            <div ref={bottom} />
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-3">
          <div className="mx-auto max-w-3xl">
            <ChatInput busy={busy} onSend={send} onStop={() => abort.current?.abort()} />
          </div>
        </div>
      </main>
    </div>
  );
}
