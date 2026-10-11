/* Rollback Street: a side-scrolling beat 'em up in the style of the
   late-80s arcade brawlers, set in an Indian city. One or two players.

   Four stages (Chandni Lane, the Harbour Line, the rooftops, Chandni Mills), each with three
   blocks of enemy waves and a boss. The camera locks for each wave and
   says GO when the block is clear.

   Moves
   - Combos: punch, punch, punch (uppercut) or punch, punch, kick (spin
     heel kick); kick, kick (roundhouse).
   - Back elbow: hold away from where you face and punch.
   - Dash: double-tap a direction. Punch = shoulder tackle, kick = flying
     kick, jump = long jump.
   - Jump kick in the air. Grab a dazed enemy by walking into them:
     punch to knee, kick to throw.
   - Specials use the SP bar, which fills as you land hits:
     special (or punch + kick together) = rolling kick, 30 SP
     special in the air = cyclone kick, 25 SP
     down, forward, punch (or down + special) = rising dragon, 40 SP
   Everything is drawn in code at 384x216 and scaled 2x. Colours come
   from the site's theme tokens, so light and dark themes both work. */
"use strict";

const LW = 384, LH = 216, SCALE = 2, TICK = 1000 / 60;
const Y0 = 150, Y1 = 206, GRAV = 0.32, BS = 1.12;   // depth band, gravity, base body scale
const TOUCH = matchMedia("(pointer: coarse)").matches;
const canvas = document.getElementById("game"), g = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- stages ---------- */
const BLOCK_W = 440;
const STAGES = [
  { name: "Chandni Lane", theme: "street", blocks: [
    { name: "Chandni Lane", waves: [["grunt", "grunt"], ["grunt", "pipeGrunt"]] },
    { name: "Back Gali", waves: [["grunt", "grunt", "bruiser"], ["kicker", "grunt"]] },
    { name: "Mandi Gate", waves: [["bruiser", "kicker", "pipeGrunt"], ["grunt", "grunt", "grunt"]] },
    { boss: "ox", waves: [["ox"]], adds: [[0.5, ["grunt", "pipeGrunt"]]] }],
    barrels: [[420, 172, "food"], [720, 196, "pipe"], [1160, 170, "drink"], [319, 152, "food", "hydrant"], [831, 152, "oneup", "hydrant"], [1343, 152, "food", "hydrant"]] },
  { name: "Harbour Line", theme: "subway", blocks: [
    { name: "Ticket Hall", waves: [["grunt", "kicker"], ["thrower", "grunt", "grunt"]] },
    { name: "Platform 2", waves: [["bruiser", "kicker", "grunt"], ["thrower", "thrower", "grunt"]] },
    { name: "Service Tunnel", waves: [["kicker", "kicker", "pipeGrunt"], ["bruiser", "thrower", "grunt"]] },
    { boss: "rook", waves: [["rook"]], adds: [[0.5, ["kicker", "kicker"]]] }],
    barrels: [[300, 192, "knife"], [760, 165, "food"], [1180, 196, "drink"], [1030, 151, "drink", "vending"]] },
  { name: "Rooftops", theme: "roof", blocks: [
    { name: "Water Tanks", waves: [["kicker", "thrower", "grunt"], ["grunt", "grunt", "kicker"]] },
    { name: "Billboard", waves: [["bruiser", "bruiser", "thrower"], ["kicker", "pipeGrunt", "thrower"]] },
    { name: "Kite Ledge", waves: [["kicker", "kicker", "thrower"], ["bruiser", "grunt", "grunt"]] },
    { boss: "crane", waves: [["crane"]], adds: [[0.5, ["thrower", "thrower"]]] }],
    barrels: [[340, 170, "pipe"], [800, 194, "food"], [1220, 162, "drink"]] },
  { name: "Chandni Mills", theme: "factory", blocks: [
    { name: "Mill Gate", waves: [["bruiser", "kicker", "thrower"], ["grunt", "grunt", "pipeGrunt"]] },
    { name: "Loom Floor", waves: [["bruiser", "bruiser", "kicker"], ["thrower", "thrower", "kicker"]] },
    { name: "Boiler Hall", waves: [["kicker", "kicker", "thrower"], ["bruiser", "pipeGrunt", "kicker"]] },
    { name: "Control Room", waves: [["bruiser", "bruiser", "thrower"], ["kicker", "kicker", "kicker"]] },
    { boss: "rollback", waves: [["rollback"]], adds: [[0.66, ["kicker", "thrower"]], [0.33, ["bruiser", "pipeGrunt"]]] }],
    barrels: [[330, 196, "knife"], [760, 162, "food"], [1200, 190, "drink"], [1620, 170, "food"]] }
];

/* ---------- fighters ---------- */
const KINDS = {
  rai:       { hp: 70, speed: 1.35, scale: 1, name: "Rai" },
  nani:      { hp: 1, speed: 0, scale: 0.94, name: "Nani" },
  kai:       { hp: 70, speed: 1.35, scale: 1, name: "Kavya" },
  grunt:     { hp: 22, speed: 0.85, scale: 1, name: "Goonda", score: 100, windup: 14, cool: [50, 90], moves: ["ePunch", "ePunch", "eKick"] },
  pipeGrunt: { hp: 24, speed: 0.85, scale: 1, name: "Lathi", score: 150, windup: 16, cool: [60, 100], moves: ["ePunch", "eKick"], weapon: "pipe" },
  kicker:    { hp: 26, speed: 1.05, scale: 1, name: "Kicker", score: 200, windup: 12, cool: [45, 80], moves: ["eKick", "eKick", "ePunch"], fly: true },
  thrower:   { hp: 20, speed: 0.9, scale: 1, name: "Knife", score: 250, windup: 16, cool: [80, 120], moves: ["ePunch"], ranged: true },
  bruiser:   { hp: 46, speed: 0.65, scale: 1.18, name: "Bruiser", score: 300, windup: 20, cool: [70, 110], moves: ["heavy"] },
  ox:        { hp: 160, speed: 0.75, scale: 1.4, name: "Bhola the Ox", score: 2000, windup: 18, cool: [45, 80], moves: ["heavy", "heavy", "ePunch"], specials: ["charge"], poise: 26, boss: true },
  rook:      { hp: 150, speed: 1.25, scale: 1.1, name: "Raghav", score: 2500, windup: 12, cool: [35, 65], moves: ["eKick", "eKick", "ePunch"], specials: ["eRoll"], poise: 22, boss: true },
  crane:     { hp: 160, speed: 1.1, scale: 1.1, name: "Cheel", score: 3000, windup: 14, cool: [40, 70], moves: ["eKick", "ePunch"], specials: ["dive", "fan"], poise: 24, boss: true },
  // unlocked by beating each boss: same look, player-sized, with the boss's power on Special
  pOx:       { hp: 90, speed: 1.1, scale: 1.16, name: "Bhola", look: "ox", heavy: 2, sturdy: 5 },
  pRook:     { hp: 62, speed: 1.5, scale: 1.04, name: "Raghav", look: "rook" },
  pCrane:    { hp: 62, speed: 1.45, scale: 1.02, name: "Cheel", look: "crane", jump: 6.3 },
  pRollback: { hp: 96, speed: 1.0, scale: 1.2, name: "Ranjit", look: "rollback", heavy: 2, sturdy: 4 },
  rollback:  { hp: 260, speed: 0.8, scale: 1.45, name: "Mr. Rollback", score: 5000, windup: 16, cool: [40, 70], moves: ["heavy", "ePunch"], specials: ["charge", "pound", "fan"], poise: 30, boss: true }
};
// frames total, active window, reach, damage, knockdown; rearm = hit again every n frames
const ATK = {
  jab:      { len: 13, a0: 3, a1: 6, reach: 24, dmg: 4, sfx: 520, chain: true },
  jab2:     { len: 13, a0: 3, a1: 6, reach: 24, dmg: 4, sfx: 560, chain: true },
  upper:    { len: 24, a0: 6, a1: 10, reach: 24, dmg: 8, knock: true, lift: 5, sfx: 330 },
  spinheel: { len: 26, a0: 8, a1: 13, reach: 32, dmg: 9, knock: true, sfx: 300 },
  kick:     { len: 20, a0: 6, a1: 10, reach: 30, dmg: 6, sfx: 440, chain: true },
  round:    { len: 24, a0: 7, a1: 12, reach: 32, dmg: 8, knock: true, sfx: 360 },
  elbow:    { len: 16, a0: 3, a1: 7, reach: 24, dmg: 7, back: true, sfx: 280 },
  tackle:   { len: 22, a0: 2, a1: 16, reach: 22, dmg: 8, knock: true, move: 2.6, sfx: 240 },
  kroll:    { len: 40, a0: 3, a1: 37, reach: 26, dmg: 4, rearm: 8, knockAfter: 30, move: 3.4, sp: 25, sfx: 400 },
  roll:     { len: 36, a0: 3, a1: 33, reach: 26, dmg: 5, rearm: 8, knockAfter: 26, move: 3, sp: 30, sfx: 420 },
  pipe:     { len: 22, a0: 7, a1: 11, reach: 36, dmg: 9, knock: true, sfx: 260 },
  toss:     { len: 18, a0: 99, a1: 99, spawn: 7, sfx: 600 },
  knee:     { len: 16, a0: 5, a1: 8, reach: 20, dmg: 5, sfx: 300 },
  // airborne
  jkick:    { reach: 28, dmg: 8, knock: true, sfx: 380 },
  flykick:  { reach: 32, dmg: 10, knock: true, sfx: 340 },
  cyclone:  { reach: 28, dmg: 5, both: true, rearm: 8, knockAfter: 24, sp: 25, sfx: 460 },
  dragon:   { reach: 24, dmg: 18, knock: true, lift: 6, sp: 40, poiseBreak: true, sfx: 250 },
  // enemies
  flurry:   { len: 32, a0: 3, a1: 29, reach: 30, dmg: 3, rearm: 6, knockAfter: 26, move: 0.8, sp: 25, sfx: 520 },
  rush:     { len: 50, a0: 2, a1: 48, reach: 24, dmg: 10, knock: true, move: 3.2, sp: 30, sfx: 180 },
  quake:    { len: 40, a0: 99, a1: 99, spawn: 18, sp: 40, sfx: 120 },
  chakra:   { len: 18, a0: 99, a1: 99, spawn: 6, sfx: 700 },
  ePunch:   { len: 16, a0: 4, a1: 7, reach: 22, dmg: 5, sfx: 480 },
  eKick:    { len: 20, a0: 6, a1: 10, reach: 28, dmg: 6, sfx: 420 },
  heavy:    { len: 26, a0: 8, a1: 12, reach: 28, dmg: 9, knock: true, sfx: 220 },
  charge:   { len: 80, a0: 0, a1: 80, reach: 22, dmg: 11, knock: true, sfx: 180 },
  eRoll:    { len: 40, a0: 3, a1: 37, reach: 24, dmg: 5, rearm: 10, knockAfter: 30, move: 3.1, sfx: 400 },
  pound:    { len: 44, a0: 99, a1: 99, spawn: 20, sfx: 120 },
  fan:      { len: 26, a0: 99, a1: 99, spawn: 10, sfx: 640 },
  eToss:    { len: 22, a0: 99, a1: 99, spawn: 10, sfx: 640 },
  eFly:     { reach: 28, dmg: 7, knock: true, sfx: 380 },
  dive:     { reach: 26, dmg: 12, knock: true, sfx: 300 }
};
// what Special does for each fighter on the ground: [attack, SP cost, label]
const SPECIALS = { rai: ["roll", 30, "Rolling kick"], kai: ["flurry", 25, "Lightning kicks"], pOx: ["rush", 30, "Bull rush"], pRook: ["kroll", 25, "Kalari roll"], pCrane: ["dive", 25, "Kite dive"], pRollback: ["quake", 40, "Mill quake"] };
const ROSTER = [["rai", "Rai"], ["kai", "Kavya"], ["pOx", "Bhola"], ["pRook", "Raghav"], ["pCrane", "Cheel"], ["pRollback", "Ranjit"]];
const UNLOCK_BY = { ox: "pOx", rook: "pRook", crane: "pCrane", rollback: "pRollback" };
const AIR = new Set(["jkick", "flykick", "cyclone", "dragon", "eFly", "dive"]);

/* ---------- state ---------- */
let state = "menu", paused = false, frameNo = 0;
let players = [], enemies = [], items = [], barrels = [], fx = [], texts = [], shots = [];
let stageIdx = 0, cam = 0, blockIdx = 0, waveIdx = 0, queue = [], locked = false, goT = 0, banner = null, shake = 0;
let stageStart = 0, runStart = 0, bossRef = null, addsDone = 0, lastHit = null, clearT = 0, clearBonus = 0, train = null;
let chosenStage = 0, startPlayers = 1, lastKnife = -999, cleanHp = null;
// hidden features
let wallCount = 0, spray = [], cat = null, pigeons = null, continued = false, fromStart = true;
let bigHead = false, costume = "classic", EASY = TOUCH, ASSIST = TOUCH, pick1 = "rai", joinedOnce = false;
let chakraKOs = 0;
try { pick1 = localStorage.getItem("street:fighter") || "rai"; chakraKOs = +localStorage.getItem("street:chakra") || 0; } catch (e) { /* ignore */ }
try { const d = localStorage.getItem("street:difficulty"); if (d) EASY = d === "story"; } catch (e) { /* ignore */ }
try { bigHead = localStorage.getItem("street:bighead") === "1"; costume = localStorage.getItem("street:costume") || "classic"; } catch (e) { /* ignore */ }
const blocks = () => STAGES[stageIdx].blocks;
const lockOf = (i) => i * BLOCK_W;
const stageEnd = () => lockOf(blocks().length - 1) + LW;
const diff = () => 1 + stageIdx * 0.14;

function fighter(kind, x, y, team) {
  const k = KINDS[kind], hp = team === "e" && !k.boss ? Math.round(k.hp * (1 + stageIdx * 0.12)) : k.hp;
  return {
    kind, team, x, y, z: 0, vx: 0, vz: 0, face: 1, hp, max: hp, st: "idle", t: 0, atk: null, atkName: "", hits: new Set(),
    chain: "", chainT: 0, inv: 0, stagger: 0, staggerT: 0, cool: rand(30, 60), weapon: k.weapon ? { kind: k.weapon, uses: 99 } : null,
    hold: null, heldBy: null, poise: 0, id: Math.random(), lives: 3, score: 0, sp: 40, buf: null, bufT: 0, walkPh: 0,
    lastP: -99, lastK: -99, lastTap: { L: -99, R: -99 }, cmd: [], combo: 0, comboT: 0, flash: 0, airAtk: null, airT: 0, warn: 0
  };
}

/* ---------- input ---------- */
const BIND = [
  { up: ["KeyW"], down: ["KeyS"], left: ["KeyA"], right: ["KeyD"], punch: ["KeyJ"], kick: ["KeyK"], jump: ["KeyL"], special: ["KeyI"], dash: ["StickDash", "ShiftLeft"] },
  { up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"], punch: ["Digit1", "Numpad1", "Comma"], kick: ["Digit2", "Numpad2", "Period"], jump: ["Digit3", "Numpad3", "Slash"], special: ["Digit4", "Numpad4", "Quote"], dash: ["ShiftRight"] }
];
const down = new Set(), pressed = new Set();
function keyOf(code) { for (let i = 0; i < 2; i++) for (const [a, list] of Object.entries(BIND[i])) if (list.includes(code)) return [i, a]; return null; }
function onDown(code) {
  if (code === "KeyP" || code === "Escape") { if (state === "play") togglePause(); return; }
  const k = keyOf(code); if (!k) return;
  if (!down.has(code)) pressed.add(code);
  down.add(code);
  if (state === "play" && k[0] === 1 && (!players[1] || players[1].lives <= 0) && (k[1] === "punch" || k[1] === "kick")) join(1, true);
}
function onUp(code) { down.delete(code); }
const held = (i, a) => BIND[i][a].some((c) => down.has(c));
const tapped = (i, a) => BIND[i][a].some((c) => pressed.has(c));
addEventListener("keydown", (e) => {
  if ((keyOf(e.code) || e.code === "KeyP") && state === "play") e.preventDefault();
  if (e.repeat) return;
  if (e.code === "Enter" && state === "menu" && !["BUTTON", "A"].includes(document.activeElement.tagName)) { e.preventDefault(); start(chosenStage, 1); return; }
  onDown(e.code);
});
addEventListener("keyup", (e) => onUp(e.code));
addEventListener("blur", () => { down.clear(); if (state === "play" && !paused) togglePause(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { down.clear(); if (state === "play" && !paused) togglePause(); } });
Arcade.bindPad(onDown, onUp);
let savedBanner = null;
function togglePause() {
  paused = !paused;
  if (paused) { savedBanner = banner; banner = { text: TOUCH ? "Paused. Tap Pause" : "Paused. Press P", t: 1e9 }; }
  else { banner = savedBanner; savedBanner = null; }
}

/* ---------- flow ---------- */
function start(stage, n, viaContinue) {
  if (viaContinue) continued = true; else { continued = false; fromStart = stage === 0; }
  startPlayers = n; players = [];
  join(0); if (n === 2) { join(1); joinedOnce = true; }
  state = "play"; paused = false; runStart = performance.now();
  $("overlay").hidden = true;
  loadStage(stage);
  if (!viaContinue) playScene(stage === 0 ? "prologue" : "intro" + stage, () => {});
  Arcade.tone(392, 0.1, "square", 0.05); setTimeout(() => Arcade.tone(587, 0.16, "square", 0.05), 110);
}
function loadStage(si) {
  stageIdx = si; cam = 0; blockIdx = 0; enemies = []; items = []; fx = []; texts = []; shots = []; lastHit = null; bossRef = null; addsDone = 0; train = null;
  barrels = STAGES[si].barrels.map(([x, y, drop, kind = "barrel"]) => ({ x, y, drop, kind, hp: kind === "barrel" ? 2 : 3, shake: 0 }));
  wallCount = 0; spray = []; posterUsed = false;
  placeLetter();
  cat = si === 0 ? { x: 560, y: 151, st: "sit", t: 0 } : null;
  pigeons = si === 2 ? { x: 640, st: "sit", t: 0 } : null;
  players.forEach((p, i) => { if (!p) return; Object.assign(p, { x: 50 + i * 24, y: i ? 192 : 172, z: 0, vz: 0, st: p.lives > 0 ? "idle" : "out", hp: p.max, inv: 90, hold: null, airAtk: null }); });
  enterBlock(); stageStart = performance.now();
  banner = { text: "Stage " + (si + 1) + ": " + STAGES[si].name, t: 150, big: true };
  state = "play";
}
function join(i, mid) {
  const k1 = pick1 || "rai", kind = i ? (k1 === "kai" ? "rai" : "kai") : k1;
  const p = fighter(kind, cam + 50 + i * 24, i ? 192 : 172, "p");
  p.pi = i; p.inv = 90; if (EASY) p.lives = 5; players[i] = p;
  if (mid) { startPlayers = 2; texts.push({ x: p.x, y: p.y - 64, s: KINDS[kind].name + " joins", t: 70 }); if (!joinedOnce) { joinedOnce = true; playScene("join", () => {}); } }
}
function enterBlock() { waveIdx = 0; queue = blocks()[blockIdx].waves[0].slice(); locked = false; cleanHp = null; }
const alivePlayers = () => players.filter((p) => p && p.lives > 0 && p.st !== "out");

function unlocked() { try { return clamp(+localStorage.getItem("street:stage") || 0, 0, STAGES.length - 1); } catch (e) { return 0; } }
function unlock(n) { try { if (n > unlocked()) localStorage.setItem("street:stage", String(n)); } catch (e) { /* ignore */ } }
const totalScore = () => players.reduce((s, p) => s + (p ? p.score : 0), 0);

function stageClear() {
  const secs = (performance.now() - stageStart) / 1000;
  clearBonus = Math.round(Math.max(0, 240 - secs)) * 10 + alivePlayers().reduce((s, p) => s + p.hp * 10, 0);
  const share = alivePlayers(); share.forEach((p) => (p.score += Math.round(clearBonus / share.length)));
  if (stageIdx + 1 < STAGES.length) unlock(stageIdx + 1);
  const last = stageIdx + 1 >= STAGES.length;
  playScene("end" + stageIdx, () => {
    if (!last) { state = "clear"; clearT = 260; return; }
    const trueEnd = lettersFound().length === 4 || (fromStart && !continued);
    playScene(trueEnd ? "trueEnd" : "plainEnd", () => endGame(true));
  });
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => Arcade.tone(f, 0.14, "square", 0.05), i * 110));
}

