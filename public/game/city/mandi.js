/* Rollback City: the Mandi district (DESIGN 4, district 2; 7.1 schedules).
   A plain script that shares globals with the others; index.html loads them in order.

   Through Mandi Gate lies the wholesale market: the Mandi main road (godowns and stalls), the
   weighbridge yard where the Tola Gang "weighs" every cart, the truck yard, Bhola's akhada and
   Lakhan's garage. From 5 to 10 in the morning the mandi rushes: trucks fill the road, porters
   carry sacks through the crowd. By day it haggles; by night it is empty stalls and card games.
   Handcarts stand about: hit one and it rolls, knocking over whoever is in the way.

   Interiors can have people in them (street.npcs: a fighter's sheet or a townsperson) and things
   to talk to (street.talk); the akhada also has Bhola's training (street.train). */
"use strict";

const rushHour = () => clockRuns() && hour() >= 5 && hour() < 10;
const inMandi = () => !!street && street.district === "mandi";

/* ---------- porters in the rush ---------- */
// a porter is a passer-by drawn from the Tola Gang's porter sheet, sack on his head, in a hurry
function makePorter(x) {
  fighterArt("porter");
  return { civ: true, raw: true, sheet: "porter", x, y: rand(Y0 + 2, Y1 - 2), face: Math.random() < 0.5 ? -1 : 1, st: "walk", walkPh: rand(0, 6), speed: rand(0.8, 1.1), wx: clamp(x + rand(-500, 500), 20, street.w - 20), wait: 0 };
}

/* ---------- handcarts ---------- */
let carts = [];
function setupCarts() { carts = (street.props || []).filter((pr) => pr.kind === "handcart").map((pr) => ({ cart: true, x: pr.x, y: pr.y || 182, vx: 0, by: null })); }
function updateCarts() {
  for (const c of carts) {
    // a punch or a kick sends it rolling; walking into it shoves it along
    for (const p of alivePlayers()) {
      if (Math.abs(p.y - c.y) > 12) continue;
      const dx = c.x - p.x, act = activeAtk(p);
      if (act && Math.sign(dx) === p.face && Math.abs(dx) < 30 + act[0].reach && !p.hits.has(c)) { p.hits.add(c); c.vx = p.face * (act[0].knock ? 6.5 : 4.5); c.by = p; Arcade.noise(0.12, 0.06); }
      else if (!act && Math.abs(dx) < 26 && (p.st === "walk" || p.st === "run") && Math.sign(dx) === p.face && Math.abs(c.vx) < 1.2) { c.vx = p.face * (p.st === "run" ? 2.4 : 1.1); c.by = p; }
    }
    if (!c.vx) continue;
    c.x += c.vx; c.vx *= 0.975; if (Math.abs(c.vx) < 0.15) c.vx = 0;
    if (c.x < 30 || c.x > street.w - 30) { c.x = clamp(c.x, 30, street.w - 30); c.vx = -c.vx * 0.3; Arcade.noise(0.1, 0.05); }
    if (Math.abs(c.vx) < 2) continue;
    for (const e of enemies) {
      if (e.cartHit === c && frameNo - e.cartF < 40 || Math.abs(e.x - c.x) > 26 || Math.abs(e.y - c.y) > 12 || DOWN_STATES.includes(e.st) || e.inv > 0) continue;
      e.cartHit = c; e.cartF = frameNo;
      hurt(e, { x: c.x - Math.sign(c.vx) * 10, face: Math.sign(c.vx), team: "p", kind: "kai", owner: c.by }, { dmg: 10, knock: true, sfx: 220 });
      texts.push({ x: e.x, y: e.y - 64, s: pick(["Thadaak!", "Hatt!", "Sabzi delivery!"]), t: 60 });
      c.vx *= 0.6;
    }
  }
}
function drawCart(c, P) {
  const x = Math.round(c.x - cam); if (x < -60 || x > LW + 60) return;
  g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, c.y, 26, 4, 0, 0, 7); g.fill();
  if (!spr("v_handcart", x, c.y + 2, c.vx < 0)) { R(x - 26, c.y - 22, 52, 8, "#8a6a4a"); R(x - 20, c.y - 14, 8, 14, P.ol); R(x + 12, c.y - 14, 8, 14, P.ol); }
}

