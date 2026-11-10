import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

/*
 * The client half is one self-contained browser bundle: it cannot import from
 * lib/, so the page-reload helpers are lifted out of client.js by their markers
 * and evaluated here. What this proves is the decision logic the reload path
 * depends on, not the browser plumbing around it.
 */
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const start = source.indexOf('/* page-reload:start')
const end = source.indexOf('/* page-reload:end */')
assert.ok(start >= 0 && end > start, 'client.js lost its page-reload marker block')
const body = source.slice(source.indexOf('*/', start) + 2, end)
const load = () => new Function(`${body}\nreturn { freshDocumentUrl, bootedGraphRev, staleBootGraph }`)()
const { freshDocumentUrl, bootedGraphRev, staleBootGraph } = load()

test('a reload addresses the document so no cache entry can answer for it', () => {
  const realNow = Date.now
  try {
    Date.now = () => 1794284128455
    const href = freshDocumentUrl('dsh-app://app/?tab=1#/session/abc')
    assert.equal(href, 'dsh-app://app/?tab=1&dsh-reload=1794284128455#/session/abc')
    // A query the app already carries survives; the hash is the app route.
    const plain = freshDocumentUrl('dsh-app://app/')
    assert.equal(plain, 'dsh-app://app/?dsh-reload=1794284128455')
  } finally {
    Date.now = realNow
  }
})

test('every reload is a different address, so the last one cannot be reused', () => {
  const realNow = Date.now
  try {
    Date.now = () => 1
    const first = freshDocumentUrl('dsh-app://app/')
    Date.now = () => 2
    const second = freshDocumentUrl('dsh-app://app/')
    assert.notEqual(first, second)
  } finally {
    Date.now = realNow
  }
})

test('an unparseable address yields no target instead of a broken navigation', () => {
  assert.equal(freshDocumentUrl('not a url'), null)
  assert.equal(freshDocumentUrl(undefined), null)
})

test('the booted revision is read from the shell graph only', () => {
  const scope = globalThis
  const previous = scope.window
  try {
    scope.window = { __DSH_BOOT__: { rev: 'abc123' } }
    assert.equal(bootedGraphRev(), 'abc123')
    scope.window = { __DSH_BOOT__: { rev: '' } }
    assert.equal(bootedGraphRev(), null)
    scope.window = { __DSH_BOOT__: {} }
    assert.equal(bootedGraphRev(), null)
    scope.window = {}
    assert.equal(bootedGraphRev(), null)
  } finally {
    scope.window = previous
  }
})

test('only two known and different revisions make a boot stale', () => {
  assert.equal(staleBootGraph('a', 'b'), true)
  assert.equal(staleBootGraph('a', 'a'), false)
  assert.equal(staleBootGraph('', 'b'), false)
  assert.equal(staleBootGraph('a', ''), false)
  assert.equal(staleBootGraph(null, 'b'), false)
  assert.equal(staleBootGraph('a', undefined), false)
})
