/* Rollback City: game flow and the main update.
   A plain script that shares globals with the others; index.html loads them in order. */
"use strict";

/* ---------- flow ---------- */
function join(i, mid) {
  const k1 = pick1 || "rai", kind = i ? (k1 === "kai" ? "rai" : "kai") : k1;
  const p = fighter(kind, cam + 50 + i * 24, i ? 192 : 172, "p");
  fighterArt(SHEET_OF[kind]); fighterArt(SHEET_OF[kind] + "Lathi");
  p.pi = i; p.inv = 90; applyStats(p); if (EASY) p.lives = 5; if (KINDS[kind].guest) p.lives = 1; players[i] = p;
  if (mid) { startPlayers = 2; texts.push({ x: p.x, y: p.y - 64, s: KINDS[kind].name + " joins", t: 70 }); if (!joinedOnce) { joinedOnce = true; playScene("join", () => {}); } }
}
const alivePlayers = () => players.filter((p) => p && p.lives > 0 && p.st !== "out");

const totalScore = () => players.reduce((s, p) => s + (p ? p.score : 0), 0);

// knocked out outside a mission: the score, and Get back up where you fell
function endGame() {
  state = "end";
  const score = totalScore(), secs = Math.round((performance.now() - runStart) / 1000);
  let best = 0; try { best = +localStorage.getItem("city:best") || 0; } catch (e) { /* ignore */ }
  if (score > best) { try { localStorage.setItem("city:best", String(score)); } catch (e) { /* ignore */ } }
  $("end-title").textContent = "Knocked out on " + street.name;
  $("end-result").textContent = "Score " + score.toLocaleString() + ", " + Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
  $("end-note").textContent = score > best ? "New best on this device." : "Best on this device: " + best.toLocaleString() + ".";
  $("continue").hidden = false; $("continue").textContent = "Get back up";
  showCard("card-end", "continue");
  Arcade.tone(160, 0.6, "sawtooth", 0.05, -90);
}

/* ---------- main update ---------- */
function update() {
  frameNo++;
  if (state === "story") { storyUpdate(); return; }
  // the title screen: the camera drifts slowly to and fro outside the dhaba
  if (state === "menu") cam = camClamp(START_AT.x + 60 - LW / 2 + Math.sin(frameNo / 1400) * 110);
  if (state === "play" && countdown > 0) { countdown--; down.clear(); pressed.clear(); return; }
  if (state !== "play" || paused) { pressed.clear(); return; }
  if (walkIn) { stepWalkIn(); pressed.clear(); return; }
  if (wipe) { updateWipe(); pressed.clear(); return; }
  if (rewinding) { stepRewind(); pressed.clear(); return; }
  if (hitStop > 0) { hitStop--; frameNo--; if (shake > 0) shake *= 0.85; return; }   // a blow lands: everything holds for a beat, the clock too, so input windows keep their length (presses carry over)
  updateRewind();
  updateStreet();

  for (const p of players) if (p) updatePlayer(p);
  for (const e of enemies) updateEnemy(e);
  for (const f of enemies.concat(players.filter(Boolean))) physics(f);
  updateShots();
  resolveHits();
  updateItems();
  updateStageFx();

  const ap = alivePlayers();
  followCamera(ap);
  for (const p of players) if (p) p.x = clamp(p.x, 10, street.w - 10);
  if (street.gaps) roofEdges();
  if (arena && arena.belts) moveBelts();
  cam = camClamp(cam);

  if (goT > 0) goT--;
  if (banner && banner.t > 0) banner.t--;
  if (shake > 0) shake *= 0.85;
  fx = fx.filter((f) => --f.t > 0);
  texts = texts.filter((f) => --f.t > 0);
  if (players.every((p) => !p || p.lives <= 0)) { if (mission) failMission("Knocked out"); else if (heat() && players.some((p) => p && p.lastBy && isCop(p.lastBy))) arrest(); else if (hasMoney()) wakeAtClinic(); else endGame(); }
  pressed.clear();
}

