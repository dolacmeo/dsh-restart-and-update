/**
 * Window geometry memory for the Desktop shell.
 *
 * The shell creates its BrowserWindow with a fixed 1280x820 geometry and has no
 * window-geometry IPC, so nothing a renderer or a Host plugin can call will move
 * it. What a Host plugin can do is talk to Win32: the shell is this process's
 * parent, so the window handle is one enumeration away, and the window exists
 * (hidden) before the Host finishes booting - which lets the geometry be
 * restored before it is ever shown.
 *
 * State lives in $DSH_HOME/window-state.json (default ~/.dsh/window-state.json),
 * in physical pixels, the same space the DPI-aware Host reads and writes.
 */
import { createRequire } from 'node:module'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

/** Class name Electron gives every BrowserWindow on Windows. */
const WINDOW_CLASS = 'Chrome_WidgetWin_1'

/** SetWindowPos flags: keep the Z order, keep the activation, keep the owner. */
const SWP_NOZORDER = 0x0004
const SWP_NOACTIVATE = 0x0010

/** ShowWindow commands. */
const SW_MAXIMIZE = 3
const SW_RESTORE = 9

/** MonitorFromRect option: nearest monitor when the rect is off every display. */
const MONITOR_DEFAULTTONEAREST = 0x00000002

/** How often the window is sampled once it is on screen. */
const POLL_MS = 250

/** How long a change waits before it is written, so drags do not thrash the disk. */
const WRITE_DELAY_MS = 800

/** How long a launch waits for the window handle to exist. */
const RESTORE_TIMEOUT_MS = 20000

/** A saved rect must keep at least this much of itself inside a work area. */
const MIN_VISIBLE_WIDTH = 160
const MIN_VISIBLE_HEIGHT = 120

const MAX_FAILURES = 20
const STATE_VERSION = 1

const SILENT_LOGGER = { info: () => {}, warn: () => {} }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Roots that may contain koffi: the Desktop runtime first, then a user install. */
function runtimeRoots() {
  const roots = []
  const override = process.env.DSH_WINDOW_STATE_RUNTIME
  if (typeof override === 'string' && override.length > 0) roots.push(override)
  const exeDir = dirname(process.execPath)
  roots.push(join(exeDir, 'resources', 'app.asar', 'dsh'))
  roots.push(join(exeDir, 'resources', 'app.asar.unpacked', 'dsh'))
  const entry = process.argv[1]
  if (typeof entry === 'string' && entry.length > 0) {
    const index = entry.lastIndexOf('node_modules')
    if (index > 0) roots.push(entry.slice(0, index))
  }
  return roots
}

function loadKoffi() {
  try {
    return require('koffi')
  } catch {}
  for (const root of runtimeRoots()) {
    try {
      return require(join(root, 'node_modules', 'koffi'))
    } catch {}
  }
  return undefined
}

let bindings

