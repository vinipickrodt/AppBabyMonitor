export const EVENT_TYPES = {
  FEEDING: "feeding",
  DIAPER: "diaper",
  SLEEP: "sleep"
};

export const EVENT_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed"
};

export const BABY_EVENT_VERSION = 1;

export const DURATION_EVENT_TYPES = [EVENT_TYPES.FEEDING, EVENT_TYPES.SLEEP];

export const FEEDING_SIDES = [
  { value: "left", label: "Seio esquerdo" },
  { value: "right", label: "Seio direito" }
];

export const DIAPER_CONTENT_OPTIONS = [
  { value: "pee", label: "Xixi" },
  { value: "poop", label: "Cocô" },
  { value: "both", label: "Xixi + cocô" }
];

export const DIAPER_OPTIONS = [
  { value: "leak", label: "Vazou" },
  { value: "cream", label: "Pomada aplicada" },
  { value: "rash", label: "Irritacao/assadura" }
];

export const DIAPER_AMOUNT_OPTIONS = [
  { value: "none", label: "Nao teve" },
  { value: "low", label: "Pouco" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Muito" }
];

export const STOOL_APPEARANCE_OPTIONS = [
  { value: "meconium", label: "Meconio" },
  { value: "yellow_seedy", label: "Amarelo/granulado" },
  { value: "green", label: "Verde" },
  { value: "watery", label: "Muito liquido" },
  { value: "dry_hard", label: "Duro/ressecado" },
  { value: "mucus", label: "Com muco" }
];

export const STOOL_CONSISTENCY_OPTIONS = [
  { value: "liquid", label: "Líquido" },
  { value: "pasty", label: "Pastoso" },
  { value: "grainy", label: "Granuloso" }
];

export const DIAPER_ATTENTION_FLAGS = [
  {
    value: "orange_brick",
    label: "Mancha laranja/tijolo",
    level: "doctor",
    summary: "Pode ocorrer com urina concentrada/cristais de urato, especialmente nos primeiros dias.",
    action: "Observe ingestao e fraldas molhadas; se persistir ou houver pouca urina, fale com o pediatra."
  },
  {
    value: "red_blood",
    label: "Ponto vermelho/sangue",
    level: "urgent",
    summary: "Sangue verdadeiro em urina ou fezes precisa de avaliacao medica.",
    action: "Procure atendimento com urgencia se houver febre, vomitos, prostracao, ma alimentacao ou sangramento importante."
  },
  {
    value: "white_gray_stool",
    label: "Coco branco/cinza/claro",
    level: "doctor",
    summary: "Fezes muito claras podem precisar de avaliacao do pediatra.",
    action: "Entre em contato com o pediatra, especialmente se persistir ou houver pele/olhos amarelados."
  },
  {
    value: "black_after_meconium",
    label: "Coco preto apos meconio",
    level: "doctor",
    summary: "Fezes pretas depois da fase inicial de meconio merecem atencao.",
    action: "Registre foto/horario e fale com o pediatra."
  },
  {
    value: "very_watery_diarrhea",
    label: "Diarreia/muito aguado",
    level: "doctor",
    summary: "Fezes muito liquidas e frequentes podem levar a desidratacao.",
    action: "Procure orientacao, especialmente em bebes pequenos ou com febre."
  },
  {
    value: "very_dry_stool",
    label: "Fezes muito ressecadas",
    level: "observe",
    summary: "Fezes duras ou secas podem sugerir baixa ingestao de liquidos.",
    action: "Observe mamadas, urina e desconforto; converse com o pediatra se persistir."
  },
  {
    value: "low_urine",
    label: "Pouca urina no dia",
    level: "doctor",
    summary: "Poucas fraldas molhadas podem indicar baixa ingestao ou desidratacao.",
    action: "Verifique mamadas e sinais gerais; fale com o pediatra no mesmo dia."
  },
  {
    value: "no_wet_hours",
    label: "Muitas horas sem xixi",
    level: "urgent",
    summary: "Ausencia prolongada de urina pode indicar desidratacao.",
    action: "Procure orientacao medica rapidamente, principalmente se houver boca seca, sonolencia ou ma alimentacao."
  }
];

export function createBabyEvent({
  id = crypto.randomUUID(),
  type,
  startedAt = new Date(),
  endedAt = null,
  notes = "",
  details = {},
  babyId = null,
  createdBy = null,
  updatedAt = null,
  version = BABY_EVENT_VERSION
}) {
  if (!Object.values(EVENT_TYPES).includes(type)) {
    throw new Error(`Tipo de evento invalido: ${type}`);
  }

  const normalizedStartedAt = new Date(startedAt);
  const normalizedEndedAt = endedAt ? new Date(endedAt) : normalizedStartedAt;
  const isDurationEvent = DURATION_EVENT_TYPES.includes(type);
  const normalizedDuration = isDurationEvent
    ? Number(Math.round((normalizedEndedAt - normalizedStartedAt) / 60000))
    : null;
  const createdAt = normalizedEndedAt.toISOString();

  if (isDurationEvent && (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0)) {
    throw new Error("A duracao deve ser maior que zero.");
  }

  return {
    id,
    type,
    status: EVENT_STATUS.COMPLETED,
    startedAt: normalizedStartedAt.toISOString(),
    endedAt: normalizedEndedAt.toISOString(),
    durationMinutes: isDurationEvent ? Math.round(normalizedDuration) : null,
    notes: String(notes || "").trim(),
    details: normalizeDetails(type, details),
    createdAt,
    babyId,
    createdBy,
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : createdAt,
    version
  };
}

export function isToday(isoDate, now = new Date()) {
  const date = new Date(isoDate);

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function sortNewestFirst(entries) {
  return [...entries].sort((a, b) => new Date(getEventDate(b)) - new Date(getEventDate(a)));
}

export function getEventDate(entry) {
  return entry.endedAt || entry.createdAt || entry.startedAt;
}

export function getEventDurationMinutes(entry) {
  return Number(entry.durationMinutes ?? entry.value ?? 0);
}

function normalizeDetails(type, details) {
  if (type === EVENT_TYPES.FEEDING) {
    return {
      feedingSegments: normalizeFeedingSegments(details.feedingSegments)
    };
  }

  if (type === EVENT_TYPES.DIAPER) {
    return normalizeDiaperDetails(details);
  }

  return {};
}

function normalizeDiaperDetails(details) {
  const legacyDiaperTypes = Array.isArray(details.diaperTypes) ? details.diaperTypes : [];
  const diaperContent = normalizeDiaperContent(details.diaperContent, details.peeAmount, details.poopAmount, legacyDiaperTypes);
  const diaperWeightGrams = details.diaperWeightGrams === "" || details.diaperWeightGrams == null
    ? null
    : Math.round(Number(details.diaperWeightGrams));

  if (diaperWeightGrams !== null && (!Number.isFinite(diaperWeightGrams) || diaperWeightGrams < 0)) {
    throw new Error("O peso da fralda deve ser um numero maior ou igual a zero.");
  }

  return {
    ...(diaperContent ? { diaperContent } : {}),
    diaperWeightGrams,
    peeAmount: normalizeOption(details.peeAmount || inferAmount(legacyDiaperTypes, "pee"), DIAPER_AMOUNT_OPTIONS, "none"),
    poopAmount: normalizeOption(details.poopAmount || inferAmount(legacyDiaperTypes, "poop"), DIAPER_AMOUNT_OPTIONS, "none"),
    diaperOptions: normalizeMultiOption(details.diaperOptions || legacyDiaperTypes, DIAPER_OPTIONS),
    stoolAppearances: normalizeMultiOption(details.stoolAppearances, STOOL_APPEARANCE_OPTIONS),
    stoolConsistency: normalizeOption(details.stoolConsistency, STOOL_CONSISTENCY_OPTIONS, null),
    attentionFlags: normalizeMultiOption(details.attentionFlags, DIAPER_ATTENTION_FLAGS)
  };
}

function inferAmount(legacyDiaperTypes, type) {
  return legacyDiaperTypes.includes(type) ? "normal" : "none";
}

function normalizeDiaperContent(diaperContent, peeAmount, poopAmount, legacyDiaperTypes) {
  if (isValidDiaperContent(diaperContent)) {
    return diaperContent;
  }

  const peeSelected = legacyDiaperTypes.includes("pee") || (peeAmount && peeAmount !== "none");
  const poopSelected = legacyDiaperTypes.includes("poop") || (poopAmount && poopAmount !== "none");

  if (peeSelected && poopSelected) {
    return "both";
  }

  if (peeSelected) {
    return "pee";
  }

  if (poopSelected) {
    return "poop";
  }

  return null;
}

function normalizeOption(value, options, fallback) {
  return options.some((option) => option.value === value) ? value : fallback;
}

function normalizeMultiOption(values, options) {
  const allowedValues = new Set(options.map((option) => option.value));

  return Array.isArray(values) ? [...new Set(values)].filter((value) => allowedValues.has(value)) : [];
}

export function isValidFeedingSide(side) {
  return FEEDING_SIDES.some((option) => option.value === side);
}

export function isValidDiaperContent(content) {
  return DIAPER_CONTENT_OPTIONS.some((option) => option.value === content);
}

export function getCurrentFeedingSide(activeRecord) {
  const segments = activeRecord?.details?.feedingSegments || [];
  const currentSegment = segments.findLast((segment) => !segment.endedAt);

  return currentSegment?.side || null;
}

export function getLastFeedingSide(activeRecord) {
  const segments = activeRecord?.details?.feedingSegments || [];
  const lastSegment = segments.at(-1);

  return isValidFeedingSide(lastSegment?.side) ? lastSegment.side : null;
}

export function isFeedingPaused(activeRecord) {
  return Boolean(activeRecord?.status === EVENT_STATUS.ACTIVE && (activeRecord?.details?.feedingSegments || []).length && !getCurrentFeedingSide(activeRecord));
}

export function getFeedingSideTotals(record, now = new Date()) {
  const totals = {
    left: 0,
    right: 0
  };

  (record?.details?.feedingSegments || []).forEach((segment) => {
    if (!isValidFeedingSide(segment.side)) {
      return;
    }

    const minutes = Number(
      segment.durationMinutes ??
        Math.max(0, Math.round((new Date(segment.endedAt || now) - new Date(segment.startedAt)) / 60000))
    );

    totals[segment.side] += Number.isFinite(minutes) ? minutes : 0;
  });

  return totals;
}

export function getFeedingSessionMetrics(record, now = new Date()) {
  const segments = record?.details?.feedingSegments || [];
  const currentSegment = segments.findLast((segment) => !segment.endedAt);
  const lastSegment = segments.at(-1) || null;
  const referenceDate = new Date(record?.endedAt || now);
  const sessionStart = new Date(record?.startedAt || referenceDate);
  const sessionMinutes = Math.max(1, Math.round((referenceDate - sessionStart) / 60000));
  const effectiveMinutes = segments.reduce((total, segment) => {
    if (!isValidFeedingSide(segment.side) || !segment.startedAt) {
      return total;
    }

    const minutes = Number(
      segment.durationMinutes ??
        Math.max(0, Math.round((new Date(segment.endedAt || now) - new Date(segment.startedAt)) / 60000))
    );

    return total + (Number.isFinite(minutes) ? minutes : 0);
  }, 0);

  return {
    currentSide: currentSegment?.side || null,
    lastSide: isValidFeedingSide(lastSegment?.side) ? lastSegment.side : null,
    isPaused: Boolean(record?.status === EVENT_STATUS.ACTIVE && segments.length && !currentSegment),
    sessionMinutes,
    effectiveMinutes,
    sideTotals: getFeedingSideTotals(record, now)
  };
}

function normalizeFeedingSegments(segments) {
  if (!Array.isArray(segments)) {
    return [];
  }

  return segments
    .filter((segment) => isValidFeedingSide(segment.side) && segment.startedAt)
    .map((segment) => {
      const normalized = {
        side: segment.side,
        startedAt: new Date(segment.startedAt).toISOString()
      };

      if (segment.endedAt) {
        normalized.endedAt = new Date(segment.endedAt).toISOString();
      }

      if (Number.isFinite(Number(segment.durationMinutes)) && Number(segment.durationMinutes) > 0) {
        normalized.durationMinutes = Math.round(Number(segment.durationMinutes));
      } else if (normalized.endedAt) {
        normalized.durationMinutes = Math.max(
          1,
          Math.round((new Date(normalized.endedAt) - new Date(normalized.startedAt)) / 60000)
        );
      }

      return normalized;
    });
}
