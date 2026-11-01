/* Rollback City: the clock (DESIGN 7.1, quirk 1).
   A plain script that shares globals with the others; index.html loads them in order.

   Act 1 is one night with every clock stuck at 11:58. From midnight at the end of 1-6 the city's
   clock runs: one game hour per real minute, a day in 24 minutes. The light follows it (the
   world's palette is the dark one at night whatever the site theme, with washes at dawn and
   dusk); shops open 9 to 9; more people are about by day; goondas come out after dark. Every
   night at 11:58 the lights die (a scar from 1987): the clock sticks for half a minute, the screen
   goes dark and the goondas fight harder. Sleeping at the dhaba skips to morning or evening. */
"use strict";

const BLACKOUT = 30 * 60;   // frames the 11:58 minute lasts
let blackT = 0;             // frames left in tonight's blackout
const clockRuns = () => flag("midnight");
const clockMin = () => (clockRuns() ? progress.clock.min : 23 * 60 + 58);
const hour = () => Math.floor(clockMin() / 60);
const isNight = () => !clockRuns() || hour() >= 19 || hour() < 6;
const blackout = () => blackT > 0;
// [from, to) in hours; a range like [22, 4] runs past midnight
const hourIn = (h) => !h || (clockRuns() && (h[0] <= h[1] ? hour() >= h[0] && hour() < h[1] : hour() >= h[0] || hour() < h[1]));
const shopsOpen = () => clockRuns() && hour() >= 9 && hour() < 21;
// the world is drawn with the dark palette at night; in Act 1 the site theme decides, as before
const worldDark = () => (clockRuns() ? isNight() : Arcade.tokens().dark);
// how many passers-by a street has now, from its daytime number
const crowd = (n) => Math.min(TOUCH ? 10 : 99, Math.round(n * (!clockRuns() ? 0.5 : street && street.district === "mandi" ? (rushHour() ? 2.5 : isNight() ? 0.3 : 1) : isNight() ? 0.5 : hour() < 9 ? 0.8 : hour() < 17 ? 1.5 : 2)));   // (phones keep the crowd to ten)

function tickClock() {
  if (!clockRuns()) return;
  if (blackT > 0) { if (--blackT === 0) { banner = { text: "The lights come back", t: 90 }; Arcade.tone(523, 0.1, "triangle", 0.04); } return; }
  const c = progress.clock;
  c.frac = (c.frac || 0) + 1 / 60;   // a game minute every real second
  if (c.frac < 1) return;
  c.frac -= 1; c.min++;
  if (c.min === 23 * 60 + 58) {
    // after the screening the scar has healed: 11:58 comes and the lights stay on
    if (flag("ending") || (mission && mission.id === "3-10")) banner = { text: "11:58. The lights stay on", t: 160, big: true };
    else { blackT = BLACKOUT; banner = { text: "11:58. The lights go out", t: 120 }; shake = 4; Arcade.noise(0.5, 0.08); }
  }
  if (c.min >= 24 * 60) { c.min = 0; c.day++; }
  if (c.min === 9 * 60 || c.min === 21 * 60) Arcade.noise(0.4, 0.05);   // shutters rattle up, or down
}
// sleep at a safehouse: to 7 am if it is evening or night, to 7 pm by day
function sleep() {
  const c = progress.clock, day = hour() >= 7 && hour() < 19;
  if (!day && hour() >= 7) c.day++;
  c.min = day ? 19 * 60 : 7 * 60; c.frac = 0; blackT = 0; progress.heat = 0;
  for (const p of players) if (p && p.lives > 0) { p.hp = p.max; p.sp = Math.max(p.sp, 40); }
  wipe = { t: 0, to: { street: street.id, x: (alivePlayers()[0] || players[0]).x } };
  banner = { text: day ? "You sleep through the afternoon" : "Morning on Chandni Lane", t: 150, big: true };
  saveGame(true);
}
function clockText() {
  if (!clockRuns()) return "11:58 PM";
  const m = clockMin(), h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
  return "DAY " + progress.clock.day + "  " + ((h + 11) % 12 + 1) + ":" + mm + (h < 12 ? " AM" : " PM");
}
// the light: a warm wash at dawn, a rose one at dusk, deep blue at night, near black in the blackout
function drawDaylight() {
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (blackout()) { g.fillStyle = "rgba(4,4,10,0.55)"; g.fillRect(0, 0, LW, LH); return; }
  if (!clockRuns() || street.interior) return;
  const m = clockMin() / 60;
  const wash = m >= 5 && m < 7.5 ? ["255,170,90", 0.14 * (1 - Math.abs(m - 6.2) / 1.3)] : m >= 17 && m < 19.5 ? ["255,120,140", 0.16 * (1 - Math.abs(m - 18.2) / 1.3)] : isNight() ? ["20,30,80", 0.12] : null;
  if (wash && wash[1] > 0) { g.fillStyle = "rgba(" + wash[0] + "," + wash[1].toFixed(3) + ")"; g.fillRect(0, 0, LW, LH); }
}
// shop shutters, pulled down whenever the shops are shut (all night in Act 1)
function drawShutter(P, x, y, w, h) {
  R(x, y, w, h, P.dark ? "#4a4650" : "#8f8a96");
  for (let yy = y + 2; yy < y + h; yy += 3) R(x, yy, w, 1, P.dark ? "#36333b" : "#77727f");
  R(x + w / 2 - 4, y + h - 4, 8, 2, P.ol);
}

