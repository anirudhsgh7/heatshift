import { SAMPLE_LABEL } from '../sampleData.js'
import HourChart from './HourChart.jsx'

function formatTime(iso) {
  return iso.slice(11, 16)
}

function formatBlock(block) {
  return `${formatTime(block.start)}–${formatTime(block.end)}`
}

export default function ResultCard({ result, isSample }) {
  const { originalBlock, suggestedBlock, deltaC, forecast, timezone, location, source, generatedAt } = result
  const cooler = deltaC > 0.05
  const original = formatBlock(originalBlock)
  const suggested = formatBlock(suggestedBlock)

  return (
    <section className="result card card--pad" aria-live="polite">
      {isSample && <p className="sample-banner">{SAMPLE_LABEL}</p>}

      <div className="result__head">
        <p className="result__kicker">Recommendation</p>
        <span className={cooler ? 'delta delta--good' : 'delta'}>
          {cooler ? `≈ ${deltaC.toFixed(1)} °C cooler` : 'Already the coolest slot'}
        </span>
      </div>

      <div>
        <h2 className="result__headline">
          {cooler ? `Move the task to ${suggested}` : `You are already at the best time (${original})`}
        </h2>
        <p className="result__sub">
          {cooler
            ? `Your planned ${original} averages ${originalBlock.avgApparent.toFixed(1)} °C feels-like; ${suggested} averages ${suggestedBlock.avgApparent.toFixed(1)} °C.`
            : 'Your planned slot is as cool as it gets inside your window.'}
        </p>
      </div>

      <div className="blocks">
        <article className="block">
          <span className="block__kicker">Planned</span>
          <span className="block__time">{original}</span>
          <span className="block__temp">{originalBlock.avgApparent.toFixed(1)}°C</span>
          <span className="block__note">avg feels-like</span>
        </article>
        <article className={cooler ? 'block block--best' : 'block'}>
          <span className="block__kicker">Suggested</span>
          <span className="block__time">{suggested}</span>
          <span className="block__temp">{suggestedBlock.avgApparent.toFixed(1)}°C</span>
          <span className="block__note">avg feels-like</span>
        </article>
      </div>

      <div className="chart-block">
        <p className="chart-title">Hourly feels-like in your window</p>
        <HourChart
          forecast={forecast}
          suggestedStart={suggestedBlock.start}
          suggestedEnd={suggestedBlock.end}
        />
      </div>

      <dl className="meta">
        <div>
          <dt>Location</dt>
          <dd>{location.name}</dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>{forecast.length} hours</dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{timezone}</dd>
        </div>
        <div>
          <dt>Fetched</dt>
          <dd>{new Date(generatedAt).toLocaleString()}</dd>
        </div>
      </dl>

      <p className="result__source">
        Source: {source}. Forecast-based planning estimate — not medical or safety advice.
      </p>
    </section>
  )
}
