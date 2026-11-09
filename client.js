window.__ModuleLoader__.load({
  id: 'dsh-restart-and-update',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-restart-and-update';
    const ROUTE = '/dsh-restart-and-update';

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
        updatesChecked: '已检查 {checked} 个插件。',
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
        reloadOnly: '刷新即可',
        afterUpdate: '更新完成：{restart} 个插件需完全重启，{reload} 个刷新页面即可。',
        allReload: '更新完成：刷新页面即可生效。',
        allRestart: '更新完成：需要完全重启才会生效。',
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
        updatesChecked: 'Checked {checked} plugins.',
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
        reloadOnly: 'reload is enough',
        afterUpdate: 'Updated: {restart} need a full restart, {reload} only need a reload.',
        allReload: 'Updated: reload the page to apply.',
        allRestart: 'Updated: a full restart is required.',
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
.dsw-rst-card-wide{width:460px}
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
          patch({ updatesOpen: false, updatesPhase: store.updatesPhase === 'checking' ? 'checking' : 'idle' });
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
            window.location.reload();
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

        /** Ask the Host which plugins the registry has newer versions for. */
        const checkUpdates = () => {
          if (store.updatesPhase === 'checking' || store.updatesPhase === 'updating') return;
          const token = ++updatesCheckToken;
          patch({ updatesPhase: 'checking', updatesError: null });
          fetch(`${ROUTE}/updates`, { headers: { accept: 'application/json' } })
            .then(async (response) => {
              const body = await response.json().catch(() => null);
              if (!response.ok || !body || body.ok !== true) {
                throw new Error((body && body.message) || `HTTP ${response.status}`);
              }
              /* An update started while this request was in flight: its result
                 is the newer truth, so this check is dropped entirely. */
              if (token !== updatesCheckToken) return;
              const pending = Array.isArray(body.pending) ? body.pending : [];
              patch({
                updatesPhase: 'idle',
                updates: Array.isArray(body.packages) ? body.packages : [],
                updatesChecked: typeof body.checked === 'number' ? body.checked : 0,
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
          patch({ updatesOpen: true, updatesError: null, updatesUpdated: 0, updatesDeferred: [] });
          checkUpdates();
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

        const applyUpdates = () => {
          if (store.updatesPhase !== 'idle' || store.updates.length === 0) return;
          /* A check still in flight belongs to the state before this batch. */
          updatesCheckToken += 1;
          patch({ updatesPhase: 'updating', updatesError: null });
          fetch(`${ROUTE}/update`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-dsh-restart-and-update': 'full' },
            body: JSON.stringify({ names: store.updates.map((row) => row.name) }),
          }).then(async (response) => {
            const body = await response.json().catch(() => null);
            if (!response.ok || !body || body.ok !== true) {
              const detail = (body && body.message) || `HTTP ${response.status}`;
              throw new Error(detail);
            }
            const done = Array.isArray(body.results) ? body.results.filter((row) => row.ok).length : store.updates.length;
            const deferred = Array.isArray(body.deferred) ? body.deferred : [];
            // The Host's pending file is authoritative: it also includes the
            // market the restart worker has been handed as a deferred update.
            const pendingCount = typeof body.pendingCount === 'number'
              ? body.pendingCount
              : store.updates.filter((row) => row.needsRestart !== false).length + deferred.length;
            patch({
              updatesPhase: 'done',
              updatesUpdated: done,
              updatesDeferred: deferred,
              restartPending: pendingCount,
              updates: [],
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

          React.useEffect(() => {
            if (!open) return undefined;
            const onKeyDown = (event) => {
              if (event.key !== 'Escape') return;
              event.stopPropagation();
              if (!busy) closeUpdates();
            };
            window.addEventListener('keydown', onKeyDown, true);
            return () => window.removeEventListener('keydown', onKeyDown, true);
          }, [open, busy]);

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

          const body = [];
          if (state.updatesPhase === 'checking') {
            body.push(h('p', { key: 'checking', className: 'dsw-rst-status' }, t('checking')));
          } else if (state.updatesPhase === 'done') {
            const restartCount = state.restartPending;
            const reloadCount = Math.max(0, state.updatesUpdated - restartCount);
            const summary = restartCount > 0 && reloadCount > 0
              ? t('afterUpdate', { restart: restartCount, reload: reloadCount })
              : restartCount > 0
                ? t('allRestart')
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
                return h('li', { key: row.name, className: 'dsw-rst-item' },
                  h('span', { className: 'dsw-rst-item-name', title: row.name }, row.name),
                  h('span', { className: 'dsw-rst-item-vers' },
                    h('code', null, row.installedVersion),
                    h('span', { className: 'dsw-rst-time' }, fromDate),
                    h('span', { className: 'dsw-rst-arrow', 'aria-hidden': 'true' }, '→'),
                    h('code', null, row.latestVersion),
                    h('span', { className: 'dsw-rst-time' }, toDate),
                    h('span', { className: 'dsw-rst-item-flag' },
                      row.needsRestart === false ? t('reloadOnly') : t('needsRestart')),
                  ));
              }),
            ));
            body.push(h('p', { key: 'checked', className: 'dsw-rst-status' }, t('updatesChecked', { checked: state.updatesChecked })));
          }

          const status = state.updatesPhase === 'updating' ? t('updating') : null;

          return h('div', {
            className: 'dsw-rst-backdrop',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget) closeUpdates();
            },
          },
          h('div', {
            className: 'dsw-rst-card dsw-rst-card-wide',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'dsw-rst-updates-title',
          },
          h('h2', { className: 'dsw-rst-title', id: 'dsw-rst-updates-title' }, t('updatesTitle')),
          rows.length > 0 && state.updatesPhase !== 'done'
            ? h('p', { className: 'dsw-rst-intro' }, t('updatesIntro'))
            : null,
          state.updatesError === null ? null : h('p', { className: 'dsw-rst-error', role: 'alert' }, t('updateFailed') + state.updatesError),
          status === null ? null : h('p', { className: 'dsw-rst-status', role: 'status' }, status),
          ...body,
          h('div', { className: 'dsw-rst-rows' },
            h('div', { className: 'dsw-rst-row' },
              h('button', {
                type: 'button',
                ref: closeRef,
                className: 'dsw-rst-btn',
                disabled: busy,
                onClick: closeUpdates,
              }, state.updatesPhase === 'done' ? t('close') : t('cancel')),
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
                  disabled: busy || checking || rows.length === 0,
                  onClick: applyUpdates,
                }, busy ? t('updating') : `${t('updateAction')}${rows.length > 0 ? ` (${rows.length})` : ''}`),
            ),
            h('div', { className: 'dsw-rst-row' },
              h('button', {
                type: 'button',
                className: 'dsw-rst-btn dsw-rst-btn-ghost dsw-rst-btn-with-icon',
                title: t('market'),
                disabled: busy,
                onClick: openMarketFromUpdates,
              },
              h('span', { className: 'dsw-rst-btn-icon', 'aria-hidden': 'true' }, h(MarketIcon)),
              t('market')),
            ),
          )));
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
