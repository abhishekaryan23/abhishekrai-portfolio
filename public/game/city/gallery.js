/* Rollback City: collectibles, the gallery, 1987 mode and New Game+ (DESIGN 6.3, 7.11; 5.5 and 5.6 of
   the plan). A plain script that shares globals with the others; index.html loads them in order.

   On top of Nani's letters, the 1987 polaroids, the lost tapes, the recipe cards and Tiwari's reels:
   six Avatar posters to find, eight Kaal Group tags to paint over, eight stopped clocks (every one at
   11:58) to wind, the city's cats to make friends with, and rival kites cut. The phone's Gallery
   counts them all, with the moments you've kept: the photo booth on the Kinara, and the big days of
   the story. All eight polaroids open 1987 mode (the lane before the fire); finishing the story opens
   New Game+ (harder goondas, the Avatar costume). Both start from the title screen. */
"use strict";

/* ---------- the new things to find, drawn on the walls ---------- */
const SPOTS = {
  posters: { n: "Avatar posters", verb: "Look at the Avatar poster", list: [["lane", 340], ["mandiGate", 1200], ["bunderRoad", 420], ["kinara", 820], ["sitara", 520], ["mandiRoad", 1600]] },
  tags: { n: "Kaal tags painted over", verb: "Paint over the Kaal Group tag", list: [["lane", 1980], ["gali", 1000], ["mandiGate", 300], ["mandiRoad", 950], ["bunderRoad", 1440], ["kinara", 1350], ["docks", 1100], ["heights", 600]] },
  clocks: { n: "Stopped clocks wound", verb: "Wind the stopped clock", list: [["lane", 700], ["gali", 500], ["mandiGate", 1550], ["weighbridge", 700], ["bunderRoad", 760], ["platform", 1150], ["ghat", 650], ["millGate", 1800]] }};
