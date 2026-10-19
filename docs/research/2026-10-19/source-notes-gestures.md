# 手势、几何拟合与笔迹模块源码研究

核验日期：2026-10-19（Asia/Shanghai）。范围：Windows 鼠标键盘智能笔的触发、单笔识别、参数化几何、平滑、命中与恢复；不实现应用代码，不安装或运行候选项目。

依据：[产品设计 v1.0](../../superpowers/specs/2026-10-19-drawingboard-product-design.md) 的 D07–D15、D21–D22。目标是“直接松手保留原迹；末尾左键仍按住且指针停顿，才出现规整预览；随后松手确认可编辑图形”。多笔自动合并、自动节点、生成式 AI 均不在本范围。

## 1. 先读结论

1. **最贴近本产品的已核验分类候选是当前 Excalidraw 的 `convertToShape.ts`，不是只有传统 $1 系列可选。** 它已包含单笔特征提取、基本形状分类与包围盒输出。但并行源码追踪发现其现有移动预览、松手处理、失败回退和箭头规则仍与本设计不同。详见第 3 节。
2. **分类、拟合、触发、渲染是四个不同任务。** $1/Protractor 回答“更像哪个模板”，OpenCV 的拟合函数回答“这一批点对应哪组几何参数”，perfect-freehand 生成笔迹轮廓，Rough.js 生成已知图形的手绘外观。没有任何一个单独覆盖产品行为。
3. **Xournal++ 最值得借鉴分段/直角约束/圆评分及识别撤销；Rnote 最值得借鉴笔迹构建、预测分层和形状边界。** 两者不是可原封不动搬入的智能笔：许可分别为 GPL 系列，且交互或对象语义有差异。
4. **保留原始样本是横跨所有路线的必需设计。** 识别归一化、平滑点、预测点、手绘渲染结果都不能覆盖恢复来源；原始样本还应保留起终方向，避免连线箭头反向。
5. **优先验证真实鼠标样本及误触，暂不锁定阈值。** 官方触控产品说明和论文的效果不能证明本项目在 Windows 鼠标、高 DPI 和画布缩放下可用。本轮没有识别率、延迟或用户测试数据。

## 2. 证据说明与当前仓库快照

- **源码证据**：读取固定提交的函数及其调用关系，能说明实现做了什么，不能证明已跑通。
- **官方说明/论文**：能说明作者的设计或产品公开交互，不能证明本项目适配后的质量。
- **工程建议**：基于上述证据给出的候选方案和验证顺序，尚未实现或验收。
- 本轮通过 GitHub REST 查询仓库 `archived`、`pushed_at`、默认分支及最新提交；通过固定提交的 LICENSE/文件头复核许可。`pushed_at` 不等同默认分支最后提交，更不等同稳定版本发布日期。所有日期以下用 UTC；日期本身不是质量评分。

