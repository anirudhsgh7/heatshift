import { fetchForecast, UpstreamError } from "./lib/openmeteo.js";
import { computeRecommendation, ValidationError } from "./lib/recommend.js";

const SOURCE = "Open-Meteo.com (CC BY 4.0)";

function parseQuery(event) {
  if (event?.queryStringParameters) return event.queryStringParameters;
  if (typeof event?.rawQueryString === "string") {
    return Object.fromEntries(new URLSearchParams(event.rawQueryString));
  }
  return {};
}

function requireNumber(query, key) {
  const raw = query[key];
  const n = Number(raw);
  if (raw === undefined || raw === "" || !Number.isFinite(n)) {
    throw new ValidationError(`${key} is required and must be a number`);
  }
  return n;
}

function validateQuery(query) {
  const lat = requireNumber(query, "lat");
  const lon = requireNumber(query, "lon");
  if (lat < -90 || lat > 90) throw new ValidationError("lat must be between -90 and 90");
  if (lon < -180 || lon > 180) throw new ValidationError("lon must be between -180 and 180");

  if (!query.start || !query.end) {
    throw new ValidationError("start and end are required (ISO hours like 2026-10-09T10:00)");
  }

  const duration = Number(query.duration);
  if (query.duration === undefined || query.duration === "" || !Number.isInteger(duration) || duration < 1 || duration > 6) {
    throw new ValidationError("duration must be an integer between 1 and 6");
  }

  return {
    lat,
    lon,
    duration,
    start: query.start,
    end: query.end,
    chosen: query.chosen ?? null,
    name: query.name ? String(query.name).slice(0, 80) : null,
  };
}

function respond(statusCode, payload) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  };
}

export const handler = async (event = {}) => {
  let input;
  try {
    input = validateQuery(parseQuery(event));
  } catch (err) {
    if (err instanceof ValidationError) return respond(400, { error: true, reason: err.message });
    throw err;
  }

  try {
    const series = await fetchForecast(input.lat, input.lon);
    const result = computeRecommendation(series, input);
    return respond(200, {
      location: { name: input.name, lat: input.lat, lon: input.lon },
      timezone: series.timezone,
      ...result,
      source: SOURCE,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof ValidationError) return respond(400, { error: true, reason: err.message });
    if (err instanceof UpstreamError) return respond(502, { error: true, reason: err.message });
    console.error("unexpected error", err);
    return respond(500, { error: true, reason: "internal error" });
  }
};
