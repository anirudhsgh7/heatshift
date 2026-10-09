import { useEffect, useState } from 'react'
import { fetchWeatherOverview } from '../overview.js'
import OverviewBody from './OverviewBody.jsx'

export default function WeatherOverview({ location, selectedDate }) {
  const [attempt, setAttempt] = useState(0)
  const [entry, setEntry] = useState(null)
  const key = `${location.lat},${location.lon},${attempt}`
  const state =
    entry && entry.key === key ? entry : { status: 'loading', data: null, error: '' }

  useEffect(() => {
    const controller = new AbortController()
    fetchWeatherOverview(location.lat, location.lon, { signal: controller.signal })
      .then((data) => setEntry({ key, status: 'ready', data, error: '' }))
      .catch((err) => {
        if (err.name === 'AbortError') return
        setEntry({ key, status: 'error', data: null, error: err.message })
      })
    return () => controller.abort()
  }, [key, location.lat, location.lon])

  const { status, data, error } = state

  return (
    <section className="card card--pad" aria-labelledby="overview-title">
      <div className="card__head">
        <h2 className="card__title" id="overview-title">
          Weather overview
        </h2>
        <p className="card__hint">Modeled forecast values for the selected city.</p>
      </div>

      {status === 'loading' && (
        <div className="overview__state" role="status">
          <span className="spinner" aria-hidden="true" />
          Loading current conditions…
        </div>
      )}

      {status === 'error' && (
        <div className="overview__state" role="alert">
          <p className="hint hint--warn">{error}</p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && data && <OverviewBody data={data} selectedDate={selectedDate} />}
    </section>
  )
}
