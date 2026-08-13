import { DIAPER_ATTENTION_FLAGS } from "../domain/babyEvents.js";
import { createElement, formatTime } from "../ui/dom.js";
import { createIcon, iconText } from "../ui/icons.js";

const CONTENT_OPTIONS = [
  { value: "pee", label: "Xixi", icon: "droplet", hint: "Somente urina" },
  { value: "poop", label: "Cocô", icon: "poop", hint: "Somente fezes" },
  { value: "both", label: "Xixi + cocô", icon: "diaper", hint: "Os dois" }
];

const AMOUNT_OPTIONS = [
  { value: "low", label: "Pouca" },
  { value: "normal", label: "Média" },
  { value: "high", label: "Muita" }
];

const COLOR_OPTIONS = [
  { value: "yellow_seedy", label: "Amarelo", swatch: "choice-chip__swatch--yellow" },
  { value: "green", label: "Verde", swatch: "choice-chip__swatch--green" },
  { value: "dry_hard", label: "Marrom", swatch: "choice-chip__swatch--brown" },
  { value: "mucus", label: "Outra", swatch: "choice-chip__swatch--gray" }
];

const CONSISTENCY_OPTIONS = [
  { value: "liquid", label: "Líquido" },
  { value: "pasty", label: "Pastoso" },
  { value: "grainy", label: "Granuloso" }
];

