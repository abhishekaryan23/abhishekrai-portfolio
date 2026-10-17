/* Akhada: the roster. Every fighter has five specials and two Hell moves:
     D→A, D↓A, D↑A, D→J, D↓J            (Defend, a direction, Attack or Jump)
     H1 = D→JA  Hell move               (400 chakra)
     H2 = D↑JA  Awakened Hell move      (500 chakra, below 30% HP for everyone,
                                         except in Training)
     (D→ or D↑ then the Hell key works too: I, Player 2 ' or 4, the touch pad's Hell)
     QJ, QD     quick moves             (Jump + Attack, Attack + Defend together; 30 chakra)
   The mp numbers written below are base prices; the loop at the end of the file
   sets the real chakra cost of every move.
   A move is { name, mp, len, pose, vel, hit, ev: { tick: fn }, tick, beats, ... }:
     pose  a frame ref ("m3", "p2", "x5"), a timeline [[tick, ref], ...] or fn(f, t)
     vel   fn(f, t) -> forward speed;  hit  a melee box live from..to (every n ticks)
     beats Hell ticks where tapping Attack in time adds a hit (the super combo)  */
"use strict";

const beatsAt = (...t) => t;
const tl = (...pairs) => pairs;
const foeNear = (f, r = 400) => { const t = nearest(f); return t && Math.abs(t.x - f.x) < r ? t : null; };
function lock(f, t, n) { if (!t || !alive(t) || t.st === "down" || t.st === "getup" || t.fx.sky || t.hide || t.lockBy || (t.st === "move" && t.mv && t.mv.hell)) return null; t.lockBy = f; t.lockT = n; setSt(t, "held"); t.vx = t.vz = 0; f.lockT0 = t; return t; }
function unlock(t, by) { if (t && (!by || t.lockBy === by)) { t.lockBy = null; t.lockT = 0; } }
function blink(f, x, y) { stamp(f, 2); burst(f.x, f.y, f.z + 26, f.d.col, 6); f.x = clamp(x, 12, AW - 12); if (y != null) f.y = clamp(y, stage.y0, Y1); burst(f.x, f.y, f.z + 26, f.d.col, 6); }
const faceTo = (f, t) => { if (t) f.face = Math.sign(t.x - f.x) || f.face; };
const hitT = (f, t, dmg, o = {}) => t && alive(t) && hurt(t, dmg, Object.assign({ src: f, fromX: f.x }, o));
function eachFoe(f, fn) { for (const t of foesOf(f)) fn(t); }
// a wing swoosh in front of a fighter (visual only)
function swooshAt(f, dx, sc, rot = 0.3, z = f.z + 30) { parts.push({ x: f.x + f.face * dx, y: f.y, z, vx: 0, vz: 0, life: 14, max: 14, anim: "swoosh", sc, rot: rot * f.face, flip: f.face < 0 }); }

/* drawing helpers for summons */
function columnDraw(colA, colB, w) {
  return (z) => {
    warnDraw(z); if (z.t < (z.delay || 24)) return;
    const k = 1 - (z.t - (z.delay || 24)) / (z.hold || 10), x = z.x - cam, ww = (w || 10) * (0.6 + k * 0.6);
    g.save(); g.globalCompositeOperation = "lighter";
    const gr = g.createLinearGradient(x - ww, 0, x + ww, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, colA); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.globalAlpha = Math.max(0, k); g.fillRect(x - ww, 0, ww * 2, z.y);
    g.fillStyle = colB; g.fillRect(x - ww * 0.2, 0, ww * 0.4, z.y); g.restore();
  };
}
function boltDraw(z) {
  warnDraw(z); if (z.t < (z.delay || 24)) return;
  const k = 1 - (z.t - (z.delay || 24)) / (z.hold || 10);
  if (!animDraw("lightning", 0, z.x - cam, z.y - 105 * (z.sc || 1), { frame: Math.floor((z.t - (z.delay || 24)) / 2) + 2, sc: z.sc || 1, a: Math.max(0.3, k) * 1.2 })) fxDraw("bolt", z.x - cam, z.y - 105 * (z.sc || 1), { sc: z.sc || 1, a: Math.max(0, k) * 1.2 });
}
function riseDraw(name, sc, solid) {
  return (z) => {
    warnDraw(z); if (z.t < (z.delay || 24)) return;
    const k = Math.min(1, (z.t - (z.delay || 24)) / 5), fade = z.life - z.t < 8 ? (z.life - z.t) / 8 : 1;
    if (solid) {
      g.save(); g.beginPath(); g.rect(z.x - cam - 80, 0, 160, z.y + 2); g.clip();
      objDraw(name, z.x - cam, z.y + (1 - k) * 60 * sc, { sc, a: fade, flip: z.flip }); g.restore();
    } else fxDraw(name, z.x - cam, z.y - 30 * sc * k, { sc: sc * (0.5 + k * 0.5), a: fade, ay: 0.7 });
  };
}
function fallDraw(name, sc, rot) {   // something drops from the sky onto a warning ring
  return (z) => {
    warnDraw(z); const d = z.delay || 24;
    if (z.t < d) { const k = z.t / d; fxDraw(name, z.x - cam - (1 - k) * 30 * (z.dir || 1), z.y - (1 - k) * 200, { sc, rot: rot || 0 }); }
    else if (z.t < d + 6) fxDraw("burst", z.x - cam, z.y - 8, { sc: 0.3, a: 1 - (z.t - d) / 6 });
  };
}
function ringDraw(z) {
  const r = z.r || 0;
  fxDraw("rings", z.x - cam, z.y - 2, { sc: r / 42, sy: 0.32, a: z.fade == null ? 1 : z.fade });
  fxDraw("rings", z.x - cam, z.y - 26, { sc: r / 60, a: 0.35 * (z.fade == null ? 1 : z.fade) });
}
// an expanding ring that hits what its edge passes over
function ring(f, x, y, o) {
  return zone(f, Object.assign({ x, y, life: o.grow || 20, r: 0 }, o, {
    update: (z) => {
      z.r = (o.max || 60) * Math.min(1, z.t / (o.grow || 20)); z.fade = 1 - z.t / (o.grow || 20);
      areaHit(z, (t) => { const d = Math.hypot((t.x - z.x), (t.y - z.y) * 2.4); return d < z.r + 10 && d > z.r - 18 && (!o.ground || t.z < 12); }, z);
    }, draw: o.draw || ringDraw
  }));
}
function flame(x, y, n = 2) { for (let i = 0; i < n; i++) parts.push({ x: x + rand(-4, 4), y, z: rand(0, 6), vx: rand(-0.3, 0.3), vz: rand(0.8, 1.8), life: 20, max: 20, col: pick(["#ffb347", "#ff6a2a", "#ffe28a"]), r: rand(2, 3.5), add: true }); }

