# DrawingBoard Development Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task using the implementation branch's established execution method. Steps use checkbox (`- [ ]`) syntax for tracking. 本文件是任务与验收基线，不是当前完成度台账；继续已有实施安排，不因本次文档修订重新执行已完成任务。

初版日期：2026-10-19；修订日期：2026-10-20。用户确认沿用现有方案，将 GazBoard 的模块与机制纳入实施参考；本次只更新文档。执行状态入口：[P0 证据](../../validation/p0-evidence.md)，其历史记录不能替代当前验收。

**Goal:** 交付鼠标键盘优先、后台快开、智能笔绘制、可编辑关系与页面布局、本地离线保存、展示和三类导出的 Windows 应用。

**Architecture:** 一个 Excalidraw 场景与历史核心；产品自有输入仲裁、智能笔状态机和轻量界面；Electron 主进程负责本地文件和系统能力。先通过 P0 决定核心接入与外壳是否成立，再推进功能；不提前建第二套图形模型。

**Tech Stack:** 首选 Electron / React / TypeScript / Vite / 固定提交 Excalidraw；Vitest / Playwright / electron-builder。精确依赖与引擎构建由 T01 锁定并留下可复现证据。

**Spec:** [产品设计 v1.0](../specs/2026-10-19-drawingboard-product-design.md)；[技术设计草案](../specs/2026-10-19-drawingboard-technical-design.md)。执行者必须同时阅读；A01–A09 是待原型评审的细化建议，不是既有用户确认。

## Global Constraints

- Windows 桌面应用；鼠标和键盘为主，手绘为辅；普通可调整大小的窗口。
- 默认继续上次画布，同时提供一键新建；后台待命，全局快捷键唤出和收起。
- 无限画布，通过命名区域组织内容；普通大矩形、组合、命名区域必须区分。
- 直接松手保留笔迹；笔画末尾按住鼠标停顿，出现规整预览，随后松手确认；只识别单笔。
- 规整保留大致位置、大小和比例，结果可编辑；提供恢复笔迹的方式；规整完成后仍可继续使用智能笔。
- 图形内部空白处可继续画；拖动边框移动图形；双击边框编辑图形标签；双击空白处创建独立文字。
- 中文输入法和文本编辑优先；Enter 换行；组合输入时 Esc 优先交给输入法。
- 先画节点，再单独画连线；连向空白处不能自动生成新节点；两端连接图形时默认沿绘制方向带箭头，可去掉箭头。
- 静态页面布局草图；支持组合、对齐、等距排列、图片输入；首版不承担点击跳转原型。
- 本地自动保存，离线使用，无需登录；最近画布按最近使用和搜索找回。
- 复制为图片、导出图片/PDF、导出可编辑文件都要有；独立展示模式支持临时讲解指示。
- 设置支持标准线条、轻手绘；保留原始笔迹本身的样子；首版不加入生成式 AI。
- 画布占据主体，使用浮动工具条与按需属性菜单；保留既有设计结构。
- 当前已有独立实施工作；本次授权仅更新方案文档，不启动代码修改、依赖安装、提交/推送或打包。实施分支按原有授权继续，先核对现有实现和证据，再补本计划差额。
- GazBoard 仅作固定版本的局部逻辑候选、机制与测试参考；不切换底座，不增加第二套场景/绑定/历史或 GazBoard 运行依赖。具体边界以技术设计第 2.1 节为准。

## Review Focus

1. 迟到的计时器、识别或保存结果不能改写下一笔/下一张画布；拥有任务 T02、T07、T08。
2. 双击、IME 候选、边框拖动和靠边起笔之间不能抢动作或留下墨点；拥有任务 T03、T05。
3. 规整后经过移动/缩放、绑定文字/连线再恢复，内容不丢且一次撤销能完整返回；拥有任务 T04、T05。
4. Windows 文件占用、坏 head、保存完成但回执丢失、压缩包非法路径不能造成旧文件被覆盖或假成功；拥有任务 T07、T10。
5. 混合 DPI、显示器拔出、安装后断网、热键占用与完全退出需要真实系统证据；拥有任务 T08、T13、T14。

---

## 1. 阶段、依赖和产物

| 阶段 | 任务 | 用户能检验的结果 | 通过门槛 |
| --- | --- | --- | --- |
| P0 核心可行性 | T01–T03 | Windows 验证窗口内画框、写字、连线；直接松手/停顿区别可操作 | 交互控制、历史/序列化、离线资源、热键/PDF 冒烟；性能测量；形成 ADR |
| P1 可持续使用 | T04–T08 | 日常绘制与布局；关闭/重开恢复；最近画布 | 语义编辑稳定，保存/恢复真实，原迹不丢 |
| P2 完整产品流程 | T09–T12 | 风格、三类交付、展示、完整轻量界面 | 唤出→绘制→编辑→展示→导出→收起全链路 |
| P3 交付验收 | T13–T14 | 可复现安装包与证据 | V01–V17 覆盖，目标机安装/离线/退出，许可和限制清楚 |

依赖：T01 → T02 → T03 → P0 决策；T04 → T05 → T06；T07 依赖 T01/T04 的快照契约；T08 依赖 T05/T07；T09 依赖 T06/T07；T10 依赖 T07/T09；T11 依赖 T10；T12 依赖 T06/T08/T09/T11；T13 → T14。当前默认顺序执行，实施时若采用代理，仍只并行无共享接口改动的任务。

不先承诺日历工期或复用百分比。P0 给出实际改动面、性能和失败项后，再估算后续任务；不能用删除 PDF、独立文字或原迹恢复来伪装完成。

### 1.1 GazBoard 借鉴项落实表

来源与复用类别由[技术设计第 2.1 节](../specs/2026-10-19-drawingboard-technical-design.md)统一定义；完整事实见[研究报告](../../research/2026-10-19/gazboard-fit-gap-and-adaptation-assessment.md)。沿用原 T 编号，不增加平行实施分支或独立 GazBoard 功能集。**已有实现先跑对应断言，只补缺失行为和证据；不为套用参考代码而重写通过的模块。**

