/* Rollback City: saving.
   A plain script that shares globals with the others; index.html loads them in order.

   One JSON state object per slot, in localStorage city:slot1 to city:slot3: where you are, the
   players (health, lives, SP, score, weapon), fighters unlocked, Nani's letters, story progress
   (arenas cleared, later missions and flags) and time played. The game autosaves when you walk
   into a save point (the dhaba) and every two minutes of play; Continue loads the latest slot.
   A save code is the same object as base64 text, to move a game to another browser. */
"use strict";

const SLOTS = 3, SAVE_V = 1, AUTOSAVE = 60 * 120;
let curSlot = 1, saveT = 0, savedT = 0, playFrames = 0;

// save codes are pasted in by people, so check every field the game reads before trusting one
const listOrNone = (v) => v === undefined || Array.isArray(v);
function validSave(s) {
  return !!s && typeof s === "object" && s.game === "rollback-city" && s.v === SAVE_V && typeof s.street === "string" && Object.hasOwn(WORLD.streets, s.street)
    && Number.isFinite(s.x) && (s.y === undefined || Number.isFinite(s.y)) && Number.isFinite(s.at)
    && Array.isArray(s.players) && s.players.length > 0 && s.players.length <= 2 && s.players.every((q) => q && typeof q === "object")
    && listOrNone(s.roster) && listOrNone(s.letters) && listOrNone(s.arenas);
}
function readSlot(n) {
  try {
    const s = JSON.parse(localStorage.getItem("city:slot" + n));
    // a slot saved with a broken position (an old build could write x: null) is mended, not thrown away
    if (s && typeof s === "object" && typeof s.street === "string" && Object.hasOwn(WORLD.streets, s.street)) {
      if (!Number.isFinite(s.x)) s.x = Math.round((WORLD.streets[s.street].w || LW) / 2);
      if (s.y !== undefined && !Number.isFinite(s.y)) delete s.y;
    }
    if (!validSave(s)) return null; s.slot = n; return s;
  } catch (e) { return null; }
}
function latestSave() { let best = null; for (let n = 1; n <= SLOTS; n++) { const s = readSlot(n); if (s && (!best || s.at > best.at)) best = s; } return best; }
// the first empty slot, or else the one saved longest ago
function freeSlot(skip) { let old = null; for (let n = 1; n <= SLOTS; n++) { if (n === skip) continue; const s = readSlot(n); if (!s) return n; if (!old || s.at < old.at) old = s; } return old.slot; }

