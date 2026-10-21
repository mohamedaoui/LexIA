import { useI18n } from "../i18n";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm ${className}`}>
      {(["fr", "ar"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`rounded-md px-3 py-1 font-medium transition ${
            lang === code ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {code === "fr" ? "FR" : "عربية"}
        </button>
      ))}
    </div>
  );
}
