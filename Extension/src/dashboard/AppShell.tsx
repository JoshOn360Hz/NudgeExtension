import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock3, Gauge, ListFilter, Settings } from "lucide-react";

export type ViewId = "today" | "calendar" | "boundaries" | "sites" | "settings";

const navigation: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: "today", label: "Today", icon: Gauge },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "boundaries", label: "Boundaries", icon: Clock3 },
  { id: "sites", label: "Sites", icon: ListFilter },
  { id: "settings", label: "Settings", icon: Settings }
];

export function AppShell({
  view,
  setView,
  trackingActive,
  title,
  description,
  headerAction,
  children
}: {
  view: ViewId;
  setView: (view: ViewId) => void;
  trackingActive: boolean;
  title: string;
  description: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>Nudge</span>
        </div>
        <nav aria-label="Dashboard">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`nav-button ${view === id ? "active" : ""}`}
              onClick={() => setView(id)}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="tracking-status">
          <span className={`tracking-dot ${trackingActive ? "" : "paused"}`} aria-hidden="true" />
          <span>{trackingActive ? "Tracking active" : "Tracking paused"}</span>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="page-header">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {headerAction}
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