/* ---------- the open world ---------- */
const WIPE = 28;   // frames of the wipe between streets; the street changes halfway
let jCool = 0;     // frames before a junction can be taken again after arriving
function startCity(n, at, save) {
  wipe = null; walkIn = null; saveT = 0; savedT = 0; mission = null;
  if (!at) { playFrames = 0; progress = { done: [], flags: {}, clock: { day: 1, min: 0 }, ngplus: ngNext }; ngNext = false; rewinds = 0; }
  blackT = 0;
  if (!at) for (const id in WORLD.streets) for (const a of WORLD.streets[id].arenas || []) a.done = false;
  startPlayers = n; players = [];
  if (typeof scene !== "undefined" && scene) { scene = null; $("stage-wrap").classList.remove("story"); }
  join(0); if (n === 2) { join(1); joinedOnce = true; }
  if (save) restorePlayers(save);
  state = "play"; paused = false; runStart = performance.now();
  countdown = TOUCH && Arcade.isFullscreen() ? 180 : 0;
  { const pb = document.querySelector(".pad .pause-btn"); if (pb) pb.textContent = "Pause"; }
  showCard(null);
  const to = at || START_AT;
  loadStreet(to.street, to.x, at && at.y);
  banner = { text: street.name, t: 150, big: true };
  if (!at && (openNext || exploreNext)) openCity();   // the "Open city" start: Act 1 already behind you
  else if (!at) { saveGame(true); startMission("1-1"); }
  Arcade.tone(392, 0.1, "square", 0.05); setTimeout(() => Arcade.tone(587, 0.16, "square", 0.05), 110);
}
// put everyone on a street at x (and depth y), keeping their health, lives and weapons
function loadStreet(id, x, y) {
  placeHub();
  street = WORLD.streets[id]; stageIdx = Math.min(3, (street.tier || 0) + (clockRuns() ? 1 : 0));   // the day city is a step up from the night
  arena = null; queue = []; hitStop = 0;
  streetArt(street); rwBuf = []; rewinding = null; bridge = null; bridgeT = 240;
  enemies = []; items = []; fx = []; texts = []; shots = []; lastHit = null; bossRef = null; train = null; spray = []; wallCount = 0; posterUsed = false;
  barrels = (street.barrels || []).map(([bx, by, drop, kind = "barrel"]) => ({ x: bx, y: by, drop, kind, hp: kind === "barrel" ? 2 : 3, shake: 0 }));
  // one of Nani's four letters is hidden in a barrel in each Act 1 area
  if (street.letter && !lettersFound().includes(street.letter[0])) barrels.push({ x: street.letter[1], y: street.letter[2], drop: "letter", kind: "barrel", hp: 2, shake: 0, letter: street.letter[0] });
  cat = street.cat ? { x: street.cat, y: 151, st: "sit", t: 0 } : null; pigeons = null;
  setupCarts(); setupNpcs(); jeep = null; auto = null; convoy = null; helmetChecked = null; bout = null; ringFight = null; raid = null;
  // street life: the first goonda turns up a couple of seconds in, and a few people are about
  spawnT = 120; civT = 200; civs = [];
  for (let n = 0; n < crowd(street.civs || 0) - 1; n++) civs.push(makeCiv(rand(40, street.w - 40)));
  if (street.duck) y = Y0 + 24;   // standing on the train roof, in a line
  players.forEach((p, i) => { if (!p) return; Object.assign(p, { fade: 0, x: clamp(x + (i ? 22 : 0), 20, street.w - 20), y: y !== undefined ? clamp(y + (i ? 10 : 0), Y0, Y1) : (i ? 192 : 172), z: 0, vz: 0, vx: 0, st: p.lives > 0 ? "idle" : "out", hold: null, airAtk: null, pushT: 0, inv: Math.max(p.inv, 40) }); });
  cam = camClamp(x - LW / 2);
  setupRides();
  placeCompanions();
}
// the camera never shows past a street's ends; a room narrower than the view sits in the middle
const camClamp = (c) => (worldEnd() <= LW ? (worldEnd() - LW) / 2 : clamp(c, 0, worldEnd() - LW));
function updateStreet() {
  const ap = alivePlayers();
  autosave(); tickClock(); tickWeather(); updateTraffic(); updatePhone(); updateHeat(); updateCarts(); updateRides(); updateRadio(); updateBikers(); updateCompanions(); updateMinigames(); updateSideLines(); updateMonsoon(); updateAct3(); updateSide2(); updateConvoy(); helmetCheck(); updateIce(); seaSeats(); updateBout(); updateRing(); updateTurf(); updateLiving(); updateGallery(); updateAccess();
  findTargets(ap);
  for (const p of ap) if (p.target && tapped(p.pi, "use")) { p.target.act(p); if (wipe) return; }
  updateMission();
  if (state !== "play" || wipe) return;
  if (arena) {
    const a = arena.a;
    while (arena.queue.length && enemies.filter((e) => e.st !== "dead").length < 3) { const e = spawn(arena.queue.shift()); if (a.onSpawn) a.onSpawn(e, arena.n); arena.n++; }
    // a boss calls in help as his health falls
    if (a.belts && bossRef && !arena.belts && bossRef.hp < bossRef.max * 0.5) { arena.belts = true; banner = { text: "The looms speed up!", t: 110 }; shake = 6; Arcade.noise(0.4, 0.1); }
    if (a.adds && bossRef && arena.added < a.adds.length && bossRef.hp < bossRef.max * a.adds[arena.added][0]) { arena.queue.push(...a.adds[arena.added][1]); arena.added++; }
    const dying = players.some((p) => p && p.lives > 0 && p.hp <= 0);
    if (!arena.queue.length && !enemies.some((e) => e.st !== "dead" && e.st !== "flee" && !e.ally && !(e.roam && !e.aggro)) && !dying) {
      if (++arena.wave < arena.a.waves.length) arena.queue = arena.a.waves[arena.wave].slice();
      else { arena.a.done = true; arena = null; goT = 120; Arcade.tone(880, 0.08); setTimeout(() => Arcade.tone(880, 0.08), 160); }
    }
    return;
  }
  updateSpawner(); updateCivs();
  for (const a of street.arenas || []) if (!a.done && ap.some((p) => Math.abs(p.x - a.x) < 30)) { startArena(a); return; }
  if (jCool > 0) { jCool--; return; }
  // junctions: push into an alley or gate at the back of the band (up), or towards the viewer (down)
  for (const p of ap) {
    const shut = (street.junctions || []).find((j) => (!isOpen(j) || roadblock()) && Math.abs(p.x - j.x) < JUNCTION_W && (j.dir === "up" ? held(p.pi, "up") && p.y <= Y0 + 1 : held(p.pi, "down") && p.y >= Y1 - 1));
    if (shut && frameNo % 90 === 0) texts.push({ x: p.x, y: p.y - 70, s: roadblock() ? "Police roadblock" : shut.shut || "Not yet", t: 80 });
    const j = !roadblock() && (street.junctions || []).find((j) => isOpen(j) && Math.abs(p.x - j.x) < JUNCTION_W && (j.dir === "up" ? held(p.pi, "up") && p.y <= Y0 + 1 : held(p.pi, "down") && p.y >= Y1 - 1));
    if (j && (p.st === "idle" || p.st === "walk" || (p.st === "ride" && p.ride.rider === p))) { if (++p.pushT > 8) { travel(j); return; } }
    else p.pushT = 0;
  }
}
// a scripted fight: the camera settles on it and holds until every wave is down; street goondas
// not already fighting clear off, and those who are count towards the arena's three at a time
function startArena(a) {
  arena = { a, wave: 0, queue: a.waves[0].slice(), n: 0, added: 0 };
  for (const k of [].concat(...a.waves, ...(a.adds || []).map((x) => x[1]))) fighterArt(SHEET_OF[k]);
  for (const e of enemies) if (e.roam && !e.aggro && !e.ally && !DOWN_STATES.includes(e.st)) setState(e, "flee");   // (allies stay to fight)
  if (a.name) banner = { text: a.name, t: 110 };
  goT = 0;
  Arcade.tone(220, 0.12, "square", 0.05);
}
// Interact (DESIGN 2.3): what each player could use right now, shown as a prompt over it. A weapon
// at their feet, then a door or a notice at the back of the band. Nothing in reach, no prompt.
function findTargets(ap) {
  for (const p of players) if (p) p.target = null;
  for (const p of ap) {
    // from Rani's seat you can still take a fare (talk steps only)
    if (p.st === "ride" && p.ride && p.ride.kind === "rani" && mission && (mission.def.steps[mission.i] || {}).talk) { const m = missionTarget(p); if (m) p.target = { ...m, act: (q) => { q.mountF = frameNo; m.act(q); } }; continue; }
    if (!(p.st === "idle" || p.st === "walk" || p.st === "run")) continue;
    const back = p.y < Y0 + 18;
    const it = !p.weapon && !p.avatarT && items.find((it) => (it.kind === "pipe" || it.kind === "knife") && it.z === 0 && Math.abs(it.x - p.x) < 16 && Math.abs(it.y - p.y) < 9);
    if (it) { p.target = { label: "Pick up", x: it.x, y: it.y - 20, act: (q) => takeWeapon(q, it) }; continue; }
    const m = missionTarget(p); if (m) { p.target = m; continue; }
    const z = !arena && street.wires && zipTarget(p); if (z) { p.target = z; continue; }
    const rd = !arena && !street.water && rides.length && rideTarget(p); if (rd) { p.target = rd; continue; }
    const fy = back && ferryTarget(p); if (fy) { p.target = fy; continue; }
    const hid = hideoutTarget(p); if (hid) { p.target = hid; continue; }
    const evl = !arena && eventLabel(p); if (evl) { p.target = evl; continue; }   // street events answer Use anywhere on the road, so their prompt (and the pad's Use) must too
    const cut = clockRuns() && back && (street.props || []).find((pr) => pr.kind === "netacutout" && Math.abs(pr.x - p.x) < 20 && !flag("moustache:" + street.id + ":" + pr.x));
    if (cut) { p.target = { label: "Draw a moustache on Netaji", x: cut.x, y: Y0 - 62, act: () => { progress.flags["moustache:" + street.id + ":" + cut.x] = true; changeRespect(2); sayAt(cut.x, Y0 - 70, "The lane will talk about this for a week"); if (convoy) crime(1, cut.x, "police"); } }; continue; }
    const cp = back && !arena && companionTarget(p); if (cp) { p.target = cp; continue; }
    const tk = (street.talk || street.train) && back && talkTarget(p); if (tk) { p.target = tk; continue; }
    const tea = hasHeat() && back && !arena && teaTarget(p); if (tea) { p.target = tea; continue; }
    const pco = hasPhone() && back && (street.props || []).find((pr) => pr.kind === "pco" && Math.abs(pr.x - p.x) < 18);
    if (pco) { p.target = { label: "Use the PCO", x: pco.x, y: Y0 - 62, act: usePco }; continue; }
    const ash = back && ashTarget(p); if (ash) { p.target = ash; continue; }
    const d = !arena && back && !onFire() && (street.doors || []).concat(street.links || []).find((d) => isOpen(d) && Math.abs(d.x - p.x) < 18);
    const late = !d && back && (street.doors || []).concat(street.links || []).find((d) => d.hours && (!d.needs || progress.done.includes(d.needs)) && !isOpen(d) && Math.abs(d.x - p.x) < 18);
    if (late) { p.target = { label: "Open " + hoursText(late.hours), x: late.x, y: Y0 - 52, act: () => {} }; continue; }
    if (d && d.shop && !shopsOpen()) { p.target = { label: "Shut till 9 am", x: d.x, y: Y0 - 52, act: () => {} }; continue; }
    if (d) { p.target = { label: d.verb || (street.interior ? "Leave" : "Enter"), x: d.x, y: Y0 - 52, act: () => enterDoor(d) }; continue; }
    if (street.shop && back && Math.abs(p.x - 150) < 40 && p.pi === 0) { p.target = { label: "Buy", x: 150, y: Y0 - 50, act: openShop }; continue; }
    const sw = street.swap && p.pi === 0 && back && Math.abs(street.swap.x - p.x) < 24;
    if (sw) { p.target = { label: "Who goes out tonight?", x: street.swap.x, y: Y0 - 50, act: swapFighter }; continue; }
    const sl = street.bed && clockRuns() && back && Math.abs(street.bed - p.x) < 22 && !mission;
    if (sl && heat()) { p.target = { label: "Not with the police looking for you", x: street.bed, y: Y0 - 50, act: () => {} }; continue; }
    if (sl) { p.target = { label: isNight() || hour() < 7 ? "Sleep till morning" : "Rest till evening", x: street.bed, y: Y0 - 50, act: sleep }; continue; }
    const b = street.board;
    const tin = back && tinTarget(p); if (tin) { p.target = tin; continue; }
    if (b && back && Math.abs(b.x - p.x) < 28) p.target = { label: "Read", x: b.x, y: Y0 - 58, act: () => showNote(typeof b.text === "function" ? b.text() : b.text) };
  }
}
function takeWeapon(p, it) { const i = items.indexOf(it); if (i < 0) return; items.splice(i, 1); p.weapon = { kind: it.kind, uses: 8 }; setState(p, "pickup", 10); p.target = null; Arcade.tone(700, 0.06); }
// into a gali or round a corner: first you walk into it (fading into the lane's shadow), then the wipe;
// anyone riding just rides through
let walkIn = null;
function travel(j) {
  down.clear(); Arcade.tone(520, 0.06, "triangle", 0.04);
  if ((j.dir === "up" || j.dir === "down") && !players.some((p) => p && p.ride)) { walkIn = { j, t: 0 }; return; }
  wipe = { t: 0, j };
}
function stepWalkIn() {
  const w = walkIn, d = w.j.dir === "up" ? -1 : 1;
  for (const p of alivePlayers()) {
    const dx = clamp(w.j.x - p.x, -1.4, 1.4); p.x += dx; p.y += d * 0.9;
    if (Math.abs(dx) > 0.3) p.face = Math.sign(dx);
    setState(p, "walk", p.t + 1); p.walkPh += 1.4 * STRIDE; p.fade = Math.min(1, w.t / 22);
  }
  if (++w.t >= 24) { walkIn = null; wipe = { t: 0, j: w.j }; }
}
// a scripted trip to anywhere (a mission's ride), through the same wipe
function travelTo(id, x, y) { wipe = { t: 0, to: { street: id, x, y } }; down.clear(); }
function enterDoor(d) { wipe = { t: 0, door: d }; down.clear(); Arcade.tone(620, 0.05, "triangle", 0.04); setTimeout(() => Arcade.tone(820, 0.06, "triangle", 0.04), 70); }
function updateWipe() {
  if (++wipe.t === WIPE / 2) {
    const from = street.id;
    if (wipe.to) loadStreet(wipe.to.street, wipe.to.x, wipe.to.y);
    else if (wipe.door) { const back = doorBack(from, wipe.door.to); loadStreet(wipe.door.to, back.x, Y0 + 8); }
    else { const back = junctionBack(from, wipe.j.to); loadStreet(wipe.j.to, back.x, back.dir === "up" ? Y0 + 2 : Y1 - 8); }
    banner = { text: street.name, t: 110 }; jCool = 40;
    if (street.savePoint) saveGame();
  }
  if (wipe.t >= WIPE) wipe = null;
}
// free camera: follows the players with a dead zone in the middle, and never shows past a street's
// ends; an arena holds it on the fight
function followCamera(ap) {
  if (street.w <= LW) { cam = camClamp(0); return; }
  if (arena) { const t = camClamp(arena.a.x - LW / 2); cam += (t - cam) * 0.15; if (Math.abs(t - cam) < 0.5) cam = t; return; }
  if (!ap.length) return;
  const mid = ap.reduce((s, p) => s + p.x, 0) / ap.length, dz = LW * 0.1, c = cam + LW / 2;
  const want = mid > c + dz ? mid - dz - LW / 2 : mid < c - dz ? mid + dz - LW / 2 : cam;
  cam += (want - cam) * 0.12;
}

