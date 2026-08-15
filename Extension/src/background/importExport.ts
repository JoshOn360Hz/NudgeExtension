import { accentOptions, createDefaultState } from "../shared/constants";
import { inferMatchType, normalizeHostname, normalizeRulePattern } from "../shared/classifier";
import type { AppState, CategoryId, DailyLimit, Settings, ThemeMode } from "../shared/models";
import { localDateKey, personalDayKey } from "../shared/time";

const categories = new Set<CategoryId>(["social", "work", "relax", "other"]);
const themes = new Set<ThemeMode>(["light", "dark", "system"]);
const resetTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const dayKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requiredArray = (value: unknown, name: string, maximum: number) => {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  if (value.length > maximum) throw new Error(`${name} contains too many records`);
  return value;
};

const finiteNumber = (value: unknown, name: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${name} must be a number`);
  return value;
};

const boundedString = (value: unknown, name: string, maximum: number) => {
  if (typeof value !== "string" || value.length > maximum) throw new Error(`${name} is invalid`);
  return value;
};

const recordId = (value: unknown) =>
  typeof value === "string" && value.length > 0 && value.length <= 100 ? value : crypto.randomUUID();

const categoryValue = (value: unknown) => {
  if (!categories.has(value as CategoryId)) throw new Error("An imported category is invalid");
  return value as CategoryId;
};

const safeTime = (value: unknown, fallback: string) =>
  typeof value === "string" && resetTimePattern.test(value) ? value : fallback;

const safeDayKey = (value: unknown, timestamp: number, resetTime: string) =>
  typeof value === "string" && dayKeyPattern.test(value) ? value : personalDayKey(timestamp, resetTime);

const importSettings = (value: unknown): Settings => {
  if (!isRecord(value)) throw new Error("Settings are missing from this export");
  const defaults = createDefaultState().settings;
  const retention = Number(value.retentionDays);
  return {
    dailyResetTime: safeTime(value.dailyResetTime, defaults.dailyResetTime),
    dayEndReminderTime: safeTime(value.dayEndReminderTime, defaults.dayEndReminderTime),
    breakDurationMinutes: Number.isInteger(value.breakDurationMinutes) && Number(value.breakDurationMinutes) >= 1 && Number(value.breakDurationMinutes) <= 60
      ? Number(value.breakDurationMinutes)
      : defaults.breakDurationMinutes,
    theme: themes.has(value.theme as ThemeMode) ? value.theme as ThemeMode : defaults.theme,
    accent: accentOptions.some((option) => option.id === value.accent) ? value.accent as string : defaults.accent,
    pausedUntil: null,
    onboardingComplete: Boolean(value.onboardingComplete),
    retentionDays: retention === 30 || retention === 90 || retention === 180 || retention === 0 ? retention : defaults.retentionDays
  };
};

const importRules = (value: unknown) => requiredArray(value, "Rules", 5_000).map((item) => {
  if (!isRecord(item)) throw new Error("An imported rule is invalid");
  const pattern = normalizeRulePattern(boundedString(item.pattern, "Rule pattern", 255));
  return {
    id: recordId(item.id),
    pattern,
    matchType: inferMatchType(pattern),
    category: categoryValue(item.category),
    enabled: item.enabled !== false,
    createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now()
  };
});

const importLimits = (value: unknown): DailyLimit[] => requiredArray(value, "Limits", 5_000).map((item) => {
  if (!isRecord(item)) throw new Error("An imported boundary is invalid");
  const scope = item.scope;
  if (scope !== "site" && scope !== "category" && scope !== "overall") throw new Error("An imported boundary type is invalid");
  const seconds = finiteNumber(item.seconds, "Boundary duration");
  if (seconds < 60 || seconds > 86_400) throw new Error("An imported boundary duration is invalid");
  const target = scope === "overall"
    ? null
    : scope === "category"
      ? categoryValue(item.target)
      : normalizeHostname(boundedString(item.target, "Boundary website", 255));
  return {
    id: recordId(item.id),
    scope,
    target,
    seconds,
    enabled: item.enabled !== false,
    repeatAfterSeconds: typeof item.repeatAfterSeconds === "number" ? item.repeatAfterSeconds : null,
    createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now()
  };
});

const importSegments = (value: unknown, settings: Settings) => requiredArray(value, "Activity", 200_000).map((item) => {
  if (!isRecord(item)) throw new Error("An imported activity record is invalid");
  const startedAt = finiteNumber(item.startedAt, "Activity start time");
  const endedAt = finiteNumber(item.endedAt, "Activity end time");
  if (endedAt < startedAt) throw new Error("An imported activity time range is invalid");
  const resetTime = safeTime(item.resetTime, settings.dailyResetTime);
  return {
    id: recordId(item.id),
    hostname: normalizeHostname(boundedString(item.hostname, "Activity hostname", 255)),
    category: categoryValue(item.category),
    startedAt,
    endedAt,
    durationSeconds: Math.max(0, Math.min(86_400, finiteNumber(item.durationSeconds, "Activity duration"))),
    localDate: typeof item.localDate === "string" && dayKeyPattern.test(item.localDate) ? item.localDate : localDateKey(startedAt),
    personalDayKey: safeDayKey(item.personalDayKey, startedAt, resetTime),
    resetTime,
    timezoneOffsetMinutes: typeof item.timezoneOffsetMinutes === "number" ? item.timezoneOffsetMinutes : new Date(startedAt).getTimezoneOffset()
  };
});

const importReminders = (value: unknown, settings: Settings) => requiredArray(value, "Reminders", 100_000).map((item) => {
  if (!isRecord(item)) throw new Error("An imported reminder is invalid");
  const triggeredAt = finiteNumber(item.triggeredAt, "Reminder time");
  const responses = new Set(["break", "snooze", "continue", "dismissed"]);
  return {
    id: recordId(item.id),
    limitIds: requiredArray(item.limitIds, "Reminder boundary IDs", 100).map((id) => boundedString(id, "Reminder boundary ID", 100)),
    personalDayKey: safeDayKey(item.personalDayKey, triggeredAt, settings.dailyResetTime),
    triggeredAt,
    response: responses.has(String(item.response)) ? item.response as "break" | "snooze" | "continue" | "dismissed" : null,
    snoozedUntil: typeof item.snoozedUntil === "number" ? item.snoozedUntil : null,
    moodEntryId: typeof item.moodEntryId === "string" ? item.moodEntryId : null
  };
});

const importMoods = (value: unknown, settings: Settings) => requiredArray(value, "Mood entries", 100_000).map((item) => {
  if (!isRecord(item)) throw new Error("An imported mood entry is invalid");
  const score = finiteNumber(item.score, "Mood score");
  if (![1, 2, 3, 4, 5].includes(score)) throw new Error("An imported mood score is invalid");
  const recordedAt = finiteNumber(item.recordedAt, "Mood time");
  return {
    id: recordId(item.id),
    source: item.source === "limit" ? "limit" as const : "manual" as const,
    score: score as 1 | 2 | 3 | 4 | 5,
    tags: requiredArray(item.tags, "Mood tags", 20).map((tag) => boundedString(tag, "Mood tag", 50)),
    note: typeof item.note === "string" ? item.note.slice(0, 500) : null,
    recordedAt,
    personalDayKey: safeDayKey(item.personalDayKey, recordedAt, settings.dailyResetTime),
    relatedReminderId: typeof item.relatedReminderId === "string" ? item.relatedReminderId : null
  };
});

const importReflections = (value: unknown, settings: Settings) => requiredArray(value, "Reflections", 10_000).map((item) => {
  if (!isRecord(item)) throw new Error("An imported reflection is invalid");
  const score = finiteNumber(item.score, "Reflection score");
  if (![1, 2, 3, 4, 5].includes(score)) throw new Error("An imported reflection score is invalid");
  const createdAt = typeof item.createdAt === "number" ? item.createdAt : Date.now();
  return {
    personalDayKey: safeDayKey(item.personalDayKey, createdAt, settings.dailyResetTime),
    score: score as 1 | 2 | 3 | 4 | 5,
    tags: requiredArray(item.tags, "Reflection tags", 20).map((tag) => boundedString(tag, "Reflection tag", 50)),
    note: typeof item.note === "string" ? item.note.slice(0, 500) : null,
    createdAt,
    updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : createdAt
  };
});

export const exportState = (state: AppState) => JSON.stringify({
  format: "nudge-export",
  version: 1,
  exportedAt: new Date().toISOString(),
  data: { ...state, activeSegment: null }
}, null, 2);

export const importState = (json: string): AppState => {
  if (new Blob([json]).size > 10_000_000) throw new Error("The import file is larger than 10 MB");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Choose a valid JSON file");
  }
  const supportedExport = isRecord(parsed) && (parsed.format === "nudge-export" || parsed.format === "daylight-export");
  const root = supportedExport && isRecord(parsed) ? parsed.data : parsed;
  if (!isRecord(root) || root.version !== 1) throw new Error("This is not a supported Nudge export");
  const settings = importSettings(root.settings);
  return {
    version: 1,
    settings,
    rules: importRules(root.rules),
    limits: importLimits(root.limits),
    segments: importSegments(root.segments, settings),
    reminders: importReminders(root.reminders, settings),
    moods: importMoods(root.moods, settings),
    reflections: importReflections(root.reflections, settings),
    activeSegment: null
  };
};
