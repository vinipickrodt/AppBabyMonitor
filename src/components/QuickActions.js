import { EVENT_TYPES, FEEDING_SIDES, getCurrentFeedingSide, getFeedingSideTotals } from "../domain/babyEvents.js";
import { formatSleepDuration } from "../domain/stats.js";
import { createElement, formatTime } from "../ui/dom.js";
import { createIcon, iconText } from "../ui/icons.js";

const ACTIONS = [
  {
    type: EVENT_TYPES.FEEDING,
    title: "Mamada",
    description: "Controle por inicio/fim ou duracao.",
    icon: "bottle"
  },
  {
    type: EVENT_TYPES.DIAPER,
    title: "Fralda",
    description: "Registro rapido com anotacoes.",
    icon: "diaper"
  },
  {
    type: EVENT_TYPES.SLEEP,
    title: "Sono",
    description: "Controle por inicio/fim ou duracao.",
    icon: "moon"
  }
];

export function renderQuickActions({ activeRecords, onStartRecord, onSwitchFeedingSide, onOpenSheet }) {
  return createElement("section", { className: "quick-actions", attributes: { "aria-label": "Acoes rapidas" } }, [
    createElement(
      "div",
      { className: "record-action-grid" },
      ACTIONS.map((action) =>
        renderActionCard(action, activeRecords[action.type], onStartRecord, onSwitchFeedingSide, onOpenSheet)
      )
    )
  ]);
}

function renderActionCard(action, activeRecord, onStartRecord, onSwitchFeedingSide, onOpenSheet) {
  const isDurationRecord = action.type !== EVENT_TYPES.DIAPER;

  return createElement("article", { className: "record-action-card" }, [
    createElement("div", { className: "record-action-card__header" }, [
      createElement("span", { className: "record-action-card__title" }, [
        createIcon(action.icon, "icon icon--badge"),
        createElement("strong", { text: action.title })
      ]),
      createElement("span", { className: "record-action-card__description", text: action.description })
    ]),
    renderActiveLabel(action.type, activeRecord, isDurationRecord),
    createElement(
      "div",
      { className: "record-action-card__buttons" },
      getButtons(action.type, activeRecord, onStartRecord, onSwitchFeedingSide, onOpenSheet)
    )
  ]);
}

function renderActiveLabel(type, activeRecord, isDurationRecord) {
  if (!activeRecord) {
    return createElement("p", {
      className: "active-record",
      text: isDurationRecord ? "Sem registro em andamento" : "Pronto para registrar"
    });
  }

  if (type !== EVENT_TYPES.FEEDING) {
    return createElement("p", {
      className: "active-record",
      text: `Iniciado as ${formatTime(activeRecord.startedAt)}`
    });
  }

  const currentSide = getCurrentFeedingSide(activeRecord);
  const totals = getFeedingSideTotals(activeRecord);
  const segments = activeRecord.details?.feedingSegments || [];
  const currentSegment = segments.findLast((segment) => !segment.endedAt) || segments.at(-1);

  if (!currentSide) {
    return createElement("p", {
      className: "active-record",
      text: `Mamada iniciada as ${formatTime(activeRecord.startedAt)} - sem seio selecionado`
    });
  }

  const currentLabel = FEEDING_SIDES.find((option) => option.value === currentSide)?.label || "Seio nao informado";

  return createElement("p", {
    className: "active-record",
    text: `${currentLabel} desde ${formatTime(currentSegment?.startedAt || activeRecord.startedAt)} · E ${formatSleepDuration(
      totals.left
    )} · D ${formatSleepDuration(totals.right)}`
  });
}

function getButtons(type, activeRecord, onStartRecord, onSwitchFeedingSide, onOpenSheet) {
  if (type === EVENT_TYPES.DIAPER) {
    return [
      createElement("button", {
        className: "action-button",
        attributes: { type: "button" },
        events: { click: () => onOpenSheet({ type, mode: "instant" }) }
      }, [iconText("plus", "Registrar")])
    ];
  }

  if (activeRecord) {
    if (type === EVENT_TYPES.FEEDING) {
      const currentSide = getCurrentFeedingSide(activeRecord);

      return [
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
          events: { click: () => onOpenSheet({ type, mode: "finish" }) }
        }, [iconText("stop", "Finalizar")])
      ];
    }

    return [
      createElement("button", {
        className: "action-button action-button--active",
        attributes: { type: "button" },
        events: { click: () => onOpenSheet({ type, mode: "finish" }) }
      }, [iconText("stop", "Finalizar")])
    ];
  }

  return [
    createElement("button", {
      className: "action-button",
      attributes: { type: "button" },
      events: {
        click: () => {
          if (type === EVENT_TYPES.FEEDING) {
            onOpenSheet({ type, mode: "start" });
            return;
          }

          onStartRecord(type);
        }
      }
    }, [iconText("play", "Iniciar")]),
    createElement("button", {
      className: "secondary-button",
      attributes: { type: "button" },
      events: { click: () => onOpenSheet({ type, mode: "duration" }) }
    }, [iconText("clock", "Duracao")])
  ];
}
