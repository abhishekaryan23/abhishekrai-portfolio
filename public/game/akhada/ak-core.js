/* Akhada: a 2.5D power fighter. Core: constants, art loading, fighters,
   objects (projectiles, zones, summons), combat and effects. The roster
   (ak-roster.js) and the game (ak-game.js) build on these globals.

   The arena is a free 2.5D floor: x across, y is depth (the feet's screen
   row), z is height above the floor. Everything runs at 60 ticks a second
   on a 384x216 canvas scaled 2x. */
"use strict";

const LW = 384, LH = 216, SCALE = 2, TICK = 1000 / 60, AW = 504, Y1 = 206, GRAV = 0.34;
const canvas = document.getElementById("game"), g = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, k) => a + (b - a) * k;

let tick = 0, shake = 0, flashA = 0, flashC = "#fff", tint = null, slowmo = 0;
const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;   // calmer flashes and shake when asked for
let fighters = [], objs = [], parts = [], texts = [], stage = null, cam = 0, cine = null;
const train = { hits: 0, dmg: 0, best: 0, last: -999 };   // training mode: the current and best combo on the dummy

/* ---------- art ---------- */
const ART = "/game/akhada/sprites/", STREET_ART = "/game/street/sprites/fighters/", ART_V = 2, STREET_V = 8;
const FROM_STREET = new Set(["rai", "kai", "ox", "rook", "crane", "rollback"]);
const IMG = {}, asked = new Set(), failed = new Set();
function load(name, src) {
  if (asked.has(name)) return; asked.add(name);
  const im = new Image();
  im.onload = () => (IMG[name] = im); im.onerror = () => failed.add(name);
  im.src = src;
}
function sheetSrc(sheet) {
  const base = sheet.split("_")[0];
  if (FROM_STREET.has(base) && !sheet.endsWith("_pow")) return STREET_ART + sheet + ".png?v=" + STREET_V;
  return ART + "fighters/" + sheet + ".png?v=" + ART_V;
}
function fighterArt(id) {
  for (const s of [id, id + "_walk", id + "_pow"]) load(s, sheetSrc(s));
  if (FIGHTER_FRAMES[id + "_ext"]) load(id + "_ext", sheetSrc(id + "_ext"));
}
function artReady(ids) {
  return ids.every((id) => [id, id + "_walk", id + "_pow"].concat(FIGHTER_FRAMES[id + "_ext"] ? [id + "_ext"] : []).every((s) => IMG[s] || failed.has(s)));
}
load("fx", ART + "fx.webp?v=" + ART_V); load("obj", ART + "obj.png?v=" + ART_V); load("faces", ART + "portraits.png?v=" + ART_V);
for (const k of ["kite_b", "kite_m", "kite_o", "kite_y"]) load(k, "/game/street/sprites/" + k + ".png?v=" + STREET_V);

