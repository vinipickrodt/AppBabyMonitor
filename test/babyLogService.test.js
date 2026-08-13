import test from "node:test";
import assert from "node:assert/strict";
import { BabyLogService } from "../src/services/BabyLogService.js";
import { EVENT_TYPES } from "../src/domain/babyEvents.js";

test("BabyLogService finaliza mamada ativa com segmentos por seio", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.startRecord(
    EVENT_TYPES.FEEDING,
    { details: { feedingSide: "left" } },
    new Date("2026-08-11T10:00:00.000Z")
  );
  await service.switchFeedingSide("right", new Date("2026-08-11T10:10:00.000Z"));
  await service.finishRecord(
    EVENT_TYPES.FEEDING,
    { notes: "Lado esquerdo primeiro" },
    new Date("2026-08-11T10:25:00.000Z")
  );

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.activeRecords[EVENT_TYPES.FEEDING], undefined);
  assert.equal(dashboard.entries[0].type, EVENT_TYPES.FEEDING);
  assert.equal(dashboard.entries[0].durationMinutes, 25);
  assert.equal(dashboard.entries[0].notes, "Lado esquerdo primeiro");
  assert.deepEqual(dashboard.entries[0].details.feedingSegments, [
    {
      side: "left",
      startedAt: "2026-08-11T10:00:00.000Z",
      endedAt: "2026-08-11T10:10:00.000Z",
      durationMinutes: 10
    },
    {
      side: "right",
      startedAt: "2026-08-11T10:10:00.000Z",
      endedAt: "2026-08-11T10:25:00.000Z",
      durationMinutes: 15
    }
  ]);
});

test("BabyLogService valida seio ao iniciar mamada", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await assert.rejects(
    () =>
      service.startRecord(
        EVENT_TYPES.FEEDING,
        { details: { feedingSide: "center" } },
        new Date("2026-08-11T10:00:00.000Z")
      ),
    /Selecione um seio válido/
  );
});

test("BabyLogService permite mamada ativa sem seio selecionado", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.startRecord(EVENT_TYPES.FEEDING, {}, new Date("2026-08-11T10:00:00.000Z"));
  await service.finishRecord(EVENT_TYPES.FEEDING, {}, new Date("2026-08-11T10:12:00.000Z"));

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.entries[0].type, EVENT_TYPES.FEEDING);
  assert.equal(dashboard.entries[0].durationMinutes, 12);
  assert.deepEqual(dashboard.entries[0].details.feedingSegments, []);
});

test("BabyLogService cria registros ativos com metadados mínimos", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  const activeRecords = await service.startRecord(
    EVENT_TYPES.FEEDING,
    { details: { feedingSide: "left" } },
    new Date("2026-08-11T10:00:00.000Z")
  );

  assert.deepEqual(activeRecords[EVENT_TYPES.FEEDING], {
    type: EVENT_TYPES.FEEDING,
    startedAt: "2026-08-11T10:00:00.000Z",
    status: "active",
    updatedAt: "2026-08-11T10:00:00.000Z",
    version: 1,
    details: {
      feedingSegments: [
        {
          side: "left",
          startedAt: "2026-08-11T10:00:00.000Z"
        }
      ]
    }
  });
});

test("BabyLogService salva eventos concluídos com metadados futuros", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.addRecordWithDuration(
    EVENT_TYPES.SLEEP,
    30,
    { notes: "Soneca curta" },
    new Date("2026-08-11T10:30:00.000Z")
  );

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.entries[0].status, "completed");
  assert.equal(dashboard.entries[0].babyId, null);
  assert.equal(dashboard.entries[0].createdBy, null);
  assert.equal(dashboard.entries[0].createdAt, "2026-08-11T10:30:00.000Z");
  assert.equal(dashboard.entries[0].updatedAt, "2026-08-11T10:30:00.000Z");
  assert.equal(dashboard.entries[0].version, 1);
});

test("BabyLogService registra sono por duração manual", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.addRecordWithDuration(
    EVENT_TYPES.SLEEP,
    95,
    { notes: "Cochilo da manhã" },
    new Date("2026-08-11T11:35:00.000Z")
  );

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.entries[0].type, EVENT_TYPES.SLEEP);
  assert.equal(dashboard.entries[0].durationMinutes, 95);
  assert.equal(dashboard.entries[0].startedAt, "2026-08-11T10:00:00.000Z");
  assert.equal(dashboard.entries[0].notes, "Cochilo da manhã");
});

test("BabyLogService registra mamada por duração manual com seio", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.addRecordWithDuration(
    EVENT_TYPES.FEEDING,
    18,
    { notes: "Mamada tranquila", details: { feedingSide: "right" } },
    new Date("2026-08-11T12:18:00.000Z")
  );

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.entries[0].type, EVENT_TYPES.FEEDING);
  assert.equal(dashboard.entries[0].durationMinutes, 18);
  assert.deepEqual(dashboard.entries[0].details.feedingSegments, [
    {
      side: "right",
      startedAt: "2026-08-11T12:00:00.000Z",
      endedAt: "2026-08-11T12:18:00.000Z",
      durationMinutes: 18
    }
  ]);
});

test("BabyLogService registra mamada por duração manual sem seio", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.addRecordWithDuration(
    EVENT_TYPES.FEEDING,
    20,
    { notes: "Sem separar por lado" },
    new Date("2026-08-11T12:20:00.000Z")
  );

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.entries[0].type, EVENT_TYPES.FEEDING);
  assert.equal(dashboard.entries[0].durationMinutes, 20);
  assert.deepEqual(dashboard.entries[0].details.feedingSegments, []);
});

