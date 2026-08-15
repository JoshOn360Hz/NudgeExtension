import { categoryLabels, categoryOrder } from "../shared/constants";
import { normalizeHostname } from "../shared/classifier";
import type {
  ActiveSegment,
  ActivitySegment,
  AppState,
  CategoryId,
  CategoryTotals,
  DashboardSnapshot,
  DaySummary,
  ReminderPayload
} from "../shared/models";
import { boundaryAfter, localDateKey, personalDayKey, shiftDayKey } from "../shared/time";

const emptyTotals = (): CategoryTotals => ({ social: 0, work: 0, relax: 0, other: 0 });

export const appendCommittedSegment = (state: AppState, active: ActiveSegment, requestedEndAt: number) => {
  let cursor = active.startedAt;
  const endAt = Math.max(cursor, requestedEndAt);
  while (cursor < endAt) {
    const boundary = boundaryAfter(cursor, active.resetTime);
    const pieceEnd = Math.min(endAt, boundary);
    const durationSeconds = Math.max(0, Math.floor((pieceEnd - cursor) / 1000));
    if (durationSeconds > 0) {
      const segment: ActivitySegment = {
        id: crypto.randomUUID(),
        hostname: active.hostname,
        category: active.category,
        startedAt: cursor,
        endedAt: pieceEnd,
        durationSeconds,
        localDate: localDateKey(cursor),
        personalDayKey: personalDayKey(cursor, active.resetTime),
        resetTime: active.resetTime,
        timezoneOffsetMinutes: new Date(cursor).getTimezoneOffset()
      };
      state.segments.push(segment);
    }
    cursor = pieceEnd;
  }
};

const virtualActiveSegment = (state: AppState, key: string) => {
  const active = state.activeSegment;
  if (!active || active.personalDayKey !== key) return null;
  const endAt = Math.max(active.startedAt, active.lastConfirmedAt);
  return {
    id: `${active.id}:live`,
    hostname: active.hostname,
    category: active.category,
    startedAt: active.startedAt,
    endedAt: endAt,
    durationSeconds: Math.max(0, Math.floor((endAt - active.startedAt) / 1000)),
    localDate: active.localDate,
    personalDayKey: active.personalDayKey,
    resetTime: active.resetTime,
    timezoneOffsetMinutes: new Date(active.startedAt).getTimezoneOffset()
  } satisfies ActivitySegment;
};

export const summarizeDay = (state: AppState, key: string): DaySummary => {
  const storedSegments = state.segments.filter((segment) => segment.personalDayKey === key);
  const live = virtualActiveSegment(state, key);
  const segments = live ? [...storedSegments, live] : storedSegments;
  const categoryTotals = emptyTotals();
  let totalSeconds = 0;
  for (const segment of segments) {
    categoryTotals[segment.category] += segment.durationSeconds;
    totalSeconds += segment.durationSeconds;
  }
  return {
    personalDayKey: key,
    totalSeconds,
    categoryTotals,
    segments: [...segments].sort((left, right) => left.startedAt - right.startedAt),
    moods: state.moods.filter((mood) => mood.personalDayKey === key).sort((left, right) => left.recordedAt - right.recordedAt),
    reflection: state.reflections.find((reflection) => reflection.personalDayKey === key) ?? null
  };
};

export const buildSnapshot = (state: AppState, dayCount: number): DashboardSnapshot => {
  const currentKey = personalDayKey(Date.now(), state.settings.dailyResetTime);
  const days = Array.from({ length: dayCount }, (_, index) => summarizeDay(state, shiftDayKey(currentKey, -index)));
  const paused = state.settings.pausedUntil !== null && state.settings.pausedUntil > Date.now();
  return {
    settings: state.settings,
    rules: [...state.rules].sort((left, right) => left.pattern.localeCompare(right.pattern)),
    limits: [...state.limits].sort((left, right) => left.scope.localeCompare(right.scope)),
    today: days[0],
    days,
    trackingActive: state.settings.onboardingComplete && !paused
  };
};

const siteMatches = (hostname: string, target: string) => {
  const normalized = normalizeHostname(target);
  return hostname === normalized || hostname.endsWith(`.${normalized}`);
};

