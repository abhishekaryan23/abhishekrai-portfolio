/* ============================================================
   GHOST//DEPLOY — asynchronous co-op puzzle
   Engine: fixed-timestep sim, seeded map gen, input-recorded
   ghost replay, Cloudflare KV sync (degrades to offline bot).
   ============================================================ */
"use strict";

/* ---------- Constants ---------- */
const TILE = 40, COLS = 20, ROWS = 12;
const W = COLS * TILE, H = ROWS * TILE;
const TICK = 1000 / 60;
const SPEED = 2.8;               // px per tick
const SIZE = 22;                 // entity box
const HALF = SIZE / 2;
const LIMIT = 60000;             // 60s run
const GROUPS = 3;                // switch/gate groups

const C_PLAYER = "#ff7043", C_PLAYER_DEEP = "#d84315";
const C_GHOST = "#fbbf24", C_GHOST_DEEP = "#b45309";
const C_SWITCH = "#f472b6", C_EXIT = "#a3e635";
const C_DANGER = "#ff5252";
const GHOST_REACT_MS = 750;   // how long the ghost takes to notice your flip
const GHOST_CHASE_MS = 112;   // ghost is FASTER than you once it hunts
const GHOST_DEFEND_MS = 90;   // ghost speed when slamming your gate
const GHOST_PATROL_MS = 84;   // ghost speed otherwise
const CROSS_CHOP_MS = 25000;  // crossing the gap caps remaining time at this
const WALL_BONK_MS = 300;     // time penalty per wall hit

const MOVE_KEYS = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
]);

/* ---------- Seeded RNG ---------- */
function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ---------- Daily seed ---------- */
function todaySeed() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/* ---------- Map generation (deterministic) ---------- */
const idx = (x, y) => y * COLS + x;

function near(x, y, zx, zy, r) {
    return Math.abs(x - zx) <= r && Math.abs(y - zy) <= r;
}

function bfsPath(walls, sx, sy, tx, ty, cheapTiles) {
    // Dijkstra-lite: switch tiles cost less so bots drift over them
    const cost = new Float64Array(COLS * ROWS).fill(Infinity);
    const prev = new Int32Array(COLS * ROWS).fill(-1);
    cost[idx(sx, sy)] = 0;
    const open = [[0, sx, sy]];
    while (open.length) {
        let bi = 0;
        for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
        const [c, x, y] = open.splice(bi, 1)[0];
        if (x === tx && y === ty) {
            const path = [];
            let cur = idx(tx, ty);
            while (cur !== -1) { path.push({ x: cur % COLS, y: Math.floor(cur / COLS) }); cur = prev[cur]; }
            return path.reverse();
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
            const ni = idx(nx, ny);
            if (walls[ni]) continue;
            const step = cheapTiles && cheapTiles.has(ni) ? 0.25 : 1;
            if (c + step < cost[ni]) {
                cost[ni] = c + step;
                prev[ni] = idx(x, y);
                open.push([c + step, nx, ny]);
            }
        }
    }
    return null;
}

