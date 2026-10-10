/* Ghost Deploy: a daily race to production.
   Rules
   - Three zones (dev, staging, prod network) split by two firewalls.
   - Each firewall has one gate. A switch in the zone before it opens the
     gate for 4 seconds, for the runner who stepped on it only.
   - Scanners sweep staging and the prod network on fixed tracks. A scanner
     touch sends you back to the last gate you passed.
   - Reach PROD. The clock starts on your first move.
   The simulation runs on a fixed 60 Hz tick and scanners are a pure
   function of the tick, so a run is fully described by its key presses.
   The ghost is that recording played back: the best run on today's map,
   from the relay if it is on, otherwise your own best on this device. */
"use strict";

const TILE = 40, COLS = 20, ROWS = 12, W = COLS * TILE, H = ROWS * TILE;
const TICK = 1000 / 60, SPEED = 2.6, SIZE = 22, HALF = SIZE / 2;
const LIMIT_TICKS = 60 * 60;           // 60 s
const GATE_TICKS = 4 * 60;             // a gate stays open 4 s
const STUN_TICKS = 36, SAFE_TICKS = 60; // pause after a scan, then 1 s safe
const SCAN_R = 14;
const FW = [7, 13];                    // firewall columns
const ZONES = [{ x0: 1, x1: 6, name: "dev" }, { x0: 8, x1: 12, name: "staging" }, { x0: 14, x1: 18, name: "prod network" }];
const DIRS = { KeyW: "U", ArrowUp: "U", KeyS: "D", ArrowDown: "D", KeyA: "L", ArrowLeft: "L", KeyD: "R", ArrowRight: "R" };
const tms = (k) => Math.round(k * TICK);

/* ---------- seeded random ---------- */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng32(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const SEED = new URLSearchParams(location.search).get("seed") || new Date().toISOString().slice(0, 10);

/* ---------- map ---------- */
const at = (x, y) => y * COLS + x;
function bfs(walls, sx, sy, tx, ty) {
  const dist = new Int16Array(COLS * ROWS).fill(-1), q = [[sx, sy]];
  dist[at(sx, sy)] = 0;
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) return dist[at(x, y)];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || walls[at(nx, ny)] || dist[at(nx, ny)] >= 0) continue;
      dist[at(nx, ny)] = dist[at(x, y)] + 1; q.push([nx, ny]);
    }
  }
  return -1;
}

