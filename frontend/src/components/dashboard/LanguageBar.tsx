import { useState } from "react";
import type { Stats } from "../../api/dashboard";
import { useI18n } from "../../i18n";
import { Card } from "./Card";
import { SERIES, formatNumber, formatPercent } from "./format";

/** Part de chaque langue : barre empilée à 100 %, légende avec valeurs (2 séries). */
export function LanguageBar({ languages }: { languages: Stats["by_language"] }) {
  const { t, lang } = useI18n();
  const [hovered, setHovered] = useState<number | null>(null);
  const total = languages.reduce((sum, l) => sum + l.count, 0);
  const names = { fr: lang === "ar" ? "الفرنسية" : "Français", ar: lang === "ar" ? "العربية / الدارجة" : "Arabe / darija" };

  return (
    <Card title={t.dashboard.languages}>
      {total === 0 ? (
        <p className="text-sm text-slate-500">{t.dashboard.empty}</p>
      ) : (
        <>
          <div className="relative">
            <div className="flex h-6 gap-[2px]" onMouseLeave={() => setHovered(null)}>
              {languages.map(
                (l, i) =>
                  l.count > 0 && (
                    <div
                      key={l.language}
                      tabIndex={0}
                      role="img"
                      aria-label={`${names[l.language]} : ${l.count}`}
                      onMouseEnter={() => setHovered(i)}
                      onFocus={() => setHovered(i)}
                      onBlur={() => setHovered(null)}
                      className="h-full first:rounded-s-[4px] last:rounded-e-[4px] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-slate-400"
                      style={{
                        width: `${(l.count / total) * 100}%`,
                        backgroundColor: SERIES[i],
                        opacity: hovered === null || hovered === i ? 1 : 0.5,
                      }}
                    />
                  ),
              )}
            </div>
            {hovered !== null && (
              <div
                role="tooltip"
                className="pointer-events-none absolute -top-14 start-0 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg"
              >
                <div className="font-semibold text-slate-900">
                  {formatNumber(languages[hovered].count, lang)} · {formatPercent(languages[hovered].count / total, lang)}
                </div>
                <div className="text-slate-500">{names[languages[hovered].language]}</div>
              </div>
            )}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {languages.map((l, i) => (
              <li key={l.language} className="flex items-center gap-2">
                <span aria-hidden className="h-3 w-3 rounded-sm" style={{ backgroundColor: SERIES[i] }} />
                <span className="flex-1 text-slate-700">{names[l.language]}</span>
                <span className="tabular-nums text-slate-900">{formatNumber(l.count, lang)}</span>
                <span className="w-12 text-end tabular-nums text-slate-500">{formatPercent(l.count / total, lang)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
