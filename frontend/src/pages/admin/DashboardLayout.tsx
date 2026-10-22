import { Link, NavLink, Outlet } from "react-router-dom";
import { LanguageSwitch } from "../../components/LanguageSwitch";
import { Logo } from "../../components/Logo";
import { useI18n } from "../../i18n";

export function DashboardLayout() {
  const { t } = useI18n();
  const tabs = [
    { to: "/dashboard", label: t.admin.tabs.stats, end: true },
    { to: "/dashboard/users", label: t.admin.tabs.users },
    { to: "/dashboard/categories", label: t.admin.tabs.categories },
    { to: "/dashboard/faq", label: t.admin.tabs.faq },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <Link to="/" className="text-sm font-medium text-brand-600 hover:underline">
              {t.dashboard.backToChat}
            </Link>
          </div>
        </div>
        <nav aria-label={t.dashboard.title} className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
          <ul className="flex gap-1">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                      isActive ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600 hover:text-slate-900"
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.dashboard.title}</h1>
          <p className="text-slate-600">{t.dashboard.subtitle}</p>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
