/**
 * Restart + plugin-update plugin — Host half.
 *
 * Owns the operations that only the Host process can perform and exposes them to
 * the companion Client half over exact routes on the browser carrier:
 *
 *   GET  /dsh-restart-and-update/state      → runtime facts, restart capability
 *   POST /dsh-restart-and-update/restart    → relaunch the whole application
 *   GET  /dsh-restart-and-update/updates    → installed plugins vs. registry, with publish times
 *   POST /dsh-restart-and-update/update     → update one plugin through the profile's package manager
 *
 * A full restart has to outlive the process tree it kills, so the Host writes a
 * small PowerShell worker into a temp directory and has WMI create it detached
 * (parent: WmiPrvSE, not this process). Before killing anything the worker can
 * run one plugin update, which is how `dshmarket` itself gets updated: the market
 * cannot replace itself while it is the running bundle.
 */
import { execFile, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { POSIX_WORKER_SCRIPT, desktopCliPath, relaunchSupport, selfUpdateCommandLine } from './lib/relaunch.js'
import { normalizeBlacklist, readSettings, settingsPath, writeSettings } from './lib/settings.js'
import { startWindowState } from './lib/window-state.js'

const PREFIX = '/dsh-restart-and-update'
const WORK_DIR = join(tmpdir(), 'dsh-restart-and-update')

/** Header that a cross-origin page cannot send without a failed preflight. */
const GUARD_HEADER = 'x-dsh-restart-and-update'
const GUARD_VALUE = 'full'

/**
 * Relaunching a bare node process is out of scope: the desktop app is what the
 * restart button replaces. The desktop app ships for Windows, macOS and Linux,
 * and all three are supported - POSIX through a detached shell worker, Windows
 * through the WMI worker below.
 */
const RUNTIME = relaunchSupport()
const RESTARTABLE = RUNTIME.supported

/** The plugin that must be updated from outside, because it owns the running bundle. */
const SELF_HOST_PACKAGE = 'dshmarket'

export const WORKER_SCRIPT = String.raw`param(
  [Parameter(Mandatory=$true)][int]$StartPid,
  [Parameter(Mandatory=$true)][string]$ExePath,
  [Parameter(Mandatory=$true)][string]$LogPath,
  [string]$UpdateCommandBase64 = '',
  [int]$UpdateTimeoutSeconds = 120
)

$ErrorActionPreference = 'SilentlyContinue'

# Hide the console this script was handed. Without it the relaunched app inherits
# that console, keeps it alive after this script exits, and dies when someone
# closes the leftover window.
try {
  if (-not ('DshRestartConsole' -as [type])) {
    Add-Type -Namespace DshRestartConsole -Name Native -MemberDefinition @'
[DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
'@
  }
  $consoleWindow = [DshRestartConsole.Native]::GetConsoleWindow()
  if ($consoleWindow -ne [IntPtr]::Zero) { [void][DshRestartConsole.Native]::ShowWindow($consoleWindow, 0) }
} catch { }

function Write-Log {
  param([string]$Message)
  try {
    Add-Content -LiteralPath $LogPath -Value ((Get-Date).ToString('yyyy-MM-ddTHH:mm:ss') + ' ' + $Message) -Encoding UTF8
  } catch { }
}

Write-Log ('worker-start pid=' + $PID + ' start=' + $StartPid + ' exe=' + $ExePath)

# The update command travels base64-encoded so its own quotes reach cmd.exe intact.
$UpdateCommand = ''
if ($UpdateCommandBase64 -ne '') {
  try { $UpdateCommand = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($UpdateCommandBase64)) } catch { }
}

# 1. Stop the old app FIRST. The user is waiting for the window to close, and an
#    update below must not run while the app still holds the profile's files.
$leaf = Split-Path -Leaf $ExePath
$target = 0
$cursor = $StartPid
for ($i = 0; $i -lt 24; $i += 1) {
  $proc = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $cursor)
  if ($null -eq $proc) { break }
  if ($proc.Name -ne $leaf) { break }
  $target = [int]$proc.ProcessId
  $cursor = [int]$proc.ParentProcessId
}
if ($target -le 0) { $target = $StartPid }
Write-Log ('kill-target pid=' + $target)

try { & taskkill.exe /PID $target /T /F | Out-Null } catch { }
$deadline = (Get-Date).AddSeconds(20)
while ((Get-Process -Id $target -ErrorAction SilentlyContinue) -and ((Get-Date) -lt $deadline)) {
  Start-Sleep -Milliseconds 250
}
Write-Log 'old-process-gone'
Start-Sleep -Milliseconds 900

# 2. Optional pre-relaunch update: the market bundle cannot replace itself while
#    it is running, so it is replaced here - after the app is gone. A timeout
#    always falls through to the relaunch: no update is worth a lost app.
if ($UpdateCommand -ne '') {
  Write-Log 'update-start'
  $updateWork = $null
  try {
    $updateWork = Start-Process -FilePath $env:ComSpec -ArgumentList ('/d /c ' + $UpdateCommand) -PassThru -WindowStyle Hidden
  } catch {
    Write-Log ('update-start-failed: ' + $_.Exception.Message)
  }
  if ($null -eq $updateWork) {
    Write-Log 'update-skipped-after-failure'
  } else {
    $updateDone = $false
    $updateDeadline = (Get-Date).AddSeconds($UpdateTimeoutSeconds)
    while ((Get-Date) -lt $updateDeadline) {
      if ($updateWork.HasExited) { $updateDone = $true; break }
      Start-Sleep -Milliseconds 500
    }
    if (-not $updateDone) {
      Write-Log 'update-timeout-killing'
      try { & taskkill.exe /PID $updateWork.Id /T /F | Out-Null } catch { }
    }
    Write-Log ('update-exit=' + $updateWork.ExitCode + ' completed=' + $updateDone)
  }
} else {
  Write-Log 'update-skipped'
}
Start-Sleep -Milliseconds 400

if (-not (Test-Path -LiteralPath $ExePath)) {
  Write-Log 'exe-missing-abort'
  exit 1
}

$workDir = Split-Path -Parent $ExePath

# Start the app through the WMI provider: the new process gets its own (nonexistent)
# console instead of inheriting this script's, so no stray window can kill it later.
$newPid = 0
try {
  $created = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = ('"' + $ExePath + '"')
    CurrentDirectory = $workDir
  }
  if ($created.ReturnValue -eq 0) { $newPid = [int]$created.ProcessId }
  Write-Log ('wmi-create return=' + $created.ReturnValue + ' pid=' + $newPid)
} catch {
  Write-Log ('wmi-create-failed: ' + $_.Exception.Message)
}

$launched = $false
if ($newPid -gt 0) {
  Start-Sleep -Seconds 3
  if (Get-Process -Id $newPid -ErrorAction SilentlyContinue) {
    Write-Log ('relaunched pid=' + $newPid)
    $launched = $true
  } else {
    Write-Log 'wmi-relaunch-exited-early'
  }
}

if (-not $launched) {
  # Fallback only: a child process keeps this script's hidden console, so it stays
  # the second choice behind the detached launch above.
  for ($n = 1; $n -le 3; $n += 1) {
    try {
      $started = Start-Process -FilePath $ExePath -WorkingDirectory $workDir -PassThru
      Start-Sleep -Seconds 3
      if (($null -ne $started) -and (-not $started.HasExited)) {
        Write-Log ('relaunched-fallback pid=' + $started.Id + ' attempt=' + $n)
        $launched = $true
        break
      }
      Write-Log ('fallback-attempt-' + $n + '-exited-early')
    } catch {
      Write-Log ('fallback-attempt-' + $n + '-failed: ' + $_.Exception.Message)
    }
    Start-Sleep -Seconds 2
  }
}
if (-not $launched) { Write-Log 'relaunch-failed' }

try {
  Get-ChildItem -LiteralPath (Split-Path -Parent $LogPath) -Filter 'restart-*.log' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 10 |
    Remove-Item -Force
} catch { }
`

const LAUNCHER_SCRIPT = String.raw`param(
  [Parameter(Mandatory=$true)][string]$Script,
  [Parameter(Mandatory=$true)][string]$Arguments,
  [Parameter(Mandatory=$true)][string]$WorkDir
)

$ErrorActionPreference = 'Stop'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$commandLine = '"' + $powershell + '" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $Script + '" ' + $Arguments
$result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = $commandLine
  CurrentDirectory = $WorkDir
}
if ($result.ReturnValue -ne 0) {
  Write-Output ('failed:' + $result.ReturnValue)
  exit 1
}
Write-Output ('created:' + $result.ProcessId)
`

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

/** Browsers always send Origin on POST; a foreign origin means another page. */
function sameOrigin(req) {
  const origin = req.headers.origin
  if (origin === undefined || origin === '') return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

function readBody(req, limit = 4096) {
  return new Promise((done) => {
    let size = 0
    let overflow = false
    let settled = false
    const chunks = []
    const finish = () => {
      if (settled) return
      settled = true
      done({ text: Buffer.concat(chunks).toString('utf8'), overflow })
    }
    req.on('data', (chunk) => {
      size += chunk.length
      if (size <= limit) {
        chunks.push(chunk)
        return
      }
      /* Destroying the stream can suppress 'end', so resolve here rather than
         hanging the route forever. The handler turns this into a 413. */
      overflow = true
      req.destroy()
      finish()
    })
    req.on('end', finish)
    req.on('error', finish)
    req.on('aborted', finish)
  })
}

function runPowerShell(args, timeout = 20000) {
  return new Promise((done, fail) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ...args],
      { windowsHide: true, timeout, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) fail(Object.assign(error, { stdout, stderr }))
        else done({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') })
      },
    )
  })
}