/* ---------- people in the interiors, and what you can do with them ---------- */
let npcs = [];
function setupNpcs() {
  npcs = (street.npcs || []).filter((n) => (!n.needs || progress.done.includes(n.needs)) && hourIn(n.hours) && (!n.when || n.when())).map((n) => {
    if (n.kind) { fighterArt(SHEET_OF[n.kind]); const f = fighter(n.kind, n.x, n.y || Y0 + 12, "n"); f.face = n.face || -1; return f; }   // load its sheet, or it draws as the stand-in
    return { civ: true, look: n.look, base: n.base || 0, x: n.x, y: n.y || Y0 + 12, face: n.face || -1, st: "stand", walkPh: 0 };
  });
}
function talkTarget(p) {
  const t = (street.talk || []).find((t) => Math.abs(t.x - p.x) < 26 && (!t.needs || progress.done.includes(t.needs)) && hourIn(t.hours) && (!t.when || t.when()));
  if (t) return { label: t.label, x: t.x, y: Y0 - 54, act: () => (t.act ? t.act(t.x) : say([{ who: t.who, name: t.name, text: typeof t.lines === "function" ? t.lines() : pick(t.lines) }])) };
  if (street.train && Math.abs(street.train - p.x) < 26) {
    const s = stat("strength"), cost = 300 * (s + 1);
    if (s >= STAT_MAX) return { label: "Strength: full", x: street.train, y: Y0 - 54, act: () => say([{ who: "ox", text: "Nothing left for me to teach your arms. Now teach your head." }]) };
    return { label: "Train with Bhola: Strength " + s + "/" + STAT_MAX + " (" + rupees(cost) + ")", x: street.train, y: Y0 - 54, act: () => trainHere(cost) };
  }
  return null;
}
// an hour in the pit with Bhola: a point of strength, once a day, if you can pay
function trainHere(cost) {
  if (progress.trained === progress.clock.day) { say([{ who: "ox", text: "Enough for today. Muscles grow while you sleep, not while you show off. Come back tomorrow." }]); return; }
  if (money() < cost) { say([{ who: "ox", text: "Training costs " + rupees(cost) + ". Come back with it. The akhada does not run on promises." }]); return; }
  progress.money -= cost; progress.trained = progress.clock.day; raiseStat("strength");
  progress.clock.min = Math.min(23 * 60 + 50, progress.clock.min + 60);
  say([{ who: "N", dark: 0.6, text: "An hour of dand-baithak in the red earth, then Bhola sits on your back for the push-ups." },
    { who: "ox", text: pick(["Again. Again. Good. Strength " + stat("strength") + ". Your Nani will feel it in your hugs.", "Now you hit like a cart. A small cart. Strength " + stat("strength") + "."]) }]);
}

