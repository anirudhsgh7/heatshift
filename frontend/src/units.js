import { createContext, useContext } from 'react'

export const UNIT_STORAGE_KEY = 'heatshift.tempUnit'
export const DEFAULT_UNIT = 'C'

export const TempUnitContext = createContext({ unit: DEFAULT_UNIT, setUnit: () => {} })

export function useTempUnit() {
  return useContext(TempUnitContext)
}

export function normalizeUnit(value) {
  return value === 'F' ? 'F' : 'C'
}

export function unitSymbol(unit) {
  return unit === 'F' ? '°F' : '°C'
}

export function unitWord(unit) {
  return unit === 'F' ? 'Fahrenheit' : 'Celsius'
}

export function convertTemp(celsius) {
  return (celsius * 9) / 5 + 32
}

export function convertDelta(celsiusDelta) {
  return (celsiusDelta * 9) / 5
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

export function formatTemp(celsius, unit) {
  if (!isNumber(celsius)) return '—'
  const value = unit === 'F' ? convertTemp(celsius) : celsius
  return value.toFixed(1)
}

export function formatTempLabel(celsius, unit) {
  const text = formatTemp(celsius, unit)
  return text === '—' ? text : `${text}${unitSymbol(unit)}`
}

export function formatDelta(deltaC, unit) {
  if (!isNumber(deltaC)) return '—'
  const value = unit === 'F' ? convertDelta(deltaC) : deltaC
  return value.toFixed(1)
}

export function loadUnit() {
  if (typeof window === 'undefined') return DEFAULT_UNIT
  try {
    return normalizeUnit(window.localStorage.getItem(UNIT_STORAGE_KEY))
  } catch {
    return DEFAULT_UNIT
  }
}

export function saveUnit(unit) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(UNIT_STORAGE_KEY, normalizeUnit(unit))
  } catch {
    // storage unavailable (private mode, quota) — preference simply won't persist
  }
}
