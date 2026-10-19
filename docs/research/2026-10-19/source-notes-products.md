# DrawingBoard 竞品产品与交互来源笔记

研究日期：2026-10-19，Asia/Shanghai。最后一批来源读取约 14:39–14:42。本文是产品研究资料，不是实现计划或已确认需求变更。

研究基线：[已确认产品设计](../../superpowers/specs/2026-10-19-drawingboard-product-design.md)。重点对应 D01 鼠标键盘、D04 恢复上次、D05 命名区域、D07–D10 单笔停顿规整、D12 图形内部绘制、D14 不自动造节点、D17 本地离线、D19 导出、D20 展示、D21 风格、D23 轻量界面。

## 证据怎么读

- **官方文档已读取**：当前官方页面文本支持所述能力与操作；不等于本轮安装或亲手跑通。
- **官方图示链接已提取**：从已读官方页面的图片链接实际取得直接资源 URL，保留在每节和末尾图表中；未下载图片绕过展示限制。
- **视觉待核验**：本子任务没有使用浏览器自动化，也没有逐像素观察图片。GUI 位置若写明“官方说明”，来自帮助正文；不能把这些记录当成截图实测的色值、尺寸或当前账户实机界面。主研究可直接打开这些图片核验。
- **设计建议**：从证据推导给 DrawingBoard 的适配，仍须原型验证，不能覆盖已经确认的规则。

按任务读取了 `D:\Self-evolution\INDEX.md`、相关分类索引及 `policies/frontend-reference-replication.md`，采用其中“真实来源、具体状态、参考事实与项目适配分开”的规则。本文没有复用该库中的历史产品结论。Codex 管理记忆检索没有找到适用于 DrawingBoard 的事实，未用旧记忆替代本轮联网核验。

## 选择结果

主参考为 Concepts、FigJam、Miro、Microsoft Whiteboard、Heptabase、Allume（原 Muse）、Scapple、Balsamiq，共八个。它们分别回答画笔、轻量工具布局、区域展示、白板反馈、内容找回、专注空间、鼠标输入和页面布局的问题。Kinopio 作为一个经过核对但不选为主参考的差异案例，保留在补充节。未机械补齐所有同类品牌。

| 产品 | 最值得看的一件事 | 与本项目最明显的距离 | 优先级 |
| --- | --- | --- | --- |
| Concepts | Draw & Hold 的明确意图触发；画布工具收纳 | 触笔导向，支持多笔，识别后的移动语义不同 | 高：画笔与局部菜单 |
| FigJam | 文件操作、画布工具、对象属性分层 | 云协作、快速创建节点与首版边界不合 | 高：主工作区结构 |
| Miro | 命名 Frame 贯通导航、展示、PDF | 工具/协作负担较重，官方不提供离线模式 | 高：区域与输出 |
| Microsoft Whiteboard | 墨迹、对齐参考线、右键就地操作 | 独立应用已在 2026-10-16 退休，转向 Web/Teams | 中：局部交互 |
| Heptabase | 找回内容时同时找回它所在的空间 | 卡片库、标签和知识工作区比当前需要复杂 | 中：最近画布与定位 |
| Allume / Muse | 内容混排、按需展开、专注画布 | Apple 平台；嵌套板不同于本项目无限画布 | 中：气质与信息密度 |
| Scapple | 双击落字、自由摆放、鼠标优先 | 文本节点为主；拖节点互连会与移动混淆 | 高：输入与克制 |
| Balsamiq | 选中后属性、少量控件表达页面、风格切换 | 现行 Cloud 已加入 AI/原型；Desktop 在收尾 | 高：静态页面与交付 |

## 1. Concepts：智能笔的直接先例，但不能照搬全部手势

