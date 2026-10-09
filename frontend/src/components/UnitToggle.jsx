import { useRef } from 'react'
import { useTempUnit } from '../units.js'

const OPTIONS = [
  { id: 'C', label: '°C' },
  { id: 'F', label: '°F' },
]

export default function UnitToggle() {
  const { unit, setUnit } = useTempUnit()
  const refs = useRef({})

  function handleKey(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setUnit('C')
      refs.current.C?.focus()
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setUnit('F')
      refs.current.F?.focus()
    }
  }

  return (
    <div className="segmented segmented--compact" role="radiogroup" aria-label="Temperature unit">
      {OPTIONS.map((option) => {
        const selected = unit === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            ref={(el) => {
              refs.current[option.id] = el
            }}
            className={selected ? 'segmented__btn segmented__btn--active' : 'segmented__btn'}
            onClick={() => setUnit(option.id)}
            onKeyDown={handleKey}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
