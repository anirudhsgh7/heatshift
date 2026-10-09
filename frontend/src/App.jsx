import { useRef, useState } from 'react'
import './App.css'
import { fetchRecommendation } from './api.js'
import { sampleRecommendation } from './sampleData.js'
import LocationPicker from './components/LocationPicker.jsx'
import TaskForm from './components/TaskForm.jsx'
import ResultCard from './components/ResultCard.jsx'
import { PRESET_CITIES } from './presets.js'

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
  const [form, setForm] = useState({ date: today, startHour: 10, endHour: 17, duration: 2, chosenHour: 13 })
  const [result, setResult] = useState(null)
  const [isSample, setIsSample] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef(null)

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
    <div className="app">
      <header className="hero">
        <p className="hero-kicker">Heat and Water · Environmental Hacks 2026</p>
        <h1>HeatShift</h1>
        <p className="hero-tagline">
          Find the coolest feasible window for an outdoor task, from the hourly feels-like forecast.
        </p>
      </header>

      <main className="main">
        <section className="panel">
          <LocationPicker
            location={location}
            onSelect={setLocation}
            onLocate={handleLocate}
            locating={locating}
            geoError={geoError}
          />
          <TaskForm
            value={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            loading={loading}
            today={today}
            tomorrow={tomorrow}
          />
        </section>

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

        {result && <ResultCard result={result} isSample={isSample} />}
      </main>

      <footer className="footer">
        <p>
          Weather data by Open-Meteo.com (CC BY 4.0), based on multiple national weather services.
          Forecast timestamps use the location's local time.
        </p>
        <p>
          HeatShift suggests cooler forecast windows. It is a planning aid, not medical or safety
          guidance.
        </p>
      </footer>
    </div>
  )
}
