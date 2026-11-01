/* Rollback City: Nani's pocket watch (DESIGN 8, quirk 2).
   A plain script that shares globals with the others; index.html loads them in order.

   The watch keeps the last ten seconds of the street (a snapshot every 4 frames) and R turns
   it back: the snapshots play backwards for a moment, then the oldest one becomes the present,
   exactly (health, positions, enemies, items, the arena and the mission step). Charges come
   with each mission (3 on Story, 1 on Arcade); a kulhad of chai refills one. The buffer starts
   afresh on a new street or mission step, so the watch never turns back across a door or a scene. */
"use strict";

const RW_EVERY = 4, RW_KEEP = 150;   // 150 snapshots, 4 frames apart: ten seconds
let rwBuf = [], rewinding = null, rewinds = 0;
const rewindMax = () => (EASY ? 3 : 1);
const hasWatch = () => flag("watch") || (mission && mission.id === "test");
function rewindReset() { rwBuf = []; rewinding = null; if (mission) rewinds = rewindMax(); }

// a fighter as plain data: references to other fighters become their ids
function packF(f) {
  const o = { ...f, hits: null, cmd: f.cmd.slice(), lastTap: { ...f.lastTap }, weapon: f.weapon && { ...f.weapon }, ride: null, bike: null };
  if (o.st === "ride") o.st = "idle";   // the watch turns back people, not vehicles: everyone lands on foot
  for (const k of ["target", "hold", "heldBy", "lastBy", "thrownBy", "goal"]) if (f[k] && typeof f[k] === "object") o[k] = { ref: f[k].id !== undefined ? f[k].id : f[k] };
  return o;
}
function snapshotWorld() {
  const st = mission && mission.st;
  return {
    street: street.id, cam, frame: frameNo,
    players: players.map((p) => p && packF(p)), enemies: enemies.map(packF),
    items: items.map((it) => ({ ...it })), barrels: barrels.map((b) => ({ ...b })), shots: shots.map((s) => ({ ...s, owner: s.owner && s.owner.id, hitIds: s.hitIds && [...s.hitIds] })),
    civs: civs.map((c) => ({ ...c })), cat: cat && { ...cat }, bossId: bossRef && bossRef.id,
    arena: arena && { a: arena.a, wave: arena.wave, queue: arena.queue.slice(), n: arena.n, added: arena.added, done: arena.a.done, belts: arena.belts },
    bridge: bridge && { ...bridge }, bridgeT,
    step: st && { i: mission.i, t: st.t, done: st.done, found: st.found.slice(), stalls: st.stalls && st.stalls.map((g0) => g0.hp), runner: st.runner && st.runner.id,
      arenaDone: st.arena ? st.arena.done : null, guardsDone: st.arenas.map((a) => a && a.done) }
  };
}
function restoreWorld(s) {
  const byId = new Map();
  const unpackF = (o, into) => { const f = into ? Object.assign(into, o) : { ...o }; f.hits = new Set(); byId.set(f.id, f); return f; };
  for (const v of rides) { v.rider = null; v.pillion = null; }
  players.forEach((p, i) => { if (p && s.players[i]) unpackF(s.players[i], p); });
  enemies = s.enemies.map((o) => unpackF(o));
  const relink = (f) => { for (const k of ["target", "hold", "heldBy", "lastBy", "thrownBy"]) if (f[k] && f[k].ref !== undefined) f[k] = byId.get(f[k].ref) || null; if (f.goal && f.goal.ref) f.goal = f.goal.ref; };
  players.forEach((p) => p && relink(p)); enemies.forEach(relink);
  items = s.items.map((it) => ({ ...it })); barrels = s.barrels.map((b) => ({ ...b }));
  shots = s.shots.map((x) => ({ ...x, owner: byId.get(x.owner) || players[0], hitIds: x.hitIds && new Set(x.hitIds) }));
  civs = s.civs.map((c) => ({ ...c })); cat = s.cat && { ...s.cat };
  bridge = s.bridge && { ...s.bridge }; bridgeT = s.bridgeT;
  bossRef = byId.get(s.bossId) || null; lastHit = null; cam = s.cam; fx = []; texts = [];
  if (s.arena) { arena = { a: s.arena.a, wave: s.arena.wave, queue: s.arena.queue.slice(), n: s.arena.n, added: s.arena.added, belts: s.arena.belts }; arena.a.done = s.arena.done; }
  else arena = null;
  if (s.step && mission && mission.i === s.step.i) {
    const st = mission.st, k = s.step;
    Object.assign(st, { t: k.t, done: k.done, found: k.found.slice() });
    if (st.stalls && k.stalls) st.stalls.forEach((g0, i) => { g0.hp = k.stalls[i]; });
    st.runner = byId.get(k.runner) || null;
    if (st.arena && k.arenaDone !== null) st.arena.done = k.arenaDone;
    st.arenas.forEach((a, i) => { if (a) a.done = k.guardsDone[i]; });
  }
}

// called every frame of open-world play
function updateRewind() {
  if (rewinding) return;
  if (tapped(0, "rewind")) { startRewind(); return; }
  if (frameNo % RW_EVERY === 0) { rwBuf.push(snapshotWorld()); if (rwBuf.length > RW_KEEP) rwBuf.shift(); }
}
function startRewind() {
  if (!hasWatch()) return;
  if (rewinds <= 0) { texts.push({ x: players[0].x, y: players[0].y - 70, s: "The watch needs winding (no rewinds left)", t: 70 }); return; }
  if (rwBuf.length < 8) return;
  rewinds--; rewinding = { k: rwBuf.length - 1 };
  [1175, 988, 784, 587].forEach((f, i) => setTimeout(() => Arcade.tone(f, 0.08, "triangle", 0.05), i * 70));
}
// the rewind itself: the last ten seconds play backwards, three snapshots a frame, then stop
function stepRewind() {
  rewinding.k = Math.max(0, rewinding.k - 3);
  restoreWorld(rwBuf[rewinding.k]);
  if (rewinding.k === 0) {
    rwBuf = []; rewinding = null; down.clear();
    for (const p of players) if (p && p.lives > 0) p.inv = Math.max(p.inv, 30);
    banner = { text: "Rewound", t: 50 };
  }
}
function drawRewind(P) {
  if (rewinding) {
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    g.fillStyle = "rgba(120,80,30,0.28)"; g.fillRect(0, 0, LW, LH);
    for (let y = (frameNo * 7) % 12; y < LH; y += 12) R(0, y, LW, 1, "rgba(255,240,210,0.18)");
    text("◀◀ 11:58", LW - 12, 24, 9, "#f7f1e3", "right", "IBM Plex Mono");
  }
  if (!hasWatch() || state !== "play") return;
  // the charges: little watch faces under the street name
  const n = rewindMax(), x0 = LW / 2 - (n * 11) / 2 + 5;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 11, on = i < rewinds;
    g.fillStyle = on ? "#f2c230" : "rgba(255,255,255,0.18)"; g.beginPath(); g.arc(x, 31, 3.5, 0, 7); g.fill();
    if (on) { R(x - 0.5, 28.5, 1, 3, "#3b2a18"); R(x - 0.5, 30.5, 2.5, 1, "#3b2a18"); }
  }
}
