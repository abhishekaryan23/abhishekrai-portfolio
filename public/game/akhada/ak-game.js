/* Akhada: input, fighters, the CPU, match flow, drawing and the menu. */
"use strict";

const TOUCH = matchMedia("(any-pointer: coarse)").matches;
const STAGES = [
  { id: "ghats", name: "Varanasi Ghats", y0: 156, amb: "embers" },
  { id: "fort", name: "Thar Fort", y0: 142, amb: "sand" },
  { id: "kerala", name: "Kerala Backwaters", y0: 152, amb: "rain" },
  { id: "himalaya", name: "Himalayan Monastery", y0: 148, amb: "snow" }
];
for (const s of STAGES) load("st_" + s.id, ART + "stages/" + s.id + ".webp?v=" + ART_V);
const LEVELS = ["Normal", "Hard", "Very hard"];
const AIP = [
  { react: 22, block: 0.28, spec: 0.010, aggr: 0.55, beat: 0.25, dodge: 0.25, pause: 0.03, hell: 0.004, charge: 0.006, escape: 0.004 },
  { react: 11, block: 0.62, spec: 0.022, aggr: 0.8, beat: 0.6, dodge: 0.55, pause: 0.01, hell: 0.010, charge: 0.02, escape: 0.03 },
  { react: 4, block: 0.9, spec: 0.04, aggr: 0.97, beat: 0.95, dodge: 0.88, pause: 0, hell: 0.022, charge: 0.035, escape: 0.08 }
];
const H2_HP = 0.3;
// fair-fight damage taken, tuned from CPU-vs-CPU round-robins: Bhola is wide as well as tall, Jatayu needs no help
const FAIR_TAKE = { ox: 0.86, jatayu: 0.84 };   // Jatayu, the flagship: a heavy, grounded bruiser
// the Awakened Hell move is a last stand for everyone: below 30% HP in every mode (Training lets you try it any time)
const canAwaken = (f) => f.train || f.hp <= f.maxHp * H2_HP;

