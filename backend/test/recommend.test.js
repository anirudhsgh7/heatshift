import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeRecommendation, addHours, ValidationError } from "../lib/recommend.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/openmeteo-forecast-delhi-2026-10-09.json", import.meta.url), "utf8")
);

const series = {
  time: fixture.hourly.time,
  temp: fixture.hourly.temperature_2m,
  apparentTemp: fixture.hourly.apparent_temperature,
  humidity: fixture.hourly.relative_humidity_2m,
  precipProb: fixture.hourly.precipitation_probability,
  windSpeed: fixture.hourly.wind_speed_10m,
  weatherCode: fixture.hourly.weather_code,
};

function approx(actual, expected, tol = 0.06) {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `expected ${actual} to be within ${tol} of ${expected}`
  );
}

function makeSeries(startISO, count, value) {
  const time = [];
  let t = Date.parse(`${startISO}:00Z`);
  for (let i = 0; i < count; i++) {
    time.push(new Date(t).toISOString().slice(0, 16));
    t += 3_600_000;
  }
  const fill = typeof value === "function" ? value : () => value;
  return {
    time,
    temp: time.map(() => 25),
    apparentTemp: time.map((_, i) => fill(i)),
    humidity: time.map(() => 50),
    precipProb: time.map(() => 0),
    windSpeed: time.map(() => 5),
    weatherCode: time.map(() => 0),
  };
}

test("fixture: recommends the coolest 2h block and compares with the chosen slot", () => {
  const r = computeRecommendation(series, {
    duration: 2,
    start: "2026-10-09T10:00",
    end: "2026-10-09T17:00",
    chosen: "2026-10-09T13:00",
  });
  assert.equal(r.suggestedBlock.start, "2026-10-09T10:00");
  assert.equal(r.suggestedBlock.end, "2026-10-09T12:00");
  approx(r.suggestedBlock.avgApparent, 31.4);
  assert.equal(r.originalBlock.start, "2026-10-09T13:00");
  assert.equal(r.originalBlock.end, "2026-10-09T15:00");
  approx(r.originalBlock.avgApparent, 35.15);
  approx(r.deltaC, 3.8);
  assert.equal(r.forecast.length, 7);
  assert.equal(r.forecast[0].time, "2026-10-09T10:00");
  assert.equal(r.forecast.at(-1).time, "2026-10-09T16:00");
  assert.equal(typeof r.forecast[0].humidity, "number");
  assert.equal(typeof r.forecast[0].weatherCode, "number");
});

test("omitted chosen: original block defaults to the first slot of the window", () => {
  const r = computeRecommendation(series, {
    duration: 2,
    start: "2026-10-09T10:00",
    end: "2026-10-09T17:00",
  });
  assert.equal(r.originalBlock.start, "2026-10-09T10:00");
  assert.equal(r.suggestedBlock.start, "2026-10-09T10:00");
  approx(r.deltaC, 0);
});

test("min duration 1h: picks the single coolest hour", () => {
  const r = computeRecommendation(series, {
    duration: 1,
    start: "2026-10-09T10:00",
    end: "2026-10-09T17:00",
  });
  assert.equal(r.suggestedBlock.start, "2026-10-09T10:00");
  assert.equal(r.suggestedBlock.end, "2026-10-09T11:00");
  approx(r.suggestedBlock.avgApparent, 29.9);
});

test("max duration 6h: only one candidate fits", () => {
  const r = computeRecommendation(series, {
    duration: 6,
    start: "2026-10-09T10:00",
    end: "2026-10-09T17:00",
  });
  assert.equal(r.suggestedBlock.start, "2026-10-09T10:00");
  assert.equal(r.suggestedBlock.end, "2026-10-09T16:00");
  assert.equal(r.forecast.length, 7);
});

test("ties are broken by the earliest block", () => {
  const s = makeSeries("2026-10-09T10:00", 8, 30);
  const r = computeRecommendation(s, {
    duration: 2,
    start: "2026-10-09T10:00",
    end: "2026-10-09T17:00",
  });
  assert.equal(r.suggestedBlock.start, "2026-10-09T10:00");
  approx(r.deltaC, 0);
});

test("window crossing midnight is handled with naive local hours", () => {
  const s = makeSeries("2026-10-10T20:00", 8, (i) => [30, 40, 35, 36, 20, 25, 33, 34][i]);
  const r = computeRecommendation(s, {
    duration: 2,
    start: "2026-10-10T22:00",
    end: "2026-10-11T02:00",
  });
  assert.equal(r.suggestedBlock.start, "2026-10-11T00:00");
  assert.equal(r.suggestedBlock.end, "2026-10-11T02:00");
  approx(r.suggestedBlock.avgApparent, 22.5);
});

test("window shorter than duration is rejected", () => {
  assert.throws(
    () => computeRecommendation(series, { duration: 3, start: "2026-10-09T10:00", end: "2026-10-09T12:00" }),
    ValidationError
  );
});

test("chosen slot outside the window is rejected", () => {
  assert.throws(
    () => computeRecommendation(series, { duration: 2, start: "2026-10-09T10:00", end: "2026-10-09T17:00", chosen: "2026-10-09T09:00" }),
    ValidationError
  );
  assert.throws(
    () => computeRecommendation(series, { duration: 2, start: "2026-10-09T10:00", end: "2026-10-09T17:00", chosen: "2026-10-09T16:00" }),
    ValidationError
  );
});

test("invalid durations and malformed hours are rejected", () => {
  for (const duration of [0, 7, 1.5, NaN]) {
    assert.throws(
      () => computeRecommendation(series, { duration, start: "2026-10-09T10:00", end: "2026-10-09T17:00" }),
      ValidationError
    );
  }
  assert.throws(
    () => computeRecommendation(series, { duration: 2, start: "2026-10-09 10:00", end: "2026-10-09T17:00" }),
    ValidationError
  );
});

test("window outside the available forecast range is rejected", () => {
  assert.throws(
    () => computeRecommendation(series, { duration: 2, start: "2026-10-11T10:00", end: "2026-10-11T17:00" }),
    ValidationError
  );
});

test("addHours rolls over midnight correctly", () => {
  assert.equal(addHours("2026-10-10T23:00", 1), "2026-10-11T00:00");
  assert.equal(addHours("2026-10-10T23:00", 3), "2026-10-11T02:00");
});
