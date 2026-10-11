import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_THEME,
  hasStoredTheme,
  loadTheme,
  normalizeTheme,
  saveTheme,
  systemTheme,
  THEME_STORAGE_KEY,
} from '../src/theme.js'

function storageMock(entries = {}) {
  const map = new Map(Object.entries(entries))
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value))
    },
    keys: () => [...map.keys()],
  }
}

function matchMediaMock(matches) {
  return { matches, addEventListener() {}, removeEventListener() {} }
}

function windowMock({ stored = {}, matches = false, throwing = false } = {}) {
  return {
    localStorage: throwing
      ? {
          getItem() {
            throw new Error('denied')
          },
          setItem() {
            throw new Error('quota')
          },
        }
      : storageMock(stored),
    matchMedia: () => matchMediaMock(matches),
  }
}

function withWindow(win, fn) {
  globalThis.window = win
  try {
    return fn()
  } finally {
    delete globalThis.window
  }
}

test('normalizeTheme only accepts light and dark', () => {
  assert.equal(normalizeTheme('dark'), 'dark')
  assert.equal(normalizeTheme('light'), 'light')
  assert.equal(normalizeTheme('blue'), 'light')
  assert.equal(normalizeTheme(null), 'light')
  assert.equal(normalizeTheme(undefined), 'light')
})

test('SSR (no window) resolves to the light default', () => {
  assert.equal(loadTheme(), DEFAULT_THEME)
  assert.equal(systemTheme(), DEFAULT_THEME)
  assert.equal(saveTheme('dark'), undefined)
  assert.equal(hasStoredTheme(), false)
})

test('loadTheme honors the stored preference', () => {
  withWindow(windowMock({ stored: { [THEME_STORAGE_KEY]: 'dark' } }), () =>
    assert.equal(loadTheme(), 'dark')
  )
})

test('loadTheme falls back to the system preference when nothing is stored', () => {
  withWindow(windowMock({ matches: true }), () => assert.equal(loadTheme(), 'dark'))
  withWindow(windowMock({ matches: false }), () => assert.equal(loadTheme(), 'light'))
})

test('corrupt stored values normalize to light', () => {
  withWindow(windowMock({ stored: { [THEME_STORAGE_KEY]: 'midnight' } }), () =>
    assert.equal(loadTheme(), 'light')
  )
})

test('throwing storage falls back to the system preference without crashing', () => {
  withWindow(windowMock({ throwing: true, matches: true }), () =>
    assert.equal(loadTheme(), 'dark')
  )
  withWindow(windowMock({ throwing: true }), () => assert.equal(hasStoredTheme(), false))
  withWindow(windowMock({ throwing: true }), () => assert.equal(saveTheme('dark'), undefined))
})

test('missing matchMedia falls back to light', () => {
  withWindow({ localStorage: storageMock() }, () => assert.equal(systemTheme(), DEFAULT_THEME))
})

test('saveTheme persists a normalized value', () => {
  const window = windowMock()
  withWindow(window, () => saveTheme('dark'))
  assert.equal(window.localStorage.getItem(THEME_STORAGE_KEY), 'dark')
  withWindow(window, () => saveTheme('bright'))
  assert.equal(window.localStorage.getItem(THEME_STORAGE_KEY), 'light')
})

test('hasStoredTheme reflects stored preference presence', () => {
  withWindow(windowMock({ stored: { [THEME_STORAGE_KEY]: 'dark' } }), () =>
    assert.equal(hasStoredTheme(), true)
  )
  withWindow(windowMock({ matches: true }), () => assert.equal(hasStoredTheme(), false))
})