// a frame ref is "m3" (main sheet), "w" (walk, picked by phase), "p2" (powers sheet) or "x5" (extra sheet)
function frameOf(f, ref) {
  if (typeof ref !== "string" || !ref) ref = "m0";   // a missing pose never makes a fighter vanish
  const id = f.d.sheet, c = ref[0], i = +ref.slice(1) || 0;
  if (c === "w") { const fr = FIGHTER_FRAMES[id + "_walk"]; return fr ? [id + "_walk", fr[Math.floor(f.walkPh) % fr.length]] : [id, FIGHTER_FRAMES[id][1 + (Math.floor(f.walkPh / 2) % 2)]]; }
  const sheet = c === "p" ? id + "_pow" : c === "x" ? id + "_ext" : id;
  const fr = FIGHTER_FRAMES[sheet];
  if (!fr || !IMG[sheet]) return [id, FIGHTER_FRAMES[id][c === "m" ? Math.min(i, 11) : 0]];
  return [sheet, fr[Math.min(i, fr.length - 1)]];
}
// draw one atlas frame (2 atlas px per game px) with its anchor at (x, y)
function blit(im, fr, x, y, flip, sc = 1, alpha = 1) {
  const [sx, sy, w, h, ax, ay] = fr, k = sc / 2;
  g.save(); g.globalAlpha *= alpha; g.translate(Math.round(x * 2) / 2, Math.round(y * 2) / 2); if (flip) g.scale(-1, 1);
  g.drawImage(im, sx, sy, w, h, -ax * k, -ay * k, w * k, h * k);
  g.restore();
}
// glowing effects live on black in fx.webp (1 atlas px per game px) and are drawn additively
function fxDraw(name, x, y, o = {}) {
  const im = IMG.fx, fr = FX_FR[name]; if (!im || !fr) return;
  const [sx, sy, w, h] = fr, sc = o.sc || 1;
  g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = o.a == null ? 1 : o.a;
  g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1); if (o.sy) g.scale(1, o.sy);
  g.drawImage(im, sx, sy, w, h, -w * sc * (o.ax == null ? 0.5 : o.ax), -h * sc * (o.ay == null ? 0.5 : o.ay), w * sc, h * sc);
  g.restore();
}
// animated effects: 8-frame strips in fx.webp named "<name>_0" .. "<name>_7" (impact sparks,
// swooshes, explosions, the charging aura, lightning). k is progress 0..1, or pass o.frame to loop
const ANIM = { explosion: 8, impact: 8, swoosh: 8, aura: 8, lightning: 8 };
function animDraw(name, k, x, y, o = {}) {
  const n = ANIM[name]; if (!n) return false;
  const i = o.frame != null ? ((o.frame % n) + n) % n : Math.max(0, Math.min(n - 1, Math.floor(k * n)));
  if (!FX_FR[name + "_" + i]) return false;
  fxDraw(name + "_" + i, x, y, o); return true;
}
function explode(x, y, z, sc = 1) { parts.push({ x, y, z, vx: 0, vz: 0, life: 26, max: 26, anim: "explosion", sc }); }
// solid summons live on transparency in obj.png (2 atlas px per game px)
function objDraw(name, x, y, o = {}) {
  const im = IMG.obj, fr = OBJ_FR[name]; if (!im || !fr) return;
  const [sx, sy, w, h] = fr, sc = (o.sc || 1) / 2;
  g.save(); g.globalAlpha = o.a == null ? 1 : o.a;
  g.translate(Math.round(x * 2) / 2, Math.round(y * 2) / 2); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
  g.drawImage(im, sx, sy, w, h, -w * sc * (o.ax == null ? 0.5 : o.ax), -h * sc * (o.ay == null ? 1 : o.ay), w * sc, h * sc);
  g.restore();
}
// a tinted or glowing copy of a frame, cached (frozen ice, burn flash, hell aura)
const TINTS = new Map();
function tinted(sheet, fr, col, mode) {
  const key = sheet + fr[0] + "," + fr[1] + col + mode; let c = TINTS.get(key); if (c) return c;
  if (TINTS.size > 160) TINTS.delete(TINTS.keys().next().value);
  const im = IMG[sheet]; if (!im) return null;
  c = document.createElement("canvas"); c.width = fr[2] + 8; c.height = fr[3] + 8;
  const x = c.getContext("2d");
  if (mode === "glow") {
    const s = document.createElement("canvas"); s.width = c.width; s.height = c.height;
    const sx = s.getContext("2d"); sx.drawImage(im, fr[0], fr[1], fr[2], fr[3], 4, 4, fr[2], fr[3]);
    sx.globalCompositeOperation = "source-in"; sx.fillStyle = col; sx.fillRect(0, 0, s.width, s.height);
    for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) x.drawImage(s, dx, dy);
  } else {
    x.drawImage(im, fr[0], fr[1], fr[2], fr[3], 4, 4, fr[2], fr[3]);
    x.globalCompositeOperation = "source-atop"; x.globalAlpha = mode === "solid" ? 1 : 0.55; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  }
  TINTS.set(key, c); return c;
}
function blitCanvas(c, fr, x, y, flip, sc = 1, alpha = 1) {
  const k = sc / 2;
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); if (flip) g.scale(-1, 1);
  g.drawImage(c, -(fr[4] + 4) * k, -(fr[5] + 4) * k, c.width * k, c.height * k);
  g.restore();
}

/* ---------- sound (tiny synth from arcade.js) ----------
   Many-hit moves would otherwise fire dozens of tones in the same instant and buzz, so every
   sound goes through a limiter: each kind plays at most once per `gap` ms, and no more than
   four sounds start in any 120 ms. Square and sawtooth waves are kept short and quiet. */
