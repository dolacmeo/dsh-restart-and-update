# dsh-restart-and-update

[中文说明](README.md)

A DeepSeek Harness (dsh) plugin that puts **Restart** and **Plugins** in the sidebar foot.

Two buttons share one row. Restart is on the left; the second button shows pending plugin
updates and turns into a plugin-market entry when there is nothing to update.

## Why this one

Restarting Harness from inside Harness has one nasty failure mode on Windows, and getting it
wrong is worse than not having the button:

> An Electron app started with `child_process` or `Start-Process` inherits the parent's
> console. Chromium attaches to it (`AttachConsole(ATTACH_PARENT_PROCESS)`). When the helper
> exits, a console window is left behind — and closing it sends `CTRL_CLOSE_EVENT` to the
> whole process group, killing Harness.

This plugin launches the replacement application through WMI `Win32_Process.Create` instead, so
the new process's parent is `WmiPrvSE`, which owns no console. The detached worker also hides
its own console as a second line of defence. Both paths were measured with a purpose-built
GUI-subsystem stand-in that calls `AttachConsole`: the child path came back
`attachParent=True` with a console window, the WMI path `attachParent=False, consoleWindow=0`.

## What it does

| | |
|---|---|
| **Restart** | Dialog with `Restart GUI` / `Restart everything` / `Cancel`. GUI restart reloads the page only; a full restart kills and relaunches the whole app. |
| **Badges** | Green count on the second button = plugins with a newer version available. Orange count on Restart = updates **applied or queued** whose new code is not loaded yet. These are deliberately independent: nothing is "waiting for a restart" until you press Update or queue the market. |
| **Updates** | Lists each plugin's current version and publish date against the new one, in a height-capped, scrollable list. Installs through the profile's own launcher (`dsh plugin add <name>@<exact version>`), then re-reads the on-disk manifest to verify. The dialog also carries a Plugin market button that closes it and opens the market sheet. |
| **Restart or reload?** | Decided by the same rule the market uses (`hasHostHalf`): a package with only `dsh.client` is browser code and takes effect on reload; anything with a Host half needs the full restart. |
| **The market itself** | `dshmarket` cannot replace its own running bundle, so a full restart hands that one update to the detached worker, which runs it *before* the process dies — and skips the step entirely when there is nothing newer. |
| **Market entry point** | With no updates pending, the second button opens the market in a sheet of this plugin's own, using the market's published `market.render()` service. The update dialog has the same entry. If the market is not installed, the sheet offers to install it. |

## API

All routes live under `/dsh-restart-and-update`. Mutations require the
`x-dsh-restart-and-update: full` header — a cross-origin page cannot send it, so the preflight
fails and the header doubles as a CSRF guard. Every route also checks `Origin` against `Host`.

| Route | |
|---|---|
| `GET /state` | platform, executable, restart capability, profile, market presence |
| `GET /updates` | updatable packages with publish dates, plus the pending-restart list |
| `POST /update` | `{"names":[...]}` |
| `POST /install-market` | install `dshmarket` |
| `POST /restart` | relaunch the app (`{"updateSelf":false}` skips the market self-update) |

## Requirements

- Windows for the full restart (the GUI reload path is platform-independent).
- Node.js 20+, dsh `>=0.2.0-rc.1 <0.3.0-0`.

## Install

```sh
dsh plugin add dsh-restart-and-update
```

Or install the folder directly with `dsh plugin add <path-to-checkout>`.

## License

MIT
