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
