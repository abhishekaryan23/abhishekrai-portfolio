/* Rollback City: the living city (DESIGN 6.4, 7.1, 7.6, 8; 5.1 to 5.4 of the plan). A plain script that
   shares globals with the others; index.html loads them in order.

   Festivals: one day in every ten the city dresses for one (Sankranti's kites, Ganpati's dhol and
   marigolds, Diwali's diyas and firecrackers to throw). The newspaper: what you did yesterday is on
   every news stand this morning, and never the same story two days running. Nemesis goondas: the man
   who knocks you out gets a name, and comes back with a bandage, friends and a price on his head. And
   a director that, now and then in free roam, starts one of fifteen small street events, never two
   at once, each with its own rest. */
"use strict";

/* ---------- festivals ---------- */
const FESTIVALS = [
  { id: "sankranti", day: 7, name: "Makar Sankranti", line: "Sankranti: every roof is flying a kite." },
  { id: "ganpati", day: 17, name: "Ganpati", line: "Ganpati: dhol on every corner, marigolds on every wire." },
  { id: "diwali", day: 27, name: "Diwali", line: "Diwali: diyas on the steps, and firecrackers going off in every gali." }];
const festival = () => (clockRuns() ? FESTIVALS.find((f) => progress.clock.day % 30 === f.day) || null : null);
let festSeen = -1;
function updateFestival() {
  const f = festival();
  if (f && festSeen !== progress.clock.day && !street.interior) { festSeen = progress.clock.day; banner = { text: f.line, t: 200 }; }
  if (!f || street.interior || mission) return;
  if (f.id === "ganpati" && frameNo % 40 === 0) Arcade.noise(0.05, frameNo % 80 ? 0.025 : 0.04);   // the dhol, somewhere down the road
  // Diwali: a firecracker on the ground now and then, to pick up and throw
  if (f.id === "diwali" && frameNo % 900 === 0 && items.filter((it) => it.kind === "cracker").length < 2) items.push({ kind: "cracker", x: cam + rand(40, LW - 40), y: rand(Y0 + 6, Y1 - 4), z: 0, vz: 0 });
}
function drawFestival(P) {
  const f = festival(); if (!f || street.interior) return;
  if (f.id === "sankranti") for (let k = 0; k < 9; k++) {
    const x = ((k * 97 + frameNo * 0.15 - cam * 0.3) % (LW + 60) + LW + 60) % (LW + 60) - 30, y = 20 + (k % 4) * 12 + Math.sin(frameNo / 40 + k) * 4, c = ["#c0392b", "#f2c230", "#3d7bff", "#2f8a4a", "#c96bd8"][k % 5];
    g.fillStyle = c; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 4, y); g.lineTo(x, y + 5); g.lineTo(x - 4, y); g.fill(); R(x, y + 5, 1, 6, "rgba(250,240,220,0.6)");
  }
  if (f.id === "ganpati") for (let x = -(cam * 1 % 8); x < LW; x += 8) R(x, 98 + Math.sin(x / 30) * 3, 3, 3, (x / 8) % 2 ? "#f2a91a" : "#e2701c");   // marigold strings
  if (f.id === "diwali" && P.dark) for (let wx = Math.floor(cam / 40) * 40; wx < cam + LW + 40; wx += 40) { const x = Math.round(wx - cam); R(x, Y0 - 2, 4, 2, "#8a4a2a"); R(x + 1, Y0 - 5 + Math.sin(frameNo / 6 + wx) * 0.5, 2, 3, "#ffd27a"); g.globalAlpha = 0.18; g.fillStyle = "#ffb04a"; g.beginPath(); g.arc(x + 2, Y0 - 4, 7, 0, 7); g.fill(); g.globalAlpha = 1; }
}
// a thrown firecracker goes off where it lands: everyone near is knocked down
function crackerBang(s) {
  shake = 6; Arcade.noise(0.4, 0.09); texts.push({ x: s.x, y: s.y - 30, s: "DHAMAKA!", t: 50 });
  for (let k = 0; k < 14; k++) fx.push({ kind: "ember", x: s.x, y: s.y - 10, vx: rand(-2.5, 2.5), vy: rand(-3, -0.5), t: 30 });
  for (const e of enemies) if (e.team === "e" && !DOWN_STATES.includes(e.st) && Math.abs(e.x - s.x) < 46 && Math.abs(e.y - s.y) < 18) hurt(e, { x: s.x, face: Math.sign(e.x - s.x) || 1, team: "p", kind: "rai", owner: s.owner }, { dmg: 10, knock: true });
}

