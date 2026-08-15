import { classifyHostname } from "../shared/classifier";
import type { ActiveSegment, ReminderPayload } from "../shared/models";
import { localDateKey, personalDayKey } from "../shared/time";
import { store } from "./signedStore";
import { appendCommittedSegment, evaluateLimits, pruneState, secondsUntilNextLimit } from "./state";

const boundaryAlarmName = "daylight:boundary";

type BrowserContext = {
  hostname: string;
  tabId: number;
  windowId: number;
};

const getBrowserContext = async (): Promise<BrowserContext | null> => {
  const idleState = await chrome.idle.queryState(60);
  if (idleState !== "active") return null;
  const window = await chrome.windows.getLastFocused({ populate: true });
  if (!window.focused || window.type !== "normal" || window.id === undefined) return null;
  const tab = window.tabs?.find((candidate) => candidate.active);
  if (!tab?.id || !tab.url) return null;
  const url = new URL(tab.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return { hostname: url.hostname.replace(/^www\./, ""), tabId: tab.id, windowId: window.id };
};

const showReminder = async (payload: ReminderPayload, tabId: number | undefined) => {
  if (tabId !== undefined) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: "SHOW_REMINDER", payload });
      if (response?.shown === true) return;
      throw new Error("Reminder sheet did not acknowledge delivery");
    } catch {
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
        const response = await chrome.tabs.sendMessage(tabId, { type: "SHOW_REMINDER", payload });
        if (response?.shown === true) return;
      } catch {
        await Promise.resolve();
      }
    }
  }
  await chrome.notifications.create(payload.reminderId, {
    type: "basic",
    title: payload.title,
    message: payload.message,
    iconUrl: chrome.runtime.getURL("favicon.png")
  });
};

const sameContext = (active: ActiveSegment, context: BrowserContext) =>
  active.hostname === context.hostname && active.tabId === context.tabId && active.windowId === context.windowId;

const scheduleBoundaryAlarm = async (delaySeconds: number | null) => {
  if (delaySeconds === null) {
    await chrome.alarms.clear(boundaryAlarmName);
    return;
  }
  await chrome.alarms.create(boundaryAlarmName, { when: Date.now() + Math.max(1, delaySeconds) * 1000 });
};

export const processActivity = async (trustedTransition = false) => {
  let context: BrowserContext | null = null;
  try {
    context = await getBrowserContext();
  } catch {
    context = null;
  }
  const now = Date.now();
  const result = await store.update((state) => {
    if (state.settings.pausedUntil !== null && state.settings.pausedUntil <= now) {
      state.settings.pausedUntil = null;
    }
    const paused = !state.settings.onboardingComplete || state.settings.pausedUntil !== null && state.settings.pausedUntil > now;
    const effectiveContext = paused ? null : context;
    const active = state.activeSegment;
    const nextDayKey = personalDayKey(now, state.settings.dailyResetTime);
    const continues = active && effectiveContext && sameContext(active, effectiveContext);
    const crossesBoundary = active && active.personalDayKey !== nextDayKey;
    const confirmationIsFresh = active ? now - active.lastConfirmedAt <= 70_000 : false;

    if (continues && !crossesBoundary && confirmationIsFresh) {
      active.lastConfirmedAt = now;
    } else {
      if (active) {
        const cappedEnd = Math.min(now, active.lastConfirmedAt + 70_000);
        appendCommittedSegment(state, active, trustedTransition && confirmationIsFresh ? now : cappedEnd);
      }
      state.activeSegment = null;
      if (effectiveContext) {
        state.activeSegment = {
          id: crypto.randomUUID(),
          hostname: effectiveContext.hostname,
          category: classifyHostname(effectiveContext.hostname, state.rules),
          startedAt: now,
          lastConfirmedAt: now,
          tabId: effectiveContext.tabId,
          windowId: effectiveContext.windowId,
          localDate: localDateKey(now),
          personalDayKey: nextDayKey,
          resetTime: state.settings.dailyResetTime
        };
      }
    }

    const reminder = evaluateLimits(state);
    const reminderTabId = active && (!continues || crossesBoundary) ? active.tabId : effectiveContext?.tabId;
    const boundaryDelaySeconds = state.activeSegment ? secondsUntilNextLimit(state) : null;
    pruneState(state);
    return { reminder, tabId: reminderTabId, boundaryDelaySeconds };
  });
  await scheduleBoundaryAlarm(result.boundaryDelaySeconds);
  if (result.reminder) await showReminder(result.reminder, result.tabId);
};