function endGame(won) {
  state = "end";
  const score = totalScore(), secs = Math.round((performance.now() - runStart) / 1000);
  let best = 0; try { best = +localStorage.getItem("street:best") || 0; } catch (e) { /* ignore */ }
  if (score > best) { try { localStorage.setItem("street:best", String(score)); } catch (e) { /* ignore */ } }
  $("end-title").textContent = won ? "All four stages cleared" : "Game over on stage " + (stageIdx + 1);
  $("end-result").textContent = "Score " + score.toLocaleString() + ", " + Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
  const oneCredit = won && fromStart && !continued;
  $("end-note").textContent = (score > best ? "New best on this device. " : "Best on this device: " + best.toLocaleString() + ". ") + (won ? "Mr. Rollback has been rolled back." : "") + (oneCredit ? " One credit, no continues: the gold costume is yours." : "");
  if (oneCredit) Arcade.secret("onecredit");
  $("continue").hidden = won; $("continue").textContent = "Continue from stage " + (stageIdx + 1);
  $("card-menu").hidden = true; $("card-end").hidden = false; $("overlay").hidden = false;
  (won ? $("again") : $("continue")).focus({ preventScroll: true });
  if (!Arcade.isFullscreen() && innerWidth <= 640) $("card-end").scrollIntoView({ behavior: "smooth", block: "center" });
  if (!won) Arcade.tone(160, 0.6, "sawtooth", 0.05, -90);
}

/* ---------- main update ---------- */
function update() {
  frameNo++;
  if (state === "clear") {
    if (--clearT <= 0) { if (stageIdx + 1 < STAGES.length) { loadStage(stageIdx + 1); playScene("intro" + stageIdx, () => {}); } else endGame(true); }
    fx = fx.filter((f) => --f.t > 0); pressed.clear(); return;
  }
  if (state === "story") { storyUpdate(); return; }
  if (state !== "play" || paused) { pressed.clear(); return; }

  const b = blocks()[blockIdx];
  if (!locked && cam >= lockOf(blockIdx) - 0.5) {
    locked = true; cam = lockOf(blockIdx); goT = 0;
    if (SCENES["block" + stageIdx + "_" + blockIdx] && !continued) playScene("block" + stageIdx + "_" + blockIdx, () => {}); cleanHp = alivePlayers().map((p) => p.hp + p.lives * 1000).join();
    if (blockIdx > 0 || !banner) banner = { text: b.boss ? KINDS[b.boss].name : b.name, t: 110 };
  }
  if (locked) {
    const cap = b.boss ? 3 : 3;
    while (queue.length && enemies.filter((e) => e.st !== "dead").length < cap) spawn(queue.shift());
    if (b.adds && bossRef && addsDone < b.adds.length && bossRef.hp < bossRef.max * b.adds[addsDone][0]) { queue.push(...b.adds[addsDone][1]); addsDone++; }
    const dying = players.some((p) => p && p.lives > 0 && p.hp <= 0);
    if (!queue.length && !enemies.some((e) => e.st !== "dead") && !dying) {
      if (waveIdx + 1 < b.waves.length) { waveIdx++; queue = b.waves[waveIdx].slice(); }
      else if (blockIdx + 1 < blocks().length) {
        if (cleanHp === alivePlayers().map((p) => p.hp + p.lives * 1000).join()) { alivePlayers().forEach((p) => { p.score += 500; texts.push({ x: p.x, y: p.y - 74, s: "Clean block +500", t: 90 }); }); }
        blockIdx++; enterBlock(); goT = 180; Arcade.tone(880, 0.08); setTimeout(() => Arcade.tone(880, 0.08), 160); }
      else { stageClear(); return; }
    }
  }

  for (const p of players) if (p) updatePlayer(p);
  for (const e of enemies) updateEnemy(e);
  for (const f of enemies.concat(players.filter(Boolean))) physics(f);
  updateShots();
  resolveHits();
  updateItems();
  updateStageFx();

  const ap = alivePlayers();
  if (ap.length) {
    const lead = Math.max(...ap.map((p) => p.x));
    const target = clamp(lead - LW * 0.45, cam, locked ? cam : lockOf(blockIdx));
    cam += (target - cam) * 0.12;
    if (!locked && Math.abs(cam - lockOf(blockIdx)) < 0.5) cam = lockOf(blockIdx);
  }
  cam = clamp(cam, 0, stageEnd() - LW);

  if (goT > 0) goT--;
  if (banner && banner.t > 0) banner.t--;
  if (shake > 0) shake *= 0.85;
  fx = fx.filter((f) => --f.t > 0);
  texts = texts.filter((f) => --f.t > 0);
  if (players.every((p) => !p || p.lives <= 0)) endGame(false);
  pressed.clear();
}

function spawn(kind) {
  const fromLeft = !KINDS[kind].boss && Math.random() < 0.3 && cam > 0;
  const e = fighter(kind, fromLeft ? cam - 24 : cam + LW + 24, rand(Y0 + 6, Y1 - 4), "e");
  e.face = fromLeft ? 1 : -1;
  if (KINDS[kind].boss) { bossRef = e; e.cool = 90; e.x = cam + LW - 40; if (storyOn && !continued && !(players[0] && players[0].kind === UNLOCK_BY[kind])) playScene("boss" + kind, () => {}); }
  enemies.push(e);
}

const DOWN_STATES = ["fly", "lying", "getup", "dead", "out", "thrown"];
const busy = (f) => ["hurt", "grabbed"].concat(DOWN_STATES).includes(f.st);
function setState(f, st, t = 0) { f.st = st; f.t = t; }

/* ---------- players ---------- */
function useSP(p, cost) {
  if (p.sp >= cost) { p.sp -= cost; return true; }
  texts.push({ x: p.x, y: p.y - 66, s: "Need " + cost + " SP", t: 45 });
  return false;
}
function startAttack(f, name) {
  if (f.team === "p" && ASSIST && !ATK[name].back) {
    // turn toward the closest enemy in reach and step onto its lane
    let best = null, bd = 1e9;
    for (const e of enemies) { if (DOWN_STATES.includes(e.st)) continue; const dx = Math.abs(e.x - f.x), dy = Math.abs(e.y - f.y); if (dx < 48 && dy < 18 && dx + dy * 2 < bd) { bd = dx + dy * 2; best = e; } }
    if (best) { f.face = Math.sign(best.x - f.x) || f.face; f.y += clamp(best.y - f.y, -10, 10); }
  }
  f.atk = ATK[name]; f.atkName = name; setState(f, "attack"); f.hits.clear();
  if (f.atk.sp) flashSpecial(f);
}
function startAir(f, name, vz, vx) {
  if (vz !== undefined) { f.vz = vz; f.z = Math.max(f.z, 0.01); }
  if (vx !== undefined) f.vx = vx;
  f.st = "air"; f.airAtk = name; f.airT = 0; f.hits.clear();
  if (name && ATK[name].sp) flashSpecial(f);
}
function flashSpecial(f) { fx.push({ kind: "ring", x: f.x, y: f.y - 30, t: 14, big: true }); Arcade.tone(980, 0.12, "triangle", 0.05, 400); }

function groundAction(p, btn, mx) {
  const i = p.pi, wantDown = held(i, "down");
  if (btn === "S" && held(i, "up")) {
    setState(p, "taunt", 44);
    p.tauntNear = enemies.some((e) => !DOWN_STATES.includes(e.st) && Math.abs(e.x - p.x) < 60 && Math.abs(e.y - p.y) < 20);
    Arcade.tone(330, 0.1, "square", 0.04); setTimeout(() => Arcade.tone(440, 0.12, "square", 0.04), 120);
    return true;
  }
  if (btn === "S") {
    if (wantDown) { if (useSP(p, 40)) { startAir(p, "dragon", 6.2, p.face * 0.8); p.inv = 16; } return true; }
    if (p.avatarT > 0) { if (useSP(p, 10)) startAttack(p, "chakra"); return true; }
    const [move, cost] = SPECIALS[p.kind] || SPECIALS.rai;
    if (!useSP(p, cost)) return true;
    if (move === "dive") {
      let t = null, bd = 1e9; for (const e of enemies) { if (DOWN_STATES.includes(e.st)) continue; const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y); if (d < bd) { bd = d; t = e; } }
      startAir(p, "dive", 7, t ? clamp((t.x - p.x) / 44, -3.2, 3.2) : p.face * 2); if (t) p.y += clamp(t.y - p.y, -10, 10); p.inv = 20;
    } else { startAttack(p, move); p.inv = move === "quake" ? 26 : 30; }
    return true;
  }
  if (btn === "J") { startAir(p, null, (p.st === "run" ? 5 : 5.4) * (KINDS[p.kind].jump ? KINDS[p.kind].jump / 5.4 : 1), p.st === "run" ? p.face * 2.8 : mx * 1.5); return true; }
  if (btn === "P") {
    if (p.weapon) { startAttack(p, p.weapon.kind === "knife" ? "toss" : "pipe"); return true; }
    const it = items.find((it) => (it.kind === "pipe" || it.kind === "knife") && Math.abs(it.x - p.x) < 16 && Math.abs(it.y - p.y) < 9);
    if (it) { items.splice(items.indexOf(it), 1); p.weapon = { kind: it.kind, uses: 8 }; setState(p, "pickup", 10); Arcade.tone(700, 0.06); return true; }
    // down, forward, punch: rising dragon
    const dn = p.cmd.find((c) => c[0] === "D" && frameNo - c[1] < 18), fw = p.cmd.find((c) => c[0] === "F" && frameNo - c[1] < 8);
    if (dn && fw && fw[1] > dn[1] && fw[1] - dn[1] < 10) { p.cmd = []; if (useSP(p, 40)) { startAir(p, "dragon", 6.2, p.face * 0.8); p.inv = 16; return true; } }
    const back = p.cmd.some((c) => c[0] === "B" && frameNo - c[1] < 10);
    if (back || (mx && mx === -p.face)) { if (back && p.backFace) p.face = p.backFace; p.cmd = []; startAttack(p, "elbow"); return true; }
    if (p.st === "run") { startAttack(p, "tackle"); return true; }
    chainAttack(p, "P"); return true;
  }
  if (btn === "K") {
    if (p.st === "run") { startAir(p, "flykick", 4.2, p.face * 3); return true; }
    chainAttack(p, "K"); return true;
  }
  return false;
}
function chainAttack(p, b) {
  const c = (p.chainT > 0 ? p.chain : "") + b, n = c.length;
  let name;
  if (n >= 3) name = b === "P" ? "upper" : "spinheel";
  else if (n === 2) name = b === "P" ? "jab2" : c === "KK" ? "round" : "kick";
  else name = b === "P" ? "jab" : "kick";
  startAttack(p, name);
  const fin = ["upper", "spinheel", "round"].includes(name);
  p.chain = fin ? "" : c; p.chainT = fin ? 0 : ATK[name].len + 18;
}

function updatePlayer(p) {
  const i = p.pi;
  if (p.lives <= 0) return;
  if (p.inv > 0) p.inv--;
  if (p.chainT > 0) p.chainT--;
  if (p.comboT > 0) p.comboT--; else p.combo = 0;
  if (p.staggerT > 0) p.staggerT--; else p.stagger = 0;

  const tp = tapped(i, "punch"), tk = tapped(i, "kick");
  if (tp) p.lastP = frameNo; if (tk) p.lastK = frameNo;
  const both = (tp || tk) && Math.abs(p.lastP - p.lastK) <= 3 && held(i, "punch") && held(i, "kick");
  const BUF = TOUCH ? 12 : 8;
  if (tapped(i, "special") || both) { p.buf = "S"; p.bufT = BUF; p.lastP = p.lastK = -99; }
  else if (tp) { p.buf = "P"; p.bufT = BUF; }
  else if (tk) { p.buf = "K"; p.bufT = BUF; }
  else if (tapped(i, "jump")) { p.buf = "J"; p.bufT = 6; }
  else if (p.bufT > 0) p.bufT--; else p.buf = null;

  for (const [a, d] of [["left", -1], ["right", 1]]) if (tapped(i, a)) {
    const key = d < 0 ? "L" : "R";
    p.cmd.push([d === p.face ? "F" : "B", frameNo]);
    if (d !== p.face) p.backFace = p.face;      // remember which way we faced before turning
    if (frameNo - p.lastTap[key] < 14 && ["idle", "walk"].includes(p.st)) { setState(p, "run"); p.face = d; }
    p.lastTap[key] = frameNo;
  }
  if (tapped(i, "down")) p.cmd.push(["D", frameNo]);
  if (tapped(i, "up")) p.upTap = frameNo;
  const anyHeld = ["up", "down", "left", "right", "punch", "kick", "jump", "special"].some((a) => held(i, a));
  p.stillT = p.st === "idle" && !anyHeld ? (p.stillT || 0) + 1 : 0;
  if (p.cmd.length > 8) p.cmd.shift();

  const mx = (held(i, "right") ? 1 : 0) - (held(i, "left") ? 1 : 0);
  const my = (held(i, "down") ? 1 : 0) - (held(i, "up") ? 1 : 0);
  const sp = KINDS[p.kind].speed;

  switch (p.st) {
    case "idle": case "walk": case "run": {
      if (p.buf && groundAction(p, p.buf, mx)) { p.buf = null; break; }
      if (p.st !== "run" && mx && held(i, "dash")) { setState(p, "run"); p.face = mx; break; }
      if (p.st === "run") {
        if (mx !== p.face) { setState(p, "idle"); break; }
        p.x += p.face * 2.5; p.y += my * sp * 0.6; p.walkPh += 0.34;
        if (frameNo % 10 === 0) dust(p.x - p.face * 6, p.y);
        break;
      }
      if (mx) {
        const tgt = enemies.find((e) => e.st === "hurt" && !KINDS[e.kind].boss && !e.heldBy && Math.sign(e.x - p.x) === mx && Math.abs(e.x - p.x) < 20 && Math.abs(e.y - p.y) < 7);
        if (tgt) { p.hold = tgt; tgt.heldBy = p; setState(tgt, "grabbed"); setState(p, "grab", 100); p.face = mx; tgt.face = -mx; p.knees = 0; break; }
      }
      const boost = p.avatarT > 0 ? 1.15 : 1;
      p.x += mx * sp * boost; p.y += my * sp * 0.7 * boost;
      if (mx) p.face = mx;
      setState(p, mx || my ? "walk" : "idle", p.t + 1);
      if (mx || my) p.walkPh += 0.22;
      break;
    }
    case "attack": {
      const a = p.atk;
      if (a.move && p.t >= a.a0 && p.t <= a.a1) p.x += p.face * a.move;
      if (a.spawn && p.t === a.spawn) {
        if (p.atkName === "quake") { shoot("wave", p, 0, 1); shoot("wave", p, 0, -1); shake = 8; Arcade.noise(0.3, 0.12); }
        else if (p.atkName === "chakra") shoot("chakra", p, 0);
        else { shoot("knife", p, 0); p.weapon = null; }
      }
      if (p.atkName === "pipe" && p.t === a.a1 && p.weapon && --p.weapon.uses <= 0) { p.weapon = null; texts.push({ x: p.x, y: p.y - 60, s: "Lathi broke", t: 50 }); }
      // cancel windows: chain light hits, or cancel a fresh hit into a special
      if (p.buf === "S" && p.t <= 5 && ["jab", "kick"].includes(p.atkName)) { setState(p, "idle"); groundAction(p, "S", mx); p.buf = null; break; }
      if (a.chain && p.buf && (p.buf === "P" || p.buf === "K") && p.t > a.a1 + 1) { const b = p.buf; p.buf = null; groundAction(p, b, mx); break; }
      if (++p.t >= a.len) setState(p, "idle");
      break;
    }
    case "pickup": if (--p.t <= 0) setState(p, "idle"); break;
    case "taunt":
      if (--p.t <= 0) {
        setState(p, "idle"); p.sp = Math.min(100, p.sp + 15); texts.push({ x: p.x, y: p.y - 66, s: "+15 SP", t: 50 });
        if (p.tauntNear) Arcade.secret("taunt");
      }
      break;
    case "air": {
      p.x += p.vx; p.airT++;
      if (!p.airAtk && p.buf) {
        if (p.buf === "S") { if (useSP(p, 25)) startAir(p, "cyclone"); }
        else if (p.buf === "P" || p.buf === "K") startAir(p, Math.abs(p.vx) > 2 ? "flykick" : "jkick");
        p.buf = null;
      }
      if (p.airAtk === "cyclone" && p.airT % 4 === 0) p.face = -p.face;
      if (p.airAtk === "dive") {
        // the kite dive homes in on the nearest enemy
        let t = null, bd = 1e9; for (const e of enemies) { if (DOWN_STATES.includes(e.st)) continue; const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y); if (d < bd) { bd = d; t = e; } }
        if (t) { const left = Math.max(4, (p.vz + Math.sqrt(p.vz * p.vz + 2 * GRAV * p.z)) / GRAV); p.vx = clamp((t.x - p.x) / left, -3.4, 3.4); p.y += clamp(t.y - p.y, -1, 1); p.face = Math.sign(t.x - p.x) || p.face; }
      }
      break;
    }
    case "grab": {
      const e = p.hold;
      if (!e || e.st !== "grabbed") { p.hold = null; setState(p, "idle"); break; }
      e.x = p.x + p.face * 16; e.y = p.y;
      if (p.buf === "P") {
        p.buf = null; p.knees++;
        hurt(e, p, p.knees >= 3 ? { ...ATK.knee, dmg: 7, knock: true } : ATK.knee);
        p.score += 50; p.sp = Math.min(100, p.sp + 5); setState(p, "knee", 14);
        if (p.knees >= 3) { e.heldBy = null; p.hold = null; }
        break;
      }
      if (p.buf === "K" || (mx && mx === -p.face)) {
        p.buf = null; e.heldBy = null; p.hold = null;
        const dir = mx || -p.face;
        e.face = -dir; e.x = p.x; e.thrownBy = p; setState(e, "thrown"); e.vx = 3.6 * dir; e.vz = 4.2; e.z = 10;
        damage(e, 10, p); p.score += 200; setState(p, "throw", 22); p.face = dir;
        Arcade.noise(0.12, 0.08);
        break;
      }
      if (--p.t <= 0) { e.heldBy = null; p.hold = null; setState(e, "idle"); setState(p, "idle"); }
      break;
    }
    case "knee": case "throw": if (--p.t <= 0) setState(p, p.hold ? "grab" : "idle", p.hold ? 60 : 0); break;
    case "hurt": if (--p.t <= 0) { setState(p, "idle"); p.inv = Math.max(p.inv, 6); } break;
    case "lying": if (--p.t <= 0) { if (p.hp <= 0) loseLife(p); else setState(p, "getup", 22); } break;
    case "getup": if (--p.t <= 0) { setState(p, "idle"); p.inv = 50; } break;
  }
  p.x = clamp(p.x, cam + 10, cam + LW - 10);
  p.y = clamp(p.y, Y0, Y1);
}

