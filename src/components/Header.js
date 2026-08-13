import { createElement } from "../ui/dom.js";
import { getEventDate, isToday } from "../domain/babyEvents.js";
import { createIcon } from "../ui/icons.js";

export function renderHeader(entries = []) {
  const greeting = getGreeting();
  const dateLabel = getTodayLabel();
  const todayCount = entries.filter((entry) => isToday(getEventDate(entry))).length;
  const activityLabel = todayCount ? `${todayCount} registros hoje` : "pronto para começar";

  return createElement("header", { className: "app-header" }, [
    createElement("div", { className: "app-header__eyebrow" }, [
      createIcon("baby", "icon icon--brand"),
      createElement("span", { text: "Hoje" })
    ]),
    createElement("div", { className: "app-header__headline" }, [
      createElement("h1", { text: greeting }),
      createElement("p", { text: `${dateLabel} · ${activityLabel}` })
    ]),
    createElement("p", { className: "app-header__subtitle", text: "Mamadas, fraldas e sono em um só lugar." })
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
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(now);

  return label.charAt(0).toUpperCase() + label.slice(1);
}
