import {
  EVENT_TYPES,
  FEEDING_SIDES,
  getCurrentFeedingSide,
  getFeedingSessionMetrics,
  isFeedingPaused
} from "../domain/babyEvents.js";
import { formatElapsedDuration, formatSleepDuration } from "../domain/stats.js";
import { createElement, formatTime } from "../ui/dom.js";
import { createIcon, iconText } from "../ui/icons.js";

const TYPE_LABELS = {
  [EVENT_TYPES.FEEDING]: "Mamada ativa",
  [EVENT_TYPES.SLEEP]: "Sono ativo"
};

export function renderActiveSessionCard(
  activeRecords,
  { now = new Date(), onFinishRecord, onPauseFeeding, onResumeFeeding, onSwitchFeedingSide } = {}
) {
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

  if (type === EVENT_TYPES.SLEEP) {
    return createElement("article", {
      className: "active-session-card active-session-card--sleep",
      attributes: {
        "data-active-session": "true",
        "data-active-session-type": type,
        "aria-label": `${title}, iniciada às ${startLabel}. Duração atual ${durationLabel}.`
      }
    }, [
      createElement("div", { className: "active-session-card__header" }, [
        createElement("span", { className: "active-session-card__title" }, [
          createIcon("moon", "icon icon--badge"),
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
        createElement("p", {
          className: "active-session-card__summary",
          attributes: { "data-active-session-sleep-summary": "true" },
          text: `Dormindo há ${durationLabel}`
        })
      ]),
      createElement("button", {
        className: "action-button action-button--active active-session-card__primary-action",
        attributes: { type: "button" },
        events: { click: () => onFinishRecord?.(EVENT_TYPES.SLEEP) }
      }, [iconText("stop", "Acordou")])
    ]);
  }

  const metrics = getFeedingSessionMetrics(activeRecord, now);
  const currentSide = getCurrentFeedingSide(activeRecord);
  const paused = isFeedingPaused(activeRecord);
  const currentSideLabel = currentSide
    ? FEEDING_SIDES.find((option) => option.value === currentSide)?.label || "Seio não informado"
    : metrics.lastSide
      ? FEEDING_SIDES.find((option) => option.value === metrics.lastSide)?.label || "Seio não informado"
      : "Sem seio selecionado";

  return createElement("article", {
    className: "active-session-card active-session-card--feeding",
    attributes: {
      "data-active-session": "true",
      "data-active-session-type": type,
      "aria-label": `${title}, iniciada às ${startLabel}. Duração atual ${durationLabel}. Controles para pausar, trocar lado ou finalizar.`
    }
  }, [
    createElement("div", { className: "active-session-card__header" }, [
      createElement("span", { className: "active-session-card__title" }, [
        createIcon("bottle", "icon icon--badge"),
        createElement("strong", { text: paused ? "Mamada pausada" : title })
      ]),
      createElement("span", { className: "active-session-card__hint", text: `Iniciada às ${startLabel}` })
    ]),
    createElement("div", { className: "active-session-card__body" }, [
      createElement("div", { className: "active-session-card__duration-row" }, [
        createElement("span", { className: "active-session-card__duration-label", text: "Sessão" }),
        createElement("strong", {
          className: "active-session-card__duration",
          attributes: { "data-active-session-duration": "true", "aria-live": "polite", "aria-atomic": "true" },
          text: durationLabel
        })
      ]),
      createElement("p", {
        className: "active-session-card__summary-line",
        attributes: { "data-active-session-feed-effective": "true" },
        text: `Tempo efetivo: ${formatSleepDuration(metrics.effectiveMinutes)}`
      }),
      createElement("p", {
        className: "active-session-card__summary-line",
        attributes: { "data-active-session-current-side": "true" },
        text: paused ? `Pausada · retome em um lado para continuar` : `Seio atual: ${currentSideLabel}`
      }),
      createElement("p", {
        className: "active-session-card__summary-line",
        attributes: { "data-active-session-feeding-totals": "true" },
        text: `Totais: Esquerdo ${formatSleepDuration(metrics.sideTotals.left)} · Direito ${formatSleepDuration(metrics.sideTotals.right)}`
      })
    ]),
    createElement("div", { className: "active-session-card__controls" }, [
      ...FEEDING_SIDES.map((option) =>
        createElement("button", {
          className: currentSide === option.value && !paused ? "secondary-button secondary-button--selected" : "secondary-button",
          attributes:
            currentSide === option.value && !paused
              ? { type: "button", disabled: "true" }
              : { type: "button" },
          events: { click: () => onSwitchFeedingSide?.(option.value) }
        }, [iconText(option.value === "left" ? "left" : "right", paused ? `Retomar ${option.label}` : option.label)])
      ),
      createElement("button", {
        className: paused ? "secondary-button secondary-button--selected" : "action-button action-button--active",
        attributes: { type: "button" },
        events: { click: () => (paused ? onResumeFeeding?.() : onPauseFeeding?.()) }
      }, [iconText(paused ? "play" : "pause", paused ? "Retomar" : "Pausar")]),
      createElement("button", {
        className: "action-button action-button--active",
        attributes: { type: "button" },
        events: { click: () => onFinishRecord?.(EVENT_TYPES.FEEDING) }
      }, [iconText("stop", "Finalizar mamada")])
    ]),
    createElement("div", { className: "active-session-card__footer" }, [
      createElement("span", { className: "active-session-card__footer-label", text: "Ação rápida" }),
      createElement("span", {
        className: "active-session-card__footer-action",
        attributes: { "data-active-session-footer-action": "true" },
        text: paused ? "Retomar ou finalizar" : "Pausar, trocar lado ou finalizar"
      })
    ])
  ]);
}
