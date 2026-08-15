import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { accentOptions } from "../shared/constants";
import type { ExtensionRequest, Settings, ThemeMode } from "../shared/models";
import { applyAppearance } from "../ui/appearance";
import { Button, Card, Field, InlineNotice } from "../ui/components";

export function SettingsView({
  settings,
  trackingActive,
  mutate
}: {
  settings: Settings;
  trackingActive: boolean;
  mutate: (request: ExtensionRequest) => Promise<void>;
}) {
  const [dayDraft, setDayDraft] = useState({
    dailyResetTime: settings.dailyResetTime,
    dayEndReminderTime: settings.dayEndReminderTime
  });
  const [appearance, setAppearance] = useState({ theme: settings.theme, accent: settings.accent });
  const [retentionDays, setRetentionDays] = useState(settings.retentionDays);
  const [dataStatus, setDataStatus] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDayDraft({ dailyResetTime: settings.dailyResetTime, dayEndReminderTime: settings.dayEndReminderTime });
  }, [settings.dailyResetTime, settings.dayEndReminderTime]);

  useEffect(() => {
    setAppearance({ theme: settings.theme, accent: settings.accent });
    applyAppearance(settings);
  }, [settings.theme, settings.accent]);

  useEffect(() => setRetentionDays(settings.retentionDays), [settings.retentionDays]);

  const saveAppearance = async (updates: Partial<Pick<Settings, "theme" | "accent">>) => {
    const next = { ...appearance, ...updates };
    setAppearance(next);
    applyAppearance({ ...settings, ...next });
    await mutate({ type: "SAVE_SETTINGS", settings: next });
  };

  const saveDaySettings = async (updates: Partial<Pick<Settings, "dailyResetTime" | "dayEndReminderTime">>) => {
    const next = { ...dayDraft, ...updates };
    setDayDraft(next);
    const changedValue = updates.dailyResetTime ?? updates.dayEndReminderTime ?? "";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(changedValue)) return;
    await mutate({ type: "SAVE_SETTINGS", settings: updates });
  };

  const exportData = async () => {
    const response = await chrome.runtime.sendMessage({ type: "EXPORT_DATA" });
    if (!response?.ok) throw new Error(response?.error ?? "Could not export data");
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nudge-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDataStatus("Export created");
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    if (!window.confirm("Import this file and replace the current Nudge state?")) {
      if (importInput.current) importInput.current.value = "";
      return;
    }
    const json = await file.text();
    await mutate({ type: "IMPORT_DATA", json });
    setDataStatus("Import complete");
    if (importInput.current) importInput.current.value = "";
  };

  const deleteHistory = async () => {
    if (!window.confirm("Delete all tracked activity and reflections while keeping settings, rules, and boundaries?")) return;
    await mutate({ type: "DELETE_ALL_DATA" });
    setDataStatus("Activity and reflections deleted");
  };

  const resetState = async () => {
    if (!window.confirm("Reset Nudge to its original state? This clears all data and starts onboarding again.")) return;
    await mutate({ type: "RESET_STATE" });
  };

  return (
    <div className="settings-grid">
      <Card className="settings-card">
        <h3>Personal day</h3>
        <p>Choose when limits and calendar totals begin again.</p>
        <div className="settings-fields">
          <Field label="Daily reset time" hint="Midnight is the default. Changes apply to future activity only.">
            <input type="time" value={dayDraft.dailyResetTime} onChange={(event) => void saveDaySettings({ dailyResetTime: event.target.value })} />
          </Field>
          <Field label="End-of-day reminder">
            <input type="time" value={dayDraft.dayEndReminderTime} onChange={(event) => void saveDaySettings({ dayEndReminderTime: event.target.value })} />
          </Field>
          <Field label="Break duration" hint="Used by the countdown when you choose to take a break.">
            <select value={settings.breakDurationMinutes} onChange={(event) => void mutate({ type: "SAVE_SETTINGS", settings: { breakDurationMinutes: Number(event.target.value) } })}>
              {[1, 5, 10, 15, 20, 30, 45, 60].map((minutes) => <option value={minutes} key={minutes}>{minutes} {minutes === 1 ? "minute" : "minutes"}</option>)}
            </select>
          </Field>
          <InlineNotice>A personal day runs from the reset time until one second before the next reset.</InlineNotice>
        </div>
      </Card>

      <Card className="settings-card">
        <h3>Appearance</h3>
        <p>Keep the interface warm, clear, and comfortable to read.</p>
        <div className="settings-fields">
          <Field label="Theme">
            <select value={appearance.theme} onChange={(event) => void saveAppearance({ theme: event.target.value as ThemeMode })}>
              <option value="system">Follow system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
          <Field label="Accent colour">
            <div className="accent-grid">
              {accentOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`accent-option ${appearance.accent === option.id ? "selected" : ""}`}
                  onClick={() => void saveAppearance({ accent: option.id })}
                  aria-pressed={appearance.accent === option.id}
                >
                  <span className="accent-swatch" style={{ background: option.value }} aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      <Card className="settings-card">
        <h3>Tracking</h3>
        <p>Pause collection without removing any existing activity.</p>
        <div className="data-actions">
          {trackingActive ? (
            <>
              <Button icon={Pause} onClick={() => void mutate({ type: "PAUSE_TRACKING", until: Date.now() + 15 * 60 * 1000 })}>Pause 15 minutes</Button>
              <Button icon={Pause} onClick={() => void mutate({ type: "PAUSE_TRACKING", until: Date.now() + 60 * 60 * 1000 })}>Pause 1 hour</Button>
              <Button icon={Pause} onClick={() => void mutate({ type: "PAUSE_TRACKING", until: null })}>Pause until resumed</Button>
            </>
          ) : (
            <Button variant="primary" icon={Play} onClick={() => void mutate({ type: "RESUME_TRACKING" })}>Resume tracking</Button>
          )}
        </div>
      </Card>

      <Card className="settings-card">
        <h3>Privacy and data</h3>
        <p>Nudge stores hostnames and reflections locally in signed extension storage.</p>
        <div className="settings-fields">
          <Field label="Retention">
            <select value={retentionDays} onChange={(event) => setRetentionDays(Number(event.target.value) as Settings["retentionDays"])}>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={0}>Keep until deleted</option>
            </select>
          </Field>
          <Button icon={Save} onClick={() => void mutate({ type: "SAVE_SETTINGS", settings: { retentionDays } })}>Save retention</Button>
          {dataStatus ? <InlineNotice>{dataStatus}</InlineNotice> : null}
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => void importData(event.target.files?.[0])}
          />
          <div className="data-actions">
            <Button icon={Download} onClick={() => void exportData()}>Export JSON</Button>
            <Button icon={Upload} onClick={() => importInput.current?.click()}>Import JSON</Button>
            <Button variant="danger" icon={Trash2} onClick={() => void deleteHistory()}>Delete activity</Button>
            <Button variant="danger" icon={RotateCcw} onClick={() => void resetState()}>Reset Nudge</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
