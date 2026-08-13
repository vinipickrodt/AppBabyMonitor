import { renderBottomNavigation, MAIN_ROUTES } from "../components/BottomNavigation.js";
import { renderHeader } from "../components/Header.js";
import { renderSummaryCards } from "../components/SummaryCards.js";
import { renderQuickActions } from "../components/QuickActions.js";
import { renderEntryList } from "../components/EntryList.js";
import { renderRecordSheet } from "../components/RecordSheet.js";
import { createElement } from "../ui/dom.js";

const DEFAULT_ROUTE = "today";
const VALID_ROUTES = new Set(MAIN_ROUTES.map((route) => route.id));

export class App {
  constructor(root, { babyLogService }) {
    this.root = root;
    this.babyLogService = babyLogService;
    this.state = {
      entries: [],
      activeRecords: {},
      route: getRouteFromLocation()
    };
    this.sheet = null;
    this.onRouteChange = () => {
      this.state.route = getRouteFromLocation();
      this.sheet = null;
      this.render();
    };
  }

  start() {
    window.addEventListener("hashchange", this.onRouteChange);

    if (!window.location.hash) {
      history.replaceState(null, "", `#${DEFAULT_ROUTE}`);
    }

    this.refresh();
  }

  async refresh() {
    this.state = await this.babyLogService.getDashboard();
    this.render();
  }

  render() {
    const shouldShowNavigation = !this.sheet;
    this.root.className = shouldShowNavigation ? "app-shell app-shell--with-nav" : "app-shell";
    this.root.replaceChildren(
      renderHeader(),
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
        onRemove: (id) => this.runAction(() => this.babyLogService.removeEntry(id))
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
        onRemove: (id) => this.runAction(() => this.babyLogService.removeEntry(id))
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
}

function getRouteFromLocation() {
  const route = window.location.hash.replace(/^#\/?/, "");

  return VALID_ROUTES.has(route) ? route : DEFAULT_ROUTE;
}
