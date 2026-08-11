import { renderHeader } from "../components/Header.js";
import { renderSummaryCards } from "../components/SummaryCards.js";
import { renderQuickActions } from "../components/QuickActions.js";
import { renderEntryList } from "../components/EntryList.js";
import { renderRecordSheet } from "../components/RecordSheet.js";
import { createElement } from "../ui/dom.js";

export class App {
  constructor(root, { babyLogService }) {
    this.root = root;
    this.babyLogService = babyLogService;
    this.state = {
      entries: [],
      activeRecords: {}
    };
    this.sheet = null;
  }

  start() {
    this.refresh();
  }

  async refresh() {
    this.state = await this.babyLogService.getDashboard();
    this.render();
  }

  render() {
    this.root.replaceChildren(
      renderHeader(),
      createElement("section", { className: "content-stack" }, [
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
        }),
        this.sheet
          ? renderRecordSheet(this.sheet, {
              activeRecord: this.state.activeRecords[this.sheet.type],
              onCancel: () => {
                this.sheet = null;
                this.render();
              },
              onSubmit: (payload) => this.submitSheet(payload)
            })
          : document.createDocumentFragment()
      ])
    );
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
