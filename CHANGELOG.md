# 更新日志 (Changelog)

本文档记录 Simple Scrolling 用户脚本的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。


## [1.0.5] — 2026-07-14

### 新增
- 新增设置面板

## [1.0.4] — 2026-07-14

### 修复
- 修复功能

## [1.0.3] — 2026-07-14

### 变更
- SweetAlert2 由 `@require` 强制加载改为点击设置按钮时懒加载，每页节省约 70 KB
- 脚本注释全部改为中英双语

## [1.0.2] — 2026-07-14

### 新增
- 指针事件 (Pointer Events) 统一鼠标、触屏、触控笔拖动
- 触屏设备上长按齿轮按钮 600ms 循环切换图标风格
- 设置面板中新增快捷键键位下拉选择（Top / Bottom shortcut）

### 变更
- 面板增加 `touch-action: none` 防止浏览器在拖拽时滚动页面
- 设置按钮 tooltip 提示"右键或长按切换图标风格"

### 新增
- 四种图标风格：Outline（细线）、Chevron（双线）、Solid（实心）、Rounded（圆角实心）
- 右键点击齿轮按钮循环切换图标风格
- 设置面板中新增图标风格下拉选择和描边宽度调节

### 变更
- 图标缩放（iconScale）和描边宽度（iconStroke）加入 defaultConfig 与 mergeConfig 校验

### 新增
- 图标由纯文字改为内联 SVG（上箭头 / 横线 / 下箭头 / 齿轮）
- 图标风格支持 Outline（Feather 描边）和 Solid（实心三角 + Material 齿轮）
- 设置面板中新增图标风格和图标缩放选项

### 变更
- createButton 参数由 `label` 文本改为 `iconName` 键名，通过 buildIcon 渲染 SVG

### 新增
- `@noframes` 防止在 iframe 内重复注入面板
- `@run-at document-idle` 明确注入时机
- `sanitizeColor` 对颜色值做正则白名单校验
- `getPanelSize` 按面板实际尺寸计算边界，替代固定 `PANEL_OFFSET_LIMIT`

### 修复
- 存储方案由 `localStorage`（按域名隔离）改为 `GM_getValue`/`GM_setValue`（跨站共享），并保留 localStorage 回退
- `saveConfig` 增加 try/catch 防止存储不可用时抛异常中断拖拽
- `onMouseUp` 仅在 `state.isDragged` 为真时保存，避免每次点击按钮都写入存储
- 设置对话框中的 `getElementById` 改为 `Swal.getPopup().querySelector`，避免与宿主页面 ID 冲突
- 当 SweetAlert2 加载失败（CSP 限制等）时给出 alert 提示而非抛出 ReferenceError
- 快捷键在 `input`/`textarea`/`select` 和 `contentEditable` 元素内不触发
- 面板位置 clamp 改为基于实际面板尺寸计算，防止拖出视口顶部

## [1.0.2] — 2025-05-09

### 新增
- 首个正式版本
- 悬浮面板（TOP / MID / BOT / SET 四个按钮）
- 拖拽移动并记忆位置
- Ctrl + ↑ / ↓ 快捷键
- 自动显隐（滚动超过 200px 出现）
- 明/暗主题自适应 + 强制深色开关
- 五套颜色预设
- SweetAlert2 设置面板（图标大小、圆角、透明度、颜色）
- `prefers-reduced-motion` 适配

## [1.0.1] (2026-04-17)

### 新增功能 (Features)
- ✨ **颜色定制系统** - 支持自定义浅色/暗色模式及设置按钮颜色
- 🎨 **5个预置配色方案** - 蓝色经典、绿色清爽、紫色优雅、红色活力、深灰简约
- 🎯 **独立设置按钮颜色** - 设置按钮独立配色，增强视觉层级
- 📱 **改进的拖动交互** - 拖动释放后不会自动点击，避免误操作

### 优化 (Improvements)
- 🔧 修复暗色模式勾选后不起作用的问题
- 🔄 设置保存时实时更新UI，无需页面刷新
- 📐 改进的拖动检测算法（5像素阈值）
- 🎨 更完善的设置面板UI设计

### 技术细节 (Technical)
- 添加全局拖动状态标志 `isDragged`
- 拖动检测基于移动距离（dx/dy > 5px）
- 颜色配置独立存储，支持预设快速应用
- 增强的按钮样式计算逻辑

### 使用说明
1. 点击⚙️设置按钮打开设置面板
2. 使用预设按钮快速应用配色方案
3. 或手动选择三个颜色（浅色/暗色/设置按钮）
4. 点击"保存设置"立即生效

## [1.0.1] (2025-05-09)

### 初始版本功能
- 快捷滚动（顶部、中部、底部）
- 可拖动的滚动面板
- 暗色模式支持
- 图形化设置中心
- 快捷键支持 (Ctrl+↑↓)
- 自动显示/隐藏功能
