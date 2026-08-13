import {
  BABY_EVENT_VERSION,
  DURATION_EVENT_TYPES,
  EVENT_STATUS,
  EVENT_TYPES,
  createBabyEvent,
  getCurrentFeedingSide,
  getLastFeedingSide,
  isValidFeedingSide,
  isValidDiaperContent,
  sortNewestFirst
} from "../domain/babyEvents.js";

export class BabyLogService {
  constructor(repository) {
    this.repository = repository;
  }

  async getDashboard() {
    const [entries, activeRecords] = await Promise.all([
      this.repository.listEntries(),
      this.repository.getActiveRecords()
    ]);

    return {
      entries: sortNewestFirst(entries),
      activeRecords
    };
  }

  async startRecord(type, { details = {} } = {}, now = new Date()) {
    this.ensureDurationType(type);
    const activeRecords = await this.repository.getActiveRecords();
    const conflictingType = this.getConflictingActiveType(type, activeRecords);
    const startedAt = now.toISOString();
    const activeRecord = {
      type,
      startedAt,
      status: EVENT_STATUS.ACTIVE,
      updatedAt: startedAt,
      version: BABY_EVENT_VERSION,
      details: this.createActiveDetails(type, details, startedAt)
    };

    if (!conflictingType) {
      await this.repository.setActiveRecord(type, activeRecord);
      return { ...activeRecords, [type]: activeRecord };
    }

    const completedRecord = this.buildCompletedActiveRecord(conflictingType, activeRecords[conflictingType], now);
    const nextActiveRecords = {
      ...activeRecords,
      [type]: activeRecord
    };

    delete nextActiveRecords[conflictingType];

    await this.commitState({
      entries: [completedRecord],
      activeRecords: nextActiveRecords
    });

    return nextActiveRecords;
  }

  async pauseRecord(type, now = new Date()) {
    this.ensureFeedingType(type);
    const activeRecords = await this.repository.getActiveRecords();
    const activeRecord = activeRecords[type];

    if (!activeRecord) {
      return null;
    }

    const nextRecord = this.closeOpenFeedingSegment(activeRecord, now);

    if (nextRecord === activeRecord) {
      return activeRecord;
    }

    await this.repository.setActiveRecord(type, nextRecord);
    return nextRecord;
  }

  async resumeRecord(type, { details = {} } = {}, now = new Date()) {
    this.ensureFeedingType(type);
    const activeRecords = await this.repository.getActiveRecords();
    const activeRecord = activeRecords[type];

    if (!activeRecord) {
      return null;
    }

    const nextRecord = this.openFeedingSegment(activeRecord, details.feedingSide, now);

    if (nextRecord === activeRecord) {
      return activeRecord;
    }

    await this.repository.setActiveRecord(type, nextRecord);
    return nextRecord;
  }

  async switchFeedingSide(side, now = new Date()) {
    this.ensureFeedingSide(side);
    const activeRecords = await this.repository.getActiveRecords();
    const activeRecord = activeRecords[EVENT_TYPES.FEEDING];

    if (!activeRecord) {
      return null;
    }

    const currentSide = getCurrentFeedingSide(activeRecord);
    const openSegment = activeRecord.details?.feedingSegments?.findLast((segment) => !segment.endedAt);

    if (currentSide === side && openSegment) {
      return activeRecord;
    }

    const nextActiveRecord = this.openFeedingSegment(
      this.closeOpenFeedingSegment(activeRecord, now),
      side,
      now
    );

    await this.repository.setActiveRecord(EVENT_TYPES.FEEDING, nextActiveRecord);
    return nextActiveRecord;
  }