/* ---------- input ---------- */
const BIND = [
  { up: ["KeyW"], down: ["KeyS"], left: ["KeyA"], right: ["KeyD"], A: ["KeyJ"], J: ["KeyK"], D: ["KeyL"], run: ["StickDash"], charge: ["VCharge"], hell: ["VHell", "KeyI"] },
  { up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"], A: ["Digit1", "Numpad1", "Comma"], J: ["Digit2", "Numpad2", "Period"], D: ["Digit3", "Numpad3", "Slash"], run: [], charge: [], hell: ["Quote", "Digit4", "Numpad4"] }
];
const keysDown = new Set();
function keyOf(code) { for (let i = 0; i < 2; i++) for (const [a, list] of Object.entries(BIND[i])) if (list.includes(code)) return [i, a]; return null; }
const heldK = (i, a) => BIND[i][a].some((c) => keysDown.has(c));
const human = (i) => fighters.find((f) => f.ctrl === "p" + i);
function onDown(code) {
  if (code === "KeyP" || code === "Escape") {
    if (state === "loading" && match && match.online && code === "Escape" && typeof netLost === "function") { netLost("You left before the fight started."); return; }
    if (["fight", "intro", "ko"].includes(state) && !NETON) togglePause(); return;
  }
  const k = keyOf(code); if (!k) return;
  keysDown.add(code);
  if (NETON) { netPress(k[1]); return; }   // online: the press travels with this tick's input
  const f = human(k[0]); if (f && !paused && !cine && countdown <= 0) f.evq.push(k[1]);
}
function onUp(code) { keysDown.delete(code); }
addEventListener("keydown", (e) => {
  if ((keyOf(e.code) || e.code === "KeyP") && state !== "menu" && state !== "over") e.preventDefault();
  if (e.repeat) return;
  onDown(e.code);
});
addEventListener("keyup", (e) => onUp(e.code));
const autoPause = () => { keysDown.clear(); if (["fight", "intro", "ko"].includes(state) && !paused && !NETON) togglePause(); };
addEventListener("blur", autoPause); addEventListener("pagehide", autoPause);
document.addEventListener("visibilitychange", () => { if (document.hidden) autoPause(); });
Arcade.bindPad(onDown, onUp);
let paused = false, countdown = 0;
function togglePause() {
  paused = !paused; keysDown.clear();
  const btn = document.querySelector(".pad .pause-btn"); if (btn) btn.textContent = paused ? "Resume" : "Pause";
  if (match && match.mode === "training") {
    if (paused) {
      $("end-title").textContent = "Training";
      $("end-result").textContent = train.best ? "Best combo on the dummy: " + train.best + " damage." : "Try a combo on the dummy.";
      $("end-note").textContent = "Specials: Defend, a direction, then Attack or Jump. Hell moves: press Hell (I), or Defend, Forward (or Up), Jump, Attack. Quick moves: Jump + Attack, or Attack + Defend, together. Defend while running vanishes. Hold J, K and L together to charge chakra.";
      $("continue").textContent = "Resume"; $("continue").dataset.resume = "1";
      $("card-menu").hidden = true; $("card-end").hidden = false; $("overlay").hidden = false;
    } else { $("overlay").hidden = true; $("card-end").hidden = true; }
    return;
  }
  if (!paused) countdown = 90;
}

// the last few presses, for Defend + direction + Attack/Jump sequences
function pushSeq(f, k, dir) { f.seq.push({ k, dir, t: tick }); if (f.seq.length > 6) f.seq.shift(); }
const SEQ_GAP = 30;   // ticks allowed between the presses of a sequence
function seqTail(f) {
  const s = f.seq, n = s.length; if (!n) return null;
  const last = s[n - 1];
  // on a touch screen, Defend then a direction already held on the stick counts too
  if (last.k === "D" && f.touchInput && tick - last.t <= SEQ_GAP) {
    const h = f.hold, dir = Math.sign(h.mx);
    if (h.my < 0) return { k: "U", dir: 0, t: tick };
    if (h.my > 0) return { k: "N", dir: 0, t: tick };
    if (dir) return { k: "H", dir, t: tick };
    return null;
  }
  if (n < 2) return null;
  const a = s[n - 2], b = last;
  if (a.k !== "D" || !["H", "U", "N"].includes(b.k) || b.t - a.t > SEQ_GAP || tick - b.t > SEQ_GAP) return null;
  return b;
}
function handle(f, ev) {
  if (f.st === "move" && f.mv && f.mv.hell) { if (ev === "A") beatPress(f); return; }
  const lp = f.lastP || (f.lastP = { A: -99, J: -99, D: -99 }), win = f.touchInput ? PAIR_TOUCH : PAIR;
  const rev = f.fx.reverse ? -1 : 1;
  if (ev === "left" || ev === "right") {
    const dir = (ev === "left" ? -1 : 1) * rev, key = rev > 0 ? ev : ev === "left" ? "right" : "left";
    if (tick - f.lastTap[key] < 14 && canAct(f) && grounded(f) && f.st !== "block") startRun(f, dir);
    f.lastTap[key] = tick; pushSeq(f, "H", dir); return;
  }
  if (ev === "up") return pushSeq(f, rev > 0 ? "U" : "N");
  if (ev === "down") return pushSeq(f, rev > 0 ? "N" : "U");
  if (ev === "run") { if (canAct(f) && grounded(f) && f.hold.mx) startRun(f, Math.sign(f.hold.mx)); return; }
  if (ev === "D") {
    pushSeq(f, "D"); lp.D = tick;
    if (f.st === "run" && grounded(f)) { vanish(f); return; }   // Defend while running: vanish and reappear further on
    if (f.st === "hurt" && grounded(f) && !f.fx.marma && f.mp >= ESCAPE) { escape(f); return; }
    if (f.d.small && tick - lp.A <= win) { f.pair = { code: "QD", t: 3 }; return; }   // Attack + Defend together
    if (canAct(f) && grounded(f) && f.st !== "block") { setSt(f, "block", 0); f.run = 0; }
    return;
  }
  // the Hell key (I, Player 2 ' or 4, the touch pad's Hell button): one press fires the Hell move, or
  // the Awakened move when it is ready (below 30% HP with a full bar). Every player has it, on keys and
  // on touch, so nobody gets an easier Hell move than their opponent; the NTSD inputs work as well
  if (ev === "hell") {
    f.pend = null; f.seq = [];
    const awaken = f.mp >= f.d.moves.H2.mp && canAwaken(f);
    doMove(f, awaken ? "H2" : "H1", f.face);
    return;
  }
  if (ev === "A" || ev === "J") {
    if (f.ctrl[0] === "p" && f.hold.chord) { f.pend = null; f.seq = []; return; }
    if (f.pend && ev === "A") { const p = f.pend; f.pend = null; f.seq = []; doMove(f, p.code === "DFJ" ? "H1" : "H2", p.dir); return; }
    const b = seqTail(f);
    if (b) {
      f.seq = [];
      const code = "D" + (b.k === "H" ? "F" : b.k === "U" ? "U" : "D") + ev;
      if (ev === "J" && (b.k === "H" || b.k === "U")) { f.pend = { code, dir: b.dir, t: f.touchInput ? 16 : 9 }; return; }   // wait a moment: Attack next makes it a Hell move
      doMove(f, code, b.dir); return;
    }
    // two buttons together (NTSD style): Jump + Attack, or Attack + Defend. Decided a few frames
    // later, so pressing J, K and L to charge chakra never fires one by accident
    lp[ev] = tick;
    if (f.d.small && tick - lp[ev === "A" ? "J" : "A"] <= win) { f.pair = { code: "QJ", t: 3 }; return; }
    if (f.d.small && ev === "A" && tick - lp.D <= win) { f.pair = { code: "QD", t: 3 }; return; }
    if (ev === "A") attack(f); else jump(f);
    return;
  }
}
const ESCAPE = 100;
// quick moves and the vanish dash
const PAIR = 3, PAIR_TOUCH = 6, QUICK_MP = 30, VANISH_MP = 30;
function quickMove(f, code) {
  const m = f.d.small && f.d.small[code];
  if (!m || !alive(f) || f.lockBy || f.fx.frozen || f.fx.stopped || f.fx.marma) return false;
  // the first of the two presses may already have started a jab, a hop or a guard: that gives way
  const early = (f.st === "move" && f.code && f.code[0] === "A" && f.t <= 8) || (f.st === "air" && tick - f.jumpT <= 8 && f.z < 30 && !f.airAtk) || f.st === "block";
  if (!canAct(f) && !early) return false;
  if (f.mp < QUICK_MP) { if (f.ctrl[0] === "p") { pop(f, "Not enough chakra", "#9fd0ff"); f.mpFlash = 20; } S.no(); return false; }
  if (f.st === "air") { f.z = 0; f.vz = 0; f.vx = 0; }
  f.mp -= QUICK_MP; startMove(f, m, code); pop(f, m.name, f.d.col);
  return true;
}
const VANISH = { name: "Vanish", len: 16, inv: [0, 15], pose: tl([0, "p1"], [11, "m0"]), vel: (f, t) => (t < 11 ? 6.4 : 0.4),
  tick: (f, t) => {
    if (t === 1 || t === 11) { f.hide = t === 1; dust(f.x, f.y, 8, "rgba(235,235,245,0.9)"); burst(f.x, f.y, f.z + 26, "#ffffff", 6); }
    if (t > 1 && t < 11 && t % 3 === 0) parts.push({ x: f.x, y: f.y, z: f.z + rand(10, 40), vx: -f.face * 0.6, vz: 0.2, life: 10, max: 10, col: "rgba(235,235,245,0.8)", r: 2 });
  },
  end: (f) => { f.hide = false; } };
function vanish(f) {
  if (f.mp < VANISH_MP) { if (f.ctrl[0] === "p") { pop(f, "Not enough chakra", "#9fd0ff"); f.mpFlash = 20; } S.no(); setSt(f, "idle"); f.run = 0; return; }
  f.mp -= VANISH_MP; f.face = f.run || f.face; f.run = 0; startMove(f, VANISH, "RV"); S.jump();
}
const WALL = 40;   // this close to the arena's edge counts as cornered
const cornered = (f, tg) => tg && ((f.x < WALL && tg.x > f.x) || (f.x > AW - WALL && tg.x < f.x)) && Math.abs(tg.x - f.x) < 60;
function escape(f) {
  const tg = nearest(f), away = tg ? Math.sign(f.x - tg.x) || -f.face : -f.face;
  f.mp -= ESCAPE; stamp(f, 3); dust(f.x, f.y, 8);
  // with a wall behind, the escape goes over the attacker instead of into the wall
  f.x = clamp(cornered(f, tg) ? tg.x - away * 34 : f.x + away * 44, 12, AW - 12); f.inv = 30; f.stag = 0; f.fx.stun = 0;
  setSt(f, "idle"); faceTo(f, tg); pop(f, "Escape", "#9fd0ff"); S.jump();
}
function beatPress(f) {
  f.beatPress = tick;
  if (f.beatOpen && tick <= f.beatOpen) { f.beatOpen = 0; beatHit(f); }
}
function beatHit(f) {
  if (f.opener) return;   // the opener takes exactly half, no more
  f.beats++; S.beat(); f.flash = 8;
  pop(f, f.beats > 1 ? "Super x" + f.beats : "Super", "#ffd36a", true);
  if (f.mv && f.mv.beat) f.mv.beat(f, f.beats);
  else { const tg = f.lockT0 && alive(f.lockT0) ? f.lockT0 : foeNear(f, 140); if (tg) hitT(f, tg, 22, { hell: true, spark: "#ffd36a" }); }
}

/* ---------- moves ---------- */
const BASIC = [
  { pose: tl([0, "m3"], [11, "m0"]), len: 14, hit: { from: 4, to: 7, range: [4, 30], dmg: 15, stun: 14 } },
  { pose: tl([0, "m5"], [12, "m0"]), len: 16, hit: { from: 5, to: 8, range: [6, 34], dmg: 17, stun: 16 } },
  { pose: tl([0, "m4"], [4, "m6"], [19, "m0"]), len: 24, hit: { from: 6, to: 10, range: [4, 34], dmg: 24, knock: true, kx: 2.6, kz: 3.4 } }
];
const RUN_ATK = { pose: "p5", len: 24, vel: (f, t) => Math.max(0, 4.6 - t * 0.2), hit: { from: 2, to: 12, range: [0, 30], dmg: 26, knock: true, kx: 3, kz: 3 } };
function basicFor(f, n) {
  const atk = (f.wounded && f.d.atkW) || f.d.atk;
  if (atk) { const [pose, dmg, range] = atk[n]; const b = BASIC[n], wind = (f.wounded && f.d.atkWindW) || f.d.atkWind || "x0";
    // Dasharatha's Vow: every basic hit is a heavy guard-breaker
    const vow = f.buff.vow > 0 ? { gb: 30 } : null;
    return Object.assign({}, b, { pose: n === 2 ? tl([0, wind], [6, pose]) : pose, len: b.len + (n === 2 ? 8 : 2), hit: Object.assign({}, b.hit, { dmg, range, from: b.hit.from + (n === 2 ? 6 : 1), to: b.hit.to + (n === 2 ? 6 : 1) }, vow),
      ev: n === 2 ? { 12: () => { shake = 6; S.heavy(); dust(f.x + f.face * 30, f.y, 6); if (f.d.wingSwoosh) parts.push({ x: f.x + f.face * 22, y: f.y, z: 30, vx: 0, vz: 0, life: 14, max: 14, anim: "swoosh", sc: 0.8, rot: 0.3 * f.face, flip: f.face < 0 }); } } : null }); }
  if (n === 2 && f.atkAlt) return Object.assign({}, BASIC[2], { pose: tl([0, "m3"], [4, "m4"], [19, "m0"]), hit: Object.assign({}, BASIC[2].hit, { zr: [10, 60], kz: 4.6, kx: 1.4 }) });
  return BASIC[n];
}
function attack(f) {
  if (f.st === "air") { if (!f.airAtk) { f.airAtk = 18; f.hitSet.clear(); S.swing(); } return; }
  const chaining = (f.st === "move" && f.code && f.code[0] === "A" && f.code !== "AR" && f.t >= f.mv.hit.to) || (canAct(f) && tick - f.atkEnd < 20);
  if (!canAct(f) && !chaining) { if (f.st === "move" && f.code && f.code[0] === "A") f.qA = true; return; }
  if (f.st === "run") { startMove(f, RUN_ATK, "AR"); f.run = 0; S.swing(); return; }
  const n = chaining && f.atkN < 2 ? f.atkN + 1 : 0;
  if (n === 0) f.atkAlt = !f.atkAlt;
  f.atkN = n; startMove(f, basicFor(f, n), "A" + n); S.swing();
}
function jump(f) {
  if (!canAct(f) || !grounded(f)) return;
  const running = f.st === "run";
  setSt(f, "air"); f.vz = (f.d.jump || 5.4) * (f.wounded ? 0.7 : 1); f.jumpT = tick;   // clipped wings: half the height
  f.vx = running ? f.run * 3.6 : f.hold.mx * f.d.spd * 1.2; f.vy = f.hold.my * 0.8; f.run = 0; S.jump();
}
// clipped wings (Jatayu after Martyr's Eclipse): no dash
function startRun(f, dir) { if (!canAct(f) || f.wounded) return; setSt(f, "run"); f.run = dir; f.face = dir; }
function startMove(f, def, code) {
  if (f.st === "move" && f.mv) leaveMove(f);   // cancelling one move into another still cleans up the first
  setSt(f, "move"); f.mv = def; f.code = code; f.t = 0; f.hitSet = new Set(); f.mvStart = tick; f.qA = false; f.mvDir = f.face;
  if (code[0] !== "A") { f.beats = 0; f.beatOpen = 0; }
}
function doMove(f, code, dir) {
  const m = f.d.moves[code]; if (!m) return false;
  const hell = !!m.hell;
  const cancelBasic = f.st === "move" && f.code && f.code[0] === "A" && f.mv.hit && f.t >= f.mv.hit.from;
  const cancelHell = hell && f.cancel > 0 && f.st === "move" && f.mv && !f.mv.hell;
  if (!canAct(f) && !cancelBasic && !cancelHell) return false;
  if (!grounded(f) && !m.air) return false;
  if (f.wounded && f.d.sealed && f.d.sealed.includes(code)) { if (f.ctrl[0] === "p") { pop(f, "Wings clipped", "#ffb0a0"); S.no(); } return false; }
  if (code === "H2" && !canAwaken(f)) { if (f.ctrl[0] === "p") pop(f, "Below 30% HP", "#ffb0a0"); S.no(); return false; }
  if (f.mp < m.mp) { if (f.ctrl[0] === "p") { pop(f, "Not enough chakra", "#9fd0ff"); f.mpFlash = 20; } S.no(); return false; }
  f.mp = code === "H2" ? 0 : f.mp - m.mp; if (dir) f.face = dir; f.run = 0; f.cancel = 0;
  startMove(f, m, code);
  if (hell) { f.hellId++; f.hells++; f.inv = Math.max(f.inv, 18); cine = { f, t: 0, len: 54, name: m.name, sub: code === "H2" ? "Awakened" : "Hell move" }; S.hell(); }
  else pop(f, m.name, f.d.col);
  return true;
}
function endMove(f) {
  if (f.code === "H2") {
    const key = f.uid + ":" + f.hellId;
    for (const t of fighters) if (t.team !== f.team && t.hellBy && t.hellBy[key] != null && alive(t)) {
      const cap = Math.round(t.maxHp * AWAKEN_SHARE * (t.hellClean && t.hellClean[key] ? 1 : 0.5)), left = cap - t.hellBy[key];   // blocked all the way: half
      if (left > 0) { t.hellBy[key] = cap; t.hp = Math.max(t.dummy || t.buff.immortal > 0 ? 1 : 0, t.hp - left); t.lastHit = tick; t.flash = 8; pop(t, "-" + left, "#ffd36a", true); burst(t.x, t.y, t.z + 30, "#ffd36a", 12); S.heavy(); if (t.hp <= 0 || !grounded(t)) knockdown(t, -t.face * 2, 4); }
    }
  }
  const wasA = f.code && f.code[0] === "A" && f.code !== "AR", q = f.qA;
  if (wasA) f.atkEnd = tick;
  setSt(f, grounded(f) ? "idle" : "air");
  if (wasA && q && f.atkN < 2 && canAct(f)) attackChain(f);
}
function attackChain(f) { const n = f.atkN + 1; f.atkN = n; startMove(f, basicFor(f, n), "A" + n); S.swing(); }

/* ---------- fighter update ---------- */
function updateFighter(f) {
  // timers and status effects
  if (f.inv > 0) f.inv--; if (f.flash > 0) f.flash--; if (f.cancel > 0) f.cancel--; if (f.comboT > 0) f.comboT--; else f.combo = 0;
  if (f.mpFlash > 0) f.mpFlash--; if (f.stagT > 0) f.stagT--;
  // Training has no rounds to reset Jatayu's clipped wings, so they grow back after 20 seconds
  if (f.wounded && f.train && ++f.woundT > 1200) { f.wounded = false; f.woundT = 0; pop(f, "Wings restored", "#ffcf4a"); }
  for (const k in f.buff) if (f.buff[k] > 0 && k !== "chargeN") f.buff[k]--;
  // size: unless a move is changing it (Vishal Roop, Parvat Patan), it eases to the resting size, so a
  // giant stays a giant through every move and grows or shrinks smoothly instead of snapping
  if (!(f.st === "move" && f.mv && f.mv.sizes)) { const rest = restSize(f); if (f.sc !== rest) f.sc = Math.abs(rest - f.sc) < 0.01 ? rest : f.sc + (rest - f.sc) * 0.15; }
  const bmax = f.buffMax || (f.buffMax = {});
  for (const k in BUFF_INFO) {
    const v = f.buff[k] || 0;
    if (v > 0 && (!bmax[k] || v > bmax[k])) { bmax[k] = v; texts.push({ x: f.x, y: f.y - f.z - bodyH(f) - 2, msg: BUFF_INFO[k][1], col: BUFF_COL[k] || "#fff", life: 75 }); }
    else if (v <= 0 && bmax[k]) bmax[k] = 0;
  }
  const fmax = f.fxMax || (f.fxMax = {});
  for (const k in FX_INFO) { const v = f.fx[k] || 0; if (v > 0 && (!fmax[k] || v > fmax[k])) fmax[k] = v; else if (v <= 0) fmax[k] = 0; }
  if (f.buff.immortal > 0 && alive(f) && tick % 4 === 0) f.hp = Math.min(f.maxHp, f.hp + 1);
  if (f.buff.regen > 0 && tick % 5 === 0 && alive(f)) f.hp = Math.min(f.maxHp, f.hp + 1);
  if (alive(f)) {
    if (f.fx.burn > 0 && tick % 12 === 0) { f.hp = Math.max(1, f.hp - 2); flame(f.x, f.y, 2); }
    if (f.fx.poison > 0 && tick % 15 === 0) { f.hp = Math.max(1, f.hp - 2); parts.push({ x: f.x + rand(-6, 6), y: f.y, z: rand(20, 44), vx: 0, vz: 0.5, life: 20, max: 20, col: "#7fe07a", r: 2 }); }
    f.mp = Math.min(500, f.mp + ((f.d.legend || f.d.hidden) && !f.fair ? 0.08 : 0.06) * (f.ai ? f.ai.mpK : 1));
    if (f.train && match.infinite && f.ctrl[0] === "p") f.mp = 500;
    if (f.dummy && tick - f.lastHit > 90 && f.hp < f.maxHp && f.st !== "fall") f.hp = Math.min(f.maxHp, f.hp + 6);
    if (f.guard < 70) f.guard += 0.15;
  }
  for (const k of ["burn", "poison", "stun", "marma", "reverse", "slow", "blind", "mark", "frozen"]) if (f.fx[k] > 0) f.fx[k]--;
  if (tick % 4 === 0) { f.hist.push({ x: f.x, y: f.y, hp: f.hp }); if (f.hist.length > 30) f.hist.shift(); }
  for (const a of f.after) a.a -= 0.04; f.after = f.after.filter((a) => a.a > 0);
  if (f.pair && --f.pair.t <= 0) { const q = f.pair; f.pair = null; if (!f.hold.chord && !f.hold.charge) quickMove(f, q.code); }
  if (f.pend && --f.pend.t <= 0) { const p = f.pend; f.pend = null; if (p.code === "DFJ") doMove(f, "DFJ", p.dir); else jump(f); }

  // stopped in time (Freeze Frame, Total Rollback): everything waits, then lands at once
  if (f.fx.stopped > 0 || f.lockBy || f.fx.frozen > 0) f.evq = [];
  if (f.fx.stopped > 0) {
    if (--f.fx.stopped === 0 && f.stoppedDmg) { const d = f.stoppedDmg; f.stoppedDmg = 0; f.hp = Math.max(f.buff.immortal > 0 ? 1 : 0, f.hp - d); pop(f, "-" + d, "#e8c05a", true); S.heavy(); knockdown(f, -f.face * 2, 5); f.stoppedKnock = false; }
    return;
  }
  if (f.lockBy) {
    if (--f.lockT <= 0 || f.lockBy.st !== "move") { unlock(f); if (alive(f)) { if (f.z > 0) knockdown(f, 0, 1); else setSt(f, "idle"); } else knockdown(f, 0, 2); }
    return;
  }
  if (f.fx.frozen > 0) { if (!grounded(f)) { f.z = Math.max(0, f.z + f.vz); f.vz -= GRAV; } return; }
  if (f.fx.slow > 0 && tick % 2 && !f.opener) return;

  if (f.ai && alive(f)) { aiThink(f); if (f.fx.reverse) { f.hold.mx = -f.hold.mx; f.hold.my = -f.hold.my; } }
  if (alive(f)) { const q = f.evq; f.evq = []; for (const ev of q) handle(f, ev); }
  const spdK = (f.fx.slow > 0 ? 0.6 : 1) * (f.buff.rhythm > 0 ? 1.35 : 1) * (f.buff.wings > 0 ? 1.3 : 1) * (f.buff.vow > 0 ? 0.8 : 1) * (f.spdK || 1);
  if (f.hold.charge && f.mp < 500 && alive(f) && (canAct(f) && grounded(f) || (f.st === "move" && f.code === "A0" && f.t < 8) || (f.st === "air" && tick - f.jumpT < 8))) { f.z = 0; f.vz = 0; f.vx = f.vy = 0; f.airAtk = 0; setSt(f, "charge"); f.run = 0; }

  switch (f.st) {
    case "idle": case "walk": {
      if (f.hold.D && canAct(f)) { setSt(f, "block"); break; }
      const mx = f.hold.mx, my = f.hold.my;
      if (mx || my) {
        f.vx = mx * f.d.spd * spdK; f.vy = my * f.d.spd * 0.7 * spdK; if (mx) f.face = Math.sign(mx);
        f.walkPh += Math.hypot(f.vx, f.vy) * 0.18; f.st = "walk"; f.idleT = 0;
      } else { f.vx = f.vy = 0; f.st = "idle"; if (++f.idleT > 10) faceTo(f, nearest(f)); }
      f.x += f.vx; f.y += f.vy;
      break;
    }
    case "run": {
      if (f.hold.mx && Math.sign(f.hold.mx) !== f.run || (!f.hold.mx && f.ctrl[0] === "c" && !f.ai.keepRun)) { setSt(f, "idle"); f.run = 0; break; }
      f.vx = f.run * f.d.spd * 2.3 * spdK; f.x += f.vx; f.y += f.hold.my * 0.9; f.walkPh += 0.4; f.t++;   // about 2.8 steps a second, and no after-images: they read as jitter
      if (tick % 6 === 0) dust(f.x - f.run * 8, f.y, 1);
      if (f.hold.D) { setSt(f, "block"); f.run = 0; }
      break;
    }
    case "block": if (!f.hold.D && f.t > 6) setSt(f, "idle"); f.t++; f.vx *= 0.8; f.x += f.vx; break;
    case "charge": {
      f.t++;
      if (!f.hold.charge || f.mp >= 500) { if (f.mp >= 500) pop(f, "Chakra full", "#9fd0ff"); setSt(f, "idle"); break; }
      f.mp = Math.min(500, f.mp + 3.4);
      if (f.t % 2 === 0) parts.push({ x: f.x + rand(-bodyW(f) - 6, bodyW(f) + 6), y: f.y, z: rand(0, 10), vx: 0, vz: rand(1.2, 2.4), life: 24, max: 24, col: pick(["#7fc4ff", "#bfe6ff", "#4aa3ff"]), r: rand(1.5, 2.5), add: true });
      if (f.t % 18 === 1) play("charge", 250, () => Arcade.tone(180 + f.mp * 0.6, 0.12, "triangle", 0.02, 60));
      break;
    }
    case "air": {
      f.x += f.vx; f.y += f.vy; f.z += f.vz; f.vz -= GRAV;
      if (f.airAtk) { f.airAtk--; if (f.airAtk < 15 && f.airAtk > 2) melee(f, { range: [2, 30], zr: [-6, 40], dmg: 22, knock: true, kx: 2.2, kz: 2.6 }); }
      if (f.z <= 0) { f.z = 0; f.vz = 0; f.airAtk = 0; setSt(f, "idle"); f.vx = f.vy = 0; dust(f.x, f.y, 2); f.landT = tick; }
      break;
    }
    case "move": {
      const m = f.mv, t = ++f.t, k = f.code && f.code[0] === "A" && f.buff.rhythm > 0 ? 0.75 : 1;
      if (m.inv && t >= m.inv[0] && t <= m.inv[1]) f.inv = Math.max(f.inv, 2);
      if (m.vel) f.vx = m.vel(f, t) * (m.spin ? f.mvDir : f.face) * spdK; else if (grounded(f)) f.vx *= 0.7;
      if (m.ev && m.ev[t]) m.ev[t](f);
      if (f.st !== "move" || f.mv !== m) break;   // countered or interrupted
      if (m.tick) m.tick(f, t);
      if (m.hit && t >= m.hit.from && t <= m.hit.to) { if (m.hit.every && (t - m.hit.from) % m.hit.every === 0) f.hitSet.clear(); melee(f, m.hit); }
      if (m.beats && m.beats.includes(t)) {
        if (tick - f.beatPress <= 6) beatHit(f); else f.beatOpen = tick + 8;
      }
      f.x += f.vx;
      if (!grounded(f) || f.vz > 0) { f.z += f.vz; f.vz -= m.grav || GRAV; if (f.z <= 0 && !(f.fx.sky)) { f.z = 0; f.vz = 0; } }
      if (t >= Math.round(m.len * k)) endMove(f);
      break;
    }
    case "hurt": if (--f.t <= 0) setSt(f, "idle"); f.vx *= 0.82; f.x += f.vx; if (f.fx.stun && tick % 4 === 0) sparks(f.x, f.y, f.z + 40, "#fff38a", 1); break;
    case "fall": {
      f.x += f.vx; f.z += f.vz; f.vz -= GRAV; f.vx *= 0.985;
      if (f.z <= 0 && f.vz < 0) {
        f.z = 0;
        if (f.vz < -3.2 && !f.bounced) { f.bounced = true; f.vz = -f.vz * 0.32; f.vx *= 0.5; dust(f.x, f.y, 5); shake = Math.max(shake, 2); }
        else { f.bounced = false; f.vx = 0; f.vz = 0; f.juggle = 0; setSt(f, f.hp <= 0 ? "ko" : "down", 34); if (f.hp <= 0) S.ko(); }
      }
      break;
    }
    case "down": if (--f.t <= 0) { setSt(f, "getup", 14); } break;
    case "getup": if (--f.t <= 0) {
      const tg = nearest(f);
      if (cornered(f, tg)) { stamp(f, 3); dust(f.x, f.y, 6); f.x = clamp(tg.x + Math.sign(tg.x - f.x) * 30, 12, AW - 12); faceTo(f, tg); pop(f, "Roll", "#cfe8ff"); }
      setSt(f, "idle"); f.inv = 26;
    } break;
    case "held": if (!f.lockBy) { if (f.z > 0) knockdown(f, 0, 1); else setSt(f, "idle"); } break;
    case "win": f.t++; break;
  }
  // stay in the arena, out of the ice walls and out of each other
  f.x = clamp(f.x, 12, AW - 12); if (!f.fx.sky) f.y = clamp(f.y, stage.y0, Y1);
  for (const o of objs) if (o.kind === "wall" && o.team !== f.team && Math.abs(f.y - o.y) < 14 && Math.abs(f.x - o.x) < 12 + f.d.w) f.x = o.x + Math.sign(f.x - o.x || 1) * (12 + f.d.w);
}
function separate() {
  for (let i = 0; i < fighters.length; i++) for (let j = i + 1; j < fighters.length; j++) {
    const a = fighters[i], b = fighters[j];
    if (!alive(a) || !alive(b) || a.z > 4 || b.z > 4 || a.lockBy || b.lockBy || a.fx.sky || b.fx.sky) continue;
    const dx = b.x - a.x, need = (bodyW(a) + bodyW(b)) * 0.8;
    if (Math.abs(dx) < need && Math.abs(b.y - a.y) < 7) { const push = (need - Math.abs(dx)) / 2 * (Math.sign(dx) || 1); a.x -= push; b.x += push; }
  }
}

/* ---------- the CPU ---------- */
function aiThink(f) {
  const A = f.ai, P0 = AIP[A.lvl], P = f.fx.blind ? Object.assign({}, P0, { react: P0.react * 3, block: P0.block * 0.5, dodge: P0.dodge * 0.5 }) : P0, tg = nearest(f);
  f.hold.mx = 0; f.hold.my = 0;
  if (!tg) { f.hold.D = false; return; }
  if (f.st === "move" && f.mv && f.mv.hell) { if (f.beatOpen && tick <= f.beatOpen && rnd() < P.beat / 3) f.evq.push("A"); return; }
  if (A.blockT > 0) { A.blockT--; f.hold.D = true; return; }
  f.hold.D = false; f.hold.charge = false;
  if (A.dodgeT > 0) { A.dodgeT--; f.hold.my = A.dodgeDir; if (f.st === "idle" || f.st === "walk") return; }
  const dx = tg.x - f.x, adx = Math.abs(dx), dy = tg.y - f.y, ady = Math.abs(dy), dir = Math.sign(dx) || f.face;
  if (f.st === "hurt" && f.stag >= 2 && f.mp >= ESCAPE + 60 && rnd() < P.escape) { f.evq.push("D"); return; }
  if (f.st === "charge") { const safe = adx > 110 && !objs.some((p) => p.kind === "shot" && p.team !== f.team && Math.abs(p.x - f.x) < 140); f.hold.charge = safe && A.chargeT-- > 0; return; }
  if (f.st === "air") { if (!f.airAtk && adx < 36 && ady < 12 && rnd() < 0.35) f.evq.push("A"); return; }
  if (f.st === "move" && f.code && f.code[0] === "A") {   // keep a basic string going, then cancel into a special
    if (f.hitSet.size && f.t >= f.mv.hit.to) { if (f.atkN < 2) f.evq.push("A"); else if (f.mp >= 160 && (f.mp < 220 || f.mp >= f.d.moves.H1.mp + 110) && rnd() < P.aggr * 0.5) doMove(f, pick(["DFA", "DDA", "DUA"]), dir); }
    return;
  }
  if (f.st === "move" && f.cancel > 0 && f.mp >= f.d.moves.H1.mp && rnd() < P.aggr * 0.5) { doMove(f, f.mp >= f.d.moves.H2.mp && canAwaken(f) ? "H2" : "H1", dir); return; }
  if (!canAct(f)) return;
  if (rnd() < P.pause) { A.idle = 20; }
  if (A.idle > 0) { A.idle--; return; }

  // defence: incoming shots
  for (const p of objs) {
    if (p.kind !== "shot" || p.team === f.team || p.life <= 0) continue;
    const toward = Math.sign(f.x - p.x) === Math.sign(p.vx), dist = Math.abs(p.x - f.x);
    if (!toward || dist > 120 || Math.abs(p.y - f.y) > 14 || p.z > f.z + bodyH(f) + 10) continue;
    if (!A.seen.has(p)) A.seen.set(p, tick);
    if (tick - A.seen.get(p) === P.react) {
      const r = rnd();
      if (r < P.dodge * 0.5) { A.dodgeT = 16; A.dodgeDir = f.y < (stage.y0 + Y1) / 2 ? 1 : -1; f.hold.my = A.dodgeDir; return; }
      if (r < P.dodge) { f.evq.push("J"); return; }
      if (r < P.dodge + (1 - P.dodge) * P.block) { A.blockT = 22; f.hold.D = true; f.evq.push("D"); return; }
      if (f.mp >= f.d.moves.DFA.mp + 60 && rnd() < 0.5) { doMove(f, "DFA", -Math.sign(p.vx)); return; }
    }
  }
  if (A.seen.size > 40) A.seen.clear();
  // defence: a foe winding up a hit or a Hell move
  if (tg.st === "move" && tg.mvStart !== A.seenMove && tick - tg.mvStart >= P.react) {
    A.seenMove = tg.mvStart;
    const hell = tg.mv && tg.mv.hell;
    if ((hell || (adx < 80 && ady < 16)) && rnd() < P.block) { A.blockT = hell ? 60 : 20; f.hold.D = true; f.evq.push("D"); return; }
  }
  // offence
  const saving = A.lvl >= 1 && f.mp >= 220 && f.mp < f.d.moves.H1.mp;   // close to a Hell move: keep the chakra
  const h1 = f.mp >= f.d.moves.H1.mp, h2 = f.mp >= f.d.moves.H2.mp && canAwaken(f), opening = tg.st === "hurt" || tg.fx.stun || tg.fx.marma || tg.fx.frozen || tg.fx.stopped;
  if (f.d.small && f.mp >= QUICK_MP + 40 && adx < 46 && ady < 12) {
    const wall = f.x < WALL + 10 || f.x > AW - WALL - 10;
    if (rnd() < (wall ? 0.12 : 0.035) * P.aggr) { faceTo(f, tg); if (quickMove(f, wall || rnd() < 0.4 ? "QD" : "QJ")) return; }
  }
  if ((h2 || h1) && (opening || adx < 150) && !["down", "getup", "fall"].includes(tg.st) && rnd() < P.hell * (opening ? 6 : 1)) { faceTo(f, tg); if (doMove(f, h2 ? "H2" : "H1", dir)) return; }
  if (tg.z > 18 && adx < 54 && ady < 14 && rnd() < 0.25 * P.aggr) { if (f.mp >= f.d.moves.DUA.mp + 100 && doMove(f, "DUA", dir)) return; f.evq.push("J"); return; }
  // charge chakra when the foe is far away or down, and stop when they come close
  const tgDown = ["down", "getup", "fall"].includes(tg.st) || tg.st === "charge";
  if (!h1 && (adx > 120 || (tgDown && adx > 60)) && rnd() < P.charge * (saving ? 3 : 1)) { A.chargeT = Math.floor(rand(50, 120)); f.hold.charge = true; return; }
  const lowHp = f.hp < f.maxHp * 0.25 && tg.mp >= 250 && A.lvl === 2;
  if (adx > 110) {
    if (!saving && ady < 10 && f.mp >= f.d.moves.DFA.mp + 80 && rnd() < P.spec * 2) { if (doMove(f, "DFA", dir)) return; }
    if (!Object.keys(f.buff).some((k) => f.buff[k] > 0) && f.mp > 320 && rnd() < P.spec * 0.3) { if (doMove(f, "DDJ", dir)) return; }
    if (adx > 200 && f.st !== "run" && rnd() < 0.03 * P.aggr) { startRun(f, dir); A.keepRun = true; return; }
    if (f.st === "run") { if (adx < 70 || ady > 30) { setSt(f, "idle"); f.run = 0; A.keepRun = false; } else { f.hold.mx = dir; f.hold.my = Math.sign(dy) * (ady > 4 ? 1 : 0); if (adx < 90 && rnd() < 0.15) f.evq.push(rnd() < 0.5 ? "A" : "J"); else if (adx < 130 && f.mp >= VANISH_MP + 120 && rnd() < 0.02) f.evq.push("D"); return; } }
    f.hold.mx = lowHp ? 0 : dir; f.hold.my = ady > 3 ? Math.sign(dy) : 0; return;
  }
  if (adx > 38) {
    if (!saving && ady < 12 && f.mp >= 220 && rnd() < P.spec) { if (doMove(f, pick(["DFJ", "DDA", "DFA"]), dir)) return; }
    if (rnd() < 0.012 * P.aggr && ady < 10) { f.hold.mx = dir; jump(f); return; }
    f.hold.mx = lowHp && rnd() < 0.5 ? -dir : dir; f.hold.my = ady > 3 ? Math.sign(dy) : 0; return;
  }
  // close
  faceTo(f, tg);
  if (ady > 5) { f.hold.my = Math.sign(dy); return; }
  if (adx < 14) { f.hold.mx = -dir; return; }
  const punish = tg.st === "move" && tg.mv && tg.mv.len && tg.t > tg.mv.len - 14;
  if (tg.st === "block" && A.lvl >= 1 && rnd() < 0.06) { if (f.mp >= 240 && doMove(f, pick(["DDA", "DUA"]), dir)) return; }
  if (punish || tick >= A.nextA) { A.nextA = tick + (A.lvl === 2 ? 8 : 14) + Math.floor(rand(0, 8)); if (rnd() < P.aggr) f.evq.push("A"); }
}

/* ---------- match flow ---------- */
let fightTicks = 0;
let state = "menu", match = null, round = 0, timer = 99, introT = 0, koT = 0, wins = [0, 0], unlockedHidden = false;
try { unlockedHidden = localStorage.getItem("akhada:legends") === "1"; } catch (e) { /* private mode */ }
const roster = () => ORDER.filter((id) => !ROSTER[id].hidden || unlockedHidden);
const regular = () => ORDER.filter((id) => !ROSTER[id].legend && !ROSTER[id].hidden);
function teamsFor(cfg) {
  const lvl = cfg.lvl, mk = (id, team, ctrl) => ({ id, team, ctrl, lvl });
  if (cfg.mode === "training") return [mk(cfg.p1, 0, "p0"), mk(cfg.p2, 1, cfg.dummy === "cpu" ? "cpu" : "dummy")];
  if (cfg.mode === "arcade") {
    const step = cfg.ladder[cfg.step], boss = ROSTER[step].legend || ROSTER[step].hidden;
    const t0 = [mk(cfg.p1, 0, "p0")]; if (cfg.players === 2) t0.push(mk(cfg.p2, 0, "p1"));
    const t1 = [mk(step, 1, "cpu")]; if (cfg.players === 2 && !boss) t1.push(mk(pick(regular().filter((i) => i !== step)), 1, "cpu"));
    if (boss && cfg.players === 2) t1[0].hpK = 1.6;
    return t0.concat(t1);
  }
  if (cfg.mode === "team") {
    const t0 = [mk(cfg.p1, 0, "p0"), mk(cfg.p2, 0, cfg.players === 2 ? "p1" : "cpu")];
    const pool = regular().filter((i) => i !== cfg.p1 && i !== cfg.p2);
    const one = pick(pool), two = pick(pool.filter((i) => i !== one));
    return t0.concat([mk(one, 1, "cpu"), mk(two, 1, "cpu")]);
  }
  return [mk(cfg.p1, 0, "p0"), mk(cfg.p2, 1, cfg.players === 2 ? "p1" : "cpu")];
}
function startMatch(cfg) {
  match = cfg; wins = [0, 0]; round = 0;
  const list = teamsFor(cfg); match.list = list;
  stage = STAGES[cfg.mode === "arcade" ? cfg.stages[cfg.step] : cfg.stage];
  for (const s of list) fighterArt(s.id);
  state = "loading"; loadT = 0; $("overlay").hidden = true;
}
let loadT = 0;
function startRound() {
  round++; objs = []; parts = []; texts = []; cine = null; tint = null; flashA = 0; slowmo = 0; hitstop = 0; shake = 0;
  const L = match.list, n = [0, 0];
  fighters = L.map((s) => {
    const k = n[s.team]++, cnt = L.filter((o) => o.team === s.team).length;
    const y = cnt === 1 ? (stage.y0 + Y1) / 2 : lerp(stage.y0 + 8, Y1 - 6, k / (cnt - 1));
    const f = makeFighter(s.id, s.team, s.ctrl, AW / 2 + (s.team === 0 ? -80 - k * 14 : 80 + k * 14), y);
    if (s.hpK) { f.hp = f.maxHp = f.lag = Math.round(f.d.hp * s.hpK); }
    if (match.mode === "training") { f.train = true; f.dummy = true; f.mp = 500; }
    if (match.online) f.net = true;   // every round of an online match is driven by the exchanged inputs
    f.fair = !!match.fair;
    if (f.fair) {   // fair fight: the same health for everyone; a bigger body is easier to hit, so it takes a little less
      f.hp = f.maxHp = f.lag = 500;
      f.dmgTake = FAIR_TAKE[f.id] || clamp(Math.pow(52 / f.d.h, 0.85), 0.72, 1);
      if (f.d.spd < 1.3) f.spdK = 1.3 / f.d.spd;
    }
    f.evq = [];
    const base = f.fair ? 1 : f.d.dmgMul || 1;
    if (s.ctrl === "cpu") { f.ai = { lvl: s.lvl, seen: new Map(), nextA: 0, blockT: 0, dodgeT: 0, idle: 0, mpK: [0.9, 1.05, 1.25][s.lvl] }; f.dmgMul = base * (f.fair ? 1 : [0.85, 1, 1.12][s.lvl]); }
    else f.dmgMul = base;
    return f;
  });
  cam = clamp(AW / 2 - LW / 2, 0, AW - LW); timer = 99; fightTicks = 0; introT = 0; state = "intro"; stats.t0 = performance.now();
}
const stats = { t0: 0 };
function teamAlive(team) { return fighters.some((f) => f.team === team && alive(f)); }
function roundOver(w) { if (NETON) netRoundOver(w); else endRound(w); }
function endRound(winner) {
  state = "ko"; koT = 0; slowmo = 50;
  if (winner >= 0) wins[winner]++;
  roundWinner = winner;
}
let roundWinner = -1;
// the final Arcade fight: Barbarik's first arrow never misses and takes half of everyone's health
function bossOpener() {
  if (!match || match.mode !== "arcade" || round !== 1) return;
  const b = fighters.find((f) => f.id === "barbarik" && f.ai);
  if (!b) return;
  b.mp = Math.max(b.mp, b.d.moves.H1.mp); b.opener = true; faceTo(b, nearest(b));
  if (doMove(b, "H1", b.face)) { b.inv = b.mv.len + 4; sayAt(b.x, 64, "The first arrow never misses", "#ff8080", true); }
  else b.opener = false;
}
function afterRound() {
  if (wins[0] >= 2 || wins[1] >= 2 || round >= 5) return matchOver(wins[0] > wins[1] ? 0 : wins[1] > wins[0] ? 1 : -1);
  startRound();
}
function matchOver(w) {
  state = "over";
  const m = match, humanWon = w === 0, two = m.players === 2 && m.mode === "versus";
  const best = fighters.filter((f) => f.ctrl[0] === "p").reduce((a, f) => Math.max(a, f.maxCombo), 0);
  const hells = fighters.filter((f) => f.ctrl[0] === "p").reduce((a, f) => a + f.hells, 0);
  let title, note = "", next = null;
  if (two) title = w < 0 ? "Draw" : "Player " + (w + 1) + " wins";
  else title = humanWon ? "Victory" : w < 0 ? "Draw" : "Defeat";
  if (m.mode === "arcade") {
    if (humanWon && m.step + 1 < m.ladder.length) { note = "Next: " + ROSTER[m.ladder[m.step + 1]].name + " at " + STAGES[m.stages[m.step + 1]].name + "."; next = "Next fight"; }
    else if (humanWon) {
      title = "The akhada is yours";
      const first = !unlockedHidden; unlockedHidden = true; try { localStorage.setItem("akhada:legends", "1"); } catch (e) { /* ignore */ }
      note = first ? "Barbarik lowers his bow. He and his father Ghatotkacha bow to you, and both are yours to play." : "You beat Barbarik in the final fight.";
      if (first) { buildGrids(); Arcade.toast("Ghatotkacha and Barbarik have joined the akhada"); }
      next = "Play again";
    } else { note = "Fight " + (m.step + 1) + " of " + m.ladder.length + ". The ladder waits."; next = "Try again"; }
  } else next = "Rematch";
  if (m.online) { netMatchOver(w); return; }
  $("end-title").textContent = title;
  $("end-result").textContent = fighters.filter((f) => f.team === 0).map((f) => f.d.name).join(" and ") + " vs " + fighters.filter((f) => f.team === 1).map((f) => f.d.name).join(" and ");
  $("end-note").textContent = (note ? note + " " : "") + "Best combo " + best + " hits" + (hells ? ", " + hells + " Hell move" + (hells > 1 ? "s" : "") : "") + ".";
  $("continue").textContent = next; $("continue").dataset.win = humanWon ? "1" : "0";
  $("card-menu").hidden = true; $("card-end").hidden = false; $("overlay").hidden = false;
}
$("continue").addEventListener("click", () => {
  if ($("continue").dataset.online) {
    if (typeof NET === "undefined" || !NET.peer) return;
    if (NET.side === 1) { netSetReady(!NET.meSet); return; }   // the friend: Ready for a rematch
    if (NET.peerSet) { $("card-end").hidden = true; netStart(); }
    return;
  }
  if ($("continue").dataset.resume) { delete $("continue").dataset.resume; if (paused) togglePause(); return; }
  const m = match;
  if (m.mode === "arcade") {
    if ($("continue").dataset.win === "1") { if (m.step + 1 < m.ladder.length) m.step++; else { Object.assign(m, newLadder(m)); } }
  }
  $("card-end").hidden = true; startMatch(m);
});
$("again").addEventListener("click", () => { delete $("continue").dataset.resume; delete $("continue").dataset.online; $("continue").disabled = false; $("again").textContent = "Back to select"; NETON = false; if (typeof NET !== "undefined") NET.started = false; paused = false; $("card-end").hidden = true; $("card-menu").hidden = false; state = "menu"; demo(); if (typeof netUi === "function") netUi(); const b = document.querySelector(".pad .pause-btn"); if (b) b.textContent = "Pause"; });

function update() {
  tick++;
  for (const f of fighters) { f.px = f.x; f.py = f.y; f.pz = f.z; }
  for (const o of objs) { o.px = o.x; o.py = o.y; o.pz = o.z; }
  camPrev = cam;
  if (state === "loading") {
    loadT++;
    if (match.online) { netLoading(); return; }
    if ((artReady(match.list.map((s) => s.id)) && (IMG["st_" + stage.id] || failed.has("st_" + stage.id))) || loadT > 600) startRound();
    return;
  }
  if (state === "menu" || state === "over") { ambient(); for (const f of fighters) { f.walkPh += 0.02; } return; }
  if (paused) return;
  if (countdown > 0) { countdown--; return; }
  drawing++; ambient(); drawing--;
  if (state === "intro") { if (++introT >= 110) { state = "fight"; bossOpener(); } tickWorld(true); return; }
  if (cine) { if (++cine.t >= cine.len) { cine = null; for (const f of fighters) f.evq = []; } return; }
  if (hitstop > 0) { hitstop--; return; }
  if (slowmo > 0) { slowmo--; if (slowmo % 3) return; }
  tickWorld(false);
  if (state === "fight" && match.mode === "training") return;
  if (state === "fight") {
    if (++fightTicks % 60 === 0 && timer > 0 && --timer <= 0) {
      const pct = (t) => fighters.filter((f) => f.team === t).reduce((a, f) => a + f.hp / f.maxHp, 0);
      roundOver(pct(0) > pct(1) ? 0 : pct(1) > pct(0) ? 1 : -1); if (!NETON) sayAt(cam + LW / 2, 90, "Time", "#fff", true); return;
    }
    const a0 = teamAlive(0), a1 = teamAlive(1);
    if (!a0 || !a1) roundOver(a0 ? 0 : a1 ? 1 : -1);
  } else if (state === "ko") {
    if (++koT === 90) for (const f of fighters) if (alive(f) && f.team === roundWinner && grounded(f) && !busy(f)) setSt(f, "win");
    if (koT > 200) afterRound();
  }
}
function tickWorld(frozen) {
  for (const f of tick & 1 ? fighters.slice().reverse() : fighters) {
    if (frozen) { f.hold = { mx: 0, my: 0, D: false, charge: false }; f.evq = []; continue; }
    if (f.ctrl[0] === "p") readHuman(f);
    else if (f.ctrl === "dummy") f.hold = { mx: 0, my: 0, D: match.dummy === "block", charge: false };
    updateFighter(f);
  }
  if (frozen) return;
  separate();
  for (const o of objs) { o.t++; if (o.update) o.update(o); if (o.t >= o.life) o.life = 0; }
  for (const o of objs) if (o.life <= 0 && o.onDie && !o.died) { o.died = true; o.onDie(o); }
  // ice walls stop shots
  for (const w of objs) if (w.kind === "wall") for (const p of objs) if (p.kind === "shot" && p.team !== w.team && p.life > 0 && Math.abs(p.x - w.x) < 10 && Math.abs(p.y - w.y) < 14) { p.life = 0; w.hp -= p.dmg || 20; burst(w.x, w.y, p.z, "#bff2ff", 6); if (w.hp <= 0) w.life = 0; }
  objs = objs.filter((o) => o.life > 0 && o.t < o.life + 1);
  for (const p of parts) { p.x += p.vx || 0; p.z += p.vz || 0; if (p.g) p.vz -= p.g; p.life--; if (p.obj && p.rot != null) p.rot += 0.2; }
  parts = parts.filter((p) => p.life > 0 && (p.z == null || p.z > -4));
  for (const t of texts) { t.life--; t.y -= 0.35; }
  texts = texts.filter((t) => t.life > 0);
  if (shake > 0) shake *= 0.86; if (flashA > 0) flashA -= 0.04;
  if (tint && --tint.t <= 0) tint = null;
  for (const f of fighters) f.lag = f.lag > f.hp ? f.lag - Math.max(0.6, (f.lag - f.hp) * 0.04) : f.hp;
  // the camera follows the fight
  const live = fighters.filter((f) => !f.fx.sky);
  if (live.length) { const lo = Math.min(...live.map((f) => f.x)), hi = Math.max(...live.map((f) => f.x)); cam = lerp(cam, clamp((lo + hi) / 2 - LW / 2, 0, AW - LW), 0.12); }
}
function readHuman(f) {
  if (f.net) return netApply(f);   // online: both fighters are driven by the exchanged inputs
  const i = +f.ctrl[1], rev = f.fx.reverse ? -1 : 1;
  f.hold.mx = ((heldK(i, "right") ? 1 : 0) - (heldK(i, "left") ? 1 : 0)) * rev;
  f.hold.my = ((heldK(i, "down") ? 1 : 0) - (heldK(i, "up") ? 1 : 0)) * rev;
  f.hold.D = heldK(i, "D");
  f.touchInput = TOUCH && !document.documentElement.classList.contains("kbd");
  f.hold.chord = heldK(i, "A") && heldK(i, "J") && f.hold.D;
  f.hold.charge = heldK(i, "charge") || f.hold.chord;
  if (heldK(i, "run") && f.st === "walk" && f.hold.mx) startRun(f, Math.sign(f.hold.mx));
}

/* ---------- ambience ---------- */
let amb = [];
function ambient() {
  if (!stage) return;
  const kind = stage.amb;
  if (kind === "rain") { for (let i = 0; i < 3; i++) amb.push({ x: rand(-20, LW + 20), y: rand(-20, 0), vx: -1.2, vy: 6, life: 50, kind }); }
  else if (kind === "snow" && tick % 2 === 0) amb.push({ x: rand(-20, LW + 40), y: -4, vx: rand(-0.6, 0.2), vy: rand(0.4, 1), life: 260, kind });
  else if (kind === "sand" && tick % 2 === 0) amb.push({ x: LW + 10, y: rand(80, LH), vx: -rand(2, 4), vy: rand(-0.2, 0.2), life: 160, kind });
  else if (kind === "embers" && tick % 6 === 0) amb.push({ x: rand(0, LW), y: rand(130, LH), vx: rand(-0.2, 0.2), vy: -rand(0.2, 0.5), life: 140, kind });
  for (const a of amb) { a.x += a.vx; a.y += a.vy; a.life--; if (a.kind === "snow") a.x += Math.sin((tick + a.life) * 0.05) * 0.2; }
  amb = amb.filter((a) => a.life > 0 && a.y < LH + 10);
}
function drawAmbient() {
  g.save();
  if (stage && stage.amb === "rain") { g.strokeStyle = "rgba(200,230,240,0.35)"; g.lineWidth = 0.6; g.beginPath(); for (const a of amb) { g.moveTo(a.x, a.y); g.lineTo(a.x - 1.2, a.y + 6); } g.stroke(); }
  for (const a of amb) {
    if (a.kind === "rain") { if (a.y > 186 && Math.random() < 0.08) { g.fillStyle = "rgba(220,240,255,0.4)"; g.fillRect(a.x - 1, a.y, 2, 1); } }
    else if (a.kind === "snow") { g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(a.x, a.y, 1.2, 1.2); }
    else if (a.kind === "sand") { g.fillStyle = "rgba(240,200,140,0.35)"; g.fillRect(a.x, a.y, 3, 0.7); }
    else { g.fillStyle = "rgba(255,190,90," + (a.life / 140) + ")"; g.fillRect(a.x, a.y, 1.2, 1.2); }
  }
  g.restore();
}

/* ---------- drawing ---------- */
function poseOf(f) {
  if (f.fx.frozen > 0 || f.fx.stopped > 0) return f.lastPose || "m0";
  let p;
  switch (f.st) {
    case "idle": p = "m0"; break;
    case "walk": p = "w"; break;
    case "run": p = "w"; break;
    case "air": p = f.airAtk ? "m8" : "m7"; break;
    case "block": p = "p0"; break;
    case "charge": p = "p6"; break;
    case "hurt": case "held": p = "m9"; break;
    case "fall": p = f.vz > 0 && f.z > 10 ? "m9" : "m10"; break;
    case "down": case "ko": p = "m10"; break;
    case "getup": p = f.t > 9 ? "m10" : f.t > 4 ? "m9" : "m0"; break;
    case "win": p = f.t % 60 < 40 ? "p7" : "m11"; break;
    case "move": { const m = f.mv, q = m.pose; p = typeof q === "function" ? q(f, f.t) : Array.isArray(q) ? q.reduce((a, [t, r]) => (f.t >= t ? r : a), q[0][1]) : q || "m3"; break; }
    default: p = "m0";
  }
  // a fighter with its own stance art (Jatayu) swaps the shared poses for its own
  const look = f.wounded ? f.d.lookW : f.d.look;
  if (look && look[f.st] && !(f.st === "move" && f.code && f.code[0] !== "A")) { const q = look[f.st]; p = typeof q === "function" ? q(f, p) : q; }
  if (typeof p !== "string" || !p) p = "m0";
  f.lastPose = p; return p;
}
/* size fixes: the generated sheets were not all drawn at the same scale, so a fighter could grow or
   shrink between frames (Barbarik raising his bow, walking, falling). Each entry is a factor that
   puts a frame back to the size of that fighter's standing pose, measured by matching costume
   details (SIFT) between the frames; a one-letter key covers a whole sheet (w walk, x extra,
   s stance), a frame key ("x5") overrides it. Hit boxes do not change. */
const FRAME_SC = {
  barbarik: { w: 0.93, x: 1.09, x3: 1.12, x5: 1.14, x6: 1, x7: 1, p3: 0.93, m7: 1.08, m8: 1.04, m9: 1.15, m10: 1.18 },
  ox: { w: 0.95, m5: 1.1, m12: 0.9, p2: 1.07 },
  ashwatthama: { w: 1.06, m1: 1.08, m2: 1.12, p6: 0.85 },
  rai: { w: 1.06, m4: 1.08, p0: 1.1 },
  jatayu: { s: 0.93, v: 0.93, u: 0.88, m3: 1.06, m5: 1.08, m6: 1.1, p0: 0.93, p3: 0.9, p6: 0.94 },
  jogi: { m7: 1.1, m8: 1.1, m11: 1.07, p0: 1.1, p1: 1.07, p2: 1.15 },
  ghatotkacha: { m4: 1.09, p3: 0.91, p6: 0.91, p7: 0.9, x2: 1.06, x3: 1.12, x4: 0.94, x5: 1.15, x6: 1.08 },
  crane: { m5: 1.1, m11: 1.08, p1: 1.08 },
  meera: { m6: 1.12, m10: 1.15, p2: 1.09 },
  rook: { p0: 1.09 }, hima: { p2: 1.07, m10: 1.1 }, kai: { m9: 1.08 }
};
/* walking and running: each walk frame's anchor is the middle of the whole body, so the torso
   slid sideways as the legs moved, which read as shaking at running speed. These shifts (game px,
   measured on the head and torso of every walk frame) hold the torso steady. */
const WALK_DX = {
  kai: [-0.1, -0.5, 0.2, 0.8, -0.2, -0.8, 0.1, 0.7],
  rook: [-0.8, -1.9, 0.2, 0.5, -0.2, -2, 0.6, 0.7],
  crane: [0.5, -0.2, -0.2, 0.2, 0.8, -0.3, -0.3, 0.6],
  ox: [-0.2, -0.1, 0.3, 0.2, -0.4, -0.1, 0.5, 0.1],
  rollback: [-0.3, -0.7, 0.1, -0.2, -0.1, 0.1, 0.1, 0.5],
  surya: [-0, -0.8, -0.1, 0.1, 0, -0.8, 0.8, 0.3],
  hima: [0.1, -0.6, 0.1, 0.3, -0.1, -0.5, -0.2, 0.1],
  meera: [0.1, -0.2, -0.1, 0.2, 0.2, -0.4, -0.3, 0.2],
  ashwatthama: [0.1, -0.1, 0.4, -0.7, -0.2, 0.1, 0.2, -0.8],
  ghatotkacha: [0.3, 1.2, -0.5, -1.1, 1.1, 0.9, -0.3, -1],
  barbarik: [0.9, -0.1, -0.1, 0.3, 0.1, -0.3, -0.1, 0.2]
};
function walkShift(f, ref) { const t = WALK_DX[f.d.sheet]; if (!t || ref !== "w") return 0; const n = (FIGHTER_FRAMES[f.d.sheet + "_walk"] || []).length; return n ? (t[Math.floor(f.walkPh) % n] || 0) * f.face : 0; }
function frameScale(id, ref) { const t = FRAME_SC[id]; if (!t || typeof ref !== "string") return 1; return t[ref] != null ? t[ref] : t[ref[0]] != null ? t[ref[0]] : 1; }
// what each buff does, for the timers under the health bar and the line when it starts
const BUFF_INFO = {
  immortal: ["Immortal", "cannot be knocked out"], vow: ["Vow", "no flinch, heavier blows"], iron: ["Guard", "less damage, no flinch"],
  sun: ["Sun", "+35% damage, hits burn"], grow: ["Giant", "+40% damage, takes less"], charge: ["Charge", "next 3 hits stun"],
  rhythm: ["Rhythm", "faster attacks"], aim: ["Focus", "arrows home in, +40%"], wings: ["Wings", "faster"], regen: ["Regen", "healing"]
};
// effects put on a fighter by the other side, shown the same way
const FX_INFO = { stun: ["Stunned", "#fff38a"], frozen: ["Frozen", "#9fe6ff"], stopped: ["Paused", "#c9a96a"], slow: ["Slowed", "#e8c05a"],
  reverse: ["Charmed", "#b6ff9a"], blind: ["Blinded", "#fff6c0"], burn: ["Burning", "#ff7a2a"], poison: ["Poison", "#7fe07a"], mark: ["Marked", "#5aa8ff"] };
const BUFF_COL = { immortal: "#ffe9a8", vow: "#ffcf4a", iron: "#d39a5a", sun: "#ff8a3a", wings: "#ffb347", grow: "#9a6bff", regen: "#ffd36a", charge: "#fff38a", rhythm: "#c58aff", aim: "#5aa8ff" };
function drawFighter(f) {
  if (f.hide) return;
  const ref = poseOf(f), [sheet, fr] = frameOf(f, ref), im = IMG[sheet];
  if (!im || !fr) return;
  const hover = f.buff.wings > 0 && grounded(f) && ["idle", "walk", "run", "block", "charge"].includes(f.st) ? 12 + Math.sin(tick * 0.1) * 3 : 0;
  const x0 = f.x - cam + walkShift(f, ref) * f.sc, y = f.y - f.z - (f.bob || 0) - hover, flip = f.face < 0, sc = f.sc * frameScale(f.d.sheet, ref);
  const an = f.rot ? null : motion(f), x = x0 + (an ? an.dx * f.face : 0);
  g.save();
  // the motion pivots on the feet: lean, squash and stretch never move the hit boxes
  if (an) { g.translate(x, y); g.rotate(an.rot * f.face); g.scale(an.sx, an.sy); g.translate(-x, -y); }
  if (f.rot) { if (f.sc > 1.4) { g.translate(x, f.y - f.z); g.rotate(f.rot); g.translate(-x, -(f.y - f.z)); } else { const cy = y - bodyH(f) / 2; g.translate(x, cy); g.rotate(f.rot); g.translate(-x, -cy); } }
  // afterimages
  for (const a of f.after) { const [s2, fr2] = frameOf(f, a.ref), c = IMG[s2] && tinted(s2, fr2, f.d.col, "solid"); if (c) blitCanvas(c, fr2, a.x - cam + (x0 - x), a.y - a.z, a.face < 0, f.sc * frameScale(f.d.sheet, a.ref), a.a * 0.6); }
  // glow: Hell moves gold, buffs in their colour
  const hellOn = (f.st === "move" && f.mv && f.mv.hell) || (cine && cine.f === f) || f.st === "charge";
  const buff = Object.keys(BUFF_COL).find((k) => f.buff[k] > 0);
  const beat = f.beatOpen && tick <= f.beatOpen;
  if (hellOn || buff || beat) { const c = tinted(sheet, fr, beat ? "#ffffff" : f.st === "charge" ? "#5ab4ff" : hellOn ? "#ffd36a" : BUFF_COL[buff], "glow"); if (c) blitCanvas(c, fr, x, y, flip, sc, (hellOn || beat ? 0.55 : 0.42) + 0.2 * Math.sin(tick * 0.3)); }
  if (buff && !hellOn) {   // a ring of the buff's colour at the feet, and a few motes rising
    g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = BUFF_COL[buff]; g.globalAlpha = 0.5 + 0.3 * Math.sin(tick * 0.2); g.lineWidth = 1;
    g.beginPath(); g.ellipse(x, f.y - (f.bob || 0), bodyW(f) * 1.6, 3.2, 0, 0, Math.PI * 2); g.stroke(); g.restore();
    if (tick % 5 === 0) parts.push({ x: f.x + (Math.random() - 0.5) * bodyW(f) * 2, y: f.y, z: f.z + Math.random() * bodyH(f), vx: 0, vz: 0.6, life: 22, max: 22, col: BUFF_COL[buff], r: 1.6, add: true });
  }
  if (f.st === "charge") animDraw("aura", 0, x, y - bodyH(f) * 0.5, { frame: Math.floor(tick / 4), sc: bodyH(f) / 70, a: 0.9 });
  const blink = (f.st === "getup" || f.inv > 0 && f.st !== "move") && tick % 4 < 2;
  blit(im, fr, x, y, flip, sc, blink ? 0.5 : 1);
  let over = null;
  if (f.fx.frozen > 0) over = ["#9fe6ff", 0.75];
  else if (f.fx.stopped > 0) over = ["#c9a96a", 0.6];
  // a hit flashes white and fades fast; someone held in a combo only glints, so they never vanish
  else if (f.flash > 0) over = ["#ffffff", Math.min(f.flash / 8, 1) * (f.lockBy ? 0.3 : 0.6)];
  else if (f.fx.burn > 0 && tick % 10 < 4) over = ["#ff7a2a", 0.5];
  else if (f.fx.poison > 0 && tick % 14 < 5) over = ["#7fe07a", 0.45];
  if (over) { const c = tinted(sheet, fr, over[0], "solid"); if (c) blitCanvas(c, fr, x, y, flip, sc, over[1]); }
  g.restore();
  swoosh(f, x, y);
  if (f.fx.mark > 0) fxDraw("sigil", x, y - bodyH(f) - 10, { sc: 0.18, rot: tick * 0.05, a: 0.9 });
  if (f.fx.marma > 0 || (f.fx.stun > 0 && f.st === "hurt")) for (let i = 0; i < 3; i++) { const a = tick * 0.12 + i * 2.1; g.fillStyle = f.fx.marma ? "#ffe9a8" : "#fff38a"; g.fillRect(x + Math.cos(a) * 8, y - bodyH(f) - 4 + Math.sin(a) * 2, 2, 2); }
  if (beat && f.ctrl[0] === "p") text("Attack!", x, y - bodyH(f) - 14, 8, "#ffd36a", "center", "IBM Plex Sans", true);
  else if (f.ctrl[0] === "p" && alive(f) && match && match.mode === "training") comboTrail(f, x, y - bodyH(f) - 14);   // a learning aid: Training only
}
// what the player has entered so far: D → A, D ↑ J …, fading out if they stop
function comboTrail(f, x, y) {
  const recent = f.seq.filter((s) => tick - s.t < 30), i = recent.map((s) => s.k).lastIndexOf("D");
  if (i < 0 && !f.pend) return;
  const parts = i < 0 ? [] : recent.slice(i).map((s) => s.k === "D" ? "D" : s.k === "U" ? "↑" : s.k === "N" ? "↓" : s.dir === f.face ? "→" : "←");
  if (f.pend) parts.push("J");
  if (!parts.length) return;
  const age = i < 0 ? 0 : tick - recent[recent.length - 1].t;
  g.save(); g.globalAlpha = Math.max(0.2, 1 - age / 30); text(parts.join(" ") + (parts.length < 3 ? " …" : ""), x, y, 7, "#bfe0ff", "center", "IBM Plex Mono", true); g.restore();
}
/* procedural life on top of the sprite frames. rot is a lean in radians toward the facing
   direction, dx a forward shift in game px, sx/sy a squash or stretch about the feet. */
function motion(f) {
  const m = { rot: 0, dx: 0, sx: 1, sy: 1 }, ease = (k) => k * k * (3 - 2 * k);
  const sinceLand = tick - (f.landT || -99), sinceShot = tick - (f.kick || -99);
  switch (f.st) {
    case "idle": m.sy = 1 + 0.012 * Math.sin(tick * 0.07 + f.x * 0.1); break;
    case "walk": m.rot = 0.03; m.sy = 1 + 0.015 * Math.sin(f.walkPh * 1.6); break;
    case "run": m.rot = 0.1; m.dx = 2; m.sy = 1 + 0.012 * Math.sin(f.walkPh * Math.PI / 2); break;
    case "air": m.sy = 1 + clamp(f.vz * 0.012, -0.05, 0.07); m.sx = 2 - m.sy; m.rot = f.airAtk ? 0.18 : clamp(-f.vz * 0.015, -0.08, 0.08); break;
    case "block": m.rot = -0.05; m.sy = 0.97; m.sx = 1.03; if (f.t < 8) m.dx = -1; break;
    case "charge": m.sy = 1 + 0.02 * Math.sin(tick * 0.5); m.dx = Math.sin(tick * 1.7) * 0.5; break;
    case "hurt": m.rot = -0.14; m.dx = (hitstop > 0 ? Math.sin(tick * 2.5) : 0) - 1; break;
    case "held": m.rot = -0.1; m.dx = Math.sin(tick * 1.3) * 0.6; break;
    case "fall": m.rot = f.z > 4 ? clamp(-0.25 - f.vz * 0.04, -0.6, 0.1) : 0; break;
    case "getup": m.sy = 0.9 + 0.1 * Math.min(1, f.t / 14); break;
    case "win": m.sy = 1 + 0.02 * Math.sin(tick * 0.1); break;
    case "move": {
      const mv = f.mv, t = f.t, h = mv && mv.hit;
      if (mv && mv.hell) { const k = 1 + 0.02 * Math.sin(tick * 0.4); m.sx = m.sy = k; }
      if (h && h.from != null && !mv.spin) {
        // wind up, snap into the strike, then settle back
        if (t < h.from) m.rot = -0.07 * ease(t / Math.max(1, h.from));
        else if (t <= h.to + 2) { m.rot = 0.11; m.dx = 3; m.sx = 1.04; m.sy = 0.97; }
        else { const k = 1 - ease(Math.min(1, (t - h.to - 2) / Math.max(1, (mv.len || 20) - h.to - 2))); m.rot = 0.11 * k; m.dx = 3 * k; }
      } else if (mv && !mv.hell) {
        if (t < 7) m.rot = -0.05 * ease(t / 7);
        else m.rot = 0.04;
      }
      if (sinceShot < 10) { const k = 1 - sinceShot / 10; m.dx -= 3 * k; m.rot -= 0.08 * k; }
      break;
    }
  }
  if (sinceLand < 7 && (f.st === "idle" || f.st === "walk")) { const k = 1 - sinceLand / 7; m.sy *= 1 - 0.1 * k; m.sx *= 1 + 0.08 * k; }
  return m;
}
// a swing trail in front of a strike while its hit is live (basics, melee specials, the jump kick)
const SWING = { A0: 0.35, A1: -0.05, A2: -0.45, AR: 0.15 };
function swoosh(f, x, y) {
  let k = -1, rot = 0, reach = 34;
  if (f.st === "move" && f.mv && f.mv.hit && !f.mv.hell) {
    const h = f.mv.hit, span = h.to - h.from + 7; k = (f.t - h.from + 1) / span;
    rot = SWING[f.code] != null ? SWING[f.code] : 0.1; reach = (h.range ? h.range[1] : 34);
  } else if (f.st === "air" && f.airAtk) { k = (18 - f.airAtk) / 18; rot = 0.5; }
  if (k < 0 || k > 1) return;
  const r = Math.min(reach, 60) * f.sc;
  animDraw("swoosh", k, x + f.face * r * 0.55, y - bodyH(f) * 0.55, { sc: clamp(r / 60, 0.35, 0.8), flip: f.face < 0, rot: rot * f.face, a: 0.9 });
}
function drawShadow(f) {
  if (f.hide) return;
  const w = bodyW(f) * 1.5 * Math.max(0.5, 1 - f.z / 120);
  g.fillStyle = "rgba(0,0,0,0.28)"; g.beginPath(); g.ellipse(f.x - cam, f.y + 1, w, 2.6, 0, 0, Math.PI * 2); g.fill();
}
function text(s, x, y, size, col, align = "center", font = "IBM Plex Sans", bold) {
  g.font = (bold ? "600 " : "500 ") + size + "px " + font + ", sans-serif"; g.textAlign = align; g.textBaseline = "middle";
  g.fillStyle = "rgba(0,0,0,0.65)"; g.fillText(s, x + 0.6, y + 0.6); g.fillStyle = col; g.fillText(s, x, y);
}
function drawParts() {
  for (const p of parts) {
    const x = p.x - cam, y = p.y - p.z, a = p.life / p.max;
    if (p.obj) { objDraw(p.obj, x, y, { sc: p.sc, rot: p.rot, ay: 0.5, a: Math.min(1, a * 2) }); continue; }
    if (p.anim) { if (!animDraw(p.anim, 1 - a, x, y, { sc: p.sc || 1, rot: p.rot || 0, flip: p.flip })) fxDraw("burst", x, y, { sc: (p.sc || 1) * 0.3, a }); continue; }
    if (p.ring) { g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = a; g.strokeStyle = p.col; g.lineWidth = 1 + a; g.beginPath(); g.ellipse(x, y, p.ring * (1.6 - a), p.ring * (1.6 - a) * 0.8, 0, 0, Math.PI * 2); g.stroke(); g.restore(); continue; }
    g.save(); g.globalAlpha = a; if (p.add) g.globalCompositeOperation = "lighter";
    if (p.line) { g.strokeStyle = p.col; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x - p.vx * 2, y + p.vz * 2); g.stroke(); }
    else { g.fillStyle = p.col; const r = p.r * (p.soft ? 1 + (1 - a) : 1); g.fillRect(x - r / 2, y - r / 2, r, r); }
    g.restore();
  }
}
/* smooth motion: the game runs at 60 ticks a second, but screens refresh at 60, 90, 120 Hz and
   never quite on time. Each frame is drawn part of the way between the last two ticks (a = how
   far), then everything is put back, so drawing never changes the fight. A jump of more than a
   few steps (a teleport, a new round) is drawn as it is. */
