# Simple Scrolling
### 简单滑块

[![version](https://img.shields.io/badge/version-1.0.4-blue)](simple-scrolling.user.js)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A lightweight Tampermonkey userscript that adds a draggable floating panel for quick page navigation — scroll to top, middle, or bottom with one click. Keyboard shortcuts, theme-aware colors, four SVG icon styles, and a visual settings dialog included.

## Features

- **Floating panel** — four buttons (top · middle · bottom · settings) pinned to the bottom-right corner
- **Drag to reposition** — mouse, touch, and pen input via unified pointer events; position is remembered across pages
- **Keyboard shortcuts** — `Ctrl + ↑` / `Ctrl + ↓` (customizable), ignored inside text fields
- **Four icon styles** — Outline, Chevron, Solid, and Rounded; right-click or long-press the gear to cycle
- **Theme-aware** — auto-detects system light/dark mode; optional force-dark toggle
- **5 color presets** — Blue, Green, Purple, Red, Gray; custom colors supported
- **Visual settings** — SweetAlert2 dialog (lazy-loaded, ~70 KB saved per page until needed)
- **Cross-site config** — GM storage keeps one configuration across all websites; localStorage fallback
- **Respects `prefers-reduced-motion`** — switches to instant scroll when the OS requests it
- **iframe-safe** — `@noframes` prevents duplicate panels inside embedded frames

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
│                                  │  ↑  │ │  ← top
│                                  │  ─  │ │  ← middle
│                                  │  ↓  │ │  ← bottom
│                                  │  ⚙  │ │  ← settings
│                                  └─────┘ │
│  ← drag / click / right-click →         │
│                         (stays in        │
│                          viewport)       │
└──────────────────────────────────────────┘
```

- **Storage**: Uses `GM_getValue`/`GM_setValue` for cross-origin persistence; falls back to `localStorage` per-origin when GM is unavailable.
- **Rendering**: `render()` is idempotent — destroys the old panel, creates a fresh one, and re-binds all listeners. Every config change feeds through `mergeConfig()` which validates and clamps all values.
- **Lazy dialog**: SweetAlert2 is injected via a `<script>` tag only on the first click of ⚙. Subsequent opens reuse the cached promise.
- **Security**: All user-supplied values (colors, sizes, keys) are sanitized before use. Settings inputs are scoped to the Swal popup to avoid ID collisions with the host page.

## Browser support

| Feature                  | Chrome | Firefox | Safari | Edge |
| ------------------------ | ------ | ------- | ------ | ---- |
| Panel & buttons          | ✅      | ✅       | ✅      | ✅    |
| Pointer drag             | ✅      | ✅       | ✅ 13+  | ✅    |
| Touch / long-press       | ✅      | ✅       | ✅      | ✅    |
| Keyboard shortcuts       | ✅      | ✅       | ✅      | ✅    |
| Dark mode detection      | ✅      | ✅       | ✅      | ✅    |
| `prefers-reduced-motion` | ✅      | ✅       | ✅      | ✅    |

## License

MIT — see the `@copyright` header in the script.

## Credits

- Icons: [Feather](https://feathericons.com/) (MIT) for Outline / Chevron strokes; Material gear (Apache-2.0) for Solid / Rounded fills.
- Settings dialog: [SweetAlert2](https://sweetalert2.github.io/) (MIT).
- Authorship: Original by GPT & [@boyliuxiaopeng](https://github.com/boyliuxiaopeng); reviewed and hardened multiple passes.
