# 画布底座与编辑器源码研究

研究日期：2026-10-19；最后取证时间约 06:42 UTC / 14:42 北京时间。产品基线为 [DrawingBoard v1.0](../../superpowers/specs/2026-10-19-drawingboard-product-design.md)。本文只记录研究，不代表技术栈已经选定。

证据等级：本轮实时读取 GitHub 仓库元数据、README、许可证及固定提交的源代码；未安装依赖、未构建这些项目、未运行它们的测试。本文中的算法或交互结论是源码行为，不是识别准确率、Windows 启动速度或端到端验收结果。主报告若另有现场截图，应按其实际采集状态说明。

## 1. 结论先行

1. **Excalidraw 是最值得先做适配验证的免费开源整套底座**：对象、笔迹、图形标签、端点绑定、撤销、区域、图像导出已经存在，MIT 允许商业使用和修改。但“可嵌入包”不等于“已提供任意交互策略注入”。本次最新源码甚至已有 `autoshape`，其交互规则却与本产品有数处直接冲突，不能只开开关交付。
2. **tldraw 是扩展架构最适合对照的 SDK**：`StateNode`、`ShapeUtil`、`BindingUtil`、历史标记和文档/会话快照分离，很适合自主编写智能笔与命中分工。但当前 SDK 不是 MIT；默认许可证禁止生产环境，实际生产部署需另外许可。是否选择它，必须把授权条件和离线约束一起评估。
3. **maxGraph 更适合借鉴关系模型、连接约束、撤销事务和 XML 编解码**，或作为节点编辑方向的候选。它不是拿来即用的自由手绘白板；若选它做底座，智能笔和笔迹对象的工作更多。
4. **draw.io 更适合借鉴成熟文件管理、保存冲突处理、桌面导出链路**。完整应用的功能与集成面较大，直接分叉会带入本项目暂不需要的复杂度。须分别阅读源码许可证、素材使用条款与当前生产产品说明。

上述排序是针对当前产品的工程判断，不是按 Stars 判断质量；没有进行性能基准测试。

## 2. 实时仓库状态与固定版本

数据来自本轮 GitHub connector `fetch` 返回的仓库 REST JSON；`pushed_at` 不等于最后一次正式发版。Stars 会在同一研究时段变化；tldraw 较早 web 返回 50,973，后续 connector 返回 50,976，下表采用后者，不把差值当作错误。