function generateMap(seedStr) {
    for (let salt = 0; salt < 64; salt++) {
        const rng = mulberry32(hashStr(seedStr + "#" + salt));
        const walls = new Uint8Array(COLS * ROWS);
        for (let x = 0; x < COLS; x++) { walls[idx(x, 0)] = 1; walls[idx(x, ROWS - 1)] = 1; }
        for (let y = 0; y < ROWS; y++) { walls[idx(0, y)] = 1; walls[idx(COLS - 1, y)] = 1; }

        const zones = [
            { x: 1, y: ROWS - 2 },      // player start (bottom-left)
            { x: COLS - 2, y: ROWS - 2 }, // ghost start (bottom-right)
            { x: 1, y: 1 },             // player exit (top-left)
            { x: COLS - 2, y: 1 }       // ghost exit (top-right)
        ];
        const inZone = (x, y, r) => zones.some(z => near(x, y, z.x, z.y, r));

        // scattered wall blocks (light — speed matters more than maze-solving)
        let placed = 0, guard = 0;
        while (placed < 14 && guard++ < 300) {
            const bx = 2 + Math.floor(rng() * (COLS - 5));
            const by = 2 + Math.floor(rng() * (ROWS - 5));
            if (inZone(bx, by, 2)) continue;
            walls[idx(bx, by)] = 1;
            placed++;
        }
        if (!bfsPath(walls, 1, ROWS - 2, 1, 1, null)) continue;
        if (!bfsPath(walls, COLS - 2, ROWS - 2, COLS - 2, 1, null)) continue;

        // The core chokepoint: a vertical firewall wall down the middle (x = 10)
        // with exactly ONE open gap. Whoever controls the gap controls the game.
        const MID = 10;
        const gapY = 2 + Math.floor(rng() * (ROWS - 4)); // gap somewhere in the middle
        for (let y = 1; y < ROWS - 1; y++) {
            if (y !== gapY && y !== gapY + 1) walls[idx(MID, y)] = 1; // 2-tile gap
        }
        // ensure the gap isn't inside a spawn/exit protection zone
        if (inZone(MID, gapY, 1) || inZone(MID, gapY + 1, 1)) continue;

        // switches: the player has ONE switch on their side (left), ghost has ONE (right).
        // Flipping YOUR switch opens YOUR gap gate — but the ghost will flip theirs to close yours.
        const switches = [];
        guard = 0;
        while (switches.length < 2 && guard++ < 400) {
            const isP = switches.length === 0;
            const x = isP ? 2 + Math.floor(rng() * 6) : 12 + Math.floor(rng() * 6);
            const y = 2 + Math.floor(rng() * (ROWS - 4));
            if (walls[idx(x, y)] || inZone(x, y, 1)) continue;
            switches.push({ x, y, group: switches.length });
        }
        if (switches.length < 2) continue;

        // gates: ONE gate per side, sitting in the gap. Player gate blocks P, ghost gate blocks G.
        const gates = [
            { x: MID, y: gapY,     group: 0, side: "P" },
            { x: MID, y: gapY + 1, group: 0, side: "P" },
            { x: MID, y: gapY,     group: 1, side: "G" },
            { x: MID, y: gapY + 1, group: 1, side: "G" }
        ];

        // both gates start CLOSED. nobody gets through for free.
        const gateState = [ { P: true, G: true }, { P: true, G: true } ];

        return {
            walls, switches, gates, gateState,
            pStart: { x: 1, y: ROWS - 2 }, gStart: { x: COLS - 2, y: ROWS - 2 },
            pExit: { x: 1, y: 1 }, gExit: { x: COLS - 2, y: 1 },
            midX: MID, gapY
        };
    }
    const walls = new Uint8Array(COLS * ROWS);
    for (let x = 0; x < COLS; x++) { walls[idx(x, 0)] = 1; walls[idx(x, ROWS - 1)] = 1; }
    for (let y = 0; y < ROWS; y++) { walls[idx(0, y)] = 1; walls[idx(COLS - 1, y)] = 1; }
    return {
        walls, switches: [], gates: [], gateState: [ { P: true, G: true }, { P: true, G: true } ],
        pStart: { x: 1, y: ROWS - 2 }, gStart: { x: COLS - 2, y: ROWS - 2 },
        pExit: { x: 1, y: 1 }, gExit: { x: COLS - 2, y: 1 }, midX: 10, gapY: 5
    };
}

/* ---------- Audio (tiny synth) ---------- */
let audioCtx = null, muted = false;
function blip(freq, dur = 0.08, type = "square", vol = 0.05) {
    if (muted) return;
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
        o.connect(g).connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* audio unavailable — silent */ }
}