let camPrev = 0;
function draw(a = 1) {
  drawing++;
  const keep = [], mix = (o) => {
    if (o.px == null) return;
    const dx = o.x - o.px, dy = o.y - o.py, dz = (o.z || 0) - (o.pz || 0);
    if (Math.abs(dx) > 24 || Math.abs(dy) > 24 || Math.abs(dz) > 40) return;
    keep.push([o, o.x, o.y, o.z]); o.x = o.px + dx * a; o.y = o.py + dy * a; if (o.z != null) o.z = (o.pz || 0) + dz * a;
  };
  const camNow = cam;
  if (a < 1 && !paused && !hitstop && !cine) { for (const f of fighters) mix(f); for (const o of objs) mix(o); if (Math.abs(cam - camPrev) < 24) cam = camPrev + (cam - camPrev) * a; }
  cam = Math.round(cam * 2) / 2;   // the camera on the same half-pixel grid the sprites snap to, so they never shimmer against the stage
  try { drawFrame(); } finally { for (const [o, x, y, z] of keep) { o.x = x; o.y = y; o.z = z; } cam = camNow; drawing--; }
}
function drawFrame() {
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0); g.imageSmoothingEnabled = false;
  g.fillStyle = "#14121a"; g.fillRect(0, 0, LW, LH);
  if (!stage) stage = STAGES[0];
  const sk = CALM ? Math.min(shake, 2) : shake, sx = sk > 0.4 ? rand(-sk, sk) : 0, sy = sk > 0.4 ? rand(-sk, sk) * 0.6 : 0;
  g.save(); g.translate(Math.round(sx), Math.round(sy));
  const bg = IMG["st_" + stage.id]; if (bg) g.drawImage(bg, cam * 2, 0, LW * 2, LH * 2, 0, 0, LW, LH);
  if (tint) { g.fillStyle = tint.col; g.fillRect(-10, -10, LW + 20, LH + 20); }
  if (cine) { g.fillStyle = "rgba(6,4,12," + Math.min(0.7, cine.t / 10) + ")"; g.fillRect(-10, -10, LW + 20, LH + 20); }
  // floor things first, then bodies and shots by depth, then what flies above
  for (const o of objs) if (o.kind !== "shot" && o.kind !== "fx" && o.draw && !o.sky) o.draw(o);
  for (const f of fighters) drawShadow(f);
  const cast = fighters.concat(objs.filter((o) => o.kind === "shot" || o.kind === "wall"));
  cast.sort((a, b) => a.y - b.y);
  for (const c of cast) { if (c.d) drawFighter(c); else if (c.kind === "wall") c.draw(c); else c.draw(c); }
  for (const o of objs) if (o.kind === "fx" && o.draw) o.draw(o);
  for (const f of fighters) if (f.st === "move" && f.mv && f.mv.drawFx) f.mv.drawFx(f, f.t);
  for (const f of fighters) if (f.zap && f.zap.t-- > 0) { g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "#fff38a"; g.lineWidth = 1; g.beginPath(); let px = f.zap.x1 - cam, py = f.zap.y - 30; g.moveTo(px, py); for (let i = 1; i <= 5; i++) { px = lerp(f.zap.x1, f.zap.x2, i / 5) - cam; g.lineTo(px, py + rand(-6, 6)); } g.stroke(); g.restore(); }
  drawParts();
  drawAmbient();
  for (const t of texts) { g.globalAlpha = Math.min(1, t.life / 20); text(t.msg, t.x - cam, t.y, t.big ? 9 : 7, t.col, "center", t.big ? "Newsreader" : "IBM Plex Sans", true); g.globalAlpha = 1; }
  g.restore();
  if (flashA > 0) { g.fillStyle = flashC; g.globalAlpha = Math.min(CALM ? 0.25 : 1, flashA); g.fillRect(0, 0, LW, LH); g.globalAlpha = 1; }
  drawGrade();
  if (state !== "menu" && state !== "loading") drawHud();
  if (cine) drawCine();
  if (state === "loading") { g.fillStyle = "rgba(10,8,14,0.6)"; g.fillRect(0, 0, LW, LH); text(match && match.online ? "Loading, waiting for your opponent" : "Loading", LW / 2, LH / 2, 9, "#f7f4ee"); }
  if (NETON) netDraw();
  if (state === "intro") {
    const k = introT;
    if (k < 70) text(match && match.mode === "training" ? "Training" : "Round " + round, LW / 2, LH / 2 - 10, 18, "#f7f4ee", "center", "Newsreader", true);
    else text("Fight!", LW / 2, LH / 2 - 10, 22 + (k - 70) * 0.1, "#f07ab8", "center", "Newsreader", true);
    if (k < 70) text(stage.name, LW / 2, LH / 2 + 10, 8, "#e8dcc8");
  }
  if (state === "ko" && koT < 120) text(roundWinner < 0 ? "Double K.O." : "K.O.", LW / 2, LH / 2 - 14, 26, "#f07ab8", "center", "Newsreader", true);
  if (paused) { g.fillStyle = "rgba(10,8,14,0.55)"; g.fillRect(0, 0, LW, LH); text(TOUCH && !document.documentElement.classList.contains("kbd") ? "Paused. Tap Resume" : "Paused. Press P to resume", LW / 2, LH / 2, 10, "#f7f4ee"); }
  else if (countdown > 0) text(String(Math.ceil(countdown / 30)), LW / 2, LH / 2, 22, "#f07ab8", "center", "Newsreader", true);
}
function drawCine() {
  const c = cine, k = Math.min(1, c.t / 8), out = c.t > c.len - 8 ? (c.len - c.t) / 8 : 1, f = c.f, left = f.team === 0;
  g.save(); g.globalAlpha = out;
  // a gold band with the fighter in the ultimate pose and the move's name
  const by = LH / 2 - 30, bw = LW * k;
  const gr = g.createLinearGradient(0, by, 0, by + 60); gr.addColorStop(0, "rgba(40,20,0,0)"); gr.addColorStop(0.5, "rgba(80,40,0,0.85)"); gr.addColorStop(1, "rgba(40,20,0,0)");
  g.fillStyle = gr; g.fillRect(left ? 0 : LW - bw, by, bw, 60);
  g.fillStyle = "rgba(255,211,106,0.9)"; g.fillRect(left ? 0 : LW - bw, by + 6, bw, 1); g.fillRect(left ? 0 : LW - bw, by + 53, bw, 1);
  // the fighter's portrait slides in, then the full-body ultimate pose behind the name
  const pf = FACE_FR[f.id], pim = IMG.faces, px = left ? 10 - (1 - k) * 60 : LW - 66 + (1 - k) * 60;
  if (pim && pf) { g.save(); g.translate(px + (left ? 0 : 56), by + 2); if (!left) g.scale(-1, 1); g.drawImage(pim, pf[0], pf[1], pf[2], pf[3], 0, 0, 56, 56); g.restore(); }
  const [sheet, fr] = frameOf(f, "p7"), im = IMG[sheet];
  if (im) { const sx = left ? LW - 50 + (1 - k) * 60 : 50 - (1 - k) * 60, gl = tinted(sheet, fr, "#ffd36a", "glow"); if (gl) blitCanvas(gl, fr, sx, by + 58, !left, 1, 0.6); blit(im, fr, sx, by + 58, !left, 1, 0.9); }
  const tx = left ? 74 : LW - 74;
  text(c.sub.toUpperCase(), tx, by + 16, 7, "#ffd36a", left ? "left" : "right", "IBM Plex Sans", true);
  text(c.name, tx, by + 32, 16, "#fff6dc", left ? "left" : "right", "Newsreader", true);
  text(f.d.name, tx, by + 46, 7, "#e8dcc8", left ? "left" : "right");
  g.restore();
}
function drawHud() {
  for (const team of [0, 1]) {
    const list = fighters.filter((f) => f.team === team), left = team === 0;
    list.forEach((f, i) => {
      const y0 = 6 + i * 24, x0 = left ? 6 : LW - 6, w = 128, dir = left ? 1 : -1, bx = left ? x0 + 20 : x0 - 20 - w;
      const face = FACE_FR[f.id], fim = IMG.faces;
      g.fillStyle = "rgba(10,8,14,0.6)"; g.fillRect(left ? x0 : x0 - 18, y0, 18, 18);
      if (fim && face) { g.save(); g.imageSmoothingEnabled = true; if (!left) { g.translate(x0 - 18 + 18, y0); g.scale(-1, 1); g.drawImage(fim, face[0], face[1], face[2], face[3], 0, 0, 18, 18); } else g.drawImage(fim, face[0], face[1], face[2], face[3], x0, y0, 18, 18); g.restore(); }
      text(f.d.name + (f.net ? (f.team === NET.side ? "  You" : "") : f.ctrl === "p0" ? "  P1" : f.ctrl === "p1" ? "  P2" : ""), left ? bx : bx + w, y0 + 2, 6.5, "#f7f4ee", left ? "left" : "right", "IBM Plex Sans", true);
      // HP with a lagging trail, then energy with the Hell marks
      g.fillStyle = "rgba(10,8,14,0.7)"; g.fillRect(bx - 1, y0 + 6, w + 2, 7);
      const hp = f.hp / f.maxHp, lag = f.lag / f.maxHp;
      g.fillStyle = "#f2e6c9"; g.fillRect(left ? bx : bx + w * (1 - lag), y0 + 7, w * lag, 5);
      g.fillStyle = hp > 0.3 ? "#e8443a" : "#ff8a3a"; g.fillRect(left ? bx : bx + w * (1 - hp), y0 + 7, w * hp, 5);
      g.fillStyle = "rgba(10,8,14,0.7)"; g.fillRect(bx - 1, y0 + 14, w + 2, 4);
      const mp = f.mp / 500, ready = f.mp >= f.d.moves.H1.mp;
      g.fillStyle = f.mpFlash > 0 && tick % 6 < 3 ? "#ffffff" : ready ? "#ffd36a" : "#4aa3ff"; g.fillRect(left ? bx : bx + w * (1 - mp), y0 + 15, w * mp, 2);
      g.fillStyle = "rgba(255,255,255,0.7)"; for (const m of [0.2, 0.4, 0.6, 0.8]) g.fillRect(left ? bx + w * m : bx + w * (1 - m), y0 + 14, 1, 4);
      if (ready && f.ctrl[0] === "p") text(f.mp >= f.d.moves.H2.mp && canAwaken(f) ? "AWAKENED" : "HELL", left ? bx + w + 4 : bx - 4, y0 + 16, 5.5, tick % 30 < 20 ? "#ffd36a" : "#fff6dc", left ? "left" : "right", "IBM Plex Sans", true);
      // active buffs: a coloured chip with a draining bar, so it is clear what is on and for how long
      let cx = left ? bx : bx + w;
      for (const k in BUFF_INFO) {
        const v = f.buff[k] || 0, mx = (f.buffMax || {})[k]; if (v <= 0 || !mx) continue;
        const label = BUFF_INFO[k][0], cw = 6 + label.length * 3.6, cx0 = left ? cx : cx - cw;
        g.fillStyle = "rgba(10,8,14,0.75)"; g.fillRect(cx0, y0 + 18, cw, 6);
        g.fillStyle = BUFF_COL[k] || "#fff"; g.fillRect(cx0, y0 + 23, cw * v / mx, 1);
        text(label, cx0 + cw / 2, y0 + 21, 4.6, BUFF_COL[k] || "#fff", "center", "IBM Plex Sans", true);
        cx += (cw + 2) * (left ? 1 : -1);
      }
      for (const k in FX_INFO) {   // debuffs: a dark chip with a coloured outline
        const v = f.fx[k] || 0, mx = (f.fxMax || {})[k]; if (v <= 0 || !mx) continue;
        const [label, col] = FX_INFO[k], cw = 6 + label.length * 3.6, cx0 = left ? cx : cx - cw;
        g.fillStyle = "rgba(40,6,10,0.85)"; g.fillRect(cx0, y0 + 18, cw, 6);
        g.strokeStyle = col; g.lineWidth = 0.6; g.strokeRect(cx0 + 0.3, y0 + 18.3, cw - 0.6, 5.4);
        g.fillStyle = col; g.fillRect(cx0, y0 + 23, cw * v / mx, 1);
        text(label, cx0 + cw / 2, y0 + 21, 4.6, col, "center", "IBM Plex Sans", true);
        cx += (cw + 2) * (left ? 1 : -1);
      }
      if (f.combo >= 3 && f.comboT > 0) text(f.combo + " hits", left ? 8 : LW - 8, 64 + i * 12, 9, "#ffd36a", left ? "left" : "right", "Newsreader", true);
    });
    for (let r = 0; r < 2; r++) { g.fillStyle = wins[team] > r ? "#ffd36a" : "rgba(255,255,255,0.25)"; g.fillRect(left ? 26 + r * 6 : LW - 30 - r * 6, 6 + fighters.filter((f) => f.team === team).length * 24 - 2, 4, 4); }
  }
  g.fillStyle = "rgba(10,8,14,0.65)"; g.fillRect(LW / 2 - 11, 5, 22, 15);
  const training = match && match.mode === "training";
  text(training ? "∞" : String(Math.max(0, timer)), LW / 2, 13, 10, !training && timer <= 10 ? "#ff8a3a" : "#f7f4ee", "center", "Newsreader", true);
  if (training) {
    const live = tick - train.last < 70 && train.hits;
    text(live ? train.hits + " hits, " + train.dmg + " damage" : "Training", LW / 2, 28, 7, live ? "#ffd36a" : "#e8dcc8", "center", "IBM Plex Sans", true);
    if (train.best) text("Best " + train.best, LW / 2, 37, 6, "#e8dcc8");
  }
  for (const f of fighters) if (f.fx.blind > 0 && f.ctrl[0] === "p") { const r = g.createRadialGradient(f.x - cam, f.y - 26, 20, f.x - cam, f.y - 26, 120); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,0.75)"); g.fillStyle = r; g.fillRect(0, 0, LW, LH); }
}
let gradeCanvas = null;
function drawGrade() {
  if (!gradeCanvas) {
    const c = document.createElement("canvas"); c.width = LW * SCALE; c.height = LH * SCALE;
    const x = c.getContext("2d");
    for (let y = 0; y < c.height; y += 2) { x.fillStyle = "rgba(0,0,0,0.06)"; x.fillRect(0, y + 1, c.width, 1); }
    const v = x.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.45, c.width / 2, c.height / 2, c.width * 0.62);
    v.addColorStop(0, "rgba(30,16,4,0)"); v.addColorStop(1, "rgba(20,10,2,0.38)"); x.fillStyle = v; x.fillRect(0, 0, c.width, c.height);
    gradeCanvas = c;
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(gradeCanvas, 0, 0); g.restore();
}

