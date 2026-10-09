import { useRef } from 'react'
import { HOT_THRESHOLD } from '../rankWindows.js'

function rangeLabel(window) {
  return `${window.start.slice(11, 16)}–${window.end.slice(11, 16)}`
}

function deltaLabel(delta) {
  const rounded = Math.round(delta * 10) / 10
  if (Math.abs(rounded) < 0.05) return 'same as your plan'
  if (rounded > 0) return `${rounded.toFixed(1)} °C cooler than plan`
  return `${Math.abs(rounded).toFixed(1)} °C warmer than plan`
}

export default function WindowOptions({ options, selectedIndex, plannedAvg, onSelect }) {
  const refs = useRef([])
  const best = options[0]

  function handleKey(event, index) {
    const direction =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0
    if (direction === 0) return
    event.preventDefault()
    const next = Math.min(Math.max(index + direction, 0), options.length - 1)
    onSelect(next)
    refs.current[next]?.focus()
  }

  return (
    <div className="options">
      <div className="options__head">
        <p className="chart-title">Best feasible windows</p>
        <p className="options__hint">
          Ranked by lowest average feels-like temperature; ties go to the earlier start. Rain chance
          appears only when the forecast covers every hour of the window.
        </p>
      </div>

      <ul className="options__list" role="radiogroup" aria-label="Choose a time window">
        {options.map((option, index) => {
          const rain = option.rainProb
          return (
            <li key={option.start}>
              <button
                type="button"
                role="radio"
                aria-checked={index === selectedIndex}
                tabIndex={index === selectedIndex ? 0 : -1}
                ref={(el) => {
                  refs.current[index] = el
                }}
                className={index === selectedIndex ? 'option option--selected' : 'option'}
                onClick={() => onSelect(index)}
                onKeyDown={(event) => handleKey(event, index)}
              >
                <span className="option__rank" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="option__body">
                  <span className="option__time">{rangeLabel(option)}</span>
                  <span className="option__delta">
                    {deltaLabel(plannedAvg - option.avg)}
                    {rain !== null && rain > 0 ? ` · rain up to ${Math.round(rain)}%` : ''}
                  </span>
                </span>
                <span className="option__avg">{option.avg.toFixed(1)}°C</span>
                {index === 0 && <span className="option__tag">Best overall</span>}
                {index === selectedIndex && index !== 0 && (
                  <span className="option__tag option__tag--sel">Selected</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {options.length < 3 && (
        <p className="hint">
          {options.length === 1
            ? 'Only one window fits in your available range.'
            : `Only ${options.length} windows fit in your available range.`}
        </p>
      )}

      {best.avg >= HOT_THRESHOLD && (
        <p className="hint hint--warn">
          Every feasible window is hot: even the coolest averages {best.avg.toFixed(1)} °C feels-like.
          Ranking is based on temperature alone.
        </p>
      )}
    </div>
  )
}
