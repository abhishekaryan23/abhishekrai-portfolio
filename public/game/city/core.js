/* Rollback City: an open-city beat 'em up in the style of the late-80s arcade brawlers, set in
   Bunderpur, an Indian port city. One or two players. The city is a graph of streets (world.js)
   walked freely, with missions (missions.js) that hold the camera for their fights.

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
   Everything is drawn in code 216 pixels tall and 384 to 512 wide (the screen's shape), scaled
   by a whole number. Colours come from the site's theme tokens, so light and dark themes both work. */
"use strict";
/* Files, in load order: core.js (constants, state, input, loop), data.js (stages,
   fighters, attacks), world.js (the street graph), flow.js (game flow, main update, the open
   world), actors.js (players, enemies),
   combat.js (physics, hits, items, stage life), draw-world.js (palette, sprites,
   backgrounds), draw-actors.js (characters, HUD, draw), missions.js (the mission runner and
   missions), time.js (the clock, day and night, weather), economy.js (money, the clinic, the
   thana, shops and stats), phone.js (the phone, calls, PCO booths), rewind.js (the pocket watch), map.js (the street strip and
   the paper map), save.js (save slots, save codes), menu.js (menu, start-up). */

// The view is 216 game pixels tall and as wide as the screen's shape allows (384 at 16:9,
// up to 512 on an ultrawide); fitCanvas sets LW and SCALE (canvas pixels per game pixel).
let LW = 384, SCALE = 2;
const STRIDE = 0.157;   // walk-cycle phase per pixel walked: legs keep pace with the ground, so nobody moonwalks
const LH = 216, TICK = 1000 / 60;
let stillDrawn = false;   // a paused game has been drawn once and needn't be again
const Y0 = 150, Y1 = 206, GRAV = 0.32, BS = 1.12;   // depth band, gravity, base body scale
const TOUCH = matchMedia("(any-pointer: coarse)").matches;   // includes iPads with a keyboard or trackpad
const canvas = document.getElementById("game"), g = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- state ---------- */
let state = "menu", paused = false, frameNo = 0;
let players = [], enemies = [], items = [], barrels = [], fx = [], texts = [], shots = [];
// stageIdx is the difficulty tier of the street you are on (0 the lane, 1 the Harbour Line, 2 the
// roofs, 3 the mill): enemies hit harder and last longer the further the night goes
let stageIdx = 0, cam = 0, queue = [], goT = 0, banner = null, shake = 0, hitStop = 0;
let runStart = 0, bossRef = null, lastHit = null, train = null;
let startPlayers = 1, lastKnife = -999;
// hidden features
let wallCount = 0, spray = [], cat = null, pigeons = null;
let bridge = null, bridgeT = 0;   // a bridge coming at the train roof
let bigHead = false, costume = "classic", EASY = TOUCH, ASSIST = TOUCH, pick1 = "rai", joinedOnce = false;
let chakraKOs = 0;
try { pick1 = localStorage.getItem("city:fighter") || "rai"; chakraKOs = +localStorage.getItem("city:chakra") || 0; } catch (e) { /* ignore */ }
try { const d = localStorage.getItem("city:difficulty"); if (d) EASY = d === "story"; } catch (e) { /* ignore */ }
try { bigHead = localStorage.getItem("city:bighead") === "1"; costume = localStorage.getItem("city:costume") || "classic"; } catch (e) { /* ignore */ }
// street is the current WORLD street, arena a scripted fight that holds the camera, wipe the short
// transition between streets, civs the passers-by
let street = null, arena = null, wipe = null, civs = [];
const theme = () => street.theme;
const worldEnd = () => street.w;
const diff = () => (1 + stageIdx * 0.14) * (typeof blackout === "function" && blackout() ? 1.3 : 1) * (progress && progress.ngplus ? 1.35 : 1);   // New Game+ goondas have been training   // the 11:58 blackout makes them bolder

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
  { up: ["KeyW"], down: ["KeyS"], left: ["KeyA"], right: ["KeyD"], punch: ["KeyJ"], kick: ["KeyK"], jump: ["KeyL"], special: ["KeyI"], dash: ["StickDash", "ShiftLeft"], use: ["KeyE"], rewind: ["KeyR"], block: ["KeyU"], radio: ["KeyQ"] },
  { up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"], punch: ["Digit1", "Numpad1", "Comma"], kick: ["Digit2", "Numpad2", "Period"], jump: ["Digit3", "Numpad3", "Slash"], special: ["Digit4", "Numpad4", "Quote"], dash: ["ShiftRight"], use: ["Enter", "NumpadEnter"], rewind: [], block: ["Digit5", "Numpad5"], radio: ["Digit6", "Numpad6"] }
];
const down = new Set(), pressed = new Set();
function keyOf(code) { for (let i = 0; i < 2; i++) for (const [a, list] of Object.entries(BIND[i])) if (list.includes(code)) return [i, a]; return null; }
let padLast = false;   // the last button pressed was on a gamepad (prompts then say LB, not E)
function onDown(code, pad) {
  padLast = !!pad;
  if (typeof phoneOpen !== "undefined" && phoneOpen) { if (snakeKey(code)) return; if (code === "Tab" || code === "Escape" || code === "KeyP") { closePhone(); return; } }
  if (code === "Tab") { if (state === "play" && !paused && hasPhone()) openPhone(); return; }
  if (typeof mapOpen !== "undefined" && mapOpen) { if (code === "KeyM" || code === "Escape" || code === "KeyP" || (pad && (code === "KeyL" || code === "Digit3"))) closeMap(); return; }
  if (code === "KeyM") { if (state === "play" && !paused) openMap(); return; }
  if ((code === "Escape" || code === "KeyP") && !$("card-shop").hidden) { closeShop(); return; }
  if ((code === "Escape" || code === "KeyP") && choiceOpen) { closeChoice(); return; }
  if (!$("overlay").hidden && menuKey(code, pad)) return;
  if (code === "Escape" && !$("overlay").hidden && $("overlay").querySelector(".card:not([hidden]) [data-back]")) return;   // menu.js goes back a card
  if (code === "KeyP" || code === "Escape") { if (state === "play") togglePause(); else if (state === "story" && pad) advanceScene(true); return; }
  const k = keyOf(code); if (!k) return;
  pressed.add(code);            // keyboard auto-repeat is already filtered by e.repeat
  down.add(code);
  if (state === "play" && !paused && k[0] === 1 && (!players[1] || players[1].lives <= 0) && (k[1] === "punch" || k[1] === "kick")) join(1, true);
}
function onUp(code) { down.delete(code); }
const held = (i, a) => BIND[i][a].some((c) => down.has(c));
const tapped = (i, a) => BIND[i][a].some((c) => pressed.has(c));
const typing = () => /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || "");
addEventListener("keydown", (e) => {
  if (typing()) return;
  if ((keyOf(e.code) || e.code === "KeyP") && state === "play" && $("overlay").hidden) e.preventDefault();
  if (e.code === "Tab" && state === "play") e.preventDefault();   // the phone, not the browser's focus
  if (e.repeat) return;
  if (e.code === "KeyF" && !e.metaKey && !e.ctrlKey) { toggleFullscreen(); return; }
  onDown(e.code);
});
addEventListener("keyup", (e) => onUp(e.code));
// leaving the game (another app, another tab, the screen locking) always pauses it
const autoPause = () => { down.clear(); if (state === "play" && !paused) togglePause(); };
addEventListener("blur", autoPause);
addEventListener("pagehide", autoPause);
document.addEventListener("visibilitychange", () => { if (document.hidden) autoPause(); });
Arcade.bindPad(onDown, onUp);
// gamepads press the keyboard's codes (DESIGN 2.3): X punch, A kick, B jump, Y special, RB block,
// LB interact, stick click run, Start pause, Back map, RT rewind
const PADS = [
  { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", buttons: { 2: "KeyJ", 0: "KeyK", 1: "KeyL", 3: "KeyI", 5: "KeyU", 4: "KeyE", 10: "ShiftLeft", 9: "KeyP", 8: "KeyM", 7: "KeyR", 6: "Tab", 11: "KeyQ" } },
  { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", buttons: { 2: "Digit1", 0: "Digit2", 1: "Digit3", 3: "Digit4", 5: "Digit5", 4: "Enter", 10: "ShiftRight", 9: "KeyP" } }
];
if (Arcade.bindGamepads) Arcade.bindGamepads(onDown, onUp, PADS);
// Menus: either player's up and down (keys or a pad) move between the open card's controls.
// On a pad, A or X presses the focused one and B goes back. Keyboard Enter, Space and Esc work as usual.
function menuKey(code, pad) {
  const k = keyOf(code), card = $("overlay").querySelector(".card:not([hidden])");
  if (!k || !card) return false;
  const items = [...card.querySelectorAll("button, a[href], summary, textarea")].filter((el) => !el.disabled && el.getClientRects().length);
  const at = items.indexOf(document.activeElement), a = k[1];
  if (a === "up" || a === "left" || a === "down" || a === "right") {
    const step = a === "up" || a === "left" ? -1 : 1;
    const next = items[at < 0 ? 0 : (at + step + items.length) % items.length];
    if (next) next.focus({ preventScroll: false });
    return true;
  }
  if (!pad) return false;
  if (a === "kick" || a === "punch") { const el = at >= 0 ? items[at] : items[0]; if (el) el.click(); return true; }
  if (a === "jump") { const back = card.querySelector("[data-back]"); if (back) back.click(); else if (phoneOpen) closePhone(); else if (choiceOpen) closeChoice(); else if (!$("card-shop").hidden) closeShop(); else if (state === "play" && paused) togglePause(); return true; }
  return true;
}
let countdown = 0;   // frames of "get ready" before play resumes
let pauseOnPlay = false;   // full screen was left during a story scene: pause when it hands back
function togglePause() {
  paused = !paused;
  const btn = document.querySelector(".pad .pause-btn");
  if (paused) { countdown = 0; down.clear(); showCard("card-pause"); if (btn) btn.textContent = "Resume"; }
  else { showCard(null); countdown = 120; if (btn) btn.textContent = "Pause"; }
}

/* ---------- page: cards over the game, full screen ---------- */
const CARDS = ["card-title", "card-menu", "card-load", "card-settings", "card-controls", "card-pause", "card-end", "card-fail", "card-map", "card-shop", "card-phone", "card-choice"];
// show one card over the game (null hides them all) and put keyboard focus on it,
// so Enter and the arrow keys work in menus but never press a hidden button in play
function showCard(id, focus) {
  for (const c of CARDS) { const el = $(c); if (el) el.hidden = c !== id; }
  $("overlay").hidden = !id; $("overlay").classList.toggle("title", id === "card-title");
  if (id === "card-pause") $("p-fs").hidden = Arcade.isFullscreen();
  if (!id) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return; }
  const el = $(focus) || $(id).querySelector(".btn:not([hidden]):not(:disabled)");
  if (el && !TOUCH) el.focus({ preventScroll: true });
}
function toggleFullscreen() { if (Arcade.isFullscreen()) Arcade.exitFullscreen(); else Arcade.enterFullscreen(); }
// The stage's size in CSS pixels: the window, or the window turned sideways when arcade.js
// rotates the stage on a phone held upright in full screen (the same test it uses).
function stageBox() {
  const vw = innerWidth, vh = innerHeight;
  const rot = Arcade.isFullscreen() && !(document.fullscreenElement || document.webkitFullscreenElement) && matchMedia("(any-pointer: coarse)").matches && vh > vw;
  return rot ? [vh, vw] : [vw, vh];
}
// Fit the view to the screen: the width follows the aspect ratio (even, 384 to 512), the canvas
// draws at the largest whole scale that fits the device pixels (2 at least, so small text stays
// legible; 3 on touch and 4 elsewhere at most, to keep phones fast), and CSS stretches what is
// left over: pixelated when that is a whole number, smooth otherwise so no row is doubled.
function fitCanvas() {
  const [W, H] = stageBox(), dpr = devicePixelRatio || 1;
  LW = clamp(Math.round(LH * W / H / 2) * 2, 384, 512);
  SCALE = clamp(Math.floor(Math.min(W * dpr / LW, H * dpr / LH)), 2, TOUCH ? 3 : 4);
  if (canvas.width !== LW * SCALE || canvas.height !== LH * SCALE) { canvas.width = LW * SCALE; canvas.height = LH * SCALE; gradeCanvas = null; stillDrawn = false; }
  const k = Math.min(W / LW, H / LH), up = k * dpr / SCALE;
  canvas.style.width = Math.floor(LW * k) + "px"; canvas.style.height = Math.floor(LH * k) + "px";
  canvas.style.imageRendering = Math.abs(up - Math.round(up)) < 0.01 ? "pixelated" : "auto";
}
// registered before arcade.js's own resize handler (menu.js sets that up), so the canvas has its
// new size by the time arcade.js fits the full-screen stage around it
addEventListener("resize", fitCanvas);

/* ---------- loop ---------- */
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  let stepped = false;
  while (acc >= TICK) { if (!(state === "play" && fightersPending())) update(); else pressed.clear(); acc -= TICK; stepped = true; }
  // draw only when the game has moved on, so a 120 Hz screen draws 60 frames a second, not 120;
  // and a paused game, frozen behind its menu, just once
  const still = paused && state === "play";
  if (stepped && !(still && stillDrawn)) draw();
  stillDrawn = still && (stepped || stillDrawn);
  requestAnimationFrame(loop);
}
