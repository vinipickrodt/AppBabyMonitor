import { createElement } from "../ui/dom.js";
import { createIcon } from "../ui/icons.js";

export const MAIN_ROUTES = [
  { id: "today", label: "Hoje", icon: "home" },
  { id: "history", label: "Histórico", icon: "calendar" },
  { id: "insights", label: "Insights", icon: "chart" },
  { id: "profile", label: "Perfil", icon: "user" }
];

export function renderBottomNavigation({ currentRoute, onNavigate }) {
  return createElement("nav", { className: "bottom-nav", attributes: { "aria-label": "Navegação principal" } }, [
    createElement(
      "div",
      { className: "bottom-nav__items" },
      MAIN_ROUTES.map((route) =>
        createElement("button", {
          className: route.id === currentRoute ? "bottom-nav__item bottom-nav__item--active" : "bottom-nav__item",
          attributes: {
            type: "button",
            "aria-current": route.id === currentRoute ? "page" : "false"
          },
          events: { click: () => onNavigate(route.id) }
        }, [
          createIcon(route.icon, "icon bottom-nav__icon"),
          createElement("span", { text: route.label })
        ])
      )
    )
  ]);
}