| GZ 编号 | 责任任务与落点 | 该任务必须交付的适配/证据 |
| --- | --- | --- |
| GZ01 最近记录 | T07/T08：board-repository.ts、boards/session.ts、ui/RecentBoards.tsx；T12：抽屉整合 | 最近打开去重排序、重命名联动、搜索与缺失项；使用现有 catalog/BoardSummary，不能再建竞争索引 |
| GZ02 连线 | T03/T05：已有 editor/connection-policy.ts、adapter.ts；connections / connection-lifecycle 测试 | 保持 Excalidraw 原生绑定；验证删除/撤销、复制与组移动；不搬新 connector 模型 |
| GZ03 导出 | T10/T11：storage/editable-package.ts、export/prepare-export.ts、export-service.ts | 当前内存一致快照、资产完整性、失败后另存恢复副本、去掉机器路径、PNG/PDF/剪贴板一致 |
| GZ04 保存保护 | T07/T08：storage 三模块、boards/save-queue.ts、session.ts 与生命周期 IPC | 旧 ack 不清新脏状态、替换失败保留旧文件、缺图保留引用、失败不切换/隐藏/退出 |
| GZ05 窗口与恢复 | T03/T08/T13：已有 main/index.ts 与后续 window/shortcuts/tray；session.ts | 旧异步恢复不覆盖新选择；完整恢复 zoom/相机；真实热键、拔屏和 DPI 证据 |
| GZ06 展示 | T12/T13：presentation/controller.ts、指示视图与 presentation 测试 | 临时指示不写文档、历史或导出；展示中阻止编辑；验证退出状态 |
| GZ07 轻量 GUI | T08/T12：RecentBoards、DocumentBar、ToolPalette、ContextBar | 借用组织方式，落实已认可草图；没有教学/分享等未实现入口和竞品品牌素材 |
| GZ08 反例回归 | T02/T03/T04/T05：已有 recognizer/gesture/hit-policy/TextEditor、strokes fixtures | 用识别探针补形状和比例边界；保护 IME Esc/Ctrl+Enter；合成、自动化、真机证据分栏 |

落地记录写在责任阶段的现有 evidence 中：`GZ 编号 → 现有覆盖/机制参考/源码移植 → 目标文件 → 用例与结果 → 未验证项`。每次实际源码移植同时更新 T14 负责维护的 third-party-notices；记录原提交/文件、目标、修改和许可，不能等打包时追补。当前八项均为**计划采用**，不是“八项已经实现”。

### 1.2 本次补充的执行顺序

1. P0 当前任务先核对 GZ08 的分类反例、文字输入边界以及 GZ02 的绑定门槛；已有 T02/T03 内容只补缺口。通过条件仍是完整 P0 门槛。
2. P1 按 T04–T08 的原依赖推进：T05 落 GZ02 完整关系生命周期；T07/T08 将 GZ04/GZ05 的保存与恢复作为 GZ01 最近抽屉可靠可用的前提。T04/T06 原迹与区域沿用原计划，不因参考项重新排序任务依赖。
3. P2 将 GZ03/GZ06/GZ07 接入导出、展示和工作区。文件/区域/风格继续遵守本项目契约，不改成 GazBoard 格式或教学语义。
4. P3 复核 GZ 采用记录、许可与 V01–V17 的证据。对未采用的源码候选记录“现有实现已覆盖”或具体不适配原因，不为完成借鉴清单强行移植。

## 2. 文件责任规划（既有文件继续修改，缺失文件按责任需要创建）

| 路径 | 责任 |
| --- | --- |
| `src/main/index.ts`, `window.ts`, `shortcuts.ts`, `tray.ts`, `settings.ts` | 生命周期、窗口/热键/托盘与设置；不处理逐点识别 |
| `src/main/ipc.ts`, `src/preload/index.ts`, `src/shared/contracts.ts` | 白名单 IPC、参数验证和共享类型；不暴露通用文件系统 |
| `src/main/storage/board-repository.ts`, `atomic-write.ts`, `asset-store.ts` | 串行保存、修订、资产、恢复与一致性 |
| `src/main/storage/editable-package.ts`, `src/main/export-service.ts` | 便携文件导入导出、系统剪贴板/PNG/PDF |
| `src/renderer/editor/EditorHost.tsx`, `adapter.ts`, `engine-snapshot.ts` | 画布集成、窄接口、引擎快照及版本适配 |
| `src/renderer/input/hit-policy.ts`, `TextEditor.tsx`, `src/renderer/ink/SmartPenLayer.tsx` | 已有命中、文字/IME、指针/双击入口；按当前职责补齐，不仅为符合旧命名再建 pointer-router/text-controller |
| `src/renderer/ink/gesture.ts`, `recognizer.ts`, `provenance.ts` | 停顿状态机、识别包装、原迹与恢复 |
| `src/renderer/editor/connection-policy.ts`, `region-policy.ts`, `style-policy.ts` | 连接、区域与风格的产品规则 |
| `src/renderer/boards/session.ts`, `save-queue.ts` | 当前画布、相机、切换请求代次、脏状态 |
| `src/renderer/export/prepare-export.ts`, `src/renderer/presentation/controller.ts` | 一致快照输出和临时展示状态 |
| `src/renderer/ui/` | App、DocumentBar、ToolPalette、ContextBar、RecentBoards、Settings、ExportDialog、Status、样式 tokens |
| `src/print/index.html`, `src/print/render.ts` | 独立本地打印模板，仅接收受控图像和纸张参数 |
| `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/desktop/`, `tests/fixtures/` | 行为、文件故障、浏览器/桌面自动化、非敏感测试样本 |
| `vendor/excalidraw/`, `vendor/README.md` | T01 固定上游源与构建记录；如有补丁逐项登记，不混入产品代码 |
| `docs/engineering/`, `docs/validation/` | 版本/许可/ADR、阶段证据、性能、用户操作与已知限制 |

