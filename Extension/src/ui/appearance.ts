import { accentOptions } from "../shared/constants";
import type { Settings } from "../shared/models";

export const applyAppearance = (settings: Settings) => {
  const resolvedTheme = settings.theme === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    : settings.theme;
  const accent = accentOptions.find((option) => option.id === settings.accent) ?? accentOptions[0];
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.setProperty("--accent", resolvedTheme === "dark" ? accent.darkValue : accent.value);
  document.documentElement.style.setProperty("--accent-soft", resolvedTheme === "dark" ? accent.darkSoft : accent.soft);
  document.documentElement.style.setProperty("--accent-ink", resolvedTheme === "dark" ? accent.darkInk : accent.ink);
};