| 项目 | 本轮固定源码版本 | 默认分支末次提交 / 仓库 pushed_at | 许可与状态 | 建议定位 |
| --- | --- | --- | --- | --- |
| [perfect-freehand](https://github.com/steveruizok/perfect-freehand) | `176e00f2399f4969e1b0965c5921d96a3e50ce9f` | 2026-02-01 / 2026-04-13 | [MIT](https://github.com/steveruizok/perfect-freehand/blob/176e00f2399f4969e1b0965c5921d96a3e50ce9f/LICENSE)，未归档 | 原始笔迹显示候选 |
| [Rough.js](https://github.com/rough-stuff/rough) | `56a2762171b1294d643501e8d14f120db6b27bd7` | 2023-11-20 / 2024-07-28 | [MIT](https://github.com/rough-stuff/rough/blob/56a2762171b1294d643501e8d14f120db6b27bd7/LICENSE)，未归档 | 已规整图形的轻手绘外观 |
| [Xournal++](https://github.com/xournalpp/xournalpp) | `7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2` | 2026-10-15 / 2026-10-18 | [GPL v2 文本](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/LICENSE)，API 标识 GPL-2.0，未归档 | 算法与撤销结构参考；不当宽松许可组件 |
| [Rnote](https://github.com/flxzt/rnote) | `9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca` | 2026-10-17 / 2026-10-18 | [README](https://github.com/flxzt/rnote/blob/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/README.md#L181) 明确 GPL-3.0-or-later；[LICENSE](https://github.com/flxzt/rnote/blob/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/LICENSE)，未归档 | 状态、笔迹、形状数据参考 |
| [Google Ink Stroke Modeler](https://github.com/google/ink-stroke-modeler) | `f2388813b0b25bc3e33d143d369a8367ab2e30c8` | 2026-08-02 / 2026-08-02 | [Apache-2.0](https://github.com/google/ink-stroke-modeler/blob/f2388813b0b25bc3e33d143d369a8367ab2e30c8/LICENSE)，未归档 | 原生路线平滑/预测候选 |
| [OpenCV](https://github.com/opencv/opencv) | 本文读 4.13.0 标签提交 `fe38fc608f6acb8b68953438a62305d8318f4fcd` | 当前默认分支 `5.x` 最新提交/ pushed_at 为 2026-10-19；本文非该分支源码审计 | 根 [Apache-2.0](https://github.com/opencv/opencv/blob/fe38fc608f6acb8b68953438a62305d8318f4fcd/LICENSE)；具体旧文件仍含 Intel 许可头，未归档 | 拟合参考/验证基线，不默认引入整个运行库 |
| [Stylus Labs Write](https://github.com/styluslabs/Write) | `401b65d5fe0294cc83171b76a0273b6df3afc979` | 2026-06-23 / 2026-06-29 | [AGPL-3.0](https://github.com/styluslabs/Write/blob/401b65d5fe0294cc83171b76a0273b6df3afc979/LICENSE)，未归档 | 已核对身份/许可；本轮未建立形状识别调用链，不列直接复用方案 |

OpenCV 4.13.0 标签提交日期为 2025-12-30，当前默认分支另为 `719f8535e796ef842f88f0d4179a1f0541f0d41f`；不能把 4.x 文档、4.13 源码与 5.x 当前分支混为同一个验证版本。GitHub API 部分请求发生 TLS 握手失败，成功重试后才记录以上元数据；未成功取到的源码不作结论。未报告 Stars，也未据其判断成熟度。

许可处置只作为依赖选型边界：MIT/BSD/Apache 项目也需保留适用声明；GPL/AGPL 源码移植须与项目交付许可一致，不能通过换语言或只复制部分函数就当成宽松许可。没有批准具体引入或发布任何第三方代码。

## 3. 当前 Excalidraw 的 autoshape：优先进入验证池

本节基于本任务并行画布源码研究员已读的固定提交 `e1b7aacb356a492aa1e0fc6eb57b8896124027f0`（MIT），共享同一研究任务的源码证据；未重复读取、未运行。主报告应采用画布笔记中的完整调用链和行号。

核心文件：[packages/element/src/convertToShape.ts#L502](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/convertToShape.ts#L502)。`recognizeShape → extractFeatures → classify` 已提供单笔重采样、特征分类和位置尺寸输出：

- 重采样为 64 个等弧长点；设 25 屏幕像素最小尺寸门槛。
- 起终缺口与路径长度比大于 0.15 时按开放路径处理，利用延展程度、主干偏离、偏斜等区分 line/arrow。
- 闭合路径通过 hullFillRatio、cornerTurnShare、kurtosisProduct 与原型比较，分 rectangle/diamond/ellipse；距离超过内部阈值时回到 freedraw。
- 输出 x/y/width/height 基于原始包围盒；这是比只返回类别更接近本产品的输出，但仍需验证长宽比例、旋转和尾端拖钩对包围盒的影响。

已发现的适配缺口：

| 现有源码行为 | DrawingBoard 要求/要补的判断 |
| --- | --- |
| pointermove 中节流重算形状预览 | 只有同一次按下过程的末尾停顿满足条件后才展示规整；绘制时保持原迹 |
| 结束绘制后识别并插入形状 | 未进入规整预览的普通松手必须保存原迹 |
| `convertToShape` 不为 freedraw 返回图形，未知时不插入该形状 | 失败必须保存原迹，不能丢失；这需要明确的回退分支 |
| 至少一端绑定、且不是同一目标，即可能升级箭头 | 本产品仅两端都连接已有图形时默认箭头，方向沿原始绘制顺序 |

因此优先级是“验证与适配已有算法”，不能写成“已有完整 QuickShape 智能笔”，也不应写成“识别全部从零自研”。本笔记其他算法可用于理解误判、形成对照基线或补齐拟合能力。

进一步定位：[convertToShape#L535](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/convertToShape.ts#L535)、[pointermove 处理#L767](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/element/src/convertToShape.ts#L767)、[App.drawshape.ts finalize#L222](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/components/App.drawshape.ts#L222)、[maybeUpgradeLineToArrow#L171](https://github.com/excalidraw/excalidraw/blob/e1b7aacb356a492aa1e0fc6eb57b8896124027f0/packages/excalidraw/components/App.drawshape.ts#L171)。

## 4. $1、Protractor、$N、$P：适合分类对照，不是最终几何

原作者入口：[$1](https://depts.washington.edu/acelab/proj/dollar/)、[$N](https://depts.washington.edu/acelab/proj/dollar/ndollar.html)、[$P](https://depts.washington.edu/acelab/proj/dollar/pdollar.html)。官方站提供 JavaScript/C#、论文和伪代码；本轮未确认官方 GitHub 仓库，不用第三方镜像冒充原作者仓库。三个已读 JavaScript 文件头均标注 New BSD License、Last updated July 14, 2018；网站更新时间与源码头时间不同。

| 实现 | 已读原作者源码与函数 | 可以借鉴 | 对本产品的限制 |
| --- | --- | --- | --- |
| $1 | [dollar.js](https://depts.washington.edu/acelab/proj/dollar/dollar.js)：`Unistroke`、`Recognize`、`Resample`、`IndicativeAngle`、`RotateBy`、`ScaleTo`、`TranslateTo`、`DistanceAtBestAngle` | 少量模板的单笔分类、均匀弧长重采样、归一化管道 | `Result` 只有 Name/Score/Time；不是矩形四角或椭圆参数。非均匀缩放会消去宽高比例；源代码明确假设二维手势、不适用于线的退化框 |
| Protractor | 同文件 `Vectorize`、`OptimalCosineDistance`；[原作者论文入口](https://research.google/pubs/protractor-a-fast-and-accurate-gesture-recognizer/)、[官方伪代码](https://depts.washington.edu/acelab/proj/dollar/protractor.pdf) | 向量化模板和闭式角度距离，替代角度搜索 | 仍是模板匹配，不提供编辑几何。$1 官网中的增强实现仍经过 $1 的 `ScaleTo`；不要把这套封装和论文的完整预处理不加区分 |
| $N | [ndollar.js](https://depts.washington.edu/acelab/proj/dollar/ndollar.js)：`Multistroke`、`HeapPermute`、`MakeUnistrokes`、`CombineStrokes`、`ScaleDimTo` | 一维/二维缩放分支、起始方向筛选的思路 | 目标是多笔不同顺序/方向泛化，有排列组合开销。本产品禁止跨笔合并，没必要引入该主流程 |
| $P | [pdollar.js](https://depts.washington.edu/acelab/proj/dollar/pdollar.js)：`PointCloud`、`GreedyCloudMatch`、`CloudDistance`、`Scale` | 点云匹配能作为对照分类器 | 忽略笔顺、笔数和方向；不提供形状参数，也不能拿其结果决定箭头方向。仅传单笔不会强制合并，但仍需自己管理笔画边界 |

$1 已读源码定位（官方 URL 没有 commit 固定能力，因此记录日期与函数，不伪造 Git 固定链接）：`Unistroke` 第 90–99 行将点重采样、旋转、非均匀缩放和平移；`Result` 第 103–108 行为 Name/Score/Time；`Recognize` 第 149–170 行逐模板取最小距离；`ScaleTo` 第 231 行起。源码的 best-match 分数不能当成校准后的成功概率，也没有完整的“宁可不规整”产品规则。

工程建议：保留原始几何、只在副本上归一化；对直线、零宽/零高、重复点、极短笔画先做退化检查。分类器分数、拟合残差、闭合程度、角点证据应该共同决定是否提供预览，不要仅因模板库必定有一个最高分就强行替换。

## 5. Xournal++：分段、几何约束、替换撤销的可读参考

固定提交下的核心链路：

| 模块与定位 | 静态核验得到的事实 | 借鉴/适配点 |
| --- | --- | --- |
| [StrokeHandler.cpp#L153](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/src/core/control/tools/StrokeHandler.cpp#L153) `onButtonReleaseEvent` | 结束笔迹；在识别工具模式下局部创建 `ShapeRecognizer reco` 后调用 `recognizePatterns` | 当前是松手识别，不能照搬触发。每次局部实例说明当前调用链不跨笔保留识别队列 |
| [ShapeRecognizer.cpp#L314](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/src/core/control/shaperecognizer/ShapeRecognizer.cpp#L314) `recognizePatterns`；[findPolygonal#L167](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/src/core/control/shaperecognizer/ShapeRecognizer.cpp#L167) | 先检查最小尺寸；分段并优化角点，尝试三角形/矩形/直线，最后尝试圆 | 用作可解释分类、角点与线段拟合参考。类内部 queue 字段不能单独证明产品跨笔拼图 |
| [tryRectangle#L102](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/src/core/control/shaperecognizer/ShapeRecognizer.cpp#L102) | 检查邻边角度和端点接近程度，平均方向后以交点构造轮廓 | 有利于研究旋转矩形及略歪边；需把结果转成产品的矩形参数，而非保存若干折线点 |
| [Inertia.cpp#L20](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/src/core/control/shaperecognizer/Inertia.cpp#L20) `centerX/centerY/xx/xy/yy/rad/det` | 从路径统计量提取中心、半径和线/面分布指标 | 可解释的几何特征参考；需核验退化路径和噪声下数值表现 |
| [CircleRecognizer.cpp#L36](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/src/core/control/shaperecognizer/CircleRecognizer.cpp#L36) `scoreCircle/recognize`；[makeCircleShape#L16](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/src/core/control/shaperecognizer/CircleRecognizer.cpp#L16) | 计算归一化半径偏差，再生成一圈 Stroke 点 | 这里是圆，不是椭圆拟合；不能承诺保留非圆形宽高比例 |
| [RecognizerUndoAction.cpp#L15](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/src/core/undo/RecognizerUndoAction.cpp#L15) `undo/redo` | 保存 original 与 recognized 两个对象，撤销/重做时替换 | “保留来源而不是破坏性改写”的参考。它不等于产品中跨后续编辑仍可恢复的按钮语义 |

识别结果仍是 `std::unique_ptr<Stroke>`，不是包含 type、center、width、height、rotation、bindings 的专用对象。即便应用可以缩放笔迹，也不能据此声称具备本项目的标签/连接语义。候选算法须经过许可和对象模型适配。

## 6. 椭圆、直线与多边形拟合：OpenCV 作为基线

论文：[Fitzgibbon / Pilu / Fisher，Direct least-squares fitting of ellipses，1999](https://www.microsoft.com/en-us/research/publication/direct-least-squares-fitting-of-ellipses/)。作者明确说明椭圆约束会使坏数据也返回椭圆。因此“函数返回了椭圆”不是“用户确实画了椭圆”的证据。作者的[改进 MATLAB 版本说明](https://homepages.inf.ed.ac.uk/rbf/CVonline/LOCAL_COPIES/FITZGIBBON/ELLIPSE/)提及缩放以减小舍入误差、退化行为修正与几何参数输出；本轮未把其代码许可核验为可直接复用。

可追到正式库实现的替代来源为 OpenCV 4.13.0：

- [shapedescr.cpp#L618](https://github.com/opencv/opencv/blob/fe38fc608f6acb8b68953438a62305d8318f4fcd/modules/imgproc/src/shapedescr.cpp#L618)：`cv::fitEllipseDirect` 返回 `RotatedRect`；同文件还有其他椭圆拟合方案。适合获得中心、轴长、旋转，再用残差/覆盖度拒绝错误类型。
- [linefit.cpp#L573](https://github.com/opencv/opencv/blob/fe38fc608f6acb8b68953438a62305d8318f4fcd/modules/imgproc/src/linefit.cpp#L573)：`cv::fitLine` 返回方向及线上一点。它不是端点检测；工程上还需沿拟合方向投影原点集，确定有限线段范围并保持原始起终顺序。
- [approx.cpp#L647](https://github.com/opencv/opencv/blob/fe38fc608f6acb8b68953438a62305d8318f4fcd/modules/imgproc/src/approx.cpp#L647)：`cv::approxPolyDP` 是曲线简化，不是矩形判定；四个顶点并不足以证明直角矩形。
- [官方结构分析文档](https://docs.opencv.org/4.13.0/d3/dc0/group__imgproc__shape.html) 区分 `minAreaRect`、`fitEllipseDirect`、`fitLine`、`getClosestEllipsePoints`。最小包围矩形或最小包围圆解决包围问题，并不自动证明笔迹边缘符合该形状。

适用：做离线拟合对照、明确几何参数输出、验证自己的轻量实现。不适用：仅为矩形/椭圆/线就无条件把完整计算机视觉运行库放进快开画板。实际依赖体积、启动成本、JS/WASM/本机桥接成本本轮未测。具体源文件有历史 Intel 许可头，若抽取代码需要同时检查文件级声明，而非只看仓库 Apache 标识。

## 7. 笔迹平滑与低延迟显示

### 7.1 perfect-freehand

- [getStroke.ts#L18](https://github.com/steveruizok/perfect-freehand/blob/176e00f2399f4969e1b0965c5921d96a3e50ce9f/packages/perfect-freehand/src/getStroke.ts#L18)：`getStroke` 把输入点变成围绕笔迹中心线的轮廓多边形；下接 `getStrokePoints` 与 `getStrokeOutlinePoints`。
- [getStrokePoints.ts#L34](https://github.com/steveruizok/perfect-freehand/blob/176e00f2399f4969e1b0965c5921d96a3e50ce9f/packages/perfect-freehand/src/getStrokePoints.ts#L34)：`streamline` 影响点插值；`last` 完成状态时使用真实末点；输出含 point、pressure、vector、distance、runningLength。零/单/双点有专门分支。
- [getStrokeOutlinePoints.ts#L154](https://github.com/steveruizok/perfect-freehand/blob/176e00f2399f4969e1b0965c5921d96a3e50ce9f/packages/perfect-freehand/src/getStrokeOutlinePoints.ts#L154)：处理粗细、圆帽、尖角、taper；默认 `simulatePressure=true`，可使用真实或模拟压力；`thinning=0` 时半径恒定。
- [测试目录](https://github.com/steveruizok/perfect-freehand/tree/176e00f2399f4969e1b0965c5921d96a3e50ce9f/packages/perfect-freehand/src/test) 确有函数测试与快照，本轮只看目录/源码，未运行测试。

适用：JS/TS 画板的笔迹轮廓、压力样式、圆滑边缘。鼠标可以先验证恒定粗细，真实触控笔再验证压力输入。源码模拟压力主要使用相邻点间距离，API 没有时间戳参数，因此不要把它当作已测量、与事件采样率无关的真实速度模型。**它不提供形状识别、可编辑节点、撤销或停顿触发；轮廓点也不能代替用户原始轨迹。**

### 7.2 Google Ink Stroke Modeler

[README](https://github.com/google/ink-stroke-modeler/blob/f2388813b0b25bc3e33d143d369a8367ab2e30c8/README.md) 定位是平滑与预测，明确偏向好看的手写曲线而非精确复现输入；当前 C++20、依赖标准库和 Abseil。README 也说明 Google Ink 已迁移到更新平滑实现，不能把此库描述成 Google Ink 当前唯一内核。

[stroke_modeler.h#L46](https://github.com/google/ink-stroke-modeler/blob/f2388813b0b25bc3e33d143d369a8367ab2e30c8/ink_stroke_modeler/stroke_modeler.h#L46) 的 `Reset/Update/Predict/Save/Restore` 可参考流式接口；[stroke_modeler.cc#L119](https://github.com/google/ink-stroke-modeler/blob/f2388813b0b25bc3e33d143d369a8367ab2e30c8/ink_stroke_modeler/stroke_modeler.cc#L119) 校验重复、倒退时间和 Down/Move/Up 顺序。预测使用独立输出，不应把上一轮预测当成下一轮已确认输入。

适用：若决定原生 C++ 路线，可对比可调物理模型与预测。限制：平滑可能改变角点或闭环，预测不是持久化事实；不能用预测出来的位移判断“鼠标是否停住”。C++/Rust/TypeScript 移植应分别核验，不因原库来自 Google 就假定第三方移植获得相同维护与正确性。

### 7.3 Xournal++ 和 Rnote 的集成参考

- [Xournal++ StrokeStabilizer.cpp#L18](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/src/core/control/tools/StrokeStabilizer.cpp#L18)：`get` 选择算术/速度高斯、死区/惯性组合；`Deadzone::processEvent` 会处理转向；`finalizeStroke` 补齐稳定器末点与输入点间缺口。稳定器的死区不是按住停顿的触发器。
- [Rnote penpathmodeledbuilder.rs#L19](https://github.com/flxzt/rnote/blob/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/crates/rnote-compose/src/builders/penpathmodeledbuilder.rs#L19)：`PenPathModeledBuilder` 将 `buffer` 与 `prediction_buffer` 分开；`update_modeler_w_element` 遇 Up 清空预测，处理重复/负时间/大间隔等异常。该实现使用 Rust 的 `ink_stroke_modeler_rs`，不能把它当成直接链接上面的 Google C++。
- [Rnote penpathcurvedbuilder.rs#L140](https://github.com/flxzt/rnote/blob/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/crates/rnote-compose/src/builders/penpathcurvedbuilder.rs#L140)：`try_build_segments_during` 用 Catmull–Rom 构造 CubicBezier，失败退回线段，结束时收尾。适合研究“收集输入→构造线段→绘制”的分层。

## 8. 参数化形状与命中：Rnote 可借鉴的模块边界

[shaper.rs#L21](https://github.com/flxzt/rnote/blob/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/crates/rnote-engine/src/pens/shaper.rs#L21) 的 `ShaperState::{Idle, BuildShape}` 和 `handle_event` 根据预选的 builder_type 建立形状。它是形状工具状态机，不能作为“自由笔迹自动推断矩形”证据。

- [rectangle.rs#L14](https://github.com/flxzt/rnote/blob/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/crates/rnote-compose/src/shapes/rectangle.rs#L14)：`Rectangle` 保存半尺寸与 affine；`outline_lines` 生成边线，`hitboxes` 使用这些边线，区别于整块 bounds。
- [ellipse.rs#L14](https://github.com/flxzt/rnote/blob/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/crates/rnote-compose/src/shapes/ellipse.rs#L14)：`Ellipse` 保存 radii 与 affine；`outline_path` 和 `approx_with_lines` 给出轮廓，hitboxes 基于边线近似。
- [shapeable.rs#L6](https://github.com/flxzt/rnote/blob/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/crates/rnote-compose/src/shapes/shapeable.rs#L6)：`bounds`、`hitboxes`、`outline_path` 是不同接口。

工程建议：本产品 D12 要求内部可画，应把粗筛包围盒与细筛边框距离分开；控制点、文字、边框、空白输入依优先级仲裁。缩放下命中容差宜按屏幕/DIP 设体验尺度，再转换到世界坐标；不能仅因鼠标落在 rectangle bounds 内就拦截绘制。Rnote 的分段 AABB 是近似命中材料，不等于已证明所有缩放/旋转情况下边框拾取精确。

## 9. Rough.js：轻手绘外观层

[generator.ts#L52](https://github.com/rough-stuff/rough/blob/56a2762171b1294d643501e8d14f120db6b27bd7/src/generator.ts#L52) 的 `RoughGenerator.line/rectangle/ellipse/polygon/path` 从已知几何生成 Drawable；[renderer.ts#L43](https://github.com/rough-stuff/rough/blob/56a2762171b1294d643501e8d14f120db6b27bd7/src/renderer.ts#L43) 将矩形边转换为带扰动的绘图操作；[math.ts#L5](https://github.com/rough-stuff/rough/blob/56a2762171b1294d643501e8d14f120db6b27bd7/src/math.ts#L5) 的 `Random` 使用 seed，零 seed 则走 `Math.random`。

适用：D21 的轻手绘图形风格。建议保存语义几何及非零固定 seed，重绘/缩放/导出使用一致样式参数；命中、连接锚点、宽高编辑基于语义几何。它不能识别笔迹，`curveFitting` 等选项也不等于识别功能。手绘扰动可能超出精确边框，导出范围应考虑渲染边界。本轮未测不同版本的视觉一致性，不承诺跨升级 seed 输出完全相同。

## 10. 触发参考与推荐状态边界

[Procreate 5.4 QuickShape 官方手册](https://help.procreate.com/procreate/handbook/5.4/guides/quickshape) 说明画完保持接触后触发，继续按住可缩放/旋转，松开后可 Edit Shape。它可证明此交互形态存在，不能证明内部使用哪种算法。没有逆向、二进制分析或 iPad 实机测试。

[Concepts Precision Tools 官方手册](https://concepts.app/en/manual/precision-tools) 说明末笔停住触发、可调整 Activation Time、识别后仍按住可缩放/旋转；还支持一至四笔。这里借鉴停顿与反馈，多笔功能不进入 DrawingBoard；截图中的示例延时不是本项目已认可的默认值。

以下是待验证的最小状态建议，不是现成库能力或已确认的新需求：

| 状态/事件 | 建议职责 |
| --- | --- |
| Idle → Drawing | 左键按下并通过命中仲裁；为本次 pointer/stroke 分配唯一 ID，采集原始点 |
| Drawing + move | 持续画原迹；维护最后实际移动时间及局部移动范围；超出停顿范围则重置计时 |
| Drawing + elapsed quiet interval | 用定时器判断当前仍按下、仍是同一笔、移动范围足够小、已有有效路径，再运行候选识别 |
| RecognitionCandidate | 用本笔数据产生候选，检查几何残差/尺寸/有限数；结果过时则丢弃 |
| Preview | 临时显示规整，保留原始样本；界面明确用户当前将确认什么 |
| Drawing + up | 未进入 Preview 则提交原始笔迹 |
| Preview + up | 将原迹来源和参数化结果作为一个明确提交操作写入历史 |
| cancel / capture lost / 窗口失焦 | 清理计时器与临时状态，按产品决定保留/取消本笔，不能静默提交过期识别 |

关键约束：按下总时长不等于停顿；不能只靠收到相同坐标的 move，因为真正静止时可能没有 move；应该用原始坐标检测停顿，不能用滞后的平滑/预测轨迹；长时间缓慢移动要防累计误触。Preview 后继续移动代表调整还是取消回绘尚未由设计锁定，需用户原型验证，不能默认照搬 Procreate。

## 11. 鼠标与触控笔差异

[W3C Pointer Events](https://www.w3.org/TR/pointerevents3/) 是 Web 路线的输入语义依据：没有压力能力的设备在按键激活时 pressure 为 0.5，否则为 0；不能把该值解释成鼠标真实压力。`getCoalescedEvents` 可取回合并样本，但应处理合并样本或父事件之一，避免重复；predicted events 只适合临时显示，后续真实事件到达时替换。具体 WebView 是否支持这些 API 仍需实测。

| 维度 | 鼠标为主时的建议 | 触控笔扩展时的新增核验 |
| --- | --- | --- |
| 压力 | 固定宽度优先进入体验测试，模拟粗细可选且单独评价 | 真实 pressure、抬笔零压力事件、倾角；不能复用鼠标假定 |
| 停顿 | 左键持续按住 + 原始屏幕坐标变化范围 + 计时器 | 噪声、悬停、抬笔事件、掌触过滤；接触状态不等于所有指针事件 |
| 采样 | 低/高回报率、快速转角、低速移动、不同系统鼠标速度 | 高频合并点、输入预测、笔尖偏移与触控驱动 |
| 角点 | 平滑强度可能把矩形角磨圆，分类宜用原始或轻度去噪点 | 压力和曲线美化不能改变几何意图判定 |
| 缩放/DPI | 停顿/命中体验以屏幕尺度设计，几何保存用世界坐标 | 同样核验，不能照搬平板画布固定尺度 |

## 12. 优先验证清单

所有条目均未执行；目的是把候选算法变成可比较证据。

| 顺序 | 验证对象 | 必须观察的结果 |
| --- | --- | --- |
| P0 | 单笔事件重放：直接松手、真正停顿、持续缓慢移动、窗口失焦 | 只在用户意图对应状态规整；无丢笔、无过期结果覆盖下一笔 |
| P0 | Excalidraw 单笔分类 + hold 门控 + 失败原迹回退 | 同一批鼠标样本的误判/拒绝率，是否保留位置与比例；先证明现成算法适配后是否足够 |
| P0 | 水平/垂直线、极短线、零面积点、单笔矩形、圆、扁椭圆、旋转椭圆、近闭合/尾端拖钩、自交、随意涂鸦 | 不把非图形强行变形；退化时无 NaN/崩溃；椭圆与矩形不因归一化失去比例 |
| P0 | 规整后撤销、恢复原迹、移动缩放后恢复 | 保存来源可靠；连接、标签与恢复的语义需要明确，不由算法替用户决定 |
| P0 | 边框起笔/内部起笔/控制点/文字/重叠对象，多个缩放与DPI | 内部能绘制；移动和连线不抢同一个动作；绑定预览与最终结果一致 |
| P1 | perfect-freehand、较弱平滑、原始折线三组同样输入 | 鼠标可控性、角点保留、端点跳变、采样率敏感性；不只看截图漂亮 |
| P1 | OpenCV 拟合或轻量拟合与 Excalidraw bbox 输出对照 | 中心偏移、长宽误差、旋转误差、边缘残差；确定是否真需要更复杂拟合 |
| P1 | $1/Protractor 对照分类 | 与特征分类比较而非直接采信论文数字；加入未知类别和非图形样本 |
| P1 | Rough.js 重绘、缩放、保存重开、PNG/PDF导出 | 固定 seed 外观稳定，语义命中未随随机扰动漂移，原始笔迹不被风格切换改写 |

建议样本记录 raw points、时间戳、pointer type、缩放/DPI、用户意图、预期类型、是否要求保持旋转；人工标注与算法结果分开。阈值调整使用训练样本，最终报告另留未参与调参的测试样本。当前不承诺固定识别率、毫秒级耗时或所谓“无需训练即可生产可用”。

## 13. 本轮边界

已完成：产品规则核对、官方交互说明、原作者识别源码/论文入口、候选项目实时元数据、固定提交关键函数及许可证阅读、适用性与差异分析。

未完成也未宣称：依赖安装、构建、单元测试执行、UI 运行、鼠标手绘试验、性能测量、误判率测量、二进制逆向、整仓许可证审计。Stylus Labs Write 仅元数据/README/许可证达到本轮证据范围，未建立识别调用链。InkCanvas 同名项目较多，未锁定到一个来源并完成核验，故不加入推荐。

本笔记仅写入研究目录；未更改产品设计或应用实现。`D:\Self-evolution` 总索引与相关类别索引已检索，未找到直接匹配的形状识别既有知识；Codex 历史 GitHub 核验流程只用于研究方法，所有动态仓库结论均在本轮刷新。

## 14. 可展示的官方截图与演示入口

以下界面图来自项目官方 README，可用于介绍被研究的现有产品；不是本项目运行截图，也不证明本轮构建或实机验收。图示版本/平台应按原说明标注。URL 已读取，未在本笔记中基于像素逐项验收界面。

| 项目 | 图片 URL | 来源页与标注 |
| --- | --- | --- |
| Rnote 概览 | [overview.png](https://raw.githubusercontent.com/flxzt/rnote/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/crates/rnote-ui/data/screenshots/overview.png) | [固定 README 的 Screenshots](https://github.com/flxzt/rnote/blob/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/README.md#L107)；官方示例界面，不能标为 Windows 本机截图 |
| Rnote 选择状态 | [selection.png](https://raw.githubusercontent.com/flxzt/rnote/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/crates/rnote-ui/data/screenshots/selection.png) | 同上；用于解释现有编辑工具的界面位置，不能据图证明本项目的边框命中规则 |
| Xournal++ Windows 10 | [main-win.png](https://raw.githubusercontent.com/xournalpp/xournalpp/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/readme/main-win.png) | [固定 README 的 Windows 10 段落](https://github.com/xournalpp/xournalpp/blob/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/README.md#L58)；明确标为官方 Windows 10 示例图，图的具体软件版本没有在该段注明 |

![Rnote 官方概览截图](https://raw.githubusercontent.com/flxzt/rnote/9b2ccabe9956c548e51bdd5ffa0ec08d0ad0fdca/crates/rnote-ui/data/screenshots/overview.png)

![Xournal++ 官方 Windows 10 截图](https://raw.githubusercontent.com/xournalpp/xournalpp/7e25f4db8fb4a4f7b29ad64285f4f0fd7f6c98f2/readme/main-win.png)

算法/渲染库没有独立完整画板 UI：[$1/$N/$P 原作者演示](https://depts.washington.edu/acelab/proj/dollar/)、[perfect-freehand 作者演示](https://perfect-freehand-example.vercel.app/)、[Rough.js 官方示例](https://roughjs.com/)。这些链接供后续交互查看，本轮没有操作演示、采集样本或以它们证明性能。Google Ink Stroke Modeler 和 OpenCV 不应配一张臆造的“产品界面”。