const has = (k, i) => (progress[k] || []).includes(i);
// an Avatar poster is pasted at eye level on the pillar between a shop front and its door, the one bit of
// wall nothing else uses (it used to sit at window height, and could land on a hoarding)
const spotFree = (x) => !(street.look && street.look.station !== undefined && x > street.look.station - 10 && x < street.look.station + 394) && !(street.doors || []).concat(street.junctions || [], street.links || [], street.props || []).some((d) => Math.abs(d.x - x) < 44 || (d.dir === "up" && Math.abs(d.x + 30 - x) < 36));
// a Kaal tag goes on wall: up on the shopfronts, but on the quay or the sea wall where there is only sky up there
const tagY = () => (street.theme === "street" ? 76 : 144);
function spotX(k, wx) {
  if (k !== "posters" || street.theme !== "street" || (street.look && street.look.narrow)) return wx;
  const b = Math.floor(wx / 128);
  for (const n of [0, 1, -1, 2, -2]) { const x = (b + n) * 128 + 89; if (x > 40 && x < (street.w || 2000) - 40 && spotFree(x)) return x; }   // the nearest pillar with no sign, door or prop at it
  return b * 128 + 89;
}
art(["m_booth"]);
function spotTarget(p) {
  if (!clockRuns() || mission || arena) return null;
  for (const k in SPOTS) { const i = SPOTS[k].list.findIndex(([s, x], i) => s === street.id && Math.abs(spotX(k, x) - p.x) < 18 && !has(k, i)); if (i >= 0) return { label: SPOTS[k].verb, x: spotX(k, SPOTS[k].list[i][1]), y: k === "posters" ? 100 : 60, act: () => {
    (progress[k] = progress[k] || []).push(i); const n = progress[k].length, of = SPOTS[k].list.length;
    texts.push({ x: p.x, y: p.y - 74, s: SPOTS[k].n + ": " + n + " of " + of, t: 100 }); Arcade.tone(990, 0.06, "triangle", 0.04);
    if (k === "tags") changeRespect(1); if (n === of) { earn(500); texts.push({ x: p.x, y: p.y - 88, s: "Every one! Rs 500 from the Lane Committee", t: 120 }); }
    saveGame(true);
  } }; }
  return null;
}
// every collectible, whatever it is, shows the same cue so you learn to spot it: a soft gold glow, a sparkle
// that pops now and then (often, when you're close), and close by a small gold diamond bobbing over it
function collectCue(wx, y) {
  const x = Math.round(wx - cam); if (x < -20 || x > LW + 20) return;
  const near = alivePlayers().some((p) => Math.abs(p.x - wx) < 70), t = frameNo + Math.round(wx);
  g.globalAlpha = 0.1 + 0.07 * Math.sin(t / 15); g.fillStyle = "#ffe066"; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.globalAlpha = 1;
  const ph = t % (near ? 40 : 100); if (ph < 10) { const r = Math.round(ph < 5 ? ph / 2 + 1 : (10 - ph) / 2 + 1); R(x + 5 - r, y - 6, r * 2 + 1, 1, "#fffbe0"); R(x + 5, y - 6 - r, 1, r * 2 + 1, "#fffbe0"); }
  if (near) { const by = y - 17 + Math.round(Math.sin(t / 10) * 1.5); R(x - 3, by - 1, 7, 3, "#5a4210"); R(x - 1, by - 3, 3, 7, "#5a4210"); R(x - 2, by, 5, 1, "#ffd23a"); R(x, by - 2, 1, 5, "#ffd23a"); R(x - 1, by - 1, 3, 3, "#ffd23a"); R(x, by - 1, 1, 1, "#fffbe0"); }
}
function drawSpots() {
  if (street.interior || !clockRuns()) return;
  for (const k in SPOTS) SPOTS[k].list.forEach(([s, wx], i) => {
    if (s !== street.id) return; const x = Math.round(spotX(k, wx) - cam); if (x < -20 || x > LW + 20) return;
    if (!has(k, i)) collectCue(wx > 0 ? spotX(k, wx) : wx, k === "posters" ? 117 : k === "tags" ? tagY() - 4 : 62);
    if (k === "posters") {   // a little portrait cut of the key art, in a dark paper border; faded once you've looked
      const t = 108; R(x - 7, t - 1, 14, 19, "#1d1b18");
      R(x - 6, t, 12, 17, "#1a1030"); for (let k = 0; k < 6; k++) { g.globalAlpha = 0.5; R(x - 6 + k * 2, t, 1, 11, k % 2 ? "#e2701c" : "#f2c230"); } g.globalAlpha = 1;   // a sunburst
      R(x - 1, t + 4, 3, 3, "#1d1b18"); R(x - 2, t + 7, 5, 5, "#1d1b18"); R(x + 3, t + 5, 1, 3, "#1d1b18"); R(x + 4, t + 3, 3, 3, "#f2c230");   // the hero in silhouette, his disc raised
      R(x - 6, t + 13, 12, 4, "#c0392b"); R(x - 5, t + 14, 10, 1, "#f2c230"); R(x - 5, t + 16, 6, 1, "#f2c230");   // the title band
      if (has(k, i)) { g.globalAlpha = 0.5; R(x - 6, t, 12, 17, "#efe6d2"); g.globalAlpha = 1; } else if (frameNo % 120 < 8) R(x + 3, t + 1, 2, 2, "#ffffff");
    }
    if (k === "tags") { const ty = tagY(); if (has(k, i)) { g.globalAlpha = 0.5; R(x - 12, ty - 10, 24, 12, "#efe6d2"); g.globalAlpha = 1; } else text("KG", x, ty, 11, "#c0392b", "center", "Newsreader"); }
    if (k === "clocks") { g.fillStyle = "#fbf8f2"; g.beginPath(); g.arc(x, 62, 6, 0, 7); g.fill(); g.strokeStyle = "#2a2622"; g.lineWidth = 1; g.stroke(); const m = has(k, i) ? clockMin() : 23 * 60 + 58, a1 = (m % 60) / 60 * 6.283 - 1.571, a2 = ((m / 60) % 12) / 12 * 6.283 - 1.571; g.beginPath(); g.moveTo(x, 62); g.lineTo(x + Math.cos(a1) * 5, 62 + Math.sin(a1) * 5); g.moveTo(x, 62); g.lineTo(x + Math.cos(a2) * 3.5, 62 + Math.sin(a2) * 3.5); g.stroke(); }
  });
}
// a cat befriended: crouch (down) next to one, still, for a moment
function updateCats() {
  if (!cat || cat.st !== "sit" || street.interior) return;
  const p = alivePlayers().find((q) => Math.abs(q.x - cat.x) < 20 && (q.st === "idle" || q.st === "walk") && q.y >= Y1 - 2 && held(q.pi, "down"));   // crouched at the kerb (holding down walks you there)
  if (!p) { cat.pet = 0; return; }
  if (++cat.pet === 90 && !(progress.cats || []).includes(street.id)) { (progress.cats = progress.cats || []).push(street.id); texts.push({ x: cat.x, y: cat.y - 30, s: "The cat decides you're all right. Cats: " + progress.cats.length + " of " + catStreets().length, t: 110 }); Arcade.tone(1320, 0.05, "triangle", 0.03); }
}
const catStreets = () => Object.keys(WORLD.streets).filter((id) => WORLD.streets[id].cat);

