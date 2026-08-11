const ENTRIES_KEY = "baby-monitor.entries";
const ACTIVE_SLEEP_KEY = "baby-monitor.activeSleep";
const ACTIVE_RECORDS_KEY = "baby-monitor.activeRecords";

export class LocalStorageBabyLogRepository {
  constructor(storage) {
    this.storage = storage;
  }

  async listEntries() {
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
    this.writeJson(
      ENTRIES_KEY,
      entries.filter((entry) => entry.id !== id)
    );
  }

  async getActiveRecords() {
    const activeRecords = this.readJson(ACTIVE_RECORDS_KEY, {});
    const legacyActiveSleep = this.readJson(ACTIVE_SLEEP_KEY, null);

    if (legacyActiveSleep && !activeRecords.sleep) {
      activeRecords.sleep = {
        type: "sleep",
        startedAt: legacyActiveSleep.startedAt
      };
    }

    return activeRecords;
  }

  async setActiveRecord(type, activeRecord) {
    const activeRecords = await this.getActiveRecords();
    this.writeJson(ACTIVE_RECORDS_KEY, {
      ...activeRecords,
      [type]: activeRecord
    });
  }

  async clearActiveRecord(type) {
    const activeRecords = await this.getActiveRecords();
    delete activeRecords[type];
    this.writeJson(ACTIVE_RECORDS_KEY, activeRecords);

    if (type === "sleep") {
      this.storage.removeItem(ACTIVE_SLEEP_KEY);
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