/* ---------- the roster ---------- */
const ROSTER = {
  rai: { name: "Rai", sheet: "rai", hp: 500, spd: 1.35, w: 10, h: 50, col: "#8fd8ff", el: "Prana", blurb: "Street fighter from Chandni Lane. Spirit energy in his fists.",
    moves: {
      DFA: { name: "Prana Blast", mp: 60, len: 28, pose: tl([0, "p2"]), ev: { 9: (f) => { S.shot(); shoot(f, { fx: "prana", spd: 4.6, dmg: 48, kx: 2.4, kz: 3, knock: true, trail: "#9fe0ff", power: 2 }); } } },
      DDA: { name: "Rolling Kick", mp: 70, len: 42, pose: "m8", vel: (f, t) => t < 36 ? 3.4 : 0, tick: (f, t) => { f.rot = t < 38 ? t * 0.45 * f.face : 0; }, end: (f) => (f.rot = 0),
        hit: { from: 4, to: 36, every: 8, range: [-8, 30], zr: [0, 40], dmg: 15, kx: 1.4, kz: 2.4 }, ev: { 37: (f) => melee(f, { range: [-6, 30], dmg: 16, knock: true, kx: 3, kz: 4 }) } },
      DUA: { name: "Rising Dragon", mp: 60, len: 40, air: true, pose: "m4", ev: { 3: (f) => { f.vz = 6.2; S.power(); } }, tick: (f, t) => { if (t < 22) flame(f.x, f.y, 1); },
        hit: { from: 3, to: 20, range: [0, 26], zr: [0, 64], dmg: 48, kx: 1.4, kz: 5.5, knock: true, spark: "#9fe0ff" } },
      DFJ: { name: "Shoulder Dash", mp: 40, len: 24, pose: "p5", vel: (f, t) => t < 16 ? 5.2 - t * 0.2 : 0, hit: { from: 2, to: 16, range: [0, 28], dmg: 40, knock: true, kx: 3, kz: 3 } },
      DDJ: { name: "Prana Guard", mp: 100, len: 40, pose: "p6", tick: (f, t) => { if (t % 3 === 0) parts.push({ x: f.x + rand(-16, 16), y: f.y, z: rand(0, 50), vx: 0, vz: 0.8, life: 18, max: 18, col: "#9fe0ff", r: 2, add: true }); }, ev: { 20: (f) => { f.buff.iron = 300; pop(f, "Prana guard", "#9fe0ff"); S.power(); } } },
      H1: { name: "Garuda Strike", hell: true, mp: 250, len: 120, beats: beatsAt(36, 46, 56),
        pose: (f, t) => t < 12 ? "p7" : t < 32 ? "p5" : t < 64 ? ["m3", "m5", "m6", "m3"][Math.floor(t / 5) % 4] : t < 74 ? "m4" : "p7",
        tick: (f, t) => {
          if (t >= 12 && t < 32 && !f.lockT0) {
            const tg = foeNear(f, 320); if (!tg) return; faceTo(f, tg);
            f.x += f.face * 7; f.y = lerp(f.y, tg.y, 0.3); if (t % 2) stamp(f);
            if (Math.abs(tg.x - f.x) < 24 && Math.abs(tg.y - f.y) < 12) { lock(f, tg, 60); hitT(f, tg, 16, { hell: true }); }
          }
          if (f.lockT0 && [40, 50, 60].includes(t)) hitT(f, f.lockT0, 16, { hell: true });
          if (t === 66 && f.lockT0) { const tg = f.lockT0; unlock(tg, f); hitT(f, tg, 30, { hell: true, knock: true, kx: 0.8, kz: 7 }); f.lockT0 = null; }
          if (t === 74) {
            S.power(); const dir = f.face;
            const z = zone(f, { x: f.x - dir * 60, y: f.y, life: 90, vx: dir * 7, dmg: 70, knock: true, kx: dir * 3, kz: 6, hell: true, spark: "#ffd36a",
              draw: (z) => fxDraw("eagle", z.x - cam, z.y - 40, { sc: 1, flip: z.vx < 0 }) });
            z.test = (t2) => near(z, t2, 34, 40, -10, 120);
          }
        } },
      H2: { name: "Prana Nova", hell: true, mp: 350, len: 120, beats: beatsAt(30, 46, 62), pose: (f, t) => t < 74 ? "p3" : "p2",
        tick: (f, t) => {
          if (t < 74 && t % 2 === 0) { const a = rand(0, 6.28); parts.push({ x: f.x + Math.cos(a) * 40, y: f.y, z: 80 + Math.sin(a) * 30, vx: -Math.cos(a) * 1.6, vz: -Math.sin(a) * 1.2, life: 22, max: 22, col: "#bfefff", r: 2, add: true }); }
          if (t === 74) {
            S.boom(); const p = shoot(f, { fx: "sphere", spd: 2.4, z: 40, sc: 0.75 + f.beats * 0.08, w: 26, h: 28, every: 5, dmg: 10, hell: true, life: 150, kx: 1, kz: 1, stun: 20 });
            p.onDie = (p) => { zone(f, { x: p.x, y: p.y, life: 16, rx: 60, ry: 30, dmg: 60, knock: true, kz: 6, hell: true, hellKey: p.hellKey, awaken: p.awaken, draw: (z) => fxDraw("burst", z.x - cam, z.y - 30, { sc: 0.8, a: 1 - z.t / 16 }) }); explode(p.x, p.y, p.z, 1.1); shake = 8; S.boom(); };
          }
        }, drawFx: (f, t) => { if (t < 74) fxDraw("sphere", f.x - cam, f.y - f.z - 78, { sc: 0.15 + t / 74 * (0.6 + f.beats * 0.08), rot: t * 0.1 }); } }
    } },

  kai: { name: "Kai", sheet: "kai", hp: 500, spd: 1.45, w: 10, h: 50, col: "#ffe45a", el: "Lightning", blurb: "Fastest feet in the city. Calls the storm.",
    moves: {
      DFA: { name: "Bijli Bolt", mp: 50, len: 24, pose: "p2", ev: { 7: (f) => { S.zap(); shoot(f, { fx: "spark", spd: 6.8, dmg: 38, eff: "stun", dur: 28, trail: "#fff38a", power: 2 }); } } },
      DDA: { name: "Thunder Call", mp: 80, len: 34, pose: "p3", ev: { 10: (f) => { const t = nearest(f); if (!t) return; strike(f, t.x, t.y, { delay: 20, hold: 8, rx: 13, dmg: 62, eff: "stun", dur: 30, knock: true, kz: 4, spark: "#fff38a", draw: boltDraw, onStrike: S.zap }); } } },
      DUA: { name: "Lightning Kick", mp: 60, len: 40, air: true, pose: "m11", ev: { 3: (f) => { f.vz = 5.6; S.zap(); } }, tick: (f, t) => { if (t < 22 && t % 2) sparks(f.x, f.y, f.z + 30, "#fff38a", 1); },
        hit: { from: 3, to: 22, every: 6, range: [0, 30], zr: [0, 64], dmg: 16, kz: 3.5, knock: true, spark: "#fff38a" } },
      DFJ: { name: "Flash Step", mp: 50, len: 16, pose: "p1", inv: [0, 12], ev: { 2: (f) => { const t = foeNear(f, 300); if (!t) return; S.zap(); blink(f, t.x - t.face * 24, t.y); faceTo(f, t); } } },
      DDJ: { name: "Charge", mp: 60, len: 40, pose: "p6", tick: (f, t) => { if (t % 3 === 0) sparks(f.x, f.y, f.z + rand(10, 50), "#fff38a", 1); }, ev: { 20: (f) => { f.buff.charge = 600; f.buff.chargeN = 3; pop(f, "Charged", "#fff38a"); S.zap(); } } },
      H1: { name: "Indra's Storm", hell: true, mp: 250, len: 100, beats: beatsAt(40, 60, 80), pose: "p3",
        tick: (f, t) => {
          if (t >= 14 && t <= 74 && (t - 14) % 10 === 0) {
            const i = (t - 14) / 10, tg = nearest(f), x = i < 4 || !tg ? f.x + f.face * (34 + i * 46) : tg.x, y = i < 4 || !tg ? (tg ? tg.y : f.y) : tg.y;
            strike(f, x, y, { delay: 10, hold: 8, rx: 14, ry: 18, dmg: 36, eff: "stun", dur: 22, knock: i === 6, kz: 5, hell: true, spark: "#fff38a", draw: boltDraw, onStrike: S.zap });
          }
        }, beat: (f) => { const tg = nearest(f); if (tg) strike(f, tg.x, tg.y, { delay: 4, hold: 6, rx: 12, dmg: 22, eff: "stun", dur: 16, hell: true, draw: boltDraw, onStrike: S.zap }); } },
      H2: { name: "Vajra Rush", hell: true, mp: 350, len: 110, beats: beatsAt(40, 60, 80), pose: (f, t) => t < 94 ? "p5" : "p3",
        tick: (f, t) => {
          if (t >= 6 && t <= 24 && !f.lockT0) { const tg = foeNear(f, 280); if (tg) lock(f, tg, 100 - t); }
          const tg = f.lockT0 && f.lockT0.lockBy === f ? f.lockT0 : null;
          if (t >= 10 && t <= 86 && t % 6 === 4) {
            if (tg) { const side = (t / 6) % 2 < 1 ? 1 : -1, ox = f.x; blink(f, tg.x + side * 28, tg.y); faceTo(f, tg); f.zap = { x1: ox, x2: f.x, y: f.y, t: 6 }; hitT(f, tg, 13, { hell: true, spark: "#fff38a" }); S.zap(); }
            else { f.x = clamp(f.x + f.face * 30, 12, AW - 12); stamp(f); }
          }
          if (t === 94 && tg) { unlock(tg, f); strike(f, tg.x, tg.y, { delay: 2, hold: 10, rx: 16, dmg: 50, knock: true, kz: 6, hell: true, draw: boltDraw, onStrike: S.zap }); }
        } }
    } },

  rook: { name: "Raghav", sheet: "rook", hp: 500, spd: 1.4, w: 10, h: 52, col: "#e8eef8", el: "Kalari blade", blurb: "Kalaripayattu master. Knows every marma point in the body.",
    moves: {
      DFA: { name: "Urumi Lash", mp: 50, len: 30, pose: tl([0, "m4"], [8, "p2"]), hit: { from: 9, to: 14, range: [8, 78], zr: [10, 42], dmg: 31, knock: true, kx: 2.5, kz: 3, spark: "#e8eef8" },
        drawFx: (f, t) => { if (t < 8 || t > 16) return; const x = f.x - cam, y = f.y - f.z - 30; g.save(); g.strokeStyle = "rgba(235,242,255,0.9)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + f.face * 10, y); g.quadraticCurveTo(x + f.face * 50, y - 14 + (t - 8) * 3, x + f.face * 92, y + 4); g.stroke(); g.restore(); } },
      DDA: { name: "Marma Strike", mp: 70, len: 26, pose: "p5", vel: (f, t) => t < 10 ? 4 : 0, hit: { from: 3, to: 12, range: [0, 24], dmg: 24, eff: "marma", dur: 50 } },
      DUA: { name: "Leaping Tiger", mp: 50, len: 36, air: true, pose: "m8", ev: { 2: (f) => { f.vz = 5; } }, vel: (f, t) => t < 30 ? 3 : 0, hit: { from: 3, to: 26, range: [0, 28], zr: [0, 50], dmg: 40, knock: true } },
      DFJ: { name: "Tiger Pounce", mp: 40, len: 22, pose: "p5", vel: (f, t) => Math.max(0, 6 - t * 0.25), hit: { from: 2, to: 14, range: [0, 26], dmg: 30, knock: true, kx: 2.6 } },
      DDJ: { name: "Counter Stance", mp: 40, len: 46, pose: "p0",
        counter: (f, a) => { f.inv = 24; blink(f, a.x - a.face * 22, a.y); faceTo(f, a); setSt(f, "idle"); hitT(f, a, 46, { knock: true, kx: 3, kz: 4, unblock: true }); pop(f, "Counter", "#e8eef8"); } },
      H1: { name: "Hundred Marma", hell: true, mp: 250, len: 100, beats: beatsAt(40, 56, 72),
        pose: (f, t) => t > 84 ? "p2" : ["m3", "m5", "p5", "m6"][Math.floor(t / 4) % 4],
        tick: (f, t) => {
          if (t >= 2 && t <= 24 && !f.lockT0) { const tg = foeNear(f, 320); if (tg && lock(f, tg, 96 - t)) { blink(f, tg.x - tg.face * 20, tg.y); faceTo(f, tg); } }
          const tg = f.lockT0;
          if (tg && t >= 10 && t <= 80 && t % 4 === 2) { blink(f, tg.x + (t % 8 < 4 ? 1 : -1) * 20, tg.y); faceTo(f, tg); hitT(f, tg, 6, { hell: true, spark: "#e8eef8" }); }
          if (t === 88 && tg) { unlock(tg, f); hitT(f, tg, 40, { hell: true, knock: true, kx: 3, kz: 4, eff: "marma", dur: 45 }); }
        } },
      H2: { name: "Urumi Cyclone", hell: true, mp: 350, len: 110, armor: true, beats: beatsAt(40, 60, 80),
        pose: (f, t) => t % 8 < 4 ? "p7" : "m11", tick: (f, t) => {
          if (t % 4 === 0) f.face = -f.face;
          const tg = nearest(f); if (tg && t < 100) { f.x += Math.sign(tg.x - f.x) * 1.2; f.y = lerp(f.y, tg.y, 0.05); }
          if (t < 100 && t % 6 === 0) for (const o of foesOf(f)) { const d = Math.hypot(o.x - f.x, (o.y - f.y) * 2.4); if (d < 52 && o.inv <= 0) { o.x += Math.sign(f.x - o.x) * 2; hitT(f, o, 13, { hell: true, spark: "#e8eef8", fromX: f.x }); } }
          if (t === 104) eachFoe(f, (o) => { if (Math.hypot(o.x - f.x, (o.y - f.y) * 2.4) < 70) hitT(f, o, 40, { hell: true, knock: true, kz: 5, kx: 3 * Math.sign(o.x - f.x) }); });
        }, drawFx: (f, t) => { if (t < 104) for (let i = 0; i < 3; i++) fxDraw("urumi", f.x - cam + Math.cos(t * 0.3 + i * 2.1) * 30, f.y - f.z - 26 + Math.sin(t * 0.3 + i * 2.1) * 6, { sc: 0.45, rot: t * 0.3 + i, a: 0.85 }); } }
    } },

  crane: { name: "Cheel", sheet: "crane", hp: 500, spd: 1.45, w: 10, h: 50, col: "#ffb347", el: "Wind and kites", blurb: "Kite runner of the rooftops. Her manjha cuts glass.",
    moves: {
      DFA: { name: "Kite Swarm", mp: 60, len: 30, pose: "p2", ev: { 9: (f) => { S.shot(); for (let i = -1; i <= 1; i++) shoot(f, { kite: pick(["kite_o", "kite_m", "kite_y", "kite_b"]), spd: 3, vy: i * 0.5, z: 30 + i * 6, dmg: 12, homing: 0.04, life: 120, draw: kiteDraw }); } } },
      DDA: { name: "Manjha Wire", mp: 60, len: 26, pose: "p4", ev: { 12: (f) => { const z = zone(f, { x: f.x + f.face * 70, y: f.y, life: 240, every: 50, dmg: 18, knock: true, kx: 0.5, kz: 2.5, spark: "#fff", draw: wireDraw }); z.test = (t) => near(z, t, 40, 6) && t.z < 6; } } },
      DUA: { name: "Updraft", mp: 50, len: 34, air: true, pose: "p3", ev: { 6: (f) => { f.vz = 4.5; zone(f, { x: f.x, y: f.y, life: 26, rx: 34, ry: 14, dmg: 30, knock: true, kz: 6.5, kx: 0.4, draw: (z) => fxDraw("tornado", z.x - cam, z.y - 40, { sc: 0.45, a: 1 - z.t / 26 }) }); } } },
      DFJ: { name: "Glide", mp: 30, len: 50, air: true, grav: 0.12, pose: "m8", ev: { 1: (f) => { f.vz = 4.2; } }, vel: () => 3.2, hit: { from: 4, to: 44, range: [0, 28], zr: [0, 44], dmg: 26, knock: true } },
      DDJ: { name: "Gust", mp: 50, len: 30, pose: "p2", ev: { 8: (f) => {
        zone(f, { x: f.x + f.face * 50, y: f.y, life: 10, rx: 60, ry: 22, dmg: 8, knock: true, kx: f.face * 4.5, kz: 1.5 });
        for (const o of objs) if (o.kind === "shot" && o.team !== f.team && Math.abs(o.x - f.x) < 100 && Math.abs(o.y - f.y) < 24) { o.vx = -o.vx; o.dir = -o.dir; o.team = f.team; o.owner = f; o.hitAt.clear(); }
        for (let i = 0; i < 14; i++) parts.push({ x: f.x + f.face * rand(10, 30), y: f.y + rand(-10, 10), z: rand(5, 50), vx: f.face * rand(3, 6), vz: 0, life: 16, max: 16, col: "rgba(230,240,255,0.8)", r: 1, line: true }); } } },
      H1: { name: "Thousand Kites", hell: true, mp: 250, len: 110, beats: beatsAt(40, 60, 80), pose: "p3",
        tick: (f, t) => { if (t >= 15 && t <= 95 && t % 5 === 0) diveKite(f, t > 80); },
        beat: (f) => { for (let i = 0; i < 3; i++) diveKite(f, false); } },
      H2: { name: "Manjha Web", hell: true, mp: 350, len: 104, beats: beatsAt(30, 50, 70), pose: (f, t) => t < 80 ? "p7" : "p4",
        tick: (f, t) => {
          if (t >= 10 && t <= 40 && t % 6 === 4) { const tg = pick(foesOf(f)); if (tg) webLine(f, tg); }
          if (t === 80) { S.boom(); flashA = 0.5; flashC = "#fff"; }
        }, beat: (f) => { const tg = nearest(f); if (tg) webLine(f, tg); } }
    } },

  ox: { name: "Bhola", sheet: "ox", hp: 560, spd: 1.05, w: 13, h: 54, col: "#d39a5a", el: "Earth", blurb: "Pehelwan of the old akhada. Moves mountains, slowly.",
    moves: {
      DFA: { name: "Boulder Toss", mp: 60, len: 40, pose: tl([0, "p3"], [20, "p2"]), drawFx: (f, t) => { if (t < 20) objDraw("boulder", f.x - cam, f.y - f.z - 52, { sc: 0.7 }); },
        ev: { 20: (f) => { S.swing(); shoot(f, { obj: "boulder", sc: 0.7, spd: 3.2, vz: 1.2, grav: 0.16, z: 40, dmg: 52, knock: true, kz: 4, w: 12, h: 12, spin: 0.2, power: 3,
          onLand: (p) => { dust(p.x, p.y, 10); explode(p.x, p.y, 8, 0.45); shake = 5; zone(p.owner, { x: p.x, y: p.y, life: 6, rx: 22, ry: 12, dmg: 20, knock: true, ground: true }); } }); } } },
      DDA: { name: "Ground Slam", mp: 70, len: 40, pose: tl([0, "p3"], [12, "p4"]), ev: { 14: (f) => { shake = 6; S.heavy(); for (const d of [-1, 1]) { const z = zone(f, { x: f.x + d * 14, y: f.y, vx: d * 3.6, life: 50, dmg: 40, knock: true, kz: 3, draw: (z) => { objDraw("spire", z.x - cam, z.y + 2, { sc: 0.3 + 0.1 * Math.sin(z.t), a: 1 - z.t / 50 }); if (z.t % 3 === 0) dust(z.x, z.y, 1); } }); z.test = (t) => near(z, t, 10, 10) && t.z < 8; } } } },
      DUA: { name: "Rock Pillar", mp: 60, len: 36, pose: "p4", ev: { 12: (f) => strike(f, f.x + f.face * 44, f.y, { delay: 6, hold: 16, rx: 14, top: 22, dmg: 50, knock: true, kz: 6.5, draw: riseDraw("spire", 0.7, true), onStrike: () => S.heavy() }) } },
      DFJ: { name: "Bull Rush", mp: 50, len: 38, armor: true, pose: "m11", vel: (f, t) => t < 32 ? 4.6 : 0, tick: (f, t) => { if (t % 4 === 0 && t < 32) dust(f.x - f.face * 10, f.y, 2); }, hit: { from: 3, to: 32, range: [0, 30], dmg: 40, knock: true, kx: 3.5 } },
      DDJ: { name: "Iron Body", mp: 80, len: 40, pose: "p6", ev: { 20: (f) => { f.buff.iron = 420; pop(f, "Iron body", "#d39a5a"); S.power(); } } },
      H1: { name: "Bhookamp", hell: true, mp: 250, len: 110, beats: beatsAt(40, 62, 84),
        pose: (f, t) => [20, 42, 64].some((s) => t >= s && t < s + 10) ? "p4" : "p3",
        tick: (f, t) => { if ([20, 42, 64].includes(t)) { shake = 9; S.boom(); const tg = nearest(f); for (let i = 0; i < 5; i++) strike(f, f.x + f.face * (30 + i * 40), tg ? lerp(f.y, tg.y, i / 4) : f.y, { delay: 4 + i * 5, hold: 14, rx: 14, ry: 16, ground: true, dmg: 26, knock: true, kz: 5, hell: true, draw: riseDraw("spire", 0.8, true) }); } },
        beat: (f) => { const tg = nearest(f); if (tg) strike(f, tg.x, tg.y, { delay: 3, hold: 12, rx: 12, ground: true, dmg: 20, knock: true, kz: 4, hell: true, draw: riseDraw("spire", 0.7, true) }); } },
      H2: { name: "Pehelwan's Pride", hell: true, mp: 350, len: 130, armor: true, beats: beatsAt(52, 82, 112),
        pose: (f, t) => t < 30 ? "p5" : [[30, 50], [60, 80], [90, 110]].some(([a, b]) => t >= a && t < b) ? "p3" : "p4",
        vel: (f, t) => t < 30 && !f.lockT0 ? 5 : 0,
        tick: (f, t) => {
          if (t < 30 && !f.lockT0) { const tg = foeNear(f, 60); if (tg && Math.abs(tg.x - f.x) < 26 && Math.abs(tg.y - f.y) < 12 && lock(f, tg, 130)) S.heavy(); }
          const tg = f.lockT0; if (!tg || tg.lockBy !== f || !alive(tg)) return;
          const lifting = [[30, 50, 50], [60, 80, 50], [90, 110, 70]].find(([a, b]) => t >= a && t < b);
          if (lifting) { tg.x = f.x; tg.y = f.y + 1; tg.z = lerp(tg.z, lifting[2], 0.25); }
          if (t === 50 || t === 80) { tg.z = 0; hitT(f, tg, 40, { hell: true }); shake = 8; dust(f.x, f.y, 10); S.heavy(); }
          if (t === 110) { tg.z = 0; unlock(tg, f); hitT(f, tg, 70, { hell: true, knock: true, kz: 5, kx: f.face * 2 }); shake = 12; dust(f.x, f.y, 18); S.boom(); }
        } }
    } },

  rollback: { name: "Mr. Rollback", sheet: "rollback", hp: 520, spd: 1.25, w: 11, h: 54, col: "#e8c05a", el: "Time", blurb: "Ranjit. He can undo the last few seconds. He usually does.",
    moves: {
      DFA: { name: "Clock Blade", mp: 50, len: 30, pose: "p2", ev: { 9: (f) => { S.shot(); shoot(f, { obj: "clockhand", sc: 0.7, spd: 4, spin: 0.4, boomerang: 40, life: 82, pierce: 3, dmg: 26, objDy: 0 }); } } },
      DDA: { name: "Freeze Frame", mp: 90, len: 34, pose: "p2", ev: { 12: (f) => { const t = foeNear(f, 170); if (t && Math.abs(t.y - f.y) < 30) { status(t, "stop", 55); pop(t, "Paused", "#e8c05a"); S.power(); } else S.no(); } } },
      DUA: { name: "Rewind Kick", mp: 50, len: 34, air: true, pose: "m6", ev: { 2: (f) => { f.vz = 5; } }, tick: (f, t) => { if (t % 3 === 0) stamp(f); }, hit: { from: 2, to: 20, range: [0, 30], zr: [0, 60], dmg: 40, knock: true } },
      DFJ: { name: "Rewind", mp: 80, len: 20, pose: "p6", ev: { 4: (f) => { const p = f.hist[0]; if (!p) return; stamp(f, 3); f.x = p.x; f.y = p.y; const back = clamp(p.hp - f.hp, 0, 90); if (back > 0) { f.hp += back; pop(f, "+" + back, "#e8c05a"); } tint = { col: "rgba(150,110,50,0.25)", t: 20 }; S.power(); } } },
      DDJ: { name: "Slow Field", mp: 70, len: 30, pose: "p3", ev: { 12: (f) => { eachFoe(f, (t) => { if (Math.abs(t.x - f.x) < 150) { status(t, "slow", 240); pop(t, "Slowed", "#e8c05a"); } }); ring(f, f.x, f.y, { max: 150, grow: 24, dmg: 0 }); } } },
      H1: { name: "Total Rollback", hell: true, mp: 250, len: 120, beats: beatsAt(44, 60, 76),
        pose: (f, t) => t < 20 ? "p3" : t < 70 ? ["m3", "m5", "m6", "p5"][Math.floor(t / 8) % 4] : "p7",
        tick: (f, t) => {
          if (t === 8) { tint = { col: "rgba(150,110,50,0.38)", t: 100, sepia: true }; eachFoe(f, (o) => status(o, "stop", 100)); S.power(); }
          if (t === 20) { const tg = nearest(f); if (tg) { blink(f, tg.x - tg.face * 20, tg.y); faceTo(f, tg); } }
          if (t >= 28 && t <= 60 && (t - 28) % 8 === 0) { const tg = nearest(f); if (tg) { if (Math.abs(tg.x - f.x) > 30) blink(f, tg.x + (t % 16 ? 20 : -20), tg.y); faceTo(f, tg); hitT(f, tg, 26, { hell: true, knock: t === 60 }); } }
        } },
      H2: { name: "Final Commit", hell: true, mp: 350, len: 120, beats: beatsAt(50, 70, 90), pose: "p3",
        tick: (f, t) => {
          if ([40, 60, 80].includes(t)) eachFoe(f, (o) => strike(f, o.x, o.y, { delay: 10, hold: 6, rx: 14, dmg: 48, knock: t === 80, kz: 5, hell: true, draw: (z) => { warnDraw(z); if (z.t >= 10) fxDraw("clock", z.x - cam, z.y - 30, { sc: 0.35, a: 1 - (z.t - 10) / 6, rot: z.t }); }, onStrike: S.zap }));
          if (t === 100) { const h = Math.round(f.maxHp * 0.12); f.hp = Math.min(f.maxHp, f.hp + h); pop(f, "+" + h, "#e8c05a"); }
        }, drawFx: (f, t) => { if (t < 100) fxDraw("clock", LW / 2, 60, { sc: Math.min(1, t / 20) * 0.9, a: 0.7, rot: 0 }); } }
    } },

  surya: { name: "Surya", sheet: "surya", hp: 500, spd: 1.35, w: 10, h: 52, col: "#ff8a3a", el: "Fire and sun", blurb: "Rajput guard of the desert fort. Carries the sun in his palms.",
    moves: {
      DFA: { name: "Agni Ball", mp: 60, len: 28, pose: "p2", ev: { 9: (f) => { S.shot(); shoot(f, { fx: "fireball", spd: 4.2, dmg: 40, eff: "burn", dur: 120, knock: true, kz: 2.5, trail: "#ffb050", power: 2 }); } } },
      DDA: { name: "Fire Trail", mp: 60, len: 30, pose: "p5", vel: (f, t) => t < 20 ? 4 : 0,
        tick: (f, t) => { if (t < 20 && t % 3 === 0) zone(f, { x: f.x, y: f.y, life: 200, rx: 8, ry: 7, ground: true, every: 30, dmg: 6, eff: "burn", dur: 60, draw: (z) => { if (z.t % 2 === 0) flame(z.x, z.y, 1); } }); } },
      DUA: { name: "Flame Pillar", mp: 60, len: 34, pose: "p3", ev: { 10: (f) => strike(f, f.x + f.face * 40, f.y, { delay: 8, hold: 18, rx: 13, dmg: 44, knock: true, kz: 5.5, eff: "burn", dur: 90, draw: columnDraw("rgba(255,140,40,0.8)", "rgba(255,240,180,0.9)", 12), onStrike: S.boom }) } },
      DFJ: { name: "Blaze Dash", mp: 40, len: 22, pose: "p5", vel: () => 5.5, tick: (f) => flame(f.x - f.face * 8, f.y, 2), hit: { from: 2, to: 15, range: [0, 26], dmg: 34, knock: true, eff: "burn", dur: 60 } },
      DDJ: { name: "Sun Charge", mp: 70, len: 40, pose: "p6", tick: (f) => flame(f.x, f.y, 1), ev: { 20: (f) => { f.buff.sun = 420; pop(f, "Sun charged", "#ff8a3a"); S.power(); } } },
      H1: { name: "Surya Grahan", hell: true, mp: 250, len: 120, beats: beatsAt(70, 85, 100), pose: "p3",
        tick: (f, t) => {
          if (t === 1) tint = { col: "rgba(20,10,40,0.45)", t: 110 };
          const tg = nearest(f);
          if (t === 50) { S.boom(); f.beam = { x: tg ? tg.x : f.x + f.face * 80, w: 18 }; }
          if (f.beam && t >= 50 && t < 104) {
            if (tg) f.beam.x = lerp(f.beam.x, tg.x, 0.04);
            if (t % 4 === 0) for (const o of foesOf(f)) if (Math.abs(o.x - f.beam.x) < f.beam.w + o.d.w) hitT(f, o, 9, { hell: true, eff: "burn", dur: 80, fromX: f.beam.x, spark: "#ffe28a" });
            flame(f.beam.x + rand(-f.beam.w, f.beam.w), stage.y0 + rand(0, 50), 2);
          }
          if (t === 104) f.beam = null;
        }, beat: (f) => { if (f.beam) { f.beam.w += 6; for (const o of foesOf(f)) if (Math.abs(o.x - f.beam.x) < f.beam.w + o.d.w) hitT(f, o, 20, { hell: true, fromX: f.beam.x }); } },
        drawFx: (f, t) => {
          const bx = f.beam ? f.beam.x : (nearest(f) || f).x;
          fxDraw("eclipse", bx - cam, 28, { sc: Math.min(1, t / 40) * 0.55 });
          if (f.beam) { const x = f.beam.x - cam, w = f.beam.w * (1 + Math.sin(t) * 0.08); g.save(); g.globalCompositeOperation = "lighter"; const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, "rgba(255,120,30,0)"); gr.addColorStop(0.5, "rgba(255,230,150,0.95)"); gr.addColorStop(1, "rgba(255,120,30,0)"); g.fillStyle = gr; g.fillRect(x - w, 40, w * 2, LH); g.restore(); }
        } },
      H2: { name: "Agni Varsha", hell: true, mp: 350, len: 120, beats: beatsAt(40, 60, 80), pose: "p7",
        tick: (f, t) => { if (t === 1) tint = { col: "rgba(120,30,0,0.3)", t: 110 }; if (t >= 10 && t <= 100 && t % 6 === 4) meteor(f); }, beat: (f) => { meteor(f); meteor(f); } }
    } },

  hima: { name: "Hima", sheet: "hima", hp: 500, spd: 1.35, w: 10, h: 50, col: "#9fe6ff", el: "Ice", blurb: "From a village above the clouds. Winter listens to her.",
    moves: {
      DFA: { name: "Frost Shard", mp: 60, len: 26, pose: "p2", ev: { 8: (f) => { S.shot(); shoot(f, { fx: "iceshard", spd: 5, dmg: 30, eff: "freeze", dur: 45, trail: "#bff2ff", power: 2 }); } } },
      DDA: { name: "Ice Spikes", mp: 70, len: 34, pose: "p4", ev: { 10: (f) => { [28, 56, 84].forEach((d, i) => strike(f, f.x + f.face * d, f.y, { delay: 2 + i * 6, hold: 12, rx: 12, top: 18, dmg: 28, knock: true, kz: 4.5, draw: riseDraw("crystals", 0.45) })); S.shot(); } } },
      DUA: { name: "Ice Column", mp: 60, len: 30, pose: "p3", ev: { 8: (f) => strike(f, f.x, f.y, { delay: 2, hold: 14, rx: 30, dmg: 36, knock: true, kz: 6, eff: "freeze", dur: 30, draw: riseDraw("crystals", 0.8) }) } },
      DFJ: { name: "Ice Slide", mp: 40, len: 26, pose: "p5", vel: (f, t) => Math.max(0, 5.4 - t * 0.2), tick: (f, t) => { if (t % 2) parts.push({ x: f.x, y: f.y, z: 1, vx: 0, vz: 0.4, life: 18, max: 18, col: "#dff8ff", r: 2 }); }, hit: { from: 2, to: 18, range: [0, 26], zr: [0, 20], dmg: 28, knock: true, kx: 1, kz: 4 } },
      DDJ: { name: "Ice Wall", mp: 70, len: 24, pose: "p2", ev: { 8: (f) => { add({ team: f.team, owner: f, x: f.x + f.face * 34, y: f.y, z: 0, life: 360, hp: 80, kind: "wall", update: () => {}, draw: (o) => objDraw("icewall", o.x - cam, o.y + 2, { sc: 0.75, a: o.life < 30 ? o.life / 30 : 1 }) }); S.shot(); } } },
      H1: { name: "Himalaya Avalanche", hell: true, mp: 250, len: 90, beats: beatsAt(40, 55, 70), pose: "p3",
        tick: (f, t) => { if (t === 20) { S.boom(); zone(f, { x: f.x - f.face * 30, y: (stage.y0 + Y1) / 2, vx: f.face * 4.2, life: 140, rx: 30, ry: 60, dmg: 105, knock: true, kz: 5, eff: "freeze", dur: 40, hell: true,
          draw: (z) => { objDraw("snowwave", z.x - cam, Y1 + 4, { sc: 1.5, flip: z.vx < 0 }); if (z.t % 2 === 0) parts.push({ x: z.x + rand(-30, 30), y: rand(stage.y0, Y1), z: rand(10, 70), vx: z.vx * 0.6, vz: rand(-0.5, 1), life: 20, max: 20, col: "#eefaff", r: 2 }); } }); } },
        beat: (f) => { const tg = nearest(f); if (tg) strike(f, tg.x, tg.y, { delay: 4, hold: 8, rx: 10, top: 18, dmg: 18, eff: "freeze", dur: 20, hell: true, draw: riseDraw("crystals", 0.4) }); } },
      H2: { name: "Eternal Winter", hell: true, mp: 350, len: 130, beats: beatsAt(40, 65, 90), pose: "p7",
        tick: (f, t) => {
          if (t === 10) { tint = { col: "rgba(190,235,255,0.35)", t: 110 }; eachFoe(f, (o) => status(o, "freeze", 110)); S.shot(); }
          if (t % 2 === 0) parts.push({ x: cam + rand(0, LW), y: rand(stage.y0, Y1), z: rand(60, 140), vx: rand(-0.5, 0.5), vz: -1, life: 60, max: 60, col: "#ffffff", r: 1.5 });
          if (t === 112) { S.boom(); flashA = 0.6; flashC = "#dff8ff"; eachFoe(f, (o) => { o.fx.frozen = 0; hitT(f, o, 150 + f.beats * 10, { hell: true, knock: true, kz: 6, fromX: o.x - f.face }); burst(o.x, o.y, o.z + 26, "#bff2ff", 20); }); }
        }, drawFx: (f, t) => { if (t >= 10 && t < 112) for (const o of foesOf(f)) fxDraw("crystals", o.x - cam, o.y - 22, { sc: Math.min(0.55, (t - 10) / 120), a: 0.9 }); } }
    } },

  jogi: { name: "Jogi", sheet: "jogi", hp: 480, spd: 1.3, w: 10, h: 54, col: "#7fe07a", el: "Serpents", blurb: "Snake charmer of the old bazaar. His cobra does the talking.",
    moves: {
      DFA: { name: "Cobra Strike", mp: 60, len: 30, pose: "p2", ev: { 10: (f) => { S.shot(); shoot(f, { obj: "cobra", sc: 0.8, spd: 3.4, z: 0, ground: true, dmg: 34, eff: "poison", dur: 200, w: 14, h: 12, objDy: 1, knock: true, kz: 2 }); } } },
      DDA: { name: "Poison Cloud", mp: 60, len: 30, pose: "p2", ev: { 10: (f) => zone(f, { x: f.x + f.face * 54, y: f.y, life: 260, rx: 22, ry: 12, every: 40, dmg: 5, eff: "poison", dur: 120, draw: (z) => fxDraw("poison", z.x - cam, z.y - 18, { sc: 0.9 + Math.sin(z.t * 0.1) * 0.08, a: Math.min(0.85, (z.life - z.t) / 40) }) }) } },
      DUA: { name: "Rising Naag", mp: 60, len: 30, pose: "m11", ev: { 8: (f) => { const t = nearest(f); if (t) strike(f, t.x, t.y, { delay: 22, hold: 14, rx: 12, top: 26, dmg: 44, knock: true, kz: 5.5, eff: "poison", dur: 150, draw: riseDraw("cobraBig", 0.45, true), warnCol: "rgba(120,255,120,0.8)" }); } } },
      DFJ: { name: "Snake Slither", mp: 40, len: 28, pose: "p5", inv: [0, 20], vel: () => 5, hit: { from: 2, to: 22, range: [0, 26], zr: [0, 20], dmg: 26, knock: true } },
      DDJ: { name: "Been Flute", mp: 90, len: 50, pose: "m11", tick: (f, t) => { if (t % 6 === 0) texts.push({ x: f.x + f.face * 12, y: f.y - 50, msg: "♪", col: "#b6ff9a", life: 30 }); },
        ev: { 25: (f) => eachFoe(f, (t) => { if (Math.abs(t.x - f.x) < 150 && Math.abs(t.y - f.y) < 40) status(t, "reverse", 170); }) } },
      H1: { name: "Naag Lok", hell: true, mp: 250, len: 120, beats: beatsAt(60, 80, 100), pose: "m11",
        tick: (f, t) => {
          if (t === 10) shake = 6;
          if (t === 20) { const tg = nearest(f); f.naag = tg ? { x: tg.x + f.face * 30, y: tg.y - 1, tg } : null; S.heavy(); }
          if (f.naag && [60, 80, 100].includes(t)) { const n = f.naag; S.heavy(); for (const o of foesOf(f)) if (Math.abs(o.x - (n.x - f.face * 26)) < 34 && Math.abs(o.y - n.y) < 16) hitT(f, o, 40, { hell: true, knock: t === 100, kz: 5, eff: "poison", dur: 150, fromX: n.x }); }
          if (t === 112) f.naag = null;
        }, drawFx: (f, t) => {
          if (!f.naag) return; const n = f.naag, rise = Math.min(1, (t - 20) / 20), lunge = [60, 80, 100].some((s) => t >= s - 4 && t < s + 6) ? -f.face * 16 : 0;
          g.save(); g.beginPath(); g.rect(n.x - cam - 90, 0, 180, n.y + 2); g.clip(); objDraw("cobraBig", n.x - cam + lunge, n.y + (1 - rise) * 120, { sc: 1.25, flip: f.face > 0 }); g.restore();
        } },
      H2: { name: "Hundred Hoods", hell: true, mp: 350, len: 120, beats: beatsAt(40, 60, 80), pose: "p7",
        tick: (f, t) => {
          if (t >= 10 && t <= 96 && t % 4 === 2) { const tg = pick(foesOf(f)); if (tg) strike(f, tg.x + rand(-40, 40), clamp(tg.y + rand(-10, 10), stage.y0, Y1), { delay: 14, hold: 8, rx: 10, top: 20, dmg: 16, eff: "poison", dur: 100, hell: true, draw: riseDraw("cobraBig", 0.42, true), flip: rnd() < 0.5, warnCol: "rgba(120,255,120,0.8)" }); }
          if (t === 104) { const tg = nearest(f); if (tg) strike(f, tg.x, tg.y, { delay: 6, hold: 14, rx: 18, top: 40, dmg: 50, knock: true, kz: 6, hell: true, draw: riseDraw("cobraBig", 0.9, true) }); }
        } }
    } },

  meera: { name: "Meera", sheet: "meera", hp: 480, spd: 1.5, w: 10, h: 50, col: "#c58aff", el: "Sound and dance", blurb: "Kathak dancer from Lucknow. Every ghungroo bell is a weapon.",
    moves: {
      DFA: { name: "Ghungroo Ring", mp: 50, len: 24, pose: "p2", ev: { 8: (f) => { S.beat(); shoot(f, { fx: "soundwave", spd: 4.8, pierce: 3, dmg: 32, eff: "stun", dur: 18, sc: 1.2 }); } } },
      DDA: { name: "Chakkar Spin", mp: 60, len: 44, pose: "m11", spin: true, vel: (f, t) => t < 40 ? 2.6 : 0, tick: (f, t) => { if (t % 5 === 0) f.face = -f.face; },
        hit: { from: 3, to: 40, every: 7, range: [-20, 28], dmg: 18, push: -0.6 }, ev: { 41: (f) => melee(f, { range: [-20, 28], dmg: 18, knock: true, kz: 4 }) } },
      DUA: { name: "Tatkar Rise", mp: 50, len: 30, pose: "p4", ev: { 8: (f) => { shake = 3; ring(f, f.x, f.y, { max: 50, grow: 14, dmg: 40, knock: true, kz: 5.5, ground: true }); S.beat(); } } },
      DFJ: { name: "Spin Step", mp: 30, len: 14, pose: "m11", inv: [0, 12], ev: { 2: (f) => { const tg = nearest(f); blink(f, f.x + f.face * 56, tg ? lerp(f.y, tg.y, 0.5) : f.y); } } },
      DDJ: { name: "Rhythm", mp: 60, len: 30, pose: "p6", ev: { 15: (f) => { f.buff.rhythm = 360; pop(f, "In rhythm", "#c58aff"); S.beat(); } } },
      H1: { name: "Tandava", hell: true, mp: 250, len: 110, beats: beatsAt(40, 60, 80), pose: (f, t) => t % 6 < 3 ? "m11" : "p7",
        tick: (f, t) => { if (t % 3 === 0) f.face = -f.face; if (t >= 10 && t <= 85 && (t - 10) % 15 === 0) { ring(f, f.x, f.y, { max: 130, grow: 26, dmg: 26, knock: t === 85, kz: 5, hell: true }); S.beat(); } },
        beat: (f) => ring(f, f.x, f.y, { max: 110, grow: 18, dmg: 18, hell: true }) },
      H2: { name: "Ghungroo Thunder", hell: true, mp: 350, len: 100, beats: beatsAt(10, 24, 38), pose: (f, t) => t < 50 ? ([10, 24, 38].some((s) => t >= s && t < s + 6) ? "p4" : "p6") : "p7",
        tick: (f, t) => {
          if ([10, 24, 38].includes(t)) { shake = 4; ring(f, f.x, f.y, { max: 50, grow: 12, dmg: 0 }); S.beat(); }
          if (t === 50) { S.boom(); flashA = 0.8; flashC = "#f4e8ff"; shake = 12; eachFoe(f, (o) => hitT(f, o, 150 + f.beats * 15, { hell: true, knock: true, kz: 7.5, kx: 3 * (Math.sign(o.x - f.x) || 1), fromX: f.x })); for (let i = 0; i < 4; i++) ring(f, f.x, f.y, { max: 200 + i * 40, grow: 20 + i * 6, dmg: 0 }); }
        } }
    } },

  ashwatthama: { name: "Ashwatthama", sheet: "ashwatthama", hp: 650, spd: 1.4, w: 11, h: 56, col: "#ffd36a", el: "Divine weapons", legend: true, dmgMul: 1.1, blurb: "The warrior who can never die. A man, not a god, carrying every astra he ever learned.",
    moves: {
      DFA: { name: "Astra Arrow", mp: 50, len: 30, pose: tl([0, "m11"], [14, "p2"]), ev: { 12: (f) => { S.shot(); shoot(f, { fx: "arrow", spd: 8, dmg: 40, pierce: 2, power: 3, trail: "#ffe9a8" }); } } },
      DDA: { name: "Arrow Rain", mp: 80, len: 36, pose: "p3", ev: { 10: (f) => { const t = nearest(f); if (!t) return; for (let i = 0; i < 8; i++) strike(f, t.x + rand(-40, 40), clamp(t.y + rand(-8, 8), stage.y0, Y1), { delay: 14 + i * 3, hold: 4, rx: 7, dmg: 15, draw: fallDraw("arrow", 0.8, Math.PI / 2) }); } } },
      DUA: { name: "Gem Flash", mp: 60, len: 30, pose: "p6", ev: { 10: (f) => { zone(f, { x: f.x, y: f.y, life: 12, rx: 60, ry: 30, dmg: 20, eff: "blind", dur: 110 }); flashA = 0.35; flashC = "#fff4d0"; S.zap(); } },
        drawFx: (f, t) => { if (t > 6 && t < 18) fxDraw("burst", f.x - cam + f.face * 3, f.y - f.z - bodyH(f) + 6, { sc: 0.25 + (t - 6) * 0.02 }); } },
      DFJ: { name: "Warrior's Charge", mp: 40, len: 26, armor: true, pose: "p5", vel: () => 5.6, hit: { from: 2, to: 18, range: [0, 28], dmg: 40, knock: true } },
      // the gem on his brow: for 5 seconds nothing can knock him out (he can still be hurt to 1), and he heals a little
      DDJ: { name: "Immortal", mp: 100, len: 30, pose: "p6", ev: { 15: (f) => { f.buff.immortal = 300; S.power(); burst(f.x, f.y, f.z + bodyH(f) * 0.8, "#ffe9a8", 14); } } },
      H1: { name: "Brahmastra", hell: true, mp: 250, len: 110, beats: beatsAt(30, 45, 60), pose: tl([0, "m11"], [62, "p2"]),
        tick: (f, t) => {
          if (t < 60 && t % 2 === 0) { const a = rand(0, 6.28); parts.push({ x: f.x + f.face * 22 + Math.cos(a) * 30, y: f.y, z: 34 + Math.sin(a) * 26, vx: -Math.cos(a) * 1.4, vz: -Math.sin(a) * 1.1, life: 22, max: 22, col: "#fff2c0", r: 2, add: true }); }
          if (t === 60) { S.boom(); const p = shoot(f, { fx: "astra", spd: 5, sc: 1, w: 30, h: 40, life: 120, dmg: 0, every: 0, power: 9, hell: true });
            p.update = (p) => { p.x += p.vx; if (p.t % 2) flame(p.x - p.dir * 20, p.y, 1); const hitIt = foesOf(f).some((o) => Math.abs(o.x - p.x) < 24 && Math.abs(o.y - p.y) < 60); if (hitIt || p.x < 10 || p.x > AW - 10) { p.life = 0; brahmastraBlast(f, p.x, p.y); } }; }
        }, drawFx: (f, t) => { if (t < 60) fxDraw("burst", f.x - cam + f.face * 24, f.y - f.z - 34, { sc: 0.1 + t / 60 * 0.25 }); } },
      H2: { name: "Narayanastra", hell: true, mp: 350, len: 140, beats: beatsAt(40, 70, 100), pose: "p3",
        tick: (f, t) => {
          if (t === 2) { tint = { col: "rgba(60,40,0,0.35)", t: 130 }; sayAt(f.x, 70, "Narayanastra", "#ffe9a8", true); }
          if (t >= 20 && t <= 128 && t % 3 === 0) { const tg = pick(foesOf(f)); if (tg) { const w = pick(["chakra", "spear", "gada"]); strike(f, tg.x + rand(-30, 30), clamp(tg.y + rand(-8, 8), stage.y0, Y1), { delay: 14, hold: 3, rx: 8, dmg: 12, hell: true, draw: fallDraw(w, w === "chakra" ? 0.9 : 0.8, 0) }); } }
        } }
    } },

  /* Jatayu, a stance-based aerial bruiser. He stays grounded and fights with his wingspan
     (wide sweeps, a Wing Guard parry), and takes to the air only in his specials:
       D→A Feather Blades   D↓A Pinion Sweep     D↑A Solar Dive (unblockable, but its shadow can be dodged)
       D→J Typhoon Pinion   D↓J Dasharatha's Vow (10 s of hyper armour, slower, guard-breaking basics)
       H1  Pankh Pralay     H2  Martyr's Eclipse (his last stand, below 30% HP: a command grab, then
                                his wings are clipped for the rest of the round: Wounded Stance, no dash,
                                half jump, no Solar Dive or Typhoon Pinion, 1.5x damage) */
  jatayu: { name: "Jatayu", sheet: "jatayu", hp: 760, spd: 1.5, w: 13, h: 60, col: "#ff9a3a", el: "King of the sky", legend: true, dmgMul: 1.25, jump: 6.4,
    parry: true, lastStand: true, wingSwoosh: true, sealed: ["DUA", "DFJ"],
    blurb: "The vulture king of the Ramayana, who fought Ravana in the sky to save Sita. A grounded bruiser with a wingspan like a wall.",
    look: {
      idle: () => (tick % 70 < 35 ? "s0" : "s1"),
      walk: (f) => ["s2", "s0", "s3", "s1"][Math.floor(f.walkPh * 0.5) % 4],
      block: "s8", hurt: "s10", held: "s10",
      fall: (f, p) => (p === "m9" ? "s10" : "s11"), down: "s11", ko: "s11",
      getup: (f, p) => (p === "m10" ? "s11" : p === "m9" ? "s10" : "s0"),
      win: (f) => (f.t % 80 < 50 ? "v7" : "m11"), charge: "v6"
    },
    lookW: {
      idle: () => (tick % 60 < 30 ? "u0" : "u1"),
      walk: (f) => ["u2", "u0", "u3", "u1"][Math.floor(f.walkPh * 0.5) % 4],
      block: "u1", hurt: "u6", held: "u6",
      fall: (f, p) => (p === "m9" ? "u6" : "s11"), down: "s11", ko: "s11",
      getup: (f, p) => (p === "m10" ? "s11" : p === "m9" ? "u6" : "u0"),
      win: "u7", charge: "u1"
    },
    // basic chain: talon slash, wing sweep, double wing smash (wounded: claw, lunge, lunge)
    atk: [["s6", 18, [4, 34]], [tl([0, "s4"], [5, "s5"]), 20, [0, 46]], ["s7", 32, [4, 46]]], atkWind: "s4",
    atkW: [["u4", 16, [4, 32]], ["u5", 18, [6, 38]], ["u5", 28, [4, 38]]], atkWindW: "u1",
    moves: {
      DFA: { name: "Feather Blades", mp: 50, len: 30, pose: tl([0, "v0"], [9, "v1"], [24, "s0"]), ev: { 9: (f) => { S.shot(); swooshAt(f, 20, 0.7); for (let i = -1; i <= 1; i++) shoot(f, { fx: "featherblade", spd: 5.2, vy: i * 0.5, dmg: 20, power: 2 }); } } },
      DDA: { name: "Pinion Sweep", mp: 55, len: 34, pose: tl([0, "s4"], [9, "s5"], [19, "s7"], [30, "s0"]),
        // the sweep staggers and draws them in, the smash that follows knocks them flat
        hit: { from: 9, to: 13, range: [-8, 52], zr: [0, 50], dmg: 20, stun: 20, push: -0.8, gb: 28 },
        ev: { 9: (f) => { S.swing(); swooshAt(f, 26, 1.1); },
          20: (f) => { S.heavy(); shake = Math.max(shake, 4); dust(f.x + f.face * 30, f.y, 8); swooshAt(f, 30, 0.9, 0.9); f.hitSet.clear(); melee(f, { range: [0, 46], zr: [0, 50], dmg: 28, knock: true, kz: 3.2, kx: 2.4, gb: 28 }); } } },
      DUA: { name: "Solar Dive", mp: 75, len: 72,
        pose: (f, t) => (t < 9 ? "v2" : t < 26 ? "v3" : t < 58 ? "v4" : "v5"),
        tick: (f, t) => {
          if (t < 58) f.vz = 0;
          if (t === 8) { S.jump(); dust(f.x, f.y, 10); swooshAt(f, 0, 0.9, -1.4); }
          if (t > 8 && t < 26) { f.z += 10; if (t % 2) stamp(f); }   // off the top of the screen
          if (t === 26) { f.fx.sky = 1; f.hide = true; const tg = nearest(f); f.mark = { x: tg ? tg.x : clamp(f.x + f.face * 80, 12, AW - 12), y: tg ? tg.y : f.y }; }
          // the target shadow chases for a moment, then stops: the last 18 frames are the time to step out
          if (f.mark && t > 26 && t < 40) { const tg = nearest(f); if (tg) { f.mark.x = lerp(f.mark.x, tg.x, 0.13); f.mark.y = lerp(f.mark.y, tg.y, 0.13); } }
          if (t === 46) { f.face = f.mark.x >= f.x ? 1 : -1; f.x = f.mark.x; f.y = f.mark.y; f.z = 216; f.hide = false; S.power(); }
          if (t > 46 && t < 58) { f.z = Math.max(0, 216 - (t - 46) * 19); stamp(f); flame(f.x, f.y - 0, 1); }
          if (t === 58) {
            f.z = 0; f.vz = 0; f.fx.sky = 0; S.boom(); shake = Math.max(shake, 10); hitstopAt(4);
            explode(f.x, f.y, 6, 0.9); dust(f.x, f.y, 16); rocks(f.x, f.y, 6);
            for (const o of foesOf(f)) if (Math.abs(o.x - f.x) < 22 && Math.abs(o.y - f.y) < 12 && o.z < 40) hitT(f, o, 52, { unblock: true, knock: true, kz: 5.8, kx: (Math.sign(o.x - f.x) || f.face) * 0.6, fromX: f.x });   // ground bounce: open for a juggle
            ring(f, f.x, f.y, { max: 58, grow: 12, dmg: 24, knock: true, kz: 3, ground: true });   // the shockwave: jump it or be far away
          }
        },
        end: (f) => { f.hide = false; f.fx.sky = 0; f.mark = null; },
        drawFx: (f, t) => {
          if (f.mark && t >= 26 && t < 58) {   // the falling shadow, a sun-ringed target on the floor
            const x = f.mark.x - cam, y = f.mark.y, k = clamp((t - 26) / 32, 0, 1), locked = t >= 40;
            g.save(); g.fillStyle = "rgba(0,0,0," + (0.25 + k * 0.35) + ")"; g.beginPath(); g.ellipse(x, y, 10 + k * 12, 3 + k * 2.5, 0, 0, 7); g.fill();
            g.strokeStyle = locked ? "rgba(255,90,40,0.95)" : "rgba(255,190,70,0.8)"; g.lineWidth = 1; g.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.5));
            g.beginPath(); g.ellipse(x, y, 26, 6, 0, 0, 7); g.stroke(); g.restore();
          }
          if (t >= 46 && t < 58) fxDraw("firebird", f.x - cam, f.y - f.z - 10, { sc: 0.7, rot: Math.PI / 2 * f.face * 0.9, a: 0.8 });
        } },
      DFJ: { name: "Typhoon Pinion", mp: 85, len: 36, pose: tl([0, "v0"], [12, "v1"], [30, "s0"]),
        ev: { 12: (f) => {
          S.power(); shake = Math.max(shake, 3); swooshAt(f, 24, 1.2);
          // a slow wall of wind: it eats enemy projectiles and juggles whoever it catches
          const z = zone(f, { x: f.x + f.face * 34, y: f.y, vx: f.face * 1.05, life: 150, rx: 20, ry: 13, every: 9, dmg: 8, knock: true, kz: 3.4, kx: f.face * 0.25, spark: "#e8f6ff",
            draw: (z) => { const a = z.life - z.t < 14 ? (z.life - z.t) / 14 : Math.min(1, z.t / 8);
              g.save(); g.globalAlpha = 0.35 * a; g.fillStyle = "#000"; g.beginPath(); g.ellipse(z.x - cam, z.y, 18, 4, 0, 0, 7); g.fill(); g.restore();
              fxDraw("tornado", z.x - cam + Math.sin(z.t * 0.3) * 2, z.y - 46, { sc: 0.66, a }); } });
          const up = z.update;
          z.update = (z) => {
            up(z);
            for (const o of objs) if (o.kind === "shot" && o.team !== f.team && o.life > 0 && Math.abs(o.x - z.x) < 22 && Math.abs(o.y - z.y) < 16) { o.life = 0; burst(o.x, o.y, o.z, "#e8f6ff", 8); S.zap(); }
            for (const o of foesOf(f)) if (Math.abs(o.x - z.x) < 50 && Math.abs(o.y - z.y) < 20 && !o.lockBy) o.x += Math.sign(z.x - o.x) * 0.7;
            if (z.t % 6 === 0) parts.push({ x: z.x + rand(-10, 10), y: z.y, z: rand(4, 60), vx: rand(-1.2, 1.2), vz: rand(0.4, 1.4), life: 26, max: 26, obj: "feather", sc: 0.3, rot: rand(0, 6) });
          };
        } } },
      DDJ: { name: "Dasharatha's Vow", mp: 120, len: 50, armor: true, pose: tl([0, "v6"], [30, "v7"]),
        ev: { 4: (f) => { S.power(); tint = { col: "rgba(255,200,80,0.16)", t: 46 }; },
          30: (f) => { f.buff.vow = 600; pop(f, "Dasharatha's Vow", "#ffcf4a"); S.heavy(); burst(f.x, f.y, f.z + 34, "#ffd36a", 16); ring(f, f.x, f.y, { max: 60, grow: 16, dmg: 0 }); } },
        // the spirit of the vow: a golden eagle rises and spreads its wings behind him
        drawFx: (f, t) => {
          const k = Math.min(1, t / 30), a = t < 40 ? k : (50 - t) / 10, x = f.x - cam, y = f.y - f.z;
          fxDraw("eagle", x - f.face * 4, y - 44 - k * 8, { sc: 0.4 + 0.3 * k, a: 0.85 * a, flip: f.face < 0 });
          g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.6 * a; g.strokeStyle = "#ffcf4a"; g.lineWidth = 1;
          for (let i = 0; i < 2; i++) { const r = ((t * 1.2 + i * 18) % 36) + 6; g.beginPath(); g.ellipse(x, f.y, r * 1.4, r * 0.32, 0, 0, 7); g.stroke(); }
          g.restore();
        } },
      H1: { name: "Pankh Pralay", hell: true, mp: 250, len: 130, beats: beatsAt(86, 96, 106),
        pose: (f, t) => t < 72 ? (Math.floor(t / 8) % 2 ? "v1" : "v0") : t < 84 ? "v8" : t < 114 ? ["s6", "s5", "s7"][Math.floor(t / 6) % 3] : "v1",
        tick: (f, t) => {
          if (t >= 10 && t <= 70 && t % 3 === 0) { const tg = nearest(f); if (tg) faceTo(f, tg); shoot(f, { obj: "feather", sc: 0.6, spd: 5, vy: rand(-0.6, 0.6), z: rand(14, 50), homing: 0.05, dmg: 7, hell: true, life: 90, objDy: 0, spin: 0 }); }
          if (t === 74) { const tg = foeNear(f, 300); if (tg) { blink(f, tg.x - f.face * 22, tg.y); faceTo(f, tg); lock(f, tg, 50); } }
          if (f.lockT0 && [86, 96, 106].includes(t)) { hitT(f, f.lockT0, 20, { hell: true }); swooshAt(f, 18, 0.8, rand(-0.6, 0.6)); }
          if (t === 116 && f.lockT0) { const tg = f.lockT0; unlock(tg, f); hitT(f, tg, 50, { hell: true, knock: true, kz: 6, kx: f.face * 3 }); S.boom(); swooshAt(f, 24, 1.3); }
        }, drawFx: (f, t) => { if (t < 72) for (const s of [-1, 1]) fxDraw("tornado", f.x - cam + s * 34, f.y - 44, { sc: 0.5, a: 0.7 }); } },
      H2: { name: "Martyr's Eclipse", hell: true, mp: 350, len: 160, beats: beatsAt(56, 70, 84),
        pose: (f, t) => f.eMiss ? "s0" : t < 18 ? "v8" : t < 40 ? "v3" : t < 96 ? ["v9", "s6", "v9", "s5"][Math.floor((t - 40) / 7) % 4] : t < 118 ? "v10" : "v11",
        vel: (f, t) => (t < 16 && !f.lockT0 ? 6 : 0),
        tick: (f, t) => {
          if (t === 1) { const tg = nearest(f); if (tg) faceTo(f, tg); stamp(f, 2); }
          // the lunge is an unblockable command grab: it seizes anyone in reach, on the ground or in the air
          if (t >= 4 && t <= 16 && !f.lockT0) {
            const tg = foesOf(f).find((o) => inReach(f, o, { range: [-4, 34], zr: [0, 70], depth: 14 }));
            if (tg && lock(f, tg, 170)) { S.heavy(); hitstopAt(6); flashA = 0.5; flashC = "#ffffff"; tint = { col: "rgba(12,4,24,0.55)", t: 140 }; f.eclipse = 1; pop(tg, "Caught", "#ffd36a"); }
          }
          if (t === 18 && !f.lockT0) { f.eMiss = true; f.t = 146; return; }   // missed: back to his stance, the chakra is spent
          const tg = f.lockT0; if (!tg) return;
          f.vz = 0; tg.vz = 0;
          if (t === 19) { S.power(); dust(f.x, f.y, 14); swooshAt(f, 0, 1.1, -1.4); }
          if (t > 18 && t <= 40) { const k = (t - 18) / 22; f.z = 70 * k; tg.z = 76 * k; tg.x = clamp(f.x + f.face * 18, 12, AW - 12); tg.y = f.y; if (t % 2) stamp(f); }
          if (t > 40 && t < 96) {   // a blur of feathers and talons from every side
            tg.z = 76 + Math.sin(t * 0.3) * 4;   // high above the floor but clear of the health bars
            if ((t - 40) % 7 === 0) {
              const n = (t - 40) / 7, side = n % 2 ? 1 : -1;
              stamp(f, 2); f.x = clamp(tg.x - side * 24, 12, AW - 12); f.z = tg.z + [-16, 4, 12, -6][n % 4]; f.face = side;
              hitT(f, tg, 16, { hell: true, fromX: f.x, spark: "#ffd36a" });
              swooshAt(f, 14, 0.75, [-0.8, 0.4, 1.0, -0.2][n % 4], f.z + 20);
              for (let i = 0; i < 4; i++) parts.push({ x: tg.x + rand(-8, 8), y: tg.y, z: tg.z + rand(10, 40), vx: rand(-1.6, 1.6), vz: rand(-0.6, 1.4), life: 30, max: 30, obj: "feather", sc: 0.3, rot: rand(0, 6) });
            }
          }
          if (t === 96) { f.x = clamp(tg.x - f.face * 10, 12, AW - 12); f.z = tg.z + 16; S.power(); flashA = 0.5; flashC = "#ffb347"; }
          if (t > 96 && t < 116) {   // the meteor: he folds his wings and drives them both into the earth
            const k = (t - 96) / 20; f.z = 92 * (1 - k * k); tg.z = Math.max(0, f.z - 16); tg.x = clamp(f.x + f.face * 10, 12, AW - 12);
            stamp(f); flame(f.x, f.y, 2); if (t % 2) parts.push({ x: f.x + rand(-6, 6), y: f.y, z: f.z + rand(10, 40), vx: rand(-0.5, 0.5), vz: rand(1, 2.5), life: 22, max: 22, col: pick(["#ffb347", "#ff6a2a", "#ffe28a"]), r: rand(2, 4), add: true });
          }
          if (t === 116) {
            f.z = 0; tg.z = 0; unlock(tg, f); f.lockT0 = null;
            hitT(f, tg, 200 + f.beats * 30, { hell: true, knock: true, kz: 7, kx: f.face * 3.2 });
            S.boom(); S.boom(); shake = 18; flashA = 0.85; flashC = "#fff2c0"; slowmo = Math.max(slowmo, calmSim() ? 0 : 14);
            explode(f.x, f.y, 8, 1.5); rocks(f.x, f.y, 10); dust(f.x, f.y, 26);
            for (let i = 0; i < 14; i++) flame(f.x + rand(-50, 50), f.y + rand(-6, 6), 1);
            // the shockwave hits everyone else on the ground as well (team battles)
            ring(f, f.x, f.y, { max: 150, grow: 22, dmg: 60, hell: true, knock: true, kz: 5, ground: true });
            f.wounded = true; pop(f, "Wings clipped", "#ffb0a0");
            for (let i = 0; i < 16; i++) parts.push({ x: f.x + rand(-14, 14), y: f.y, z: rand(20, 60), vx: rand(-1.4, 1.4), vz: rand(0.5, 2.2), g: 0.06, life: 60, max: 60, obj: "feather", sc: 0.3, rot: rand(0, 6) });
          }
        },
        end: (f) => { f.eclipse = 0; f.eMiss = false; },
        drawFx: (f, t) => {
          if (f.eclipse && t > 16 && t < 152) {   // the sun goes dark behind them
            const a = Math.min(1, (t - 16) / 14) * (t > 132 ? (152 - t) / 20 : 1), x = LW * 0.72, y = 36;
            g.save(); g.globalAlpha = a; g.fillStyle = "#07030c"; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill(); g.restore();
            fxDraw("eclipse", x, y, { sc: 0.42 + Math.sin(t * 0.15) * 0.015, a, rot: t * 0.01 });
          }
          if (t > 96 && t < 117 && f.eclipse) fxDraw("meteor", f.x - cam, f.y - f.z - 6, { sc: 0.9, rot: -f.face * 0.5, flip: f.face < 0 });
          if (t >= 116 && t < 138) fxDraw("burst", f.x - cam, f.y - 20, { sc: 1.4 + (t - 116) * 0.07, a: 1 - (t - 116) / 22 });
        } }
    } },
  ghatotkacha: { name: "Ghatotkacha", sheet: "ghatotkacha", hp: 820, spd: 1.15, w: 16, h: 74, col: "#9a6bff", el: "Giant of maya", hidden: true, heavyArmor: true, dmgMul: 1.15,
    atk: [["m3", 18, [6, 40]], ["x1", 22, [0, 50]], ["x2", 34, [6, 48]]],
    blurb: "Son of Bhima and Hidimbi, half rakshasa. He can grow as tall as a mountain.",
    moves: {
      DFA: { name: "Gada Throw", mp: 60, len: 40, pose: tl([0, "x0"], [10, "x1"], [16, "p2"]), ev: { 14: (f) => { S.swing(); shoot(f, { obj: "gada", sc: 0.7, spd: 4.5, spin: 0.35, boomerang: 36, life: 76, pierce: 3, dmg: 40, knock: true, w: 16, h: 14, objDy: 0, power: 4 }); } } },
      DDA: { name: "Bhoo Kampan", mp: 70, len: 48, pose: tl([0, "x0"], [8, "x1"], [12, "x2"]), ev: { 14: (f) => { shake = 9; S.boom(); ring(f, f.x + f.face * 20, f.y, { max: 90, grow: 22, dmg: 46, knock: true, kz: 4.5, ground: true, draw: (z) => fxDraw("dustring", z.x - cam, z.y - 2, { sc: z.r / 60, sy: 0.5, a: z.fade }) }); rocks(f.x + f.face * 20, f.y, 6); } } },
      DUA: { name: "Rakshasa Leap", mp: 70, len: 60, air: true, pose: (f, t) => f.z > 2 ? "x5" : t > 10 ? "x2" : "x0",
        ev: { 2: (f) => { const tg = nearest(f); f.vz = 6.5; f.leapVx = tg ? clamp((tg.x - f.x) / 34, -4, 4) : f.face * 3; if (tg) faceTo(f, tg); } },
        tick: (f, t) => { if (t > 2 && f.z > 0) f.x += f.leapVx; if (t > 10 && grounded(f) && !f.landed) { f.landed = true; shake = 10; S.boom(); dust(f.x, f.y, 14); explode(f.x + f.face * 16, f.y, 6, 0.7); rocks(f.x, f.y, 5); zone(f, { x: f.x + f.face * 16, y: f.y, life: 6, rx: 40, ry: 18, ground: true, dmg: 64, knock: true, kz: 5 }); } },
        end: (f) => { f.landed = false; } },
      DFJ: { name: "Maya Clones", mp: 70, len: 40, pose: "p3", ev: { 10: (f) => { S.power(); for (let i = -1; i <= 1; i++) shoot(f, { obj: i ? "demon1" : "demon2", sc: 0.85, spd: 4, vy: i * 0.6, z: 0, dx: -10, dmg: 24, knock: true, w: 14, h: 40, objDy: 0, a: 0.8, life: 120, pierce: 2, draw: ghostDraw }); } } },
      DDJ: { name: "Vishal Roop", mp: 120, len: 60, pose: "x4", end: (f) => { if (!f.buff.grow) f.sc = 1; }, tick: (f, t) => { f.sc = 1 + Math.min(1, t / 40) * 0.5; if (t % 4 === 0) shake = 2; }, ev: { 40: (f) => { f.buff.grow = 480; pop(f, "Giant", "#9a6bff"); S.boom(); } } },
      H1: { name: "Maya Sena", hell: true, mp: 250, len: 140, beats: beatsAt(100, 112, 124),
        pose: (f, t) => t < 20 ? "p7" : t < 94 ? "p3" : t < 130 ? (t % 8 < 4 ? "x3" : "x1") : "x2",
        tick: (f, t) => {
          if (t === 10) S.power();
          if (t >= 20 && t <= 90 && t % 7 === 6) { const tg = pick(foesOf(f)); if (tg) { const side = rnd() < 0.5 ? -1 : 1; const p = shoot(f, { obj: pick(["demon1", "demon2"]), sc: 0.85, spd: 3.4, dir: -side, z: 30, vz: 3, grav: 0.1, dx: 0, dmg: 18, knock: t > 80, w: 14, h: 30, objDy: 0, hell: true, life: 90, draw: ghostDraw }); p.x = tg.x + side * 90; p.y = tg.y; p.onLand = (p) => { dust(p.x, p.y, 4); zone(f, { x: p.x, y: p.y, life: 4, rx: 16, ry: 12, ground: true, dmg: 14, hell: true }); }; } }
          if (t >= 94 && t < 130) { const tg = nearest(f); if (tg) { f.x += Math.sign(tg.x - f.x) * 3; f.y = lerp(f.y, tg.y, 0.08); } if (t % 3 === 0) f.face = -f.face; if (t % 6 === 0) for (const o of foesOf(f)) if (Math.hypot(o.x - f.x, (o.y - f.y) * 2.4) < 48) hitT(f, o, 16, { hell: true }); }
          if (t === 132) { shake = 10; S.boom(); rocks(f.x + f.face * 30, f.y, 8); explode(f.x + f.face * 30, f.y, 8, 0.8); for (const o of foesOf(f)) if (Math.abs(o.x - (f.x + f.face * 30)) < 50 && Math.abs(o.y - f.y) < 20) hitT(f, o, 50, { hell: true, knock: true, kz: 6 }); }
        }, drawFx: (f, t) => { if (t >= 6 && t < 96) fxDraw("vortex", f.x - cam - f.face * 20, f.y - 50, { sc: Math.min(1, (t - 6) / 20) * 0.8, rot: t * 0.05, a: 0.85 }); } },
      H2: { name: "Parvat Patan", hell: true, mp: 350, len: 200, armor: true, beats: beatsAt(40, 55, 70),
        pose: (f, t) => t < 70 ? "x4" : t < 150 ? "x6" : "x4",
        tick: (f, t) => {
          if (t === 1) { const tg = nearest(f); if (tg) faceTo(f, tg); tint = { col: "rgba(40,10,60,0.35)", t: 190 }; }
          if (t < 70) { f.sc = 1 + 2.3 * (t / 70) ** 1.5; shake = Math.max(shake, t / 14); if (t % 4 === 0) dust(f.x + rand(-30, 30), f.y, 2); if (t % 20 === 0) S.heavy(); }
          if (t >= 70 && t < 100) { f.rot = f.face * 1.45 * ((t - 70) / 30) ** 2; }
          if (t === 100) {
            S.boom(); S.boom(); shake = 16; flashA = 0.9; flashC = "#fff"; for (let i = 0; i < 4; i++) explode(f.x + f.face * (40 + i * 50), f.y, 10, 0.9);
            for (const o of foesOf(f)) { const dx = (o.x - f.x) * f.face; if (dx > -20 && dx < 70 * f.sc + 40) hitT(f, o, 270 + f.beats * 20, { hell: true, knock: true, kz: 8, kx: f.face * 3, unblock: true }); }
            for (let i = 0; i < 6; i++) rocks(f.x + f.face * i * 34, f.y + rand(-10, 10), 4);
            for (let i = 0; i < 40; i++) dust(f.x + f.face * rand(0, 220), rand(stage.y0, Y1), 1, "rgba(200,180,150,0.9)");
          }
          if (t >= 150) { const k = (t - 150) / 46; f.rot = f.face * 1.45 * Math.max(0, 1 - k * 1.5); f.sc = Math.max(1, 3.3 - 2.3 * k); }
        }, end: (f) => { f.rot = 0; f.sc = f.buff.grow ? 1.5 : 1; } }
    } },

  barbarik: { name: "Barbarik", sheet: "barbarik", hp: 700, spd: 1.5, w: 11, h: 56, col: "#5aa8ff", el: "Three arrows", hidden: true, dmgMul: 1.15,
    blurb: "Grandson of Bhima. Three arrows were all he ever needed: one marks, one destroys.",
    moves: {
      DFA: { name: "Divya Baan", mp: 50, len: 36, pose: tl([0, "x0"], [6, "x1"], [12, "x2"], [22, "x3"]), ev: { 22: (f) => { S.shot(); arrowOf(f, "arrowBlue", { spd: 8.5, dmg: 46, pierce: 3, power: 3, trail: "#7fc4ff" }); } } },
      DDA: { name: "Arrow Volley", mp: 70, len: 40, pose: tl([0, "x1"], [10, "x5"], [30, "x3"]), ev: { 18: (f) => volley(f, -0.6), 22: (f) => volley(f, 0), 26: (f) => volley(f, 0.6) } },
      DUA: { name: "Sky Arrows", mp: 70, len: 44, pose: tl([0, "x1"], [8, "x4"]), ev: { 14: (f) => { S.shot(); const t = nearest(f); if (!t) return; for (let i = 0; i < 5; i++) strike(f, t.x + (i - 2) * 12, t.y, { delay: 16 + i * 4, hold: 4, rx: 8, dmg: 16, knock: i === 4, kz: 4, draw: fallDraw("arrowGold", 0.4, Math.PI / 2) }); } } },
      DFJ: { name: "Neela Ghoda", mp: 80, len: 70, armor: true, pose: (f, t) => t < 56 ? "x6" : "x7", vel: (f, t) => t < 56 ? 5 : 0,
        tick: (f, t) => { if (t < 56) { f.bob = Math.abs(Math.sin(t * 0.5)) * 2; if (t % 3 === 0) dust(f.x - f.face * 20, f.y, 2); if (t % 8 === 0) S.swing(); } else f.bob = 0; },
        hit: { from: 2, to: 56, every: 10, range: [-10, 44], zr: [0, 64], dmg: 26, knock: true, kx: 3.5, kz: 4 }, end: (f) => (f.bob = 0) },
      DDJ: { name: "Dhyan", mp: 80, len: 40, pose: "x2", ev: { 20: (f) => { f.buff.aim = 420; pop(f, "Focused", "#5aa8ff"); S.power(); } } },
      H1: { name: "Pehla Baan", hell: true, mp: 250, len: 150, beats: beatsAt(80, 95, 110),
        pose: (f, t) => t < 8 ? "x0" : t < 16 ? "x1" : t < 50 ? "x4" : t < 66 ? "x0" : ["x0", "x1", "x2", "x3"][Math.min(3, Math.floor(((t - 66) % 15) / 4))],
        tick: (f, t) => {
          if (t === 24) { S.shot(); f.redUp = { z: 60 }; }
          if (f.redUp) f.redUp.z += 7;
          if (t === 40) { f.redUp = null; S.zap(); eachFoe(f, (o) => status(o, "mark", 600)); flashA = 0.3; flashC = "#ff5050"; }
          if ([80, 95, 110, 125].includes(t)) {
            S.shot();
            // the final fight's opener: four arrows that always land, half of each foe's health in all
            if (f.opener) for (const o of fighters.filter((o) => o.team !== f.team && alive(o))) { const each = Math.floor(o.maxHp / 8); sureArrow(f, o, t === 125 ? Math.round(o.maxHp / 2) - each * 3 : each, t === 125); }
            else for (const o of foesOf(f).filter((o) => o.fx.mark)) arrowOf(f, "arrowBlue", { spd: 9, homing: 0.35, dmg: 32, hell: true, unblock: true, pierce: 1, z: 30, target: o });
          }
          if (f.opener) f.inv = Math.max(f.inv, 4);   // the opener's protection lasts exactly as long as the move
          if (t === 140 && f.opener) f.opener = false;
        }, drawFx: (f, t) => { if (f.redUp) fxDraw("arrowRed", f.x - cam + f.face * 6, f.y - f.redUp.z, { sc: 0.6, rot: -Math.PI / 2 }); } },
      H2: { name: "Teen Baan", hell: true, mp: 350, len: 214, beats: beatsAt(80, 110, 140),
        // the three arrows: red marks every foe, blue pins them, and the golden one he looses into the sky
        // comes back down as all three braided together, one helix per marked foe
        pose: (f, t) => t < 34 ? "x5" : t < 50 ? "x4" : t < 84 ? (t < 66 ? "x1" : "x2") : t < 100 ? "x3" : t < 140 ? (t % 16 < 8 ? "x7" : "x6") : t < 196 ? "x4" : "p7",
        tick: (f, t) => {
          if (t === 1) tint = { col: "rgba(10,20,60,0.4)", t: 205 };
          if (t === 30) { S.shot(); f.redUp = { z: 30 }; }
          if (f.redUp) f.redUp.z += 8;
          if (t === 46) { f.redUp = null; S.zap(); eachFoe(f, (o) => status(o, "mark", 600)); flashA = 0.4; flashC = "#ff4040"; }
          if (t === 84) { S.zap(); eachFoe(f, (o) => { if (o.fx.mark) { status(o, "stop", 110); hitT(f, o, 20, { hell: true, unblock: true }); } }); f.chains = 110; }
          if (f.chains) f.chains--;
          // the blue horse rears and its spirit gallops the length of the arena
          if (t === 100) { S.power(); f.horse = { x: f.x - f.face * 30, dir: f.face }; }
          if (f.horse && t < 140) { f.horse.x += f.horse.dir * 7; if (t % 3 === 0) dust(f.horse.x - f.horse.dir * 14, f.y, 2, "rgba(150,200,255,0.7)"); if (t % 8 === 0) S.swing(); }
          if (t === 140) f.horse = null;
          // one arrow up, braided from all three
          if (t === 144) { S.shot(); f.tri = { z: 40 }; }
          if (f.tri && f.tri.z < 260) f.tri.z += 10;
          if (t === 160) { f.tri = null; f.falls = foesOf(f).filter((o) => o.fx.mark).map((o) => ({ o, z: 210, hit: false })); }
          if (f.falls) for (const d of f.falls) {
            if (d.hit) continue;
            d.z -= 8;
            if (d.z <= d.o.z + 34) {
              d.hit = true; const o = d.o;
              if (o.stoppedDmg) { o.hp = Math.max(o.buff.immortal > 0 ? 1 : 0, o.hp - o.stoppedDmg); o.stoppedDmg = 0; } o.fx.stopped = 0;
              hitT(f, o, 250 + f.beats * 20, { hell: true, unblock: true, knock: true, kz: 8, kx: (Math.sign(o.x - f.x) || 1) * 2, fromX: o.x - (Math.sign(o.x - f.x) || 1) });
              for (const [col, r, life] of [["#ff5050", 16, 22], ["#5aa8ff", 26, 28], ["#ffd36a", 36, 34]]) parts.push({ x: o.x, y: o.y, z: 4, vx: 0, vz: 0, life, max: life, col, ring: r });
              explode(o.x, o.y, 26, 0.9); burst(o.x, o.y, 30, "#bfe0ff", 20); shake = 10; flashA = 0.35; flashC = "#7fb8ff"; S.boom();
            }
          }
          if (t === 200) f.falls = null;
        }, end: (f) => { f.horse = f.tri = f.falls = null; },
        drawFx: (f, t) => {
          if (f.redUp) fxDraw("arrowRed", f.x - cam + f.face * 6, f.y - f.redUp.z, { sc: 0.7, rot: -Math.PI / 2 });
          if (f.chains) for (const o of foesOf(f)) if (o.fx.mark) { g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(110,190,255," + (0.4 + 0.4 * Math.sin(t * 0.5)) + ")"; g.lineWidth = 1.5; for (const dx of [-14, 0, 14]) { g.beginPath(); g.moveTo(o.x - cam + dx, 0); g.lineTo(o.x - cam, o.y - o.z - 30); g.stroke(); } g.restore(); }
          if (f.horse) fxDraw("ghostHorse", f.horse.x - cam, f.y - 40 - Math.abs(Math.sin(t * 0.5)) * 4, { sc: 1, flip: f.horse.dir < 0, a: 0.85 });
          const helix = (x, z, down) => { for (const [i, n] of [[0, "arrowRed"], [1, "arrowBlue"], [2, "arrowGold"]]) { const a = t * 0.45 + i * 2.09; fxDraw(n, x - cam + Math.cos(a) * 7, z - Math.sin(a) * 2, { sc: 0.42, rot: down ? Math.PI / 2 : -Math.PI / 2 }); } };
          if (f.tri) helix(f.x + f.face * 6, f.y - f.tri.z, false);
          if (f.falls) for (const d of f.falls) if (!d.hit) { helix(d.o.x, d.o.y - d.z, true); fxDraw("sigil", d.o.x - cam, d.o.y - 2, { sc: 0.3, sy: 0.4, rot: t * 0.1 }); }
        } }
    } }
};

