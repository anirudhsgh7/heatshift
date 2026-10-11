const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function pad(value) {
  return String(value).padStart(2, '0')
}

export function nextDateIso(dateStr) {
  if (typeof dateStr !== 'string' || !DATE_RE.test(dateStr)) return null
  const d = new Date(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function isoHour(date, hour) {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return null
  if (!Number.isInteger(hour) || hour < 0 || hour > 24) return null
  if (hour === 24) {
    const next = nextDateIso(date)
    return next === null ? null : `${next}T00:00`
  }
  return `${date}T${pad(hour)}:00`
}

export function buildWindowIso(date, { startHour, endHour } = {}) {
  const start = isoHour(date, startHour)
  const end = isoHour(date, endHour)
  if (start === null || end === null) return null
  return { start, end }
}