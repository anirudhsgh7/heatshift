import { useRef, useState } from 'react'
import './App.css'
import { fetchRecommendation } from './api.js'
import { sampleRecommendation } from './sampleData.js'
import LocationPicker from './components/LocationPicker.jsx'
import TaskForm from './components/TaskForm.jsx'
import ResultCard from './components/ResultCard.jsx'
import WeatherOverview from './components/WeatherOverview.jsx'
import { DEFAULT_ACTIVITY } from './activities.js'
import { PRESET_CITIES } from './presets.js'
import { loadUnit, saveUnit, TempUnitContext } from './units.js'

function pad(value) {
  return String(value).padStart(2, '0')
}

function dateString(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoHour(date, hour) {
  return `${date}T${pad(hour)}:00`
}

export default function App() {
  const today = dateString(0)
  const tomorrow = dateString(1)

  const [location, setLocation] = useState(PRESET_CITIES[0])
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [form, setForm] = useState({
    date: today,
    startHour: 10,
    endHour: 17,
    duration: 2,
    chosenHour: 13,
    activity: DEFAULT_ACTIVITY,
    rainFirst: false,
  })
  const [result, setResult] = useState(null)
  const [isSample, setIsSample] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unit, setUnitState] = useState(loadUnit)
  const abortRef = useRef(null)

  function changeUnit(next) {
    setUnitState(next)
    saveUnit(next)
  }

  async function runRecommendation(nextForm) {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    setResult(null)
    setIsSample(false)

    try {
      const data = await fetchRecommendation(
        {
          lat: location.lat,
          lon: location.lon,
          duration: nextForm.duration,
          start: isoHour(nextForm.date, nextForm.startHour),
          end: isoHour(nextForm.date, nextForm.endHour),
          chosen: isoHour(nextForm.date, nextForm.chosenHour),
          name: location.name,
        },
        { signal: controller.signal }
      )
      setResult(data)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(nextForm) {
    setForm(nextForm)
    runRecommendation(nextForm)
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by this browser — pick a city instead.')
      return
    }
    setLocating(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          name: 'My location',
          lat: Number(position.coords.latitude.toFixed(4)),
          lon: Number(position.coords.longitude.toFixed(4)),
        })
        setLocating(false)
      },
      () => {
        setGeoError('Location permission denied — pick a city instead.')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  function handleSample() {
    setError('')
    setResult(sampleRecommendation)
    setIsSample(true)
  }

  return (
    <TempUnitContext.Provider value={{ unit, setUnit: changeUnit }}>
      <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <svg className="brand__mark" viewBox="0 0 26 26" aria-hidden="true">
              <circle cx="13" cy="9.5" r="4.6" fill="currentColor" />
              <path
                d="M13 1.8v2.4M4.6 5.2l1.7 1.7M21.4 5.2l-1.7 1.7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                className="brand__line"
                d="M3 18.5h20M7.5 23h11"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="brand__name">
              Heat<span className="brand__name-accent">Shift</span>
            </span>
          </div>
          <span className="topbar__badge">
            <span className="topbar__dot" aria-hidden="true" />
            Heat &amp; Water · Environmental Hacks 2026
          </span>
        </div>
      </header>

      <div className="page">
        <section className="hero">
          <div className="hero__inner">
            <p className="hero__kicker">Forecast-based planning aid</p>
            <h1>Find the coolest window for your outdoor task.</h1>
            <p className="hero__lede">
              HeatShift compares every feasible start time inside your available window using the
              hourly feels-like temperature — and shows how much cooler the best slot is than the
              one you planned.
            </p>
            <ul className="hero__facts">
              <li>1–6 hour tasks</li>
              <li>Hourly feels-like temps</li>
              <li>Live Open-Meteo forecast</li>
            </ul>
          </div>
        </section>

        <main className="layout">
          <div className="layout__planner">
            <section className="card card--pad" aria-labelledby="location-title">
              <div className="card__head">
                <h2 className="card__title" id="location-title">
                  Location
                </h2>
                <p className="card__hint">Preset city, city search, or your device location.</p>
              </div>
              <LocationPicker
                location={location}
                onSelect={setLocation}
                onLocate={handleLocate}
                locating={locating}
                geoError={geoError}
              />
            </section>

            <WeatherOverview location={location} selectedDate={form.date} />

            <section className="card card--pad" aria-labelledby="planner-title">
              <div className="card__head">
                <h2 className="card__title" id="planner-title">
                  Task planner
                </h2>
                <p className="card__hint">When you can work, and how long the task takes.</p>
              </div>
              <TaskForm
                value={form}
                onChange={setForm}
                onSubmit={handleSubmit}
                loading={loading}
                today={today}
                tomorrow={tomorrow}
              />
            </section>
          </div>

          <div className="layout__results">
            {error && (
              <div className="alert" role="alert">
                <p>{error}</p>
                <button type="button" className="btn btn--secondary" onClick={handleSample}>
                  Show labelled sample data
                </button>
              </div>
            )}

            {loading && (
              <div className="status" role="status">
                <span className="spinner" aria-hidden="true" />
                Checking the forecast…
              </div>
            )}

            {result ? (
              <ResultCard
                key={result.generatedAt}
                result={result}
                isSample={isSample}
                rainFirst={form.rainFirst}
              />
            ) : (
              !loading &&
              !error && (
                <section className="empty">
                  <h2>Your recommendation will appear here</h2>
                  <p>
                    Pick a location and a task window, then run the planner. We compare every
                    feasible start hour by feels-like temperature and highlight the coolest one.
                  </p>
                </section>
              )
            )}
          </div>
        </main>
      </div>

      <footer className="footer">
        <div className="footer__inner">
          <p>
            Weather data by Open-Meteo.com (CC BY 4.0), based on multiple national weather
            services. Forecast timestamps use the location's local time.
          </p>
          <p>
            HeatShift suggests cooler forecast windows. It is a planning aid, not medical or
            safety guidance.
          </p>
        </div>
      </footer>
      </div>
    </TempUnitContext.Provider>
  )
}
