import { useState } from 'react'
import { PRESET_CITIES } from '../presets.js'

export default function LocationPicker({ location, onSelect, onLocate, locating, geoError }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  async function handleSearch(event) {
    event.preventDefault()
    const name = query.trim()
    if (!name) return
    setSearching(true)
    setSearchError('')
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`
      const res = await fetch(url)
      const data = await res.json()
      const list = (data.results || []).map((r) => ({
        name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
        lat: r.latitude,
        lon: r.longitude,
      }))
      setResults(list)
      if (list.length === 0) setSearchError('No places found. Try another name.')
    } catch {
      setSearchError('City search is unavailable right now. Pick a preset or use your location.')
    } finally {
      setSearching(false)
    }
  }

  function pick(place) {
    onSelect(place)
    setResults([])
    setQuery('')
    setSearchError('')
  }

  return (
    <div className="field">
      <span className="field-label">Where is the task?</span>

      <div className="chips">
        {PRESET_CITIES.map((city) => (
          <button
            key={city.name}
            type="button"
            className={location.name === city.name ? 'chip chip--active' : 'chip'}
            onClick={() => pick(city)}
          >
            {city.name}
          </button>
        ))}
        <button type="button" className="chip chip--ghost" onClick={onLocate} disabled={locating}>
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </div>

      {geoError && <p className="hint hint--warn">{geoError}</p>}

      <form className="search" onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search another city…"
          aria-label="Search for a city"
        />
        <button type="submit" className="btn btn--secondary" disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searchError && <p className="hint hint--warn">{searchError}</p>}

      {results.length > 0 && (
        <ul className="search-results">
          {results.map((place) => (
            <li key={`${place.name}-${place.lat}-${place.lon}`}>
              <button type="button" className="search-result" onClick={() => pick(place)}>
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        Selected: <strong>{location.name}</strong> ({location.lat.toFixed(2)}, {location.lon.toFixed(2)})
      </p>
    </div>
  )
}