/* ---------- painters ---------- */
// an open yard behind a compound wall: the weighbridge, the truck yard
function drawYard(P) {
  const L = look(), d = P.dark, wall = d ? "#575047" : "#d9cdb4", earth = d ? "#4a3e32" : "#b8a07c";
  R(0, 0, LW, LH, P.sky); stars(P, 30, 60); skyline(P, 0.3, 100, 44); drawCrows(9);
  R(0, 92, LW, 58, wall); R(0, 90, LW, 3, shade(wall, -0.3));
  for (let x = -(cam % 5); x < LW; x += 5) R(x, 88, 2, 2, d ? "#6d8a7a" : "#9cc2ae");   // glass along the top
  for (let i = Math.floor(cam / 96) - 1; i < Math.floor(cam / 96) + LW / 96 + 2; i++) {
    const x = i * 96 - cam; R(x, 86, 8, 64, shade(wall, -0.14)); R(x - 1, 84, 10, 3, shade(wall, -0.3));
    if (i % 3 === 0) {   // a floodlight on every third pillar, lit at night
      R(x + 3, 40, 2, 46, P.rail); R(x - 3, 36, 14, 5, P.ol);
      if (d) { g.globalAlpha = 0.12; g.fillStyle = P.lamp; g.beginPath(); g.moveTo(x - 3, 41); g.lineTo(x + 11, 41); g.lineTo(x + 50, 180); g.lineTo(x - 42, 180); g.fill(); g.globalAlpha = 1; R(x - 2, 40, 12, 2, P.lamp); }
    }
  }
  for (const [sx, s, c] of L.signs || []) { const x = Math.round(sx - cam); if (x < -90 || x > LW + 90) continue; R(x - 52, 100, 104, 20, d ? shade(c, -0.35) : c); text(s, x, 114, 7, "#f7f4ee"); }
  for (const tx of L.trucks || []) { const x = Math.round(tx - cam); if (x > -110 && x < LW + 110 && !sprAt("v_truck", x, 152, false, 1.3)) { R(x - 60, 110, 120, 40, "#2b54a8"); R(x + 34, 98, 26, 30, "#c0392b"); } }
  R(0, 150, LW, LH - 150, earth);
  for (let y = 156; y < LH; y += 7) for (let x = -(cam % 46) - 46; x < LW; x += 46) R(x + ((y * 13) % 46), y, 12, 1, shade(earth, -0.12));
  R(0, 184, LW, 2, shade(earth, -0.18)); R(0, 199, LW, 2, shade(earth, -0.18));   // tyre ruts
  if (L.weighbridge !== undefined) drawWeighbridge(P, Math.round(L.weighbridge - cam));
}
// the weighbridge: a steel deck set into the yard, the weigher's cabin and its big dial
function drawWeighbridge(P, x) {
  if (x < -200 || x > LW + 200) return;
  const steel = P.dark ? "#5d6670" : "#9aa5b0";
  R(x - 80, 164, 160, 26, steel); R(x - 80, 164, 160, 2, shade(steel, 0.25));
  for (let s = 0; s < 160; s += 8) { R(x - 80 + s, 162, 4, 2, "#f2c230"); R(x - 76 + s, 162, 4, 2, P.ol); R(x - 80 + s, 190, 4, 2, "#f2c230"); R(x - 76 + s, 190, 4, 2, P.ol); }
  for (let s = 6; s < 160; s += 20) for (const yy of [168, 184]) R(x - 80 + s, yy, 2, 2, shade(steel, -0.3));
  const cx = x - 130, cab = P.dark ? "#4e5a4a" : "#9fb39a";
  R(cx - 22, 98, 44, 52, cab); R(cx - 24, 94, 48, 5, shade(cab, -0.3)); R(cx - 14, 108, 28, 16, P.dark ? P.glassLit : P.glass); R(cx - 6, 128, 12, 22, shade(cab, -0.3));
  g.fillStyle = "#f7f4ee"; g.beginPath(); g.arc(cx, 76, 13, 0, 7); g.fill(); g.strokeStyle = P.ol; g.lineWidth = 1.5; g.stroke();
  const a = -Math.PI / 2 + Math.sin(frameNo / 70) * 0.4 + (rushHour() ? 1.2 : 0.2);
  g.beginPath(); g.moveTo(cx, 76); g.lineTo(cx + Math.cos(a) * 10, 76 + Math.sin(a) * 10); g.strokeStyle = "#c0392b"; g.stroke();
  R(cx - 1, 89, 2, 6, P.ol); text("KG", cx, 84, 4, P.ol);
}
// Bhola's akhada: lime-washed walls gone yellow with damp, a beam and a climbing rope, a barred
// window with the light falling on the pit, the founder's photograph, clubs on a rack, red earth
function drawAkhada(P) {
  const x0 = Math.round(-cam), d = P.dark, wall = d ? "#575046" : "#ece3cf", ink = d ? "#8fb3ff" : "#2b54a8";
  R(0, 0, LW, LH, wall);
  // damp and age: a tide line of yellow along the bottom, a few hairline cracks, patches where the lime fell off
  g.globalAlpha = d ? 0.18 : 0.22; R(0, 104, LW, 24, "#c9a76a"); R(0, 116, LW, 12, "#b8924e"); g.globalAlpha = 1;
  for (const [cx, cy, l] of [[24, 30, 18], [150, 60, 14], [236, 92, 20], [356, 34, 12]]) for (let k = 0; k < l; k++) R(x0 + cx + Math.round(Math.sin(k * 1.7) * 2), cy + k, 1, 1, shade(wall, -0.28));
  for (const [px, py, w, h] of [[96, 82, 10, 6], [262, 112, 14, 8], [12, 96, 8, 5]]) { R(x0 + px, py, w, h, d ? "#6b5a48" : "#c8a888"); R(x0 + px + 2, py + h, w - 4, 1, shade(wall, -0.2)); }
  R(0, 128, LW, 22, shade(wall, -0.12)); R(0, 127, LW, 2, shade(wall, -0.3));   // the dado
  // the beam, and a thick rope hanging from it, swaying a little
  R(0, 12, LW, 7, d ? "#3a2a1c" : "#6b4a2a"); R(0, 12, LW, 1, d ? "#5a4230" : "#8a6a42"); for (let x = (x0 % 48 + 48) % 48; x < LW; x += 48) R(x, 12, 2, 7, d ? "#2a1e14" : "#4a321c");
  const sw = Math.sin(frameNo / 50) * 2;
  for (let y = 19; y < 108; y += 3) { const rx = x0 + 120 + Math.round(sw * (y - 19) / 90); R(rx - 1, y, 3, 3, (y / 3) % 2 ? "#b8925a" : "#d4b27a"); }
  R(x0 + 117 + Math.round(sw), 106, 7, 5, "#8a6a3a");   // the knot at the end
  // a high barred window and its shaft of light across the pit
  const wx = x0 + 236; R(wx, 26, 40, 30, d ? "#1c2230" : "#fff4d8"); for (let k = 1; k < 5; k++) R(wx + k * 8, 26, 2, 30, d ? "#2a2a2a" : "#6b4a2a"); R(wx - 2, 24, 44, 3, d ? "#3a2a1c" : "#8a6a42"); R(wx - 2, 56, 44, 3, d ? "#3a2a1c" : "#8a6a42");
  if (!d) { g.globalAlpha = 0.1; g.fillStyle = "#fff1c8"; g.beginPath(); g.moveTo(wx, 56); g.lineTo(wx + 40, 56); g.lineTo(wx + 10, 196); g.lineTo(wx - 46, 196); g.fill(); g.globalAlpha = 1; }
  // the founder, in a garlanded frame: the akhada's name painted under him
  if (!sprAt("a_photo", x0 + 176, 96, false, 1)) { R(x0 + 156, 30, 40, 52, "#6b4a2a"); R(x0 + 160, 34, 32, 44, "#c8b08a"); }
  text("BHOLA AKHADA", x0 + 176, 108, 6, ink); text("EST. 1961", x0 + 176, 116, 5, ink);
  text("NO SHOES IN THE PIT", x0 + 66, 106, 5, ink); text("RESPECT THE EARTH", x0 + 66, 114, 5, ink);   // under the board, clear of the HUD
  // the club rack and the gada
  if (!sprAt("a_rack", x0 + 296, 104, false, 1)) {
    R(x0 + 270, 60, 60, 3, "#6b4e24");
    for (let i = 0; i < 4; i++) { const cx = x0 + 278 + i * 14; R(cx - 3, 64, 6, 30, "#8a5a32"); R(cx - 4, 82, 8, 14, "#6b3e22"); R(cx - 1, 60, 2, 4, "#3a2c24"); }
  }
  // the pit: red earth, raked, with a rim of white lime; footprints from this morning
  R(0, 150, LW, LH - 150, d ? "#6b3d2a" : "#b8603c");
  for (let y = 154; y < LH; y += 5) for (let x = (y * 7) % 18; x < LW; x += 18) R(x, y, 8, 1, d ? "#5a3020" : "#a3502f");
  for (const [fx, fy] of [[110, 170], [126, 176], [150, 168], [168, 175], [250, 190], [268, 184]]) { R(x0 + fx, fy, 4, 2, d ? "#4a2a1a" : "#94442a"); R(x0 + fx + 1, fy - 2, 2, 1, d ? "#4a2a1a" : "#94442a"); }
  R(x0 + 60, 150, 264, 2, "#f7f4ee"); R(x0 + 60, 150, 2, LH - 150, "#f7f4ee"); R(x0 + 322, 150, 2, LH - 150, "#f7f4ee");
  // a brass lota and a folded gamcha by the pit's edge
  R(x0 + 334, 144, 8, 7, "#c9a227"); R(x0 + 335, 142, 6, 2, "#e2c25a"); R(x0 + 336, 146, 2, 3, "#f2dc8a");
  R(x0 + 346, 146, 14, 5, "#c0392b"); for (let k = 0; k < 4; k++) R(x0 + 347 + k * 3, 146, 1, 5, "#efe6d2");
  R(x0 + 334, 66, 36, 62, P.trim); R(x0 + 338, 70, 28, 58, d ? "#141822" : "#7a6a52");   // the door out
  drawAkhadaHub(P);
}
// Lakhan's garage: a tin shutter rolled up, a tool wall, tyres, and a scooter on its stand
function drawGarage(P) {
  const x0 = Math.round(-cam), d = P.dark, wall = d ? "#4a4e52" : "#c9ccc4";
  R(0, 0, LW, LH, wall); R(0, 0, LW, 20, shade(wall, -0.35));
  for (let x = x0; x < x0 + LW + 40; x += 8) R(x, 0, 1, 20, shade(wall, -0.5));   // the rolled-up shutter
  R(x0 + 30, 34, 140, 70, d ? "#3a3e42" : "#9ea39a");   // pegboard
  for (let y = 38; y < 102; y += 6) for (let x = 34; x < 168; x += 6) R(x0 + x, y, 1, 1, shade(wall, -0.45));
  for (let i = 0; i < 7; i++) { const tx = x0 + 42 + i * 18; R(tx, 44, 3, 24 + (i % 3) * 6, i % 2 ? "#c0392b" : "#5d6670"); R(tx - 2, 44, 7, 4, "#5d6670"); }
  text("LAKHAN AUTO WORKS", x0 + 100, 28, 6, P.amber); text("VROOM VROOM", x0 + 100, 116, 5, d ? "#8fb3ff" : "#2b54a8");
  // tyres stacked, oil drums, a calendar from 1987
  for (let i = 0; i < 4; i++) { g.fillStyle = "#1d1b18"; g.beginPath(); g.ellipse(x0 + 222, 140 - i * 10, 18, 6, 0, 0, 7); g.fill(); g.fillStyle = "#3a3632"; g.beginPath(); g.ellipse(x0 + 222, 140 - i * 10, 8, 2.5, 0, 0, 7); g.fill(); }
  R(x0 + 254, 104, 18, 46, "#2b54a8"); R(x0 + 254, 112, 18, 2, "#1d3a7a"); R(x0 + 276, 108, 18, 42, "#c0392b"); R(x0 + 276, 116, 18, 2, "#8a2a20");
  R(x0 + 300, 36, 26, 34, "#f7f4ee"); R(x0 + 300, 36, 26, 8, "#c0392b"); text("1987", x0 + 313, 62, 6, P.ol);
  R(0, 150, LW, LH - 150, d ? "#2f3236" : "#8e918a");
  for (let i = 0; i < 5; i++) { g.fillStyle = d ? "rgba(0,0,0,0.3)" : "rgba(30,30,30,0.18)"; g.beginPath(); g.ellipse(x0 + 60 + i * 66, 176 + (i % 2) * 14, 14 + (i % 3) * 4, 4, 0, 0, 7); g.fill(); }   // oil stains
  spr("v_scooter", x0 + 120, 186);
  R(x0 + 334, 66, 36, 84, P.trim); R(x0 + 338, 70, 28, 80, d ? "#141822" : "#5d6b78");   // the door out
}