/** Load the Win32 surface once per process; undefined when koffi is unavailable. */
function win32() {
  if (bindings !== undefined) return bindings === null ? undefined : bindings
  const koffi = loadKoffi()
  if (koffi === undefined) {
    bindings = null
    return undefined
  }
  const RECT = koffi.struct('DSH_RU_RECT', {
    left: 'int32',
    top: 'int32',
    right: 'int32',
    bottom: 'int32',
  })
  const MONITORINFO = koffi.struct('DSH_RU_MONITORINFO', {
    cbSize: 'uint32',
    rcMonitor: RECT,
    rcWork: RECT,
    dwFlags: 'uint32',
  })
  const user32 = koffi.load('user32.dll')
  const FindWindowExW = user32.func('void * __stdcall FindWindowExW(void *parent, void *after, str16 cls, str16 title)')
  const GetWindowThreadProcessId = user32.func('uint32 __stdcall GetWindowThreadProcessId(void *hwnd, _Out_ uint32 *pid)')
  const GetWindowRect = user32.func('bool __stdcall GetWindowRect(void *hwnd, _Out_ DSH_RU_RECT *rect)')
  const SetWindowPos = user32.func('bool __stdcall SetWindowPos(void *hwnd, void *after, int x, int y, int cx, int cy, uint32 flags)')
  const IsWindowVisible = user32.func('bool __stdcall IsWindowVisible(void *hwnd)')
  const IsZoomed = user32.func('bool __stdcall IsZoomed(void *hwnd)')
  const IsIconic = user32.func('bool __stdcall IsIconic(void *hwnd)')
  const ShowWindow = user32.func('bool __stdcall ShowWindow(void *hwnd, int cmd)')
  const MonitorFromRect = user32.func('void * __stdcall MonitorFromRect(_In_ DSH_RU_RECT *rect, uint32 flags)')
  const GetMonitorInfoW = user32.func('bool __stdcall GetMonitorInfoW(void *monitor, _Inout_ DSH_RU_MONITORINFO *info)')
  const SetProcessDpiAwarenessContext = user32.func('bool __stdcall SetProcessDpiAwarenessContext(intptr value)')

  /** Every top-level window of the given process whose class is an Electron BrowserWindow. */
  const windowsOf = (pid) => {
    const found = []
    let after = null
    for (;;) {
      const hwnd = FindWindowExW(null, after, WINDOW_CLASS, null)
      if (hwnd === null) break
      const owner = [0]
      GetWindowThreadProcessId(hwnd, owner)
      if (owner[0] === pid) found.push(hwnd)
      after = hwnd
    }
    return found
  }

  bindings = {
    windowsOf,
    /** Outer window rect in physical pixels, or undefined when the handle is gone. */
    rectOf: (hwnd) => {
      const rect = {}
      if (!GetWindowRect(hwnd, rect)) return undefined
      return {
        x: rect.left,
        y: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
      }
    },
    /** Work area of the monitor that owns the rect, in physical pixels. */
    workAreaOf: (rect) => {
      const monitor = MonitorFromRect({
        left: rect.x,
        top: rect.y,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height,
      }, MONITOR_DEFAULTTONEAREST)
      if (monitor === null) return undefined
      const info = {
        cbSize: 40,
        rcMonitor: { left: 0, top: 0, right: 0, bottom: 0 },
        rcWork: { left: 0, top: 0, right: 0, bottom: 0 },
        dwFlags: 0,
      }
      if (!GetMonitorInfoW(monitor, info)) return undefined
      return {
        x: info.rcWork.left,
        y: info.rcWork.top,
        width: info.rcWork.right - info.rcWork.left,
        height: info.rcWork.bottom - info.rcWork.top,
      }
    },
    move: (hwnd, rect) => SetWindowPos(hwnd, null, rect.x, rect.y, rect.width, rect.height, SWP_NOZORDER | SWP_NOACTIVATE),
    maximize: (hwnd) => ShowWindow(hwnd, SW_MAXIMIZE),
    unmaximize: (hwnd) => ShowWindow(hwnd, SW_RESTORE),
    isVisible: (hwnd) => IsWindowVisible(hwnd),
    isMaximized: (hwnd) => IsZoomed(hwnd),
    isMinimized: (hwnd) => IsIconic(hwnd),
    /* Tools only: the Desktop Host is already per-monitor DPI aware, so a plain
       Node process has to ask for the same coordinate space. */
    dpiAware: () => {
      try {
        return SetProcessDpiAwarenessContext(-4)
      } catch {
        return false
      }
    },
  }
  return bindings
}
/** Absolute path of the remembered geometry: DSH_HOME overrides the default home. */
export function windowStatePath() {
  const configured = process.env.DSH_HOME
  const home = typeof configured === 'string' && configured.length > 0 ? configured : join(homedir(), '.dsh')
  return join(home, 'window-state.json')
}

