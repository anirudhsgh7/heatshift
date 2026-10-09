export class OverviewError extends Error {
  constructor(message) {
    super(message)
    this.name = 'OverviewError'
  }
}

const OVERVIEW_URL = 'https://api.open-meteo.com/v1/forecast'
const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'wind_speed_10m',
  'weather_code',
  'is_day',
]
const DAILY_FIELDS = ['temperature_2m_max', 'temperature_2m_min', 'weather_code']

export function buildOverviewUrl(lat, lon) {
  const url = new URL(OVERVIEW_URL)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('current', CURRENT_FIELDS.join(','))
  url.searchParams.set('daily', DAILY_FIELDS.join(','))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '2')
  return url
}

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function code(value) {
  return Number.isInteger(value) ? value : null
}

export function normalizeOverview(data) {
  const current = data?.current
  if (!current || typeof current !== 'object') {
    throw new OverviewError('Current conditions are unavailable for this location')
  }

  const daily = data?.daily
  const dailyEntries = Array.isArray(daily?.time)
    ? daily.time.map((date, i) => ({
        date,
        tempMax: num(daily.temperature_2m_max?.[i]),
        tempMin: num(daily.temperature_2m_min?.[i]),
        weatherCode: code(daily.weather_code?.[i]),
      }))
    : []

  return {
    timezone: data.timezone ?? null,
    current: {
      time: typeof current.time === 'string' ? current.time : null,
      temp: num(current.temperature_2m),
      apparentTemp: num(current.apparent_temperature),
      humidity: num(current.relative_humidity_2m),
      windSpeed: num(current.wind_speed_10m),
      weatherCode: code(current.weather_code),
      isDay: current.is_day === 0 || current.is_day === 1 ? current.is_day === 1 : null,
    },
    daily: dailyEntries,
  }
}

export async function fetchWeatherOverview(lat, lon, { fetchImpl = fetch, signal } = {}) {
  let res
  try {
    res = await fetchImpl(buildOverviewUrl(lat, lon), { signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new OverviewError('Could not load the weather overview. Check your connection and try again.')
  }
  if (!res.ok) {
    throw new OverviewError(`Weather overview request failed (HTTP ${res.status}).`)
  }
  let data
  try {
    data = await res.json()
  } catch {
    throw new OverviewError('Weather overview returned invalid data.')
  }
  return normalizeOverview(data)
}