**官方已确认的实际行为。** 当前统一手册的 Draw & Hold 允许画 1–4 笔，再在最后一笔末尾按住以识别；触发时长可以调整。识别后继续不抬笔移动，会缩放、旋转结果。手册列出直线、曲线、箭头、三角形、正方形、矩形、圆和椭圆。[Settings](https://concepts.app/en/manual/settings)

这说明“画完停住再规整”已有成熟产品先例，不能把它描述为独创。**平台证据仍需分开**：统一手册并未给这段每项标注平台；Android 发布记录明确在 2024.5 上线 draw + hold。本轮没有找到足以确认 Windows 当前同等支持的独立版本证据，也没有 Windows 实测。[Android roadmap](https://concepts.app/en/android/roadmap/)

**GUI 结构：官方说明。** 顶部状态栏承载画名、图库、导出和设置；Tool Wheel 可以改为 Tool Bar；画布菜单可以移动、隐藏，并有 normal / compact / hidden 三种密度。Windows 另有原生风格的标题栏与最小化/关闭入口。不要把统一界面配图中的 iOS 专属调色板直接归到 Windows。[Workspace](https://concepts.app/en/manual/workspace)

**值得采用的具体细节。**

1. 规整预览只在停顿产生后出现，旁边用短文字说明识别类型，再给“恢复笔迹”。这是 D07–D10 的用户意图可见化；阈值必须用真实鼠标抖动样本验证。
2. 笔的常用属性保持在当前工具附近，次级属性按需展开；不要每次改粗细都移到固定侧栏。
3. 以“画布工作区”和“导出范围”分离表达无限画布。Concepts 可设置 Artboard 并用于导出；DrawingBoard 应映射为明确命名区域，而不是让普通大矩形自动变容器。[Settings](https://concepts.app/en/manual/settings)

**不采用。** 多笔拼接违反 D09；“识别后继续移动＝缩放旋转”与本设计建议的“重新明显移动＝恢复当前笔绘制”不同，需要在原型中选择明确语义，不能同时暗中启用。八工具轮、层、测量尺和专业笔刷也不应成为默认 UI。官方确认作品默认保存在设备本地，云备份是另行配置，但这不证明无账号首次安装流程或本项目崩溃恢复已经解决。[Business manual](https://concepts.app/en/manual/concepts-for-business)

**官方图示。** [统一工作区图](https://cdn.tophatch.com/cms/uploads/image178_1776182215699.png)；[Windows 标题栏](https://cdn.tophatch.com/cms/uploads/image186_1776182217841.png)；[Draw & Hold 设置图](https://cdn.tophatch.com/cms/uploads/image97_1776182277034.png)。来源分别为 Workspace、Settings；视觉待核验。

## 2. FigJam：最适合研究轻量工具与局部属性

**官方已确认。** 编辑器分为画布、文件面板和主工具条。官方明确描述白底细点网格，左上是文件名/页面，右上是协作，主工具条位于底部。鼠标按住 Space 拖动画布。对象被选中后出现对应属性，连接线可改端点、样式、文字；已连接节点移动时线跟随。连接工具保持激活，直到切换工具或退出。[Explore files](https://help.figma.com/hc/en-us/articles/15300412458647-Explore-FigJam-files)；[Connectors](https://help.figma.com/hc/en-us/articles/1500004414542-Create-diagrams-and-flows-with-connectors-in-FigJam)

**值得采用。**

- 把“这张画布的事情”留在顶栏，把“当前在用的工具”放进浮动工具条，把“选中对象的属性”放在对象附近。DrawingBoard 已确认工具条在上方，因此借鉴分层，不直接改到底部。
- 连接线端点吸附后给明确反馈；选择线时只显示颜色、线型、首尾箭头等相关项。不要把整套字体与图形属性同时铺开。
- Section 可从已有选区创建；普通对象组与命名区域是不同概念。这可直接启发“选中若干对象 → 建立命名区域 → 自动框住内容 → 输入名称”。[Guide](https://help.figma.com/hc/en-us/articles/1500004362321-Guide-to-FigJam)

**冲突与限制。** Quick Create 可以自动加连接和新形状，不能用于本项目 D14。页面、会议工具、表情、投票、音乐、AI、分享头像均不该挤入首版。Figma 官方说明其为云产品，离线仅保留已加载内容并待联网同步，明确不计划完整离线模式；因此不能以 FigJam 有 `.jam` 本地副本就声称满足 D17。[Offline](https://help.figma.com/hc/en-us/articles/360040328553-What-can-I-do-offline-in-Figma)；[Local formats](https://help.figma.com/hc/en-us/articles/1500005554982-Guide-to-files-and-folders)

**官方图示。** [完整 UI 标注图](https://help.figma.com/hc/article_attachments/34612820395671)；[工具条分组图](https://help.figma.com/hc/article_attachments/34612823489047)。来源 Explore files，网页版帮助配图；未登录实测，视觉待核验。

## 3. Miro：命名区域应该贯通导航、展示与导出

**官方已确认。** Frame 可通过左侧创建工具或选区创建；区域面板支持缩略图/列表、点击跳转、拖动调整顺序。Present 将区域作为幻灯片展示，隐藏编辑工具和区域标题；可以选择单个或多个区域导出。区域顺序还可按画布中的位置整理。[Frames](https://help.miro.com/hc/en-us/articles/360018261813-Frames)

**值得采用。**

1. 同一个命名区域同时作为“定位入口、展示段落、导出范围”，不分别建三个互不相干的对象系统。
2. 区域抽屉可在用户主动需要时打开：名称、缩略图、顺序；点击只改变视角。它不是替代最近画布抽屉，二者对象层级不同。
3. 选择区域时在就地菜单提供“展示此区域”和“导出此区域”；导出面板应立即高亮可视边界，减少导错范围。

以上为设计适配。首版是否需要区域排序/多个区域依次展示仍未确认，不能把 Miro 的完整幻灯片能力直接加入需求。

**不采用的隐性规则。** Miro 文档甚至提示：有时在对象上新加 Frame 不会附着，需要稍微移动对象。DrawingBoard 应把“归属”设计成明确且可解释的动作，不依赖用户猜测某次轻微拖动是否完成绑定。嵌套 Frame 在导航列表的表现也有特殊限制，不适合作为首版默认模型。Miro 官方系统要求明确目前无离线模式；桌面客户端不等于离线原生工具。[System requirements](https://help.miro.com/hc/en-us/articles/360017731553-System-requirements)

**官方图示。** [区域导航入口](https://help.miro.com/hc/article_attachments/22431681594898)；[选中区域的导出菜单](https://help.miro.com/hc/article_attachments/22431638304914)。来源 Frames；帮助配图，视觉待核验。没有从页面文字推导其具体尺寸/色值。

## 4. Microsoft Whiteboard：研究局部动作，不再作为现行 Windows 独立应用标杆

**必须更新的产品状态。** 微软官方明确 Windows、iOS、Android 独立 Whiteboard 应用于 **2026-10-16** 退休；已安装应用会显示退休体验。工作/学校账户仍可通过 Web、Teams 及受支持 Microsoft 365 入口访问 OneDrive 白板。不能把它说成“现在安装 Windows 独立版就可使用”的同类。[Retirement notice](https://support.microsoft.com/en-us/whiteboard/retirement-standalone-microsoft-whiteboard-apps)

**局部可借鉴。** 官方 Tips 提供 Shift 绘制直线、形状规整、右键就地新建文字/便签、对象对齐参考线，以及置顶/置底。对 DrawingBoard 最有价值的是临近操作位置的反馈：出现对齐参考线但不强迫重排；右键只给当前上下文可执行项；取消选择后保持画布干净。[Tips and tricks](https://support.microsoft.com/en-us/whiteboard/tips-and-tricks-for-microsoft-whiteboard)

**不要混淆。** 官方“墨迹形状识别”营销描述不能证明与本项目单笔末端停顿的状态机完全一致。其 Teams 只读机制是协作权限，不等于 D20 本地展示模式。首版也不需要反应、多人光标、Teams 身份与 OneDrive 保存语义。

**官方图示。** [Teams 会议中的当前白板](https://support.microsoft.com/en-us/whiteboard/media/whiteboard-teams-meeting.png)，来自退休公告，不是独立 Windows 客户端；[右键菜单局部图](https://support.microsoft.com/en-us/whiteboard/media/tips-and-tricks-6.png)，来自 Tips，页面未明确截图版本。形状规整 GIF 直开失败，不将其登记为已经看过的演示。

## 5. Heptabase：内容找回时，应一起找回空间上下文

**官方已确认。** 白板包含卡片、连线、文字与 Section；右键可创建和操作对象，左侧有白板工具条。卡片属于 Card Library，同一张卡可出现在多个白板；从卡片信息点击白板位置能定位回该卡。右侧目录可显示白板 Section 层级。[Fundamental elements](https://wiki.heptabase.com/fundamental-elements)；[UI logic](https://wiki.heptabase.com/user-interface-logic)

**值得采用。** 最近画布搜索结果至少给名称、最近时间和缩略图；打开后恢复视角，而非总把内容缩成整个宇宙。命名区域导航可以提供“直接聚焦到这里”。这借鉴的是“内容与位置一同找回”，不是照搬卡片数据库。

**GUI 结构：官方说明。** 当前左侧不仅是白板列表，还有 Apps、固定标签、文件夹与标签组；右侧可展开资料、目录和聊天。这适合长期研究，不适合 D23 的轻量默认工作区。可以借鉴“按需出现目录”，不要把常驻双侧栏搬来。

**限制。** 官方 1.0 说明其为 Mac/Windows/Linux offline-first 桌面应用；当前 UI 文档则已含 AI research/chat。离线优先并不自动等于无需注册；本轮未验证新用户激活和断网冷启动，不能作这两项承诺。[1.0 offline-first statement](https://wiki.heptabase.com/version-one)

**官方图示。** [当前 UI 与左侧结构](https://wiki.heptabase.com/assets/images/user-interface-logic-01-aec80619961858f92adff764f01b9bbd.png)；[白板卡片场景](https://wiki.heptabase.com/assets/images/fundamental-elements-05-09bdcef0387e799f8ca0ded0d6599e19.png)。来源 UI logic / Fundamental elements，视觉待核验；帮助页未对图片逐一标注 OS。

## 6. Allume（原 Muse）：专注的混合材料空间，平台与画布模型不同

**现行名称。** 本轮打开 `museapp.com` 被重定向到 `allume.com`；官网明确写明 formerly Muse，当前展示 v4.0。支持 Mac、iPad、iPhone，没有 Windows 下载入口。[官网](https://allume.com/)

**官方已确认。** 笔迹、文字、图片、视频、PDF 和文件可混合放置；采用嵌套画板，左边缘有 Inbox；支持搜索快速跳转、PNG/PDF 导出，强调 local-first 与无需持续在线。官网也明确不追求复杂笔刷、文字格式或无限缩放旋转。

**值得采用。** 即使图片、笔迹和文字同时出现，工具也可以保持少量；最近内容入口只在需要时展开。适合用来校准“随时记两笔”的氛围：减少工具背景的存在感，内容边界只在有用途时强调。

**冲突。** 嵌套板的进入/返回语义不能替换 D05 无限画布和命名区域；iPad 手势也不能变成鼠标用户完成任务的前提。官网已有 AI/MCP 入口，不能因此加进首版。官网 local-first 只是官方声明，本轮未测恢复、文件导出重导入或登录依赖。

**官方图示。** [Mac 浅色工作区](https://media.allume.com/website/2026/v4.0/screenshots/Mac%20-%20Darwin%20-%20light.webp)；[iPad Inbox 场景](https://media.allume.com/website/2025/homepage/hero-inbox-ipad.webp)。来源官网。图片平台由资源命名与官网切换标签提供，未将 Apple 界面尺寸当成 Windows 规范。

## 7. Scapple：鼠标键盘优先的“立即写下”，最值得学的是克制

**官方已确认。** 双击空白创建文字节点，节点可以任意放置；拖一个节点到另一个上面建立关系；可以使用连线或箭头、堆叠相关笔记、背景形状、全屏、导出。官网当前列出 Windows 1.4.2、64 位 Windows 10+，以及 macOS 版本。[Overview](https://www.literatureandlatte.com/scapple/overview)

**值得采用。** D13 的双击空白直接写字是好入口，不必先点击 T；最初文字不应被迫进入富文本编辑器、数据库卡片或属性侧栏。相邻操作采用熟悉的选择、移动、复制与键盘撤销。页面草图中的“按钮”常常只需一个框加一行字。

**明确不采用。** 拖节点到节点建立连线会污染本产品“拖边框＝移动”的直接心智模型；这里仅借鉴双击输入，不照搬连接手势。Windows 手册还有双击已有线插入新节点等高级操作，也与“先节点、后连线”不完全一致。[Windows manual](https://www.literatureandlatte.com/docs/Scapple_Manual-Win.pdf)

**GUI 证据边界。** 官网提供自由文字与关系图的图片；其演示视频注明 Mac，不能将所有图片当 Windows 实机。本轮未运行 Scapple，未核验恢复上次视角、后台待命、无账户离线冷启动。不能因它是桌面软件就推定这些全部具备。

**官方图示。** [Scapple 主图](https://www.literatureandlatte.com/wp-content/uploads/2023/05/scapple-main.jpeg)；[文字关系内容实例](https://www.literatureandlatte.com/wp-content/uploads/2023/05/history-of-rock.jpeg)。来源 Overview；图示未明确当前版本与平台，视觉待核验。

## 8. Balsamiq：学页面草图和风格开关，不扩张到完整原型平台

**当前官方 GUI 说明。** 编辑器由工具条、画板和选择后出现的工具条组成；左侧放内容创建入口，顶栏管理项目，右下侧放视角与展示。它支持控件拖放与编辑，PNG、PDF 和 BMPR 可编辑文件导出。[Editor overview](https://balsamiq.com/support/creating-and-editing/editor-overview/)；[Toolbars](https://balsamiq.com/support/creating-and-editing/editor-overview/toolbars/)；[Exporting](https://balsamiq.com/support/sharing/exporting/)

**风格名称不要引用过期记忆。** 旧版常见 Sketch/Wireframe，当前帮助实际写的是 Draft、Sketch、Presentation 三种 Project Style；最后一种是更规整的直线和边角。此处应借鉴“同一结构换呈现风格”，不照抄旧名称。[Project properties](https://balsamiq.com/support/creating-and-editing/editor-overview/project-properties/)

**值得采用。**

1. 当前只需用少量矩形、标签、图片和对齐完成静态页面；将重复对象复制后改字比引入大型组件库更符合首版。
2. 选中后才出现相关属性，允许对象颜色/线型快速修改，避免空态就显示完整表单。
3. “标准 / 轻手绘”设置可用同一小段结构图的两张即时预览解释差异；它只改变规整对象外观，原始笔迹不变。字体切换可能改变布局，不能未经验证连带修改中文字体与字宽。
4. 导出把图片、PDF、可编辑文件作为平行用途，先选择目的与范围，再显示预览。

**产品状态与不采用。** 当前 Cloud 文档已把 AI、可交互原型、账号 Space 作为流程的一部分，均不在本项目首版。Desktop 产品页仍描述离线线框设计，但同时宣布只提供到 2026-12-31，销售/支持正在收尾，不能将旧桌面版当长期现行路线。[Desktop page](https://balsamiq.com/product/desktop/)；[Cloud quick start](https://balsamiq.com/support/getting-started/cloud/quick-start-guide/)

**官方图示。** [当前编辑工作区](https://balsamiq.com/assets/support/wireframing/editor-overview.png)；[工具条标注](https://balsamiq.com/assets/support/wireframing/toolbar-overview.png)；[三种风格对比](https://balsamiq.com/assets/product/editor/project-style-example.png)；[Desktop 页面配图](https://balsamiq.com/assets/product/desktop/balsamiq-desktop-ui.jpg)。前三张来自当前 Cloud/通用帮助，最后一张来自 Desktop 产品页，不能混为同一界面版本。

## 补充筛选：Kinopio 值得知道，但不列为主 GUI 参考

官方帮助确认点击空白建卡片、点击卡片编辑，从连接点拖到另一卡片建立关系，也能拖到空白直接创建新卡；空白拖动的 Paint Select 用涂选进行批量操作。它有 Boxes、Lists、Minimap/目录以及空间搜索。[Help](https://kinopio.club/help/)；[Cards and connections](https://kinopio.club/help/posts/creating-cards-and-connections/?hidden=true)

它的“连到空白造卡片”与 D14 冲突；“空白拖动＝涂选”也不能覆盖智能笔模式。值得借鉴的是明确的批量编辑反馈，以及把组织视图藏在需要时打开的入口。官网说明可以无注册使用，但其离线文档只承诺页面已开时断网继续编辑，**离线启动仍列长期路线**；不能把它当完全离线工具。[Press kit](https://kinopio.club/help/press-kit)；[Offline support](https://kinopio.club/help/posts/offline-support/)

本轮 Press kit 的 Examples In Use 没有被工具提取出工作区图，拿到的直接图片是 Logo，故不冒充界面图，也不据此评价其具体 GUI 色值、字体或控件尺寸。Whimsical 未继续扩展：它与已选 FigJam/Miro 的图表工作流重叠，本轮优先把来源配图和交互冲突查深。

## 可直接交给主研究的图片清单

下表链接均从上文相应官方页面实际提取。**这张表证明图示来源，不证明本子任务已经视觉查看或亲手操作。** 最适合作为用户图片展示的是工作区整体图；局部图用于解释操作。

| 产品与状态 | 直接图片 | 对应来源页 | 平台/限制 |
| --- | --- | --- | --- |
| Concepts 工作区 | [图片](https://cdn.tophatch.com/cms/uploads/image178_1776182215699.png) | [Workspace](https://concepts.app/en/manual/workspace) | 统一手册，包含平台差异 |
| Concepts Windows 标题栏 | [图片](https://cdn.tophatch.com/cms/uploads/image186_1776182217841.png) | [Workspace](https://concepts.app/en/manual/workspace) | 官方标 Windows；局部图 |
| FigJam UI 地图 | [图片](https://help.figma.com/hc/article_attachments/34612820395671) | [Explore](https://help.figma.com/hc/en-us/articles/15300412458647-Explore-FigJam-files) | 浏览器帮助配图 |
| Miro 区域导航 | [图片](https://help.miro.com/hc/article_attachments/22431681594898) | [Frames](https://help.miro.com/hc/en-us/articles/360018261813-Frames) | 区域导航局部状态 |
| Whiteboard 在 Teams 会议 | [图片](https://support.microsoft.com/en-us/whiteboard/media/whiteboard-teams-meeting.png) | [Retirement](https://support.microsoft.com/en-us/whiteboard/retirement-standalone-microsoft-whiteboard-apps) | Teams，不是独立客户端 |
| Heptabase 卡片白板 | [图片](https://wiki.heptabase.com/assets/images/fundamental-elements-05-09bdcef0387e799f8ca0ded0d6599e19.png) | [Elements](https://wiki.heptabase.com/fundamental-elements) | OS 未逐图标注 |
| Allume 浅色 Mac 工作区 | [图片](https://media.allume.com/website/2026/v4.0/screenshots/Mac%20-%20Darwin%20-%20light.webp) | [官网](https://allume.com/) | Mac v4.0 资源路径 |
| Scapple 工作区 | [图片](https://www.literatureandlatte.com/wp-content/uploads/2023/05/scapple-main.jpeg) | [Overview](https://www.literatureandlatte.com/scapple/overview) | 图示版本/OS 未明确 |
| Balsamiq 当前编辑器 | [图片](https://balsamiq.com/assets/support/wireframing/editor-overview.png) | [Editor overview](https://balsamiq.com/support/creating-and-editing/editor-overview/) | 当前帮助，不能标旧 Desktop |
| Balsamiq 风格对比 | [图片](https://balsamiq.com/assets/product/editor/project-style-example.png) | [Properties](https://balsamiq.com/support/creating-and-editing/editor-overview/project-properties/) | 内容图，非整体工作区 |

## 建议的三条 GUI 方向

以下是给后续原型的候选，均保留已经确认的“顶栏 + 上方浮动工具条 + 按需菜单”，不重新发明信息架构。

### A. 中性工作白板：建议作为默认方向

主参考 FigJam 的三层操作分工，辅以 Concepts 的轻量工具收纳。主体使用低存在感的细点背景；顶栏左侧只留最近画布、名称、真实保存状态、新建，右侧保留设置、展示、导出。浮动条保持智能笔、选择、文字、图片、撤销/重做。选中态使用单一强调色与清楚控制点，工具提示带文字，不只依赖图标。彩色主要留给内容和状态，不给每个工具涂不同颜色。

适合流程、结构图和偶尔页面草图。最应验证的是：大矩形内部绘制、边框拖动、双击标签/独立文字、靠近边界画线四种命中是否可预测。

### B. 安静的个人思考纸：只调整材质与密度

参考 Allume 与 Scapple 的少量工具和混合内容，采用纸面感较强但低对比的背景候选；工具容器边框/阴影克制，画布名称与保存状态轻量呈现。允许“标准 / 轻手绘”以内容预览切换，避免整套 GUI 使用手写字体。中文主体保持清晰；较长文本仍有稳定的行距与边距。

适合随时唤出写两笔、个人梳理。不要引入 Apple 透明玻璃材质、嵌套手势或 Scapple 的拖节点互连规则。该方向的风险是过度克制让新手找不到工具，因此初次使用保留一条可关闭的底部操作提示。

### C. 方案草图与展示板：只在有区域时增加组织能力

参考 Miro Frame 与 Balsamiq 的页面表达。命名区域用独立标题与边界显示，不把普通矩形当页面。用户主动打开区域目录时显示缩略图与名字，平时收起。选择区域后可就地导出/展示；展示状态隐藏编辑柄，保留明确退出入口和临时指示点。导出预览必须显示裁切边界、区域名称与尺寸含义。

适合并排比较“首页方案 A/B”和演示流程。大部分时候仍是方向 A 的同一工作区，不建立第二套复杂 UI 编辑器；区域排序、多页 PDF 和顺序展示要另行确认范围。

## 下一步应验证而非继续堆竞品

1. 用同一份含流程图、页面大框、中文标签和图片的样例，对比 A/B 两个视觉候选，确认工具可发现性与画布可读性。
2. 在鼠标实测中区分“仍在绘制的减速”“末端明确停顿”“预览后再次移动”；不要用动画截图推断识别速度。
3. 原型中验证命名区域创建、内容归属、移动、边界调整与导出是一致模型；普通矩形内部绘制不能被容器逻辑打断。
4. 离线冷启动、恢复最后视角、自动保存失败、收起/退出、导出可编辑文件再打开，要独立运行验证；竞品声明与产品草图都不能代替。

本子任务仅新增本笔记，未修改代码、已确认设计文档或其他研究者文件。没有保存独立的通用经验条目：本轮新增主要是会变化的项目选型来源和截图入口，保留在项目研究目录即可。