function makeMap(seed) {
  for (let salt = 0; salt < 200; salt++) {
    const r = rng32(hashStr(seed + "/" + salt)), ri = (a, b) => a + Math.floor(r() * (b - a + 1));
    const walls = new Uint8Array(COLS * ROWS);
    for (let x = 0; x < COLS; x++) { walls[at(x, 0)] = walls[at(x, ROWS - 1)] = 1; }
    for (let y = 0; y < ROWS; y++) { walls[at(0, y)] = walls[at(COLS - 1, y)] = 1; }
    const gaps = FW.map(() => ri(2, ROWS - 4));
    FW.forEach((fx, i) => { for (let y = 1; y < ROWS - 1; y++) if (y !== gaps[i] && y !== gaps[i] + 1) walls[at(fx, y)] = 1; });

    const start = { x: 1, y: ri(2, ROWS - 3) };
    const exit = { x: 18, y: ri(2, ROWS - 4) };            // two tiles tall
    const switches = [{ x: ri(3, 5), y: ri(1, ROWS - 2) }, { x: ri(9, 11), y: ri(1, ROWS - 2) }];

    // scanner tracks: staging gets a vertical sweeper, prod a vertical and a horizontal one
    const vx1 = ri(9, 11), vx2 = ri(15, 16);
    let hy = ri(2, ROWS - 3); if (hy === gaps[1] || hy === gaps[1] + 1) hy = gaps[1] + 2 < ROWS - 1 ? gaps[1] + 2 : gaps[1] - 1;
    const scanners = [
      { ax: vx1, ay: 1, bx: vx1, by: ROWS - 2, period: ri(100, 140), phase: r() },
      { ax: vx2, ay: 1, bx: vx2, by: ROWS - 2, period: ri(90, 130), phase: r() },
      { ax: 14, ay: hy, bx: 17, by: hy, period: ri(80, 110), phase: r() }
    ];
    if (switches[1].x === vx1) switches[1].x = vx1 === 11 ? 10 : vx1 + 1;
    const onTrack = (x, y) => scanners.some((s) => (s.ax === s.bx ? x === s.ax : y === s.ay && x >= s.ax));

    // a few wall blocks for routing, never on tracks, switches, gates or spawns
    const keep = [start, exit, { x: exit.x, y: exit.y + 1 }, ...switches];
    let placed = 0, guard = 0;
    while (placed < 9 && guard++ < 300) {
      const x = ri(2, 17), y = ri(1, ROWS - 2);
      if (FW.includes(x) || walls[at(x, y)] || onTrack(x, y)) continue;
      if (keep.some((k) => Math.abs(k.x - x) + Math.abs(k.y - y) <= 1)) continue;
      if (FW.some((fx, i) => Math.abs(fx - x) <= 1 && y >= gaps[i] - 1 && y <= gaps[i] + 2)) continue;
      walls[at(x, y)] = 1; placed++;
    }

    // solvable and fair: every leg connects, and each switch is close enough
    // to its gate to make it through in the 4 seconds
    const legs = [
      bfs(walls, start.x, start.y, switches[0].x, switches[0].y),
      bfs(walls, switches[0].x, switches[0].y, FW[0] + 1, gaps[0]),
      bfs(walls, FW[0] + 1, gaps[0], switches[1].x, switches[1].y),
      bfs(walls, switches[1].x, switches[1].y, FW[1] + 1, gaps[1]),
      bfs(walls, FW[1] + 1, gaps[1], exit.x, exit.y)
    ];
    if (legs.some((d) => d < 0) || legs[1] > 9 || legs[3] > 9 || legs[1] < 4 || legs[3] < 4) continue;
    return { walls, gaps, start, exit, switches, scanners };
  }
  throw new Error("no map");
}
const MAP = makeMap(SEED);

function scannerPos(s, k) {
  const u = ((k / s.period) + s.phase) % 1, p = u < 0.5 ? u * 2 : 2 - u * 2, e = p * p * (3 - 2 * p);
  return { x: (s.ax + (s.bx - s.ax) * e) * TILE + TILE / 2, y: (s.ay + (s.by - s.ay) * e) * TILE + TILE / 2 };
}

/* ---------- runners ---------- */
function newRunner() {
  const c = { x: MAP.start.x * TILE + TILE / 2, y: MAP.start.y * TILE + TILE / 2 };
  return { x: c.x, y: c.y, keys: {}, open: [0, 0], checkpoint: c, zone: 0, stun: 0, safe: 0, done: 0, scans: 0, face: 1 };
}

function gateClosed(r, k, i) { return r.open[i] <= k; }
function solidAt(r, k, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || MAP.walls[at(tx, ty)]) return true;
  for (let i = 0; i < 2; i++) if (tx === FW[i] && (ty === MAP.gaps[i] || ty === MAP.gaps[i] + 1) && gateClosed(r, k, i)) return true;
  return false;
}
function boxTiles(x, y) {
  const out = [];
  for (let ty = Math.floor((y - HALF) / TILE); ty <= Math.floor((y + HALF - 0.01) / TILE); ty++)
    for (let tx = Math.floor((x - HALF) / TILE); tx <= Math.floor((x + HALF - 0.01) / TILE); tx++) out.push([tx, ty]);
  return out;
}
function move(r, k, dx, dy) {
  if (!dx && !dy) return;
  const before = new Set(boxTiles(r.x, r.y).map(([a, b]) => a + "," + b)); // a gate closing on you never traps you
  const nx = r.x + dx, ny = r.y + dy;
  if (boxTiles(nx, ny).some(([tx, ty]) => !before.has(tx + "," + ty) && solidAt(r, k, tx, ty))) {
    // slide along the wall: snap to the edge
    if (dx) r.x = dx > 0 ? Math.floor((r.x + HALF) / TILE) * TILE + TILE - HALF - 0.01 : Math.floor((r.x - HALF) / TILE) * TILE + HALF;
    if (dy) r.y = dy > 0 ? Math.floor((r.y + HALF) / TILE) * TILE + TILE - HALF - 0.01 : Math.floor((r.y - HALF) / TILE) * TILE + HALF;
    return;
  }
  r.x = nx; r.y = ny;
}

