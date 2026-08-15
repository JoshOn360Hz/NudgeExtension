import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, Check, Heart, ListChecks, MessageCircleMore } from "lucide-react";
import { categoryLabels, categoryOrder, moodLabels } from "../shared/constants";
import type { ActivitySegment, DailyLimit, DaySummary, ExtensionRequest } from "../shared/models";
import { formatClock, formatDayLabel, formatDuration } from "../shared/time";
import { Button, Card, CategoryBadge, EmptyState, Field, MoodScale, ProgressBar, SectionHeading } from "../ui/components";

const mergeSegments = (segments: ActivitySegment[]) => {
  const merged: ActivitySegment[] = [];
  for (const segment of segments) {
    const previous = merged.at(-1);
    if (previous && previous.hostname === segment.hostname && segment.startedAt - previous.endedAt <= 60_000) {
      previous.endedAt = segment.endedAt;
      previous.durationSeconds += segment.durationSeconds;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
};

const limitForCategory = (limits: DailyLimit[], category: string) =>
  limits.find((limit) => limit.enabled && limit.scope === "category" && limit.target === category);

export function TodayView({
  day,
  limits,
  mutate
}: {
  day: DaySummary;
  limits: DailyLimit[];
  mutate: (request: ExtensionRequest) => Promise<void>;
}) {
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(day.reflection?.score ?? null);
  const [note, setNote] = useState(day.reflection?.note ?? "");
  const [saved, setSaved] = useState(false);
  const segments = useMemo(() => mergeSegments(day.segments), [day.segments]);
  const checkInCount = day.moods.length + (day.reflection ? 1 : 0);
  const timelineEvents = useMemo(() => [
    ...segments.map((segment) => ({ type: "activity" as const, timestamp: segment.startedAt, segment })),
    ...day.moods.map((mood) => ({ type: "mood" as const, timestamp: mood.recordedAt, mood }))
  ].sort((left, right) => left.timestamp - right.timestamp), [segments, day.moods]);

  useEffect(() => {
    setMood(day.reflection?.score ?? null);
    setNote(day.reflection?.note ?? "");
  }, [day.personalDayKey, day.reflection]);

  const saveReflection = async () => {
    if (!mood) return;
    await mutate({
      type: "SAVE_REFLECTION",
      personalDayKey: day.personalDayKey,
      score: mood,
      tags: [],
      note: note.trim() || null
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <>
      <div className="summary-grid">
        <Card className="summary-card summary-card-total">
          <div className="summary-label"><span>Total active time</span><CalendarClock size={16} strokeWidth={1.8} aria-hidden="true" /></div>
          <div className="summary-value">{formatDuration(day.totalSeconds)}</div>
          <p className="summary-subtext">Personal day beginning {formatDayLabel(day.personalDayKey, "short")}</p>
        </Card>
        {categoryOrder.map((category) => {
          const seconds = day.categoryTotals[category];
          const limit = limitForCategory(limits, category);
          const percentage = limit ? (seconds / limit.seconds) * 100 : 0;
          return (
            <Card className="summary-card" key={category}>
              <div className="summary-label"><CategoryBadge category={category} /></div>
              <div className="summary-value">{formatDuration(seconds)}</div>
              {limit ? <ProgressBar value={percentage} label={`${categoryLabels[category]} boundary progress`} /> : <p className="summary-subtext">No boundary set</p>}
            </Card>
          );
        })}
      </div>

      <div className="content-grid">
        <Card className="panel">
          <SectionHeading title="Today’s timeline" description="Active browsing sessions in chronological order" />
          {timelineEvents.length ? (
            <div className="timeline" aria-label="Browsing timeline">
              {timelineEvents.map((event) => event.type === "activity" ? (
                  <div className="timeline-row" key={event.segment.id}>
                    <span className="timeline-time">{formatClock(event.segment.startedAt)}</span>
                    <span className="timeline-dot" aria-hidden="true" />
                    <div className="timeline-detail">
                      <strong>{event.segment.hostname}</strong>
                      <small>{categoryLabels[event.segment.category]}</small>
                    </div>
                    <span className="timeline-duration">{formatDuration(event.segment.durationSeconds)}</span>
                  </div>
                ) : (
                  <div className="timeline-row timeline-mood-row" key={event.mood.id}>
                    <span className="timeline-time">{formatClock(event.mood.recordedAt)}</span>
                    <span className="timeline-dot timeline-mood-dot" aria-hidden="true"><Heart size={10} strokeWidth={2.2} /></span>
                    <div className="timeline-detail">
                      <strong>Mood check-in: {moodLabels[event.mood.score - 1]}</strong>
                      <small>{event.mood.source === "limit" ? "Boundary reflection" : "Manual reflection"}</small>
                    </div>
                    <span className="timeline-mood-score">{event.mood.score} of 5</span>
                  </div>
                ))}
            </div>
          ) : (
            <EmptyState icon={Activity} title="Your timeline is ready">
              Active website sessions will appear here as you browse.
            </EmptyState>
          )}
        </Card>

        <div className="today-side-column">
          <Card className="panel checkins-panel">
            <SectionHeading title="Check-ins" description={`${checkInCount} ${checkInCount === 1 ? "reflection" : "reflections"} recorded today`} />
            {day.moods.length || day.reflection ? (
              <div className="checkins-list">
                {day.moods.map((entry) => (
                  <div className="checkin-row" key={entry.id}>
                    <span className="checkin-icon"><Heart size={15} strokeWidth={2} aria-hidden="true" /></span>
                    <div>
                      <strong>{moodLabels[entry.score - 1]}</strong>
                      <small>{formatClock(entry.recordedAt)} · {entry.source === "limit" ? "Boundary" : "Manual"}</small>
                    </div>
                    <span className="checkin-score">{entry.score}/5</span>
                  </div>
                ))}
                {day.reflection ? (
                  <div className="checkin-row checkin-overall">
                    <span className="checkin-icon"><ListChecks size={15} strokeWidth={2} aria-hidden="true" /></span>
                    <div>
                      <strong>Overall day: {moodLabels[day.reflection.score - 1]}</strong>
                      <small>{day.reflection.note || "Daily reflection"}</small>
                    </div>
                    <span className="checkin-score">{day.reflection.score}/5</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState icon={ListChecks} title="No check-ins yet">Mood responses from reminders and the popup will appear here.</EmptyState>
            )}
          </Card>

          <Card className="panel reflection-form">
            <MessageCircleMore size={21} strokeWidth={1.8} aria-hidden="true" />
            <h3>How has today felt overall?</h3>
            <p>A short reflection can make patterns easier to notice later.</p>
            <MoodScale value={mood} onChange={setMood} />
            <Field label="Optional note">
              <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="A few words about the day" />
            </Field>
            <Button variant="primary" icon={saved ? Check : undefined} disabled={!mood} onClick={() => void saveReflection()}>
              {saved ? "Reflection saved" : "Save reflection"}
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