/* ---------- weather (DESIGN 7.1) ----------
   Clear, cloudy or showers (the heavy monsoon comes in Act 3), changing by itself every few game
   hours once the clock runs. Rain falls in front of the street, splashes in the puddles and
   leaves the ground wet for a game hour after it stops: knocked-down fighters skid further. */
const WEATHER_NEXT = { clear: [["clear", 0.4], ["cloudy", 0.6]], cloudy: [["clear", 0.35], ["showers", 0.5], ["cloudy", 0.15]], showers: [["cloudy", 0.6], ["showers", 0.4]] };
const weather = () => (clockRuns() && progress.weather ? progress.weather.kind : "clear");
const raining = () => (weather() === "showers" || weather() === "storm") && !street.interior && !/train$/.test(street.theme);
const wetFloor = () => !!street.ice || !!(street.look && street.look.ice) || (!street.interior && clockRuns() && (weather() === "showers" || (progress.weather && progress.weather.wet > 0)));
let drops = [];
function tickWeather() {
  if (!clockRuns()) return;
  const w = progress.weather || (progress.weather = { kind: "clear", t: 0, wet: 0 });
  if (w.wet > 0) w.wet--;
  if (--w.t > 0) return;
  w.t = Math.round(rand(120, 300) * 60);   // two to five game hours
  let r = Math.random(), next = w.kind;
  for (const [k, p] of WEATHER_NEXT[w.kind]) { if ((r -= p) <= 0) { next = k; break; } }
  if (next === "showers" && typeof act3 === "function" && act3() && Math.random() < 0.45) next = "storm";   // Act 3: the monsoon proper
  if ((w.kind === "showers" || w.kind === "storm") && next !== "showers" && next !== "storm") w.wet = 60 * 60;
  if (next !== w.kind && !street.interior) banner = { text: { clear: "The sky clears", cloudy: "Clouds roll in off the sea", showers: "Rain", storm: "A monsoon storm. The streets will flood" }[next], t: 90 };
  w.kind = next;
}
function drawWeather() {
  if (!clockRuns() || street.interior) return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const w = weather();
  if (w !== "clear" && !isNight()) { g.fillStyle = w === "showers" ? "rgba(40,50,70,0.16)" : "rgba(60,64,80,0.08)"; g.fillRect(0, 0, LW, LH); }
  if (!raining()) { drops.length = 0; return; }
  while (drops.length < 140) drops.push({ x: rand(-40, LW + 40), y: rand(-LH, LH), v: rand(5, 7) });
  g.strokeStyle = isNight() ? "rgba(190,200,230,0.35)" : "rgba(220,230,245,0.55)"; g.lineWidth = 0.7; g.beginPath();
  for (const d of drops) {
    if (!paused && state === "play") { d.y += d.v; d.x -= d.v * 0.25; }
    if (d.y > Y0 + (d.v - 5) * 30) { if (Math.random() < 0.3) fx.push({ kind: "dust", x: d.x + cam, y: Math.min(Y1, d.y), vx: 0, vy: -0.4, t: 8 }); d.y = rand(-40, -5); d.x = rand(-20, LW + 60); }
    g.moveTo(d.x, d.y); g.lineTo(d.x + 1.5, d.y - 6);
  }
  g.stroke();
}

