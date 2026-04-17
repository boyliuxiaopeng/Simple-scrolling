// ==UserScript==
// @name         Simple Scrolling
// @namespace    https://github.com/boyliuxiaopeng/Simple-scrolling/
// @version      1.2.1
// @description  Lightweight floating scroll helper with drag, shortcuts, theme colors, and settings.
// @author       GPT, boyliuxiaopeng
// @create       2025-05-09
// @lastmodified 2026-04-20
// @match        *://*/*
// @copyright    MIT
// @require      https://unpkg.com/sweetalert2@10.16.6/dist/sweetalert2.all.min.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'ScrollHelperConfig';
  const PANEL_ID = 'scroll-helper-panel';
  const DRAG_THRESHOLD = 5;
  const PANEL_OFFSET_LIMIT = 72;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  const defaultConfig = {
    scrollKeys: { top: 'ArrowUp', bottom: 'ArrowDown' },
    autoShow: true,
    iconSize: 18,
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

  function safeParseConfig() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
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
    merged.iconGap = clamp(merged.iconGap, 4, 20, defaultConfig.iconGap);
    merged.borderRadius = clamp(merged.borderRadius, 0, 24, defaultConfig.borderRadius);
    merged.panelOpacity = clamp(merged.panelOpacity, 20, 100, defaultConfig.panelOpacity);
    merged.iconPos.right = clamp(merged.iconPos.right, 0, 9999, defaultConfig.iconPos.right);
    merged.iconPos.bottom = clamp(merged.iconPos.bottom, 0, 9999, defaultConfig.iconPos.bottom);
    merged.autoShow = Boolean(merged.autoShow);
    merged.darkMode = Boolean(merged.darkMode);
    merged.keyEnabled = Boolean(merged.keyEnabled);

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function shouldUseDarkMode() {
    return config.darkMode || prefersDarkScheme.matches;
  }

  function limitToViewport(position) {
    position.right = clamp(position.right, 0, Math.max(0, window.innerWidth - PANEL_OFFSET_LIMIT), defaultConfig.iconPos.right);
    position.bottom = clamp(position.bottom, 0, Math.max(0, window.innerHeight - PANEL_OFFSET_LIMIT), defaultConfig.iconPos.bottom);
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

  function createButton(id, label, title, onClick) {
    const isSettingsButton = id === 'scroll-settings';
    const background = isSettingsButton
      ? config.settingsColor
      : (shouldUseDarkMode() ? config.darkColor : config.lightColor);

    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);

    Object.assign(button.style, {
      all: 'unset',
      width: `${config.iconSize + 18}px`,
      height: `${config.iconSize + 18}px`,
      fontSize: `${Math.max(11, config.iconSize - 3)}px`,
      lineHeight: '1',
      borderRadius: `${config.borderRadius}px`,
      background,
      color: '#FFFFFF',
      cursor: 'pointer',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
      display: 'grid',
      placeItems: 'center',
      textAlign: 'center',
      userSelect: 'none',
      fontFamily: 'Arial, sans-serif',
      fontWeight: '700',
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
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const onMouseMove = (event) => {
      if (!isDragging || !state.panel) {
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

    const onMouseUp = () => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      saveConfig();
    };

    const onMouseDown = (event) => {
      if (event.button !== 0) {
        return;
      }

      state.isDragged = false;
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      event.preventDefault();
    };

    state.panel.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    state.dragCleanup = () => {
      if (state.panel) {
        state.panel.removeEventListener('mousedown', onMouseDown);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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
        <label><input type="checkbox" id="set-keyEnabled" ${config.keyEnabled ? 'checked' : ''}> Enable shortcut Ctrl + Up / Down</label><br><br>
        <label><input type="checkbox" id="set-darkMode" ${config.darkMode ? 'checked' : ''}> Force dark button theme</label>
      </div>
    `;
  }

  function applySettingsFromDialog() {
    config.iconSize = clamp(document.getElementById('set-iconSize').value, 14, 48, defaultConfig.iconSize);
    config.borderRadius = clamp(document.getElementById('set-radius').value, 0, 24, defaultConfig.borderRadius);
    config.panelOpacity = clamp(document.getElementById('set-opacity').value, 20, 100, defaultConfig.panelOpacity);
    config.lightColor = document.getElementById('set-lightColor').value || defaultConfig.lightColor;
    config.darkColor = document.getElementById('set-darkColor').value || defaultConfig.darkColor;
    config.settingsColor = document.getElementById('set-settingsColor').value || defaultConfig.settingsColor;
    config.autoShow = document.getElementById('set-autoShow').checked;
    config.keyEnabled = document.getElementById('set-keyEnabled').checked;
    config.darkMode = document.getElementById('set-darkMode').checked;
    saveConfig();
  }

  function openSettings() {
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
        document.querySelectorAll('.scroll-helper-preset').forEach((button) => {
          button.addEventListener('click', () => {
            document.getElementById('set-lightColor').value = button.dataset.light;
            document.getElementById('set-darkColor').value = button.dataset.dark;
            document.getElementById('set-settingsColor').value = button.dataset.settings;
          });
        });
      },
      preConfirm: () => {
        applySettingsFromDialog();
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
      cursor: 'move'
    });

    panel.appendChild(createButton('scroll-top', 'TOP', 'Scroll to top', scrollToTop));
    panel.appendChild(createButton('scroll-mid', 'MID', 'Scroll to middle', scrollToMiddle));
    panel.appendChild(createButton('scroll-bottom', 'BOT', 'Scroll to bottom', scrollToBottom));
    panel.appendChild(createButton('scroll-settings', 'SET', 'Open settings', openSettings));

    document.body.appendChild(panel);
    state.panel = panel;
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
