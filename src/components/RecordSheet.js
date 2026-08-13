import {
  DIAPER_AMOUNT_OPTIONS,
  DIAPER_ATTENTION_FLAGS,
  DIAPER_CONTENT_OPTIONS,
  DIAPER_OPTIONS,
  EVENT_TYPES,
  FEEDING_SIDES,
  STOOL_APPEARANCE_OPTIONS
} from "../domain/babyEvents.js";
import { parseDurationPartsToMinutes } from "../domain/duration.js";
import { createElement, formatTime } from "../ui/dom.js";
import { createIcon, iconText } from "../ui/icons.js";

const LABELS = {
  [EVENT_TYPES.FEEDING]: "mamada",
  [EVENT_TYPES.DIAPER]: "fralda",
  [EVENT_TYPES.SLEEP]: "sono"
};

export function renderRecordSheet(sheet, { activeRecord, onCancel, onSubmit }) {
  const includeNotes = sheet.mode !== "start";
  const notes = createElement("textarea", {
    attributes: {
      id: "record-notes",
      name: "notes",
      rows: "4",
      placeholder: "Notas opcionais"
    }
  });
  const saveButton = createElement(
    "button",
    {
      className: "action-button",
      attributes: { type: "submit", disabled: "true" }
    },
    [iconText("save", "Salvar")]
  );
  const fields = [
    createElement("h2", { className: "record-sheet__title" }, [
      createIcon(getSheetIcon(sheet), "icon icon--badge"),
      createElement("span", { text: getTitle(sheet) })
    ]),
    activeRecord
      ? createElement("p", { className: "sheet-caption", text: `Início: ${formatTime(activeRecord.startedAt)}` })
      : createElement("p", { className: "sheet-caption", text: "Adicione os detalhes essenciais antes de salvar." })
  ];

  const state = {
    durationFields: null,
    selectedFeedingSide: null,
    selectedDiaperContent: null,
    feedingSideInputs: [],
    diaperContentInputs: [],
    diaperWeightInput: null,
    peeInputs: [],
    poopInputs: [],
    optionInputs: [],
    stoolInputs: [],
    attentionInputs: []
  };

  if (sheet.type === EVENT_TYPES.FEEDING && sheet.mode === "start") {
    state.feedingSideInputs = addFeedingStartFields(fields, () => {
      state.selectedFeedingSide = getSelectedValue(state.feedingSideInputs);
      saveButton.disabled = !state.selectedFeedingSide;
    });
  } else if (sheet.type === EVENT_TYPES.FEEDING && sheet.mode === "duration") {
    state.durationFields = addDurationInput(fields);
    state.feedingSideInputs = addFeedingOptionalSideFields(fields);
    saveButton.disabled = false;
  } else if (sheet.type === EVENT_TYPES.DIAPER) {
    state.diaperContentInputs = addDiaperFields(fields, saveButton, state);
  } else {
    saveButton.disabled = false;
  }

  if (includeNotes) {
    fields.push(createElement("label", { text: "Notas", attributes: { for: "record-notes" } }), notes);
  }

  fields.push(
    createElement("div", { className: "sheet-actions" }, [
      createElement("button", {
        className: "secondary-button",
        attributes: { type: "button" },
        events: { click: onCancel }
      }, [iconText("close", "Cancelar")]),
      saveButton
    ])
  );

  const form = createElement("form", { className: "record-sheet" }, fields);
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const durationMinutes = state.durationFields
      ? parseDurationPartsToMinutes(state.durationFields.hoursInput.value, state.durationFields.minutesInput.value)
      : null;

    if (state.durationFields && !durationMinutes) {
      state.durationFields.minutesInput.setCustomValidity("Informe horas e minutos. A duração precisa ser maior que zero.");
      state.durationFields.minutesInput.reportValidity();
      state.durationFields.hoursInput.focus();
      return;
    }

    if (state.durationFields) {
      state.durationFields.minutesInput.setCustomValidity("");
    }

    if (sheet.type === EVENT_TYPES.FEEDING && sheet.mode === "start" && !state.selectedFeedingSide) {
      return;
    }

    if (sheet.type === EVENT_TYPES.DIAPER && !state.selectedDiaperContent) {
      return;
    }

    const diaperWeightGrams = state.diaperWeightInput?.value ? Number(state.diaperWeightInput.value) : null;

    if (state.diaperWeightInput && diaperWeightGrams !== null && (!Number.isFinite(diaperWeightGrams) || diaperWeightGrams < 0)) {
      state.diaperWeightInput.focus();
      return;
    }

    onSubmit({
      notes: includeNotes ? notes.value : "",
      durationMinutes,
      details: {
        feedingSide: getSelectedValue(state.feedingSideInputs),
        diaperContent: state.selectedDiaperContent,
        diaperWeightGrams,
        peeAmount: getSelectedValue(state.peeInputs),
        poopAmount: getSelectedValue(state.poopInputs),
        diaperOptions: getCheckedValues(state.optionInputs),
        stoolAppearances: getCheckedValues(state.stoolInputs),
        attentionFlags: getCheckedValues(state.attentionInputs)
      }
    });
  });

  return createElement("div", { className: "sheet-backdrop", attributes: { role: "dialog", "aria-modal": "true" } }, [form]);
}

