import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BriefcaseBusiness, CirclePlay, Shapes, Users } from "lucide-react";
import { categoryLabels, moodLabels } from "../shared/constants";
import type { CategoryId } from "../shared/models";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  icon?: LucideIcon;
};

export function Button({ variant = "secondary", icon: Icon, className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {Icon ? <Icon size={17} strokeWidth={1.9} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({ icon: Icon, label, ...props }: Omit<ButtonProps, "icon" | "children"> & { icon: LucideIcon; label: string }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

const categoryIcons: Record<CategoryId, LucideIcon> = {
  social: Users,
  work: BriefcaseBusiness,
  relax: CirclePlay,
  other: Shapes
};

export function CategoryBadge({ category }: { category: CategoryId }) {
  const Icon = categoryIcons[category];
  return (
    <span className={`category-badge category-${category}`}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      {categoryLabels[category]}
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percentage = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}>
      <span style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function MoodScale({ value, onChange, compact = false }: { value: number | null; onChange: (value: 1 | 2 | 3 | 4 | 5) => void; compact?: boolean }) {
  return (
    <div className={`mood-scale ${compact ? "mood-scale-compact" : ""}`} role="group" aria-label="Mood">
      {moodLabels.map((label, index) => {
        const score = (index + 1) as 1 | 2 | 3 | 4 | 5;
        return (
          <button
            type="button"
            key={label}
            className={value === score ? "selected" : ""}
            onClick={() => onChange(score)}
            aria-pressed={value === score}
            aria-label={label}
            title={label}
          >
            <span>{score}</span>
            {!compact ? <small>{label}</small> : null}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function InlineNotice({ children }: { children: ReactNode }) {
  return <div className="inline-notice" role="status">{children}</div>;
}