/* ---------- the newspaper ---------- */
const HEADLINES = {
  "2-3": "MANDI WEIGHBRIDGE SCAM EXPOSED BY TWO KIDS FROM CHANDNI LANE", "2-5": "CHANDNI LANE PAYS FIRST INSTALMENT; KAAL CAR PARK 'A MESS'",
  "2-6": "CLUB 1987 REOPENS: DJ REWIND BACK ON THE DECKS", "2-7": "DOCKS TURN ON THEIR OWN BOSS; FISH PRICES UNCHANGED", "2-9": "CHANDNI LANE BURNS AGAIN; LOCAL HEROES CARRY FIVE OUT",
  "2-10": () => (flag("broke") ? "JAILBREAK AT BUNDER ROAD THANA; INSPECTOR 'HAS THEIR FACES'" : "RANJIT OUT ON BAIL; LANE PAYS"), "2-11": "SAANP AMBUSH ON COAST ROAD FOILED; SECOND INSTALMENT PAID",
  "3-2": "SITARA STUDIOS FINDS NEW STUNT DOUBLE; 'A NATURAL LIAR' SAYS MASTER-JI", "3-4": "1987 FIRE REPORT 'MISSING' FROM RECORDS OFFICE", "3-7": "KAAL CONVOY STOPPED ON COAST ROAD IN STORM",
  "3-9": "KAAL HEIGHTS BREAK-IN: CEO FOUND ON HELIPAD IN RAIN", "3-10": "THE LIGHTS STAYED ON: SETH KAAL ARRESTED AT KINARA SCREENING", "s1-moti": "DOG SQUAD SENT PACKING AT MANDI GHAT",
  "s9-chhotu": "PEANUT BOY CAUGHT ON THE ROOFTOPS AFTER THREE-DAY CHASE", "s3-rani": "LAKHAN'S AUTO 'RANI' BACK ON THE ROAD"};
function logNews(text) { const n = progress.news = progress.news || []; if (!n.some((x) => x.day === progress.clock.day && x.text === text)) n.push({ day: progress.clock.day, text }); if (n.length > 40) n.splice(0, n.length - 40); }
// what the paper says today: yesterday's stories, minus anything it already ran the day before
function todaysPaper() {
  const y = progress.clock.day - 1, before = (progress.news || []).filter((x) => x.day === y - 1).map((x) => x.text);
  return (progress.news || []).filter((x) => x.day === y && !before.includes(x.text)).slice(-3).map((x) => x.text);
}
for (const [id, x] of [["lane", 1205], ["mandiRoad", 600], ["bunderRoad", 560], ["kinara", 1100]]) WORLD.streets[id].props = (WORLD.streets[id].props || []).concat({ x, kind: "newsstand" });
// the paper-wallah's stand, drawn in code: a tin box, the day's papers pegged on a string
art(["m_newsstand", "v_kidvan"]);
function drawNewsstand(x, P) {
  if (spr("m_newsstand", x, Y0 + 4)) return;   // the tin stall (MOSS); the drawn one below until it loads
  R(x - 14, Y0 - 26, 28, 30, "#3d5a6e"); R(x - 16, Y0 - 30, 32, 5, "#c0392b"); R(x - 12, Y0 - 22, 24, 14, "#1d1b18");
  for (let k = 0; k < 4; k++) R(x - 11 + k * 6, Y0 - 21, 5, 7, k % 2 ? "#efe6d2" : "#e2d8c0");
  g.strokeStyle = "#2a2622"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - 12, Y0 - 22); g.lineTo(x + 12, Y0 - 22); g.stroke();
  text("PAPER", x, Y0 - 26, 4, "#f7f4ee");
}
function paperTarget(p) {
  const st = (street.props || []).find((pr) => pr.kind === "newsstand" && Math.abs(pr.x - p.x) < 20); if (!st || !clockRuns()) return null;
  return { label: "Read today's Bunderpur Mirror (" + rupees(5) + ")", x: st.x, y: Y0 - 50, act: () => {
    if (money() >= 5) progress.money -= 5;
    const h = todaysPaper();
    showNote("THE BUNDERPUR MIRROR, DAY " + progress.clock.day + "\n\n" + (h.length ? h.join("\n\n") : pick(["Nothing about you today. Small mercies.", "Page 3: a cow has been elected secretary of the Mandi traders' union. Unopposed.", "Weather: hot, then wet, then hot again. Kaal Group: still building tomorrow."])));
  } };
}

