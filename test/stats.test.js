import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_TYPES } from "../src/domain/babyEvents.js";
import { formatElapsedDuration, formatSleepDuration, getTodayStats } from "../src/domain/stats.js";

test("getTodayStats soma apenas registros do dia", () => {
  const now = new Date("2026-08-11T12:00:00.000Z");
  const entries = [
    event("1", EVENT_TYPES.FEEDING, 25, "2026-08-11T08:00:00.000Z"),
    event("2", EVENT_TYPES.DIAPER, null, "2026-08-11T09:00:00.000Z"),
    event("3", EVENT_TYPES.SLEEP, 70, "2026-08-11T10:00:00.000Z"),
    event("4", EVENT_TYPES.SLEEP, 40, "2026-08-10T10:00:00.000Z")
  ];

  assert.deepEqual(getTodayStats(entries, now), {
    feedings: 1,
    diapers: 1,
    sleepMinutes: 70
  });
});

test("formatSleepDuration formata minutos e horas", () => {
  assert.equal(formatSleepDuration(45), "45min");
  assert.equal(formatSleepDuration(125), "2h 05min");
});

test("formatElapsedDuration mostra segundos e hora em andamento", () => {
  const now = new Date("2026-08-11T12:34:56.000Z");

  assert.equal(formatElapsedDuration("2026-08-11T12:34:51.000Z", now), "5s");
  assert.equal(formatElapsedDuration("2026-08-11T12:33:51.000Z", now), "1min 05s");
  assert.equal(formatElapsedDuration("2026-08-11T10:32:51.000Z", now), "2h 02min 05s");
});

function event(id, type, durationMinutes, createdAt) {
  return {
    id,
    type,
    status: "completed",
    startedAt: createdAt,
    endedAt: createdAt,
    durationMinutes,
    notes: ""
  };
}
