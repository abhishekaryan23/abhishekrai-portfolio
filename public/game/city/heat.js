/* Rollback City: respect (izzat) and police heat (DESIGN 7.3, 7.5).
   A plain script that shares globals with the others; index.html loads them in order.

   From Act 2 each district keeps a respect score, 0 to 100. Helping people, knocking out the
   goondas who pick fights and paying fair prices raise it; hitting passers-by and the police lower
   it. High respect means lower prices; low respect means everyone calls the police on you.

   Heat is the police's interest in Kai, shown as the lal batti lights in player 1's panel. Hit a
   passer-by where people can see, start a fight in front of a constable, or hit a constable, and
   the lights come on. 1: a constable comes for you. 2: two, and a jeep brings more. 3: riot police
   with shields, and roadblocks at every junction. Knocked out by the police means a night at the
   thana. To lose them: stay out of sight (faster in a crowd), sit down for a chai at a tea stall,
   buy new clothes at the tailor, or leave the district. By day a constable sometimes walks his beat
   on the main streets, and only takes an interest once the lights are on. */
"use strict";

const hasHeat = () => clockRuns();
const district = () => (street && street.district) || "chandni";
const DISTRICT_NAMES = { chandni: "Chandni", harbour: "Harbour", river: "River", mills: "Mills", mandi: "Mandi", kinara: "Kinara", docks: "Docks" };
// how each district feels about Kai at the start of Act 2: home is kind, the rest wait and see
const RESPECT0 = { chandni: 60 };
function respect(d) { const r = progress.respect && progress.respect[d || district()]; return Number.isFinite(r) ? r : RESPECT0[d || district()] || 40; }
function changeRespect(n, d) {
  if (!hasHeat() || !n) return;
  const id = d || district(); progress.respect = progress.respect || {};
  progress.respect[id] = clamp(respect(id) + n, 0, 100);
  const p = alivePlayers()[0]; if (p) texts.push({ x: p.x, y: p.y - 84, s: "Izzat " + (n > 0 ? "+" : "−") + Math.abs(n), t: 60 });
}
// street fights add at most five respect a district a day: the lane notices, then it shrugs
function streetRespectToday() {
  const d = district(), day = progress.clock.day, r = (progress.respDay = progress.respDay || {});
  if (!r[d] || r[d][0] !== day) r[d] = [day, 0];
  return ++r[d][1] <= 5;
}
// prices: about a fifth off for the district's heroes, a fifth on for its villains
const respectMul = () => 1.2 - respect() / 250;

/* ---------- heat ---------- */
const heat = () => (hasHeat() && progress.heat) || 0;
const isCop = (e) => KINDS[e.kind] && KINDS[e.kind].police;
const police = () => enemies.filter((e) => isCop(e) && !e.gone && !DOWN_STATES.includes(e.st));
const roadblock = () => heat() >= 3 && !street.interior;
let heatT = 0, chaseT = 0, copT = 0, patrolT = 900, jeep = null, jeepT = 0, sitting = null, crimeF = -999, heatD = null;

