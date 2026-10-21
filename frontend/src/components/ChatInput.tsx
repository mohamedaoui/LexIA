import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useI18n } from "../i18n";

interface Props {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatInput({ busy, onSend, onStop }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  // La zone de saisie grandit avec le texte (jusqu'à ~8 lignes).
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      <textarea
        ref={area}
        rows={1}
        dir="auto"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t.placeholder}
        aria-label={t.placeholder}
        className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-slate-900 outline-none placeholder:text-slate-400"
      />
      {busy ? (
        <button type="button" onClick={onStop} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300">
          {t.stop}
        </button>
      ) : (
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
        >
          {t.send}
        </button>
      )}
    </form>
  );
}