const SND = { last: {}, recent: [], mute: false };
function play(key, gap, fn) {
  const now = performance.now();
  if (SND.mute || now - (SND.last[key] || -1e9) < gap) return;
  SND.recent = SND.recent.filter((t) => now - t < 120);
  if (SND.recent.length >= 4) return;
  SND.last[key] = now; SND.recent.push(now); fn();
}
const S = {
  hit: () => play("hit", 55, () => { Arcade.noise(0.04, 0.06); Arcade.tone(150, 0.05, "triangle", 0.035, -60); }),
  heavy: () => play("heavy", 90, () => { Arcade.noise(0.1, 0.09); Arcade.tone(90, 0.12, "triangle", 0.045, -40); }),
  block: () => play("block", 60, () => Arcade.tone(620, 0.04, "triangle", 0.03, -200)),
  swing: () => play("swing", 50, () => Arcade.noise(0.03, 0.025)),
  jump: () => play("jump", 80, () => Arcade.tone(300, 0.05, "triangle", 0.025, 200)),
  shot: () => play("shot", 90, () => Arcade.tone(520, 0.1, "triangle", 0.03, -300)),
  zap: () => play("zap", 110, () => { Arcade.tone(1100, 0.07, "square", 0.018, -800); Arcade.noise(0.05, 0.04); }),
  boom: () => play("boom", 160, () => { Arcade.noise(0.28, 0.12); Arcade.tone(60, 0.3, "triangle", 0.05, -30); }),
  power: () => play("power", 140, () => Arcade.tone(220, 0.26, "triangle", 0.035, 440)),
  hell: () => play("hell", 400, () => { Arcade.tone(110, 0.5, "triangle", 0.045, 330); Arcade.tone(165, 0.5, "triangle", 0.035, 440); }),
  beat: () => play("beat", 90, () => Arcade.tone(880, 0.06, "triangle", 0.035, 220)),
  ko: () => play("ko", 400, () => { Arcade.tone(200, 0.45, "triangle", 0.05, -150); Arcade.noise(0.35, 0.1); }),
  no: () => play("no", 200, () => Arcade.tone(140, 0.07, "triangle", 0.03, -40))
};

/* ---------- fighters ---------- */
let fighterN = 0;
function makeFighter(id, team, ctrl, x, y) {
  const d = ROSTER[id];
  return {
    uid: ++fighterN, id, d, team, ctrl, x, y, z: 0, vx: 0, vy: 0, vz: 0, face: team === 0 ? 1 : -1,
    hp: d.hp, maxHp: d.hp, lag: d.hp, mp: 150, st: "idle", t: 0, mv: null, code: null, hitSet: new Set(),
    combo: 0, comboT: 0, maxCombo: 0, juggle: 0, inv: 0, guard: 70, walkPh: 0, run: 0, flash: 0,
    fx: {}, buff: {}, seq: [], pend: null, lastTap: { left: -99, right: -99 }, idleT: 0, landT: 0,
    lockBy: null, lockT: 0, hist: [], after: [], cancel: 0, beatAt: -99, beats: 0, hells: 0, atkN: 0, atkEnd: -99,
    hold: { mx: 0, my: 0, D: false, charge: false }, ai: null, immune: {}, hellId: 0, stag: 0, stagT: 0, lastHit: -999, sc: 1, rot: 0, hide: false, msgT: 0
  };
}
const alive = (f) => f.st !== "ko" && f.hp > 0;
const foesOf = (f) => fighters.filter((o) => o.team !== f.team && alive(o));
function nearest(f, list = foesOf(f)) {
  let best = null, bd = 1e9;
  for (const o of list) { const d = Math.abs(o.x - f.x) + Math.abs(o.y - f.y) * 2; if (d < bd) { bd = d; best = o; } }
  return best;
}
const grounded = (f) => f.z <= 0.01;
const busy = (f) => !["idle", "walk", "run", "block"].includes(f.st);
function canAct(f) { return alive(f) && !f.lockBy && !f.fx.frozen && !f.fx.stopped && !f.fx.marma && ["idle", "walk", "run", "block"].includes(f.st); }
function setSt(f, st, t = 0) {
  if (f.st === "move" && st !== "move" && f.mv) leaveMove(f);
  f.st = st; f.t = t; if (st !== "move") { f.mv = null; f.code = null; }
}
// whatever ends a move (finishing, being hit, grabbed, countered, cancelled into another move)
// puts the fighter back to normal: size, tilt, visibility, and lets go of anyone it was holding
function leaveMove(f) {
  const m = f.mv; f.mv = null; f.code = null;
  if (m && m.end) m.end(f);
  const v = f.lockT0; f.lockT0 = null;
  if (v && v.lockBy === f) { v.lockBy = null; v.lockT = 0; if (v.st === "held") { if (alive(v)) knockdown(v, f.face * 1.5, 2); else knockdown(v, 0, 2); } }
  f.rot = 0; f.bob = 0; f.hide = false; f.fx.sky = 0; f.beatOpen = 0; f.landed = false;
  if (!f.buff.grow) f.sc = 1;
  f.beam = f.naag = f.redUp = f.mark = null; f.chains = 0; f.opener = false;
}
function stamp(f, n = 1) { for (let i = 0; i < n; i++) f.after.push({ x: f.x, y: f.y, z: f.z, face: f.face, ref: poseOf(f), a: 0.5 }); }