// something a player did that the police might care about: a passer-by hit (lvl 1, if anyone saw),
// a fight started in front of a constable (1), a constable hit (2)
function crime(lvl, x, why, victim) {
  if (!hasHeat() || mission || arena) return;
  const cops = police().some((e) => Math.abs(e.x - x) < LW * 0.7);
  const eyes = civs.some((c) => c !== victim && Math.abs(c.x - x) < 220) || respect() < 25;
  if (why === "police" || cops || (why === "civ" && eyes)) raiseHeat(lvl);
}
function raiseHeat(lvl) {
  if (copsOff()) return;   // after Godbole goes down, the thana looks the other way for a while
  const was = heat();
  // a second offence soon after the first is the same incident; later, every offence adds a light
  // four lights only for fighting the riot police (or the jailbreak): then Godbole comes himself
  const n = Math.min(lvl >= 4 || was >= 4 ? 4 : 3, was ? (frameNo - crimeF < 180 ? Math.max(was, lvl) : Math.max(lvl, was + 1)) : lvl);
  crimeF = frameNo; heatT = 0; sitting = null;
  if (n <= was) return;
  progress.heat = n; copT = 60; if (n >= 2) jeepT = Math.min(jeepT, 240);
  fighterArt(SHEET_OF.constable);
  banner = { text: ["", "The police are looking for you", "Every constable in the district has your description", "Roadblocks: the police have shut the junctions", "Inspector Godbole is coming for you himself"][n], t: 120 };
  whistle();
}
// beat Inspector Godbole and the police break: every constable runs, the lights go out, the thana leaves
// you alone for half a day, and the whole city hears about it (respect up a lot, everywhere)
const copsOff = () => (progress.copsOff || 0) > nowMin();
function godboleDown(e) {
  setHeat(0); progress.copsOff = nowMin() + 12 * 60;
  for (const c of enemies) if (c !== e && isCop(c) && !DOWN_STATES.includes(c.st) && !c.gone) { setState(c, "flee"); c.aggro = false; c.engaged = false; if (Math.random() < 0.5) texts.push({ x: c.x, y: c.y - 60, s: pick(["Saab gir gaye! Bhaago!", "Not my shift!", "I saw nothing!"]), t: 70 }); }
  jeep = jeep && { ...jeep, done: true };
  progress.respect = progress.respect || {};
  for (const d in DISTRICT_NAMES) progress.respect[d] = clamp(respect(d) + 20, 0, 100);
  const p = alivePlayers()[0]; if (p) texts.push({ x: p.x, y: p.y - 84, s: "Izzat +20 in every district", t: 120 });
  banner = { text: "Inspector Godbole is down. The police want nothing more to do with you today", t: 220, big: true };
  if (typeof logNews === "function") logNews("INSPECTOR GODBOLE FLOORED; CONSTABLES SEEN RUNNING");
}
function setHeat(n) {
  const was = heat(); progress.heat = Math.max(0, n); heatT = 0; chaseT = 0;
  if (n > 0 || !was) return;
  // the lights go off: every constable loses interest and walks on
  for (const e of police()) { e.aggro = false; e.engaged = false; e.wx = e.x + (e.x < cam + LW / 2 ? -1 : 1) * LW; }
  jeep = jeep && { ...jeep, done: true };
  banner = { text: "The police have lost you", t: 110 }; Arcade.tone(660, 0.1, "triangle", 0.04);
}
function whistle() { Arcade.tone(2600, 0.18, "square", 0.025); setTimeout(() => Arcade.tone(2900, 0.3, "square", 0.025), 220); }

// a hit by a player (hurt, combat.js): note a constable struck, or a fight picked with a goonda
// minding his own business; it runs before hurt makes the victim angry
function noteCrime(d, a) {
  const by = a.owner || a;
  if (!hasHeat() || !by || by.pi === undefined) return;
  if (isCop(d)) { if (!d.struck) { d.struck = true; changeRespect(-1); crime(d.kind === "riot" && heat() >= 3 ? 4 : 2, d.x, "police"); } return; }
  if (d.team === "e" && d.roam && !d.aggro) crime(1, d.x, "brawl");
  if (d.team === "e" && !d.aggro && truce()) { changeRespect(-5); texts.push({ x: d.x, y: d.y - 64, s: "Arre! It's chai time!", t: 70 }); }   // jumping a man with a glass in his hand
}
// a passer-by caught by a punch or a kick (resolveHits): they stagger off, and somebody saw
function hitCiv(c, a) {
  c.hit = true; c.st = "flee"; c.face = Math.sign(c.x - a.x) || a.face; c.x += c.face * 8;
  texts.push({ x: c.x, y: c.y - 56, s: pick(["Oww!", "Arre, pagal hai kya?", "Police! Police!"]), t: 60 });
  Arcade.tone(300, 0.08, "square", 0.04, -80);
  changeRespect(-3); crime(1, c.x, "civ", c);
}

function spawnCop(kind, x, aggro) {
  fighterArt(SHEET_OF[kind]);
  const e = fighter(kind, x, rand(Y0 + 6, Y1 - 4), "e");
  Object.assign(e, { roam: true, aggro, face: x < cam + LW / 2 ? 1 : -1, wx: clamp(cam + LW / 2 + rand(-160, 160), 20, street.w - 20), wt: 0, cool: 60 });
  if (aggro) texts.push({ x: e.x, y: e.y - 64, s: pick(["Ruko! Police!", "Stop right there!", "Hey! You!"]), t: 60 });
  enemies.push(e);
  return e;
}

