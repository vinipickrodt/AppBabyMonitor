import { EVENT_TYPES, FEEDING_SIDES, getCurrentFeedingSide, getFeedingSideTotals } from "../domain/babyEvents.js";
import { formatElapsedDuration, formatSleepDuration } from "../domain/stats.js";
import { createElement, formatTime } from "../ui/dom.js";
import { createIcon } from "../ui/icons.js";

const TYPE_LABELS = {
  [EVENT_TYPES.FEEDING]: "Mamada ativa",
  [EVENT_TYPES.SLEEP]: "Sono ativo"
};

export function renderActiveSessionCard(activeRecords, { now = new Date(), onOpenSheet } = {}) {
  const feedingRecord = activeRecords?.[EVENT_TYPES.FEEDING];
  const sleepRecord = activeRecords?.[EVENT_TYPES.SLEEP];
  const activeRecord = feedingRecord || sleepRecord;

  if (!activeRecord) {
    return document.createDocumentFragment();
  }

  const type = feedingRecord ? EVENT_TYPES.FEEDING : EVENT_TYPES.SLEEP;
  const title = TYPE_LABELS[type];
  const durationLabel = formatElapsedDuration(activeRecord.startedAt, now);
  const startLabel = formatTime(activeRecord.startedAt);
  const buttonLabel = type === EVENT_TYPES.SLEEP ? "Finalizar sono" : "Finalizar mamada";

  return createElement("button", {
    className: `active-session-card active-session-card--${type}`,
    attributes: {
      type: "button",
      "data-active-session": "true",
      "data-active-session-type": type,
      "aria-label": `${title}, iniciada às ${startLabel}. Duração atual ${durationLabel}. Toque para ${
        type === EVENT_TYPES.SLEEP ? "finalizar o sono" : "finalizar a mamada"
      }.`
    },
    events: {
      click: () => onOpenSheet?.({ type, mode: "finish" })
    }
  }, [
    createElement("div", { className: "active-session-card__header" }, [
      createElement("span", { className: "active-session-card__title" }, [
        createIcon(type === EVENT_TYPES.SLEEP ? "moon" : "bottle", "icon icon--badge"),
        createElement("strong", { text: title })
      ]),
      createElement("span", { className: "active-session-card__hint", text: `Iniciada às ${startLabel}` })
    ]),
    createElement("div", { className: "active-session-card__body" }, [
      createElement("div", { className: "active-session-card__duration-row" }, [
        createElement("span", { className: "active-session-card__duration-label", text: "Duração" }),
        createElement("strong", {
          className: "active-session-card__duration",
          attributes: { "data-active-session-duration": "true", "aria-live": "polite", "aria-atomic": "true" },
          text: durationLabel
        })
      ]),
      type === EVENT_TYPES.FEEDING
        ? renderFeedingSummary(activeRecord, now)
        : createElement("p", {
            className: "active-session-card__summary",
            attributes: { "data-active-session-sleep-summary": "true" },
            text: `Dormindo há ${durationLabel}`
          })
    ]),
    createElement("div", { className: "active-session-card__footer" }, [
      createElement("span", { className: "active-session-card__footer-label", text: "Abrir controles" }),
      createElement("span", { className: "active-session-card__footer-action", attributes: { "data-active-session-footer-action": "true" }, text: buttonLabel })
    ])
  ]);
}

function renderFeedingSummary(activeRecord, now) {
  const currentSide = getCurrentFeedingSide(activeRecord);
  const totals = getFeedingSideTotals(activeRecord, now);
  const currentSideLabel = currentSide
    ? FEEDING_SIDES.find((option) => option.value === currentSide)?.label || "Seio não informado"
    : "Sem seio selecionado";

  return createElement("div", { className: "active-session-card__summary" }, [
    createElement("p", {
      className: "active-session-card__summary-line",
      attributes: { "data-active-session-current-side": "true" },
      text: `Seio atual: ${currentSideLabel}`
    }),
    createElement("p", {
      className: "active-session-card__summary-line",
      attributes: { "data-active-session-feeding-totals": "true" },
      text: `Totais: Esquerdo ${formatSleepDuration(totals.left)} · Direito ${formatSleepDuration(totals.right)}`
    })
  ]);
}