/**
 * The desktop profile directory this Host is serving.
 *
 * A profile-launched Harness exports `DSH_PROFILE_DIR`, but the desktop app boots
 * its Host with the profile as a plain argv value instead, so fall back to the
 * argument that looks like a profile directory and actually has a manifest.
 */
async function profileDirectory() {
  const fromEnv = process.env.DSH_PROFILE_DIR
  if (typeof fromEnv === 'string' && fromEnv !== '' && (await commandExists(join(fromEnv, 'package.json')))) {
    return fromEnv
  }
  for (const arg of process.argv.slice(1)) {
    if (typeof arg !== 'string') continue
    const candidate = resolve(arg)
    if (!candidate.split(/[\\/]/).includes('profiles')) continue
    if (await commandExists(join(candidate, 'package.json'))) return candidate
  }
  return undefined
}

/** The profile name the launcher's `--profile` flag expects. */
function profileName(dir) {
  const fromEnv = process.env.DSH_PROFILE
  if (typeof fromEnv === 'string' && fromEnv !== '') return fromEnv
  return dir === undefined ? null : basename(dir)
}

function commandExists(path) {
  return readFile(path, 'utf8').then(() => true, () => false)
}

/**
 * Installed plugins of this profile, read from its own manifest.
 * Only `dependencies` rows carry a registry version; `link:` and `file:` rows are
 * local sources and cannot be updated from a registry.
 */
async function installedPlugins() {
  const dir = await profileDirectory()
  if (dir === undefined) return { dir: undefined, profile: null, plugins: [] }
  const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  const dependencies = manifest.dependencies !== null && typeof manifest.dependencies === 'object'
    ? manifest.dependencies
    : {}
  const plugins = []
  for (const [name, spec] of Object.entries(dependencies)) {
    const raw = String(spec).trim()
    const source = /^link:/i.test(raw)
      ? 'link'
      : /^file:/i.test(raw)
        ? 'file'
        : /^(?:workspace|portal|catalog|npm|git(?:\+|:)|https?:|github:)/i.test(raw)
          ? 'other'
          : /^(?:[~^<>=]*v?\d|latest$|\*$)/i.test(raw)
            ? 'npm'
            : 'other'
    /* A range is not an installed version. The dependency spec is only a
       fallback for an npm package whose node_modules manifest is unreadable;
       everything else is read from disk, exactly as the package manager left it. */
    let specVersion = null
    if (source === 'npm') {
      const match = /^[~^<>=]*\s*v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/.exec(raw)
      specVersion = match?.[1] ?? null
    }
    const diskVersion = source === 'npm' ? await installedVersionOnDisk(dir, name) : undefined
    plugins.push({
      name,
      installedVersion: source === 'npm' ? (diskVersion ?? specVersion) : null,
      source,
    })
  }
  return { dir, profile: manifest.name ?? null, plugins }
}

const PACKUMENT_CACHE_MS = 10 * 60 * 1000
const packumentCache = new Map()

/**
 * Updates this Host has applied but not yet activated.
 *
 * A Host-half plugin keeps serving the module it imported at boot, so an applied
 * update stays pending until the process itself restarts. The list lives on the
 * Host (not in the page) so a reload — the very thing that would lose it — does
 * not clear it; a fresh process starts with an empty file.
 */
/* Per-profile pending file. Two Hosts (another desktop profile, or a second
   checkout) share the OS temp directory, and one profile's queued update must
   never appear as the other's restart badge. */
function pendingPath(dir) {
  if (dir === undefined) return join(WORK_DIR, 'pending-updates.json')
  const key = createHash('sha1').update(resolve(dir).toLowerCase()).digest('hex').slice(0, 12)
  return join(WORK_DIR, `pending-updates-${key}.json`)
}

