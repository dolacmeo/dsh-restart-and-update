import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')

/** Minimal shell the client half runs against: module loader, timers, location, fetch. */
function boot({ bootRev = 'boot-rev', liveRev = 'live-rev', session = new Map() } = {}) {
  const state = { definition: null, timers: [], replaced: [], fetches: 0, session }
  const React = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    Fragment: 'fragment',
    useState: () => [null, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useMemo: (make) => make(),
    useCallback: (fn) => fn,
    useSyncExternalStore: () => null,
    memo: (value) => value,
  }
  const location = {
    href: 'dsh-app://app/',
    replace: (url) => state.replaced.push(url),
    reload: () => state.replaced.push('reload'),
  }
  const style = { setAttribute: () => {}, textContent: '', remove: () => {} }
  const document = {
    documentElement: { lang: 'en' },
    head: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => style,
    addEventListener: () => {},
    removeEventListener: () => {},
    visibilityState: 'visible',
    body: { appendChild: () => {} },
  }
  const window = {
    __ModuleLoader__: { load: (definition) => { state.definition = definition } },
    __DSH_BOOT__: bootRev === null ? undefined : { rev: bootRev },
    location,
    sessionStorage: {
      getItem: (key) => (session.has(key) ? session.get(key) : null),
      setItem: (key, value) => session.set(key, String(value)),
    },
    setTimeout: (fn, ms) => {
      state.timers.push({ fn, ms })
      return state.timers.length
    },
    clearTimeout: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  const fetch = async (url) => {
    state.fetches += 1
    state.lastFetch = url
    return {
      ok: true,
      json: async () => ({ ok: true, graphRev: liveRev, plugin: 'dsh-restart-and-update' }),
    }
  }
  const ctx = {
    get: (name) => (name === 'slots' ? slots : null),
    effect: (fn) => {
      const dispose = fn()
      return () => dispose?.()
    },
  }
  const registered = []
  const slots = {
    inject: (_name, factory) => factory(),
    register: (definition) => {
      registered.push(definition)
      return definition
    },
  }
  const run = new Function('window', 'document', 'fetch', 'require', 'setTimeout', source + '\nreturn window.__ModuleLoader__;')
  run(window, document, fetch, (name) => {
    if (name === 'react') return React
    throw new Error('unexpected module request: ' + name)
  }, window.setTimeout)
  const module = state.definition.factory((name) => {
    if (name === 'react') return React
    throw new Error('unexpected module request: ' + name)
  })
  module.apply(ctx)
  return { state, registered, slots }
}

/** The guard is one timer; fire it and let its fetch settle. */
async function fireHeal(harness) {
  const timer = harness.state.timers.find((entry) => entry.ms === 1200)
  assert.ok(timer, 'the stale boot guard did not arm')
  timer.fn()
  await new Promise((resolve) => setImmediate(resolve))
  await new Promise((resolve) => setImmediate(resolve))
}

test('a page booted on an older graph asks for a fresh document exactly once', async () => {
  const harness = boot({ bootRev: 'old-graph', liveRev: 'new-graph' })
  await fireHeal(harness)
  assert.equal(harness.state.replaced.length, 1)
  const target = new URL(harness.state.replaced[0])
  assert.equal(target.protocol, 'dsh-app:')
  assert.equal(target.host, 'app')
  assert.equal(target.pathname, '/')
  assert.match(target.searchParams.get('dsh-reload'), /^\d+$/)
})

test('a stale page that reloaded once does not keep reloading', async () => {
  const harness = boot({ bootRev: 'old-graph', liveRev: 'new-graph' })
  await fireHeal(harness)
  await fireHeal(harness)
  assert.equal(harness.state.replaced.length, 1)
})

test('a document that matches the served graph is left alone', async () => {
  const harness = boot({ bootRev: 'same-graph', liveRev: 'same-graph' })
  await fireHeal(harness)
  assert.deepEqual(harness.state.replaced, [])
})

test('a shell without a boot graph, or a host without one, is left alone', async () => {
  const noBoot = boot({ bootRev: null, liveRev: 'new-graph' })
  await fireHeal(noBoot)
  assert.deepEqual(noBoot.state.replaced, [])

  const noHost = boot({ bootRev: 'old-graph', liveRev: null })
  await fireHeal(noHost)
  assert.deepEqual(noHost.state.replaced, [])
})

test('the guard asks the host state route rather than guessing', async () => {
  const harness = boot({ bootRev: 'old-graph', liveRev: 'new-graph' })
  await fireHeal(harness)
  assert.equal(harness.state.lastFetch, '/dsh-restart-and-update/state')
})