function loseLife(p) {
  p.lives--;
  if (p.weapon) dropWeapon(p);
  if (p.lives > 0) {
    p.hp = p.max; p.sp = Math.max(p.sp, 40); setState(p, "air"); p.airAtk = null; p.inv = 120; p.z = 40; p.vz = 0; p.vx = 0;
    texts.push({ x: p.x, y: p.y - 74, s: p.lives + (p.lives === 1 ? " life left" : " lives left"), t: 80 });
  } else setState(p, "out");
}

/* ---------- enemies ---------- */
function updateEnemy(e) {
  const k = KINDS[e.kind];
  if (e.inv > 0) e.inv--;
  if (e.cool > 0) e.cool--;
  if (e.warn > 0) e.warn--;
  switch (e.st) {
    case "idle": case "walk": {
      const tgts = alivePlayers();
      if (!tgts.length) { setState(e, "idle"); break; }
      const p = tgts.reduce((a, b) => (Math.abs(a.x - e.x) + Math.abs(a.y - e.y) * 2 < Math.abs(b.x - e.x) + Math.abs(b.y - e.y) * 2 ? a : b));
      const engaged = enemies.filter((o) => o !== e && o.target === p && o.engaged && !busy(o)).length;
      if (!e.engaged && engaged < 2 && e.cool < 40) e.engaged = true;
      e.target = p;
      let side = Math.sign(e.x - p.x) || 1;
      if (e.engaged) {
        const mate = enemies.find((o) => o !== e && o.engaged && o.target === p && !busy(o) && (Math.sign(o.x - p.x) || 1) === side);
        if (mate && Math.abs(mate.x - p.x) < Math.abs(e.x - p.x) && p.x - cam > 40 && cam + LW - p.x > 40) side = -side;
      }
      const adx = Math.abs(p.x - e.x), ady = Math.abs(p.y - e.y), pDown = DOWN_STATES.includes(p.st) || p.st === "out";
      e.face = Math.sign(p.x - e.x) || -side;
      // bosses back off every few seconds to set up a special move
      if (k.boss) { e.spT = (e.spT || 0) + 1; if (e.spT > 300 && !e.retreat) { e.retreat = true; e.retreatT = 150; } }
      if (e.retreat && e.retreatT > 0) e.retreatT--;
      if (e.retreat && (adx > 80 || e.retreatT <= 0) && !pDown) {
        e.retreat = false; e.spT = 0;
        const sp = adx <= 80 ? k.specials.filter((m) => m === "pound" || m === "eRoll" || m === "fan") : k.specials.filter((m) => m !== "pound" || adx < 120);
        const m = pick(sp.length ? sp : k.specials);
        if (m) { windup(e, m, m === "charge" ? 30 : 22, true); break; }
        windup(e, "heavy", 22, true); break;
      }
      // specials and ranged moves
      if (e.cool <= 0 && !pDown && !e.retreat) {
        const sp = k.specials || [];
        if (k.ranged && adx > 60 && ady < 8 && frameNo - lastKnife > 70 && Math.random() < 0.05) { lastKnife = frameNo; windup(e, "eToss", 16); break; }
        if (k.fly && adx > 46 && adx < 100 && ady < 8 && Math.random() < 0.04) { windup(e, "eFly", 12); break; }
        if (sp.includes("charge") && adx > 80 && ady < 18 && Math.random() < 0.05) { windup(e, "charge", 30, true); break; }
        if (sp.includes("eRoll") && adx > 40 && adx < 140 && ady < 10 && Math.random() < 0.03) { windup(e, "eRoll", 24, true); break; }
        if (sp.includes("dive") && adx > 60 && Math.random() < 0.02) { windup(e, "dive", 18, true); break; }
        if (sp.includes("fan") && adx > 70 && ady < 30 && Math.random() < 0.015) { windup(e, "fan", 20, true); break; }
        if (sp.includes("pound") && adx < 90 && Math.random() < 0.012) { windup(e, "pound", 26, true); break; }
      }
      const keepOff = e.retreat ? 110 : k.ranged ? 110 : 70 + e.id * 40;
      const close = e.engaged && !k.ranged && !e.retreat;
      if (e.retreat && (p.x - cam < 110 || cam + LW - p.x < 110) && Math.abs((p.x + side * 110) - clamp(p.x + side * 110, cam + 16, cam + LW - 16)) > 1) side = -side;
      const tx = clamp(p.x + side * (close ? 22 * k.scale * BS : keepOff), cam + 16, cam + LW - 16);
      const ty = e.engaged || k.ranged || e.retreat ? p.y : clamp(p.y + Math.sin(frameNo / 60 + e.id * 9) * 22, Y0, Y1);
      const dx = tx - e.x, dy = ty - e.y, spd = k.speed * (e.engaged ? 1 : 0.8);
      if (Math.abs(dx) > 2) e.x += Math.sign(dx) * Math.min(spd, Math.abs(dx));
      if (Math.abs(dy) > 1.5) e.y += Math.sign(dy) * Math.min(spd * 0.7, Math.abs(dy));
      for (const o of enemies) if (o !== e && !busy(o) && Math.abs(o.x - e.x) < 12 && Math.abs(o.y - e.y) < 6) e.y += e.y < o.y ? -0.6 : 0.6;
      e.y = clamp(e.y, Y0, Y1);
      const inRange = adx < 30 * k.scale * BS && ady < 6 && p.z < 8;
      if (e.engaged && inRange && e.cool <= 0 && !pDown && !e.retreat) { windup(e, e.weapon ? "pipe" : pick(k.moves), k.windup); break; }
      setState(e, Math.abs(dx) > 2 || Math.abs(dy) > 1.5 ? "walk" : "idle", e.t + 1);
      if (e.st === "walk") e.walkPh += 0.18;
      break;
    }
    case "windup":
      if (--e.t <= 0) {
        if (AIR.has(e.atkName)) {
          const p = e.target || alivePlayers()[0];
          if (e.atkName === "dive") { const dx = p ? p.x - e.x : 0; startAir(e, "dive", 7, clamp(dx / 44, -3.2, 3.2)); }
          else startAir(e, "eFly", 4.2, e.face * 2.6);
        } else { startAttack(e, e.atkName); if (e.atkName === "charge" || e.atkName === "eRoll") Arcade.tone(140, 0.4, "sawtooth", 0.05, 60); }
      }
      break;
    case "attack": {
      const a = e.atk;
      if (e.atkName === "charge") {
        e.x += e.face * 3.4;
        if (e.x < cam + 12 || e.x > cam + LW - 12 || e.t > 70) { e.x = clamp(e.x, cam + 12, cam + LW - 12); setState(e, "idle"); e.cool = rand(...k.cool) + 60; break; }
      }
      if (a.move && e.t >= a.a0 && e.t <= a.a1) e.x = clamp(e.x + e.face * a.move, cam + 12, cam + LW - 12);
      if (a.spawn && e.t === a.spawn) {
        if (e.atkName === "pound") { shoot("wave", e, 0, 1); shoot("wave", e, 0, -1); shake = 8; Arcade.noise(0.3, 0.12); }
        else if (e.atkName === "fan") { shoot("knife", e, -12); shoot("knife", e, 0); shoot("knife", e, 12); }
        else shoot("knife", e, 0);
      }
      if (++e.t >= a.len) { setState(e, "idle"); e.cool = rand(...k.cool); e.engaged = Math.random() < 0.7; }
      break;
    }
    case "air": e.x += e.vx; e.airT++; break;
    case "hurt": if (--e.t <= 0 && !e.heldBy) setState(e, "idle"); break;
    case "grabbed": if (!e.heldBy) setState(e, "idle"); break;
    case "lying": if (--e.t <= 0) { if (e.hp <= 0) { setState(e, "dead", 50); onKO(e); } else setState(e, "getup", 26); } break;
    case "getup": if (--e.t <= 0) { setState(e, "idle"); e.inv = 30; e.cool = 30; } break;
    case "dead": if (--e.t <= 0) e.gone = true; break;
  }
}
function windup(e, name, t, special) { e.atkName = name; e.atk = ATK[name]; e.hits.clear(); setState(e, "windup", t); if (special) e.warn = t; }

function onKO(e) {
  const k = KINDS[e.kind];
  const killer = e.lastBy && e.lastBy.team === "p" ? e.lastBy : alivePlayers()[0];
  if (killer) killer.score += k.score;
  texts.push({ x: e.x, y: e.y - 60, s: "+" + k.score, t: 60 });
  if (e.weapon) dropWeapon(e);
  if (Math.random() < 0.12 && !k.boss) items.push({ kind: Math.random() < 0.5 ? "food" : "drink", x: e.x, y: e.y, z: 10, vz: 2 });
  if (k.boss) {
    shake = 10; Arcade.noise(0.4, 0.12);
    const u = UNLOCK_BY[e.kind];
    if (u && !rosterUnlocked().includes(u)) { const r = rosterUnlocked(); r.push(u); try { localStorage.setItem("street:roster", JSON.stringify(r)); } catch (x) { /* ignore */ } Arcade.toast(KINDS[u].name + " is now playable. Pick them from the menu."); }
  }
}
function rosterUnlocked() { try { return JSON.parse(localStorage.getItem("street:roster")) || []; } catch (e) { return []; } }
function dropWeapon(f) { if (!f.weapon) return; items.push({ kind: f.weapon.kind, x: f.x + f.face * 8, y: f.y, z: 20, vz: 1.5 }); f.weapon = null; }

/* ---------- physics, projectiles, hits ---------- */
function physics(f) {
  if (f.z > 0 || f.vz) {
    f.z += f.vz; f.vz -= GRAV;
    if (f.st === "fly" || f.st === "thrown") {
      f.x += f.vx; f.vx *= 0.99;
      if (f.team === "e" && !f.bounced && (f.x < cam + 8 || f.x > cam + LW - 8)) { f.bounced = true; f.vx = -f.vx * 0.8; f.vz = Math.max(f.vz, 2.4); damage(f, 3, f.lastBy || f); burst(f.x, f.y - 20, 6, PAL.spark); texts.push({ x: f.x, y: f.y - 60, s: "Wall bounce", t: 50 }); Arcade.noise(0.08, 0.08); if (++wallCount === 3) Arcade.secret("walls"); }
    }
    if (f.z <= 0) {
      f.z = 0; f.vz = 0;
      if (f.st === "air") { setState(f, "idle"); f.vx = 0; f.airAtk = null; if (f.team === "e") f.cool = rand(...KINDS[f.kind].cool); dust(f.x, f.y); }
      else if (f.st === "fly" || f.st === "thrown") {
        shake = Math.max(shake, 3); Arcade.noise(0.07, 0.06);
        setState(f, "lying", f.team === "p" ? 50 : 46); f.vx = 0; f.bounced = false; dust(f.x, f.y);
      }
    }
  }
  if (f.team === "e" && f.st !== "dead") f.x = clamp(f.x, cam - 30, cam + LW + 30);
  f.y = clamp(f.y, Y0, Y1);
}

function shoot(kind, owner, dy, dir) {
  const face = dir || owner.face, sc = KINDS[owner.kind].scale * BS;
  if (kind === "chakra") { shots.push({ kind, team: owner.team, owner, x: owner.x + face * 12, y: owner.y, z: 26 * sc, vx: face * 4.2, face, dmg: 12, life: 110, pierce: 3 }); Arcade.tone(1200, 0.12, "triangle", 0.05, -600); return; }
  if (kind === "knife") shots.push({ kind, team: owner.team, owner, x: owner.x + face * 14, y: clamp(owner.y + dy, Y0, Y1), z: 26 * sc, vx: face * 3.6, face, dmg: 8, life: 150 });
  else shots.push({ kind, team: owner.team, owner, x: owner.x + face * 20, y: owner.y, z: 0, vx: face * 2.4, face, dmg: 10, life: 100 });
  Arcade.tone(kind === "knife" ? 900 : 90, 0.08, "triangle", 0.05, kind === "knife" ? -300 : 0);
}
function chakraKO() {
  chakraKOs++; try { localStorage.setItem("street:chakra", String(chakraKOs)); } catch (e) { /* ignore */ }
  if (chakraKOs === 5) { Arcade.secret("chakra"); Arcade.toast("Avatar costume unlocked. Pick it from the menu."); }
}
function updateShots() {
  const all = players.filter((p) => p && p.lives > 0).concat(enemies);
  for (const s of shots) {
    s.x += s.vx; s.life--;
    if (s.x < cam - 20 || s.x > cam + LW + 20) s.life = 0;
    for (const d of all) {
      if (s.life <= 0 || d.team === s.team || d.inv > 0 || DOWN_STATES.includes(d.st) || (s.hitIds && s.hitIds.has(d.id))) continue;
      const near = Math.abs(d.x - s.x) < 10 && Math.abs(d.y - s.y) < (s.kind === "wave" ? 12 : 7);
      const height = s.kind === "wave" ? d.z < 3 : d.z < 14;   // jump over knives and shockwaves
      if (near && height) {
        hurt(d, { x: s.x - s.face * 10, face: s.face, team: s.team, kind: s.owner.kind, owner: s.owner }, { dmg: s.dmg, knock: s.kind !== "knife", sfx: 500 });
        if (s.team === "p" && s.owner) s.owner.score += 80;
        if (s.kind === "knife") s.life = 0;
        if (s.kind === "chakra") { s.hitIds = s.hitIds || new Set(); s.hitIds.add(d.id); if (--s.pierce <= 0) s.life = 0; if (d.hp <= 0 && s.owner) chakraKO(); }
      }
    }
  }
  shots = shots.filter((s) => s.life > 0);
}

function activeAtk(a) {
  if (a.st === "attack") { const k = a.atk; return k && a.t >= k.a0 && a.t <= k.a1 ? [k, a.t] : null; }
  if (a.st === "air" && a.airAtk) {
    const k = ATK[a.airAtk];
    if (a.airAtk === "dragon") return a.vz > -1 ? [k, a.airT] : null;
    if (a.airAtk === "dive") return a.vz < 0 ? [k, a.airT] : null;
    return a.airT >= 2 ? [k, a.airT] : null;
  }
  return null;
}

function resolveHits() {
  const all = players.filter((p) => p && p.lives > 0).concat(enemies);
  for (const a of all) {
    const act = activeAtk(a); if (!act) continue;
    const [atk, t] = act, scale = KINDS[a.kind].scale * BS;
    if (atk.rearm && t % atk.rearm === 0) a.hits.clear();
    const knock = atk.knock || (atk.knockAfter && t >= atk.knockAfter);
    for (const d of all) {
      if (d === a || d.team === a.team || a.hits.has(d.id) || d.inv > 0 || DOWN_STATES.includes(d.st)) continue;
      let dx = (d.x - a.x) * (atk.back ? -a.face : a.face);
      if (atk.both) dx = Math.abs(d.x - a.x);
      if (dx > -6 && dx < atk.reach * scale && Math.abs(d.y - a.y) < (a.team === "p" && ASSIST ? 14 : 9) && Math.abs(d.z - a.z) < 28) {
        a.hits.add(d.id);
        const heavy = a.team === "p" && KINDS[a.kind].heavy ? KINDS[a.kind].heavy : 0;
        const hit = heavy || (knock && !atk.knock) ? { ...atk, dmg: atk.dmg + heavy, knock: atk.knock || knock } : atk;
        hurt(d, a, hit);
        if (a.team === "p") {
          a.score += atk.dmg * 10 * (1 + Math.floor(a.combo / 5));
          a.sp = Math.min(100, a.sp + (atk.sp ? 0 : 3));
          a.combo++; a.comboT = 80;
        }
      }
    }
    if (a.team === "p") for (const b of barrels) {
      if (b.hp <= 0 || a.hits.has(b)) continue;
      const dx = atk.both ? Math.abs(b.x - a.x) : (b.x - a.x) * (atk.back ? -a.face : a.face);
      if (dx > -6 && dx < atk.reach + 6 && Math.abs(b.y - a.y) < 10) {
        a.hits.add(b); b.hp--; b.shake = 10; Arcade.noise(0.06, 0.06);
        if (b.hp <= 0) breakProp(b);
      }
    }
  }
  for (const t of enemies.filter((e) => e.st === "thrown")) {
    for (const o of enemies) if (o !== t && !busy(o) && Math.abs(o.x - t.x) < 16 && Math.abs(o.y - t.y) < 10) hurt(o, { x: t.x, face: Math.sign(t.vx) || 1, team: "p", kind: t.kind, owner: t.thrownBy }, { dmg: 8, knock: true, sfx: 250 });
  }
}

function breakProp(b) {
  if (b.kind === "hydrant") {
    spray.push({ x: b.x, y: b.y, t: 240 }); Arcade.noise(0.5, 0.06);
    items.push({ kind: b.drop, x: b.x + 10, y: Math.min(Y1, b.y + 12), z: 30, vz: 3 });
    if (b.drop === "oneup") texts.push({ x: b.x, y: b.y - 50, s: "Something was stuck in there", t: 90 });
    Arcade.secret("hydrant");
  } else if (b.kind === "vending") {
    for (let i = 0; i < 3; i++) items.push({ kind: "drink", x: b.x - 10 + i * 10, y: Math.min(Y1, b.y + 8 + i * 4), z: 20, vz: 2 + i * 0.5 });
    texts.push({ x: b.x, y: b.y - 50, s: "Out of order", t: 80 }); Arcade.secret("vending");
  } else {
    items.push({ kind: b.drop, x: b.x, y: b.y, z: 14, vz: 2, n: b.letter });
  }
  burst(b.x, b.y - 12, 10, b.kind === "barrel" ? PAL.wood : PAL.spark);
}

