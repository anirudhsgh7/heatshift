import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWindowIso, isoHour, nextDateIso, pad } from '../src/plannerTime.js'

test('isoHour formats normal hours with zero padding', () => {
  assert.equal(isoHour('2026-10-09', 10), '2026-10-09T10:00')
  assert.equal(isoHour('2026-10-09', 0), '2026-10-09T00:00')
  assert.equal(isoHour('2026-10-09', 23), '2026-10-09T23:00')
})

test('isoHour maps hour 24 to next-day 00:00 without relying on lenient Date.parse', () => {
  assert.equal(isoHour('2026-10-09', 24), '2026-10-10T00:00')
  assert.equal(isoHour('2026-12-31', 24), '2027-01-01T00:00')
})

test('isoHour rejects invalid inputs', () => {
  assert.equal(isoHour('2026-10-09', 25), null)
  assert.equal(isoHour('2026-10-09', -1), null)
  assert.equal(isoHour('2026-10-09', 2.5), null)
  assert.equal(isoHour('not-a-date', 10), null)
  assert.equal(isoHour(null, 10), null)
})

test('nextDateIso rolls over month and year boundaries', () => {
  assert.equal(nextDateIso('2026-10-09'), '2026-10-10')
  assert.equal(nextDateIso('2026-10-31'), '2026-11-01')
  assert.equal(nextDateIso('2026-12-31'), '2027-01-01')
  assert.equal(nextDateIso('bad-date'), null)
})

test('buildWindowIso produces a valid start/end pair including midnight windows', () => {
  assert.deepEqual(buildWindowIso('2026-10-09', { startHour: 10, endHour: 17 }), {
    start: '2026-10-09T10:00',
    end: '2026-10-09T17:00',
  })
  assert.deepEqual(buildWindowIso('2026-10-09', { startHour: 23, endHour: 24 }), {
    start: '2026-10-09T23:00',
    end: '2026-10-10T00:00',
  })
  assert.equal(buildWindowIso('2026-10-09', { startHour: 17, endHour: 26 }), null)
})

test('pad pads single digits', () => {
  assert.equal(pad(7), '07')
  assert.equal(pad(23), '23')
})