function spawn(kind) {
  const fromLeft = !KINDS[kind].boss && Math.random() < 0.3 && cam > 0;
  const e = fighter(kind, fromLeft ? cam - 24 : cam + LW + 24, rand(Y0 + 6, Y1 - 4), "e");
  e.face = fromLeft ? 1 : -1;
  if (street.duck) e.y = rand(Y0 + 20, Y1 - 6);   // the roof is narrow
  // on the roofs a goonda turns up on the players' side of any gap, not stranded across it
  const p0 = alivePlayers()[0], gp = p0 && street.gaps && gapBetween(e.x, p0.x);
  if (gp) { e.x = p0.x > gp[1] ? gp[1] + 4 : gp[0] - 4; e.face = Math.sign(p0.x - e.x) || 1; }
  if (KINDS[kind].boss) { bossRef = e; e.cool = 90; e.x = cam + LW - 40; if (storyOn && !(players[0] && players[0].kind === UNLOCK_BY[kind])) playScene("boss" + kind, () => {}); }
  enemies.push(e);
  return e;
}

// "flee": a knocked-out street goonda running off, out of the fight
const DOWN_STATES = ["fly", "lying", "getup", "dead", "out", "thrown", "flee"];
const busy = (f) => ["hurt", "grabbed"].concat(DOWN_STATES).includes(f.st);
function setState(f, st, t = 0) { f.st = st; f.t = t; }

