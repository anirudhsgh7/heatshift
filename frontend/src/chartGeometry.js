export const PAD_LEFT = 38
export const PAD_RIGHT = 18
export const MIN_STEP = 44
export const MAX_STEP = 88

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / pow
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return factor * pow
}

export function buildScale(values, tickCount = 4) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.15, 1)
  const step = Math.max(1, niceStep((max + pad - (min - pad)) / tickCount))
  const lo = Math.floor((min - pad) / step) * step
  const hi = Math.ceil((max + pad) / step) * step
  const ticks = []
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)
  return { lo, hi, step, ticks }
}

export function computeGeometry(count, width) {
  if (count <= 1) {
    return {
      stepX: MAX_STEP,
      inner: Math.max(width - PAD_LEFT - PAD_RIGHT, 0),
      chartW: Math.max(width, PAD_LEFT + PAD_RIGHT),
    }
  }
  const inner = Math.max(width - PAD_LEFT - PAD_RIGHT, 0)
  const fit = inner / (count - 1)
  const stepX = Math.min(MAX_STEP, Math.max(MIN_STEP, fit))
  const chartW = PAD_LEFT + PAD_RIGHT + (count - 1) * stepX
  return { stepX, inner, chartW }
}
