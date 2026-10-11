import { createContext, useContext } from 'react'

export const THEME_STORAGE_KEY = 'heatshift.theme'
export const DEFAULT_THEME = 'light'

export const ThemeContext = createContext({ theme: DEFAULT_THEME, setTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light'
}

export function systemTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    return DEFAULT_THEME
  }
}

export function hasStoredTheme() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function loadTheme() {
  if (typeof window === 'undefined') return systemTheme()
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored !== null) return normalizeTheme(stored)
  } catch {
    // storage unavailable — fall through to the system preference
  }
  return systemTheme()
}

export function saveTheme(theme) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizeTheme(theme))
  } catch {
    // storage unavailable (private mode, quota) — preference simply won't persist
  }
}