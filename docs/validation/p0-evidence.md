# P0 execution evidence

更新：2026-10-20。范围：T01–T03，包含最新 GZ02/GZ08 补充；不进入 P1。分支 `p0/editor-feasibility`，文档初始基线 `c55c43d`，已有 T01/T02 提交 `459c562` / `9e1ef56`。

**当前收口状态：验证与独立审查进行中。** 本页区分源代码、自动化运行、真实 Windows 操作、性能测量与用户认可；最终结论见 [ADR-001](../engineering/adr-001-editor-and-shell.md)。以下 T01 是 2026-10-19 历史构建记录，不是本轮重新查询上游的声明。

## T01 implemented; automatic checks passed

- Official GitHub commit endpoint confirmed e1b7aacb356a492aa1e0fc6eb57b8896124027f0, dated 2026-10-18.
- Source ZIP SHA-256: 87da5287759d85c59caff316ec59a18719a64e4baa900d73c89dbecfce1aabd4.
- Upstream Yarn lock SHA-256 before build: 2fceed8bdb8180b2d14ab0db6010f48b05da0f3a772e218a7024e88ca7a7c76e.
- Snapshot tests first failed because the implementation module was absent. After implementing the boundary, 3/3 passed: IDs/Chinese/labels/bindings/images/provenance round trip, unknown schema rejection, malformed/missing-image rejection.
- Desktop bootstrap test first failed because the desktop entry had not been implemented/built. It now launches Electron 44.9.0, verifies a single canvas window and sandboxed preload, loads two labeled Chinese nodes, a bound arrow and an image, and round trips the actual editor scene and provenance.
- Offline reload initially failed with 232 CDN font resource entries. Fixed host asset initialization order and copied the font directory matching generated paths. Applied one idempotent vendor font-source patch to omit CDN fallback when a host asset root is configured. Upstream App.tsx and private interaction handlers remain unmodified.
- Offline check uses the Electron browser context's offline mode, reloads local files, restores the graph and image, and asserts no HTTP(S) resource entries. The final desktop bootstrap test passes. This is runtime evidence under emulated offline networking, not a claim that the machine's network adapter was disabled.
- Host TypeScript check passes; production and validation builds pass. Vite reports an upstream Mermaid static/dynamic import warning; this is recorded, not a runtime failure. Validation-only test probes live in tests/support and are removed from production builds.

## T02：已有交互与 GZ08 补充

- Pure gesture tests observed RED before implementation. 11/11 now pass: release/hold/slow motion, independent strokes, stale timer/disposal, unknown shape fallback, preview cancellation, capture loss, click/no-dot behavior, pointer identity and a 140,001-point stroke. The long-stroke case first reproduced a JavaScript argument-limit failure, corrected with iterative bounds calculation.
- 计时策略测试注入识别器；实际分类由 `ink-adapter.test.ts` / `recognizer-cases.test.ts` 独立验证，两类证据不能互换。
- 最新七组实际分类断言原样通过，无须修改现有分类器：200×200 圆，300/400/600×200 椭圆保比例，反向直线保方向，不支持菱形拒绝为原迹，以及矩形/12×12 小圆拒绝边界。合成输入独立构造于 `tests/fixtures/strokes/`，不宣称总体鼠标识别率。
- `smart-pen.spec.ts` 在真实 Electron 窗口验证：直接松手为 freedraw；500ms 末端停顿产生预览，预览不入场景；松手只提交一个形状；继续移动恢复同一原笔；连续每 100ms 移动 2 DIP 不产生预览。四笔隔离、迟到计时器和中断另有确定性测试。
- 参数仍为原型候选 A01/A02：500ms、3 DIP 抖动/累计运动门槛；未获得用户手感认可，不写成已批准默认值。

## T03：自动化与原生系统证据

