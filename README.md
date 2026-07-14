# Simple Scrolling
### 简单滑块

[![version](https://img.shields.io/badge/version-1.0.4-blue)](simple-scrolling.user.js)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

这是一款轻量级的 Tampermonkey 用户脚本，可为快速页面导航添加一个可拖动的浮动面板--只需点击一下即可滚动到顶部、中部或底部。包含键盘快捷键、主题识别颜色、四种 SVG 图标样式和一个可视化设置对话框。

## Features

- 浮动面板** - 四个按钮（顶部-中间-底部-设置）固定在右下角
- **拖动重新定位** - 通过统一的指针事件进行鼠标、触摸和笔输入；可跨页记忆位置
- **键盘快捷键** - `Ctrl + ↑` / `Ctrl + ↓`（可自定义），在文本字段内忽略
- **四种图标样式** - 轮廓、雪佛龙、实心和圆角；右击或长按齿轮可循环使用
- **主题感知** - 自动检测系统亮/暗模式；可选的强制变暗切换
- **5 种颜色预设** - 蓝色、绿色、紫色、红色、灰色；支持自定义颜色
- **视觉设置** - SweetAlert2 对话框（懒加载，每页保存 ~70 KB 直至需要）
- **跨网站配置** - GM 存储可在所有网站上保持同一配置；本地存储后备
- **尊重 "优先减少运动 "** - 当操作系统要求时，切换到即时滚动
- **框架安全** - "@noframes "防止嵌入框架内的重复面板

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey / Greasemonkey).
2. Click **Simple Scrolling** → **Raw** on the script file, or copy [`simple-scrolling.user.js`](simple-scrolling.user.js) into a new userscript.
3. The panel appears on every page you visit.

## Usage

| Action             | How                                                      |
| ------------------ | -------------------------------------------------------- |
| Scroll to top      | Click **↑**                                              |
| Scroll to middle   | Click **─**                                              |
| Scroll to bottom   | Click **↓**                                              |
| Open settings      | Click **⚙**                                              |
| Cycle icon style   | **Right-click** ⚙ (desktop) or **long-press** ⚙ (mobile) |
| Move the panel     | **Drag** any button                                      |
| Keyboard shortcuts | `Ctrl + ↑` / `Ctrl + ↓` (customizable)                   |

### Settings

The settings dialog lets you tweak every visual aspect:

| Setting                       | Range / Options                     | Default                           |
| ----------------------------- | ----------------------------------- | --------------------------------- |
| Icon size                     | 14–48 px                            | 18                                |
| Icon style                    | Outline / Chevron / Solid / Rounded | Outline                           |
| Icon scale                    | 40–75%                              | 58                                |
| Stroke width                  | 1–4                                 | 2.25                              |
| Corner radius                 | 0–24 px                             | 12                                |
| Opacity                       | 20–100%                             | 60                                |
| Light / Dark / Settings color | Any hex                             | `#007BFF` / `#444444` / `#FFB800` |
| Auto-show                     | on/off                              | on (hide when scrolled < 200px)   |
| Shortcut keys                 | Arrow/Page/Home/End/WASD            | ArrowUp / ArrowDown               |
| Enable shortcuts              | on/off                              | on                                |
| Force dark theme              | on/off                              | off                               |

Changes take effect immediately when you click **Save**.

## How it works

```
┌──────────────────────────────────────────┐
│  page                                    │
│                                  ┌─────┐ │
│                                  │  ↑  │ │  ← 最上
│                                  │  ─  │ │  ← 居中
│                                  │  ↓  │ │  ← 最下
│                                  │  ⚙  │ │  ← 图标切换
│                                  └─────┘ │
│  ← drag / click / right-click →          │
│                 (stays in viewport)      │
│                                          │
└──────────────────────────────────────────┘
```

- 存储**：使用 `GM_getValue`/`GM_setValue` 进行跨原点持久化；当 GM 不可用时，按原点退回到 `localStorage`。
- 渲染**：render()`是惰性的，它会销毁旧面板，创建新面板，并重新绑定所有监听器。每次配置更改都会通过 `mergeConfig()` 进行反馈，它将验证并箝位所有值。
- **懒人对话框**：SweetAlert2 仅在第一次点击 ⚙ 时通过 `<script>` 标记注入。随后的打开将重复使用缓存的承诺。
- 安全性**：所有用户提供的值（颜色、大小、键）在使用前都经过了消毒处理。设置输入的作用域为 Swal 弹出窗口，以避免与主机页面的 ID 冲突。

## Browser support

| Feature                  | Chrome | Firefox | Safari | Edge |
| ------------------------ | ------ | ------- | ------ | ---- |
| Panel & buttons          | ✅    | ✅      | ✅      | ✅    |
| Pointer drag             | ✅    | ✅      | ✅ 13+  | ✅    |
| Touch / long-press       | ✅    | ✅      | ✅      | ✅    |
| Keyboard shortcuts       | ✅    | ✅      | ✅      | ✅    |
| Dark mode detection      | ✅    | ✅      | ✅      | ✅    |
| `prefers-reduced-motion` | ✅    | ✅      | ✅      | ✅    |

## License

MIT — see the `@copyright` header in the script.

## Credits

- Icons: [Feather](https://feathericons.com/) (MIT) for Outline / Chevron strokes; Material gear (Apache-2.0) for Solid / Rounded fills.
- Settings dialog: [SweetAlert2](https://sweetalert2.github.io/) (MIT).
- Authorship: Original by GPT & [@boyliuxiaopeng](https://github.com/boyliuxiaopeng); reviewed and hardened multiple passes.