test("BabyLogService registra fralda instantânea com notas e opções", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.addInstantRecord(
    EVENT_TYPES.DIAPER,
    {
      notes: "Troca antes do banho",
      details: {
        diaperWeightGrams: 42,
        peeAmount: "high",
        poopAmount: "low",
        diaperOptions: ["leak", "invalid"],
        stoolAppearances: ["yellow_seedy", "watery", "invalid"],
        stoolConsistency: "pasty",
        attentionFlags: ["orange_brick", "red_blood", "invalid"]
      }
    },
    new Date("2026-08-11T12:00:00.000Z")
  );

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.entries[0].type, EVENT_TYPES.DIAPER);
  assert.equal(dashboard.entries[0].durationMinutes, null);
  assert.equal(dashboard.entries[0].notes, "Troca antes do banho");
  assert.deepEqual(dashboard.entries[0].details, {
    diaperContent: "both",
    diaperWeightGrams: 42,
    peeAmount: "high",
    poopAmount: "low",
    diaperOptions: ["leak"],
    stoolAppearances: ["yellow_seedy", "watery"],
    stoolConsistency: "pasty",
    attentionFlags: ["orange_brick", "red_blood"]
  });
});

test("BabyLogService rejeita peso de fralda inválido", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await assert.rejects(
    () =>
      service.addInstantRecord(
        EVENT_TYPES.DIAPER,
        { details: { diaperContent: "pee", diaperWeightGrams: -1 } },
        new Date("2026-08-11T12:00:00.000Z")
      ),
    /peso da fralda/
  );
});

test("BabyLogService pausa e retoma mamada preservando segmentos", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.startRecord(
    EVENT_TYPES.FEEDING,
    { details: { feedingSide: "left" } },
    new Date("2026-08-11T10:00:00.000Z")
  );

  await service.pauseRecord(EVENT_TYPES.FEEDING, new Date("2026-08-11T10:12:00.000Z"));
  await service.resumeRecord(EVENT_TYPES.FEEDING, {}, new Date("2026-08-11T10:20:00.000Z"));
  await service.finishRecord(EVENT_TYPES.FEEDING, {}, new Date("2026-08-11T10:35:00.000Z"));

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.entries[0].durationMinutes, 35);
  assert.deepEqual(dashboard.entries[0].details.feedingSegments, [
    {
      side: "left",
      startedAt: "2026-08-11T10:00:00.000Z",
      endedAt: "2026-08-11T10:12:00.000Z",
      durationMinutes: 12
    },
    {
      side: "left",
      startedAt: "2026-08-11T10:20:00.000Z",
      endedAt: "2026-08-11T10:35:00.000Z",
      durationMinutes: 15
    }
  ]);
});

test("BabyLogService rejeita fralda sem escolha de conteúdo", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await assert.rejects(
    () =>
      service.addInstantRecord(
        EVENT_TYPES.DIAPER,
        { details: { diaperWeightGrams: 42 } },
        new Date("2026-08-11T12:00:00.000Z")
      ),
    /conteúdo da fralda/
  );
});

test("BabyLogService encerra sono ao iniciar mamada e mantém apenas um ativo", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.startRecord(EVENT_TYPES.SLEEP, {}, new Date("2026-08-11T10:00:00.000Z"));
  await service.startRecord(
    EVENT_TYPES.FEEDING,
    { details: { feedingSide: "left" } },
    new Date("2026-08-11T10:12:00.000Z")
  );

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.activeRecords[EVENT_TYPES.SLEEP], undefined);
  assert.equal(dashboard.activeRecords[EVENT_TYPES.FEEDING].startedAt, "2026-08-11T10:12:00.000Z");
  assert.equal(dashboard.entries[0].type, EVENT_TYPES.SLEEP);
  assert.equal(dashboard.entries[0].durationMinutes, 12);
});

test("BabyLogService remove e restaura entrada recente", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.addInstantRecord(
    EVENT_TYPES.DIAPER,
    {
      details: {
        diaperContent: "pee"
      }
    },
    new Date("2026-08-11T12:00:00.000Z")
  );

  const initialDashboard = await service.getDashboard();
  const removedEntry = await service.removeEntry(initialDashboard.entries[0].id);

  assert.equal(removedEntry.id, initialDashboard.entries[0].id);

  await service.restoreEntry(removedEntry);

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.entries.length, 1);
  assert.equal(dashboard.entries[0].id, initialDashboard.entries[0].id);
});

class MemoryBabyLogRepository {
  constructor() {
    this.entries = [];
    this.activeRecords = {};
  }

  async listEntries() {
    return this.entries;
  }

  async saveEntry(entry) {
    this.entries = [entry, ...this.entries.filter((item) => item.id !== entry.id)];
    return entry;
  }

  async removeEntry(id) {
    const removed = this.entries.find((entry) => entry.id === id) || null;
    this.entries = this.entries.filter((entry) => entry.id !== id);
    return removed;
  }

  async getActiveRecords() {
    return this.activeRecords;
  }

  async setActiveRecord(type, activeRecord) {
    this.activeRecords = {
      ...this.activeRecords,
      [type]: activeRecord
    };
  }

  async replaceState({ entries = null, activeRecords = null } = {}) {
    if (entries !== null) {
      this.entries = entries;
    }

    if (activeRecords !== null) {
      this.activeRecords = activeRecords;
    }
  }

  async clearActiveRecord(type) {
    delete this.activeRecords[type];
  }
}