/* ---------- Game state ---------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const SEED = todaySeed();
let map = generateMap(SEED);
let state = "menu";           // menu | playing | won | lost
let time = 0, acc = 0, lastFrame = 0;
let shake = 0;
let particles = [];
let switchFlash = new Map();  // tileIdx -> ttl

let ghostData = null;         // { inputs, durationMs, phantom, waypoints } | null
let ghostLabel = "…";
let playsCount = 0;
let recording = [];           // [t, code, 0|1]
let runStart = 0;

const player = { x: 0, y: 0, keys: {}, lastSwitch: -1, bonkCd: 0 };
const ghost = { x: 0, y: 0, keys: {}, lastSwitch: -1, evIdx: 0, wpIdx: 0, pause: 0, reactAt: 0 };
let flipLog = []; // [t, side, group, newState] — for ghost reaction AI
let playerCrossed = false;    // player crossed the midline at least once
let crossedAt = -1;           // timestamp of first crossing
let banner = null;            // { text, sub, color, ttl } stage banner
let playerFlips = 0;          // combo counter for audio pitch

function resetEntities() {
    player.x = map.pStart.x * TILE + TILE / 2;
    player.y = map.pStart.y * TILE + TILE / 2;
    player.keys = {}; player.lastSwitch = -1;
    ghost.x = map.gStart.x * TILE + TILE / 2;
    ghost.y = map.gStart.y * TILE + TILE / 2;
    ghost.keys = {}; ghost.lastSwitch = -1; ghost.evIdx = 0; ghost.wpIdx = 0; ghost.pause = 0; ghost.reactAt = 0;
    // both firewall gates start CLOSED every attempt
    map.gateState.forEach(g => { g.P = true; g.G = true; });
    particles = [];
    switchFlash.clear();
    flipLog = [];
    playerCrossed = false; crossedAt = -1;
    banner = null; playerFlips = 0;
    player.bonkCd = 0;
    ghost._targetKey = null;
    time = 0; acc = 0;
    recording = [];
}

/* ---------- Collision ---------- */
function gateClosedAt(x, y, side) {
    for (const g of map.gates) {
        if (g.x === x && g.y === y && g.side === side) {
            return map.gateState[g.group][side];
        }
    }
    return false;
}
function tilesOverlapped(cx, cy) {
    const set = new Set();
    const x0 = Math.floor((cx - HALF) / TILE), x1 = Math.floor((cx + HALF - 0.01) / TILE);
    const y0 = Math.floor((cy - HALF) / TILE), y1 = Math.floor((cy + HALF - 0.01) / TILE);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set.add(idx(x, y));
    return set;
}
function solidTile(x, y, side, phantom) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    if (map.walls[idx(x, y)]) return true;
    if (!phantom && gateClosedAt(x, y, side)) return true;
    return false;
}
function moveAxis(ent, dx, dy, side, phantom) {
    const nx = ent.x + dx, ny = ent.y + dy;
    const current = tilesOverlapped(ent.x, ent.y);
    const target = tilesOverlapped(nx, ny);
    for (const t of target) {
        if (current.has(t)) continue; // allow escaping a gate that closed on us
        const x = t % COLS, y = Math.floor(t / COLS);
        if (solidTile(x, y, side, phantom)) {
            // player wall-hit: time penalty (the clock is the real enemy)
            if (side === "P" && state === "playing" && player.bonkCd <= 0) {
                player.bonkCd = 30; // half-second cooldown
                time = Math.min(time + WALL_BONK_MS, LIMIT);
                blip(140, 0.06, "sawtooth", 0.04);
                burst(ent.x, ent.y, C_DANGER, 5);
            }
            return;
        }
    }
    ent.x = nx; ent.y = ny;
}

/* ---------- Switches ----------
   Each switch controls the OTHER engineer's gate.
   Player steps on SW1 -> player gate (group 0, side P) opens.
   Ghost steps on SW2 -> player gate (group 0, side P) SLAMS SHUT.
   The ghost never helps you. Every flip is logged for the AI. */
function checkSwitch(ent, side) {
    let sw = null;
    for (const s of map.switches) {
        const sx = s.x * TILE + TILE / 2, sy = s.y * TILE + TILE / 2;
        if (Math.abs(ent.x - sx) < 14 && Math.abs(ent.y - sy) < 14) { sw = s; break; }
    }
    const t = sw ? idx(sw.x, sw.y) : -1;
    if (!sw) { ent.lastSwitch = -1; return; }
    if (ent.lastSwitch === t) return;
    ent.lastSwitch = t;
    if (side === "P") {
        // player opens their own gate
        map.gateState[0].P = false;
    } else {
        // ghost slams the player's gate shut, and opens its own
        map.gateState[0].P = true;
        map.gateState[1].G = false;
    }
    flipLog.push({ t: time, side, group: sw.group });
    switchFlash.set(t, 22);
    shake = Math.min(shake + 5, 9);
    burst(sw.x * TILE + TILE / 2, sw.y * TILE + TILE / 2, side === "P" ? C_PLAYER : C_GHOST, 14);
    blip(side === "P" ? 520 : 660, 0.09, "square", 0.05);
}

