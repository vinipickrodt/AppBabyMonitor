const ICONS = {
  baby: [
    ["circle", { cx: "12", cy: "10", r: "4" }],
    ["path", { d: "M6 20c1.4-3 3.4-4.5 6-4.5S16.6 17 18 20" }],
    ["path", { d: "M10 10h.01" }],
    ["path", { d: "M14 10h.01" }]
  ],
  home: [
    ["path", { d: "M3 11l9-8 9 8" }],
    ["path", { d: "M5 10v10h14V10" }],
    ["path", { d: "M10 20v-6h4v6" }]
  ],
  calendar: [
    ["path", { d: "M8 2v4" }],
    ["path", { d: "M16 2v4" }],
    ["rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }],
    ["path", { d: "M3 10h18" }]
  ],
  chart: [
    ["path", { d: "M4 19V5" }],
    ["path", { d: "M4 19h16" }],
    ["rect", { x: "7", y: "12", width: "3", height: "4" }],
    ["rect", { x: "12", y: "8", width: "3", height: "8" }],
    ["rect", { x: "17", y: "5", width: "3", height: "11" }]
  ],
  user: [
    ["circle", { cx: "12", cy: "8", r: "4" }],
    ["path", { d: "M5 21a7 7 0 0 1 14 0" }]
  ],
  bottle: [
    ["path", { d: "M10 2h4" }],
    ["path", { d: "M11 2v3l-3 4v10a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V9l-3-4V2" }],
    ["path", { d: "M9 13h6" }]
  ],
  diaper: [
    ["path", { d: "M4 7c2 2 4.7 3 8 3s6-1 8-3v7c0 4.4-3.2 7-8 7s-8-2.6-8-7V7z" }],
    ["path", { d: "M4 7l3 6" }],
    ["path", { d: "M20 7l-3 6" }]
  ],
  moon: [
    ["path", { d: "M20 14.5A7.5 7.5 0 0 1 9.5 4a6.5 6.5 0 1 0 10.5 10.5z" }]
  ],
  plus: [
    ["path", { d: "M12 5v14" }],
    ["path", { d: "M5 12h14" }]
  ],
  play: [["path", { d: "M8 5v14l11-7-11-7z" }]],
  stop: [["path", { d: "M6 6h12v12H6z" }]],
  clock: [
    ["circle", { cx: "12", cy: "12", r: "9" }],
    ["path", { d: "M12 7v5l3 2" }]
  ],
  save: [
    ["path", { d: "M5 3h12l2 2v16H5z" }],
    ["path", { d: "M8 3v6h8" }],
    ["path", { d: "M8 17h8" }]
  ],
  close: [
    ["path", { d: "M6 6l12 12" }],
    ["path", { d: "M18 6L6 18" }]
  ],
  trash: [
    ["path", { d: "M4 7h16" }],
    ["path", { d: "M10 11v6" }],
    ["path", { d: "M14 11v6" }],
    ["path", { d: "M6 7l1 14h10l1-14" }],
    ["path", { d: "M9 7V4h6v3" }]
  ],
  info: [
    ["circle", { cx: "12", cy: "12", r: "9" }],
    ["path", { d: "M12 11v6" }],
    ["path", { d: "M12 7h.01" }]
  ],
  alert: [
    ["path", { d: "M12 3l10 18H2L12 3z" }],
    ["path", { d: "M12 9v5" }],
    ["path", { d: "M12 17h.01" }]
  ],
  scale: [
    ["path", { d: "M4 20h16" }],
    ["path", { d: "M6 20l3-12h6l3 12" }],
    ["path", { d: "M9 8a3 3 0 0 1 6 0" }]
  ],
  left: [["path", { d: "M15 18l-6-6 6-6" }]],
  right: [["path", { d: "M9 18l6-6-6-6" }]]
};

export function createIcon(name, className = "icon") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  (ICONS[name] || ICONS.info).forEach(([tagName, attributes]) => {
    const child = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes).forEach(([key, value]) => child.setAttribute(key, value));
    svg.append(child);
  });

  return svg;
}

export function iconText(iconName, label) {
  const text = document.createElement("span");
  text.textContent = label;

  const wrapper = document.createElement("span");
  wrapper.className = "icon-text";
  wrapper.append(createIcon(iconName), text);

  return wrapper;
}
