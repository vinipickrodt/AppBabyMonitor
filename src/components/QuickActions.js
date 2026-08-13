import { EVENT_TYPES, FEEDING_SIDES, getCurrentFeedingSide, getFeedingSideTotals } from "../domain/babyEvents.js";
import { formatSleepDuration } from "../domain/stats.js";
import { createElement, formatTime } from "../ui/dom.js";
import { createIcon, iconText } from "../ui/icons.js";

export function renderQuickActions({ activeRecords, onStartRecord, onSwitchFeedingSide, onOpenSheet }) {
  const feedingRecord = activeRecords[EVENT_TYPES.FEEDING];
  const diaperRecord = activeRecords[EVENT_TYPES.DIAPER];
  const sleepRecord = activeRecords[EVENT_TYPES.SLEEP];

  return createElement("section", { className: "quick-actions", attributes: { "aria-label": "Ações rápidas" } }, [
    renderPrimaryAction(feedingRecord, onStartRecord, onSwitchFeedingSide, onOpenSheet),
    createElement("div", { className: "quick-actions__secondary-grid" }, [
      renderSecondaryAction({
        type: EVENT_TYPES.DIAPER,
        title: "Registrar fralda",
        description: diaperRecord ? `Em andamento desde ${formatTime(diaperRecord.startedAt)}` : "Anotar troca ou observação rápida.",
        icon: "diaper",
        activeRecord: diaperRecord,
        onStartRecord,
        onOpenSheet
      }),
      renderSecondaryAction({
        type: EVENT_TYPES.SLEEP,
        title: "Iniciar sono",
        description: sleepRecord ? `Sono ativo desde ${formatTime(sleepRecord.startedAt)}` : "Começar cronômetro.",
        icon: "moon",
        activeRecord: sleepRecord,
        onStartRecord,
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

function renderPrimaryAction(activeRecord, onStartRecord, onSwitchFeedingSide, onOpenSheet) {
  if (activeRecord) {
    const currentSide = getCurrentFeedingSide(activeRecord);
    const totals = getFeedingSideTotals(activeRecord);
    const segments = activeRecord.details?.feedingSegments || [];
    const currentSegment = segments.findLast((segment) => !segment.endedAt) || segments.at(-1);

    return createElement("article", { className: "quick-actions__card quick-actions__card--primary" }, [
      createElement("div", { className: "quick-actions__header" }, [
        createElement("span", { className: "quick-actions__title" }, [
          createIcon("bottle", "icon icon--badge"),
          createElement("strong", { text: "Mamada em andamento" })
        ]),
        createElement("span", { className: "quick-actions__description", text: `Iniciada às ${formatTime(activeRecord.startedAt)}` })
      ]),
      renderFeedingStatus(activeRecord, currentSide, currentSegment, totals),
      createElement("div", { className: "quick-actions__button-row" }, [
        ...FEEDING_SIDES.map((option) =>
          createElement("button", {
            className: currentSide === option.value ? "secondary-button secondary-button--selected" : "secondary-button",
            attributes:
              currentSide === option.value
                ? { type: "button", disabled: "true" }
                : { type: "button" },
            events: currentSide === option.value ? {} : { click: () => onSwitchFeedingSide(option.value) }
          }, [iconText(option.value === "left" ? "left" : "right", option.value === "left" ? "Esquerdo" : "Direito")])
        ),
        createElement("button", {
          className: "action-button action-button--active",
          attributes: { type: "button" },
          events: { click: () => onOpenSheet({ type: EVENT_TYPES.FEEDING, mode: "finish" }) }
        }, [iconText("stop", "Finalizar mamada")])
      ])
    ]);
  }

  return createElement("article", { className: "quick-actions__card quick-actions__card--primary" }, [
    createElement("div", { className: "quick-actions__header" }, [
      createElement("span", { className: "quick-actions__title" }, [
        createIcon("bottle", "icon icon--badge"),
        createElement("strong", { text: "Iniciar mamada" })
      ]),
      createElement("span", { className: "quick-actions__description", text: "Seio opcional e fluxo direto." })
    ]),
    createElement("p", { className: "quick-actions__status", text: "A ação principal fica sempre pronta aqui." }),
    createElement("button", {
      className: "action-button action-button--primary",
      attributes: { type: "button" },
      events: { click: () => onOpenSheet({ type: EVENT_TYPES.FEEDING, mode: "start" }) }
    }, [iconText("play", "Iniciar mamada")])
  ]);
}

function renderFeedingStatus(activeRecord, currentSide, currentSegment, totals) {
  if (!currentSide) {
    return createElement("p", {
      className: "quick-actions__status",
      text: `Mamada iniciada às ${formatTime(activeRecord.startedAt)} · sem seio selecionado`
    });
  }

  const currentLabel = FEEDING_SIDES.find((option) => option.value === currentSide)?.label || "Seio não informado";

  return createElement("p", {
    className: "quick-actions__status",
    text: `${currentLabel} desde ${formatTime(currentSegment?.startedAt || activeRecord.startedAt)} · E ${formatSleepDuration(
      totals.left
    )} · D ${formatSleepDuration(totals.right)}`
  });
}

function renderSecondaryAction({ type, title, description, icon, activeRecord, onStartRecord, onOpenSheet }) {
  const displayTitle = activeRecord && type === EVENT_TYPES.SLEEP ? "Sono em andamento" : title;
  const label = activeRecord && type === EVENT_TYPES.SLEEP ? "Finalizar sono" : title;
  const iconName = activeRecord && type === EVENT_TYPES.SLEEP ? "stop" : type === EVENT_TYPES.DIAPER ? "plus" : "play";

  return createElement("article", { className: "quick-actions__card quick-actions__card--secondary" }, [
    createElement("div", { className: "quick-actions__header" }, [
      createElement("span", { className: "quick-actions__title" }, [
        createIcon(icon, "icon icon--badge"),
        createElement("strong", { text: displayTitle })
      ]),
      createElement("span", { className: "quick-actions__description", text: description })
    ]),
    createElement("button", {
      className: activeRecord ? "action-button action-button--active" : "action-button action-button--secondary",
      attributes: { type: "button" },
      events: {
        click: () => {
          if (activeRecord && type === EVENT_TYPES.SLEEP) {
            onOpenSheet({ type, mode: "finish" });
            return;
          }

          if (type === EVENT_TYPES.DIAPER) {
            onOpenSheet({ type, mode: "instant" });
            return;
          }

          if (type === EVENT_TYPES.SLEEP) {
            onStartRecord(type);
            return;
          }

          onStartRecord(type);
        }
      }
    }, [iconText(iconName, label)])
  ]);
}