/* ---------- nemesis goondas ---------- */
const NEM_A = ["Chhota", "Lambu", "Kaalia", "Golu", "Teja", "Pappu", "Sultan", "Bhindi"], NEM_B = ["the Knuckle", "Chappal", "Pressure Cooker", "Two Teeth", "Tiffin", "the Elbow", "Bandage", "Matchbox"];
// the man who put you down: remembered, named, and given a reason to come back
function nemesisNote(p) {
  const e = p.lastBy; if (!e || !enemies.includes(e) || e.team !== "e" || KINDS[e.kind].boss || KINDS[e.kind].police || !SHEET_OF[e.kind] || e.spar) return;
  const old = progress.nemesis;
  if (old && old.kind === e.kind && e.nemesis) { old.level = Math.min(3, old.level + 1); old.day = progress.clock.day; logNews(old.name.toUpperCase() + " STRIKES AGAIN; BOUNTY RAISED"); return; }
  progress.nemesis = { kind: e.kind, name: pick(NEM_A) + " " + pick(NEM_B), district: street.district, street: street.id, day: progress.clock.day, level: 1 };
}
let nemT = 600;
function updateNemesis() {
  const N = progress.nemesis; if (!N || mission || arena || street.interior || !clockRuns() || street.district !== N.district) return;
  if (progress.clock.day <= N.day || enemies.some((e) => e.nemesis) || --nemT > 0) return;
  nemT = 3600;
  const x = offscreenX(40); if (x === null) return;
  fighterArt(SHEET_OF[N.kind]);
  const e = fighter(N.kind, x, rand(Y0 + 6, Y1 - 4), "e");
  Object.assign(e, { nemesis: true, roam: true, aggro: true, engaged: true, cool: 40 }); e.max = e.hp = Math.round(e.hp * (1.4 + N.level * 0.3)); enemies.push(e);
  for (let k = 0; k < N.level + 1; k++) { const f = fighter(N.kind === "kaal" ? "kaal" : "grunt", x + rand(-30, 30), rand(Y0 + 6, Y1 - 4), "e"); Object.assign(f, { roam: true, aggro: true, engaged: true, cool: 60 }); enemies.push(f); }
  texts.push({ x: e.x, y: e.y - 70, s: street.id === N.street ? "Remember me? Right here, on " + street.name + "!" : "Remember me? " + N.name + "!", t: 140 });
  banner = { text: N.name + ": bounty " + rupees(300 * N.level), t: 140 };
}
function nemesisBeaten(e) {
  if (!e.nemesis || e.paid) return; e.paid = true;
  const N = progress.nemesis; if (!N) return;
  earn(300 * N.level); logNews(N.name.toUpperCase() + " BEATEN AGAIN ON " + street.name.toUpperCase()); banner = { text: N.name + " won't be back. Bounty paid", t: 150 }; progress.nemesis = null;
}
// the bandage and the name over his head
function drawNemesis() {
  for (const e of enemies) if (e.nemesis && !e.gone) {
    const x = Math.round(e.x - cam); if (x < -30 || x > LW + 30) continue;
    const top = e.y - 52 * KINDS[e.kind].scale - e.z;
    R(x - 5, top + 2, 10, 2, "#f2efe6"); R(x + 2, top, 2, 6, "#f2efe6");
    text(progress.nemesis ? progress.nemesis.name : "", x, top - 6, 5, "#f2c230");
  }
}