/* ---------- Particles ---------- */
function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 0.5 + Math.random() * 2.2;
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 26 + Math.random() * 18, color });
    }
}
function trail(x, y, color) {
    particles.push({
        x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        life: 16, color
    });
}
function stepParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

/* ---------- Ghost control ---------- */
function applyGhostInputs() {
    if (!ghostData || !ghostData.inputs) return;
    const evs = ghostData.inputs;
    while (ghost.evIdx < evs.length && evs[ghost.evIdx][0] <= time) {
        const [, code, type] = evs[ghost.evIdx];
        ghost.keys[code] = type === 1;
        ghost.evIdx++;
    }
}
/* ---------- Ghost AI: defender, then hunter ----------
   Phase 1 (before you cross): counter-agent. Reacts to your flips,
           sprints to SW2, slams your gate shut.
   Phase 2 (after you cross):  hunter. Stops defending switches and
           chases you through the right half. Touching it = rollback.
           When it reaches its own exit first, it CAMPS there — you
           cannot win until it steps off, and it only steps off to
           chase you. */
function ghostBotThink() {
    if (!ghostData || !ghostData.waypoints) ghostData = buildBotGhost();
    const gSw = map.switches[1];
    const pOpen = !map.gateState[0].P;
    const gClosed = map.gateState[1].G;

    const lastPlayerFlip = [...flipLog].reverse().find(f => f.side === "P" && f.group === 0);
    const threat = pOpen && lastPlayerFlip && (time - lastPlayerFlip.t) > GHOST_REACT_MS;

    let target, speedPct;
    if (playerCrossed) {
        // HUNT MODE: don't chase the player — cut off their destination.
        // Sprint to the PLAYER's exit and camp it. The player must bait the
        // ghost off the exit by feinting toward the ghost's own exit, then
        // double back. This is the endgame.
        const pAtOwnExit = onExit(player, map.pExit);
        if (!pAtOwnExit) {
            target = { x: map.pExit.x, y: map.pExit.y };
            speedPct = GHOST_CHASE_MS;
        } else {
            // player is sitting on their exit: ghost body-blocks the tile
            target = { x: map.pExit.x, y: map.pExit.y };
            speedPct = GHOST_CHASE_MS;
        }
    } else if (threat) {
        target = { x: gSw.x, y: gSw.y }; speedPct = GHOST_DEFEND_MS;
    } else if (gClosed) {
        target = { x: gSw.x, y: gSw.y }; speedPct = GHOST_PATROL_MS;
    } else {
        target = { x: map.gExit.x, y: map.gExit.y }; speedPct = GHOST_PATROL_MS;
    }

    // (re)path when the target changes, or when chasing (repath every 20 ticks)
    const tKey = target.x + "," + target.y;
    const chasing = playerCrossed && speedPct > 0;
    const distToTarget = Math.hypot(ghost.x - (target.x * TILE + TILE / 2), ghost.y - (target.y * TILE + TILE / 2));
    const parkedAway = ghost.wpIdx >= ghostData.waypoints.length && distToTarget > 14 && !chasing;
    const staleChase = chasing && (Math.floor(time / TICK) % 20 === 0);
    if (ghost._targetKey !== tKey || parkedAway || staleChase) {
        ghost._targetKey = tKey;
        const cheap = new Set([idx(target.x, target.y)]);
        const from = { x: Math.floor(ghost.x / TILE), y: Math.floor(ghost.y / TILE) };
        const path = bfsPath(map.walls, from.x, from.y, target.x, target.y, cheap) || [target];
        ghostData.waypoints = path.slice(1).map(t => ({
            x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2, pause: 0
        }));
        ghostData.waypoints.push({ x: target.x * TILE + TILE / 2, y: target.y * TILE + TILE / 2, pause: 0 });
        ghost.wpIdx = 0;
    }

    if (speedPct > 0) moveGhostBot(speedPct / 100);
}

