# dsh-restart-and-update

DSH 插件：侧栏底部动作行里的「重启」+「更新插件」两个按钮，以及各自的弹窗。

## 界面

- **入口行**：侧栏 `footArea` 里的 `sidebar.footer.action`（官方说明：设置按钮旁的可选动作），
  排在官方/第三方条目之后（order 1000）。**两个按钮共用这一行**，靠一次注册同时画出：
  - 左：「重启」——44px 行高、左侧 24px 图标位 + 18px 箭头图标、右侧文字。
    **只有"已经更新完、等着重启生效"的插件才会让它出现橙色提醒 badge**
    （`--dsw-alias-state-warn-primary`），tooltip 写「N 个插件已更新，等重启生效」；
    只是"有更新可选"并不会让重启按钮出现数字 —— 那是更新按钮的事。
    重启弹窗里也复述同一句。
  - 右：**有更新时**是「更新插件」（图标为向下箭头落到横线），带蓝色数量 badge；
    **没有更新时**变成「插件市场」（提包图标），点击在本插件自己的浮层里打开市场面板
    （见下面「插件市场」一节；不是切 `dsh-market` 面板 —— 那个 key 默认不存在）。
  - 侧栏收进 56px 轨道时两个按钮退成 36×36 图标，badge 变成右上角小圆点。
- **重启弹窗**：标题 + 说明 + 两行按钮 —— 第一行 `重启GUI` / `完全重启`，第二行 `取消` 独占通栏。
- **更新弹窗**：标题 + 说明 + 可滚动插件列表（每行：插件名、当前版本 + 发布时间 → 新版本 + 发布时间，
  行尾标 `需完全重启` / `刷新即可`），底部两按钮 `取消`（左）/ `更新 (n)`（右）。
  - 列表 `max-height: min(52vh, 420px)` + `overflow-y:auto`，卡片本身
    `max-height: calc(100vh - 48px)`，列表再长也只滚动列表，不会把按钮挤出屏幕。
- **检测时机**：客户端模块挂载后 300ms 检测一次（即页面/应用启动后就有 badge），
  另外每次窗口重新可见时再检测一次；Host 侧 packument 有 10 分钟缓存，重复检测很便宜。

## 两种重启的区别

| 按钮 | 行为 | 影响 |
|---|---|---|
| 重启GUI | 浏览器页面 `location.reload()` | 只重载前端，重新拉取客户端插件代码；后端、会话、正在跑的任务都不受影响 |
| 完全重启 | Host 路由 `POST /dsh-restart-and-update/restart` 拉起一个脱离进程树的 PowerShell worker：可选先跑一次插件更新 → `taskkill /T /F` 杀掉整个应用 → 重新启动 `DeepSeek Harness.exe` | 整个应用重启，后端一起重启；日志落在 `%TEMP%\dsh-restart-and-update\restart-*.log` |
| 取消 | 关闭弹窗 | 无 |

## 插件市场

没有待更新插件时，第二个按钮变成「插件市场」。点击后由本插件开一个全屏浮层，
里面是市场自己的面板（`discover` 分栏）。

- **为什么不是 `selectPanel('dsh-market')`**（之前的错误做法）：市场的侧栏面板
  **默认关闭**（市场源码注释：*Off by default*），所以 `main` 槽位里根本没有 `dsh-market` 这个 key，
  选中它是个静默空操作 —— 这就是之前"点了没反应"的原因。
- **现在的做法**：用市场公开的 client service —— `ctx.get('market')`，
  它的 `render({preferredSubsectionId:'discover'})` 返回市场整块面板（自带错误边界）的 React 元素。
  README（`UPDATE-API-V1.md`）明确这是"把市场渲染进自己的容器"的官方途径。
  元素每次打开时构建一次、关闭即丢弃，避免每次 store 通知都重建市场面板。
- **市场没装时**：浮层不是空白提示，而是一个安装确认框 ——
  「插件市场没有安装 / 这个按钮需要 dshmarket 插件。要现在安装吗？」
  左 `取消`、右 `安装`。点安装走 `POST /dsh-restart-and-update/install-market`
  → `dsh plugin --profile <p> add dshmarket@<最新版本>` → 回读磁盘版本校验，
  成功后提示「已安装（版本号），重启后可用」并直接给一个 `完全重启` 按钮。
  市场装好但当前进程没提供界面时（刚装完还没重启、或被停用），文案换成
  「已安装但未加载」并给 `打开插件页`。
- **回退**：若服务取不到，就 `layout.selectPanel('plugins')` 跳到插件页（市场的 Discover 是它里面的一个 tab）。
- **Client 半的 `ctx` 是受限接口**：只有 `get` / `on` / `provide` / `effect`，
  **没有 `inject`、没有 `reflect`**。所以这里一律用 `ctx.get(name)` + undefined 判断，
  绝不能用 `ctx.inject(...)` —— 那会直接抛异常把整个客户端插件搞挂。

## 更新插件

