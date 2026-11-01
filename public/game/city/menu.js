/* Rollback City: the menu and start-up.
   A plain script that shares globals with the others; index.html loads them in order. */
"use strict";

/* menu backdrop: Chandni Lane outside the dhaba, with Bhola and two of his men squaring up */
function demo() {
  street = WORLD.streets.lane; stageIdx = 0; cam = 0; arena = null; wipe = null; streetArt(street);
  const ox = START_AT.x - 120;
  barrels = street.barrels.map(([x, y, drop, kind = "barrel"]) => ({ x, y, drop, kind, hp: kind === "barrel" ? 2 : 3, shake: 0 }));
  cat = { x: street.cat, y: 151, st: "sit", t: 0 }; pigeons = null;
  fighterArt(SHEET_OF[startPick()]); fighterArt(startPick() === "kai" ? "rai" : "kai");
  const cast = ["ox", "kicker", "thrower"]; cast.forEach((k) => fighterArt(SHEET_OF[k]));
  enemies = cast.map((k, i) => { const e = fighter(k, ox + 300 - i * 34, 168 + i * 12, "e"); e.face = -1; return e; });
  const r = fighter(startPick(), ox + 90, 180, "p"); r.pi = 0; players = [r];
  if (startPlayers === 2) { const k = fighter(startPick() === "kai" ? "rai" : "kai", ox + 60, 195, "p"); k.pi = 1; players.push(k); }
  items = []; shots = []; fx = []; civs = [];
}
// a new game starts with Rai or Kai: Raghav and Cheel come over to Nani's side during Act 1
const startPick = () => (pick1 === "kai" ? "kai" : "rai");

function toggleBigHead() {
  bigHead = !bigHead; try { localStorage.setItem("city:bighead", bigHead ? "1" : "0"); } catch (e) { /* ignore */ }
  Arcade.toast(bigHead ? "Big head mode on" : "Big head mode off");
  Arcade.secret("bighead", true);
}
Arcade.onSequence(["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"], toggleBigHead);
(() => { let n = 0, t0 = 0; const h = document.querySelector("#card-menu h2"); if (h) h.addEventListener("click", () => { const now = performance.now(); n = now - t0 < 3000 ? n + 1 : 1; t0 = now; if (n >= 5) { n = 0; toggleBigHead(); } }); })();

function buildCostumes() {
  const box = $("costumes"); if (!box) return;
  const opts = [["classic", "Classic"]].concat(Arcade.hasSecret("neon") ? [["neon", "Neon"]] : [], Arcade.hasSecret("onecredit") ? [["gold", "Gold"]] : [], Arcade.hasSecret("hero") ? [["hero", "Film hero"]] : [], Arcade.hasSecret("sherwani") ? [["sherwani", "Sherwani"]] : [], Arcade.hasSecret("chakra") ? [["avatar", "Avatar"]] : []);
  if (!opts.some((o) => o[0] === costume)) costume = "classic";
  box.hidden = opts.length < 2; box.innerHTML = "";
  for (const [id, name] of opts) {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = name; b.setAttribute("aria-pressed", String(id === costume));
    b.addEventListener("click", () => { costume = id; try { localStorage.setItem("city:costume", id); } catch (e) { /* ignore */ } buildCostumes(); });
    box.appendChild(b);
  }
}

