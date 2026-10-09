import { useRef } from 'react'
import { ACTIVITIES } from '../activities.js'

function ActivityIcon({ id }) {
  switch (id) {
    case 'walking':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12.5" cy="4.2" r="1.9" />
          <path d="M12.5 6.4v4.8" />
          <path d="M12.5 11.2l-2.3 3.5-1.4 5.1" />
          <path d="M12.5 11.2l2.7 3.1.6 5.5" />
          <path d="M12.5 7.7l-3.2 2.3" />
          <path d="M12.5 7.7l3.2 1.9" />
        </svg>
      )
    case 'cycling':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="6" cy="16.5" r="3.4" />
          <circle cx="18" cy="16.5" r="3.4" />
          <path d="M6 16.5l4.6-7.3h4.8l2.6 7.3" />
          <path d="M10.6 9.2L9.2 6.3h3.1" />
        </svg>
      )
    case 'exercise':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6.8 9.2v5.6M4.3 10.2v3.6M17.2 9.2v5.6M19.7 10.2v3.6M6.8 12h10.4" />
        </svg>
      )
    case 'delivery':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 8l8-4 8 4v8l-8 4-8-4z" />
          <path d="M4 8l8 4 8-4" />
          <path d="M12 12v8" />
        </svg>
      )
    case 'gardening':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20v-9" />
          <ellipse cx="8.8" cy="11" rx="3.2" ry="1.7" transform="rotate(-28 8.8 11)" />
          <ellipse cx="15.2" cy="8.8" rx="3.2" ry="1.7" transform="rotate(28 15.2 8.8)" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
          <circle cx="9" cy="7" r="2" className="activity-knob" />
          <circle cx="15" cy="12" r="2" className="activity-knob" />
          <circle cx="7" cy="17" r="2" className="activity-knob" />
        </svg>
      )
  }
}

export default function ActivityPicker({ activity, onChange }) {
  const refs = useRef([])

  function handleKey(event, index) {
    const direction =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0
    if (direction === 0) return
    event.preventDefault()
    const next = Math.min(Math.max(index + direction, 0), ACTIVITIES.length - 1)
    onChange(ACTIVITIES[next])
    refs.current[next]?.focus()
  }

  return (
    <div className="field">
      <span className="field-label">Activity</span>
      <ul className="activities" role="radiogroup" aria-label="Outdoor activity">
        {ACTIVITIES.map((item, index) => {
          const selected = activity === item.id
          return (
            <li key={item.id} role="presentation">
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                ref={(el) => {
                  refs.current[index] = el
                }}
                className={selected ? 'activity activity--on' : 'activity'}
                onClick={() => onChange(item)}
                onKeyDown={(event) => handleKey(event, index)}
              >
                <span className="activity__icon">
                  <ActivityIcon id={item.id} />
                </span>
                <span className="activity__label">{item.label}</span>
                <span className="activity__hint">
                  {item.typical ? `usually ~${item.typical} h` : 'your own length'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
