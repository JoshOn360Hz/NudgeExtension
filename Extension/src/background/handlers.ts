import { accentOptions, categoryOrder, createDefaultState } from "../shared/constants";
import { inferMatchType, normalizeHostname, normalizeRulePattern } from "../shared/classifier";
import type {
  AppState,
  CategoryId,
  DailyLimitInput,
  ExtensionRequest,
  ExtensionResponse,
  ReminderResponse,
  Settings,
  ThemeMode
} from "../shared/models";
import { personalDayKey } from "../shared/time";
import { store } from "./signedStore";
import { appendCommittedSegment, buildSnapshot, summarizeDay } from "./state";
import { processActivity } from "./tracking";
import { exportState, importState } from "./importExport";

const validResetTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const validateSettings = (current: Settings, updates: Partial<Settings>): Settings => {
  const next = { ...current, ...updates };
  if (!validResetTime(next.dailyResetTime) || !validResetTime(next.dayEndReminderTime)) {
    throw new Error("Choose a valid time");
  }
  if (!(new Set<ThemeMode>(["light", "dark", "system"])).has(next.theme)) throw new Error("Choose a valid theme");
  if (!accentOptions.some((option) => option.id === next.accent)) throw new Error("Choose a valid accent");
  if (!Number.isInteger(next.breakDurationMinutes) || next.breakDurationMinutes < 1 || next.breakDurationMinutes > 60) {
    throw new Error("Break duration must be between 1 and 60 minutes");
  }
  if (![0, 30, 90, 180].includes(next.retentionDays)) throw new Error("Choose a valid retention period");
  return next;
};

