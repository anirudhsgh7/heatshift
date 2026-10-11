import { useEffect, useRef, useState } from 'react'
import { SAMPLE_LABEL } from '../sampleData.js'
import { ACTIVITIES } from '../activities.js'
import {
  averageFor,
  candidateWindows,
  hoursBetween,
  rainUsable,
  rankWindows,
} from '../rankWindows.js'
import { buildPlanSummary, buildShareQuery, buildShareUrl, copyText } from '../share.js'
import { displayNameFor } from '../reverseGeocode.js'
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

export default function ResultCard({ result, isSample, rainFirst = false, activity, currentLocation }) {
  const { originalBlock, suggestedBlock, forecast, timezone, location, source, generatedAt } = result
  const displayName = displayNameFor(location, currentLocation) ?? location.name
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copyState, setCopyState] = useState(null)
  const copyTimer = useRef(null)
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

  const activityLabel = ACTIVITIES.find((a) => a.id === activity)?.label ?? null
  const firstHour = forecast.length > 0 ? forecast[0].time : ''
  const lastHour = forecast.length > 0 ? forecast[forecast.length - 1].time : ''
  const canShare = !isSample && forecast.length > 0
  const shareQuery = canShare
    ? buildShareQuery({
        name: displayName,
        lat: location.lat,
        lon: location.lon,
        date: firstHour.slice(0, 10),
        startHour: Number(firstHour.slice(11, 13)),
        endHour: Number(lastHour.slice(11, 13)) + 1,
        duration,
        chosenHour: Number(originalBlock.start.slice(11, 13)),
        activity,
        rainFirst,
      })
    : ''

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  function flashCopy(state) {
    setCopyState(state)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopyState(null), 2600)
  }

  async function copyPayload(text, kind) {
    try {
      await copyText(text)
      flashCopy(kind)
    } catch {
      flashCopy('error')
    }
  }

  function handleCopyPlan() {
    if (!canShare) return
    copyPayload(
      buildPlanSummary({
        city: displayName,
        timezone,
        date: firstHour.slice(0, 10),
        activityLabel,
        duration,
        planned: { start: originalBlock.start, end: originalBlock.end, avg: plannedAvg },
        selected: { start: selected.start, end: selected.end, avg: selected.avg },
        unit,
        generatedAt,
        link: buildShareUrl(shareQuery),
      }),
      'plan'
    )
  }

  function handleCopyLink() {
    if (!canShare || !shareQuery) return
    copyPayload(buildShareUrl(shareQuery), 'link')
  }

  const copyFeedback =
    copyState === 'plan'
      ? 'Plan copied to clipboard.'
      : copyState === 'link'
        ? 'Share link copied to clipboard.'
        : copyState === 'error'
          ? 'Copy failed — your browser blocked clipboard access.'
          : ''

  let headline
  let sub
  const bestDelta = round1(plannedAvg - best.avg)
  const bestDeltaText =
    Math.abs(bestDelta) < 0.05
      ? 'about the same average feels-like'
      : bestDelta > 0
        ? `${formatDelta(bestDelta, unit)} ${symbol} cooler on average`
        : `${formatDelta(Math.abs(bestDelta), unit)} ${symbol} warmer on average`
  if (isPlanned) {
    headline = `Your planned window (${selectedRange}) is selected`
    sub =
      rank === 1
        ? effectiveRainFirst
          ? 'It is also the top-ranked window for your rain preference.'
          : 'It is also the coolest feasible window in your available range.'
        : effectiveRainFirst
          ? `The best-ranked window is ${formatBlock(best)} — ${bestDeltaText} (feels-like).`
          : `The coolest feasible window is ${formatBlock(best)} — ${bestDeltaText} (feels-like).`
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
        rainFirst={effectiveRainFirst}
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
          <dd>{displayName}</dd>
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

      <div className="result__actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={handleCopyPlan}
          disabled={!canShare}
          title={isSample ? 'Sample data cannot be shared' : undefined}
        >
          Copy plan
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={handleCopyLink}
          disabled={!canShare}
          title={isSample ? 'Sample data cannot be shared' : undefined}
        >
          Copy link
        </button>
        <span
          className={copyState === 'error' ? 'copy-feedback copy-feedback--error' : 'copy-feedback'}
          role="status"
          aria-live="polite"
        >
          {copyFeedback}
        </span>
      </div>

      <p className="result__source">
        Source: {source}. Forecast-based planning estimate, ranked by temperature only — not medical
        or safety advice.
      </p>
    </section>
  )
}