function addFeedingStartFields(fields, onSelectionChange) {
  const inputs = FEEDING_SIDES.map((option) => createChoiceInput("radio", "feedingSide", option));

  inputs.forEach(({ input }) => {
    input.addEventListener("change", onSelectionChange);
  });

  fields.push(
    renderOptionGroup("Escolha o seio", inputs),
    createElement("span", { className: "field-hint", text: "Escolha um lado para começar a mamada." })
  );

  return inputs.map(({ input }) => input);
}

function addFeedingOptionalSideFields(fields) {
  const inputs = FEEDING_SIDES.map((option) => createChoiceInput("radio", "feedingSide", option));

  fields.push(
    renderOptionGroup("Seio", inputs),
    createElement("span", { className: "field-hint", text: "Opcional para registrar o lado na mamada por duração." })
  );

  return inputs.map(({ input }) => input);
}

function addDiaperFields(fields, saveButton, state) {
  const contentInputs = DIAPER_CONTENT_OPTIONS.map((option) => createChoiceInput("radio", "diaperContent", option));
  const peeInputs = createChoiceGroup(DIAPER_AMOUNT_OPTIONS, "peeAmount");
  const poopInputs = createChoiceGroup(DIAPER_AMOUNT_OPTIONS, "poopAmount");
  const optionInputs = createCheckboxChoices(DIAPER_OPTIONS, "diaperOptions");
  const stoolInputs = createCheckboxChoices(STOOL_APPEARANCE_OPTIONS, "stoolAppearances");
  const attentionInputs = createAttentionChoices();
  const weightInput = createElement("input", {
    attributes: {
      id: "diaper-weight",
      inputmode: "decimal",
      min: "0",
      name: "diaperWeightGrams",
      placeholder: "Ex: 42",
      step: "1",
      type: "number"
    }
  });

  const generalSection = createElement("div", { className: "sheet-dynamic-section", attributes: { hidden: "true" } }, [
    createElement("div", { className: "medical-note" }, [
      createIcon("alert", "icon icon--attention"),
      createElement("span", { text: "Os campos abaixo aparecem depois da escolha básica do conteúdo da fralda." })
    ]),
    createElement("label", { text: "Peso da fralda em gramas", attributes: { for: "diaper-weight" } }),
    weightInput,
    renderOptionGroup("Outras observações", optionInputs),
    createHelpBlock()
  ]);
  const peeSection = createElement("div", { className: "sheet-dynamic-section", attributes: { hidden: "true" } }, [
    renderOptionGroup("Quantidade de xixi", peeInputs)
  ]);
  const poopSection = createElement("div", { className: "sheet-dynamic-section", attributes: { hidden: "true" } }, [
    renderOptionGroup("Quantidade de cocô", poopInputs),
    renderOptionGroup("Aspecto do cocô", stoolInputs),
    renderOptionGroup("Pontos de atenção", attentionInputs)
  ]);

  fields.push(
    renderOptionGroup("Conteúdo", contentInputs),
    createElement("span", { className: "field-hint", text: "Selecione primeiro o conteúdo dominante." }),
    generalSection,
    peeSection,
    poopSection
  );

  state.diaperWeightInput = weightInput;
  state.diaperContentInputs = contentInputs.map(({ input }) => input);
  state.peeInputs = peeInputs.map(({ input }) => input);
  state.poopInputs = poopInputs.map(({ input }) => input);
  state.optionInputs = optionInputs.map(({ input }) => input);
  state.stoolInputs = stoolInputs.map(({ input }) => input);
  state.attentionInputs = attentionInputs.map(({ input }) => input);

  const syncVisibility = () => {
    const selectedContent = getSelectedValue(state.diaperContentInputs);
    state.selectedDiaperContent = selectedContent;

    const hasSelection = Boolean(selectedContent);
    saveButton.disabled = !hasSelection;
    generalSection.hidden = !hasSelection;
    peeSection.hidden = !hasSelection || selectedContent === "poop";
    poopSection.hidden = !hasSelection || selectedContent === "pee";
  };

  contentInputs.forEach(({ input }) => {
    input.addEventListener("change", syncVisibility);
  });

  syncVisibility();
  return state.diaperContentInputs;
}