export function renderDiaperRecordScreen({
  now = new Date(),
  isActionPending = false,
  onCancel,
  onSubmit
}) {
  const initialOccurredAt = new Date(now);
  const state = {
    contentInputs: [],
    contentCards: [],
    amountInputs: [],
    amountCards: [],
    colorInputs: [],
    colorCards: [],
    consistencyInputs: [],
    consistencyCards: [],
    attentionInputs: [],
    attentionCards: [],
    quantitySection: null,
    colorSection: null,
    consistencySection: null,
    attentionSection: null,
    amountHint: null,
    saveButton: null,
    notesInput: null,
    occurredAt: initialOccurredAt,
    timeLabel: null,
    timeInput: null,
    timeEditor: null
  };

  const topBar = createElement("div", { className: "focused-screen__topbar" }, [
    createElement("button", {
      className: "icon-button focused-screen__back",
      attributes: {
        type: "button",
        "aria-label": "Voltar"
      },
      events: { click: () => onCancel?.() }
    }, [createIcon("left", "icon")]),
    createElement("h1", { className: "focused-screen__title", text: "Registrar fralda" }),
    createElement("div", { className: "focused-screen__spacer", attributes: { "aria-hidden": "true" } })
  ]);

  state.timeLabel = createElement("span", { text: `Agora, ${formatTime(initialOccurredAt)}` });
  state.timeInput = createElement("input", {
    attributes: {
      id: "diaper-occurred-at",
      name: "occurredAt",
      type: "datetime-local",
      value: toDateTimeLocalValue(initialOccurredAt)
    }
  });
  state.timeEditor = createElement("label", { className: "diaper-screen__time-editor", attributes: { hidden: "true", for: "diaper-occurred-at" } }, [
    createElement("span", { text: "Horário da troca" }),
    state.timeInput
  ]);
  state.timeInput.addEventListener("change", () => {
    const nextDate = new Date(state.timeInput.value);

    if (Number.isNaN(nextDate.getTime())) {
      return;
    }

    state.occurredAt = nextDate;
    state.timeLabel.textContent = formatTime(nextDate);
  });

  const identity = createElement("section", { className: "diaper-screen__identity" }, [
    createElement("div", { className: "diaper-screen__identity-row" }, [
      createElement("div", { className: "diaper-screen__profile" }, [
        createElement("div", { className: "diaper-screen__avatar", attributes: { "aria-hidden": "true" } }, [
          createIcon("baby", "icon diaper-screen__avatar-icon")
        ]),
        createElement("div", { className: "diaper-screen__profile-copy" }, [
          createElement("strong", { text: "Bebê" }),
          state.timeLabel
        ])
      ]),
      createElement("button", {
        className: "inline-link-button diaper-screen__change-button",
        attributes: { type: "button" },
        events: {
          click: () => {
            state.timeEditor.hidden = false;
            state.timeInput.focus();
          }
        }
      }, [createElement("span", { text: "Alterar" })])
    ]),
    state.timeEditor
  ]);

  const mainContent = createElement("div", { className: "diaper-screen__content" }, [
    createElement("section", { className: "diaper-screen__section" }, [
      createElement("h2", { className: "diaper-screen__section-title", text: "O que tinha na fralda?" }),
      createElement("div", { className: "choice-grid choice-grid--three" }, CONTENT_OPTIONS.map((option) => {
        const input = createElement("input", {
          attributes: {
            type: "radio",
            name: "diaperContent",
            value: option.value
          }
        });
        const card = createElement("span", { className: "choice-card__body" }, [
          createElement("span", { className: "choice-card__icon" }, [createIcon(option.icon, "icon choice-card__icon-svg")]),
          createElement("strong", { text: option.label }),
          createElement("span", { className: "choice-card__hint", text: option.hint })
        ]);
        const label = createElement("label", { className: "choice-card choice-card--large" }, [
          input,
          card
        ]);

        state.contentInputs.push(input);
        state.contentCards.push(label);

        input.addEventListener("change", syncScreenState);
        return label;
      }))
    ]),
    createElement("section", { className: "diaper-screen__section diaper-screen__section--optional" }, [
      createElement("div", { className: "diaper-screen__section-header" }, [
        createElement("h2", { className: "diaper-screen__section-title", text: "Detalhes opcionais" }),
        createElement("p", { className: "diaper-screen__section-subtitle", text: "Preencha somente se quiser." })
      ]),
      state.quantitySection = createElement("div", { className: "diaper-screen__block" }, [
        createElement("h3", { className: "diaper-screen__block-title", text: "Quantidade" }),
        createElement("div", { className: "segmented-control" }, AMOUNT_OPTIONS.map((option) => {
          const input = createElement("input", {
            attributes: {
              type: "radio",
              name: "diaperAmount",
              value: option.value
            }
          });
          const label = createElement("label", { className: "segmented-control__option" }, [
            input,
            createElement("span", { text: option.label })
          ]);

          state.amountInputs.push(input);
          state.amountCards.push(label);
          input.addEventListener("change", syncScreenState);
          return label;
        })),
        state.amountHint = createElement("p", { className: "diaper-screen__hint", text: "Descreva o volume observado." })
      ]),
      state.colorSection = createElement("div", { className: "diaper-screen__block" }, [
        createElement("h3", { className: "diaper-screen__block-title", text: "Cor do cocô" }),
        createElement("div", { className: "choice-chip-grid" }, COLOR_OPTIONS.map((option) => createChipChoice("stoolAppearances", option, state.colorInputs, state.colorCards, syncScreenState)))
      ]),
      state.consistencySection = createElement("div", { className: "diaper-screen__block" }, [
        createElement("h3", { className: "diaper-screen__block-title", text: "Consistência" }),
        createElement("div", { className: "segmented-control segmented-control--compact" }, CONSISTENCY_OPTIONS.map((option) => {
          const input = createElement("input", {
            attributes: {
              type: "radio",
              name: "stoolConsistency",
              value: option.value
            }
          });
          const label = createElement("label", { className: "segmented-control__option" }, [
            input,
            createElement("span", { text: option.label })
          ]);

          state.consistencyInputs.push(input);
          state.consistencyCards.push(label);
          input.addEventListener("change", syncScreenState);
          return label;
        }))
      ]),
      state.attentionSection = createElement("details", { className: "diaper-screen__attention" }, [
        createElement("summary", { text: "Pontos de atenção" }),
        createElement("p", {
          className: "diaper-screen__attention-copy",
          text: "Marque quando houver algo que mereça observação ou acompanhamento."
        }),
        createElement("div", { className: "choice-chip-grid choice-chip-grid--stacked" }, DIAPER_ATTENTION_FLAGS.map((option) => createCheckboxChoice(option, state.attentionInputs, state.attentionCards, syncScreenState)))
      ]),
      createElement("div", { className: "diaper-screen__notes" }, [
        createElement("label", { className: "diaper-screen__notes-label", attributes: { for: "diaper-notes" }, text: "Observação" }),
        state.notesInput = createElement("textarea", {
          attributes: {
            id: "diaper-notes",
            name: "notes",
            rows: "4",
            placeholder: "Ex.: assadura leve, fralda da manhã, cheirou diferente"
          }
        })
      ])
    ])
  ]);

  const saveBar = createElement("div", { className: "sticky-action-bar" }, [
    state.saveButton = createElement("button", {
      className: "action-button action-button--primary sticky-action-bar__button",
      attributes: {
        type: "submit",
        ...(isActionPending ? { disabled: "true" } : {})
      }
    }, [iconText("check", "Salvar fralda")])
  ]);

  const form = createElement("form", { className: "diaper-screen__form" }, [
    topBar,
    identity,
    mainContent,
    saveBar
  ]);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (isActionPending) {
      return;
    }

    const content = getSelectedValue(state.contentInputs);

    if (!content) {
      return;
    }

    const amount = getSelectedValue(state.amountInputs);
    const details = {
      diaperContent: content,
      diaperWeightGrams: null
    };

    if (content === "pee" || content === "both") {
      details.peeAmount = amount;
    }

    if (content === "poop" || content === "both") {
      details.poopAmount = amount;
      details.stoolAppearances = getCheckedValues(state.colorInputs);
      details.stoolConsistency = getSelectedValue(state.consistencyInputs);
      details.attentionFlags = getCheckedValues(state.attentionInputs);
    }

    onSubmit?.({
      notes: state.notesInput.value.trim(),
      occurredAt: state.occurredAt,
      details
    });
  });

  function syncScreenState() {
    const selectedContent = getSelectedValue(state.contentInputs);
    const hasSelection = Boolean(selectedContent);
    const hasPoop = selectedContent === "poop" || selectedContent === "both";

    state.saveButton.disabled = !hasSelection || isActionPending;
    state.quantitySection.hidden = !hasSelection;
    state.colorSection.hidden = !hasPoop;
    state.consistencySection.hidden = !hasPoop;
    state.attentionSection.hidden = !hasPoop;
    state.amountHint.textContent = selectedContent === "pee"
      ? "Use este campo para descrever a fralda de xixi."
      : "Use este campo para descrever a quantidade observada.";

    syncInputSelection(state.contentInputs, state.contentCards);
    syncInputSelection(state.amountInputs, state.amountCards);
    syncInputSelection(state.colorInputs, state.colorCards);
    syncInputSelection(state.consistencyInputs, state.consistencyCards);
    syncInputSelection(state.attentionInputs, state.attentionCards);
  }

  syncScreenState();
  return form;
}