/* ---------- objects: projectiles, zones, summons ---------- */
// every object: { team, owner, x, y, z, life, t, update(o), draw(o) } plus whatever it needs
function add(o) {
  o.t = 0; o.hitAt = new Map();
  const f = o.owner;
  if (o.hellKey == null && f && f.st === "move" && f.mv && f.mv.hell) { o.hellKey = f.uid + ":" + f.hellId; o.awaken = f.code === "H2"; }
  objs.push(o); return o;
}
// Barbarik's opening arrow in the final fight: it flies to its target and always lands
function sureArrow(f, t, dmg, last) {
  const p = add({ team: f.team, owner: f, x: f.x + f.face * 16, y: f.y, z: 30, life: 200, kind: "fx", t0: tick,
    update: (p) => {
      const tx = t.x, ty = t.y, tz = t.z + bodyH(t) * 0.55, dx = tx - p.x, dy = ty - p.y, dz = tz - p.z, d = Math.hypot(dx, dy * 2, dz);
      p.ang = Math.atan2(-dz, Math.abs(dx)) * Math.sign(dx || 1); p.dir = Math.sign(dx) || 1;
      if (d < 9) {
        p.life = 0; t.hp = Math.max(1, t.hp - dmg); t.lastHit = tick; t.flash = 8; pop(t, "-" + dmg, "#7fc4ff", true);
        sparks(t.x, t.y, tz, "#bfe6ff", 10); burst(t.x, t.y, tz, "#7fc4ff", 8); shake = Math.max(shake, 5); S.heavy();
        if (last) { knockdown(t, p.dir * 2.4, 4.5); if (!CALM) slowmo = Math.max(slowmo, 14); }
        else if (alive(t) && !t.lockBy && !["fall", "down", "getup"].includes(t.st)) {
          if (grounded(t) && !t.fx.sky && !t.hide) { setSt(t, "hurt", 16); t.vx = p.dir * 1.2; } else knockdown(t, p.dir * 1.2, 1);
        }
        return;
      }
      const k = Math.min(1, 9 / d); p.x += dx * k; p.y += dy * k; p.z += dz * k;
      if (p.t % 2 === 0) parts.push({ x: p.x, y: p.y, z: p.z, vx: 0, vz: 0, life: 12, max: 12, col: "#7fc4ff", r: 2, add: true });
    },
    draw: (p) => fxDraw("arrowBlue", p.x - cam, p.y - p.z, { sc: 0.55, flip: p.dir < 0, rot: p.ang || 0 }) });
  return p;
}
// hit fighters in the object's area; each target at most once per o.every ticks (or once ever)
function areaHit(o, test, h) {
  if (!h.dmg) return 0;
  let n = 0;
  for (const f of fighters) {
    if (f.team === o.team || !alive(f) || f.inv > 0 || f.fx.sky) continue;
    if (!test(f)) continue;
    const last = o.hitAt.get(f);
    if (last != null && (!o.every || tick - last < o.every)) continue;
    o.hitAt.set(f, tick);
    hurt(f, h.dmg, Object.assign({ src: o.owner, fromX: o.x }, h)); n++;
  }
  return n;
}
const bodyH = (f) => f.d.h * f.sc, bodyW = (f) => f.d.w * f.sc;
const near = (o, f, rx, ry = 12, z0 = -999, z1 = 999) => Math.abs(f.x - o.x) < rx + bodyW(f) && Math.abs(f.y - o.y) < ry && f.z + bodyH(f) > z0 && f.z < z1;

