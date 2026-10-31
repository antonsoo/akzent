import { initialNotebook, type Notebook, readNotebook } from "./core/record.ts";

export const SHARED_KEY = "akzent-notebook-v1";
const TAB_KEY = "akzent-tab-notebook-v1";
const BASE_KEY = "akzent-tab-base-v1";
const UNDO_KEY = "akzent-tab-previous-v1";
const RECOVERY_PREFIX = "akzent-recovery-v1:";

export interface SaveResult {
  conflict: boolean;
  message: string;
}

/** Each tab keeps its own working copy; the shared slot is changed only from a known base. */
export class NotebookStorage {
  readonly initial: Notebook;
  readonly initialNotice: string;
  private base: string | null = null;
  private tail: Promise<unknown> = Promise.resolve();
  private previousInPage: Notebook | undefined;
  private unreadable = false;
  private readonly recoveryKey = `${RECOVERY_PREFIX}${crypto.randomUUID()}`;

  constructor() {
    let selected: string | null = null;
    let notice =
      "Changes are kept in this tab and saved in this browser. Save JSON for a separate copy.";
    try {
      const shared = localStorage.getItem(SHARED_KEY);
      selected = shared;
      this.base = shared;
    } catch {
      notice = "Browser storage could not be read. Save JSON to keep your work.";
    }
    try {
      const tab = sessionStorage.getItem(TAB_KEY);
      if (tab) {
        this.base = tab === selected ? selected : sessionStorage.getItem(BASE_KEY);
        selected = tab;
      }
    } catch {
      notice = "Browser storage could not be read. Save JSON to keep your work.";
    }
    try {
      this.initial = selected ? readNotebook(selected) : initialNotebook();
    } catch {
      this.initial = initialNotebook();
      this.unreadable = true;
      this.base = null;
      if (selected) {
        try {
          this.retain(selected, `${RECOVERY_PREFIX}${crypto.randomUUID()}`);
        } catch {
          /* The existing shared slot is left untouched by an ordinary save. */
        }
      }
      notice =
        "A browser copy could not be read. The shared browser copy will not be replaced automatically; save JSON to keep new work.";
    }
    this.initialNotice = notice;
  }

  private writeTab(text: string): void {
    sessionStorage.setItem(TAB_KEY, text);
    if (this.base === null) sessionStorage.removeItem(BASE_KEY);
    else sessionStorage.setItem(BASE_KEY, this.base);
  }

  private retain(text: string, key = this.recoveryKey): void {
    localStorage.setItem(
      key,
      JSON.stringify({ savedAt: new Date().toISOString(), notebook: text }),
    );
  }

  changedOutside(text: string): boolean {
    try {
      const latest = localStorage.getItem(SHARED_KEY);
      return latest !== this.base && latest !== text;
    } catch {
      return false;
    }
  }

  save(notebook: Notebook, force = false): Promise<SaveResult> {
    const text = JSON.stringify(notebook);
    const locked = typeof navigator.locks?.request === "function";
    // Keep the live tab's newest input before waiting for another page's storage lock.
    let tabRetained = true;
    try {
      this.writeTab(text);
    } catch {
      tabRetained = false;
      /* The shared copy and downloads remain available. */
    }
    const write = async (): Promise<SaveResult> => {
      try {
        if (!locked || !tabRetained) this.retain(text);
        const latest = localStorage.getItem(SHARED_KEY);
        if (!force && latest !== this.base && latest !== text) {
          this.retain(text);
          return {
            conflict: true,
            message: this.unreadable
              ? "An unreadable browser copy has been left untouched. This notebook is kept separately; recovery copies can also be downloaded as raw JSON."
              : "Another tab saved a different notebook. This tab's work is kept separately, including a browser recovery copy.",
          };
        }
        if (force && latest !== null && latest !== text)
          this.retain(latest, `${RECOVERY_PREFIX}${crypto.randomUUID()}`);
        localStorage.setItem(SHARED_KEY, text);
        this.base = text;
        this.unreadable = false;
        // Do not replace the newer tab copy if later edits queued another save.
        try {
          sessionStorage.setItem(BASE_KEY, text);
        } catch {
          /* Shared save already succeeded. */
        }
        if (locked && tabRetained) localStorage.removeItem(this.recoveryKey);
        return {
          conflict: false,
          message: tabRetained
            ? "Changes are kept in this tab and saved in this browser. Save JSON for a separate copy."
            : "Changes are saved in this browser, including a recovery copy. This tab cannot retain its own reload copy; save JSON for a separate copy.",
        };
      } catch {
        return {
          conflict: this.changedOutside(text),
          message:
            "Browser storage could not save a separate copy. Your work is still on this page; save editable JSON now.",
        };
      }
    };
    const operation = this.tail.then(() =>
      locked ? navigator.locks.request("akzent-shared-notebook", write) : write(),
    );
    this.tail = operation.catch(() => undefined);
    return operation;
  }

  async shared(): Promise<{ notebook: Notebook; raw: string }> {
    await this.tail;
    const text = localStorage.getItem(SHARED_KEY);
    if (text === null) throw new Error("There is no other saved browser notebook to open.");
    const result = readNotebook(text);
    return { notebook: result, raw: text };
  }

  acceptShared(raw: string): void {
    this.base = raw;
  }

  keepPrevious(notebook: Notebook): void {
    this.previousInPage = notebook;
    try {
      sessionStorage.setItem(UNDO_KEY, JSON.stringify(notebook));
    } catch {
      /* The undo copy remains available on this page when storage is blocked. */
    }
    const text = JSON.stringify(notebook);
    if (
      text !== JSON.stringify(initialNotebook()) &&
      !this.recoveries().some((copy) => copy.raw === text)
    ) {
      try {
        this.retain(text, `${RECOVERY_PREFIX}${crypto.randomUUID()}`);
      } catch {
        /* In-page undo is still available; save status reports unavailable persistence. */
      }
    }
  }

  previous(): Notebook | undefined {
    if (this.previousInPage) return this.previousInPage;
    const text = sessionStorage.getItem(UNDO_KEY);
    return text ? readNotebook(text) : undefined;
  }

  recoveries(): { key: string; label: string; raw: string; notebook?: Notebook }[] {
    const copies: {
      key: string;
      label: string;
      raw: string;
      notebook?: Notebook;
      timestamp: number;
    }[] = [];
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(RECOVERY_PREFIX)) continue;
        try {
          const value = JSON.parse(localStorage.getItem(key) ?? "null") as {
            savedAt: string;
            notebook: string;
          };
          if (typeof value?.savedAt !== "string" || typeof value.notebook !== "string") continue;
          const date = new Date(value.savedAt);
          if (!Number.isFinite(date.valueOf())) continue;
          let notebook: Notebook | undefined;
          try {
            notebook = readNotebook(value.notebook);
          } catch {
            /* Preserve unknown formats as raw JSON. */
          }
          copies.push({
            key,
            label: `${date.toLocaleString()} / ${notebook ? `${notebook.trials.length} predictions / ${notebook.note.slice(0, 65) || "No explanation yet"}` : "Unreadable notebook format; save raw JSON"}`,
            raw: value.notebook,
            ...(notebook ? { notebook } : {}),
            timestamp: date.valueOf(),
          });
        } catch {
          /* An unrelated or damaged recovery entry is not a valid notebook. */
        }
      }
    } catch {
      /* Downloads remain available when storage is blocked. */
    }
    return copies.sort((a, b) => b.timestamp - a.timestamp);
  }
}