/* ---------- the gallery ---------- */
const COLLECTIONS = () => [
  ["Nani's letters", lettersFound().length, 4], ["1987 polaroids", (progress.polaroids || []).length, POLAROIDS.length], ["Lost tapes", (progress.tapes || []).length, TAPES.length],
  ["Recipe cards", (progress.recipes || []).length, RECIPES.length], ["Tiwari's reels", (progress.reels || []).length, REELS.length], ["Rival kites cut", Math.min(12, progress.kitesCut || 0), 12],
  ["Cats befriended", (progress.cats || []).length, catStreets().length], ["Wax museum villains", (progress.villains || []).length, VILLAINS.length], ["Wax villains beaten", (progress.waxBeat || []).length, VILLAINS.length], ...Object.keys(SPOTS).map((k) => [SPOTS[k].n, (progress[k] || []).length, SPOTS[k].list.length])];
const completion = () => { const c = COLLECTIONS(), a = c.reduce((s, x) => s + Math.min(x[1], x[2]), 0), b = c.reduce((s, x) => s + x[2], 0); return Math.round(100 * a / b); };
const moments = () => { try { return JSON.parse(localStorage.getItem("city:gallery")) || []; } catch (e) { return []; } };
// keep a small picture of the screen as a moment (the photo booth, the big days)
function keepMoment(caption) {
  try {
    const c = document.createElement("canvas"); c.width = 192; c.height = 108; c.getContext("2d").drawImage(canvas, 0, 0, 192, 108);
    const list = moments(); list.push({ src: c.toDataURL("image/jpeg", 0.7), caption, day: progress.clock ? progress.clock.day : 0 }); while (list.length > 12) list.shift();
    localStorage.setItem("city:gallery", JSON.stringify(list));
  } catch (e) { /* full storage or private mode: no moment kept */ }
}
function galleryText() {
  return "THE GALLERY  " + completion() + "% found\n\n" + COLLECTIONS().map(([n, a, b]) => n + ": " + Math.min(a, b) + " of " + b + (a >= b ? "  (all!)" : "")).join("\n") +
    "\n\nMoments kept: " + moments().length + " (the photo booth on the Kinara, and the big days)";
}
function openGallery() {
  const box = $("phone-screen"); if (!box) return showNote(galleryText());
  box.innerHTML = ""; const pre = document.createElement("p"); pre.style.whiteSpace = "pre-line"; pre.style.fontSize = "12px"; pre.textContent = galleryText(); box.appendChild(pre);
  const strip = document.createElement("div"); strip.style.display = "flex"; strip.style.flexWrap = "wrap"; strip.style.gap = "4px";
  for (const m of moments().slice().reverse()) { const im = document.createElement("img"); im.src = m.src; im.alt = m.caption; im.title = m.caption + " (day " + m.day + ")"; im.style.width = "88px"; im.style.imageRendering = "pixelated"; strip.appendChild(im); }
  box.appendChild(strip);
  const back = document.createElement("button"); back.type = "button"; back.className = "phone-item"; back.textContent = "Back"; back.addEventListener("click", () => phoneTab("home")); box.appendChild(back);
}
// the photo booth on the Kinara: twenty rupees, one moment
WORLD.streets.kinara.props = (WORLD.streets.kinara.props || []).concat({ x: 640, kind: "booth" });
function boothTarget(p) {
  if (street.id !== "kinara" || Math.abs(p.x - 640) > 20 || mission) return null;
  return { label: "Photo booth (" + rupees(20) + ")", x: 640, y: Y0 - 50, act: () => { if (money() < 20) return; progress.money -= 20; banner = null; draw(); keepMoment("The photo booth, Sagar Kinara"); Arcade.tone(1500, 0.05, "square", 0.04); texts.push({ x: p.x, y: p.y - 74, s: "Flash! A strip of four, all blinking. Kept in the Gallery.", t: 110 }); } };
}
function drawBooth() {
  if (street.id !== "kinara") return; const x = Math.round(640 - cam); if (x < -30 || x > LW + 30) return;
  if (spr("m_booth", x, Y0 + 4)) { text("PHOTO", x - 2, Y0 - 44, 5, "#c0392b", "center", "IBM Plex Sans"); return; }   // the booth (MOSS), its sign lettered here
  R(x - 12, Y0 - 44, 24, 48, "#c0392b"); R(x - 10, Y0 - 40, 20, 30, "#1d1b18"); R(x - 12, Y0 - 50, 24, 7, "#f2c230"); text("PHOTO", x, Y0 - 45, 5, "#c0392b"); R(x - 9, Y0 - 10, 18, 2, "#7a2230");
}

