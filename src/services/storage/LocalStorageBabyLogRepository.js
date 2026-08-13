import { BABY_EVENT_VERSION, DURATION_EVENT_TYPES, EVENT_STATUS, EVENT_TYPES } from "../../domain/babyEvents.js";

const ENTRIES_KEY = "baby-monitor.entries";
const ACTIVE_SLEEP_KEY = "baby-monitor.activeSleep";
const ACTIVE_RECORDS_KEY = "baby-monitor.activeRecords";
const SCHEMA_VERSION_KEY = "baby-monitor.schemaVersion";
const LOCAL_SCHEMA_VERSION = 1;

export class LocalStorageBabyLogRepository {
  constructor(storage) {
    this.storage = storage;
    this.migrateSchema();
  }

  async listEntries() {
    this.migrateSchema();
    return this.readJson(ENTRIES_KEY, []);
  }

  async saveEntry(entry) {
    const entries = await this.listEntries();
    const nextEntries = [entry, ...entries.filter((item) => item.id !== entry.id)];
    this.writeJson(ENTRIES_KEY, nextEntries);
    return entry;
  }

  async removeEntry(id) {
    const entries = await this.listEntries();
    const removedEntry = entries.find((entry) => entry.id === id) || null;
    this.writeJson(
      ENTRIES_KEY,
      entries.filter((entry) => entry.id !== id)
    );

    return removedEntry;
  }

  async getActiveRecords() {
    this.migrateSchema();
    return this.readJson(ACTIVE_RECORDS_KEY, {});
  }

  async setActiveRecord(type, activeRecord) {
    const activeRecords = await this.getActiveRecords();
    this.writeJson(ACTIVE_RECORDS_KEY, {
      ...activeRecords,
      [type]: normalizeActiveRecord(activeRecord, type)
    });
  }

  async replaceState({ entries = null, activeRecords = null } = {}) {
    const nextEntries = entries === null ? this.listEntries() : Promise.resolve(entries);
    const nextActiveRecords = activeRecords === null ? this.getActiveRecords() : Promise.resolve(activeRecords);
    const [resolvedEntries, resolvedActiveRecords] = await Promise.all([nextEntries, nextActiveRecords]);

    if (entries !== null) {
      this.writeJson(ENTRIES_KEY, normalizeEntries(resolvedEntries));
    }

    if (activeRecords !== null) {
      this.writeJson(ACTIVE_RECORDS_KEY, normalizeActiveRecords(resolvedActiveRecords));
      this.storage.removeItem(ACTIVE_SLEEP_KEY);
    }
  }

  async clearActiveRecord(type) {
    const activeRecords = await this.getActiveRecords();
    delete activeRecords[type];
    this.writeJson(ACTIVE_RECORDS_KEY, activeRecords);

    if (type === "sleep") {
      this.storage.removeItem(ACTIVE_SLEEP_KEY);
    }
  }

  migrateSchema() {
    const entries = this.readJson(ENTRIES_KEY, []);
    const activeRecords = this.readJson(ACTIVE_RECORDS_KEY, {});
    const legacyActiveSleep = this.readJson(ACTIVE_SLEEP_KEY, null);
    const normalizedEntries = normalizeEntries(entries);
    const normalizedActiveRecords = normalizeActiveRecords(activeRecords, legacyActiveSleep);

    if (!jsonEquals(entries, normalizedEntries)) {
      this.writeJson(ENTRIES_KEY, normalizedEntries);
    }

    if (!jsonEquals(activeRecords, normalizedActiveRecords)) {
      this.writeJson(ACTIVE_RECORDS_KEY, normalizedActiveRecords);
    }

    if (Number(this.storage.getItem(SCHEMA_VERSION_KEY)) !== LOCAL_SCHEMA_VERSION) {
      this.storage.setItem(SCHEMA_VERSION_KEY, String(LOCAL_SCHEMA_VERSION));
    }
  }

  readJson(key, fallback) {
    const rawValue = this.storage.getItem(key);

    if (!rawValue) {
      return fallback;
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      return fallback;
    }
  }

