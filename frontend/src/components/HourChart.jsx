import { useCallback, useRef, useState, useSyncExternalStore } from 'react'
import { buildScale, computeGeometry, PAD_LEFT, PAD_RIGHT } from '../chartGeometry.js'
import { weatherLabel } from '../weatherCodes.js'

const PAD_TOP = 16
const PLOT_H = 168
const AXIS_H = 26
const HEIGHT = PAD_TOP + PLOT_H + AXIS_H
const FALLBACK_W = 640
const TIP_W = 216
const TIP_H = 152

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function useContainerWidth(ref) {
  const subscribe = useCallback(
    (onChange) => {
      const el = ref.current
      if (!el || typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', onChange)
        return () => window.removeEventListener('resize', onChange)
      }
      const observer = new ResizeObserver(onChange)
      observer.observe(el)
      return () => observer.disconnect()
    },
    [ref]
  )
  const getSnapshot = useCallback(() => ref.current?.clientWidth || FALLBACK_W, [ref])
  return useSyncExternalStore(subscribe, getSnapshot, () => FALLBACK_W)
}

function pathFor(points) {
  let d = ''
  let open = false
  for (const point of points) {
    if (point === null) {
      open = false
      continue
    }
    d += `${open ? 'L' : 'M'}${point.x} ${point.y} `
    open = true
  }
  return d.trim()
}

function fmt(value) {
  return typeof value === 'number' ? value.toFixed(1) : '—'
}

function formatHour(hour) {
  const d = fmt(hour.temp)
  const a = fmt(hour.apparentTemp)
  const humidity = typeof hour.humidity === 'number' ? `${Math.round(hour.humidity)}%` : '—'
  const rain = typeof hour.precipProb === 'number' ? `${Math.round(hour.precipProb)}%` : '—'
  const wind = typeof hour.windSpeed === 'number' ? `${hour.windSpeed.toFixed(1)} km/h` : '—'
  const condition = weatherLabel(hour.weatherCode)
  return { d, a, humidity, rain, wind, condition }
}

function ariaFor(hour, hasAir) {
  const f = formatHour(hour)
  const air = hasAir ? `, air temperature ${f.d} degrees` : ''
  return `${hour.time.slice(11, 16)} — feels like ${f.a} degrees${air}, humidity ${f.humidity}, ${f.rain} chance of rain, wind ${f.wind}, ${f.condition}`
}

function DetailGrid({ hour, hasAir, className }) {
  const f = formatHour(hour)
  return (
    <dl className={className}>
      <div>
        <dt>Feels like</dt>
        <dd>{f.a} °C</dd>
      </div>
      {hasAir && (
        <div>
          <dt>Air temp</dt>
          <dd>{f.d} °C</dd>
        </div>
      )}
      <div>
        <dt>Humidity</dt>
        <dd>{f.humidity}</dd>
      </div>
      <div>
        <dt>Rain chance</dt>
        <dd>{f.rain}</dd>
      </div>
      <div>
        <dt>Wind</dt>
        <dd>{f.wind}</dd>
      </div>
    </dl>
  )
}