- **检测**：`GET /dsh-restart-and-update/updates` 读 profile 的 `package.json`，只对 npm 依赖逐个查
  `registry.npmjs.org`（完整 packument，因为缩略版不含 `time`），比较 semver，返回
  `{name, installedVersion, installedAt, latestVersion, latestAt, needsRestart}`，外加两份互相独立的清单：
  - `updatable` / `packages` —— **还没更新**的插件，驱动更新按钮的蓝色 badge。
  - `pendingCount` / `pending` —— **已经更新完、还没被加载**的插件，驱动重启按钮的橙色 badge。
  两者互不派生：没按更新之前，重启按钮永远没有数字。
  `pending` 记在 Host 的 `%TEMP%\dsh-restart-and-update\pending-updates.json`（不是页面状态），
  所以刷新页面不会让它消失；真正「完全重启」时在拉起 worker 前清空。
  读取时还会按"当前磁盘版本 == 记录里的版本"过滤，插件若又变过就自动掉出清单。
- **刷新还是重启（调查结论）**：判定规则直接采用市场自己的 `hasHostHalf`
  （`dshmarket/lib/verify.js`）：manifest 里 `dsh.bundle === undefined && dsh.client !== undefined`
  才是纯客户端插件 —— 它没有服务端代码，下次页面加载就从磁盘取到新 bundle，**刷新即可**；
  其余（含声明了 `dsh.bundle` 的、以及 `"dsh": {}` 的）都有 Host 半，运行中的进程仍在用启动时
  import 的旧模块，**必须完全重启**。市场自己的 `activationAfterReplace` 也是同一结论：
  host half 曾经 live 的更新，状态一律被改写成 `restart`。
  这条判定只决定"更新完成后进不进 pending 清单"，不决定重启按钮在更新之前显示什么。
  实测本机 16 个 npm 插件全部 `hostHalf=true`（因此纯客户端那条分支暂无真实样本）。
- **执行**：`POST /dsh-restart-and-update/update`，body `{names:[...]}`，需要 `x-dsh-restart-and-update: full`。
  走桌面端自带的 `resources/runtime/cli/bin/dsh.cmd` → `dsh plugin --profile <p> add <name>@<精确版本>`，
  与市场自己用的安装器同一条路径，没有另造一套。
  - 用**精确版本**而不是 `@latest`：`@latest` 会被 pnpm 的 release-age 策略挡下却仍报成功（实测版本原地不动）。
  - 装完回读 `node_modules/<name>/package.json` 校验磁盘版本；对不上就判失败并给出实际版本。
- **dshmarket 自己**：它拥有正在运行的 bundle，不能自我替换，所以更新接口把它记为 `deferred`，
  交给「完全重启」的 worker 在杀进程前执行。**没有新版本时 worker 直接跳过更新步骤**（`update-skipped`）。

## 实现

- Host 半 `index.js`：`webServer.register` 四条 exact 路由
  - `GET  /dsh-restart-and-update/state`   → 平台、exe、`canRestart`、profile、`marketInstalled` / `marketVersion`
  - `GET  /dsh-restart-and-update/updates` → 更新清单（含发布时间、`needsRestart` 分类）
  - `POST /dsh-restart-and-update/update`  → 执行更新
  - `POST /dsh-restart-and-update/install-market` → 安装 dshmarket（市场缺失时按钮触发）
  - `POST /dsh-restart-and-update/restart` → 重启（可带 `{"updateSelf":false}` 跳过市场自更新）
  - 写操作都要求 `x-dsh-restart-and-update: full`（跨源页面带不上自定义头，预检被拒，等于 CSRF 挡板）
    并且校验 `Origin` 与 `Host` 同源。
  - worker 用 WMI `Win32_Process.Create` 启动（父进程是 WmiPrvSE），所以 `taskkill /T` 杀不到它；
    脚本只带 start PID / exe 路径 / 日志路径 / 更新命令，**不落任何凭据**。
  - **重启后的应用必须由 WMI 创建，不能是 worker 的子进程**。worker 由 WMI 启动时仍带一个
    console 宿主；Chromium（Electron 主进程）启动时会 `AttachConsole(ATTACH_PARENT_PROCESS)`
    认领父进程的 console。若应用是 worker 的子进程，它就会认领那个 console：worker 退出后
    窗口残留，用户关掉它 → 走 `CTRL_CLOSE_EVENT` → 整个 Harness 被杀。
    `Win32_Process.Create` 由 WmiPrvSE 执行、后者没有 console，应用便无从认领。
    实测（用一个会 `AttachConsole` 的 GUI 替身）：子进程路径 `attachParent=True` 且
    `consoleWindow` 与 worker 相同；WMI 路径 `attachParent=False, consoleWindow=0`。
  - worker 还会 `ShowWindow(GetConsoleWindow(), SW_HIDE)` 作为第二道保险。
  - `Start-Process` 只作最后兜底：它会把 worker 的 console 传给应用，只在 WMI 创建失败时使用。
- Client 半 `client.js`：`window.__ModuleLoader__.load`
  - 槽位：`sidebar.footer.action`（两按钮，order 1000）、`shell.overlay`（重启弹窗 order 900、
    更新弹窗 order 901）
  - 无更新时第二个按钮变成市场入口：`ctx.layout.selectPanel('dsh-market')` —— 市场把自己注册成
    这个 key 的 `main` 面板，`selectPanel` 也是 `dsh-ssh` 打开自己面板用的同一调用。
  - 文案走 `ctx.locale.register` + `bind`，zh/en 两套
  - 样式全部 `--dsw-alias-*` 主题变量，无硬编码配色

## 源码位置

`C:\Users\dolacmeo\.AgentWorkspace\cli\plugins\dsh-restart-and-update\`

安装/更新：`plugin_manager install_bundle`，target 指向本目录。
替换已安装包需要重启（新 JS 模块代际），这也是本插件存在的理由之一。