/* ---------- street life ---------- */
// Each street's spawn rule (world.js) says who roams it, how many at once and how often one turns
// up. Later the rule also depends on turf and heat; for now it is always night (Act 1, 11:58).
let spawnT = 0, civT = 0;
const timeOfDay = () => (isNight() ? "night" : "day");
// a spot just off screen, ahead of the players more often than behind, and inside the street
function offscreenX(margin) {
  const ap = alivePlayers(), ahead = ap.reduce((s, p) => s + p.face, 0) >= 0 ? 1 : -1;
  const sides = Math.random() < 0.65 ? [ahead, -ahead] : [-ahead, ahead];
  for (const d of sides) { const x = d > 0 ? cam + LW + margin : cam - margin; if (x > 20 && x < street.w - 20) return x; }
  return null;
}
function updateSpawner() {
  const sp = street.spawn; if (!sp || street.interior || minigameOn() || progress.mode1987 || progress.explore || goonsSetting() === 2) return;   // (Explore mode: no roaming goondas)
  // after 2-5 Kaal Security walks the lane and Bunder Road by day
  const kaal = flag("kaalPatrols") && !isNight() && ["chandni", "harbour"].includes(street.district);
  if (sp.when && sp.when !== timeOfDay() && !kaal) return;
  // exploring should feel like a city, not a gauntlet: at most two roaming goondas at a time, one group
  // at a time (none while one is already after you), and longer gaps between them
  const roamers = enemies.filter((e) => e.roam && !e.gone && !isCop(e) && !e.ally);
  if (--spawnT > 0 || roamers.length >= (turfWon(street.district) || goonsSetting() === 1 ? 1 : Math.min(2, sp.cap)) || roamers.some((e) => e.aggro)) return;
  spawnT = Math.round(sp.every * (goonsSetting() === 1 ? 3 : 1.6) * rand(0.8, 1.3));
  const x = offscreenX(40); if (x === null) return;
  const e = fighter((kaal && sp.when === "night") || turfWon(street.district) ? "kaal" : pick(sp.kinds), x, rand(Y0 + 6, Y1 - 4), "e");   // in a won district only Kaal's men still come
  Object.assign(e, { roam: true, face: x < cam ? 1 : -1, wx: clamp(cam + LW / 2 + rand(-120, 120), 20, street.w - 20), wt: 0, cool: 60 });
  enemies.push(e);
}
// Passers-by: eight townsfolk, two to a sheet (fighters.js). They stroll, stop, stroll on, and run
// from any fight near them, out of the street. Until a sheet loads, a goonda's walk stands in,
// tinted one plain colour.
const CIV_LOOKS = [["civ_a", 0, "grunt", "#d8a560"], ["civ_a", 4, "grunt", "#efe6d2"], ["civ_b", 0, "kicker", "#cf9aa4"], ["civ_b", 4, "thrower", "#9fb6cc"],
  ["civ_c", 0, "grunt", "#b7c79a"], ["civ_c", 4, "thrower", "#9fb6cc"], ["civ_d", 0, "kicker", "#efe6d2"], ["civ_d", 4, "grunt", "#a9a299"]];
