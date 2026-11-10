import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

const {
  MAX_BLACKLIST,
  normalizeBlacklist,
  normalizeSettings,
  readSettings,
  settingsPath,
  writeSettings,
} = await import('../lib/settings.js')

/** Point the settings file at a throwaway directory for the duration of one test. */
async function withHome(run) {
  const home = await mkdtemp(join(tmpdir(), 'dsh-ru-settings-'))
  try {
    return await run(home)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
}

test('the settings file lives under DSH_HOME, and under the home directory otherwise', () => {
  assert.equal(settingsPath('/tmp/dsh-home'), join('/tmp/dsh-home', 'restart-and-update.json'))
  assert.match(settingsPath(undefined), /restart-and-update\.json$/)
})

test('only package names survive blacklist normalisation', () => {
  assert.deepEqual(normalizeBlacklist(['a', 'a', ' @scope/pkg ', '', 42, 'bad name', 'x/y', null]), [
    'a',
    '@scope/pkg',
  ])
  assert.deepEqual(normalizeBlacklist('not an array'), [])
  assert.equal(normalizeBlacklist(Array.from({ length: MAX_BLACKLIST + 20 }, (_, index) => 'pkg' + index)).length, MAX_BLACKLIST)
})

test('missing fields fall back to the helpful defaults', () => {
  assert.deepEqual(normalizeSettings(undefined), { blacklist: [], restoreWindow: true })
  assert.deepEqual(normalizeSettings({}), { blacklist: [], restoreWindow: true })
  assert.deepEqual(normalizeSettings({ blacklist: ['x'] }), { blacklist: ['x'], restoreWindow: true })
  assert.deepEqual(normalizeSettings({ restoreWindow: false }), { blacklist: [], restoreWindow: false })
  // Only an explicit false disables the window restore; anything else keeps it on.
  assert.deepEqual(normalizeSettings({ restoreWindow: 'no' }), { blacklist: [], restoreWindow: true })
})

test('a saved document round-trips, and the version is written', async () => {
  await withHome(async (home) => {
    const path = join(home, 'restart-and-update.json')
    assert.deepEqual(await readSettings(path), { blacklist: [], restoreWindow: true })
    const saved = await writeSettings({ blacklist: ['dsh-context', 'dsh-context'], restoreWindow: false }, path)
    assert.deepEqual(saved, { blacklist: ['dsh-context'], restoreWindow: false })
    assert.deepEqual(await readSettings(path), { blacklist: ['dsh-context'], restoreWindow: false })
    const document = JSON.parse(await readFile(path, 'utf8'))
    assert.equal(document.version, 1)
  })
})

test('an unreadable or corrupt document reads as defaults instead of throwing', async () => {
  await withHome(async (home) => {
    const path = join(home, 'restart-and-update.json')
    await writeFile(path, 'not json')
    assert.deepEqual(await readSettings(path), { blacklist: [], restoreWindow: true })
    await writeFile(path, JSON.stringify({ blacklist: 'wrong', restoreWindow: 1 }))
    assert.deepEqual(await readSettings(path), { blacklist: [], restoreWindow: true })
  })
})

test('writing creates the directory the document lives in', async () => {
  await withHome(async (home) => {
    const path = join(home, 'nested', 'deeper', 'settings.json')
    await writeSettings({ blacklist: ['x'], restoreWindow: true }, path)
    assert.deepEqual(await readSettings(path), { blacklist: ['x'], restoreWindow: true })
  })
})