function hurt(d, a, atk) {
  if (d.heldBy && d.heldBy !== a) { d.heldBy.hold = null; d.heldBy = null; }
  const dmg = Math.max(1, Math.round((a.team === "e" ? atk.dmg * diff() * (EASY ? 0.6 : 1) : atk.dmg) * (d.st === "taunt" ? 2 : 1)));
  damage(d, dmg, a.owner || a);
  const dir = Math.sign(d.x - a.x) || a.face;
  let knock = atk.knock || d.hp <= 0;
  if (d.team === "p") {
    d.sp = Math.min(100, d.sp + 3); d.stagger++; d.staggerT = 70; if (d.stagger >= (KINDS[d.kind].sturdy || 3)) knock = true;
    if (d.hold) { d.hold.heldBy = null; setState(d.hold, "idle"); d.hold = null; }
    if (d.st === "air") d.airAtk = null;
  }
  if (KINDS[d.kind].boss) {
    d.poise += atk.dmg;
    if (d.hp > 0 && d.poise < KINDS[d.kind].poise && !atk.poiseBreak) { d.flash = 6; spark(d, a, atk); return; }
    d.poise = 0; knock = true;
  }
  if (d.st === "attack" || d.st === "windup") d.cool = Math.max(d.cool, 40);
  if (knock || d.st === "air") {
    if (d.heldBy) { d.heldBy.hold = null; d.heldBy = null; }
    setState(d, "fly"); d.airAtk = null; d.vx = dir * 2.2; d.vz = atk.lift || 3.6; d.z = Math.max(d.z, 1); d.face = -dir; d.stagger = 0;
    if (d.team === "p" && d.weapon) dropWeapon(d);
    if (d.team === "p" && navigator.vibrate) try { navigator.vibrate(40); } catch (e) { /* ignore */ }
    if (d.team === "e" && d.weapon && Math.random() < 0.5) dropWeapon(d);
  } else if (d.st !== "grabbed") {
    if (d.team === "e") { d.hurtN = frameNo - (d.hurtF || -999) < 60 ? (d.hurtN || 0) + 1 : 1; d.hurtF = frameNo; }
    if (d.team === "e" && d.hurtN >= (EASY ? 6 : 4) && !KINDS[d.kind].boss && d.hp > 0) {
      // too many light hits in a row: the enemy hops back out of the combo
      d.hurtN = 0; setState(d, "air"); d.airAtk = null; d.vz = 3; d.z = 1; d.vx = dir * 2.4; d.face = -dir; d.inv = 14; d.cool = Math.max(d.cool, 30);
    } else { setState(d, "hurt", d.team === "p" ? 16 : 22); d.face = -dir; d.x += dir * 3; }
  }
  d.flash = 6;
  spark(d, a, atk);
}
function damage(d, n, a) { d.hp = Math.max(0, d.hp - n); d.lastBy = a; if (d.team === "e") lastHit = { f: d, t: 180 }; }
function spark(d, a, atk) {
  const T = PAL.T, h = d.y - d.z - 30 * KINDS[d.kind].scale * BS;
  burst(d.x - (a.face || 1) * 4, h, 7, d.team === "p" ? T.red : PAL.spark);
  fx.push({ kind: "ring", x: d.x - (a.face || 1) * 4, y: h, t: 8 });
  fx.push({ kind: "star", x: d.x - (a.face || 1) * 6, y: h, t: 6 });
  Arcade.tone(atk.sfx || 400, 0.06, "square", 0.05, -120); Arcade.noise(0.05, 0.05);
  shake = Math.max(shake, atk.knock ? 4 : 1.5);
}
function burst(x, y, n, c) { for (let i = 0; i < n; i++) fx.push({ kind: "dot", x, y, vx: rand(-1.6, 1.6), vy: rand(-2.2, 0.4), c, t: rand(12, 22) }); }
function dust(x, y) { for (let i = 0; i < 5; i++) fx.push({ kind: "dust", x: x + rand(-8, 8), y, vx: rand(-0.6, 0.6), vy: rand(-0.6, -0.1), t: rand(14, 24) }); }

function updateItems() {
  for (const it of items) if (it.z > 0 || it.vz) { it.z += it.vz; it.vz -= GRAV; if (it.z <= 0) { it.z = 0; it.vz = 0; } }
  for (const p of alivePlayers()) {
    const it = items.find((it) => (it.kind === "food" || it.kind === "drink" || it.kind === "oneup" || it.kind === "letter") && it.z === 0 && Math.abs(it.x - p.x) < 14 && Math.abs(it.y - p.y) < 9);
    if (!it) continue;
    if (it.kind === "food" && p.hp < p.max) { p.hp = Math.min(p.max, p.hp + 30); texts.push({ x: p.x, y: p.y - 66, s: "+30 health", t: 60 }); }
    else if (it.kind === "drink" && p.sp < 100) { p.sp = Math.min(100, p.sp + 50); texts.push({ x: p.x, y: p.y - 66, s: "+50 SP", t: 60 }); }
    else if (it.kind === "letter") { items.splice(items.indexOf(it), 1); takeLetter(p, it); return; }
    else if (it.kind === "oneup") { p.lives = Math.min(5, p.lives + 1); texts.push({ x: p.x, y: p.y - 66, s: "1UP", t: 80 }); }
    else continue;
    items.splice(items.indexOf(it), 1); p.score += 50;
    Arcade.tone(660, 0.08, "triangle", 0.06); setTimeout(() => Arcade.tone(990, 0.1, "triangle", 0.06), 80);
  }
  for (const b of barrels) if (b.shake > 0) b.shake--;
  enemies = enemies.filter((e) => !e.gone);
  if (lastHit && --lastHit.t <= 0) lastHit = null;
}

/* stage life: subway trains, foundry sparks, rooftop steam */
function hint(id, p, msg) {
  let seen = []; try { seen = JSON.parse(localStorage.getItem("street:hints")) || []; } catch (e) { /* ignore */ }
  if (seen.includes(id)) return;
  seen.push(id); try { localStorage.setItem("street:hints", JSON.stringify(seen)); } catch (e) { /* ignore */ }
  texts.push({ x: p.x, y: p.y - 78, s: msg, t: 150 });
}
function hints() {
  if (!TOUCH || frameNo % 10) return;
  const p = alivePlayers()[0]; if (!p) return;
  if (stageIdx === 0 && blockIdx === 0 && frameNo > 200) hint("dash", p, "Push the stick to the edge, or tap Dash, to run");
  if (enemies.some((e) => e.st === "hurt" && Math.abs(e.x - p.x) < 26 && Math.abs(e.y - p.y) < 8)) hint("grab", p, "Walk into a dazed enemy to grab them");
  if (p.sp >= 30) hint("special", p, "Special is ready: " + (SPECIALS[p.kind] || SPECIALS.rai)[2]);
  if (shots.some((s) => s.kind === "knife" && s.team === "e")) hint("knife", p, "Jump over thrown knives");
}
function updateStageFx() {
  hints();
  const th = STAGES[stageIdx].theme;
  for (const w of spray) { w.t--; if (w.t > 0 && frameNo % 2 === 0) fx.push({ kind: "water", x: w.x + rand(-2, 2), y: w.y - 10, vx: rand(-1.2, 1.2), vy: rand(-3.4, -2), t: 40 }); }
  spray = spray.filter((w) => w.t > 0);
  if (cat) {
    cat.t++;
    const near = alivePlayers().find((p) => Math.abs(p.x - cat.x) < 20 && p.y < Y0 + 12);
    const rough = players.some((p) => p && activeAtk(p) && Math.abs(p.x - cat.x) < 40) || enemies.some((e) => (e.st === "fly" || e.st === "thrown") && Math.abs(e.x - cat.x) < 30);
    if (cat.st === "sit" && rough) { cat.st = "run"; texts.push({ x: cat.x, y: cat.y - 30, s: "Hiss", t: 50 }); Arcade.tone(900, 0.15, "sawtooth", 0.03, -500); }
    else if (cat.st === "sit" && near && frameNo - (near.upTap || -99) < 3) {
      cat.st = "purr"; cat.t = 0; near.hp = Math.min(near.max, near.hp + 10);
      for (let i = 0; i < 4; i++) fx.push({ kind: "heart", x: cat.x + rand(-6, 6), y: cat.y - 14, vx: rand(-0.3, 0.3), vy: -0.5, t: 50 + i * 8 });
      texts.push({ x: cat.x, y: cat.y - 36, s: "Purr. +10 health", t: 70 }); Arcade.secret("cat");
    }
    if (cat.st === "run") { cat.x -= 3; if (cat.x < cam - 40) cat = null; }
  }
  if (th === "roof" && !posterUsed) {
    const p = alivePlayers().find((q) => Math.abs(q.x - POSTER_X) < 46 && q.y < Y0 + 14 && frameNo - (q.upTap || -99) < 3);
    if (p) {
      posterUsed = true; p.avatarT = 720; p.inv = Math.max(p.inv, 30);
      for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; fx.push({ kind: "dot", x: p.x, y: p.y - 30, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, c: i % 2 ? "#f2c230" : "#d9741c", t: 30 }); }
      Arcade.tone(392, 0.2, "triangle", 0.06); setTimeout(() => Arcade.tone(587, 0.2, "triangle", 0.06), 140); setTimeout(() => Arcade.tone(784, 0.4, "triangle", 0.06), 280);
      texts.push({ x: p.x, y: p.y - 80, s: "Avatar unleashed. Special throws a chakra", t: 120 });
      Arcade.secret("unleash");
    }
  }
  for (const p of players) if (p && p.avatarT > 0 && --p.avatarT === 0) texts.push({ x: p.x, y: p.y - 70, s: "The glow fades", t: 60 });
  if (pigeons) {
    pigeons.t++;
    const scare = players.some((p) => p && (activeAtk(p) || p.st === "run") && Math.abs(p.x - pigeons.x) < 70);
    if (pigeons.st === "sit" && scare) { pigeons.st = "fly"; pigeons.t = 0; Arcade.noise(0.15, 0.04); players.forEach((p) => p && (p.pigeon = false)); }
    if (pigeons.st === "fly" && pigeons.t > 600) { pigeons.st = "sit"; pigeons.t = 0; }
    const calm = alivePlayers().find((p) => Math.abs(p.x - pigeons.x) < 60 && p.stillT > 300 && !p.pigeon);
    if (pigeons.st === "sit" && calm) { calm.pigeon = true; calm.sp = Math.min(100, calm.sp + 30); texts.push({ x: calm.x, y: calm.y - 70, s: "A friend. +30 SP", t: 80 }); Arcade.secret("pigeon"); }
  }
  for (const p of players) if (p && p.pigeon && (activeAtk(p) || DOWN_STATES.includes(p.st) || p.st === "hurt")) p.pigeon = false;
  if (th === "subway") {
    if (!train && frameNo % 600 === 300) train = { x: LW + 40, dir: -1 };
    if (train) {
      train.x += train.dir * 9; if (train.x < -900) train = null; else if (frameNo % 6 === 0) shake = Math.max(shake, 0.8);
      if (train) for (const e of enemies) if ((e.st === "fly" || e.st === "thrown") && e.y < Y0 + 8 && e.z > 6 && !e.trained) { e.trained = true; damage(e, 20, e.lastBy || e); texts.push({ x: e.x, y: e.y - 60, s: "Mind the gap", t: 60 }); Arcade.noise(0.2, 0.1); Arcade.secret("train"); }
    }
  }
  if (th === "factory" && frameNo % 7 === 0) {
    const fx0 = Math.floor((cam + 120) / 512) * 512 + 256;
    fx.push({ kind: "ember", x: fx0 + rand(-20, 20), y: 112, vx: rand(-0.5, 0.5), vy: rand(-1.2, -0.4), t: rand(30, 60) });
  }
  if (th === "roof" && frameNo % 9 === 0) {
    const vx0 = Math.floor(cam / 300) * 300 + 210;
    fx.push({ kind: "steam", x: vx0, y: 116, vx: rand(0.1, 0.4), vy: rand(-0.5, -0.3), t: rand(40, 70) });
  }
}

/* ---------- palette ---------- */
let PAL = null;
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const m = (c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
  return "#" + ((1 << 24) | (m(r) << 16) | (m(gg) << 8) | m(b)).toString(16).slice(1);
}
function palette() {
  const T = Arcade.tokens(), d = T.dark;
  PAL = {
    T, dark: d, ol: "#15121a", spark: d ? "#fff6e0" : "#ffffff", wood: d ? "#7a5233" : "#8a5d3b",
    sky: d ? "#14121a" : "#e9dfe6", sky2: d ? "#1c1824" : "#ddd0dc", far: d ? "#221f27" : "#cfc3cc", farWin: d ? "#5a4a63" : "#f4ecf0",
    walls: d ? ["#2b2724", "#2f2a2d", "#27242a"] : ["#ddd2c4", "#d3c6b8", "#e3d9cc"],
    trim: d ? "#3b3631" : "#bfb2a2", brick: d ? "#3a2a2a" : "#c9ada0", brickLine: d ? "#2a1e1e" : "#b5978a",
    glass: d ? "#1b2a33" : "#b8c9cf", glassLit: d ? "#4a3d24" : "#f3e3bf",
    side: d ? "#3a3632" : "#cbc2b5", sideLine: d ? "#2e2a27" : "#b6ab9c", curb: d ? "#4a4540" : "#a99d8d",
    road: d ? "#232120" : "#9d968c", lane: d ? "#5d5852" : "#e9e4dc",
    tile: d ? "#2c2d31" : "#e6e2da", tileLine: d ? "#232427" : "#cfc9be", ceil: d ? "#151417" : "#3b3832", lamp: d ? "#e9e2c8" : "#fffbe9",
    plat: d ? "#3a3836" : "#b9b2a7", platLine: d ? "#2f2d2b" : "#a39b8f", rail: d ? "#6b6560" : "#77706a", pit: d ? "#0f0e10" : "#4a4640",
    trainBody: d ? "#8d939b" : "#c9ced4", trainWin: d ? "#2a3440" : "#5d6b78",
    tar: d ? "#262427" : "#77727a", tarDot: d ? "#343136" : "#8a858e", parapet: d ? "#36323a" : "#a49aa6",
    steel: d ? "#2f3236" : "#5d6168", steelHi: d ? "#43474d" : "#7a7f86", plate: d ? "#2b2a2c" : "#6e6a66", plateDot: d ? "#3a393b" : "#807b77",
    corr: d ? "#1d1c1f" : "#4e4b52", corrLine: d ? "#252428" : "#59565d",
    skin: ["#c98e62", "#9a6440", "#e0b088", "#7b4a2c"], hair: "#1d1b18",
    shadow: "rgba(0,0,0,0.28)", neon: T.accent, neon2: T.teal, amber: T.amber
  };
}
Arcade.onTheme(palette);

/* ---------- backgrounds ---------- */
const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
const SIGNS = ["NANI'S DHABA", "CHAI", "SWEETS", "PAAN", "TAILOR", "KIRANA", "STD PCO", "BANGLES", "PHOTO STUDIO", "MOBILE REPAIR", "LASSI", "CHEMIST"];
function text(s, x, y, size, c, align = "center", font = "IBM Plex Mono") { g.font = "bold " + size + "px " + (font === "sans-serif" ? "sans-serif" : "'" + font + "', monospace"); g.textAlign = align; g.fillStyle = c; g.fillText(s, x, y); }
function stars(P, n, maxY) { if (!P.dark) return; for (let i = 0; i < n; i++) { const sx = ((i * 97 + 13) % LW), sy = (i * 53) % maxY; if ((frameNo + i * 11) % 120 < 110) R(sx, sy, 1, 1, i % 3 ? "#c8c0d8" : "#fff"); } }
function skyline(P, par, base, tall) {
  const off = cam * par;
  for (let i = -1; i < 14; i++) {
    const seed = Math.floor(off / 40) + i, bx = i * 40 - (off % 40), h = tall + ((seed * 37) % 45);
    R(bx, base - h, 36, h + 20, P.far);
    if (seed % 5 === 0) { R(bx + 16, base - h - 10, 2, 10, P.far); if (frameNo % 60 < 30) R(bx + 15, base - h - 12, 3, 2, P.T.red); }
    for (let wy = base - h + 6; wy < base - 4; wy += 9) for (let wx = 4; wx < 32; wx += 8) if (((seed * 7 + wx * 3 + wy) % 5) === 0) R(bx + wx, wy, 3, 4, P.farWin);
  }
}