function makeCiv(x) {
  if (street.theme === "seafront" && Math.random() < 0.5) { const b = Math.random() < 0.5 ? 0 : 4; return { civ: true, look: "civ_h", base: b, sheet: "grunt", tint: "#efe6d2", x, y: rand(Y0 + 2, Y1 - 2), face: Math.random() < 0.5 ? -1 : 1, st: "walk", walkPh: rand(0, 6), speed: rand(0.4, 0.6), wx: clamp(x + rand(-300, 300), 20, street.w - 20), wait: 0 }; }
  if (inMandi() && rushHour() && Math.random() < 0.3) return makePorter(x);
  const [look, base, sheet, tint] = pick(CIV_LOOKS);
  return { civ: true, look, base, sheet, tint, x, y: rand(Y0 + 2, Y1 - 2), face: Math.random() < 0.5 ? -1 : 1, st: "walk", walkPh: rand(0, 6), speed: rand(0.45, 0.7), wx: clamp(x + rand(-300, 300), 20, street.w - 20), wait: 0 };
}
// where the nearest fight is to a passer-by at x, or null
function fightNear(x) {
  for (const e of enemies) if ((e.aggro || !e.roam) && !DOWN_STATES.includes(e.st) && Math.abs(e.x - x) < 150) return e.x;
  for (const p of players) if (p && (activeAtk(p) || p.st === "hurt") && Math.abs(p.x - x) < 130) return p.x;
  return null;
}
function updateCivs() {
  for (const c of civs) {
    const fightX = c.st === "flee" ? null : fightNear(c.x);
    if (fightX !== null) { c.st = "flee"; c.face = Math.sign(c.x - fightX) || 1; if (Math.random() < 0.4) texts.push({ x: c.x, y: c.y - 56, s: pick(["Bachao!", "Bhaago!", "Arre baap re!"]), t: 45 }); }
    if (c.st === "flee") { c.x += c.face * 2.3; c.walkPh += 2.3 * STRIDE; if (c.x < cam - 60 || c.x > cam + LW + 60 || c.x < 6 || c.x > street.w - 6) c.gone = true; continue; }
    if (c.wait > 0) { c.wait--; c.st = "stand"; continue; }
    const dx = c.wx - c.x;
    if (Math.abs(dx) < 2) { c.wait = rand(60, 240); c.wx = clamp(c.x + rand(-300, 300), 20, street.w - 20); continue; }
    c.st = "walk"; c.face = Math.sign(dx); c.x += c.face * c.speed; c.walkPh += c.speed * STRIDE * 1.1;
  }
  if (civs.some((c) => c.gone)) civs = civs.filter((c) => !c.gone);
  if (civs.length < crowd(street.civs || 0) && --civT <= 0) { civT = Math.round(rand(240, 480)); const x = offscreenX(50); if (x !== null) civs.push(makeCiv(x)); }
}