async function readPending(dir) {
  try {
    const raw = JSON.parse(await readFile(pendingPath(dir), 'utf8'))
    const rows = Array.isArray(raw?.packages) ? raw.packages : []
    return rows.filter((row) => typeof row?.name === 'string')
  } catch {
    return []
  }
}

async function writePending(rows, dir) {
  try {
    await mkdir(WORK_DIR, { recursive: true })
    await writeFile(pendingPath(dir), JSON.stringify({ packages: rows }, null, 2), 'utf8')
  } catch {
    // A pending list that cannot be written must not fail the update itself.
  }
}

/**
 * One registry document per package, cached briefly; `time` carries publish dates.
 * The abbreviated (`install-v1`) document omits `time`, so this asks for the full
 * packument: publish times are half of what the update list shows.
 */
async function packument(name) {
  const cached = packumentCache.get(name)
  if (cached !== undefined && Date.now() - cached.at < PACKUMENT_CACHE_MS) return cached.value
  const url = `https://registry.npmjs.org/${name.split('/').map(encodeURIComponent).join('/')}`
  // A registry that stops answering must not freeze the update button forever.
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`registry answered ${response.status}`)
  const body = await response.json()
  const value = {
    latest: body['dist-tags']?.latest ?? null,
    time: body.time ?? {},
  }
  packumentCache.set(name, { at: Date.now(), value })
  return value
}

/** A registry target we are willing to pass to a shell / package manager. */
function isRegistryVersion(value) {
  return typeof value === 'string'
    && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)
}

/** Compare two plain semver strings; undefined when either is unparseable. */
function compareVersions(a, b) {
  const parse = (v) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(v ?? '').trim())
    return m === null ? null : { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? null }
  }
  const left = parse(a)
  const right = parse(b)
  if (left === null || right === null) return undefined
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1
  }
  return comparePrerelease(left.pre, right.pre)
}

/** Semver prerelease precedence: numeric identifiers compare numerically. */
function comparePrerelease(left, right) {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  const leftParts = left.split('.')
  const rightParts = right.split('.')
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    if (leftParts[index] === undefined) return -1
    if (rightParts[index] === undefined) return 1
    const leftNumeric = /^\d+$/.test(leftParts[index])
    const rightNumeric = /^\d+$/.test(rightParts[index])
    if (leftNumeric && rightNumeric) {
      const order = Number(leftParts[index]) - Number(rightParts[index])
      if (order !== 0) return order < 0 ? -1 : 1
    } else if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1
    } else if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] < rightParts[index] ? -1 : 1
    }
  }
  return 0
}

/**
 * Whether a package has a Host (Node) half.
 *
 * The market's own rule (`hasHostHalf` in dshmarket/lib/verify.js): a package
 * that declares `dsh.client` and no `dsh.bundle` is pure browser code, so the
 * next page load already fetches the new bundle and no restart is owed. Only a
 * definite client-only declaration counts; `"dsh": {}` still loads server-side.
 */
async function hasHostHalf(dir, name) {
  try {
    const manifest = JSON.parse(await readFile(join(dir, 'node_modules', ...name.split('/'), 'package.json'), 'utf8'))
    const dsh = manifest.dsh
    if (dsh === null || typeof dsh !== 'object') return true
    return !(dsh.bundle === undefined && dsh.client !== undefined)
  } catch {
    return true
  }
}

/**
 * Every installed plugin the registry knows a newer version for, with both
 * publish times. A registry failure for one package never fails the list.
 *
 * `needsRestart` describes how the update takes effect, and it is not the same
 * question as "does this package have a Host half". A Host-half package keeps
 * running the module it imported at boot, but this Host can hand the changed
 * files to the running composition through the profile HMR service (DSH's own
 * update path does exactly that). Only when that service is absent - an older
 * Host, or a CLI host without `--expose-internals` - does the whole app have to
 * restart. So the answer is computed, never assumed: `hotApply` is true when
 * this process can reconcile the profile after installing.
 *
 * `refresh` drops the registry cache first, which is what the refresh button in
 * the dialog asks for.
 */
async function checkUpdates({ hotApply = false, refresh = false } = {}) {
  const { dir, profile, plugins } = await installedPlugins()
  const settings = await readSettings()
  const blacklist = new Set(settings.blacklist)
  const rows = []
  let checked = 0
  let ignored = 0
  for (const plugin of plugins) {
    if (plugin.source !== 'npm' || plugin.installedVersion === null) continue
    if (blacklist.has(plugin.name)) {
      ignored += 1
      continue
    }
    checked += 1
    try {
      if (refresh) packumentCache.delete(plugin.name)
      const meta = await packument(plugin.name)
      if (meta.latest === null) continue
      const order = compareVersions(meta.latest, plugin.installedVersion)
      if (order === undefined || order <= 0) continue
      const hostHalf = await hasHostHalf(dir, plugin.name)
      rows.push({
        name: plugin.name,
        installedVersion: plugin.installedVersion,
        installedAt: meta.time[plugin.installedVersion] ?? null,
        latestVersion: meta.latest,
        latestAt: meta.time[meta.latest] ?? null,
        // A client-only plugin takes effect on reload; a Host-half one takes
        // effect live only where the Host can reconcile, otherwise on restart.
        hostHalf,
        needsRestart: hostHalf && !hotApply,
      })
    } catch {
      // A package the registry does not know is not an update.
    }
  }
  rows.sort((left, right) => left.name.localeCompare(right.name))
  // The pending list is only meaningful for packages still installed at the
  // version the update put on disk; a plugin that has since moved on drops out.
  const installed = new Map(plugins.map((plugin) => [plugin.name, plugin.installedVersion]))
  const pending = (await readPending(dir)).filter((row) => installed.get(row.name) === row.installedVersion)
  const pendingNames = new Set(pending.map((row) => row.name))
  /* A package already queued for the next restart (including the market the
     restart worker will update) is not offered again by the update button. */
  const available = rows.filter((row) => !pendingNames.has(row.name))
  return {
    profile,
    profileName: profileName(dir),
    hotApply,
    checked,
    // Blacklisted packages are skipped entirely: they are neither listed nor counted.
    ignored,
    // Every installed package, for the blacklist editor in the settings page.
    installed: plugins.map((plugin) => ({
      name: plugin.name,
      installedVersion: plugin.installedVersion,
      source: plugin.source,
      blacklisted: blacklist.has(plugin.name),
    })),
    settings,
    // `updatable` drives the update button's badge.
    updatable: available.length,
    // `pending` drives the restart button's badge: applied or queued, not loaded.
    pendingCount: pending.length,
    pending,
    packages: available,
  }
}

