import { useCallback, useEffect, useState } from "react";
import { deleteUser, listUsers, updateUser, type AdminUser, type UserFilters } from "../../api/admin";
import { errorMessage } from "../../api/client";
import type { Role } from "../../api/types";
import { useAuth } from "../../auth";
import { Notice, type NoticeState } from "../../components/admin/Notice";
import { Pagination } from "../../components/admin/Pagination";
import { formatDateTime } from "../../components/dashboard/format";
import { useI18n } from "../../i18n";

const ROLES: Role[] = ["citizen", "student", "lawyer", "judge"];
const input =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const small = "rounded-md border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-40";

export function UsersPage() {
  const { t, lang } = useI18n();
  const u = t.admin.users;
  const { user: me } = useAuth();
  const [filters, setFilters] = useState<UserFilters>({ q: "", role: "", is_active: "", page: 1 });
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ count: number; results: AdminUser[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const clearNotice = useCallback(() => setNotice(null), []);

  const load = useCallback(() => {
    setLoading(true);
    listUsers(filters)
      .then(setData)
      .catch((err) => setNotice({ kind: "error", text: errorMessage(err, t.errorGeneric) }))
      .finally(() => setLoading(false));
  }, [filters, t.errorGeneric]);

  useEffect(load, [load]);

  // La recherche part 300 ms après la dernière frappe.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.q === search ? f : { ...f, q: search, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const change = async (target: AdminUser, changes: Parameters<typeof updateUser>[1]) => {
    try {
      const updated = await updateUser(target.id, changes);
      setData((d) => d && { ...d, results: d.results.map((x) => (x.id === updated.id ? updated : x)) });
      setNotice({ kind: "success", text: t.admin.saved });
    } catch (err) {
      setNotice({ kind: "error", text: errorMessage(err, t.errorGeneric) });
    }
  };

  const remove = async (target: AdminUser) => {
    if (!window.confirm(u.confirmDelete(target.email))) return;
    try {
      await deleteUser(target.id);
      setNotice({ kind: "success", text: t.admin.deleted });
      load();
    } catch (err) {
      setNotice({ kind: "error", text: errorMessage(err, t.errorGeneric) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={u.search}
          aria-label={u.search}
          className={`${input} w-full sm:w-72`}
        />
        <select
          aria-label={u.role}
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value as Role | "", page: 1 })}
          className={input}
        >
          <option value="">{u.role} : {t.admin.all}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t.roles[r]}
            </option>
          ))}
        </select>
        <select
          aria-label={u.status}
          value={filters.is_active}
          onChange={(e) => setFilters({ ...filters, is_active: e.target.value as UserFilters["is_active"], page: 1 })}
          className={input}
        >
          <option value="">{u.status} : {t.admin.all}</option>
          <option value="true">{u.active}</option>
          <option value="false">{u.inactive}</option>
        </select>
      </div>

      <Notice notice={notice} onDone={clearNotice} />

      <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm transition-opacity ${loading ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">{u.user}</th>
              <th className="px-4 py-2.5 text-start font-medium">{u.role}</th>
              <th className="px-4 py-2.5 text-start font-medium">{u.status}</th>
              <th className="px-4 py-2.5 text-start font-medium">{u.activity}</th>
              <th className="px-4 py-2.5 text-start font-medium">{u.lastLogin}</th>
              <th className="px-4 py-2.5 text-end font-medium">{t.admin.actions}</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((row) => {
              const isMe = row.id === me?.id;
              const locked = row.is_superuser && !me?.is_superuser;
              return (
                <tr key={row.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {row.first_name} {row.last_name}
                      {isMe && <span className="ms-2 text-xs font-normal text-slate-500">({u.you})</span>}
                    </div>
                    <div dir="ltr" className="text-start text-xs text-slate-500">
                      {row.email}
                    </div>
                    <div className="text-xs text-slate-400">
                      {u.joined} : {formatDateTime(row.date_joined, lang)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`${u.role} — ${row.email}`}
                      value={row.role}
                      disabled={locked}
                      onChange={(e) => change(row, { role: e.target.value as Role })}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t.roles[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.is_active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {row.is_active ? u.active : u.inactive}
                      </span>
                      {row.is_staff && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {row.is_superuser ? u.superuser : u.admin}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {u.activityValue(row.conversation_count, row.question_count)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.last_login ? formatDateTime(row.last_login, lang) : u.never}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        className={small}
                        disabled={isMe || locked}
                        onClick={() => change(row, { is_active: !row.is_active })}
                      >
                        {row.is_active ? u.deactivate : u.activate}
                      </button>
                      <button
                        type="button"
                        className={small}
                        disabled={isMe || locked}
                        onClick={() => change(row, { is_staff: !row.is_staff })}
                      >
                        {row.is_staff ? u.removeAdmin : u.makeAdmin}
                      </button>
                      <button
                        type="button"
                        className={`${small} border-red-200 text-red-700 hover:bg-red-50`}
                        disabled={isMe || locked}
                        onClick={() => remove(row)}
                      >
                        {t.admin.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && data.results.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">{u.empty}</p>}
      </div>

      {data && <Pagination page={filters.page ?? 1} count={data.count} onChange={(page) => setFilters({ ...filters, page })} />}
    </div>
  );
}
