import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildShareQuery,
  buildShareUrl,
  parseShareQuery,
  SHARE_KEYS,
} from '../src/share.js'

const today = '2026-10-11'
const tomorrow = '2026-10-12'
const activities = ['walking', 'cycling', 'exercise', 'delivery', 'gardening', 'custom']
const parse = (search) => parseShareQuery(search, { today, tomorrow, activities })

test('build/parse round trip preserves the full plan', () => {
  const query = buildShareQuery({
    name: 'Delhi',
    lat: 28.6139,
    lon: 77.209,
    date: today,
    startHour: 10,
    endHour: 17,
    duration: 2,
    chosenHour: 13,
    activity: 'exercise',
    rainFirst: true,
  })
  const parsed = parse(`?${query}`)
  assert.equal(parsed.notice, '')
  assert.deepEqual(parsed.location, { name: 'Delhi', lat: 28.6139, lon: 77.209 })
  assert.deepEqual(parsed.form, {
    date: today,
    startHour: 10,
    endHour: 17,
    duration: 2,
    chosenHour: 13,
    rainFirst: true,
    activity: 'exercise',
  })
})

test('midnight window (until 24:00) survives the share round trip', () => {
  const query = buildShareQuery({
    name: 'Delhi',
    lat: 28.6139,
    lon: 77.209,
    date: today,
    startHour: 23,
    endHour: 24,
    duration: 1,
    chosenHour: 23,
    activity: 'walking',
    rainFirst: false,
  })
  const parsed = parse(`?${query}`)
  assert.equal(parsed.notice, '')
  assert.equal(parsed.form.startHour, 23)
  assert.equal(parsed.form.endHour, 24)
  assert.equal(parsed.form.chosenHour, 23)
})

test('location is required and range-checked', () => {
  const missing = parse('?duration=2&from=10&to=17')
  assert.equal(missing.invalid, true)
  const outOfRange = parse('?lat=999&lon=0&duration=2&from=10&to=17')
  assert.equal(outOfRange.invalid, true)
  assert.match(outOfRange.notice, /invalid location/)
})

test('invalid duration falls back to 2 hours with a notice', () => {
  for (const duration of ['0', '7', 'abc']) {
    const parsed = parse(`?lat=1&lon=1&duration=${duration}&from=10&to=17`)
    assert.equal(parsed.form.duration, 2)
    assert.match(parsed.notice, /2 hours/)
  }
})

test('invalid or too-short windows fall back to 10:00-17:00', () => {
  const reversed = parse('?lat=1&lon=1&duration=2&from=17&to=10')
  assert.equal(reversed.form.startHour, 10)
  assert.match(reversed.notice, /10:00–17:00/)
  const tooShort = parse('?lat=1&lon=1&duration=6&from=10&to=12')
  assert.equal(tooShort.form.startHour, 10)
})

test('chosen start outside the window is clamped with a notice', () => {
  const parsed = parse('?lat=1&lon=1&duration=2&from=10&to=17&chosen=16')
  assert.equal(parsed.form.chosenHour, 10)
  assert.match(parsed.notice, /planned start/)
})

test('dates outside the 2-day forecast fall back to today', () => {
  const yesterday = parse('?lat=1&lon=1&date=2026-10-10&from=10&to=17')
  assert.equal(yesterday.form.date, today)
  assert.match(yesterday.notice, /today/)
  const garbage = parse('?lat=1&lon=1&date=bad&from=10&to=17')
  assert.equal(garbage.form.date, today)
  const tomorrowOk = parse('?lat=1&lon=1&date=2026-10-12&duration=1&chosen=10&from=10&to=17')
  assert.equal(tomorrowOk.form.date, tomorrow)
  assert.equal(tomorrowOk.notice, '')
})

test('unknown activities are dropped, known ones kept', () => {
  const kept = parse('?lat=1&lon=1&activity=cycling&from=10&to=17')
  assert.equal(kept.form.activity, 'cycling')
  const dropped = parse('?lat=1&lon=1&activity=sleeping&from=10&to=17')
  assert.equal('activity' in dropped.form, false)
})

test('names are cleaned and truncated to 80 chars', () => {
  const parsed = parse(`?lat=1&lon=1&name=${encodeURIComponent('x'.repeat(120))}&from=10&to=17`)
  assert.equal(parsed.location.name.length, 80)
  const control = parse(`?lat=1&lon=1&name=${encodeURIComponent('a\u0000b\u007fc')}&from=10&to=17`)
  assert.equal(control.location.name, 'abc')
})

test('bare search strings return null and shared URLs keep the path', () => {
  assert.equal(parse(''), null)
  assert.equal(parse('?unit=C'), null)
  assert.equal(buildShareUrl('a=1', 'https://app.example/path'), 'https://app.example/path?a=1')
  assert.ok(!SHARE_KEYS.includes('unit'))
})