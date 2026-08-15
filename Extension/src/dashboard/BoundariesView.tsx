import { useState } from "react";
import { Clock3, Plus, Trash2 } from "lucide-react";
import { categoryLabels, categoryOrder } from "../shared/constants";
import type { CategoryId, DailyLimit, ExtensionRequest } from "../shared/models";
import { formatDuration } from "../shared/time";
import { Button, Card, CategoryBadge, EmptyState, Field, IconButton, SectionHeading } from "../ui/components";

const targetLabel = (limit: DailyLimit) => {
  if (limit.scope === "overall") return "All tracked browsing";
  if (limit.scope === "category") return categoryLabels[limit.target as CategoryId];
  return limit.target;
};

export function BoundariesView({ limits, mutate }: { limits: DailyLimit[]; mutate: (request: ExtensionRequest) => Promise<void> }) {
  const [scope, setScope] = useState<DailyLimit["scope"]>("category");
  const [target, setTarget] = useState<string>("social");
  const [minutes, setMinutes] = useState(30);

  const save = async () => {
    await mutate({
      type: "SAVE_LIMIT",
      limit: {
        scope,
        target: scope === "overall" ? null : target,
        seconds: Math.round(minutes * 60),
        enabled: true,
        repeatAfterSeconds: 15 * 60
      }
    });
  };

  const toggle = async (limit: DailyLimit) => {
    await mutate({
      type: "SAVE_LIMIT",
      limit: {
        id: limit.id,
        scope: limit.scope,
        target: limit.target,
        seconds: limit.seconds,
        enabled: !limit.enabled,
        repeatAfterSeconds: limit.repeatAfterSeconds
      }
    });
  };

  return (
    <>
      <Card className="form-card">
        <SectionHeading title="Add a daily boundary" description="Boundaries create reminders and never block the website." />
        <div className="form-grid">
          <Field label="Boundary type">
            <select value={scope} onChange={(event) => {
              const next = event.target.value as DailyLimit["scope"];
              setScope(next);
              setTarget(next === "category" ? "social" : "");
            }}>
              <option value="category">Category</option>
              <option value="site">Website</option>
              <option value="overall">All browsing</option>
            </select>
          </Field>
          {scope === "category" ? (
            <Field label="Category">
              <select value={target} onChange={(event) => setTarget(event.target.value)}>
                {categoryOrder.map((category) => <option value={category} key={category}>{categoryLabels[category]}</option>)}
              </select>
            </Field>
          ) : scope === "site" ? (
            <Field label="Website">
              <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="example.com" />
            </Field>
          ) : <div />}
          <Field label="Minutes per personal day">
            <input type="number" min={1} max={1440} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
          </Field>
          <Button variant="primary" icon={Plus} onClick={() => void save()}>Add boundary</Button>
        </div>
      </Card>

      <SectionHeading title="Your boundaries" description="Website, category, and overall boundaries can work together." />
      <Card className="list-card">
        {limits.length ? limits.map((limit) => (
          <div className="list-row" key={limit.id}>
            <div className="list-primary">
              <strong>{targetLabel(limit)}</strong>
              <small>{limit.scope === "overall" ? "Overall" : limit.scope === "site" ? "Website" : "Category"}</small>
            </div>
            <div>{limit.scope === "category" ? <CategoryBadge category={limit.target as CategoryId} /> : <span className="list-muted">Daily boundary</span>}</div>
            <strong>{formatDuration(limit.seconds)}</strong>
            <div className="form-actions">
              <label className="toggle">
                <input type="checkbox" checked={limit.enabled} onChange={() => void toggle(limit)} />
                <span>{limit.enabled ? "On" : "Off"}</span>
              </label>
              <IconButton icon={Trash2} label={`Delete ${targetLabel(limit)} boundary`} onClick={() => void mutate({ type: "DELETE_LIMIT", id: limit.id })} />
            </div>
          </div>
        )) : (
          <EmptyState icon={Clock3} title="No boundaries yet">Add one above when you are ready for a gentle reminder.</EmptyState>
        )}
      </Card>
    </>
  );
}