// a projectile drawn from the fx (glow) or obj (solid) atlas
function shoot(f, o) {
  const dir = o.dir || f.face, p = add(Object.assign({
    team: f.team, owner: f, x: f.x + dir * (o.dx == null ? 18 : o.dx), y: f.y + (o.dy || 0), z: f.z + (o.z == null ? 26 : o.z),
    vx: dir * (o.spd || 4), vy: o.vy || 0, vz: o.vz || 0, grav: o.grav || 0, life: o.life || 140, dir,
    w: o.w || 10, h: o.h || 10, pierce: o.pierce || 1, power: o.power || 1, sc: o.sc || 1, kind: "shot"
  }, o));
  // note: o.z, when given, is the height above the floor, not above the shooter
  p.update = shotUpdate; p.draw = o.draw || shotDraw; f.kick = tick;
  return p;
}
function shotUpdate(p) {
  if (p.homing) {
    const t = nearest(p.owner, foesOf(p.owner).filter((f) => !f.fx.sky));
    if (t) { const want = Math.sign(t.x - p.x) || p.dir; p.vx = lerp(p.vx, want * Math.abs(p.spd || 4), p.homing); p.vy = lerp(p.vy, clamp(t.y - p.y, -1.2, 1.2), p.homing * 1.5); p.vz = lerp(p.vz, clamp(t.z + t.d.h / 2 - p.z, -2, 2), p.homing); p.dir = Math.sign(p.vx) || p.dir; }
  }
  if (p.boomerang && p.t === p.boomerang) { p.vx = -p.vx; p.dir = -p.dir; p.hitAt.clear(); }
  p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vz -= p.grav;
  if (p.trail && p.t % 2 === 0) parts.push({ x: p.x - p.dir * 6, y: p.y, z: p.z, vx: -p.dir * 0.3, vz: rand(-0.2, 0.3), life: 14, max: 14, col: p.trail, r: 2 });
  if (p.grav && p.z <= 0) { p.z = 0; if (p.onLand) p.onLand(p); p.life = 0; return; }
  if (p.ground) p.z = Math.max(p.z, 0);
  if (p.x < -40 || p.x > AW + 40) p.life = 0;
  // two shots from opposite sides meet: the stronger one survives
  for (const q of objs) {
    if (q === p || q.kind !== "shot" || q.team === p.team || q.life <= 0) continue;
    if (Math.abs(q.x - p.x) < 12 && Math.abs(q.y - p.y) < 10 && Math.abs(q.z - p.z) < 16) {
      burst(p.x, p.y, p.z, "#fff6d0", 10); S.zap();
      if (p.power > q.power) q.life = 0; else if (q.power > p.power) p.life = 0; else { p.life = 0; q.life = 0; }
    }
  }
  if (p.life <= 0) return;
  const hit = areaHit(p, (f) => near(p, f, p.w, 11, p.z - p.h, p.z + p.h) && !(p.ground && f.z > 8), p);
  if (hit) { if (p.onHit) p.onHit(p); if (!p.every) { p.pierce -= hit; if (p.pierce <= 0) p.life = 0; } }
}
function shotDraw(p) {
  const x = p.x - cam, y = p.y - p.z, wob = Math.sin(p.t * 0.5);
  if (p.obj) objDraw(p.obj, x, y + (p.objDy || 8) + (p.ground ? wob * 0.8 : 0), { sc: p.sc * (p.ground ? 1 + 0.04 * wob : 1), flip: p.dir < 0, rot: p.spin ? p.t * p.spin : p.ground ? wob * 0.05 : 0, ax: 0.5, ay: p.spin ? 0.5 : 1 });
  else fxDraw(p.fx, x, y, { sc: p.sc * (1 + 0.06 * Math.sin(p.t * 0.45)), flip: p.dir < 0, rot: p.spin ? p.t * p.spin : (p.vz && !p.homing ? -Math.atan2(p.vz, Math.abs(p.vx)) * p.dir : wob * 0.05) });
}
// a zone: an area that hurts what stands in it (fire trails, columns, waves, rings, clouds)
function zone(f, o) {
  const z = add(Object.assign({ team: f.team, owner: f, x: f.x, y: f.y, z: 0, life: 60, kind: "zone", every: 0 }, o));
  z.update = o.update || ((z) => { if (z.vx) z.x += z.vx; if (z.vy) z.y += z.vy; if (z.t >= (z.delay || 0) && (!z.until || z.t < z.until)) areaHit(z, z.test || ((t) => near(z, t, z.rx || 16, z.ry || 12, -999, z.top || (z.ground ? 12 : 999))), z); });
  return z;
}
// something falls from the sky (or rises from the floor) at a spot after a warning
function strike(f, x, y, o) {
  return zone(f, Object.assign({ x, y, life: (o.delay || 24) + (o.hold || 10), until: (o.delay || 24) + (o.hold || 10), rx: o.rx || 16, ry: o.ry || 14, draw: o.draw || null }, o, {
    update: (z) => {
      if (z.t === (z.delay || 24)) { if (z.onStrike) z.onStrike(z); shake = Math.max(shake, z.shake || 3); }
      if (z.t >= (z.delay || 24)) areaHit(z, (t) => near(z, t, z.rx, z.ry, -999, z.top || (z.ground ? 14 : 999)), z);
    }
  }));
}
function warnDraw(z) {   // a pulsing ring on the floor where something is about to land
  if (z.t >= (z.delay || 24)) return;
  const k = z.t / (z.delay || 24);
  g.save(); g.strokeStyle = z.warnCol || "rgba(255,80,60,0.85)"; g.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(z.t * 0.4)); g.lineWidth = 1;
  g.beginPath(); g.ellipse(z.x - cam, z.y, (z.rx || 16) * (1.4 - k * 0.4), 4, 0, 0, Math.PI * 2); g.stroke(); g.restore();
}