export default function HourChart({
  forecast,
  plannedStart,
  plannedEnd,
  suggestedStart,
  suggestedEnd,
}) {
  const [showAir, setShowAir] = useState(true)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [pinnedIdx, setPinnedIdx] = useState(null)
  const [scrollLeft, setScrollLeft] = useState(0)
  const scrollRef = useRef(null)
  const width = useContainerWidth(scrollRef)

  const list = Array.isArray(forecast) ? forecast : []
  const n = list.length
  const hasAir = list.some((h) => typeof h.temp === 'number')
  const feelsVals = list.map((h) => (typeof h.apparentTemp === 'number' ? h.apparentTemp : null))
  const airVals = list.map((h) => (typeof h.temp === 'number' ? h.temp : null))
  const usableFeels = feelsVals.filter((v) => v !== null)

  if (n === 0 || usableFeels.length === 0) {
    return (
      <div className="chart-block">
        <div className="chart-head">
          <p className="chart-title">Hourly forecast</p>
        </div>
        <div className="chart-empty">
          Hourly forecast data is unavailable for this window. Try another location or widen the
          time window.
        </div>
      </div>
    )
  }

  const showAirLine = showAir && hasAir
  const scaleVals = usableFeels.concat(showAirLine ? airVals.filter((v) => v !== null) : [])
  const { lo, hi, ticks } = buildScale(scaleVals)
  const { stepX, inner, chartW } = computeGeometry(n, width)
  const x = (i) => (n > 1 ? PAD_LEFT + i * stepX : PAD_LEFT + inner / 2)
  const y = (v) => PAD_TOP + PLOT_H * (1 - (v - lo) / (hi - lo))
  const feelsPts = feelsVals.map((v, i) => (v === null ? null : { x: x(i), y: y(v) }))
  const airPts = airVals.map((v, i) => (v === null ? null : { x: x(i), y: y(v) }))
  const feelsPath = pathFor(feelsPts)
  const airPath = showAirLine ? pathFor(airPts) : ''

  const activeIdx =
    pinnedIdx !== null && pinnedIdx < n
      ? pinnedIdx
      : hoverIdx !== null && hoverIdx < n
        ? hoverIdx
        : null
  const activeHour = activeIdx !== null ? list[activeIdx] : null
  const pinnedHour = pinnedIdx !== null && pinnedIdx < n ? list[pinnedIdx] : null

  const band = (start, end) => {
    const s = list.findIndex((h) => h.time === start)
    if (s === -1) return null
    const e = end ? list.findIndex((h) => h.time === end) : -1
    const endIdx = e === -1 ? n - 1 : e - 1
    if (endIdx < s) return null
    return {
      x1: Math.max(PAD_LEFT - 6, x(s) - stepX * 0.4),
      x2: Math.min(chartW - PAD_RIGHT + 6, x(endIdx) + stepX * 0.4),
    }
  }
  const plannedBand = plannedStart ? band(plannedStart, plannedEnd) : null
  const suggestedBand = suggestedStart ? band(suggestedStart, suggestedEnd) : null

  const hitHalf = n > 1 ? stepX / 2 : stepX
  const anchorValue =
    (activeIdx !== null ? feelsVals[activeIdx] ?? airVals[activeIdx] : null) ?? (lo + hi) / 2
  const anchorY = y(anchorValue)
  let tipTop = anchorY - TIP_H - 14
  if (tipTop < 6) tipTop = Math.min(anchorY + 16, HEIGHT - TIP_H - 4)
  if (tipTop < 6) tipTop = 6
  const tipLeft =
    activeIdx !== null ? clamp(x(activeIdx) - scrollLeft - TIP_W / 2, 8, Math.max(8, width - TIP_W - 8)) : 0

  function togglePinned(index) {
    setPinnedIdx((current) => (current === index ? null : index))
  }

  return (
    <div className="chart-block">
      <div className="chart-head">
        <p className="chart-title">Hourly forecast</p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--feels" aria-hidden="true" />
            Feels-like
          </span>
          <button
            type="button"
            className={
              showAirLine
                ? 'legend-item legend-toggle'
                : 'legend-item legend-toggle legend-toggle--off'
            }
            aria-pressed={showAirLine}
            disabled={!hasAir}
            title={hasAir ? 'Show or hide air temperature' : 'Air temperature unavailable'}
            onClick={() => setShowAir((v) => !v)}
          >
            <span className="legend-swatch legend-swatch--air" aria-hidden="true" />
            Air temperature
          </button>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--planned" aria-hidden="true" />
            Planned window
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--suggested" aria-hidden="true" />
            Suggested window
          </span>
        </div>
      </div>

      <div className="chart-wrap">
        <div className="chart-scroll" ref={scrollRef} onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}>
          <svg
            className="chart-svg"
            width={chartW}
            height={HEIGHT}
            viewBox={`0 0 ${chartW} ${HEIGHT}`}
            role="group"
            aria-label="Hourly forecast chart. Use the hour buttons to inspect each hour."
          >
            {ticks.map((tick) => (
              <line
                key={tick}
                className="chart-grid-line"
                x1={PAD_LEFT}
                x2={chartW - PAD_RIGHT}
                y1={y(tick)}
                y2={y(tick)}
              />
            ))}

            {plannedBand && (
              <rect
                className="chart-band chart-band--planned"
                x={plannedBand.x1}
                y={PAD_TOP - 8}
                width={plannedBand.x2 - plannedBand.x1}
                height={PLOT_H + 10}
                rx="6"
              />
            )}
            {suggestedBand && (
              <rect
                className="chart-band chart-band--suggested"
                x={suggestedBand.x1}
                y={PAD_TOP - 8}
                width={suggestedBand.x2 - suggestedBand.x1}
                height={PLOT_H + 10}
                rx="6"
              />
            )}

            {activeIdx !== null && (
              <>
                <rect
                  className="chart-col-highlight"
                  x={x(activeIdx) - hitHalf}
                  y={PAD_TOP - 8}
                  width={hitHalf * 2}
                  height={PLOT_H + 10}
                />
                <line
                  className="chart-col-line"
                  x1={x(activeIdx)}
                  x2={x(activeIdx)}
                  y1={PAD_TOP - 8}
                  y2={PAD_TOP + PLOT_H + 2}
                />
              </>
            )}

            <path className="chart-line chart-line--feels" d={feelsPath} />
            {airPath && <path className="chart-line chart-line--air" d={airPath} />}

            {feelsPts.map((point, i) =>
              point === null ? null : (
                <circle
                  key={`f-${list[i].time}`}
                  className="chart-dot chart-dot--feels"
                  cx={point.x}
                  cy={point.y}
                  r={i === activeIdx ? 4.5 : 3}
                />
              )
            )}
            {showAirLine &&
              airPts.map((point, i) =>
                point === null ? null : (
                  <circle
                    key={`a-${list[i].time}`}
                    className="chart-dot chart-dot--air"
                    cx={point.x}
                    cy={point.y}
                    r={i === activeIdx ? 4 : 2.5}
                  />
                )
              )}

            {list.map((hour, i) => (
              <rect
                key={hour.time}
                className="hour-hit"
                x={x(i) - hitHalf}
                y={PAD_TOP - 8}
                width={hitHalf * 2}
                height={PLOT_H + 10}
                tabIndex={0}
                role="button"
                aria-pressed={pinnedIdx === i}
                aria-label={ariaFor(hour, hasAir)}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)}
                onClick={() => togglePinned(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    togglePinned(i)
                  }
                }}
              />
            ))}

            {ticks.map((tick) => (
              <text
                key={`t-${tick}`}
                className="chart-tick"
                x={PAD_LEFT - 8}
                y={y(tick) + 3.5}
                textAnchor="end"
              >
                {tick}
              </text>
            ))}
            <text className="chart-unit" x={4} y={PAD_TOP + 3.5}>
              °C
            </text>

            {list.map((hour, i) => (
              <text
                key={`h-${hour.time}`}
                className={
                  i === activeIdx ? 'chart-hour-label chart-hour-label--active' : 'chart-hour-label'
                }
                x={x(i)}
                y={PAD_TOP + PLOT_H + 18}
                textAnchor="middle"
              >
                {hour.time.slice(11, 16)}
              </text>
            ))}
          </svg>
        </div>

        {activeHour && (
          <div className="chart-tip" style={{ left: `${tipLeft}px`, top: `${tipTop}px` }}>
            <p className="chart-tip__title">
              {activeHour.time.slice(11, 16)}
              <span className="chart-tip__condition"> · {formatHour(activeHour).condition}</span>
            </p>
            <DetailGrid hour={activeHour} hasAir={hasAir} className="chart-tip__grid" />
          </div>
        )}
      </div>

      {pinnedHour && (
        <div className="chart-detail" aria-live="polite">
          <div className="chart-detail__head">
            <p className="chart-detail__time">
              {pinnedHour.time.slice(11, 16)}
              <span className="chart-detail__condition"> · {formatHour(pinnedHour).condition}</span>
            </p>
            <button type="button" className="chart-detail__clear" onClick={() => setPinnedIdx(null)}>
              Clear
            </button>
          </div>
          <DetailGrid hour={pinnedHour} hasAir={hasAir} className="chart-detail__grid" />
        </div>
      )}
    </div>
  )
}
