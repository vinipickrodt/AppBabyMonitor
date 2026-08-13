import { renderBottomNavigation, MAIN_ROUTES } from "../components/BottomNavigation.js";
import { renderHeader } from "../components/Header.js";
import { renderSummaryCards } from "../components/SummaryCards.js";
import { renderQuickActions } from "../components/QuickActions.js";
import { renderEntryList } from "../components/EntryList.js";
import { renderActiveSessionCard } from "../components/ActiveSessionCard.js";
import { renderDiaperRecordScreen } from "../components/DiaperRecordScreen.js";
import { renderRecordSheet } from "../components/RecordSheet.js";
import { renderSnackbar } from "../components/Snackbar.js";
import { EVENT_TYPES, FEEDING_SIDES, getCurrentFeedingSide, getFeedingSessionMetrics } from "../domain/babyEvents.js";
import { formatElapsedDuration, formatSleepDuration } from "../domain/stats.js";
import { createElement, formatTime } from "../ui/dom.js";

const DEFAULT_ROUTE = "today";
const VALID_ROUTES = new Set(MAIN_ROUTES.map((route) => route.id));
const SNACKBAR_DURATION_MS = 5000;

export class App {
  constructor(root, { babyLogService }) {
    this.root = root;
    this.babyLogService = babyLogService;
    this.state = {
      entries: [],
      activeRecords: {},
      route: getRouteFromLocation(),
      now: new Date(),
      snackbar: null,
      isActionPending: false
    };
    this.sheet = null;
    this.clockId = null;
    this.snackbarTimerId = null;
    this.onRouteChange = () => {
      this.state.route = getRouteFromLocation();
      this.state.now = new Date();
      this.sheet = null;
      this.render();
    };
  }

  start() {
    window.addEventListener("hashchange", this.onRouteChange);

    if (!window.location.hash) {
      history.replaceState(null, "", `#${DEFAULT_ROUTE}`);
    }

    if (!this.clockId) {
      this.clockId = window.setInterval(() => {
        this.updateActiveSessionClock();
      }, 1000);
    }

    this.refresh();
  }

  async refresh() {
    const dashboard = await this.babyLogService.getDashboard();
    this.state = {
      ...dashboard,
      route: this.state.route || getRouteFromLocation(),
      now: new Date(),
      snackbar: this.state.snackbar,
      isActionPending: this.state.isActionPending
    };
    this.render();
  }

  render() {
    const isFocusedDiaperScreen = this.sheet?.type === EVENT_TYPES.DIAPER;
    const shouldShowNavigation = !this.sheet;
    this.root.className = isFocusedDiaperScreen
      ? "app-screen focused-screen"
      : shouldShowNavigation
        ? "app-screen app-screen--with-nav"
        : "app-screen";
    this.root.toggleAttribute("aria-busy", this.state.isActionPending);
    const children = [];

    if (isFocusedDiaperScreen) {
      children.push(this.renderFocusedDiaperScreen());
    } else {
      children.push(
        renderHeader(this.state.entries, {
          now: this.state.now,
          onOpenSettings: () => this.navigate("profile")
        }),
        renderActiveSessionCard(this.state.activeRecords, {
          now: this.state.now,
          isActionPending: this.state.isActionPending,
          onFinishRecord: (type) =>
            this.runAction(() => this.babyLogService.finishRecord(type), {
              successMessage: type === EVENT_TYPES.SLEEP ? "Sono encerrado." : "Mamada encerrada.",
              undoEntry: true
            }),
          onPauseFeeding: () =>
            this.runAction(() => this.babyLogService.pauseRecord(EVENT_TYPES.FEEDING), {
              successMessage: "Mamada pausada."
            }),
          onResumeFeeding: () =>
            this.runAction(() => this.babyLogService.resumeRecord(EVENT_TYPES.FEEDING), {
              successMessage: "Mamada retomada."
            }),
          onSwitchFeedingSide: (side) =>
            this.runAction(() => this.babyLogService.switchFeedingSide(side), {
              successMessage: "Lado da mamada atualizado."
            })
        }),
        this.renderCurrentRoute(),
        this.sheet ? this.renderSheet() : document.createDocumentFragment()
      );
    }

    children.push(
      renderSnackbar(this.state.snackbar, {
        onAction: () => this.handleSnackbarAction(),
        onClose: () => this.clearSnackbar()
      }),
      shouldShowNavigation
        ? renderBottomNavigation({
            currentRoute: this.state.route,
            onNavigate: (route) => this.navigate(route)
          })
        : document.createDocumentFragment()
    );

    this.root.replaceChildren(...children);
    this.applyBusyState();
  }

