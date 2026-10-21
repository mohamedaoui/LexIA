import { useState } from "react";
import { useI18n } from "../../i18n";
import { Card } from "./Card";
import { SERIES, formatDay, formatNumber, niceMax } from "./format";

const PLOT_HEIGHT = 180;

/** Histogramme des questions par jour : une série, info-bulle par colonne, vue tableau. */
export function DailyChart({ data }: { data: { date: string; count: number }[] }) {
  const { t, lang } = useI18n();
  const [hovered, setHovered] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const max = niceMax(Math.max(0, ...data.map((d) => d.count)));
  const ticks = [0, max / 2, max];
  const peak = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0);
  const labelled = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);

  const toggle = (
    <button type="button" onClick={() => setAsTable(!asTable)} className="text-sm font-medium text-brand-600 hover:underline">
      {asTable ? t.dashboard.showChart : t.dashboard.showTable}
    </button>
  );

  if (data.length === 0) {
    return (
      <Card title={t.dashboard.perDay}>
        <p className="text-sm text-slate-500">{t.dashboard.empty}</p>
      </Card>
    );
  }

  if (asTable) {
    return (
      <Card title={t.dashboard.perDay} action={toggle}>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-slate-500">
              <tr>
                <th className="py-1.5 text-start font-medium">{t.dashboard.date}</th>
                <th className="py-1.5 text-end font-medium">{t.dashboard.questionsShort}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-slate-100">
                  <td className="py-1.5 text-slate-700">{formatDay(d.date, lang, true)}</td>
                  <td className="py-1.5 text-end text-slate-900">{formatNumber(d.count, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  const active = hovered !== null ? data[hovered] : null;
  return (
    <Card title={t.dashboard.perDay} action={toggle}>
      {/* Le temps s'écoule de gauche à droite, quelle que soit la langue de l'interface. */}
      <div dir="ltr" className="flex gap-2">
        <div className="relative w-8 shrink-0 text-end text-xs tabular-nums text-slate-400" style={{ height: PLOT_HEIGHT }}>
          {ticks.map((tick) => (
            <span key={tick} className="absolute end-0 -translate-y-1/2" style={{ top: `${(1 - tick / max) * 100}%` }}>
              {formatNumber(tick, lang)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: PLOT_HEIGHT }} onMouseLeave={() => setHovered(null)}>
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 h-px"
                style={{ top: `${(1 - tick / max) * 100}%`, backgroundColor: tick === 0 ? "#c3c2b7" : "#ecebe6" }}
              />
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {data.map((d, i) => (
                <div
                  key={d.date}
                  tabIndex={0}
                  role="img"
                  aria-label={`${formatDay(d.date, lang, true)} : ${d.count}`}
                  onMouseEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  className="relative flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:bg-slate-100"
                >
                  {i === peak && d.count > 0 && (
                    <span
                      className="absolute text-xs font-medium tabular-nums text-slate-600"
                      style={{ bottom: `calc(${(d.count / max) * 100}% + 4px)` }}
                    >
                      {formatNumber(d.count, lang)}
                    </span>
                  )}
                  <div
                    className="w-full max-w-[24px] rounded-t-[4px] transition-opacity"
                    style={{
                      height: `${(d.count / max) * 100}%`,
                      backgroundColor: SERIES[0],
                      opacity: hovered === null || hovered === i ? 1 : 0.45,
                    }}
                  />
                </div>
              ))}
            </div>
            {active && hovered !== null && (
              <div
                role="tooltip"
                className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg"
                style={{ left: `${Math.min(90, Math.max(10, ((hovered + 0.5) / data.length) * 100))}%` }}
              >
                <div className="font-semibold text-slate-900">
                  {formatNumber(active.count, lang)} {t.dashboard.questionsShort.toLowerCase()}
                </div>
                <div className="text-slate-500">{formatDay(active.date, lang, true)}</div>
              </div>
            )}
          </div>
          <div className="relative mt-2 h-4 text-xs text-slate-400">
            {data.map(
              (d, i) =>
                labelled.has(i) && (
                  <span
                    key={d.date}
                    className="absolute whitespace-nowrap"
                    style={
                      i === 0
                        ? { left: 0 }
                        : i === data.length - 1
                          ? { right: 0 }
                          : { left: `${((i + 0.5) / data.length) * 100}%`, transform: "translateX(-50%)" }
                    }
                  >
                    {formatDay(d.date, lang)}
                  </span>
                ),
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