/* helpers used by several fighters */
function kiteDraw(p) { const im = IMG[p.kite]; if (!im) return; g.save(); g.translate(p.x - cam, p.y - p.z); g.rotate(Math.sin(p.t * 0.2) * 0.3 + (p.dive ? 2.4 : 0)); g.drawImage(im, -8, -10, 16, 20); g.restore(); }
function diveKite(f, knock) {
  const tg = pick(foesOf(f)); if (!tg) return;
  const p = shoot(f, { kite: pick(["kite_o", "kite_m", "kite_y", "kite_b"]), spd: 1.2, z: 160, vz: -3.6, dx: 0, dmg: 13, knock, kz: 4, hell: true, life: 80, w: 8, h: 10, draw: kiteDraw, dive: true });
  p.x = tg.x + rand(-30, 30) - f.face * 40; p.y = tg.y;
  p.update = (p) => { shotUpdate(p); if (p.z <= 0) p.life = 0; };
}
function wireDraw(z) {
  const x = z.x - cam, y = z.y - 3, a = z.life - z.t < 20 ? (z.life - z.t) / 20 : 1;
  g.save(); g.globalAlpha = a; g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - 40, y); g.lineTo(x + 40, y); g.stroke();
  const gl = ((z.t * 2) % 80) - 40; g.fillStyle = "#fff"; g.fillRect(x + gl - 1, y - 0.5, 3, 1);
  g.fillStyle = "#8a5a2a"; g.fillRect(x - 43, y - 3, 4, 5); g.fillRect(x + 39, y - 3, 4, 5); g.restore();
}
function webLine(f, tg) {
  const a = rand(-0.5, 0.5), len = 220, x1 = tg.x - Math.cos(a) * len, x2 = tg.x + Math.cos(a) * len, y1 = tg.y - Math.sin(a) * 30, y2 = tg.y + Math.sin(a) * 30;
  const z = zone(f, { x: tg.x, y: tg.y, life: 999, x1, x2, y1, y2, hell: true,
    update: (z) => {
      const snapT = f.st === "move" && f.code === "H2" ? 80 - f.t : -1;
      if (snapT <= 0 && !z.snapped) {
        z.snapped = true; z.life = z.t + 14;
        for (const o of foesOf(f)) { const k = clamp(((o.x - x1) * (x2 - x1) + (o.y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2), 0, 1), px = x1 + (x2 - x1) * k, py = y1 + (y2 - y1) * k; if (Math.abs(o.x - px) < 12 && Math.abs(o.y - py) < 10) hitT(f, o, 34, { hell: true, knock: true, kz: 4, fromX: px - 1 }); }
        for (let i = 0; i < 10; i++) sparks(lerp(x1, x2, i / 9), lerp(y1, y2, i / 9), 20, "#fff", 1);
      }
    },
    draw: (z) => { g.save(); g.strokeStyle = z.snapped ? "rgba(255,255,255," + Math.max(0, 1 - (z.t - (z.life - 14)) / 14) + ")" : "rgba(255,255,255,0.75)"; g.lineWidth = z.snapped ? 1.5 : 0.6; g.beginPath(); g.moveTo(x1 - cam, y1 - 22); g.lineTo(x2 - cam, y2 - 22); g.stroke(); g.restore(); } });
  return z;
}
function meteor(f) {
  const tg = pick(foesOf(f)); if (!tg) return;
  strike(f, tg.x + rand(-30, 30), clamp(tg.y + rand(-8, 8), stage.y0, Y1), { delay: 18, hold: 6, rx: 16, dmg: 26, knock: true, kz: 4, eff: "burn", dur: 90, hell: true, dir: f.face, draw: fallDraw("meteor", 0.5, 0), onStrike: (z) => { S.boom(); explode(z.x, z.y, 10, 0.6); for (let i = 0; i < 6; i++) flame(z.x, z.y, 1); } });
}
function brahmastraBlast(f, x, y) {
  S.boom(); shake = 14; flashA = 1; flashC = "#ffffff"; explode(x, y, 30, 1.6);
  for (const o of foesOf(f)) if (Math.abs(o.x - x) < 140) hitT(f, o, 160 + f.beats * 15, { hell: true, knock: true, kz: 7, kx: 3 * (Math.sign(o.x - x) || 1), fromX: x });
  zone(f, { x, y, life: 30, rx: 0, dmg: 0, draw: (z) => fxDraw("burst", z.x - cam, z.y - 40, { sc: 1.6 + z.t * 0.03, a: 1 - z.t / 30 }) });
}
function rocks(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x: x + rand(-14, 14), y, z: 2, vx: rand(-2, 2), vz: rand(2.5, 5), g: 0.22, life: 40, max: 40, obj: "chunk", sc: rand(0.25, 0.45), rot: rand(0, 6) }); }
function ghostDraw(p) { objDraw(p.obj, p.x - cam, p.y - p.z + 2, { sc: p.sc, flip: p.dir < 0, a: 0.78 }); }
function arrowOf(f, fx, o) {
  const aim = f.buff.aim > 0;
  const p = shoot(f, Object.assign({ fx, sc: 0.55, homing: aim ? 0.08 : 0 }, o, { dmg: Math.round(o.dmg * (aim ? 1.4 : 1)) }));
  if (o.target) { const t = o.target; p.update = (p) => { if (alive(t)) { p.vx = lerp(p.vx, Math.sign(t.x - p.x) * o.spd, 0.3); p.vy = clamp(t.y - p.y, -3, 3); p.vz = clamp(t.z + 30 - p.z, -3, 3); p.dir = Math.sign(p.vx) || p.dir; } shotUpdate(p); }; }
  return p;
}
function volley(f, vy) { S.shot(); arrowOf(f, "arrowBlue", { spd: 7.5, vy, z: 18, dmg: 22, sc: 0.45 }); }
// the fighters in roster order; the last two appear only once the arcade has been finished
const ORDER = ["rai", "kai", "rook", "crane", "ox", "rollback", "surya", "hima", "jogi", "meera", "ashwatthama", "jatayu", "ghatotkacha", "barbarik"];

