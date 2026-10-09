const HOURS = Array.from({ length: 24 }, (_, i) => i)

function hourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

export default function TaskForm({ value, onChange, onSubmit, loading, today, tomorrow }) {
  const { date, startHour, endHour, duration, chosenHour } = value
  const windowHours = endHour - startHour
  const windowFits = windowHours >= duration
  const lastStart = endHour - duration
  const effectiveChosen = Math.min(Math.max(chosenHour, startHour), lastStart)

  function patch(partial) {
    onChange({ ...value, ...partial })
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!windowFits) return
    onSubmit({ ...value, chosenHour: Math.max(startHour, effectiveChosen) })
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="field">
        <span className="field-label">Day</span>
        <div className="segmented" role="group" aria-label="Which day">
          <button
            type="button"
            className={date === today ? 'segmented__btn segmented__btn--active' : 'segmented__btn'}
            aria-pressed={date === today}
            onClick={() => patch({ date: today })}
          >
            Today
          </button>
          <button
            type="button"
            className={date === tomorrow ? 'segmented__btn segmented__btn--active' : 'segmented__btn'}
            aria-pressed={date === tomorrow}
            onClick={() => patch({ date: tomorrow })}
          >
            Tomorrow
          </button>
        </div>
      </div>

      <div className="grid-2">
        <label className="field">
          <span className="field-label">From</span>
          <select value={startHour} onChange={(e) => patch({ startHour: Number(e.target.value) })}>
            {HOURS.map((h) => (
              <option key={h} value={h}>{hourLabel(h)}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Until</span>
          <select value={endHour} onChange={(e) => patch({ endHour: Number(e.target.value) })}>
            {HOURS.slice(1).concat(24).map((h) => (
              <option key={h} value={h}>{h === 24 ? '24:00' : hourLabel(h)}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field-label">Task duration</span>
        <select value={duration} onChange={(e) => patch({ duration: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5, 6].map((h) => (
            <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Usual start time</span>
        <select
          value={effectiveChosen}
          onChange={(e) => patch({ chosenHour: Number(e.target.value) })}
          disabled={!windowFits}
        >
          {windowFits &&
            Array.from({ length: lastStart - startHour + 1 }, (_, i) => startHour + i).map((h) => (
              <option key={h} value={h}>{hourLabel(h)}</option>
            ))}
        </select>
      </label>

      {!windowFits && (
        <p className="hint hint--warn">
          Your window is {windowHours || 0} h but the task takes {duration} h — widen the window or shorten the task.
        </p>
      )}

      <button type="submit" className="btn btn--primary" disabled={loading || !windowFits}>
        {loading ? 'Checking the forecast…' : 'Find a cooler time'}
      </button>
    </form>
  )
}
