// ==UserScript==
// @name         Simple-scrolling（简易滚动）
// @namespace    https://github.com/boyliuxiaopeng/Simple-scrolling/
// @version      1.1
// @description  支持快捷滚动、自定义热键、图标拖动、暗色模式、图形化设置中心、颜色定制，适配所有网页
// @author       GPT、依旧天真无邪
// @create       2025-05-09
// @lastmodified 2026-04-17
// @match        *://*/*
// @copyright    MIT
// @require      https://unpkg.com/sweetalert2@10.16.6/dist/sweetalert2.all.min.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

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
    darkColor: '#444',
    settingsColor: '#FFB800'
  };
  const storageKey = 'ScrollHelperConfig';
  const config = Object.assign({}, defaultConfig, JSON.parse(localStorage.getItem(storageKey) || '{}'));
  let isDragged = false;

  const Util = {
    saveConfig() {
      localStorage.setItem(storageKey, JSON.stringify(config));
    },
    createBtn(id, label, title, onClick) {
      const isDark = config.darkMode || window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isSettings = id === 'scroll-settings';
      const bgColor = isSettings ? config.settingsColor : (isDark ? config.darkColor : config.lightColor);
      const btn = document.createElement('button');
      btn.id = id;
      btn.textContent = label;
      btn.title = title;
      Object.assign(btn.style, {
        all: 'unset',
        fontSize: `${config.iconSize}px`,
        padding: '6px',
        borderRadius: `${config.borderRadius}px`,
        background: bgColor,
        color: '#fff',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        textAlign: 'center',
        transition: 'transform 0.2s'
      });
      btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
      btn.onmouseout = () => btn.style.transform = 'scale(1.0)';
      btn.onmousedown = () => btn.style.transform = 'scale(0.9)';
      btn.onmouseup = () => btn.style.transform = 'scale(1.1)';
      btn.onclick = (e) => {
        if (isDragged) {
          isDragged = false;
          e.preventDefault();
          return;
        }
        onClick(e);
      };
      return btn;
    },
    limitToViewport(pos) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      pos.right = Math.min(Math.max(0, pos.right), w - 50);
      pos.bottom = Math.min(Math.max(0, pos.bottom), h - 50);
      return pos;
    }
  };

  const UI = {
    panel: null,
    createPanel() {
      const panel = document.createElement('div');
      panel.id = 'scroll-helper-panel';
      Object.assign(panel.style, {
        position: 'fixed',
        right: `${config.iconPos.right}px`,
        bottom: `${config.iconPos.bottom}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: `${config.iconGap}px`,
        zIndex: 99999,
        opacity: config.panelOpacity / 100,
        cursor: 'move'
      });
      this.panel = panel;

      const buttons = [
        Util.createBtn('scroll-top', '⬆️', '返回顶部', () => window.scrollTo({ top: 0, behavior: 'smooth' })),
        Util.createBtn('scroll-mid', '↕️', '滚动中部', () => window.scrollTo({ top: (document.body.scrollHeight - window.innerHeight) / 2, behavior: 'smooth' })),
        Util.createBtn('scroll-bottom', '⬇️', '滚动到底', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })),
        Util.createBtn('scroll-settings', '⚙️', '设置中心', UI.openSettings)
      ];
      buttons.forEach(btn => panel.appendChild(btn));
      document.body.appendChild(panel);
      this.enableDrag();
    },
    enableDrag() {
      let isDragging = false, startX, startY;
      this.panel.addEventListener('mousedown', (e) => {
        isDragged = false;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        e.preventDefault();
      });
      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isDragged = true;
        }
        config.iconPos.right -= dx;
        config.iconPos.bottom -= dy;
        Util.limitToViewport(config.iconPos);
        this.panel.style.right = `${config.iconPos.right}px`;
        this.panel.style.bottom = `${config.iconPos.bottom}px`;
        startX = e.clientX;
        startY = e.clientY;
      });
      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          Util.saveConfig();
        }
      });
    },
    openSettings() {
      const colorPresets = {
        '蓝色经典': { light: '#007BFF', dark: '#444', settings: '#FFB800' },
        '绿色清爽': { light: '#28A745', dark: '#2D5016', settings: '#FFD700' },
        '紫色优雅': { light: '#6F42C1', dark: '#3D1E5C', settings: '#FF6B9D' },
        '红色活力': { light: '#DC3545', dark: '#721C24', settings: '#FFA500' },
        '深灰简约': { light: '#495057', dark: '#212529', settings: '#6C757D' }
      };
      const html = `
        <div style="text-align:left;max-height:500px;overflow-y:auto">
          <div style="margin-bottom:15px;padding:10px;background:#f9f9f9;border-radius:5px">
            <p style="margin:0 0 10px 0;font-weight:bold;font-size:14px">配色预设：</p>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
              ${Object.entries(colorPresets).map(([name, colors]) => 
                `<button type="button" onclick="
                  document.getElementById('set-lightColor').value = '${colors.light}';
                  document.getElementById('set-darkColor').value = '${colors.dark}';
                  document.getElementById('set-settingsColor').value = '${colors.settings}';
                " style="padding:8px 12px;background:#f0f0f0;border:1px solid #ddd;border-radius:3px;cursor:pointer;font-size:12px">${name}</button>`
              ).join('')}
            </div>
          </div>
          <label>图标大小：
            <input type="number" id="set-iconSize" value="${config.iconSize}" style="width:60px">
          </label><br><br>
          <label>圆角半径：
            <input type="number" id="set-radius" value="${config.borderRadius}" style="width:60px">
          </label><br><br>
          <label>透明度(%)：
            <input type="number" id="set-opacity" value="${config.panelOpacity}" style="width:60px">
          </label><br><br>
          <label>浅色模式颜色：
            <input type="color" id="set-lightColor" value="${config.lightColor}" style="width:60px;height:30px;cursor:pointer">
          </label><br><br>
          <label>暗色模式颜色：
            <input type="color" id="set-darkColor" value="${config.darkColor}" style="width:60px;height:30px;cursor:pointer">
          </label><br><br>
          <label>设置按钮颜色：
            <input type="color" id="set-settingsColor" value="${config.settingsColor}" style="width:60px;height:30px;cursor:pointer">
          </label><br><br>
          <label><input type="checkbox" id="set-autoShow" ${config.autoShow ? 'checked' : ''}> 自动显示滚动按钮</label><br><br>
          <label><input type="checkbox" id="set-keyEnabled" ${config.keyEnabled ? 'checked' : ''}> 启用快捷键 Ctrl+↑↓</label><br><br>
          <label><input type="checkbox" id="set-darkMode" ${config.darkMode ? 'checked' : ''}> 暗色模式</label>
        </div>`;
      Swal.fire({
        title: '滚动助手设置',
        html,
        confirmButtonText: '保存设置',
        showCancelButton: true,
        preConfirm: () => {
          config.iconSize = parseInt(document.getElementById('set-iconSize').value);
          config.borderRadius = parseInt(document.getElementById('set-radius').value);
          config.panelOpacity = parseInt(document.getElementById('set-opacity').value);
          config.lightColor = document.getElementById('set-lightColor').value;
          config.darkColor = document.getElementById('set-darkColor').value;
          config.settingsColor = document.getElementById('set-settingsColor').value;
          config.autoShow = document.getElementById('set-autoShow').checked;
          config.keyEnabled = document.getElementById('set-keyEnabled').checked;
          config.darkMode = document.getElementById('set-darkMode').checked;
          Util.saveConfig();
        }
      }).then(res => {
        if (res.isConfirmed) {
          // 移除旧面板并重新创建以应用新设置
          if (UI.panel) UI.panel.remove();
          UI.createPanel();
          UI.handleScrollDisplay();
          Shortcut.init();
        }
      });
    },
    handleScrollDisplay() {
      if (!config.autoShow) {
        this.panel.style.display = 'flex';
        return;
      }
      window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
          this.panel.style.display = 'flex';
        } else {
          this.panel.style.display = 'none';
        }
      });
    }
  };

  const Shortcut = {
    init() {
      if (!config.keyEnabled) return;
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === config.scrollKeys.top) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (e.ctrlKey && e.key === config.scrollKeys.bottom) {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
      });
    }
  };

  function init() {
    UI.createPanel();
    UI.handleScrollDisplay();
    Shortcut.init();
  }

  if (document.readyState === 'complete' || document.body) {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init);
  }

})();

