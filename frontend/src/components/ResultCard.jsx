import { useState } from 'react'
import { SAMPLE_LABEL } from '../sampleData.js'
import { averageFor, hoursBetween, rankWindows } from '../rankWindows.js'
import HourChart from './HourChart.jsx'
import WindowOptions from './WindowOptions.jsx'

function formatTime(iso) {
  return iso.slice(11, 16)
}

function formatBlock(block) {
  return `${formatTime(block.start)}–${formatTime(block.end)}`
}

function round1(value) {
  return Math.round(value * 10) / 10
}

export default function ResultCard({ result, isSample }) {
  const { originalBlock, suggestedBlock, forecast, timezone, location, source, generatedAt } = result
  const [selectedIndex, setSelectedIndex] = useState(0)

  const duration = hoursBetween(suggestedBlock.start, suggestedBlock.end) ?? 1
  const ranked = rankWindows(forecast, duration)
  const options =
    ranked.length > 0
      ? ranked
      : [
          {
            start: suggestedBlock.start,
            end: suggestedBlock.end,
            avg: suggestedBlock.avgApparent,
            rainProb: null,
          },
        ]

  const activeIndex = Math.min(selectedIndex, options.length - 1)
  const selected = options[activeIndex]
  const best = options[0]

  const plannedAvg = averageFor(forecast, originalBlock.start, duration) ?? originalBlock.avgApparent
  const selectedDelta = round1(plannedAvg - selected.avg)
  const cooler = selectedDelta > 0.05
  const warmer = selectedDelta < -0.05
  const isPlanned = selected.start === originalBlock.start

  const selectedRange = formatBlock(selected)
  const plannedRange = formatBlock(originalBlock)
  const rank = activeIndex + 1

  let headline
  let sub
  if (isPlanned) {
    headline = `Your planned window (${selectedRange}) is selected`
    sub =
      rank === 1
        ? 'It is also the coolest feasible window in your available range.'
        : `The coolest feasible window is ${formatBlock(best)} — ${round1(plannedAvg - best.avg).toFixed(1)} °C cooler on average.`
  } else if (cooler) {
    headline = `Move the task to ${selectedRange}`
    sub = `About ${selectedDelta.toFixed(1)} °C cooler on average than your planned ${plannedRange} (feels-like).`
  } else if (warmer) {
    headline = `${selectedRange} is about ${Math.abs(selectedDelta).toFixed(1)} °C warmer than your plan`
    sub = `Your planned ${plannedRange} averages ${plannedAvg.toFixed(1)} °C; this window averages ${selected.avg.toFixed(1)} °C (feels-like).`
  } else {
    headline = `${selectedRange} matches your plan`
    sub = `Nearly the same average feels-like as your planned ${plannedRange} (${plannedAvg.toFixed(1)} °C).`
  }

  return (
    <section className="result card card--pad" aria-live="polite">
      {isSample && <p className="sample-banner">{SAMPLE_LABEL}</p>}

      <div className="result__head">
        <p className="result__kicker">Recommendation</p>
        <span className={cooler ? 'delta delta--good' : warmer ? 'delta delta--warm' : 'delta'}>
          {cooler
            ? `≈ ${selectedDelta.toFixed(1)} °C cooler`
            : warmer
              ? `≈ ${Math.abs(selectedDelta).toFixed(1)} °C warmer`
              : 'Similar to your plan'}
        </span>
      </div>

      <div>
        <h2 className="result__headline">{headline}</h2>
        <p className="result__sub">{sub}</p>
      </div>

      <div className="blocks">
        <article className={isPlanned ? 'block block--best' : 'block'}>
          <span className="block__kicker">Planned{isPlanned ? ' · selected' : ''}</span>
          <span className="block__time">{plannedRange}</span>
          <span className="block__temp">{plannedAvg.toFixed(1)}°C</span>
          <span className="block__note">avg feels-like</span>
        </article>
        {!isPlanned && (
          <article className={cooler ? 'block block--best' : 'block'}>
            <span className="block__kicker">Selected</span>
            <span className="block__time">{selectedRange}</span>
            <span className="block__temp">{selected.avg.toFixed(1)}°C</span>
            <span className="block__note">
              avg feels-like · {rank === 1 ? 'best overall' : `rank #${rank}`}
            </span>
          </article>
        )}
      </div>

      <WindowOptions
        options={options}
        selectedIndex={activeIndex}
        plannedAvg={plannedAvg}
        onSelect={setSelectedIndex}
      />

      <HourChart
        key={generatedAt}
        forecast={forecast}
        plannedStart={originalBlock.start}
        plannedEnd={originalBlock.end}
        suggestedStart={selected.start}
        suggestedEnd={selected.end}
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

      <p className="result__source">
        Source: {source}. Forecast-based planning estimate, ranked by temperature only — not medical
        or safety advice.
      </p>
    </section>
  )
}
