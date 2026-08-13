import { EVENT_TYPES, getEventDate, getEventDurationMinutes, isToday } from "./babyEvents.js";

export function getTodayStats(entries, now = new Date()) {
  const todayEntries = entries.filter((entry) => isToday(getEventDate(entry), now));

  return {
    feedings: todayEntries.filter((entry) => entry.type === EVENT_TYPES.FEEDING).length,
    diapers: todayEntries.filter((entry) => entry.type === EVENT_TYPES.DIAPER).length,
    sleepMinutes: todayEntries
      .filter((entry) => entry.type === EVENT_TYPES.SLEEP)
      .reduce((total, entry) => total + getEventDurationMinutes(entry), 0)
  };
}

export function formatSleepDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}min`;
  }

  return `${hours}h ${String(remainingMinutes).padStart(2, "0")}min`;
}

export function formatElapsedDuration(startedAt, now = new Date()) {
  const elapsedMs = new Date(now) - new Date(startedAt);
  const totalSeconds = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs / 1000)) : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}min ${String(seconds).padStart(2, "0")}s`;
  }

  if (minutes > 0) {
    return `${minutes}min ${String(seconds).padStart(2, "0")}s`;
  }

  return `${seconds}s`;
}
