/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          FORGE Pro — Canvas Interaction Engine  v1.0.0              ║
 * ║          File: canvas-interaction.js                                ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                      ║
 * ║  Layered on top of the existing FORGE Pro builder. Adds:            ║
 * ║                                                                      ║
 * ║  1. Transformer Overlay   – A zoom-aware dashed bounding-box that   ║
 * ║     perfectly tracks the selected element under any CSS zoom scale. ║
 * ║     Formula: (screen_delta − frame_origin) / scale + scroll_offset  ║
 * ║                                                                      ║
 * ║  2. Four-Corner Handles   – nw / ne / sw / se drag handles on the   ║
 * ║     transformer for full-direction resize with Math.max(20,…) guard ║
 * ║     and correct coordinate inversion for the north/west axes.       ║
 * ║                                                                      ║
 * ║  3. Full Element Unlock   – Patches isLockedCompoundChild,          ║
 * ║     isCompoundTemplateRoot, and isTemplateLockedForStyle to return   ║
 * ║     false, AND strips is-locked/is-locked-child classes via DOM     ║
 * ║     unlock + MutationObserver so every child inside a header or     ║
 * ║     footer is freely selectable, resizable, and deletable.          ║
 * ║                                                                      ║
 * ║  4. openPropertiesPanelFor(el) – Extensible placeholder that        ║
 * ║     defaults to the existing syncPropertiesPanel() call.            ║
 * ║                                                                      ║
 * ║  Note: dblclick → contenteditable text editing and Delete key       ║
 * ║  removal are already implemented in index.html. This engine makes   ║
 * ║  them work for all previously-locked children by patching lock      ║
 * ║  guards, and adds a pulsing transformer visual while editing.       ║
 * ║                                                                      ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Integration: Add AFTER the closing </script> of index.html's       ║
 * ║  inline builder block, or just before </body>:                      ║
 * ║                                                                      ║
 * ║    <script src="canvas-interaction.js"></script>                    ║
 * ║                                                                      ║
 * ║  Expected globals from index.html:                                  ║
 * ║    currentZoom, BuilderState, selectElementDOM, deselectAll,        ║
 * ║    syncPropertiesPanel, renderPage, applyZoom, saveHistoryDebounced,║
 * ║    saveHistory, checkEmptyState, renderLayerPanel,                  ║
 * ║    isLockedCompoundChild, isCompoundTemplateRoot,                   ║
 * ║    isTemplateLockedForStyle                                         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