function moveGhostBot(speedMul = 0.84) {
    if (ghost.pause > 0) {
        ghost.pause--;
        if (ghost.pause % 5 === 0) trail(ghost.x, ghost.y, C_GHOST);
        return;
    }
    const wps = ghostData.waypoints;
    if (ghost.wpIdx >= wps.length) {
        // idle at destination: still flip our switch if we're parked on it
        return;
    }
    const wp = wps[ghost.wpIdx];
    const dx = wp.x - ghost.x, dy = wp.y - ghost.y;
    const d = Math.hypot(dx, dy);
    if (d < 5) {
        if (wp.pause) ghost.pause = wp.pause;
        ghost.wpIdx++;
        return;
    }
    const v = SPEED * speedMul * (1 + 0.15 * Math.sin(time / 110));
    moveAxis(ghost, (dx / d) * v, 0, "G", true);
    moveAxis(ghost, 0, (dy / d) * v, "G", true);
    if (Math.floor(time / TICK) % 3 === 0) trail(ghost.x, ghost.y, C_GHOST);
}
function dirFromKeys(keys) {
    let dx = 0, dy = 0;
    if (keys.KeyA || keys.ArrowLeft) dx--;
    if (keys.KeyD || keys.ArrowRight) dx++;
    if (keys.KeyW || keys.ArrowUp) dy--;
    if (keys.KeyS || keys.ArrowDown) dy++;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    return [dx, dy];
}

/* ---------- Bot ghost fallback (offline / first-ever run) ----------
   Builds a static patrol; the reactive AI in ghostBotThink() overrides this
   every frame. This only seeds initial waypoints. */
function buildBotGhost() {
    const gSw = map.switches[1] || map.gExit;
    const cheap = new Set([idx(gSw.x, gSw.y)]);
    const path = bfsPath(map.walls, map.gStart.x, map.gStart.y, gSw.x, gSw.y, cheap) || [gSw];
    return {
        phantom: true,
        waypoints: path.slice(1).map(t => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2, pause: 0 })),
        inputs: null, durationMs: 0
    };
}

/* ---------- Network ---------- */
async function fetchGhost() {
    const statusEl = document.getElementById("menu-link-status");
    try {
        const res = await fetch("/api/ghost?seed=" + SEED);
        if (!res.ok) throw new Error("http " + res.status);
        const j = await res.json();
        playsCount = j.plays || 0;
        if (j.ghost && Array.isArray(j.ghost.inputs) && j.ghost.seed === SEED) {
            ghostData = { inputs: j.ghost.inputs, durationMs: j.ghost.durationMs, phantom: false };
            ghostLabel = "LAST_ENGINEER.log";
            statusEl.textContent = `UPLINK ESTABLISHED — replaying ${(j.ghost.durationMs / 1000).toFixed(1)}s run from the relay`;
            statusEl.classList.remove("offline");
        } else {
            ghostData = buildBotGhost();
            ghostLabel = "TRAINING_BOT.log";
            statusEl.textContent = "NO GHOST ON RELAY — you are patient zero. A training bot will assist.";
            statusEl.classList.add("offline");
        }
    } catch (e) {
        ghostData = buildBotGhost();
        ghostLabel = "TRAINING_BOT.log";
        statusEl.textContent = "RELAY OFFLINE — local training bot engaged. Game fully playable.";
        statusEl.classList.add("offline");
    }
    document.getElementById("hud-link").textContent = ghostLabel;
    document.getElementById("hud-plays").textContent = String(playsCount);
}