| 范围 | 验证方式与结果边界 |
| --- | --- |
| 内部/边框/控制点 | 纯命中及真实窗口 0.5/1/2/4 倍缩放；带填充图形内部仍绘制；原生控制点复用缩放。框内/边框规则不以图形包围盒替代 |
| 三种文字入口 | 边框绑定标签；空白/普通内部独立文字；既有文字再次编辑。补测复现原生 WYSIWYG 抢焦点：选中文字的静止 pointer-up 会另外进入编辑。通过公开 setActiveTool 在该 pointer-up 前回到 custom，保留原生拖动/清理，独立文字再编辑与拖动已 RED→GREEN；无 App.tsx 补丁 |
| IME 自动化 | Escape 候选优先、Ctrl+Enter 不提前提交、组合中收起延迟到组合结束；DOM 模拟仅证明应用仲裁 |
| 原生 IME | Microsoft 拼音真实候选、选字、Enter 换行、Esc 候选优先和 Ctrl+Enter 保留会话，见下方图片和事件记录 |
| 连线 | 原笔直线无绑定；规整直线沿已有 attachLine 一次提交，双端绑定才带箭头；空端不造节点；拖动已有节点跟随；一次撤销移除整次提交 |
| 序列化 | 中文、标签、关系、图片、provenance 在实际编辑器往返；未知 schema/缺图拒绝，不能恢复为空白冒充成功 |
| 离线 | Chromium offline 模式重载本地构建，图片和中文场景可用，HTTP(S) 资源条目为零；没有关闭机器网卡或修改防火墙 |
| 热键生命周期 | 原生 API 真正占用同一快捷键，应用显示注册失败；正常退出后其他进程可注册。原生焦点切换另行实测 |
| PNG/PDF | 走真实主进程导出路径，只替换测试保存路径；PDF 1 页 A4 横向，PyMuPDF 渲染后核看中文、箭头和图片完整；不是仅检查文件头 |

### 真实 Windows 操作（2026-10-20）

系统 Windows 11 Pro 10.0.26100 x64，显示缩放 100%。使用 Computer Use 的原生输入；没有用 fill() 或 dispatchEvent 代替这一栏。

1. 原生双击边框，按 `n` 出现 Microsoft 拼音候选；候选中 `Ctrl+Enter` 不结束编辑；`Esc` 仅取消候选，textarea 保留。
2. 再按 `n`、空格选择“你”；`Enter` 换行；非组合状态 `Esc` 结束编辑并保留标签。
3. 原生鼠标拖动边框，节点、标签和绑定箭头一起更新；再在框内拖动，直接松手后保留笔迹，场景为 7 对象。
4. `Ctrl+Alt+D` 收起画板。计算器占有焦点时按同一快捷键，原画板显示并获得焦点，7 对象保持。最后通过画板“退出”正常退出。

证据：[候选](assets/2026-10-20-ime-candidate.png)、[Ctrl+Enter](assets/2026-10-20-ime-ctrl-enter.png)、[Esc 保留编辑](assets/2026-10-20-ime-escape-keeps-editor.png)、[Enter 换行](assets/2026-10-20-ime-enter-newline.png)、[标签提交](assets/2026-10-20-ime-label-committed.png)、[边框拖动与连线](assets/2026-10-20-native-border-drag.png)、[内部原迹](assets/2026-10-20-native-inside-ink.png)、[计算器焦点](assets/2026-10-20-calculator-before-hotkey.png)、[跨应用唤出](assets/2026-10-20-hotkey-from-calculator.png)、[原始事件与窗口可见性记录](assets/2026-10-20-native-events.jsonl)。事件记录原样保留 isTrusted 字段；compositionstart/input 有 trusted 原生事件，compositionend 的实际记录为 false，不把所有事件一概写为原生。

PDF：[导出样例](assets/2026-10-20-export-sample.pdf)、[重新渲染的图片](assets/2026-10-20-export-pdf-preview.png)。这些都是合成测试内容，不是用户业务数据。

### 性能口径