function buildSettings() {
  const box = $("settings"); if (!box) return;
  box.innerHTML = "";
  const chip = (label, on, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", String(on)); b.addEventListener("click", () => { fn(); buildSettings(); }); box.appendChild(b); };
  chip("Story difficulty", EASY, () => { EASY = true; try { localStorage.setItem("city:difficulty", "story"); } catch (e) { /* ignore */ } });
  chip("Arcade difficulty", !EASY, () => { EASY = false; try { localStorage.setItem("city:difficulty", "arcade"); } catch (e) { /* ignore */ } });
  chip(storyOn ? "Cutscenes on" : "Cutscenes off", storyOn, () => { storyOn = !storyOn; try { localStorage.setItem("city:story", storyOn ? "on" : "off"); } catch (e) { /* ignore */ } });
}

function buildFighters() {
  const box = $("fighters"); if (!box) return;
  box.innerHTML = "";
  for (const [id, name] of ROSTER.slice(0, 2)) {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip";
    const im = document.createElement("img"); im.src = "/game/city/sprites/portraits/" + id + ".png?v=1"; im.alt = ""; im.className = "chip-face"; b.appendChild(im);
    b.append(name + ": " + SPECIALS[id][2]); b.setAttribute("aria-pressed", String(id === startPick()));
    b.addEventListener("click", () => { pick1 = id; try { localStorage.setItem("city:fighter", id); } catch (e) { /* ignore */ } buildMenu(); demo(); });
    box.appendChild(b);
  }
}
function buildMenu() { buildCostumes(); buildFighters(); if (typeof storyOn !== "undefined") buildSettings(); }

// pick 1 or 2 players (a keyboard-only choice), then Start game
let playerCount = 1;
for (const b of document.querySelectorAll("#players [data-players]")) b.addEventListener("click", () => {
  playerCount = +b.dataset.players; startPlayers = playerCount; demo();
  for (const o of document.querySelectorAll("#players [data-players]")) o.setAttribute("aria-pressed", String(o === b));
});
$("start1").addEventListener("click", () => {
  if (!Arcade.isFullscreen()) Arcade.enterFullscreen();
  pick1 = startPick(); startCity(playerCount);   // the 2-player choice is only shown where there is a keyboard
});
// Enter starts a game with the chosen player count from the menu (unless a button or link has focus)
addEventListener("keydown", (e) => {
  if (e.code !== "Enter" || state !== "menu" || $("overlay").hidden || $("card-menu").hidden) return;
  if (["BUTTON", "A", "INPUT", "SUMMARY"].includes(document.activeElement.tagName)) return;
  e.preventDefault(); $("start1").click();
});
// Esc in a menu card goes back (in play, Esc pauses and resumes: see onDown)
addEventListener("keydown", (e) => {
  if (e.code !== "Escape" || $("overlay").hidden || typing()) return;
  const back = $("overlay").querySelector(".card:not([hidden]) [data-back]");
  if (back) { e.preventDefault(); back.click(); }
});

/* the title screen and its cards */
function toTitle() {
  state = "menu"; paused = false; countdown = 0; banner = null; pauseOnPlay = false; mission = null; mapOpen = false; phoneOpen = false; ring = null; call = null; jeep = null; sitting = null; heatD = null;
  if (scene) { scene = null; $("stage-wrap").classList.remove("story"); }
  const pb = document.querySelector(".pad .pause-btn"); if (pb) pb.textContent = "Pause";
  showBest(); buildMenu(); demo();
  refreshTitle(); showCard("card-title");
}
// a card opened from the pause card goes back to it; otherwise back to the title
const backCard = () => (state === "play" && paused ? "card-pause" : "card-title");
for (const b of document.querySelectorAll("[data-back]")) b.addEventListener("click", () => showCard(backCard()));
$("t-new").addEventListener("click", () => {
  if (!Arcade.isFullscreen()) Arcade.enterFullscreen();   // the first press of New game goes full screen
  curSlot = freeSlot(); buildSlotPick();
  showCard("card-menu", "start1");
});
$("t-continue").addEventListener("click", () => {
  const s = latestSave(); if (!s) return;
  if (!Arcade.isFullscreen()) Arcade.enterFullscreen();   // and so does the first press of Continue
  loadGame(s);
});
$("t-load").addEventListener("click", () => { buildSlots(); showCard("card-load"); });
for (const id of ["t-settings", "p-settings"]) $(id).addEventListener("click", () => { buildSaveCode(); showCard("card-settings"); });
for (const id of ["t-controls", "p-controls"]) $(id).addEventListener("click", () => showCard("card-controls"));
$("p-resume").addEventListener("click", () => { if (paused) togglePause(); });
$("p-fs").addEventListener("click", () => { Arcade.enterFullscreen(); $("p-fs").hidden = true; $("p-resume").focus({ preventScroll: true }); });
$("p-quit").addEventListener("click", () => { saveGame(true); toTitle(); });
$("f-retry").addEventListener("click", retryMission);
$("map-close").addEventListener("click", closeMap);
$("phone-close").addEventListener("click", closePhone);
addEventListener("resize", () => { if (mapOpen) drawMap(); });
$("f-quit").addEventListener("click", giveUpMission);
$("again").addEventListener("click", toTitle);
$("continue").addEventListener("click", () => { if (state === "actend") { state = "play"; showCard(null); return; } startCity(startPlayers, { street: street.id, x: cam + LW / 2 }); });
function showBest() { try { const b = +localStorage.getItem("city:best"); if (b) $("best-line").textContent = "Best on this device: " + b.toLocaleString(); } catch (e) { /* ignore */ } }
showBest();
palette();
Arcade.setupFullscreen((on) => {
  if (!on && state === "play" && !paused) togglePause();
  pauseOnPlay = !on && state === "story";
  if (on && state === "play" && !paused) countdown = 180;
  if (!$("card-pause").hidden) $("p-fs").hidden = on;
  fitCanvas();
});
fitCanvas();
buildMenu();
demo();
refreshTitle(); showCard("card-title");
requestAnimationFrame(loop);
