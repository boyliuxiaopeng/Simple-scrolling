# Git 提交指南

## 快速提交步骤

### 1. 配置 Git（仅第一次需要）
```powershell
cd c:\cool\Simple-scrolling
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 2. 查看文件变更
```powershell
git status
```

### 3. 添加修改到暂存区
```powershell
# 添加所有修改
git add .

# 或者仅添加特定文件
git add Script.js
git add CHANGELOG.md
```

### 4. 提交更改
```powershell
git commit -m "v1.1: 新增颜色定制、优化拖动交互、修复暗色模式问题

- 支持自定义浅色/暗色模式及设置按钮颜色
- 新增5个预置配色方案（蓝色经典、绿色清爽等）
- 设置按钮独立配色，增强视觉层级
- 修复拖动释放后自动点击的问题
- 修复暗色模式勾选后不起作用的问题
- 改进设置保存时的实时更新，无需页面刷新
- 改进的拖动检测算法（5像素阈值）"
```

### 5. 推送到远程仓库
```powershell
# 推送到默认远程分支
git push origin main

# 或者指定分支
git push origin master
```

---

## 修改内容摘要

### 新增文件
- `CHANGELOG.md` - 版本更新日志

### 修改文件
- `Script.js` - 版本升级到 v1.1
  - 颜色定制系统
  - 拖动交互优化
  - 暗色模式修复
  - 设置面板改进

---

## 备选：使用 GUI 工具
如果不想用命令行，可以使用以下工具：
- **GitHub Desktop** - 图形化界面，简单易用
- **TortoiseGit** - Windows 资源管理器集成
- **VS Code Git** - 内置于 VS Code

---

## 需要帮助？
查看 Git 文档：https://git-scm.com/doc
