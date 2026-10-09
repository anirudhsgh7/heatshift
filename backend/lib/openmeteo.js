export class UpstreamError extends Error {
  constructor(message) {
    super(message);
    this.name = "UpstreamError";
  }
}

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const HOURLY_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation_probability",
  "weather_code",
  "wind_speed_10m",
];

export function buildForecastUrl(lat, lon) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("hourly", HOURLY_FIELDS.join(","));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "2");
  return url;
}

export function normalize(data) {
  const h = data?.hourly;
  if (!h || !Array.isArray(h.time)) {
    throw new UpstreamError("Open-Meteo response is missing hourly data");
  }
  return {
    timezone: data.timezone ?? null,
    time: h.time,
    temp: h.temperature_2m ?? [],
    apparentTemp: h.apparent_temperature ?? [],
    humidity: h.relative_humidity_2m ?? [],
    precipProb: h.precipitation_probability ?? [],
    windSpeed: h.wind_speed_10m ?? [],
    weatherCode: h.weather_code ?? [],
  };
}

export async function fetchForecast(lat, lon, fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(buildForecastUrl(lat, lon));
  } catch (err) {
    throw new UpstreamError(`Open-Meteo request failed: ${err.message}`);
  }
  if (!res.ok) {
    throw new UpstreamError(`Open-Meteo returned HTTP ${res.status}`);
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new UpstreamError("Open-Meteo returned invalid JSON");
  }
  return normalize(data);
}