不一次性创建所有空目录/占位类；每项任务只创建其产物需要的文件。当前已有 Git、依赖和部分源码，不重复初始化或生成工程。T01 中已存在的文件与版本以工作区、dependency-baseline 和验证记录核对，缺口才执行；不自动创建远端或推送。现有 P0 将部分职责放在 main/index.ts、SmartPenLayer.tsx、TextEditor.tsx；只有实现证据表明需要拆分时才调整，禁止让两套输入/文字处理并行。

## 3. 接口契约

`src/shared/contracts.ts` 已存在；下表仍是目标接口与数据约束，不声称全部 API 已实现。实施者先核对当前契约，已落地部分沿用，差异在对应任务/evidence 中明确后再补；不要直接覆盖共享类型以重建工程。金额、网络账户等无关概念不得进入契约。

| 类型/接口 | 约定 |
| --- | --- |
| `Point`, `Viewport` | `{x:number,y:number}`；视角 `{x:number,y:number,zoom:number}`，有限数且 zoom>0 |
| `StrokeSample` | Point + `{timeMs:number,pressure?:number}`；真实输入，坐标为世界坐标，时间单调；另传 viewport 用于 DIP 换算 |
| `Candidate` | `{kind:'rectangle'|'ellipse',center:Point,width:number,height:number,rotation:number}` 或 `{kind:'line',start:Point,end:Point}`；旋转为弧度；不可靠返回 null |
| `GestureConfig` | `{holdMs:number,jitterDip:number,motionResetDip:number}`；原型初值 500/3/3，非已确认体验参数 |
| `Hit` | `{kind:'blank'|'border'|'text'|'image'|'handle'|'ui',elementId?:string}`；可操作对象命中必须有 ID |
| `EngineScene` | `engine-snapshot.ts` 定义固定版本可序列化结构及校验；是唯一场景，没有平行节点表 |
| `AssetInput`, `AssetRef` | `{id:string,sha256:string,mime:string,width:number,height:number,bytes:Uint8Array}`；AssetRef 去掉 bytes；主进程重算哈希并验证尺寸 |
| `BoardDocument` | `{schemaVersion:1,id:string,title:string,revision:number,lastOperationId:string,engineVersion:string,scene:EngineScene,assets:AssetRef[]}` |
| `SaveRequest`, `SaveAck` | 请求 `{boardId,baseRevision,clientSeq,opId,document,assets:AssetInput[]}`；响应 `{boardId,revision,clientSeq,opId}`，同名字段类型沿用对应定义 |
| `BoardSummary`, `LoadedBoard` | summary `{id,title,lastOpenedAt,modifiedAt,recoveryStatus}`；loaded `{document,viewport,assets:AssetInput[]}`；时间为 ISO 字符串 |
| `AppResult<T>` | `{status:'ok',value:T}` / `{status:'cancelled'}` / `{status:'error',code,message}`；code 为 VALIDATION/CONFLICT/IO/CORRUPT/UNSUPPORTED/LIMIT |
| `ExportRequest` | `{scope:'all'|'selection'|'region',ids:string[],scale:number,background:boolean,format:'png'|'pdf'|'editable',orientation:'portrait'|'landscape'}`；editable 导出整份文档，不支持局部伪完整文件 |
| `RasterResult` | `{png:Uint8Array,width:number,height:number,bounds:{x,y,width,height}}`；完成资源加载后的快照结果 |
| `UserSettings` | `{hotkey:string,defaultStyle:'standard'|'sketch'}`；窗口位置、最后画布 ID 为主进程维护字段，不由 renderer 任意覆盖 |
| `GestureEffect` | `{type:'preview',strokeToken:string,candidate:Candidate|null}` 或 `{type:'commitInk',strokeToken:string,samples:readonly StrokeSample[]}` 或 `{type:'commitShape',strokeToken:string,samples:readonly StrokeSample[],candidate:Candidate}` |
| `DesktopEvent` | `{kind:'show'|'new-board'}` 或 `{kind:'request-hide'|'request-quit',requestId:string}`；同一生命周期请求只结算一次 |

主要函数（返回 Promise 的失败用 AppResult；本地同步操作使用明确异常并在 UI 边界转结果）：

- `createGesture(config:GestureConfig, clock:Clock):GestureController`；Clock 提供 now/setTimeout/clearTimeout。Controller 提供 `down(pointerId:number,sample:StrokeSample,viewport:Viewport):void`、`move(pointerId:number,sample:StrokeSample):void`、`up(pointerId:number,sample:StrokeSample):void`、`cancel(reason:'escape'|'blur'|'capture-lost'|'hide'):void`、`onEffect(fn:(effect:GestureEffect)=>void):()=>void`、`dispose():void`；按技术设计状态表发出效果。
- `recognize(samples:readonly StrokeSample[]):Candidate|null`；不包含停顿逻辑或场景写入。
- `EditorAdapter.hitTest(point:Point,mode:'ink'|'select'):Hit`；`preview(candidate:Candidate|null):void`；`commitStroke(samples:readonly StrokeSample[],candidate:Candidate|null):string`；`restoreInk(id:string):void`；`beginText(hit:Hit,point:Point):void`；`serialize():EngineScene`；`load(scene:EngineScene,assets:AssetInput[]):void`；`exportRaster(request:ExportRequest):Promise<RasterResult>`；`onDocumentChange(fn:()=>void):()=>void`。
- `BoardRepository.create(title:string):Promise<AppResult<LoadedBoard>>`；`load(id:string)` 同返回；`save(request:SaveRequest):Promise<AppResult<SaveAck>>`；`list(query:string):Promise<AppResult<BoardSummary[]>>`；`saveViewport(id:string,view:Viewport):Promise<AppResult<void>>`。重命名通过修改 document.title 并 save，不另开旁路。
- `SaveQueue.changed():void`；`flush():Promise<AppResult<SaveAck|null>>`；`dispose():void`；每画布独立维护 clientSeq/在途请求/最新快照。
- `DesktopApi` 仅暴露 board.create/load/save/list/saveViewport、assets.chooseImages、export.saveRaster、export.saveEditable、import.openEditable、clipboard.writeImage、window.requestHide/completeLifecycle、settings.read/update、events.subscribe；事件订阅返回清理函数。对话框路径不作为 renderer 可任意填入的写路径参数。

