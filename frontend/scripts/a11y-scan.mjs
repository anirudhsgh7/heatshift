import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM, VirtualConsole } from 'jsdom'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const virtualConsole = new VirtualConsole()

const scenarios = []
async function addScenario(name, build, wrapInMain = false, dataTheme = '') {
  scenarios.push({ name, build, wrapInMain, dataTheme })
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const { default: App } = await server.ssrLoadModule('/src/App.jsx')
  await addScenario('app (default state)', () => renderToString(createElement(App)))
  await addScenario('app (dark theme, toggle in topbar)', () => renderToString(createElement(App)), false, 'dark')

  const { default: ResultCard } = await server.ssrLoadModule('/src/components/ResultCard.jsx')
  const { sampleRecommendation } = await server.ssrLoadModule('/src/sampleData.js')
  await addScenario(
    'result card (sample, chart + options + copy buttons)',
    () =>
      renderToString(
        createElement(ResultCard, {
          result: sampleRecommendation,
          isSample: false,
          activity: 'exercise',
          currentLocation: { name: 'Raisina Hill, New Delhi', lat: 28.6139, lon: 77.209 },
        })
      ),
    true
  )

  const { default: ComplianceBadges } = await server.ssrLoadModule('/src/components/ComplianceBadges.jsx')
  await addScenario('compliance panel (opens on owasp)', () =>
    renderToString(createElement(ComplianceBadges, { defaultOpenId: 'owasp' }))
  )

  const { default: TaskForm } = await server.ssrLoadModule('/src/components/TaskForm.jsx')
  await addScenario(
    'task form (activity + rain preference)',
    () =>
      renderToString(
        createElement(TaskForm, {
          value: { date: '2026-10-10', startHour: 10, endHour: 17, duration: 2, chosenHour: 13, activity: 'walking', rainFirst: true },
          onChange: () => {},
          onSubmit: () => {},
          loading: false,
          today: '2026-10-10',
          tomorrow: '2026-10-11',
        })
      ),
    true
  )

  const { default: OverviewBody } = await server.ssrLoadModule('/src/components/OverviewBody.jsx')
  await addScenario(
    'weather overview (C)',
    () =>
      renderToString(
        createElement(OverviewBody, {
          data: {
            timezone: 'Asia/Kolkata',
            current: { time: '2026-10-10T10:00', temp: 23, apparentTemp: 26, humidity: 64, windSpeed: 10, weatherCode: 1, isDay: 1 },
            daily: [{ date: '2026-10-10', tempMax: 32, tempMin: 22, weatherCode: 1 }],
          },
          selectedDate: '2026-10-10',
        })
      ),
    true
  )

  let failures = 0
  for (const { name, build, wrapInMain, dataTheme } of scenarios) {
    const body = build()
    const content = wrapInMain ? `<main>${body}</main>` : body
    const html = `<html lang="en"${dataTheme ? ` data-theme="${dataTheme}"` : ''}><head><meta charset="utf-8"><title>HeatShift scan</title></head><body>${content}</body></html>`
    const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole })
    dom.window.eval(axeSource)
    const results = await dom.window.axe.run(dom.window.document, {
      disable: ['color-contrast'],
    })
    const meaningful = results.violations.filter((v) => v.nodes.length > 0)
    if (meaningful.length === 0) {
      console.log(`PASS  ${name}`)
      continue
    }
    failures += 1
    console.log(`FAIL  ${name}`)
    for (const violation of meaningful) {
      console.log(`  ${violation.id} (${violation.impact}) — ${violation.help}`)
      console.log(`    tags: ${violation.tags.join(', ')}`)
      for (const node of violation.nodes) {
        console.log(`    node: ${node.target.join(' ')}`)
      }
    }
  }
  if (failures > 0) {
    console.log(`\n${failures} of ${scenarios.length} scenarios have axe violations`)
    process.exit(1)
  }
  console.log(`\nAll ${scenarios.length} scanned scenarios are axe-clean (color-contrast excluded: jsdom cannot compute layout styles)`)
} finally {
  await server.close()
}