(function (global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  //  §0  CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════

  /** Four corners that get resize handles on the transformer overlay. */
  const HANDLE_DIRS = ['nw', 'ne', 'sw', 'se'];

  /**
   * Minimum element dimension in px enforced during resize.
   * Matches the existing `Math.max(20, value)` convention.
   */
  const MIN_DIM = 20;

  // ═══════════════════════════════════════════════════════════════════════
  //  §1  ENGINE STATE  (all private — never leak into global scope)
  // ═══════════════════════════════════════════════════════════════════════

  let _frame       = null;  // #page-frame DOM node
  let _transformer = null;  // transformer overlay <div>
  let _selectedEl  = null;  // currently-selected .forge-el, or null
  let _isResizing  = false; // true while a corner-handle drag is active
  let _rafId       = null;  // rAF handle for debounced reposition

  // ═══════════════════════════════════════════════════════════════════════
  //  §2  UTILITY
  // ═══════════════════════════════════════════════════════════════════════

  /** Read the current CSS zoom scale from the global `currentZoom` variable. */
  const getScale = () =>
    (typeof global.currentZoom !== 'undefined' ? global.currentZoom / 100 : 1);

  /** Safely fetch the active page's elements map from BuilderState. */
  const getElements = () => {
    const s = global.BuilderState;
    return s ? (s.pages[s.activePageId]?.elements ?? null) : null;
  };

  /** Call a global function by name if it exists; ignore otherwise. */
  const call = (fnName, ...args) => {
    if (typeof global[fnName] === 'function') global[fnName](...args);
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  §3  STYLE INJECTION
  // ═══════════════════════════════════════════════════════════════════════

  function injectStyles() {
    if (document.getElementById('ce-styles')) return;

    const style = document.createElement('style');
    style.id = 'ce-styles';
    style.textContent = /* css */`
      /* ── Transformer overlay bounding box ── */
      #canvas-transformer {
        position       : absolute;
        box-sizing     : border-box;
        pointer-events : none;           /* clicks fall through to the element */
        border         : 2px dashed var(--accent-2, #f5d77f);
        border-radius  : 1px;
        z-index        : 9990;
        display        : none;
        /* Subtle gold glow consistent with the FORGE Pro dark-gold theme */
        filter         : drop-shadow(0 0 6px rgba(245, 215, 127, 0.22));
        /* Smooth appearance on first show */
        transition     : opacity 0.07s ease;
      }

      /* ── Four-corner drag handles ── */
      .tx-handle {
        position       : absolute;
        width          : 10px;
        height         : 10px;
        background     : var(--bg-1, #121212);
        border         : 2px solid var(--accent-2, #f5d77f);
        border-radius  : 50%;
        box-sizing     : border-box;
        pointer-events : all;            /* handles ARE interactive */
        z-index        : 9991;
        transition     : transform 0.1s ease, background 0.1s ease;
      }
      .tx-handle:hover  { background: var(--accent-2, #f5d77f); transform: scale(1.55); }
      .tx-handle:active { transform: scale(1.2); }

      /*
       * Corner placement: offset by -5 px (half of 10 px handle)
       * so the handle centre sits exactly on the element's corner.
       */
      .tx-handle[data-dir="nw"] { top:    -5px; left:  -5px; cursor: nw-resize; }
      .tx-handle[data-dir="ne"] { top:    -5px; right: -5px; cursor: ne-resize; }
      .tx-handle[data-dir="sw"] { bottom: -5px; left:  -5px; cursor: sw-resize; }
      .tx-handle[data-dir="se"] { bottom: -5px; right: -5px; cursor: se-resize; }

      /*
       * OVERRIDE: suppress the existing .selected CSS outline so the
       * transformer overlay is the sole selection indicator.
       */
      .forge-el.selected {
        outline        : none !important;
        outline-offset : 0    !important;
      }

      /* Restore gold hover outline for all un-locked elements */
      .forge-el:not([contenteditable="true"]):hover {
        outline        : 2px dashed rgba(212, 175, 55, 0.70) !important;
        outline-offset : -2px !important;
        z-index        : 5;
      }

      /* Block text selection globally while a resize drag is active */
      body.ce-resizing,
      body.ce-resizing * { user-select: none !important; }

      /*
       * EDITING MODE: pulse the transformer border while an element has
       * contenteditable active to signal "you are now typing".
       */
      #canvas-transformer.ce-editing {
        border-style : solid;
        border-color : var(--accent, #d4af37);
        animation    : ce-edit-pulse 1.4s ease-in-out infinite;
      }
      @keyframes ce-edit-pulse {
        0%,100% { opacity: 1;    }
        50%     { opacity: 0.50; }
      }
    `;

    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §4  TRANSFORMER DOM CONSTRUCTION
  // ═══════════════════════════════════════════════════════════════════════

  function buildTransformer() {
    const tx = document.createElement('div');
    tx.id = 'canvas-transformer';
    tx.setAttribute('aria-hidden', 'true');

    HANDLE_DIRS.forEach(dir => {
      const h = document.createElement('div');
      h.className   = 'tx-handle';
      h.dataset.dir = dir;
      // Use capture so the mousedown fires before any frame-level listeners.
      h.addEventListener('mousedown', onHandleMouseDown, true);
      tx.appendChild(h);
    });

    _transformer = tx;
  }

  function mountTransformer() {
    if (_frame && !document.getElementById('canvas-transformer')) {
      _frame.appendChild(_transformer);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §5  TRANSFORMER POSITIONING  (the zoom-aware coordinate maths)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Position the transformer overlay so it perfectly overlays `el`.
   *
   * WHY this maths is needed
   * ────────────────────────
   * `#page-frame` is CSS-scaled via  transform: scale(s); transformOrigin: top center
   * getBoundingClientRect() returns post-transform VIEWPORT coordinates.
   * An absolute-positioned child inside the frame is placed using PRE-transform
   * LOCAL coordinates.  To convert from viewport → local we:
   *
   *   1. Subtract the frame's viewport origin   → delta in screen-space
   *   2. Divide by the current scale            → converts screen-space to canvas-local
   *   3. Add the frame's scroll offset          → absolute pos is content-relative, not viewport-relative
   *
   * Width / height undergo only step 2 (they have no origin offset).
   *
   * @param {HTMLElement} el – The .forge-el to overlay.
   */
  function positionTransformer(el) {
    if (!el || !_transformer || !_frame) return;

    const scale  = getScale();
    const fRect  = _frame.getBoundingClientRect();
    const eRect  = el.getBoundingClientRect();

    const left   = (eRect.left - fRect.left) / scale + _frame.scrollLeft;
    const top    = (eRect.top  - fRect.top)  / scale + _frame.scrollTop;
    const width  = eRect.width  / scale;
    const height = eRect.height / scale;

    Object.assign(_transformer.style, {
      left    : left   + 'px',
      top     : top    + 'px',
      width   : width  + 'px',
      height  : height + 'px',
      display : 'block',
    });
  }

  /** Debounced reposition — collapses multiple calls into a single rAF tick. */
  function scheduleReposition() {
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(() => {
      _rafId = null;
      if (_selectedEl) positionTransformer(_selectedEl);
    });
  }

  function hideTransformer() {
    if (_transformer) _transformer.style.display = 'none';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §6  LOCK-FUNCTION PATCHES
  //      Override the three guard functions so every element — including
  //      nav / footer children — is treated as a freely-editable element.
  //      Originals are stored as  global._orig_<name>  for recovery.
  // ═══════════════════════════════════════════════════════════════════════

  function patchLockFunctions() {
    [
      'isLockedCompoundChild',
      'isCompoundTemplateRoot',
      'isTemplateLockedForStyle',
    ].forEach(name => {
      if (typeof global[name] === 'function') {
        global['_orig_' + name] = global[name];
        global[name] = () => false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §7  DOM-LEVEL LOCK CLASS REMOVAL
  //      createDOMFromState() still stamps is-locked / is-locked-child on
  //      elements via local variables (not the patched global functions).
  //      This removes those classes from every .forge-el in the frame.
  // ═══════════════════════════════════════════════════════════════════════

  function unlockAllElements() {
    if (!_frame) return;

    _frame.querySelectorAll('.forge-el').forEach(el => {
      el.classList.remove('is-locked', 'is-locked-child');
      el.removeAttribute('data-locked-parent');

      // Re-enable drag-and-drop for flow (non-absolute) elements whose
      // draggable attribute was set to "false" by createDOMFromState.
      if (
        window.getComputedStyle(el).position !== 'absolute' &&
        el.getAttribute('draggable') === 'false'
      ) {
        el.setAttribute('draggable', 'true');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §8  BUILDER FUNCTION PATCHES
  //      Wrap selectElementDOM, deselectAll, applyZoom, and renderPage so
  //      the transformer automatically stays in sync with the existing
  //      selection system without any duplicate event handlers.
  // ═══════════════════════════════════════════════════════════════════════

  function patchBuilderFunctions() {

    // ── selectElementDOM ──────────────────────────────────────────────────
    // Wrapping this function means ANY code path that selects an element
    // (clicks, layer panel, keyboard) will automatically update the transformer.
    const origSelect = global.selectElementDOM;
    if (typeof origSelect === 'function') {
      global.selectElementDOM = function (node, id, keepExisting) {

        // Run the original first (adds toolbar, syncs properties panel, etc.)
        origSelect.apply(this, arguments);

        /*
         * Remove the original three resize-handles (se / e / s) that
         * selectElementDOM appended INSIDE the element.  Our four transformer
         * corner handles replace them entirely, avoiding positional overlap.
         *
         * The rotation handle is also removed so the transformer is the only
         * chrome surrounding the element — you can re-enable it if you want
         * both to coexist by removing the .rotation-handle selector below.
         */
        node.querySelectorAll('.resize-handle, .rotation-handle').forEach(h => h.remove());

        // Track and position the transformer on the next paint cycle so all
        // DOM mutations from origSelect have settled.
        _selectedEl = node;
        requestAnimationFrame(() => positionTransformer(node));
      };
    }

    // ── deselectAll ───────────────────────────────────────────────────────
    const origDeselect = global.deselectAll;
    if (typeof origDeselect === 'function') {
      global.deselectAll = function () {
        origDeselect.apply(this, arguments);
        _selectedEl = null;
        hideTransformer();
        if (_transformer) _transformer.classList.remove('ce-editing');
      };
    }

    // ── applyZoom ─────────────────────────────────────────────────────────
    // The frame's CSS scale changes, so the transformer needs repositioning.
    const origZoom = global.applyZoom;
    if (typeof origZoom === 'function') {
      global.applyZoom = function (z) {
        origZoom.apply(this, arguments);
        scheduleReposition();
      };
    }

    // ── renderPage ────────────────────────────────────────────────────────
    // After a full page re-render, DOM nodes are recreated.  Re-acquire the
    // selected element's new DOM reference and reposition.
    const origRender = global.renderPage;
    if (typeof origRender === 'function') {
      global.renderPage = function () {
        origRender.apply(this, arguments);

        requestAnimationFrame(() => {
          // Strip lock classes from newly-rendered nodes.
          unlockAllElements();

          // Re-acquire selected element (old DOM node was replaced).
          if (_selectedEl && _selectedEl.id) {
            const reEl = document.getElementById(_selectedEl.id);
            if (reEl) {
              _selectedEl = reEl;
              positionTransformer(reEl);
            } else {
              // Element was deleted during the render cycle.
              _selectedEl = null;
              hideTransformer();
            }
          }
        });
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §9  FOUR-CORNER RESIZE
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * mousedown on any .tx-handle — starts a resize drag.
   *
   * Coordinate conversion:
   *   Mouse moves are in SCREEN (post-transform) pixels.
   *   Element style.width/height are in CANVAS-LOCAL (pre-transform) pixels.
   *   → divide every mouse delta by `scale` before applying it.
   *
   * North / West axis inversion:
   *   Growing toward NW means: element width increases, but its left/top
   *   position DECREASES by the same amount so the opposite corner stays fixed.
   *   For non-absolute elements, position adjustment is skipped (no left/top).
   */
  function onHandleMouseDown(e) {
    if (!_selectedEl || _isResizing) return;

    // Prevent the frame's click handlers from treating this as an element click.
    e.stopPropagation();
    e.preventDefault();

    const el      = _selectedEl;
    const id      = el.id;
    const dir     = e.currentTarget.dataset.dir;
    const scale   = getScale();
    const isAbs   = (window.getComputedStyle(el).position === 'absolute');

    // ── Snapshot start state ──────────────────────────────────────────────
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    // Use computed style for accurate width/height (respects box-sizing).
    const computed  = window.getComputedStyle(el);
    const startW    = parseFloat(computed.width)  || el.offsetWidth;
    const startH    = parseFloat(computed.height) || el.offsetHeight;
    const startLeft = parseFloat(el.style.left) || 0;
    const startTop  = parseFloat(el.style.top)  || 0;

    _isResizing = true;
    document.body.classList.add('ce-resizing');

    // ── Live drag handler ─────────────────────────────────────────────────
    function onMove(ev) {
      /*
       * Convert screen-space mouse delta into canvas-local delta.
       * dividing by `scale` undoes the CSS zoom so deltas match the
       * element's local coordinate system.
       */
      const dx = (ev.clientX - startMouseX) / scale;
      const dy = (ev.clientY - startMouseY) / scale;

      let newW = startW, newH = startH;
      let newLeft = startLeft, newTop = startTop;

      // ── Width axis ──
      if (dir.includes('e')) {
        // East: drag right → grow, drag left → shrink
        newW = Math.max(MIN_DIM, startW + dx);
      }
      if (dir.includes('w')) {
        // West: drag left → grow (right edge stays fixed)
        newW = Math.max(MIN_DIM, startW - dx);
        // Adjust left so the RIGHT edge of the element does not move.
        // Only meaningful for absolutely-positioned elements.
        if (isAbs && newW > MIN_DIM) {
          newLeft = startLeft + (startW - newW);
        }
      }

      // ── Height axis ──
      if (dir.includes('s')) {
        // South: drag down → grow
        newH = Math.max(MIN_DIM, startH + dy);
      }
      if (dir.includes('n')) {
        // North: drag up → grow (bottom edge stays fixed)
        newH = Math.max(MIN_DIM, startH - dy);
        // Adjust top so the BOTTOM edge of the element does not move.
        if (isAbs && newH > MIN_DIM) {
          newTop = startTop + (startH - newH);
        }
      }

      // ── Apply ──
      el.style.width  = newW + 'px';
      el.style.height = newH + 'px';
      if (isAbs) {
        if (dir.includes('w')) el.style.left = newLeft + 'px';
        if (dir.includes('n')) el.style.top  = newTop  + 'px';
      }

      // Keep transformer overlay in sync every frame.
      positionTransformer(el);

      // ── Sync properties panel inputs in real time ──
      const $w = document.getElementById('prop-width');
      const $h = document.getElementById('prop-height');
      if ($w) $w.value = Math.round(newW) + 'px';
      if ($h) $h.value = Math.round(newH) + 'px';

      // Status bar feedback.
      const $sc = document.getElementById('status-center');
      if ($sc) $sc.textContent = `w: ${Math.round(newW)}  h: ${Math.round(newH)}`;
    }

    // ── Release handler ───────────────────────────────────────────────────
    function onUp() {
      _isResizing = false;
      document.body.classList.remove('ce-resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);

      // Persist final dimensions to BuilderState so undo / export are correct.
      const elements = getElements();
      if (elements && id && elements[id]) {
        elements[id].style.width  = el.style.width;
        elements[id].style.height = el.style.height;
        if (isAbs) {
          if (dir.includes('w')) elements[id].style.left = el.style.left;
          if (dir.includes('n')) elements[id].style.top  = el.style.top;
        }
      }

      // Clear status bar.
      const $sc = document.getElementById('status-center');
      if ($sc) $sc.textContent = '';

      // Final transformer sync then save.
      positionTransformer(el);
      call('saveHistoryDebounced');
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §10  INLINE TEXT EDITING — VISUAL SYNC
  //       The existing dblclick → contenteditable mechanism in
  //       attachBuilderEvents already handles all text tags.  This section
  //       adds the pulse animation to the transformer while editing is
  //       active, and repositions it when the element's size changes on blur.
  // ═══════════════════════════════════════════════════════════════════════

  function bindEditingVisualSync() {
    if (!_frame) return;

    _frame.addEventListener('dblclick', (e) => {
      const el = e.target.closest('.forge-el');
      if (!el) return;

      // Watch for the contenteditable attribute being toggled by the existing handler.
      const obs = new MutationObserver(() => {
        if (!_transformer) return;
        const editing = el.getAttribute('contenteditable') === 'true';
        _transformer.classList.toggle('ce-editing', editing);
        if (!editing) {
          // Text content change may have altered the element's dimensions.
          scheduleReposition();
          obs.disconnect();
        }
      });

      obs.observe(el, { attributes: true, attributeFilter: ['contenteditable'] });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §11  MUTATION OBSERVER  (post-renderPage class cleanup)
  //       After each full page render, createDOMFromState() re-adds
  //       is-locked and is-locked-child to elements.  A MutationObserver
  //       watching the frame's direct children fires on every re-render
  //       and strips those classes via a microtask.
  // ═══════════════════════════════════════════════════════════════════════

  function bindMutationObserver() {
    const obs = new MutationObserver(mutations => {
      if (mutations.some(m => m.addedNodes.length > 0)) {
        // Microtask ensures the full subtree has been appended before we strip.
        Promise.resolve().then(unlockAllElements);
      }
    });

    // childList on frame + subtree:false is enough because renderPage replaces
    // direct children of the frame, which triggers the observer.
    obs.observe(_frame, { childList: true, subtree: false });
    return obs;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §12  SCROLL / RESIZE WATCHERS
  //       The transformer must follow the element under any scroll or layout
  //       change (device-mode width switch, window resize, canvas scroll).
  // ═══════════════════════════════════════════════════════════════════════

  function bindRepositionWatchers() {
    // Frame internal scroll.
    _frame.addEventListener('scroll', scheduleReposition, { passive: true });

    // Canvas-area outer scroll (rare but possible on small viewports).
    const canvasArea = document.getElementById('canvas-area');
    if (canvasArea) canvasArea.addEventListener('scroll', scheduleReposition, { passive: true });

    // Window resize (e.g. browser window drag).
    window.addEventListener('resize', scheduleReposition);

    // ResizeObserver on the frame itself — catches device-mode transitions
    // (desktop → tablet → mobile) that change max-width without a window resize.
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(scheduleReposition).observe(_frame);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §13  openPropertiesPanelFor(el)  — PUBLIC PLACEHOLDER
  //       Called once per selection.  Default: delegates to the existing
  //       syncPropertiesPanel(id).  Replace or extend this function to
  //       populate a custom right-side panel with computed styles.
  // ═══════════════════════════════════════════════════════════════════════

  function openPropertiesPanelFor(el) {
    if (!el || !el.id) return;

    // ── Default: use the existing properties panel ────────────────────────
    if (typeof global.syncPropertiesPanel === 'function') {
      global.syncPropertiesPanel(el.id);
      return;
    }

    /* ── Extend here with custom panel population ─────────────────────────
     *
     * const styles   = window.getComputedStyle(el);
     * const nodeData = getElements()?.[el.id] ?? {};
     *
     * const set = (id, v) => { const $i = document.getElementById(id); if ($i) $i.value = v; };
     *
     * set('prop-width',        styles.width);
     * set('prop-height',       styles.height);
     * set('prop-bg',           styles.backgroundColor);
     * set('prop-color',        styles.color);
     * set('prop-font-size',    styles.fontSize);
     * set('prop-font-weight',  styles.fontWeight);
     * set('prop-line-height',  styles.lineHeight);
     * set('prop-letter-spacing', styles.letterSpacing);
     * set('prop-padding',      styles.padding);
     * set('prop-margin',       styles.margin);
     * set('prop-radius',       styles.borderRadius);
     * set('prop-opacity',      styles.opacity);
     * set('prop-transform',    el.style.transform ?? '');
     * set('prop-z-index',      styles.zIndex);
     * set('prop-text',         el.innerText);
     *
     * if (el.tagName === 'A') {
     *   set('prop-href', el.getAttribute('href') ?? '');
     * }
     * if (el.tagName === 'IMG') {
     *   set('prop-src', el.getAttribute('src') ?? '');
     *   set('prop-alt', el.getAttribute('alt') ?? '');
     * }
     *
     * ─────────────────────────────────────────────────────────────────── */
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §14  INIT
  // ═══════════════════════════════════════════════════════════════════════

  function init() {
    _frame = document.getElementById('page-frame');

    if (!_frame) {
      // #page-frame might not exist yet if the script runs before the DOM.
      console.warn('[CanvasEngine] #page-frame not found — retrying in 150 ms…');
      setTimeout(init, 150);
      return;
    }

    injectStyles();
    buildTransformer();
    mountTransformer();
    patchLockFunctions();
    patchBuilderFunctions();
    unlockAllElements();
    bindEditingVisualSync();
    bindMutationObserver();
    bindRepositionWatchers();

    // Expose openPropertiesPanelFor globally so consuming code can call or
    // override it: window.openPropertiesPanelFor = myCustomPanelFn;
    global.openPropertiesPanelFor = openPropertiesPanelFor;

    console.info(
      '%c[CanvasEngine] ✓  Canvas Interaction Engine ready',
      'color:#d4af37; font-weight:700; font-family:monospace;',
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  §15  PUBLIC API
  //       window.CanvasEngine exposes a minimal surface for external
  //       callers (e.g. test suites, DevTools snippets, plugin code).
  // ═══════════════════════════════════════════════════════════════════════

  global.CanvasEngine = {
    /** Re-run initialisation (call if you hot-swap the HTML). */
    init,

    /**
     * Force the transformer to reposition itself on the next paint.
     * Useful after programmatic style changes (e.g. panel inputs).
     */
    reposition: scheduleReposition,

    /**
     * openPropertiesPanelFor(el)
     * Override this to plug in a custom right-panel implementation:
     *   window.CanvasEngine.openPropertiesPanelFor = (el) => { … }
     */
    openPropertiesPanelFor,

    /** Returns the currently-selected DOM element, or null. */
    get selectedElement() { return _selectedEl; },

    /**
     * Programmatically select any .forge-el by DOM reference.
     * Delegates to the (patched) global selectElementDOM so the
     * properties panel and BuilderState both stay consistent.
     *
     * @param {HTMLElement} el
     */
    selectElement(el) {
      if (el && el.id && typeof global.selectElementDOM === 'function') {
        global.selectElementDOM(el, el.id, false);
      }
    },

    /**
     * Programmatically deselect everything.
     * Delegates to the (patched) global deselectAll.
     */
    deselect() {
      if (typeof global.deselectAll === 'function') global.deselectAll();
    },
  };

  // ── Bootstrap ────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    // Script was placed in <head>: wait for DOM.
    document.addEventListener('DOMContentLoaded', init);
  } else {
    /*
     * Script placed before </body> (recommended): DOM is ready, but
     * index.html's inline <script> block may still be executing on
     * the same call-stack tick.  Defer one task so all globals
     * (selectElementDOM, deselectAll, etc.) are registered before we
     * patch them.
     */
    setTimeout(init, 0);
  }

}(window));