function drawStreet(P) {
  R(0, 0, LW, LH, P.sky); stars(P, 40, 60);
  g.fillStyle = P.dark ? "#3a3440" : "#f6eff3"; g.beginPath(); g.arc(300 - cam * 0.05, 26, 11, 0, 7); g.fill();
  skyline(P, 0.3, 112, 50);
  const first = Math.floor(cam / 128) - 1;
  for (let i = first; i < first + 5; i++) {
    const x = i * 128 - cam, ware = i * 128 >= 1300, top = 26 + (i % 2) * 10;
    if (ware) {
      R(x, 34, 128, 116, P.brick);
      for (let by = 38; by < 150; by += 6) { R(x, by, 128, 1, P.brickLine); for (let bx = (by / 6) % 2 ? 0 : 8; bx < 128; bx += 16) R(x + bx, by - 5, 1, 5, P.brickLine); }
      R(x + 20, 82, 88, 68, P.trim); for (let sy = 84; sy < 150; sy += 4) R(x + 20, sy, 88, 1, P.brickLine);
      R(x + 58, 70, 12, 6, P.amber); text("GODOWN " + (i - 9), x + 64, 64, 7, P.neon);
      R(x + 10, 120, 6, 30, P.T.amber); for (let s = 0; s < 30; s += 6) R(x + 10, 120 + s, 6, 3, P.ol);
    } else {
      const wall = P.walls[((i % 3) + 3) % 3];
      R(x, top, 128, 150 - top, wall); R(x, top, 128, 3, P.trim);
      // cornice and roof clutter
      R(x + 4, top - 4, 120, 4, shade(wall, -0.12));
      if (i % 3 === 0) { R(x + 90, top - 18, 16, 14, P.trim); R(x + 92, top - 4, 2, 4, P.trim); R(x + 102, top - 4, 2, 4, P.trim); }
      // windows with sills, curtains and an AC unit
      for (let wx = 10; wx < 120; wx += 28) {
        const lit = (i + wx) % 3 === 0, wy = 44 + (i % 2) * 6;
        R(x + wx, wy, 18, 20, lit ? P.glassLit : P.glass);
        R(x + wx + 8, wy, 2, 20, shade(wall, -0.2));
        if (lit) R(x + wx + 1, wy + 1, 5, 18, shade(P.glassLit, -0.15));
        R(x + wx - 1, wy + 20, 20, 2, P.trim);
        if ((i * 3 + wx) % 4 === 0) { R(x + wx + 3, wy + 22, 12, 7, P.trim); R(x + wx + 5, wy + 24, 8, 1, P.ol); R(x + wx + 5, wy + 26, 8, 1, P.ol); }
      }
      // fire escape on every other building
      if (i % 2 === 0) {
        g.strokeStyle = P.dark ? "#56504a" : "#4a453f"; g.lineWidth = 1;
        for (let fy = 70; fy < 100; fy += 26) { g.strokeRect(x + 66.5, fy + 0.5, 34, 1); for (let rx = 0; rx < 35; rx += 4) R(x + 66 + rx, fy - 6, 1, 7, g.strokeStyle); }
        g.beginPath(); g.moveTo(x + 68, 96); g.lineTo(x + 98, 72); g.stroke();
      }
      // shop front, sign, awning, door
      R(x + 10, 104, 74, 40, P.glass);
      R(x + 10, 104, 74, 2, shade(P.glass, -0.2));
      R(x + 16, 128, 14, 16, shade(P.glass, -0.25)); R(x + 50, 124, 10, 20, shade(P.glass, -0.25));
      R(x + 94, 104, 24, 46, P.trim); R(x + 97, 108, 18, 42, shade(wall, -0.25)); R(x + 111, 128, 2, 2, P.amber);
      const sign = SIGNS[((i % SIGNS.length) + SIGNS.length) % SIGNS.length], neon = i % 2 ? P.neon : P.neon2;
      R(x + 12, 84, 105, 15, P.dark ? "#18161b" : shade(wall, -0.08));
      g.strokeStyle = neon; g.lineWidth = 1; g.strokeRect(x + 12.5, 84.5, 104, 14);
      g.globalAlpha = (frameNo + i * 37) % 240 < 4 ? 0.35 : 1; text(sign, x + 64, 95, 9, neon); g.globalAlpha = 1;
      for (let s = 0; s < 8; s++) { g.globalAlpha = s % 2 ? 1 : 0.6; R(x + 8 + s * 10, 100, 10, 4, s % 2 ? P.trim : neon); }
      g.globalAlpha = 1;
      // poster and a little graffiti
      if (i % 3 === 1) { R(x + 86, 60, 12, 16, P.T.amber); R(x + 88, 63, 8, 2, P.ol); R(x + 88, 67, 6, 1, P.ol); }
      if (i % 4 === 2) text("RAI", x + 40, 80, 8, shade(P.neon, 0.15), "center", "Newsreader");
    }
    R(x + 126, 30, 2, 120, P.trim);
  }
  // sidewalk, kerb, road
  R(0, 150, LW, 24, P.side);
  for (let sx = -(cam % 32); sx < LW; sx += 32) R(sx, 150, 1, 24, P.sideLine);
  R(0, 160, LW, 1, P.sideLine); R(0, 174, LW, 3, P.curb); R(0, 177, LW, LH - 177, P.road);
  for (let lx = -(cam % 48); lx < LW; lx += 48) R(lx, 197, 24, 2, P.lane);
  // an auto-rickshaw parked at the kerb, and a cow who owns the road
  for (let ax = -(cam % 512) + 300; ax < LW + 40; ax += 512) {
    R(ax - 1, 160, 34, 15, P.ol); R(ax, 161, 32, 13, "#f2c230"); R(ax, 161, 32, 5, "#1d1b18"); R(ax + 2, 166, 12, 6, P.glass);
    g.fillStyle = P.ol; g.beginPath(); g.arc(ax + 6, 176, 3.5, 0, 7); g.arc(ax + 27, 176, 3.5, 0, 7); g.fill();
  }
  for (let cx = -((cam + 200) % 768) + 600; cx < LW + 40; cx += 768) {
    // a white cow resting on the road, chewing, with a hump and curved horns
    const cw = "#ece6dc", cs = "#b9ad98", chew = frameNo % 40 < 20 ? 0 : 1;
    R(cx - 1, 183, 38, 14, P.ol); R(cx, 184, 36, 12, cw); R(cx + 22, 181, 8, 5, cw); R(cx + 4, 188, 10, 6, cs);
    R(cx + 33, 178, 11, 10, P.ol); R(cx + 34, 179, 9, 8, cw); R(cx + 40, 183 + chew, 3, 3, "#d9b9a0");
    R(cx + 34, 176, 1, 3, "#8a7f70"); R(cx + 33, 175, 2, 1, "#8a7f70"); R(cx + 41, 176, 1, 3, "#8a7f70"); R(cx + 41, 175, 2, 1, "#8a7f70");
    R(cx + 38, 181, 1.5, 1.5, "#1d1b18"); R(cx - 4 + Math.sin(frameNo / 20) * 1.5, 186, 4, 1, cs); R(cx - 6 + Math.sin(frameNo / 20) * 2, 185, 2, 3, cs);
  }
  for (let mx = -(cam % 300) + 140; mx < LW; mx += 300) { g.fillStyle = P.sideLine; g.beginPath(); g.ellipse(mx, 188, 9, 3, 0, 0, 7); g.fill(); }
  // street props along the back of the sidewalk
  for (let px = -(cam % 256); px < LW + 40; px += 256) {
    const wx = px + cam;
    R(px + 2, 92, 3, 60, P.dark ? "#4a4540" : "#5d5852"); R(px - 4, 90, 14, 4, P.dark ? "#4a4540" : "#5d5852"); R(px - 2, 94, 10, 2, P.lamp);
    g.globalAlpha = P.dark ? 0.12 : 0.06; g.fillStyle = P.lamp; g.beginPath(); g.moveTo(px - 2, 96); g.lineTo(px + 8, 96); g.lineTo(px + 26, 168); g.lineTo(px - 20, 168); g.fill(); g.globalAlpha = 1;
    if (Math.floor(wx / 256) % 2 === 0) { g.fillStyle = P.dark ? "#1d1c1f" : "#3b3832"; g.beginPath(); g.ellipse(px + 70, 149, 8, 6, 0, 0, 7); g.ellipse(px + 80, 150, 6, 5, 0, 0, 7); g.fill(); }
  }
}

function drawSubway(P) {
  R(0, 0, LW, LH, P.tile);
  for (let ty = 26; ty < 118; ty += 6) R(0, ty, LW, 1, P.tileLine);
  for (let tx = -(cam % 12); tx < LW; tx += 12) R(tx, 26, 1, 92, P.tileLine);
  R(0, 64, LW, 8, P.neon); R(0, 74, LW, 2, P.neon2);
  // ceiling with strip lights
  R(0, 0, LW, 26, P.ceil);
  for (let lx = -(cam % 64); lx < LW; lx += 64) { R(lx + 10, 18, 40, 4, P.lamp); g.globalAlpha = 0.08; g.fillStyle = P.lamp; g.fillRect(lx, 22, 60, 20); g.globalAlpha = 1; }
  // station boards, route maps, posters, clocks
  for (let px = -(cam % 256); px < LW + 60; px += 256) {
    R(px + 20, 34, 70, 20, "#1d1b18"); R(px + 21, 35, 68, 1, P.neon); R(px + 20, 34, 70, 20, "#f2c230"); text("BUNDER ROAD", px + 55, 44, 6.5, "#1d1b18"); text("बंदर रोड", px + 55, 52, 6.5, "#1d1b18", "center", "sans-serif");
    R(px + 110, 80, 34, 30, "#f7f4ee"); R(px + 111, 81, 32, 28, P.dark ? "#d9d4cb" : "#fffdf9");
    g.strokeStyle = P.neon; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + 114, 100); g.lineTo(px + 126, 90); g.lineTo(px + 140, 96); g.stroke();
    g.strokeStyle = P.neon2; g.beginPath(); g.moveTo(px + 116, 86); g.lineTo(px + 128, 104); g.stroke();
    if (Math.floor((px + cam) / 256) % 2 === 0) drawAvatarPoster(px + 168, 80, 30, 38, true);
    g.fillStyle = "#f7f4ee"; g.beginPath(); g.arc(px + 225, 44, 7, 0, 7); g.fill(); g.strokeStyle = "#1d1b18"; g.lineWidth = 1; g.stroke();
    R(px + 225, 39, 1, 5, "#1d1b18"); R(px + 225, 44, 4, 1, "#1d1b18");
  }
  // track pit with rails; trains pass now and then
  R(0, 118, LW, 26, P.pit);
  R(0, 128, LW, 2, P.rail); R(0, 137, LW, 2, P.rail);
  for (let sx = -(cam % 14); sx < LW; sx += 14) R(sx, 130, 6, 7, shade(P.pit, 0.12));
  if (train) {
    for (let c = 0; c < 4; c++) {
      const tx = train.x + c * 210;
      R(tx, 58, 204, 82, "#7a2230"); R(tx, 58, 204, 3, "#9a3a46"); R(tx, 104, 204, 5, "#f2c230"); R(tx, 112, 204, 2, "#f2c230");
      for (let w = 10; w < 196; w += 32) R(tx + w, 70, 22, 22, P.trainWin);
      R(tx + 96, 70, 14, 44, shade(P.trainBody, -0.2));
    }
  }
  // platform with tactile strip
  R(0, 144, LW, LH - 144, P.plat);
  R(0, 144, LW, 3, P.amber); for (let dx = -(cam % 6); dx < LW; dx += 6) R(dx, 145, 2, 1, shade(P.amber, -0.3));
  for (let sx = -(cam % 40); sx < LW; sx += 40) R(sx, 147, 1, LH - 147, P.platLine);
  for (let sy = 166; sy < LH; sy += 20) R(0, sy, LW, 1, P.platLine);
  // benches along the back
  for (let bx = -(cam % 192) + 60; bx < LW; bx += 192) { R(bx, 146, 40, 4, P.dark ? "#5b4a3a" : "#8a6a4a"); R(bx + 3, 150, 3, 6, P.rail); R(bx + 34, 150, 3, 6, P.rail); }
}

function drawRoof(P) {
  R(0, 0, LW, 50, P.sky); R(0, 50, LW, 40, P.sky2); R(0, 90, LW, 60, P.dark ? "#241f2c" : "#d2c3d0");
  stars(P, 60, 80);
  g.fillStyle = P.dark ? "#d9d0c0" : "#fff8f0"; g.beginPath(); g.arc(80 - cam * 0.03, 30, 13, 0, 7); g.fill();
  skyline(P, 0.15, 128, 60);
  // mid layer: water towers, a billboard, antennas
  const off = cam * 0.6;
  for (let i = -1; i < 4; i++) {
    const x = i * 220 - (off % 220), seed = Math.floor(off / 220) + i;
    if (seed % 2 === 0) {
      // black plastic water tanks, the skyline of every Indian rooftop
      for (let t = 0; t < 2; t++) { const tx = x + 16 + t * 26; R(tx, 84, 22, 24, "#1b1a1d"); R(tx - 1, 82, 24, 4, "#2a292d"); R(tx + 2, 90, 18, 1, "#2f2e33"); R(tx + 2, 98, 18, 1, "#2f2e33"); }
      R(x + 14, 108, 54, 18, P.dark ? "#3a3640" : "#9a90a0");
    } else {
      // a washing line with saris drying
      g.strokeStyle = P.rail; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 10, 80); g.quadraticCurveTo(x + 70, 88, x + 130, 80); g.stroke();
      [["#d9741c", 20], ["#a8186a", 50], ["#2b54a8", 82], ["#2f6b3a", 108]].forEach(([c, dx]) => { const sw = Math.sin(frameNo / 30 + dx) * 1.5; R(x + dx + sw, 84, 14, 26, c); R(x + dx + sw, 84, 14, 2, "#f2c230"); });
      R(x + 8, 78, 2, 48, P.rail); R(x + 130, 78, 2, 48, P.rail);
    }
    R(x + 170, 50, 1, 76, P.rail); R(x + 166, 60, 9, 1, P.rail); R(x + 167, 72, 7, 1, P.rail);
    if (frameNo % 50 < 25) R(x + 169, 48, 3, 3, P.T.red);
  }
  // kites in the sky (Sankranti is over, nobody told them)
  for (let k = 0; k < 4; k++) {
    const kx = ((k * 131 + frameNo * 0.15 - cam * 0.4) % (LW + 60) + LW + 60) % (LW + 60) - 30, ky = 24 + k * 9 + Math.sin(frameNo / 40 + k) * 4;
    const c = ["#a8186a", "#f2c230", "#2b54a8", "#d9741c"][k];
    g.fillStyle = c; g.beginPath(); g.moveTo(kx, ky - 6); g.lineTo(kx + 5, ky); g.lineTo(kx, ky + 6); g.lineTo(kx - 5, ky); g.fill();
    g.strokeStyle = P.dark ? "#8f8a96" : "#6f6a78"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(kx, ky + 6); g.quadraticCurveTo(kx + 6, ky + 14, kx + 2, ky + 22); g.stroke();
  }
  // near parapet with vents, AC units and a stair door
  R(0, 120, LW, 30, P.parapet); R(0, 120, LW, 3, shade(P.parapet, 0.12));
  for (let px = -(cam % 300); px < LW + 60; px += 300) {
    R(px + 20, 100, 44, 30, P.trim); R(px + 24, 104, 20, 20, shade(P.trim, -0.2));
    g.strokeStyle = P.ol; g.lineWidth = 1; g.beginPath(); const a = frameNo / 6;
    g.moveTo(px + 34 + Math.cos(a) * 8, 114 + Math.sin(a) * 8); g.lineTo(px + 34 - Math.cos(a) * 8, 114 - Math.sin(a) * 8);
    g.moveTo(px + 34 + Math.cos(a + 1.57) * 8, 114 + Math.sin(a + 1.57) * 8); g.lineTo(px + 34 - Math.cos(a + 1.57) * 8, 114 - Math.sin(a + 1.57) * 8); g.stroke();
    R(px + 100, 84, 46, 46, P.walls[1]); R(px + 112, 98, 20, 32, shade(P.walls[1], -0.3)); R(px + 114, 90, 16, 6, P.T.good); text("EXIT", px + 122, 95, 5, "#fff");
    R(px + 206, 104, 8, 26, P.rail); R(px + 202, 100, 16, 5, P.rail);
  }
  // the big poster for Unleash The Avatar, standing on the roof
  const bx = POSTER_X - cam;
  if (bx > -140 && bx < LW + 80) { R(bx - 52, 108, 3, 42, P.rail); R(bx + 49, 108, 3, 42, P.rail); drawAvatarPoster(bx - 58, 40, 116, 70, false); }
  // tar roof
  R(0, 150, LW, LH - 150, P.tar);
  for (let i = 0; i < 70; i++) { const gx = ((i * 89 + 7) - cam) % LW, gy = 152 + (i * 37) % 60; R(gx < 0 ? gx + LW : gx, gy, 1, 1, P.tarDot); }
  for (let sx = -(cam % 96); sx < LW; sx += 96) R(sx, 150, 1, LH - 150, shade(P.tar, 0.08));
  R(0, 150, LW, 2, shade(P.tar, -0.2));
}

function drawFactory(P) {
  R(0, 0, LW, LH, P.corr);
  for (let cx = -(cam * 0.9 % 6); cx < LW; cx += 6) R(cx, 0, 2, 150, P.corrLine);
  // high windows
  for (let wx = -(cam * 0.9 % 180); wx < LW; wx += 180) {
    R(wx + 20, 14, 90, 30, P.dark ? "#2a3440" : "#9fb3c0");
    for (let gx = 0; gx <= 90; gx += 15) R(wx + 20 + gx, 14, 2, 30, P.steel);
    R(wx + 20, 28, 90, 2, P.steel);
  }
  // catwalk
  R(0, 58, LW, 4, P.steel);
  for (let rx = -(cam % 16); rx < LW; rx += 16) R(rx, 46, 1, 12, P.steelHi);
  R(0, 46, LW, 1, P.steelHi);
  // boiler fireboxes with flicker (the mill's steam came from here)
  for (let fx0 = -(cam % 512) + 256 - 40; fx0 < LW + 80; fx0 += 512) {
    R(fx0, 70, 80, 60, P.steel); R(fx0 + 4, 74, 72, 52, P.steelHi);
    g.fillStyle = P.dark ? "#1a0f0a" : "#2b1a10"; g.beginPath(); g.moveTo(fx0 + 14, 126); g.lineTo(fx0 + 14, 96); g.arc(fx0 + 40, 96, 26, Math.PI, 0); g.lineTo(fx0 + 66, 126); g.fill();
    const fl = 0.65 + Math.sin(frameNo / 5) * 0.15 + Math.random() * 0.1;
    g.globalAlpha = fl; g.fillStyle = P.amber; g.beginPath(); g.moveTo(fx0 + 20, 126); g.lineTo(fx0 + 20, 102); g.arc(fx0 + 40, 102, 20, Math.PI, 0); g.lineTo(fx0 + 60, 126); g.fill();
    g.fillStyle = P.T.red; g.fillRect(fx0 + 22, 112, 36, 14); g.globalAlpha = 1;
  }
  // mill name painted on the wall
  for (let mx0 = -(cam * 0.9 % 640) + 300; mx0 < LW + 100; mx0 += 640) { R(mx0, 50, 120, 14, P.dark ? "#2a2830" : "#3b3832"); text("CHANDNI MILLS  EST. 1931", mx0 + 60, 60, 7, "#f2c230"); }
  // conveyor carrying bolts of cloth
  R(0, 128, LW, 4, P.steel); R(0, 138, LW, 2, P.steel);
  for (let rx = -((cam + frameNo * 0.8) % 12); rx < LW; rx += 12) { g.fillStyle = P.steelHi; g.beginPath(); g.arc(rx, 134, 3, 0, 7); g.fill(); }
  for (let bx = -((cam + frameNo * 0.8) % 90); bx < LW; bx += 90) { const cc = ["#a8186a", "#2b54a8", "#d9741c", "#2f6b3a"][Math.abs(Math.floor((bx + cam + frameNo * 0.8) / 90)) % 4]; R(bx, 116, 22, 12, cc); R(bx, 118, 22, 1, shade(cc, 0.25)); R(bx, 124, 22, 1, shade(cc, -0.25)); g.fillStyle = shade(cc, -0.3); g.beginPath(); g.ellipse(bx + 22, 122, 2, 6, 0, 0, 7); g.fill(); }
  // steel columns and hanging lamps
  for (let cx = -(cam % 160); cx < LW + 20; cx += 160) {
    R(cx, 0, 10, 146, P.steel); R(cx - 2, 0, 14, 3, P.steelHi); R(cx + 4, 0, 2, 146, P.steelHi);
    R(cx + 80, 0, 1, 34, P.rail); R(cx + 74, 34, 14, 5, P.steelHi);
    g.globalAlpha = P.dark ? 0.12 : 0.07; g.fillStyle = P.lamp; g.beginPath(); g.moveTo(cx + 74, 39); g.lineTo(cx + 88, 39); g.lineTo(cx + 110, 150); g.lineTo(cx + 52, 150); g.fill(); g.globalAlpha = 1;
    const sw = Math.sin(frameNo / 40 + cx) * 3; g.strokeStyle = P.rail; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + 120, 0); g.lineTo(cx + 120 + sw, 52); g.stroke(); R(cx + 117 + sw, 52, 6, 3, P.rail);
  }
  // floor plates and hazard edge
  R(0, 146, LW, 4, P.amber); for (let hx = -(cam % 12); hx < LW; hx += 12) { g.fillStyle = P.ol; g.beginPath(); g.moveTo(hx, 150); g.lineTo(hx + 6, 146); g.lineTo(hx + 10, 146); g.lineTo(hx + 4, 150); g.fill(); }
  R(0, 150, LW, LH - 150, P.plate);
  for (let px = -(cam % 48); px < LW; px += 48) R(px, 150, 1, LH - 150, shade(P.plate, -0.2));
  for (let py = 170; py < LH; py += 22) R(0, py, LW, 1, shade(P.plate, -0.2));
  for (let dx = -(cam % 8); dx < LW; dx += 8) for (let dy = 154; dy < LH; dy += 8) R(dx + ((dy / 8) % 2) * 4, dy, 2, 1, P.plateDot);
}

