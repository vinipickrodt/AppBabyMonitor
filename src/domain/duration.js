const MAX_DURATION_MINUTES = 1440;

export function parseDurationToMinutes(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return null;
  }

  if (/^\d+$/.test(normalizedValue)) {
    return validateDuration(Number(normalizedValue));
  }

  const match = normalizedValue.match(/^(\d{1,2}):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return validateDuration(hours * 60 + minutes);
}

export function parseDurationPartsToMinutes(hoursValue, minutesValue) {
  const hours = normalizePart(hoursValue);
  const minutes = normalizePart(minutesValue);

  if (hours === null || minutes === null || minutes > 59) {
    return null;
  }

  return validateDuration(hours * 60 + minutes);
}

function normalizePart(value) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return 0;
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  return Number(normalizedValue);
}

function validateDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > MAX_DURATION_MINUTES) {
    return null;
  }

  return Math.round(minutes);
}