/* ---------- the street-event director ---------- */
// one event at a time, each with its own rest, chosen to suit the street and the hour
const EVENTS = {
  pickpocket: { rest: 14, ok: () => !isNight(), start: () => ({ thief: { civ: true, look: "civ_b", base: 4, x: cam - 20, y: Y0 + 14, face: 1, st: "flee", walkPh: 0 }, t: 0 }) },
  cow: { rest: 16, ok: () => street.theme === "street" && !isNight(), start: () => ({ x: cam + LW * 0.6, t: 0 }) },
  baraat: { rest: 30, ok: () => hourIn([17, 22]) && street.theme === "street", start: () => ({ x: cam + LW + 40, t: 0 }) },
  shoot: { rest: 30, ok: () => !isNight() && street.theme === "street", start: () => ({ x: cam + LW * 0.7, t: 0 }) },
  ball: { rest: 12, ok: () => !isNight() && street.theme === "street", start: () => ({ x: cam + rand(60, LW - 60), z: 80, vz: 0, t: 0 }) },
  powercut: { rest: 40, ok: () => isNight() && !blackout(), start: () => ({ t: 0 }) },
  uncle: { rest: 25, ok: () => hourIn([19, 24]), start: () => ({ x: cam + LW * 0.5, t: 0 }) },
  surveyors: { rest: 30, ok: () => progress.done.includes("2-5") && !isNight(), start: () => (fighterArt(SHEET_OF.kaal || "kaal"), { t: 0, men: [0, 1].map((k) => { const e = fighter("kaal", cam + LW * 0.4 + k * 40, Y0 + 8 + k * 6, "e"); Object.assign(e, { roam: true, aggro: false, surveyor: true, wx: e.x, wt: 999 }); enemies.push(e); return e; }) }) },
  deal: { rest: 25, ok: () => !isNight(), start: () => ({ x: cam + LW * 0.55, t: 0 }) },
  lostChild: { rest: 30, ok: () => !isNight(), start: () => ({ kid: { civ: true, look: "civ_f", base: 4, x: cam + LW * 0.45, y: Y0 + 14, face: -1, st: "stand", walkPh: 0 }, parentX: clamp(cam + LW / 2 + (Math.random() < 0.5 ? -1 : 1) * 500, 40, street.w - 40), t: 0 }) },
  dog: { rest: 25, ok: () => !isNight(), start: () => ({ x: cam + LW + 30, t: 0 }) },
  monkey: { rest: 30, ok: () => street.theme === "street" && players.some((p) => p && p.weapon), start: () => ({ x: cam + LW * 0.5, y: 40, t: 0, stole: null }) },
  downpour: { rest: 60, ok: () => !!arena && weather() !== "showers" && weather() !== "storm", start: () => { progress.weather.kind = "showers"; banner = { text: "A downpour, mid-fight: everyone slips", t: 100 }; return { t: 999 }; } }};