/* A fan nod to "Unleash The Avatar", the upcoming game by Aeos Games
   (Bengaluru). Original pixel art: a figure with a glowing chakra and a
   peacock feather, the title and the studio name. */
const POSTER_X = 1072;
let posterUsed = false, naniRef = null;
function drawAvatarPoster(x, y, w, h, small) {
  const glow = !small && stageIdx === 2 && !posterUsed && (frameNo % 120 < 60);
  R(x - 1, y - 1, w + 2, h + 2, "#0b0912"); R(x, y, w, h, "#1b1530");
  R(x, y + h * 0.62, w, h * 0.38, "#2a1a3a");
  // the chakra: a spinning ring of spokes behind the figure
  const cx = x + w * 0.5, cy = y + h * 0.42, r = Math.min(w, h) * 0.3, a0 = frameNo / 30;
  g.strokeStyle = glow ? "#ffd75e" : "#d9741c"; g.lineWidth = small ? 1 : 2; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
  g.lineWidth = small ? 0.6 : 1; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = a0 + i * Math.PI / 4; g.moveTo(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.stroke();
  // the figure: a silhouette with a crown and a feather
  const fw = w * 0.16, fh = h * 0.5;
  g.fillStyle = "#0b0912"; g.beginPath(); g.moveTo(cx - fw, y + h * 0.86); g.lineTo(cx - fw * 0.6, cy - fh * 0.15); g.lineTo(cx, cy - fh * 0.42); g.lineTo(cx + fw * 0.6, cy - fh * 0.15); g.lineTo(cx + fw, y + h * 0.86); g.fill();
  R(cx - fw * 0.35, cy - fh * 0.62, fw * 0.7, fh * 0.22, "#0b0912");
  R(cx + fw * 0.2, cy - fh * 0.9, Math.max(1, w * 0.02), fh * 0.3, "#1f7a6a"); R(cx + fw * 0.1, cy - fh * 0.95, Math.max(1.5, w * 0.04), Math.max(1.5, w * 0.04), "#2b54a8");
  if (glow) { g.globalAlpha = 0.25; g.fillStyle = "#ffd75e"; g.beginPath(); g.arc(cx, cy, r * 1.4, 0, 7); g.fill(); g.globalAlpha = 1; }
  if (small) { text("UNLEASH", cx, y + h - 8, 4, "#f2c230", "center", "Newsreader"); text("THE AVATAR", cx, y + h - 3, 3.2, "#f2c230", "center", "Newsreader"); return; }
  text("UNLEASH THE AVATAR", cx, y + h - 13, 10, "#f2c230", "center", "Newsreader");
  text("AEOS GAMES", cx, y + h - 4, 5, "#cfc6b7", "center", "IBM Plex Sans");
  text("fan art", x + w - 3, y + 7, 4, "#8a7f9a", "right", "IBM Plex Sans");
  if (glow) text("press up", cx, y - 4, 6, "#ffd75e", "center", "IBM Plex Sans");
}
function drawForeground(P) {
  const th = STAGES[stageIdx].theme;
  if (th === "subway") for (let px = -(cam * 1.2 % 300); px < LW + 20; px += 300) { R(px, 36, 10, LH, P.dark ? "#2a2b2f" : "#d7d2c9"); R(px + 2, 36, 2, LH, P.dark ? "#34353a" : "#e9e5de"); R(px - 2, 84, 14, 6, P.neon); }
  if (th === "factory") for (let px = -(cam * 1.25 % 360) + 180; px < LW + 20; px += 360) { R(px, 36, 8, LH, P.ol); R(px + 2, 36, 2, LH, P.steel); R(px - 6, 36, 20, 4, P.ol); }
}

/* ---------- characters ----------
   Joints are posed per state facing right with feet at (0,0), then the
   figure is mirrored and scaled. Each body part is drawn twice: a dark
   outline pass and a colour pass, in three layers (back limbs, body,
   front limbs) so overlapping parts keep their edges. */
const COSTUME = {
  avatar:  { rai: (P) => ({ jacket: "#d9741c", shirt: "#f2c230" }), kai: (P) => ({ jacket: "#d9741c", shirt: "#2b54a8" }) },
  classic: { rai: (P) => ({ jacket: P.T.accent, shirt: "#f4efe6" }), kai: (P) => ({ jacket: P.T.teal, shirt: "#22252b" }) },
  neon:    { rai: (P) => ({ jacket: "#141218", shirt: "#f07ab8" }), kai: (P) => ({ jacket: "#141218", shirt: "#5cc8c0" }) },
  gold:    { rai: (P) => ({ jacket: "#c9a227", shirt: "#1d1b18" }), kai: (P) => ({ jacket: "#c9a227", shirt: "#13756f" }) }
};
const LOOKS = {
  nani:      (P) => ({ skin: P.skin[2], jacket: "#7b5c86", shirt: "#efe6d6", pants: "#3b3542", shoe: "#2a2420", sole: "#111", hair: "#cfc8bf", hairStyle: "bun", specs: true }),
  rai:       (P) => ({ skin: P.skin[0], ...COSTUME[costume].rai(P), shirt0: "#f4efe6", pants: "#2f3448", shoe: "#ece6dc", sole: "#8b8478", hair: P.hair, hairStyle: "spiky", band: "#f4efe6", glove: P.skin[0] }),
  kai:       (P) => ({ skin: P.skin[2], ...COSTUME[costume].kai(P), shirt0: "#22252b", pants: "#4f4335", shoe: "#2b2622", sole: "#14110f", hair: "#5a3a22", hairStyle: "pony", band: P.T.teal, glove: P.T.teal, vest: true }),
  grunt:     (P) => ({ skin: P.skin[1], shirt: P.T.amber, pants: "#4a5560", shoe: "#2a2420", sole: "#111", hair: P.hair, hairStyle: "cap", cap: "#2f3a4a", sleeves: "short" }),
  pipeGrunt: (P) => ({ skin: P.skin[0], jacket: "#6d7a45", shirt: "#3a3a32", pants: "#4a4038", shoe: "#2a2420", sole: "#111", hair: "#6b3b24", hairStyle: "beanie", cap: "#8a2f2f" }),
  kicker:    (P) => ({ skin: P.skin[3], shirt: null, vest: true, jacket: "#26242a", pants: "#1f1d22", stripe: P.T.red, shoe: "#d9d2c6", sole: "#555", hair: P.T.red, hairStyle: "mohawk", sleeves: "none" }),
  thrower:   (P) => ({ skin: P.skin[2], jacket: "#4a3326", shirt: "#bfb7aa", pants: "#2c2a30", shoe: "#1a1816", sole: "#000", hair: P.hair, hairStyle: "bandana", cap: P.T.amber, shades: true }),
  bruiser:   (P) => ({ skin: P.skin[1], shirt: P.T.red, pants: "#3f4636", shoe: "#1a1a1a", sole: "#000", hair: P.hair, hairStyle: "bald", beard: true, sleeves: "none" }),
  // Bhola, a pehelwan (wrestler): vest, white dhoti-style pants, a big moustache
  ox:        (P) => ({ skin: P.skin[1], shirt: "#ece6dc", pants: "#ece6dc", belt: P.T.red, shoe: "#5a3a22", sole: "#2a1a10", hair: P.hair, hairStyle: "bald", mustache: true, scar: true, sleeves: "none" }),
  // Raghav, a kalaripayattu master: white with a red waist cloth, hair in a kudumi
  rook:      (P) => ({ skin: P.skin[1], shirt: "#efe9dd", pants: "#efe9dd", belt: P.T.red, shoe: P.skin[1], sole: shade(P.skin[1], -0.3), hair: P.hair, hairStyle: "topknot", glove: "#ece6dc", gi: true }),
  // Cheel, a kite runner: teal kurta, dupatta over her face
  crane:     (P) => ({ skin: P.skin[2], jacket: "#1f5a5a", shirt: "#141a1a", pants: "#2a2230", shoe: "#0e0e0e", sole: "#000", hair: "#2a2a2a", hairStyle: "long", mask: true, scarf: P.T.amber }),
  // Ranjit, "Mr. Rollback": Nehru jacket over a white kurta, dark glasses
  rollback:  (P) => ({ skin: P.skin[0], jacket: "#2b2b33", shirt: "#f4efe6", pocket: P.T.red, pants: "#f4efe6", mustache: true, shoe: "#0e0e0e", sole: "#000", hair: P.hair, hairStyle: "slick", shades: true, glove: "#1d1b18" })
};

function pose(f) {
  let p = { hip: [0, -18], sh: [1, -31], head: [2, -38], hf: [9, -27], ef: [6, -24], hb: [5, -28], eb: [1, -25], ff: [6, 0], kf: [5, -9], fb: [-5, 0], kb: [-3, -9], rot: 0, rc: [0, -18] };
  const s = f.st, t = f.t, at = f.atkName;
  const bob = Math.round(Math.sin(frameNo / 14 + f.id * 10) * 0.7);
  if (s === "idle" || s === "grabbed") { for (const j of ["sh", "head", "hf", "ef", "hb", "eb"]) p[j] = [p[j][0], p[j][1] + bob]; }
  if (s === "walk" || s === "run") {
    const sp = s === "run" ? 1.9 : 1.6, a = Math.sin(f.walkPh * sp), c = Math.cos(f.walkPh * sp), r = s === "run" ? 1.6 : 1;
    p.ff = [5 + a * 6 * r, -Math.max(0, c) * 2 * r]; p.kf = [6 + a * 4 * r, -9 - Math.max(0, c) * 2];
    p.fb = [-3 - a * 6 * r, -Math.max(0, -c) * 2 * r]; p.kb = [-2 - a * 3 * r, -9 - Math.max(0, -c) * 2];
    p.hf = [6 - a * 5 * r, -23]; p.ef = [3 - a * 2, -26]; p.hb = [-2 + a * 5 * r, -23]; p.eb = [-1 + a * 2, -26];
    if (s === "run") { p.sh = [5, -30]; p.head = [7, -36]; }
    p.sh[1] += Math.abs(c) > 0.7 ? -1 : 0; p.head[1] = p.sh[1] - 7;
  }
  const A = (name) => s === "attack" && at === name, ext = (lo, hi) => f.atk && t >= f.atk.a0 - lo && t <= f.atk.a1 + hi;
  if (A("jab") || A("jab2") || A("ePunch")) {
    const e = ext(2, 2), front = at !== "jab2";
    p.sh = [3, -31]; p.head = [4, -38]; p.ff = [8, 0]; p.kf = [8, -9]; p.fb = [-6, 0]; p.kb = [-4, -9];
    if (front) { p.hf = e ? [21, -30] : [10, -27]; p.ef = e ? [12, -30] : [7, -26]; }
    else { p.hb = e ? [20, -31] : [6, -28]; p.eb = e ? [11, -31] : [2, -26]; p.hf = [8, -27]; }
  }
  if (A("upper") || A("heavy")) {
    const e = ext(1, 4), w = t < f.atk.a0 - 1;
    p.sh = w ? [-1, -29] : [3, -32]; p.head = w ? [0, -36] : [5, -39];
    p.hf = e ? [13, -45] : w ? [-6, -24] : [9, -30]; p.ef = e ? [10, -36] : [-2, -26];
    p.ff = [8, 0]; p.kf = [9, -10]; p.fb = [-6, 0]; p.kb = [-4, -8];
  }
  if (A("kick") || A("eKick") || A("round")) {
    const e = ext(1, 3), hi = at === "round";
    p.sh = [-3, -30]; p.head = [-4, -37];
    p.ff = e ? (hi ? [22, -34] : [25, -18]) : [8, -12]; p.kf = e ? (hi ? [12, -28] : [12, -19]) : [8, -16];
    p.fb = [-3, 0]; p.kb = [-2, -9]; p.hf = [2, -27]; p.ef = [3, -24]; p.hb = [-8, -25]; p.eb = [-4, -27];
  }
  if (A("spinheel")) {
    const ph = t / f.atk.len;
    p.rot = 0; p.sh = [-4, -30]; p.head = [-5, -37];
    if (ph < 0.3) { p.ff = [-14, -20]; p.kf = [-7, -18]; }
    else { p.ff = [26, -26]; p.kf = [13, -23]; }
    p.fb = [-2, 0]; p.kb = [-1, -9]; p.hf = [-6, -28]; p.hb = [-10, -24];
  }
  if (A("elbow")) {
    const e = ext(1, 3);
    p.sh = [2, -31]; p.head = [3, -38]; p.eb = e ? [-14, -28] : [-6, -27]; p.hb = e ? [-6, -29] : [-1, -26];
    p.ff = [7, 0]; p.fb = [-7, 0];
  }
  if (A("tackle")) { p.sh = [9, -28]; p.head = [11, -34]; p.hf = [10, -24]; p.ef = [12, -27]; p.hb = [4, -22]; p.ff = [10, 0]; p.kf = [9, -10]; p.fb = [-10, 0]; p.kb = [-6, -8]; }
  if (A("pipe")) {
    const ph = t / f.atk.len, ang = ph < 0.35 ? -2.2 : ph < 0.55 ? -2.2 + (ph - 0.35) / 0.2 * 2.6 : 0.4;
    p.hf = [3 + Math.cos(ang) * 14, -30 + Math.sin(ang) * 14]; p.ef = [3 + Math.cos(ang) * 7, -30 + Math.sin(ang) * 7]; p.pipeAng = ang;
    p.ff = [8, 0]; p.kf = [8, -9]; p.fb = [-6, 0]; p.kb = [-4, -9];
  }
  if (A("flurry")) { const hi = (t % 6) < 3; p.sh = [-3, -30]; p.head = [-4, -37]; p.ff = hi ? [24, -28] : [25, -16]; p.kf = hi ? [12, -25] : [12, -18]; p.fb = [-3, 0]; p.kb = [-2, -9]; p.hf = [2, -27]; p.hb = [-8, -25]; }
  if (A("toss") || A("eToss") || A("fan") || A("chakra")) { const e = t > 6; p.hf = e ? [18, -32] : [-8, -36]; p.ef = e ? [10, -31] : [-3, -32]; p.sh = e ? [3, -31] : [-2, -30]; }
  if (A("pound") || A("quake")) { const up = t < 20; p.hf = up ? [4, -50] : [14, -6]; p.ef = up ? [3, -42] : [10, -16]; p.hb = up ? [-2, -50] : [8, -6]; p.eb = up ? [-1, -42] : [4, -16]; p.sh = up ? [0, -32] : [6, -24]; p.head = up ? [1, -39] : [9, -30]; if (!up) { p.kf = [8, -6]; p.kb = [-4, -6]; p.hip = [1, -12]; } }
  if (A("charge") || A("rush")) { const a = Math.sin(frameNo / 3); p.sh = [7, -29]; p.head = [9, -35]; p.hf = [16, -26]; p.hb = [-6, -22 + a * 3]; p.ff = [6 + a * 7, 0]; p.kf = [7 + a * 5, -9]; p.fb = [-4 - a * 7, 0]; p.kb = [-3 - a * 4, -9]; }
  if (A("roll") || A("eRoll") || A("kroll")) {
    // rolling kick: tuck into a ball and somersault forward, legs whipping out
    p.rot = t * 0.42; p.rc = [0, -14];
    p.hip = [0, -14]; p.sh = [4, -24]; p.head = [7, -28]; p.hf = [6, -16]; p.ef = [7, -20]; p.hb = [2, -16]; p.eb = [3, -20];
    const out = (t % 8) < 4; p.ff = out ? [16, -14] : [6, -6]; p.kf = out ? [8, -14] : [8, -12]; p.fb = [-2, -6]; p.kb = [2, -10];
  }
  if (s === "windup") {
    const q = Math.sin(frameNo / 2) * 0.6;
    p.sh = [-2 + q, -30]; p.head = [-3 + q, -37]; p.hf = [-7, -27]; p.ef = [-2, -29]; p.hb = [-9, -24];
    if (f.atkName === "charge" || f.atkName === "eRoll") { p.sh = [-4, -28]; p.head = [-5, -34]; p.ff = [9, 0]; p.kf = [8, -8]; p.hip = [0, -16]; }
  }
  if (s === "taunt") { const w = Math.sin(t / 3) * 4; p.hf = [12, -38 + w]; p.ef = [8, -32]; p.hb = [-3, -19]; p.eb = [-4, -24]; p.head = [3, -39]; }
  if (s === "pickup") { p.sh = [6, -24]; p.head = [9, -30]; p.hf = [12, -6]; p.ef = [9, -15]; p.kf = [9, -10]; p.kb = [-1, -10]; p.hip = [1, -15]; }
  if (s === "air") {
    const k = f.airAtk;
    p.ff = [4, -6]; p.kf = [8, -13]; p.fb = [-4, -4]; p.kb = [-1, -12]; p.hf = [8, -35]; p.ef = [6, -31]; p.hb = [-6, -33]; p.eb = [-3, -30];
    if (k === "jkick" || k === "eFly" || k === "dive") { p.ff = [22, -12]; p.kf = [11, -15]; p.fb = [-6, -8]; p.kb = [-2, -14]; p.hf = [4, -34]; p.hb = [-9, -30]; p.sh = [-2, -31]; p.head = [-3, -38]; if (k === "dive") { p.rot = 0.5; } }
    if (k === "flykick") { p.rot = -0.5; p.ff = [24, -16]; p.kf = [12, -17]; p.fb = [-8, -14]; p.kb = [-3, -15]; p.hf = [-6, -34]; p.hb = [-10, -30]; }
    if (k === "cyclone") { p.ff = [24, -20]; p.kf = [12, -20]; p.fb = [-5, -6]; p.kb = [-1, -12]; p.hf = [-8, -32]; p.hb = [-10, -28]; }
    if (k === "dragon") { p.hf = [6, -54]; p.ef = [5, -44]; p.sh = [3, -33]; p.head = [5, -40]; p.ff = [6, -2]; p.kf = [8, -12]; p.fb = [-3, -6]; }
  }
  if (s === "grab") { p.hf = [14, -29]; p.ef = [8, -29]; p.hb = [12, -25]; p.eb = [5, -25]; }
  if (s === "knee") { p.hf = [14, -29]; p.hb = [12, -25]; p.kf = [12, -22]; p.ff = [7, -14]; p.sh = [3, -31]; p.head = [4, -38]; }
  if (s === "throw") { const k = 1 - t / 22; p.sh = [-4 * k, -30]; p.head = [-5 * k, -37]; p.hf = [-12 * k + 4, -40]; p.hb = [-10 * k, -38]; }
  if (s === "hurt") { p.sh = [-5, -30]; p.head = [-7, -36]; p.hf = [-2, -36]; p.ef = [-2, -31]; p.hb = [-10, -33]; p.ff = [4, 0]; p.fb = [-6, 0]; }
  if (s === "fly" || s === "thrown") { p.rot = -Math.min(1.45, 0.3 + (3.6 - f.vz) * 0.3); p.hf = [-4, -40]; p.hb = [-10, -38]; p.ff = [8, -2]; }
  if (s === "lying" || s === "dead" || s === "out") { p.rot = -Math.PI / 2; p.hf = [6, -30]; p.hb = [-4, -34]; p.rc = [0, -4]; }
  if (s === "getup") { const k = t / 26; p.rot = -Math.PI / 2 * k; p.hip = [0, -14]; p.kf = [8, -8]; p.rc = [0, -4]; }
  return p;
}

function drawFighter(f) {
  const P = PAL, k = KINDS[f.kind], L = LOOKS[k.look || f.kind](P), sc = k.scale * BS;
  if (f.st === "out") return;
  if (f.st === "dead" && Math.floor(f.t / 4) % 2) return;
  if (f.inv > 0 && f.team === "p" && Math.floor(f.inv / 4) % 2 && !["attack", "air"].includes(f.st)) return;
  const x = Math.round(f.x - cam), y = Math.round(f.y);
  g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, y, Math.max(5, 11 - f.z * 0.08) * sc, 3 * sc, 0, 0, 7); g.fill();
  const p = pose(f), flash = f.flash > 0;
  if (flash) f.flash--;
  g.save();
  g.translate(x, y - Math.round(f.z));
  g.scale(f.face * sc, sc);
  if (p.rot) { g.translate(p.rc[0], p.rc[1]); g.rotate(p.rot); g.translate(-p.rc[0], -p.rc[1]); }
  const C = (c) => (flash ? "#ffffff" : c);
  const back = (c) => shade(c, -0.22);

  // build each layer as a list of shapes, then outline + fill it
  const layer = (ops) => {
    for (const pass of [0, 1]) for (const o of ops) {
      if (pass === 0 && o.no) continue;
      const col = pass ? C(o.c) : P.ol, grow = pass ? 0 : 1;
      if (o.t === "l") { g.strokeStyle = col; g.lineWidth = o.w + grow * 2; g.lineCap = "round"; g.beginPath(); g.moveTo(o.a[0], o.a[1]); g.lineTo(o.b[0], o.b[1]); g.stroke(); }
      else if (o.t === "r") { g.fillStyle = col; g.fillRect(o.x - grow, o.y - grow, o.w + grow * 2, o.h + grow * 2); }
      else if (o.t === "p") { g.fillStyle = col; g.beginPath(); o.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); if (pass === 0) { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); } g.fill(); }
    }
  };
  const sleeve = L.sleeves === "none" ? L.skin : L.sleeves === "short" ? L.shirt : (L.jacket || L.shirt);
  const fore = L.sleeves ? L.skin : (L.jacket || L.shirt);
  const fist = L.glove || L.skin;
  const leg = (h, kn, ft, cl) => [
    { t: "l", a: h, b: kn, w: 4.6, c: cl(L.pants) }, { t: "l", a: kn, b: ft, w: 4, c: cl(L.pants) },
    { t: "p", pts: [[ft[0] - 2.5, ft[1] - 2.5], [ft[0] + 4.5, ft[1] - 1.5], [ft[0] + 4.5, ft[1] + 1], [ft[0] - 2.5, ft[1] + 1]], c: cl(L.shoe) },
    { t: "r", x: ft[0] - 2.5, y: ft[1] + 0.2, w: 7, h: 0.8, c: cl(L.sole), no: true }
  ].concat(L.stripe ? [{ t: "l", a: [h[0] + 1, h[1]], b: [kn[0] + 1, kn[1]], w: 1, c: L.stripe, no: true }] : []);
  const arm = (s, el, hd, cl) => [
    { t: "l", a: s, b: el, w: 3.8, c: cl(sleeve) }, { t: "l", a: el, b: hd, w: 3.4, c: cl(fore) },
    { t: "r", x: hd[0] - 2.2, y: hd[1] - 2.2, w: 4.4, h: 4.4, c: cl(fist) }
  ];
  const shB = [p.sh[0] - 1.5, p.sh[1] + 2], shF = [p.sh[0] + 1.5, p.sh[1] + 2];

  layer(leg(p.hip, p.kb, p.fb, back).concat(arm(shB, p.eb, p.hb, back)));

  // torso, drawn in its own frame from hip to shoulder
  const ang = Math.atan2(p.sh[0] - p.hip[0], -(p.sh[1] - p.hip[1])), tl = Math.hypot(p.sh[0] - p.hip[0], p.sh[1] - p.hip[1]);
  g.save(); g.translate(p.hip[0], p.hip[1]); g.rotate(ang);
  const top = -tl - 2, outer = L.jacket || L.shirt || L.skin;
  const torso = [{ t: "p", pts: [[-5, 1], [5, 1], [6.5, top], [-6, top]], c: outer }];
  if (L.jacket && L.shirt && !L.vest) torso.push({ t: "p", pts: [[0, 0], [3.5, 0], [3.5, top + 1], [-0.5, top + 1]], c: L.shirt, no: true });
  if (L.vest && L.shirt) torso.push({ t: "p", pts: [[-1, 0], [4, 0], [5, top + 1], [-2, top + 1]], c: L.shirt, no: true });
  if (L.vest && !L.shirt) torso.push({ t: "p", pts: [[-1, -1], [4, -1], [5, top + 1], [-2, top + 1]], c: L.skin, no: true }, { t: "r", x: 0.5, y: top + 6, w: 3, h: 1, c: shade(L.skin, -0.2), no: true });
  if (L.pocket) torso.push({ t: "r", x: -4.5, y: top + 4, w: 3, h: 2, c: L.pocket, no: true });
  if (L.tie) torso.push({ t: "p", pts: [[1, -3], [3, -3], [2.6, top + 2], [1.4, top + 2]], c: L.tie, no: true });
  if (L.scarf) torso.push({ t: "r", x: -6, y: top - 1, w: 12, h: 3, c: L.scarf, no: true }, { t: "r", x: -9, y: top + 1, w: 4, h: 6, c: L.scarf, no: true });
  if (L.gi) torso.push({ t: "p", pts: [[-1, top + 1], [4, top + 1], [1, top + 8]], c: L.skin, no: true });
  torso.push({ t: "r", x: -5, y: -2, w: 10, h: 2.5, c: L.belt || "#1d1b18", no: true });
  if (!L.belt) torso.push({ t: "r", x: 2, y: -2, w: 2, h: 2.5, c: "#c9b37a", no: true });
  if (L.cuffs) torso.push({ t: "r", x: -6, y: top, w: 12.5, h: 2, c: shade(outer, 0.15), no: true });
  layer(torso);
  g.restore();

  // head (bigger in big-head mode, scaled around the neck)
  const hx = p.head[0], hy = p.head[1];
  g.save(); if (bigHead) { g.translate(hx, hy + 6); g.scale(1.7, 1.7); g.translate(-hx, -(hy + 6)); }
  const head = [{ t: "r", x: hx - 4.5, y: hy - 5, w: 9.5, h: 10.5, c: L.skin }, { t: "r", x: hx - 2, y: hy + 5, w: 5, h: 2, c: L.skin }];
  const hs = L.hairStyle, H = L.hair;
  if (hs === "spiky") head.push({ t: "p", pts: [[hx - 6, hy - 1], [hx - 7, hy - 7], [hx - 3, hy - 6], [hx - 2, hy - 10], [hx + 1, hy - 7], [hx + 4, hy - 10], [hx + 5, hy - 5], [hx + 5, hy - 3], [hx - 3, hy - 3], [hx - 3, hy + 2]], c: H });
  if (hs === "pony") head.push({ t: "r", x: hx - 5.5, y: hy - 7, w: 11, h: 4, c: H }, { t: "r", x: hx - 5.5, y: hy - 4, w: 3, h: 5, c: H }, { t: "l", a: [hx - 6, hy - 4], b: [hx - 11, hy + 3 + Math.sin(frameNo / 8) * 1.5], w: 3, c: H });
  if (hs === "cap") head.push({ t: "r", x: hx - 5, y: hy - 7, w: 10, h: 4, c: L.cap }, { t: "r", x: hx + 3, y: hy - 4, w: 5, h: 1.6, c: L.cap }, { t: "r", x: hx - 5.5, y: hy - 3, w: 2, h: 3, c: H });
  if (hs === "beanie") head.push({ t: "r", x: hx - 5, y: hy - 8, w: 10, h: 5, c: L.cap }, { t: "r", x: hx - 5, y: hy - 4, w: 10, h: 1.5, c: shade(L.cap, -0.25) }, { t: "r", x: hx - 5.5, y: hy - 3, w: 2, h: 4, c: H });
  if (hs === "mohawk") head.push({ t: "p", pts: [[hx - 4, hy - 4], [hx - 3, hy - 11], [hx, hy - 9], [hx + 2, hy - 12], [hx + 3, hy - 5]], c: H });
  if (hs === "bandana") head.push({ t: "r", x: hx - 5, y: hy - 7, w: 10, h: 4, c: L.cap }, { t: "p", pts: [[hx - 5, hy - 5], [hx - 10, hy - 2], [hx - 9, hy - 6]], c: L.cap });
  if (hs === "topknot") head.push({ t: "r", x: hx - 5, y: hy - 6, w: 10, h: 3, c: H }, { t: "r", x: hx - 2, y: hy - 10, w: 4, h: 4, c: H });
  if (hs === "long") head.push({ t: "r", x: hx - 5.5, y: hy - 7, w: 11, h: 4, c: H }, { t: "p", pts: [[hx - 6, hy - 4], [hx - 2, hy - 4], [hx - 3, hy + 9], [hx - 8, hy + 8 + Math.sin(frameNo / 9)]], c: H });
  if (hs === "bun") head.push({ t: "r", x: hx - 5, y: hy - 7, w: 10, h: 4, c: H }, { t: "r", x: hx - 5.5, y: hy - 4, w: 2.5, h: 5, c: H }, { t: "r", x: hx - 9, y: hy - 8, w: 5, h: 5, c: H });
  if (hs === "slick") head.push({ t: "p", pts: [[hx - 6, hy - 1], [hx - 5, hy - 7], [hx + 5, hy - 7], [hx + 6, hy - 5], [hx - 3, hy - 4], [hx - 3, hy + 1]], c: H });
  layer(head);
  // face details (no outline)
  const fd = (x0, y0, w, h, c) => R(x0, y0, w, h, C(c));
  fd(hx - 2.5, hy - 1, 2, 2, shade(L.skin, -0.2));                         // ear
  if (L.shades) fd(hx + 1, hy - 2, 5, 2.2, "#111");
  else if (L.specs) { fd(hx + 1.5, hy - 2.6, 3.6, 3, "#1d1b18"); fd(hx + 2.1, hy - 2, 2.4, 1.8, "#e9eef2"); fd(hx + 3, hy - 1.6, 1, 1.2, "#111"); }
  else if (L.mask) { fd(hx + 1, hy + 1, 4.5, 4, "#1b1b1b"); fd(hx + 2.5, hy - 2, 2, 1.6, "#fff"); fd(hx + 3.5, hy - 2, 1, 1.6, "#111"); }
  else { fd(hx + 2, hy - 2, 2.2, 1.8, "#fff"); fd(hx + 3.2, hy - 2, 1, 1.8, "#111"); fd(hx + 1.5, hy - 3.6, 3, 0.9, shade(H, 0)); }
  fd(hx + 4.5, hy, 1, 1.5, shade(L.skin, -0.18));                          // nose
  if (!L.mask) fd(hx + 2, hy + 3, 2.5, 0.8, ["hurt", "fly", "lying"].includes(f.st) ? "#5a1f1f" : shade(L.skin, -0.35));
  if (L.beard) fd(hx - 1, hy + 2, 6, 3.5, H);
  if (L.mustache) { fd(hx + 1, hy + 1.6, 5.5, 1.4, H); fd(hx + 0.5, hy + 2.6, 1.2, 1.4, H); }
  if (costume === "avatar" && f.team === "p") { fd(hx - 6, hy - 13, 2, 9, "#1f7a6a"); fd(hx - 6.5, hy - 14, 3, 3, "#2b54a8"); fd(hx - 6, hy - 13.5, 2, 2, "#f2c230"); }
  if (L.scar) fd(hx + 1, hy - 4, 1, 4, "#e9b9a0");
  if (L.band) { fd(hx - 5, hy - 4, 10, 1.6, L.band); const fl = Math.sin(frameNo / 6) * 1.5; fd(hx - 9, hy - 3 + fl, 4, 1.2, L.band); fd(hx - 11, hy - 1 + fl, 3, 1.2, L.band); }
  if (f.pigeon) { const pc = P.dark ? "#8c8794" : "#6f6a78"; R(hx - 3, hy - 12, 7, 4, pc); R(hx + 3, hy - 14, 3, 3, pc); R(hx + 6, hy - 13, 1, 1, P.amber); }
  g.restore();

  layer(leg(p.hip, p.kf, p.ff, (c) => c));
  if (f.weapon && !["lying", "fly", "dead", "thrown"].includes(f.st)) {
    const a = p.pipeAng !== undefined ? p.pipeAng : -1.2;
    if (f.weapon.kind === "pipe") layer([{ t: "l", a: p.hf, b: [p.hf[0] + Math.cos(a) * 18, p.hf[1] + Math.sin(a) * 18], w: 2.4, c: "#b08a4a" }]);
    else layer([{ t: "p", pts: [[p.hf[0], p.hf[1] - 1], [p.hf[0] + 9, p.hf[1] - 2.5], [p.hf[0] + 9, p.hf[1] - 0.5], [p.hf[0], p.hf[1] + 1]], c: "#d8dde2" }]);
  }
  layer(arm(shF, p.ef, p.hf, (c) => c));
  g.restore();

  if (f.avatarT > 0) { g.globalAlpha = 0.35 + Math.sin(frameNo / 6) * 0.15; g.strokeStyle = "#f2c230"; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - f.z - 26 * sc, 14 * sc, 30 * sc, 0, 0, 7); g.stroke(); g.globalAlpha = 1; }
  // special move warning: a red "!" over bosses and specialists
  if (f.warn > 0 && f.st === "windup") { const wy = y - f.z - 58 * sc; text("!", x, wy, 14, P.T.red, "center", "IBM Plex Sans"); }
  // rolling / cyclone motion trail
  if ((f.st === "attack" && (f.atkName === "roll" || f.atkName === "eRoll")) || (f.st === "air" && f.airAtk === "cyclone")) {
    g.globalAlpha = 0.25; g.strokeStyle = f.team === "p" ? (f.pi ? P.T.teal : P.T.accent) : P.T.red; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y - f.z - 16 * sc, 16 * sc, 0, 7); g.stroke(); g.globalAlpha = 1;
  }
}

