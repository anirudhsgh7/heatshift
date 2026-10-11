import test from 'node:test'
import assert from 'node:assert/strict'
import { sampleRecommendation } from '../src/sampleData.js'
import {
  averageFor,
  candidateWindows,
  hoursBetween,
  HOT_THRESHOLD,
  rainUsable,
  rankWindows,
} from '../src/rankWindows.js'

function hourSeries(startIso, count, feels, rain) {
  const times = []
  let t = Date.parse(`${startIso}:00Z`)
  for (let i = 0; i < count; i++) {
    times.push(new Date(t).toISOString().slice(0, 16))
    t += 3_600_000
  }
  return times.map((time, i) => ({
    time,
    temp: 25,
    apparentTemp: feels[i],
    humidity: 50,
    precipProb: rain?.[i] ?? 0,
    windSpeed: 5,
    weatherCode: 0,
  }))
}

test('rankWindows picks the coolest block and returns exclusive end times', () => {
  const feels = [30, 35, 36, 38, 34, 28, 27]
  const ranked = rankWindows(hourSeries('2026-10-09T10:00', 7, feels), 2)
  assert.equal(ranked.length, 3)
  assert.equal(ranked[0].start, '2026-10-09T15:00')
  assert.equal(ranked[0].end, '2026-10-09T17:00')
  assert.equal(ranked[0].avg, 27.5)
})

test('ties break to the earliest start', () => {
  const ranked = rankWindows(hourSeries('2026-10-09T10:00', 8, Array(8).fill(30)), 2)
  assert.equal(ranked[0].start, '2026-10-09T10:00')
})

test('rankWindows respects the limit', () => {
  const ranked = rankWindows(hourSeries('2026-10-09T10:00', 7, Array(7).fill(30)), 1, { limit: 1 })
  assert.equal(ranked.length, 1)
})

test('candidateWindows skips windows with missing feels-like values', () => {
  const feels = [30, null, 32, 33, 34, 35, 36]
  const windows = candidateWindows(hourSeries('2026-10-09T10:00', 7, feels), 2)
  assert.ok(!windows.some((w) => w.start === '2026-10-09T10:00'))
  assert.ok(!windows.some((w) => w.start === '2026-10-09T11:00'))
  assert.deepEqual(windows[0].start, '2026-10-09T12:00')
})

test('averageFor matches the documented window average', () => {
  const forecast = hourSeries('2026-10-09T10:00', 7, [29.9, 32.9, 34.6, 35.4, 34.9, 34.6, 34.3])
  assert.equal(averageFor(forecast, '2026-10-09T10:00', 2), 31.4)
  assert.equal(averageFor(forecast, '2026-10-09T16:00', 2), null)
})

test('hoursBetween validates windows and returns whole hours', () => {
  assert.equal(hoursBetween('2026-10-09T10:00', '2026-10-09T12:00'), 2)
  assert.equal(hoursBetween('2026-10-09T23:00', '2026-10-10T00:00'), 1)
  assert.equal(hoursBetween('2026-10-09T12:00', '2026-10-09T10:00'), null)
  assert.equal(hoursBetween('bad', '2026-10-09T10:00'), null)
})

test('rainUsable requires at least two windows with distinct rain chances', () => {
  const withRain = (rain) =>
    hourSeries('2026-10-09T10:00', 7, [30, 31, 32, 33, 34, 35, 36], rain)
  assert.equal(rainUsable(candidateWindows(withRain([10, 20, 15, 5, 0, 40, 50]), 2)), true)
  assert.equal(rainUsable(candidateWindows(withRain([10, 10, 10, 10, 10, 10, 10]), 2)), false)
  const withMissingRain = hourSeries('2026-10-09T10:00', 7, [30, 31, 32, 33, 34, 35, 36], [10, 10]).map(
    (hour, i) => (i < 2 ? hour : { ...hour, precipProb: null })
  )
  assert.equal(rainUsable(candidateWindows(withMissingRain, 2)), false)
  assert.equal(rainUsable([]), false)
})

test('rainFirst ranks by lowest window rain chance, then temperature', () => {
  const rain = [10, 90, 90, 90, 20, 20, 20]
  const feels = [30, 31, 32, 33, 34, 35, 36]
  const tempTop = rankWindows(hourSeries('2026-10-09T10:00', 7, feels, rain), 2)
  assert.equal(tempTop[0].start, '2026-10-09T10:00')
  const rainTop = rankWindows(hourSeries('2026-10-09T10:00', 7, feels, rain), 2, { rainFirst: true })
  assert.equal(rainTop[0].start, '2026-10-09T14:00')
  assert.equal(rainTop[0].rainProb, 20)
})

test('windows with missing rain data rank last under rainFirst', () => {
  const forecast = [
    { time: '2026-10-09T10:00', temp: 25, apparentTemp: 30, precipProb: 5 },
    { time: '2026-10-09T11:00', temp: 25, apparentTemp: 31, precipProb: 5 },
    { time: '2026-10-09T12:00', temp: 25, apparentTemp: 32, precipProb: null },
    { time: '2026-10-09T13:00', temp: 25, apparentTemp: 33, precipProb: null },
  ]
  const ranked = rankWindows(forecast, 2, { rainFirst: true })
  assert.equal(ranked[0].start, '2026-10-09T10:00')
})

test('rankWindows rejects malformed inputs instead of crashing', () => {
  assert.deepEqual(rankWindows(null, 2), [])
  assert.deepEqual(rankWindows([], 2), [])
  assert.deepEqual(rankWindows([{ time: 'x', apparentTemp: 1 }], 0), [])
})

test('client ranking matches the backend suggestion on the recorded sample', () => {
  const r = sampleRecommendation
  const duration = hoursBetween(r.suggestedBlock.start, r.suggestedBlock.end)
  const top = rankWindows(r.forecast, duration)[0]
  assert.equal(top.start, r.suggestedBlock.start)
  assert.equal(top.end, r.suggestedBlock.end)
  assert.equal(Math.round((r.originalBlock.avgApparent - top.avg) * 10) / 10, r.deltaC)
})

test('hot threshold is documented at 35°C', () => {
  assert.equal(HOT_THRESHOLD, 35)
})