# HeatShift

Find the coolest window for an outdoor task. HeatShift compares every feasible start hour inside your available time range using the hourly **feels-like** forecast, and shows how much cooler the best slot is than the one you planned.

Built for the **Environmental Hacks** hackathon (Bharat Builds Tour by WeMakeDevs, with AWS) — **Heat & Water** track. Heatwaves are a growing hazard for people who work outdoors; HeatShift is a forecast-based scheduling aid, not medical or safety guidance.

## Problem

People who work or spend time outdoors — delivery riders, construction and municipal workers, students commuting, sports teams — often have flexibility in *when* they do a task, but heat warnings don't answer: *"Given my available hours today, when is the least hot time to do this?"*

## Solution

1. Pick a location: preset cities (Delhi, Mumbai, Bengaluru), city search (Open-Meteo Geocoding), or your device location (reverse-geocoded via OpenStreetMap Nominatim).
2. Choose the task (activity presets with typical durations), its length (1–6 h), and your available time range for today or tomorrow.
3. HeatShift fetches the hourly forecast server-side and recommends the **coolest contiguous block** in your range, comparing the average apparent ("feels-like") temperature of every candidate start hour.
4. See the result: your planned window vs the suggested window, the delta in °C/°F, the top-ranked windows (optionally rain-aware), and an interactive hourly chart with tooltips.
5. Copy the plan as text, or copy a share link whose recipient loads the same plan (and keeps a clean address bar).

## How it works

```
Browser (React SPA, AWS Amplify Hosting)
        │  GET /recommend?lat=..&lon=..&duration=..&start=..&end=..&chosen=..
        ▼
Amazon API Gateway (HTTP API, CORS restricted to the site origin, throttled)
        ▼
AWS Lambda (Node.js, zero dependencies)  ──>  Open-Meteo Forecast API (keyless)
        │
        ▼
JSON: window-trimmed hourly series + original/suggested blocks + delta °C
```

- **Frontend** — React 19 + Vite 8 (plain JavaScript). No router, no CSS framework, no charting library, no state library.
- **Backend** — one Lambda function (`heatshift-recommend`, Node ESM, zero runtime dependencies) that validates input, fetches Open-Meteo server-side, computes the coolest contiguous block, and returns compact JSON.
- **No database, no accounts, no cookies.** The only browser storage is the °C/°F and light/dark preferences.

### Repository layout

```
backend/    Lambda source: handler, recommendation logic, Open-Meteo client, tests, smoke script
frontend/   React + Vite app: components, ranking/share/units/theme modules, tests, a11y scan
fixtures/   Recorded Open-Meteo responses used by the tests
```

### Run locally

Backend (Node ≥ 20, zero deps):

```bash
cd backend
npm test          # 20 tests (ranking, window validation, handler)
npm run smoke     # live Open-Meteo probe through the handler
```

Frontend (Node ≥ 20):

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run lint      # oxlint
npm run test      # node --test (ranking, share round-trip, planner time mapping, theme)
npm run build
npm run a11y      # axe-core scan over 6 rendered states
```

`VITE_API_BASE_URL` overrides the deployed API fallback (not a secret). The app also talks to Open-Meteo directly (weather overview) and OpenStreetMap Nominatim (place names); the deployed site's CSP allowlists exactly these hosts.

## API

`GET /recommend?lat={number}&lon={number}&duration={1..6}&start={ISO hour}&end={ISO hour}&chosen={ISO hour, optional}`

Hours are naive local ISO (`YYYY-MM-DDTHH:00`) in the location's timezone (`timezone=auto`). Response: `{ location, timezone, forecast[], originalBlock, suggestedBlock, deltaC, source, generatedAt }`. Errors: `{ error: true, reason }` with HTTP 400/502.

## Deployment (manual, used for the hackathon)

- **Frontend** → `npm run build`, zip the **contents** of `dist/` (includes `customHttp.yml` with CSP/security headers), upload via Amplify `CreateDeployment`/`StartDeployment`.
- **Backend** → zip `backend/` (must include `package.json` so the handler is ESM), upload to an S3 staging bucket, `Lambda UpdateFunctionCode`.

## Data & attribution

- Weather data by **Open-Meteo.com (CC BY 4.0)**, based on multiple national weather services. No API key required.
- Reverse place names by **OpenStreetMap Nominatim** (© OpenStreetMap contributors, ODbL); requests are user-triggered, cached, and rate-limited (≤1 req/s).
- This project was built new during the hackathon (Oct 8–11, 2026). AI coding tools used: **opencode**, and the **AWS Agent Toolkit** (MCP server + skills) for AWS interactions.

## Honest framing

All impact numbers (task-hours shifted to cooler windows, average forecast delta) are **planning estimates**. HeatShift is a forecast-based scheduling aid; it is not medical advice, not a heat-safety certification, and not a sensor at the work site. If you work in heat, follow official heat guidance for your region.

## Privacy

No accounts, no cookies, no analytics. Your device location is read only when you tap "Use my location"; the coordinates leave the browser only to build the forecast and a place name (HeatShift API, Open-Meteo, Nominatim), and nothing is stored server-side. The browser address bar stays clean during ordinary use; plan URLs are only generated on demand by the "Copy link" action.