/* ---------- menu ---------- */
const cfg = { mode: "arcade", players: 1, lvl: 2, p1: "rai", p2: "jatayu", stage: -1, fair: true, dummy: "stand", infinite: true };
try { Object.assign(cfg, JSON.parse(localStorage.getItem("akhada:cfg") || "{}")); } catch (e) { /* ignore */ }
// settings saved by another version of the page are checked before use
cfg.lvl = [0, 1, 2].includes(cfg.lvl) ? cfg.lvl : 2;
cfg.stage = Number.isInteger(cfg.stage) && cfg.stage >= -1 && cfg.stage < STAGES.length ? cfg.stage : -1;
if (!["arcade", "versus", "team", "training", "online"].includes(cfg.mode)) cfg.mode = "arcade";
if (!["stand", "block", "cpu"].includes(cfg.dummy)) cfg.dummy = "stand";
if (![1, 2].includes(cfg.players)) cfg.players = 1;
cfg.fair = cfg.fair !== false; cfg.infinite = cfg.infinite !== false;
if (!ROSTER[cfg.p1]) cfg.p1 = "rai";
if (cfg.p2 !== "random" && !ROSTER[cfg.p2]) cfg.p2 = "jatayu";
function saveCfg() { try { localStorage.setItem("akhada:cfg", JSON.stringify({ mode: cfg.mode, players: cfg.players, lvl: cfg.lvl, p1: cfg.p1, p2: cfg.p2, stage: cfg.stage, fair: cfg.fair, dummy: cfg.dummy, infinite: cfg.infinite })); } catch (e) { /* ignore */ } }
function chips(el, items, cur, onPick) {
  el.innerHTML = "";
  for (const [val, label, face] of items) {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip" + (face ? " fchip" : ""); b.setAttribute("aria-pressed", String(val === cur));
    if (face) { const s = document.createElement("span"); s.className = "chip-face ak-face"; const fr = FACE_FR[face]; if (fr) s.style.backgroundPosition = -fr[0] * 22 / fr[2] + "px " + -fr[1] * 22 / fr[3] + "px"; b.appendChild(s); }
    b.appendChild(document.createTextNode(label));
    b.dataset.val = String(val);
    b.addEventListener("click", () => { const id = el.id; onPick(val); const again = document.querySelector("#" + id + " [data-val=\"" + String(val) + "\"]"); if (again) again.focus(); });
    el.appendChild(b);
  }
}
/* the character select: a portrait grid with a 1P cursor and a 2P / CPU cursor, the two picks
   large on either side. Mouse or touch: tap a portrait (tap a side panel to choose which side
   you are picking). Keyboard: WASD or arrows move, J or Enter picks, L goes back; with two
   players on the keyboard, player 2 uses the arrows and 1. */
