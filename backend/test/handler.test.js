import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handler } from "../handler.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/openmeteo-forecast-delhi-2026-10-09.json", import.meta.url), "utf8")
);

const validParams = {
  lat: "28.6139",
  lon: "77.209",
  duration: "2",
  start: "2026-10-09T10:00",
  end: "2026-10-09T17:00",
  chosen: "2026-10-09T13:00",
  name: "Delhi",
};

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => fixture });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const body = (res) => JSON.parse(res.body);

test("200: returns the frozen contract shape from mocked upstream data", async () => {
  const res = await handler({ queryStringParameters: validParams });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /application\/json/);
  const b = body(res);
  assert.deepEqual(b.location, { name: "Delhi", lat: 28.6139, lon: 77.209 });
  assert.equal(b.timezone, "Asia/Kolkata");
  assert.equal(b.suggestedBlock.start, "2026-10-09T10:00");
  assert.equal(b.originalBlock.start, "2026-10-09T13:00");
  assert.equal(b.deltaC, 3.8);
  assert.equal(b.source, "Open-Meteo.com (CC BY 4.0)");
  assert.ok(!Number.isNaN(Date.parse(b.generatedAt)));
  assert.ok(Array.isArray(b.forecast));
  assert.equal(b.forecast.length, 7);
});

test("400: missing required params", async () => {
  for (const missing of ["lat", "lon", "duration", "start", "end"]) {
    const params = { ...validParams };
    delete params[missing];
    const res = await handler({ queryStringParameters: params });
    assert.equal(res.statusCode, 400, `expected 400 when ${missing} is missing`);
    assert.equal(body(res).error, true);
  }
});

test("400: out-of-range and malformed values", async () => {
  const cases = [
    { lat: "999" },
    { lon: "999" },
    { duration: "0" },
    { duration: "7" },
    { duration: "abc" },
    { start: "not-a-time" },
    { end: "10:00" },
  ];
  for (const patch of cases) {
    const res = await handler({ queryStringParameters: { ...validParams, ...patch } });
    assert.equal(res.statusCode, 400, `expected 400 for ${JSON.stringify(patch)}`);
    assert.equal(body(res).error, true);
  }
});

test("400: window outside the forecast range", async () => {
  const params = { ...validParams, start: "2026-10-11T10:00", end: "2026-10-11T17:00" };
  delete params.chosen;
  const res = await handler({ queryStringParameters: params });
  assert.equal(res.statusCode, 400);
  assert.match(body(res).reason, /forecast range/);
});

test("502: upstream HTTP error", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const res = await handler({ queryStringParameters: validParams });
  assert.equal(res.statusCode, 502);
  assert.equal(body(res).error, true);
});

test("502: upstream network failure", async () => {
  globalThis.fetch = async () => {
    throw new Error("connection refused");
  };
  const res = await handler({ queryStringParameters: validParams });
  assert.equal(res.statusCode, 502);
  assert.match(body(res).reason, /connection refused/);
});

test("502: upstream invalid JSON", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new Error("bad json");
    },
  });
  const res = await handler({ queryStringParameters: validParams });
  assert.equal(res.statusCode, 502);
});

test("supports rawQueryString events (HTTP API v2 style)", async () => {
  const raw = new URLSearchParams(validParams).toString();
  const res = await handler({ rawQueryString: raw });
  assert.equal(res.statusCode, 200);
  assert.equal(body(res).suggestedBlock.start, "2026-10-09T10:00");
});

test("name is optional and echoed only when provided", async () => {
  const params = { ...validParams };
  delete params.name;
  const res = await handler({ queryStringParameters: params });
  assert.equal(res.statusCode, 200);
  assert.equal(body(res).location.name, null);
});
