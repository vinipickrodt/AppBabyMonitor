import {
  DIAPER_AMOUNT_OPTIONS,
  DIAPER_ATTENTION_FLAGS,
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
  const fields = [
    createElement("h2", { className: "record-sheet__title" }, [
      createIcon(getSheetIcon(sheet), "icon icon--badge"),
      document.createTextNode(getTitle(sheet))
    ]),
    activeRecord
      ? createElement("p", { className: "sheet-caption", text: `Inicio: ${formatTime(activeRecord.startedAt)}` })
      : createElement("p", { className: "sheet-caption", text: "Adicione detalhes antes de salvar." })
  ];
  const durationFields = sheet.mode === "duration" ? addDurationInput(fields) : null;
  const feedingSideInputs =
    sheet.type === EVENT_TYPES.FEEDING && ["start", "duration"].includes(sheet.mode) ? addFeedingSideOptions(fields) : [];
  const diaperFields = sheet.type === EVENT_TYPES.DIAPER ? addDiaperFields(fields) : createEmptyDiaperFields();

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
      createElement("button", {
        className: "action-button",
        attributes: { type: "submit" }
      }, [iconText("save", "Salvar")])
    ])
  );

  const form = createElement("form", { className: "record-sheet" }, fields);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const durationMinutes = durationFields
      ? parseDurationPartsToMinutes(durationFields.hoursInput.value, durationFields.minutesInput.value)
      : null;
    const diaperWeightGrams = diaperFields.weightInput?.value ? Number(diaperFields.weightInput.value) : null;

    if (durationFields && !durationMinutes) {
      durationFields.minutesInput.setCustomValidity("Informe horas e minutos. A duracao precisa ser maior que zero.");
      durationFields.minutesInput.reportValidity();
      durationFields.hoursInput.focus();
      return;
    }

    if (durationFields) {
      durationFields.minutesInput.setCustomValidity("");
    }

    if (diaperFields.weightInput && diaperWeightGrams !== null && (!Number.isFinite(diaperWeightGrams) || diaperWeightGrams < 0)) {
      diaperFields.weightInput.focus();
      return;
    }

    onSubmit({
      notes: includeNotes ? notes.value : "",
      durationMinutes,
      details: {
        feedingSide: feedingSideInputs.find((input) => input.checked)?.value || null,
        diaperWeightGrams,
        peeAmount: getCheckedValue(diaperFields.peeInputs) || "none",
        poopAmount: getCheckedValue(diaperFields.poopInputs) || "none",
        diaperOptions: getCheckedValues(diaperFields.optionInputs),
        stoolAppearances: getCheckedValues(diaperFields.stoolInputs),
        attentionFlags: getCheckedValues(diaperFields.attentionInputs)
      }
    });
  });

  return createElement("div", { className: "sheet-backdrop", attributes: { role: "dialog", "aria-modal": "true" } }, [
    form
  ]);
}

function addDiaperFields(fields) {
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
  const peeInputs = addAmountOptions(fields, "Xixi", "peeAmount", "normal");
  const poopInputs = addAmountOptions(fields, "Coco", "poopAmount", "none");
  const optionInputs = addCheckboxGroup(fields, "Outras observacoes", DIAPER_OPTIONS, "diaperOptions");
  const stoolInputs = addCheckboxGroup(fields, "Aspecto do coco", STOOL_APPEARANCE_OPTIONS, "stoolAppearances");
  const attentionInputs = addAttentionOptions(fields);

  fields.splice(
    2,
    0,
    createElement("div", { className: "medical-note" }, [
      createIcon("alert", "icon icon--attention"),
      createElement("span", { text: "Use estes campos para acompanhar hidratacao e sinais para conversar com o pediatra." }),
      createMedicalInfoDialog()
    ]),
    createElement("label", { text: "Peso da fralda em gramas", attributes: { for: "diaper-weight" } }),
    weightInput
  );

  return {
    weightInput,
    peeInputs,
    poopInputs,
    optionInputs,
    stoolInputs,
    attentionInputs
  };
}

