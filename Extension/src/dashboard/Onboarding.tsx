import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Heart, Palette, ShieldCheck } from "lucide-react";
import { accentOptions, categoryLabels, categoryOrder } from "../shared/constants";
import type { CategoryId, DailyLimitInput, Settings, ThemeMode } from "../shared/models";
import { applyAppearance } from "../ui/appearance";
import { Button, CategoryBadge, Field, InlineNotice } from "../ui/components";
import onboardingIcon from "../assets/onboarding-ico.png";

type OnboardingResult = {
  settings: Partial<Settings>;
  limits: DailyLimitInput[];
};

const stepLabels = ["Welcome", "Boundaries", "Personal day", "Appearance", "Ready"];

export function Onboarding({
  settings,
  onComplete
}: {
  settings: Settings;
  onComplete: (result: OnboardingResult) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dailyResetTime, setDailyResetTime] = useState(settings.dailyResetTime);
  const [dayEndReminderTime, setDayEndReminderTime] = useState(settings.dayEndReminderTime);
  const [theme, setTheme] = useState<ThemeMode>(settings.theme);
  const [accent, setAccent] = useState(settings.accent);
  const [minutes, setMinutes] = useState<Record<CategoryId, number>>({
    social: 30,
    work: 240,
    relax: 120,
    other: 0
  });

  const updateAppearance = (updates: { theme?: ThemeMode; accent?: string }) => {
    const nextTheme = updates.theme ?? theme;
    const nextAccent = updates.accent ?? accent;
    setTheme(nextTheme);
    setAccent(nextAccent);
    applyAppearance({ ...settings, theme: nextTheme, accent: nextAccent });
  };

  const finish = async () => {
    setSaving(true);
    const limits = categoryOrder
      .filter((category) => minutes[category] > 0)
      .map((category) => ({
        scope: "category" as const,
        target: category,
        seconds: minutes[category] * 60,
        enabled: true,
        repeatAfterSeconds: 15 * 60
      }));
    try {
      await onComplete({
        settings: { dailyResetTime, dayEndReminderTime, theme, accent, onboardingComplete: true },
        limits
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-backdrop">
      <section className="onboarding-flow" aria-labelledby="onboarding-title">
        <header className="onboarding-header">
          <div className="onboarding-identity">
            <img className="onboarding-logo" src={onboardingIcon} alt="Nudge palm tree and water logo" />
            <span>Nudge</span>
          </div>
          <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${stepLabels.length}`}>
            {stepLabels.map((label, index) => (
              <span key={label} className={index <= step ? "active" : ""} title={label} />
            ))}
          </div>
          <span className="onboarding-step-label">{step + 1} of {stepLabels.length}</span>
        </header>

        <div className="onboarding-body">
          {step === 0 ? (
            <div className="onboarding-step onboarding-welcome">
              <ShieldCheck size={26} strokeWidth={1.8} aria-hidden="true" />
              <h1 id="onboarding-title">Make space to notice your day</h1>
              <p className="onboarding-lead">
                Nudge tracks active website time, reminds you when you reach a boundary, and helps you reflect without blocking access.
              </p>
              <div className="onboarding-points">
                <div className="onboarding-point">
                  <Clock3 size={20} strokeWidth={1.8} aria-hidden="true" />
                  <strong>Active time only</strong>
                  <p>Background tabs and idle time do not count.</p>
                </div>
                <div className="onboarding-point">
                  <Heart size={20} strokeWidth={1.8} aria-hidden="true" />
                  <strong>Gentle reflection</strong>
                  <p>Reminders suggest a break and ask how you feel.</p>
                </div>
                <div className="onboarding-point">
                  <ShieldCheck size={20} strokeWidth={1.8} aria-hidden="true" />
                  <strong>Local and signed</strong>
                  <p>Your hostnames and reflections stay on this browser.</p>
                </div>
              </div>
              <InlineNotice>Tracking begins only after you complete this setup.</InlineNotice>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="onboarding-step">
              <Clock3 size={26} strokeWidth={1.8} aria-hidden="true" />
              <h1 id="onboarding-title">Choose starter boundaries</h1>
              <p className="onboarding-lead">Set daily category reminders now or enter zero to leave a category without a boundary.</p>
              <div className="onboarding-boundaries">
                {categoryOrder.map((category) => (
                  <div className="onboarding-boundary" key={category}>
                    <CategoryBadge category={category} />
                    <label className="onboarding-minute-control">
                      <span className="visually-hidden">{categoryLabels[category]} minutes per day</span>
                      <input
                        type="number"
                        min={0}
                        max={1440}
                        value={minutes[category]}
                        aria-label={`${categoryLabels[category]} minutes per day`}
                        onChange={(event) => setMinutes({ ...minutes, [category]: Math.max(0, Number(event.target.value)) })}
                      />
                      <span>min/day</span>
                    </label>
                  </div>
                ))}
              </div>
              <InlineNotice>These create reminders only. Nudge never blocks or replaces website content.</InlineNotice>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="onboarding-step">
              <Clock3 size={26} strokeWidth={1.8} aria-hidden="true" />
              <h1 id="onboarding-title">Define your personal day</h1>
              <p className="onboarding-lead">Midnight works for most people, but your limits and calendar can reset at any local time.</p>
              <div className="onboarding-form-grid">
                <Field label="Daily reset time" hint="This controls boundaries, timelines, and calendar totals.">
                  <input type="time" value={dailyResetTime} onChange={(event) => setDailyResetTime(event.target.value)} />
                </Field>
                <Field label="End-of-day reflection" hint="The default reminder time is 8:00 PM.">
                  <input type="time" value={dayEndReminderTime} onChange={(event) => setDayEndReminderTime(event.target.value)} />
                </Field>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="onboarding-step">
              <Palette size={26} strokeWidth={1.8} aria-hidden="true" />
              <h1 id="onboarding-title">Make it comfortable</h1>
              <p className="onboarding-lead">Choose a theme and a restrained pastel accent. Both can be changed later.</p>
              <div className="onboarding-form-grid">
                <Field label="Theme">
                  <div className="choice-grid">
                    {(["system", "light", "dark"] as ThemeMode[]).map((option) => (
                      <button
                        type="button"
                        key={option}
                        className={`choice-option ${theme === option ? "selected" : ""}`}
                        onClick={() => updateAppearance({ theme: option })}
                        aria-pressed={theme === option}
                      >
                        {option === "system" ? "Follow system" : option === "light" ? "Light" : "Dark"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Accent colour">
                  <div className="accent-grid onboarding-accent-grid">
                    {accentOptions.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        className={`accent-option ${accent === option.id ? "selected" : ""}`}
                        onClick={() => updateAppearance({ accent: option.id })}
                        aria-pressed={accent === option.id}
                      >
                        <span className="accent-swatch" style={{ background: option.value }} aria-hidden="true" />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="onboarding-step onboarding-ready">
              <span className="ready-mark"><Check size={28} strokeWidth={2} aria-hidden="true" /></span>
              <h1 id="onboarding-title">You are ready</h1>
              <p className="onboarding-lead">Nudge will count active foreground time and show a gentle action sheet when a boundary is reached.</p>
              <div className="ready-summary">
                <div><span>Boundaries</span><strong>{categoryOrder.filter((category) => minutes[category] > 0).length} categories</strong></div>
                <div><span>Daily reset</span><strong>{dailyResetTime}</strong></div>
                <div><span>Theme</span><strong>{theme === "system" ? "Follow system" : theme}</strong></div>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="onboarding-footer">
          <Button variant="quiet" icon={ArrowLeft} disabled={step === 0 || saving} onClick={() => setStep(step - 1)}>Back</Button>
          {step < stepLabels.length - 1 ? (
            <Button variant="primary" icon={ArrowRight} onClick={() => setStep(step + 1)}>Continue</Button>
          ) : (
            <Button variant="primary" icon={Check} disabled={saving} onClick={() => void finish()}>{saving ? "Saving" : "Start Nudge"}</Button>
          )}
        </footer>
      </section>
    </div>
  );
}
