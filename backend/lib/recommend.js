const HOUR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export function parseHour(timeStr) {
  if (typeof timeStr !== "string" || !HOUR_RE.test(timeStr)) return null;
  const ms = Date.parse(`${timeStr}:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

export function formatHour(ms) {
  return new Date(ms).toISOString().slice(0, 16);
}

export function addHours(timeStr, hours) {
  const ms = parseHour(timeStr);
  if (ms === null) return null;
  return formatHour(ms + hours * 3_600_000);
}

export function round1(x) {
  return Math.round(x * 10) / 10;
}

export function computeRecommendation(series, { duration, start, end, chosen } = {}) {
  if (!Number.isInteger(duration) || duration < 1 || duration > 6) {
    throw new ValidationError("duration must be an integer between 1 and 6");
  }

  const startMs = parseHour(start);
  const endMs = parseHour(end);
  if (startMs === null || endMs === null) {
    throw new ValidationError("start and end must be ISO hours like 2026-10-09T10:00");
  }
  if (endMs <= startMs) {
    throw new ValidationError("end must be after start");
  }
  const windowHours = (endMs - startMs) / 3_600_000;
  if (windowHours < duration) {
    throw new ValidationError("available window is shorter than the task duration");
  }

  const hasChosen = chosen !== undefined && chosen !== null && chosen !== "";
  const chosenMs = hasChosen ? parseHour(chosen) : null;
  if (hasChosen && chosenMs === null) {
    throw new ValidationError("chosen must be an ISO hour like 2026-10-09T13:00");
  }
  if (chosenMs !== null) {
    if (chosenMs < startMs || chosenMs + duration * 3_600_000 > endMs) {
      throw new ValidationError("chosen slot must fit inside the available window");
    }
  }

  if (!series || !Array.isArray(series.time) || !Array.isArray(series.apparentTemp)) {
    throw new ValidationError("hourly series is missing");
  }

  const index = new Map(series.time.map((t, i) => [t, i]));
  const forecast = [];
  for (let t = startMs; t < endMs; t += 3_600_000) {
    const time = formatHour(t);
    const i = index.get(time);
    if (i === undefined || typeof series.apparentTemp[i] !== "number") {
      throw new ValidationError("requested window is outside the available forecast range");
    }
    forecast.push({
      time,
      temp: series.temp[i],
      apparentTemp: series.apparentTemp[i],
      humidity: series.humidity[i],
      precipProb: series.precipProb[i],
      windSpeed: series.windSpeed[i],
      weatherCode: series.weatherCode[i],
    });
  }

  const candidates = [];
  for (let i = 0; i + duration <= forecast.length; i++) {
    let sum = 0;
    for (let j = i; j < i + duration; j++) sum += forecast[j].apparentTemp;
    candidates.push({
      start: forecast[i].time,
      end: addHours(forecast[i].time, duration),
      avgApparent: sum / duration,
    });
  }

  let suggested = candidates[0];
  for (const c of candidates) {
    if (c.avgApparent < suggested.avgApparent - 1e-9) suggested = c;
  }

  const original =
    chosenMs === null
      ? candidates[0]
      : candidates[(chosenMs - startMs) / 3_600_000];
  if (!original) {
    throw new ValidationError("chosen slot is not a valid candidate block");
  }

  const block = (b) => ({
    start: b.start,
    end: b.end,
    avgApparent: round1(b.avgApparent),
  });

  return {
    forecast,
    originalBlock: block(original),
    suggestedBlock: block(suggested),
    deltaC: round1(original.avgApparent - suggested.avgApparent),
  };
}
