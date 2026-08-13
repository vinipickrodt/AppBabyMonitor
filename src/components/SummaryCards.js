import { getTodayStats, formatSleepDuration } from "../domain/stats.js";
import { createElement } from "../ui/dom.js";
import { createIcon } from "../ui/icons.js";

export function renderSummaryCards(entries) {
  const stats = getTodayStats(entries);
  const sleepLabel = formatSleepDuration(stats.sleepMinutes);

  return createElement("section", { className: "summary-panel", attributes: { "aria-label": "Resumo do dia" } }, [
    createElement("article", { className: "summary-card" }, [
      createElement("div", { className: "summary-card__header" }, [
        createElement("span", { className: "summary-card__label" }, [
          createIcon("calendar", "icon icon--badge"),
          createElement("span", { text: "Resumo de hoje" })
        ]),
        createElement("span", { className: "summary-card__caption", text: "Uma visão única do dia." })
      ]),
      createElement("div", { className: "summary-card__metrics" }, [
        renderMetric("Mamadas", String(stats.feedings), "bottle"),
        renderMetric("Fraldas", String(stats.diapers), "diaper"),
        renderMetric("Sono", sleepLabel, "moon")
      ])
    ])
  ]);
}

function renderMetric(label, value, iconName) {
  return createElement("div", { className: "summary-card__metric" }, [
    createElement("span", { className: "summary-card__metric-label" }, [
      createIcon(iconName, "icon icon--badge"),
      createElement("span", { text: label })
    ]),
    createElement("strong", { className: "summary-card__metric-value", text: value })
  ]);
}