/* ---------- combat ---------- */
function inReach(f, t, h) {
  if (Math.abs(t.y - f.y) > (h.depth || 11)) return false;
  const dx = (t.x - f.x) * f.face, r = h.range || [4, 30];
  if (dx < r[0] - bodyW(t) || dx > r[1] * f.sc + bodyW(t)) return false;
  const zr = h.zr || [6, 44], lo = f.z + zr[0], hi = f.z + zr[1] * f.sc;
  return hi >= t.z && lo <= t.z + bodyH(t);
}
function melee(f, h) {
  let n = 0;
  for (const t of fighters) {
    if (t.team === f.team || !alive(t) || t.inv > 0 || f.hitSet.has(t) || t.fx.sky) continue;
    if (!inReach(f, t, h)) continue;
    f.hitSet.add(t); hurt(t, h.dmg, Object.assign({ src: f, fromX: f.x }, h)); n++;
  }
  return n;
}
// damage, block, reactions, status effects. o: { src, dmg-scale info, kx, kz, knock, stun, eff, dur, unblock, hell, fromX }
function hurt(t, dmg, o) {
  const src = o.src;
  if (!alive(t) || t.inv > 0 || t.st === "down" || t.st === "getup" || t.fx.sky || t.hide) return false;
  if (t.st === "move" && t.mv && t.mv.counter && t.t < t.mv.len - 6 && src && src !== t) { t.mv.counter(t, src); return false; }
  const dir = Math.sign(t.x - (o.fromX != null ? o.fromX : src ? src.x : t.x)) || -t.face;
  // combos lose punch the longer they run, so nothing loops forever
  if (src) { if (src.comboT <= 0) src.combo = 0; }
  const chain = src ? src.combo : 0;
  let k = Math.max(o.hell ? 0.55 : 0.35, 1 - chain * 0.07);
  if (src) {
    if (src.buff.sun) k *= 1.35; if (src.buff.grow) k *= 1.4; if (src.dmgMul) k *= src.dmgMul;
  }
  if (t.dmgTake) k *= t.dmgTake; if (t.buff.iron) k *= 0.75; if (t.buff.grow) k *= 0.8;
  dmg = Math.max(1, Math.round(dmg * k));
  // Narayanastra: only a fighter who lays down arms (holds Defend) is spared
  if (o.spareBlock && t.st === "block") { pop(t, "Spared", "#ffe9a8"); return false; }
  const facing = Math.sign((o.fromX != null ? o.fromX : src ? src.x : t.x) - t.x) === t.face || o.fromX == null;
  if (t.st === "block" && facing && !o.unblock && grounded(t)) {
    const chip = Math.round(dmg * (o.hell ? 0.35 : 0.1));
    t.hp = Math.max(1, t.hp - chip); t.guard -= dmg * 0.6; t.vx = dir * 1.6; t.t = Math.max(t.t, 8);
    S.block(); sparks(t.x - dir * 6, t.y, t.z + 30, "#cfe8ff", 5);
    if (src && src !== t && (t.x < 40 || t.x > AW - 40) && Math.abs(src.x - t.x) < 50 && grounded(src)) src.x = clamp(src.x - dir * 5, 12, AW - 12);
    t.mp = Math.min(500, t.mp + dmg * 0.2);
    if (t.guard <= 0) { t.guard = 70; setSt(t, "hurt", 50); pop(t, "Guard break", "#ffb0a0"); t.fx.stun = 50; }
    return false;
  }
  const shatter = t.fx.frozen > 0 && !t.fx.stopped;
  if (shatter) { dmg = Math.round(dmg * 1.15); t.fx.frozen = 0; burst(t.x, t.y, t.z + 26, "#bff2ff", 12); }
  // Hell moves: the Awakened move takes exactly 40% of the target's health in all (see endMove for the
  // top-up when it lands short) and adds no burn or poison on top; in a fair fight a Hell move takes at most 150
  const live = src && src.st === "move" && src.mv && src.mv.hell ? src.uid + ":" + src.hellId : null;
  const awaken = o.awaken != null ? o.awaken : !!(o.hell && src && src.code === "H2");
  if (o.hell && src && (awaken || src.fair)) {
    const key = o.hellKey || live || src.uid + ":" + src.hellId;
    const by = t.hellBy || (t.hellBy = {}), taken = by[key] || 0;   // one count per Hell move, so two never mix
    const cap = awaken ? Math.round(t.maxHp * AWAKEN_SHARE) : 150;
    // a leftover of an Awakened move that lands after the move has ended completes the 40% at once
    if (awaken && key !== live && taken < cap) dmg = cap - taken;
    dmg = Math.max(0, Math.min(dmg, cap - taken)); by[key] = taken + dmg;
    if (awaken && (o.eff === "burn" || o.eff === "poison")) o = Object.assign({}, o, { eff: null });
  }
  if (t.fx.stopped) { t.stoppedDmg = (t.stoppedDmg || 0) + dmg; t.stoppedKnock = t.stoppedKnock || o.knock; sparks(t.x, t.y, t.z + 30, "#e8c05a", 4); S.hit(); if (src) src.combo++; return true; }
  t.hp = Math.max(t.dummy ? 1 : 0, t.hp - dmg); t.lastHit = tick;   // a training dummy never goes down for good
  t.mp = Math.min(500, t.mp + dmg * 0.4);
  if (t.dummy && src && src.ctrl === "p0") { if (tick - train.last > 70) { train.hits = 0; train.dmg = 0; } train.hits++; train.dmg += dmg; train.last = tick; train.best = Math.max(train.best, train.dmg); }
  if (src) {
    src.mp = Math.min(500, src.mp + (o.hell ? 0 : dmg * 0.45)); src.combo++; src.comboT = 70; src.maxCombo = Math.max(src.maxCombo, src.combo);
    if (src.st === "move" && src.mv && !src.mv.hell) src.cancel = 22;   // a special that lands can cancel into a Hell move
    if (src.buff.charge && !o.hell) { o = Object.assign({}, o, { eff: "stun", dur: 26 }); if (--src.buff.chargeN <= 0) src.buff.charge = 0; }
    if (src.buff.sun && !o.eff && !(o.hell && awaken)) o = Object.assign({}, o, { eff: "burn", dur: 90 });
  }
  hitstopAt(o.hell ? 3 : dmg > 40 ? 5 : 3);
  (dmg > 35 ? S.heavy : S.hit)();
  sparks(t.x - dir * 4, t.y, t.z + (o.hz || 30), o.spark || "#fff2c0", dmg > 35 ? 9 : 5);
  if (dmg >= 14) parts.push({ x: t.x - dir * 4, y: t.y, z: t.z + (o.hz || 30), vx: 0, vz: 0, life: 10, max: 10, col: o.spark || "#fff2c0", ring: dmg > 35 ? 14 : 9 });
  parts.push({ x: t.x - dir * 6, y: t.y, z: t.z + (o.hz || 30), vx: 0, vz: 0, life: 14, max: 14, anim: "impact", sc: clamp(dmg / 70, 0.3, 0.75), rot: rand(-0.4, 0.4) });
  if (o.hell && (o.knock || t.hp <= 0) && dmg >= 40 && !CALM) slowmo = Math.max(slowmo, 12);
  if (dmg >= 18) shake = Math.max(shake, Math.min(6, dmg / 12));
  t.flash = 6; if (dmg >= 35) stamp(t);
  if (o.eff) status(t, o.eff, o.dur || 60, src);
  if (t.hp <= 0) { knockdown(t, dir * Math.max(2.4, o.kx || 2.4), Math.max(4, o.kz || 4)); return true; }
  const armored = (t.buff.iron || (t.st === "move" && t.mv && t.mv.armor) || t.d.heavyArmor && !t.fair && dmg < 26) && !o.hell;
  if (armored && !o.launch) { t.flash = 10; return true; }
  if (t.lockBy) return true;   // held in a Hell combo: the holder decides what happens
  if (o.knock || !grounded(t) || t.st === "fall") {
    t.juggle++;
    knockdown(t, dir * (o.kx == null ? 2.2 : o.kx), (o.kz == null ? 3.6 : o.kz) * (t.juggle > 5 ? 0.5 : 1));
    if (t.juggle > 7) t.inv = 40;
  } else {
    // stagger: the fourth hit in a row that does not knock down does, so nobody can be pinned forever
    t.stag = (t.stagT > 0 ? t.stag : 0) + 1; t.stagT = 45;
    const atWall = t.x < 40 || t.x > AW - 40;
    if (t.stag >= (atWall ? 3 : 4)) { knockdown(t, dir * 1.8, 3.2); pop(t, "Staggered", "#ffe0a0"); return true; }
    setSt(t, "hurt", Math.round((o.stun || 16) * (chain > 4 ? 0.7 : 1))); t.vx = dir * (o.push || 1.4);
    if (src && src !== t && (t.x < 40 || t.x > AW - 40) && Math.abs(src.x - t.x) < 50 && grounded(src)) src.x = clamp(src.x - dir * 7, 12, AW - 12);
  }
  return true;
}
function knockdown(t, vx, vz) {
  // already high in the air: a new hit carries them along rather than ever higher
  if (t.z > 50) vz = Math.min(vz, 1); else if (t.z > 25) vz = Math.min(vz, 3);
  setSt(t, "fall"); t.vx = vx; t.vz = vz; t.z = Math.max(t.z, 1); t.lockBy = null; t.stag = 0; t.airAtk = 0;
}
const CONTROL = new Set(["freeze", "stun", "marma", "stop", "reverse", "blind"]);
function status(t, eff, dur, src) {
  if (t.opener && eff !== "mark") return;
  // a control effect cannot be put straight back on: after it wears off there is a short grace
  if (CONTROL.has(eff)) { if (tick < (t.immune[eff] || 0)) return; t.immune[eff] = tick + dur + 80; }
  if (eff === "freeze") { t.fx.frozen = dur; burst(t.x, t.y, t.z + 26, "#bff2ff", 8); }
  else if (eff === "stun") { t.fx.stun = dur; if (grounded(t) && t.st !== "fall") setSt(t, "hurt", dur); }
  else if (eff === "marma") { t.fx.marma = dur; if (grounded(t) && t.st !== "fall") setSt(t, "hurt", dur); pop(t, "Marma", "#ffe9a8"); }
  else if (eff === "stop") { t.fx.stopped = dur; t.vx = t.vz = 0; }
  else if (eff === "reverse") { t.fx.reverse = dur; pop(t, "Charmed", "#b6ff9a"); }
  else if (eff === "blind") { t.fx.blind = dur; pop(t, "Blinded", "#fff6c0"); }
  else if (eff === "mark") { t.fx.mark = dur; }
  else t.fx[eff] = Math.max(t.fx[eff] || 0, dur);   // burn, poison, slow
}
let hitstop = 0;
const AWAKEN_SHARE = 0.4;   // an Awakened Hell move that lands takes 40% of the target's health
function hitstopAt(n) { hitstop = Math.max(hitstop, n); }

/* ---------- effects ---------- */
function sparks(x, y, z, col, n) {
  for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), s = rand(1, 3); parts.push({ x, y, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, life: 14, max: 14, col, r: 1.5, line: true }); }
}
function burst(x, y, z, col, n) {
  for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), s = rand(0.6, 2.6); parts.push({ x, y, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s + 0.6, g: 0.08, life: 26, max: 26, col, r: rand(1.5, 3) }); }
}
function dust(x, y, n = 6, col = "rgba(220,200,170,0.8)") {
  for (let i = 0; i < n; i++) parts.push({ x: x + rand(-8, 8), y, z: rand(0, 4), vx: rand(-1.2, 1.2), vz: rand(0.2, 1.2), life: 22, max: 22, col, r: rand(2, 4), soft: true });
}
function pop(f, msg, col = "#fff", big) { texts.push({ x: f.x, y: f.y - f.z - bodyH(f) - 12, msg, col, life: 60, big }); }
function sayAt(x, y, msg, col = "#fff", big) { texts.push({ x, y, msg, col, life: 70, big }); }