function drawItems() {
  const P = PAL;
  if (cat) drawCat(P);
  // Nani waits at the back of the final arena
  if (stageIdx === 3 && blocks()[blockIdx].boss && locked) {
    if (!naniRef) { naniRef = fighter("nani", 0, Y0 + 2, "e"); naniRef.face = -1; }
    naniRef.x = cam + LW - 30; drawFighter(naniRef);
    if (bossRef && bossRef.st === "dead") text("Nani!", cam + LW - 30 - cam, Y0 - 62, 7, P.T.ink, "center", "IBM Plex Sans");
  }
  if (pigeons) drawPigeons(P);
  for (const b of barrels) {
    const x = Math.round(b.x - cam + (b.shake ? (b.shake % 2 ? 1 : -1) : 0)), y = b.y;
    if (b.kind === "hydrant") { // a street hand pump
      const c = b.hp > 0 ? "#2f6b3a" : shade("#2f6b3a", -0.3), hy = b.hp > 0 ? Math.sin(frameNo / 25) * 1.5 : 4;
      R(x - 3, y - 18, 6, 18, P.ol); R(x - 2, y - 17, 4, 17, c); R(x + 2, y - 12, 6, 2, c); R(x - 4, y - 2, 8, 2, "#5d5852");
      g.strokeStyle = P.ol; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 1, y - 17); g.lineTo(x - 11, y - 20 + hy); g.stroke(); continue; }
    if (b.kind === "vending") {
      const lit = b.hp > 0 && frameNo % 90 > 3;
      R(x - 10, y - 36, 20, 36, P.ol); R(x - 9, y - 35, 18, 34, P.T.teal); R(x - 7, y - 32, 10, 20, lit ? "#f7f4ee" : "#555");
      for (let r = 0; r < 4; r++) R(x - 6, y - 31 + r * 5, 8, 2, [P.T.red, P.T.amber, P.T.accent, P.T.good][r]);
      R(x + 4, y - 30, 3, 8, "#1d1b18"); R(x - 7, y - 9, 14, 4, "#1d1b18");
      if (b.hp <= 0) { R(x - 7, y - 32, 10, 20, "#2a2a2a"); R(x - 4, y - 28, 6, 1, "#888"); }
      continue;
    }
    if (b.hp <= 0) continue;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, y, 10, 3, 0, 0, 7); g.fill();
    R(x - 9, y - 21, 18, 21, P.ol); R(x - 8, y - 20, 16, 20, P.wood);
    R(x - 8, y - 15, 16, 2, shade(P.wood, -0.35)); R(x - 8, y - 6, 16, 2, shade(P.wood, -0.35)); R(x - 5, y - 20, 2, 20, shade(P.wood, 0.15));
  }
  for (const it of items) {
    const x = Math.round(it.x - cam), y = Math.round(it.y - it.z);
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, it.y, 7, 2, 0, 0, 7); g.fill();
    if (it.kind === "pipe") { g.strokeStyle = P.ol; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 9, y - 2); g.lineTo(x + 9, y - 4); g.stroke(); g.strokeStyle = "#b08a4a"; g.lineWidth = 2.4; g.stroke(); }
    else if (it.kind === "knife") { R(x - 6, y - 4, 4, 3, "#3b2a1d"); R(x - 2, y - 4, 9, 2, "#d8dde2"); }
    else if (it.kind === "food") { // a samosa
      g.fillStyle = P.ol; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x, y - 11); g.lineTo(x + 7, y); g.closePath(); g.fill();
      g.fillStyle = "#d9a441"; g.beginPath(); g.moveTo(x - 5.5, y - 1); g.lineTo(x, y - 9); g.lineTo(x + 5.5, y - 1); g.closePath(); g.fill(); R(x - 1, y - 6, 2, 1, "#a8742a"); R(x - 3, y - 3, 2, 1, "#a8742a"); }
    else if (it.kind === "letter") { R(x - 8, y - 9, 16, 10, P.ol); R(x - 7, y - 8, 14, 8, "#f7f1e3"); g.strokeStyle = "#b9ad98"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 7, y - 8); g.lineTo(x, y - 3); g.lineTo(x + 7, y - 8); g.stroke(); R(x - 1.5, y - 5, 3, 3, P.T.accent); }
    else if (it.kind === "oneup") { R(x - 9, y - 10, 18, 9, P.ol); R(x - 8, y - 9, 16, 7, P.T.good); text("1UP", x, y - 3.5, 6, "#fff"); }
    else { // chai in a clay kulhad
      R(x - 5, y - 9, 10, 9, P.ol); R(x - 4, y - 8, 8, 8, "#a5532e"); R(x - 4, y - 8, 8, 2, "#c98a5a");
      g.globalAlpha = 0.6; R(x - 2 + Math.sin(frameNo / 8), y - 14, 1, 4, "#ffffff"); R(x + 1 + Math.sin(frameNo / 9), y - 15, 1, 4, "#ffffff"); g.globalAlpha = 1; }
    if (frameNo % 40 < 20) R(x - 1, y - 16, 2, 2, P.spark);
  }
  for (const s of shots) {
    const x = Math.round(s.x - cam), y = Math.round(s.y - s.z);
    if (s.kind === "chakra") { g.save(); g.translate(x, y); g.rotate(frameNo / 2); g.strokeStyle = "#f2c230"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.stroke(); g.strokeStyle = "#d9741c"; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.moveTo(0, 0); g.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } g.stroke(); g.restore(); continue; }
    if (s.kind === "knife") { g.fillStyle = P.shadow; g.fillRect(x - 4, s.y - 1, 8, 2); g.save(); g.translate(x, y); g.scale(s.face, 1); R(-6, -1.5, 4, 3, "#3b2a1d"); R(-2, -1, 9, 2, "#e4e8ec"); g.restore(); }
    else { g.strokeStyle = P.amber; g.lineWidth = 2; for (let r = 0; r < 3; r++) { g.globalAlpha = 0.8 - r * 0.25; g.beginPath(); g.ellipse(x - s.face * r * 6, s.y, 6 + r * 3, 3 + r, 0, Math.PI, 0); g.stroke(); } g.globalAlpha = 1; }
  }
}