  async finishRecord(type, { notes = "" } = {}, now = new Date()) {
    this.ensureDurationType(type);
    const activeRecords = await this.repository.getActiveRecords();
    const activeRecord = activeRecords[type];

    if (!activeRecord) {
      return null;
    }

    const minutes = Math.max(1, Math.round((now - new Date(activeRecord.startedAt)) / 60000));
    const details = this.closeActiveDetails(type, activeRecord.details, now);
    const completedEntry = createBabyEvent({
      type,
      startedAt: activeRecord.startedAt,
      endedAt: now,
      durationMinutes: minutes,
      notes,
      details
    });

    const nextActiveRecords = { ...activeRecords };
    delete nextActiveRecords[type];

    await this.commitState({
      entries: [completedEntry],
      activeRecords: nextActiveRecords
    });

    return completedEntry;
  }

  async addRecordWithDuration(type, durationMinutes, { notes = "", details = {} } = {}, now = new Date()) {
    this.ensureDurationType(type);
    const minutes = Math.round(Number(durationMinutes));
    const endedAt = new Date(now);
    const startedAt = new Date(endedAt.getTime() - minutes * 60000);

    return this.repository.saveEntry(
      createBabyEvent({
        type,
        startedAt,
        endedAt,
        durationMinutes: minutes,
        notes,
        details: this.createManualDetails(type, details, startedAt, endedAt, minutes)
      })
    );
  }

  async addInstantRecord(type, { notes = "", details = {} } = {}, now = new Date()) {
    if (type !== EVENT_TYPES.DIAPER) {
      throw new Error("Esse tipo de registro precisa de duração.");
    }

    if (!this.hasValidDiaperSelection(details)) {
      throw new Error("Selecione o conteúdo da fralda.");
    }

    return this.repository.saveEntry(
      createBabyEvent({
        type,
        startedAt: now,
        endedAt: now,
        notes,
        details
      })
    );
  }

  async removeEntry(id) {
    return this.repository.removeEntry(id);
  }

  async restoreEntry(entry) {
    return this.repository.saveEntry(entry);
  }

  ensureDurationType(type) {
    if (!DURATION_EVENT_TYPES.includes(type)) {
      throw new Error("Tipo de registro não aceita início e fim.");
    }
  }

  ensureFeedingSide(side) {
    if (!isValidFeedingSide(side)) {
      throw new Error("Selecione um seio válido.");
    }
  }

  ensureFeedingType(type) {
    if (type !== EVENT_TYPES.FEEDING) {
      throw new Error("Esse fluxo é exclusivo para mamada.");
    }
  }

  hasValidDiaperSelection(details) {
    if (isValidDiaperContent(details.diaperContent)) {
      return true;
    }

    const legacyDiaperTypes = Array.isArray(details.diaperTypes) ? details.diaperTypes : [];
    const peeSelected = (details.peeAmount && details.peeAmount !== "none") || legacyDiaperTypes.includes("pee");
    const poopSelected = (details.poopAmount && details.poopAmount !== "none") || legacyDiaperTypes.includes("poop");

    return Boolean(peeSelected || poopSelected);
  }

  createActiveDetails(type, details, startedAt) {
    if (type !== EVENT_TYPES.FEEDING) {
      return {};
    }

    if (!details.feedingSide) {
      return {
        feedingSegments: []
      };
    }

    this.ensureFeedingSide(details.feedingSide);

    return {
      feedingSegments: [
        {
          side: details.feedingSide,
          startedAt
        }
      ]
    };
  }

  createManualDetails(type, details, startedAt, endedAt, minutes) {
    if (type !== EVENT_TYPES.FEEDING) {
      return details;
    }

    if (!details.feedingSide) {
      return {};
    }

    this.ensureFeedingSide(details.feedingSide);

    return {
      feedingSegments: [
        {
          side: details.feedingSide,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMinutes: minutes
        }
      ]
    };
  }

  closeActiveDetails(type, details = {}, now) {
    if (type !== EVENT_TYPES.FEEDING) {
      return details;
    }

    return this.closeOpenFeedingSegment({ details }, now).details;
  }

