/* Rollback City: turf (DESIGN 7.3; 3.5 of the plan). A plain script that shares globals with the
   others; index.html loads them in order.

   Three districts are held by gangs Kaal pays: the Mandi (the Tola Gang), Sagar Kinara (the Neon
   Saanp) and the docks (the dock crews). A district flips when its story mission is won and its
   gang's hideout has been raided (a night fight at a marker). In a won district the old gang walks
   the streets as allies who join any fight near you, Kaal's men turn up only in ones, and now and
   then Kaal launches a counter-raid there: answer it the same day, or the district's respect
   drops. The map shows each district's colour: red for a gang, green for yours. */
"use strict";

const TURF = {
  mandi:  { name: "the Mandi", gang: "the Tola Gang", mission: "2-3", hideout: { street: "truckYard", x: 1100, waves: [["porter", "porter", "bruiser"], ["porter", "bruiser", "wrestler"]] }, allies: ["porter", "wrestler"] },
  kinara: { name: "Sagar Kinara", gang: "the Neon Saanp", mission: "2-6", hideout: { street: "kinara", x: 2400, waves: [["biker", "spinner", "breaker"], ["biker", "biker", "breaker"]] }, allies: ["biker", "breaker"] },
  docks:  { name: "the docks", gang: "the dock crews", mission: "2-7", hideout: { street: "docks", x: 2200, waves: [["netman", "hookman", "netman"], ["hookman", "hookman", "netman"]] }, allies: ["netman", "hookman"] }
};
const turfOf = (d) => (progress.turf = progress.turf || {})[d] || (progress.turf[d] = {});
const turfWon = (d) => !!TURF[d] && progress.done.includes(TURF[d].mission) && !!turfOf(d).hideout;
// a district's meter: half for the story mission, half for the hideout
const turfMeter = (d) => (progress.done.includes(TURF[d].mission) ? 50 : 0) + (turfOf(d).hideout ? 50 : 0);

/* ---------- hideouts ---------- */
let raid = null;
function hideoutTarget(p) {
  for (const d in TURF) {
    const h = TURF[d].hideout;
    if (h.street !== street.id || Math.abs(p.x - h.x) > 26 || turfOf(d).hideout || arena || mission || !clockRuns()) continue;
    if (!isNight()) return { label: TURF[d].gang + "'s hideout: they only gather after dark", x: h.x, y: Y0 - 50, act: () => {} };
    return { label: "Raid " + TURF[d].gang + "'s hideout", x: h.x, y: Y0 - 50, act: () => {
      raid = { d, a: { x: h.x, name: TURF[d].gang + "'s hideout", waves: h.waves } }; startArena(raid.a); banner = { text: "Raid!", t: 90, big: true };
    } };
  }
  return null;
}
function updateTurf() {
  if (raid && raid.a.done) {
    const d = raid.d; raid = null; turfOf(d).hideout = true; changeRespect(5, d); earn(400);
    const nm = TURF[d].name.charAt(0).toUpperCase() + TURF[d].name.slice(1);
    banner = { text: turfWon(d) ? nm + " is yours" : "Hideout cleared: now win " + TURF[d].name + "'s fight", t: 200, big: true };
    saveGame(true);
  }
  if (!clockRuns()) return;
  dailyRaid();
  allyPatrol();
}
// the hideout markers: a red one while a gang still holds it
function drawHideouts(P) {
  for (const d in TURF) {
    const h = TURF[d].hideout; if (h.street !== street.id || turfOf(d).hideout || !clockRuns()) continue;
    const x = Math.round(h.x - cam); if (x < -20 || x > LW + 20) continue;
    g.globalAlpha = 0.5 + 0.3 * Math.sin(frameNo / 9); g.strokeStyle = "#c0392b"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, Y0 + 14, 16, 4, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
    text("X", x, Y0 - 6 + Math.sin(frameNo / 10) * 2, 10, "#c0392b", "center", "IBM Plex Sans");
  }
}

/* ---------- allies: the old gang, on your side ---------- */
let allyT = 300;
function allyPatrol() {
  const d = street.district;
  if (!turfWon(d) || street.interior || mission || --allyT > 0) return;
  allyT = Math.round(rand(20, 40) * 60);
  if (enemies.filter((e) => e.ally && !e.gone).length >= 2) return;
  const x = offscreenX(40); if (x === null) return;
  const kind = pick(TURF[d].allies); fighterArt(SHEET_OF[kind]);
  const a = fighter(kind, x, rand(Y0 + 6, Y1 - 4), "p");
  Object.assign(a, { ally: true, roam: true, aggro: false, face: x < cam ? 1 : -1, wx: clamp(cam + LW / 2 + rand(-160, 160), 20, street.w - 20), wt: 0, cool: 40 });
  enemies.push(a);
}
// who an ally fights: the nearest enemy already in a fight, if any is close
function allyTargets(a) {
  return enemies.filter((o) => !o.ally && !DOWN_STATES.includes(o.st) && (o.aggro || arena) && !isCop(o) && Math.abs(o.x - a.x) < 260);
}
// a friendly greeting now and then, as they pass
function allyHello(a) {
  if (frameNo % 600 === 0 && alivePlayers().some((p) => Math.abs(p.x - a.x) < 80)) texts.push({ x: a.x, y: a.y - 62, s: pick(["Salaam, boss!", "All quiet, boss.", "Kaal's men? Point them out."]), t: 70 });
}

/* ---------- counter-raids ---------- */
function dailyRaid() {
  const r = progress.raid || (progress.raid = {}), day = progress.clock.day;
  // a day gone by with a raid unanswered: the district paid Kaal's men
  if (r.d && r.day < day && !r.done) { changeRespect(-5, r.d); message("Rafiq: They came for the " + TURF[r.d].name + " yesterday and nobody stopped them. People paid. People remember."); r.done = true; }
  if (r.day === day || hour() < 9) return;
  const won = Object.keys(TURF).filter(turfWon);
  r.day = day; r.done = false; r.d = null;
  if (!won.length || Math.random() < 0.4) { r.done = true; return; }
  r.d = pick(won);
  callIn(r.d === "mandi" ? "rafiq" : r.d === "docks" ? "mausi" : "djrewind", ["Kaal's men are in " + TURF[r.d].name + ", leaning on the stalls. Come today, or they'll think nobody will."], r.d === "mandi" ? "Rafiq" : r.d === "docks" ? "Machhi Mausi" : "DJ Rewind");
}
// the counter-raids as jobs: open only on the day Kaal hits that district
for (const [d, st, x, stalls] of [["mandi", "mandiRoad", 1700, [1520, 1650]], ["kinara", "kinara", 1300, [1340, 1460]], ["docks", "docks", 700, [760, 880]]]) {
  MISSIONS["job:raid:" + d] = { job: true, raid: d, title: "Counter-raid", pay: 500, start: { street: st, x }, make: () => [
    { panels: [{ who: "N", text: "Kaal's men are working down the stalls with a ledger and a lathi, collecting \"security fees\". The stallholders are watching to see who comes." }] },
    { protect: { street: st, x: (stalls[0] + stalls[1]) / 2, stalls, hp: 26, waves: [["kaal", "kaal"], ["kaal", "bruiser", "kaal"]], keep: 1, name: "Counter-raid" }, obj: "See Kaal's men off the stalls" }] };
  JOBS.push("job:raid:" + d);
}
