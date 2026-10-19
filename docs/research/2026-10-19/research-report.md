# DrawingBoard 开源实现与产品设计调研

研究日期：**2026-10-19**。范围：GitHub 源码、可复用机制、相似产品功能、交互与 GUI。配图见 [产品图片图册](product-gallery.md)，当前需求依据为 [产品设计 v1.0](../../superpowers/specs/2026-10-19-drawingboard-product-design.md)。本报告提出选型建议，**没有改变已确认需求，也没有开始应用开发**。

## 1. 结论：成熟画布可以复用，智能笔的操作规则需要自己掌握

不建议从零重做选择、缩放、文字、连线绑定、撤销、区域、图片和导出的全部能力。**优先验证 Excalidraw 是否能承载我们的交互；以 tldraw 作为有授权条件的架构备选；Windows 唤出和本地文件层单独研究。** 这是一条验证顺序，不是已经定案的技术栈。

最值得带回本项目的参考如下：

| 问题 | 优先参考 | 具体带回什么 | 结论性质 |
| --- | --- | --- | --- |
| 整套可编辑画布从哪里开始 | Excalidraw | 对象模型、标签、绑定连接、历史、区域、图像导出 | 源码已查；适配待做 |
| 怎样管理不同工具与复杂指针状态 | tldraw | StateNode、ShapeUtil、BindingUtil、可取消的历史操作 | 源码已查；生产授权有条件 |
| 随手画如何按意图变规整 | Concepts / Procreate + Excalidraw 分类器 | 末端停顿触发的产品先例；单笔重采样与几何分类 | 文档/源码已查；鼠标手感未测 |
| 原迹与规整如何都能保留 | Xournal++ | original/recognized 分开保存和替换撤销 | 机制参考；GPL 边界 |
| 笔迹顺滑与轻手绘风格 | perfect-freehand / Rough.js | 笔迹轮廓和已知几何的手绘呈现分工 | MIT 模块候选，避免重复集成 |
| 快开、托盘、恢复上次画布 | Penlight | 统一状态转换、热键生命周期、每板文件、相机恢复 | 源码已查；年轻项目，不能当成熟保证 |
| 界面怎样保持轻 | FigJam / Balsamiq / Allume | 操作分层、选中后属性、安静的内容背景 | 官方画面已核看；设计建议 |
| 页面区域怎样用于讲解和交付 | Miro / draw.io | 命名区域贯通定位展示导出；文件保存与桌面 PDF 链路 | 文档/关键源码已查 |

核心判断是：**我们的差异主要在输入与编辑规则的一致性，而不是画出一个矩形的能力。** 如果底座不能支持“内部继续画、边框可拖动、边框双击写标签、内部空白双击写独立文字”，再多图形库也不能补上这层体验。

## 2. 调研怎么做、证据到哪里为止

- 从产品的 23 项确认决策出发筛选目标，分别研究画布底座、智能笔算法、Windows 外壳、产品 GUI，未按 Stars 简单排序。
- 查询 GitHub 当前元数据，读取关键文件与许可正文，重要源码链接固定到提交。完整记录见四份来源笔记。
- 实际打开 Excalidraw 和 tldraw 网页，在空白研究画布完成基础图形、文字、连线操作并截图；没有上传用户业务内容。
- 对 11 个产品/项目实际查看了工作区或官方界面图；另外 4 个保留官方图片入口与未核看原因，详见图册。
- 没有安装这些桌面程序、运行上游测试、测识别准确率、启动耗时、内存或故障恢复。源码、官方宣称、图片观察和我们的推断分别记录。

因此，“适合参考”不等于“已经实现并符合 DrawingBoard”。当前也没有证据证明任一目标原样满足全部已确认规则。

## 3. GitHub 候选：按适配价值，而不是按热度

以下仓库与许可证信息核验于研究日；Stars 只作为关注度背景。更精确的提交、默认分支时间与 pushed_at 区别见来源笔记。

