import assert from 'node:assert/strict'
import { test } from 'node:test'

const {
  DESKTOP_PLATFORMS,
  POSIX_WORKER_SCRIPT,
  desktopCliPath,
  desktopResourcesDir,
  isDesktopRuntime,
  relaunchSupport,
  selfUpdateCommandLine,
  shellQuote,
} = await import('../lib/relaunch.js')

test('the desktop app is restartable on every platform dsh ships for', () => {
  assert.deepEqual(DESKTOP_PLATFORMS, ['win32', 'darwin', 'linux'])
  for (const platform of DESKTOP_PLATFORMS) {
    const exe = platform === 'win32' ? 'C:/Apps/DeepSeek Harness.exe' : '/opt/deepseek-harness'
    assert.deepEqual(relaunchSupport(platform, exe), { desktop: true, supported: true })
  }
})

test('a bare node host is not the desktop app and gets no restart', () => {
  assert.equal(isDesktopRuntime('C:/Program Files/nodejs/node.exe'), false)
  assert.equal(isDesktopRuntime('/usr/local/bin/node'), false)
  assert.deepEqual(relaunchSupport('linux', '/usr/local/bin/node'), { desktop: false, supported: false })
  assert.deepEqual(relaunchSupport('aix', '/opt/deepseek-harness'), { desktop: true, supported: false })
})

test('the launcher and the resources live beside the executable', () => {
  assert.match(desktopResourcesDir('C:/Apps/DeepSeek Harness.exe', 'win32'), /resources$/)
  assert.match(desktopResourcesDir('/opt/deepseek-harness', 'linux'), /resources$/)
  // macOS keeps them under Contents/, one level up from the Mach-O.
  assert.match(desktopResourcesDir('/Applications/DH.app/Contents/MacOS/DH', 'darwin'), /Contents[\\/]Resources$/)
  assert.match(desktopCliPath('C:/Apps/DeepSeek Harness.exe', 'win32'), /dsh\.cmd$/)
  assert.match(desktopCliPath('/opt/deepseek-harness', 'linux'), /bin[\\/]dsh$/)
})

test('shell quoting survives quotes and spaces', () => {
  assert.equal(shellQuote('/opt/a b/dsh'), "'/opt/a b/dsh'")
  assert.equal(shellQuote("a'b"), "'a'\\''b'")
})

test('the pre-restart update command uses the syntax of the shell that runs it', () => {
  const win = selfUpdateCommandLine({
    cli: 'C:/a b/dsh.cmd',
    profile: 'desktop',
    packageName: 'dshmarket',
    version: '1.2.3',
    platform: 'win32',
  })
  assert.equal(win, 'call "C:/a b/dsh.cmd" plugin --profile "desktop" add "dshmarket@1.2.3"')
  const posix = selfUpdateCommandLine({
    cli: '/opt/a b/dsh',
    profile: 'desktop',
    packageName: 'dshmarket',
    version: '1.2.3',
    platform: 'linux',
  })
  assert.equal(posix, "'/opt/a b/dsh' plugin --profile 'desktop' add 'dshmarket@1.2.3'")
})

test('the posix worker waits for the old app before it starts the replacement', () => {
  assert.match(POSIX_WORKER_SCRIPT, /^#!\/bin\/sh/)
  // The market update runs before the app goes away.
  assert.match(POSIX_WORKER_SCRIPT, /update-start/)
  // Killing the Electron main first, then this Host, then relaunching.
  assert.match(POSIX_WORKER_SCRIPT, /kill -TERM "\$APP_PID"/)
  assert.match(POSIX_WORKER_SCRIPT, /kill -TERM "\$HOST_PID"/)
  assert.match(POSIX_WORKER_SCRIPT, /while kill -0 "\$APP_PID"/)
  assert.match(POSIX_WORKER_SCRIPT, /nohup "\$EXE"/)
  // A macOS bundle goes back through LaunchServices.
  assert.match(POSIX_WORKER_SCRIPT, /open -n "\$APP_BUNDLE"/)
  // Base64 keeps the update command's own quoting intact.
  assert.match(POSIX_WORKER_SCRIPT, /base64 --decode/)
})

const { WORKER_SCRIPT } = await import('../index.js')

test('the windows worker closes the app before it updates anything', () => {
  const kill = WORKER_SCRIPT.indexOf("Write-Log ('kill-target pid=' + $target)")
  const update = WORKER_SCRIPT.indexOf("Write-Log 'update-start'")
  const relaunch = WORKER_SCRIPT.indexOf('wmi-create')
  assert.ok(kill > 0, 'kill stage missing')
  assert.ok(update > kill, 'the update must run after the app is gone')
  assert.ok(relaunch > update, 'the relaunch must be the last stage')
  // A hanging update must never keep the app down: the timeout falls through.
  assert.ok(WORKER_SCRIPT.includes('update-timeout-killing'))
  assert.ok(WORKER_SCRIPT.includes("Write-Log 'relaunch-failed'"))
})

test('the posix launcher falls back when open refuses, and the update is bounded', () => {
  assert.match(POSIX_WORKER_SCRIPT, /relaunch-open-failed/)
  assert.match(POSIX_WORKER_SCRIPT, /relaunch-exited-early/)
  assert.match(POSIX_WORKER_SCRIPT, /update-timeout-killing/)
  // The kill stages must come before the update stage there as well.
  assert.ok(POSIX_WORKER_SCRIPT.indexOf('old-processes-gone') < POSIX_WORKER_SCRIPT.indexOf('update-start'))
})