const arenaIds = () => { const done = []; for (const id in WORLD.streets) (WORLD.streets[id].arenas || []).forEach((a, i) => { if (a.done) done.push(id + ":" + i); }); return done; };
function snapshot() {
  const lead = alivePlayers()[0] || players[0];
  return {
    game: "rollback-city", v: SAVE_V, at: Date.now(), slot: curSlot,
    street: street.id, x: Math.round(Number.isFinite(lead.x) ? lead.x : (street.w || LW) / 2), y: Math.round(Number.isFinite(lead.y) ? lead.y : Y0 + 20), n: players[1] ? 2 : 1, fighter: players[0].kind,
    players: players.filter(Boolean).map((p) => ({ kind: p.kind, hp: Math.round(p.hp), lives: p.lives, sp: Math.round(p.sp), score: p.score, weapon: p.weapon ? p.weapon.kind : null })),
    roster: rosterUnlocked(), letters: lettersFound(), arenas: arenaIds(), played: Math.round(playFrames / 60),
    progress: { done: progress.done.slice(), flags: { ...progress.flags }, clock: { day: progress.clock.day, min: progress.clock.min }, weather: progress.weather ? progress.weather.kind : "clear", flood: progress.weather ? +(progress.weather.flood || 0).toFixed(2) : 0, money: money(), stats: { ...(progress.stats || {}) }, tasted: (progress.tasted || []).slice(),
      messages: (progress.messages || []).slice(-30), debt: progress.debt || 0, disguise: !!progress.disguise, turf: JSON.parse(JSON.stringify(progress.turf || {})), raid: { ...(progress.raid || {}) }, tin: progress.tin || 0, ring: progress.ring || 0, ringWon: !!progress.ringWon, godboleDay: progress.godboleDay || 0, moti: { fed: (progress.moti || {}).fed || 0, day: (progress.moti || {}).day || 0 }, chhotuN: progress.chhotuN || 0, chhotuDay: progress.chhotuDay || 0, cricket: progress.cricket || 0, cricketDay: progress.cricketDay || 0, kites: progress.kites || 0, kiteDay: progress.kiteDay || 0, kushti: progress.kushti || 0, kushtiDay: progress.kushtiDay || 0, tapes: (progress.tapes || []).slice(), catchN: progress.catchN || 0, recipes: (progress.recipes || []).slice(), reels: (progress.reels || []).slice(), gigs: progress.gigs || 0, gigDay: progress.gigDay || 0, buff: progress.buff || null, filter: progress.filter || "none", bailPaid: !!progress.bailPaid, polaroids: (progress.polaroids || []).slice(), respDay: { ...(progress.respDay || {}) }, haggled: { ...(progress.haggled || {}) }, scams: { ...(progress.scams || {}) }, lostCards: progress.lostCards || 0, uncle: progress.uncle || 0, missed: (progress.missed || []).slice(-6), naniIgnored: progress.naniIgnored || 0, radio: progress.radio || 0, jobs: { ...(progress.jobs || {}) }, vehicles: parkedNow(), trained: progress.trained || 0, news: (progress.news || []).slice(-40), nemesis: progress.nemesis || null, posters: (progress.posters || []).slice(), tags: (progress.tags || []).slice(), clocks: (progress.clocks || []).slice(), cats: (progress.cats || []).slice(), kitesCut: progress.kitesCut || 0, ngplus: !!progress.ngplus, explore: !!progress.explore, copsOff: progress.copsOff || 0, villains: (progress.villains || []).slice(), waxBeat: (progress.waxBeat || []).slice(), heat: heat(), respect: { ...(progress.respect || {}) } }
  };
}
function saveGame(quiet) {
  // a mission in progress is not saved: loading puts you back at its start (it saved there)
  if (!street || !players[0] || state !== "play" || mission || progress.mode1987) return false;   // (1987 mode keeps nothing)
  const s = snapshot(); if (!validSave(s)) return false;   // never write a slot that wouldn't load back
  try { localStorage.setItem("city:slot" + curSlot, JSON.stringify(s)); } catch (e) { return false; }
  saveT = 0; if (!quiet) savedT = 150;
  return true;
}
// a save's fighters and letters count on this device too (they were earned)
function mergeUnlocks(s) {
  try {
    const r = rosterUnlocked(); for (const k of s.roster || []) if (ROSTER.some(([id]) => id === k) && !r.includes(k)) r.push(k);
    localStorage.setItem("city:roster", JSON.stringify(r));
    const l = lettersFound(); for (const n of s.letters || []) if (Number.isInteger(n) && n >= 0 && n < 4 && !l.includes(n)) l.push(n);
    localStorage.setItem("city:letters", JSON.stringify(l));
  } catch (e) { /* private mode */ }
}
function loadGame(s) {
  curSlot = s.slot || 1; mergeUnlocks(s);
  if (["rai", "kai", "pRook", "pCrane"].includes(s.fighter)) pick1 = s.fighter;
  for (const id in WORLD.streets) (WORLD.streets[id].arenas || []).forEach((a, i) => { a.done = (s.arenas || []).includes(id + ":" + i); });
  const pr = s.progress && typeof s.progress === "object" ? s.progress : {};
  progress = { done: Array.isArray(pr.done) ? pr.done.filter((id) => typeof id === "string" && Object.hasOwn(MISSIONS, id)) : [], flags: {} };
  if (pr.flags && typeof pr.flags === "object") for (const k in pr.flags) if (pr.flags[k] === true) progress.flags[k] = true;
  const ck = pr.clock && typeof pr.clock === "object" ? pr.clock : {};
  progress.stats = {}; if (pr.stats && typeof pr.stats === "object") for (const k in STATS) if (Number.isInteger(pr.stats[k])) progress.stats[k] = clamp(pr.stats[k], 0, STAT_MAX);
  progress.tasted = Array.isArray(pr.tasted) ? pr.tasted.filter((t) => typeof t === "string" && t.length < 40).slice(0, 200) : [];
  progress.messages = Array.isArray(pr.messages) ? pr.messages.filter((m) => typeof m === "string").map((m) => m.slice(0, 200)).slice(-30) : [];
  progress.vehicles = {}; if (pr.vehicles && typeof pr.vehicles === "object") for (const id in pr.vehicles) { const v = pr.vehicles[id]; if (v && typeof v.street === "string" && Object.hasOwn(WORLD.streets, v.street) && !WORLD.streets[v.street].interior && Number.isFinite(v.x)) progress.vehicles[id] = { street: v.street, x: clamp(Math.round(v.x), 12, WORLD.streets[v.street].w - 12) }; }
  progress.jobs = {}; if (pr.jobs && typeof pr.jobs === "object") for (const id of JOBS) if (Number.isInteger(pr.jobs[id])) progress.jobs[id] = Math.max(0, pr.jobs[id]);
  progress.missed = Array.isArray(pr.missed) ? pr.missed.filter((m) => m && typeof m.who === "string" && Array.isArray(m.lines)).slice(-6).map((m) => ({ who: m.who.slice(0, 20), name: typeof m.name === "string" ? m.name.slice(0, 40) : m.who.slice(0, 20), lines: m.lines.filter((l) => typeof l === "string").map((l) => l.slice(0, 200)).slice(0, 6) })) : [];
  progress.turf = {}; if (pr.turf && typeof pr.turf === "object") for (const d in TURF) if (pr.turf[d] && pr.turf[d].hideout === true) progress.turf[d] = { hideout: true };
  progress.raid = {}; if (pr.raid && typeof pr.raid === "object") { if (Number.isInteger(pr.raid.day)) progress.raid.day = pr.raid.day; if (Object.hasOwn(TURF, pr.raid.d)) progress.raid.d = pr.raid.d; progress.raid.done = pr.raid.done === true; }
  progress.disguise = pr.disguise === true;
  progress.tin = Number.isInteger(pr.tin) ? clamp(pr.tin, 0, DEBT) : 0; progress.ring = Number.isInteger(pr.ring) ? pr.ring : 0; progress.ringWon = pr.ringWon === true; progress.godboleDay = Number.isInteger(pr.godboleDay) ? pr.godboleDay : 0;
  { const mo = pr.moti && typeof pr.moti === "object" ? pr.moti : {}; progress.moti = { fed: Number.isInteger(mo.fed) ? clamp(mo.fed, 0, 5) : 0, day: Number.isInteger(mo.day) ? mo.day : 0 }; }
  progress.chhotuN = Number.isInteger(pr.chhotuN) ? clamp(pr.chhotuN, 0, 3) : 0;
  for (const [k, max] of [["cricket", 3], ["kites", 4], ["kushti", 10]]) progress[k] = Number.isInteger(pr[k]) ? clamp(pr[k], 0, max) : 0;
  progress.tapes = Array.isArray(pr.tapes) ? [...new Set(pr.tapes.filter((k) => Number.isInteger(k) && k >= 0 && k < 10))] : []; progress.catchN = Number.isInteger(pr.catchN) ? Math.max(0, pr.catchN) : 0;
  const ints = (a, n) => Array.isArray(a) ? [...new Set(a.filter((k) => Number.isInteger(k) && k >= 0 && k < n))] : [];
  progress.recipes = ints(pr.recipes, 12); progress.reels = ints(pr.reels, 6); progress.gigs = Number.isInteger(pr.gigs) ? clamp(pr.gigs, 0, 8) : 0; progress.gigDay = Number.isInteger(pr.gigDay) ? pr.gigDay : 0;
  progress.buff = pr.buff && typeof pr.buff.id === "string" && Number.isInteger(pr.buff.day) ? { id: pr.buff.id, day: pr.buff.day, used: pr.buff.used === true } : null;
  progress.filter = ["none", "1987", "vhs"].includes(pr.filter) ? pr.filter : "none"; progress.bailPaid = pr.bailPaid === true;
  progress.news = Array.isArray(pr.news) ? pr.news.filter((n) => n && Number.isInteger(n.day) && typeof n.text === "string").slice(-40).map((n) => ({ day: n.day, text: n.text.slice(0, 120) })) : [];
  { const N = pr.nemesis; progress.nemesis = N && Object.hasOwn(KINDS, N.kind) && SHEET_OF[N.kind] && typeof N.name === "string" && Object.hasOwn(WORLD.streets, N.street) && Number.isInteger(N.day) ? { kind: N.kind, name: N.name.slice(0, 40), district: WORLD.streets[N.street].district, street: N.street, day: N.day, level: clamp(N.level | 0, 1, 3) } : null; }
  for (const [k, n] of [["posters", 6], ["tags", 8], ["clocks", 8]]) progress[k] = ints(pr[k], n);
  progress.cats = Array.isArray(pr.cats) ? [...new Set(pr.cats.filter((id) => Object.hasOwn(WORLD.streets, id)))] : [];
  progress.kitesCut = Number.isInteger(pr.kitesCut) ? clamp(pr.kitesCut, 0, 999) : 0; progress.ngplus = pr.ngplus === true; progress.explore = pr.explore === true; progress.copsOff = Number.isInteger(pr.copsOff) ? pr.copsOff : 0; progress.villains = ints(pr.villains, 5); progress.waxBeat = ints(pr.waxBeat, 5);
  for (const k of ["cricketDay", "kiteDay", "kushtiDay"]) progress[k] = Number.isInteger(pr[k]) ? pr[k] : 0; progress.chhotuDay = Number.isInteger(pr.chhotuDay) ? pr.chhotuDay : 0;
  progress.polaroids = Array.isArray(pr.polaroids) ? pr.polaroids.filter((id) => POLAROIDS.some((d) => d.id === id)) : [];
  progress.respDay = {}; if (pr.respDay && typeof pr.respDay === "object") for (const d in DISTRICT_NAMES) { const v = pr.respDay[d]; if (Array.isArray(v) && Number.isInteger(v[0]) && Number.isInteger(v[1])) progress.respDay[d] = [v[0], clamp(v[1], 0, 99)]; }
  progress.haggled = {}; if (pr.haggled && typeof pr.haggled === "object") for (const k in pr.haggled) if (/^haggle:[A-Za-z]{1,20}$/.test(k) && Number.isInteger(pr.haggled[k])) progress.haggled[k] = pr.haggled[k];
  progress.scams = {}; if (pr.scams && typeof pr.scams === "object") for (const k of ["cards", "stones", "collector"]) if (Number.isInteger(pr.scams[k])) progress.scams[k] = pr.scams[k];
  progress.lostCards = Number.isInteger(pr.lostCards) ? clamp(pr.lostCards, 0, 1e5) : 0; progress.uncle = Number.isInteger(pr.uncle) ? clamp(pr.uncle, 0, 9999) : 0;
  progress.naniIgnored = Number.isInteger(pr.naniIgnored) ? clamp(pr.naniIgnored, 0, 2) : 0;
  progress.radio = Number.isInteger(pr.radio) ? clamp(pr.radio, 0, STATIONS.length - 1) : 0;
  progress.trained = Number.isInteger(pr.trained) ? pr.trained : 0;
  progress.heat = Number.isInteger(pr.heat) ? clamp(pr.heat, 0, 4) : 0;
  progress.respect = {}; if (pr.respect && typeof pr.respect === "object") for (const k in DISTRICT_NAMES) if (Number.isFinite(pr.respect[k])) progress.respect[k] = clamp(Math.round(pr.respect[k]), 0, 100);
  progress.debt = Number.isFinite(pr.debt) ? clamp(Math.round(pr.debt), 0, 2500000) : 0;
  progress.money = Number.isFinite(pr.money) ? clamp(Math.round(pr.money), 0, 1e8) : 0;
  progress.weather = { kind: ["clear", "cloudy", "showers", "storm"].includes(pr.weather) ? pr.weather : "clear", t: Math.round(rand(60, 180) * 60), wet: 0, flood: typeof pr.flood === "number" ? clamp(pr.flood, 0, 1) : 0 };
  progress.clock = { day: Number.isInteger(ck.day) && ck.day > 0 ? Math.min(ck.day, 9999) : 1, min: Number.isInteger(ck.min) ? clamp(ck.min, 0, 1439) : 0, frac: 0 };
  // a street only a mission reaches (the last train) is no place to wake up before that mission
  const ws = WORLD.streets[s.street], at = ws.missionOnly && !progress.done.includes(ws.missionOnly) ? { ...MISSIONS[ws.missionOnly].start } : { street: s.street, x: s.x, y: s.y };
  startCity(s.n === 2 ? 2 : 1, at, s);
  playFrames = (s.played || 0) * 60;
  rewinds = flag("watch") ? rewindMax() : 0;
}
// called by startCity once the players have joined
function restorePlayers(s) {
  players.forEach((p, i) => {
    const q = s.players[i]; if (!p || !q) return;
    p.hp = clamp(+q.hp || p.max, 1, p.max); p.lives = Number.isFinite(+q.lives) ? clamp(Math.round(+q.lives), 0, 5) : p.lives; p.sp = clamp(+q.sp || 0, 0, 100); p.score = Math.max(0, Math.round(+q.score) || 0);
    p.weapon = q.weapon === "pipe" || q.weapon === "knife" ? { kind: q.weapon, uses: 8 } : q.weapon === "umbrella" ? { kind: "umbrella", uses: 16 } : q.weapon === "bat" ? { kind: "bat", uses: 14 } : q.weapon === "manjha" ? { kind: "manjha", uses: 20 } : null;
    if (p.lives <= 0) setState(p, "out");
  });
}
// every two minutes of play, and when walking into a save point; the tab closing saves quietly
function autosave() { playFrames++; if (++saveT >= AUTOSAVE && !arena && !wipe && !mission) saveGame(); if (savedT > 0) savedT--; }
addEventListener("pagehide", () => saveGame(true));
document.addEventListener("visibilitychange", () => { if (document.hidden) saveGame(true); });