DesktopApi 中 board 方法与 Repository 同签名；`assets.chooseImages():Promise<AppResult<AssetInput[]>>`；`export.saveRaster(raster:RasterResult,format:'png'|'pdf',orientation:'portrait'|'landscape'):Promise<AppResult<{path:string}>>`；`export.saveEditable(document:BoardDocument,assets:AssetInput[]):Promise<AppResult<{path:string}>>` 接收导出开始时的完整内存快照，先校验再写用户选择的文件，不能只读旧磁盘版本；`import.openEditable():Promise<AppResult<LoadedBoard>>`；`clipboard.writeImage(png:Uint8Array):Promise<AppResult<void>>`；`window.requestHide():Promise<AppResult<{requestId:string}>>`；`window.completeLifecycle(requestId:string,decision:'ready'|'cancel'):Promise<AppResult<void>>`；`settings.read():Promise<AppResult<UserSettings>>`；`settings.update(patch:Partial<UserSettings>):Promise<AppResult<UserSettings>>`；`events.subscribe(fn:(event:DesktopEvent)=>void):()=>void`。

窗口 X、托盘和快捷键通过同一主进程请求发出带 ID 的事件；renderer 结算输入并 flush 后调用 completeLifecycle，不能再次调用 requestHide 形成循环。处理中阻止新增编辑、合并重复请求；保存失败传 cancel，恢复编辑并显示错误。ready 仅确认当前 requestId，过期响应无效。自动保存失败时，可编辑导出仍能读取完整内存快照用于恢复副本，不依赖先成功覆盖原存储位置。

## 4. 任务清单

每项任务采用“先给出有意义的失败用例 → 最小实现 → 定向验证 → 提交”的顺序。测试代码细节由实施者按下述断言写，不能通过删除断言或降低产品规则得到绿色结果。提交只包含任务所有文件；有其他人的改动时保留并协调，不回滚。

### T01：固定依赖并跑通本地 Windows 画布

**Files:** 创建 package.json、pnpm-lock.yaml、tsconfig.json、vite.config.ts、vitest.config.ts、playwright.config.ts、playwright.desktop.config.ts、electron-builder.yml、index.html、src/main/index.ts、src/preload/index.ts、src/shared/contracts.ts、src/renderer/main.tsx、editor/EditorHost.tsx、editor/adapter.ts、editor/engine-snapshot.ts（后三者在 src/renderer 下）、vendor/README.md、scripts/build-editor.mjs、docs/engineering/dependency-baseline.md；测试 tests/desktop/bootstrap.spec.ts、tests/integration/snapshot.test.ts。

**Interfaces:** 产出 EngineScene、EditorAdapter 的 load/serialize/onDocumentChange 基础实现和 DesktopApi 隔离外壳；后续不得直接绕过适配层操作私有 App 状态。

- [ ] 核验本机工具与官方稳定版本，记录精确依赖/peerDependencies；导入固定上游快照，按其声明的锁文件与构建方式打包，scripts/build-editor.mjs 固化核实过的步骤；不擅自替换上游包管理器。
- [ ] 建立脚本：`dev`、`build`、`typecheck`、`test`=vitest run、`test:e2e`=playwright test、`test:desktop`=playwright test --config playwright.desktop.config.ts、`package:win`=electron-builder --win --x64。测试断言窗口能加载本地编辑器、画布无远程资源依赖、基础场景序列化保留 ID/文字/绑定；先确认无实现时失败原因正确。
- [ ] 实现最小有边框窗口、本地资源、隔离 preload 和唯一场景；不加入业务抽屉或云端入口。用两图形、一条线、一张图与中文作为固定样例。
- [ ] 执行 `pnpm typecheck`、`pnpm test -- tests/integration/snapshot.test.ts`、`pnpm build`、`pnpm test:desktop -- tests/desktop/bootstrap.spec.ts`，全部通过；断网后手动打开同一构建检查字体与图像。命令输出及未测项写入 docs/validation/p0-evidence.md。
- [ ] 初始化本地 Git（仅在仍不存在时），提交现有文档基线及本任务受控文件，提交名 `build: establish offline desktop editor baseline`；不包含缓存、运行数据或下载凭据。

### T02：验证直接松手与停顿规整可控

