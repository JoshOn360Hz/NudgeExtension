import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { categoryOrder } from "../shared/constants";
import type { DashboardSnapshot } from "../shared/models";
import { formatDayLabel, formatDuration } from "../shared/time";
import { Card, CategoryBadge, EmptyState, SectionHeading } from "../ui/components";

export function CalendarView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [range, setRange] = useState<7 | 31>(7);
  const [selectedKey, setSelectedKey] = useState(snapshot.today.personalDayKey);
  const days = useMemo(() => snapshot.days.slice(0, range), [snapshot.days, range]);
  const selected = snapshot.days.find((day) => day.personalDayKey === selectedKey) ?? days[0];

  return (
    <>
      <div className="calendar-toolbar">
        <div className="segmented-control" aria-label="Calendar range">
          <button type="button" className={range === 7 ? "active" : ""} onClick={() => setRange(7)}>7 days</button>
          <button type="button" className={range === 31 ? "active" : ""} onClick={() => setRange(31)}>Month</button>
        </div>
      </div>
      <div className="calendar-grid">
        {days.map((day) => (
          <button
            type="button"
            className={`day-card ${selectedKey === day.personalDayKey ? "selected" : ""}`}
            key={day.personalDayKey}
            onClick={() => setSelectedKey(day.personalDayKey)}
          >
            <strong>{formatDayLabel(day.personalDayKey, "short")}</strong>
            <span className="day-card-time">{formatDuration(day.totalSeconds)}</span>
            <div className="day-bars" aria-label="Category distribution">
              {categoryOrder.map((category) => (
                <span
                  className={category}
                  key={category}
                  style={{ flexGrow: day.categoryTotals[category] || 1, opacity: day.categoryTotals[category] ? 1 : 0.15 }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
      {selected ? (
        <Card className="selected-day">
          <SectionHeading
            title={formatDayLabel(selected.personalDayKey)}
            description={selected.reflection ? `Overall feeling: ${selected.reflection.score} of 5` : "No overall reflection recorded"}
          />
          {selected.totalSeconds ? (
            <div className="selected-day-grid">
              {categoryOrder.map((category) => (
                <div className="selected-day-stat" key={category}>
                  <CategoryBadge category={category} />
                  <strong>{formatDuration(selected.categoryTotals[category])}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No activity recorded">There is no tracked browsing for this personal day.</EmptyState>
          )}
        </Card>
      ) : null}
    </>
  );
}