function updateHeat() {
  if (!hasHeat()) return;
  const ap = alivePlayers();
  if (heatD !== street.district) {
    // a new district: its police don't know your face, and you lose a light
    if (heatD && heat() && !street.interior) { setHeat(heat() - 1); if (heat()) banner = { text: "New district, new thana: one light fewer", t: 100 }; }
    heatD = street.district;
  }
  if (sitting) {
    const p = sitting.p;
    if (p.st !== "idle" || p.lives <= 0 || street.id !== sitting.street) sitting = null;
    else {
      p.x = sitting.x; p.y = sitting.y;
      if (++sitting.t === 240) { if (heat()) { setHeat(heat() - 1); texts.push({ x: p.x, y: p.y - 74, s: "Nobody looks twice at someone drinking chai", t: 120 }); } p.sp = Math.min(100, p.sp + 30); }
    }
  }
  updateJeep();
  const lvl = heat();
  if (!lvl) { patrol(); return; }
  const cops = police(), hidden = sitting || street.interior;
  if (hidden) for (const e of cops) if (e.aggro) { e.aggro = false; e.engaged = false; }
  const seen = !hidden && cops.some((e) => e.aggro && ap.some((p) => Math.abs(p.x - e.x) < LW * 0.6));
  if (seen) { heatT = 0; if (lvl === 2 && ++chaseT > 90 * 60) raiseHeat(3); }   // a long chase
  else {
    // out of sight, the trail goes cold: a light every fifteen seconds, twice as fast in a crowd
    const crowded = ap.some((p) => civs.filter((c) => c.st !== "flee" && Math.abs(c.x - p.x) < 80).length >= 2);
    heatT += street.interior && street.id !== "tailorShop" && street.id !== "dhaba" ? 0.5 : crowded ? 2 : 1;
    if (heatT >= 15 * 60) { setHeat(lvl - 1); if (heat()) texts.push({ x: ap[0] ? ap[0].x : cam, y: Y0 - 30, s: "The search moves on", t: 80 }); }
  }
  // the response: constables walk in from off screen, riot police at 3, a jeep from 2
  if (street.interior || mission || arena || hidden || wipe) return;
  const want = [0, 1, 2, 4, 4][heat()], riots = cops.filter((e) => e.kind === "riot").length;
  godboleComes(cops);
  // at 3 the riot police come whoever is already here (never more than six in all)
  const riotDue = heat() >= 3 && riots < 2 && cops.length < 6;
  if ((cops.length < want || riotDue) && --copT <= 0) { copT = 300; const x = offscreenX(40); if (x !== null) spawnCop(riotDue ? "riot" : "constable", x, true); }
  if (heat() >= 2 && !jeep && street.theme === "street" && !(street.look && street.look.narrow) && --jeepT <= 0) {
    const d = Math.random() < 0.5 ? 1 : -1, p = ap[0];
    if (p) { jeep = { x: d > 0 ? cam - 80 : cam + LW + 80, d, stop: clamp(p.x - d * 70, 60, street.w - 60), t: 0 }; jeepT = 40 * 60; art(["v_jeep"]); Arcade.tone(560, 0.2, "sawtooth", 0.02, 300); }
  }
}
// at four lights Inspector Godbole arrives in person, once a day: put him down and the district's
// police fall back (two lights), and he goes home to write a very long report
let godbole = null;
function godboleComes(cops) {
  if (godbole && (godbole.gone || !enemies.includes(godbole))) godbole = null;
  if (godbole && (godbole.hp <= 0 || godbole.st === "dead")) {
    progress.godboleDay = progress.clock.day; sayAt(godbole.x, godbole.y - 80, pick(["I have your faces. I have all day tomorrow.", "This is going in my notebook."]), 150);
    godbole = null; setHeat(2); banner = { text: "Godbole is down. The police fall back", t: 140 }; return;
  }
  if (heat() < 4 || godbole || progress.godboleDay === progress.clock.day || cops.some((e) => e.kind === "godbole")) return;
  const x = offscreenX(50); if (x === null) return;
  godbole = spawnCop("godbole", x, true); godbole.engaged = true;
  banner = { text: "Inspector Godbole", t: 150, big: true }; whistle();
  sayAt(godbole.x, godbole.y - 80, "By the book, then. Chapter one: you are under arrest.", 150);
}
// by day a constable may walk his beat on a main street, paying no attention until the lights come on
function patrol() {
  if (!street.patrol || street.interior || mission || arena || isNight() || copsOff() || --patrolT > 0) return;
  patrolT = Math.round(rand(40, 80) * 60);
  if (police().length) return;
  const x = offscreenX(40); if (x !== null) spawnCop("constable", x, false);
}
// the police jeep: drives in along the road, stops short of you, two constables jump out, it leaves
function updateJeep() {
  if (!jeep) return;
  if (street.interior) { jeep = null; return; }
  const stopped = !jeep.done && Math.abs(jeep.x - jeep.stop) < 4;
  if (stopped) {
    if (++jeep.t === 30) for (let i = 0; i < Math.min(2, 5 - police().length); i++) { const e = spawnCop("constable", jeep.x + rand(-14, 14), true); e.y = rand(Y1 - 14, Y1 - 4); }
    if (jeep.t > 90) jeep.done = true;
  } else {
    jeep.x += jeep.d * (jeep.done ? 3.6 : Math.min(3.6, Math.abs(jeep.stop - jeep.x) / 8 + 0.6));
    if (!jeep.done && (jeep.stop - jeep.x) * jeep.d < 0) jeep.x = jeep.stop;
    // a moving jeep knocks over anyone in the road, like the autos
    for (const p of alivePlayers()) {
      if (p.jeepHit === jeep || Math.abs(p.x - jeep.x) > 24 || p.y < 192 || p.z > 10 || DOWN_STATES.includes(p.st)) continue;
      p.jeepHit = jeep; p.inv = 0; hurt(p, { x: jeep.x - jeep.d * 10, face: jeep.d, team: "e", kind: "constable" }, { dmg: 8, knock: true, sfx: 180 });
    }
  }
  if (jeep.done && (jeep.x < cam - 140 || jeep.x > cam + LW + 140)) jeep = null;
}