  writeJson(key, value) {
    this.storage.setItem(key, JSON.stringify(value));
  }
}

function normalizeEntries(entries) {
  return Array.isArray(entries) ? entries.map(normalizeStoredEntry).filter(Boolean) : [];
}

function normalizeStoredEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const startedAt = normalizeIsoDate(entry.startedAt) || entry.startedAt;
  const endedAt = normalizeIsoDate(entry.endedAt) || normalizeIsoDate(entry.createdAt) || entry.endedAt || entry.createdAt || startedAt;
  const createdAt = normalizeIsoDate(entry.createdAt) || endedAt || startedAt;
  const updatedAt = normalizeIsoDate(entry.updatedAt) || createdAt;
  const isDurationEvent = DURATION_EVENT_TYPES.includes(entry.type);

  return {
    id: entry.id,
    type: entry.type,
    status: EVENT_STATUS.COMPLETED,
    startedAt,
    endedAt,
    durationMinutes: isDurationEvent ? deriveDurationMinutes(startedAt, endedAt, entry.durationMinutes) : null,
    notes: String(entry.notes || "").trim(),
    details: normalizeStoredDetails(entry.type, entry.details),
    createdAt,
    babyId: entry.babyId ?? null,
    createdBy: entry.createdBy ?? null,
    updatedAt,
    version: normalizeVersion(entry.version)
  };
}

function normalizeActiveRecords(activeRecords, legacyActiveSleep) {
  const normalized = {};
  const records = isPlainObject(activeRecords) ? activeRecords : {};

  Object.entries(records).forEach(([type, activeRecord]) => {
    const normalizedRecord = normalizeActiveRecord(activeRecord, type);

    if (normalizedRecord) {
      normalized[type] = normalizedRecord;
    }
  });

  if (legacyActiveSleep && !normalized.sleep) {
    const normalizedSleep = normalizeActiveRecord(legacyActiveSleep, "sleep");

    if (normalizedSleep) {
      normalized.sleep = normalizedSleep;
    }
  }

  return normalized;
}

function normalizeActiveRecord(activeRecord, fallbackType) {
  if (!activeRecord || typeof activeRecord !== "object") {
    return null;
  }

  const type = activeRecord.type || fallbackType;
  const startedAt = normalizeIsoDate(activeRecord.startedAt) || activeRecord.startedAt;

  if (!type || !startedAt) {
    return null;
  }

  return {
    type,
    startedAt,
    status: EVENT_STATUS.ACTIVE,
    updatedAt: normalizeIsoDate(activeRecord.updatedAt) || startedAt,
    version: normalizeVersion(activeRecord.version),
    details: isPlainObject(activeRecord.details) ? activeRecord.details : {}
  };
}

function normalizeStoredDetails(type, details) {
  if (!isPlainObject(details)) {
    return {};
  }

  if (type !== EVENT_TYPES.DIAPER) {
    return details;
  }

  const legacyDiaperTypes = Array.isArray(details.diaperTypes) ? details.diaperTypes : [];

  return {
    ...details,
    peeAmount: details.peeAmount || (legacyDiaperTypes.includes("pee") ? "normal" : "none"),
    poopAmount: details.poopAmount || (legacyDiaperTypes.includes("poop") ? "normal" : "none"),
    diaperOptions: details.diaperOptions || legacyDiaperTypes.filter((type) => !["pee", "poop"].includes(type)),
    stoolConsistency: details.stoolConsistency || null
  };
}

function deriveDurationMinutes(startedAt, endedAt, fallbackDuration) {
  const started = new Date(startedAt);
  const ended = new Date(endedAt);
  const derived = Math.round((ended - started) / 60000);

  if (Number.isFinite(derived) && derived > 0) {
    return derived;
  }

  const fallback = Number(fallbackDuration);
  return Number.isFinite(fallback) && fallback > 0 ? Math.round(fallback) : null;
}

function normalizeVersion(version) {
  const number = Number(version);
  return Number.isFinite(number) && number > 0 ? number : BABY_EVENT_VERSION;
}

function normalizeIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function jsonEquals(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
