import {
  DIAPER_AMOUNT_OPTIONS,
  DIAPER_ATTENTION_FLAGS,
  DIAPER_CONTENT_OPTIONS,
  DIAPER_OPTIONS,
  EVENT_TYPES,
  FEEDING_SIDES,
  STOOL_APPEARANCE_OPTIONS,
  getEventDate,
  getEventDurationMinutes,
  getFeedingSideTotals
} from "../domain/babyEvents.js";
import { formatSleepDuration } from "../domain/stats.js";
import { createElement, formatTime } from "../ui/dom.js";
import { createIcon, iconText } from "../ui/icons.js";

const TYPE_LABELS = {
  [EVENT_TYPES.FEEDING]: "Mamada",
  [EVENT_TYPES.DIAPER]: "Fralda",
  [EVENT_TYPES.SLEEP]: "Sono"
};
const DIAPER_LABELS = new Map(DIAPER_OPTIONS.map((option) => [option.value, option.label]));
const DIAPER_AMOUNT_LABELS = new Map(DIAPER_AMOUNT_OPTIONS.map((option) => [option.value, option.label]));
const DIAPER_CONTENT_LABELS = new Map(DIAPER_CONTENT_OPTIONS.map((option) => [option.value, option.label]));
const STOOL_LABELS = new Map(STOOL_APPEARANCE_OPTIONS.map((option) => [option.value, option.label]));
const ATTENTION_LABELS = new Map(DIAPER_ATTENTION_FLAGS.map((option) => [option.value, option.label]));
const FEEDING_LABELS = new Map(FEEDING_SIDES.map((option) => [option.value, option.label]));
const ENTRY_ICONS = {
  [EVENT_TYPES.FEEDING]: "bottle",
  [EVENT_TYPES.DIAPER]: "diaper",
  [EVENT_TYPES.SLEEP]: "moon"
};

export function renderEntryList(entries, { onRemove, onOpenHistory, limit = 5, isActionPending = false } = {}) {
  const recentEntries = entries.slice(0, limit);

  return createElement("section", { className: "entry-section" }, [
    createElement("div", { className: "section-title" }, [
      createElement("div", { className: "section-title__copy" }, [
        createElement("h2", { text: "Registros recentes" }),
        createElement("span", { text: recentEntries.length ? `${recentEntries.length} itens` : "Nada registrado ainda" })
      ]),
      onOpenHistory
        ? createElement("button", {
            className: "inline-link-button section-title__action",
            attributes: {
              type: "button",
              ...(isActionPending ? { disabled: "true" } : {})
            },
            events: { click: onOpenHistory }
          }, [iconText("calendar", "Ver histórico")])
        : document.createDocumentFragment()
    ]),
    recentEntries.length
      ? createElement("ul", { className: "entry-list" }, recentEntries.map((entry) => renderEntry(entry, onRemove, isActionPending)))
      : createElement("p", { className: "empty-state", text: "Ainda não há registros de hoje." })
  ]);
}

function renderEntry(entry, onRemove, isActionPending) {
  const notes = entry.notes
    ? createElement("span", { className: "entry-item__notes", text: entry.notes })
    : document.createDocumentFragment();

  return createElement("li", { className: "entry-item" }, [
    createElement("div", { className: "entry-item__main" }, [
      createElement("span", { className: `entry-icon entry-icon--${entry.type}` }, [
        createIcon(ENTRY_ICONS[entry.type], "icon")
      ]),
      createElement("div", { className: "entry-item__content" }, [
        createElement("strong", { text: TYPE_LABELS[entry.type] }),
        createElement("span", { className: "entry-item__meta", text: `${getEntryDetail(entry)} · ${formatTime(getEventDate(entry))}` }),
        notes
      ])
    ]),
    createElement("button", {
      className: "icon-button",
      attributes: {
        type: "button",
        "aria-label": `Apagar ${TYPE_LABELS[entry.type]}`,
        ...(isActionPending ? { disabled: "true" } : {})
      },
      events: { click: () => onRemove(entry.id) }
    }, [iconText("trash", "Apagar")])
  ]);
}

function getEntryDetail(entry) {
  if (entry.type === EVENT_TYPES.FEEDING) {
    const totals = getFeedingSideTotals(entry);
    const totalDuration = formatSleepDuration(getEventDurationMinutes(entry));
    const parts = Object.entries(totals)
      .filter(([, minutes]) => minutes > 0)
      .map(([side, minutes]) => `${FEEDING_LABELS.get(side) || side} ${formatSleepDuration(minutes)}`);

    return parts.length ? `Total ${totalDuration} · ${parts.join(", ")}` : totalDuration;
  }

  if (entry.type === EVENT_TYPES.SLEEP) {
    return formatSleepDuration(getEventDurationMinutes(entry));
  }

  if (entry.type === EVENT_TYPES.DIAPER) {
    return getDiaperDetail(entry);
  }

  return "1 registro";
}

function getDiaperDetail(entry) {
  const details = entry.details || {};
  const parts = [];

  if (details.diaperContent) {
    parts.push(DIAPER_CONTENT_LABELS.get(details.diaperContent) || details.diaperContent);
  }

  if (details.diaperWeightGrams !== null && details.diaperWeightGrams !== undefined) {
    parts.push(`${details.diaperWeightGrams}g`);
  }

  if (!details.diaperContent && details.peeAmount && details.peeAmount !== "none") {
    parts.push(`Xixi ${DIAPER_AMOUNT_LABELS.get(details.peeAmount) || details.peeAmount}`);
  }

  if (!details.diaperContent && details.poopAmount && details.poopAmount !== "none") {
    parts.push(`Cocô ${DIAPER_AMOUNT_LABELS.get(details.poopAmount) || details.poopAmount}`);
  }

  if (details.diaperOptions?.length) {
    parts.push(details.diaperOptions.map((option) => DIAPER_LABELS.get(option) || option).join(", "));
  }

  if (details.stoolAppearances?.length) {
    parts.push(details.stoolAppearances.map((option) => STOOL_LABELS.get(option) || option).join(", "));
  }

  if (details.attentionFlags?.length) {
    parts.push(`Atenção: ${details.attentionFlags.map((option) => ATTENTION_LABELS.get(option) || option).join(", ")}`);
  }

  return parts.length ? parts.join(" · ") : "1 registro";
}