  renderCurrentRoute() {
    if (this.state.route === "history") {
      return this.renderHistoryRoute();
    }

    if (this.state.route === "insights") {
      return this.renderInsightsRoute();
    }

    if (this.state.route === "profile") {
      return this.renderProfileRoute();
    }

    return this.renderTodayRoute();
  }

  renderTodayRoute() {
    return createElement("section", { className: "content-stack", attributes: { "aria-label": "Hoje" } }, [
      renderSummaryCards(this.state.entries),
      renderQuickActions({
        activeRecords: this.state.activeRecords,
        isActionPending: this.state.isActionPending,
        onStartRecord: (type) =>
          this.runAction(() => this.babyLogService.startRecord(type), {
            successMessage: getStartRecordMessage(type, this.state.activeRecords)
          }),
        onStartFeeding: (side) =>
          this.runAction(
            () => this.babyLogService.startRecord(EVENT_TYPES.FEEDING, { details: { feedingSide: side } }),
            {
              successMessage: getStartFeedingSuccessMessage(this.state.activeRecords[EVENT_TYPES.SLEEP], side)
            }
          ),
        onSwitchFeedingSide: (side) =>
          this.runAction(() => this.babyLogService.switchFeedingSide(side), {
            successMessage: "Lado da mamada atualizado."
          }),
        onPauseFeeding: () =>
          this.runAction(() => this.babyLogService.pauseRecord(EVENT_TYPES.FEEDING), {
            successMessage: "Mamada pausada."
          }),
        onResumeFeeding: () =>
          this.runAction(() => this.babyLogService.resumeRecord(EVENT_TYPES.FEEDING), {
            successMessage: "Mamada retomada."
          }),
        onFinishFeeding: () =>
          this.runAction(() => this.babyLogService.finishRecord(EVENT_TYPES.FEEDING), {
            successMessage: "Mamada encerrada.",
            undoEntry: true
          }),
        onFinishRecord: (type) =>
          this.runAction(() => this.babyLogService.finishRecord(type), {
            successMessage: type === EVENT_TYPES.SLEEP ? "Sono encerrado." : "Registro encerrado.",
            undoEntry: true
          }),
        onOpenSheet: (sheet) => {
          if (this.state.isActionPending) {
            return;
          }

          this.sheet = sheet;
          this.render();
        }
      }),
      renderEntryList(this.state.entries, {
        isActionPending: this.state.isActionPending,
        onRemove: (id) =>
          this.runAction(() => this.babyLogService.removeEntry(id), {
            successMessage: "Registro apagado.",
            undoRemovedEntry: true
          }),
        onOpenHistory: () => this.navigate("history")
      })
    ]);
  }

  renderHistoryRoute() {
    return createElement("section", { className: "content-stack route-panel", attributes: { "aria-labelledby": "history-title" } }, [
      createElement("div", { className: "route-panel__header" }, [
        createElement("h2", { text: "Histórico", attributes: { id: "history-title" } }),
        createElement("p", { text: "Todos os registros salvos ficam aqui enquanto a linha do tempo completa e os filtros entram na próxima etapa." })
      ]),
      renderEntryList(this.state.entries, {
        isActionPending: this.state.isActionPending,
        onRemove: (id) =>
          this.runAction(() => this.babyLogService.removeEntry(id), {
            successMessage: "Registro apagado.",
            undoRemovedEntry: true
          }),
        limit: this.state.entries.length
      })
    ]);
  }