function isRect(value) {
  return typeof value === 'object' && value !== null
    && ['x', 'y', 'width', 'height'].every((key) => Number.isInteger(value[key]))
    && value.width > 200 && value.height > 150
}

/** Read the remembered geometry; undefined when absent or unusable. */
export async function readWindowState() {
  try {
    const value = JSON.parse(await readFile(windowStatePath(), 'utf8'))
    if (typeof value !== 'object' || value === null || value.version !== STATE_VERSION) return undefined
    if (!isRect(value.bounds)) return undefined
    return {
      bounds: {
        x: value.bounds.x,
        y: value.bounds.y,
        width: value.bounds.width,
        height: value.bounds.height,
      },
      maximized: value.maximized === true,
    }
  } catch {
    return undefined
  }
}

/** Replace the remembered geometry atomically, so a crash mid-write cannot corrupt it. */
export async function writeWindowState(next) {
  const path = windowStatePath()
  await mkdir(dirname(path), { recursive: true })
  const temporary = path + '.' + String(process.pid) + '.tmp'
  const document = { version: STATE_VERSION, updatedAt: new Date().toISOString(), ...next }
  await writeFile(temporary, JSON.stringify(document, null, 2) + '\n', 'utf8')
  await rename(temporary, path)
}

function sameGeometry(left, right) {
  if (left == null || right == null) return left === right
  return left.maximized === right.maximized
    && left.bounds.x === right.bounds.x
    && left.bounds.y === right.bounds.y
    && left.bounds.width === right.bounds.width
    && left.bounds.height === right.bounds.height
}

/**
 * Keep a saved rect on screen: shrink it to the target work area, and pull it
 * back to the centre when a disconnected display left it unreachable.
 */
export function fitToWorkArea(bounds, work) {
  if (work === undefined) return bounds
  const width = Math.min(bounds.width, work.width)
  const height = Math.min(bounds.height, work.height)
  const visibleWidth = Math.min(bounds.x + width, work.x + work.width) - Math.max(bounds.x, work.x)
  const visibleHeight = Math.min(bounds.y + height, work.y + work.height) - Math.max(bounds.y, work.y)
  if (visibleWidth >= MIN_VISIBLE_WIDTH && visibleHeight >= MIN_VISIBLE_HEIGHT) {
    return { x: bounds.x, y: bounds.y, width, height }
  }
  return {
    x: work.x + Math.max(0, Math.round((work.width - width) / 2)),
    y: work.y + Math.max(0, Math.round((work.height - height) / 2)),
    width,
    height,
  }
}

/**
 * Follow the Desktop window for the lifetime of the Host: restore its geometry
 * before it is first shown, then record every change.
 *
 * @param options - parent: Electron main process id (defaults to this Host's
 *   parent), log: optional info/warn sink, api: injectable Win32 surface for tests.
 * @returns snapshot() plus dispose(), or undefined when Win32 is unavailable.
 */
