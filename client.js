window.__ModuleLoader__.load({
  id: 'dsh-restart-and-update',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-restart-and-update';
    const ROUTE = '/dsh-restart-and-update';

    /* page-reload:start
       How this page gets a newer document.

       A plain `location.reload()` is not enough. The document it returns can be
       answered from an Electron cache entry instead of the Host, and a stale
       document carries an old `__DSH_BOOT__` - the startup graph the page was
       built with. Every plugin bundle address in that graph is revision-stamped
       and immutable, so the Host answers 404 for every plugin whose bundle
       changed since, the page reports "N entries did not activate", and the
       Desktop shell treats that as a boot crash and restarts the whole app.
       Addressing the document with a one-off query makes the reload a URL no
       cache entry can answer for. */
    const freshDocumentUrl = (href) => {
      try {
        const url = new URL(href);
        url.searchParams.set('dsh-reload', String(Date.now()));
        return url.href;
      } catch {
        return null;
      }
    };
    /** The graph revision this document booted with, or null when the shell published none. */
    const bootedGraphRev = () => {
      try {
        const boot = window.__DSH_BOOT__;
        return boot && typeof boot.rev === 'string' && boot.rev !== '' ? boot.rev : null;
      } catch {
        return null;
      }
    };
    /** Whether this document is older than the plugin graph the Host serves right now. */
    const staleBootGraph = (bootRev, liveRev) => typeof bootRev === 'string' && typeof liveRev === 'string'
      && bootRev !== '' && liveRev !== '' && bootRev !== liveRev;
    /* page-reload:end */

    const COPY = {
      zh: {
        restart: '重启',
        update: '更新插件',
        title: '重启 DeepSeek Harness',
        intro: '选择这次重启的范围：',
        gui: '重启GUI',
        full: '完全重启',
        cancel: '取消',
        guiHint: '重启GUI 只重新加载界面，会话与正在运行的任务不受影响。',
        fullHint: '完全重启 会关闭并重新启动整个应用，后端一同重启；若市场有新版本，会先更新再重启。',
        busyGui: '正在重新加载界面…',
        busyFull: '正在请求重启…',
        restarting: '窗口即将关闭，随后会自动重新打开。',
        failed: '重启没有成功：',
        unsupported: '当前运行方式不支持完全重启。',
        updatesTitle: '更新插件',
        updatesIntro: '这些插件有新版本：',
        checking: '正在检查更新…',
        updatesEmpty: '所有插件都是最新版本。',
        updatesChecked: '已检查 {checked} 个插件',
        current: '当前',
        latest: '新版',
        updating: '正在更新…',
        deferredNote: '市场插件（dshmarket）不能自我替换，会在下次「完全重启」时先更新再重启。',
        updateFailed: '更新失败：',
        updateAction: '更新',
        close: '关闭',
        unknownTime: '未知时间',
        market: '插件市场',
        marketMissing: '没有找到插件市场（dshmarket 可能未安装或未启用）。',
        marketAbsentTitle: '插件市场没有安装',
        marketAbsentBody: '这个按钮需要 dshmarket 插件。要现在安装吗？安装完需要完全重启才能生效。',
        marketInstall: '安装',
        marketInstalling: '正在安装插件市场…',
        marketInstalled: '插件市场已安装（{version}），重启后可用。',
        marketNotLoadedTitle: '插件市场已安装但未加载',
        marketNotLoadedBody: 'dshmarket 在 profile 里，但当前没有提供市场界面。可能是刚安装、需要完全重启，或它被停用了。',
        marketOpenPluginsPage: '打开插件页',
        restartBadge: '{count} 项更新等待重启',
        needsRestart: '需完全重启',
        reloadOnly: '更新后刷新即可',
        restartHint: '这个插件有服务端代码，更新后需要完全重启才会加载新版本。',
        reloadHint: '更新时服务端部分会热应用，刷新页面后前端部分也会换成新版本。',
        afterUpdate: '更新完成：{restart} 个插件需完全重启，{reload} 个刷新页面即可。',
        allReload: '更新完成：刷新页面即可生效。',
        allRestart: '更新完成：需要完全重启才会生效。',
        allHot: '更新完成：新版本已经在运行中生效。',
        checkNow: '重新检查',
        refresh: '重新检查',
        checkingNow: '正在重新检查…',
        rechecked: '已重新检查 {checked} 个插件（{time}）',
        settings: '设置',
        settingsTitle: '插件更新设置',
        settingsIntro: '这些设置保存在本机，重启后依然有效。',
        blacklistTitle: '更新黑名单',
        blacklistHint: '勾选的插件不参与更新检测：列表里不出现，也不会被更新。',
        blacklistEmpty: '这个 profile 里还没有可以更新的插件。',
        backToList: '返回列表',
        restoreWindowTitle: '窗口在原位置重启',
        restoreWindowHint: '完全重启后，把窗口放回上次的位置和大小。',
        restoreWindowUnsupported: '当前平台不支持：窗口位置记忆只在 Windows 桌面版可用。',
        save: '保存',
        saving: '正在保存…',
        settingsSaved: '设置已保存。',
        settingsFailed: '设置没有保存：',
        uninstall: '卸载',
        uninstallTitle: '卸载插件',
        uninstallQuestion: '要卸载 {name} 吗？',
        uninstallHint: '卸载后需要完全重启，才能把它从正在运行的进程里彻底移除；卸载本身在重启前不会破坏当前会话。',
        uninstalling: '正在卸载…',
        uninstallFailed: '卸载失败：',
        uninstallDone: '{name} 已卸载。',
        selectHint: '只有勾选的会更新',
        selected: '已选择 {count} 个',
        selectionRequired: '请至少勾选一个插件',
        hotApply: '更新后自动生效',
        ignoredNote: '忽略 {count} 个',
        hostStaleHint: 'Host 端还是旧版本：设置页和卸载接口要重启一次才会加载，请用「重启 → 完全重启」。',
        localSource: '本地',
      },
      en: {
        restart: 'Restart',
        update: 'Update plugins',
        title: 'Restart DeepSeek Harness',
        intro: 'Choose how much to restart:',
        gui: 'Restart GUI',
        full: 'Restart everything',
        cancel: 'Cancel',
        guiHint: 'Restart GUI reloads the interface only; sessions and running turns continue.',
        fullHint: 'Restart everything closes and relaunches the whole app; if the market has a new version it is updated first.',
        busyGui: 'Reloading the interface…',
        busyFull: 'Requesting the restart…',
        restarting: 'This window will close and reopen automatically.',
        failed: 'The restart did not go through: ',
        unsupported: 'A full restart is not available in this runtime.',
        updatesTitle: 'Update plugins',
        updatesIntro: 'These plugins have newer versions:',
        checking: 'Checking for updates…',
        updatesEmpty: 'Every plugin is up to date.',
        updatesChecked: 'Checked {checked} plugins',
        current: 'now',
        latest: 'new',
        updating: 'Updating…',
        deferredNote: 'The market (dshmarket) cannot replace itself; it is updated first on the next full restart.',
        updateFailed: 'Update failed: ',
        updateAction: 'Update',
        close: 'Close',
        unknownTime: 'unknown date',
        market: 'Plugin market',
        marketMissing: 'The plugin market is not available (dshmarket may be missing or disabled).',
        marketAbsentTitle: 'The plugin market is not installed',
        marketAbsentBody: 'This button needs the dshmarket plugin. Install it now? A full restart is required afterwards.',
        marketInstall: 'Install',
        marketInstalling: 'Installing the plugin market…',
        marketInstalled: 'The plugin market is installed ({version}) and becomes available after a restart.',
        marketNotLoadedTitle: 'The plugin market is installed but not loaded',
        marketNotLoadedBody: 'dshmarket is in this profile, but it provides no market UI right now — it may have just been installed and need a full restart, or it is disabled.',
        marketOpenPluginsPage: 'Open the Plugins page',
        restartBadge: '{count} update(s) waiting for a restart',
        needsRestart: 'needs restart',
        reloadOnly: 'reload after updating',
        restartHint: 'This plugin ships server-side code; a full restart loads the new version.',
        reloadHint: 'The server half is swapped live during the update; a page reload brings the new client half.',
        afterUpdate: 'Updated: {restart} need a full restart, {reload} only need a reload.',
        allReload: 'Updated: reload the page to apply.',
        allRestart: 'Updated: a full restart is required.',
        allHot: 'Updated: the new versions are already running.',
        checkNow: 'Check again',
        refresh: 'Check again',
        checkingNow: 'Checking again…',
        rechecked: 'Re-checked {checked} plugins ({time})',
        settings: 'Settings',
        settingsTitle: 'Plugin update settings',
        settingsIntro: 'These settings are stored on this machine and survive a restart.',
        blacklistTitle: 'Update blacklist',
        blacklistHint: 'Checked plugins are left out of the update check: they are not listed, counted, or updated.',
        blacklistEmpty: 'This profile has no updatable plugins yet.',
        backToList: 'Back to the list',
        restoreWindowTitle: 'Reopen the window where it was',
        restoreWindowHint: 'After a full restart the window returns to its previous position and size.',
        restoreWindowUnsupported: 'Not on this platform: window memory only works in the Windows desktop app.',
        save: 'Save',
        saving: 'Saving…',
        settingsSaved: 'Settings saved.',
        settingsFailed: 'Settings were not saved: ',
        uninstall: 'Uninstall',
        uninstallTitle: 'Uninstall plugin',
        uninstallQuestion: 'Uninstall {name}?',
        uninstallHint: 'The plugin leaves the profile now and unloads on the next full restart; the current session keeps working until then.',
        uninstalling: 'Uninstalling…',
        uninstallFailed: 'Uninstall failed: ',
        uninstallDone: '{name} has been uninstalled.',
        selectHint: 'only checked ones update',
        selected: '{count} selected',
        selectionRequired: 'Check at least one plugin',
        hotApply: 'applies live',
        ignoredNote: '{count} skipped',
        hostStaleHint: 'The Host half is still the previous build: the settings page and the uninstall route load after one full restart (Restart → Restart everything).',
        localSource: 'local',
      },
    };

    const detectZh = () => {
      const tag = typeof document !== 'undefined' ? document.documentElement.lang : '';
      if (/^zh(-|$)/i.test(tag)) return true;
      if (tag !== '' && !/^en(-|$)/i.test(tag)) return false;
      const first = typeof navigator !== 'undefined' ? navigator.languages?.[0] || navigator.language : '';
      return typeof first === 'string' && /^zh(-|$)/i.test(first);
    };

    /* One module-level store shared by the footer row and both dialogs. Every
       component lives in this factory's closure, so no cross-plugin channel. */
    const store = {
      open: false,
      phase: 'idle',
      error: null,
      updatesOpen: false,
      updatesPhase: 'idle',
      updates: [],
      updatesChecked: 0,
      updatesError: null,
      updatesUpdated: 0,
      updatesRestartCount: 0,
      updatesLive: false,
      updatesDeferred: [],
      /* Applied updates whose new code is on disk but not yet loaded: this is
         what the restart button warns about. It is NOT "updates that would need
         a restart if applied" — that is only a property of the pending list. */
      restartPending: 0,
      checkedOnce: false,
      marketOpen: false,
      /* 'panel' shows the market itself; 'absent' offers to install it; the rest
         are the install's own states plus 'notloaded' for an installed market
         that provides no UI in this process. */
      marketMode: 'panel',
      marketVersion: null,
      marketError: null,
      /* Which page of the update dialog is showing: the plugin list, the
         settings page, or the uninstall confirmation for one row. */
      updatesView: 'list',
      /* Every installed package, as last reported by the check. The settings
         page edits the blacklist from this list. */
      updatesInstalled: [],
      updatesIgnored: 0,
      /* True when the running Host can load updated files without a restart. */
      updatesHotApply: false,
      /* name -> boolean. Missing means "selected": every plugin starts checked. */
      updatesSelection: {},
      /* A one-line result shown above the list (settings saved, plugin removed). */
      updatesNotice: null,
      settings: { blacklist: [], restoreWindow: true },
      /* True when the Host half predates the settings/uninstall routes: the new
         page then explains that a full restart is what loads them, instead of
         pretending the platform lacks the feature. */
      hostStale: false,
      settingsFile: null,
      windowStateSupported: false,
      settingsBusy: false,
      settingsError: null,
      uninstallTarget: null,
      uninstallBusy: false,
      uninstallError: null,
    };
    const listeners = new Set();
    const patch = (next) => {
      Object.assign(store, next);
      for (const listener of [...listeners]) listener();
    };

    const useStore = () => {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const listener = () => force((n) => n + 1);
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }, []);
      return store;
    };

    /** A publish date as a short local date; the registry gives ISO timestamps. */
    const shortDate = (value) => {
      if (typeof value !== 'string' || value === '') return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      const pad = (n) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    const CSS = `
.dsw-rst-actions{display:flex;align-items:center;gap:8px;box-sizing:border-box;width:100%;min-width:0;flex:1 1 auto}
.dsw-rst-trigger{position:relative;display:flex;align-items:center;box-sizing:border-box;flex:1 1 0;min-width:0;height:44px;padding:6px;gap:8px;
  margin:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary,#16181c);
  font:inherit;font-size:14px;line-height:1;text-align:left;cursor:pointer;user-select:none;-webkit-appearance:none;appearance:none}
.dsw-rst-trigger:hover,.dsw-rst-trigger[aria-expanded="true"]{
  background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}
.dsw-rst-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#247bbf);outline-offset:-2px}
.dsw-rst-icon{display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:0 0 auto;
  color:var(--dsw-alias-label-secondary,#5f6368)}
.dsw-rst-icon svg{width:18px;height:18px;display:block}
.dsw-rst-label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsw-rst-badge{--dsw-rst-badge-bg:#15803d;--dsw-rst-badge-fg:#fff;
  flex:0 0 auto;box-sizing:border-box;min-width:18px;height:18px;padding:0 5px;border-radius:9px;
  background:var(--dsw-rst-badge-bg);color:var(--dsw-rst-badge-fg);font-size:11px;font-weight:600;line-height:18px;
  text-align:center;font-variant-numeric:tabular-nums}
body[data-ds-dark-theme] .dsw-rst-badge{--dsw-rst-badge-bg:#3fb950;--dsw-rst-badge-fg:#04140a}
.dsw-rst-actions[data-collapsed="true"]{gap:4px;justify-content:center}
.dsw-rst-actions[data-collapsed="true"] .dsw-rst-trigger{flex:0 0 auto;width:36px;height:36px;padding:0;gap:0;
  justify-content:center}
.dsw-rst-actions[data-collapsed="true"] .dsw-rst-icon{width:18px;height:18px}
.dsw-rst-actions[data-collapsed="true"] .dsw-rst-badge{position:absolute;transform:translate(12px,-12px);
  min-width:15px;height:15px;line-height:15px;font-size:10px;padding:0 4px}
.dsw-rst-actions[data-collapsed="true"] .dsw-rst-slot{position:relative;flex:0 0 auto}
.dsw-rst-actions[data-collapsed="true"] .dsw-rst-slot .dsw-rst-trigger{flex:0 0 auto}
.dsw-rst-slot{display:flex;flex:1 1 0;min-width:0;align-items:center}
.dsw-rst-backdrop{position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;box-sizing:border-box;
  padding:24px;background:rgba(16,18,22,.42);pointer-events:auto}
.dsw-rst-card{box-sizing:border-box;width:376px;max-width:100%;display:flex;flex-direction:column;gap:14px;padding:20px;
  border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:14px;
  background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#16181c);
  box-shadow:0 20px 52px rgba(0,0,0,.3);text-align:left;max-height:calc(100vh - 48px)}
.dsw-rst-card-wide{width:500px}
.dsw-rst-title{margin:0;font-size:15px;font-weight:600;line-height:1.4;flex:0 0 auto}
.dsw-rst-intro{margin:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary,#5f6368);flex:0 0 auto}
.dsw-rst-hints{display:flex;flex-direction:column;gap:4px;margin:0;font-size:12px;line-height:1.55;
  color:var(--dsw-alias-label-secondary,#5f6368);flex:0 0 auto}
.dsw-rst-rows{display:flex;flex-direction:column;gap:8px;flex:0 0 auto}
.dsw-rst-row{display:flex;gap:8px}
.dsw-rst-btn{box-sizing:border-box;flex:1 1 0;min-width:0;min-height:34px;padding:0 12px;border-radius:8px;
  border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));background:var(--dsw-alias-bg-layer-3,#fff);
  color:var(--dsw-alias-label-primary,#16181c);font:inherit;font-size:13px;line-height:1;cursor:pointer;
  -webkit-appearance:none;appearance:none}
.dsw-rst-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}
.dsw-rst-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#247bbf);outline-offset:1px}
.dsw-rst-btn:disabled{opacity:.55;cursor:default}
.dsw-rst-btn-primary{border-color:transparent;
  background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#247bbf));
  color:var(--dsw-alias-label-primary-foreground,#fff)}
.dsw-rst-btn-primary:hover:not(:disabled){
  background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary,#247bbf))}
.dsw-rst-btn-ghost{flex:1 1 100%;border-color:transparent;background:transparent;
  color:var(--dsw-alias-label-primary,#16181c)}
.dsw-rst-btn-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));color:var(--dsw-alias-label-primary,#16181c)}
.dsw-rst-btn-with-icon{display:flex;align-items:center;justify-content:center;gap:6px}
.dsw-rst-btn-icon{display:inline-flex;flex:0 0 auto;width:16px;height:16px}
.dsw-rst-btn-icon svg{display:block;width:16px;height:16px}
.dsw-rst-status{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#5f6368);flex:0 0 auto}
.dsw-rst-error{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-error-primary,#d93025);
  white-space:pre-wrap;word-break:break-word;flex:0 0 auto}
.dsw-rst-list{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;overflow-y:auto;
  overscroll-behavior:contain;flex:1 1 auto;min-height:0;max-height:min(52vh,420px);
  border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:10px;padding:4px}
.dsw-rst-item{display:flex;flex-direction:column;gap:3px;padding:8px 10px;border-radius:7px}
.dsw-rst-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}
.dsw-rst-item-name{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary,#16181c);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsw-rst-item-vers{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;font-size:12px;
  color:var(--dsw-alias-label-secondary,#5f6368);font-variant-numeric:tabular-nums}
.dsw-rst-item-vers code{font:inherit;color:var(--dsw-alias-label-primary,#16181c)}
.dsw-rst-arrow{color:var(--dsw-alias-state-idle-primary,#9aa0a6)}
body[data-ds-dark-theme] .dsw-rst-arrow{color:var(--dsw-alias-label-secondary,#cfd3d6)}
.dsw-rst-time{opacity:1}
.dsw-rst-badge-warn{--dsw-rst-badge-bg:#b45309;--dsw-rst-badge-fg:#fff}
body[data-ds-dark-theme] .dsw-rst-badge-warn{--dsw-rst-badge-bg:#f59e0b;--dsw-rst-badge-fg:#1a1200}
.dsw-rst-item-flag{flex:0 0 auto;font-size:11px;padding:0 6px;border-radius:9px;line-height:16px;
  background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));color:var(--dsw-alias-label-secondary,#5f6368)}
.dsw-rst-sheet{box-sizing:border-box;display:flex;flex-direction:column;width:min(1120px,94vw);height:min(88vh,960px);
  max-width:100%;max-height:100%;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:14px;
  background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#16181c);
  box-shadow:0 24px 64px rgba(0,0,0,.34);overflow:hidden}
.dsw-rst-sheet-head{display:flex;align-items:center;gap:12px;flex:0 0 auto;padding:12px 14px;
  border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1))}
.dsw-rst-sheet-title{margin:0;font-size:14px;font-weight:600;line-height:1.4;flex:1 1 auto;min-width:0}
.dsw-rst-sheet-close{flex:0 0 auto;box-sizing:border-box;width:30px;height:30px;padding:0;border:0;border-radius:8px;
  background:transparent;color:var(--dsw-alias-label-secondary,#5f6368);font:inherit;font-size:18px;line-height:1;
  cursor:pointer}
.dsw-rst-sheet-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));
  color:var(--dsw-alias-label-primary,#16181c)}
.dsw-rst-sheet-close:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#247bbf);outline-offset:-2px}
.dsw-rst-sheet-body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain}
.dsw-rst-sheet-plain{width:min(420px,94vw);height:auto;max-height:min(70vh,560px)}
.dsw-rst-sheet-msg{flex:0 0 auto;display:flex;flex-direction:column;gap:14px;padding:18px 20px 20px}
.dsw-rst-head{display:flex;align-items:center;gap:6px;flex:0 0 auto;min-height:30px;margin:0 0 -4px}
.dsw-rst-head .dsw-rst-title{flex:1 1 auto;min-width:0}
.dsw-rst-iconbtn{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;box-sizing:border-box;
  width:30px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;
  color:var(--dsw-alias-label-secondary,#5f6368);cursor:pointer;-webkit-appearance:none;appearance:none}
.dsw-rst-iconbtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));
  color:var(--dsw-alias-label-primary,#16181c)}
.dsw-rst-iconbtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#247bbf);outline-offset:1px}
.dsw-rst-iconbtn:disabled{opacity:.45;cursor:default}
.dsw-rst-iconbtn svg{width:17px;height:17px;display:block}
.dsw-rst-iconbtn[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));
  color:var(--dsw-alias-label-primary,#16181c)}
.dsw-rst-iconbtn[data-spin="true"] svg{animation:dsw-rst-spin 1s linear infinite}
@keyframes dsw-rst-spin{to{transform:rotate(360deg)}}
.dsw-rst-row-head{display:flex;align-items:center;gap:8px;min-width:0}
.dsw-rst-check{flex:0 0 auto;box-sizing:border-box;width:15px;height:15px;margin:0;cursor:pointer;
  accent-color:var(--dsw-alias-brand-primary,#247bbf)}
.dsw-rst-item-name{flex:1 1 auto;min-width:0}
.dsw-rst-uninstall{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;box-sizing:border-box;
  width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#5f6368);
  cursor:pointer;opacity:.62;-webkit-appearance:none;appearance:none}
.dsw-rst-item:hover .dsw-rst-uninstall,.dsw-rst-uninstall:focus-visible{opacity:1}
.dsw-rst-uninstall:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));
  color:var(--dsw-alias-state-error-primary,#d93025)}
.dsw-rst-uninstall:disabled{opacity:.35;cursor:default}
.dsw-rst-uninstall svg{width:15px;height:15px;display:block}
.dsw-rst-item[data-checked="false"] .dsw-rst-item-name,
.dsw-rst-item[data-checked="false"] .dsw-rst-item-vers{opacity:.52}
.dsw-rst-settings{display:flex;flex-direction:column;gap:12px;flex:1 1 auto;min-height:0;overflow-y:auto;
  overscroll-behavior:contain}
.dsw-rst-setting-title{margin:0;font-size:13px;font-weight:600;line-height:1.4}
.dsw-rst-setting-hint{margin:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,#5f6368)}
.dsw-rst-setting-note{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#5f6368)}
.dsw-rst-blacklist{display:flex;flex-direction:column;gap:2px;margin:0;padding:4px;list-style:none;overflow-y:auto;
  max-height:min(32vh,260px);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:10px}
.dsw-rst-blacklist-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:7px}
.dsw-rst-blacklist-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}
.dsw-rst-blacklist-name{flex:1 1 auto;min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap}
.dsw-rst-blacklist-vers{flex:0 0 auto;font-size:12px;color:var(--dsw-alias-label-secondary,#5f6368);
  font-variant-numeric:tabular-nums}
.dsw-rst-switch{display:flex;align-items:flex-start;gap:10px;cursor:pointer;user-select:none}
.dsw-rst-switch input{flex:0 0 auto;width:16px;height:16px;margin:1px 0 0;cursor:pointer;
  accent-color:var(--dsw-alias-brand-primary,#247bbf)}
.dsw-rst-switch input:disabled{cursor:default}
.dsw-rst-switch-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
.dsw-rst-switch[data-disabled="true"]{cursor:default;opacity:.6}
.dsw-rst-divider{height:1px;margin:0;border:0;background:var(--dsw-alias-border-l1,rgba(0,0,0,.1))}
.dsw-rst-warn{margin:0;font-size:12px;line-height:1.55;color:#b45309;flex:0 0 auto}
body[data-ds-dark-theme] .dsw-rst-warn{color:#fbbf24}
`;

    const RestartIcon = () => h(
      'svg',
      { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
      h('path', {
        d: 'M20 12a8 8 0 1 1-2.34-5.66',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
      h('path', {
        d: 'M20 3.6v4.2h-4.2',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    );

    const UpdateIcon = () => h(
      'svg',
      { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
      h('path', {
        d: 'M12 3.5v11',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
      h('path', {
        d: 'M7.6 10.2 12 14.6l4.4-4.4',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
      h('path', {
        d: 'M4.5 19.5h15',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
    );

    const MarketIcon = () => h(
      'svg',
      { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
      h('path', {
        d: 'M4.5 9.5h15l-1.2 9.2a1.6 1.6 0 0 1-1.6 1.4H7.3a1.6 1.6 0 0 1-1.6-1.4Z',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinejoin: 'round',
      }),
      h('path', {
        d: 'M9 9.5V7.8a3 3 0 1 1 6 0v1.7',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
    );

    const RefreshIcon = () => h(
      'svg',
      { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
      h('path', {
        d: 'M4 12a8 8 0 1 0 2.34-5.66',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
      h('path', {
        d: 'M4 4.2v4.2h4.2',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    );

    const SettingsIcon = () => h(
      'svg',
      { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
      h('path', {
        d: 'M4 7.5h7.6M16.4 7.5H20M4 16.5h3.6M12.4 16.5H20',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
      h('circle', { cx: 14, cy: 7.5, r: 2.4, stroke: 'currentColor', strokeWidth: 2 }),
      h('circle', { cx: 10, cy: 16.5, r: 2.4, stroke: 'currentColor', strokeWidth: 2 }),
    );

    const BackIcon = () => h(
      'svg',
      { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
      h('path', {
        d: 'M14.5 5.5 8 12l6.5 6.5',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    );

    const TrashIcon = () => h(
      'svg',
      { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
      h('path', {
        d: 'M4.5 7h15',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
      h('path', {
        d: 'M9.5 7V5.6A1.6 1.6 0 0 1 11.1 4h1.8a1.6 1.6 0 0 1 1.6 1.6V7',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinejoin: 'round',
      }),
      h('path', {
        d: 'M6.8 7l.8 11.5A1.7 1.7 0 0 0 9.3 20h5.4a1.7 1.7 0 0 0 1.7-1.5L17.2 7',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinejoin: 'round',
      }),
    );

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get('locale');
        const detected = detectZh() ? COPY.zh : COPY.en;
        let translate = null;
        if (locale && typeof locale.register === 'function' && typeof locale.bind === 'function') {
          ctx.effect(() => locale.register(NS, { zh: COPY.zh, en: COPY.en }), 'restart-plugin: locale');
          translate = locale.bind(NS);
        }
        /* The locale dictionary is the only source of copy, but a namespace that
           is not live yet must never surface a raw key in the UI. */
        const t = (key, params) => {
          let value = null;
          if (translate !== null) {
            try {
              value = translate(key, params);
            } catch {
              value = null;
            }
          }
          if (typeof value !== 'string' || value === '' || value === key) {
            value = detected[key] ?? key;
            if (params && typeof value === 'string') {
              value = value.replace(/\{(\w+)\}/g, (whole, name) => (name in params ? String(params[name]) : whole));
            }
          }
          return value;
        };

        ctx.effect(() => {
          const style = document.createElement('style');
          style.setAttribute('data-dsh-restart-and-update', '');
          style.textContent = CSS;
          document.head.appendChild(style);
          return () => {
            style.remove();
          };
        }, 'restart-plugin: styles');

        const openDialog = () => patch({ open: true, phase: 'idle', error: null });
        const closeDialog = () => {
          if (store.phase !== 'idle') return;
          patch({ open: false, phase: 'idle', error: null });
        };
        const closeUpdates = () => {
          if (store.updatesPhase === 'updating') return;
          /* Closing must not erase what the second button knows: while updates
             are still available, the footer keeps showing "update", not the
             market. The next check refreshes this list in place. A check that
             is already in flight stays in flight so reopening cannot start a
             duplicate request. */
          patch({
            updatesOpen: false,
            updatesPhase: store.updatesPhase === 'checking' ? 'checking' : 'idle',
            updatesView: 'list',
            uninstallTarget: null,
            uninstallError: null,
            settingsError: null,
          });
        };

        /**
         * The market's own panel.
         *
         * The market publishes a client service `market` whose `render()` returns
         * its whole panel as an element in this app's React instance — the
         * documented way for a host to show the market in a container of its own.
         * That path works whether or not the market's optional sidebar row is
         * turned on, which `selectPanel('dsh-market')` does not: that row is off
         * by default, so the `main` panel key does not exist and selecting it is a
         * silent no-op. The service is the primary route; layout navigation is the
         * fallback for a composition that provides the panel but not the service.
         */
        let marketService = null;
        // The Client `ctx` here is the restricted surface (`get` / `on` /
        // `provide` / `effect`) — no `inject` and no `reflect`. Resolve the
        // market lazily through `ctx.get` at click time, as documented.
        let marketElement = null;
        /* Bumped whenever an update starts, so a check that was already in flight
           can never overwrite the update's state or its result. */
        let updatesCheckToken = 0;

        const marketApi = () => {
          let value = null;
          try {
            value = ctx.get('market');
          } catch {
            value = null;
          }
          if (value && typeof value.render === 'function') return value;
          return null;
        };

        const openMarket = () => {
          // Primary: host the market's own panel here, which works whether or not
          // the market's optional sidebar row is enabled.
          const api = marketApi();
          if (api !== null) {
            try {
              marketElement = api.render({ preferredSubsectionId: 'discover' });
            } catch {
              marketElement = null;
            }
            patch({ marketOpen: true, marketMode: marketElement === null ? 'notloaded' : 'panel', marketError: null });
            return;
          }
          // No service: ask the Host whether the package is even installed, so the
          // sheet can offer the install instead of dead-ending.
          marketElement = null;
          patch({ marketOpen: true, marketMode: 'checking', marketError: null, marketVersion: null });
          fetch(`${ROUTE}/state`, { headers: { accept: 'application/json' } })
            .then(async (response) => {
              const body = await response.json().catch(() => null);
              if (!response.ok || !body || body.ok !== true) {
                throw new Error((body && body.message) || `HTTP ${response.status}`);
              }
              patch({
                marketMode: body.marketInstalled === true ? 'notloaded' : 'absent',
                marketVersion: typeof body.marketVersion === 'string' ? body.marketVersion : null,
              });
            })
            .catch((error) => {
              patch({ marketMode: 'error', marketError: String((error && error.message) || error) });
            });
        };

        const installMarket = () => {
          if (store.marketMode === 'installing') return;
          patch({ marketMode: 'installing', marketError: null });
          fetch(`${ROUTE}/install-market`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-dsh-restart-and-update': 'full' },
            body: '{}',
          }).then(async (response) => {
            const body = await response.json().catch(() => null);
            if (!response.ok || !body || body.ok !== true) {
              const detail = (body && body.message) || `HTTP ${response.status}`;
              throw new Error(detail);
            }
            patch({
              marketMode: 'installed',
              marketVersion: typeof body.version === 'string' ? body.version : null,
              // The installed market is on disk but not loaded: it is one more
              // update the restart button should warn about.
              restartPending: typeof body.pendingCount === 'number' ? body.pendingCount : store.restartPending + 1,
            });
          }).catch((error) => {
            patch({ marketMode: 'absent', marketError: String((error && error.message) || error) });
          });
        };

        const openPluginsPage = () => {
          let layout = null;
          try {
            layout = ctx.get('layout');
          } catch {
            layout = null;
          }
          if (!layout || typeof layout.selectPanel !== 'function') return;
          try {
            layout.selectPanel('plugins');
            closeMarket();
          } catch {
            // Leave the sheet up: it already explains where to go.
          }
        };

        const closeMarket = () => {
          marketElement = null;
          patch({ marketOpen: false, marketMode: 'panel', marketError: null });
        };

        const restartGui = () => {
          if (store.phase !== 'idle') return;
          patch({ phase: 'gui' });
          window.setTimeout(() => {
            /* A fresh document, never a cached one: see the page-reload helpers. */
            const target = freshDocumentUrl(window.location.href);
            if (target === null) window.location.reload();
            else window.location.replace(target);
          }, 180);
        };

        const restartFull = () => {
          if (store.phase !== 'idle') return;
          patch({ phase: 'full', error: null });
          fetch(`${ROUTE}/restart`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-dsh-restart-and-update': 'full' },
            body: '{}',
          }).then(async (response) => {
            const body = await response.json().catch(() => null);
            if (!response.ok || !body || body.ok !== true) {
              const reason = (body && body.message) || `HTTP ${response.status}`;
              throw new Error(reason);
            }
            patch({ phase: 'restarting' });
          }).catch((error) => {
            patch({ phase: 'idle', error: String((error && error.message) || error) });
          });
        };

        /**
         * Ask the Host which plugins the registry has newer versions for.
         * `refresh` is the dialog's refresh button: it also drops the Host's
         * registry cache, so the answer is new rather than ten minutes old.
         */
        const checkUpdates = (refresh) => {
          if (store.updatesPhase === 'checking' || store.updatesPhase === 'updating') return;
          /* A manual re-check keeps the rows that are on screen: replacing the
             whole body with "checking" is what made the dialog flash. */
          const manual = refresh === true;
          const token = ++updatesCheckToken;
          patch({ updatesPhase: 'checking', updatesError: null, updatesNotice: null });
          fetch(`${ROUTE}/updates${refresh === true ? '?refresh=1' : ''}`, { headers: { accept: 'application/json' } })
            .then(async (response) => {
              const body = await response.json().catch(() => null);
              if (!response.ok || !body || body.ok !== true) {
                throw new Error((body && body.message) || `HTTP ${response.status}`);
              }
              /* An update started while this request was in flight: its result
                 is the newer truth, so this check is dropped entirely. */
              if (token !== updatesCheckToken) return;
              const pending = Array.isArray(body.pending) ? body.pending : [];
              const packages = Array.isArray(body.packages) ? body.packages : [];
              /* A row keeps whatever the user chose, and a row that appeared
                 after that choice starts checked. A batch that completed
                 cleared the map, so its plugins are checked again next time. */
              const selection = {};
              for (const row of packages) selection[row.name] = store.updatesSelection[row.name] !== false;
              /* Fields this page needs were added together with the settings
                 and uninstall routes. Their absence means the Host still runs
                 the previous build: the page can show everything, but saving
                 and removing would 404 until the app is restarted once. */
              const currentHost = Array.isArray(body.installed) && typeof body.hotApply === 'boolean';
              const stamp = new Date();
              const time = [stamp.getHours(), stamp.getMinutes(), stamp.getSeconds()]
                .map((part) => String(part).padStart(2, '0'))
                .join(':');
              patch({
                updatesPhase: 'idle',
                // Only a manual press gets the confirmation line; the invisible
                // startup / visibility checks must not pop a notice.
                updatesNotice: manual ? t('rechecked', { checked: body.checked ?? 0, time }) : null,
                hostStale: !currentHost,
                updates: packages,
                updatesSelection: selection,
                updatesInstalled: Array.isArray(body.installed) ? body.installed : [],
                updatesIgnored: typeof body.ignored === 'number' ? body.ignored : 0,
                updatesHotApply: body.hotApply === true,
                updatesChecked: typeof body.checked === 'number' ? body.checked : 0,
                settings: body.settings && typeof body.settings === 'object' ? body.settings : store.settings,
                restartPending: pending.length,
                checkedOnce: true,
                updatesError: null,
              });
            })
            .catch((error) => {
              if (token !== updatesCheckToken) return;
              patch({ updatesPhase: 'idle', updatesError: String((error && error.message) || error), checkedOnce: true });
            });
        };

        const openUpdates = () => {
          if (store.updatesPhase === 'updating') return;
          patch({
            updatesOpen: true,
            updatesView: 'list',
            updatesError: null,
            updatesUpdated: 0,
            updatesRestartCount: 0,
            updatesLive: false,
            updatesDeferred: [],
            updatesNotice: null,
            uninstallTarget: null,
            uninstallError: null,
            settingsError: null,
          });
          checkUpdates();
        };

        const toggleSelection = (name) => {
          patch({ updatesSelection: { ...store.updatesSelection, [name]: store.updatesSelection[name] === false } });
        };

        /** The update dialog's settings page, loaded fresh from the Host. */
        const loadSettings = () => {
          fetch(`${ROUTE}/settings`, { headers: { accept: 'application/json' } })
            .then(async (response) => {
              const body = await response.json().catch(() => null);
              if (!response.ok || !body || body.ok !== true) {
                throw new Error((body && body.message) || `HTTP ${response.status}`);
              }
              patch({
                settings: body.settings && typeof body.settings === 'object' ? body.settings : store.settings,
                settingsFile: typeof body.settingsFile === 'string' ? body.settingsFile : null,
                windowStateSupported: body.windowStateSupported === true,
                hostStale: false,
                settingsError: null,
              });
            })
            .catch((error) => {
              /* No /settings route: the Host is the previous build. That is a
                 restart away, not a platform limitation. */
              patch({
                hostStale: true,
                settingsError: String((error && error.message) || error),
              });
            });
        };

        const openSettings = () => {
          if (store.updatesPhase === 'updating') return;
          patch({ updatesView: 'settings', settingsError: null, updatesNotice: null });
          loadSettings();
          // The blacklist editor lists every installed plugin; a dialog opened
          // straight into settings still needs that list.
          if (store.updatesInstalled.length === 0 && store.updatesPhase === 'idle') checkUpdates();
        };

        const closeSettings = () => {
          if (store.settingsBusy === true) return;
          patch({ updatesView: 'list', settingsError: null });
        };

        const toggleBlacklist = (name) => {
          const blacklist = Array.isArray(store.settings.blacklist) ? store.settings.blacklist : [];
          const next = blacklist.includes(name)
            ? blacklist.filter((entry) => entry !== name)
            : [...blacklist, name];
          patch({ settings: { ...store.settings, blacklist: next } });
        };

        const toggleRestoreWindow = () => {
          patch({ settings: { ...store.settings, restoreWindow: store.settings.restoreWindow === false } });
        };

        const saveSettings = () => {
          if (store.settingsBusy === true) return;
          patch({ settingsBusy: true, settingsError: null });
          fetch(`${ROUTE}/settings`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-dsh-restart-and-update': 'full' },
            body: JSON.stringify({
              blacklist: Array.isArray(store.settings.blacklist) ? store.settings.blacklist : [],
              restoreWindow: store.settings.restoreWindow !== false,
            }),
          }).then(async (response) => {
            const body = await response.json().catch(() => null);
            if (!response.ok || !body || body.ok !== true) {
              throw new Error((body && body.message) || `HTTP ${response.status}`);
            }
            patch({
              settingsBusy: false,
              settings: body.settings && typeof body.settings === 'object' ? body.settings : store.settings,
              updatesView: 'list',
              updatesNotice: t('settingsSaved'),
            });
            // The blacklist decides what the list shows, so ask again.
            checkUpdates(true);
          }).catch((error) => {
            patch({ settingsBusy: false, settingsError: String((error && error.message) || error) });
          });
        };

        const openUninstall = (name) => {
          if (store.updatesPhase === 'updating') return;
          patch({ updatesView: 'uninstall', uninstallTarget: name, uninstallError: null, updatesNotice: null });
        };

        const closeUninstall = () => {
          if (store.uninstallBusy === true) return;
          patch({ updatesView: 'list', uninstallTarget: null, uninstallError: null });
        };

        const confirmUninstall = () => {
          const name = store.uninstallTarget;
          if (typeof name !== 'string' || store.uninstallBusy === true) return;
          patch({ uninstallBusy: true, uninstallError: null });
          fetch(`${ROUTE}/uninstall`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-dsh-restart-and-update': 'full' },
            body: JSON.stringify({ names: [name] }),
          }).then(async (response) => {
            const body = await response.json().catch(() => null);
            if (!response.ok || !body || body.ok !== true) {
              throw new Error((body && body.message) || `HTTP ${response.status}`);
            }
            patch({
              uninstallBusy: false,
              updatesView: 'list',
              uninstallTarget: null,
              updatesNotice: t('uninstallDone', { name }),
              restartPending: typeof body.pendingCount === 'number' ? body.pendingCount : store.restartPending,
            });
            checkUpdates(true);
          }).catch((error) => {
            patch({ uninstallBusy: false, uninstallError: String((error && error.message) || error) });
          });
        };

        /* The second button is "update" while any update is known, still being
           checked, or failed to check; only a completed check with nothing left
           turns it into the market entry point. Keeping "update" during a
           background check prevents the button flipping on every re-check. */
        const updatesAvailable = () => store.updates.length > 0
          || store.updatesError !== null
          || store.updatesPhase === 'checking'
          || !store.checkedOnce;
        const openSecondButton = () => {
          if (updatesAvailable()) openUpdates();
          else openMarket();
        };

        /** The plugins the user left checked; missing means checked. */
        const selectedUpdates = () => store.updates.filter((row) => store.updatesSelection[row.name] !== false);

        const applyUpdates = () => {
          if (store.updatesPhase !== 'idle') return;
          const names = selectedUpdates().map((row) => row.name);
          if (names.length === 0) {
            patch({ updatesNotice: t('selectionRequired') });
            return;
          }
          /* A check still in flight belongs to the state before this batch. */
          updatesCheckToken += 1;
          patch({ updatesPhase: 'updating', updatesError: null, updatesNotice: null });
          fetch(`${ROUTE}/update`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-dsh-restart-and-update': 'full' },
            body: JSON.stringify({ names }),
          }).then(async (response) => {
            const body = await response.json().catch(() => null);
            if (!response.ok || !body || body.ok !== true) {
              const detail = (body && body.message) || `HTTP ${response.status}`;
              throw new Error(detail);
            }
            const results = Array.isArray(body.results) ? body.results : [];
            const applied = results.filter((row) => row.ok);
            const restartCount = applied.filter((row) => row.needsRestart === true).length;
            const deferred = Array.isArray(body.deferred) ? body.deferred : [];
            // The Host's pending file is authoritative: it also includes the
            // market the restart worker has been handed as a deferred update.
            const pendingCount = typeof body.pendingCount === 'number' ? body.pendingCount : restartCount + deferred.length;
            patch({
              updatesPhase: 'done',
              updatesUpdated: applied.length,
              updatesRestartCount: restartCount,
              updatesLive: body.hotApplied === true,
              updatesDeferred: deferred,
              restartPending: pendingCount,
              updates: [],
              updatesSelection: {},
            });
          }).catch((error) => {
            patch({ updatesPhase: 'idle', updatesError: String((error && error.message) || error) });
          });
        };

        /* From the update dialog into the market: one overlay at a time, and the
           known update list survives so the footer does not change its meaning. */
        const openMarketFromUpdates = () => {
          if (store.updatesPhase === 'updating') return;
          closeUpdates();
          openMarket();
        };

        /* After a batch has landed the useful next step is the restart, so the
           update dialog hands over to the restart dialog instead of leaving a
           dead button behind. */
        const openRestartFromUpdates = () => {
          if (store.updatesPhase === 'updating') return;
          closeUpdates();
          openDialog();
        };

        /* Restart on the left, update on the right: the two share one row.
           With nothing to update the right button opens the market instead, and
           the restart button carries the count of updates that need a restart. */
        function FooterActions(props) {
          const state = useStore();
          const wide = !(props && props.wide === false);
          const count = state.updates.length;
          const updatesBusy = state.updatesPhase === 'updating';
          const pending = updatesAvailable();
          /* The restart badge counts updates applied (or queued) and waiting to
             load. It is not derived from the pending update list above: until
             someone presses update, nothing is waiting for a restart. */
          const restartCount = state.restartPending;
          const restartTitle = restartCount > 0
            ? `${t('restart')} — ${t('restartBadge', { count: restartCount })}`
            : t('restart');
          const secondLabel = pending ? t('update') : t('market');
          return h('div', {
            className: 'dsw-rst-actions',
            'data-collapsed': wide ? 'false' : 'true',
          },
          h('button', {
            type: 'button',
            className: 'dsw-rst-trigger',
            title: restartTitle,
            'aria-label': restartTitle,
            'aria-haspopup': 'dialog',
            'aria-expanded': state.open ? 'true' : 'false',
            onClick: openDialog,
          },
          h('span', { className: 'dsw-rst-icon', 'aria-hidden': 'true' }, h(RestartIcon)),
          wide ? h('span', { className: 'dsw-rst-label' }, t('restart')) : null,
          restartCount > 0
            ? h('span', {
              className: 'dsw-rst-badge dsw-rst-badge-warn',
              'aria-hidden': 'true',
              title: t('restartBadge', { count: restartCount }),
            }, String(restartCount))
            : null),
          h('span', { className: 'dsw-rst-slot' },
            h('button', {
              type: 'button',
              className: 'dsw-rst-trigger',
              title: pending ? t('update') : t('market'),
              'aria-label': pending ? (count > 0 ? `${t('update')} (${count})` : t('update')) : t('market'),
              'aria-haspopup': pending ? 'dialog' : undefined,
              'aria-expanded': pending ? (state.updatesOpen ? 'true' : 'false') : undefined,
              disabled: updatesBusy,
              onClick: openSecondButton,
            },
            h('span', { className: 'dsw-rst-icon', 'aria-hidden': 'true' }, pending ? h(UpdateIcon) : h(MarketIcon)),
            wide ? h('span', { className: 'dsw-rst-label' }, secondLabel) : null,
            count > 0 ? h('span', { className: 'dsw-rst-badge', 'aria-hidden': 'true' }, String(count)) : null)));
        }

        function RestartDialog() {
          const state = useStore();
          const cancelRef = React.useRef(null);
          const open = state.open;
          const busy = state.phase !== 'idle';

          React.useEffect(() => {
            if (!open) return undefined;
            const onKeyDown = (event) => {
              if (event.key !== 'Escape') return;
              event.stopPropagation();
              if (!busy) closeDialog();
            };
            window.addEventListener('keydown', onKeyDown, true);
            return () => window.removeEventListener('keydown', onKeyDown, true);
          }, [open, busy]);

          React.useEffect(() => {
            if (!open) return undefined;
            const node = cancelRef.current;
            if (node && typeof node.focus === 'function') {
              const timer = window.setTimeout(() => node.focus(), 30);
              return () => window.clearTimeout(timer);
            }
            return undefined;
          }, [open]);

          if (!open) return null;

          const status = state.phase === 'gui'
            ? t('busyGui')
            : state.phase === 'full'
              ? t('busyFull')
              : state.phase === 'restarting'
                ? t('restarting')
                : null;

          return h('div', {
            className: 'dsw-rst-backdrop',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget) closeDialog();
            },
          },
          h('div', {
            className: 'dsw-rst-card',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'dsw-rst-title',
          },
          h('h2', { className: 'dsw-rst-title', id: 'dsw-rst-title' }, t('title')),
          h('p', { className: 'dsw-rst-intro' }, t('intro')),
          h('div', { className: 'dsw-rst-hints' },
            h('span', null, t('guiHint')),
            h('span', null, t('fullHint')),
          ),
          state.restartPending > 0
            ? h('p', { className: 'dsw-rst-status' }, t('restartBadge', { count: state.restartPending }))
            : null,
          status === null ? null : h('p', { className: 'dsw-rst-status', role: 'status' }, status),
          state.error === null ? null : h('p', { className: 'dsw-rst-error', role: 'alert' }, t('failed') + state.error),
          h('div', { className: 'dsw-rst-rows' },
            h('div', { className: 'dsw-rst-row' },
              h('button', {
                type: 'button',
                className: 'dsw-rst-btn',
                disabled: busy,
                onClick: restartGui,
              }, t('gui')),
              h('button', {
                type: 'button',
                className: 'dsw-rst-btn dsw-rst-btn-primary',
                disabled: busy,
                onClick: restartFull,
              }, t('full')),
            ),
            h('div', { className: 'dsw-rst-row' },
              h('button', {
                type: 'button',
                ref: cancelRef,
                className: 'dsw-rst-btn dsw-rst-btn-ghost',
                disabled: busy,
                onClick: closeDialog,
              }, t('cancel')),
            ),
          )));
        }

        function UpdatesDialog() {
          const state = useStore();
          const closeRef = React.useRef(null);
          const open = state.updatesOpen;
          const busy = state.updatesPhase === 'updating';
          const checking = state.updatesPhase === 'checking';
          const done = state.updatesPhase === 'done';
          const rows = state.updates;
          const view = state.updatesView;
          const settingsBusy = state.settingsBusy === true;
          const uninstallBusy = state.uninstallBusy === true;

          const backToList = () => {
            if (view === 'settings') closeSettings();
            else if (view === 'uninstall') closeUninstall();
          };

          React.useEffect(() => {
            if (!open) return undefined;
            const onKeyDown = (event) => {
              if (event.key !== 'Escape') return;
              event.stopPropagation();
              if (busy || settingsBusy || uninstallBusy) return;
              if (state.updatesView !== 'list') backToList();
              else closeUpdates();
            };
            window.addEventListener('keydown', onKeyDown, true);
            return () => window.removeEventListener('keydown', onKeyDown, true);
          }, [open, busy, settingsBusy, uninstallBusy, state.updatesView]);

          React.useEffect(() => {
            if (!open) return undefined;
            const node = closeRef.current;
            if (node && typeof node.focus === 'function') {
              const timer = window.setTimeout(() => node.focus(), 30);
              return () => window.clearTimeout(timer);
            }
            return undefined;
          }, [open]);

          if (!open) return null;

          const selectedCount = rows.filter((row) => state.updatesSelection[row.name] !== false).length;
          const blacklist = Array.isArray(state.settings.blacklist) ? state.settings.blacklist : [];
          /* Every installed plugin, not only the registry ones: a link: or
             file: package can be blacklisted too, it simply never shows up in
             the update list anyway. */
          const settingsTargets = state.updatesInstalled;

          const body = [];
          if (view === 'settings') {
            body.push(h('div', { key: 'settings', className: 'dsw-rst-settings' },
              state.hostStale ? h('p', { key: 'stale', className: 'dsw-rst-warn' }, t('hostStaleHint')) : null,
              h('div', null,
                h('h3', { className: 'dsw-rst-setting-title' }, t('blacklistTitle')),
                h('p', { className: 'dsw-rst-setting-hint' }, t('blacklistHint')),
              ),
              settingsTargets.length === 0
                ? (state.hostStale
                  ? null
                  : h('p', { className: 'dsw-rst-setting-note' }, t('blacklistEmpty')))
                : h('ul', { className: 'dsw-rst-blacklist' },
                  settingsTargets.map((row) => h('li', { key: row.name, className: 'dsw-rst-blacklist-item' },
                    h('input', {
                      type: 'checkbox',
                      className: 'dsw-rst-check',
                      checked: blacklist.includes(row.name),
                      disabled: settingsBusy,
                      onChange: () => toggleBlacklist(row.name),
                      'aria-label': row.name,
                    }),
                    h('span', { className: 'dsw-rst-blacklist-name', title: row.name }, row.name),
                    h('span', { className: 'dsw-rst-blacklist-vers' },
                      row.installedVersion ?? (row.source === 'npm' ? '' : t('localSource'))),
                  )),
                ),
              h('hr', { className: 'dsw-rst-divider' }),
              h('label', {
                className: 'dsw-rst-switch',
                'data-disabled': state.windowStateSupported ? 'false' : 'true',
              },
              h('input', {
                type: 'checkbox',
                checked: state.settings.restoreWindow !== false,
                disabled: !state.windowStateSupported || settingsBusy,
                onChange: toggleRestoreWindow,
              }),
              h('span', { className: 'dsw-rst-switch-copy' },
                h('span', { className: 'dsw-rst-setting-title' }, t('restoreWindowTitle')),
                h('span', { className: 'dsw-rst-setting-hint' },
                  state.hostStale
                    ? t('hostStaleHint')
                    : state.windowStateSupported ? t('restoreWindowHint') : t('restoreWindowUnsupported')),
              )),
              state.settingsError === null
                ? null
                : h('p', { className: 'dsw-rst-error' }, t('settingsFailed') + state.settingsError),
            ));
          } else if (view === 'uninstall') {
            body.push(h('div', { key: 'uninstall', className: 'dsw-rst-rows' },
              h('p', { className: 'dsw-rst-intro' }, t('uninstallQuestion', { name: state.uninstallTarget })),
              h('p', { className: 'dsw-rst-status' }, t('uninstallHint')),
              state.uninstallError === null
                ? null
                : h('p', { className: 'dsw-rst-error' }, t('uninstallFailed') + state.uninstallError),
            ));
          } else if (checking && rows.length === 0) {
            body.push(h('p', { key: 'checking', className: 'dsw-rst-status' }, t('checking')));
          } else if (done) {
            const restartCount = state.updatesRestartCount;
            const reloadCount = Math.max(0, state.updatesUpdated - restartCount);
            const summary = restartCount > 0 && reloadCount > 0
              ? t('afterUpdate', { restart: restartCount, reload: reloadCount })
              : restartCount > 0
                ? t('allRestart')
                : state.updatesLive === true
                  ? t('allHot')
                  : t('allReload');
            body.push(h('p', { key: 'done', className: 'dsw-rst-status', role: 'status' }, summary));
            if (state.updatesDeferred.length > 0) {
              body.push(h('p', { key: 'deferred', className: 'dsw-rst-status' }, t('deferredNote')));
            }
          } else if (rows.length === 0) {
            body.push(h('p', { key: 'empty', className: 'dsw-rst-status', role: 'status' }, t('updatesEmpty')));
          } else {
            body.push(h('ul', { key: 'list', className: 'dsw-rst-list' },
              rows.map((row) => {
                const fromDate = shortDate(row.installedAt) ?? t('unknownTime');
                const toDate = shortDate(row.latestAt) ?? t('unknownTime');
                const checked = state.updatesSelection[row.name] !== false;
                return h('li', {
                  key: row.name,
                  className: 'dsw-rst-item',
                  'data-checked': checked ? 'true' : 'false',
                },
                h('div', { className: 'dsw-rst-row-head' },
                  h('input', {
                    type: 'checkbox',
                    className: 'dsw-rst-check',
                    checked,
                    disabled: busy,
                    onChange: () => toggleSelection(row.name),
                    'aria-label': row.name,
                  }),
                  h('span', { className: 'dsw-rst-item-name', title: row.name }, row.name),
                  h('button', {
                    type: 'button',
                    className: 'dsw-rst-uninstall',
                    title: t('uninstall') + ' ' + row.name,
                    'aria-label': t('uninstall') + ' ' + row.name,
                    disabled: busy,
                    onClick: () => openUninstall(row.name),
                  }, h(TrashIcon)),
                ),
                h('span', { className: 'dsw-rst-item-vers' },
                  h('code', null, row.installedVersion),
                  h('span', { className: 'dsw-rst-time' }, fromDate),
                  h('span', { className: 'dsw-rst-arrow', 'aria-hidden': 'true' }, '→'),
                  h('code', null, row.latestVersion),
                  h('span', { className: 'dsw-rst-time' }, toDate),
                  h('span', {
                    className: 'dsw-rst-item-flag',
                    title: row.needsRestart === false ? t('reloadHint') : t('restartHint'),
                  }, row.needsRestart === false ? t('reloadOnly') : t('needsRestart')),
                ));
              }),
            ));
            body.push(h('p', { key: 'summary', className: 'dsw-rst-status' },
              t('selected', { count: selectedCount })
              + ' · ' + t('selectHint')
              + ' · ' + t('updatesChecked', { checked: state.updatesChecked })
              + (state.updatesIgnored > 0 ? ' · ' + t('ignoredNote', { count: state.updatesIgnored }) : '')));
          }

          const refreshinPlace = checking && rows.length > 0;
          const status = state.updatesPhase === 'updating'
            ? t('updating')
            : refreshinPlace ? t('checkingNow') : null;

          const head = h('div', { className: 'dsw-rst-head' },
            h('h2', { className: 'dsw-rst-title', id: 'dsw-rst-updates-title' },
              view === 'settings' ? t('settingsTitle') : view === 'uninstall' ? t('uninstallTitle') : t('updatesTitle')),
            view === 'list'
              ? h('button', {
                type: 'button',
                className: 'dsw-rst-iconbtn',
                title: t('checkNow'),
                'aria-label': t('checkNow'),
                'data-spin': checking ? 'true' : 'false',
                disabled: busy || checking,
                onClick: () => checkUpdates(true),
              }, h(RefreshIcon))
              : null,
            view === 'list'
              ? h('button', {
                type: 'button',
                className: 'dsw-rst-iconbtn',
                title: t('settings'),
                'aria-label': t('settings'),
                disabled: busy,
                onClick: openSettings,
              }, h(SettingsIcon))
              : h('button', {
                type: 'button',
                className: 'dsw-rst-iconbtn',
                title: t('backToList'),
                'aria-label': t('backToList'),
                disabled: settingsBusy || uninstallBusy,
                onClick: backToList,
              }, h(BackIcon)),
          );

          const footer = [];
          if (view === 'settings') {
            footer.push(h('div', { key: 'settings-row', className: 'dsw-rst-row' },
              h('button', {
                type: 'button',
                ref: closeRef,
                className: 'dsw-rst-btn',
                disabled: settingsBusy,
                onClick: closeSettings,
              }, t('cancel')),
              h('button', {
                type: 'button',
                className: 'dsw-rst-btn dsw-rst-btn-primary',
                disabled: settingsBusy,
                onClick: saveSettings,
              }, settingsBusy ? t('saving') : t('save')),
            ));
          } else if (view === 'uninstall') {
            footer.push(h('div', { key: 'uninstall-row', className: 'dsw-rst-row' },
              h('button', {
                type: 'button',
                ref: closeRef,
                className: 'dsw-rst-btn',
                disabled: uninstallBusy,
                onClick: closeUninstall,
              }, t('cancel')),
              h('button', {
                type: 'button',
                className: 'dsw-rst-btn dsw-rst-btn-primary',
                disabled: uninstallBusy,
                onClick: confirmUninstall,
              }, uninstallBusy ? t('uninstalling') : t('uninstall')),
            ));
          } else {
            footer.push(h('div', { key: 'action-row', className: 'dsw-rst-row' },
              h('button', {
                type: 'button',
                ref: closeRef,
                className: 'dsw-rst-btn',
                disabled: busy,
                onClick: closeUpdates,
              }, done ? t('close') : t('cancel')),
              done
                ? h('button', {
                  type: 'button',
                  className: 'dsw-rst-btn dsw-rst-btn-primary dsw-rst-btn-with-icon',
                  title: t('restart'),
                  onClick: openRestartFromUpdates,
                },
                h('span', { className: 'dsw-rst-btn-icon', 'aria-hidden': 'true' }, h(RestartIcon)),
                t('restart'))
                : h('button', {
                  type: 'button',
                  className: 'dsw-rst-btn dsw-rst-btn-primary',
                  disabled: busy || checking || selectedCount === 0,
                  onClick: applyUpdates,
                }, busy ? t('updating') : t('updateAction') + (selectedCount > 0 ? ' (' + selectedCount + ')' : '')),
            ));
            if (!done) {
              footer.push(h('div', { key: 'market-row', className: 'dsw-rst-row' },
                h('button', {
                  type: 'button',
                  className: 'dsw-rst-btn dsw-rst-btn-ghost dsw-rst-btn-with-icon',
                  title: t('market'),
                  disabled: busy,
                  onClick: openMarketFromUpdates,
                },
                h('span', { className: 'dsw-rst-btn-icon', 'aria-hidden': 'true' }, h(MarketIcon)),
                t('market')),
              ));
            }
          }

          return h('div', {
            className: 'dsw-rst-backdrop',
            onMouseDown: (event) => {
              if (event.target !== event.currentTarget) return;
              if (view === 'settings') closeSettings();
              else if (view === 'uninstall') closeUninstall();
              else closeUpdates();
            },
          },
          h('div', {
            className: 'dsw-rst-card dsw-rst-card-wide',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'dsw-rst-updates-title',
          },
          head,
          view === 'list' && rows.length > 0 && state.updatesPhase !== 'done'
            ? h('p', { key: 'intro', className: 'dsw-rst-intro' }, t('updatesIntro'))
            : null,
          state.hostStale && view === 'list'
            ? h('p', { key: 'stale', className: 'dsw-rst-warn' }, t('hostStaleHint'))
            : null,
          state.updatesNotice === null || view !== 'list'
            ? null
            : h('p', { key: 'notice', className: 'dsw-rst-status', role: 'status' }, state.updatesNotice),
          state.updatesError === null || view !== 'list'
            ? null
            : h('p', { key: 'error', className: 'dsw-rst-error', role: 'alert' }, t('updateFailed') + state.updatesError),
          status === null ? null : h('p', { key: 'status', className: 'dsw-rst-status', role: 'status' }, status),
          ...body,
          h('div', { className: 'dsw-rst-rows' }, ...footer),
          ));
        }

        /**
         * The market, hosted in a sheet of ours.
         *
         * `market.render()` hands back the market's whole panel as an element in
         * this app's React instance, so it mounts here unchanged. The element is
         * built once per open (not per render) so typing in the market's search
         * box does not rebuild its tree on every store notification.
         */
        function MarketDialog() {
          const state = useStore();
          const closeRef = React.useRef(null);
          const open = state.marketOpen;

          React.useEffect(() => {
            if (!open) return undefined;
            const onKeyDown = (event) => {
              if (event.key !== 'Escape') return;
              event.stopPropagation();
              closeMarket();
            };
            window.addEventListener('keydown', onKeyDown, true);
            return () => window.removeEventListener('keydown', onKeyDown, true);
          }, [open]);

          React.useEffect(() => {
            if (!open) return undefined;
            const node = closeRef.current;
            if (node && typeof node.focus === 'function') {
              const timer = window.setTimeout(() => node.focus(), 30);
              return () => window.clearTimeout(timer);
            }
            return undefined;
          }, [open]);

          const panel = open ? marketElement : null;
          const mode = state.marketMode;
          const live = mode === 'panel' && panel !== null;

          if (!open) return null;

          const content = [];
          if (live) {
            content.push(h('div', { key: 'panel', className: 'dsw-rst-sheet-body' }, panel));
          } else {
            const inner = [];
            if (mode === 'checking') {
              inner.push(h('p', { key: 'checking', className: 'dsw-rst-status' }, t('checking')));
            } else if (mode === 'absent') {
              inner.push(h('h3', { key: 't', className: 'dsw-rst-title' }, t('marketAbsentTitle')));
              inner.push(h('p', { key: 'b', className: 'dsw-rst-intro' }, t('marketAbsentBody')));
              inner.push(h('div', { key: 'r', className: 'dsw-rst-rows' },
                h('div', { className: 'dsw-rst-row' },
                  h('button', { type: 'button', className: 'dsw-rst-btn', onClick: closeMarket }, t('cancel')),
                  h('button', { type: 'button', className: 'dsw-rst-btn dsw-rst-btn-primary', onClick: installMarket }, t('marketInstall')),
                )));
            } else if (mode === 'installing') {
              inner.push(h('p', { key: 'busy', className: 'dsw-rst-status', role: 'status' }, t('marketInstalling')));
            } else if (mode === 'installed') {
              inner.push(h('p', { key: 'done', className: 'dsw-rst-status', role: 'status' },
                t('marketInstalled', { version: state.marketVersion ?? '?' })));
              inner.push(h('div', { key: 'r', className: 'dsw-rst-rows' },
                h('div', { className: 'dsw-rst-row' },
                  h('button', { type: 'button', className: 'dsw-rst-btn', onClick: closeMarket }, t('close')),
                  h('button', { type: 'button', className: 'dsw-rst-btn dsw-rst-btn-primary', onClick: restartFull }, t('full')),
                )));
            } else if (mode === 'notloaded') {
              inner.push(h('h3', { key: 't', className: 'dsw-rst-title' }, t('marketNotLoadedTitle')));
              inner.push(h('p', { key: 'b', className: 'dsw-rst-intro' }, t('marketNotLoadedBody')));
              inner.push(h('div', { key: 'r', className: 'dsw-rst-rows' },
                h('div', { className: 'dsw-rst-row' },
                  h('button', { type: 'button', className: 'dsw-rst-btn', onClick: closeMarket }, t('cancel')),
                  h('button', { type: 'button', className: 'dsw-rst-btn dsw-rst-btn-primary', onClick: openPluginsPage }, t('marketOpenPluginsPage')),
                )));
            } else {
              inner.push(h('p', { key: 'missing', className: 'dsw-rst-status' }, t('marketMissing')));
              inner.push(h('div', { key: 'r', className: 'dsw-rst-rows' },
                h('div', { className: 'dsw-rst-row' },
                  h('button', { type: 'button', className: 'dsw-rst-btn', onClick: closeMarket }, t('close')),
                  h('button', { type: 'button', className: 'dsw-rst-btn dsw-rst-btn-primary', onClick: installMarket }, t('marketInstall')),
                )));
            }
            /* The restart buttons in this sheet use the shared restart state;
               without this the request would fail silently behind the sheet. */
            if (state.phase === 'full') {
              inner.push(h('p', { key: 'restart-busy', className: 'dsw-rst-status', role: 'status' }, t('busyFull')));
            } else if (state.phase === 'restarting') {
              inner.push(h('p', { key: 'restarting', className: 'dsw-rst-status', role: 'status' }, t('restarting')));
            }
            if (state.error !== null) {
              inner.push(h('p', { key: 'restart-err', className: 'dsw-rst-error', role: 'alert' },
                t('failed') + state.error));
            }
            if (state.marketError !== null) {
              inner.push(h('p', { key: 'err', className: 'dsw-rst-error', role: 'alert' },
                t('updateFailed') + state.marketError));
            }
            content.push(h('div', { key: 'msg', className: 'dsw-rst-sheet-msg' }, ...inner));
          }

          return h('div', {
            className: 'dsw-rst-backdrop',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget) closeMarket();
            },
          },
          h('div', {
            className: live ? 'dsw-rst-sheet dsw-rst-sheet-live' : 'dsw-rst-sheet dsw-rst-sheet-plain',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'dsw-rst-market-title',
          },
          h('div', { className: 'dsw-rst-sheet-head' },
            h('h2', { className: 'dsw-rst-sheet-title', id: 'dsw-rst-market-title' }, t('market')),
            h('button', {
              type: 'button',
              ref: closeRef,
              className: 'dsw-rst-sheet-close',
              'aria-label': t('close'),
              title: t('close'),
              onClick: closeMarket,
            }, '\u00d7'),
          ),
          ...content));
        }

        const slots = ctx.get('slots');
        if (!slots) return;

        /* The sidebar foot stacks its rows: `sidebar.footer.action` (this row) above
           `settingsArea`, which holds the shipped account button and the Settings row.
           One registration owns both buttons so they always share a single row. */
        slots.inject('sidebar.footer.action', () => slots.register({
          name: 'sidebar.footer.action',
          id: 'restart',
          order: 1000,
          label: () => t('restart'),
        }, FooterActions));

        slots.inject('shell.overlay', () => slots.register({
          name: 'shell.overlay',
          id: 'restart-dialog',
          order: 900,
        }, RestartDialog));

        slots.inject('shell.overlay', () => slots.register({
          name: 'shell.overlay',
          id: 'restart-updates-dialog',
          order: 901,
        }, UpdatesDialog));

        slots.inject('shell.overlay', () => slots.register({
          name: 'shell.overlay',
          id: 'restart-market-sheet',
          order: 902,
        }, MarketDialog));

        /* A document can also come up against a graph the Host already replaced:
           a reload answered from a cache entry, or a window restored after the
           plugin set changed. This page cannot repair the graph it booted, so it
           asks once for a document no cache can answer. One attempt per minute
           keeps a Host that keeps changing from turning the window into a reload
           loop. */
        ctx.effect(() => {
          const HEAL_KEY = 'dsh-restart-and-update:stale-boot';
          const HEAL_WINDOW_MS = 60000;
          const heal = () => {
            const bootRev = bootedGraphRev();
            if (bootRev === null) return;
            fetch(`${ROUTE}/state`, { headers: { accept: 'application/json' } })
              .then(async (response) => {
                if (!response.ok) return;
                const body = await response.json().catch(() => null);
                const liveRev = body && body.ok === true && typeof body.graphRev === 'string' ? body.graphRev : null;
                if (!staleBootGraph(bootRev, liveRev)) return;
                let last = 0;
                try {
                  last = Number(window.sessionStorage.getItem(HEAL_KEY) || '0') || 0;
                } catch {
                  last = 0;
                }
                if (Date.now() - last < HEAL_WINDOW_MS) return;
                const target = freshDocumentUrl(window.location.href);
                if (target === null) return;
                try {
                  window.sessionStorage.setItem(HEAL_KEY, String(Date.now()));
                } catch {
                  /* Without sessionStorage the loop guard is gone but the reload
                     below is still the right answer. */
                }
                window.location.replace(target);
              })
              .catch(() => {
                /* Diagnostic only: a Host that cannot answer /state has no graph
                   revision to be stale against. */
              });
          };
          const timer = window.setTimeout(heal, 1200);
          return () => {
            window.clearTimeout(timer);
          };
        }, 'restart-plugin: stale boot guard');

        /* Check once right after startup, so the badges are there without anyone
           opening a dialog, and again whenever the window comes back to the front
           (the Host caches registry documents, so a repeat is cheap). */
        ctx.effect(() => {
          const timer = window.setTimeout(() => {
            checkUpdates();
          }, 300);
          const onVisible = () => {
            if (document.visibilityState === 'visible') checkUpdates();
          };
          document.addEventListener('visibilitychange', onVisible);
          return () => {
            window.clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisible);
          };
        }, 'restart-plugin: startup update check');
      },
    };
  },
});
