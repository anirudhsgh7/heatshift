const REVIEW_DATE = '2026-10-10'

export const COMPLIANCE_BADGES = [
  {
    id: 'owasp',
    label: 'OWASP Top 10',
    status: 'Checks passed',
    tone: 'ok',
    scope: `Code review plus live configuration checks on ${REVIEW_DATE}: input handling, access control, security configuration, dependencies, secret management, hosted response headers, API throttling, and the Lambda execution role.`,
    checks: [
      {
        name: 'Dependency audit',
        result: 'npm audit: 0 known vulnerabilities. The backend has zero runtime dependencies.',
      },
      {
        name: 'Input handling',
        result:
          'API rejects invalid input up front (coordinate ranges, integer duration 1-6, strict ISO-hour regex); UI output is React-escaped; no dangerouslySetInnerHTML, innerHTML, eval, or document.write in source.',
      },
      {
        name: 'Secrets exposure',
        result:
          'No secret-like strings in tracked files; the stack is keyless by design; Lambda has no environment variables (verified live).',
      },
      {
        name: 'CORS / access control',
        result:
          'Verified live: the API returns Access-Control-Allow-Origin only for the deployed site origin and localhost; a foreign origin received no such header.',
      },
      {
        name: 'Security headers (static site)',
        result:
          'Configured in customHttp.yml: CSP (scripts self-only, connect-src allowlist, frame-ancestors none), HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy. Applied by Amplify on the next deploy; re-probed after deploy.',
      },
      {
        name: 'API abuse protection',
        result:
          'Stage throttling applied to the public endpoint: 10 requests/second with burst 20 (verified live).',
      },
      {
        name: 'Lambda IAM review',
        result:
          'Audited live: execution role is limited to AWSLambdaBasicExecutionRole, no inline policies, no environment variables, log retention 7 days.',
      },
    ],
    gaps: ['No WAF in front of the API (stage throttling and account limits apply instead)'],
    fixes: [
      'Add a WAF or scale throttling only if traffic grows beyond the current demo profile',
    ],
    note: 'Status covers the items checked above on this date, including live API verification. This is not an OWASP certification or a full Top 10 assessment.',
  },
  {
    id: 'dpdp',
    label: 'DPDP Act 2023',
    status: 'Checks passed',
    tone: 'ok',
    scope: `Code review on ${REVIEW_DATE} of geolocation handling, third-party API calls, browser storage, cookies, analytics, data retention, and the in-app privacy disclosure.`,
    checks: [
      {
        name: 'Geolocation',
        result:
          "Requested only after the user taps 'Use my location'; coordinates are sent to the HeatShift API, Open-Meteo, and OpenStreetMap Nominatim to fetch the forecast and a place name. Not stored server-side.",
      },
      {
        name: 'Browser storage, cookies, analytics',
        result:
          'Only localStorage entry is the °C/°F preference (heatshift.tempUnit). No cookies, no analytics, no trackers, no accounts.',
      },
      {
        name: 'Data retention',
        result:
          'No database or user records; the API is stateless; the Lambda log group is configured with a 7-day retention (verified live).',
      },
      {
        name: 'Third-party processing',
        result:
          'Open-Meteo receives coordinates (public, keyless API) and Nominatim receives them for place naming; no identifiers are attached.',
      },
      {
        name: 'Privacy disclosure',
        result:
          'Added to the footer: what location data is read, when, by which services, that nothing is stored server-side, and the contact channel for data requests.',
      },
      {
        name: 'Consent / notice',
        result:
          'Location access is user-initiated (explicit tap) and documented in the disclosure; no separate consent banner was added by design.',
      },
    ],
    gaps: [],
    fixes: [],
    note: 'Technical data handling, retention, and the privacy disclosure are verified on this date. The contact channel (repository issues) becomes reachable when the repo is public. This badge documents code-level checks and does not replace a statutory legal review.',
  },
  {
    id: 'wcag',
    label: 'WCAG 2.2 AA',
    status: 'Checks passed',
    tone: 'ok',
    scope: `Accessibility review on ${REVIEW_DATE}: axe-core automated scan over five rendered states, plus manual review of keyboard access, focus indicators, labels, error messages, contrast, and responsive behaviour.`,
    checks: [
      {
        name: 'Automated scan (axe-core 4.14)',
        result:
          'Scanned the app, result card, compliance panel, task form, and weather overview: 0 violations after fixes.',
      },
      {
        name: 'Fixed findings',
        result:
          'List semantics under radiogroup containers repaired (li role=presentation) and the hero banner moved inside the main landmark.',
      },
      {
        name: 'Keyboard & focus',
        result:
          'All interactive controls are native buttons/inputs/selects with visible focus styles; chart hours, activity tiles, window options, unit toggle, compliance badges, and panes are keyboard operable.',
      },
      {
        name: 'Labels & semantics',
        result:
          'Controls have labels or accessible names; live regions announce results and errors; decorative SVGs are hidden from assistive tech; landmarks are consistent (header, main, footer).',
      },
      {
        name: 'Contrast',
        result:
          'Measured text/background pairs: all reviewed pairs meet 4.5:1 after darkening the tertiary-text token from 2.6-3.0:1 to 4.6-5.2:1.',
      },
      {
        name: 'Errors & responsive',
        result:
          'API, search, and geolocation errors surface as alert/status text; single-column mobile layout with no horizontal page overflow.',
      },
      {
        name: 'Assistive technology session',
        result: 'No screen-reader/AT session was run in this pass.',
      },
    ],
    gaps: [
      'No assistive-technology testing yet; automated contrast checking needs a real browser (jsdom cannot compute layout styles)',
    ],
    fixes: ['Run a screen-reader pass and a browser-based axe/Lighthouse run before claiming full AA conformance'],
    note: 'Status covers the automated and manual checks above; full WCAG 2.2 AA conformance is not claimed.',
  },
]