async function submitRun() {
    const el = document.getElementById("win-ghost-status");
    const payload = {
        v: 1, seed: SEED, inputs: recording,
        durationMs: Math.round(time), result: "win"
    };
    try {
        const res = await fetch("/api/ghost", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const j = await res.json();
        if (res.ok && j.stored) {
            el.textContent = "✓ Your run is now the ACTIVE GHOST. The next stranger deploys alongside you.";
        } else if (res.ok) {
            el.textContent = "A faster ghost already holds this instance. Beat their time to take the relay.";
        } else {
            el.textContent = "Relay rejected the upload — but the deploy shipped. Run it back.";
        }
    } catch (e) {
        el.textContent = "Relay unreachable — your ghost stayed local. Deploy still counts.";
    }
}

/* ---------- Flow ---------- */
function startRun() {
    resetEntities();
    state = "playing";
    runStart = performance.now();
    document.getElementById("overlay").classList.add("hidden");
    blip(440, 0.1, "square", 0.05);
    blip(880, 0.16, "square", 0.04);
}

function endRun(won, reason) {
    state = won ? "won" : "lost";
    const overlay = document.getElementById("overlay");
    document.getElementById("panel-menu").classList.add("hidden");
    document.getElementById("panel-win").classList.toggle("hidden", !won);
    document.getElementById("panel-lose").classList.toggle("hidden", won);
    overlay.classList.remove("hidden");
    if (won) {
        const t = (time / 1000).toFixed(1);
        document.getElementById("win-detail").textContent =
            `You beat the ghost with ${((LIMIT - time) / 1000).toFixed(1)}s to spare (${t}s run). This is rare.`;
        blip(523, 0.12, "square", 0.06);
        setTimeout(() => blip(784, 0.12, "square", 0.06), 120);
        setTimeout(() => blip(1047, 0.22, "square", 0.06), 240);
        submitRun();
    } else {
        const el = document.getElementById("lose-detail");
        if (reason === "caught") {
            el.textContent = "The ghost caught you inside the VPC. Next run: cross the gap LATER in its patrol cycle, so it's far away when the hunt begins.";
        } else {
            const pDone = onExit(player, map.pExit), gDone = onExit(ghost, map.gExit);
            el.textContent =
                pDone && !gDone ? "You reached PROD — but the ghost was still inside. It has to exit too. Cross earlier so it has time to leave."
                : !pDone && gDone ? "The ghost shipped first. It was already waiting at PROD while you were still fighting the firewall."
                : "Time expired. The firewall cycle beat both of you. Flip SW1 when the ghost is farthest from SW2.";
        }
        blip(220, 0.25, "sawtooth", 0.06);
    }
}

function onExit(ent, exit) {
    return Math.floor(ent.x / TILE) === exit.x && Math.floor(ent.y / TILE) === exit.y;
}

/* ---------- Simulation tick ---------- */
function tick() {
    time += TICK;
    if (player.bonkCd > 0) player.bonkCd--;

    // player
    const [pdx, pdy] = dirFromKeys(player.keys);
    moveAxis(player, pdx * SPEED, 0, "P", false);
    moveAxis(player, 0, pdy * SPEED, "P", false);
    checkSwitch(player, "P");
    if (pdx || pdy) trail(player.x, player.y, C_PLAYER);

    // crossing the midline for the first time: the hunt begins
    if (!playerCrossed && Math.floor(player.x / TILE) > map.midX) {
        playerCrossed = true;
        crossedAt = time;
        // crossing chops the clock — no dawdling on the far side
        const remain = LIMIT - time;
        if (remain > CROSS_CHOP_MS) time = LIMIT - CROSS_CHOP_MS;
        banner = { text: "BREACH DETECTED", sub: "THE GHOST IS HUNTING YOU", color: C_DANGER, ttl: 140 };
        blip(200, 0.2, "sawtooth", 0.07);
        setTimeout(() => blip(160, 0.3, "sawtooth", 0.07), 140);
        shake = 12;
        burst(player.x, player.y, C_DANGER, 20);
    }

    // ghost
    if (ghostData) {
        if (ghostData.phantom) ghostBotThink();
        else {
            applyGhostInputs();
            const [gdx, gdy] = dirFromKeys(ghost.keys);
            moveAxis(ghost, gdx * SPEED, 0, "G", false);
            moveAxis(ghost, 0, gdy * SPEED, "G", false);
            if (gdx || gdy) trail(ghost.x, ghost.y, C_GHOST);
        }
        checkSwitch(ghost, "G");
    }

    // caught by the ghost
    if (state === "playing" && Math.hypot(player.x - ghost.x, player.y - ghost.y) < SIZE) {
        banner = { text: "CAUGHT", sub: "INTRUDER PURGED FROM THE VPC", color: C_DANGER, ttl: 160 };
        burst(player.x, player.y, C_DANGER, 30);
        blip(110, 0.4, "sawtooth", 0.08);
        shake = 16;
        endRun(false, "caught");
        return;
    }

    stepParticles();
    for (const [t, ttl] of switchFlash) {
        if (ttl <= 1) switchFlash.delete(t); else switchFlash.set(t, ttl - 1);
    }
    if (shake > 0) shake *= 0.88;
    if (banner && banner.ttl > 0) banner.ttl--;

    // win check: the ghost must have ALREADY exited (be off the map's
    // active area on its side) — it can't camp forever, it must leave
    // through its own exit once the player forces the issue
    if (onExit(player, map.pExit) && onExit(ghost, map.gExit)) endRun(true);
    else if (time >= LIMIT) endRun(false);
}

/* ---------- Rendering ---------- */
function render() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (shake > 0.4) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // floor
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if ((x + y) % 2 === 0) {
                ctx.fillStyle = "rgba(255,180,120,0.016)";
                ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
            }
        }
    }
    // grid
    ctx.strokeStyle = "rgba(255,160,110,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) { ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, H); }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * TILE); ctx.lineTo(W, y * TILE); }
    ctx.stroke();

    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 240);

    // exits
    drawExit(map.pExit, C_PLAYER, "PROD", onExit(player, map.pExit), pulse);
    drawExit(map.gExit, C_GHOST, "PROD", onExit(ghost, map.gExit), pulse);

    // walls
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (!map.walls[idx(x, y)]) continue;
            ctx.fillStyle = "#1a1109";
            ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
            ctx.fillStyle = "rgba(255,170,110,0.16)";
            ctx.fillRect(x * TILE, y * TILE, TILE, 2);
        }
    }

    // switches
    for (const sw of map.switches) {
        const cx = sw.x * TILE + TILE / 2, cy = sw.y * TILE + TILE / 2;
        const flash = switchFlash.get(idx(sw.x, sw.y)) || 0;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.shadowColor = C_SWITCH;
        ctx.shadowBlur = 10 + flash * 1.5 + pulse * 4;
        ctx.fillStyle = flash ? "#e9d5ff" : C_SWITCH;
        const s = 9 + flash * 0.4;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(244,114,182,0.85)";
        ctx.font = "700 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("SW" + (sw.group + 1), cx, cy + 20);
    }

    // gates
    for (const g of map.gates) {
        const closed = map.gateState[g.group][g.side];
        const x = g.x * TILE, y = g.y * TILE;
        const color = g.side === "P" ? C_PLAYER : C_GHOST;
        if (closed) {
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 12 + pulse * 6;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.85;
            for (let i = 0; i < 4; i++) ctx.fillRect(x + 6 + i * 8, y + 3, 3, TILE - 6);
            ctx.restore();
            ctx.shadowBlur = 0;
        } else {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.22;
            ctx.setLineDash([4, 5]);
            ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }
    }

    // particles
    for (const p of particles) {
        ctx.globalAlpha = Math.min(1, p.life / 20);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;

    // entities
    if (state === "playing" || state === "won" || state === "lost") {
        // hunt mode: ghost flickers hot — visual panic cue
        const hunting = playerCrossed && state === "playing";
        const gColor = hunting && Math.floor(performance.now() / 120) % 2 === 0 ? C_DANGER : C_GHOST;
        const gDeep = hunting ? "#991b1b" : C_GHOST_DEEP;
        drawEntity(ghost.x, ghost.y, gColor, gDeep, true, pulse);
        drawEntity(player.x, player.y, C_PLAYER, C_PLAYER_DEEP, false, pulse);
    }

    ctx.restore();

    // stage banner
    if (banner && banner.ttl > 0) {
        const a = Math.min(1, banner.ttl / 40);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = banner.color;
        ctx.shadowColor = banner.color;
        ctx.shadowBlur = 30;
        ctx.font = "800 34px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(banner.text, W / 2, H / 2 - 8);
        ctx.font = "400 13px 'JetBrains Mono', monospace";
        ctx.shadowBlur = 10;
        ctx.fillText(banner.sub, W / 2, H / 2 + 22);
        ctx.restore();
    }

    // HUD
    const remain = Math.max(0, (LIMIT - time) / 1000);
    const timeEl = document.getElementById("hud-time");
    timeEl.textContent = remain.toFixed(1);
    timeEl.classList.toggle("low", state === "playing" && remain < 10);
}

