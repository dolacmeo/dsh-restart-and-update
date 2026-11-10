/**
 * Relaunch plumbing: which platforms can restart the app, and the scripts that
 * outlive the process they replace.
 *
 * Windows keeps the WMI/PowerShell worker in index.js - it exists because a
 * console inherited from the worker would kill the relaunched app when someone
 * closes that window, and only the detached WMI launch avoids it. POSIX needs
 * none of that: a detached `sh` in its own session survives the app, waits for
 * it to exit, and starts the replacement, so the same behaviour is one script.
 */
import { basename, dirname, join } from 'node:path'

/** Desktops DSH ships for; the restart feature follows the same three. */
export const DESKTOP_PLATFORMS = ['win32', 'darwin', 'linux']

/** Is this Host the desktop app rather than a bare `node` CLI host? */
export function isDesktopRuntime(execPath = process.execPath) {
  return !/^node(?:\.exe)?$/i.test(basename(execPath))
}

/**
 * What this runtime can do. A CLI host is a plain `node` process that the user
 * started themselves, and restarting it is out of scope; a desktop app on any
 * of the three platforms is restartable.
 */
export function relaunchSupport(platform = process.platform, execPath = process.execPath) {
  const desktop = isDesktopRuntime(execPath)
  return {
    desktop,
    supported: desktop && DESKTOP_PLATFORMS.includes(platform),
  }
}

/** The store the app was installed from: `resources` beside the binary (macOS: Contents/Resources). */
export function desktopResourcesDir(execPath = process.execPath, platform = process.platform) {
  const exeDir = dirname(execPath)
  return platform === 'darwin' ? join(exeDir, '..', 'Resources') : join(exeDir, 'resources')
}

/** The dsh launcher shipped with this installation. */
export function desktopCliPath(execPath = process.execPath, platform = process.platform) {
  return join(desktopResourcesDir(execPath, platform), 'runtime', 'cli', 'bin', platform === 'win32' ? 'dsh.cmd' : 'dsh')
}

/** One POSIX shell word, quoted so the shell reads it back verbatim. */
export function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'"
}

/**
 * The command the detached worker runs before the restart, in the syntax of the
 * shell that will run it. `cmd.exe` needs `call` so it does not eat the first
 * quote of the launcher path; a POSIX shell needs plain quoting.
 */
export function selfUpdateCommandLine({ cli, profile, packageName, version, platform = process.platform }) {
  if (platform === 'win32') {
    return `call "${cli}" plugin --profile "${profile}" add "${packageName}@${version}"`
  }
  return [shellQuote(cli), 'plugin', '--profile', shellQuote(profile), 'add', shellQuote(`${packageName}@${version}`)].join(' ')
}

/**
 * The POSIX relaunch worker. It is started detached (its own session), so it
 * survives both the app and this Host, and it is the only thing that keeps
 * running once the app is gone - which is why it logs every stage to $4.
 *
 * Arguments: 1 current Host pid, 2 app (Electron main) pid, 3 executable,
 * 4 log file, 5 base64 update command ('' for none).
 */
export const POSIX_WORKER_SCRIPT = String.raw`#!/bin/sh
# dsh-restart-and-update: relaunch worker (POSIX).
HOST_PID="$1"
APP_PID="$2"
EXE="$3"
LOG="$4"
UPDATE_B64="$5"

note() {
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null)" "$*" >>"$LOG" 2>/dev/null
}

note "worker-start pid=$$ host=$HOST_PID app=$APP_PID exe=$EXE"

# Stop the old app first: the user is waiting for the window to close, and the
# update below must not run while the app still holds the profile's files.
# The Electron main process first (it takes its renderers with it), then this
# Host if it outlives it - a leftover Host would hold the profile and the port.
kill -TERM "$APP_PID" 2>/dev/null
i=0
while kill -0 "$APP_PID" 2>/dev/null && [ "$i" -lt 120 ]; do sleep 0.25; i=$((i + 1)); done
kill -KILL "$APP_PID" 2>/dev/null
kill -TERM "$HOST_PID" 2>/dev/null
i=0
while kill -0 "$HOST_PID" 2>/dev/null && [ "$i" -lt 40 ]; do sleep 0.25; i=$((i + 1)); done
kill -KILL "$HOST_PID" 2>/dev/null
note "old-processes-gone"
sleep 1

# The market owns the running bundle and cannot replace itself; the worker does
# it before the app comes back. Its output goes to the same log.
if [ -n "$UPDATE_B64" ]; then
  UPDATE_CMD=$(printf '%s' "$UPDATE_B64" | base64 --decode 2>/dev/null)
  [ -n "$UPDATE_CMD" ] || UPDATE_CMD=$(printf '%s' "$UPDATE_B64" | base64 -d 2>/dev/null)
  if [ -n "$UPDATE_CMD" ]; then
    note "update-start"
    /bin/sh -c "$UPDATE_CMD" >>"$LOG" 2>&1 &
    UPDATE_PID=$!
    # 240 x 0.5s = two minutes. "kill -0" also succeeds for a zombie child, so
    # the state column is what tells a finished update from a still-running one.
    i=0
    while [ "$i" -lt 240 ]; do
      UPDATE_STATE=$(ps -o stat= -p "$UPDATE_PID" 2>/dev/null)
      case "$UPDATE_STATE" in
        ''|Z*) break ;;
      esac
      sleep 0.5
      i=$((i + 1))
    done
    if [ "$i" -ge 240 ]; then
      note "update-timeout-killing"
      kill -TERM "$UPDATE_PID" 2>/dev/null
      sleep 1
      kill -KILL "$UPDATE_PID" 2>/dev/null
    fi
    wait "$UPDATE_PID" 2>/dev/null
    note "update-exit=$?"
  else
    note "update-decode-failed"
  fi
else
  note "update-skipped"
fi

if [ ! -x "$EXE" ]; then
  note "exe-missing-abort"
  exit 1
fi

# A macOS .app is reopened through LaunchServices so the app behaves as if the
# user clicked it; everything else simply executes the binary again.
APP_BUNDLE=$(printf '%s' "$EXE" | sed -n 's#\(^.*\.app\)/Contents/MacOS/.*#\1#p')
if [ -n "$APP_BUNDLE" ] && [ -d "$APP_BUNDLE" ] && command -v open >/dev/null 2>&1; then
  note "relaunch-open $APP_BUNDLE"
  if open -n "$APP_BUNDLE" >>"$LOG" 2>&1; then
    exit 0
  fi
  note "relaunch-open-failed"
fi

note "relaunch-exec $EXE"
cd "$(dirname "$EXE")" 2>/dev/null || exit 1
nohup "$EXE" >>"$LOG" 2>&1 &
RELAUNCH_PID=$!
note "relaunched pid=$RELAUNCH_PID"
sleep 2
if ! kill -0 "$RELAUNCH_PID" 2>/dev/null; then
  note "relaunch-exited-early"
fi
`
