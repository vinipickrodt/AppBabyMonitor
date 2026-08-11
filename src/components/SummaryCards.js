import { getTodayStats, formatSleepDuration } from "../domain/stats.js";
import { createElement } from "../ui/dom.js";
import { createIcon } from "../ui/icons.js";

export function renderSummaryCards(entries) {
  const stats = getTodayStats(entries);

  return createElement("section", { className: "summary-grid", attributes: { "aria-label": "Resumo do dia" } }, [
    renderCard("Mamadas", stats.feedings, "hoje", "bottle"),
    renderCard("Fraldas", stats.diapers, "hoje", "diaper"),
    renderCard("Sono", formatSleepDuration(stats.sleepMinutes), "hoje", "moon")
  ]);
}

function renderCard(label, value, caption, iconName) {
  return createElement("article", { className: "summary-card" }, [
    createElement("span", { className: "summary-card__label" }, [createIcon(iconName), document.createTextNode(label)]),
    createElement("strong", { className: "summary-card__value", text: String(value) }),
    createElement("span", { className: "summary-card__caption", text: caption })
  ]);
}