export function startWindowState(options = {}) {
  const api = options.api ?? win32()
  if (api === undefined) return undefined
  const parent = options.parent ?? process.ppid
  const log = options.log ?? SILENT_LOGGER

  let target = null
  let timer = null
  let pending = null
  let last = null
  let restored = false
  let wantMaximized = false
  let found = false
  let disposed = false
  let failures = 0

  const findWindow = () => {
    const windows = api.windowsOf(parent)
    if (windows.length === 0) return null
    return windows.find((handle) => api.isVisible(handle)) ?? windows[0]
  }

  const flush = async (value) => {
    if (value === null) return
    try {
      await writeWindowState(value)
    } catch (error) {
      log.warn('window geometry could not be saved: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const schedule = () => {
    if (pending !== null) clearTimeout(pending)
    pending = setTimeout(() => {
      pending = null
      void flush(last)
    }, WRITE_DELAY_MS)
    if (typeof pending.unref === 'function') pending.unref()
  }

  /** Wait for the window handle; the shell creates the window before this Host boots. */
  const locate = async () => {
    const deadline = Date.now() + RESTORE_TIMEOUT_MS
    while (!disposed && target === null && Date.now() < deadline) {
      target = findWindow()
      if (target === null) await sleep(80)
    }
    return target
  }

  /** Put the window where the last run left it, while it is still hidden. */
  const start = async () => {
    const saved = await readWindowState()
    const handle = await locate()
    found = handle !== null
    if (disposed) return
    if (handle === null) {
      /* No Desktop window: this Host is headless (a CLI profile), or the shell
         never opened one. There is nothing to follow, so stop sampling. */
      if (timer !== null) clearInterval(timer)
      timer = null
      log.warn('no Desktop window for process ' + String(parent) + '; the window geometry is not remembered')
      return
    }
    if (saved === undefined) {
      restored = true
      return
    }
    const work = api.workAreaOf(saved.bounds)
    last = { bounds: fitToWorkArea(saved.bounds, work), maximized: saved.maximized }
    /* A maximized window is parked over the work area while hidden, then marked
       maximized as soon as it becomes visible: the transition stays invisible
       instead of showing a normal-sized frame first. */
    const parked = saved.maximized && work !== undefined ? { ...work } : last.bounds
    api.move(handle, parked)
    wantMaximized = saved.maximized
    restored = true
    log.info('window restored at ' + [parked.x, parked.y, parked.width, parked.height].join(','))
  }

  /**
   * One sampling pass. Every Win32 call can throw (a handle can die between two
   * calls) and this runs from a timer: an escaping error would take the whole
   * Desktop Host down, so failures are counted and swallowed here.
   */
  const sample = () => {
    if (disposed || failures >= MAX_FAILURES) return
    try {
      if (target === null) target = findWindow()
      if (target === null) return
      /* Hidden means the shell is still starting or has parked the window in the
         tray; neither is a geometry the user chose. */
      if (!api.isVisible(target) || api.isMinimized(target)) return
      if (!restored) return
      if (wantMaximized) {
        if (!api.isMaximized(target)) api.maximize(target)
        wantMaximized = false
        return
      }
      const maximized = api.isMaximized(target)
      const bounds = maximized ? last?.bounds ?? api.rectOf(target) : api.rectOf(target)
      if (bounds === undefined) return
      const next = { bounds, maximized }
      /* The first pass has nothing to compare against; it seeds the state so the
         next launch has somewhere to go back to. */
      if (last !== null && sameGeometry(next, last)) return
      last = next
      failures = 0
      schedule()
    } catch (error) {
      failures += 1
      log.warn('window sampling failed (' + String(failures) + '/' + String(MAX_FAILURES) + '): '
        + (error instanceof Error ? error.message : String(error)))
      if (failures >= MAX_FAILURES && timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
  }

  timer = setInterval(sample, POLL_MS)
  if (typeof timer.unref === 'function') timer.unref()

  start().catch((error) => {
    restored = true
    log.warn('window geometry restore failed: ' + (error instanceof Error ? error.message : String(error)))
  })

  return {
    /** What the Host can report today, for the state route and for diagnostics. */
    snapshot: () => ({
      enabled: true,
      found,
      parent,
      stateFile: windowStatePath(),
      bounds: last?.bounds ?? null,
      maximized: last?.maximized ?? null,
    }),
    dispose: async () => {
      if (timer !== null) clearInterval(timer)
      if (pending !== null) clearTimeout(pending)
      try {
        if (target !== null && restored && api.isVisible(target) && !api.isMinimized(target)) {
          const maximized = api.isMaximized(target)
          const bounds = maximized ? last?.bounds ?? api.rectOf(target) : api.rectOf(target)
          if (bounds !== undefined) last = { bounds, maximized }
        }
      } catch (error) {
        log.warn('the final window geometry could not be read: ' + (error instanceof Error ? error.message : String(error)))
      }
      disposed = true
      await flush(last)
    },
  }
}
