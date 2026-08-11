import { createElement } from "../ui/dom.js";
import { createIcon } from "../ui/icons.js";

export function renderHeader() {
  return createElement("header", { className: "app-header" }, [
    createElement("div", { className: "app-header__title" }, [
      createIcon("baby", "icon icon--brand"),
      createElement("h1", { text: "Baby Monitor" })
    ]),
    createElement("p", { text: "Mamadas, fraldas e sono de hoje." })
  ]);
}
