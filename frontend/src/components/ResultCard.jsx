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
    <section className="result" aria-live="polite">
      {isSample && <p className="sample-banner">{SAMPLE_LABEL}</p>}

      <h2 className="result-headline">
        {cooler ? `Move the task to ${suggested}` : `You are already at the best time (${original})`}
      </h2>
      <p className="result-sub">
        {cooler
          ? `About ${deltaC.toFixed(1)} °C cooler on average than your planned ${original} (feels-like temperature).`
          : 'Your planned slot is as cool as it gets inside your window.'}
      </p>

      <div className="blocks">
        <article className="block">
          <span className="block-kicker">Planned</span>
          <span className="block-time">{original}</span>
          <span className="block-temp">{originalBlock.avgApparent.toFixed(1)}°C</span>
          <span className="block-note">avg feels-like</span>
        </article>
        <article className={cooler ? 'block block--best' : 'block'}>
          <span className="block-kicker">Suggested</span>
          <span className="block-time">{suggested}</span>
          <span className="block-temp">{suggestedBlock.avgApparent.toFixed(1)}°C</span>
          <span className="block-note">avg feels-like</span>
        </article>
      </div>

      <HourChart
        forecast={forecast}
        suggestedStart={suggestedBlock.start}
        suggestedEnd={suggestedBlock.end}
      />

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

      <p className="hint">
        Source: {source}. Forecast-based planning estimate — not medical or safety advice.
      </p>
    </section>
  )
}
