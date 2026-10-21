import type { Stats } from "../../api/dashboard";
import type { Role } from "../../api/types";
import { useI18n } from "../../i18n";
import { Card } from "./Card";
import { SERIES, SERIES_TRACK, formatNumber } from "./format";

export function RoleBars({ roles }: { roles: Stats["users_by_role"] }) {
  const { t, lang } = useI18n();
  const max = Math.max(1, ...roles.map((r) => r.count));
  return (
    <Card title={t.dashboard.roles}>
      <ul className="space-y-3 text-sm">
        {roles.map((r) => (
          <li key={r.role}>
            <div className="mb-1 flex justify-between">
              <span className="text-slate-700">{t.roles[r.role as Role] ?? r.label}</span>
              <span className="tabular-nums text-slate-900">{formatNumber(r.count, lang)}</span>
            </div>
            <div className="h-2 rounded-e-[4px]" style={{ backgroundColor: SERIES_TRACK }}>
              <div className="h-full rounded-e-[4px]" style={{ width: `${(r.count / max) * 100}%`, backgroundColor: SERIES[0] }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
