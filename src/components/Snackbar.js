import { createElement } from "../ui/dom.js";
import { createIcon, iconText } from "../ui/icons.js";

const VARIANT_CONFIG = {
  success: {
    icon: "info",
    className: "snackbar--success",
    role: "status",
    live: "polite"
  },
  info: {
    icon: "info",
    className: "snackbar--info",
    role: "status",
    live: "polite"
  },
  error: {
    icon: "alert",
    className: "snackbar--error",
    role: "alert",
    live: "assertive"
  }
};

export function renderSnackbar(snackbar, { onAction, onClose } = {}) {
  if (!snackbar) {
    return document.createDocumentFragment();
  }

  const config = VARIANT_CONFIG[snackbar.variant] || VARIANT_CONFIG.info;

  return createElement("div", {
    className: `snackbar ${config.className}`,
    attributes: {
      role: config.role,
      "aria-live": config.live,
      "aria-atomic": "true"
    }
  }, [
    createElement("div", { className: "snackbar__body" }, [
      createIcon(config.icon, "icon icon--badge snackbar__icon"),
      createElement("div", { className: "snackbar__copy" }, [
        createElement("strong", { className: "snackbar__title", text: getSnackbarTitle(snackbar.variant) }),
        createElement("span", { className: "snackbar__message", text: snackbar.message })
      ])
    ]),
    createElement("div", { className: "snackbar__actions" }, [
      snackbar.actionLabel
        ? createElement("button", {
            className: "secondary-button snackbar__action",
            attributes: { type: "button" },
            events: onAction ? { click: onAction } : {}
          }, [iconText("undo", snackbar.actionLabel)])
        : document.createDocumentFragment(),
      createElement("button", {
        className: "icon-button snackbar__close",
        attributes: {
          type: "button",
          "aria-label": "Fechar aviso"
        },
        events: onClose ? { click: onClose } : {}
      }, [iconText("close", "Fechar")])
    ])
  ]);
}

function getSnackbarTitle(variant) {
  if (variant === "error") {
    return "Não foi possível concluir";
  }

  if (variant === "success") {
    return "Feito";
  }

  return "Aviso";
}
