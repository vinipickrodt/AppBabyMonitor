import {
  DURATION_EVENT_TYPES,
  EVENT_TYPES,
  createBabyEvent,
  getCurrentFeedingSide,
  isValidFeedingSide,
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
    const startedAt = now.toISOString();
    const activeRecord = {
      type,
      startedAt,
      details: this.createActiveDetails(type, details, startedAt)
    };

    await this.repository.setActiveRecord(type, activeRecord);
    return { ...activeRecords, [type]: activeRecord };
  }

  async switchFeedingSide(side, now = new Date()) {
    this.ensureFeedingSide(side);
    const activeRecords = await this.repository.getActiveRecords();
    const activeRecord = activeRecords[EVENT_TYPES.FEEDING];

    if (!activeRecord) {
      return null;
    }

    const currentSide = getCurrentFeedingSide(activeRecord);

    if (currentSide === side) {
      return activeRecord;
    }

    const switchedAt = now.toISOString();
    const existingSegments = activeRecord.details?.feedingSegments || [];
    const nextSegments = existingSegments.map((segment, index) => {
      const isLastOpenSegment = index === existingSegments.length - 1 && !segment.endedAt;

      if (!isLastOpenSegment) {
        return segment;
      }

      return {
        ...segment,
        endedAt: switchedAt,
        durationMinutes: Math.max(1, Math.round((now - new Date(segment.startedAt)) / 60000))
      };
    });

    nextSegments.push({
      side,
      startedAt: switchedAt
    });

    const nextActiveRecord = {
      ...activeRecord,
      details: {
        ...activeRecord.details,
        feedingSegments: nextSegments
      }
    };

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
    await this.repository.clearActiveRecord(type);

    return this.repository.saveEntry(
      createBabyEvent({
        type,
        startedAt: activeRecord.startedAt,
        endedAt: now,
        durationMinutes: minutes,
        notes,
        details
      })
    );
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
      throw new Error("Esse tipo de registro precisa de duracao.");
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

  ensureDurationType(type) {
    if (!DURATION_EVENT_TYPES.includes(type)) {
      throw new Error("Tipo de registro nao aceita inicio e fim.");
    }
  }

  ensureFeedingSide(side) {
    if (!isValidFeedingSide(side)) {
      throw new Error("Selecione um seio valido.");
    }
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

    const endedAt = now.toISOString();
    const segments = details.feedingSegments || [];

    return {
      ...details,
      feedingSegments: segments.map((segment, index) => {
        const isLastOpenSegment = index === segments.length - 1 && !segment.endedAt;

        if (!isLastOpenSegment) {
          return segment;
        }

        return {
          ...segment,
          endedAt,
          durationMinutes: Math.max(1, Math.round((now - new Date(segment.startedAt)) / 60000))
        };
      })
    };
  }
}
