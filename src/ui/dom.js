export function createElement(tagName, options = {}, children = []) {
  const element = document.createElement(tagName);
  const { className, text, attributes = {}, events = {} } = options;

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });

  Object.entries(events).forEach(([name, handler]) => {
    element.addEventListener(name, handler);
  });

  children.forEach((child) => {
    element.append(child);
  });

  return element;
}

export function formatTime(isoDate) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoDate));
}