/** Package names the client asked to update, matched against the installed rows. */
async function resolveTargets(requested) {
  const { plugins } = await installedPlugins()
  const byName = new Map(plugins.map((plugin) => [plugin.name, plugin]))
  const targets = []
  for (const name of new Set(requested)) {
    const plugin = byName.get(name)
    if (plugin === undefined) throw Object.assign(new Error(`${name} is not installed`), { code: 'not-installed' })
    if (plugin.source !== 'npm') throw Object.assign(new Error(`${name} is a ${plugin.source} package and cannot be updated`), { code: 'not-registry' })
    targets.push(plugin)
  }
  return targets
}

const UPDATE_LOG_LIMIT = 2000

/**
 * Run the shipped launcher with the given arguments.
 *
 * The launcher is a `.cmd`, which Windows cannot start as an executable image, so
 * it goes through `cmd.exe /c` with a quoted command line. Every argument is
 * quoted here rather than interpolated into the shell's own parsing.
 */
function runLauncher(cli, args, timeout) {
  const windows = process.platform === 'win32'
  return new Promise((done) => {
    const finish = (error, stdout, stderr) => {
      done({
        ok: error === null,
        exitCode: error === null ? 0 : (typeof error.code === 'number' ? error.code : 1),
        output: String(stdout ?? '').slice(-UPDATE_LOG_LIMIT) + String(stderr ?? '').slice(-UPDATE_LOG_LIMIT),
      })
    }
    const options = {
      windowsHide: true,
      timeout,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    }
    if (!windows) {
      /* POSIX: the launcher is a shell script with a shebang, so it is executed
         directly - there is no cmd.exe to route it through. */
      execFile(cli, args, options, finish)
      return
    }
    const commandLine = [`"${cli}"`, ...args.map((arg) => `"${arg}"`)].join(' ')
    execFile(
      process.env.ComSpec ?? 'cmd.exe',
      ['/d', '/s', '/c', `"${commandLine}"`],
      { ...options, windowsVerbatimArguments: true },
      finish,
    )
  })
}

/**
 * Update the given plugins in this profile through the shipped launcher, one at a
 * time so a failure names the package that caused it. The dsh CLI is the same
 * path the market itself uses; nothing here invents a second installer.
 */
