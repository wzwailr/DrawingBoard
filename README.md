# DrawingBoard

一个面向 Windows、以鼠标和键盘为主的快速画板：随时唤出，在自由画布上绘制草图、整理结构与关系、组合页面布局。

当前已有 **P0 核心交互验证原型，技术门槛已通过（2026-10-20）**：33 项逻辑/集成测试、21 项桌面测试及生产构建离线操作冒烟通过；独立审查发现的 1 项重要问题已修复并回归。范围停留在 P0，尚未进入 P1，也没有发布安装包或获得用户手感认可。`DrawingBoard` 为项目代号，正式产品名称尚未确定。

原型支持智能笔（直接松手保留原迹、停顿预览后松手规整）、框内绘制/边框移动、中文文字、绑定直线、PNG/PDF 导出，以及托盘和 `Ctrl+Alt+D` 收起/唤出。

**试用前注意：当前没有自动保存、最近画布或退出后恢复。收起保留当前进程内容，完全退出会丢失本次画布；需要时先导出 PNG/PDF。** 完整原迹恢复、命名区域、风格设置、展示和可编辑文件等按后续阶段实施。

## 本机运行

当前目录依赖和引擎已构建时：

```powershell
pnpm dev
```

或运行本地生产构建：

```powershell
pnpm build
pnpm exec electron .
```

首次从源码准备（Node 24，pnpm 11；首次获取依赖需要网络，运行加载本地资源）：

```powershell
node scripts/build-editor.mjs --fetch-only
pnpm install --frozen-lockfile --ignore-scripts
node node_modules/electron/install.js
pnpm build:editor
pnpm build
pnpm exec electron .
```

固定来源、字体补丁和构建边界见 [vendor 说明](vendor/README.md)与[依赖基线](docs/engineering/dependency-baseline.md)。未在全新 Windows 系统复验安装；这不是已发布安装包的证明。

## 验证入口

- [P0 证据、测试口径与限制](docs/validation/p0-evidence.md)
- [ADR-001：编辑器和桌面外壳决策](docs/engineering/adr-001-editor-and-shell.md)
- [独立审查与修复记录](docs/validation/p0-review-2026-10-20.md)

```powershell
pnpm typecheck
pnpm test
pnpm build -- --validation
pnpm exec playwright test --config playwright.desktop.config.ts
node scripts/benchmark.mjs
pnpm build
node scripts/check-production.mjs
```

桌面测试、基准与试用窗口需串行运行，避免全局快捷键和焦点互相干扰。验证构建才包含测试探针；生产构建不加载 fixtures。可用 `node scripts/preview.mjs` 在验证构建中打开合成示例；P0 基准不代表 P1 保存恢复或安装后性能。

## 设计和调研

- [产品形态、功能范围与交互设计 v1.0](docs/superpowers/specs/2026-10-19-drawingboard-product-design.md)：当前设计基线，包含已确认决策、完整操作流程、设计补充及待验证事项。
- [已认可的整合界面与操作流程草图](docs/superpowers/specs/assets/2026-10-19-drawingboard-integrated-flow.png)：静态概念图，非运行截图。
- [开源实现与产品设计调研](docs/research/2026-10-19/research-report.md)：候选底座、智能笔模块、Windows 本地机制、交互差异、许可与验证建议。
- [竞品产品图片与 GUI 借鉴图册](docs/research/2026-10-19/product-gallery.md)：15 个目标的真实截图或官方图片入口，注明来源、平台与核看状态。
- [技术设计与开发边界（草案）](docs/superpowers/specs/2026-10-19-drawingboard-technical-design.md)：推荐技术路线、模块、输入状态、文件与保存协议、原型建议和验证门槛。
- [分阶段开发计划](docs/superpowers/plans/2026-10-19-drawingboard-development-plan.md)：P0–P3、14 项任务；完成度查 P0 证据，空复选框不能当作未开始的证明。
- [GazBoard 适配评估](docs/research/2026-10-19/gazboard-fit-gap-and-adaptation-assessment.md)：固定版本研究与反例；本项目沿用 Excalidraw，GazBoard 用于机制和回归参考。

后续讨论和实现以主设计文档为依据。设计目标、原型验证结果和实际实现状态应分别记录，不能因为文档或草图中出现某项功能就认为它已经可用。
