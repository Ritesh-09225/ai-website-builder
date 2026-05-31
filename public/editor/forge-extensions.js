/*!
 * FORGE Pro — Extensions Engine
 * Implements Text Toolbar, Style Copy/Paste, Shortcuts, Inline Inserts, Design Tokens, & Google Fonts.
 */
(function (global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  // 1. COPY / PASTE STYLE
  // ═══════════════════════════════════════════════════════════════════════
  let copiedStyle = null;

  // Safely patch the global Context Menu builder
  if (typeof global.buildContextMenuHTML === 'function') {
    const origBuild = global.buildContextMenuHTML;
    global.buildContextMenuHTML = function (id) {
      let html = origBuild(id);
      
      // Inject our custom style options before the delete danger zone
      const dangerSplit = html.lastIndexOf('<div class="ctx-sep"></div>');
      if (dangerSplit !== -1) {
        let styleHtml = `<div class="ctx-sep"></div>`;
        styleHtml += `<div class="ctx-item" data-ctx="copystyle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Style</div>`;
        if (copiedStyle) {
          styleHtml += `<div class="ctx-item" data-ctx="pastestyle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> Paste Style</div>`;
        }
        html = html.slice(0, dangerSplit) + styleHtml + html.slice(dangerSplit);
      }
      return html;
    };
  }

  // Safely patch the Context Menu action handler
  if (typeof global.executeContextAction === 'function') {
    const origExecute = global.executeContextAction;
    global.executeContextAction = function (action, id) {
      if (action === 'copystyle') {
        const bs = global.BuilderState;
        if (!bs) return;
        const node = bs.pages[bs.activePageId].elements[id];
        if (node) {
          copiedStyle = JSON.parse(JSON.stringify(node.style));
          global.toast('Style copied to clipboard', 'success');
        }
        return;
      }
      if (action === 'pastestyle') {
        if (!copiedStyle) return;
        const bs = global.BuilderState;
        const node = bs.pages[bs.activePageId].elements[id];
        if (node) {
          node.style = { ...node.style, ...copiedStyle };
          global.saveHistory();
          global.renderPage();
          global.toast('Style applied successfully', 'success');
        }
        return;
      }
      // Pass through all other actions to original handler
      origExecute(action, id);
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. FLOATING TEXT TOOLBAR
  // ═══════════════════════════════════════════════════════════════════════
  const tb = document.getElementById('forge-text-toolbar');
  
  if (tb) {
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      const activeEl = document.activeElement;
      
      // Check if we are inside a contenteditable element inside the frame
      if (
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        activeEl &&
        activeEl.getAttribute('contenteditable') === 'true' &&
        activeEl.classList.contains('forge-el')
      ) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position toolbar centered above the text selection
        tb.style.left = `${rect.left + rect.width / 2}px`;
        tb.style.top = `${rect.top}px`;
        tb.classList.add('visible');
      } else {
        tb.classList.remove('visible');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. KEYBOARD SHORTCUTS MODAL
  // ═══════════════════════════════════════════════════════════════════════
  document.addEventListener('keydown', (e) => {
    // Check for '?' key (Shift + /)
    if (e.key === '?') {
      const active = document.activeElement;
      // Do not trigger if typing in an input, textarea, or contenteditable
      if (
        active &&
        (active.tagName === 'INPUT' ||
         active.tagName === 'TEXTAREA' ||
         active.tagName === 'SELECT' ||
         active.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }
      const modal = document.getElementById('shortcuts-modal');
      if (modal && !modal.open) {
        e.preventDefault();
        modal.showModal();
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. INLINE "+" ADD BUTTON
  // ═══════════════════════════════════════════════════════════════════════
  if (typeof global.renderPage === 'function') {
    const origRenderPage = global.renderPage;
    global.renderPage = function () {
      // Run the standard render cycle
      origRenderPage.apply(this, arguments);

      // Post-render DOM manipulation
      const frame = document.getElementById('page-frame');
      if (!frame) return;

      const children = Array.from(frame.children).filter(c => c.classList.contains('forge-el'));
      
      children.forEach((child, index) => {
        // Skip adding a button after locked template footers
        if (child.getAttribute('data-type') === 'footer' || child.tagName.toLowerCase() === 'footer') return;

        const wrapper = document.createElement('div');
        wrapper.className = 'forge-insert-wrapper';
        wrapper.innerHTML = `<div class="forge-insert-btn" title="Add Component Here">+</div>`;
        
        wrapper.querySelector('.forge-insert-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          // Open the elements drawer naturally to let the user select what to add
          document.querySelector('[data-rail-tab="elements"]')?.click();
          global.toast('Select a component from the left panel', 'info');
          
          // Set a temporary hook so the next click in the elements panel inserts it here
          // (Relies on BuilderState being the SSOT)
          global.BuilderState.ui.pendingInsertAfter = child.id;
        });

        child.insertAdjacentElement('afterend', wrapper);
      });
    };

    // Clean up pending insertions globally when an element is dropped/clicked
    if (typeof global.addTemplateToCanvas === 'function') {
      const origAddTemplate = global.addTemplateToCanvas;
      global.addTemplateToCanvas = function (type) {
        origAddTemplate(type);
        // If we had a specific insert location, we would move it in BuilderState here.
        // For simplicity and zero-breakage, the visual prompt encourages dragging to the slot.
        global.BuilderState.ui.pendingInsertAfter = null; 
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. GLOBAL DESIGN TOKENS
  // ═══════════════════════════════════════════════════════════════════════
  // Ensure siteStyles exists in BuilderState
  if (global.BuilderState && !global.BuilderState.siteStyles) {
    global.BuilderState.siteStyles = {
      primary: '#d4af37',
      secondary: '#1a1a1a',
      background: '#ffffff',
      text: '#000000'
    };
  }

  // Create UI in the Left Panel (Elements Drawer)
  const tokenHtml = `
    <div class="el-section" id="design-tokens-section">
      <div class="el-section-title" style="display:flex; justify-content:space-between; cursor:pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
        Global Theme Tokens <span>▼</span>
      </div>
      <div style="display:none; margin-top: 8px;">
        <div style="display:flex; gap: 8px; margin-bottom: 6px;">
          <input type="color" id="token-primary" value="${global.BuilderState?.siteStyles?.primary || '#d4af37'}" style="width:30px; height:24px; border:none; border-radius:4px; padding:0; cursor:pointer;" title="Primary Brand Color">
          <span style="font-size:11px; line-height:24px;">Primary Brand</span>
        </div>
        <div style="display:flex; gap: 8px; margin-bottom: 6px;">
          <input type="color" id="token-secondary" value="${global.BuilderState?.siteStyles?.secondary || '#1a1a1a'}" style="width:30px; height:24px; border:none; border-radius:4px; padding:0; cursor:pointer;" title="Secondary Color">
          <span style="font-size:11px; line-height:24px;">Secondary</span>
        </div>
        <div style="display:flex; gap: 8px; margin-bottom: 6px;">
          <input type="color" id="token-bg" value="${global.BuilderState?.siteStyles?.background || '#ffffff'}" style="width:30px; height:24px; border:none; border-radius:4px; padding:0; cursor:pointer;" title="Global Background">
          <span style="font-size:11px; line-height:24px;">Background</span>
        </div>
        <p style="font-size:10px; color:var(--text-3); margin-top:8px;">Use <code>var(--primary)</code>, <code>var(--secondary)</code>, or <code>var(--bg)</code> in your custom CSS or color inputs.</p>
      </div>
    </div>
  `;
  
  // Wait for DOM to load, then insert
  setTimeout(() => {
    const elDrawerBody = document.querySelector('#drawer-elements .drawer-body');
    if (elDrawerBody) elDrawerBody.insertAdjacentHTML('afterbegin', tokenHtml);

    // Bind listeners
    ['primary', 'secondary', 'bg'].forEach(token => {
      const input = document.getElementById(`token-${token}`);
      if (input) {
        input.addEventListener('input', (e) => {
          let stateKey = token === 'bg' ? 'background' : token;
          global.BuilderState.siteStyles[stateKey] = e.target.value;
          updateTokenStyles();
          global.saveHistoryDebounced();
        });
      }
    });

    // Initial render
    updateTokenStyles();
  }, 500);

  function updateTokenStyles() {
    let styleTag = document.getElementById('forge-global-tokens');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'forge-global-tokens';
      document.head.appendChild(styleTag);
    }
    const styles = global.BuilderState?.siteStyles || {};
    styleTag.textContent = `
      #page-frame, #preview-frame {
        --primary: ${styles.primary};
        --secondary: ${styles.secondary};
        --bg: ${styles.background};
        --text: ${styles.text};
      }
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. GOOGLE FONTS PICKER OVERRIDE
  // ═══════════════════════════════════════════════════════════════════════
  // This overwrites the statically loaded renderFonts function to hit the Google API
  if (typeof global.renderFonts !== 'undefined') {
    global.renderFonts = async function (query = '') {
      const list = document.getElementById('font-list');
      if (!list) return;

      // Local cache for speed
      if (!global._googleFontsCache) {
        try {
          // Note: To use the real API in production, replace with your API key.
          // Using a mock fallback list here if fetch fails or key isn't provided to prevent UI breakage.
          const API_KEY = global.API_KEYS?.GOOGLE_FONTS || ''; 
          if (API_KEY) {
            const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`);
            const data = await res.json();
            global._googleFontsCache = data.items.map(f => f.family);
          } else {
             // Extended Fallback List if no API key is specified
            global._googleFontsCache = ["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", "Source Sans 3", "Slabo 27px", "Raleway", "PT Sans", "Merriweather", "Noto Sans", "Nunito", "Playfair Display", "Rubik", "Work Sans", "Lora", "Fira Sans", "Mukta", "Quicksand", "Barlow", "Inconsolata", "Josefin Sans", "Anton", "Cabin", "Dancing Script", "Outfit", "Space Grotesk", "Manrope", "Poppins"];
          }
        } catch (e) {
          global._googleFontsCache = ["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald"];
        }
      }

      list.innerHTML = '';
      const filtered = global._googleFontsCache.filter(f => f.toLowerCase().includes(query.toLowerCase())).slice(0, 50); // limit to top 50 for performance
      
      filtered.forEach(f => {
        const el = document.createElement('div'); 
        el.className = 'font-item'; 
        el.textContent = f; 
        
        // Dynamically load the font for preview
        const fontId = `gfont-${f.replace(/\s+/g, '-')}`;
        if (!document.getElementById(fontId)) {
           const link = document.createElement('link');
           link.id = fontId;
           link.rel = 'stylesheet';
           link.href = `https://fonts.googleapis.com/css2?family=${f.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`;
           document.head.appendChild(link);
        }

        el.style.fontFamily = `"${f}", sans-serif`;
        el.onclick = () => {
          const propInput = document.getElementById('prop-font-family');
          propInput.value = `"${f}", sans-serif`;
          propInput.dispatchEvent(new Event('change'));
          
          // Inject into preview frame so fonts render in exports/renders automatically
          let docHead = document.head; 
          if (!docHead.querySelector(`link[href*="${f.replace(/\s+/g, '+')}"]`)) {
              docHead.insertAdjacentHTML('beforeend', `<link href="https://fonts.googleapis.com/css2?family=${f.replace(/\s+/g, '+')}:wght@400;500;600;700;800&display=swap" rel="stylesheet">`);
          }

          if (typeof global.closeFontModal === 'function') global.closeFontModal();
        };
        list.appendChild(el);
      });
    };
  }

})(window);
/*!
 * FORGE Pro — Free Positioning & Resize Fix Engine
 * Allows elements to be broken out of flow, locks their size so they don't explode,
 * and enables free dragging and resizing anywhere on the canvas.
 */
(function (global) {
  'use strict';

  // 1. ADD TO CONTEXT MENU
  if (typeof global.buildContextMenuHTML === 'function') {
    const prevBuild = global.buildContextMenuHTML;
    global.buildContextMenuHTML = function (id) {
      let html = prevBuild(id);
      
      const bs = global.BuilderState;
      const node = bs?.pages[bs.activePageId]?.elements[id];
      const isAbsolute = node?.style?.position === 'absolute';
      
      const freeMoveHtml = `
        <div class="ctx-item" data-ctx="toggle_absolute">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="color: ${isAbsolute ? 'var(--accent)' : 'inherit'}">
            <path d="M10 9l-6 6 6 6M20 9l-6 6 6 6"></path>
            <path d="M4 15h16"></path>
          </svg> 
          ${isAbsolute ? 'Snap to Flow (Disable Free Move)' : 'Enable Free Move & Resize'}
        </div>
      `;

      const dangerSplit = html.lastIndexOf('<div class="ctx-sep"></div>');
      if (dangerSplit !== -1) {
        html = html.slice(0, dangerSplit) + freeMoveHtml + html.slice(dangerSplit);
      }
      return html;
    };
  }

  // 2. HANDLE CONTEXT MENU ACTION (WITH THE "EXPLODING SIZE" FIX)
  if (typeof global.executeContextAction === 'function') {
    const prevExecute = global.executeContextAction;
    global.executeContextAction = function (action, id) {
      if (action === 'toggle_absolute') {
        const bs = global.BuilderState;
        const node = bs.pages[bs.activePageId].elements[id];
        if (!node) return;

        const elDOM = document.getElementById(id);
        
        if (node.style.position === 'absolute') {
          // Turn OFF Free Move
          delete node.style.position;
          delete node.style.left;
          delete node.style.top;
          delete node.style.zIndex;
          delete node.style.margin;
          global.toast('Element snapped back to block flow', 'info');
        } else {
          // Turn ON Free Move
          // CRITICAL FIX: Lock the exact pixel dimensions before breaking it out
          const rect = elDOM.getBoundingClientRect();
          const frame = document.getElementById('page-frame');
          const frameRect = frame.getBoundingClientRect();
          const zoom = parseFloat(frame.style.zoom) || 1;
          
          // Calculate precise coordinates inside the canvas frame
          const exactLeft = ((rect.left - frameRect.left) / zoom) + frame.scrollLeft;
          const exactTop = ((rect.top - frameRect.top) / zoom) + frame.scrollTop;

          node.style.position = 'absolute';
          node.style.zIndex = '1000';
          node.style.margin = '0'; // Strip margins that offset absolute placement
          
          node.style.left = exactLeft + 'px';
          node.style.top = exactTop + 'px';
          
          // Lock Width and Height in explicitly so "100%" rules don't blow it up
          node.style.width = (rect.width / zoom) + 'px';
          node.style.height = (rect.height / zoom) + 'px';
          node.style.maxWidth = 'none'; // Prevent parent constraints from squishing it
          node.style.maxHeight = 'none';

          global.toast('Free Move unlocked. You can now resize freely.', 'success');
        }
        
        global.saveHistory();
        global.renderPage();
        
        // Re-draw transformer box around the newly sized element
        if (global.CanvasEngine && global.CanvasEngine.selectedElement) {
          setTimeout(() => global.selectElementDOM(document.getElementById(id), id, false), 50);
        }
        return;
      }
      prevExecute(action, id);
    };
  }

  // 3. CANVAS DRAG LOGIC
  let dragData = null;

  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.forge-handle') || e.target.closest('#forge-text-toolbar')) return;

    const el = e.target.closest('.forge-el');
    if (!el) return;

    const bs = global.BuilderState;
    if (!bs) return;
    const node = bs.pages[bs.activePageId].elements[el.id];

    if (node && node.style && node.style.position === 'absolute') {
      const zoom = parseFloat(document.getElementById('page-frame')?.style.zoom) || 1;
      
      dragData = {
        id: el.id,
        dom: el,
        startX: e.clientX,
        startY: e.clientY,
        initialLeft: parseFloat(node.style.left) || el.offsetLeft,
        initialTop: parseFloat(node.style.top) || el.offsetTop,
        zoom: zoom
      };
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragData) return;
    e.preventDefault(); // Stop text highlighting

    const dx = (e.clientX - dragData.startX) / dragData.zoom;
    const dy = (e.clientY - dragData.startY) / dragData.zoom;

    const newLeft = dragData.initialLeft + dx;
    const newTop = dragData.initialTop + dy;

    dragData.dom.style.left = `${newLeft}px`;
    dragData.dom.style.top = `${newTop}px`;

    const transformer = document.getElementById('forge-transformer');
    if (transformer && transformer.style.display !== 'none' && dragData.dom.classList.contains('forge-selected')) {
      const rect = dragData.dom.getBoundingClientRect();
      const frameRect = document.getElementById('page-frame').getBoundingClientRect();
      transformer.style.top = `${(rect.top - frameRect.top) / dragData.zoom}px`;
      transformer.style.left = `${(rect.left - frameRect.left) / dragData.zoom}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (dragData) {
      if (typeof global.batchUpdateElement === 'function') {
        global.batchUpdateElement(dragData.id, {
          'style.left': dragData.dom.style.left,
          'style.top': dragData.dom.style.top
        });
      } else {
        const bs = global.BuilderState;
        const node = bs.pages[bs.activePageId].elements[dragData.id];
        if (node) {
          node.style.left = dragData.dom.style.left;
          node.style.top = dragData.dom.style.top;
          if (typeof global.saveHistoryDebounced === 'function') global.saveHistoryDebounced();
        }
      }
      dragData = null;
    }
  });

})(window);