// the kidnapping van, straight out of a seventies film: a dusty white van screeches in, two goondas drag
// a passer-by towards it, and if you put them down first the van leaves empty
EVENTS.van = { rest: 45, ok: () => street.theme === "street" && !(street.look && street.look.narrow) && !arena, start: () => {
  const d = Math.random() < 0.5 ? 1 : -1;
  return { d, x: d > 0 ? cam - 90 : cam + LW + 90, stopX: cam + LW * (d > 0 ? 0.7 : 0.3), phase: "in", t: 0, men: [] };
} };
function updateVan(s, p) {
  if (s.phase === "in") {
    s.x += s.d * 4;
    if (s.d * (s.x - s.stopX) >= 0) {
      s.x = s.stopX; s.phase = "grab"; shake = Math.max(shake, 3); Arcade.noise(0.3, 0.06); texts.push({ x: s.x, y: Y0 - 30, s: "Skreeech!", t: 60 });
      s.victim = { civ: true, look: pick(["civ_a", "civ_b", "civ_d", "civ_e"]), base: pick([0, 4]), x: s.x - s.d * 60, y: Y0 + 14, face: s.d, st: "walk", walkPh: 0 };
      for (let k = 0; k < 2; k++) { const kind = pick(["grunt", "kicker", "pipeGrunt"]); fighterArt(SHEET_OF[kind]); const e = fighter(kind, s.x - s.d * (20 + k * 18), Y0 + 10 + k * 16, "e"); Object.assign(e, { roam: true, aggro: true, engaged: true, cool: 50, wx: e.x, wt: 0, vanMan: true }); enemies.push(e); s.men.push(e); }
    }
    return;
  }
  if (s.phase === "grab") {
    const v = s.victim, up = s.men.filter((e) => !e.gone && e.hp > 0 && !DOWN_STATES.includes(e.st) && e.st !== "flee");
    if (!up.length) {   // both goondas down: the van gives up
      s.phase = "off"; changeRespect(4); earn(100); logNews("LOCAL HERO STOPS VAN SNATCHING ON " + street.name.toUpperCase());
      texts.push({ x: v.x, y: v.y - 60, s: "Shukriya, beta! Here, take this (Rs 100)", t: 120 }); v.st = "walk"; v.face = -s.d; v.free = true; Arcade.tone(880, 0.1, "triangle", 0.04);
      return;
    }
    v.x += Math.sign(s.x - v.x) * 0.3; v.walkPh += 0.12; v.face = Math.sign(s.x - v.x) || v.face;   // dragged towards the van
    if (s.t % 110 === 1) texts.push({ x: v.x, y: v.y - 58, s: pick(["Bachao!", "Chhodo mujhe!", "Help! Somebody!"]), t: 60 });
    if (Math.abs(v.x - s.x) < 10) { s.phase = "off"; v.taken = true; changeRespect(-1); texts.push({ x: s.x, y: Y0 - 40, s: "The van got away. The plate was all mud.", t: 120 }); logNews("WHITE VAN SEEN AGAIN NEAR " + street.name.toUpperCase()); }
    return;
  }
  s.x += s.d * 5; if (s.victim && s.victim.free) { s.victim.x -= s.d * 0.8; s.victim.walkPh += 0.3; }
  if (s.x < cam - 160 || s.x > cam + LW + 160) endEvent();
}
// the van itself, parked at the kerb behind everyone (drawStreetProps calls this)
function drawVanEvent(P) {
  if (!ev || ev.id !== "van" || ev.street !== street.id) return; const s = ev.st, x = Math.round(s.x - cam);
  if (x < -100 || x > LW + 100) return;
  if (!spr("v_kidvan", x, 186, s.d < 0)) { R(x - 34, 152, 68, 34, "#e8e4dc"); R(x - 28, 156, 50, 10, "#1d1b18"); }
  if (s.phase === "grab") { g.globalAlpha = 0.8; R(x - 6, 160, 14, 22, "#0d0c0f"); g.globalAlpha = 1; }   // the side door, slid open
}
let ev = null, evT = 3600;
// the event people are drawn from the passer-by sheets, which only some streets load
for (const n of ["civ_a", "civ_b", "civ_c", "civ_e", "civ_g"]) sprite("c_" + n, ART + n + ".png");
function updateEvents() {
  if (!clockRuns() || street.interior || mission || street.water || minigameOn()) { if (ev && (street.interior || mission)) endEvent(); return; }
  if (!ev) {
    if (--evT > 0 || (arena && !EVENTS.downpour.ok())) return;
    evT = Math.round(rand(90, 180) * 60);
    const rest = progress.evRest = progress.evRest || {}, now = progress.clock.day * 1440 + progress.clock.min;
    const ids = Object.keys(EVENTS).filter((k) => (arena ? k === "downpour" : k !== "downpour") && (rest[k] || 0) <= now && EVENTS[k].ok());   // mid-fight, only the downpour
    if (!ids.length) return;
    const k = pick(ids); rest[k] = now + EVENTS[k].rest * 60; ev = { id: k, st: EVENTS[k].start(), street: street.id }; return;
  }
  if (ev.street !== street.id) return endEvent();
  const s = ev.st, p = alivePlayers()[0]; s.t++; if (!p) return;
  switch (ev.id) {
    case "pickpocket": s.thief.x += 2.2; s.thief.walkPh += 0.35; if (s.t === 2) texts.push({ x: s.thief.x, y: Y0 - 50, s: "Chor! My bag!", t: 80 });
      if (Math.abs(p.x - s.thief.x) < 14 && Math.abs(p.y - s.thief.y) < 18) { changeRespect(4); earn(60); texts.push({ x: p.x, y: p.y - 70, s: "Bag back! The aunty presses Rs 60 on you", t: 100 }); endEvent(); }
      else if (s.thief.x > cam + LW + 60) endEvent(); break;
    case "cow": if (s.t % 120 === 0) texts.push({ x: s.x + rand(-60, 60), y: Y1 - 40, s: pick(["Peep peep!", "Arre, move!", "Gau mata, please!"]), t: 60 }); if (s.t > 1500) endEvent(); break;
    case "baraat": s.x -= 0.7; if (s.t % 30 === 0) Arcade.noise(0.05, 0.03); if (Math.abs(p.x - s.x) < 40 && p.st === "taunt" && !s.danced) { s.danced = true; p.sp = Math.min(100, p.sp + 40); changeRespect(3); texts.push({ x: p.x, y: p.y - 70, s: "You dance with the baraat! +40 SP", t: 100 }); } if (s.x < cam - 120) endEvent(); break;
    case "shoot": if (Math.abs(p.x - s.x) < 50 && p.st === "idle") { s.still = (s.still || 0) + 1; if (s.still === 240) { earn(150); texts.push({ x: p.x, y: p.y - 70, s: "\"Perfect background face!\" Rs 150 as an extra", t: 100 }); endEvent(); } } else s.still = 0; if (s.t > 2400) endEvent(); break;
    case "ball": s.vz -= 0.08; s.z += s.vz; s.x += 0.5; if (s.z <= 12 && !s.done) { s.done = true; if (Math.abs(p.x - s.x) < 16) { changeRespect(3); texts.push({ x: p.x, y: p.y - 70, s: "Caught! The gali cheers", t: 80 }); } else { Arcade.noise(0.25, 0.05); texts.push({ x: s.x, y: 80, s: "CRASH! \"Whose ball is this?!\"", t: 90 }); } } if (s.z < 0) endEvent(); break;
    case "powercut": if (s.t === 1) { banner = { text: "Power cut. Again.", t: 100 }; Arcade.noise(0.3, 0.05); } if (s.t > 1200) { banner = { text: "The power's back", t: 80 }; endEvent(); } break;
    case "uncle": if (Math.abs(p.x - s.x) < 22 && tapped(p.pi, "use") && !s.on) { s.on = true; s.mash = 0; texts.push({ x: s.x, y: Y0 - 50, s: "Arm wrestle! Mash punch!", t: 80 }); } if (s.on) { if (tapped(p.pi, "punch")) s.mash++; if (s.mash >= 15) { earn(100); texts.push({ x: p.x, y: p.y - 70, s: "You win Rs 100. Uncle demands a rematch next year", t: 110 }); endEvent(); } else if (s.t > 900) { texts.push({ x: s.x, y: Y0 - 50, s: "Uncle wins. He's very pleased with himself.", t: 90 }); endEvent(); } } else if (s.t > 1800) endEvent(); break;
    case "surveyors": if (s.men.every((e) => DOWN_STATES.includes(e.st) || e.gone || e.fled)) { changeRespect(3); texts.push({ x: p.x, y: p.y - 70, s: "Surveyors chased off. The street claps", t: 100 }); endEvent(); } else if (s.t > 2400) { for (const e of s.men) e.gone = true; endEvent(); } break;
    case "deal": if (Math.abs(p.x - s.x) < 20 && tapped(p.pi, "use") && money() >= 80) { progress.money -= 80; p.weapon = { kind: "pipe", uses: Math.random() < 0.5 ? 2 : 10 }; texts.push({ x: p.x, y: p.y - 70, s: "A 'genuine teak' lathi, Rs 80. Today only.", t: 100 }); endEvent(); } else if (s.t > 1800) endEvent(); break;
    case "van": updateVan(s, p); break;
    case "lostChild": if (!s.with && Math.abs(p.x - s.kid.x) < 18 && tapped(p.pi, "use")) { s.with = true; texts.push({ x: p.x, y: p.y - 70, s: "\"I want my mummy...\" (find the stall with the worried mother)", t: 120 }); }
      if (s.with) { s.kid.x += clamp(p.x - p.face * 14 - s.kid.x, -1.5, 1.5); s.kid.st = "walk"; s.kid.walkPh += 0.2; if (Math.abs(p.x - s.parentX) < 30) { changeRespect(5); texts.push({ x: p.x, y: p.y - 70, s: "Reunited. The mother insists on feeding you", t: 120 }); for (const q of players) if (q) q.hp = q.max; endEvent(); } } if (s.t > 4800) endEvent(); break;
    case "dog": s.x += Math.sign(p.x - s.x) * 2.6; if (moti && !moti.stray && Math.abs(moti.x - s.x) < 60) { texts.push({ x: moti.x, y: moti.y - 30, s: "Moti sees him off!", t: 90 }); endEvent(); break; }
      if (Math.abs(p.x - s.x) < 12 && !(s.bit > s.t)) { s.bit = s.t + 60; damage(p, 3, p); setState(p, "hurt", 14); texts.push({ x: p.x, y: p.y - 60, s: "Grr! Woof!", t: 40 }); } if (s.t > 600) endEvent(); break;
    case "monkey": if (!s.stole && s.t > 60) { const v = alivePlayers().find((q) => q.weapon); if (v) { s.stole = v.weapon.kind; v.weapon = null; texts.push({ x: v.x, y: v.y - 70, s: "A monkey snatches your " + (s.stole === "pipe" ? "lathi" : s.stole) + "!", t: 100 }); } }
      if (s.stole && Math.abs(p.x - s.x) < 24 && tapped(p.pi, "use") && money() >= 10) { progress.money -= 10; p.weapon = { kind: s.stole, uses: 6 }; texts.push({ x: p.x, y: p.y - 70, s: "A banana for the monkey; your weapon back", t: 100 }); endEvent(); } else if (s.t > 2000) endEvent(); break;
    case "downpour": endEvent(); break;
  }
}
function endEvent() { if (ev && ev.id === "surveyors") for (const e of ev.st.men) if (!DOWN_STATES.includes(e.st)) e.surveyor = false; ev = null; }
function eventLabel(p) {
  if (!ev || ev.street !== street.id) return null; const s = ev.st;
  if (ev.id === "uncle" && !s.on && Math.abs(p.x - s.x) < 22) return { label: "Arm-wrestle the uncle", x: s.x, y: Y0 - 50, act: () => {} };
  if (ev.id === "deal" && Math.abs(p.x - s.x) < 20) return { label: "\"Today only!\" A lathi for " + rupees(80), x: s.x, y: Y0 - 50, act: () => {} };
  if (ev.id === "lostChild" && !s.with && Math.abs(p.x - s.kid.x) < 18) return { label: "Help the lost child", x: s.kid.x, y: Y0 - 50, act: () => {} };
  if (ev.id === "monkey" && s.stole && Math.abs(p.x - s.x) < 24) return { label: "Offer the monkey a banana (" + rupees(10) + ")", x: s.x, y: s.y + 30, act: () => {} };
  return null;
}
function drawEvent(P) {
  if (!ev || ev.street !== street.id) return; const s = ev.st, X = (wx) => Math.round(wx - cam);
  if (ev.id === "pickpocket") drawCiv(s.thief, P);
  if (ev.id === "van" && s.victim && !s.victim.taken) drawCiv(s.victim, P);
  if (ev.id === "cow") sprAt("cow", X(s.x), Y1 - 6, false, 0.5);
  if (ev.id === "baraat") for (let k = 0; k < 5; k++) drawCiv({ civ: true, look: ["civ_a", "civ_c", "civ_d", "civ_e", "civ_i"][k], base: 0, x: s.x + k * 22, y: Y0 + 10 + (k % 2) * 8, face: -1, st: "walk", walkPh: frameNo * 0.15 + k }, P);
  if (ev.id === "shoot") { const x = X(s.x); R(x - 2, Y0 - 30, 4, 30, "#2a2622"); R(x - 10, Y0 - 38, 20, 10, "#1d1b18"); R(x + 10, Y0 - 35, 6, 4, "#3a3632"); text("SHOOT IN PROGRESS: STAND STILL TO BE AN EXTRA", x, Y0 - 44, 4, "#f2c230"); }
  if (ev.id === "ball") { const x = X(s.x); R(x - 1, Y1 - 10 - s.z, 3, 3, "#c0392b"); g.fillStyle = "rgba(0,0,0,0.2)"; g.beginPath(); g.ellipse(x, Y1 - 6, 3, 1, 0, 0, 7); g.fill(); }
  if (ev.id === "uncle") drawCiv({ civ: true, look: "civ_c", base: 0, x: s.x, y: Y0 + 10, face: -1, st: "stand", walkPh: 0 }, P);
  if (ev.id === "deal") drawCiv({ civ: true, look: "civ_g", base: 0, x: s.x, y: Y0 + 10, face: -1, st: "stand", walkPh: 0 }, P);
  if (ev.id === "lostChild") { drawCiv(s.kid, P); if (s.with) drawCiv({ civ: true, look: "civ_a", base: 0, x: s.parentX, y: Y0 + 10, face: -1, st: "stand", walkPh: 0 }, P); }
  if (ev.id === "dog") drawCiv({ civ: true, look: "civ_g", base: 4, x: s.x, y: Y1 - 8, face: Math.sign(players[0].x - s.x) || 1, st: "flee", walkPh: frameNo * 0.3 }, P);
  if (ev.id === "monkey") { const x = X(s.x); R(x - 4, s.y, 8, 8, "#7a5a3a"); R(x - 2, s.y - 4, 5, 5, "#a8805a"); R(x + 4, s.y + 6, 6, 1, "#7a5a3a"); }
}
// the power cut darkens the whole street
function drawPowerCut() { if (ev && ev.id === "powercut" && ev.street === street.id) { g.setTransform(SCALE, 0, 0, SCALE, 0, 0); g.globalAlpha = 0.45; R(0, 0, LW, LH, "#04040a"); g.globalAlpha = 1; } }

/* ---------- hooks ---------- */
function updateLiving() { updateFestival(); updateNemesis(); updateEvents(); }
function livingTarget(p) { return paperTarget(p) || eventLabel(p); }
function drawLiving(P) { drawFestival(P); drawEvent(P); drawNemesis(); }
