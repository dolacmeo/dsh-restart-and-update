/**
 * User settings for the restart/update plugin.
 *
 * One document per DSH home (~/.dsh/restart-and-update.json, or $DSH_HOME when
 * set). It is read before the window-state tracker starts - the tracker has to
 * know at boot whether the window should be put back where it was - and it holds
 * the plugin update blacklist the update check consults.
 *
 * Everything here is defensive: a settings file that cannot be read must not
 * stop the Host, so an unusable document is the same thing as no document.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const SETTINGS_VERSION = 1
export const MAX_BLACKLIST = 200

/** npm package names: an optional scope, then a name, nothing that needs quoting. */
const NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i

/** Absolute path of the settings document; DSH_HOME overrides the default home. */
export function settingsPath(home = process.env.DSH_HOME) {
  const root = typeof home === 'string' && home.length > 0 ? home : join(homedir(), '.dsh')
  return join(root, 'restart-and-update.json')
}

/**
 * Keep only package names, trimmed, de-duplicated and bounded.
 * A blacklist entry that is not a name could never match a package, and this
 * list is fed back to the page, so it is normalised on the way in.
 */
export function normalizeBlacklist(value) {
  if (!Array.isArray(value)) return []
  const names = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const name = item.trim()
    if (name === '' || name.length > 214 || !NAME_PATTERN.test(name)) continue
    if (!names.includes(name)) names.push(name)
    if (names.length >= MAX_BLACKLIST) break
  }
  return names
}

/**
 * The complete settings document, with every absent field at its default.
 * `restoreWindow` defaults to true, and only an explicit false turns it off:
 * a partially written or older document keeps the helpful behaviour.
 */
export function normalizeSettings(value) {
  const source = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    blacklist: normalizeBlacklist(source.blacklist),
    restoreWindow: source.restoreWindow !== false,
  }
}

/** Read the settings; unreadable, corrupt, or foreign documents read as defaults. */
export async function readSettings(path = settingsPath()) {
  try {
    return normalizeSettings(JSON.parse(await readFile(path, 'utf8')))
  } catch {
    return normalizeSettings({})
  }
}

/** Replace the settings document atomically, so a crash never leaves half a file. */
export async function writeSettings(next, path = settingsPath()) {
  const settings = normalizeSettings(next)
  await mkdir(dirname(path), { recursive: true })
  const temporary = path + '.' + String(process.pid) + '.tmp'
  await writeFile(temporary, JSON.stringify({ version: SETTINGS_VERSION, ...settings }, null, 2) + '\n', 'utf8')
  await rename(temporary, path)
  return settings
}
