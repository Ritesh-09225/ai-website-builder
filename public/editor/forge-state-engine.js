/*!
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            FORGE Pro — State Engine  v2.0.0                             ║
 * ║            File: forge-state-engine.js                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Implements a JSON-driven MVC architecture over the existing             ║
 * ║  FORGE Pro builder. The JSON object is the Single Source of Truth        ║
 * ║  and the DOM is a pure reflection of that state.                         ║
 * ║                                                                          ║
 * ║  SECTION 1  STATE INITIALIZATION   pageTitle · activePageId · elements  ║
 * ║  SECTION 2  LOCALSTORAGE SYNC      saveToLocalStorage · initFromStorage  ║
 * ║  SECTION 3  MASTER RENDER ENGINE   renderCanvas()                        ║
 * ║  SECTION 4  UPDATE-SYNC CYCLE      updateElement(id, key, value)         ║
 * ║  SECTION 5  HISTORY ENGINE         ForgeHistory · undo · redo · timeline ║
 * ║  SECTION 6  DATA EXPORT/IMPORT     exportProject · importProject         ║
 * ║  SECTION 7  FILE HELPERS           downloadProjectJSON · importFromFile  ║
 * ║  SECTION 8  INTERACTION PATCHES    Routes sidebar/resize to updateElement ║
 * ║  SECTION 9  PUBLIC API & BOOTSTRAP Wires everything together             ║
 * ║                                                                          ║
 * ║  Integration: Drop AFTER index.html's inline <script> block,             ║
 * ║  or just before </body>:                                                 ║
 * ║    <script src="forge-state-engine.js"></script>                         ║
 * ║                                                                          ║
 * ║  Expected globals from index.html:                                       ║
 * ║    BuilderState, renderPage, renderPagesList, saveHistory,               ║
 * ║    saveHistoryDebounced, restoreHistory, deselectAll, toast,             ║
 * ║    dispatchStyleChange, dispatchAttrChange, syncPropertiesPanel          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

(function (global) {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION 1 — STATE INITIALIZATION
  //
  //  Augments the existing BuilderState with the formal properties required
  //  by the State Engine spec:
  //    · pageTitle      — Human-readable project title (global)
  //    · activePageId   — Already exists; enforced here
  //    · elements       — Accessed via BuilderState.pages[id].elements
  //
  //  Each element node in the elements map has the shape:
  //    {
  //      id:             string,   // e.g. 'f_a3bx9'
  //      tag:            string,   // HTML tag e.g. 'div', 'h2', 'p'
  //      type:           string,   // semantic type e.g. 'hero', 'navbar'
  //      text:           string,   // innerHTML for leaf nodes
  //      style:          object,   // camelCase CSS properties
  //      attributes:     object,   // HTML attributes (href, src, alt…)
  //      layoutSettings: object,   // layout-specific subset of style
  //      children:       string[], // ordered child element IDs
  //      hidden:         boolean,
  //      locked:         boolean,
  //      isHeader:       boolean,
  //      isFooter:       boolean,
  //    }
  // ══════════════════════════════════════════════════════════════════════════

  /** Layout-related CSS properties extracted into `layoutSettings`. */
  const LAYOUT_PROPS = [
    'display', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems',
    'alignContent', 'gap', 'gridTemplateColumns', 'gridTemplateRows',
    'position', 'top', 'left', 'right', 'bottom', 'zIndex',
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'overflow', 'overflowX', 'overflowY', 'boxSizing', 'flex', 'flexGrow',
    'flexShrink', 'flexBasis', 'float', 'clear',
  ];

  /**
   * Computes a `layoutSettings` view from an element's `style` object.
   * This is a computed property — it is NOT stored separately in the JSON;
   * it exists as a convenience accessor.
   *
   * @param {object} style - The element's style map.
   * @returns {object} Subset of style containing only layout properties.
   */
  function deriveLayoutSettings(style) {
    const ls = {};
    LAYOUT_PROPS.forEach(prop => {
      if (style[prop] !== undefined && style[prop] !== '') {
        ls[prop] = style[prop];
      }
    });
    return ls;
  }

  /**
   * Ensures the BuilderState has all required top-level keys.
   * Called once at bootstrap, before any rendering happens.
   */
  function initStateShape() {
    const bs = global.BuilderState;
    if (!bs) {
      console.error('[ForgeStateEngine] BuilderState not found. Ensure index.html loads first.');
      return false;
    }

    // Top-level pageTitle — a friendly name for the whole project.
    if (!bs.pageTitle) bs.pageTitle = 'Untitled Project';

    // Ensure activePageId resolves to an actual page.
    if (!bs.pages || !bs.pages[bs.activePageId]) {
      const firstId = bs.pages ? Object.keys(bs.pages)[0] : null;
      if (firstId) bs.activePageId = firstId;
    }

    // Guarantee every page has runtime history buffers.
    if (bs.pages) {
      Object.values(bs.pages).forEach(page => {
        if (!page.history) page.history = [];
        if (page.historyIdx === undefined) page.historyIdx = -1;
        if (!page.seo) page.seo = {};
        // Back-fill layoutSettings on existing element nodes.
        if (page.elements) {
          Object.values(page.elements).forEach(node => {
            if (node.style && !node.layoutSettings) {
              node.layoutSettings = deriveLayoutSettings(node.style);
            }
          });
        }
      });
    }

    return true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION 2 — STORAGE SYNC
  //
  //  Delegates to the global ForgeStorage module (forge-storage.js), which
  //  implements the full waterfall: IndexedDB → compressed localStorage →
  //  plain localStorage.  A lightweight fallback is kept here for cases where
  //  ForgeStorage has not yet loaded (e.g. very early bootstrap calls).
  // ══════════════════════════════════════════════════════════════════════════

  const STORAGE_KEY = 'forge_project';

  /** Build the slim payload (elements only, no history arrays). */
  function _buildPayload(bs) {
    const payload = {
      forgeSchemaVersion: 2,
      savedAt: new Date().toISOString(),
      pageTitle: bs.pageTitle,
      activePageId: bs.activePageId,
      pages: {},
    };
    Object.values(bs.pages).forEach(p => {
      payload.pages[p.id] = {
        id: p.id,
        name: p.name,
        seo: p.seo || {},
        elements: p.elements,
      };
    });
    return payload;
  }

  /**
   * saveToLocalStorage()
   *
   * Persists the project via ForgeStorage (IDB → compressed LS → plain LS).
   * Named "saveToLocalStorage" for API compatibility with legacy callers, but
   * now routes through the full storage waterfall when available.
   */
  function saveToLocalStorage() {
    const bs = global.BuilderState;
    if (!bs) return;

    const payload = _buildPayload(bs);

    if (global.ForgeStorage) {
      // Async, fire-and-forget — ForgeStorage handles indicator updates.
      global.ForgeStorage.save(payload).catch(err => {
        console.error('[ForgeStateEngine] ForgeStorage.save() error:', err);
      });
    } else {
      // Fallback: plain localStorage (ForgeStorage not yet loaded)
      try {
        const json = JSON.stringify(payload);
        localStorage.setItem(STORAGE_KEY, json);
        const indicator = document.getElementById('saved-time-indicator');
        if (indicator) indicator.textContent = `Saved (${Math.round(json.length / 1024)}KB)`;
      } catch (err) {
        console.error('[ForgeStateEngine] localStorage fallback save failed:', err);
        _toast('Auto-save failed — storage may be full.', 'error', 5000);
      }
    }
  }

  /**
   * initFromStorage()
   *
   * Loads a previously saved project and hydrates BuilderState.
   * NOTE: The primary async load path is handled by _doInit() in index.html.
   * This function is kept as a synchronous fallback for state-engine-only
   * bootstrap scenarios (e.g. unit tests, embedded usage).
   */
  function initFromStorage() {
    const bs = global.BuilderState;
    if (!bs) return;

    // Only use sync localStorage path here — the async IDB path is in index.html
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const pages = parsed.pages || (parsed.forgeSchemaVersion ? null : parsed);
      if (!pages || typeof pages !== 'object') return;

      bs.pages = pages;

      if (parsed.pageTitle) bs.pageTitle = parsed.pageTitle;

      if (parsed.activePageId && bs.pages[parsed.activePageId]) {
        bs.activePageId = parsed.activePageId;
      }

      // Guarantee runtime fields on loaded pages.
      Object.values(bs.pages).forEach(page => {
        if (!page.history) page.history = [];
        if (page.historyIdx === undefined) page.historyIdx = -1;
        if (!page.seo) page.seo = {};
        if (page.elements) {
          Object.values(page.elements).forEach(node => {
            if (node.style && !node.layoutSettings) {
              node.layoutSettings = deriveLayoutSettings(node.style);
            }
          });
        }
      });

      console.info('[ForgeStateEngine] ✓ Project loaded from localStorage.');
    } catch (err) {
      console.warn('[ForgeStateEngine] Failed to parse localStorage project — starting fresh.', err);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION 3 — MASTER RENDER ENGINE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * renderCanvas()
   *
   * The Master Render Engine. Wipes #page-frame and rebuilds it entirely
   * from the current BuilderState. This is the only authoritative way to
   * update the DOM — nothing else should write to canvas elements directly
   * (aside from optimistic patches in hot-path drags, which must still save
   * the final value via updateElement or dispatchStyleChange → saveHistory).
   *
   * Delegates to the existing renderPage() function in index.html, which
   * already implements the full DOM-from-state logic (createDOMFromState,
   * enforceStructuralState, etc.).
   */
  function renderCanvas() {
    if (typeof global.renderPage === 'function') {
      global.renderPage();
    } else {
      console.error('[ForgeStateEngine] renderPage() not found.');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION 4 — THE UPDATE-SYNC CYCLE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * updateElement(id, key, value)
   *
   * THE single, authoritative way to mutate any element in BuilderState.
   *
   * Accepted key formats:
   *   'text'                      — sets node.text
   *   'style.backgroundColor'     — sets node.style.backgroundColor
   *   'attributes.href'           — sets node.attributes.href
   *   'layoutSettings.display'    — sets node.style.display (mirrors to style)
   *   'hidden'                    — sets node.hidden (boolean)
   *   'locked'                    — sets node.locked (boolean)
   *   'tag'                       — changes the HTML tag (triggers full re-render)
   *   'type'                      — changes the semantic type label
   *
   * After mutation:
   *   1. layoutSettings is kept in sync with style automatically.
   *   2. A history snapshot is saved via ForgeHistory.
   *   3. The project is persisted to localStorage via saveToLocalStorage().
   *   4. renderCanvas() is called to re-sync the DOM.
   *
   * Performance note: During continuous gestures (resize drag, arrow-key
   * nudge) use dispatchStyleChange() for optimistic DOM patches; the drag-end
   * handler calls saveHistory() which routes through our new system.
   * updateElement() is for discrete, atomic changes.
   *
   * @param {string} id    - Element ID in the active page's elements map.
   * @param {string} key   - Dot-path key (see above).
   * @param {*}      value - New value to assign.
   * @returns {boolean} true if the update was applied, false if the element
   *                    was not found or the key was invalid.
   */
  function updateElement(id, key, value) {
    const bs = global.BuilderState;
    if (!bs) return false;

    const elements = bs.pages[bs.activePageId]?.elements;
    if (!elements) {
      console.warn('[ForgeStateEngine] updateElement: no active page elements found.');
      return false;
    }

    const node = elements[id];
    if (!node) {
      console.warn(`[ForgeStateEngine] updateElement: element "${id}" not found in state.`);
      return false;
    }

    // ── Parse the key ────────────────────────────────────────────────────────
    if (key.includes('.')) {
      const dotIdx = key.indexOf('.');
      const namespace = key.slice(0, dotIdx);
      const prop     = key.slice(dotIdx + 1);

      switch (namespace) {
        case 'style':
          node.style[prop] = value;
          // Keep layoutSettings mirrored.
          if (LAYOUT_PROPS.includes(prop)) {
            node.layoutSettings = node.layoutSettings || {};
            node.layoutSettings[prop] = value;
          }
          break;

        case 'attributes':
          node.attributes[prop] = value;
          break;

        // layoutSettings writes are mirrored into style so they take effect.
        case 'layoutSettings':
          node.style[prop] = value;
          node.layoutSettings = node.layoutSettings || {};
          node.layoutSettings[prop] = value;
          break;

        default:
          console.warn(`[ForgeStateEngine] updateElement: unknown namespace "${namespace}".`);
          return false;
      }
    } else {
      // Top-level properties: text, tag, type, hidden, locked, customCSS, etc.
      node[key] = value;
    }

    // ── Sync cycle ───────────────────────────────────────────────────────────
    ForgeHistory.snapshot();   // 1. Save history snapshot
    saveToLocalStorage();      // 2. Persist to localStorage
    renderCanvas();            // 3. Re-render DOM from state

    return true;
  }

  /**
   * batchUpdateElement(id, updates)
   *
   * Applies multiple key/value pairs to a single element in one atomic
   * operation — one history snapshot, one re-render.
   *
   * @param {string} id      - Element ID
   * @param {object} updates - { 'style.color': '#fff', 'text': 'Hello', … }
   * @returns {boolean}
   */
  function batchUpdateElement(id, updates) {
    const bs = global.BuilderState;
    if (!bs) return false;

    const elements = bs.pages[bs.activePageId]?.elements;
    const node = elements?.[id];
    if (!node) return false;

    for (const [key, value] of Object.entries(updates)) {
      // Apply without triggering save/render after each key.
      if (key.includes('.')) {
        const dotIdx = key.indexOf('.');
        const namespace = key.slice(0, dotIdx);
        const prop     = key.slice(dotIdx + 1);
        if (namespace === 'style' || namespace === 'layoutSettings') {
          node.style[prop] = value;
          if (LAYOUT_PROPS.includes(prop)) {
            node.layoutSettings = node.layoutSettings || {};
            node.layoutSettings[prop] = value;
          }
        } else if (namespace === 'attributes') {
          node.attributes[prop] = value;
        }
      } else {
        node[key] = value;
      }
    }

    ForgeHistory.snapshot();
    saveToLocalStorage();
    renderCanvas();
    return true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION 5 — HISTORY ENGINE  (Undo / Redo / Timeline)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * ForgeHistory
   *
   * A robust history buffer that stores JSON snapshots of the active page's
   * elements map. Supports undo, redo, and a `getTimeline()` introspection
   * method for time-travel debugging.
   *
   * Each page maintains its own independent history stack in:
   *   BuilderState.pages[id].history     — string[] of JSON snapshots
   *   BuilderState.pages[id].historyIdx  — current cursor position
   *
   * The global ForgeHistory object provides a clean API on top of those
   * per-page arrays, making it easy to extend with cross-page snapshots
   * in the future.
   */
  const ForgeHistory = {

    /** Maximum snapshots to keep per page. */
    MAX: 60,

    // ── Internal helpers ────────────────────────────────────────────────────

    _page() {
      const bs = global.BuilderState;
      return bs ? bs.pages[bs.activePageId] : null;
    },

    // ── Core API ────────────────────────────────────────────────────────────

    /**
     * snapshot()
     * Captures the current elements map and pushes it onto the history stack.
     * Trims the redo stack (any snapshots beyond the cursor) before pushing,
     * matching the standard undo/redo "fork and restart" convention.
     */
    snapshot() {
      const page = this._page();
      if (!page) return;

      const snap = JSON.stringify(page.elements);

      // Discard redo tail.
      page.history = page.history.slice(0, page.historyIdx + 1);
      page.history.push(snap);

      // Enforce cap — drop oldest snapshots if over MAX.
      if (page.history.length > this.MAX) {
        const excess = page.history.length - this.MAX;
        page.history.splice(0, excess);
      }

      page.historyIdx = page.history.length - 1;
    },

    /**
     * restore(idx)
     * Restores the elements map to the snapshot at the given index.
     * Deselects all elements and triggers a renderCanvas().
     *
     * @param {number} idx - History index to restore.
     */
    restore(idx) {
      const page = this._page();
      if (!page || idx < 0 || idx >= page.history.length) return;

      page.historyIdx = idx;
      page.elements   = JSON.parse(page.history[idx]);

      if (typeof global.deselectAll === 'function') global.deselectAll();
      renderCanvas();
    },

    /** Undo — step back one snapshot. */
    undo() {
      const page = this._page();
      this.restore(page ? page.historyIdx - 1 : -1);
    },

    /** Redo — step forward one snapshot. */
    redo() {
      const page = this._page();
      this.restore(page ? page.historyIdx + 1 : -1);
    },

    /**
     * getTimeline()
     *
     * Returns a human-friendly array describing every saved snapshot on
     * the active page. Useful for DevTools inspection and debugging.
     *
     * @returns {Array<{
     *   index:        number,
     *   isCurrent:    boolean,
     *   elementCount: number,
     *   savedAt:      string,    // ISO timestamp embedded in the snapshot
     * }>}
     *
     * Usage:
     *   console.table(ForgeHistory.getTimeline())
     */
    getTimeline() {
      const page = this._page();
      if (!page || !page.history.length) return [];

      return page.history.map((snap, idx) => {
        let elementCount = 0;
        try {
          elementCount = Object.keys(JSON.parse(snap)).length;
        } catch (_) { /* ignore */ }
        return {
          index:        idx,
          isCurrent:    idx === page.historyIdx,
          elementCount,
          snapshot:     snap,  // raw JSON for deep inspection
        };
      });
    },

    /**
     * clear()
     * Resets the history stack for the active page, keeping the current
     * state as the sole snapshot (index 0).
     */
    clear() {
      const page = this._page();
      if (!page) return;
      const snap = JSON.stringify(page.elements);
      page.history    = [snap];
      page.historyIdx = 0;
    },

    /** Returns the number of available undo steps. */
    get undoDepth() {
      const page = this._page();
      return page ? page.historyIdx : 0;
    },

    /** Returns the number of available redo steps. */
    get redoDepth() {
      const page = this._page();
      return page ? page.history.length - 1 - page.historyIdx : 0;
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION 6 — DATA EXPORT / IMPORT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * exportProject()
   *
   * Serialises the entire project as a formatted JSON string.
   * History buffers are intentionally omitted from the export to keep the
   * file focused on content; they are runtime-only metadata.
   *
   * The exported object shape:
   * {
   *   forgeSchemaVersion: 2,
   *   exportedAt: "2025-05-30T…",
   *   pageTitle: "My Website",
   *   activePageId: "index",
   *   pages: {
   *     index: {
   *       id, name, title, seo,
   *       elements: { root: { … }, "f_abc": { … }, … }
   *     },
   *     about: { … }
   *   }
   * }
   *
   * @returns {string} Pretty-printed JSON string.
   */
  function exportProject() {
    const bs = global.BuilderState;
    if (!bs) return '{}';

    const payload = {
      forgeSchemaVersion: 2,
      exportedAt: new Date().toISOString(),
      pageTitle: bs.pageTitle,
      activePageId: bs.activePageId,
      pages: {},
    };

    for (const [pageId, page] of Object.entries(bs.pages)) {
      // Strip runtime-only fields (history, historyIdx) from the export.
      payload.pages[pageId] = {
        id:       page.id,
        name:     page.name,
        title:    page.title || page.name,
        seo:      page.seo   || {},
        elements: page.elements,
      };
    }

    return JSON.stringify(payload, null, 2);
  }

  /**
   * importProject(jsonString)
   *
   * Validates and loads a project from a JSON string.
   *
   * Validation checks:
   *   - Must be a non-empty string
   *   - Must be valid JSON
   *   - Must contain a `pages` object with at least one page
   *   - Each page must have a `root` element in its elements map
   *
   * On success:
   *   - BuilderState is fully replaced with the imported data.
   *   - History is reset (imported project starts with a clean undo stack).
   *   - localStorage is updated immediately.
   *   - renderCanvas() is called to show the imported content.
   *
   * @param {string} jsonString - The project JSON to import.
   * @returns {{ success: boolean, error?: string }}
   */
  function importProject(jsonString) {
    // ── Input validation ────────────────────────────────────────────────────
    if (typeof jsonString !== 'string' || !jsonString.trim()) {
      return { success: false, error: 'Input must be a non-empty JSON string.' };
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      return { success: false, error: `JSON parse error: ${err.message}` };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: false, error: 'Invalid JSON: expected an object.' };
    }

    // Support both bare-pages and schema-versioned envelopes.
    const pagesSource = parsed.pages ?? (
      // v1 compat: top-level keys that look like pages.
      (parsed.index || parsed.home) ? parsed : null
    );

    if (!pagesSource || typeof pagesSource !== 'object') {
      return { success: false, error: 'Invalid project: missing or malformed "pages" key.' };
    }

    const pageIds = Object.keys(pagesSource);
    if (pageIds.length === 0) {
      return { success: false, error: 'Invalid project: pages object is empty.' };
    }

    // Validate each page has a root element.
    for (const pid of pageIds) {
      const page = pagesSource[pid];
      if (!page || !page.elements) {
        return { success: false, error: `Page "${pid}" is missing an elements map.` };
      }
      if (!page.elements['root']) {
        return { success: false, error: `Page "${pid}" is missing a root element.` };
      }
    }

    // ── Hydrate BuilderState ────────────────────────────────────────────────
    const bs = global.BuilderState;
    if (!bs) return { success: false, error: 'BuilderState not found.' };

    bs.pageTitle = parsed.pageTitle || 'Imported Project';

    const newActiveId = parsed.activePageId && pagesSource[parsed.activePageId]
      ? parsed.activePageId
      : pageIds[0];
    bs.activePageId = newActiveId;

    bs.pages = {};
    for (const pid of pageIds) {
      const src = pagesSource[pid];
      bs.pages[pid] = {
        id:         src.id   ?? pid,
        name:       src.name ?? pid,
        title:      src.title ?? src.name ?? pid,
        seo:        src.seo  ?? {},
        elements:   src.elements,
        history:    [],
        historyIdx: -1,
      };

      // Back-fill layoutSettings on imported nodes.
      Object.values(src.elements).forEach(node => {
        if (node.style && !node.layoutSettings) {
          node.layoutSettings = deriveLayoutSettings(node.style);
        }
      });

      // Push initial snapshot so undo/redo works after import.
      ForgeHistory._page && (() => {
        const snap = JSON.stringify(src.elements);
        bs.pages[pid].history    = [snap];
        bs.pages[pid].historyIdx = 0;
      })();
    }

    // Push snapshots properly using the ForgeHistory API.
    const prevActive = bs.activePageId;
    for (const pid of pageIds) {
      bs.activePageId = pid;
      ForgeHistory.clear();
    }
    bs.activePageId = prevActive;

    // Reset UI selection.
    if (typeof global.deselectAll === 'function') global.deselectAll();

    // Persist and render.
    saveToLocalStorage();
    renderCanvas();

    // Refresh the pages list panel.
    if (typeof global.renderPagesList === 'function') global.renderPagesList();

    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION 7 — FILE HELPERS  (Download / Import from disk)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * downloadProjectJSON()
   *
   * Triggers a browser file download of the current project as a .json file.
   * The filename includes the project title and a timestamp for uniqueness.
   */
  function downloadProjectJSON() {
    const json  = exportProject();
    const ts    = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const title = (global.BuilderState?.pageTitle || 'forge-project')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${title}-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    _toast('Project exported as JSON ↓', 'success');
  }

  /**
   * importProjectFromFile()
   *
   * Opens the browser's native file picker, reads the selected .json file,
   * and runs it through importProject(). Displays success/error toasts.
   */
  function importProjectFromFile() {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', () => {
      const file = input.files[0];
      document.body.removeChild(input);
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = importProject(ev.target.result);
        if (result.success) {
          _toast('Project imported successfully ✓', 'success');
        } else {
          _toast(`Import failed: ${result.error}`, 'error', 6000);
          console.error('[ForgeStateEngine] Import error:', result.error);
        }
      };
      reader.onerror = () => {
        _toast('Could not read the selected file.', 'error');
      };
      reader.readAsText(file);
    });

    input.click();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION 8 — INTERACTION ENGINE PATCHES
  //
  //  Ensures that all user interactions (sidebar inputs, resize handles,
  //  inline text editing) ultimately route through the State Engine so the
  //  JSON always remains the Source of Truth.
  //
  //  Strategy:
  //    • Override saveHistory() so every existing code path that was
  //      already calling saveHistory() automatically benefits from our
  //      ForgeHistory.snapshot() + saveToLocalStorage() cycle.
  //
  //    • Override dispatchStyleChange() to keep the optimistic DOM patch
  //      (needed for smooth drag performance) but ensure the state update
  //      goes through our system.
  //
  //    • Override dispatchAttrChange() similarly.
  //
  //    • The double-click → contenteditable → blur handler in index.html
  //      already writes `elements[id].text = node.innerHTML` and then calls
  //      saveHistory(). Because we override saveHistory(), this now also
  //      flows through ForgeHistory and saveToLocalStorage() — no changes
  //      needed in index.html for text editing.
  //
  //  IMPORTANT: dispatchStyleChange / dispatchAttrChange intentionally do NOT
  //  call renderCanvas() on every keystroke/pixel to preserve performance.
  //  They call saveHistoryDebounced() which calls our overridden saveHistory().
  //  The full renderCanvas() is triggered only when the debounce fires,
  //  keeping drag/resize smooth.
  // ══════════════════════════════════════════════════════════════════════════

  function patchCoreInteractions() {

    // ── Override saveHistory() ─────────────────────────────────────────────
    // The original in index.html saves a JSON snapshot per-page and writes
    // to localStorage. Our version routes through ForgeHistory and
    // saveToLocalStorage() instead.
    global.saveHistory = function saveHistory() {
      ForgeHistory.snapshot();
      saveToLocalStorage();
    };

    // saveHistoryDebounced() references saveHistory by name so it will
    // automatically pick up our override — no patch needed there.

    // ── Override restoreHistory() ──────────────────────────────────────────
    // The original in index.html restores directly from page.history[idx].
    // We delegate to ForgeHistory.restore() which does the same + calls
    // renderCanvas().
    global.restoreHistory = function restoreHistory(idx) {
      ForgeHistory.restore(idx);
    };

    // ── Override dispatchStyleChange() ────────────────────────────────────
    // Adds: lock-guard, layoutSettings sync, clamp, and debounced save.
    // Preserves: optimistic DOM patch (no full re-render per pixel).
    const _origStyle = global.dispatchStyleChange;
    global.dispatchStyleChange = function dispatchStyleChange(id, prop, value) {
      const bs = global.BuilderState;
      if (!bs) return;

      const elements = bs.pages[bs.activePageId]?.elements;
      const node = elements?.[id];
      if (!node) return;

      // Delegate lock-checking to the original when available.
      if (typeof global.isTemplateLockedForStyle === 'function' &&
          global.isTemplateLockedForStyle(elements, id)) {
        _toast('Header and footer structure is locked. Edit text only.', 'info', 1600);
        if (typeof global.syncPropertiesPanel === 'function') global.syncPropertiesPanel(id);
        return;
      }

      // Update state.
      node.style[prop] = value;

      // Keep layoutSettings in sync.
      if (LAYOUT_PROPS.includes(prop)) {
        node.layoutSettings = node.layoutSettings || {};
        node.layoutSettings[prop] = value;
      }

      // Optimistic DOM patch (no full re-render for smooth drags).
      const domEl = document.getElementById(id);
      if (domEl) domEl.style[prop] = value;

      // Trigger clamp + spacer sync for layout-affecting props.
      const LAYOUT_TRIGGERS = ['position','top','left','right','bottom','width','height','padding','margin'];
      if (LAYOUT_TRIGGERS.includes(prop)) {
        requestAnimationFrame(() => {
          if (typeof global.clampAbsoluteElementToSafeArea === 'function') {
            global.clampAbsoluteElementToSafeArea(id, { save: true });
          }
          if (typeof global.syncAbsoluteSafeSpacer === 'function') {
            global.syncAbsoluteSafeSpacer();
          }
        });
      }

      // Debounced save triggers our overridden saveHistory() above.
      if (typeof global.saveHistoryDebounced === 'function') {
        global.saveHistoryDebounced();
      } else {
        global.saveHistory();
      }
    };

    // ── Override dispatchAttrChange() ─────────────────────────────────────
    const _origAttr = global.dispatchAttrChange;
    global.dispatchAttrChange = function dispatchAttrChange(id, prop, value) {
      const bs = global.BuilderState;
      if (!bs) return;

      const elements = bs.pages[bs.activePageId]?.elements;
      const node = elements?.[id];
      if (!node) return;

      if (typeof global.isTemplateLockedForStyle === 'function' &&
          global.isTemplateLockedForStyle(elements, id)) {
        _toast('Header and footer structure is locked. Edit text only.', 'info', 1600);
        if (typeof global.syncPropertiesPanel === 'function') global.syncPropertiesPanel(id);
        return;
      }

      node.attributes[prop] = value;

      const domEl = document.getElementById(id);
      if (domEl) domEl.setAttribute(prop, value);

      if (typeof global.saveHistoryDebounced === 'function') {
        global.saveHistoryDebounced();
      } else {
        global.saveHistory();
      }
    };

    console.info(
      '%c[ForgeStateEngine] ✓ Core interaction functions patched.',
      'color:#d4af37; font-weight:600; font-family:monospace;',
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  INTERNAL UTILITY — Safe toast wrapper
  //  Falls back to console.warn if the toast() function isn't available yet.
  // ══════════════════════════════════════════════════════════════════════════

  function _toast(msg, type = 'info', dur = 3000) {
    if (typeof global.toast === 'function') {
      global.toast(msg, type, dur);
    } else {
      console.info(`[ForgeStateEngine toast/${type}] ${msg}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION 9 — PUBLIC API & BOOTSTRAP
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Wire the JSON Import / Export buttons added to the topbar in index.html.
   * Safely no-ops if the buttons are absent.
   */
  function wireUIButtons() {
    const btnExportJSON = document.getElementById('btn-export-json');
    if (btnExportJSON) {
      btnExportJSON.addEventListener('click', downloadProjectJSON);
    }

    const btnImportJSON = document.getElementById('btn-import-json');
    if (btnImportJSON) {
      btnImportJSON.addEventListener('click', importProjectFromFile);
    }
  }

  /**
   * bootstrap()
   *
   * Main entry point. Runs once when the DOM is ready and after index.html's
   * inline <script> block has finished executing (guaranteed by setTimeout 0).
   *
   * Execution order:
   *   1. Validate BuilderState exists (set by index.html).
   *   2. Augment BuilderState shape (pageTitle, layoutSettings, etc.).
   *   3. Load saved project from localStorage.
   *   4. Patch core interaction functions.
   *   5. Wire UI buttons.
   *   6. Take the initial history snapshot.
   *   7. Expose the public API on window.
   *   8. Trigger initial render.
   */
  function bootstrap() {
    // Bail if index.html hasn't initialised BuilderState yet.
    if (typeof global.BuilderState === 'undefined') {
      console.error(
        '[ForgeStateEngine] BuilderState not found. ' +
        'Ensure forge-state-engine.js loads AFTER index.html\'s inline script.',
      );
      return;
    }

    if (!initStateShape()) return;   // (1 & 2) Augment state shape

    // (3) Load from localStorage — overrides the in-memory blank state that
    //     index.html's DOMContentLoaded handler also loads. We intentionally
    //     run here (synchronously, before the first render) so the render
    //     below already sees the persisted data.
    initFromStorage();

    patchCoreInteractions();         // (4) Patch saveHistory, dispatch*
    wireUIButtons();                 // (5) Wire topbar buttons

    // (6) Take initial snapshot so the undo stack is primed.
    const bs = global.BuilderState;
    for (const pid of Object.keys(bs.pages)) {
      bs.activePageId = pid;         // temporarily switch to snapshot each page
      ForgeHistory.clear();
    }
    // Restore original active page.
    bs.activePageId = Object.keys(bs.pages).includes(bs.activePageId)
      ? bs.activePageId
      : Object.keys(bs.pages)[0];

    // (7) Publish public API.
    Object.assign(global, {
      // ── State Core ────────────────────────────────────────────────────────
      renderCanvas,
      updateElement,
      batchUpdateElement,
      saveToLocalStorage,

      // ── Export / Import ───────────────────────────────────────────────────
      exportProject,
      importProject,
      downloadProjectJSON,
      importProjectFromFile,

      // ── History ───────────────────────────────────────────────────────────
      ForgeHistory,

      // ── Utility ───────────────────────────────────────────────────────────
      deriveLayoutSettings,
    });

    // (8) Trigger the first full render so the loaded project appears.
    renderCanvas();
    if (typeof global.renderPagesList === 'function') global.renderPagesList();

    console.info(
      '%c[ForgeStateEngine] ✓  State Engine v2.0 ready — JSON is the Source of Truth.',
      'color:#d4af37; font-weight:800; font-family:monospace; font-size:13px;',
    );
    console.info(
      '%c  Quick reference:\n' +
      '  updateElement(id, "style.color", "#fff")\n' +
      '  updateElement(id, "text", "Hello")\n' +
      '  updateElement(id, "attributes.href", "https://…")\n' +
      '  batchUpdateElement(id, { "style.width": "200px", "text": "…" })\n' +
      '  exportProject()        → formatted JSON string\n' +
      '  importProject(json)    → { success, error? }\n' +
      '  downloadProjectJSON()  → triggers file download\n' +
      '  ForgeHistory.undo()\n' +
      '  ForgeHistory.redo()\n' +
      '  ForgeHistory.getTimeline() → console.table(…)\n' +
      '  console.log(BuilderState)  → full live state',
      'color:#8a7a4a; font-family:monospace; font-size:11px;',
    );
  }

  // ── Deferred bootstrap ─────────────────────────────────────────────────────
  // We use setTimeout(0) even when DOMContentLoaded has already fired because
  // index.html's inline <script> block runs on the same call-stack tick as the
  // parser. Deferring by one task guarantees all globals are registered before
  // we patch them.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(bootstrap, 0));
  } else {
    setTimeout(bootstrap, 0);
  }

}(window));