/* ---------- places to lose them ---------- */
// sit down at a tea stall for a cutting chai: four seconds unseen and the police lose you
function teaTarget(p) {
  const st = (street.props || []).find((pr) => pr.kind === "teastall" && Math.abs(pr.x - p.x) < 26);
  if (!st || sitting) return null;
  const hot = heat() > 0;
  if (heat() >= 3) return { label: "Not with the jeep outside", x: st.x, y: Y0 - 56, act: () => {} };
  if (hot && police().some((e) => e.aggro && Math.abs(e.x - p.x) < 140)) return { label: "Not with a constable on your heels", x: st.x, y: Y0 - 56, act: () => {} };
  return { label: (hot ? "Hide: sit down for a chai" : "Sit down for a chai") + " (" + rupees(10) + ")", x: st.x, y: Y0 - 56, act: (q) => {
    if (money() < 10) { texts.push({ x: q.x, y: q.y - 70, s: "Not even ₹10? Next time.", t: 70 }); return; }
    progress.money -= 10; setState(q, "idle"); q.y = Y0 + 4; q.x = st.x + 16; q.face = -1;
    sitting = { p: q, x: q.x, y: q.y, t: 0, street: street.id };
    texts.push({ x: q.x, y: q.y - 70, s: "One cutting, extra sugar", t: 70 }); Arcade.tone(990, 0.06, "triangle", 0.04);
  } };
}
// new clothes from the tailor (a shop item): the police are looking for someone else now
function newClothes() {
  if (heat()) { setHeat(0); $("shop-msg").textContent = "A new kurta. The constable outside walks straight past you."; }
  else $("shop-msg").textContent = "A new kurta. Very smart. Masterji says it is the last one he sews on credit.";
}

