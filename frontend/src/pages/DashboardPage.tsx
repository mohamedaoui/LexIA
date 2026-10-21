import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../api/client";
import { downloadExport, fetchStats, type PeriodKey, type Stats } from "../api/dashboard";
import { CategoryTable } from "../components/dashboard/CategoryTable";
import { DailyChart } from "../components/dashboard/DailyChart";
import { formatNumber, formatPercent } from "../components/dashboard/format";
import { LanguageBar } from "../components/dashboard/LanguageBar";
import { NegativeFeedback } from "../components/dashboard/NegativeFeedback";
import { RoleBars } from "../components/dashboard/RoleBars";
import { StatTile } from "../components/dashboard/StatTile";
import { TopLaws } from "../components/dashboard/TopLaws";
import { ErrorBox } from "../components/Field";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { Logo } from "../components/Logo";
import { useI18n } from "../i18n";

const PERIODS: PeriodKey[] = ["7", "30", "90", "all"];

export function DashboardPage() {
  const { t, lang } = useI18n();
  const d = t.dashboard;
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"questions" | "feedback" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStats(period)
      .then((data) => !cancelled && (setStats(data), setError(null)))
      .catch((err) => !cancelled && setError(errorMessage(err, t.errorGeneric)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period, t.errorGeneric]);

  const exportCsv = async (kind: "questions" | "feedback") => {
    setExporting(kind);
    try {
      await downloadExport(kind, period);
    } catch (err) {
      setError(errorMessage(err, t.errorGeneric));
    } finally {
      setExporting(null);
    }
  };

  const totals = stats?.totals;
  const feedbackCount = totals ? totals.feedback_positive + totals.feedback_negative : 0;

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <Link to="/" className="text-sm font-medium text-brand-600 hover:underline">
              {d.backToChat}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{d.title}</h1>
          <p className="text-slate-600">{d.subtitle}</p>
        </div>

        {/* Un seul rang de filtres, qui s'applique à toute la page. */}
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label={d.period} className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            {PERIODS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={period === key}
                onClick={() => setPeriod(key)}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  period === key ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {d.periods[key]}
              </button>
            ))}
          </div>
          {(["questions", "feedback"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => exportCsv(kind)}
              disabled={exporting !== null}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              ⬇ {exporting === kind ? d.exporting : kind === "questions" ? d.exportQuestions : d.exportFeedback}
            </button>
          ))}
        </div>

        <ErrorBox message={error} />

        {!stats && loading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          </div>
        )}

        {stats && totals && (
          // Pendant un rechargement, l'affichage précédent reste en place, atténué.
          <div className={`space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label={d.questions} value={formatNumber(totals.questions, lang)} detail={d.inConversations(totals.conversations)} />
              <StatTile
                label={d.activeUsers}
                value={formatNumber(totals.active_users, lang)}
                detail={d.registered(totals.users, totals.new_users)}
              />
              <StatTile
                label={d.satisfaction}
                value={totals.satisfaction === null ? "—" : formatPercent(totals.satisfaction, lang)}
                meter={totals.satisfaction}
                detail={
                  feedbackCount ? (
                    <span className="tabular-nums">
                      👍 {formatNumber(totals.feedback_positive, lang)} · 👎 {formatNumber(totals.feedback_negative, lang)}
                    </span>
                  ) : (
                    d.noFeedback
                  )
                }
              />
              <StatTile
                label={d.unclassified}
                value={formatNumber(totals.unclassified_questions, lang)}
                detail={d.unclassifiedHint(
                  formatPercent(totals.questions ? totals.unclassified_questions / totals.questions : 0, lang),
                )}
              />
            </div>

            <DailyChart data={stats.questions_per_day} />

            {/* min-w-0 : une colonne de grille peut rétrécir sous la largeur de son tableau. */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-2">
                <CategoryTable categories={stats.by_category} />
              </div>
              <div className="min-w-0 space-y-6">
                <LanguageBar languages={stats.by_language} />
                <RoleBars roles={stats.users_by_role} />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
              <TopLaws laws={stats.top_laws} />
              <NegativeFeedback items={stats.recent_negative_feedback} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
