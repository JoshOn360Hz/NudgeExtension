export type CategoryId = "social" | "work" | "relax" | "other";

export type ThemeMode = "light" | "dark" | "system";

export type Settings = {
  dailyResetTime: string;
  dayEndReminderTime: string;
  breakDurationMinutes: number;
  theme: ThemeMode;
  accent: string;
  pausedUntil: number | null;
  onboardingComplete: boolean;
  retentionDays: 30 | 90 | 180 | 0;
};

export type DomainRule = {
  id: string;
  pattern: string;
  matchType: "exact" | "domain" | "subdomainWildcard";
  category: CategoryId;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DailyLimit = {
  id: string;
  scope: "site" | "category" | "overall";
  target: string | CategoryId | null;
  seconds: number;
  enabled: boolean;
  repeatAfterSeconds: number | null;
  createdAt: number;
  updatedAt: number;
};

export type DailyLimitInput = Omit<DailyLimit, "id" | "createdAt" | "updatedAt"> & { id?: string };

export type ActivitySegment = {
  id: string;
  hostname: string;
  category: CategoryId;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  localDate: string;
  personalDayKey: string;
  resetTime: string;
  timezoneOffsetMinutes: number;
};

export type ActiveSegment = {
  id: string;
  hostname: string;
  category: CategoryId;
  startedAt: number;
  lastConfirmedAt: number;
  tabId: number;
  windowId: number;
  localDate: string;
  personalDayKey: string;
  resetTime: string;
};

export type ReminderResponse = "break" | "snooze" | "continue" | "dismissed";

export type ReminderEvent = {
  id: string;
  limitIds: string[];
  personalDayKey: string;
  triggeredAt: number;
  response: ReminderResponse | null;
  snoozedUntil: number | null;
  moodEntryId: string | null;
};

export type MoodEntry = {
  id: string;
  source: "limit" | "manual";
  score: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  note: string | null;
  recordedAt: number;
  personalDayKey: string;
  relatedReminderId: string | null;
};

export type DailyReflection = {
  personalDayKey: string;
  score: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  note: string | null;
  createdAt: number;
  updatedAt: number;
};

export type AppState = {
  version: 1;
  settings: Settings;
  rules: DomainRule[];
  limits: DailyLimit[];
  segments: ActivitySegment[];
  reminders: ReminderEvent[];
  moods: MoodEntry[];
  reflections: DailyReflection[];
  activeSegment: ActiveSegment | null;
};

export type CategoryTotals = Record<CategoryId, number>;

export type DaySummary = {
  personalDayKey: string;
  totalSeconds: number;
  categoryTotals: CategoryTotals;
  segments: ActivitySegment[];
  moods: MoodEntry[];
  reflection: DailyReflection | null;
};

export type DashboardSnapshot = {
  settings: Settings;
  rules: DomainRule[];
  limits: DailyLimit[];
  today: DaySummary;
  days: DaySummary[];
  trackingActive: boolean;
};

export type ReminderPayload = {
  reminderId: string;
  limitIds: string[];
  title: string;
  message: string;
  breakDurationMinutes: number;
};

export type ExtensionRequest =
  | { type: "GET_DASHBOARD"; days?: number; sync?: boolean }
  | { type: "GET_DAY"; personalDayKey: string }
  | { type: "SAVE_SETTINGS"; settings: Partial<Settings> }
  | { type: "COMPLETE_ONBOARDING"; settings: Partial<Settings>; limits: DailyLimitInput[] }
  | { type: "SAVE_LIMIT"; limit: DailyLimitInput }
  | { type: "DELETE_LIMIT"; id: string }
  | { type: "SAVE_RULE"; rule: Omit<DomainRule, "id" | "createdAt" | "updatedAt"> & { id?: string } }
  | { type: "DELETE_RULE"; id: string }
  | { type: "SAVE_MOOD"; score: 1 | 2 | 3 | 4 | 5; tags: string[]; note: string | null }
  | { type: "SAVE_REFLECTION"; personalDayKey: string; score: 1 | 2 | 3 | 4 | 5; tags: string[]; note: string | null }
  | { type: "REMINDER_RESPONSE"; reminderId: string; response: ReminderResponse; moodScore?: 1 | 2 | 3 | 4 | 5 }
  | { type: "PAUSE_TRACKING"; until: number | null }
  | { type: "RESUME_TRACKING" }
  | { type: "DELETE_ALL_DATA" }
  | { type: "RESET_STATE" }
  | { type: "EXPORT_DATA" }
  | { type: "IMPORT_DATA"; json: string };

export type ExtensionResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};
