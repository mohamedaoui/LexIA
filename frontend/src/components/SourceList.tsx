import { useState } from "react";
import { getArticle } from "../api/chat";
import type { Source } from "../api/types";
import { useI18n } from "../i18n";

function SourceItem({ source }: { source: Source }) {
  const { t } = useI18n();
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!open && text === null) {
      setLoading(true);
      try {
        setText((await getArticle(source.article_id)).content);
      } catch {
        setText(t.errorGeneric);
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  };

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-800" dir="auto">
            {source.document_title}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {t.article} {source.number || "—"} · {t.relevance} {Math.round(source.score * 100)} %
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
        >
          {loading ? "…" : open ? t.hideArticle : t.showArticle}
        </button>
      </div>
      {open && text && (
        <p dir="rtl" className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          {text}
        </p>
      )}
    </li>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  const { t } = useI18n();
  if (!sources.length) return null;
  return (
    <details className="group mt-3">
      <summary className="cursor-pointer select-none list-none text-sm font-medium text-brand-700 hover:underline">
        <span className="inline-block transition group-open:rotate-90 rtl:-scale-x-100 rtl:group-open:rotate-90">›</span>{" "}
        {t.sources} ({sources.length})
      </summary>
      <ul className="mt-2 space-y-2">
        {sources.map((s) => (
          <SourceItem key={s.article_id} source={s} />
        ))}
      </ul>
    </details>
  );
}