/* ---------- 1987 mode and New Game+ ---------- */
const deviceFlag = (k) => { try { return localStorage.getItem("city:" + k) === "1"; } catch (e) { return false; } };
const setDeviceFlag = (k) => { try { localStorage.setItem("city:" + k, "1"); } catch (e) { /* ignore */ } };
function updateUnlocks() {
  if ((progress.polaroids || []).length >= POLAROIDS.length && !deviceFlag("unlock1987")) { setDeviceFlag("unlock1987"); banner = { text: "Every polaroid: 1987 mode is on the title screen", t: 200, big: true }; }
  if (flag("ending") && !credits && !deviceFlag("ngplus")) { setDeviceFlag("ngplus"); Arcade.secret("chakra", true); }
}
// the lane in 1987, the night before it burned: nothing to do but walk it, and nothing saved
function start1987() {
  progress = { done: [], flags: {}, clock: { day: 1, min: 22 * 60 }, mode1987: true, filter: "1987" };   // a clean slate, never saved
  for (const id in WORLD.streets) for (const a of WORLD.streets[id].arenas || []) a.done = true;   // no fights the night before
  startCity(1, { street: "lane", x: 1216 }); mission = null;
  banner = { text: "Chandni Lane, 1987. The night before.", t: 240, big: true };
}
let ngNext = false, openNext = false, exploreNext = false;
// "Open city": for anyone who has played Rollback Street (Act 1 is that night again), start at midnight
// with Act 1 done, the clock running and every district Act 1 opens already open
function startOpenCity() { openNext = true; $("t-new").click(); }
// Explore: the whole city open, every door and train at any hour, no story missions and no roaming goondas
function startExplore() { exploreNext = true; $("t-new").click(); }
function openCity() {
  const explore = exploreNext; openNext = exploreNext = false;
  if (explore) progress.explore = true;
  for (const id of ["1-1", "1-2", "1-3", "1-4", "1-5", "1-6"]) if (!progress.done.includes(id)) progress.done.push(id);
  progress.flags.midnight = true; progress.clock = { day: 1, min: 0, frac: 0 };
  for (const id in WORLD.streets) for (const a of WORLD.streets[id].arenas || []) a.done = true;   // the night's set fights are over
  if (explore) progress.clock = { day: 1, min: 10 * 60, frac: 0 };   // explore by daylight
  banner = { text: explore ? "Explore mode: every door is open. Take your time" : "Bunderpur, just after midnight. The city is yours", t: 240, big: true };
  saveGame(true);
}
function startNewGamePlus() {
  ngNext = true; $("t-new").click();   // a free slot and the player pick, as New game; startCity reads ngNext
  costume = "avatar"; try { localStorage.setItem("city:costume", "avatar"); } catch (e) { /* ignore */ }
  banner = { text: "New Game+: the goondas have been training too", t: 200, big: true };
}
function addTitleButtons() {
  const list = document.querySelector(".menu-list"); if (!list) return;
  for (const [id, label, ok, fn] of [["t-open", "Open city (skip the first night)", true, startOpenCity], ["t-explore", "Explore mode (everything open)", true, startExplore], ["t-1987", "1987 mode", deviceFlag("unlock1987"), start1987], ["t-ngplus", "New Game+", deviceFlag("ngplus"), startNewGamePlus]]) {
    let b = document.getElementById(id); if (!ok) { if (b) b.remove(); continue; } if (b) continue;
    b = document.createElement("button"); b.className = "btn ghost"; b.id = id; b.type = "button"; b.textContent = label; b.addEventListener("click", () => { showCard(null); fn(); });
    list.insertBefore(b, document.getElementById("t-load"));
  }
}

/* ---------- hooks ---------- */
function updateGallery() { updateWax(); updateCats(); if (frameNo % 60 === 0) updateUnlocks(); }
function galleryTarget(p) { return spotTarget(p) || boothTarget(p) || museumTarget(p); }
function drawGallery(P) {
  drawSpots(); drawBooth(); drawMuseumFront(P);
  if (clockRuns() && !street.interior) {
    for (const d of POLAROIDS) if (d.look && d.street === street.id && !gotPolaroid(d.id)) collectCue(d.x, Y0 - 30);   // the 1987 polaroids
    for (const it of items) if (it.kind === "letter") collectCue(it.x, it.y - 10 - (it.z || 0));   // Nani's letters, once out of their barrel
  }
}
// the title card gets its two extra buttons whenever it is refreshed
const baseRefreshTitle = refreshTitle;
refreshTitle = function () { baseRefreshTitle(); addTitleButtons(); ngNext = openNext = exploreNext = false; };   // (a cancelled New Game+ doesn't leak into the next game)
addTitleButtons();
