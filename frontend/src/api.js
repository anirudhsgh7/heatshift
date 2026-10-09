const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://q3k29evt1i.execute-api.ap-south-1.amazonaws.com'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function buildQueryString({ lat, lon, duration, start, end, chosen, name }) {
  const qs = new URLSearchParams()
  qs.set('lat', String(lat))
  qs.set('lon', String(lon))
  qs.set('duration', String(duration))
  qs.set('start', start)
  qs.set('end', end)
  if (chosen) qs.set('chosen', chosen)
  if (name) qs.set('name', name)
  return qs.toString()
}

export async function fetchRecommendation(params, { signal } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}/recommend?${buildQueryString(params)}`, { signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Could not reach the HeatShift API. Check your connection and try again.', 0)
  }

  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok || !body || body.error) {
    throw new ApiError(body?.reason || `The API request failed (HTTP ${res.status}).`, res.status)
  }
  return body
}