/* ---------- the rooftops ---------- */
const inGap = (x) => street.gaps && street.gaps.find((g0) => x > g0[0] && x < g0[1]);
// Walk off a roof and you fall to the lane below (and so does everyone, through the wipe); anyone
// knocked or thrown over a gap lands on its edge instead, and goondas never step into one.
function roofEdges() {
  for (const f of players.concat(enemies)) {
    if (!f || f.z > 0 || f.st === "zip" || DOWN_STATES.includes(f.st) && f.st !== "lying") continue;
    const g0 = inGap(f.x); if (!g0) continue;
    if (f.team === "p" && (f.st === "walk" || f.st === "run" || f.st === "idle") && !wipe && !arena) {
      f.hp = Math.max(1, f.hp - 12); texts.push({ x: f.x, y: f.y - 70, s: KINDS[f.kind].name + " fell!", t: 80 });
      travelTo(street.below, clamp(f.x, 20, WORLD.streets[street.below].w - 20), Y1 - 10); Arcade.noise(0.3, 0.1); return;
    }
    // out of the gap, on the side where the fight is (for a goonda, the nearest player's side)
    const near = f.team === "e" && alivePlayers().reduce((a, q) => (!a || Math.abs(q.x - f.x) < Math.abs(a.x - f.x) ? q : a), null);
    const right = near ? near.x > (g0[0] + g0[1]) / 2 : f.x - g0[0] > g0[1] - f.x;
    f.x = right ? g0[1] + 2 : g0[0] - 2;
  }
}
// a gap lying between two points on this street, if any
const gapBetween = (a, b) => street.gaps && street.gaps.find((g0) => g0[1] > Math.min(a, b) && g0[0] < Math.max(a, b));
// the kite wire: grab it at the pole and slide across, hanging, to the far side
function zipTarget(p) {
  const w = (street.wires || []).find((w) => Math.abs(p.x - w.x0) < 16 || Math.abs(p.x - w.x1) < 16);
  if (!w) return null;
  const from = Math.abs(p.x - w.x0) < 16 ? w.x0 : w.x1, to = from === w.x0 ? w.x1 : w.x0;
  return { label: "Grab the kite wire", x: from, y: Y0 - 60, act: (q) => { setState(q, "zip"); q.zipTo = to; q.face = Math.sign(to - from); q.z = 34; q.vz = 0; Arcade.tone(900, 0.3, "triangle", 0.03, -500); } };
}
function updateZip(p) {
  p.x += p.face * 3.2; p.z = 34; p.vz = 0;
  if ((p.zipTo - p.x) * p.face <= 0) {
    p.x = p.zipTo + p.face * 6; setState(p, "air"); p.airAtk = null; p.vx = p.face; p.z = 20;
    // in co-op the other player comes across the same wire, rather than both being held apart by the screen
    for (const q of alivePlayers()) if (q !== p && (q.x - p.x) * p.face < -40) { q.x = p.x + p.face * 14; q.y = p.y; setState(q, "air"); q.z = 20; q.vx = p.face; q.airAtk = null; }
  }
}
// the two belts carry anyone standing on them, one way and the other
function moveBelts() {
  for (const f of players.concat(enemies)) if (f && f.z === 0 && f.st !== "dead" && f.st !== "out") { if (f.y >= 158 && f.y < 172) f.x += 1.1; else if (f.y >= 184 && f.y < 198) f.x -= 1.1; }
}

