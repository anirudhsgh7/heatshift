export const SAMPLE_LABEL =
  'SAMPLE DATA — recorded Open-Meteo forecast for Delhi (9 Oct 2026). The live API was unreachable.'

export const sampleRecommendation = {
  isSample: true,
  location: { name: 'Delhi', lat: 28.6139, lon: 77.209 },
  timezone: 'Asia/Kolkata',
  forecast: [
    { time: '2026-10-09T10:00', temp: 27.0, apparentTemp: 29.9, humidity: 69, precipProb: 22, windSpeed: 8.7, weatherCode: 0 },
    { time: '2026-10-09T11:00', temp: 29.0, apparentTemp: 32.9, humidity: 62, precipProb: 31, windSpeed: 8.1, weatherCode: 0 },
    { time: '2026-10-09T12:00', temp: 30.5, apparentTemp: 34.6, humidity: 57, precipProb: 33, windSpeed: 8.2, weatherCode: 0 },
    { time: '2026-10-09T13:00', temp: 31.5, apparentTemp: 35.4, humidity: 52, precipProb: 32, windSpeed: 7.2, weatherCode: 0 },
    { time: '2026-10-09T14:00', temp: 32.0, apparentTemp: 34.9, humidity: 47, precipProb: 29, windSpeed: 5.6, weatherCode: 0 },
    { time: '2026-10-09T15:00', temp: 32.1, apparentTemp: 34.6, humidity: 44, precipProb: 24, windSpeed: 4.1, weatherCode: 0 },
    { time: '2026-10-09T16:00', temp: 31.9, apparentTemp: 34.3, humidity: 44, precipProb: 18, windSpeed: 3.5, weatherCode: 0 },
  ],
  originalBlock: { start: '2026-10-09T13:00', end: '2026-10-09T15:00', avgApparent: 35.2 },
  suggestedBlock: { start: '2026-10-09T10:00', end: '2026-10-09T12:00', avgApparent: 31.4 },
  deltaC: 3.8,
  source: 'Open-Meteo.com (CC BY 4.0)',
  generatedAt: '2026-10-09T13:05:00+05:30',
}