| 项目 | Stars 快照 | archived | pushed_at (UTC) | 本轮源码提交 |
| --- | ---: | --- | --- | --- |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | 134,138 | false | 2026-10-18 18:24:19 | [`e1b7aacb356a492aa1e0fc6eb57b8896124027f0`](https://github.com/excalidraw/excalidraw/commit/e1b7aacb356a492aa1e0fc6eb57b8896124027f0)（master） |
| [tldraw](https://github.com/tldraw/tldraw) | 50,976 | false | 2026-10-18 09:46:46 | [`8a7b1a65ab4c7365319614ffef68590dee23f305`](https://github.com/tldraw/tldraw/commit/8a7b1a65ab4c7365319614ffef68590dee23f305)（main） |
| [draw.io](https://github.com/jgraph/drawio) | 8,856 | false | 2026-10-18 10:53:15 | [`17b367b91dbab91804f852645788d7ffb46dcb79`](https://github.com/jgraph/drawio/commit/17b367b91dbab91804f852645788d7ffb46dcb79)（dev，提交说明 32.5.5 release） |
| [maxGraph](https://github.com/maxGraph/maxGraph) | 1,150 | false | 2026-10-16 05:00:23 | [`bee0bb3f1488600100f2377506e549e33c3953e8`](https://github.com/maxGraph/maxGraph/commit/bee0bb3f1488600100f2377506e549e33c3953e8)（main） |

本轮本地 PowerShell REST / git 读取遇到 EOF、SSL_ERROR_SYSCALL 和证书吊销服务离线；未关闭证书校验。之后使用 web 和 GitHub connector 读取成功。临时网络失败不作为项目可用性判断。

### 默认分支不等于已发布 SDK

本轮 GitHub Releases 页面把 Excalidraw **v0.18.1** 标为 Latest；tldraw `/releases/latest` 跳到 **v5.5.2**；maxGraph 跳到 **v0.25.0**。这是 GitHub release 页面证据，不是本轮完成 npm 包安装或验证 npm dist-tag 的结果。[Excalidraw releases](https://github.com/excalidraw/excalidraw/releases)、[tldraw v5.5.2](https://github.com/tldraw/tldraw/releases/tag/v5.5.2)、[maxGraph v0.25.0](https://github.com/maxGraph/maxGraph/releases/tag/v0.25.0)。npm 页面返回 403，registry latest 接口本轮未成功读取，因此不把 npm 当前 latest 写成已核实。

Excalidraw 的差异有直接源码证据：本轮 master [package.json](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/package.json) 的 version 字段仍是 `0.18.0`，不能仅凭这一字段推定发布状态；**v0.18.1 标签的 [index.tsx:219](https://github.com/excalidraw/excalidraw/blob/v0.18.1/packages/excalidraw/index.tsx#L219) 仍导出 exportToCanvas / exportToBlob / exportToSvg / exportToClipboard**，而本次 master 提交统一成 `exportScene`。下文的 autoshape、受控 activeTool 和新导出接口均明确限定本轮 master 提交，不能承诺 `npm install @excalidraw/excalidraw` 已经包含这些新行为。选择稳定包、固定预发布包或源码 fork 后，必须针对所选版本重新核对 API 和许可证。

## 3. Excalidraw：优先做适配验证，而非直接认定满足产品

### 3.1 值得复用的源码机制

| 关注点 | 本轮实际读到的机制 | 固定源码入口 |
| --- | --- | --- |
| 对象模型 | 通用元素包含 `groupIds`、`frameId`、`boundElements`、`customData`；文字的 `containerId` 与普通文本分开；自由笔迹保存 `points` 和 `pressures`。适合保留“原迹对象/规整结果/图形标签/命名区域”之间的区别。`customData` 可作为原迹关联元信息候选，但文件升级和体积仍需设计。 | [types.ts](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/types.ts#L73)，[文字与笔迹](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/types.ts#L270) |
| 绑定连接线 | `bindBindingElement` 写入端点绑定；`FixedPointBinding` 保存目标和相对锚点；`updateBoundElements` 处理目标平移、旋转、缩放后的端点更新，避免同时移动的箭头重复位移；解绑还维护目标的反向引用。不是“每次画一条看起来连接的线”。 | [bindBindingElement](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/binding.ts#L1141)，[updateBoundElements](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/binding.ts#L1321) |
| 撤销 | `History.record` 保存反向 `HistoryDelta`，不重复记录历史回放；只有元素变化才清空 redo，单纯取消选择不会销毁 redo。`perform` 可跳过没有可见变化的历史项。可借鉴“用户可理解的一步”与内部临时状态分离。 | [history.ts](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/history.ts#L90) |
| 区域 | `frameId` 是显式关系；`getFrameChildren`、`addElementsToFrame`、`removeElementsFromFrame`、`updateFrameMembershipOfSelectedElements` 管理成员，导出有 frame clipping。既可借成员模型，也必须评估自动纳入规则是否违背本产品。 | [frame.ts](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/frame.ts#L268)，[成员更新](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/frame.ts#L570) |
| 文字 | 绘制文字之上覆盖真实 HTML `textarea`，使用浏览器编辑能力；Ctrl+Enter 与 Tab 分支检查 `isComposing`。但本次 Esc 分支直接 `handleSubmit()`，没有相同组合输入检查；只能判定这里存在适配/验证点，不能据此声称中文输入法已实测有故障。 | [textWysiwyg.tsx:529](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/wysiwyg/textWysiwyg.tsx#L529)，[键盘分支:853](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/wysiwyg/textWysiwyg.tsx#L853) |
| 导出 | 该提交刚统一为 `exportScene({type,data,config})`，类型为 canvas / png / jpeg / svg，并保留 `exportToClipboard`；PNG/SVG 可嵌场景。此接口列表没有 PDF，PDF 链路需另实现或借桌面打印能力。不可沿用旧文章的公开 `exportToSvg/exportToCanvas` API 名称来描述该提交。 | [scene/export.ts:1243](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/scene/export.ts#L1243)，[本次 API 变更提交](https://github.com/excalidraw/excalidraw/commit/e1b7aacb356a492aa1e0fc6eb57b8896124027f0) |
| 本地保存 | showcase 应用 `LocalData` 把场景/状态放 localStorage，图片放 IndexedDB，带 debounce、flush 与保存暂停锁。README 明确“npm editor”和“excalidraw.com app”是不同层次，不能以嵌入组件已自带完整最近文件管理。Windows 退出落盘与恢复仍要自己验证。 | [LocalData.ts:117](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/excalidraw-app/data/LocalData.ts#L117)，[README](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/README.md) |

### 3.2 新增 autoshape 已存在，但不是产品要求的 hold-to-shape

实际链路：`App.handleCanvasPointerDown` → `AppDrawShape.handlePointerDown` → pointermove 时 `convertToShapeHandlePointerMoveFromPointerDown` → `actionFinalize` 调用 `AppDrawShape.finalize`。它按每一条手势取点，不需要生成式 AI。

算法在 [convertToShape.ts](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/convertToShape.ts#L91)：

- 弧长重采样到 64 点，减少鼠标慢速采样密集造成的统计偏差。
- 较大包围盒边乘缩放值小于 25 屏幕像素时不尝试识别；这只是上游参数，不是本产品已认可阈值。
- 端点距离 / 笔迹长度大于 0.15 时按开放笔迹处理；通过细长程度、主轴偏度、笔迹对线杆偏离判定 line / arrow，否则为 freedraw。
- 闭合笔迹通过凸包面积比例、最强四个转角所占比、峰度乘积，对 rectangle / diamond / ellipse 原型做归一化距离判断；超限返回 freedraw。
- 图形位置、宽高来自原笔迹包围盒；矩形与菱形分类有方向性，不是全面旋转不变。不是任意形状识别器，也未在本项目鼠标样本上测准确率。

| 当前上游行为 | 与 DrawingBoard 的差异 | 定位 |
| --- | --- | --- |
| pointermove 持续重算预览；结束时即识别/插入 | 需增加“末端静止 + 持续按住”的门控，直接松手必须保留原迹；不能简单延长总按住时间 | [移动预览:767](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/convertToShape.ts#L767)，[finalize:222](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/components/App.drawshape.ts#L222) |
| 分类器能返回 freedraw，但 `convertToShape` 没有 freedraw 分支，最后 `undefined`；finalize 仅插入存在的 detectedElement | 未识别原迹不能依赖此工具路径自动保留。须保留原始点集并显式落为笔迹；恢复笔迹也要有独立数据。此结论来自所读调用链，不是全站所有 free-draw 行为 | [转换结尾:727](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/convertToShape.ts#L727)，[finalize](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/components/App.drawshape.ts#L222) |
| `maybeUpgradeLineToArrow` 至少一端命中图形、且两端不是同一目标，就可升级箭头 | 本产品为双端都绑定才默认箭头，需改变条件并保留起笔→终点方向 | [升级逻辑:171](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/components/App.drawshape.ts#L171) |
| autoshape 模式在图形内部双击也绑定图形标签；Alt 是独立文字逃生路径 | 本产品内部空白双击应创建独立文字，边框双击才是标签；不能要求用户用 Alt 才获得已确认主行为 | [App.tsx:6378](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/components/App.tsx#L6378) |
| 转换时寻找包围笔迹的 frame，并写入 `frameId` | 本产品不允许普通大矩形自动成为容器；命名区域的归属也需明确业务规则。上游 frame 与 rectangle 已分类型，但区域自动纳入机制仍要适配 | [convertToShape.ts:553](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/convertToShape.ts#L553) |

读到的 [drawShape.test.tsx](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/tests/drawShape.test.tsx) 包含普通释放提交、单端图形到空白升级箭头、内部绑定文字、Alt 双击独立文字等用例（分别约 410、290、619、679 行），支持上述“这是上游设计，而非本项目需求”的区分；本轮未运行这些用例。

### 3.3 公开 API 能否实现完整智能笔？

**已核实的扩展入口**：公开 `ExcalidrawProps.activeTool` 支持 `{type:'custom',customType}`；API 有 `setActiveTool`、`updateScene`、`mutateElement`、`onPointerDown`、`onPointerUp`，props 有场景坐标型 `onPointerUpdate`；API down/up 回调额外带原生事件。[公开类型](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/types.ts#L995)，[ImperativeAPI](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/types.ts#L1364)。

**关键限制**：`custom` 的 pointerdown 分支本身只设置光标；公开 down 回调在内置工具的处理之后触发。回调类型是 `void`，不是取消/替换内置事件的返回协议；`onPointerUpdate` 是光标广播形态，不是与 tldraw 等价的可注册 Tool 类。内置命中、拖动、双击规则分别在 App 内部。因而不能声称给 freedraw 加两个事件回调即可完整覆写语义。[custom 分支与回调顺序](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/components/App.tsx#L7830)，[命中实现](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/components/App.tsx#L6081)。

**工程推断而非已验证实现**：可以先以 custom 工具加宿主指针控制层，实现采样、hold 状态机、自有命中、原迹/图形提交，并复用已有 scene/render/export。若完整实现“内部画、边框移动、同笔预览、中文 Esc、双击分工、绑定与撤销一致性”必须依赖非公开 `App` 内部状态，合理路线是维护小范围 fork；目前没有运行 PoC，不能提前宣布一定无需 fork，也不应宣布一定只能重写整个编辑器。先以这六项为门槛验证公开 API 方案，再决定接入方式。

### 3.4 许可

固定提交的 [LICENSE](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/LICENSE) 是 MIT：允许使用、修改、分发、再许可及销售，须在副本或实质部分保留版权和许可声明。依赖、字体与品牌仍按各自条款处理；未逐项审计所有第三方依赖。本说明只陈述本次读取的条款事实。

## 4. tldraw：扩展设计最值得学，但许可是选择条件

### 4.1 可直接定位的架构

| 机制 | 源码事实与对本产品的意义 | 固定入口 |
| --- | --- | --- |
| 工具状态机 | `TldrawEditor` 接受 `tools`；`StateNode.transition` 管理子状态 enter/exit，`handleEvent` 分发到当前活动子状态，有 pointer down/move/up、key down/up、cancel 等回调。适合把智能笔拆为 idle/drawing/hold-preview/moving/text，减少散落的布尔变量。 | [TldrawEditor props:126](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/packages/editor/src/lib/TldrawEditor.tsx#L126)，[StateNode:140](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/packages/editor/src/lib/editor/tools/StateNode.ts#L140) |
| 图形能力 | `ShapeUtil.getGeometry`、`canBind`、`canEdit`、`getClipPath`、`canReceiveNewChildrenOfType`、拖入拖出/缩放回调把几何和行为封装到图形类型；与“自定义形状只是画一张图”区别很大。可把普通几何对象与真正区域分开。 | [ShapeUtil.ts:204](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/packages/editor/src/lib/editor/shapes/ShapeUtil.ts#L204) |
| 绑定独立建模 | `ArrowBindingUtil` 用 `fromId`（箭头）/`toId`（被绑对象）、归一锚点、terminal 和生命周期处理关系变化；历史回放时避开重复调整，防止回放已包含的坐标被再改。 | [ArrowBindingUtil.ts:31](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/packages/tldraw/src/lib/bindings/arrow/ArrowBindingUtil.ts#L31) |
| 历史事务 | `HistoryManager` 累积 record diff，支持 batch、undo/redo、`bailToMark`、`squashToMark`、record/ignore 等模式。可借鉴“预览可取消，确认后一个撤销单元”，恢复原迹仍要独立保留原数据。 | [HistoryManager:97](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts#L97)，[bail/squash:254](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts#L254) |
| 命名区域 | `FrameShapeUtil` 有 name、w、h；`resizeChildren` 默认 false，正好是本产品“改区域边界不缩放内部内容”的候选参考。区域几何把边框与标题区别建模，父子层级在 TLShape 父对象类型中区分 page 和 shape。自动 reparent 是否适合本项目需专门调整。 | [FrameShapeUtil:62](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/packages/tldraw/src/lib/shapes/frame/FrameShapeUtil.tsx#L62)，[TLParentId](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/packages/tlschema/src/records/TLShape.ts#L262) |
| 持久化快照 | `TLEditorSnapshot` 分 document 与 session；`loadSnapshot` 迁移旧 store schema，并保留指定会话状态；`getSnapshot` 分别收集文档和会话。适合区分内容、相机位置、临时工具状态，不能把全部 UI 状态无差别写进作品。 | [TLEditorSnapshot.ts](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/packages/editor/src/lib/config/TLEditorSnapshot.ts#L11) |

本轮没有深入验证 tldraw 的中文 IME、PDF、磁盘原子保存，也没有测冷启动。`persistenceKey` 存在不等于 Windows 本地文件完整性与最近画布管理已解决。

### 4.2 许可事实

当前 [LICENSE.md](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/LICENSE.md) 允许内部开发环境使用、修改、随应用打包，但默认禁止 Production Environment；后者定义包括向最终用户提供功能，不限云服务，因此不能假定离线 Windows 桌面天然豁免。试用和独立商业协议可在其规定期限内允许生产；不得修改许可检查机制；条款还说明可能为许可合规收集/传输使用数据。这里没有验证具体部署是否发送数据，也没有声称其离线运行必然失败。

[README](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/README.md) 中 starter kits 是 MIT 的说明，**不能推导 SDK 本身也是 MIT**。现阶段可作为架构研究与开发期原型候选；生产前核清许可费用、期限、离线和分发条件。本文不提供法律结论或报价。

## 5. maxGraph：连接图模型与事务比整套产品更有价值

[README](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/README.md) 将其定位为交互式 diagram 应用库，并声明源于停止开发的 mxGraph，但 API 不完全兼容。不要把 draw.io、mxGraph 与 maxGraph 当成同一个可互换 npm 包。

| 机制 | 实际源码与借鉴点 | 固定入口 |
| --- | --- | --- |
| 节点/边/层级 | `Cell` 明确区分 vertex/edge，含 parent/children、source/target、反向 edges 与 geometry。图形、连线、组合在同一模型中，关系不是凭像素距离重新猜。 | [Cell.ts:110](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/packages/core/src/view/cell/Cell.ts#L110) |
| 双端连线 | `ConnectionHandler.validateConnection` 与 `connect` 在创建前验证，`createTarget=false` 是默认值。它证明“不自动创建节点”能明确配置；但它仍是专用连接交互，不是已经支持本项目的单笔识别流程。 | [createTarget:278](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/packages/core/src/view/plugin/ConnectionHandler.ts#L278)，[connect:1662](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/packages/core/src/view/plugin/ConnectionHandler.ts#L1662) |
| 一次逻辑修改 | `GraphDataModel.batchUpdate` 用 try/finally 包住 begin/end；内层 atomic change 累计到 currentEdit，最外层结束发 undo 事件。源码明确这是一个可撤销单元、没有事务隔离，不能类比数据库自动回滚。 | [GraphDataModel.ts:943](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/packages/core/src/view/GraphDataModel.ts#L943) |
| 历史 | `UndoManager` 跟踪 history/indexOfNextAdd，undo/redo 跳到显著编辑，新增编辑清理未来 redo；默认容量 100 是上游参数。 | [UndoManager.ts:134](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/packages/core/src/view/undoable-change/UndoManager.ts#L134) |
| 可编辑格式 | `Codec.encode/decode`、`getObject/lookup` 恢复 ID 引用与 cell 结构，可作为图模型持久化思路。选择 XML 并不是本产品已经决定的文件格式。 | [Codec.ts:326](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/packages/core/src/serialization/Codec.ts#L326) |
| 文本 | `CellEditorHandler` 用 contentEditable div 覆盖图形，并维护位置/缩放。keydown Esc 调用 stopEditing 的分支没有局部 isComposing 检查，仍需 Windows 中文输入法验收；不应复制其 Esc 语义而忽略产品要求。 | [CellEditorHandler.ts:283](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/packages/core/src/view/plugin/CellEditorHandler.ts#L283)，[键盘:371](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/packages/core/src/view/plugin/CellEditorHandler.ts#L371) |

许可：[Apache-2.0](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/LICENSE)。该许可授予使用、修改、分发等权利，含专利许可与终止条款；再分发须提供许可证，修改文件须注明修改，并保留适用版权/NOTICE 等通知；商标权不随许可自动授予。第三方素材仍应单独核对。

与本产品的主要冲突是入口偏节点/边编辑，原始笔迹、几何识别、恢复笔迹、智能笔下的边框命中分工并非现成完整产品能力。更建议借模型和模块，不建议因为线连接功能成熟就默认整套选为手绘底座。

## 6. draw.io：文件可靠性与桌面导出值得拆开学

本轮重点读应用文件层而非重复 maxGraph 的图模型。

| 模块 | 实际机制 | 对本产品的启发与边界 |
| --- | --- | --- |
| [LocalFile.js:157](https://github.com/jgraph/drawio/blob/17b367b91dbab91804f852645788d7ffb46dcb79/src/main/webapp/js/diagramly/LocalFile.js#L157) | 浏览器文件句柄存在时先 createWritable，再生成数据，避免耗时处理错过用户激活许可窗口；保存期间写草稿；比较 lastModified 防覆盖外部更改；write+close 成功后更新描述、清 modified、移除草稿；失败尝试 abort | 保存状态应依据完成结果，不应刚排进 debounce 就显示“已保存”；磁盘冲突、失败和退出保存须测试。此文件使用浏览器 File System Access API，不是 Windows 桌面落盘实现证明 |
| [DrawioFile.js](https://github.com/jgraph/drawio/blob/17b367b91dbab91804f852645788d7ffb46dcb79/src/main/webapp/js/diagramly/DrawioFile.js) | 通用文件类，与 LocalFile 的继承、modified/shadowModified、草稿和保存流程衔接 | 可以学“当前内容仍在变化时保存快照”的状态管理；不要一开始引入其云后端、协作和账户集成复杂度 |
| [ElectronApp.js:2752](https://github.com/jgraph/drawio/blob/17b367b91dbab91804f852645788d7ffb46dcb79/src/main/webapp/js/diagramly/ElectronApp.js#L2752) | 桌面 `createDownloadRequest` 返回 mxElectronRequest('export',params)；`getEmbeddedPdf` 请求本地导出并接收主进程 PDF 字节，可含 diagram XML | 证明浏览器导出与桌面主进程可分层；PNG/PDF/可编辑文件应各验。该源码还有“PDF嵌XML可编辑”能力，但本产品目前只要求独立可编辑格式，不需为追平竞品扩大范围 |

### 许可与产品边界

本次 [LICENSE](https://github.com/jgraph/drawio/blob/17b367b91dbab91804f852645788d7ffb46dcb79/LICENSE) 为 Apache-2.0；但 [README](https://github.com/jgraph/drawio/blob/17b367b91dbab91804f852645788d7ffb46dcb79/README.md) 单独说明图标、stencil libraries 与 templates 的条款，禁止未经书面许可作为软件资产进入 Atlassian 产品/Marketplace 生态，该限制不适用于用户导出的图。README 同时称此仓库为评估用 test version，另有付费 production version，并限制商标使用。不能把这些文字简化为“所有资源 Apache、随意搬走”，也不能反过来仅据“生产版收费”断言 Apache 源码所有商用权利都被取消；需要分别处理源码、素材、品牌和发行产品。

## 7. 真实图片来源（非 AI 概念图）

下列 URL 均来自本轮实际读取的官方 README。这里只核对了来源引用，不声称图片对应当前提交的界面，更不把官方宣传图当本轮实际操作截图。远程图片不要为绕过显示限制而下载；主报告可优先使用本轮浏览器实拍。

| 项目 | 图片 | 来源 |
| --- | --- | --- |
| Excalidraw | [官方产品 showcase PNG](https://excalidraw.nyc3.cdn.digitaloceanspaces.com/github%2Fproduct_showcase.png) | [固定 README 中 Product showcase](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/README.md) |
| tldraw | [官方 GitHub hero light PNG](https://github.com/tldraw/tldraw/raw/main/assets/github-hero-light.png) | [固定 README](https://github.com/tldraw/tldraw/blob/8a7b1a65ab4c7365319614ffef68590dee23f305/README.md)。属于封面，可能不足以展示编辑器操作；优先使用主报告实拍 |
| maxGraph | [first-graph.gif](https://github.com/maxGraph/maxGraph/raw/bee0bb3f1488600100f2377506e549e33c3953e8/packages/website/docs/assets/getting-started/first-graph.gif) | [README Getting Started](https://github.com/maxGraph/maxGraph/blob/bee0bb3f1488600100f2377506e549e33c3953e8/README.md) 的官方 panning 示例；只是库示例，不冒充完整白板产品 |

## 8. 下一轮最小验证清单

这些是建议验证项，不是已执行工作，也不是已经获准开始编码。

1. 同一条鼠标笔迹：直接释放保留原迹；仅末尾静止按住出现预览；恢复移动取消预览；确认后一个撤销；不可识别原迹不丢。
2. 大矩形内部绘制、边框移动、控制点缩放、内部双击独立文字、边框双击标签；覆盖重叠和不同缩放比例，避免整块内部被命中成移动。
3. 两端绑定才按起笔方向给箭头；单端/空白不创建节点；移动、缩放、复制、删除、撤销后绑定仍一致。
4. 中文 IME 候选时 Esc/Enter 不提前提交或收起，退出编辑后常用快捷键恢复。
5. 原迹与规整结果/标签/绑定/区域/图片序列化后重新打开；保存失败不谎报成功；退出再打开确认内容及相机位置。
6. 导出 PNG 和 PDF 核对区域裁切、字体、背景、缩放、图片完整；不要以 API 返回 Blob 或 HTTP 200 代替查看成品。

建议先验证 Excalidraw 公共 API 自定义工具是否能维持这些规则；若必须依赖核心内部状态，再把“小范围 fork 成本”与 tldraw 的正式授权成本进行同尺度比较。当前阶段不应只因底座已有大量功能就承诺交互改造很简单。
