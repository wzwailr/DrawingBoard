# Windows 快开、本地保存与轻量画布来源笔记

核验日期：2026-10-19，Asia/Shanghai。用于 DrawingBoard 选型研究，不改变已确认产品需求。本次没有安装、构建或运行这里的桌面软件；源码观察不能证明启动速度、内存占用、多屏或故障恢复通过验收。

## 1. Penlight：值得拆开看的 Windows 外壳与保存模块

[仓库](https://github.com/Ramonvdo/penlight)。API 当次返回：7 Stars，未归档，创建于 2026-08-13，`pushed_at=2026-10-16T12:24:39Z`。默认分支末提交是 `33c25e55f19d64e4e23e78c71c7f77904984d979`，提交日期 2026-08-21；因此不能把 pushed_at 当成主分支源码最近修改日期。项目很年轻，只有少量公开关注，不宜称为经过长期验证的成熟底座。

仓库 README 描述 Windows 10/11、Tauri v2 / Rust / WebView2、托盘驻留、全局快捷键、持久白板、画布库、指示圈和聚光灯。README 的安装包大小和内存数字只是作者声明，本轮没有复测，不用来承诺 DrawingBoard 性能。

### 1.1 明确可借的机制

| 模块 | 读到的机制 | 适配 DrawingBoard 的价值 |
| --- | --- | --- |
| `boards.rs` | 每张白板一个 JSON；相机位置和缩放单独记录；保存最近白板 ID | 对应恢复上次画布及视角；不是仅恢复图形内容 |
| `boards.rs::write_board` | 写同目录临时文件、`sync_all`、再 rename 替换 | 借鉴保存提交顺序，避免直接覆盖导致半文件；仍需真实故障注入验证 |
| `boards.rs::read_board` | 解析失败返回错误，保留源文件 | 不能把读坏文件当成空白画布再覆盖 |
| `boards.rs::save` | 保存前确认画布还存在 | 防止迟到自动保存把刚删除的画布重新创建 |
| `boards.rs::list` | 抽取元数据并按 updated_at 排序 | 最近画布列表的轻量实现入口 |
| `hotkeys.rs` | 用状态转换统一分发；仅在对应功能开启时注册临时快捷键 | 避免后台全局占用 Esc 等常用按键 |
| `hotkeys.rs::deferred` | 将可能重新注册/注销快捷键的处理移出回调，以避开插件锁的重入问题 | 借鉴事件边界意识；这是该实现的处理方式，不是跨框架通用修复结论 |
| `tray.rs` | 托盘操作转发到同一状态转换；展示状态回写勾选项 | 托盘、快捷键和工具栏不能各自维护一套模式 |

固定源码：

- [boards.rs](https://github.com/Ramonvdo/penlight/blob/33c25e55f19d64e4e23e78c71c7f77904984d979/src-tauri/src/boards.rs)
- [hotkeys.rs](https://github.com/Ramonvdo/penlight/blob/33c25e55f19d64e4e23e78c71c7f77904984d979/src-tauri/src/hotkeys.rs)
- [tray.rs](https://github.com/Ramonvdo/penlight/blob/33c25e55f19d64e4e23e78c71c7f77904984d979/src-tauri/src/tray.rs)
- [LICENSE：MIT](https://github.com/Ramonvdo/penlight/blob/33c25e55f19d64e4e23e78c71c7f77904984d979/LICENSE)，本轮已读取正文。使用、修改与分发应保留该许可要求的版权及许可声明；依赖和资源仍须分别核对。

### 1.2 不应该照搬的部分

- 它主要是透明桌面标注 overlay；我们的主形态是普通窗口。点击穿透、每屏一个透明层、系统聚光灯和放大镜不是首版必要依赖。
- 它依然按工具区分矩形/椭圆，不等于我们的停顿智能笔。
- `set_last` 忽略保存最近 ID 的错误；`list` 会跳过无法解析的文件。本产品要考虑如何让用户看见“某张旧画布读取失败”，而不是静默从最近列表消失。
- `list` 清理临时文件，`delete` 直接删除文件；若未来设计恢复机制，不能未经评估照搬这两种生命周期行为。
- 后端将前端 items 当作不透明 JSON，迁移语义主要留给前端。DrawingBoard 仍需明确文件版本、连接 ID、原始笔迹和规整结果的对应关系。

结论：**适合按模块借鉴；不建议因它有全局快捷键就整体 fork 为产品。**

官方仓库图片（文件路径已在固定提交的 tree 中核实，图片内容未在本笔记中冒充实机核验）：[白板](https://raw.githubusercontent.com/Ramonvdo/penlight/33c25e55f19d64e4e23e78c71c7f77904984d979/.github/assets/whiteboard.png)、[整体展示](https://raw.githubusercontent.com/Ramonvdo/penlight/33c25e55f19d64e4e23e78c71c7f77904984d979/.github/assets/hero.png)。

## 2. gInk / ppInk：短暂唤出与收起值得看，内容模型距离较远

[gInk](https://github.com/geovens/gInk) 当次 API：2,608 Stars，未归档，MIT 标识，末提交 `78aa853bcdc274745a42b776ca3ee22b80179f02`，2025-02-11。README 说明托盘/热键开始绘制、Esc 结束、点击穿透、多屏和截图。

有价值的设计是“预设笔”：一支笔保存颜色、透明度和宽度，避免每次重复调三个参数。对本项目，可以用少量常用样式降低操作量，但不必引入一整排彩笔，也不改变智能笔为主入口。

gInk README 明确有混合 DPI 的已知问题；不能从“支持多屏”推断任意缩放组合都可靠。它也明确将线、箭头、文字等丰富功能指向 [ppInk](https://github.com/pubpub-zz/ppInk)。这些项目更适合研究演示时的进入/退出和工具收纳，不适合作为可编辑节点、绑定标签、语义连接、命名区域的完整底座。

本轮搜索先返回了 ppInk 的另一个 fork，随后根据 gInk README 找到作者指向的 `pubpub-zz/ppInk`。fork 与主线应区分；未对主线 ppInk 全部源码或许可证单独复核，不将其放入已确认可复用代码清单。

官方截图：[gInk screenshot1](https://raw.githubusercontent.com/geovens/gInk/78aa853bcdc274745a42b776ca3ee22b80179f02/screenshot1.jpg)，文件路径已核实。借鉴其工具克制，不将旧版工具样式当作 DrawingBoard 当前视觉目标。

## 3. Lorien：轻量无限画布与纯笔迹文件的参考

[Lorien 主仓库](https://github.com/mbrlabs/Lorien) 当次 API：6,857 Stars，未归档，MIT 标识，GDScript；主分支末提交 `17e32227dfce5477292d9f0a55d6cb07d37a2bb1`，2025-09-22。不要与搜索先出现的 0 Star fork 混淆。

README 描述其以点集合存笔迹、支持无限画布/缩放、撤销重做、无干扰模式、形状工具、SVG 导出，运行于 Windows/Linux/macOS。值得借鉴的是绘图空间优先、内容与视角分开和隐藏工具的专注模式。

但它的中心是笔迹而非语义结构图。没有在本轮证据中确认满足图形标签绑定、连接关系、命名区域或停顿识别。文件格式文档当前仍只有未完成提示，并指向序列化源码：[固定版本 file_format.md](https://github.com/mbrlabs/Lorien/blob/17e32227dfce5477292d9f0a55d6cb07d37a2bb1/docs/file_format.md)。序列化源码读取因网络失败未完成，因此不对内部兼容机制作结论。

结论：**GUI 和笔迹组织的辅助参考，不是本次优先整合底座。** Godot 也是额外技术选择，不能仅凭“无限画布”就决定引入。

官方仓库图：[Lorien demo](https://raw.githubusercontent.com/mbrlabs/Lorien/17e32227dfce5477292d9f0a55d6cb07d37a2bb1/images/lorien_demo.png)，文件路径在固定 tree 中核实。

## 4. Windows 层应该单独验证的事情

这些是根据已确认需求和上述源码推导的验证建议，不是新增已确认功能：

1. 快捷键冲突要可见；仅在必要上下文占用按键；文字输入时不能误收起。
2. 收起保留进程与画布状态，但冷启动、后台唤出和大文件恢复分别计时，不能把暖启动宣传为全部启动速度。
3. 视角和窗口位置是不同层次；多屏断开、高 DPI 改变后都应恢复到可见位置。
4. 保存结果、最近 ID、文件列表和导出文件是不同提交环节；失败不能一律显示“已保存”。
5. 相同对象、绑定和文件应能跨保存重开保持语义；只保住 PNG 不算可编辑恢复。

## 5. 证据限度

GitHub 元数据与关键源码通过只读 API/网页读取；部分 PowerShell TLS、连接器和 raw 文件读取出现间歇失败，采用已经成功的读取结果，不关闭证书校验。没有测试作者性能数字，也没有用 Stars 代替质量判定。另两条路线的画布和识别研究见同目录来源笔记。