function addAmountOptions(fields, legend, name, checkedValue) {
  const inputs = DIAPER_AMOUNT_OPTIONS.map((option) => createChoiceInput("radio", name, option, option.value === checkedValue));
  fields.push(renderOptionGroup(legend, inputs));
  return inputs.map(({ input }) => input);
}

function addCheckboxGroup(fields, legend, options, name) {
  const inputs = options.map((option) => createChoiceInput("checkbox", name, option));
  fields.push(renderOptionGroup(legend, inputs));
  return inputs.map(({ input }) => input);
}

function addAttentionOptions(fields) {
  const inputs = DIAPER_ATTENTION_FLAGS.map((option) =>
    createChoiceInput("checkbox", "attentionFlags", {
      ...option,
      label: `${option.label} (${getLevelLabel(option.level)})`
    })
  );
  fields.push(renderOptionGroup("Pontos de atencao", inputs));
  return inputs.map(({ input }) => input);
}

function createMedicalInfoDialog() {
  let dialog;
  const closeDialog = () => {
    if (dialog.close) {
      dialog.close();
      return;
    }

    dialog.removeAttribute("open");
  };
  const openDialog = () => {
    if (dialog.showModal) {
      dialog.showModal();
      return;
    }

    dialog.setAttribute("open", "true");
  };

  dialog = createElement("dialog", { className: "info-dialog" }, [
    createElement("h3", { text: "Pontos de atencao" }),
    createElement("p", {
      text: "Estas informacoes ajudam a organizar observacoes para o pediatra. O app nao substitui avaliacao medica."
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
    ),
    createElement("h3", { text: "Referencias" }),
    createElement("ul", {}, [
      referenceLink("AAP - primeira visita do recem-nascido", "https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-health-assessment-and-promotion/first-office-visit-3-5-days/"),
      referenceLink("HealthyChildren - urina e evacuacoes nos primeiros dias", "https://www.healthychildren.org/English/ages-stages/baby/Pages/babys-first-days-bowel-movements-and-urination.aspx"),
      referenceLink("HealthyChildren - diarreia em bebes", "https://www.healthychildren.org/english/ages-stages/baby/diapers-clothing/pages/diarrhea-in-babies.aspx"),
      referenceLink("NICHD - fundamentos de saude infantil", "https://www.nichd.nih.gov/health/topics/infantcare/conditioninfo/basics")
    ]),
    createElement("button", {
      className: "secondary-button",
      text: "Fechar",
      attributes: { type: "button" },
      events: { click: closeDialog }
    })
  ]);
  const button = createElement("button", {
    className: "inline-link-button",
    attributes: { type: "button" },
    events: { click: openDialog }
  }, [iconText("info", "Ler mais")]);

  return createElement("span", { className: "medical-note__actions" }, [button, dialog]);
}

function referenceLink(label, href) {
  const link = createElement("a", {
    text: label,
    attributes: {
      href,
      rel: "noreferrer",
      target: "_blank"
    }
  });

  return createElement("li", {}, [link]);
}

function addFeedingSideOptions(fields) {
  const inputs = FEEDING_SIDES.map((option) => {
    const choice = createChoiceInput("radio", "feedingSide", option);
    return choice;
  });

  fields.push(
    renderOptionGroup("Seio opcional", inputs),
    createElement("span", { className: "field-hint", text: "Deixe em branco para registrar a mamada sem separar por lado." })
  );
  return inputs.map(({ input }) => input);
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
      createElement("legend", { text: "Duracao aproximada" }),
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

function createEmptyDiaperFields() {
  return {
    weightInput: null,
    peeInputs: [],
    poopInputs: [],
    optionInputs: [],
    stoolInputs: [],
    attentionInputs: []
  };
}

function getCheckedValue(inputs) {
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

  return labels[level] || "atencao";
}

function getTitle(sheet) {
  if (sheet.mode === "start") {
    return `Iniciar ${LABELS[sheet.type]}`;
  }

  if (sheet.mode === "finish") {
    return `Finalizar ${LABELS[sheet.type]}`;
  }

  if (sheet.mode === "duration") {
    return `Registrar ${LABELS[sheet.type]} por duracao`;
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
