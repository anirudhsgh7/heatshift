import { formatDelta, formatTemp, unitSymbol } from './units.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const SHARE_KEYS = ['lat', 'lon', 'name', 'date', 'from', 'to', 'duration', 'chosen', 'activity', 'rain']

function round1(value) {
  return Math.round(value * 10) / 10
}

function round4(value) {
  return Math.round(value * 10000) / 10000
}

function cleanName(value) {
  if (typeof value !== 'string') return ''
  let out = ''
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code > 31 && code !== 127) out += ch
  }
  return out.trim().slice(0, 80)
}

export function buildShareQuery({
  name,
  lat,
  lon,
  date,
  startHour,
  endHour,
  duration,
  chosenHour,
  activity,
  rainFirst,
}) {
  const params = new URLSearchParams()
  params.set('lat', String(round4(Number(lat))))
  params.set('lon', String(round4(Number(lon))))
  const safeName = cleanName(name)
  if (safeName) params.set('name', safeName)
  params.set('date', date)
  params.set('from', String(startHour))
  params.set('to', String(endHour))
  params.set('duration', String(duration))
  params.set('chosen', String(chosenHour))
  if (activity) params.set('activity', String(activity).slice(0, 40))
  params.set('rain', rainFirst ? '1' : '0')
  return params.toString()
}

export function parseShareQuery(search, { today, tomorrow, activities = [] } = {}) {
  const params = new URLSearchParams(search || '')
  const hasAny = SHARE_KEYS.some((key) => params.has(key))
  if (!hasAny) return null

  const lat = Number(params.get('lat'))
  const lon = Number(params.get('lon'))
  if (!params.has('lat') || !params.has('lon') || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { invalid: true, notice: 'The shared link is missing its location — starting with the default plan.' }
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { invalid: true, notice: 'The shared link had an invalid location — starting with the default plan.' }
  }

  const notices = []

  let duration = Number(params.get('duration'))
  if (!Number.isInteger(duration) || duration < 1 || duration > 6) {
    duration = 2
    notices.push('The shared task length was invalid — using 2 hours.')
  }

  let startHour = Number(params.get('from'))
  let endHour = Number(params.get('to'))
  const windowValid =
    Number.isInteger(startHour) &&
    Number.isInteger(endHour) &&
    startHour >= 0 &&
    startHour <= 23 &&
    endHour >= 1 &&
    endHour <= 24 &&
    endHour > startHour
  if (!windowValid || endHour - startHour < duration) {
    startHour = 10
    endHour = 17
    notices.push('The shared time window was invalid — using 10:00–17:00.')
  }

  let chosenHour = Number(params.get('chosen'))
  if (!Number.isInteger(chosenHour) || chosenHour < startHour || chosenHour > endHour - duration) {
    chosenHour = startHour
    notices.push('The shared planned start was invalid — using the window start.')
  }

  let date = params.get('date')
  if (!date || !DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    date = today
    notices.push('The shared date was invalid — loaded today instead.')
  } else if (today && tomorrow && date !== today && date !== tomorrow) {
    date = today
    notices.push('The shared plan date is outside the 2-day forecast — loaded today instead.')
  }

  const activityParam = params.get('activity')
  const activity = activityParam && activities.includes(activityParam) ? activityParam : null
  if (activityParam && !activity) {
    notices.push('An unknown activity was in the shared link — keeping your current choice.')
  }

  const rainFirst = params.get('rain') === '1'
  const name = cleanName(params.get('name'))

  return {
    location: { name: name || 'Shared location', lat: round4(lat), lon: round4(lon) },
    form: {
      date,
      startHour,
      endHour,
      duration,
      chosenHour,
      rainFirst,
      ...(activity ? { activity } : {}),
    },
    notice: notices.join(' '),
  }
}

export function buildShareUrl(query, base) {
  if (!query) return ''
  const baseUrl =
    base ??
    (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '')
  return baseUrl ? `${baseUrl}?${query}` : ''
}

export function formatHumanDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return String(dateStr ?? '')
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatStamp(iso, timezone) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso ?? '')
  try {
    return d.toLocaleString(undefined, { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return d.toLocaleString()
  }
}

function hourRange(block) {
  return `${block.start.slice(11, 16)}–${block.end.slice(11, 16)}`
}

export function buildPlanSummary({
  city,
  timezone,
  date,
  activityLabel,
  duration,
  planned,
  selected,
  unit,
  generatedAt,
  link,
}) {
  const symbol = unitSymbol(unit)
  const diff = round1(planned.avg - selected.avg)
  const diffText =
    Math.abs(diff) < 0.05
      ? 'No meaningful difference — both windows are similar'
      : diff > 0
        ? `${formatDelta(diff, unit)} ${symbol} cooler than planned`
        : `${formatDelta(Math.abs(diff), unit)} ${symbol} warmer than planned`

  const lines = [
    `HeatShift plan${activityLabel ? ` — ${activityLabel}` : ''}`,
    '',
    `City: ${city}`,
    `Date: ${formatHumanDate(date)}`,
    `Timezone: ${timezone}`,
    ...(activityLabel ? [`Activity: ${activityLabel}`] : []),
    `Task duration: ${duration} hour${duration === 1 ? '' : 's'}`,
    `Planned window: ${hourRange(planned)} — ${formatTemp(planned.avg, unit)} ${symbol} avg feels-like`,
    `Recommended window: ${hourRange(selected)} — ${formatTemp(selected.avg, unit)} ${symbol} avg feels-like`,
    `Difference: ${diffText}`,
    `Forecast fetched: ${formatStamp(generatedAt, timezone)}`,
    ...(link ? [`Plan link: ${link}`] : []),
    '',
    'Forecast-based planning estimate, ranked by temperature only — not medical or safety advice.',
    'Weather data by Open-Meteo.com (CC BY 4.0).',
  ]
  return lines.join('\n')
}

export async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  if (typeof document === 'undefined') throw new Error('clipboard unavailable')
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(area)
  if (!ok) throw new Error('copy failed')
}