  closeOpenFeedingSegment(activeRecord, now) {
    if (!activeRecord) {
      return activeRecord;
    }

    const segments = activeRecord.details?.feedingSegments || [];
    const openIndex = segments.findLastIndex((segment) => !segment.endedAt);

    if (openIndex < 0) {
      return activeRecord;
    }

    const endedAt = now.toISOString();
    const nextSegments = segments.map((segment, index) => {
      if (index !== openIndex) {
        return segment;
      }

      return {
        ...segment,
        endedAt,
        durationMinutes: Math.max(1, Math.round((now - new Date(segment.startedAt)) / 60000))
      };
    });

    return {
      ...activeRecord,
      status: activeRecord.status || EVENT_STATUS.ACTIVE,
      updatedAt: endedAt,
      version: activeRecord.version || BABY_EVENT_VERSION,
      details: {
        ...activeRecord.details,
        feedingSegments: nextSegments
      }
    };
  }

  openFeedingSegment(activeRecord, feedingSide, now) {
    if (!activeRecord) {
      return activeRecord;
    }

    const startedAt = now.toISOString();
    const segments = activeRecord.details?.feedingSegments || [];
    const currentSide = getCurrentFeedingSide(activeRecord);
    const fallbackSide = getLastFeedingSide(activeRecord);
    const nextSide = feedingSide || fallbackSide;

    if (!nextSide) {
      return activeRecord;
    }

    if (segments.findLast((segment) => !segment.endedAt) && currentSide === nextSide) {
      return activeRecord;
    }

    if (!isValidFeedingSide(nextSide)) {
      throw new Error("Selecione um seio válido.");
    }

    return {
      ...activeRecord,
      status: activeRecord.status || EVENT_STATUS.ACTIVE,
      updatedAt: startedAt,
      version: activeRecord.version || BABY_EVENT_VERSION,
      details: {
        ...activeRecord.details,
        feedingSegments: [
          ...segments,
          {
            side: nextSide,
            startedAt
          }
        ]
      }
    };
  }

  async commitState({ entries = [], activeRecords = null } = {}) {
    if (typeof this.repository.replaceState === "function") {
      const existingEntries = entries.length ? await this.repository.listEntries() : null;
      const mergedEntries = existingEntries ? [...entries, ...existingEntries] : null;

      await this.repository.replaceState({
        entries: mergedEntries,
        activeRecords
      });
      return;
    }

    await Promise.all(entries.map((entry) => this.repository.saveEntry(entry)));

    if (activeRecords === null) {
      return;
    }

    const currentActiveRecords = await this.repository.getActiveRecords();
    const currentTypes = new Set(Object.keys(currentActiveRecords));
    const nextTypes = new Set(Object.keys(activeRecords));

    await Promise.all(
      [...currentTypes]
        .filter((type) => !nextTypes.has(type))
        .map((type) => this.repository.clearActiveRecord(type))
    );

    await Promise.all(
      Object.entries(activeRecords).map(([type, record]) => this.repository.setActiveRecord(type, record))
    );
  }

  getConflictingActiveType(nextType, activeRecords) {
    if (nextType === EVENT_TYPES.FEEDING && activeRecords[EVENT_TYPES.SLEEP]) {
      return EVENT_TYPES.SLEEP;
    }

    if (nextType === EVENT_TYPES.SLEEP && activeRecords[EVENT_TYPES.FEEDING]) {
      return EVENT_TYPES.FEEDING;
    }

    return null;
  }

  buildCompletedActiveRecord(type, activeRecord, now) {
    if (!activeRecord) {
      return null;
    }

    const minutes = Math.max(1, Math.round((now - new Date(activeRecord.startedAt)) / 60000));

    if (type === EVENT_TYPES.FEEDING) {
      return createBabyEvent({
        type,
        startedAt: activeRecord.startedAt,
        endedAt: now,
        durationMinutes: minutes,
        notes: "",
        details: this.closeActiveDetails(type, activeRecord.details, now)
      });
    }

    return createBabyEvent({
      type,
      startedAt: activeRecord.startedAt,
      endedAt: now,
      durationMinutes: minutes,
      notes: "",
      details: {}
    });
  }
}
