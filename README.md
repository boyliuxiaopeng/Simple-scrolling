# Simple Scrolling
### 简单滑块

[![version](https://img.shields.io/badge/version-1.0.4-blue)](simple-scrolling.user.js)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

这是一款轻量级的 Tampermonkey 用户脚本，可为快速页面导航添加一个可拖动的浮动面板--只需点击一下即可滚动到顶部、中部或底部。包含键盘快捷键、主题识别颜色、四种 SVG 图标样式和一个可视化设置对话框。

## 特点

- **浮动面板** - 默认四个按钮（顶部-中间-底部-设置）固定在右下角
- **支持拖动** - 通过统一的指针事件进行鼠标、触摸和笔输入；可跨页记忆位置
- **快捷键** - `Ctrl + ↑` / `Ctrl + ↓`（可自定义），在文本字段内忽略
- **图标样式** - 轮廓、雪佛龙、实心和圆角；右击或长按齿轮可循环使用
- **主题感知** - 自动检测系统亮/暗模式；可选的强制变暗切换
- **颜色预设** - 蓝色、绿色、紫色、红色、灰色；支持自定义颜色
- **视觉设置** - SweetAlert2 对话框（懒加载，每页保存 ~70 KB 直至需要）
- **跨网站配置** - GM 存储可在所有网站上保持同一配置；本地存储后备
- **尊重能耗** - 当操作系统要求时，切换到即时滚动
- **框架安全** - "@noframes "防止嵌入框架内的重复面板

## 安装

1. 安装油猴 [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey / Greasemonkey).
2. 点击 [**Simple Scrolling**](https://greasyfork.org/zh-CN/scripts/586932-simple-scrolling) 跳转到 Tampermonkey 仓库安装, 或者本仓库打开 [`simple-scrolling.js`](simple-scrolling.js) 复制到新建一个新脚本。
3. 刷新即可看到脚本面板。

## 简单使用

| Action             | How                                                      |
| ------------------ | -------------------------------------------------------- |
| 滚动到最上面      | Click **↑**                                              |
| 滚动到中间        | Click **─**                                              |
| 滚动到最下面      | Click **↓**                                              |
| 打开设置          | Click **⚙**                                              |
| 图标风格          | **Right-click** ⚙ (desktop) or **long-press** ⚙ (mobile) |
| 移动面板          | **Drag** any button                                      |
| 快捷键            | `Ctrl + ↑` / `Ctrl + ↓` (customizable)                   |

### 详细设置

设置面板可供选择的调整选项:

| 设定                       | 区间 / 选择                          | 默认                              |
| -------------------------- | ----------------------------------- | --------------------------------- |
| 面板尺寸                    | 14–48 px                            | 18                                |
| 图标风格                    | Outline / Chevron / Solid / Rounded | Outline                           |
| 图标尺寸                    | 40–75%                              | 58                                |
| 线条宽度                    | 1–4                                 | 2.25                              |
| 圆角半径                    | 0–24 px                             | 12                                |
| 不透明度                    | 20–100%                             | 60                                |
| 亮 / 暗 / 自定义            | Any hex                             | `#007BFF` / `#444444` / `#FFB800` |
| 自动显示                    | on/off                              | on (hide when scrolled < 200px)   |
| 快捷键                      | Arrow/Page/Home/End/WASD            | ArrowUp / ArrowDown               |
| 启用快捷键                  | on/off                              | on                                |
| 强制暗黑模式                | on/off                              | off                               |

更改将在您点击**保存**时立即生效。

## 如何工作

```
┌──────────────────────────────────────────┐
│  网页                                    │
│                                  ┌─────┐ │
│                                  │  ↑  │ │  ← 最上
│                                  │  ─  │ │  ← 居中
│                                  │  ↓  │ │  ← 最下
│                                  │  ⚙  │ │  ← 图标切换 & 设置
│                                  └─────┘ │
│        ← 拖拽 / 单击 / 右键单击 →          │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```

- 存储：使用 `GM_getValue`/`GM_setValue` 进行跨原点持久化；当 GM 不可用时，按原点退回到 `localStorage`。
- 渲染：render()`是惰性的，它会销毁旧面板，创建新面板，并重新绑定所有监听器。每次配置更改都会通过 `mergeConfig()` 进行反馈，它将验证并箝位所有值。
- 懒人对话框：SweetAlert2 仅在第一次点击 ⚙ 时通过 `<script>` 标记注入。随后的打开将重复使用缓存的承诺。
- 安全性：所有用户提供的值（颜色、大小、键）在使用前都经过了消毒处理。设置输入的作用域为 Swal 弹出窗口，以避免与主机页面的 ID 冲突。

## 浏览器支持

| Feature                  | Chrome | Firefox | Safari | Edge |
| ------------------------ | ------ | ------- | ------ | ---- |
| 面板 & 按钮          | ✅    | ✅      | ✅      | ✅    |
| 面板拖动             | ✅    | ✅      | ✅ 13+  | ✅    |
| 触摸/长按            | ✅    | ✅      | ✅      | ✅    |
| 快捷键               | ✅    | ✅      | ✅      | ✅    |
| 暗黑模式检测          | ✅    | ✅      | ✅      | ✅    |
| 减少动画效果          | ✅    | ✅      | ✅      | ✅    |

## License

MIT

## Credits

- 图标: [Feather](https://feathericons.com/) (MIT) for Outline / Chevron strokes; Material gear (Apache-2.0) for Solid / Rounded fills.
- 设定对话框: [SweetAlert2](https://sweetalert2.github.io/) (MIT)。
- 作者: [@boyliuxiaopeng](https://github.com/boyliuxiaopeng)。