function createChipChoice(name, option, inputStore, cardStore, onChange) {
  const input = createElement("input", {
    attributes: {
      type: "checkbox",
      name,
      value: option.value
    }
  });
  const label = createElement("label", { className: "choice-chip" }, [
    input,
    createElement("span", { className: `choice-chip__swatch ${option.swatch || ""}` }),
    createElement("span", { text: option.label })
  ]);

  inputStore.push(input);
  cardStore.push(label);
  input.addEventListener("change", onChange);
  return label;
}

function createCheckboxChoice(option, inputStore, cardStore, onChange) {
  const input = createElement("input", {
    attributes: {
      type: "checkbox",
      name: "attentionFlags",
      value: option.value
    }
  });
  const label = createElement("label", { className: "choice-chip choice-chip--attention" }, [
    input,
    createElement("span", { text: option.label })
  ]);

  inputStore.push(input);
  cardStore.push(label);
  input.addEventListener("change", onChange);
  return label;
}

function syncInputSelection(inputs, labels) {
  inputs.forEach((input, index) => {
    labels[index]?.classList.toggle("choice-card--selected", input.checked);
    labels[index]?.classList.toggle("segmented-control__option--selected", input.checked);
    labels[index]?.classList.toggle("choice-chip--selected", input.checked);
  });
}

function getSelectedValue(inputs) {
  return inputs.find((input) => input.checked)?.value || null;
}

function getCheckedValues(inputs) {
  return inputs.filter((input) => input.checked).map((input) => input.value);
}

function toDateTimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
