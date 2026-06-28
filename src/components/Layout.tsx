import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

const TABS = [
  { to: "/", label: "Garage", icon: "🚗", match: (p: string) => p === "/" || p.startsWith("/car") },
  { to: "/reminders", label: "Due", icon: "⏰", match: (p: string) => p.startsWith("/reminders") },
  { to: "/reports", label: "Reports", icon: "📊", match: (p: string) => p.startsWith("/reports") },
];

export function Layout({
  title,
  children,
  back,
  action,
}: {
  title: string;
  children: ReactNode;
  back?: boolean;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="app">
      <header className="appbar">
        {back && (
          <button className="appbar__back" onClick={() => navigate(-1)}>
            ← Back
          </button>
        )}
        <h1 className="appbar__title">{title}</h1>
        <span className="appbar__spacer" />
        {action}
      </header>
      <main className="app__main">{children}</main>
      <nav className="tabbar">
        <div className="tabbar__inner">
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <button
                key={t.to}
                className={`tab ${active ? "tab--active" : ""}`}
                onClick={() => navigate(t.to)}
              >
                <span className="tab__icon">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