- 设备 i7-1370P，20 逻辑处理器，31.65 GiB RAM，Windows 11 x64，缩放 1；版本见 [依赖基线](../engineering/dependency-baseline.md)。
- 场景 S：100 图形/中文文字 + 20 线 + 3 图，共 123 对象；PNG 合计 5,075,997 字节（4.84 MiB，约 5 MiB）。千对象场景 970 图形/文字 + 20 线 + 10 图片实例，共用 3 图片资产。
- 暖唤出：至少 30 次，主进程 show 请求到 Chromium 鼠标笔画真正进入编辑器场景；不包含物理热键派发耗时。真实跨应用热键只做功能实测，不拿截图/API 往返延迟当硬件端到端分位数。
- 进程重启：至少 10 次，从外部 `_electron.launch` 到本地读取合成场景、图片解码、两帧和真实笔画提交；包含 CDP 连接开销，系统/文件缓存暖，不等于重启机器后的冷启动，也不证明 P1 已实现持久化恢复。
- 千对象：180 次脚本平移，丢弃最初 5 次，记录 RAF 帧间隔，不称 GPU 绘制耗时。后台 CPU/内存的最终样本会隐藏窗口后分别记录 S 与千对象场景；进程工作集相加可能包含共享页，不等同私有内存。
- 2026-10-19 的 2.57s 数字保留为旧口径：包括通过 Playwright 向 renderer 传入约 5MB 数据。2026-10-20 定向剖析同内容传输/解码/载入 1671ms，对比由本机测试进程读文件并载入 195ms（renderer 约 59ms）。据此修正测试驱动路径，不将差额写成产品优化收益。
- 第一轮修正口径串行样本 p95：暖唤出 22.78ms、进程重启 1746.31ms、千对象帧间隔 17.7ms；均低于原暂定 300/2000/32ms。最终全套结果与构建 Hash 见 [原始测量](assets/2026-10-20-performance.json)。发生测试/基准重叠的一次结果已废弃，不选取其中较快数据。

## GZ 采用记录与范围

| 编号 | 当前动作 | 文件/断言 | 未完成的后续范围 |
| --- | --- | --- | --- |
| GZ08 | 机制与反例参考，无源码复制；实际分类已覆盖 | recognizer-cases、gesture、ink-adapter、core-interaction；合成/自动化/真机分栏 | 完整来源恢复、标签生命周期归 T04/T05 |
| GZ02 | 现有 Excalidraw 关系已覆盖 P0，不引入第二套 connector | connection-policy、adapter、connections；绑定、方向、空端、跟随、单次撤销 | 删除/复制/组移动完整关系归 T05 |
| GZ01/03/04/05/06/07 | 本轮未移植源码或增加运行依赖；P0 热键/PDF 是已有路线验证 | 最新计划映射继续有效 | 最近、可靠保存恢复、完整导出、展示、GUI 和设备矩阵仍归后续任务 |

## 限制与尚未代表的结果

- P0 目前没有自动保存、重启恢复、最近画布、可编辑文件、命名区域、完整风格/展示流程。完全退出会丢失当前内容，UI/README 明示。收起保留当前进程内容。
- 未测安装包、全新机器/重启机器冷启动、Windows 10/ARM64、混合 DPI/拔屏、10,000 对象支持上限。没有发布或用户体验认可；A01/A02/A07 保留候选状态。
- 导出目前全场景、最大边 4096px，PDF 为静态栅格单页。完整范围/倍率/剪贴板/便携文件仍是 P2 任务。
- 源码构造/识别依赖固定内部包；字体有一处受控补丁。未声称零升级成本或完成所有分发许可核查。

## 本轮执行裁定

1. 沿用原有 feature 分支、原 T01/T02 和同一场景接口，只补最新 P0 差额；不初始化第二工程或为旧拟定名称重建输入模块。风险：没有 linked-worktree 隔离，以已存 Git 基线和明确文件范围保护。
2. 旧计划标题/脚本约定不一致，以 PowerShell 抽取当前 T02/T03 原文；pnpm 11 的过滤器通过 `pnpm exec` 直接交给 runner。风险仅在执行记账，不改变测试要求。
3. 字体 CDN 回退仅做一处固定补丁；分类器注入计时模块以保持纯逻辑，实际分类另测。风险为升级时复验和不能用假分类器宣称识别质量。
4. 已通过的 GZ08 分类不重写。小圆拒绝门槛记录为尺度政策，合成通过不等于总体手写准确率。
5. 本地基准避开测试驱动的大数据传输，暖唤出终点改为实际提交；保留旧口径和新局限。风险是仍不能代替真实持久化/物理按键延迟。
6. 桌面验证等窗口显示/焦点及两帧后再输入；不同主进程的系统热键测试严格串行。原生 UI 活动保护拦截了计算器清理，未继续操作该窗口。
7. 初次源码 link 安装需要先准备 vendor，再安装本项目依赖；新增只用 Node builtin 的 `--fetch-only` 解开顺序依赖，已本机执行，不宣称全新系统安装复验。
8. 只完成 P0，不推进 P1。完整计划仍有后续任务，保留计划工作目录及 ledger，不将后续待办随临时目录清理掉。

详细 transient 日志仍在 `.superpowers/sdd/2026-10-19-drawingboard-development-plan/`；最终可复查证据保存在本页链接及 assets 中。
