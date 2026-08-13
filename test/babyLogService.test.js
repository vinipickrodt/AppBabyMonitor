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
    /Selecione um seio valido/
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

test("BabyLogService cria registros ativos com metadados minimos", async () => {
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

test("BabyLogService salva eventos concluidos com metadados futuros", async () => {
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

test("BabyLogService registra sono por duracao manual", async () => {
  const repository = new MemoryBabyLogRepository();
  const service = new BabyLogService(repository);

  await service.addRecordWithDuration(
    EVENT_TYPES.SLEEP,
    95,
    { notes: "Cochilo da manha" },
    new Date("2026-08-11T11:35:00.000Z")
  );

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.entries[0].type, EVENT_TYPES.SLEEP);
  assert.equal(dashboard.entries[0].durationMinutes, 95);
  assert.equal(dashboard.entries[0].startedAt, "2026-08-11T10:00:00.000Z");
  assert.equal(dashboard.entries[0].notes, "Cochilo da manha");
});

test("BabyLogService registra mamada por duracao manual com seio", async () => {
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

test("BabyLogService registra mamada por duracao manual sem seio", async () => {
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

test("BabyLogService registra fralda instantanea com notas e opcoes", async () => {
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
    attentionFlags: ["orange_brick", "red_blood"]
  });
});

test("BabyLogService rejeita peso de fralda invalido", async () => {
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

test("BabyLogService rejeita fralda sem escolha de conteudo", async () => {
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
    this.entries = this.entries.filter((entry) => entry.id !== id);
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

  async clearActiveRecord(type) {
    delete this.activeRecords[type];
  }
}
