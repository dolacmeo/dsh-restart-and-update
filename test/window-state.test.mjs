import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { setTimeout as sleep } from 'node:timers/promises'

const {
  fitToWorkArea,
  readWindowState,
  startWindowState,
  windowStatePath,
} = await import('../lib/window-state.js')

/** Point the state file at a throwaway DSH_HOME for the duration of one test. */
async function withHome(run) {
  const previous = process.env.DSH_HOME
  const home = await mkdtemp(join(tmpdir(), 'dsh-ru-window-'))
  process.env.DSH_HOME = home
  try {
    return await run(home)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(home, { recursive: true, force: true })
  }
}

/** A Win32 surface that only knows about one window. */
function fakeWindow(initial, { visible = false, throwOn } = {}) {
  const state = { rect: { ...initial }, visible }
  const api = {
    windowsOf: () => {
      if (throwOn === 'windowsOf') throw new Error('enumeration failed')
      return [1]
    },
    rectOf: () => {
      if (throwOn === 'rectOf') throw new Error('the handle died')
      return { ...state.rect }
    },
    isVisible: () => state.visible,
    isMinimized: () => false,
    isMaximized: () => false,
    maximize: () => {},
    move: (_handle, rect) => { state.rect = { ...rect } },
    workAreaOf: () => ({ x: 0, y: 0, width: 1600, height: 900 }),
  }
  return {
    api,
    show: () => { state.visible = true },
    rect: () => ({ ...state.rect }),
  }
}

const quiet = { info: () => {}, warn: () => {} }

test('an on-screen rect keeps its size, clamped to the work area', () => {
  const work = { x: 0, y: 0, width: 1600, height: 900 }
  assert.deepEqual(fitToWorkArea({ x: 10, y: 20, width: 800, height: 600 }, work), {
    x: 10,
    y: 20,
    width: 800,
    height: 600,
  })
  assert.deepEqual(fitToWorkArea({ x: 10, y: 20, width: 2000, height: 1200 }, work), {
    x: 10,
    y: 20,
    width: 1600,
    height: 900,
  })
})

test('a rect on a display that is gone is centred', () => {
  const work = { x: 0, y: 0, width: 1600, height: 900 }
  assert.deepEqual(fitToWorkArea({ x: 4000, y: 3000, width: 800, height: 600 }, work), {
    x: 400,
    y: 150,
    width: 800,
    height: 600,
  })
})

test('an unreadable or mismatched state file counts as no state', async () => {
  await withHome(async (home) => {
    assert.equal(await readWindowState(), undefined)
    await writeFile(windowStatePath(), 'not json')
    assert.equal(await readWindowState(), undefined)
    await writeFile(windowStatePath(), JSON.stringify({ version: 99, bounds: { x: 1, y: 2, width: 800, height: 600 } }))
    assert.equal(await readWindowState(), undefined)
    await writeFile(windowStatePath(), JSON.stringify({ version: 1, bounds: { x: 1, y: 2, width: 10, height: 10 } }))
    assert.equal(await readWindowState(), undefined)
    assert.match(windowStatePath(), /window-state\.json$/)
    assert.ok(home.length > 0)
  })
})

test('the first visible sample seeds the state instead of dereferencing null', async () => {
  await withHome(async () => {
    const window = fakeWindow({ x: 100, y: 120, width: 900, height: 700 })
    const handle = startWindowState({ parent: 4242, log: quiet, api: window.api })
    await sleep(350)
    window.show()
    await sleep(1500)
    const saved = JSON.parse(await readFile(windowStatePath(), 'utf8'))
    await handle.dispose()
    assert.deepEqual(saved.bounds, { x: 100, y: 120, width: 900, height: 700 })
  })
})

test('a saved rect is restored before the window is shown', async () => {
  await withHome(async () => {
    await writeFile(windowStatePath(), JSON.stringify({
      version: 1,
      bounds: { x: 40, y: 60, width: 1100, height: 800 },
      maximized: false,
    }))
    const window = fakeWindow({ x: 300, y: 300, width: 1280, height: 820 })
    const handle = startWindowState({ parent: 4242, log: quiet, api: window.api })
    await sleep(500)
    assert.deepEqual(window.rect(), { x: 40, y: 60, width: 1100, height: 800 })
    assert.deepEqual(handle.snapshot().bounds, { x: 40, y: 60, width: 1100, height: 800 })
    await handle.dispose()
  })
})

test('a Win32 call that throws is swallowed, not rethrown into the timer', async () => {
  await withHome(async () => {
    const window = fakeWindow({ x: 10, y: 10, width: 800, height: 600 }, { visible: true, throwOn: 'rectOf' })
    const handle = startWindowState({ parent: 4242, log: quiet, api: window.api })
    await sleep(700)
    await handle.dispose()
  })
})

test('a hidden window is never recorded', async () => {
  await withHome(async () => {
    const window = fakeWindow({ x: 5, y: 5, width: 640, height: 480 })
    const handle = startWindowState({ parent: 4242, log: quiet, api: window.api })
    await sleep(700)
    await handle.dispose()
    assert.equal(await readWindowState(), undefined)
  })
})