const saveLimit = (state: AppState, input: DailyLimitInput) => {
  const now = Date.now();
  const target = input.scope === "site" && input.target ? normalizeHostname(input.target) : input.target;
  if (input.seconds < 60 || input.seconds > 86_400) throw new Error("Limits must be between 1 minute and 24 hours");
  if (input.scope === "category" && !categoryOrder.includes(target as CategoryId)) throw new Error("Choose a category");
  if (input.scope === "site" && (!target || !String(target).includes("."))) throw new Error("Enter a valid website");
  const duplicate = state.limits.find(
    (limit) => limit.scope === input.scope && limit.target === target && limit.id !== input.id
  );
  if (duplicate) throw new Error("A boundary already exists for this target");
  const existing = state.limits.find((limit) => limit.id === input.id);
  if (existing) {
    Object.assign(existing, input, { target, updatedAt: now });
  } else {
    state.limits.push({ ...input, target, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
  }
};

const updateReminderResponse = (
  state: AppState,
  reminderId: string,
  response: ReminderResponse,
  moodScore?: 1 | 2 | 3 | 4 | 5
) => {
  const reminder = state.reminders.find((item) => item.id === reminderId);
  if (!reminder) throw new Error("Reminder not found");
  reminder.response = response;
  if (response === "snooze") reminder.snoozedUntil = Date.now() + 10 * 60 * 1000;
  if (response === "continue") {
    const repeatSeconds = reminder.limitIds
      .map((id) => state.limits.find((limit) => limit.id === id)?.repeatAfterSeconds)
      .find((seconds) => seconds !== null && seconds !== undefined);
    reminder.snoozedUntil = repeatSeconds ? Date.now() + repeatSeconds * 1000 : null;
  }
  if (moodScore) {
    const mood = {
      id: crypto.randomUUID(),
      source: "limit" as const,
      score: moodScore,
      tags: [],
      note: null,
      recordedAt: Date.now(),
      personalDayKey: reminder.personalDayKey,
      relatedReminderId: reminder.id
    };
    state.moods.push(mood);
    reminder.moodEntryId = mood.id;
  }
};

export const handleRequest = async (request: ExtensionRequest): Promise<ExtensionResponse> => {
  try {
    if (request.type === "GET_DASHBOARD") {
      if (request.sync !== false) await processActivity(true);
      const state = await store.get();
      return { ok: true, data: buildSnapshot(state, Math.min(31, Math.max(1, request.days ?? 31))) };
    }

    if (request.type === "GET_DAY") {
      await processActivity(true);
      return { ok: true, data: summarizeDay(await store.get(), request.personalDayKey) };
    }

    if (request.type === "SAVE_SETTINGS") {
      await processActivity(true);
      await store.update((state) => {
        const resetChanged = request.settings.dailyResetTime && request.settings.dailyResetTime !== state.settings.dailyResetTime;
        if (resetChanged && state.activeSegment) {
          appendCommittedSegment(state, state.activeSegment, Date.now());
          state.activeSegment = null;
        }
        state.settings = validateSettings(state.settings, request.settings);
      });
      await processActivity(true);
      return { ok: true };
    }

    if (request.type === "COMPLETE_ONBOARDING") {
      await store.update((state) => {
        state.settings = validateSettings(state.settings, { ...request.settings, onboardingComplete: true });
        request.limits.forEach((limit) => saveLimit(state, limit));
      });
      await processActivity(true);
      return { ok: true };
    }

    if (request.type === "SAVE_LIMIT") {
      await store.update((state) => {
        saveLimit(state, request.limit);
      });
      await processActivity(true);
      return { ok: true };
    }

    if (request.type === "DELETE_LIMIT") {
      await store.update((state) => {
        state.limits = state.limits.filter((limit) => limit.id !== request.id);
      });
      return { ok: true };
    }

    if (request.type === "SAVE_RULE") {
      await processActivity(true);
      await store.update((state) => {
        const now = Date.now();
        const pattern = normalizeRulePattern(request.rule.pattern);
        const existing = state.rules.find((rule) => rule.id === request.rule.id);
        if (existing) {
          Object.assign(existing, request.rule, { pattern, matchType: inferMatchType(pattern), updatedAt: now });
        } else {
          state.rules.push({
            ...request.rule,
            pattern,
            matchType: inferMatchType(pattern),
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
          });
        }
      });
      await processActivity(true);
      return { ok: true };
    }

    if (request.type === "DELETE_RULE") {
      await processActivity(true);
      await store.update((state) => {
        state.rules = state.rules.filter((rule) => rule.id !== request.id);
      });
      await processActivity(true);
      return { ok: true };
    }

    if (request.type === "SAVE_MOOD") {
      await store.update((state) => {
        const now = Date.now();
        state.moods.push({
          id: crypto.randomUUID(),
          source: "manual",
          score: request.score,
          tags: request.tags,
          note: request.note,
          recordedAt: now,
          personalDayKey: personalDayKey(now, state.settings.dailyResetTime),
          relatedReminderId: null
        });
      });
      return { ok: true };
    }

    if (request.type === "SAVE_REFLECTION") {
      await store.update((state) => {
        const now = Date.now();
        const existing = state.reflections.find((reflection) => reflection.personalDayKey === request.personalDayKey);
        if (existing) {
          Object.assign(existing, { score: request.score, tags: request.tags, note: request.note, updatedAt: now });
        } else {
          state.reflections.push({
            personalDayKey: request.personalDayKey,
            score: request.score,
            tags: request.tags,
            note: request.note,
            createdAt: now,
            updatedAt: now
          });
        }
      });
      return { ok: true };
    }

    if (request.type === "REMINDER_RESPONSE") {
      await store.update((state) => updateReminderResponse(state, request.reminderId, request.response, request.moodScore));
      return { ok: true };
    }

    if (request.type === "PAUSE_TRACKING") {
      await processActivity(true);
      await store.update((state) => {
        state.settings.pausedUntil = request.until ?? Number.MAX_SAFE_INTEGER;
      });
      await processActivity(true);
      return { ok: true };
    }

    if (request.type === "RESUME_TRACKING") {
      await store.update((state) => {
        state.settings.pausedUntil = null;
      });
      await processActivity(true);
      return { ok: true };
    }

    if (request.type === "DELETE_ALL_DATA") {
      await processActivity(true);
      await store.update((state) => {
        state.segments = [];
        state.reminders = [];
        state.moods = [];
        state.reflections = [];
        state.activeSegment = null;
      });
      await processActivity(true);
      return { ok: true };
    }

    if (request.type === "RESET_STATE") {
      await store.reset();
      return { ok: true };
    }

    if (request.type === "EXPORT_DATA") {
      await processActivity(true);
      return { ok: true, data: exportState(await store.get()) };
    }

    if (request.type === "IMPORT_DATA") {
      const imported = importState(request.json);
      await store.write(imported);
      await processActivity(true);
      return { ok: true };
    }

    return { ok: false, error: "Unknown request" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected extension error" };
  }
};

export const initializeState = async () => {
  const state = await store.get();
  if (state.version !== 1) await store.write(createDefaultState());
};