  renderInsightsRoute() {
    return createElement("section", { className: "content-stack route-panel", attributes: { "aria-labelledby": "insights-title" } }, [
      createElement("div", { className: "route-panel__header" }, [
        createElement("h2", { text: "Insights", attributes: { id: "insights-title" } }),
        createElement("p", { text: "Resumo inicial do dia. Médias, períodos e dados pendentes entram depois que o histórico estiver pronto." })
      ]),
      renderSummaryCards(this.state.entries)
    ]);
  }

  renderProfileRoute() {
    return createElement("section", { className: "content-stack route-panel", attributes: { "aria-labelledby": "profile-title" } }, [
      createElement("div", { className: "route-panel__header" }, [
        createElement("h2", { text: "Perfil", attributes: { id: "profile-title" } }),
        createElement("p", { text: "Preferências do bebê, modalidades de alimentação, lembretes e exportação de dados serão concentrados aqui." })
      ]),
      createElement("article", { className: "placeholder-card" }, [
        createElement("strong", { text: "Baby Monitor local" }),
        createElement("span", { text: "Os dados continuam salvos neste dispositivo e preparados para múltiplos cuidadores no futuro." })
      ])
    ]);
  }

  renderSheet() {
    if (this.sheet?.type === EVENT_TYPES.DIAPER) {
      return this.renderFocusedDiaperScreen();
    }

    return renderRecordSheet(this.sheet, {
      activeRecord: this.state.activeRecords[this.sheet.type],
      isActionPending: this.state.isActionPending,
      onCancel: () => {
        if (this.state.isActionPending) {
          return;
        }

        this.sheet = null;
        this.render();
      },
      onSubmit: (payload) => this.submitSheet(payload)
    });
  }

  renderFocusedDiaperScreen() {
    return renderDiaperRecordScreen({
      now: this.state.now,
      isActionPending: this.state.isActionPending,
      onCancel: () => {
        if (this.state.isActionPending) {
          return;
        }

        this.sheet = null;
        this.render();
      },
      onSubmit: (payload) => this.submitSheet(payload)
    });
  }

  navigate(route) {
    if (!VALID_ROUTES.has(route) || route === this.state.route) {
      return;
    }

    if (this.state.isActionPending) {
      return;
    }

    window.location.hash = route;
  }

  async runAction(
    action,
    { successMessage = null, undoEntry = false, undoRemovedEntry = false, refreshOnSuccess = true } = {}
  ) {
    if (this.state.isActionPending) {
      this.showSnackbar("Já existe uma ação em andamento.", { variant: "info" });
      return null;
    }

    this.setActionPending(true);

    try {
      const result = await action();

      if (successMessage && result !== null && result !== undefined) {
        this.showSnackbar(successMessage, {
          variant: "success",
          actionLabel: undoEntry || undoRemovedEntry ? "Desfazer" : null,
          onAction:
            undoEntry && result
              ? () => this.undoCreatedEntry(result)
              : undoRemovedEntry && result
                ? () => this.undoRemovedEntry(result)
                : null
        });
      }

      if (refreshOnSuccess) {
        await this.refresh();
      }
      return result;
    } catch (error) {
      this.showSnackbar(formatActionError(error), { variant: "error" });
      return null;
    } finally {
      this.setActionPending(false);
    }
  }

  async submitSheet(payload) {
    const sheet = this.sheet;
    if (!sheet) {
      return;
    }

    const success = await this.runAction(() => {
      if (sheet.mode === "start") {
        return this.babyLogService.startRecord(sheet.type, {
          details: payload.details
        });
      }

      if (sheet.mode === "finish") {
        return this.babyLogService.finishRecord(sheet.type, { notes: payload.notes });
      }

      if (sheet.mode === "duration") {
        return this.babyLogService.addRecordWithDuration(sheet.type, payload.durationMinutes, {
          notes: payload.notes,
          details: payload.details
        });
      }

      return this.babyLogService.addInstantRecord(sheet.type, {
        notes: payload.notes,
        details: payload.details
      }, payload.occurredAt ? new Date(payload.occurredAt) : new Date());
    }, {
      successMessage: getSheetSuccessMessage(sheet),
      undoEntry: sheet.mode !== "start",
      refreshOnSuccess: false
    });

    if (success === null) {
      return;
    }

    this.sheet = null;
    await this.refresh();
  }

