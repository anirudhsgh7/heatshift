const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Snow',
  80: 'Showers',
  81: 'Showers',
  82: 'Heavy showers',
  95: 'Thunderstorm',
}

function weatherLabel(code) {
  return WEATHER_CODES[code] || 'Weather'
}

export default function HourChart({ forecast, suggestedStart, suggestedEnd }) {
  if (!forecast || forecast.length === 0) return null

  const values = forecast.map((h) => h.apparentTemp)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1)

  return (
    <div className="chart" role="img" aria-label="Apparent temperature for each hour in the window">
      {forecast.map((hour) => {
        const inBlock = hour.time >= suggestedStart && hour.time < suggestedEnd
        const ratio = (hour.apparentTemp - min) / span
        const height = 28 + ratio * 84
        const hue = 215 - ratio * 177
        const label = hour.time.slice(11, 16)
        return (
          <div key={hour.time} className={inBlock ? 'chart-col chart-col--on' : 'chart-col'}>
            <span className="chart-value">{Math.round(hour.apparentTemp)}°</span>
            <div
              className="chart-bar"
              style={{ height: `${height}px`, background: `hsl(${hue} 72% 52%)` }}
              title={`${label} — feels like ${hour.apparentTemp}°C, ${weatherLabel(hour.weatherCode)}, rain ${hour.precipProb}%, humidity ${hour.humidity}%`}
            />
            <span className="chart-hour">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
