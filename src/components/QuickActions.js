import {
  EVENT_TYPES,
  FEEDING_SIDES,
  getCurrentFeedingSide,
  getFeedingSessionMetrics,
  isFeedingPaused
} from "../domain/babyEvents.js";
import { formatSleepDuration } from "../domain/stats.js";
import { createElement, formatTime } from "../ui/dom.js";
import { createIcon, iconText } from "../ui/icons.js";

export function renderQuickActions({
  activeRecords,
  onStartRecord,
  onStartFeeding,
  onSwitchFeedingSide,
  onPauseFeeding,
  onResumeFeeding,
  onFinishFeeding,
  onFinishRecord,
  onOpenSheet
}) {
  const feedingRecord = activeRecords[EVENT_TYPES.FEEDING];
  const diaperRecord = activeRecords[EVENT_TYPES.DIAPER];
  const sleepRecord = activeRecords[EVENT_TYPES.SLEEP];

  return createElement("section", { className: "quick-actions", attributes: { "aria-label": "Ações rápidas" } }, [
    renderPrimaryAction({
      feedingRecord,
      onStartFeeding,
      onSwitchFeedingSide,
      onPauseFeeding,
      onResumeFeeding,
      onFinishFeeding
    }),
    createElement("div", { className: "quick-actions__secondary-grid" }, [
      renderSecondaryAction({
        type: EVENT_TYPES.DIAPER,
        title: "Registrar fralda",
        description: diaperRecord ? `Em andamento desde ${formatTime(diaperRecord.startedAt)}` : "Anotar troca ou observação rápida.",
        icon: "diaper",
        activeRecord: diaperRecord,
        onStartRecord,
        onFinishRecord,
        onOpenSheet
      }),
      renderSecondaryAction({
        type: EVENT_TYPES.SLEEP,
        title: "Iniciar sono",
        description: sleepRecord ? `Sono ativo desde ${formatTime(sleepRecord.startedAt)}` : "Começar cronômetro.",
        icon: "moon",
        activeRecord: sleepRecord,
        onStartRecord,
        onFinishRecord,
        onOpenSheet
      })
    ]),
    createElement("button", {
      className: "inline-link-button quick-actions__manual",
      attributes: { type: "button" },
      events: { click: () => onOpenSheet({ type: EVENT_TYPES.FEEDING, mode: "duration" }) }
    }, [iconText("edit", "Registro manual")])
  ]);
}

function renderPrimaryAction({
  feedingRecord,
  onStartFeeding,
  onSwitchFeedingSide,
  onPauseFeeding,
  onResumeFeeding,
  onFinishFeeding
}) {
  if (!feedingRecord) {
    return createElement("article", { className: "quick-actions__card quick-actions__card--primary" }, [
      createElement("div", { className: "quick-actions__header" }, [
        createElement("span", { className: "quick-actions__title" }, [
          createIcon("bottle", "icon icon--badge"),
          createElement("strong", { text: "Iniciar mamada" })
        ]),
        createElement("span", { className: "quick-actions__description", text: "Escolha o lado e comece em um toque." })
      ]),
      createElement("div", { className: "quick-actions__button-row" }, [
        ...FEEDING_SIDES.map((option) =>
          createElement("button", {
            className: "secondary-button secondary-button--start",
            attributes: { type: "button" },
            events: { click: () => onStartFeeding(option.value) }
          }, [iconText(option.value === "left" ? "left" : "right", option.label)])
        )
      ])
    ]);
  }

  const metrics = getFeedingSessionMetrics(feedingRecord);
  const currentSide = getCurrentFeedingSide(feedingRecord);
  const paused = isFeedingPaused(feedingRecord);
  const currentSideLabel = currentSide
    ? FEEDING_SIDES.find((option) => option.value === currentSide)?.label || "Seio não informado"
    : metrics.lastSide
      ? FEEDING_SIDES.find((option) => option.value === metrics.lastSide)?.label || "Seio não informado"
      : "Sem seio selecionado";
  const pauseLabel = paused ? "Retomar mamada" : "Pausar mamada";
  const pauseIcon = paused ? "play" : "pause";

  return createElement("article", { className: "quick-actions__card quick-actions__card--primary" }, [
    createElement("div", { className: "quick-actions__header" }, [
      createElement("span", { className: "quick-actions__title" }, [
        createIcon("bottle", "icon icon--badge"),
        createElement("strong", { text: paused ? "Mamada pausada" : "Mamada em andamento" })
      ]),
      createElement("span", { className: "quick-actions__description", text: `Iniciada às ${formatTime(feedingRecord.startedAt)}` })
    ]),
    createElement("p", {
      className: "quick-actions__status",
      text: paused
        ? `Pausa ativa · retome em um lado para continuar`
        : `${currentSideLabel} · sessão ${formatSleepDuration(metrics.sessionMinutes)} · efetivo ${formatSleepDuration(metrics.effectiveMinutes)}`
    }),
    createElement("div", { className: "quick-actions__button-row" }, [
      ...FEEDING_SIDES.map((option) =>
        createElement("button", {
          className: currentSide === option.value ? "secondary-button secondary-button--selected" : "secondary-button",
          attributes:
            currentSide === option.value && !paused
              ? { type: "button", disabled: "true" }
              : { type: "button" },
          events: { click: () => onSwitchFeedingSide(option.value) }
        }, [iconText(option.value === "left" ? "left" : "right", paused ? `Retomar ${option.label}` : option.label)])
      ),
      createElement("button", {
        className: paused ? "secondary-button secondary-button--selected" : "action-button action-button--active",
        attributes: { type: "button" },
        events: { click: () => (paused ? onResumeFeeding() : onPauseFeeding()) }
      }, [iconText(pauseIcon, pauseLabel)]),
      createElement("button", {
        className: "action-button action-button--active",
        attributes: { type: "button" },
        events: { click: () => onFinishFeeding() }
      }, [iconText("stop", "Finalizar mamada")])
    ])
  ]);
}

function renderSecondaryAction({ type, title, description, icon, activeRecord, onStartRecord, onFinishRecord, onOpenSheet }) {
  const isSleep = type === EVENT_TYPES.SLEEP;
  const isDiaper = type === EVENT_TYPES.DIAPER;
  const active = Boolean(activeRecord);
  const displayTitle = isSleep && active ? "Sono em andamento" : title;
  const label = active && isSleep ? "Acordar agora" : isDiaper ? "Registrar fralda" : title;
  const iconName = active && isSleep ? "stop" : isDiaper ? "plus" : "play";

  return createElement("article", { className: "quick-actions__card quick-actions__card--secondary" }, [
    createElement("div", { className: "quick-actions__header" }, [
      createElement("span", { className: "quick-actions__title" }, [
        createIcon(icon, "icon icon--badge"),
        createElement("strong", { text: displayTitle })
      ]),
      createElement("span", { className: "quick-actions__description", text: description })
    ]),
    createElement("button", {
      className: active ? "action-button action-button--active" : "action-button action-button--secondary",
      attributes: { type: "button" },
      events: {
        click: () => {
          if (isSleep && active) {
            onFinishRecord(type);
            return;
          }

          if (isDiaper) {
            onOpenSheet({ type, mode: "instant" });
            return;
          }

          onStartRecord(type);
        }
      }
    }, [iconText(iconName, label)])
  ]);
}