/* one 60 Hz step for one runner; returns events for sound and effects */
function step(r, k) {
  const ev = [];
  if (r.done) return ev;
  if (r.stun > 0) {
    if (--r.stun === 0) { r.x = r.checkpoint.x; r.y = r.checkpoint.y; r.safe = SAFE_TICKS; ev.push("respawn"); }
    return ev;
  }
  if (r.safe > 0) r.safe--;
  let dx = (r.keys.R ? 1 : 0) - (r.keys.L ? 1 : 0), dy = (r.keys.D ? 1 : 0) - (r.keys.U ? 1 : 0);
  if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
  if (dx) r.face = Math.sign(dx);
  move(r, k, dx * SPEED, 0);
  move(r, k, 0, dy * SPEED);

  const tx = Math.floor(r.x / TILE), ty = Math.floor(r.y / TILE);
  MAP.switches.forEach((s, i) => {
    if (tx === s.x && ty === s.y) { if (r.open[i] - k < GATE_TICKS - 20) ev.push("open" + i); r.open[i] = k + GATE_TICKS; }
  });
  const zone = r.x > FW[1] * TILE + TILE ? 2 : r.x > FW[0] * TILE + TILE ? 1 : 0;
  if (zone > r.zone) {
    r.zone = zone;
    r.checkpoint = { x: (FW[zone - 1] + 1) * TILE + TILE / 2, y: MAP.gaps[zone - 1] * TILE + TILE };
    ev.push("zone" + zone);
  }
  if (!r.safe) for (const s of MAP.scanners) {
    const p = scannerPos(s, k), cx = Math.max(r.x - HALF, Math.min(p.x, r.x + HALF)), cy = Math.max(r.y - HALF, Math.min(p.y, r.y + HALF));
    if (Math.hypot(p.x - cx, p.y - cy) < SCAN_R) { r.stun = STUN_TICKS; r.scans++; ev.push("scan"); break; }
  }
  if (tx === MAP.exit.x && (ty === MAP.exit.y || ty === MAP.exit.y + 1)) { r.done = k; ev.push("done"); }
  return ev;
}

/* ---------- state ---------- */
const canvas = document.getElementById("game"), g = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);
const LS = "ghost-deploy:";
let me, ghost, ghostRun = null, ghostSource = "", k = 0, started = false, state = "menu", rec = [], held = {}, fx = [], banner = null;

function load(key) { try { return JSON.parse(localStorage.getItem(LS + key)); } catch (e) { return null; } }
function save(key, v) { try { localStorage.setItem(LS + key, JSON.stringify(v)); } catch (e) { /* private mode */ } }
const fmt = (ticks) => (ticks * TICK / 1000).toFixed(2) + " s";

function pickGhost(remote) {
  const local = load("best:" + SEED);
  const cands = [];
  if (remote && remote.v === 2 && Array.isArray(remote.inputs) && verify(remote)) cands.push({ ...remote, source: "fastest today" });
  if (local) cands.push({ ...local, source: "your best" });
  cands.sort((a, b) => a.durationMs - b.durationMs);
  ghostRun = cands[0] || null;
  ghostSource = ghostRun ? ghostRun.source : "";
  $("hud-ghost").textContent = ghostRun ? (ghostRun.durationMs / 1000).toFixed(2) + " s, " + ghostSource : "none yet";
  const best = load("best:" + SEED);
  $("hud-best").textContent = best ? (best.durationMs / 1000).toFixed(2) + " s" : "none yet";
}

/* replay a run headlessly; only a run that really reaches PROD in the
   time it claims can become the ghost */
