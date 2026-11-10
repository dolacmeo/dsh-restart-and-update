# dsh-restart-and-update

DSH 插件：侧栏底部动作行里的「重启」+「更新插件」两个按钮，以及各自的弹窗。

**侧栏一键更新插件与重启 Harness。** 更新按钮带待更新数量；点开能看到每个插件的新旧版本与发布时间，
可以逐项勾选这次要更新谁、维护一份「更新黑名单」、直接从列表里卸载插件；更新完成后按钮变成「重启」，
一键交接给重启弹窗。没有更新时，它就是插件市场入口。

| 更新插件 | 逐项勾选 + 卸载 |
|---|---|
| ![更新弹窗（亮色）](https://raw.githubusercontent.com/dolacmeo/dsh-restart-and-update/HEAD/assets/screenshot-1-updates-light.png) | ![更新弹窗（暗色）](https://raw.githubusercontent.com/dolacmeo/dsh-restart-and-update/HEAD/assets/screenshot-2-updates-dark.png) |
| **设置页：黑名单与窗口位置** | **更新完成 → 重启** |
| ![设置页](https://raw.githubusercontent.com/dolacmeo/dsh-restart-and-update/HEAD/assets/screenshot-3-settings-light.png) | ![重启弹窗（暗色）](https://raw.githubusercontent.com/dolacmeo/dsh-restart-and-update/HEAD/assets/screenshot-4-restart-dark.png) |
| **卸载确认** | |
| ![卸载确认](https://raw.githubusercontent.com/dolacmeo/dsh-restart-and-update/HEAD/assets/screenshot-5-uninstall-light.png) | |

## 界面

- **入口行**：侧栏 `sidebar.footer.action`，两个按钮共用一行（order 1000）。
  - 左：「重启」——44px 行高、左侧 24px 图标位；**只有已经应用或已排队、等着重启生效的更新**才会让它出现橙色提醒 badge。
  - 右：**有更新时**是「更新插件」（带绿色数量 badge）；**没有更新时**变成「插件市场」。
  - 侧栏收进 56px 轨道时两个按钮退成 36×36 图标，badge 变成右上角小圆点。
- **更新弹窗**：标题行右侧是 **重新检查**（↻）和 **设置**（⚙）两个图标按钮；下面依次是说明、
  可滚动插件列表、底部 `取消`（左）/ `更新 (n)`（右），再下面一行是通栏「插件市场」。
  - **每个列表项左侧有复选框，默认全部勾选**；只有勾选的插件会进这次更新，按钮上的数字就是勾选数。
    取消勾选的行整体变淡，不会影响其它行。
  - 插件名行右侧有一个小**卸载**图标；点它会切到卸载确认页，确认后才真正执行。
  - 行尾仍标 `需完全重启` / `更新后刷新即可`，含义见下面「复核结论」。
- **设置页**：点标题行的 ⚙ 直接在弹窗内切换，不叠第二个弹窗；左上角变成返回箭头，底部是 `取消` / `保存`。
  - **更新黑名单**：列出 profile 里所有已安装插件（含 `link:` / `file:` 本地包），勾上的插件在更新检测时被
    完全忽略——不出现在列表里、不计入「已检查」、也不会被更新。更新列表里的勾选只表示「这次更不更新」，
    与黑名单互不影响。
  - **窗口在原位置重启**：完全重启后是否把窗口放回上次的位置和大小。仅在 Windows 桌面版可用，
    其它平台这一项会显示为不可选并说明原因。
  - 设置写在 `$DSH_HOME/restart-and-update.json`（默认 `~/.dsh/restart-and-update.json`），
    重启和换 profile 都还在；保存后立即生效，不用再重启一次。
- **检测时机**：客户端模块挂载后 300ms 检测一次，另外每次窗口重新可见时再检测；
  Host 侧 packument 有 10 分钟缓存——标题行的「重新检查」会绕过缓存真正去问 registry。

## 需要完全重启，还是刷新即可？

**复核结论（v1.2.1）**：`全部插件都要完全重启` 不是误报，但旧版把判定写死成了"有 Host 半就要重启"，
所以在装了 16 个 bundle 插件的机器上，每一行都长一个样子。现在这个结论是算出来的：

1. **插件有没有 Host 半**：沿用市场自己的规则（`hasHostHalf`，`dsh.client` 且无 `dsh.bundle` 才算纯客户端）。
   纯客户端插件的改动下一次页面加载就能拿到 → `刷新即可`。
2. **运行中的 Host 能不能直接换掉旧模块**：DSH 0.2.2 的 profile HMR 服务可以在**不重启**的情况下
   比对磁盘、停用旧模块、按新的 bundle patch 重新组合。更新落地后会调用它一次；
   - 换成功 → 这些插件**不需要**完全重启（页面刷新即可看到新的前端部分），重启按钮不会为它们亮；
   - 换不掉（没有 HMR 服务，或它报了 profile 级重启原因）→ 才标 `需完全重启`，并写进 pending 清单。
3. 因此每行显示的是**这次更新实际需要的动作**，而不是插件清单的静态属性；
   没有 HMR 的旧 Host / CLI Host 会自动退回"有 Host 半就要重启"的保守答案。

## 两种重启

| 按钮 | 行为 | 影响 |
|---|---|---|
| 重启GUI | 导航到带一次性 `?dsh-reload=` 的同一文档 | 只重载前端：重新取文档和客户端插件代码；后端、会话、正在跑的任务都不受影响 |
| 完全重启 | 脱离进程树的 worker：**先结束整个应用** → 可选地跑一次插件市场自更新（最多 120 秒）→ 重新启动 | 整个应用重启，后端一起重启；日志在 `%TEMP%\dsh-restart-and-update\` |
| 取消 | 关闭弹窗 | 无 |

**为什么重启GUI 不用 `location.reload()`**：刷新时 Electron 可能拿缓存里的文档作答，而旧文档带着旧的
`__DSH_BOOT__`（页面启动时的插件图）。那张图里的每个插件 bundle 地址都带版本戳且不可变，所以更新过的
Host 对**每个变过的插件**都只能回 404：页面报 `N entries did not activate`，桌面壳把它当成启动崩溃并重启
整个应用。一次性查询串让这次刷新成为一个任何缓存条目都不认领的新地址；万一拿到的文档还是旧的，客户端会
把 `__DSH_BOOT__.rev` 与 Host `/state` 的 `graphRev` 比一次，不一致就再取一个新文档（每分钟最多一次）。

**平台**：与桌面版 DSH 一致，Windows、macOS、Linux 都支持完全重启。

- Windows 用两个 PowerShell 脚本 + WMI `Win32_Process.Create` 启动 worker（父进程是 WmiPrvSE，
  `taskkill /T` 杀不到），新应用由 WMI 创建，避免认领 worker 残留的 console 而被一起关掉。
- macOS / Linux 用一个 `sh` worker（`detached` + 新会话）等到旧进程退出后再启动：
  macOS 通过 `open -n` 重新打开 `.app`，其它平台直接 `nohup` 重新执行二进制。
- 直接 `node` 启动的 CLI Host 不在范围内（它没有桌面应用可重启），状态接口会说明原因。

## 记住窗口位置（可关闭）

桌面壳每次都把 BrowserWindow 建成 `1280×820`，也没有窗口几何的 IPC。这个插件顺手补上了：

- **怎么拿到窗口**：Host 是 Desktop Host 进程，`process.ppid` 是 Electron 主进程，
  用 `FindWindowExW` 枚举它的 `Chrome_WidgetWin_1` 就是主窗口；测量和移动都走 `user32.dll`
  （桌面版自带的 koffi）。
- **为什么不闪**：主窗口在 Host 启动前就以 `show: false` 创建，恢复发生在窗口还没显示的时候。
- **怎么记**：窗口可见时每 250ms 采样，变化后 800ms 原子写入 `~/.dsh/window-state.json`。
- **开关**：设置页的「窗口在原位置重启」。关掉后不记录也不恢复，立即生效。
- **范围**：仅 Windows 桌面版；其它平台设置项不可选。删除状态文件只是忘掉位置。

`GET /dsh-restart-and-update/state` 会返回 `windowState`、`windowStateSupported`、`canApplyLive`、
`restartMode` 等字段，排查时可以直接看。

## 更新插件

- **检测**：`GET /dsh-restart-and-update/updates`（`?refresh=1` 绕过缓存）读 profile 的 `package.json`，
  只对 npm 依赖逐个查 `registry.npmjs.org`（完整 packument，因为缩略版不含 `time`），比较 semver，
  返回 `{name, installedVersion, installedAt, latestVersion, latestAt, hostHalf, needsRestart}`，
  外加 `installed`（设置页的黑名单列表）、`ignored`（被黑名单跳过的数量）、`settings`，以及两份清单：
  - `updatable` / `packages` —— **还没更新**的插件，驱动更新按钮的绿色 badge。
  - `pendingCount` / `pending` —— **已经应用或已排队、还没被加载**的更新，驱动重启按钮的橙色 badge。
  两者互不派生：没按更新之前，重启按钮永远没有数字。
- **执行**：`POST /dsh-restart-and-update/update`，body `{names:[...]}`（只有勾选的插件），
  需要 `x-dsh-restart-and-update: full`。走桌面端自带的 launcher：
  `dsh plugin --profile <p> add <name>@<精确版本>`——与市场自己用的安装器同一条路径。
  - 用**精确版本**而不是 `@latest`：`@latest` 会被 pnpm 的 release-age 策略挡下却仍报成功。
  - 装完回读 `node_modules/<name>/package.json` 校验磁盘版本；对不上就判失败并给出实际版本。
  - 黑名单里的插件即使被直接点名也会被拒绝（`code: blacklisted`）。
  - 整批装完后调用一次 profile HMR 重组，决定每个插件是否真的还欠一次重启（见上一节）。
- **卸载**：`POST /dsh-restart-and-update/uninstall`，body `{names:[...]}`，同样需要确认头。
  走 `dsh plugin --profile <p> remove <name>` 并回读磁盘确认真的没了；
  卸载会同时清掉这些包的 pending 记录。插件不能卸载正在提问的自己。
- **dshmarket 自己**：它拥有正在运行的 bundle，不能自我替换，所以更新接口把它记为 `deferred`，
  写进 pending（`deferred: true`），重启 badge 立即出现；真正安装交给「完全重启」的 worker，
  没有新版本时 worker 直接跳过（`update-skipped`）。

## 实现

- Host 半 `index.js`：`webServer.register` 七条 exact 路由
  - `GET  /dsh-restart-and-update/state` → 平台、exe、`canRestart`、`restartMode`、`canApplyLive`、`windowStateSupported`、profile、市场信息、`windowState`
  - `GET  /dsh-restart-and-update/settings` / `POST …/settings` → 读取 / 保存黑名单与窗口开关
  - `GET  /dsh-restart-and-update/updates` → 更新清单（含黑名单过滤、发布时间、重启分类）
  - `POST /dsh-restart-and-update/update` → 执行更新（可热应用）
  - `POST /dsh-restart-and-update/uninstall` → 卸载插件
  - `POST /dsh-restart-and-update/install-market` → 安装 dshmarket
  - `POST /dsh-restart-and-update/restart` → 重启（可带 `{"updateSelf":false}`）
  - 写操作都要求 `x-dsh-restart-and-update: full`（跨源页面带不上自定义头），并校验 `Origin` 与 `Host` 同源。
  - 同一时刻只允许一个包操作（更新、卸载、重启互斥）。
- `lib/settings.js`：设置文档的读取 / 归一化 / 原子写入。
- `lib/relaunch.js`：平台判定、安装目录里的 launcher 路径、shell 引号、macOS/Linux 的 `sh` worker。
- `lib/window-state.js`：koffi 绑定 `user32`，启动时在窗口隐藏期间恢复，之后 250ms 采样、800ms 防抖落盘。
- 单测 `npm test`（不需要 Windows 窗口，注入假 Win32 面）：
  - `test/settings.test.mjs`：路径、黑名单归一化、默认值、往返、损坏文件、创建目录
  - `test/relaunch.test.mjs`：平台支持、launcher 路径、shell 引号、更新命令、POSIX worker 关键步骤
  - `test/window-state.test.mjs`：工作区收敛、坏状态文件、首次启动种状态、隐藏窗口恢复、异常吞噬
- Client 半 `client.js`：`window.__ModuleLoader__.load`
  - 槽位：`sidebar.footer.action`（两个按钮）、`shell.overlay`（重启弹窗 900、更新弹窗 901、市场浮层 902）
  - 更新弹窗自己在「列表 / 设置 / 卸载确认」三页之间切换，不叠新的浮层。
  - 文案走 `ctx.locale.register` + `bind`，zh/en 两套；样式以 `--dsw-alias-*` 主题变量为主。

## 安装

```sh
dsh plugin add dsh-restart-and-update
```

版本兼容：Node.js 20+，dsh `>=0.2.0-rc.1 <0.3.0-0`。

## 开发

```sh
git clone https://github.com/dolacmeo/dsh-restart-and-update.git
dsh plugin add <克隆下来的目录>
```

改 Host 半（`index.js` 或 `lib/`）后需要卸载重装以换掉已加载的模块代际：
`dsh plugin remove dsh-restart-and-update` 然后重新 add。

## 发布

`package.json` 里写死了 `publishConfig.registry = https://registry.npmjs.org`，
所以本机 `.npmrc` 指向镜像也不会把包发错地方。发布走 CI（`.github/workflows/release.yml`）：
打 `v*` 标签即校验标签与版本一致并创建 GitHub Release，npm 上传仍需手动 `npm publish`。
