import type { ReactNode } from "react";
import { SERIES, SERIES_TRACK } from "./format";

interface Props {
  label: string;
  value: string;
  detail?: ReactNode;
  /** Jauge optionnelle, entre 0 et 1. */
  meter?: number | null;
}

export function StatTile({ label, value, detail, meter }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
      {meter != null && (
        <div
          className="mt-3 h-2 overflow-hidden rounded-full"
          style={{ backgroundColor: SERIES_TRACK }}
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(meter * 100)}
        >
          <div className="h-full rounded-full" style={{ width: `${meter * 100}%`, backgroundColor: SERIES[0] }} />
        </div>
      )}
      {detail && <div className="mt-2 text-sm text-slate-500">{detail}</div>}
    </div>
  );
}