function verify(run) {
  const r = newRunner(); let e = 0;
  for (let t = 0; t < LIMIT_TICKS && !r.done; t++) {
    while (e < run.inputs.length && run.inputs[e][0] <= tms(t)) { const [, d, v] = run.inputs[e++]; r.keys[d] = v === 1; }
    step(r, t);
  }
  return r.done > 0 && Math.abs(r.done * TICK - run.durationMs) < 20;
}

async function fetchGhost() {
  try {
    const res = await fetch("/api/ghost?seed=" + SEED);
    const data = res.ok ? await res.json() : null;
    pickGhost(data && data.ghost);
  } catch (e) { pickGhost(null); }
}

function reset() {
  me = newRunner(); ghost = ghostRun ? newRunner() : null;
  if (ghost) { ghost.evs = ghostRun.inputs; ghost.ev = 0; }
  k = 0; started = false; rec = []; fx = []; banner = null;
}
function startRun() {
  reset(); state = "play"; $("overlay").hidden = true; canvas.focus && canvas.focus();
  banner = { text: "Move to start the clock", t: 120 };
}

function setKey(dir, down) {
  held[dir] = down;
  if (state !== "play" || me.done) return;
  if (!!me.keys[dir] === down) return;
  me.keys[dir] = down;
  if (down && !started) started = true;
  if (started) rec.push([tms(k), dir, down ? 1 : 0]);
}

function finish(won) {
  state = "end";
  const title = $("end-title"), result = $("end-result"), note = $("end-note");
  if (!won) {
    title.textContent = "Out of time";
    result.textContent = "60 s passed before the build reached PROD.";
    note.textContent = "Tip: wait on the switch until a scanner has just passed the gate, then go.";
    Arcade.tone(196, 0.3, "sawtooth", 0.05, -80);
  } else {
    const ms = Math.round(me.done * TICK), prev = load("best:" + SEED), beat = !ghostRun || ms < ghostRun.durationMs;
    title.textContent = beat ? "Shipped, and the ghost is yours" : "Shipped";
    result.textContent = (ms / 1000).toFixed(2) + " s" + (me.scans ? ", scanned " + me.scans + (me.scans === 1 ? " time" : " times") : ", never scanned");
    if (!ghostRun) note.textContent = "No one had finished today's map on this device yet, so your run is now the ghost.";
    else if (beat) note.textContent = "You beat the ghost (" + ghostSource + ") by " + ((ghostRun.durationMs - ms) / 1000).toFixed(2) + " s. Your run is the new ghost on this device.";
    else note.textContent = "The ghost (" + ghostSource + ") was " + ((ms - ghostRun.durationMs) / 1000).toFixed(2) + " s faster. Watch where it waits.";
    const run = { v: 2, seed: SEED, inputs: rec, durationMs: ms, result: "win" };
    if (!prev || ms < prev.durationMs) save("best:" + SEED, run);
    if (beat) submit(run, note);
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => Arcade.tone(f, 0.12, "square", 0.05), i * 90));
    pickGhost(ghostSource === "fastest today" && !beat ? ghostRun : null);
  }
  $("card-menu").hidden = true; $("card-end").hidden = false; $("overlay").hidden = false;
  $("again-btn").focus();
}

async function submit(run, note) {
  try {
    const res = await fetch("/api/ghost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(run) });
    const data = await res.json().catch(() => ({}));
    if (data.stored) note.textContent = note.textContent.replace(" on this device.", ".") + " It is now the ghost for everyone who plays today.";
  } catch (e) { /* offline: the device copy is enough */ }
}

/* ---------- loop ---------- */
function tickOnce() {
  if (state !== "play") return;
  if (!started) { if (banner && banner.t > 0) banner.t--; return; }
  if (ghost) {
    while (ghost.ev < ghost.evs.length && ghost.evs[ghost.ev][0] <= tms(k)) { const [, d, t] = ghost.evs[ghost.ev++]; ghost.keys[d] = t === 1; }
    step(ghost, k);
  }
  for (const e of step(me, k)) {
    if (e.startsWith("open")) { Arcade.tone(660, 0.07); Arcade.tone(990, 0.09, "square", 0.04); banner = { text: "Gate " + (+e[4] + 1) + " open for 4 s", t: 70 }; }
    if (e.startsWith("zone")) { Arcade.tone(784, 0.1, "triangle", 0.06); banner = { text: e === "zone1" ? "Staging. Checkpoint saved" : "Prod network. Checkpoint saved", t: 80 }; }
    if (e === "scan") { Arcade.noise(0.18, 0.1); Arcade.tone(150, 0.25, "sawtooth", 0.05, -60); banner = { text: "Scanned. Back to the last gate", t: 80 }; burst(me.x, me.y, Arcade.tokens().red); }
    if (e === "done") { finish(true); return; }
  }
  k++;
  if (banner && banner.t > 0) banner.t--;
  if (k >= LIMIT_TICKS) finish(false);
}
function burst(x, y, c) { for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 3; fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30, c }); } }