**Files:** 已有 src/renderer/ink/gesture.ts、recognizer.ts、SmartPenLayer.tsx；src/renderer/editor/adapter.ts；tests/unit/gesture.test.ts、tests/integration/ink-adapter.test.ts、tests/desktop/smart-pen.spec.ts；拟新增 tests/integration/recognizer-cases.test.ts 与缺失的 tests/fixtures/strokes/*.json；docs/validation/p0-evidence.md。

**Interfaces:** 消费 T01 Adapter；实现 createGesture 与 recognize；原始点、候选、strokeToken 分离。

- [ ] **GZ08 实际分类回归**：从研究目录的 gazboard-recognizer-probe.json 按明确坐标公式建立独立合成 fixtures，在 tests/integration/recognizer-cases.test.ts 调用当前真实 recognize 包装，不用注入假识别器的手势测试替代。断言 `circle_maps_to_ellipse`、`elongated_ellipse_preserves_aspect`（300×200、400×200、600×200）、`reverse_line_preserves_direction`、`unsupported_candidate_never_becomes_polygon`；保留矩形基准。小圆用于记录尺度拒绝边界，不照搬 GazBoard 的世界坐标阈值或把正确拒绝噪声当作失败。
- [ ] 先运行 `pnpm test -- tests/integration/recognizer-cases.test.ts` 记录当前结果；仅补分类差额，随后连同本任务手势/适配测试复验。可靠圆/椭圆仍拒绝或比例改变时记录具体缺口，不只凭“没有错误多边形”判通过。真实鼠标轨迹另存，合成探针不写成总体识别率。
- [ ] 写失败断言：`release_before_hold_keeps_ink`、`hold_without_new_move_previews`、`continued_motion_resets_timer`、`four_strokes_never_merge`、`stale_timer_cannot_commit_next_stroke`、`unknown_keeps_ink`、`preview_does_not_mutate_document`。fake clock 分别推进 holdMs-1 与 holdMs，确认无提前提交；保存原点数量与顺序。
- [ ] 实现单笔状态机和分类器包装；通过 Adapter 预览/一次提交。用公开扩展先做，失败时记录确切阻碍再尝试最小源码补丁，不并存两个事件处理器。
- [ ] 执行 `pnpm test -- tests/unit/gesture.test.ts tests/integration/ink-adapter.test.ts`；用鼠标完成释放、停顿、慢画、近闭合、随意涂鸦，并记录视频/事件轨迹，评估候选参数而非直接固化它们。
- [ ] 将接管方式、改动文件、未知项写入 p0-evidence；提交 `feat: validate controlled smart pen lifecycle`。仅通过本任务不能宣称整体底座已通过。

### T03：验证命中、文字、连线及桌面门槛

**Files:** 已有 src/renderer/input/hit-policy.ts、TextEditor.tsx、src/renderer/ink/SmartPenLayer.tsx；src/renderer/editor/connection-policy.ts；src/main/index.ts；tests/integration/input-routing.test.ts、connections.test.ts；tests/desktop/core-interaction.spec.ts、lifecycle-export.spec.ts；拟新增 docs/engineering/adr-001-editor-and-shell.md；docs/validation/p0-evidence.md。后续 window/shortcuts 拆分归 T08，本任务不另建重复入口。

**Interfaces:** 实现 hitTest/beginText、指针分流和连接条件；不允许 pointer 回调与引擎内置处理重复提交同一笔。

- [ ] **GZ02/GZ08 P0 差额**：先检查已有 connections/input-routing/desktop 用例。补断言 `filled_shape_inside_still_draws`、`ime_composing_escape_keeps_session`、`ime_composing_ctrl_enter_does_not_submit`；确保智能笔规整直线使用已有 attachLine/Adapter 路径且一次提交，不新增 GazBoard connector。实际 Windows 候选字操作与 DOM 自动化分别记证据。
- [ ] 写失败断言：`inside_draws_border_moves`、`border_doubleclick_binds_text`、`inside_doubleclick_creates_independent_text_without_dots`、`raw_line_has_no_bindings`、`both_bound_adds_directional_arrow`、`empty_endpoint_creates_no_node`、`single_undo_removes_committed_shape`；对缩放 0.5/1/2/4 的屏幕命中结果一致性作断言。
- [ ] 接入真实 textarea 与组合输入保护；最小热键显示/隐藏、PNG 到测试打印页的 PDF 冒烟；新增 provenance 示例往返断言，证明后续来源字段不会被底座清洗掉。PDF 冒烟产物使用合成内容及临时测试目录。
- [ ] 执行 `pnpm test -- tests/integration/input-routing.test.ts tests/integration/connections.test.ts`、`pnpm test:desktop -- tests/desktop/core-interaction.spec.ts tests/desktop/lifecycle-export.spec.ts`；真实 Windows 中文输入法和其他应用焦点下热键实测，不能用 fill() 代替 IME 证据。
- [ ] 按技术设计第 9 节测暖唤出、进程重启、帧时、内存和 idle CPU；记录已测试设备与不可测项。在 adr-001 给出 PASS / FAIL / 未验证，公开 API / 受控补丁的选择及理由。只有全数硬门槛通过才能进入 P1；否则修复或重新选型，不能将未验证写成通过。
- [ ] 提交 `test: decide editor and desktop feasibility from evidence`，给用户展示可操作结果并收敛 A01/A02/A07；P0 没有获得操作体验反馈时记录该事实，不自称用户认可。

### T04：完整智能笔、原迹来源与恢复

**Files:** src/renderer/ink/provenance.ts、gesture.ts；src/renderer/editor/adapter.ts；tests/unit/provenance.test.ts、tests/integration/restore-ink.test.ts；docs/validation/p1-evidence.md。

**Interfaces:** 实现 restoreInk；provenance 写入对象 customData，与核心历史/复制/序列化同生命周期。

- [ ] **GZ08 历史边界**：沿用已有原迹来源和一次提交；验证规整前预览不写场景、恢复与撤销不丢来源。不得引入 GazBoard“先加 ink、再删 ink 加 shape”的双事务来旁路本项目的独立恢复动作。
- [ ] 写失败断言：平移/非等比缩放/旋转后恢复原迹位置正确；候选移动取消后仍是一笔；capture lost/失焦不丢已采集点；恢复前后一次 undo/redo 可完整往返；恢复不覆盖原始笔迹样式。
- [ ] 实现原迹变换与恢复事务，带绑定时按 A04 提示并保留文字/线位置；已被用户修订的 A04 以最新产品决策为准，同时更新本任务断言。
- [ ] 执行 `pnpm test -- tests/unit/provenance.test.ts tests/integration/restore-ink.test.ts`；人工验证连续绘制不会切回选择工具、恢复提示可以取消，提交 `feat: preserve and restore original ink`。

### T05：文字和连接的完整编辑生命周期

**Files:** 已有 src/renderer/input/TextEditor.tsx、src/renderer/ink/SmartPenLayer.tsx；src/renderer/editor/connection-policy.ts、adapter.ts；拟新增 tests/integration/text-binding.test.ts、connection-lifecycle.test.ts；tests/desktop/ime-checklist.md。

**Interfaces:** 消费 T04 事务与来源；标签、线仍使用原生绑定，不添加第二套关系表。

- [ ] **GZ02/GZ08 完整生命周期**：在 connection-lifecycle.test.ts 补 `deleted_target_keeps_free_endpoint_and_undo_restores_binding`、`copy_nodes_and_line_remaps_binding_ids`、`group_move_does_not_double_translate_line`；复用 Excalidraw 原生关系完成这些断言，不维护第二张 connector 表。在 ime-checklist.md 延续 T03 的 Esc/Ctrl+Enter 候选场景，增加图形标签、失焦和收起请求；已覆盖的测试直接引用。
- [ ] 写失败断言：输入 Enter 换行；composition 期间 Esc/单字母不提交绘图动作；取消箭头仍保持端点绑定；单端绑定不带默认箭头；重接/解绑保留可预期端点；节点与线一起移动不双重位移；删除/撤销恢复关系。
- [ ] 实现文字焦点、移动/缩放标签跟随、连接属性与重接；图形有标签和连线时恢复原迹不删除任何内容，undo 返回原关系。
- [ ] 执行 `pnpm test -- tests/integration/text-binding.test.ts tests/integration/connection-lifecycle.test.ts`；按 ime-checklist 在真实输入法候选、中文换行、切换应用后验证，记录结果；提交 `feat: complete text and connector editing`。

### T06：组合、对齐和明确命名区域

**Files:** src/renderer/editor/region-policy.ts；src/renderer/ui/ContextBar.tsx；tests/integration/layout-region.test.ts；tests/e2e/page-layout.spec.ts。

**Interfaces:** 区域沿用 frameId；提供 createRegionFromSelection、add/removeMembers、moveRegion、resizeRegionBoundary 产品动作，输入均为明确对象 ID/世界坐标。

- [ ] 对照 GazBoard 命名组合的限制，确认本任务仍使用独立区域身份/边界；命名组合、普通大矩形与区域不可互换。对齐/分布/组合优先复用 Excalidraw，不因参考 GazBoard 再实现一套；成员规则仍按待收敛的 A06 验证。
- [ ] 写失败断言：大矩形内画内容不自动归组；组合/解组不换 ID；对齐/等距可撤销；区域移动带成员一次；改边界不缩放成员；视觉包围不自动纳入；跨区域连线不重复移动。
- [ ] 复用核心选择/对齐/组合，接入区域标题和显式成员动作；按 A06 不做嵌套或自动 reparent。产品 UI 禁止让原生默认行为悄悄旁路本策略。
- [ ] 执行 `pnpm test -- tests/integration/layout-region.test.ts`、`pnpm test:e2e -- tests/e2e/page-layout.spec.ts`；完成“导航+卡片+按钮+文字”的低保真页面实例，提交 `feat: support static layouts and named regions`。

### T07：本地仓库、保存队列与损坏恢复

**Files:** src/main/storage/board-repository.ts、atomic-write.ts、asset-store.ts；src/renderer/boards/save-queue.ts；src/main/ipc.ts；tests/integration/board-repository.test.ts、save-queue.test.ts、recovery.test.ts；tests/fixtures/boards/*。

**Interfaces:** 实现 BoardRepository 与 SaveQueue；SaveRequest/Ack 按第 3 节；用户数据根由主进程解析，测试必须注入独立临时根。

- [ ] **GZ04 故障回归**：扩展已有保存/恢复用例，明确检查 `rename_failure_preserves_previous_bytes`、`old_save_ack_cannot_clear_new_edit`、`missing_asset_keeps_reference_without_blank_overwrite`、`catalog_failure_does_not_undo_saved_head`；注入失败后读取旧文件字节和当前内存状态。没有匹配修订确认不能显示“已保存”，不得把 rename 失败回退为直接 writeFile 原件。
- [ ] 写失败断言：在途保存后继续编辑不会被旧 ack 标成已保存；baseRevision 冲突不覆盖；资产写失败保留旧 head；head 替换失败保留旧文件；commit 后回执丢失用 opId 识别；坏 head 只恢复有效 backup；未知版本不变空白；catalog 可从 head 重建。
- [ ] 实现按画布串行化、资产先写、验证/备份/替换、回执与可重试错误；快照只保存完成的对象。保留损坏文件，不自动清理可能被 head/backup 引用的资产。
- [ ] 执行 `pnpm test -- tests/integration/board-repository.test.ts tests/integration/save-queue.test.ts tests/integration/recovery.test.ts`；故障注入覆盖每个写入边界及 Windows 文件占用，观察“已保存”与实际文件一致；提交 `feat: persist boards with recoverable saves`。

### T08：最近画布、窗口和快开生命周期

**Files:** src/renderer/boards/session.ts；src/renderer/ui/RecentBoards.tsx、DocumentBar.tsx、Status.tsx；src/main/window.ts、shortcuts.ts、tray.ts、settings.ts；tests/integration/board-session.test.ts；tests/desktop/lifecycle.spec.ts。

**Interfaces:** 消费 Repository/SaveQueue；每次打开有独立请求代次，DesktopApi 的 requestHide 先完成文字/笔画结算和 flush。

- [ ] **GZ01 最近与搜索**：在 board-session.test.ts 覆盖 `recent_open_deduplicates_and_orders_by_last_opened`、`rename_updates_recent_and_search`、`missing_recent_ref_is_visible_and_never_opens_as_empty`。接既有 catalog/BoardSummary；若局部移植 recent.js 纯逻辑，去掉上游固定条数、settings 耦合并同时登记来源许可，不新增竞争最近索引。
- [ ] **GZ04/GZ05 生命周期**：补 `startup_restore_cannot_replace_explicitly_opened_board`、`resume_keeps_nondefault_zoom`、`failed_flush_cancels_switch_hide_and_quit`、`stale_lifecycle_ack_is_ignored`；旧 requestId 或失败回执不可确认退出，不复制固定等待 2 秒后无条件退出的策略。与 lifecycle 真机步骤一起检查窗口找回、焦点、热键释放；自动化未覆盖的 DPI/拔屏不得写通过。
- [ ] 写失败断言：新建保留旧画布；慢的旧 load 不覆盖新选择；按最近使用排序/搜索/重命名一致；切换/收起保存失败留在当前画布；恢复内容+相机；新热键注册失败保留原键及原设置，有可见错误和托盘入口；多次启动只有一个主窗口。
- [ ] 实现最近抽屉、X 收起/托盘退出候选、配置热键、真实保存状态；旧屏幕不存在时恢复可见窗口。完全退出释放监听与热键，用户数据不随退出清理。
- [ ] 执行 `pnpm test -- tests/integration/board-session.test.ts`、`pnpm test:desktop -- tests/desktop/lifecycle.spec.ts`；在其他应用聚焦时操作唤出/收起、正常退出重开、热键占用与修改设置；提交 `feat: resume boards through desktop lifecycle`。

### T09：图片输入与图形风格

**Files:** src/renderer/editor/style-policy.ts；src/renderer/ui/Settings.tsx；src/main/storage/asset-store.ts；src/renderer/input/image-import.ts；tests/integration/images-style.test.ts。

**Interfaces:** 图片入口统一 AssetInput/AssetRef；风格变更走核心一次事务，来源笔迹样式保持不变。

- [ ] 写失败断言：粘贴/拖入/文件选择进入同一路径；损坏或超限图片明确拒绝；图片离线重开可见；重复图片按哈希复用；风格切换不改 raw points/文字字体/颜色；重开后 seed 外观稳定。
- [ ] 实现 PNG/JPEG/WebP 三入口、选中移动缩放、标准/轻手绘设置及预览；按 A05 限定作用范围，禁止顺手加图片识别和远程素材服务。
- [ ] 执行 `pnpm test -- tests/integration/images-style.test.ts`；真实剪贴板粘贴并断网重开，有中文与图片的页面截图对照，提交 `feat: add offline images and drawing styles`。

### T10：可编辑文件与本地往返

**Files:** src/main/storage/editable-package.ts；src/main/ipc.ts；tests/integration/editable-package.test.ts；tests/fixtures/packages/*。

**Interfaces:** `encodeEditable(document:BoardDocument,assets:AssetInput[]):Promise<Uint8Array>`；`decodeEditable(bytes:Uint8Array):Promise<AppResult<{document:BoardDocument,assets:AssetInput[]}>>`；导入通过 Repository 创建新内部 UUID。

- [ ] **GZ03 快照与资产**：在 editable-package.test.ts 补 `export_freezes_memory_before_async_asset_resolution`、`missing_asset_blocks_export_without_erasing_reference`、`portable_file_has_no_machine_origin_path`；原路径保存失败但内存与资产完整时，另选目标导出的文件必须包含未保存修改。先前 T07/T09 已有资产校验直接复用，不另接 GazBoard 资源仓库或 .gazboard 文件身份。
- [ ] 写失败断言：导出再导入保留所有图形、标签/线、区域、图片、provenance；自动保存失败后导出仍包含当前内存修改；原画布不覆盖；拒绝路径穿越/重复条目/伪哈希/解压超限/缺失图片/高版本；取消对话框不出现失败通知。
- [ ] 选择并锁定许可兼容的 ZIP 库，实现受限解包和临时目录清理；完整验证后才创建画布记录，失败不污染最近列表。
- [ ] 执行 `pnpm test -- tests/integration/editable-package.test.ts`；把合成文件复制到独立测试数据目录离线打开并继续编辑，提交 `feat: round trip editable board files`。

### T11：复制图片、PNG 和 PDF

**Files:** src/renderer/export/prepare-export.ts；src/main/export-service.ts；src/renderer/ui/ExportDialog.tsx；src/print/index.html、render.ts；tests/integration/export.test.ts；tests/desktop/export.spec.ts。

**Interfaces:** EditorAdapter.exportRaster 消费 ExportRequest；主进程接收 RasterResult 并控制保存对话框或 clipboard.writeImage；打印模板不接受任意 HTML/URL。

- [ ] **GZ03 共用静态结果**：在 export.test.ts 核对同 scope/倍率/背景下剪贴板与 PNG 共用 RasterResult，PDF 嵌入同一图像而非再次读取可变场景；补 `async_font_or_image_load_keeps_start_snapshot`、`missing_resource_never_reports_success`。对话框取消、写入失败、另存重试要分别断言，沿用现有 8192px/32MP 方案限制，不照搬上游静默缩小或裁切。
- [ ] 写失败断言：选区/区域/全部的边界正确；空画布无假输出；超限要求修改参数；导出取开始时快照，不混入后续编辑/预览/指示点；取消无残缺目标文件；中文和图片资源完整。
- [ ] 实现共同范围预览、PNG、系统图片剪贴板和单页栅格 PDF；按原型参数说明实际尺寸和纸张。只在所有字形/图片准备完成后输出。
- [ ] 执行 `pnpm test -- tests/integration/export.test.ts`、`pnpm test:desktop -- tests/desktop/export.spec.ts`；将剪贴板粘贴到独立图像应用、实际打开 PNG/PDF 检查字体和裁切，不能只验证文件非空；提交 `feat: deliver image and pdf exports`。

### T12：展示模式与完整工作区

**Files:** src/renderer/presentation/controller.ts；src/renderer/ui/App.tsx、ToolPalette.tsx、ContextBar.tsx、styles/tokens.css、styles/workspace.css；tests/e2e/presentation.spec.ts、workspace.spec.ts；docs/validation/visual-review.md。

**Interfaces:** 展示仅修改会话 UI/相机，保存编辑前 viewport/tool；指示层不写场景；工作区只调用已有产品动作。

- [ ] **GZ06/GZ07 展示和 GUI**：复用“临时指示 + 按需 UI”机制；补 `present_pointer_never_changes_scene_or_history`、`present_paste_delete_and_drag_do_not_edit`、`hidden_window_stops_pointer_animation`。取展示前后 scene/history 快照并检查导出图无指示；工具条仍在上方，最近入口仍为抽屉，不复制教学功能和品牌资源。
- [ ] 写失败断言：展示中鼠标与 Delete 不改文档；退出恢复视角/工具；指示不在导出中；弹窗/IME/展示的 Esc 优先级正确；工具条和最近抽屉在窄窗口仍可操作。
- [ ] 按认可草图组织主窗口与所有按需面板，提供键盘焦点/控件名称；只显示已实现功能。落地展示当前视角和指定区域入口。
- [ ] 执行 `pnpm test:e2e -- tests/e2e/presentation.spec.ts tests/e2e/workspace.spec.ts`；在 1280×720、1440×900、900×650 窗口及 100%/150%/200% 缩放截图，记录逻辑/物理尺寸；与同状态参考比较布局、密度、中文、反馈；提交 `feat: complete presentation and focused workspace`。

### T13：完整回归、性能和异常验收

**Files:** tests/e2e/full-journey.spec.ts；tests/desktop/acceptance.spec.ts；tests/fixtures/scenes/*；docs/validation/acceptance-matrix.md、performance.md、known-limitations.md。

**Interfaces:** 不新增产品服务；使用冻结版本和阶段实现，错误修复回到责任模块并保留回归。

- [ ] 复核 GZ01–GZ08 的采用记录和对应 V 场景：合成分类、组件/Electron 自动化、真实 Windows 操作分别给出结果。缺少实测不得用 GazBoard 上游 CI 或本项目历史 PASS 填补；已稳定通过且未变的路径引用原证据，受影响路径按本轮修改复验。
- [ ] 为 V01–V17 建立执行记录：代码测试、实际运行、图片/文件、环境、结果、未覆盖项分栏；独立验证真实混合 DPI/拔屏，只有模拟条件时标未验证。
- [ ] 执行 `pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e`、`pnpm test:desktop`；跑完整唤出到收起流程，加入正常退出重开、保存失败和可编辑文件往返。
- [ ] 对 S/1000/10,000 对象场景测量冷/暖启动、帧时、保存/导出阻塞、总内存/后台 CPU；按技术设计说明测量边界。阻塞性失败修复后只复测受影响路径与完整核心流程；未验证项不写 PASS。
- [ ] 汇总 A01–A09 的体验结果及变化，用户已明确接受的细化才更新产品设计决策；提交 `test: verify desktop product acceptance`。

### T14：打包、安装与交付说明

**Files:** electron-builder.yml；docs/engineering/build-and-release.md、third-party-notices.md；docs/user-guide.md；docs/validation/install-evidence.md；README.md。

**Interfaces:** 从 T13 通过的同一提交与锁文件构建，不从混有无关修改的工作区随意出包；签名身份仅由实际环境提供。

- [ ] 汇总实际采用的 GZ 项与 third-party-notices：机制参考标“无源码复制”；源码移植核对固定 SHA/原路径/目标路径/改动和版权声明；逐项核对随附字体/图标/依赖。确认没有 GazBoard 整应用运行依赖、品牌印记或未纳入范围的教学/同步功能。此处是复核，源码采用时就应已登记。
- [ ] 核对源码/依赖/字体/图标许可与上游补丁，生产资源全部本地；执行 `pnpm install --frozen-lockfile`、`pnpm build`、`pnpm package:win`，记录源提交、锁文件摘要、产物 SHA-256 和工具版本。
- [ ] 在 Windows 11 x64 普通用户环境安装，断网完成主要流程；确认重启恢复、热键释放、窗口位置、文件输出和无开发工具依赖。未取得干净目标环境则清楚标记限制，不把开发机运行当安装验收。
- [ ] 交付安装包、操作说明、已知限制和验收证据。未签名包标为内部测试版；不自动发布外网、上传商店或购买证书。提交 `docs: document verified windows delivery`。

## 5. 产品覆盖核对

| 产品规则/验收 | 责任任务 |
| --- | --- |
| D01、D03 / V09、V17 鼠标键盘、中文、窗口与 DPI | T01、T03、T05、T08、T13 |
| D02、D04、D17、D18 / V01、V02、V15 唤出、新建、恢复、保存、最近 | T07、T08、T13、T14 |
| D06–D11 / V03–V06 智能笔、单笔、原迹、连续绘制 | T02、T03、T04 |
| D12–D15 / V07–V11 命中、文字、关系 | T03、T05 |
| D05、D16 / V12 无限画布、区域和页面布局 | T01、T06、T09 |
| D19 / V14 三类交付 | T10、T11、T13 |
| D20 / V13 展示与临时指示 | T12、T13 |
| D21 / V16 标准和轻手绘 | T09 |
| D22、D23 范围控制与轻量 UI | T01、T12、T14 |

## 6. 当前状态与执行交接

**2026-10-20 修订：用户确认继续现有方案，本轮只完成 GazBoard 借鉴项的文档落位。** 本计划保留 14 个 T 任务和原有 P0–P3 门槛，新增 GZ01–GZ08 的采用边界与验收案例。复选框表示计划要求，不能凭空白框推断实施分支没有做，也没有因补充参考就把任何任务勾为完成。

实施分支先读技术设计第 2.1 节、本计划第 1.1/1.2 节，再进入正在实施的 T 任务。2026-10-20 本次核对的 HEAD 为 `9e1ef56`（T02 智能笔提交），已有 T01/T02 提交与 T03 工作区修改；当前完成情况以 [P0 证据](../../validation/p0-evidence.md)、实时代码和新鲜验收结果核对。本次未重跑测试，不将旧记录的“T02 进行中”或提交名称直接换算为完整 PASS。

交接顺序：

1. 保留实施分支已有代码、未提交修改和执行方式，先比对已有用例；T01 不重建工程，T02/T03 只补本次 GZ 发现的相关缺口。
2. 在各阶段 evidence 记录 GZ 采用方式、目标文件、测试和未验证项；源码移植同时登记 third-party-notices。
3. P0 尚未满足的硬门槛继续完成；只有 P0 全部通过后才进入 P1。借鉴项不能成为提前跳过核心验收的理由，也不能为复制参考实现而推翻已通过的契约。
4. 后续按 T07/T08 保存与恢复、T10/T11 导出、T12 展示/GUI 的原依赖推进；A01–A09 仍按体验验证收敛。

这次修改不代表已通知其他聊天、实施者已读或已开始执行新增项。若实施分支使用独立 worktree，交接时同步本次两个方案文档，以及其引用的 docs/research/2026-10-19/gazboard-fit-gap-and-adaptation-assessment.md 和 gazboard-recognizer-probe.json，先核对链接与固定提交，再按同一 T 编号继续；不携带当前其他人的未提交源码，不重放历史任务。