/* quick moves, NTSD style: two buttons pressed together for a small, fast technique (30 chakra).
     QJ  Jump + Attack     a quick strike or shot
     QD  Attack + Defend   a shove that wins back space: good for getting out of a corner */
function qStrike(name, pose, hit, o = {}) {
  return Object.assign({ name, mp: 30, len: o.len || 22, pose: tl([0, o.wind || "m0"], [4, pose], [(o.len || 22) - 4, o.rest || "m0"]),
    hit: Object.assign({ from: 4, to: 9, range: [2, 38], dmg: 16, stun: 16 }, hit),
    ev: { 4: (f) => { S.swing(); swooshAt(f, 16, 0.55, o.rot || 0.3); } } }, o.extra);
}
function qShot(name, pose, shot, o = {}) {
  return { name, mp: 30, len: 22, pose: tl([0, o.wind || "m0"], [4, pose], [18, o.rest || "m0"]),
    ev: { 6: (f) => { S.shot(); shoot(f, Object.assign({ spd: 6.6, dmg: 14, power: 1, life: 60 }, shot)); } } };
}
function qShove(name, pose, col, o = {}) {
  return { name, mp: 30, len: 24, pose: tl([0, o.wind || "p0"], [5, pose], [20, o.rest || "m0"]),
    hit: { from: 5, to: 9, range: [0, 36], dmg: o.dmg || 10, knock: true, kx: 3.6, kz: 1.8, gb: 24, spark: col },
    ev: { 5: (f) => { S.swing(); burst(f.x + f.face * 18, f.y, f.z + 30, col, 8); swooshAt(f, 18, 0.6, 0); if (o.ev) o.ev(f); } } };
}
const qDash = (v, until) => ({ vel: (f, t) => (t < until ? v : 0) });
const SMALL = {
  rai: { QJ: qStrike("Rising Palm", "m4", { zr: [0, 62], knock: true, kz: 4.2, kx: 0.6 }), QD: qShove("Prana Push", "m3", "#9fe0ff") },
  kai: { QJ: qStrike("Spark Kick", "m5", { dmg: 15, eff: "stun", dur: 12, spark: "#fff38a" }, { extra: qDash(4.4, 9) }), QD: qShove("Static Shove", "m3", "#fff38a") },
  rook: { QJ: qStrike("Urumi Flick", "m6", { range: [10, 64], dmg: 14 }), QD: qShove("Kalari Sweep", "m5", "#ffd36a", { dmg: 12 }) },
  crane: { QJ: qShot("Kite Dart", "m3", { fx: "spark", sc: 0.55, spd: 7.2, dmg: 12, trail: "#cfe8ff" }), QD: qShove("Wind Shove", "m3", "#cfe8ff", { dmg: 8 }) },
  ox: { QJ: qStrike("Shoulder Barge", "m6", { dmg: 18, knock: true, kx: 3, kz: 2 }, { extra: qDash(4.2, 10) }), QD: qShove("Headbutt", "m3", "#d39a5a", { dmg: 14, ev: () => { shake = Math.max(shake, 3); } }) },
  rollback: { QJ: qShot("Tick Blade", "m3", { obj: "clockhand", sc: 0.4, spin: 0.5, objDy: 0, dmg: 13 }), QD: qShove("Pause Push", "m3", "#e8c05a") },
  surya: { QJ: qShot("Ember Flick", "m3", { fx: "fireball", sc: 0.45, dmg: 12, eff: "burn", dur: 40, trail: "#ffb050" }), QD: qShove("Heat Burst", "m6", "#ff8a3a", { ev: (f) => { for (let i = 0; i < 4; i++) flame(f.x + f.face * 20, f.y, 1); } }) },
  hima: { QJ: qStrike("Frost Kick", "m5", { dmg: 14, eff: "slow", dur: 60, spark: "#bff2ff" }), QD: qShove("Cold Snap", "m3", "#bff2ff") },
  jogi: { QJ: qStrike("Fang Snap", "m3", { range: [6, 46], dmg: 12, eff: "poison", dur: 60, spark: "#7fe07a" }, { extra: qDash(3, 8) }), QD: qShove("Hiss Back", "m6", "#7fe07a") },
  meera: { QJ: qStrike("Pirouette", "m5", { from: 4, to: 13, every: 4, range: [-14, 34], dmg: 8 }, { len: 24 }), QD: qShove("Tatkar Step", "m3", "#c58aff") },
  ashwatthama: { QJ: qShot("Quick Arrow", "m3", { fx: "arrow", sc: 0.5, spd: 8.4, dmg: 14, trail: "#ffe9a8" }), QD: qShove("Bow Strike", "m6", "#ffe9a8", { dmg: 12 }) },
  jatayu: { QJ: qStrike("Talon Rake", "s6", { range: [4, 46], dmg: 18, knock: true, kz: 3, kx: 1.5 }, { wind: "s4", rest: "s0", extra: qDash(3.6, 9) }), QD: qShove("Wing Buffet", "s5", "#ffcf4a", { dmg: 12, wind: "s4", rest: "s0" }) },
  ghatotkacha: { QJ: qStrike("Gada Swing", "x1", { range: [0, 52], dmg: 20, knock: true, kz: 2.5, kx: 2.5 }, { wind: "x0" }), QD: qShove("Stomp", "x2", "#9a6bff", { dmg: 14, ev: (f) => { shake = Math.max(shake, 4); dust(f.x, f.y, 8); } }) },
  barbarik: { QJ: qShot("Snap Shot", "m3", { fx: "arrowBlue", sc: 0.5, spd: 8.6, dmg: 15, trail: "#9fd0ff" }), QD: qShove("Bow Bash", "m6", "#7fc4ff", { dmg: 12 }) }
};
for (const id of ORDER) ROSTER[id].small = SMALL[id];

/* chakra prices: a special takes a real bite out of the bar, a Hell move most of it and
   the Awakened move all of it, so the big moves have to be earned or charged (J+K+L) */
for (const id of ORDER) for (const [code, m] of Object.entries(ROSTER[id].moves)) {
  m.mp = code === "H1" ? 400 : code === "H2" ? 500 : Math.round(clamp(m.mp * 1.6, 80, 200) / 10) * 10;
}