const SEL = { side: 1, cur: [-1, -1], locked: [false, false] };
const online = () => cfg.mode === "online";
const needsP2 = () => !online() && (cfg.mode !== "arcade" || cfg.players === 2);
const twoKeys = () => cfg.players === 2 && ["versus", "team", "arcade"].includes(cfg.mode);
const selPool = () => online() ? roster().filter((id) => !ROSTER[id].hidden) : roster();
const selTiles = () => selPool().concat(needsP2() ? ["random"] : []);
function side2Tag() { return online() ? "Friend" : cfg.mode === "training" ? "Dummy" : cfg.players === 2 ? "2P" : cfg.mode === "team" ? "Partner" : "CPU"; }
function bigPortrait(el, id, flip) {
  if (!id || id === "random" || !FACE_FR[id]) { el.style.backgroundImage = "none"; el.textContent = id === "random" ? "?" : ""; return; }
  el.textContent = ""; el.style.backgroundImage = "";
  el.style.backgroundPosition = (FACE_FR[id][0] / 64) / (ORDER.length - 1) * 100 + "% 0";
}
function sideInfo(n, id) {
  bigPortrait($("big" + n), id);
  const d = ROSTER[id];
  $("name" + n).textContent = id === "random" ? "Random" : d ? d.name : "";
  $("el" + n).textContent = id === "random" ? "Anyone" : d ? d.el + (d.legend ? " · Legend" : d.hidden ? " · Overkill" : "") : "";
}
function buildGrids() {
  if (!roster().includes(cfg.p1) || (online() && ROSTER[cfg.p1].hidden)) cfg.p1 = "rai";
  if (cfg.p2 !== "random" && !roster().includes(cfg.p2)) cfg.p2 = "jatayu";
  chips($("modes"), [["arcade", "Arcade"], ["versus", "Versus"], ["team", "Team battle"], ["training", "Training"], ["online", "Online β"]], cfg.mode, (v) => { if (v !== "online" && typeof netClose === "function") netClose(); cfg.mode = v; SEL.side = 1; SEL.locked = [false, false]; SEL.cur = [-1, -1]; refresh(); });
  const training = cfg.mode === "training";
  chips($("dummy"), [["stand", "Stands still"], ["block", "Always blocks"], ["cpu", "Fights back"]], cfg.dummy, (v) => { cfg.dummy = v; refresh(); });
  chips($("chakra"), [[true, "Infinite chakra"], [false, "Charge it yourself"]], cfg.infinite, (v) => { cfg.infinite = v; refresh(); });
  $("trainwrap").hidden = !training; $("players").hidden = training || online();
  chips($("levels"), LEVELS.map((n, i) => [i, n]), cfg.lvl, (v) => { cfg.lvl = v; refresh(); });
  chips($("stages"), [[-1, "Random"]].concat(STAGES.map((s, i) => [i, s.name])), cfg.stage, (v) => { cfg.stage = v; refresh(); });
  chips($("rules"), [[true, "Fair fight"], [false, "Full power"]], cfg.fair, (v) => { cfg.fair = v; refresh(); });
  if (typeof MUSIC !== "undefined") chips($("music"), [[true, "On"], [false, "Off"]], MUSIC.on, (v) => { setMusic(v); buildGrids(); });
  $("levelwrap").hidden = online() || training && cfg.dummy !== "cpu" || (cfg.players === 2 && cfg.mode === "versus");
  $("rulewrap").hidden = cfg.mode === "arcade" || online();
  $("rulenote").textContent = online() ? "" : cfg.mode === "arcade" ? "Eight fights, then the last one. The final bosses fight at full power." : cfg.fair ? "Fair fight: everyone has the same health and power, and one Hell move can only do so much. Awakened moves wait for low health." : (unlockedHidden ? "Full power: Legends and the two who joined at the end" : "Full power: Legends") + " keep their extra health and power. Awakened moves always wait for low health.";
  for (const b of document.querySelectorAll("#players [data-players]")) b.setAttribute("aria-pressed", String(+b.dataset.players === cfg.players));
  $("stagewrap").hidden = cfg.mode === "arcade";
  // the grid
  const tiles = selTiles(), grid = $("grid"); grid.innerHTML = "";
  if (!needsP2()) SEL.side = 1;
  // the cursors start on the current picks
  if (SEL.cur[0] < 0 || SEL.cur[0] >= tiles.length) SEL.cur[0] = Math.max(0, tiles.indexOf(cfg.p1));
  if (SEL.cur[1] < 0 || SEL.cur[1] >= tiles.length) SEL.cur[1] = Math.max(0, tiles.indexOf(cfg.p2));
  tiles.forEach((id, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "ak-tile" + (id === "random" ? " random" : "");
    if (id !== "random") b.style.backgroundPosition = (FACE_FR[id][0] / 64) / (ORDER.length - 1) * 100 + "% 0"; else b.textContent = "?";
    b.setAttribute("aria-label", id === "random" ? "Random" : ROSTER[id].name);
    if (id === cfg.p1) b.classList.add("p1");
    if (needsP2() && id === cfg.p2) b.classList.add("p2");
    if (SEL.cur[0] === i && (SEL.side === 1 || twoKeys())) b.classList.add("cur1");
    if (needsP2() && SEL.cur[1] === i && (SEL.side === 2 || twoKeys())) { b.classList.add("cur2"); b.dataset.t2 = side2Tag(); }
    b.addEventListener("click", () => pickTile(i));
    grid.appendChild(b);
  });
  sideInfo(1, cfg.p1);
  const opp = online() ? (typeof NET !== "undefined" && NET.picks[1 - NET.side]) || null : cfg.p2;
  sideInfo(2, opp || "random");
  const mystery = (name, el) => { $("name2").textContent = name; $("el2").textContent = el; $("big2").textContent = "?"; $("big2").style.backgroundImage = "none"; };
  if (online() && !opp) mystery("Your friend", "Picks on their screen");
  if (cfg.mode === "arcade" && cfg.players === 1) mystery("9 challengers", "The Arcade ladder");
  $("tag2").textContent = side2Tag();
  $("side1").classList.toggle("active", SEL.side === 1 || twoKeys()); $("side2").classList.toggle("active", SEL.side === 2 || twoKeys());
  $("selhint").textContent = online() ? "Pick your fighter. Your friend picks theirs." : twoKeys() ? "Player 1: WASD and J. Player 2: arrows and 1. Then Fight." : needsP2() ? (SEL.side === 1 ? "Pick your fighter (J or Enter), then the " + ({ CPU: "CPU fighter", Dummy: "dummy", Partner: "partner" }[side2Tag()] || "other fighter") + "." : "Now pick the " + (cfg.mode === "training" ? "dummy" : side2Tag() === "CPU" ? "CPU fighter" : side2Tag().toLowerCase()) + ". L goes back.") : "Pick your fighter, then Fight.";
  $("start1").textContent = "Fight"; $("start1").disabled = false;
  if (typeof netUi === "function") netUi();
  moveList();
}
function pickTile(i) {
  const id = selTiles()[i]; if (!id) return;
  if (SEL.side === 2 && needsP2()) { cfg.p2 = id; SEL.cur[1] = i; SEL.locked[1] = true; }
  else if (id !== "random") {
    cfg.p1 = id; SEL.cur[0] = i; SEL.locked[0] = true;
    if (needsP2() && !twoKeys()) { SEL.side = 2; SEL.cur[1] = Math.max(0, selTiles().indexOf(cfg.p2)); }
    if (online() && typeof netSend === "function") { netSend({ k: "pick", id }); if (NET.side === 1) NET.meSet = false; }   // a new pick: press Ready again
  }
  refresh();
}
$("side1").addEventListener("click", () => { SEL.side = 1; refresh(); });
$("side2").addEventListener("click", () => { if (needsP2()) { SEL.side = 2; refresh(); } });
// keyboard on the select screen (only while it is on screen, so arrow keys still scroll the page otherwise)
function selVisible() { const r = $("card-menu").getBoundingClientRect(); return state === "menu" && !$("overlay").hidden && !$("card-menu").hidden && r.top < innerHeight * 0.75 && r.bottom > innerHeight * 0.25; }
addEventListener("keydown", (e) => {
  if (!selVisible() || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) return;
  const n = selTiles().length, cols = 7, mv = { KeyW: -cols, KeyS: cols, KeyA: -1, KeyD: 1, ArrowUp: -cols, ArrowDown: cols, ArrowLeft: -1, ArrowRight: 1 };
  const wasd = /^Key[WASD]$/.test(e.code), arrows = /^Arrow/.test(e.code);
  if (mv[e.code] != null) {
    const s = twoKeys() ? (arrows ? 2 : 1) : SEL.side, k = s - 1;
    if (twoKeys() || wasd || arrows) { SEL.cur[k] = (SEL.cur[k] + mv[e.code] + n) % n; e.preventDefault(); buildGrids(); }
    return;
  }
  const ok1 = e.code === "KeyJ" || (e.code === "Enter" && !["BUTTON", "A", "SUMMARY"].includes((document.activeElement || {}).tagName));
  const ok2 = twoKeys() && (e.code === "Digit1" || e.code === "Numpad1" || e.code === "Comma");
  if (ok2) { e.preventDefault(); const sv = SEL.side; SEL.side = 2; pickTile(SEL.cur[1]); SEL.side = sv; return; }
  if (ok1) {
    e.preventDefault();
    if (online()) { pickTile(SEL.cur[0]); if (!$("start1").disabled && e.code === "Enter") $("start1").click(); return; }
    const done = needsP2() ? (twoKeys() ? SEL.locked[0] && SEL.locked[1] : SEL.side === 2 && SEL.locked[1] && selTiles()[SEL.cur[1]] === cfg.p2) : SEL.locked[0] && selTiles()[SEL.cur[0]] === cfg.p1;
    if (done) { $("start1").click(); return; }
    if (twoKeys()) { const sv = SEL.side; SEL.side = 1; pickTile(SEL.cur[0]); SEL.side = sv; } else pickTile(SEL.cur[SEL.side - 1]);
    return;
  }
  if (e.code === "KeyL" || e.code === "Backspace") { if (SEL.side === 2 && !twoKeys()) { SEL.side = 1; SEL.locked[1] = false; buildGrids(); e.preventDefault(); } }
});
function refresh() { saveCfg(); buildGrids(); demo(); }
for (const b of document.querySelectorAll("#players [data-players]")) b.addEventListener("click", () => { cfg.players = +b.dataset.players; refresh(); });
function moveList() {
  const d = ROSTER[cfg.p1], m = d.moves, el = $("movelist");
  const row = (k, mv, pre = "", post = "") => "<li><b>" + k + "</b> " + pre + mv.name + post + " <span class='muted'>· " + mv.mp + "</span></li>";
  const anyHp = cfg.mode === "training";
  el.innerHTML = "<p class='small muted' style='margin:0 0 6px'>" + d.blurb + " The number is the chakra each move costs (the bar holds 500).</p><ul>" +
    row("D → A", m.DFA) + row("D ↓ A", m.DDA) + row("D ↑ A", m.DUA) + row("D → J", m.DFJ) + row("D ↓ J", m.DDJ) +
    row("Hell / D → J A", m.H1, "Hell move: ") + row("Hell (low HP) / D ↑ J A", m.H2, "Awakened: ", anyHp ? " (any HP)" : " (below 30% HP)") +
    (d.small ? row("J + A", d.small.QJ, "Quick: ") + row("A + D", d.small.QD, "Quick: ") : "") + row("Run, then D", { name: "Vanish", mp: VANISH_MP }) + "</ul>";
  $("movename").textContent = d.name + "'s moves";
}
// Arcade: eight fights (regular fighters, then Ashwatthama, Jatayu and Ghatotkacha), then Barbarik
const BOSS_STAGE = { ashwatthama: 3, jatayu: 1, ghatotkacha: 2, barbarik: 0 };
function newLadder(c) {
  const p2 = c.players === 2 ? c.p2 : null;   // only a second player's pick is taken out of the ladder
  const bosses = ["ashwatthama", "jatayu", "ghatotkacha"].filter((i) => i !== c.p1 && i !== p2);
  const pool = regular().filter((i) => i !== c.p1 && i !== p2), first = [];
  while (first.length < 8 - bosses.length && pool.length) first.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const ladder = first.concat(bosses, ["barbarik"]);
  return { ladder, stages: ladder.map((id, i) => BOSS_STAGE[id] != null ? BOSS_STAGE[id] : [0, 2, 1, 3][i % 4]), step: 0 };
}
$("start1").addEventListener("click", () => {
  if (online()) { if (typeof NET !== "undefined" && NET.ws && NET.side === 1) netSetReady(!NET.meSet); else if (typeof netStart === "function") netStart(); return; }
  if (TOUCH && !Arcade.isFullscreen()) Arcade.enterFullscreen();
  const c = Object.assign({}, cfg);
  if (c.p2 === "random") c.p2 = pick(roster().filter((i) => i !== c.p1 && !ROSTER[i].hidden));
  if (c.players === 2 && c.mode === "arcade" && c.p2 === c.p1) c.p2 = pick(regular().filter((i) => i !== c.p1));
  c.stage = c.stage < 0 ? Math.floor(Math.random() * STAGES.length) : c.stage;
  c.fair = c.mode !== "arcade" && cfg.fair;
  if (c.mode === "arcade") Object.assign(c, newLadder(c));
  // two players need the keyboard; a touch screen on its own plays one
  if (c.mode === "training" || (TOUCH && !document.documentElement.classList.contains("kbd"))) c.players = 1;
  train.hits = train.dmg = train.best = 0; train.last = -999;
  startMatch(c);
});
addEventListener("keydown", (e) => {
  if (e.code === "Enter" && state === "over" && !$("card-end").hidden && !$("continue").disabled && (document.activeElement || {}).tagName !== "BUTTON") { e.preventDefault(); $("continue").click(); }
});
// menu backdrop: the chosen stage with both fighters squaring up
function demo() {
  stage = STAGES[cfg.stage < 0 ? 0 : cfg.stage]; cam = (AW - LW) / 2; objs = []; parts = []; texts = []; cine = null; tint = null;
  const p2 = cfg.p2 === "random" ? "jatayu" : cfg.p2;
  fighterArt(cfg.p1); fighterArt(p2);
  fighters = [makeFighter(cfg.p1, 0, "demo", AW / 2 - 50, 182), makeFighter(p2, 1, "demo", AW / 2 + 50, 182)];
  for (const f of fighters) f.evq = [];
}

/* ---------- loop ---------- */
let hellLit = null;
function hellBtn() {
  const f = state === "fight" && (NETON ? fighters[NET.side] : human(0)), on = !!(f && f.mp >= f.d.moves.H1.mp);
  if (on !== hellLit) { hellLit = on; const b = $("hell-btn"); if (b) b.classList.toggle("ready", on); }
}
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  try {
    while (acc >= TICK) { if (NETON && !netStep()) { acc = Math.min(acc, TICK); break; } else if (!NETON) update(); acc -= TICK; }
    draw(Math.min(1, acc / TICK)); hellBtn();
  } catch (e) { acc = 0; console.error(e); }
  requestAnimationFrame(loop);
}
Arcade.setupFullscreen((on) => {
  if (NETON) return;   // an online fight runs in lockstep with the other player: no local pause
  if (!on && ["fight", "intro"].includes(state) && !paused) togglePause();
  if (on && ["fight", "intro"].includes(state) && !paused) countdown = 120;
});
buildGrids();
demo();
requestAnimationFrame(loop);
