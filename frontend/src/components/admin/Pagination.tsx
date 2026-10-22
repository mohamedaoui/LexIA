import { useI18n } from "../../i18n";

const PAGE_SIZE = 20;

export function Pagination({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const button =
    "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
      <span>{t.admin.total(count)}</span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button type="button" className={button} disabled={page <= 1} onClick={() => onChange(page - 1)}>
            {t.admin.previous}
          </button>
          <span>{t.admin.pageOf(page, pages)}</span>
          <button type="button" className={button} disabled={page >= pages} onClick={() => onChange(page + 1)}>
            {t.admin.next}
          </button>
        </div>
      )}
    </div>
  );
}
