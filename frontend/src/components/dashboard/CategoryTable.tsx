import type { CategoryStat } from "../../api/dashboard";
import { useI18n } from "../../i18n";
import { Card } from "./Card";
import { SERIES, SERIES_TRACK, formatNumber, formatPercent } from "./format";

/** Tableau des domaines avec une barre par ligne : graphique et vue tableau à la fois. */
export function CategoryTable({ categories }: { categories: CategoryStat[] }) {
  const { t, lang } = useI18n();
  const max = Math.max(1, ...categories.map((c) => c.questions));

  return (
    <Card title={t.dashboard.perCategory}>
      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">{t.dashboard.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2 text-start font-medium">{t.dashboard.domain}</th>
                <th className="pb-2 text-start font-medium">{t.dashboard.questionsShort}</th>
                <th className="pb-2 text-end font-medium">{t.dashboard.feedbackShort}</th>
                <th className="pb-2 text-end font-medium">{t.dashboard.satisfaction}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="py-2 pe-3 text-slate-800">{lang === "ar" ? c.name_ar : c.name_fr}</td>
                  <td className="w-2/5 py-2 pe-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 flex-1 rounded-e-[4px]" style={{ backgroundColor: SERIES_TRACK }}>
                        <div
                          className="h-full rounded-e-[4px]"
                          style={{ width: `${(c.questions / max) * 100}%`, backgroundColor: SERIES[0] }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-end tabular-nums text-slate-900">{formatNumber(c.questions, lang)}</span>
                    </div>
                  </td>
                  <td className="py-2 text-end tabular-nums text-slate-600">
                    <span aria-label={t.helpful}>👍 {formatNumber(c.positive, lang)}</span>
                    <span className="ms-3" aria-label={t.notHelpful}>
                      👎 {formatNumber(c.negative, lang)}
                    </span>
                  </td>
                  <td className="py-2 text-end tabular-nums text-slate-900">
                    {c.satisfaction === null ? <span className="text-slate-400">—</span> : formatPercent(c.satisfaction, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
