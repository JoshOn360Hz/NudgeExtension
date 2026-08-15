import { useMemo, useState } from "react";
import { ExternalLink, Pause, Play, Settings as SettingsIcon, SunMedium } from "lucide-react";
import { categoryLabels, categoryOrder } from "../shared/constants";
import type { CategoryId, DailyLimit } from "../shared/models";
import { formatDuration } from "../shared/time";
import { Button, Card, CategoryBadge, MoodScale, ProgressBar } from "../ui/components";
import { useExtensionData } from "../ui/useExtensionData";

const categoryLimit = (limits: DailyLimit[], category: CategoryId) =>
  limits.find((limit) => limit.enabled && limit.scope === "category" && limit.target === category);

export function App() {
  const { snapshot, loading, error, mutate } = useExtensionData(7);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [moodSaved, setMoodSaved] = useState(false);

  const nearestBoundary = useMemo(() => {
    if (!snapshot) return null;
    const candidates = snapshot.limits.filter((limit) => limit.enabled).map((limit) => {
      const used = limit.scope === "overall"
        ? snapshot.today.totalSeconds
        : limit.scope === "category"
          ? snapshot.today.categoryTotals[limit.target as CategoryId]
          : snapshot.today.segments
            .filter((segment) => segment.hostname === limit.target || segment.hostname.endsWith(`.${limit.target}`))
            .reduce((total, segment) => total + segment.durationSeconds, 0);
      return { limit, remaining: limit.seconds - used };
    });
    return candidates.sort((left, right) => left.remaining - right.remaining)[0] ?? null;
  }, [snapshot]);

  const openDashboard = async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    window.close();
  };

  const saveMood = async (score: 1 | 2 | 3 | 4 | 5) => {
    setMood(score);
    await mutate({ type: "SAVE_MOOD", score, tags: [], note: null });
    setMoodSaved(true);
  };

  if (loading && !snapshot) return <div className="popup loading-screen">Preparing your day</div>;
  if (!snapshot) return <div className="popup loading-screen">{error ?? "Nudge could not start"}</div>;

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="popup-brand">
          <span className="brand-mark"><SunMedium size={17} strokeWidth={2} aria-hidden="true" /></span>
          <span>Nudge</span>
        </div>
        <span className="tracking-status" style={{ margin: 0, padding: 0 }}>
          <span className={`tracking-dot ${snapshot.trackingActive ? "" : "paused"}`} aria-hidden="true" />
          <span>{snapshot.trackingActive ? "Active" : "Paused"}</span>
        </span>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <Card className="popup-total">
        <div className="popup-total-label">Active browsing today</div>
        <div className="popup-total-value">{formatDuration(snapshot.today.totalSeconds)}</div>
        <small>
          {nearestBoundary
            ? nearestBoundary.remaining > 0
              ? `${formatDuration(nearestBoundary.remaining)} until your next boundary`
              : "A boundary has been reached"
            : "No boundaries set yet"}
        </small>
      </Card>

      <Card className="popup-categories">
        {categoryOrder.map((category) => {
          const limit = categoryLimit(snapshot.limits, category);
          const seconds = snapshot.today.categoryTotals[category];
          return (
            <div className="popup-category" key={category}>
              <CategoryBadge category={category} />
              <strong>{formatDuration(seconds)}</strong>
              <ProgressBar value={limit ? (seconds / limit.seconds) * 100 : 0} label={`${categoryLabels[category]} boundary progress`} />
            </div>
          );
        })}
      </Card>

      <Card className="popup-reflection">
        <h2>{moodSaved ? "Reflection saved" : "How are you feeling right now?"}</h2>
        <p>{moodSaved ? "You can add another check-in whenever it feels useful." : "A quick check-in can help connect time with how it felt."}</p>
        <MoodScale value={mood} onChange={(score) => void saveMood(score)} compact />
      </Card>

      <div className="popup-actions">
        <Button variant="primary" icon={ExternalLink} onClick={() => void openDashboard()}>Open dashboard</Button>
        {snapshot.trackingActive ? (
          <Button icon={Pause} onClick={() => void mutate({ type: "PAUSE_TRACKING", until: Date.now() + 15 * 60 * 1000 })}>Pause</Button>
        ) : (
          <Button icon={Play} onClick={() => void mutate({ type: "RESUME_TRACKING" })}>Resume</Button>
        )}
        <Button icon={SettingsIcon} onClick={() => void openDashboard()}>Settings</Button>
      </div>
    </div>
  );
}
