import { handler } from "../handler.js";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const params = new URLSearchParams({
  lat: "28.6139",
  lon: "77.209",
  duration: "2",
  start: `${today}T10:00`,
  end: `${today}T17:00`,
  chosen: `${today}T13:00`,
  name: "Delhi",
});

const res = await handler({ queryStringParameters: Object.fromEntries(params) });
console.log(`status ${res.statusCode}`);
console.log(JSON.stringify(JSON.parse(res.body), null, 2));
process.exit(res.statusCode === 200 ? 0 : 1);
