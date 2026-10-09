import { useEffect, useRef, useState } from 'react'
import './App.css'
import { fetchRecommendation } from './api.js'
import { sampleRecommendation } from './sampleData.js'
import LocationPicker from './components/LocationPicker.jsx'
import TaskForm from './components/TaskForm.jsx'
import ResultCard from './components/ResultCard.jsx'
import WeatherOverview from './components/WeatherOverview.jsx'
import ComplianceBadges from './components/ComplianceBadges.jsx'
import { ACTIVITIES, DEFAULT_ACTIVITY } from './activities.js'
import { PRESET_CITIES } from './presets.js'
import { nearbyLabel, reverseGeocode } from './reverseGeocode.js'
import { buildShareQuery, parseShareQuery } from './share.js'
import { loadUnit, saveUnit, TempUnitContext } from './units.js'

function pad(value) {
  return String(value).padStart(2, '0')
}

const CURRENT_YEAR = new Date().getFullYear()
const ACTIVITY_IDS = ACTIVITIES.map((activity) => activity.id)

function dateString(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoHour(date, hour) {
  return `${date}T${pad(hour)}:00`
}

function defaultForm(date) {
  return {
    date,
    startHour: 10,
    endHour: 17,
    duration: 2,
    chosenHour: 13,
    activity: DEFAULT_ACTIVITY,
    rainFirst: false,
  }
}

function parseCurrentUrl(today) {
  return parseShareQuery(typeof window !== 'undefined' ? window.location.search : '', {
    today,
    tomorrow: dateString(1),
    activities: ACTIVITY_IDS,
  })
}

export default function App() {
  const today = dateString(0)
  const tomorrow = dateString(1)

  const [boot] = useState(() => {
    const bootToday = dateString(0)
    const parsed = parseCurrentUrl(bootToday)
    return {
      parsed,
      form: parsed?.form ? { ...defaultForm(bootToday), ...parsed.form } : null,
    }
  })

  const [location, setLocation] = useState(() => boot.parsed?.location ?? PRESET_CITIES[0])
  const [locating, setLocating] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [geoNameError, setGeoNameError] = useState(false)
  const [form, setForm] = useState(() => boot.form ?? defaultForm(today))
  const [shareNotice, setShareNotice] = useState(() => boot.parsed?.notice ?? '')
  const [result, setResult] = useState(null)
  const [isSample, setIsSample] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unit, setUnitState] = useState(loadUnit)
  const abortRef = useRef(null)
  const runRef = useRef(null)
  const locateSeqRef = useRef(0)

  function changeUnit(next) {
    setUnitState(next)
    saveUnit(next)
  }

  async function runRecommendation(nextForm, nextLocation = location) {
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
          lat: nextLocation.lat,
          lon: nextLocation.lon,
          duration: nextForm.duration,
          start: isoHour(nextForm.date, nextForm.startHour),
          end: isoHour(nextForm.date, nextForm.endHour),
          chosen: isoHour(nextForm.date, nextForm.chosenHour),
          name: nextLocation.name,
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

  useEffect(() => {
    runRef.current = runRecommendation
  })

  useEffect(() => {
    if (boot.form && boot.parsed?.location) {
      runRef.current(boot.form, boot.parsed.location)
    }
    function onPopState() {
      const parsed = parseCurrentUrl(dateString(0))
      if (parsed?.location && parsed.form) {
        const nextForm = { ...defaultForm(dateString(0)), ...parsed.form }
        setLocation(parsed.location)
        setForm(nextForm)
        setShareNotice(parsed.notice ?? '')
        runRef.current(nextForm, parsed.location)
      } else if (parsed?.invalid) {
        setShareNotice(parsed.notice)
        setResult(null)
        setError('')
        setIsSample(false)
      } else {
        setShareNotice('')
        setResult(null)
        setError('')
        setIsSample(false)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [boot])

  function handleSubmit(nextForm) {
    setForm(nextForm)
    setShareNotice('')
    runRecommendation(nextForm)
    if (typeof window !== 'undefined') {
      const query = buildShareQuery({
        name: location.name,
        lat: location.lat,
        lon: location.lon,
        date: nextForm.date,
        startHour: nextForm.startHour,
        endHour: nextForm.endHour,
        duration: nextForm.duration,
        chosenHour: nextForm.chosenHour,
        activity: nextForm.activity,
        rainFirst: nextForm.rainFirst,
      })
      const nextUrl = `?${query}`
      if (window.location.search !== nextUrl) {
        window.history.pushState(null, '', nextUrl)
      }
    }
  }

  function handleSelectLocation(place) {
    locateSeqRef.current += 1
    setLocating(false)
    setResolving(false)
    setGeoNameError(false)
    setLocation(place)
  }

  function geoErrorMessage(error) {
    if (error?.code === 1) return 'Location permission denied — pick a city instead.'
    if (error?.code === 2) return 'Your device could not determine a location — pick a city instead.'
    if (error?.code === 3) return 'Getting your location timed out — try again or pick a city.'
    return 'Could not get your location — pick a city instead.'
  }

  async function resolvePlaceName(lat, lon, fallbackName, seq) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    try {
      const label = await reverseGeocode(lat, lon, { signal: controller.signal })
      if (seq !== locateSeqRef.current) return
      setLocation((current) =>
        current.lat === lat && current.lon === lon && current.name === fallbackName
          ? { ...current, name: label }
          : current
      )
      setGeoNameError(false)
    } catch {
      if (seq !== locateSeqRef.current) return
      setGeoNameError(true)
    } finally {
      clearTimeout(timer)
      if (seq === locateSeqRef.current) setResolving(false)
    }
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by this browser — pick a city instead.')
      return
    }
    const seq = locateSeqRef.current + 1
    locateSeqRef.current = seq
    setLocating(true)
    setGeoError('')
    setGeoNameError(false)
    setResolving(false)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (seq !== locateSeqRef.current) return
        const lat = Number(position.coords.latitude.toFixed(4))
        const lon = Number(position.coords.longitude.toFixed(4))
        const fallback = nearbyLabel(lat, lon)
        setLocation({ name: fallback, lat, lon })
        setLocating(false)
        setResolving(true)
        resolvePlaceName(lat, lon, fallback, seq)
      },
      (error) => {
        if (seq !== locateSeqRef.current) return
        setGeoError(geoErrorMessage(error))
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

      <main className="page">
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

        <div className="layout">
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
                onSelect={handleSelectLocation}
                onLocate={handleLocate}
                locating={locating}
                resolving={resolving}
                nameError={geoNameError}
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
            {shareNotice && (
              <div className="notice" role="status">
                <p>{shareNotice}</p>
                <button type="button" className="notice__dismiss" onClick={() => setShareNotice('')}>
                  Dismiss
                </button>
              </div>
            )}

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
                activity={form.activity}
                currentLocation={location}
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
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <ComplianceBadges />
          <div className="footer__rule" role="presentation" />
          <p>
            Weather data by Open-Meteo.com (CC BY 4.0), based on multiple national weather
            services. Forecast timestamps use the location's local time.
          </p>
          <p>
            Reverse place names by OpenStreetMap Nominatim (© OpenStreetMap contributors, ODbL).
          </p>
          <p className="footer__privacy">
            Privacy: no accounts, no cookies, no analytics. Your device location is read only when
            you tap "Use my location" — the coordinates are sent to the HeatShift API, Open-Meteo,
            and OpenStreetMap Nominatim to build the forecast and a place name, and nothing is
            stored server-side. The only browser storage is your °C/°F preference. Data requests:
            open an issue on the project repository.
          </p>
          <p>
            HeatShift suggests cooler forecast windows. It is a planning aid, not medical or
            safety guidance.
          </p>
          <p className="footer__copyright">
            © {CURRENT_YEAR} HeatShift — Find a cooler time for your outdoor task
          </p>
        </div>
      </footer>
      </div>
    </TempUnitContext.Provider>
  )
}
