import type { AppState, CategoryId } from "./models";

export const categoryLabels: Record<CategoryId, string> = {
  social: "Social",
  work: "Work",
  relax: "Relax",
  other: "Other"
};

export const categoryOrder: CategoryId[] = ["social", "work", "relax", "other"];

export const accentOptions = [
  { id: "lavender", label: "Lavender", value: "#8d78c9", soft: "#eee9fb", ink: "#58458b", darkValue: "#b8a8e6", darkSoft: "#342d49", darkInk: "#e2daf8" },
  { id: "sky", label: "Sky", value: "#5e99c9", soft: "#e5f1fa", ink: "#285f8b", darkValue: "#91bfe3", darkSoft: "#253a4b", darkInk: "#d8ecfa" },
  { id: "mint", label: "Mint", value: "#58a786", soft: "#e3f4ec", ink: "#286f55", darkValue: "#82c9aa", darkSoft: "#263e34", darkInk: "#d6f0e4" },
  { id: "peach", label: "Peach", value: "#cb7b5b", soft: "#faebe3", ink: "#8b452c", darkValue: "#e5a086", darkSoft: "#493128", darkInk: "#f8ded3" },
  { id: "rose", label: "Rose", value: "#c76f87", soft: "#fae8ed", ink: "#893c55", darkValue: "#e39bad", darkSoft: "#482b34", darkInk: "#f7dce3" },
  { id: "butter", label: "Butter", value: "#a98a32", soft: "#faf3d6", ink: "#6d5615", darkValue: "#d5bd69", darkSoft: "#423b27", darkInk: "#f6ebc2" }
];

export const moodLabels = ["Very low", "Low", "Neutral", "Good", "Great"];

export const builtInRules: Array<{ pattern: string; category: CategoryId }> = [
  { pattern: "instagram.com", category: "social" },
  { pattern: "facebook.com", category: "social" },
  { pattern: "reddit.com", category: "social" },
  { pattern: "x.com", category: "social" },
  { pattern: "twitter.com", category: "social" },
  { pattern: "linkedin.com", category: "social" },
  { pattern: "github.com", category: "work" },
  { pattern: "notion.so", category: "work" },
  { pattern: "docs.google.com", category: "work" },
  { pattern: "slack.com", category: "work" },
  { pattern: "figma.com", category: "work" },
  { pattern: "netflix.com", category: "relax" },
  { pattern: "youtube.com", category: "relax" },
  { pattern: "twitch.tv", category: "relax" },
  { pattern: "open.spotify.com", category: "relax" }
];

export const createDefaultState = (): AppState => ({
  version: 1,
  settings: {
    dailyResetTime: "00:00",
    dayEndReminderTime: "20:00",
    breakDurationMinutes: 5,
    theme: "system",
    accent: "lavender",
    pausedUntil: null,
    onboardingComplete: false,
    retentionDays: 90
  },
  rules: [],
  limits: [],
  segments: [],
  reminders: [],
  moods: [],
  reflections: [],
  activeSegment: null
});