function createHelpBlock() {
  return createElement("details", { className: "medical-note medical-note--stacked" }, [
    createElement("summary", { text: "Pontos de atenção" }),
    createElement("p", {
      text: "Estas informações ajudam a organizar observações para o pediatra. O app não substitui avaliação médica."
    }),
    createElement(
      "ul",
      {},
      DIAPER_ATTENTION_FLAGS.map((flag) =>
        createElement("li", {}, [
          createElement("strong", { text: flag.label }),
          createElement("span", { text: ` - ${flag.summary} ${flag.action}` })
        ])
      )
    )
  ]);
}

function createChoiceGroup(options, name) {
  return options.map((option) => createChoiceInput("radio", name, option));
}

function createCheckboxChoices(options, name) {
  return options.map((option) => createChoiceInput("checkbox", name, option));
}

function createAttentionChoices() {
  return DIAPER_ATTENTION_FLAGS.map((option) =>
    createChoiceInput("checkbox", "attentionFlags", {
      ...option,
      label: `${option.label} (${getLevelLabel(option.level)})`
    })
  );
}

function addDurationInput(fields) {
  const hoursInput = createElement("input", {
    attributes: {
      id: "record-duration-hours",
      inputmode: "numeric",
      min: "0",
      max: "24",
      name: "durationHours",
      placeholder: "0",
      step: "1",
      type: "number"
    }
  });
  const minutesInput = createElement("input", {
    attributes: {
      id: "record-duration-minutes",
      inputmode: "numeric",
      min: "0",
      max: "59",
      name: "durationMinutes",
      placeholder: "30",
      step: "1",
      type: "number"
    }
  });
  const clearDurationError = () => {
    minutesInput.setCustomValidity("");
  };

  hoursInput.value = "0";
  hoursInput.addEventListener("input", clearDurationError);
  minutesInput.addEventListener("input", clearDurationError);

  fields.push(
    createElement("fieldset", { className: "duration-control" }, [
      createElement("legend", { text: "Duração aproximada" }),
      createElement("div", { className: "duration-control__grid" }, [
        createElement("label", { className: "duration-field", attributes: { for: "record-duration-hours" } }, [
          createElement("span", { text: "Horas" }),
          hoursInput
        ]),
        createElement("label", { className: "duration-field", attributes: { for: "record-duration-minutes" } }, [
          createElement("span", { text: "Minutos" }),
          minutesInput
        ])
      ]),
      createElement("span", { className: "field-hint", text: "Exemplo: 1 hora e 30 minutos." })
    ])
  );

  return {
    hoursInput,
    minutesInput
  };
}

function createChoiceInput(type, name, option, checked = false) {
  const input = createElement("input", {
    attributes: {
      type,
      name,
      value: option.value
    }
  });

  if (checked) {
    input.checked = true;
  }

  return {
    input,
    option
  };
}

function renderOptionGroup(legend, choices) {
  return createElement("fieldset", { className: "option-group" }, [
    createElement("legend", { text: legend }),
    createElement(
      "div",
      { className: "option-grid" },
      choices.map(({ input, option }) =>
        createElement("label", { className: "checkbox-option" }, [input, createElement("span", { text: option.label })])
      )
    )
  ]);
}

function getSelectedValue(inputs) {
  return inputs.find((input) => input.checked)?.value || null;
}

function getCheckedValues(inputs) {
  return inputs.filter((input) => input.checked).map((input) => input.value);
}

function getLevelLabel(level) {
  const labels = {
    observe: "observar",
    doctor: "pediatra",
    urgent: "urgente"
  };

  return labels[level] || "atenção";
}

function getTitle(sheet) {
  if (sheet.mode === "start") {
    return `Iniciar ${LABELS[sheet.type]}`;
  }

  if (sheet.mode === "finish") {
    return `Finalizar ${LABELS[sheet.type]}`;
  }

  if (sheet.mode === "duration") {
    return `Registrar ${LABELS[sheet.type]} por duração`;
  }

  return `Registrar ${LABELS[sheet.type]}`;
}

function getSheetIcon(sheet) {
  const icons = {
    [EVENT_TYPES.FEEDING]: "bottle",
    [EVENT_TYPES.DIAPER]: "diaper",
    [EVENT_TYPES.SLEEP]: "moon"
  };

  return icons[sheet.type] || "info";
}