function drawCat(P) {
  const x = Math.round(cat.x - cam), y = cat.y, sw = Math.sin(frameNo / 12) * 3;
  const c = P.dark ? "#0b0a0c" : "#1d1b18";
  if (cat.st === "run") { const b = Math.abs(Math.sin(frameNo / 3)) * 2; R(x - 7, y - 7 - b, 14, 5, c); R(x - 9, y - 10 - b, 5, 5, c); R(x + 6, y - 9 - b, 5, 2, c); return; }
  R(x - 5, y - 9, 10, 9, c); R(x - 4, y - 15, 8, 7, c); R(x - 4, y - 17, 2, 2, c); R(x + 2, y - 17, 2, 2, c);
  R(x - 3, y - 12, 2, 2, P.amber); R(x + 1, y - 12, 2, 2, P.amber);
  g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 5, y - 2); g.quadraticCurveTo(x + 12, y - 4, x + 10 + sw, y - 12); g.stroke();
  if (cat.st === "purr" && frameNo % 60 < 30) text("z", x + 8, y - 18, 6, P.T.muted);
}
function drawPigeons(P) {
  const base = Math.round(pigeons.x - cam), c = P.dark ? "#8c8794" : "#6f6a78";
  for (let i = 0; i < 3; i++) {
    let x = base + i * 12, y = 119;
    if (pigeons.st === "fly") { x += pigeons.t * (1 + i * 0.4); y -= pigeons.t * (0.7 + i * 0.2); if (y < -10) continue; }
    const flap = pigeons.st === "fly" && frameNo % 8 < 4;
    R(x - 3, y - 4, 7, 4, c); R(x + 3, y - 6, 3, 3, c); R(x + 6, y - 5, 1, 1, P.amber);
    R(x - 2, y - (flap ? 8 : 5), 5, flap ? 3 : 1, shade(c, -0.2));
  }
}

function drawFx() {
  const P = PAL;
  for (const f of fx) {
    const x = f.x - cam;
    if (f.kind === "dot") { f.x += f.vx; f.y += f.vy; f.vy += 0.15; R(x, f.y, 2, 2, f.c); }
    if (f.kind === "dust") { f.x += f.vx; f.y += f.vy; g.globalAlpha = f.t / 24; R(x, f.y - 2, 3, 3, P.curb); g.globalAlpha = 1; }
    if (f.kind === "ember") { f.x += f.vx; f.y += f.vy; g.globalAlpha = Math.min(1, f.t / 30); R(x, f.y, 1.5, 1.5, f.t % 6 < 3 ? P.amber : P.T.red); g.globalAlpha = 1; }
    if (f.kind === "steam") { f.x += f.vx; f.y += f.vy; g.globalAlpha = f.t / 140; g.fillStyle = P.dark ? "#8f8a96" : "#ffffff"; g.beginPath(); g.arc(x, f.y, 3 + (70 - f.t) * 0.08, 0, 7); g.fill(); g.globalAlpha = 1; }
    if (f.kind === "ring") { g.strokeStyle = f.big ? P.T.accent : P.spark; g.lineWidth = 1.5; g.beginPath(); g.arc(x, f.y, (f.big ? 22 : 12) - f.t, 0, 7); g.stroke(); }
    if (f.kind === "water") { f.x += f.vx; f.y += f.vy; f.vy += 0.18; R(x, f.y, 2, 2, P.dark ? "#6fb7d8" : "#4a90b8"); }
    if (f.kind === "heart") { f.x += f.vx; f.y += f.vy; g.globalAlpha = Math.min(1, f.t / 20); g.fillStyle = P.T.accent; g.beginPath(); g.arc(x - 1.5, f.y, 1.8, 0, 7); g.arc(x + 1.5, f.y, 1.8, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 3.2, f.y + 0.6); g.lineTo(x, f.y + 4); g.lineTo(x + 3.2, f.y + 0.6); g.fill(); g.globalAlpha = 1; }
    if (f.kind === "star") { g.fillStyle = P.spark; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 2 : 6, a = i * Math.PI / 4; g.lineTo(x + Math.cos(a) * r, f.y + Math.sin(a) * r); } g.fill(); }
  }
  for (const t of texts) { g.globalAlpha = Math.min(1, t.t / 20); text(t.s, t.x - cam, t.y - (60 - t.t) * 0.2, 7, P.T.ink, "center", "IBM Plex Sans"); }
  g.globalAlpha = 1;
}

function bar(x, y, w, h, frac, c) {
  const P = PAL;
  R(x - 1, y - 1, w + 2, h + 2, P.ol); R(x, y, w, h, P.dark ? "#2a2726" : "#e3dcd0");
  R(x, y, Math.round(w * clamp(frac, 0, 1)), h, c);
  if (h > 3) R(x, y, Math.round(w * clamp(frac, 0, 1)), 1, shade(c, 0.3));
}
function drawHud() {
  const P = PAL;
  const panel = (p, x) => {
    g.fillStyle = P.dark ? "rgba(0,0,0,0.6)" : "rgba(255,253,249,0.86)"; g.fillRect(x, 4, 124, 31);
    const c = p.pi ? P.T.teal : P.T.accent;
    text(KINDS[p.kind].name.toUpperCase(), x + 4, 12, 7, c, "left");
    text(String(p.score).padStart(7, "0"), x + 120, 12, 7, P.T.ink, "right");
    bar(x + 4, 15, 82, 6, p.hp / p.max, c);
    bar(x + 4, 25, 82, 3, p.sp / 100, P.amber);
    text("SP", x + 90, 29, 5, P.T.muted, "left");
    for (let i = 0; i < Math.max(3, p.lives); i++) R(x + 96 + i * (p.lives > 3 ? 5 : 8), 15, p.lives > 3 ? 4 : 6, 6, i < p.lives ? c : (P.dark ? "#3a3632" : "#cfc6b7"));
    if (p.combo >= 2 && p.comboT > 0) { g.globalAlpha = Math.min(1, p.comboT / 20); text(p.combo + " hits", x + 4, 46, 10, c, "left", "Newsreader"); g.globalAlpha = 1; }
  };
  if (players[0]) panel(players[0], 4);
  if (players[1]) panel(players[1], LW - 128);
  else if (!TOUCH && frameNo % 90 < 60) text("P2: press 1 to join", LW - 6, 14, 7, P.T.muted, "right");
  text("STAGE " + (stageIdx + 1) + "  " + (blockIdx + 1) + "/" + blocks().length, LW / 2, 12, 6, P.T.muted);
  if (lastHit && !KINDS[lastHit.f.kind].boss) { const e = lastHit.f; text(KINDS[e.kind].name, 8, players[0] && players[0].combo >= 2 ? 56 : 44, 7, P.T.ink, "left"); bar(48, players[0] && players[0].combo >= 2 ? 51 : 39, 50, 4, e.hp / e.max, P.amber); }
  if (bossRef && bossRef.st !== "dead" && locked && blocks()[blockIdx].boss) { text(KINDS[bossRef.kind].name.toUpperCase(), LW / 2, LH - 13, 7, P.T.ink); bar(LW / 2 - 90, LH - 10, 180, 5, bossRef.hp / bossRef.max, P.T.red); }
  if (goT > 0 && Math.floor(goT / 15) % 2 === 0) {
    text("GO", LW - 30, 92, 16, P.T.accent, "right", "IBM Plex Sans");
    g.fillStyle = P.T.accent; g.beginPath(); g.moveTo(LW - 24, 80); g.lineTo(LW - 12, 87); g.lineTo(LW - 24, 94); g.fill();
  }
  if (banner && banner.t > 0) {
    g.font = "600 " + (banner.big ? 16 : 12) + "px 'Newsreader', Georgia, serif";
    const w = g.measureText(banner.text).width + 28, h = banner.big ? 26 : 20;
    g.globalAlpha = Math.min(1, banner.t / 20);
    R(LW / 2 - w / 2, 56, w, h, P.T.ink); R(LW / 2 - w / 2, 56 + h - 2, w, 2, P.T.accent);
    text(banner.text, LW / 2, 56 + h - (banner.big ? 8 : 6), banner.big ? 16 : 12, P.T.paper, "center", "Newsreader");
    g.globalAlpha = 1;
  }
  if (state === "clear") {
    const a = Math.min(1, (260 - clearT) / 20);
    g.globalAlpha = a; R(LW / 2 - 110, 60, 220, 70, P.T.ink); R(LW / 2 - 110, 128, 220, 2, P.T.accent);
    text("Stage " + (stageIdx + 1) + " clear", LW / 2, 84, 16, P.T.paper, "center", "Newsreader");
    text("Bonus " + clearBonus.toLocaleString(), LW / 2, 102, 8, P.T.paper);
    text(stageIdx + 1 < STAGES.length ? "Next: " + STAGES[stageIdx + 1].name : "Final stage done", LW / 2, 118, 7, P.dark ? P.T.accent : "#f07ab8");
    g.globalAlpha = 1;
  }
}

const spBtn = document.querySelector('.pad button[data-code="KeyI"]');
function draw() {
  if (!PAL) palette();
  if (spBtn && players[0]) spBtn.classList.toggle("low", players[0].sp < 25);
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  g.imageSmoothingEnabled = false;
  const sx = shake > 0.3 ? rand(-shake, shake) : 0, sy = shake > 0.3 ? rand(-shake, shake) * 0.5 : 0;
  g.save(); g.translate(Math.round(sx), Math.round(sy));
  ({ street: drawStreet, subway: drawSubway, roof: drawRoof, factory: drawFactory })[STAGES[stageIdx].theme](PAL);
  drawItems();
  const cast = enemies.concat(players.filter((p) => p && p.lives > 0));
  cast.sort((a, b) => a.y - b.y);
  for (const f of cast) drawFighter(f);
  drawFx();
  drawForeground(PAL);
  g.restore();
  if (state !== "menu" && state !== "story") drawHud();
  if (state === "story") drawStory();
}

/* menu backdrop: the chosen stage with a few idle fighters */
function demo(si) {
  stageIdx = si; cam = 0; blockIdx = 0;
  barrels = STAGES[si].barrels.map(([x, y, drop, kind = "barrel"]) => ({ x, y, drop, kind, hp: kind === "barrel" ? 2 : 3, shake: 0 }));
  cat = si === 0 ? { x: 560, y: 151, st: "sit", t: 0 } : null; pigeons = si === 2 ? { x: 640, st: "sit", t: 0 } : null;
  const cast = [["ox", "kicker", "thrower"], ["rook", "kicker", "grunt"], ["crane", "thrower", "bruiser"], ["rollback", "bruiser", "pipeGrunt"]][si];
  enemies = cast.map((k, i) => { const e = fighter(k, 300 - i * 34, 168 + i * 12, "e"); e.face = -1; return e; });
  const r = fighter(pick1 || "rai", 90, 180, "p"); r.pi = 0; players = [r];
  if (startPlayers === 2) { const k = fighter("kai", 60, 195, "p"); k.pi = 1; players.push(k); }
  items = []; shots = []; fx = [];
}

function toggleBigHead() {
  bigHead = !bigHead; try { localStorage.setItem("street:bighead", bigHead ? "1" : "0"); } catch (e) { /* ignore */ }
  Arcade.toast(bigHead ? "Big head mode on" : "Big head mode off");
  Arcade.secret("bighead");
}
Arcade.onSequence(["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"], toggleBigHead);
(() => { let n = 0, t0 = 0; const h = document.querySelector("#card-menu h2"); if (h) h.addEventListener("click", () => { const now = performance.now(); n = now - t0 < 3000 ? n + 1 : 1; t0 = now; if (n >= 5) { n = 0; toggleBigHead(); } }); })();

function buildCostumes() {
  const box = $("costumes"); if (!box) return;
  const opts = [["classic", "Classic"]].concat(Arcade.hasSecret("neon") ? [["neon", "Neon"]] : [], Arcade.hasSecret("onecredit") ? [["gold", "Gold"]] : [], Arcade.hasSecret("chakra") ? [["avatar", "Avatar"]] : []);
  if (!opts.some((o) => o[0] === costume)) costume = "classic";
  box.hidden = opts.length < 2; box.innerHTML = "";
  for (const [id, name] of opts) {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = name; b.setAttribute("aria-pressed", String(id === costume));
    b.addEventListener("click", () => { costume = id; try { localStorage.setItem("street:costume", id); } catch (e) { /* ignore */ } buildCostumes(); });
    box.appendChild(b);
  }
}

function buildSettings() {
  const box = $("settings"); if (!box) return;
  box.innerHTML = "";
  const chip = (label, on, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", String(on)); b.addEventListener("click", () => { fn(); buildSettings(); }); box.appendChild(b); };
  chip("Story difficulty", EASY, () => { EASY = true; try { localStorage.setItem("street:difficulty", "story"); } catch (e) { /* ignore */ } });
  chip("Arcade difficulty", !EASY, () => { EASY = false; try { localStorage.setItem("street:difficulty", "arcade"); } catch (e) { /* ignore */ } });
  chip(storyOn ? "Cutscenes on" : "Cutscenes off", storyOn, () => { storyOn = !storyOn; try { localStorage.setItem("street:story", storyOn ? "on" : "off"); } catch (e) { /* ignore */ } });
}

function buildFighters() {
  const box = $("fighters"); if (!box) return;
  const have = rosterUnlocked();
  if (!ROSTER.some(([id]) => id === pick1 && (id === "rai" || id === "kai" || have.includes(id)))) pick1 = "rai";
  box.innerHTML = "";
  for (const [id, name] of ROSTER) {
    const open = id === "rai" || id === "kai" || have.includes(id);
    const b = document.createElement("button"); b.type = "button"; b.className = "chip";
    b.textContent = open ? name + ": " + SPECIALS[id][2] : "Locked: beat " + KINDS[Object.keys(UNLOCK_BY).find((k) => UNLOCK_BY[k] === id)].name; b.disabled = !open;
    if (!open) b.title = "Beat " + KINDS[Object.keys(UNLOCK_BY).find((k) => UNLOCK_BY[k] === id)].name + " to unlock";
    b.setAttribute("aria-pressed", String(id === pick1));
    b.addEventListener("click", () => { pick1 = id; try { localStorage.setItem("street:fighter", id); } catch (e) { /* ignore */ } buildFighters(); demo(chosenStage); });
    box.appendChild(b);
  }
}

function buildStageChips() {
  buildCostumes(); buildFighters(); if (typeof storyOn !== "undefined") buildSettings();
  const box = $("stages"); if (!box) return;
  box.innerHTML = "";
  const max = unlocked();
  STAGES.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = (i + 1) + ". " + s.name;
    b.disabled = i > max; b.setAttribute("aria-pressed", String(i === chosenStage));
    if (i > max) b.title = "Clear stage " + i + " to unlock";
    b.addEventListener("click", () => { chosenStage = i; buildStageChips(); demo(i); });
    box.appendChild(b);
  });
}

/* ---------- loop ---------- */
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= TICK) { update(); acc -= TICK; }
  draw();
  requestAnimationFrame(loop);
}

$("start1").addEventListener("click", () => { if (TOUCH && !Arcade.isFullscreen()) Arcade.enterFullscreen(); start(chosenStage, 1); });
$("start2").addEventListener("click", () => start(chosenStage, 2));
$("again").addEventListener("click", () => { $("card-end").hidden = true; $("card-menu").hidden = false; state = "menu"; chosenStage = Math.min(chosenStage, unlocked()); showBest(); buildStageChips(); demo(chosenStage); });
$("continue").addEventListener("click", () => { $("card-end").hidden = true; $("card-menu").hidden = false; start(stageIdx, startPlayers, true); });
function showBest() { try { const b = +localStorage.getItem("street:best"); if (b) $("best-line").textContent = "Best on this device: " + b.toLocaleString(); } catch (e) { /* ignore */ } }
showBest();
palette();
Arcade.setupFullscreen((on) => { if (!on && state === "play" && !paused) togglePause(); });
buildStageChips();
demo(0);
requestAnimationFrame(loop);
