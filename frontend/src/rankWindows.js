const HOUR_MS = 3_600_000
const HOUR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/

export const HOT_THRESHOLD = 35

function parseHourMs(iso) {
  if (typeof iso !== 'string' || !HOUR_RE.test(iso)) return null
  const ms = Date.parse(`${iso}:00Z`)
  return Number.isNaN(ms) ? null : ms
}

function formatHour(ms) {
  return new Date(ms).toISOString().slice(0, 16)
}

export function hoursBetween(start, end) {
  const a = parseHourMs(start)
  const b = parseHourMs(end)
  if (a === null || b === null || b <= a) return null
  return Math.round((b - a) / HOUR_MS)
}

export function averageFor(forecast, start, duration) {
  if (!Array.isArray(forecast) || !Number.isInteger(duration) || duration < 1) return null
  const index = forecast.findIndex((hour) => hour.time === start)
  if (index === -1 || index + duration > forecast.length) return null
  let sum = 0
  for (let j = index; j < index + duration; j++) {
    const value = forecast[j].apparentTemp
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    sum += value
  }
  return sum / duration
}

export function rankWindows(forecast, duration, limit = 3) {
  if (!Array.isArray(forecast) || !Number.isInteger(duration) || duration < 1) return []
  const windows = []

  for (let i = 0; i + duration <= forecast.length; i++) {
    let sum = 0
    let tempComplete = true
    let rainComplete = true
    let rainMax = 0

    for (let j = i; j < i + duration; j++) {
      const hour = forecast[j]
      const feels = hour.apparentTemp
      if (typeof feels !== 'number' || !Number.isFinite(feels)) {
        tempComplete = false
        break
      }
      sum += feels
      const rain = hour.precipProb
      if (typeof rain === 'number' && Number.isFinite(rain)) {
        if (rain > rainMax) rainMax = rain
      } else {
        rainComplete = false
      }
    }

    if (!tempComplete) continue
    const startMs = parseHourMs(forecast[i].time)
    if (startMs === null) continue

    windows.push({
      start: forecast[i].time,
      end: formatHour(startMs + duration * HOUR_MS),
      avg: sum / duration,
      rainProb: rainComplete ? rainMax : null,
    })
  }

  windows.sort((a, b) => (a.avg === b.avg ? a.start.localeCompare(b.start) : a.avg - b.avg))
  return windows.slice(0, limit)
}