/* save codes: the save as base64 of its UTF-8 JSON */
function toCode(s) { const b = new TextEncoder().encode(JSON.stringify(s)); let bin = ""; for (const c of b) bin += String.fromCharCode(c); return btoa(bin); }
function fromCode(code) {
  try { const bin = atob(String(code).replace(/\s+/g, "")), s = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))); return validSave(s) ? s : null; }
  catch (e) { return null; }
}
function importCode(code) {
  const s = fromCode(code); if (!s) return 0;
  s.slot = freeSlot(state === "play" ? curSlot : 0); s.at = Date.now();   // never the slot of the game being played
  s.x = clamp(s.x, 10, WORLD.streets[s.street].w - 10);
  try { localStorage.setItem("city:slot" + s.slot, JSON.stringify(s)); } catch (e) { return 0; }
  mergeUnlocks(s);
  return s.slot;
}

/* the title's Continue and Load, and the code box in Settings */
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : new Date(t).toLocaleDateString(); };
const played = (s) => { const m = Math.round((s.played || 0) / 60); return m < 60 ? m + " min played" : Math.floor(m / 60) + " h " + (m % 60) + " min played"; };
function slotLabel(n) { const s = readSlot(n); return "Slot " + n + (s ? ": " + WORLD.streets[s.street].name + ", " + (s.n === 2 ? "2 players, " : "") + played(s) + ", saved " + ago(s.at) : ": empty"); }
// with a save to continue, Continue is the main button and New game steps back
function refreshTitle() { const has = !!latestSave(); $("t-continue").hidden = !has; $("t-new").classList.toggle("ghost", has); }
function buildSlots() {
  const box = $("slots"); box.innerHTML = "";
  for (let n = 1; n <= SLOTS; n++) {
    const s = readSlot(n), b = document.createElement("button");
    b.type = "button"; b.className = "btn ghost slot"; b.textContent = slotLabel(n); b.disabled = !s;
    b.addEventListener("click", () => { if (!Arcade.isFullscreen()) Arcade.enterFullscreen(); loadGame(s); });
    box.appendChild(b);
  }
}
// in a new game, which slot it saves to (the first empty one, or the oldest)
function buildSlotPick() {
  const box = $("slot-pick"); box.innerHTML = "";
  for (let n = 1; n <= SLOTS; n++) {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip";
    b.textContent = "Slot " + n + (readSlot(n) ? " (replace)" : ""); b.setAttribute("aria-pressed", String(n === curSlot));
    b.addEventListener("click", () => { curSlot = n; buildSlotPick(); });
    box.appendChild(b);
  }
}
function buildSaveCode() {
  // during a mission the code is the save from its start (where loading would put you anyway)
  const s = state === "play" && street && !mission && !progress.mode1987 ? snapshot() : latestSave();
  $("code-out").value = s ? toCode(s) : ""; $("code-out").placeholder = "No saved game yet";
  $("code-in").value = ""; $("code-msg").textContent = "";
}
$("code-copy").addEventListener("click", () => {
  const t = $("code-out"); if (!t.value) return;
  t.select();
  const done = () => { $("code-msg").textContent = "Copied."; };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, () => { try { document.execCommand("copy"); done(); } catch (e) { /* select is enough */ } });
  else { try { document.execCommand("copy"); done(); } catch (e) { /* the text stays selected */ } }
});
$("code-import").addEventListener("click", () => {
  const n = importCode($("code-in").value);
  $("code-msg").textContent = n ? "Imported into slot " + n + ". Continue from the title to play it." : "That is not a Rollback City save code.";
  if (n) { $("code-in").value = ""; refreshTitle(); }
});