| 项目 | 许可与核验深度 | 建议用法 | 不适合直接照搬的部分 |
| --- | --- | --- | --- |
| [Excalidraw](https://github.com/excalidraw/excalidraw)，134,138 Stars | MIT；关键对象、识别、绑定、文字、历史、区域、导出源码 | **第一优先的整套底座验证** | 新 autoshape 的触发/文字/箭头语义不同；公开 API 能否完整改写仍待证明 |
| [tldraw](https://github.com/tldraw/tldraw)，50,976 Stars | 自定义 SDK 许可；关键扩展架构源码 | **有授权条件的备选**；工具与形状扩展结构对照 | 默认许可不允许生产环境，不能按旧 MIT 印象使用 |
| [maxGraph](https://github.com/maxGraph/maxGraph)，1,150 Stars | Apache-2.0；Cell、连接、事务、Codec 源码 | 节点/边模型、连接约束和编辑事务参考 | 专注图编辑，自由笔迹与智能笔需较多补充 |
| [draw.io](https://github.com/jgraph/drawio)，8,856 Stars | Apache-2.0 源码；另有素材/产品/品牌说明 | 保存冲突、草稿、本地导出链路参考 | 全量功能偏重；不能将所有图标/模板当成同样许可 |
| [perfect-freehand](https://github.com/steveruizok/perfect-freehand) | MIT；getStroke 与轮廓实现 | 原始笔迹渲染候选 | 不识别图形，不管理对象、撤销或文件 |
| [Rough.js](https://github.com/rough-stuff/rough) | MIT；几何绘制、随机种子实现 | 标准几何的轻手绘呈现 | 不从粗笔迹推断矩形；随机外观不能作为命中边界 |
| [Xournal++](https://github.com/xournalpp/xournalpp) | GPL v2 文本；识别调用链、几何、撤销源码 | 学习几何约束和原迹保留方式 | 当前调用链松手识别；结果仍为 Stroke；许可不同 |
| [Rnote](https://github.com/flxzt/rnote) | GPL-3.0-or-later；Shaper、笔迹和几何源码 | 原始/预测点分离、边界与命中区域分工 | Shaper 预先选择图形，不是自动分类智能笔 |
| [Google Ink Stroke Modeler](https://github.com/google/ink-stroke-modeler) | Apache-2.0；输入/平滑/预测接口 | 原生输入路线的备选模块 | C++20/Abseil 等成本；预测不应变成真实文档数据 |
| [OpenCV](https://github.com/opencv/opencv) | 4.13.0 源码根 Apache-2.0，具体文件头另查 | 椭圆/直线拟合的对照基线 | 拟合不等于分类；不为三个形状默认引入整个库 |
| [Penlight](https://github.com/Ramonvdo/penlight)，7 Stars | MIT；boards/hotkeys/tray 关键源码 | Windows 外壳与本地保存按模块借鉴 | 年轻项目；透明屏幕覆盖层与我们的普通窗口不同 |
| [gInk](https://github.com/geovens/gInk)，2,608 Stars | MIT 元数据/README；未深入源码 | 托盘唤出、预设笔、临时展示工具 | 不是语义图编辑器；README 有混合 DPI 已知问题 |
| [Lorien](https://github.com/mbrlabs/Lorien)，6,857 Stars | MIT 元数据/README；序列化源码读取未完成 | 无限画布、纯笔迹、无干扰模式参考 | 未确认标签/关系绑定；格式文档尚未写完 |

补充：[$1 / Protractor 原作者项目](https://depts.washington.edu/acelab/proj/dollar/)的 JS 实现有 New BSD 许可头，适合做单笔分类对照，但只返回类别、分数、耗时，不输出本产品需要的几何参数。[Stylus Labs Write](https://github.com/styluslabs/Write) 核对到 AGPL-3.0，未追完识别调用链，因此未列入直接复用推荐；ppInk 只确认了 gInk 作者指向的主线，未完成单独源码与许可核验。

**复用层级要区分。** MIT/Apache 项目仍需保留相关声明并核对实际引入的依赖/字体/资源；GPL/AGPL 不能视作可随意复制到不同许可产品的代码库；tldraw 应先核对实际生产授权条款。研究交互与架构思想不等于可以复制任何对应实现。

## 4. Excalidraw：最值得先验证，但有明确的交互冲突

固定源码提交：[`e1b7aac…`](https://github.com/excalidraw/excalidraw/commit/e1b7aacb356a492aa1e0fc6eb57b8896124027f0)。当前网页 More tools 已可见 Draw to shape；截图见图册。主分支也已有单笔识别源码，不能继续把“它只能用预选矩形工具”当作现状。

### 已有能力中，最省重复工作的部分

- **关系是真实对象关系。** 连接线保存目标 ID 和相对锚点，目标移动/缩放时更新端点，解绑还维护反向引用。可参考 [binding.ts](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/binding.ts#L1141)。
- **图形标签与独立文字分开。** 文字有 containerId，编辑通过真实 textarea；我们主要要改变进入编辑的手势，并验证中文输入法，而非重新发明文本编辑器。[textWysiwyg.tsx](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/wysiwyg/textWysiwyg.tsx#L529)
- **历史与画面临时状态分开。** HistoryDelta 处理修改；单纯取消选择不应破坏 redo。规整预览不能每一帧都成为用户需要撤销的一步。[history.ts](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/history.ts#L90)
- **区域有显式成员关系。** frameId 可参考，但是否自动纳入/移出成员应由我们规则决定。[frame.ts](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/frame.ts#L268)

### 不能忽略的差异

| 上游当前代码行为 | 我们的规则 | 适配意味着什么 |
| --- | --- | --- |
| 绘制过程中持续计算候选，松手结束识别 | 直接松手保留原迹；末端静止且按住才预览 | 自己管理停顿计时、指针状态与提交时机 |
| 未识别可返回 freedraw，但所读 autoshape 转换/提交路径不直接落下该结果 | 失败也不能丢原迹 | 显式保留原始点并处理失败回退；不是对全站自由笔工具的数据丢失结论 |
| 至少一端命中也可能把直线升级为箭头 | 两端均连接图形才默认箭头 | 修改规则，保留绘制方向和取消箭头能力 |
| autoshape 内部双击可进入绑定文字 | 边框双击是标签，内部空白双击是独立文字 | 修改命中仲裁与文字入口 |
| 原有选择/命中/区域机制 | 内部可继续画，边框移动，普通矩形不是区域 | 需要共同验证，不能只改一个识别函数 |

源码与对应上游测试定位见 [完整画布笔记 §3.2–3.3](source-notes-canvas.md)。那些测试本轮只读取，未运行。

**接入判断。** 公开 API 有 custom tool 与指针回调，但回调不是通用可取消的工具策略接口。先验证宿主自定义工具能否覆盖核心规则；若必须长期侵入 App 私有逻辑，再比较“小范围受控 fork”和“获得授权的 tldraw”。当前没有 PoC 证明无需 fork，也没有证据要求整套重写。

**版本判断。** GitHub Releases 当前 Latest 是 v0.18.1；本次主分支导出接口刚统一为 exportScene，而该 release 标签仍是旧导出函数。npm dist-tag 本轮未成功核验。新 autoshape、主分支 API、公开站点、npm 稳定包四者不能混成一个版本事实。PDF 也不是该主分支 exportScene 类型列表中的现成功能，仍要单独设计导出链路。

## 5. 智能笔：已有实现分别解决什么

产品行为可以拆成下列链路；这是实现研究的边界划分，不是提交了代码：

```text
真实鼠标点 + 时间 + 按键状态
    ├─ 直接松手 ───────────────→ 原始笔迹
    └─ 末端静止且仍按住 → 分类 → 几何拟合 → 质量检查
                                      ├─ 无可靠结果 → 保留原迹
                                      └─ 候选预览 → 松手确认可编辑对象

原始点始终保留；平滑与轻手绘只影响呈现，不改写输入来源。
```

| 工作 | 首选研究对象 | 容易混淆的地方 |
| --- | --- | --- |
| 判断用户是否要规整 | Concepts / Procreate 的交互 + 自有状态机 | 按下很久不等于末端停顿；静止时可能不再收到 move，所以要计时器 |
| 判断像矩形还是椭圆 | Excalidraw 特征分类，$1/Protractor 对照 | 归一化后的分类形状不能直接拿来替换原位置与比例 |
| 得到中心、宽高、旋转 | 原点集拟合，必要时 OpenCV 对照 | 能拟合出椭圆不代表原迹真的画了椭圆，必须能拒绝 |
| 显示舒服的原迹 | perfect-freehand 或底座已有笔迹实现 | 平滑不能把矩形角抹掉再送入识别；模拟压力不是鼠标真实压力 |
| 标准/轻手绘切换 | Rough.js 或底座已有粗糙度能力 | 同一几何的外观变化；固定 seed，不能每次导出都随机变样 |
| 恢复笔迹与撤销 | Xournal++ 原迹/结果分离，底座历史事务 | 一次笔画和确认应形成可理解的历史操作，不能只保留规整后的截图 |

[Procreate QuickShape 官方说明](https://help.procreate.com/procreate/handbook/5.4/guides/quickshape)和 [Concepts Settings](https://concepts.app/en/manual/settings) 足以确认“画完保持接触再规整”的产品先例；它们没有公开证明内部识别算法。本轮没有进行 Procreate 二进制逆向，不需要先逆向它才能验证我们的方案。

当前优先从 Excalidraw 的分类实现验证，而非先接生成式 AI 或训练模型。只有真实鼠标样本证明现有分类/拟合不足，才追加复杂方案。完整识别种类、停顿阈值、吸附阈值、预览后再次移动的含义均仍待确定。

## 6. 产品与 GUI：每个对象只借它最强的一部分

配图、来源页、平台和本轮核看状态集中在 [15 个目标的图册](product-gallery.md)。这里给出产品适配判断：

| 产品 | 值得借鉴 | 对 DrawingBoard 的具体建议 | 明确不直接移入 |
| --- | --- | --- | --- |
| [Concepts](https://concepts.app/en/manual/workspace) | 工具可收纳、按住表示规整意图 | 当前笔的少量常用属性就近出现；预览给明确识别反馈 | 多笔拼接、专业笔刷/尺、预览后旋转缩放手势 |
| [FigJam](https://help.figma.com/hc/en-us/articles/15300412458647-Explore-FigJam-files) | 文件/工具/对象属性分层 | 保留上方浮动工具条；属性随对象类型变化 | 云协作负担、自动新节点、将主工具条改位置 |
| [Miro](https://help.miro.com/hc/en-us/articles/360018261813-Frames) | 同一 Frame 参与导航、演示、导出 | 命名区域复用一个模型；选中后就地展示或导出 | 普通矩形自动变区域、复杂会议工具 |
| [Balsamiq](https://balsamiq.com/support/creating-and-editing/editor-overview/) | 低保真页面、选择上下文、风格预览 | 框+文字+图片+复制对齐完成页面；设置用同一示例对比风格 | 组件平台、交互原型、AI 生成 |
| [Allume](https://allume.com/) | 内容混排、低信息密度的界面 | 中性或轻纸面背景作为候选，GUI 使用清楚中文字体 | Apple 平台特定手势、嵌套画板体系 |
| [Scapple](https://www.literatureandlatte.com/scapple/overview) | 鼠标双击直接输入、自由排列 | 独立文字入口保持直接，不要求先选 T 或模板 | 拖节点互连，避免与移动冲突 |
| [Heptabase](https://wiki.heptabase.com/fundamental-elements) | 检索与空间位置对应 | 最近画布找到后恢复原视角，区域有定位入口 | 卡片数据库、常驻双侧栏、标签知识库 |
| [Microsoft Whiteboard](https://support.microsoft.com/en-us/whiteboard/retirement-standalone-microsoft-whiteboard-apps) | 对齐与局部操作参考 | 局部反馈可以研究，独立桌面路线不直接照搬 | 将已退休客户端当当前稳定产品推荐 |

视觉上，建议沿用已认可界面结构，再混合三个有明确用途的参考：**FigJam 的操作分层 + Balsamiq 的对象属性 + Allume 的安静背景**。这是视觉细化建议，不是把三套界面拼起来，更不改变工具位置和已确认手势。

实际调整可以很小：顶栏处理画布与交付；上方工具条保持少量常用项；选择对象后就近显示属性；颜色主要用于内容和状态；区域抽屉主动打开才占空间；初次使用用一句“松手留笔迹，末尾停顿再规整”说明主操作。风格切换只改规整对象，不顺手改成整套手写 GUI 或让中文字体布局跳动。

需要注意的当前产品事实：Concepts 统一手册不等于 Windows 特性逐项核实；Miro 官方没有离线模式，FigJam 的受限离线也不满足我们的无网络日常使用；Microsoft 独立 Whiteboard 应用于 2026-10-16 退休；Balsamiq 现行编辑器和收尾中的旧 Desktop 不能混为同一版本。出处与限制详见 [产品来源笔记](source-notes-products.md)。

## 7. 把 23 项确认规则映射到现有机制

| 设计决策 | 可借来源 | 我们仍需掌握或验证的部分 |
| --- | --- | --- |
| D01 鼠标键盘、D06 智能笔为主 | Excalidraw 输入，Scapple 双击输入 | 无触控笔也能完成全部主任务；不依赖 R/E 定图形 |
| D02 唤出/收起、D03 普通窗口 | Penlight 热键/托盘状态转换 | 快捷键冲突、窗口可见位置、多屏/DPI、文字输入期间行为 |
| D04 接着画、D18 最近画布 | Penlight board/camera/last ID，Heptabase 找回上下文 | 列表、内容、相机及最后 ID 的失败恢复，不能仅恢复图形 |
| D05 无限画布与命名区域 | Excalidraw frameId、tldraw Frame、Miro | 普通矩形/组合/区域区分；归属与调整边界规则 |
| D07 释放留迹、D08 停顿预览、D09 单笔 | Excalidraw 分类 + Concepts/Procreate 触发先例 | 自己实现状态转换，不照搬多笔或松手识别 |
| D10 保持位置比例并可恢复、D11 保持笔工具 | 原始点/参数化图形分离、Xournal++ 撤销结构 | 拟合质量、恢复后的标签/连线语义、连续绘制稳定性 |
| D12 内部画/边框移动、D13 双击文字分工 | Rnote 几何与命中区分、底座 textarea | 命中优先级、重叠对象、双击时序和中文 IME |
| D14 不造节点、D15 双端连接后方向箭头 | maxGraph createTarget=false、Excalidraw/tldraw binding | 将连接、目标移动、撤销、保存重开联动验证 |
| D16 静态页面布局 | Balsamiq 表达方式；底座组合/对齐/复制 | 低保真布局顺手，不扩大成组件平台 |
| D17 本地自动保存离线免登录 | Penlight 文件写入、draw.io 草稿与冲突处理 | 冷启动离线、坏文件不覆盖、错误可见、图片资源一致性 |
| D19 复制/PNG/PDF/可编辑 | Excalidraw 图像导出、draw.io 桌面 PDF | 各自是真实产物；可编辑文件往返保持对象关系 |
| D20 展示、D23 工具轻量 | Miro 展示、FigJam 分层、Allume 留白 | 展示时不能误编辑；指示点不入文件；退出恢复上下文 |
| D21 标准/轻手绘 | Rough.js、Balsamiq 风格预览 | 种子稳定、原迹不变、命中不跟随机轮廓漂移 |
| D22 不加生成式 AI | 本地几何分类路线 | 不引入联网模型依赖和生成页面范围 |

## 8. 三条可比较的工程路线

| 路线 | 优势 | 主要成本/不确定性 | 建议 |
| --- | --- | --- | --- |
| A：Excalidraw 核心 + 自有智能笔交互 + Windows 外壳/文件层 | 许可清楚，已有对象编辑功能多；近期已有识别模块 | 公开 API 的控制边界；必要 fork 的升级维护；稳定包与主分支差异 | **先做有限适配验证** |
| B：获适当授权的 tldraw SDK + 自定义 Tool/Shape + Windows 外壳 | 扩展点与工具状态机更明确 | 生产授权、离线运行条件、依赖版本成本 | A 的行为控制成本过高时对照 |
| C：独立画布内核 + perfect-freehand/Rough.js/拟合模块 | 所有行为都能自主定义 | 命中、文字、连接、历史、序列化、导出都要承担，测试面最大 | 目前不优先，需明确证据才转向 |

不要把 Excalidraw、tldraw 和 maxGraph 三套场景模型同时拼进一个编辑区。应选一个核心，借鉴其他项目的机制；如果底座已经集成笔迹或轻手绘模块，优先复用它的现有管线，避免两个平滑器、两套绑定或两套历史互相干扰。

Windows 外壳可独立比较 Tauri/WebView2、Electron 等候选，但本轮不足以确定哪一个真正更快。Penlight 证明相关功能有公开实现，draw.io 提供桌面导出参考；作者宣传的安装包或内存数字不能代替同一机器同一画布下的测量。

## 9. 下一步最有价值的验证顺序（尚未执行）

这里列的是研究结论带来的验证门槛，不是批准进入开发，也没有给未经测试的工期估算。

1. **先证明输入控制权。** 用最小画面验证直接松手、末尾停顿、慢速持续移动、失焦/取消、预览后再移动。必须没有错误自动规整、丢笔或旧计时器干扰下一笔。
2. **再证明五种编辑行为不互相抢。** 内部绘制、边框移动、边框双击标签、内部双击独立文字、端点吸附。加入重叠图形和不同缩放；中文候选窗口下 Enter/Esc 不能误提交或收起。
3. **再评估识别是否足够。** 收集真实鼠标样本，覆盖粗矩形、扁椭圆、近闭合、拖钩、斜线、短线、随意涂鸦；记录误规整、拒绝、位置比例偏差。把调参和评估样本分开，不先承诺识别率。
4. **打通语义生命周期。** 连线跟随、标签跟随、撤销重做、恢复原迹、保存关闭重开使用同一份数据。PNG 看着对不等于可编辑文件正确。
5. **最后评价桌面与交付。** 冷启动、后台唤出、大画布恢复分别测；测试多屏和保存失败；检验 PNG/PDF 裁切、中文字体、图片资源与可编辑文件回读。

第一、二项若需要大面积修改底座内部，及时重新比较路线 B；不要等完整应用做好才发现核心手势无法可靠接管。具体原型代码需在用户决定进入验证阶段后另行开展。

## 10. 交付物与可追溯来源

| 文件 | 内容 |
| --- | --- |
| [product-gallery.md](product-gallery.md) | 15 个目标的图片、来源、平台、核看状态、可借鉴 GUI |
| [source-notes-canvas.md](source-notes-canvas.md) | 四个画布/图编辑项目的固定源码入口、许可、版本、适配差异 |
| [source-notes-gestures.md](source-notes-gestures.md) | 分类/拟合/平滑/风格/状态机的源码证据与验证清单 |
| [source-notes-products.md](source-notes-products.md) | 八个主要竞品及 Kinopio 的官方功能、交互、图片来源 |
| [source-notes-windows.md](source-notes-windows.md) | Penlight、gInk、Lorien 的 Windows/本地保存机制与证据限制 |
| [images](images) | 本轮实际网页操作的四张本地截图 |

关键许可、源码链接在来源笔记中尽量固定到提交；产品帮助和图片为官网当前资源，未来可能变化。当前资料保存于项目研究目录，未改动设计基线、未安装依赖、未创建产品实现代码。没有另存重复的全局经验条目：本轮新增主要是这个项目的选型证据和会变化的产品资料，既有研究方法已经覆盖通用做法。
