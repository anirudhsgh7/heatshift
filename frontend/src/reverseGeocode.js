const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'
const CACHE_LIMIT = 30
const cache = new Map()

export class GeocodeError extends Error {
  constructor(message) {
    super(message)
    this.name = 'GeocodeError'
  }
}

export function nearbyLabel(lat, lon) {
  return `Nearby location (${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)})`
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function buildPlaceLabel(payload) {
  const address = payload?.address
  if (!address || typeof address !== 'object') return null

  const locality = clean(address.suburb) || clean(address.neighbourhood) || clean(address.quarter) || clean(address.hamlet)
  const city =
    clean(address.city) ||
    clean(address.town) ||
    clean(address.village) ||
    clean(address.municipality) ||
    clean(address.city_district)
  const state = clean(address.state)
  const country = clean(address.country)
  const equal = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase())

  if (locality && city && !equal(locality, city)) return `${locality}, ${city}`
  if (locality) return locality
  if (city && state && !equal(city, state)) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  if (country) return country
  return null
}

export function buildReverseUrl(lat, lon) {
  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('zoom', '14')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'en')
  return url
}

function cacheKey(lat, lon) {
  return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`
}

export async function reverseGeocode(lat, lon, { fetchImpl = fetch, signal } = {}) {
  const key = cacheKey(lat, lon)
  const cached = cache.get(key)
  if (cached) return cached

  const pending = (async () => {
    let res
    try {
      res = await fetchImpl(buildReverseUrl(lat, lon), {
        signal,
        headers: { Accept: 'application/json' },
      })
    } catch (err) {
      if (err?.name === 'AbortError') throw new GeocodeError('reverse geocoding timed out')
      throw new GeocodeError('reverse geocoding request failed')
    }
    if (!res.ok) throw new GeocodeError(`reverse geocoding failed (HTTP ${res.status})`)
    let data
    try {
      data = await res.json()
    } catch {
      throw new GeocodeError('reverse geocoding returned invalid data')
    }
    const label = buildPlaceLabel(data)
    if (!label) throw new GeocodeError('reverse geocoding found no place name')
    return label
  })()

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value)
  cache.set(key, pending)
  try {
    return await pending
  } catch (err) {
    cache.delete(key)
    throw err
  }
}

export function displayNameFor(resultLocation, currentLocation) {
  if (
    currentLocation &&
    resultLocation &&
    currentLocation.lat === resultLocation.lat &&
    currentLocation.lon === resultLocation.lon
  ) {
    return currentLocation.name ?? resultLocation.name
  }
  return resultLocation?.name ?? null
}
