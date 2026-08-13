import { createElement } from "../ui/dom.js";
import { getEventDate, isToday } from "../domain/babyEvents.js";
import { createIcon } from "../ui/icons.js";

export function renderHeader(entries = [], { now = new Date(), babyName = "Bebê", onOpenSettings = null } = {}) {
  const dateLabel = getTodayLabel(now);
  const todayCount = entries.filter((entry) => isToday(getEventDate(entry), now)).length;
  const activityLabel = todayCount ? `${todayCount} registros hoje` : "sem registros ainda";

  return createElement("header", { className: "app-header app-header--home" }, [
    createElement("div", { className: "app-header__identity" }, [
      createElement("div", { className: "app-header__avatar", attributes: { "aria-hidden": "true" } }, [
        createIcon("baby", "icon app-header__avatar-icon")
      ]),
      createElement("div", { className: "app-header__headline" }, [
        createElement("span", { className: "app-header__eyebrow", text: "BABY MONITOR" }),
        createElement("h1", { text: babyName }),
        createElement("p", { text: `Hoje, ${dateLabel} · ${activityLabel}` })
      ]),
      createElement("button", {
        className: "icon-button app-header__settings",
        attributes: {
          type: "button",
          "aria-label": "Configurações"
        },
        events: onOpenSettings ? { click: onOpenSettings } : {}
      }, [createIcon("settings", "icon app-header__settings-icon")])
    ])
  ]);
}

function getGreeting(now = new Date()) {
  const hour = now.getHours();

  if (hour < 12) {
    return "Bom dia";
  }

  if (hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function getTodayLabel(now = new Date()) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long"
  }).format(now);

  return label.charAt(0).toUpperCase() + label.slice(1);
}