/* ---------- who goes out ---------- */
// Rai and Kai, and Raghav and Cheel once they have come over to Nani's side (DESIGN 4.1)
function fighterChoices() {
  const have = rosterUnlocked(), list = ["rai", "kai"];
  if (progress.done.includes("1-3") && have.includes("pRook")) list.push("pRook");
  if (progress.done.includes("1-4") && have.includes("pCrane")) list.push("pCrane");
  return list;
}
// at the dhaba's tables: the next fighter takes player 1's place (and the sibling player 2's)
function swapFighter() {
  const list = fighterChoices(), next = list[(list.indexOf(players[0].kind) + 1) % list.length];
  pick1 = next; try { localStorage.setItem("city:fighter", next); } catch (e) { /* ignore */ }
  // the new fighter is as fresh (or as hurt) as the one they replace: no free heal at the tables
  players.forEach((old, i) => { if (!old) return; join(i); const p = players[i]; Object.assign(p, { x: old.x, y: old.y, score: old.score, sp: old.sp, hp: Math.max(1, Math.round(p.max * old.hp / old.max)), lives: KINDS[p.kind].guest ? Math.min(1, old.lives) : old.lives }); if (p.lives <= 0) setState(p, "out"); });
  texts.push({ x: players[0].x, y: players[0].y - 70, s: KINDS[next].name + " goes out tonight", t: 90 });
  Arcade.tone(660, 0.08, "triangle", 0.05);
}

