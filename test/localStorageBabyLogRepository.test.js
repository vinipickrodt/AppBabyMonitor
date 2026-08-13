import test from "node:test";
import assert from "node:assert/strict";
import { LocalStorageBabyLogRepository } from "../src/services/storage/LocalStorageBabyLogRepository.js";

const ENTRIES_KEY = "baby-monitor.entries";
const ACTIVE_SLEEP_KEY = "baby-monitor.activeSleep";
const ACTIVE_RECORDS_KEY = "baby-monitor.activeRecords";
const SCHEMA_VERSION_KEY = "baby-monitor.schemaVersion";

test("LocalStorageBabyLogRepository migra entradas e ativos legados de forma idempotente", async () => {
  const storage = new MemoryStorage();
  storage.setItem(
    ENTRIES_KEY,
    JSON.stringify([
      {
        id: "entry-1",
        type: "sleep",
        status: "completed",
        startedAt: "2026-08-11T09:00:00.000Z",
        endedAt: "2026-08-11T09:30:00.000Z",
        durationMinutes: 999,
        notes: " Cochilo ",
        details: {},
        createdAt: "2026-08-11T09:30:00.000Z"
      },
      {
        id: "entry-2",
        type: "diaper",
        startedAt: "2026-08-11T08:00:00.000Z",
        endedAt: "2026-08-11T08:00:00.000Z",
        details: {
          diaperTypes: ["pee", "poop", "rash"]
        }
      }
    ])
  );
  storage.setItem(
    ACTIVE_RECORDS_KEY,
    JSON.stringify({
      feeding: {
        type: "feeding",
        startedAt: "2026-08-11T10:00:00.000Z",
        details: {
          feedingSegments: []
        }
      }
    })
  );
  storage.setItem(
    ACTIVE_SLEEP_KEY,
    JSON.stringify({
      startedAt: "2026-08-11T11:00:00.000Z"
    })
  );

  const repository = new LocalStorageBabyLogRepository(storage);
  const entries = await repository.listEntries();
  const activeRecords = await repository.getActiveRecords();

  assert.equal(storage.getItem(SCHEMA_VERSION_KEY), "1");
  assert.deepEqual(entries[0], {
    id: "entry-1",
    type: "sleep",
    status: "completed",
    startedAt: "2026-08-11T09:00:00.000Z",
    endedAt: "2026-08-11T09:30:00.000Z",
    durationMinutes: 30,
    notes: "Cochilo",
    details: {},
    createdAt: "2026-08-11T09:30:00.000Z",
    babyId: null,
    createdBy: null,
    updatedAt: "2026-08-11T09:30:00.000Z",
    version: 1
  });
  assert.deepEqual(entries[1].details, {
    diaperTypes: ["pee", "poop", "rash"],
    peeAmount: "normal",
    poopAmount: "normal",
    diaperOptions: ["rash"],
    stoolConsistency: null
  });
  assert.deepEqual(activeRecords, {
    feeding: {
      type: "feeding",
      startedAt: "2026-08-11T10:00:00.000Z",
      status: "active",
      updatedAt: "2026-08-11T10:00:00.000Z",
      version: 1,
      details: {
        feedingSegments: []
      }
    },
    sleep: {
      type: "sleep",
      startedAt: "2026-08-11T11:00:00.000Z",
      status: "active",
      updatedAt: "2026-08-11T11:00:00.000Z",
      version: 1,
      details: {}
    }
  });

  const firstSnapshot = storage.snapshot();
  await repository.listEntries();
  await repository.getActiveRecords();

  assert.deepEqual(storage.snapshot(), firstSnapshot);
});

class MemoryStorage {
  constructor() {
    this.items = new Map();
  }

  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }

  setItem(key, value) {
    this.items.set(key, String(value));
  }

  removeItem(key) {
    this.items.delete(key);
  }

  snapshot() {
    return Object.fromEntries([...this.items.entries()].sort(([left], [right]) => left.localeCompare(right)));
  }
}
