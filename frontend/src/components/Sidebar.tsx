import { Link, NavLink } from "react-router-dom";
import type { Conversation } from "../api/types";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { LanguageSwitch } from "./LanguageSwitch";
import { Logo } from "./Logo";

interface Props {
  conversations: Conversation[];
  onNew: () => void;
  onDelete: (id: string) => void;
  onNavigate: () => void;
}

export function Sidebar({ conversations, onNew, onDelete, onNavigate }: Props) {
  const { t } = useI18n();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-72 flex-col border-e border-slate-200 bg-slate-50">
      <div className="p-4">
        <Logo tagline={t.appTagline} />
        <button
          type="button"
          onClick={onNew}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <span aria-hidden className="text-lg leading-none">+</span>
          {t.newChat}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2" aria-label={t.history}>
        <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.history}</h2>
        {conversations.length === 0 && <p className="px-2 text-sm text-slate-500">{t.noConversations}</p>}
        <ul className="space-y-0.5">
          {conversations.map((c) => (
            <li key={c.id} className="group relative">
              <NavLink
                to={`/c/${c.id}`}
                onClick={onNavigate}
                dir="auto"
                className={({ isActive }) =>
                  `block truncate rounded-lg py-2 pe-9 ps-3 text-sm transition ${
                    isActive ? "bg-brand-100 font-medium text-brand-700" : "text-slate-700 hover:bg-slate-200/70"
                  }`
                }
              >
                {c.title}
              </NavLink>
              <button
                type="button"
                onClick={() => window.confirm(t.confirmDelete) && onDelete(c.id)}
                title={t.deleteConversation}
                aria-label={`${t.deleteConversation} : ${c.title}`}
                className="absolute end-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M8 2a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h.1l.8 10.1A2 2 0 0 0 6.9 18h6.2a2 2 0 0 0 2-1.9L15.9 6H16a1 1 0 1 0 0-2h-3V3a1 1 0 0 0-1-1H8Zm1 2V4h2v0H9Z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-slate-200 p-4">
        {user?.is_staff && (
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200/70"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-brand-600" fill="currentColor" aria-hidden>
              <path d="M3 17V9h3v8H3Zm5.5 0V3h3v14h-3ZM14 17v-5h3v5h-3Z" />
            </svg>
            {t.dashboard.link}
          </Link>
        )}
        <LanguageSwitch />
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-800">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="truncate text-xs text-slate-500" dir="ltr">
              {user?.email}
            </div>
          </div>
          <button type="button" onClick={logout} className="shrink-0 text-sm font-medium text-slate-600 hover:text-red-600">
            {t.logout}
          </button>
        </div>
      </div>
    </aside>
  );
}