/* ---------- drawing ---------- */
// the jeep, the roadblocks at the junctions, and a kulhad over anyone sitting at a tea stall
function drawHeatProps(P) {
  if (!hasHeat()) return;
  for (const pr of street.props || []) if (pr.kind === "teastall") { const x = Math.round(pr.x - cam); if (x > -60 && x < LW + 60 && !sprAt("m_teastall", x, Y0 + 4, false, 1.3)) { R(x - 24, Y0 - 30, 48, 34, "#8a5a32"); R(x - 26, Y0 - 34, 52, 5, "#c0392b"); } }
  if (roadblock()) for (const j of street.junctions || []) {
    const x = Math.round(j.x - cam), y = j.dir === "up" ? Y0 + 2 : Y1 - 6; if (x < -40 || x > LW + 40) continue;
    R(x - 22, y - 4, 2, 10, P.ol); R(x + 20, y - 4, 2, 10, P.ol);
    for (let s = 0; s < 6; s++) R(x - 22 + s * 7, y - 10, 7, 6, s % 2 ? "#f7f4ee" : "#c0392b");
    if (Math.floor(frameNo / 20) % 2) R(x - 1, y - 14, 3, 3, "#ff5a4a");
  }

  // steam off the glass (the seated frame holds it; the old drawn kulhad stands in where there's no frame)
  if (sitting && street.id === sitting.street) {
    const q = sitting.p, own = SPRITES["s_" + spriteSheet(q).replace(/Lathi$/, "")], x = Math.round(sitting.x - cam) + (own ? q.face * 4 : 8), y = own ? sitting.y - 34 : sitting.y - 44;
    if (!own) R(x, y, 4, 5, "#b0643a");
    R(x + 1, y - 6 + Math.sin(frameNo / 9), 1, 4, "rgba(255,255,255,0.5)");
  }
}
// the police jeep, drawn with the cast so it sorts by depth with the people around it
function drawJeep(P) {
  if (jeep) {
    const x = Math.round(jeep.x - cam);
    if (!sprAt("v_jeep", x, 214, jeep.d < 0, 1.15)) { R(x - 34, 186, 68, 22, "#3d5a3a"); R(x - 20, 176, 34, 10, "#2c4430"); R(x - 30, 206, 12, 6, P.ol); R(x + 18, 206, 12, 6, P.ol); }
    const on = Math.floor(frameNo / 8) % 2; R(x - 6, 168, 5, 4, on ? "#ff3b30" : "#5a1a16"); R(x + 1, 168, 5, 4, on ? "#2a3c8a" : "#3d7bff");
  }
}
// riot police carry a tall cane shield, held in front
function drawShield(f, x, y, sc) {
  if (f.kind !== "riot" || DOWN_STATES.includes(f.st)) return;
  const sx = x + f.face * 13 * sc, top = y - f.z - 50 * sc, h = 42 * sc;
  g.globalAlpha = 0.9; R(sx - 5, top, 10, h, "#a37a3c"); g.globalAlpha = 1;
  for (let i = 3; i < h; i += 5) R(sx - 4, top + i, 8, 1, "#7d5a2a");
  R(sx - 5, top, 10, 2, "#d8b06a"); R(sx - 5, top + h - 2, 10, 2, "#6b4e24"); R(sx - 5, top, 1, h, "#d8b06a"); R(sx + 4, top, 1, h, "#6b4e24");
  R(sx - 3, top + 8, 6, 3, "rgba(20,24,30,0.55)");   // the grille to see through
}
// the lal batti: five lights in player 1's panel, red and blue, flashing while the police see you
function drawHeatLights(x, y) {
  if (!hasHeat()) return;
  const n = heat(), flash = n && police().some((e) => e.aggro);
  for (let i = 0; i < 5; i++) {
    const on = i < n, alt = (i + Math.floor(frameNo / 10)) % 2;
    R(x + i * 5, y, 4, 5, on ? (flash ? (alt ? CB(1) : "#3d7bff") : CB(1)) : PAL.dark ? "#3a3632" : "#cfc6b7");
  }
}

// a district that loves you joins in: someone in the crowd throws a chappal at a goonda winding up
function streetHelps(e) {
  if (!hasHeat() || respect() < 70 || isCop(e) || Math.random() > 0.25) return;
  const c = civs.find((c) => !c.hit && Math.abs(c.x - e.x) < 140);
  if (!c) return;
  e.inv = 0; hurt(e, { x: c.x, face: Math.sign(e.x - c.x) || 1, team: "p", kind: "grunt" }, { dmg: 3, sfx: 700 });
  if (e.st === "hurt") e.cool = Math.max(e.cool, 30);
  texts.push({ x: e.x, y: e.y - 66, s: pick(["Chappal!", "Take that!", "Leave our lane alone!"]), t: 50 });
  for (let i = 0; i < 4; i++) fx.push({ kind: "dot", x: e.x, y: e.y - 40, vx: rand(-1.4, 1.4), vy: rand(-2, 0), c: "#7a4a2a", t: 16 });
}