  async undoCreatedEntry(entry) {
    await this.runAction(() => this.babyLogService.removeEntry(entry.id), {
      successMessage: "Registro desfeito."
    });
  }

  async undoRemovedEntry(entry) {
    await this.runAction(() => this.babyLogService.restoreEntry(entry), {
      successMessage: "Registro restaurado."
    });
  }

  showSnackbar(message, { variant = "success", actionLabel = null, onAction = null } = {}) {
    if (this.snackbarTimerId) {
      window.clearTimeout(this.snackbarTimerId);
      this.snackbarTimerId = null;
    }

    this.state.snackbar = {
      id: crypto.randomUUID(),
      message,
      variant,
      actionLabel,
      onAction
    };

    this.render();

    this.snackbarTimerId = window.setTimeout(() => {
      this.clearSnackbar();
    }, SNACKBAR_DURATION_MS);
  }

  clearSnackbar() {
    if (this.snackbarTimerId) {
      window.clearTimeout(this.snackbarTimerId);
      this.snackbarTimerId = null;
    }

    if (!this.state.snackbar) {
      return;
    }

    this.state.snackbar = null;
    this.render();
  }

  async handleSnackbarAction() {
    const snackbar = this.state.snackbar;

    if (!snackbar?.onAction) {
      this.clearSnackbar();
      return;
    }

    this.clearSnackbar();
    await snackbar.onAction();
  }

  setActionPending(isPending) {
    this.state.isActionPending = isPending;
    this.applyBusyState();
  }

  applyBusyState() {
    this.root.toggleAttribute("aria-busy", this.state.isActionPending);
    this.root.querySelectorAll("button").forEach((button) => {
      if (this.state.isActionPending) {
        if (!button.disabled) {
          button.dataset.appDisabled = "true";
          button.disabled = true;
        }
        return;
      }

      if (button.dataset.appDisabled === "true") {
        button.disabled = false;
        delete button.dataset.appDisabled;
      }
    });
  }

  updateActiveSessionClock() {
    const activeSession = this.root.querySelector("[data-active-session='true']");

    if (!activeSession) {
      return;
    }

    const feedingRecord = this.state.activeRecords[EVENT_TYPES.FEEDING];
    const sleepRecord = this.state.activeRecords[EVENT_TYPES.SLEEP];
    const activeRecord = feedingRecord || sleepRecord;

    if (!activeRecord) {
      return;
    }

    const type = feedingRecord ? EVENT_TYPES.FEEDING : EVENT_TYPES.SLEEP;
    const now = new Date();
    this.state.now = now;
    const durationLabel = formatElapsedDuration(activeRecord.startedAt, now);
    const startLabel = formatTime(activeRecord.startedAt);
    const footerAction = type === EVENT_TYPES.SLEEP ? "Acordar agora" : "Pausar, trocar lado ou finalizar";

    activeSession.setAttribute(
      "aria-label",
      `${type === EVENT_TYPES.SLEEP ? "Sono ativo" : "Mamada ativa"}, iniciada às ${startLabel}. Duração atual ${durationLabel}. Toque para ${
        type === EVENT_TYPES.SLEEP ? "finalizar o sono" : "finalizar a mamada"
      }.`
    );

    const durationNode = this.root.querySelector("[data-active-session-duration='true']");
    if (durationNode) {
      durationNode.textContent = durationLabel;
    }

    const footerActionNode = this.root.querySelector("[data-active-session-footer-action='true']");
    if (footerActionNode) {
      footerActionNode.textContent = footerAction;
    }

    if (type === EVENT_TYPES.FEEDING) {
      const metrics = getFeedingSessionMetrics(activeRecord, now);
      const currentSide = getCurrentFeedingSide(activeRecord);
      const currentSideLabel = currentSide
        ? FEEDING_SIDES.find((option) => option.value === currentSide)?.label || "Seio não informado"
        : metrics.lastSide
          ? FEEDING_SIDES.find((option) => option.value === metrics.lastSide)?.label || "Seio não informado"
          : "Sem seio selecionado";

      const currentSideNode = this.root.querySelector("[data-active-session-current-side='true']");
      if (currentSideNode) {
        currentSideNode.textContent = metrics.isPaused
          ? "Pausada · retome em um lado para continuar"
          : `Seio atual: ${currentSideLabel}`;
      }

      const totalsNode = this.root.querySelector("[data-active-session-feeding-totals='true']");
      if (totalsNode) {
        totalsNode.textContent = `Totais: Esquerdo ${formatSleepDuration(metrics.sideTotals.left)} · Direito ${formatSleepDuration(metrics.sideTotals.right)}`;
      }

      const effectiveNode = this.root.querySelector("[data-active-session-feed-effective='true']");
      if (effectiveNode) {
        effectiveNode.textContent = `Tempo efetivo: ${formatSleepDuration(metrics.effectiveMinutes)}`;
      }
      return;
    }

    const sleepSummaryNode = this.root.querySelector("[data-active-session-sleep-summary='true']");
    if (sleepSummaryNode) {
      sleepSummaryNode.textContent = `Dormindo há ${durationLabel}`;
    }
  }
}

