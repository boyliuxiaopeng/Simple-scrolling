// ==UserScript==
// @name         Simple Scrolling
// @name:zh-CN   简单滑块
// @namespace    https://greasyfork.org/users/82488
// @namespace    https://github.com/boyliuxiaopeng/Simple-scrolling/
// @version      0.0.2
// @description  Lightweight floating scroll helper with drag, shortcuts, theme colors, settings, and lazy-loaded dialog.
// @description:zh-CN  为任意网页添加浮动的滑块，实现快速的上下滑动，支持拖动、快捷方式、主题颜色和设置。
// @author       暖色浮余生
// @create       2025-05-09
// @lastmodified 2026-07-14
// @match        *://*/*
// @copyright    MIT
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'ScrollHelperConfig';
  const PANEL_ID = 'scroll-helper-panel';
  const DRAG_THRESHOLD = 5;
  const ICON_STYLE_ORDER = ['outline', 'chevron', 'solid', 'rounded'];
  const TOP_KEY_OPTIONS = ['ArrowUp', 'PageUp', 'Home', 'w', 'W'];
  const BOTTOM_KEY_OPTIONS = ['ArrowDown', 'PageDown', 'End', 's', 'S'];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  const defaultConfig = {
    scrollKeys: { top: 'ArrowUp', bottom: 'ArrowDown' },
    autoShow: true,
    iconSize: 18,
    iconStyle: 'outline',
    iconStroke: 2.25,
    iconScale: 58,
    iconGap: 8,
    borderRadius: 12,
    panelOpacity: 60,
    iconPos: { right: 30, bottom: 100 },
    darkMode: false,
    keyEnabled: true,
    lightColor: '#007BFF',
    darkColor: '#444444',
    settingsColor: '#FFB800'
  };

  // Prefer GM storage (shared across all sites, isolated from the page).
  // Fall back to localStorage when running without GM grants.
  function readStoredConfig() {
    if (typeof GM_getValue === 'function') {
      return GM_getValue(STORAGE_KEY, '{}');
    }
    return localStorage.getItem(STORAGE_KEY) || '{}';
  }

  function writeStoredConfig(raw) {
    if (typeof GM_setValue === 'function') {
      GM_setValue(STORAGE_KEY, raw);
      return;
    }
    localStorage.setItem(STORAGE_KEY, raw);
  }

  function safeParseConfig() {
    try {
      return JSON.parse(readStoredConfig());
    } catch (error) {
      console.warn('[Simple Scrolling] Failed to read saved config. Defaults restored.', error);
      return {};
    }
  }

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(Math.max(number, min), max);
  }

  function sanitizeColor(value, fallback) {
    return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
  }

  function mergeConfig(rawConfig) {
    const merged = {
      ...defaultConfig,
      ...rawConfig,
      scrollKeys: {
        ...defaultConfig.scrollKeys,
        ...(rawConfig.scrollKeys || {})
      },
      iconPos: {
        ...defaultConfig.iconPos,
        ...(rawConfig.iconPos || {})
      }
    };

    merged.iconSize = clamp(merged.iconSize, 14, 48, defaultConfig.iconSize);
    merged.iconStyle = ICON_STYLE_ORDER.includes(merged.iconStyle) ? merged.iconStyle : 'outline';
    merged.iconStroke = clamp(merged.iconStroke, 1, 4, defaultConfig.iconStroke);
    merged.iconScale = clamp(merged.iconScale, 40, 75, defaultConfig.iconScale);
    merged.iconGap = clamp(merged.iconGap, 4, 20, defaultConfig.iconGap);
    merged.borderRadius = clamp(merged.borderRadius, 0, 24, defaultConfig.borderRadius);
    merged.panelOpacity = clamp(merged.panelOpacity, 20, 100, defaultConfig.panelOpacity);
    merged.iconPos.right = clamp(merged.iconPos.right, 0, 9999, defaultConfig.iconPos.right);
    merged.iconPos.bottom = clamp(merged.iconPos.bottom, 0, 9999, defaultConfig.iconPos.bottom);
    merged.autoShow = Boolean(merged.autoShow);
    merged.darkMode = Boolean(merged.darkMode);
    merged.keyEnabled = Boolean(merged.keyEnabled);
    merged.lightColor = sanitizeColor(merged.lightColor, defaultConfig.lightColor);
    merged.darkColor = sanitizeColor(merged.darkColor, defaultConfig.darkColor);
    merged.settingsColor = sanitizeColor(merged.settingsColor, defaultConfig.settingsColor);
    merged.scrollKeys.top = merged.scrollKeys.top || defaultConfig.scrollKeys.top;
    merged.scrollKeys.bottom = merged.scrollKeys.bottom || defaultConfig.scrollKeys.bottom;

    return merged;
  }

  const config = mergeConfig(safeParseConfig());

  const state = {
    panel: null,
    isDragged: false,
    dragCleanup: null,
    scrollCleanup: null,
    keydownHandler: null,
    mediaHandler: null
  };

  function getScrollRoot() {
    return document.scrollingElement || document.documentElement || document.body;
  }

  function getMaxScrollTop() {
    const root = getScrollRoot();
    return Math.max(0, root.scrollHeight - window.innerHeight);
  }

  function getScrollBehavior() {
    return prefersReducedMotion.matches ? 'auto' : 'smooth';
  }

  function saveConfig() {
    try {
      writeStoredConfig(JSON.stringify(config));
    } catch (error) {
      console.warn('[Simple Scrolling] Failed to save config.', error);
    }
  }

  function shouldUseDarkMode() {
    return config.darkMode || prefersDarkScheme.matches;
  }

  // Estimate the panel footprint so it can never be dragged fully off-screen.
  function getPanelSize() {
    if (state.panel) {
      return {
        width: state.panel.offsetWidth || (config.iconSize + 18),
        height: state.panel.offsetHeight || ((config.iconSize + 18) * 4 + config.iconGap * 3)
      };
    }
    const buttonSize = config.iconSize + 18;
    return { width: buttonSize, height: buttonSize * 4 + config.iconGap * 3 };
  }

  function limitToViewport(position) {
    const { width, height } = getPanelSize();
    position.right = clamp(position.right, 0, Math.max(0, window.innerWidth - width), defaultConfig.iconPos.right);
    position.bottom = clamp(position.bottom, 0, Math.max(0, window.innerHeight - height), defaultConfig.iconPos.bottom);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });
  }

  function scrollToMiddle() {
    window.scrollTo({ top: getMaxScrollTop() / 2, behavior: getScrollBehavior() });
  }

  function scrollToBottom() {
    window.scrollTo({ top: getMaxScrollTop(), behavior: getScrollBehavior() });
  }

  // Four inline-SVG glyph styles, tinted via currentColor so they follow the
  // button's text color. Outline/Chevron = Feather-style strokes (MIT);
  // Solid/Rounded = filled triangles + a Material settings gear (Apache-2.0),
  // with Rounded adding a round-joined stroke to soften the corners.
  const FEATHER_GEAR = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>';

  const FILLED_PATHS = {
    top: '<path d="M12 6 L19 18 L5 18 Z"/>',
    middle: '<rect x="4" y="10.5" width="16" height="3" rx="1.5"/>',
    bottom: '<path d="M12 18 L5 6 L19 6 Z"/>',
    settings: '<path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>'
  };

  const ICON_SETS = {
    outline: {
      render: 'stroke',
      paths: {
        top: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
        middle: '<line x1="5" y1="12" x2="19" y2="12"/>',
        bottom: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
        settings: FEATHER_GEAR
      }
    },
    chevron: {
      render: 'stroke',
      paths: {
        top: '<polyline points="5 13 12 6 19 13"/><polyline points="5 19 12 12 19 19"/>',
        middle: '<line x1="5" y1="12" x2="19" y2="12"/>',
        bottom: '<polyline points="5 5 12 12 19 5"/><polyline points="5 11 12 18 19 11"/>',
        settings: FEATHER_GEAR
      }
    },
    solid: {
      render: 'fill',
      paths: FILLED_PATHS
    },
    rounded: {
      render: 'fillRound',
      paths: FILLED_PATHS
    }
  };

  function buildIcon(name, size) {
    const set = ICON_SETS[config.iconStyle] || ICON_SETS.outline;
    let paint;
    if (set.render === 'fill') {
      paint = 'fill="currentColor" stroke="none"';
    } else if (set.render === 'fillRound') {
      paint = `fill="currentColor" stroke="currentColor" stroke-width="${config.iconStroke}" stroke-linecap="round" stroke-linejoin="round"`;
    } else {
      paint = `fill="none" stroke="currentColor" stroke-width="${config.iconStroke}" stroke-linecap="round" stroke-linejoin="round"`;
    }
    return `<svg viewBox="0 0 24 24" ${paint} aria-hidden="true" focusable="false" style="width:${size}px;height:${size}px;display:block;pointer-events:none">${set.paths[name] || ''}</svg>`;
  }

  function cycleIconStyle() {
    const idx = ICON_STYLE_ORDER.indexOf(config.iconStyle);
    config.iconStyle = ICON_STYLE_ORDER[(idx + 1) % ICON_STYLE_ORDER.length];
    saveConfig();
    render();
  }

  function createButton(id, iconName, title, onClick) {
    const isSettingsButton = id === 'scroll-settings';
    const background = isSettingsButton
      ? config.settingsColor
      : (shouldUseDarkMode() ? config.darkColor : config.lightColor);

    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.innerHTML = buildIcon(iconName, Math.round((config.iconSize + 18) * (config.iconScale / 100)));
    button.title = title;
    button.setAttribute('aria-label', title);

    Object.assign(button.style, {
      all: 'unset',
      width: `${config.iconSize + 18}px`,
      height: `${config.iconSize + 18}px`,
      borderRadius: `${config.borderRadius}px`,
      background,
      color: '#FFFFFF',
      cursor: 'pointer',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
      display: 'grid',
      placeItems: 'center',
      userSelect: 'none',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease'
    });

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.08)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.22)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.2)';
    });
    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.94)';
    });
    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1.08)';
    });
    button.addEventListener('click', (event) => {
      if (state.isDragged) {
        state.isDragged = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClick();
    });

    return button;
  }

  function destroyPanel() {
    if (typeof state.dragCleanup === 'function') {
      state.dragCleanup();
      state.dragCleanup = null;
    }
    if (typeof state.scrollCleanup === 'function') {
      state.scrollCleanup();
      state.scrollCleanup = null;
    }
    if (state.keydownHandler) {
      document.removeEventListener('keydown', state.keydownHandler);
      state.keydownHandler = null;
    }
    if (state.mediaHandler) {
      prefersDarkScheme.removeEventListener('change', state.mediaHandler);
      state.mediaHandler = null;
    }
    if (state.panel) {
      state.panel.remove();
      state.panel = null;
    }
  }

  function updatePanelVisibility() {
    if (!state.panel) {
      return;
    }

    if (!config.autoShow) {
      state.panel.style.display = 'flex';
      return;
    }

    state.panel.style.display = window.scrollY > 200 ? 'flex' : 'none';
  }

  function bindScrollVisibility() {
    updatePanelVisibility();

    const handleScroll = () => updatePanelVisibility();
    const handleResize = () => {
      limitToViewport(config.iconPos);
      if (state.panel) {
        state.panel.style.right = `${config.iconPos.right}px`;
        state.panel.style.bottom = `${config.iconPos.bottom}px`;
      }
      updatePanelVisibility();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    state.scrollCleanup = () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }

  function bindDrag() {
    let pointerId = null;
    let startX = 0;
    let startY = 0;

    const onPointerMove = (event) => {
      if (pointerId === null || !state.panel || event.pointerId !== pointerId) {
        return;
      }

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        state.isDragged = true;
      }

      config.iconPos.right -= dx;
      config.iconPos.bottom -= dy;
      limitToViewport(config.iconPos);

      state.panel.style.right = `${config.iconPos.right}px`;
      state.panel.style.bottom = `${config.iconPos.bottom}px`;

      startX = event.clientX;
      startY = event.clientY;
    };

    const onPointerUp = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) {
        return;
      }

      pointerId = null;
      if (state.panel) {
        state.panel.releasePointerCapture(event.pointerId);
      }
      // Only persist when an actual drag happened, not on a plain button click.
      if (state.isDragged) {
        saveConfig();
      }
    };

    const onPointerDown = (event) => {
      // Reject non-primary mouse clicks (right/middle) but accept touch/pen.
      if (event.button !== 0 && event.pointerType === 'mouse') {
        return;
      }

      state.isDragged = false;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      state.panel.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    state.panel.addEventListener('pointerdown', onPointerDown);
    state.panel.addEventListener('pointermove', onPointerMove);
    state.panel.addEventListener('pointerup', onPointerUp);
    state.panel.addEventListener('pointercancel', onPointerUp);

    state.dragCleanup = () => {
      if (state.panel) {
        state.panel.removeEventListener('pointerdown', onPointerDown);
        state.panel.removeEventListener('pointermove', onPointerMove);
        state.panel.removeEventListener('pointerup', onPointerUp);
        state.panel.removeEventListener('pointercancel', onPointerUp);
      }
    };
  }

  function buildSettingsHtml(colorPresets) {
    return `
      <div style="text-align:left;max-height:500px;overflow-y:auto">
        <div style="margin-bottom:15px;padding:10px;background:#f9f9f9;border-radius:5px">
          <p style="margin:0 0 10px 0;font-weight:bold;font-size:14px">Color presets</p>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${Object.entries(colorPresets).map(([name, colors]) => `
              <button
                type="button"
                data-light="${colors.light}"
                data-dark="${colors.dark}"
                data-settings="${colors.settings}"
                class="scroll-helper-preset"
                style="padding:8px 12px;background:#f0f0f0;border:1px solid #ddd;border-radius:3px;cursor:pointer;font-size:12px"
              >${name}</button>
            `).join('')}
          </div>
        </div>
        <label>Icon size:
          <input type="number" id="set-iconSize" min="14" max="48" value="${config.iconSize}" style="width:60px">
        </label><br><br>
        <label>Icon style:
          <select id="set-iconStyle" style="width:110px">
            ${ICON_STYLE_ORDER.map((style) => `<option value="${style}" ${config.iconStyle === style ? 'selected' : ''}>${style.charAt(0).toUpperCase() + style.slice(1)}</option>`).join('')}
          </select>
        </label><br><br>
        <label>Icon scale (%):
          <input type="number" id="set-iconScale" min="40" max="75" value="${config.iconScale}" style="width:60px">
        </label><br><br>
        <label>Stroke width (not Solid):
          <input type="number" id="set-iconStroke" min="1" max="4" step="0.25" value="${config.iconStroke}" style="width:60px">
        </label><br><br>
        <label>Corner radius:
          <input type="number" id="set-radius" min="0" max="24" value="${config.borderRadius}" style="width:60px">
        </label><br><br>
        <label>Opacity (%):
          <input type="number" id="set-opacity" min="20" max="100" value="${config.panelOpacity}" style="width:60px">
        </label><br><br>
        <label>Light color:
          <input type="color" id="set-lightColor" value="${config.lightColor}" style="width:60px;height:30px;cursor:pointer">
        </label><br><br>
        <label>Dark color:
          <input type="color" id="set-darkColor" value="${config.darkColor}" style="width:60px;height:30px;cursor:pointer">
        </label><br><br>
        <label>Settings color:
          <input type="color" id="set-settingsColor" value="${config.settingsColor}" style="width:60px;height:30px;cursor:pointer">
        </label><br><br>
        <label><input type="checkbox" id="set-autoShow" ${config.autoShow ? 'checked' : ''}> Auto show only after scrolling</label><br><br>
        <label>Top shortcut (Ctrl +):
          <select id="set-scrollKeyTop" style="width:110px">
            ${TOP_KEY_OPTIONS.map((key) => `<option value="${key}" ${config.scrollKeys.top === key ? 'selected' : ''}>${key}</option>`).join('')}
          </select>
        </label><br>
        <label>Bottom shortcut (Ctrl +):
          <select id="set-scrollKeyBottom" style="width:110px">
            ${BOTTOM_KEY_OPTIONS.map((key) => `<option value="${key}" ${config.scrollKeys.bottom === key ? 'selected' : ''}>${key}</option>`).join('')}
          </select>
        </label><br><br>
        <label><input type="checkbox" id="set-keyEnabled" ${config.keyEnabled ? 'checked' : ''}> Enable shortcut Ctrl + Up / Down</label><br><br>
        <label><input type="checkbox" id="set-darkMode" ${config.darkMode ? 'checked' : ''}> Force dark button theme</label>
      </div>
    `;
  }

  function applySettingsFromDialog(popup) {
    const field = (id) => popup.querySelector(`#${id}`);

    config.iconSize = clamp(field('set-iconSize').value, 14, 48, defaultConfig.iconSize);
    config.iconStyle = ICON_STYLE_ORDER.includes(field('set-iconStyle').value) ? field('set-iconStyle').value : 'outline';
    config.iconScale = clamp(field('set-iconScale').value, 40, 75, defaultConfig.iconScale);
    config.iconStroke = clamp(field('set-iconStroke').value, 1, 4, defaultConfig.iconStroke);
    config.borderRadius = clamp(field('set-radius').value, 0, 24, defaultConfig.borderRadius);
    config.panelOpacity = clamp(field('set-opacity').value, 20, 100, defaultConfig.panelOpacity);
    config.lightColor = sanitizeColor(field('set-lightColor').value, defaultConfig.lightColor);
    config.darkColor = sanitizeColor(field('set-darkColor').value, defaultConfig.darkColor);
    config.settingsColor = sanitizeColor(field('set-settingsColor').value, defaultConfig.settingsColor);
    config.autoShow = field('set-autoShow').checked;
    config.keyEnabled = field('set-keyEnabled').checked;
    config.scrollKeys.top = field('set-scrollKeyTop').value || defaultConfig.scrollKeys.top;
    config.scrollKeys.bottom = field('set-scrollKeyBottom').value || defaultConfig.scrollKeys.bottom;
    config.darkMode = field('set-darkMode').checked;
    saveConfig();
  }

  // Lazy-load SweetAlert2 only when the user opens settings.
  let swalPromise = null;

  function loadSwal() {
    if (typeof Swal !== 'undefined') {
      return Promise.resolve();
    }
    if (swalPromise) {
      return swalPromise;
    }
    swalPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/sweetalert2@10.16.6/dist/sweetalert2.all.min.js';
      script.onload = () => resolve();
      script.onerror = () => {
        swalPromise = null; // allow one retry
        reject(new Error('SweetAlert2 load failed'));
      };
      document.head.appendChild(script);
    });
    return swalPromise;
  }

  function openSettings() {
    loadSwal().then(() => {
      _showSettingsDialog();
    }).catch(() => {
      alert('Simple Scrolling: the settings dialog failed to load (it may be blocked by this site\'s security policy).');
    });
  }

  function _showSettingsDialog() {

    const colorPresets = {
      Blue: { light: '#007BFF', dark: '#444444', settings: '#FFB800' },
      Green: { light: '#28A745', dark: '#2D5016', settings: '#FFD700' },
      Purple: { light: '#6F42C1', dark: '#3D1E5C', settings: '#FF6B9D' },
      Red: { light: '#DC3545', dark: '#721C24', settings: '#FFA500' },
      Gray: { light: '#495057', dark: '#212529', settings: '#6C757D' }
    };

    Swal.fire({
      title: 'Scroll helper settings',
      html: buildSettingsHtml(colorPresets),
      confirmButtonText: 'Save',
      showCancelButton: true,
      focusConfirm: false,
      didOpen: () => {
        const popup = Swal.getPopup();
        popup.querySelectorAll('.scroll-helper-preset').forEach((button) => {
          button.addEventListener('click', () => {
            popup.querySelector('#set-lightColor').value = button.dataset.light;
            popup.querySelector('#set-darkColor').value = button.dataset.dark;
            popup.querySelector('#set-settingsColor').value = button.dataset.settings;
          });
        });
      },
      preConfirm: () => {
        applySettingsFromDialog(Swal.getPopup());
      }
    }).then((result) => {
      if (result.isConfirmed) {
        render();
      }
    });
  }

  function bindShortcuts() {
    if (!config.keyEnabled) {
      return;
    }

    state.keydownHandler = (event) => {
      if (!event.ctrlKey) {
        return;
      }

      // Don't hijack Ctrl+Up/Down while the user is typing or editing.
      const target = event.target;
      if (target && (target.isContentEditable ||
          /^(input|textarea|select)$/i.test(target.tagName))) {
        return;
      }

      if (event.key === config.scrollKeys.top) {
        event.preventDefault();
        scrollToTop();
      } else if (event.key === config.scrollKeys.bottom) {
        event.preventDefault();
        scrollToBottom();
      }
    };

    document.addEventListener('keydown', state.keydownHandler);
  }

  function createPanel() {
    const existingPanel = document.getElementById(PANEL_ID);
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    limitToViewport(config.iconPos);

    Object.assign(panel.style, {
      position: 'fixed',
      right: `${config.iconPos.right}px`,
      bottom: `${config.iconPos.bottom}px`,
      display: 'flex',
      flexDirection: 'column',
      gap: `${config.iconGap}px`,
      zIndex: '99999',
      opacity: String(config.panelOpacity / 100),
      cursor: 'move',
      touchAction: 'none'
    });

    panel.appendChild(createButton('scroll-top', 'top', 'Scroll to top', scrollToTop));
    panel.appendChild(createButton('scroll-mid', 'middle', 'Scroll to middle', scrollToMiddle));
    panel.appendChild(createButton('scroll-bottom', 'bottom', 'Scroll to bottom', scrollToBottom));

    const settingsButton = createButton('scroll-settings', 'settings', 'Open settings (right-click or long-press to cycle icon style)', openSettings);
    settingsButton.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      cycleIconStyle();
    });
    // Long-press on the gear cycles icon style (mobile equivalent of right-click).
    {
      let pressTimer = null;
      settingsButton.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => {
          if (!state.isDragged) {
            cycleIconStyle();
          }
        }, 600);
      });
      const clearPress = () => { clearTimeout(pressTimer); pressTimer = null; };
      settingsButton.addEventListener('pointerup', clearPress);
      settingsButton.addEventListener('pointercancel', clearPress);
      settingsButton.addEventListener('contextmenu', clearPress);
    }
    panel.appendChild(settingsButton);

    document.body.appendChild(panel);
    state.panel = panel;

    // Re-clamp now that real dimensions are known, in case the estimate was off.
    limitToViewport(config.iconPos);
    panel.style.right = `${config.iconPos.right}px`;
    panel.style.bottom = `${config.iconPos.bottom}px`;
  }

  function render() {
    destroyPanel();
    createPanel();
    bindDrag();
    bindScrollVisibility();
    bindShortcuts();

    state.mediaHandler = () => {
      if (!config.darkMode) {
        render();
      }
    };
    prefersDarkScheme.addEventListener('change', state.mediaHandler);
  }

  function init() {
    if (!document.body) {
      return;
    }
    render();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
