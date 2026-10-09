import { useState } from 'react'
import { SAMPLE_LABEL } from '../sampleData.js'
import {
  averageFor,
  candidateWindows,
  hoursBetween,
  rainUsable,
  rankWindows,
} from '../rankWindows.js'
import HourChart from './HourChart.jsx'
import WindowOptions from './WindowOptions.jsx'
import { formatDelta, formatTemp, formatTempLabel, unitSymbol, useTempUnit } from '../units.js'

function formatTime(iso) {
  return iso.slice(11, 16)
}

function formatBlock(block) {
  return `${formatTime(block.start)}–${formatTime(block.end)}`
}

function round1(value) {
  return Math.round(value * 10) / 10
}

export default function ResultCard({ result, isSample, rainFirst = false }) {
  const { originalBlock, suggestedBlock, forecast, timezone, location, source, generatedAt } = result
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { unit } = useTempUnit()
  const symbol = unitSymbol(unit)

  const duration = hoursBetween(suggestedBlock.start, suggestedBlock.end) ?? 1
  const rainOk = rainUsable(candidateWindows(forecast, duration))
  const effectiveRainFirst = rainFirst && rainOk
  const ranked = rankWindows(forecast, duration, { rainFirst: effectiveRainFirst })
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
        : `The coolest feasible window is ${formatBlock(best)} — ${formatDelta(round1(plannedAvg - best.avg), unit)} ${symbol} cooler on average.`
  } else if (cooler) {
    headline = `Move the task to ${selectedRange}`
    sub = `About ${formatDelta(selectedDelta, unit)} ${symbol} cooler on average than your planned ${plannedRange} (feels-like).`
  } else if (warmer) {
    headline = `${selectedRange} is about ${formatDelta(Math.abs(selectedDelta), unit)} ${symbol} warmer than your plan`
    sub = `Your planned ${plannedRange} averages ${formatTemp(plannedAvg, unit)} ${symbol}; this window averages ${formatTemp(selected.avg, unit)} ${symbol} (feels-like).`
  } else {
    headline = `${selectedRange} matches your plan`
    sub = `Nearly the same average feels-like as your planned ${plannedRange} (${formatTemp(plannedAvg, unit)} ${symbol}).`
  }

  return (
    <section className="result card card--pad" aria-live="polite">
      {isSample && <p className="sample-banner">{SAMPLE_LABEL}</p>}

      <div className="result__head">
        <p className="result__kicker">Recommendation</p>
        <span className={cooler ? 'delta delta--good' : warmer ? 'delta delta--warm' : 'delta'}>
          {cooler
            ? `≈ ${formatDelta(selectedDelta, unit)} ${symbol} cooler`
            : warmer
              ? `≈ ${formatDelta(Math.abs(selectedDelta), unit)} ${symbol} warmer`
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
          <span className="block__temp">{formatTempLabel(plannedAvg, unit)}</span>
          <span className="block__note">avg feels-like</span>
        </article>
        {!isPlanned && (
          <article className={cooler ? 'block block--best' : 'block'}>
            <span className="block__kicker">Selected</span>
            <span className="block__time">{selectedRange}</span>
            <span className="block__temp">{formatTempLabel(selected.avg, unit)}</span>
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

      {rainFirst && (
        <p className="hint">
          {rainOk
            ? 'Rain priority is on: windows are ranked by lowest rain chance first, then by average feels-like temperature.'
            : 'Rain priority is on, but this forecast has no usable rain variation across the windows (rain chance missing or identical everywhere), so windows are ranked by temperature only.'}
        </p>
      )}

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
