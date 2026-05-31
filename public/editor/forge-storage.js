/*!
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        FORGE Pro — Robust Storage Engine  v1.0.0                        ║
 * ║        File: forge-storage.js                                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Storage strategy (waterfall — each tier falls back to the next):       ║
 * ║                                                                          ║
 * ║  Tier 1 — IndexedDB   (async, ~500 MB–1 GB quota, preferred)            ║
 * ║  Tier 2 — localStorage with gzip compression (sync fallback, ~5 MB)     ║
 * ║  Tier 3 — localStorage uncompressed (final fallback)                    ║
 * ║                                                                          ║
 * ║  Compression: native CompressionStream (gzip, Chrome 80+, FF 113+,      ║
 * ║  Safari 16.4+). Reduces typical project JSON by ~75-85%.                ║
 * ║                                                                          ║
 * ║  Public API (all async, returns Promises):                               ║
 * ║    ForgeStorage.save(payload)  → Promise<{tier, bytes, kb}>             ║
 * ║    ForgeStorage.load()         → Promise<object|null>                    ║
 * ║    ForgeStorage.clear()        → Promise<void>                           ║
 * ║    ForgeStorage.stats()        → Promise<StorageStats>                   ║
 * ║    ForgeStorage.isReady        → boolean                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

(function (global) {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  const DB_NAME    = 'forge_pro_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'projects';
  const IDB_KEY    = 'current';
  const LS_KEY     = 'forge_project';
  const LS_KEY_CMP = 'forge_project_gz';   // compressed localStorage key

  // ── Internal state ────────────────────────────────────────────────────────
  let _db = null;             // IDBDatabase instance once opened
  let _dbReady = false;       // true once IDB is available
  let _lastSaveTier = null;   // 'idb' | 'ls-compressed' | 'ls-plain'
  let _hasCompressionStream = typeof CompressionStream !== 'undefined';

  // ── IDB helpers ───────────────────────────────────────────────────────────

  /** Open (or create) the IndexedDB database. Returns a Promise<IDBDatabase>. */
  function openDB() {
    return new Promise((resolve, reject) => {
      if (_db) { resolve(_db); return; }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      req.onsuccess = (e) => {
        _db = e.target.result;
        _dbReady = true;

        // Handle surprise closes (e.g. browser clears storage)
        _db.onclose = () => { _db = null; _dbReady = false; };
        _db.onerror = (ev) => console.warn('[ForgeStorage] IDB error:', ev);

        resolve(_db);
      };

      req.onerror  = (e) => reject(new Error('IDB open failed: ' + e.target.error));
      req.onblocked = () => reject(new Error('IDB blocked — close other tabs.'));
    });
  }

  /** Write a value to IndexedDB. Returns Promise<void>. */
  function idbPut(value) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, IDB_KEY);
      tx.oncomplete = resolve;
      tx.onerror    = (e) => reject(e.target.error);
    }));
  }

  /** Read a value from IndexedDB. Returns Promise<any|null>. */
  function idbGet() {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = (e) => reject(e.target.error);
    }));
  }

  /** Delete the project entry from IndexedDB. Returns Promise<void>. */
  function idbDelete() {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(IDB_KEY);
      tx.oncomplete = resolve;
      tx.onerror    = (e) => reject(e.target.error);
    }));
  }

  // ── Compression helpers ───────────────────────────────────────────────────

  /**
   * Compress a string using the native gzip CompressionStream.
   * Returns Promise<Uint8Array> (the compressed bytes).
   */
  async function compress(str) {
    const bytes  = new TextEncoder().encode(str);
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const chunks = [];
    const reader = stream.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLen = chunks.reduce((n, c) => n + c.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  }

  /**
   * Decompress gzip bytes back to a string.
   * Returns Promise<string>.
   */
  async function decompress(uint8) {
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(uint8);
    writer.close();
    const chunks = [];
    const reader = stream.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLen = chunks.reduce((n, c) => n + c.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return new TextDecoder().decode(result);
  }

  /**
   * Encode Uint8Array → base64 string (for localStorage transport).
   * Uses a chunked approach to avoid stack overflow on large buffers.
   */
  function uint8ToBase64(uint8) {
    const CHUNK = 0x8000; // 32KB chunks
    let binary = '';
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  /** Decode base64 string → Uint8Array. */
  function base64ToUint8(b64) {
    const binary = atob(b64);
    const uint8  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) uint8[i] = binary.charCodeAt(i);
    return uint8;
  }

  // ── Storage tiers ─────────────────────────────────────────────────────────

  /**
   * TIER 1: Save to IndexedDB.
   * Stores the raw JS object — no serialization limit, best for large projects.
   */
  async function saveToIDB(payload) {
    await idbPut(payload);
    const bytes = JSON.stringify(payload).length; // estimate
    _lastSaveTier = 'idb';
    return { tier: 'idb', bytes, kb: Math.round(bytes / 1024) };
  }

  /**
   * TIER 2: Save compressed JSON to localStorage.
   * Requires CompressionStream (modern browsers). Typically 75-85% smaller.
   */
  async function saveToLSCompressed(payload) {
    const json    = JSON.stringify(payload);
    const uint8   = await compress(json);
    const b64     = uint8ToBase64(uint8);
    // b64 is larger than raw bytes but still much smaller than uncompressed JSON
    localStorage.setItem(LS_KEY_CMP, b64);
    // Remove uncompressed key if present to free space
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    _lastSaveTier = 'ls-compressed';
    return { tier: 'ls-compressed', bytes: b64.length, kb: Math.round(b64.length / 1024) };
  }

  /**
   * TIER 3: Save plain JSON to localStorage (original strategy, no compression).
   */
  function saveToLSPlain(payload) {
    const json = JSON.stringify(payload);
    // Prune other forge keys first to free headroom
    Object.keys(localStorage)
      .filter(k => k.startsWith('forge_') && k !== LS_KEY && k !== 'forge_color_palette')
      .forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    localStorage.setItem(LS_KEY, json);
    _lastSaveTier = 'ls-plain';
    return { tier: 'ls-plain', bytes: json.length, kb: Math.round(json.length / 1024) };
  }

  // ── Load tiers ────────────────────────────────────────────────────────────

  /** Parse and hydrate a raw project payload object into a clean state. */
  function hydratePayload(parsed) {
    if (!parsed || !parsed.pages || typeof parsed.pages !== 'object') return null;
    const pages = {};
    Object.values(parsed.pages).forEach(p => {
      pages[p.id] = {
        id: p.id,
        name: p.name || p.id,
        elements: p.elements || {},
        seo: p.seo || {},
        history: [],
        historyIdx: -1,
      };
    });
    return {
      pages,
      activePageId: parsed.activePageId || Object.keys(pages)[0] || 'index',
      pageTitle: parsed.pageTitle || 'Untitled Project',
    };
  }

  async function loadFromIDB() {
    const data = await idbGet();
    if (!data) return null;
    return hydratePayload(data);
  }

  async function loadFromLSCompressed() {
    const b64 = localStorage.getItem(LS_KEY_CMP);
    if (!b64) return null;
    const uint8 = base64ToUint8(b64);
    const json  = await decompress(uint8);
    return hydratePayload(JSON.parse(json));
  }

  function loadFromLSPlain() {
    const json = localStorage.getItem(LS_KEY);
    if (!json) return null;
    return hydratePayload(JSON.parse(json));
  }

  // ── Indicator helper ──────────────────────────────────────────────────────

  function setIndicator(text, isWarn = false) {
    const el = document.getElementById('saved-time-indicator');
    if (!el) return;
    el.textContent = text;
    el.style.color = isWarn ? 'var(--accent)' : '';
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const ForgeStorage = {

    /** True once IndexedDB has been confirmed available. */
    get isReady() { return _dbReady; },

    /** Which tier was used for the last save. */
    get lastTier() { return _lastSaveTier; },

    /**
     * save(payload)
     *
     * Persists the project payload through the storage waterfall.
     * The call is fire-and-forget safe — errors are caught and surfaced
     * via the status indicator, never thrown to callers.
     *
     * @param {object} payload - The slim project object (no history arrays).
     * @returns {Promise<{tier, bytes, kb}>}
     */
    async save(payload) {
      let result;
      try {
        // ── Tier 1: IndexedDB ───────────────────────────────────────────────
        result = await saveToIDB(payload);
        setIndicator(`Saved · IDB (${result.kb}KB)`);
        return result;
      } catch (idbErr) {
        console.warn('[ForgeStorage] IDB save failed, trying compressed LS:', idbErr.message);
      }

      try {
        // ── Tier 2: Compressed localStorage ────────────────────────────────
        if (_hasCompressionStream) {
          result = await saveToLSCompressed(payload);
          setIndicator(`Saved · LS+gz (${result.kb}KB)`);
          return result;
        }
      } catch (gzErr) {
        console.warn('[ForgeStorage] Compressed LS save failed, trying plain LS:', gzErr.message);
      }

      try {
        // ── Tier 3: Plain localStorage ──────────────────────────────────────
        result = saveToLSPlain(payload);
        const warn = result.bytes > 3.5 * 1024 * 1024;
        setIndicator(
          warn ? `⚠ Large (${result.kb}KB) · LS` : `Saved · LS (${result.kb}KB)`,
          warn
        );
        return result;
      } catch (lsErr) {
        // All tiers failed
        setIndicator('⚠ Storage full — export your project!', true);
        if (typeof global.toast === 'function') {
          global.toast('All storage tiers full! Use Export to save your work.', 'error', 8000);
        }
        console.error('[ForgeStorage] All storage tiers exhausted:', lsErr);
        return { tier: 'none', bytes: 0, kb: 0 };
      }
    },

    /**
     * load()
     *
     * Loads the project from the best available source (IDB → compressed LS
     * → plain LS). Returns a hydrated state object or null if nothing found.
     *
     * @returns {Promise<{pages, activePageId, pageTitle}|null>}
     */
    async load() {
      // Tier 1: IndexedDB
      try {
        const data = await loadFromIDB();
        if (data) {
          console.info('[ForgeStorage] ✓ Loaded from IndexedDB');
          return data;
        }
      } catch (e) {
        console.warn('[ForgeStorage] IDB load failed:', e.message);
      }

      // Tier 2: Compressed localStorage
      if (_hasCompressionStream) {
        try {
          const data = await loadFromLSCompressed();
          if (data) {
            console.info('[ForgeStorage] ✓ Loaded from compressed localStorage — migrating to IDB…');
            // Background-migrate to IDB so next load is faster
            ForgeStorage.save(data).catch(() => {});
            return data;
          }
        } catch (e) {
          console.warn('[ForgeStorage] Compressed LS load failed:', e.message);
        }
      }

      // Tier 3: Plain localStorage
      try {
        const data = loadFromLSPlain();
        if (data) {
          console.info('[ForgeStorage] ✓ Loaded from plain localStorage — migrating to IDB…');
          ForgeStorage.save(data).catch(() => {});
          return data;
        }
      } catch (e) {
        console.warn('[ForgeStorage] Plain LS load failed:', e.message);
      }

      return null;
    },

    /**
     * clear()
     *
     * Removes the project from all storage tiers.
     * @returns {Promise<void>}
     */
    async clear() {
      try { await idbDelete(); } catch (_) {}
      try { localStorage.removeItem(LS_KEY); } catch (_) {}
      try { localStorage.removeItem(LS_KEY_CMP); } catch (_) {}
    },

    /**
     * stats()
     *
     * Returns storage usage information across all tiers.
     * @returns {Promise<{idb: boolean, lsUsedKB: number, lsLimitKB: number, tier: string}>}
     */
    async stats() {
      let lsUsedBytes = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          lsUsedBytes += (k.length + (localStorage.getItem(k) || '').length) * 2; // UTF-16
        }
      } catch (_) {}

      let idbAvailable = false;
      try { await openDB(); idbAvailable = true; } catch (_) {}

      let idbProjectKB = 0;
      if (idbAvailable) {
        try {
          const raw = await idbGet();
          if (raw) idbProjectKB = Math.round(JSON.stringify(raw).length / 1024);
        } catch (_) {}
      }

      return {
        idb: idbAvailable,
        idbProjectKB,
        lsUsedKB:  Math.round(lsUsedBytes / 1024),
        lsLimitKB: 5120,           // typical 5 MB
        lsFreeKB:  Math.max(0, 5120 - Math.round(lsUsedBytes / 1024)),
        tier: _lastSaveTier || 'unknown',
        compression: _hasCompressionStream,
      };
    },

    /**
     * warmup()
     *
     * Pre-opens the IndexedDB connection so the first save is instant.
     * Call this early in app initialization.
     * @returns {Promise<void>}
     */
    async warmup() {
      try { await openDB(); } catch (e) {
        console.warn('[ForgeStorage] IDB warmup failed (will use localStorage):', e.message);
      }
    },
  };

  // ── Expose globally ───────────────────────────────────────────────────────
  global.ForgeStorage = ForgeStorage;

  // Auto-warmup on load
  ForgeStorage.warmup();

})(window);