function getRouteFromLocation() {
  const route = window.location.hash.replace(/^#\/?/, "");

  return VALID_ROUTES.has(route) ? route : DEFAULT_ROUTE;
}

function getSheetSuccessMessage(sheet) {
  if (sheet.type === EVENT_TYPES.DIAPER && sheet.mode === "instant") {
    return "Fralda registrada.";
  }

  if (sheet.mode === "start") {
    return sheet.type === EVENT_TYPES.SLEEP ? "Sono iniciado." : "Mamada iniciada.";
  }

  if (sheet.mode === "finish") {
    return sheet.type === EVENT_TYPES.SLEEP ? "Sono encerrado." : "Mamada encerrada.";
  }

  if (sheet.mode === "duration") {
    return sheet.type === EVENT_TYPES.SLEEP ? "Sono registrado." : "Mamada registrada.";
  }

  return "Registro salvo.";
}

function getStartSuccessMessage(type) {
  if (type === EVENT_TYPES.SLEEP) {
    return "Sono iniciado.";
  }

  if (type === EVENT_TYPES.FEEDING) {
    return "Mamada iniciada.";
  }

  return "Registro iniciado.";
}

function getStartRecordMessage(type, activeRecords) {
  const feedingActive = Boolean(activeRecords[EVENT_TYPES.FEEDING]);
  const sleepActive = Boolean(activeRecords[EVENT_TYPES.SLEEP]);

  if (type === EVENT_TYPES.SLEEP && feedingActive) {
    return "Mamada encerrada e sono iniciado.";
  }

  if (type === EVENT_TYPES.FEEDING && sleepActive) {
    return "Sono encerrado e mamada iniciada.";
  }

  return getStartSuccessMessage(type);
}

function getStartFeedingSuccessMessage(sleepRecord, side) {
  if (!sleepRecord) {
    return `Mamada iniciada no ${side === "left" ? "seio esquerdo" : "seio direito"}.`;
  }

  return `Sono encerrado e mamada iniciada no ${side === "left" ? "seio esquerdo" : "seio direito"}.`;
}

function formatActionError(error) {
  if (!error) {
    return "Não foi possível concluir a ação.";
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/Selecione um seio válido/i.test(message)) {
    return "Não foi possível iniciar a mamada: selecione um seio válido.";
  }

  if (/conteúdo da fralda/i.test(message)) {
    return "Não foi possível salvar: selecione o conteúdo da fralda.";
  }

  if (/peso da fralda/i.test(message)) {
    return "Não foi possível salvar: o peso da fralda deve ser um número maior ou igual a zero.";
  }

  if (/duração/i.test(message)) {
    return message.startsWith("Não foi possível") ? message : `Não foi possível salvar: ${message}`;
  }

  return message.startsWith("Não foi possível") ? message : `Não foi possível concluir a ação: ${message}`;
}
