const pad = (value: number) => String(value).padStart(2, "0");

export const localDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseResetTime = (resetTime: string) => {
  const [hours, minutes] = resetTime.split(":").map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
};

export const personalDayKey = (timestamp: number, resetTime: string) => {
  const date = new Date(timestamp);
  const { hours, minutes } = parseResetTime(resetTime);
  const boundary = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
  if (date.getTime() < boundary.getTime()) {
    boundary.setDate(boundary.getDate() - 1);
  }
  return localDateKey(boundary.getTime());
};

export const boundaryAfter = (timestamp: number, resetTime: string) => {
  const date = new Date(timestamp);
  const { hours, minutes } = parseResetTime(resetTime);
  const boundary = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
  if (boundary.getTime() <= timestamp) {
    boundary.setDate(boundary.getDate() + 1);
  }
  return boundary.getTime();
};

export const shiftDayKey = (key: string, days: number) => {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localDateKey(date.getTime());
};

export const formatDuration = (seconds: number) => {
  const roundedMinutes = Math.round(seconds / 60);
  if (roundedMinutes < 60) {
    return `${roundedMinutes}m`;
  }
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

export const formatClock = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(timestamp);

export const formatDayLabel = (key: string, style: "short" | "long" = "long") => {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    weekday: style === "long" ? "long" : "short",
    month: style === "long" ? "long" : "short",
    day: "numeric"
  }).format(date);
};