const usageForLimit = (summary: DaySummary, scope: "site" | "category" | "overall", target: string | null) => {
  if (scope === "overall") return summary.totalSeconds;
  if (scope === "category") return summary.categoryTotals[target as CategoryId] ?? 0;
  return summary.segments
    .filter((segment) => target && siteMatches(segment.hostname, target))
    .reduce((total, segment) => total + segment.durationSeconds, 0);
};

export const secondsUntilNextLimit = (state: AppState) => {
  const key = personalDayKey(Date.now(), state.settings.dailyResetTime);
  const summary = summarizeDay(state, key);
  const remaining = state.limits
    .filter((limit) => limit.enabled)
    .filter((limit) => !state.reminders.some((reminder) => reminder.personalDayKey === key && reminder.limitIds.includes(limit.id)))
    .map((limit) => limit.seconds - usageForLimit(summary, limit.scope, limit.target))
    .filter((seconds) => seconds > 0);
  return remaining.length ? Math.min(...remaining) : null;
};

const describeLimits = (state: AppState, limitIds: string[]) => {
  const descriptions = limitIds.map((id) => {
    const limit = state.limits.find((candidate) => candidate.id === id);
    if (!limit) return "daily";
    if (limit.scope === "overall") return "overall browsing";
    if (limit.scope === "category") return `${categoryLabels[limit.target as CategoryId]} category`;
    return String(limit.target);
  });
  if (descriptions.length === 1) return descriptions[0];
  return `${descriptions.slice(0, -1).join(", ")} and ${descriptions.at(-1)}`;
};

export const evaluateLimits = (state: AppState): ReminderPayload | null => {
  const now = Date.now();
  const key = personalDayKey(now, state.settings.dailyResetTime);
  const summary = summarizeDay(state, key);
  const crossed = state.limits.filter((limit) => {
    if (!limit.enabled) return false;
    const alreadyTriggered = state.reminders.some(
      (reminder) => reminder.personalDayKey === key && reminder.limitIds.includes(limit.id)
    );
    return !alreadyTriggered && usageForLimit(summary, limit.scope, limit.target) >= limit.seconds;
  });
  const dueSnoozed = state.reminders.find(
    (reminder) => reminder.personalDayKey === key && reminder.snoozedUntil !== null && reminder.snoozedUntil <= now
  );
  if (dueSnoozed) {
    dueSnoozed.snoozedUntil = null;
    dueSnoozed.response = null;
    return {
      reminderId: dueSnoozed.id,
      limitIds: dueSnoozed.limitIds,
      title: "Would now be a good time for a break?",
      message: `You are still beyond your ${describeLimits(state, dueSnoozed.limitIds)} boundary. How are you feeling?`,
      breakDurationMinutes: state.settings.breakDurationMinutes
    };
  }
  if (!crossed.length) return null;
  const reminder = {
    id: crypto.randomUUID(),
    limitIds: crossed.map((limit) => limit.id),
    personalDayKey: key,
    triggeredAt: now,
    response: null,
    snoozedUntil: null,
    moodEntryId: null
  };
  state.reminders.push(reminder);
  return {
    reminderId: reminder.id,
    limitIds: reminder.limitIds,
    title: "Would now be a good time for a break?",
    message: `You reached your ${describeLimits(state, reminder.limitIds)} boundary. How are you feeling?`,
    breakDurationMinutes: state.settings.breakDurationMinutes
  };
};

export const pruneState = (state: AppState) => {
  const days = state.settings.retentionDays;
  if (!days) return;
  const currentKey = personalDayKey(Date.now(), state.settings.dailyResetTime);
  const cutoff = shiftDayKey(currentKey, -days);
  state.segments = state.segments.filter((item) => item.personalDayKey >= cutoff);
  state.reminders = state.reminders.filter((item) => item.personalDayKey >= cutoff);
  state.moods = state.moods.filter((item) => item.personalDayKey >= cutoff);
  state.reflections = state.reflections.filter((item) => item.personalDayKey >= cutoff);
};

export const categoryUsageRows = (summary: DaySummary) =>
  categoryOrder.map((category) => ({ category, seconds: summary.categoryTotals[category] }));