async function updatePlugins(names, { hotApply = false, reconcile = null } = {}) {
  const cli = desktopCliPath()
  if (!(await commandExists(cli))) {
    throw Object.assign(new Error('the dsh launcher is not found beside this app'), { code: 'cli-missing' })
  }
  const { dir, plugins } = await installedPlugins()
  const profile = profileName(dir)
  if (profile === null || /[\r\n"%]/.test(profile)) {
    throw Object.assign(new Error('this Host was started without a usable profile'), { code: 'no-profile' })
  }
  const installedVersions = new Map(plugins.map((plugin) => [plugin.name, plugin.installedVersion]))
  const results = []
  const deferred = []
  for (const name of new Set(names)) {
    // The market owns the running bundle and refuses to replace itself; its update
    // belongs to the restart worker, which runs after this process is gone. Report
    // it as deferred rather than failing the batch, and only when it is actually
    // behind the registry.
    if (name === SELF_HOST_PACKAGE) {
      const current = await installedVersionOnDisk(dir, name)
      const meta = await packument(name).catch(() => null)
      const target = meta?.latest ?? null
      const newer = target !== null && (current === undefined || compareVersions(target, current) === 1)
      if (newer) deferred.push(name)
      else results.push({ name, ok: true, installed: current ?? null, unchanged: true, output: '' })
      continue
    }
    // Pin the exact target. `@latest` leaves pnpm free to answer "already up to
    // date" from a release-age hold, which reports success while nothing moved;
    // an explicit version either lands on disk or fails out loud.
    const meta = await packument(name).catch(() => null)
    const target = meta?.latest ?? null
    if (target === null || !isRegistryVersion(target)) {
      results.push({
        name,
        ok: false,
        exitCode: 1,
        output: target === null ? `no registry version for ${name}` : `registry returned an invalid version for ${name}: ${target}`,
      })
      break
    }
    const outcome = await runLauncher(cli, ['plugin', '--profile', profile, 'add', `${name}@${target}`], 240000)
    const installed = await installedVersionOnDisk(dir, name)
    results.push({
      name,
      target,
      installed: installed ?? null,
      ok: outcome.ok && installed === target,
      exitCode: outcome.exitCode,
      output: outcome.ok && installed !== target
        ? `package manager reported success but ${name} is ${installed ?? 'absent'}, expected ${target}\n${outcome.output}`
        : outcome.output,
    })
    if (!results[results.length - 1].ok) break
  }
  /* What is now on disk but not yet loaded. One reconcile for the whole batch,
     not one per package: recomposing the profile is the expensive part, and the
     answer only exists after every install has landed. Without the HMR service
     the Host keeps the modules it imported at boot, and only a Host-half plugin
     owes a restart - a client-only one is already served by the next page load.
     The market is queued for the restart worker instead of being replaced now. */
  const applied = results.filter((row) => row.ok && row.unchanged !== true)
  const live = hotApply && applied.length > 0 && reconcile !== null
    ? await reconcile()
    : null
  const restarting = new Set()
  for (const row of applied) {
    const needsRestart = live !== null && live.ok
      ? live.pending.has(row.name)
      : await hasHostHalf(dir, row.name)
    row.needsRestart = needsRestart
    if (needsRestart) restarting.add(row.name)
  }
  if (applied.length > 0 || deferred.length > 0) {
    const pending = await readPending(dir)
    const known = new Map(pending.map((row) => [row.name, row]))
    // A package that reconciled live is not pending any more; one that was
    // pending before is kept until the restart actually happens.
    for (const name of restarting) {
      const row = results.find((candidate) => candidate.name === name)
      known.set(name, {
        name,
        installedVersion: row?.installed ?? row?.target ?? null,
        updatedAt: new Date().toISOString(),
      })
    }
    for (const name of deferred) {
      const current = await installedVersionOnDisk(dir, name) ?? installedVersions.get(name)
      known.set(name, {
        name,
        installedVersion: current ?? null,
        updatedAt: new Date().toISOString(),
        deferred: true,
      })
    }
    // A package that applied live must leave the pending list even if it was
    // queued before: the running composition already serves the new code.
    if (live !== null && live.ok) {
      for (const row of applied) {
        if (!restarting.has(row.name)) known.delete(row.name)
      }
    }
    await writePending([...known.values()], dir)
  }
  const pending = await readPending(dir)
  return { results, deferred, pendingCount: pending.length, hotApplied: applied.length > 0 && live !== null && live.ok }
}

/** The version actually present in the profile's node_modules, or undefined. */
async function installedVersionOnDisk(dir, name) {
  if (dir === undefined) return undefined
  try {
    const manifest = JSON.parse(await readFile(join(dir, 'node_modules', ...name.split('/'), 'package.json'), 'utf8'))
    return typeof manifest.version === 'string' ? manifest.version : undefined
  } catch {
    return undefined
  }
}

/**
 * Ask the running composition to load the files that just landed.
 *
 * The profile HMR service compares every module the profile loaded with what is
 * on disk, stops the stale ones and recomposes the tree from the new bundle
 * patches — the same operation DSH's own plugin update path performs. It is only
 * attempted when the service exists; without it (or when it refuses) every
 * Host-half package is reported as needing a restart, which is the safe answer.
 *
 * @returns `ok` false means "assume a restart is required"; `pending` names the
 *   packages whose old modules could not be replaced and still need one.
 */
async function reconcileProfile(ctx) {
  let hmr = null
  try {
    hmr = ctx.get('hmr')
  } catch {
    hmr = null
  }
  if (hmr === null || typeof hmr !== 'object' || typeof hmr.runExclusive !== 'function') {
    return { ok: false, pending: new Set() }
  }
  try {
    const outcome = await hmr.runExclusive(() => hmr.reconcileProfile([]))
    const restartReason = outcome?.restartReason
    if (typeof restartReason === 'string' && restartReason !== '') {
      return { ok: false, pending: new Set() }
    }
    const pending = new Set()
    for (const row of Array.isArray(outcome?.pending) ? outcome.pending : []) {
      const url = typeof row?.url === 'string' ? row.url : ''
      const match = /[\\/]node_modules[\\/]((?:@[^/\\]+[\\/])?[^/\\]+)[\\/]/.exec(url)
      if (match !== null) pending.add(match[1].replace(/\\/g, '/'))
    }
    return { ok: true, pending }
  } catch {
    return { ok: false, pending: new Set() }
  }
}

/**
 * Remove plugins from this profile through the shipped launcher, one at a time
 * so a failure names the package that caused it. The disk is read back: a
 * package that is still on disk was not removed, whatever pnpm exited with.
 */
async function uninstallPlugins(names, { hotApply = false, reconcile = null } = {}) {
  const cli = desktopCliPath()
  if (!(await commandExists(cli))) {
    throw Object.assign(new Error('the dsh launcher is not found beside this app'), { code: 'cli-missing' })
  }
  const { dir, plugins } = await installedPlugins()
  const profile = profileName(dir)
  if (profile === null || /[\r\n"%]/.test(profile)) {
    throw Object.assign(new Error('this Host was started without a usable profile'), { code: 'no-profile' })
  }
  const installed = new Map(plugins.map((plugin) => [plugin.name, plugin]))
  const results = []
  for (const name of new Set(names)) {
    const plugin = installed.get(name)
    if (plugin === undefined) {
      results.push({ name, ok: false, output: `${name} is not installed` })
      continue
    }
    if (name === 'dsh-restart-and-update') {
      results.push({ name, ok: false, output: 'this plugin cannot uninstall itself while it is the one asking' })
      continue
    }
    const outcome = await runLauncher(cli, ['plugin', '--profile', profile, 'remove', name], 240000)
    const remaining = await installedVersionOnDisk(dir, name)
    results.push({
      name,
      ok: outcome.ok && remaining === undefined,
      exitCode: outcome.exitCode,
      output: outcome.ok && remaining !== undefined
        ? `package manager reported success but ${name} is still on disk at ${remaining}`
        : outcome.output,
    })
    if (!results[results.length - 1].ok) break
  }
  const removed = new Set(results.filter((row) => row.ok).map((row) => row.name))
  if (removed.size > 0) {
    const pending = await readPending(dir)
    const kept = pending.filter((row) => !removed.has(row.name))
    if (kept.length !== pending.length) await writePending(kept, dir)
  }
  /* Dropping a bundle changes the profile, so a live composition can drop its
     entries without a restart too. The removed modules were just unlinked, so a
     failed reconcile simply leaves the unload to the next start. */
  const live = hotApply && removed.size > 0 && reconcile !== null ? await reconcile() : null
  const pending = await readPending(dir)
  return {
    results,
    pendingCount: pending.length,
    removed: [...removed],
    hotApplied: live !== null && live.ok,
  }
}

/**
 * Install the market into this profile.
 *
 * Used when the market's own button is pressed but the package is missing: the
 * user is offered the install instead of a dead button. Same launcher as every
 * other install, and the on-disk version is verified before reporting success.
 */
async function installMarket() {
  const cli = desktopCliPath()
  if (!(await commandExists(cli))) {
    throw Object.assign(new Error('the dsh launcher is not found beside this app'), { code: 'cli-missing' })
  }
  const { dir } = await installedPlugins()
  const profile = profileName(dir)
  if (profile === null || /[\r\n"%]/.test(profile)) {
    throw Object.assign(new Error('this Host was started without a usable profile'), { code: 'no-profile' })
  }
  const meta = await packument(SELF_HOST_PACKAGE).catch(() => null)
  const target = meta?.latest ?? null
  if (target === null || !isRegistryVersion(target)) {
    throw Object.assign(new Error(`no valid registry version for ${SELF_HOST_PACKAGE}`), { code: 'no-version' })
  }
  const outcome = await runLauncher(cli, ['plugin', '--profile', profile, 'add', `${SELF_HOST_PACKAGE}@${target}`], 240000)
  const installed = await installedVersionOnDisk(dir, SELF_HOST_PACKAGE)
  if (!outcome.ok || installed !== target) {
    throw Object.assign(
      new Error(outcome.output.trim() || `${SELF_HOST_PACKAGE} did not land at ${target}`),
      { code: 'install-failed' },
    )
  }
  // The market is on disk but not loaded. Record it without discarding any other
  // pending update this profile already had.
  const pending = await readPending(dir)
  const known = new Map(pending.map((row) => [row.name, row]))
  known.set(SELF_HOST_PACKAGE, {
    name: SELF_HOST_PACKAGE,
    installedVersion: installed,
    updatedAt: new Date().toISOString(),
  })
  await writePending([...known.values()], dir)
  return { name: SELF_HOST_PACKAGE, version: installed, pendingCount: known.size }
}

/** The command the detached worker runs before the restart, or '' when nothing updates. */
async function selfUpdateCommand() {
  const { dir, plugins } = await installedPlugins()
  const idle = { needed: false, command: '', dir }
  const market = plugins.find((plugin) => plugin.name === SELF_HOST_PACKAGE)
  if (market === undefined || market.source !== 'npm' || market.installedVersion === null) return idle
  const meta = await packument(SELF_HOST_PACKAGE).catch(() => null)
  if (meta === null || !isRegistryVersion(meta.latest)) return idle
  const order = compareVersions(meta.latest, market.installedVersion)
  if (order === undefined || order <= 0) return idle
  const profile = profileName(dir)
  if (profile === null || /[\r\n"%]/.test(profile)) return idle
  const cli = desktopCliPath()
  if (!(await commandExists(cli))) return idle
  // Every variable part is quoted for the shell that will run it: `cmd.exe`
  // needs `call` so it does not eat the first quote of the launcher path, a
  // POSIX shell needs plain single quotes.
  const command = selfUpdateCommandLine({ cli, profile, packageName: SELF_HOST_PACKAGE, version: meta.latest })
  return {
    needed: true,
    dir,
    from: market.installedVersion,
    to: meta.latest,
    command,
  }
}

/**
 * Start the replacement outside this process tree.
 *
 * Windows: the two PowerShell scripts below, created detached through WMI.
 * POSIX: a `sh` worker in its own session, which is all the detachment that
 * platform needs.
 */
async function startRelaunch(updateCommand = '') {
  await mkdir(WORK_DIR, { recursive: true })
  const stamp = `${Date.now()}-${process.pid}`
  const logPath = join(WORK_DIR, `restart-${stamp}.log`)
  if (process.platform !== 'win32') return startPosixRelaunch(updateCommand, stamp, logPath)
  const workerPath = join(WORK_DIR, `restart-${stamp}.ps1`)
  const launcherPath = join(WORK_DIR, `launch-${stamp}.ps1`)

  await writeFile(workerPath, WORKER_SCRIPT, 'utf8')
  await writeFile(launcherPath, LAUNCHER_SCRIPT, 'utf8')

  const quote = (value) => `"${value.replace(/"/g, '\\"')}"`
  // Base64 keeps the command's own quotes intact through the PowerShell argv.
  const encoded = Buffer.from(updateCommand, 'utf8').toString('base64')
  const args = [
    '-StartPid', String(process.pid),
    '-ExePath', quote(process.execPath),
    '-LogPath', quote(logPath),
    '-UpdateCommandBase64', quote(encoded),
  ].join(' ')

  const { stdout } = await runPowerShell([
    launcherPath,
    '-Script', workerPath,
    '-Arguments', args,
    '-WorkDir', WORK_DIR,
  ])

  const match = /created:(\d+)/.exec(stdout)
  if (match === null) throw new Error(`detached worker was not created: ${stdout.trim() || 'no output'}`)
  return { workerPid: Number(match[1]), logPath }
}

/**
 * POSIX relaunch: one `sh` worker in its own session.
 *
 * `detached: true` gives the worker a new process group and `unref()` drops it
 * from this process's bookkeeping, so killing the app cannot take it down. The
 * worker then waits for the old processes to exit before starting the
 * replacement - a cold start that raced the old listener is the classic
 * "restart did nothing" bug.
 */
async function startPosixRelaunch(updateCommand, stamp, logPath) {
  const workerPath = join(WORK_DIR, `restart-${stamp}.sh`)
  await writeFile(workerPath, POSIX_WORKER_SCRIPT, { encoding: 'utf8', mode: 0o700 })
  const encoded = updateCommand === '' ? '' : Buffer.from(updateCommand, 'utf8').toString('base64')
  /* An AppImage runs from a squashfs mount that disappears with the process, so
     its execPath cannot be started again; the image file can. */
  const relaunchExe = process.platform === 'linux'
    && typeof process.env.APPIMAGE === 'string'
    && process.env.APPIMAGE !== ''
    ? process.env.APPIMAGE
    : process.execPath
  const child = spawn(
    '/bin/sh',
    [workerPath, String(process.pid), String(process.ppid), relaunchExe, logPath, encoded],
    { detached: true, stdio: 'ignore', cwd: WORK_DIR },
  )
  if (child.pid === undefined) throw new Error('detached worker was not created')
  child.unref()
  return { workerPid: child.pid, logPath }
}

export const inject = ['webServer']

export function apply(ctx) {
  /* The shell always opens its window at 1280x820 and exposes no window-geometry
     IPC, so a full restart used to drop the user into the default corner. The
     Desktop shell is this Host's parent, so the window can be measured and moved
     through Win32 instead: restore it before it is first shown, then keep
     recording. Disabled anywhere else, where there is no Desktop window. */
  let windowGeometry = null
  /* Restoring the window is a Windows feature: Win32 (through the desktop
     runtime's koffi) is the only window geometry this plugin can read and write.
     The preference is still stored everywhere, so it survives moving between
     machines; the settings page reports it as unavailable elsewhere. */
  const windowStateSupported = process.platform === 'win32' && RESTARTABLE

  const stopWindowTracking = async () => {
    const handle = windowGeometry
    windowGeometry = null
    await handle?.dispose()
  }

  const startWindowTracking = () => {
    if (!windowStateSupported || windowGeometry !== null) return
    let log
    try {
      log = ctx.logger('window-geometry')
    } catch {}
    try {
      windowGeometry = startWindowState({ log }) ?? null
    } catch (error) {
      windowGeometry = null
      log?.warn?.('window geometry could not start: '
        + (error instanceof Error ? error.message : String(error)))
    }
  }

  if (windowStateSupported) {
    ctx.effect(() => {
      let disposed = false
      /* The setting has to be read before the window is shown, which is what
         startWindowState does with the saved rect: the restore happens while the
         window is still hidden, so no position is ever flashed. */
      readSettings().then((settings) => {
        if (!disposed && settings.restoreWindow) startWindowTracking()
      }).catch(() => {})
      return async () => {
        disposed = true
        await stopWindowTracking()
      }
    }, 'restart-plugin: window geometry')
  }

  /** Apply a freshly saved `restoreWindow` without waiting for a restart. */
  const applyWindowSetting = async (enabled) => {
    if (!windowStateSupported) return
    if (enabled) startWindowTracking()
    else await stopWindowTracking()
  }

  /**
   * Whether this process can load updated files without a restart.
   * The profile HMR service is what DSH's own update path uses; older Hosts and
   * CLI hosts without `--expose-internals` do not have it.
   */
  const canApplyLive = () => {
    try {
      const hmr = ctx.get('hmr')
      if (hmr === null || typeof hmr !== 'object' || typeof hmr.runExclusive !== 'function') return false
      /* The service refuses to compare modules when the runtime keeps no ESM
         cache (a packed worker loader); a reconcile there always reports a
         restart, so the update list must not promise the live path. */
      if (typeof hmr.hasEsmCache === 'function' && hmr.hasEsmCache() === false) return false
      return true
    } catch {
      return false
    }
  }

  /**
   * Revision of the plugin bundle graph this Host serves to a document opening
   * now. A page compares it with the revision it booted with: an older boot is
   * the state that answers 404 for every bundle that changed since, and the
   * page heals it by asking for a fresh document (see client.js).
   *
   * Null where the Host has no client module registry at all - a CLI host, or
   * a Host older than this field.
   */
  const liveGraphRev = () => {
    try {
      const clientModules = ctx.get('clientModules')
      if (clientModules === null || typeof clientModules !== 'object') return null
      if (typeof clientModules.graph !== 'function') return null
      const graph = clientModules.graph()
      if (graph === null || typeof graph !== 'object') return null
      return typeof graph.rev === 'string' && graph.rev !== '' ? graph.rev : null
    } catch {
      return null
    }
  }

  const state = () => ({
    ok: true,
    plugin: 'dsh-restart-and-update',
    platform: process.platform,
    exe: process.execPath,
    canRestart: RESTARTABLE,
    restartMode: process.platform === 'win32' ? 'detached-powershell' : (RESTARTABLE ? 'detached-sh' : 'none'),
    canApplyLive: canApplyLive(),
    /* The page checks this against the revision it booted with. */
    graphRev: liveGraphRev(),
    windowStateSupported,
    settingsFile: settingsPath(),
    pid: process.pid,
    selfHostPackage: SELF_HOST_PACKAGE,
    windowState: windowGeometry?.snapshot() ?? null,
  })

  /* One package operation at a time. Two simultaneous pnpm runs can corrupt a
     profile; a restart and an install have the same conflict. */
  let operation = null
  const rejectBusy = (res) => {
    if (operation === null) return false
    sendJson(res, 409, {
      ok: false,
      code: 'busy',
      message: `another plugin operation is already running (${operation})`,
    })
    return true
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${PREFIX}/state`,
    handler: async (req, res) => {
      if ((req.method ?? 'GET') !== 'GET') return sendJson(res, 405, { ok: false, message: 'method not allowed' })
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'foreign origin' })
      let profile = null
      let marketInstalled = false
      let marketVersion = null
      try {
        const dir = await profileDirectory()
        profile = profileName(dir)
        const { plugins } = await installedPlugins()
        const market = plugins.find((plugin) => plugin.name === SELF_HOST_PACKAGE)
        marketInstalled = market !== undefined
        marketVersion = market?.installedVersion ?? null
      } catch {
        profile = null
      }
      sendJson(res, 200, { ...state(), profile, marketInstalled, marketVersion })
    },
  }), 'restart-plugin: state route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${PREFIX}/updates`,
    handler: async (req, res) => {
      if ((req.method ?? 'GET') !== 'GET') return sendJson(res, 405, { ok: false, message: 'method not allowed' })
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'foreign origin' })
      try {
        const query = (req.url ?? '').split('?')[1] ?? ''
        const summary = await checkUpdates({
          hotApply: canApplyLive(),
          // The refresh button in the dialog means "ask the registry again",
          // not "return what was cached ten minutes ago".
          refresh: new URLSearchParams(query).get('refresh') === '1',
        })
        sendJson(res, 200, { ok: true, ...summary })
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          code: 'check-failed',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    },
  }), 'restart-plugin: updates route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${PREFIX}/settings`,
    handler: async (req, res) => {
      const method = req.method ?? 'GET'
      if (method !== 'GET' && method !== 'POST') return sendJson(res, 405, { ok: false, message: 'method not allowed' })
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'foreign origin' })
      if (method === 'GET') {
        const settings = await readSettings()
        return sendJson(res, 200, {
          ok: true,
          settings,
          settingsFile: settingsPath(),
          windowStateSupported,
          canRestart: RESTARTABLE,
          canApplyLive: canApplyLive(),
        })
      }
      if (req.headers[GUARD_HEADER] !== GUARD_VALUE) {
        return sendJson(res, 403, { ok: false, message: 'missing confirmation header' })
      }
      let body = {}
      try {
        const { text, overflow } = await readBody(req)
        if (overflow) return sendJson(res, 413, { ok: false, code: 'body-too-large', message: 'request body is too large' })
        const parsed = JSON.parse(text || '{}')
        body = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
      } catch {
        return sendJson(res, 400, { ok: false, code: 'bad-request', message: 'body must be JSON' })
      }
      try {
        const current = await readSettings()
        const next = {
          blacklist: Array.isArray(body.blacklist) ? normalizeBlacklist(body.blacklist) : current.blacklist,
          restoreWindow: typeof body.restoreWindow === 'boolean' ? body.restoreWindow : current.restoreWindow,
        }
        const saved = await writeSettings(next)
        // The window tracker starts at boot; applying the toggle now means the
        // user does not have to restart once more to see it take effect.
        await applyWindowSetting(saved.restoreWindow)
        sendJson(res, 200, { ok: true, settings: saved, settingsFile: settingsPath(), windowStateSupported })
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          code: 'settings-failed',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    },
  }), 'restart-plugin: settings route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${PREFIX}/uninstall`,
    handler: async (req, res) => {
      if ((req.method ?? 'GET') !== 'POST') return sendJson(res, 405, { ok: false, message: 'method not allowed' })
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'foreign origin' })
      if (req.headers[GUARD_HEADER] !== GUARD_VALUE) {
        return sendJson(res, 403, { ok: false, message: 'missing confirmation header' })
      }
      let names = []
      try {
        const { text, overflow } = await readBody(req)
        if (overflow) return sendJson(res, 413, { ok: false, code: 'body-too-large', message: 'request body is too large' })
        const body = JSON.parse(text || '{}')
        const valid = body !== null && typeof body === 'object' && !Array.isArray(body)
        names = valid && Array.isArray(body.names)
          ? body.names.filter((name) => typeof name === 'string' && name !== '')
          : []
      } catch {
        return sendJson(res, 400, { ok: false, code: 'bad-request', message: 'body must be JSON' })
      }
      if (names.length === 0) return sendJson(res, 400, { ok: false, code: 'no-targets', message: 'no package names given' })
      if (rejectBusy(res)) return
      operation = 'uninstall'
      try {
        const { results, removed, pendingCount, hotApplied } = await uninstallPlugins(names, {
          hotApply: canApplyLive(),
          reconcile: () => reconcileProfile(ctx),
        })
        const failed = results.find((result) => !result.ok)
        if (failed !== undefined) {
          return sendJson(res, 500, {
            ok: false,
            code: 'uninstall-failed',
            message: failed.output.trim() || `${failed.name} could not be removed`,
            results,
            removed,
            pendingCount,
          })
        }
        sendJson(res, 200, { ok: true, results, removed, pendingCount, restartRequired: !hotApplied, hotApplied })
      } catch (error) {
        const code = (error && error.code) || 'uninstall-failed'
        sendJson(res, 500, { ok: false, code, message: error instanceof Error ? error.message : String(error) })
      } finally {
        operation = null
      }
    },
  }), 'restart-plugin: uninstall route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${PREFIX}/install-market`,
    handler: async (req, res) => {
      if ((req.method ?? 'GET') !== 'POST') return sendJson(res, 405, { ok: false, message: 'method not allowed' })
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'foreign origin' })
      if (req.headers[GUARD_HEADER] !== GUARD_VALUE) {
        return sendJson(res, 403, { ok: false, message: 'missing confirmation header' })
      }
      if (rejectBusy(res)) return
      operation = 'install-market'
      try {
        const installed = await installMarket()
        // The market has a Host half, so it needs a full restart to load.
        sendJson(res, 200, { ok: true, ...installed, restartRequired: true })
      } catch (error) {
        const code = (error && error.code) || 'install-failed'
        sendJson(res, 500, { ok: false, code, message: error instanceof Error ? error.message : String(error) })
      } finally {
        operation = null
      }
    },
  }), 'restart-plugin: install-market route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${PREFIX}/update`,
    handler: async (req, res) => {
      if ((req.method ?? 'GET') !== 'POST') return sendJson(res, 405, { ok: false, message: 'method not allowed' })
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'foreign origin' })
      if (req.headers[GUARD_HEADER] !== GUARD_VALUE) {
        return sendJson(res, 403, { ok: false, message: 'missing confirmation header' })
      }
      let names = []
      try {
        const { text, overflow } = await readBody(req)
        if (overflow) return sendJson(res, 413, { ok: false, code: 'body-too-large', message: 'request body is too large' })
        const body = JSON.parse(text || '{}')
        const valid = body !== null && typeof body === 'object' && !Array.isArray(body)
        names = valid && Array.isArray(body.names)
          ? body.names.filter((name) => typeof name === 'string' && name !== '')
          : []
      } catch {
        return sendJson(res, 400, { ok: false, code: 'bad-request', message: 'body must be JSON' })
      }
      if (names.length === 0) return sendJson(res, 400, { ok: false, code: 'no-targets', message: 'no package names given' })
      if (rejectBusy(res)) return
      operation = 'update'
      try {
        // A blacklisted package is ignored by the check, so updating one is not
        // a normal request; refuse it instead of quietly doing it.
        const { blacklist } = await readSettings()
        const blocked = names.filter((name) => blacklist.includes(name))
        if (blocked.length > 0) {
          return sendJson(res, 400, {
            ok: false,
            code: 'blacklisted',
            message: `${blocked.join(', ')} is in the plugin update blacklist`,
          })
        }
        await resolveTargets(names)
        const { results, deferred, pendingCount, hotApplied } = await updatePlugins(names, {
          hotApply: canApplyLive(),
          reconcile: () => reconcileProfile(ctx),
        })
        const failed = results.find((result) => !result.ok)
        if (failed !== undefined) {
          return sendJson(res, 500, {
            ok: false,
            code: 'update-failed',
            message: failed.output.trim() || `${failed.name} failed`,
            results,
            deferred,
            pendingCount,
          })
        }
        sendJson(res, 200, { ok: true, results, deferred, pendingCount, restartRequired: pendingCount > 0, hotApplied })
      } catch (error) {
        const code = (error && error.code) || 'update-failed'
        sendJson(res, 400, { ok: false, code, message: error instanceof Error ? error.message : String(error) })
      } finally {
        operation = null
      }
    },
  }), 'restart-plugin: update route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${PREFIX}/restart`,
    handler: async (req, res) => {
      const method = req.method ?? 'GET'
      if (method !== 'POST') return sendJson(res, 405, { ok: false, message: 'method not allowed' })
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'foreign origin' })
      if (req.headers[GUARD_HEADER] !== GUARD_VALUE) {
        return sendJson(res, 403, { ok: false, message: 'missing confirmation header' })
      }
      let body = {}
      try {
        const { text, overflow } = await readBody(req)
        if (overflow) return sendJson(res, 413, { ok: false, code: 'body-too-large', message: 'request body is too large' })
        const parsed = JSON.parse(text || '{}')
        body = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
      } catch {
        body = {}
      }
      if (!RESTARTABLE) {
        return sendJson(res, 501, {
          ok: false,
          code: 'unsupported-runtime',
          message: `full restart is not available in this runtime (${basename(process.execPath)} on ${process.platform})`,
        })
      }
      if (rejectBusy(res)) return
      operation = 'restart'
      let workerStarted = false
      let pendingBefore = null
      let dir
      try {
        // The market cannot replace itself while it owns the running bundle, so a
        // restart that finds a newer market hands that one update to the worker.
        let selfUpdate = { needed: false, command: '', dir: undefined }
        if (body.updateSelf !== false) {
          selfUpdate = await selfUpdateCommand().catch(() => ({ needed: false, command: '', dir: undefined }))
        }
        dir = selfUpdate.dir
        if (dir === undefined) {
          try {
            dir = (await installedPlugins()).dir
          } catch {
            dir = undefined
          }
        }
        /* Everything pending is about to be loaded by the relaunched process.
           Clear the queue only once the profile is known, and put it back if the
           worker could not be created. */
        if (dir !== undefined) {
          pendingBefore = await readPending(dir)
          await writePending([], dir)
        }
        const started = await startRelaunch(selfUpdate.command)
        workerStarted = true
        /* If the worker somehow leaves this process alive, do not lock out the
           next restart or update forever. */
        const unlock = setTimeout(() => {
          if (operation === 'restart') operation = null
        }, 30000)
        if (typeof unlock.unref === 'function') unlock.unref()
        sendJson(res, 202, {
          ok: true,
          mode: 'full',
          workerPid: started.workerPid,
          selfUpdate: selfUpdate.needed ? { package: SELF_HOST_PACKAGE, from: selfUpdate.from, to: selfUpdate.to } : null,
        })
      } catch (error) {
        if (!workerStarted && dir !== undefined && pendingBefore !== null) {
          await writePending(pendingBefore, dir)
        }
        sendJson(res, 500, {
          ok: false,
          code: 'spawn-failed',
          message: error instanceof Error ? error.message : String(error),
        })
      } finally {
        if (!workerStarted) operation = null
      }
    },
  }), 'restart-plugin: restart route')
}
