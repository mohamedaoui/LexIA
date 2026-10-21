import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendFeedback } from "../api/chat";
import type { Message } from "../api/types";
import { useI18n } from "../i18n";
import { SourceList } from "./SourceList";

export interface DisplayMessage extends Message {
  /** Réponse en cours de réception (streaming). */
  streaming?: boolean;
  /** Message pas encore enregistré côté serveur. */
  local?: boolean;
  error?: string;
}

function Feedback({ message }: { message: DisplayMessage }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(message.feedback?.rating ?? null);

  const rate = async (value: 1 | -1) => {
    const previous = rating;
    setRating(value);
    try {
      await sendFeedback(message.id, value);
    } catch {
      setRating(previous);
    }
  };

  const button = (value: 1 | -1, label: string, icon: string) => (
    <button
      type="button"
      onClick={() => rate(value)}
      aria-pressed={rating === value}
      title={label}
      aria-label={label}
      className={`rounded-md p-1.5 text-base transition ${
        rating === value ? "bg-brand-100" : "opacity-50 grayscale hover:bg-slate-100 hover:opacity-100 hover:grayscale-0"
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="mt-2 flex items-center gap-1">
      {button(1, t.helpful, "👍")}
      {button(-1, t.notHelpful, "👎")}
      {rating !== null && <span className="ms-2 text-xs text-slate-500">{t.thanks}</span>}
    </div>
  );
}

export function MessageBubble({ message }: { message: DisplayMessage }) {
  const { t } = useI18n();

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div dir="auto" className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-brand-600 px-4 py-2.5 text-white shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const waiting = message.streaming && !message.content;
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
        L
      </div>
      <div className="min-w-0 flex-1">
        {waiting ? (
          <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
            <span className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500" />
            </span>
            {t.searching}
          </div>
        ) : (
          <div dir="auto" className="prose prose-slate max-w-none prose-headings:mb-2 prose-headings:mt-4 prose-p:my-2 prose-li:my-0.5 prose-hr:my-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            {message.streaming && <span className="ms-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand-500 align-middle" />}
          </div>
        )}
        {message.error && (
          <div role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {message.error}
          </div>
        )}
        <SourceList sources={message.sources} />
        {!message.streaming && !message.local && !message.error && <Feedback message={message} />}
      </div>
    </div>
  );
}