let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= TICK) { tickOnce(); acc -= TICK; }
  draw();
  $("hud-time").textContent = fmt(state === "end" && me.done ? me.done : k);
  requestAnimationFrame(frame);
}

/* ---------- drawing (colours come from the site theme) ---------- */
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function draw() {
  const T = Arcade.tokens();
  g.fillStyle = T.paper; g.fillRect(0, 0, W, H);
  // zone tint and labels
  ZONES.forEach((z, i) => {
    g.fillStyle = i === 2 ? T.accentBg : T.surface; g.globalAlpha = i === 2 ? 0.5 : 1;
    g.fillRect(z.x0 * TILE, TILE, (z.x1 - z.x0 + 1) * TILE, H - 2 * TILE); g.globalAlpha = 1;
    g.fillStyle = T.muted; g.font = "500 13px 'IBM Plex Mono', monospace"; g.textAlign = "left";
    g.fillText(z.name, z.x0 * TILE + 8, TILE + 18);
  });
  // grid
  g.strokeStyle = T.line; g.lineWidth = 1; g.beginPath();
  for (let x = 1; x < COLS; x++) { g.moveTo(x * TILE + 0.5, TILE); g.lineTo(x * TILE + 0.5, H - TILE); }
  for (let y = 1; y < ROWS; y++) { g.moveTo(TILE, y * TILE + 0.5); g.lineTo(W - TILE, y * TILE + 0.5); }
  g.stroke();
  // walls
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (MAP.walls[at(x, y)]) {
    g.fillStyle = FW.includes(x) && y > 0 && y < ROWS - 1 ? (T.dark ? T.muted : T.ink2) : T.line2;
    g.fillRect(x * TILE, y * TILE, TILE, TILE);
  }
  // scanner tracks
  g.setLineDash([4, 6]); g.strokeStyle = T.red; g.globalAlpha = 0.35; g.lineWidth = 2;
  for (const s of MAP.scanners) { g.beginPath(); g.moveTo(s.ax * TILE + 20, s.ay * TILE + 20); g.lineTo(s.bx * TILE + 20, s.by * TILE + 20); g.stroke(); }
  g.setLineDash([]); g.globalAlpha = 1;
  // gates and switches (state shown for you, not the ghost)
  const kk = started ? k : 0;
  FW.forEach((fx_, i) => {
    const open = !gateClosed(me, kk, i), x = fx_ * TILE, y = MAP.gaps[i] * TILE;
    if (open) { g.strokeStyle = T.teal; g.setLineDash([5, 5]); g.lineWidth = 2; g.strokeRect(x + 3, y + 3, TILE - 6, 2 * TILE - 6); g.setLineDash([]); }
    else { g.fillStyle = T.teal; for (let b = 0; b < 4; b++) g.fillRect(x + 4 + b * 9, y + 2, 5, 2 * TILE - 4); }
    const s = MAP.switches[i], sx = s.x * TILE + 20, sy = s.y * TILE + 20, left = (me.open[i] - kk) / GATE_TICKS;
    rr(sx - 13, sy - 13, 26, 26, 4); g.fillStyle = open ? T.teal : T.surface; g.fill(); g.strokeStyle = T.teal; g.lineWidth = 2; g.stroke();
    g.fillStyle = open ? T.paper : T.teal; g.font = "600 11px 'IBM Plex Mono', monospace"; g.textAlign = "center"; g.fillText("S" + (i + 1), sx, sy + 4);
    if (open) { g.strokeStyle = T.accent; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.stroke(); }
  });
  // start and exit
  g.fillStyle = T.muted; g.font = "500 11px 'IBM Plex Mono', monospace"; g.textAlign = "center";
  g.fillText("laptop", MAP.start.x * TILE + 20, MAP.start.y * TILE - 4);
  const ex = MAP.exit.x * TILE, ey = MAP.exit.y * TILE;
  rr(ex + 3, ey + 3, TILE - 6, 2 * TILE - 6, 5); g.fillStyle = T.good; g.fill();
  g.save(); g.translate(ex + 20, ey + 40); g.rotate(-Math.PI / 2); g.fillStyle = T.paper; g.font = "600 13px 'IBM Plex Mono', monospace"; g.fillText("PROD", 0, 5); g.restore();
  // scanners
  for (const s of MAP.scanners) {
    const p = scannerPos(s, kk);
    g.fillStyle = T.red; g.globalAlpha = 0.15; g.beginPath(); g.arc(p.x, p.y, SCAN_R + 8, 0, 7); g.fill();
    g.globalAlpha = 1; g.beginPath(); g.arc(p.x, p.y, SCAN_R, 0, 7); g.fill();
    g.fillStyle = T.paper; g.beginPath(); g.arc(p.x, p.y, 4, 0, 7); g.fill();
  }
  // runners
  if (ghost) drawRunner(ghost, T.muted, 0.45, T);
  drawRunner(me, T.accent, 1, T);
  // particles
  fx = fx.filter((p) => p.life-- > 0);
  for (const p of fx) { p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; g.globalAlpha = p.life / 30; g.fillStyle = p.c; g.fillRect(p.x - 2, p.y - 2, 4, 4); }
  g.globalAlpha = 1;
  // banner
  if (state === "play" && banner && banner.t > 0) {
    g.font = "600 15px 'IBM Plex Sans', sans-serif"; g.textAlign = "center";
    const w = g.measureText(banner.text).width + 28;
    rr(W / 2 - w / 2, 6, w, 28, 4); g.fillStyle = T.ink; g.globalAlpha = Math.min(1, banner.t / 15); g.fill();
    g.fillStyle = T.paper; g.fillText(banner.text, W / 2, 25); g.globalAlpha = 1;
  }
}
function drawRunner(r, color, alpha, T) {
  if (r.stun > 0 && Math.floor(r.stun / 4) % 2) return;
  if (r.safe > 0 && Math.floor(r.safe / 5) % 2) alpha *= 0.4;
  g.globalAlpha = alpha;
  rr(r.x - HALF, r.y - HALF, SIZE, SIZE, 5); g.fillStyle = color; g.fill();
  g.fillStyle = T.paper; g.fillRect(r.x + r.face * 4 - 2, r.y - 4, 4, 4);
  g.globalAlpha = 1;
}

/* ---------- input ---------- */
addEventListener("keydown", (e) => {
  if (DIRS[e.code]) { e.preventDefault(); if (!e.repeat) setKey(DIRS[e.code], true); }
  else if (e.code === "KeyR" && state !== "menu") startRun();
  else if ((e.code === "Enter" || e.code === "Space") && state !== "play" && document.activeElement.tagName !== "BUTTON" && document.activeElement.tagName !== "A") { e.preventDefault(); startRun(); }
});
addEventListener("keyup", (e) => { if (DIRS[e.code]) setKey(DIRS[e.code], false); });
addEventListener("blur", () => ["U", "D", "L", "R"].forEach((d) => setKey(d, false)));
Arcade.bindPad((c) => setKey(DIRS[c], true), (c) => setKey(DIRS[c], false));
$("start-btn").addEventListener("click", startRun);
$("again-btn").addEventListener("click", startRun);

$("hud-seed").textContent = new Date(SEED + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
reset();
fetchGhost().then(() => { if (state !== "play") reset(); });
Arcade.setupFullscreen();
requestAnimationFrame(frame);