function drawExit(ex, color, label, occupied, pulse) {
    const cx = ex.x * TILE + TILE / 2, cy = ex.y * TILE + TILE / 2;
    ctx.save();
    ctx.strokeStyle = occupied ? C_EXIT : color;
    ctx.shadowColor = occupied ? C_EXIT : color;
    ctx.shadowBlur = 8 + pulse * 8;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 12 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.fillStyle = occupied ? C_EXIT : color;
    ctx.font = "800 8px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, cx, cy - 18);
}

function drawEntity(x, y, color, deep, isGhost, pulse) {
    ctx.save();
    if (isGhost) {
        ctx.globalAlpha = 0.55 + 0.2 * Math.sin(performance.now() / 90);
        y += Math.sin(performance.now() / 300) * 1.5; // glitch bob
    }
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    const grad = ctx.createLinearGradient(x - HALF, y - HALF, x + HALF, y + HALF);
    grad.addColorStop(0, color);
    grad.addColorStop(1, deep);
    ctx.fillStyle = grad;
    const r = 5;
    ctx.beginPath();
    ctx.roundRect(x - HALF, y - HALF, SIZE, SIZE, r);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    // core dot
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(x - 2, y - 2, 4, 4);
}

/* ---------- Input ---------- */
window.addEventListener("keydown", (e) => {
    if (!MOVE_KEYS.has(e.code)) return;
    e.preventDefault();
    if (state !== "playing") return;
    if (player.keys[e.code]) return; // ignore auto-repeat
    player.keys[e.code] = true;
    recording.push([Math.round(time), e.code, 1]);
});
window.addEventListener("keyup", (e) => {
    if (!MOVE_KEYS.has(e.code)) return;
    if (state !== "playing") { player.keys[e.code] = false; return; }
    player.keys[e.code] = false;
    recording.push([Math.round(time), e.code, 0]);
});

