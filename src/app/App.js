import { renderBottomNavigation, MAIN_ROUTES } from "../components/BottomNavigation.js";
import { renderHeader } from "../components/Header.js";
import { renderSummaryCards } from "../components/SummaryCards.js";
import { renderQuickActions } from "../components/QuickActions.js";
import { renderEntryList } from "../components/EntryList.js";
import { renderActiveSessionCard } from "../components/ActiveSessionCard.js";
import { renderRecordSheet } from "../components/RecordSheet.js";
import { EVENT_TYPES, FEEDING_SIDES, getCurrentFeedingSide, getFeedingSideTotals } from "../domain/babyEvents.js";
import { formatElapsedDuration, formatSleepDuration } from "../domain/stats.js";
import { createElement, formatTime } from "../ui/dom.js";

const DEFAULT_ROUTE = "today";
const VALID_ROUTES = new Set(MAIN_ROUTES.map((route) => route.id));

export class App {
  constructor(root, { babyLogService }) {
    this.root = root;
    this.babyLogService = babyLogService;
    this.state = {
      entries: [],
      activeRecords: {},
      route: getRouteFromLocation(),
      now: new Date()
    };
    this.sheet = null;
    this.clockId = null;
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
      now: new Date()
    };
    this.render();
  }

  render() {
    const shouldShowNavigation = !this.sheet;
    this.root.className = shouldShowNavigation ? "app-shell app-shell--with-nav" : "app-shell";
    this.root.replaceChildren(
      renderHeader(this.state.entries),
      renderActiveSessionCard(this.state.activeRecords, {
        now: this.state.now,
        onOpenSheet: (sheet) => {
          this.sheet = sheet;
          this.render();
        }
      }),
      this.renderCurrentRoute(),
      this.sheet ? this.renderSheet() : document.createDocumentFragment(),
      shouldShowNavigation
        ? renderBottomNavigation({
            currentRoute: this.state.route,
            onNavigate: (route) => this.navigate(route)
          })
        : document.createDocumentFragment()
    );
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
        onStartRecord: (type) => this.runAction(() => this.babyLogService.startRecord(type)),
        onSwitchFeedingSide: (side) => this.runAction(() => this.babyLogService.switchFeedingSide(side)),
        onOpenSheet: (sheet) => {
          this.sheet = sheet;
          this.render();
        }
      }),
      renderEntryList(this.state.entries, {
        onRemove: (id) => this.runAction(() => this.babyLogService.removeEntry(id)),
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
        onRemove: (id) => this.runAction(() => this.babyLogService.removeEntry(id)),
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
    return renderRecordSheet(this.sheet, {
      activeRecord: this.state.activeRecords[this.sheet.type],
      onCancel: () => {
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

    window.location.hash = route;
  }

  async runAction(action) {
    await action();
    await this.refresh();
  }

  async submitSheet(payload) {
    const sheet = this.sheet;

    await this.runAction(() => {
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
      });
    });

    this.sheet = null;
    this.render();
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
    const footerAction = type === EVENT_TYPES.SLEEP ? "Finalizar sono" : "Finalizar mamada";

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
      const currentSide = getCurrentFeedingSide(activeRecord);
      const currentSideLabel = currentSide
        ? FEEDING_SIDES.find((option) => option.value === currentSide)?.label || "Seio não informado"
        : "Sem seio selecionado";
      const totals = getFeedingSideTotals(activeRecord, now);

      const currentSideNode = this.root.querySelector("[data-active-session-current-side='true']");
      if (currentSideNode) {
        currentSideNode.textContent = `Seio atual: ${currentSideLabel}`;
      }

      const totalsNode = this.root.querySelector("[data-active-session-feeding-totals='true']");
      if (totalsNode) {
        totalsNode.textContent = `Totais: Esquerdo ${formatSleepDuration(totals.left)} · Direito ${formatSleepDuration(totals.right)}`;
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
