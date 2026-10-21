import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Stats } from "../../api/dashboard";
import { useI18n } from "../../i18n";
import { Card } from "./Card";
import { formatDateTime } from "./format";

type Item = Stats["recent_negative_feedback"][number];

function FeedbackItem({ item }: { item: Item }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>👎 {formatDateTime(item.created_at, lang)}</span>
        <span>{item.user_role}</span>
        {item.category && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{lang === "ar" ? item.category_ar : item.category}</span>
        )}
      </div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.dashboard.question}</div>
      <p dir="auto" className="text-slate-900">
        {item.question}
      </p>
      {item.comment && (
        <>
          <div className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">{t.dashboard.comment}</div>
          <p dir="auto" className="text-slate-700">
            « {item.comment} »
          </p>
        </>
      )}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 text-sm font-medium text-brand-600 hover:underline">
        {open ? t.dashboard.hideAnswer : t.dashboard.showAnswer}
      </button>
      {open && (
        <div dir="auto" className="prose prose-sm prose-slate mt-2 max-h-80 max-w-none overflow-y-auto rounded-md bg-slate-50 p-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
        </div>
      )}
    </li>
  );
}

export function NegativeFeedback({ items }: { items: Item[] }) {
  const { t } = useI18n();
  return (
    <Card title={t.dashboard.negative}>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{t.dashboard.noNegative}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <FeedbackItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Card>
  );
}
