import { useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "../ui/components";
import { useExtensionData } from "../ui/useExtensionData";
import { AppShell, type ViewId } from "./AppShell";
import { BoundariesView } from "./BoundariesView";
import { CalendarView } from "./CalendarView";
import { Onboarding } from "./Onboarding";
import { SettingsView } from "./SettingsView";
import { SitesView } from "./SitesView";
import { TodayView } from "./TodayView";

const pageCopy: Record<ViewId, { title: string; description: string }> = {
  today: { title: "Today", description: "See where your active browsing time went and how the day felt." },
  calendar: { title: "Calendar", description: "Look back over the last seven days or expand to a month." },
  boundaries: { title: "Boundaries", description: "Set gentle reminders for websites, categories, or all browsing." },
  sites: { title: "Sites and categories", description: "Decide how websites should be grouped in your timeline." },
  settings: { title: "Settings", description: "Adjust your personal day, appearance, tracking, and local data." }
};

export function App() {
  const [view, setView] = useState<ViewId>("today");
  const { snapshot, loading, error, mutate } = useExtensionData(31);
  const copy = useMemo(() => pageCopy[view], [view]);

  if (loading && !snapshot) return <div className="loading-screen">Preparing your day</div>;
  if (!snapshot) return <div className="loading-screen">{error ?? "Nudge could not start"}</div>;

  const trackingAction = snapshot.trackingActive ? (
    <Button icon={Pause} onClick={() => void mutate({ type: "PAUSE_TRACKING", until: Date.now() + 15 * 60 * 1000 })}>Pause 15 minutes</Button>
  ) : (
    <Button variant="primary" icon={Play} onClick={() => void mutate({ type: "RESUME_TRACKING" })}>Resume tracking</Button>
  );

  return (
    <>
      <AppShell
        view={view}
        setView={setView}
        trackingActive={snapshot.trackingActive}
        title={copy.title}
        description={copy.description}
        headerAction={view === "today" ? trackingAction : undefined}
      >
        {error ? <div className="error-banner">{error}</div> : null}
        {view === "today" ? <TodayView day={snapshot.today} limits={snapshot.limits} mutate={mutate} /> : null}
        {view === "calendar" ? <CalendarView snapshot={snapshot} /> : null}
        {view === "boundaries" ? <BoundariesView limits={snapshot.limits} mutate={mutate} /> : null}
        {view === "sites" ? <SitesView rules={snapshot.rules} mutate={mutate} /> : null}
        {view === "settings" ? <SettingsView settings={snapshot.settings} trackingActive={snapshot.trackingActive} mutate={mutate} /> : null}
      </AppShell>
      {!snapshot.settings.onboardingComplete ? (
        <Onboarding
          settings={snapshot.settings}
          onComplete={(result) => mutate({ type: "COMPLETE_ONBOARDING", settings: result.settings, limits: result.limits })}
        />
      ) : null}
    </>
  );
}
