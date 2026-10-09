import { weatherLabel } from '../weatherCodes.js'
import { formatTempLabel, useTempUnit } from '../units.js'

function parseDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`)
}

function nextDate(dateStr) {
  const d = parseDate(dateStr)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function dayLabel(dateStr, currentDate) {
  if (currentDate && dateStr === currentDate) return 'Today'
  if (currentDate && dateStr === nextDate(currentDate)) return 'Tomorrow'
  return 'Forecast'
}

function metric(value, unit, digits) {
  return value === null ? '—' : `${value.toFixed(digits)}${unit}`
}

export default function OverviewBody({ data, selectedDate }) {
  const { unit } = useTempUnit()
  const { current, daily, timezone } = data
  const currentDate = current.time ? current.time.slice(0, 10) : null
  const selected = daily.find((d) => d.date === selectedDate) ?? daily[0] ?? null
  const hasCurrent = [
    current.temp,
    current.apparentTemp,
    current.humidity,
    current.windSpeed,
    current.weatherCode,
  ].some((v) => v !== null)

  return (
    <div className="overview__body">
      {hasCurrent ? (
        <>
          <div className="overview__now">
            <div>
              <p className="overview__now-label">Now — modeled</p>
              <p className="overview__temp">{formatTempLabel(current.temp, unit)}</p>
            </div>
            {current.weatherCode !== null && (
              <p className="overview__condition">{weatherLabel(current.weatherCode)}</p>
            )}
          </div>

          <div className="overview__stats">
            <div className="stat">
              <span className="stat__label">Feels like</span>
              <span className="stat__value">{formatTempLabel(current.apparentTemp, unit)}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Humidity</span>
              <span className="stat__value">{metric(current.humidity, '%', 0)}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Wind</span>
              <span className="stat__value">{metric(current.windSpeed, ' km/h', 1)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="hint">Current conditions are unavailable for this location right now.</p>
      )}

      {selected && (
        <div className="overview__day">
          <div>
            <p className="overview__day-label">
              {dayLabel(selected.date, currentDate)} · {formatDate(selected.date)}
            </p>
            {selected.weatherCode !== null && (
              <p className="overview__day-summary">{weatherLabel(selected.weatherCode)}</p>
            )}
          </div>
          <div className="overview__day-values">
            <span className="overview__high">High {formatTempLabel(selected.tempMax, unit)}</span>
            <span className="overview__low">Low {formatTempLabel(selected.tempMin, unit)}</span>
          </div>
        </div>
      )}

      <p className="overview__note">
        Now values come from Open-Meteo's forecast model, not station observations.
        {current.time ? ` Updated ${current.time.slice(11, 16)} local` : ''}
        {timezone ? ` (${timezone}).` : '.'}
      </p>
    </div>
  )
}