/* ---------- Main loop ---------- */
function frame(ts) {
    requestAnimationFrame(frame);
    if (!lastFrame) lastFrame = ts;
    const dt = Math.min(ts - lastFrame, 100);
    lastFrame = ts;
    if (state === "playing") {
        acc += dt;
        while (acc >= TICK) { tick(); acc -= TICK; if (state !== "playing") { acc = 0; break; } }
    }
    render();
}

/* ---------- Wire up ---------- */
document.getElementById("start-btn").addEventListener("click", startRun);
document.getElementById("again-btn-win").addEventListener("click", startRun);
document.getElementById("again-btn-lose").addEventListener("click", startRun);
document.getElementById("mute-btn").addEventListener("click", (e) => {
    muted = !muted;
    e.target.textContent = muted ? "SOUND: OFF" : "SOUND: ON";
});

document.getElementById("hud-seed").textContent = SEED;
fetchGhost();
requestAnimationFrame(frame);

// debug hook (harmless in production)
window.__gd = () => ({
    state, time,
    player: { x: Math.round(player.x), y: Math.round(player.y) },
    pk: Object.keys(player.keys).filter(k => player.keys[k]),
    ghost: { x: Math.round(ghost.x), y: Math.round(ghost.y), wpIdx: ghost.wpIdx, pause: ghost.pause },
    pExit: map.pExit, gExit: map.gExit, ghostLabel
});
