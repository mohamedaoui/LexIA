import type { Stats } from "../../api/dashboard";
import { useI18n } from "../../i18n";
import { Card } from "./Card";
import { formatNumber } from "./format";

export function TopLaws({ laws }: { laws: Stats["top_laws"] }) {
  const { t, lang } = useI18n();
  return (
    <Card title={t.dashboard.topLaws}>
      {laws.length === 0 ? (
        <p className="text-sm text-slate-500">{t.dashboard.empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-2 text-start font-medium">{t.dashboard.law}</th>
              <th className="pb-2 ps-3 text-end font-medium">{t.dashboard.citations}</th>
              <th className="pb-2 ps-3 text-end font-medium">{t.dashboard.answers}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {laws.map((law) => (
              <tr key={law.document_id} className="border-t border-slate-100">
                <td className="py-2 pe-3">
                  <div dir="auto" className="text-slate-800">
                    {law.title}
                  </div>
                  {law.category && <div className="text-xs text-slate-500">{lang === "ar" ? law.category_ar : law.category}</div>}
                </td>
                <td className="py-2 text-end text-slate-900">{formatNumber(law.citations, lang)}</td>
                <td className="py-2 text-end text-slate-600">{formatNumber(law.answers, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
