// ==UserScript==
// @name         Simple Scrolling
// @name:zh-CN   简单滑块
// @namespace    https://greasyfork.org/users/82488
// @namespace    https://github.com/boyliuxiaopeng/Simple-scrolling/
// @version      1.0.3
// @description  Lightweight floating scroll helper with drag, shortcuts, theme colors, settings, and lazy-loaded dialog.
// @description:zh-CN  轻量级悬浮滚动助手，为任意网页添加浮动的滑块，实现快速的上下滑动，支持拖拽、快捷键、主题配色、设置面板和懒加载对话框。
// @author       暖色浮余生
// @create       2025-05-09
// @lastmodified 2026-07-14
// @match        *://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /* 
   * 1. 常量与默认值 / CONSTANTS & DEFAULTS
   */

  /** GM_* 和 localStorage 共用的存储键名。
   *  Key used for both GM_* and localStorage. */
  const STORAGE_KEY = 'ScrollHelperConfig';

  /** 悬浮面板的 DOM id，每个页面必须唯一。
   *  DOM id of the floating panel. Must be unique per page. */
  const PANEL_ID = 'scroll-helper-panel';

  /** 指针移动超过此距离 (px) 才认定为拖拽。
   *  Minimum pointer movement (px) before a drag is recognised. */
  const DRAG_THRESHOLD = 5;

  /** 图标风格循环顺序（右键/长按切换）。
   *  Ordered list — decides the right-click / long-press cycle sequence. */
  const ICON_STYLE_ORDER = ['outline', 'chevron', 'solid', 'rounded'];

  /** 设置对话框中两个快捷键的可选项。
   *  Options shown in the settings dialog for the two shortcut keys. */
  const TOP_KEY_OPTIONS = ['ArrowUp', 'PageUp', 'Home', 'w', 'W'];
  const BOTTOM_KEY_OPTIONS = ['ArrowDown', 'PageDown', 'End', 's', 'S'];

  /** 实时 MediaQueryList 对象——每次访问时重新求值。
   *  Live MediaQueryList objects — evaluate on every access. */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  /**
   * 经过校验的默认回退值。所有写入 config 的值都会按下述范围校验。
   * Sanity-checked fallback values.
   * Every value written to config will be validated against the ranges below.
   */
  const defaultConfig = {
    scrollKeys: { top: 'ArrowUp', bottom: 'ArrowDown' },
    autoShow: true,
    iconSize: 18,          // px — 控制按钮尺寸 (iconSize+18) / controls button dimensions
    iconStyle: 'outline',
    iconStroke: 2.25,      // px — 适用于 Outline、Chevron 和 Rounded / applies to those three styles
    iconScale: 58,         // %  — 图标相对按钮的大小比例 / icon-to-button size ratio
    iconGap: 8,            // px — 按钮之间的垂直间距 / vertical gap between buttons
    borderRadius: 12,      // px — 按钮圆角 / button corner rounding
    panelOpacity: 60,      // %  — 面板整体透明度 / overall panel opacity
    iconPos: { right: 30, bottom: 100 },  // px — 以右下角为锚点 / anchored to bottom-right
    darkMode: false,
    keyEnabled: true,
    lightColor: '#007BFF',
    darkColor: '#444444',
    settingsColor: '#FFB800'
  };


  /* 
   * 2. 存储（GM_* 优先，localStorage 兜底） / STORAGE
   */

  /** 读取原始配置字符串。优先使用 GM 存储以跨站点共享设置；
   *  无 GM 时回退到按域名的 localStorage。
   *  Read raw config string. Prefers GM storage so settings are shared
   *  across all sites; falls back to per-origin localStorage. */
  function readStoredConfig() {
    if (typeof GM_getValue === 'function') {
      return GM_getValue(STORAGE_KEY, '{}');
    }
    return localStorage.getItem(STORAGE_KEY) || '{}';
  }

  /** 写入原始配置字符串。 / Write raw config string. */
  function writeStoredConfig(raw) {
    if (typeof GM_setValue === 'function') {
      GM_setValue(STORAGE_KEY, raw);
      return;
    }
    localStorage.setItem(STORAGE_KEY, raw);
  }

  /** 解析存储的 JSON；任何异常均返回 {}，由默认值接管。
   *  Parse stored JSON; return {} on any failure so defaults kick in. */
  function safeParseConfig() {
    try {
      return JSON.parse(readStoredConfig());
    } catch (error) {
      console.warn('[Simple Scrolling] Failed to read saved config. Defaults restored.', error);
      return {};
    }
  }


  /* 
   * 3. 校验与合并 / VALIDATION & MERGE
   */

  /** 将数值限制在 [min, max] 范围内；输入不是有效数字时返回 fallback。
   *  Clamp a numeric value; return fallback when the input is not a finite number. */
  function clamp(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(Math.max(number, min), max);
  }

  /** 只接受 #rgb / #rrggbb / #rrggbbaa 格式的十六进制颜色字符串。
   *  Accept only #rgb / #rrggbb / #rrggbbaa hex strings. */
  function sanitizeColor(value, fallback) {
    return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
  }

  /**
   * 将存储的覆盖值深合并到 defaultConfig 中，并对每个字段做范围约束。
   * 这是所有配置流转的唯一入口——无论来自存储还是设置对话框。
   *
   * Deep-merge stored overrides into defaultConfig and constrain every
   * field.  This is the single funnel through which all config flows —
   * whether from storage or the settings dialog.
   */
  function mergeConfig(rawConfig) {
    const merged = {
      ...defaultConfig,
      ...rawConfig,
      // 深合并嵌套对象，避免部分覆盖时丢失子键。
      // Deep-merge nested objects so partial overrides don't lose keys.
      scrollKeys: {
        ...defaultConfig.scrollKeys,
        ...(rawConfig.scrollKeys || {})
      },
      iconPos: {
        ...defaultConfig.iconPos,
        ...(rawConfig.iconPos || {})
      }
    };

    // 数值范围——硬限制，与设置对话框的输入范围保持一致。
    // Numeric ranges — hard limits that match the settings-dialog inputs.
    merged.iconSize      = clamp(merged.iconSize,       14, 48,   defaultConfig.iconSize);
    merged.iconStroke    = clamp(merged.iconStroke,      1,  4,   defaultConfig.iconStroke);
    merged.iconScale     = clamp(merged.iconScale,      40, 75,   defaultConfig.iconScale);
    merged.iconGap       = clamp(merged.iconGap,         4, 20,   defaultConfig.iconGap);
    merged.borderRadius  = clamp(merged.borderRadius,    0, 24,   defaultConfig.borderRadius);
    merged.panelOpacity  = clamp(merged.panelOpacity,   20, 100,  defaultConfig.panelOpacity);
    merged.iconPos.right = clamp(merged.iconPos.right,   0, 9999, defaultConfig.iconPos.right);
    merged.iconPos.bottom= clamp(merged.iconPos.bottom,  0, 9999, defaultConfig.iconPos.bottom);

    // 枚举值与布尔值归一化。
    // Enums & booleans.
    merged.iconStyle = ICON_STYLE_ORDER.includes(merged.iconStyle)
      ? merged.iconStyle
      : 'outline';
    merged.autoShow   = Boolean(merged.autoShow);
    merged.darkMode   = Boolean(merged.darkMode);
    merged.keyEnabled = Boolean(merged.keyEnabled);

    // 颜色安全性校验。
    // Color safety.
    merged.lightColor    = sanitizeColor(merged.lightColor,    defaultConfig.lightColor);
    merged.darkColor     = sanitizeColor(merged.darkColor,     defaultConfig.darkColor);
    merged.settingsColor = sanitizeColor(merged.settingsColor, defaultConfig.settingsColor);

    // 快捷键不能为空。
    // Shortcut keys must not be empty.
    merged.scrollKeys.top    = merged.scrollKeys.top    || defaultConfig.scrollKeys.top;
    merged.scrollKeys.bottom = merged.scrollKeys.bottom || defaultConfig.scrollKeys.bottom;

    return merged;
  }

  /** 整个脚本唯一使用的可变配置对象。
   *  The single mutable configuration object used by the entire script. */
  const config = mergeConfig(safeParseConfig());


  /* 
   * 4. 可变运行时状态 / MUTABLE RUNTIME STATE
   */

  const state = {
    panel: null,           // HTMLElement — 悬浮 div / the floating div
    isDragged: false,      // 指针移动超过 DRAG_THRESHOLD 后置为 true / set after pointer moved past threshold
    dragCleanup: null,     // function — 拆除指针事件监听 / tears down pointer listeners
    scrollCleanup: null,   // function — 拆除滚动/窗口大小监听 / tears down scroll/resize listeners
    keydownHandler: null,  // function — 当前键盘监听器 / the current keyboard listener
    mediaHandler: null     // function — 监听系统配色方案变化 / listens for prefers-color-scheme changes
  };


  /*
   * 5. 滚动辅助函数 / SCROLLING HELPERS
   */

  /** 实际控制视口滚动的元素。
   *  The element that actually scrolls the viewport. */
  function getScrollRoot() {
    return document.scrollingElement || document.documentElement || document.body;
  }

  /** 最大垂直滚动距离（总可滚动高度 − 视口高度）。
   *  Maximum vertical scroll offset (total scrollable height − viewport). */
  function getMaxScrollTop() {
    const root = getScrollRoot();
    return Math.max(0, root.scrollHeight - window.innerHeight);
  }

  /** 尊重操作系统的 "减少动态效果" 偏好设置。
   *  Respect the OS "reduce motion" preference. */
  function getScrollBehavior() {
    return prefersReducedMotion.matches ? 'auto' : 'smooth';
  }

  /** 持久化当前配置。已包裹 try/catch，调用方无需自行处理异常。
   *  Persist current config. Wrapped so callers don't each need try/catch. */
  function saveConfig() {
    try {
      writeStoredConfig(JSON.stringify(config));
    } catch (error) {
      console.warn('[Simple Scrolling] Failed to save config.', error);
    }
  }

  /** 当按钮应使用深色配色方案时返回 true。
   *  True when buttons should use the dark color scheme. */
  function shouldUseDarkMode() {
    return config.darkMode || prefersDarkScheme.matches;
  }

  /** 估算面板尺寸，确保拖拽时不会被拖出屏幕。
   *  当面板已挂载时使用实测值，否则使用基于配置的计算值。
   *  Estimate panel dimensions so dragging never pushes it off-screen.
   *  Uses live measurements when the panel exists, otherwise calculated defaults. */
  function getPanelSize() {
    if (state.panel) {
      return {
        width: state.panel.offsetWidth  || (config.iconSize + 18),
        height: state.panel.offsetHeight ||
                ((config.iconSize + 18) * 4 + config.iconGap * 3)
      };
    }
    const buttonSize = config.iconSize + 18;
    return { width: buttonSize, height: buttonSize * 4 + config.iconGap * 3 };
  }

  /** 将面板位置限制在视口范围内，确保面板完全可见。
   *  Clamp the position so the entire panel stays visible. */
  function limitToViewport(position) {
    const { width, height } = getPanelSize();
    position.right  = clamp(position.right,  0,
      Math.max(0, window.innerWidth  - width),  defaultConfig.iconPos.right);
    position.bottom = clamp(position.bottom, 0,
      Math.max(0, window.innerHeight - height), defaultConfig.iconPos.bottom);
  }


  /*
   * 6. 滚动动作 / SCROLL ACTIONS
   */

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });
  }

  function scrollToMiddle() {
    window.scrollTo({ top: getMaxScrollTop() / 2, behavior: getScrollBehavior() });
  }

  function scrollToBottom() {
    window.scrollTo({ top: getMaxScrollTop(), behavior: getScrollBehavior() });
  }


  /*
   * 7. SVG 图标系统 / SVG ICON SYSTEM
   */

  /**
   * 四套内联 SVG 图标，通过 `currentColor` 染色以自动匹配按钮的白色文字。
   *
   *   Outline / Chevron — Feather 描边风格 (MIT)
   *   Solid  / Rounded — 实心三角 + Material 齿轮 (Apache-2.0)；
   *                       Rounded 外加圆角连线描边以柔化边角。
   *
   * Four inline-SVG glyph sets, tinted via `currentColor` so they
   * automatically match the button's white text colour.
   *
   *   Outline / Chevron — Feather-style strokes (MIT)
   *   Solid  / Rounded — filled triangles + Material settings gear (Apache-2.0);
   *                       Rounded adds a round-joined outer stroke for softer edges.
   */

  /** Outline 和 Chevron 共用的齿轮图标 (Feather, MIT)。
   *  Shared gear icon used by Outline and Chevron (Feather, MIT). */
  const FEATHER_GEAR = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>';

  /** Solid 和 Rounded 共用的实心路径集 (Material gear, Apache-2.0)。
   *  Shared filled-path set used by Solid and Rounded (Material gear, Apache-2.0). */
  const FILLED_PATHS = {
    top:      '<path d="M12 6 L19 18 L5 18 Z"/>',
    middle:   '<rect x="4" y="10.5" width="16" height="3" rx="1.5"/>',
    bottom:   '<path d="M12 18 L5 6 L19 6 Z"/>',
    settings: '<path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>'
  };

  /**
   * 每种风格声明一个 `render` 模式，buildIcon() 据此决定输出哪些
   * fill/stroke 属性。四种风格共用 24×24 的 viewBox；
   * 颜色由父按钮上的 currentColor 继承而来。
   *
   * Each style declares a `render` mode so buildIcon() knows which
   * fill/stroke attributes to emit.  All four styles share the same 24×24
   * viewBox; colour comes from currentColor on the parent button.
   */
  const ICON_SETS = {
    outline: {
      render: 'stroke',
      paths: {
        top:      '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
        middle:   '<line x1="5" y1="12" x2="19" y2="12"/>',
        bottom:   '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
        settings: FEATHER_GEAR
      }
    },
    chevron: {
      render: 'stroke',
      paths: {
        top:      '<polyline points="5 13 12 6 19 13"/><polyline points="5 19 12 12 19 19"/>',
        middle:   '<line x1="5" y1="12" x2="19" y2="12"/>',
        bottom:   '<polyline points="5 5 12 12 19 5"/><polyline points="5 11 12 18 19 11"/>',
        settings: FEATHER_GEAR
      }
    },
    solid: {
      render: 'fill',
      paths: FILLED_PATHS
    },
    rounded: {
      render: 'fillRound',  // fill + 外层描边以柔化边角 / fill + outer stroke for softened corners
      paths: FILLED_PATHS
    }
  };

  /**
   * 为单个按钮构建内联 <svg> 字符串。
   * Build an inline <svg> string for one button.
   * @param {'top'|'middle'|'bottom'|'settings'} name  图标名称 / icon key
   * @param {number} size — px，正方形尺寸 / square dimensions
   */
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

  /** 切换到下一个图标风格，持久化并重新渲染。
   *  Advance to the next icon style, persist, and re-render. */
  function cycleIconStyle() {
    const idx = ICON_STYLE_ORDER.indexOf(config.iconStyle);
    config.iconStyle = ICON_STYLE_ORDER[(idx + 1) % ICON_STYLE_ORDER.length];
    saveConfig();
    render();
  }


  /*
   * 8. 按钮工厂 / BUTTON FACTORY
   */

  /**
   * 创建一个带有内联 SVG、悬停/按下动画以及拖拽感知点击处理的 DOM 按钮。
   *
   * Create one DOM button with inline SVG, hover/press animation,
   * and drag-aware click handling.
   *
   * @param {string} id        — DOM id 属性 / DOM id attribute
   * @param {string} iconName  — ICON_SETS[style].paths 中的键 / key into icon paths
   * @param {string} title     — 提示文字与 aria-label / tooltip + aria-label
   * @param {Function} onClick — 按钮被点击（非拖拽）时的回调 / action when clicked (not dragged)
   */
  function createButton(id, iconName, title, onClick) {
    var isSettingsButton = id === 'scroll-settings';
    var background = isSettingsButton
      ? config.settingsColor
      : (shouldUseDarkMode() ? config.darkColor : config.lightColor);

    var button = document.createElement('button');
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
      background: background,
      color: '#FFFFFF',
      cursor: 'pointer',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
      display: 'grid',
      placeItems: 'center',
      userSelect: 'none',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease'
    });

    // ---- 视觉反馈（悬停 / 按下） / visual feedback (hover / press) ----
    button.addEventListener('mouseenter', function () {
      button.style.transform = 'scale(1.08)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.22)';
    });
    button.addEventListener('mouseleave', function () {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.2)';
    });
    button.addEventListener('mousedown', function () {
      button.style.transform = 'scale(0.94)';
    });
    button.addEventListener('mouseup', function () {
      button.style.transform = 'scale(1.08)';
    });

    // ---- 点击：如果指针刚完成拖拽则忽略本次点击 / ignore click after drag ----
    button.addEventListener('click', function (event) {
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


  /*
   * 9. 面板生命周期 / PANEL LIFECYCLE
   */

  /** 拆除所有事件监听并从 DOM 中移除面板。
   *  Tear down all listeners and remove the panel from the DOM. */
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

  /**
   * 页面在顶部时隐藏面板（autoShow 模式）。
   * 关闭 autoShow 后面板始终可见。
   *
   * Hide the panel when the page is near the top (autoShow mode).
   * When autoShow is off the panel is always visible.
   */
  function updatePanelVisibility() {
    if (!state.panel) return;
    if (!config.autoShow) {
      state.panel.style.display = 'flex';
      return;
    }
    state.panel.style.display = window.scrollY > 200 ? 'flex' : 'none';
  }

  /** 绑定滚动与窗口大小变化的监听，并立即同步可见性状态。
   *  Bind scroll + resize listeners and immediately sync visibility. */
  function bindScrollVisibility() {
    updatePanelVisibility();

    var handleScroll = function () { updatePanelVisibility(); };
    var handleResize = function () {
      limitToViewport(config.iconPos);
      if (state.panel) {
        state.panel.style.right = `${config.iconPos.right}px`;
        state.panel.style.bottom = `${config.iconPos.bottom}px`;
      }
      updatePanelVisibility();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    state.scrollCleanup = function () {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }


  /*
   * 10. 指针事件拖拽系统 / POINTER-EVENT DRAG SYSTEM
   */

  /**
   * 使用统一的指针事件 (Pointer Events)，鼠标、触屏、触控笔均可工作。
   * `setPointerCapture` 在指针离开面板后仍能跟踪；面板上的
   * `touch-action: none` 防止浏览器将手势误解为页面滚动。
   *
   * Uses unified Pointer Events so mouse, touch, and pen all work.
   * `setPointerCapture` keeps tracking the pointer even when it leaves
   * the panel rect, and `touch-action: none` on the panel prevents the
   * browser from interpreting the gesture as page scroll.
   */
  function bindDrag() {
    var pointerId = null;  // 跟踪活动指针跨越 move/up / tracks the active pointer across move/up
    var startX = 0;
    var startY = 0;

    var onPointerMove = function (event) {
      if (pointerId === null || !state.panel || event.pointerId !== pointerId) {
        return;
      }

      var dx = event.clientX - startX;
      var dy = event.clientY - startY;

      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        state.isDragged = true;
      }

      // 在屏幕空间内移动面板，然后限制在视口内。
      // Move the panel in screen space, then clamp to viewport.
      config.iconPos.right -= dx;
      config.iconPos.bottom -= dy;
      limitToViewport(config.iconPos);

      state.panel.style.right = `${config.iconPos.right}px`;
      state.panel.style.bottom = `${config.iconPos.bottom}px`;

      startX = event.clientX;
      startY = event.clientY;
    };

    var onPointerUp = function (event) {
      if (pointerId === null || event.pointerId !== pointerId) return;

      pointerId = null;
      if (state.panel) {
        state.panel.releasePointerCapture(event.pointerId);
      }
      // 仅在确实发生了拖拽时才持久化位置。
      // Only persist config when the user actually dragged.
      if (state.isDragged) {
        saveConfig();
      }
    };

    var onPointerDown = function (event) {
      // 鼠标只接受主按键；触屏/触控笔始终放行。
      // Accept only primary button for mouse; touch/pen always pass through.
      if (event.button !== 0 && event.pointerType === 'mouse') return;

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

    state.dragCleanup = function () {
      if (state.panel) {
        state.panel.removeEventListener('pointerdown', onPointerDown);
        state.panel.removeEventListener('pointermove', onPointerMove);
        state.panel.removeEventListener('pointerup', onPointerUp);
        state.panel.removeEventListener('pointercancel', onPointerUp);
      }
    };
  }


  /*
   * 11. 设置对话框（SweetAlert2，懒加载） / SETTINGS DIALOG (lazy-loaded)
   */

  /** 构建设置表单 HTML。所有 ID 均有前缀以避免与宿主页面冲突。
   *  Build the settings form HTML. All IDs are prefixed to avoid clashes. */
  function buildSettingsHtml(colorPresets) {
    return [
      '<div style="text-align:left;max-height:500px;overflow-y:auto">',

      // ---- 颜色预设 / colour presets ----
      '<div style="margin-bottom:15px;padding:10px;background:#f9f9f9;border-radius:5px">',
        '<p style="margin:0 0 10px 0;font-weight:bold;font-size:14px">Color presets / 颜色预设</p>',
        '<div style="display:flex;gap:5px;flex-wrap:wrap">',
          Object.entries(colorPresets).map(function (entry) {
            var name = entry[0], colors = entry[1];
            return [
              '<button type="button"',
              `data-light="${colors.light}"`,
              `data-dark="${colors.dark}"`,
              `data-settings="${colors.settings}"`,
              'class="scroll-helper-preset"',
              'style="padding:8px 12px;background:#f0f0f0;border:1px solid #ddd;border-radius:3px;cursor:pointer;font-size:12px"',
              `>${name}</button>`
            ].join(' ');
          }).join(''),
        '</div>',
      '</div>',

      // ---- 外观 / appearance ----
      '<label>Icon size / 图标大小: ',
        '<input type="number" id="set-iconSize" min="14" max="48" value="', config.iconSize, '" style="width:60px">',
      '</label><br><br>',

      '<label>Icon style / 图标风格: ',
        '<select id="set-iconStyle" style="width:110px">',
          ICON_STYLE_ORDER.map(function (style) {
            var sel = config.iconStyle === style ? ' selected' : '';
            return `<option value="${style}"${sel}>${style.charAt(0).toUpperCase() + style.slice(1)}</option>`;
          }).join(''),
        '</select>',
      '</label><br><br>',

      '<label>Icon scale / 图标缩放 (%): ',
        '<input type="number" id="set-iconScale" min="40" max="75" value="', config.iconScale, '" style="width:60px">',
      '</label><br><br>',

      '<label>Stroke width / 描边宽度 (not Solid): ',
        '<input type="number" id="set-iconStroke" min="1" max="4" step="0.25" value="', config.iconStroke, '" style="width:60px">',
      '</label><br><br>',

      '<label>Corner radius / 圆角: ',
        '<input type="number" id="set-radius" min="0" max="24" value="', config.borderRadius, '" style="width:60px">',
      '</label><br><br>',

      '<label>Opacity / 透明度 (%): ',
        '<input type="number" id="set-opacity" min="20" max="100" value="', config.panelOpacity, '" style="width:60px">',
      '</label><br><br>',

      // ---- 颜色 / colours ----
      '<label>Light color / 浅色: ',
        '<input type="color" id="set-lightColor" value="', config.lightColor, '" style="width:60px;height:30px;cursor:pointer">',
      '</label><br><br>',

      '<label>Dark color / 深色: ',
        '<input type="color" id="set-darkColor" value="', config.darkColor, '" style="width:60px;height:30px;cursor:pointer">',
      '</label><br><br>',

      '<label>Settings color / 设置按钮色: ',
        '<input type="color" id="set-settingsColor" value="', config.settingsColor, '" style="width:60px;height:30px;cursor:pointer">',
      '</label><br><br>',

      // ---- 行为 / behaviour ----
      '<label><input type="checkbox" id="set-autoShow"', config.autoShow ? ' checked' : '', '> Auto show only after scrolling / 仅滚动后显示</label><br><br>',

      '<label>Top shortcut / 上键 (Ctrl +): ',
        '<select id="set-scrollKeyTop" style="width:110px">',
          TOP_KEY_OPTIONS.map(function (key) {
            return `<option value="${key}"${config.scrollKeys.top === key ? ' selected' : ''}>${key}</option>`;
          }).join(''),
        '</select>',
      '</label><br>',

      '<label>Bottom shortcut / 下键 (Ctrl +): ',
        '<select id="set-scrollKeyBottom" style="width:110px">',
          BOTTOM_KEY_OPTIONS.map(function (key) {
            return `<option value="${key}"${config.scrollKeys.bottom === key ? ' selected' : ''}>${key}</option>`;
          }).join(''),
        '</select>',
      '</label><br><br>',

      '<label><input type="checkbox" id="set-keyEnabled"', config.keyEnabled ? ' checked' : '', '> Enable shortcut / 启用快捷键</label><br><br>',

      '<label><input type="checkbox" id="set-darkMode"', config.darkMode ? ' checked' : '', '> Force dark button theme / 强制深色主题</label>',

      '</div>'
    ].join('');
  }

  /**
   * 从已打开的 Swal 弹窗中读取每个字段、校验后写入 config。
   * Read every field from the open Swal popup, validate, and write to config.
   * @param {HTMLElement} popup — Swal.getPopup() 的返回值 / Swal.getPopup() result
   */
  function applySettingsFromDialog(popup) {
    var field = function (id) { return popup.querySelector('#' + id); };

    config.iconSize      = clamp(field('set-iconSize').value, 14, 48, defaultConfig.iconSize);
    config.iconStyle     = ICON_STYLE_ORDER.includes(field('set-iconStyle').value) ? field('set-iconStyle').value : 'outline';
    config.iconScale     = clamp(field('set-iconScale').value, 40, 75, defaultConfig.iconScale);
    config.iconStroke    = clamp(field('set-iconStroke').value, 1, 4, defaultConfig.iconStroke);
    config.borderRadius  = clamp(field('set-radius').value, 0, 24, defaultConfig.borderRadius);
    config.panelOpacity  = clamp(field('set-opacity').value, 20, 100, defaultConfig.panelOpacity);
    config.lightColor    = sanitizeColor(field('set-lightColor').value, defaultConfig.lightColor);
    config.darkColor     = sanitizeColor(field('set-darkColor').value, defaultConfig.darkColor);
    config.settingsColor = sanitizeColor(field('set-settingsColor').value, defaultConfig.settingsColor);
    config.autoShow      = field('set-autoShow').checked;
    config.keyEnabled    = field('set-keyEnabled').checked;
    config.scrollKeys.top    = field('set-scrollKeyTop').value    || defaultConfig.scrollKeys.top;
    config.scrollKeys.bottom = field('set-scrollKeyBottom').value || defaultConfig.scrollKeys.bottom;
    config.darkMode      = field('set-darkMode').checked;
    saveConfig();
  }


  /* ---- SweetAlert2 懒加载器 / lazy-loader ---- */

  /** 缓存的 Promise，避免多次点击重复注入 <script>。
   *  Cached promise so multiple clicks don't re-inject the <script>. */
  var swalPromise = null;

  /**
   * 首次打开设置时动态注入 SweetAlert2。
   * 加载成功后后续调用立即 resolve；出错时清空缓存以允许重试一次。
   *
   * Dynamically inject SweetAlert2 the first time settings are opened.
   * Once loaded, the promise resolves instantly on subsequent calls.
   * On error the promise is nullified to allow one retry.
   */
  function loadSwal() {
    if (typeof Swal !== 'undefined') {
      return Promise.resolve();
    }
    if (swalPromise) {
      return swalPromise;
    }
    swalPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://unpkg.com/sweetalert2@10.16.6/dist/sweetalert2.all.min.js';
      script.onload = function () { resolve(); };
      script.onerror = function () {
        swalPromise = null;   // 允许重试一次 / allow one retry
        reject(new Error('SweetAlert2 load failed'));
      };
      document.head.appendChild(script);
    });
    return swalPromise;
  }

  /** 公开入口——先懒加载、再显示弹窗。
   *  Public entry point — lazy-load then show. */
  function openSettings() {
    loadSwal().then(function () {
      _showSettingsDialog();
    }).catch(function () {
      alert('Simple Scrolling: the settings dialog failed to load (it may be blocked by this site\'s security policy).\n\n设置对话框加载失败（可能被本站的安全策略拦截）。');
    });
  }

  /** 仅在确认 Swal 可用后调用。
   *  Called only after Swal is confirmed to be available. */
  function _showSettingsDialog() {
    var colorPresets = {
      Blue:   { light: '#007BFF', dark: '#444444', settings: '#FFB800' },
      Green:  { light: '#28A745', dark: '#2D5016', settings: '#FFD700' },
      Purple: { light: '#6F42C1', dark: '#3D1E5C', settings: '#FF6B9D' },
      Red:    { light: '#DC3545', dark: '#721C24', settings: '#FFA500' },
      Gray:   { light: '#495057', dark: '#212529', settings: '#6C757D' }
    };

    Swal.fire({
      title: 'Scroll helper settings / 滚动助手设置',
      html: buildSettingsHtml(colorPresets),
      confirmButtonText: 'Save / 保存',
      showCancelButton: true,
      cancelButtonText: 'Cancel / 取消',
      focusConfirm: false,

      // 弹窗挂载到 DOM 后再连接颜色预设按钮的事件。
      // Wire up colour-preset buttons after the popup is in the DOM.
      didOpen: function () {
        var popup = Swal.getPopup();
        popup.querySelectorAll('.scroll-helper-preset').forEach(function (btn) {
          btn.addEventListener('click', function () {
            popup.querySelector('#set-lightColor').value    = btn.dataset.light;
            popup.querySelector('#set-darkColor').value     = btn.dataset.dark;
            popup.querySelector('#set-settingsColor').value = btn.dataset.settings;
          });
        });
      },

      preConfirm: function () {
        applySettingsFromDialog(Swal.getPopup());
      }
    }).then(function (result) {
      if (result.isConfirmed) {
        render();   // 按新配置完整重建面板 / full rebuild with new config
      }
    });
  }


  /*
   * 12. 键盘快捷键 / KEYBOARD SHORTCUTS
   */

  /**
   * Ctrl + ↑ / ↓（可通过 config.scrollKeys 自定义）。
   * 当焦点在可编辑元素内时自动跳过，不干扰输入。
   *
   * Ctrl + ↑ / ↓  (customisable via config.scrollKeys).
   * Intentionally skips events whose target is an editable element
   * so typing is never interrupted.
   */
  function bindShortcuts() {
    if (!config.keyEnabled) return;

    state.keydownHandler = function (event) {
      if (!event.ctrlKey) return;

      // 当用户在表单字段或 contenteditable 区域内时不拦截。
      // Don't hijack when the user is inside a form field or contenteditable.
      var target = event.target;
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


  /*
   * 13. 面板创建 / PANEL CREATION
   */

  /** 创建包含四个按钮的悬浮 <div>。幂等——任何已存在的面板会先被移除
   *  （由 destroyPanel / render 负责）。
   *  Create the floating <div> with all four buttons.  Idempotent — any
   *   existing panel is removed first (destroyPanel / render does this). */
  function createPanel() {
    // 双保险：如果有残留实例则先行移除。
    // Belt-and-suspenders: remove stale instance if one somehow lingers.
    var existingPanel = document.getElementById(PANEL_ID);
    if (existingPanel) existingPanel.remove();

    var panel = document.createElement('div');
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
      touchAction: 'none'              // 拖拽时阻止浏览器滚动/缩放 / prevent browser scroll/zoom during drag
    });

    // ---- 构建四个按钮 / build the four buttons ----
    panel.appendChild(createButton('scroll-top',      'top',      'Scroll to top / 滚动到顶部',    scrollToTop));
    panel.appendChild(createButton('scroll-mid',      'middle',   'Scroll to middle / 滚动到中间', scrollToMiddle));
    panel.appendChild(createButton('scroll-bottom',   'bottom',   'Scroll to bottom / 滚动到底部', scrollToBottom));

    var settingsButton = createButton(
      'scroll-settings', 'settings',
      'Open settings (right-click or long-press to cycle icon style) / 打开设置（右键或长按切换图标风格）',
      openSettings
    );

    // 右键齿轮 → 切换图标风格（桌面端）
    // Right-click on gear → cycle icon style (desktop)
    settingsButton.addEventListener('contextmenu', function (event) {
      event.preventDefault();
      cycleIconStyle();
    });

    // 长按齿轮 → 切换图标风格（移动端，无右键）
    // Long-press on gear → cycle icon style (mobile, no right-click)
    (function () {
      var pressTimer = null;
      settingsButton.addEventListener('pointerdown', function () {
        pressTimer = setTimeout(function () {
          // 仅当指针没有拖动面板时才切换。
          // Only cycle if the pointer hasn't been dragging the panel.
          if (!state.isDragged) cycleIconStyle();
        }, 600);
      });
      var clearPress = function () {
        clearTimeout(pressTimer);
        pressTimer = null;
      };
      settingsButton.addEventListener('pointerup',     clearPress);
      settingsButton.addEventListener('pointercancel', clearPress);
      settingsButton.addEventListener('contextmenu',   clearPress);  // 避免与右键重复触发 / avoid double-fire with right-click
    })();

    panel.appendChild(settingsButton);

    document.body.appendChild(panel);
    state.panel = panel;

    // 挂载后重新 clamp——此时已有真实尺寸，估算值可能有偏差。
    // Re-clamp now that real dimensions are known (the estimate may be off).
    limitToViewport(config.iconPos);
    panel.style.right  = `${config.iconPos.right}px`;
    panel.style.bottom = `${config.iconPos.bottom}px`;
  }


  /*
   * 14. RENDER——重建 UI 的唯一入口
   *      the single entry point for (re)building the UI
   */

  /**
   * 幂等：销毁已有面板并创建全新面板，重新绑定所有事件监听。
   * 在初始化、保存配置、切换图标风格及系统配色变化时调用。
   *
   * Idempotent: destroys any existing panel, creates a fresh one, and
   * wires all listeners.  Called on init, on config save, on icon-style
   * cycle, and when the OS colour scheme changes.
   */
  function render() {
    destroyPanel();
    createPanel();
    bindDrag();
    bindScrollVisibility();
    bindShortcuts();

    // 当系统配色方案改变时重新渲染以更新按钮颜色
    //（除非用户已开启强制深色）。
    // When the OS colour scheme flips, re-render so button colours update
    // (unless the user has force-dark enabled).
    state.mediaHandler = function () {
      if (!config.darkMode) render();
    };
    prefersDarkScheme.addEventListener('change', state.mediaHandler);
  }


  /*
   * 15. 启动 / BOOTSTRAP
   */

  function init() {
    if (!document.body) return;
    render();
  }

  // 等待 DOM 就绪；若已就绪则立即执行。
  // Wait for the DOM to be ready; if it already is, fire immediately.
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
