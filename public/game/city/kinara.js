/* Rollback City: Sagar Kinara, the seafront (DESIGN 4, district 3; 3.2 of the plan).
   A plain script that shares globals with the others; index.html loads them in order.

   The promenade runs along the sea wall: the sea at the back of the band, the road at the front.
   Throw a goonda at the wall and he goes over it, into the sea. Hotel Marina and Club 1987 stand
   on the promenade where the wall gives way (street.look.blocks), and the open-air screen waits
   for a film (look.screen). At night the Neon Saanp ride the seafront on motorbikes: they come up
   alongside anyone riding and punch; any hit knocks a rider off, and his bike is yours to take.
   Club 1987 is a room with a sound system (street.radio), so Rewind FM plays inside. */
"use strict";

// a wall to throw people over, wherever no building stands in front of the sea
const seaHere = (x) => street.look && street.look.sea && !(street.look.blocks || []).some(([a, b]) => x > a - 20 && x < b + 20);

/* ---------- bike brawls ---------- */
let bikerT = 600, lootN = 0;
function updateBikers() {
  const raid = brawling();   // an instalment run: the Saanp come by day too, and faster
  if (street.theme !== "seafront" || (mission && !raid) || arena || (!isNight() && !raid)) return;
  const riding = alivePlayers().filter((p) => p.ride && p.ride.rider === p);
  if (!riding.length || --bikerT > 0) return;
  bikerT = Math.round(raid ? rand(2.5, 4) * 60 : rand(12, 22) * 60);
  if (enemies.filter((e) => e.bike && !DOWN_STATES.includes(e.st)).length >= (raid ? 3 : 2)) return;
  const p = riding[0], from = p.ride.face > 0 ? cam - 40 : cam + LW + 40;
  fighterArt("biker");
  const e = fighter("biker", from, clamp(p.y + rand(-14, 14), Y0 + 4, Y1), "e");
  Object.assign(e, { roam: true, aggro: true, cool: 60, side: Math.random() < 0.5 ? -1 : 1, z: SEAT_Z });
  e.bike = { veh: true, kind: "motorbike", x: e.x, y: e.y, face: 1, down: 0, vx: 0 };
  texts.push({ x: clamp(e.x, cam + 30, cam + LW - 30), y: e.y - 70, s: pick(["Saanp! Saanp!", "Nice scooter. Mine now.", "Race you, lane boy!"]), t: 80 });
  enemies.push(e);
}
// one biker's turn (from updateEnemy, unless he is mid-punch): keep alongside, punch when level
function updateBiker(e) {
  const b = e.bike;
  if (["fly", "thrown", "lying", "grabbed", "hurt"].includes(e.st)) { offTheBike(e); return; }
  const p = alivePlayers().reduce((a, q) => (!a || Math.abs(q.x - e.x) < Math.abs(a.x - e.x) ? q : a), null);
  if (!p) return;
  const wantX = p.x + e.side * 18, wantY = clamp(p.y + (e.y > p.y ? 4 : -4), Y0 + 2, Y1);
  b.vx = clamp(b.vx + Math.sign(wantX - e.x) * 0.2, -5.6, 5.6); if (Math.abs(wantX - e.x) < 12) b.vx *= 0.85;
  e.x = clamp(e.x + b.vx, 12, street.w - 12); e.y += clamp(wantY - e.y, -1.1, 1.1); e.z = SEAT_Z;
  e.face = Math.sign(p.x - e.x) || e.face; setState(e, "ride", e.t + 1);
  Object.assign(b, { x: e.x - e.face * VEHICLES.motorbike.seat[0], y: e.y, face: e.face });
  if (e.cool > 0) e.cool--;
  if (e.cool <= 0 && Math.abs(e.x - p.x) < 34 && Math.abs(e.y - p.y) < 12) { windup(e, "ePunch", 10); e.cool = rand(70, 110); }
  // left far behind, he gives up
  if (e.x < cam - LW || e.x > cam + 2 * LW) e.gone = true;
}
// knocked off: he tumbles, and his motorbike skids over, free for anyone to ride
function offTheBike(e) {
  const b = e.bike; e.bike = null;
  texts.push({ x: e.x, y: e.y - 64, s: "Off the bike!", t: 70 }); shake = Math.max(shake, 5); Arcade.noise(0.25, 0.08);
  rides.push({ veh: true, id: "loot" + (++lootN), kind: "motorbike", x: b.x, y: clamp(b.y, Y0 + 4, Y1), vx: b.vx * 0.5, face: b.face, rider: null, pillion: null, down: 70, paveT: 0, loot: true });
}

/* ---------- painters ---------- */
function drawSeafront(P) {
  const L = look(), d = P.dark;
  if (!backdrop("sea", 128)) {   // the painted far layer; the old drawn one until it loads
  R(0, 0, LW, LH, P.sky); stars(P, 50, 60);
    g.fillStyle = d ? "#e8e2c8" : "#fff4d8"; g.beginPath(); g.arc(LW * 0.7 - cam * 0.02, 30, d ? 9 : 13, 0, 7); g.fill();
    // the Arabian Sea, with ships on the horizon and waves rolling in
    const sea = d ? "#173048" : "#3e8fb0", seaLo = d ? "#122638" : "#337a98";
    R(0, 66, LW, 64, sea); R(0, 96, LW, 34, seaLo); R(0, 66, LW, 1, d ? "#2a4a66" : "#8cc4da");
    for (let i = -1; i < 6; i++) { const sx = i * 220 - ((cam * 0.15) % 220); R(sx + 40, 60, 30, 6, d ? "#0e1a26" : "#4a5a66"); R(sx + 52, 52, 6, 8, d ? "#0e1a26" : "#4a5a66"); if (d) R(sx + 66, 62, 1, 1, "#f2c230"); }
    for (let y = 72; y < 130; y += 7) for (let x = -((cam * (0.3 + y / 400) + frameNo * 0.3) % 40) - 40; x < LW; x += 40) R(x + (y * 13) % 40, y, 12 + (y - 72) / 6, 1, d ? "#2a4a66" : "#a8d8ea");
  }
  // the buildings that stand on the promenade, then the wall everywhere else
  for (const [a, b, kind] of L.blocks || []) { const x0 = Math.round(a - cam), x1 = Math.round(b - cam); if (x1 < -10 || x0 > LW + 10) continue; (kind === "club" ? drawClubFront : drawHotelFront)(P, x0, x1 - x0); }
  const wall = d ? "#5a5650" : "#b8b0a0";
  for (let x = -((cam) % 48) - 48; x < LW; x += 48) {
    const wx = x + cam; if ((L.blocks || []).some(([a, b]) => wx + 24 > a && wx + 24 < b)) continue;   // right up to the buildings, no gap
    R(x, 126, 48, 24, wall); R(x, 124, 48, 3, shade(wall, 0.15)); R(x + 47, 126, 1, 24, shade(wall, -0.25));
    for (let k = 0; k < 4; k++) R(x + 6 + k * 12, 112, 2, 12, P.rail);
    R(x, 112, 48, 2, P.rail);
  }
  if (L.screen !== undefined) drawScreen(P, Math.round(L.screen - cam));
  for (let lx = 130; lx < street.w; lx += 260) { const x = Math.round(lx - cam); if (x > -30 && x < LW + 30 && seaHere(lx)) { spr("m_seadlamp", x, 150); if (d) { g.globalAlpha = 0.12; g.fillStyle = P.lamp; g.beginPath(); g.ellipse(x, 160, 30, 8, 0, 0, 7); g.fill(); g.globalAlpha = 1; } } }
  // the promenade, the kerb and the road
  const prom = d ? "#4a4440" : "#cfc4ae";
  R(0, 150, LW, 26, prom); for (let x = -(cam % 24); x < LW; x += 24) R(x, 150, 1, 26, shade(prom, -0.12)); R(0, 162, LW, 1, shade(prom, -0.12));
  R(0, 174, LW, 3, P.curb); R(0, 177, LW, LH - 177, P.road);
  for (let x = -(cam % 60); x < LW; x += 60) R(x, 197, 28, 2, d ? "#8a8478" : "#f7f4ee");
}
function drawHotelFront(P, x, w) {
  const d = P.dark, wall = d ? "#6a6458" : "#f2ead8";
  // the painted art deco front (MOSS), with the hotel's name on the plaque over the arch
  if (SPRITES.bg_hotel) {
    g.drawImage(SPRITES.bg_hotel, x, 8, w, 142);
    R(x, 14, 2, 136, shade(wall, -0.35)); R(x + w - 2, 14, 2, 136, shade(wall, -0.35));   // the building's ends, so it stands in front of the sea rather than butting into it
    if (d) for (let k = 0; k < 9; k++) { const wx = x + w * (0.08 + k * 0.105), wy = 8 + 142 * (0.22 + (k % 3) * 0.17); if ((k * 7 + 3) % 4) { g.globalAlpha = 0.55; R(wx, wy, 5, 8, P.glassLit); g.globalAlpha = 1; } }   // a few rooms still up
    const pw = Math.round(w * 0.3), px = Math.round(x + w / 2 - pw / 2), py = Math.round(8 + 142 * 0.555);
    R(px, py, pw, 12, d ? "#2a2018" : "#4a3424"); R(px, py, pw, 1, "#c9a227"); R(px, py + 11, pw, 1, "#c9a227");
    text("HOTEL MARINA", x + w / 2, py + 9, 8, d ? "#f2c230" : "#e8c068", "center", "Newsreader");
    return;
  }
  R(x, 8, w, 142, wall); R(x, 8, w, 6, shade(wall, -0.25));
  for (let y = 24; y < 120; y += 16) for (let wx = x + 10; wx < x + w - 16; wx += 22) { const lit = d && ((wx + y) / 7 | 0) % 3 === 0; R(wx, y, 12, 10, lit ? P.glassLit : P.glass); R(wx - 1, y + 10, 14, 2, shade(wall, -0.2)); }
  R(x + w / 2 - 50, 120, 100, 30, d ? "#3a2c24" : "#8a5a32"); R(x + w / 2 - 16, 126, 32, 24, d ? "#1a1410" : "#4a3020");
  R(x + w / 2 - 56, 104, 112, 14, d ? "#2a2018" : "#5d4630"); text("HOTEL MARINA", x + w / 2, 115, 9, d ? "#f2c230" : "#b47a1a", "center", "Newsreader");
}
function drawClubFront(P, x, w) {
  const d = P.dark, flick = (frameNo % 200) < 6;
  // the painted front (MOSS), its blank neon panel lettered with the name, buzzing now and then
  if (SPRITES.bg_club) {
    g.drawImage(SPRITES.bg_club, x, 30, w, 120);
    g.globalAlpha = flick ? 0.35 : 1; text("CLUB 1987", x + w / 2, 30 + 120 * 0.455, 9, "#ff6ad5", "center", "Newsreader"); g.globalAlpha = 1;
    if (d) { g.globalAlpha = 0.18; g.fillStyle = "#c96bd8"; g.beginPath(); g.ellipse(x + w / 2, 156, 50, 10, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
    return;
  }
  R(x, 30, w, 120, "#1d1b22"); R(x, 30, w, 4, "#c96bd8");
  for (let i = 0; i < w; i += 6) R(x + i, 34, 3, 2, i % 12 ? "#3d7bff" : "#c96bd8");
  g.globalAlpha = flick ? 0.4 : 1; text("CLUB 1987", x + w / 2, 72, 14, d ? "#ff6ad5" : "#c0399f", "center", "Newsreader"); g.globalAlpha = 1;
  text("DISCO · FROM 10 PM", x + w / 2, 86, 5, "#8fb3ff");
  R(x + w / 2 - 18, 104, 36, 46, "#0e0c12"); R(x + w / 2 - 20, 102, 40, 3, "#c96bd8");
  if (d) { g.globalAlpha = 0.18; g.fillStyle = "#c96bd8"; g.beginPath(); g.ellipse(x + w / 2, 156, 50, 10, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
}
// the open-air screen on the promenade: a big white sheet between two poles, waiting for a film
function drawScreen(P, x) {
  if (x < -120 || x > LW + 120) return;
  R(x - 74, 40, 4, 110, P.rail); R(x + 70, 40, 4, 110, P.rail);
  R(x - 70, 46, 140, 66, P.dark ? "#d8d4c8" : "#fbfaf6"); R(x - 70, 46, 140, 2, "#9aa5b0"); R(x - 70, 110, 140, 2, "#9aa5b0");
  R(x - 50, 30, 100, 12, "#c0392b"); text("SITARA TALKIES PRESENTS", x, 39, 5, "#f7f4ee");
  drawReel(x);   // the finale: the 1987 reel on the big screen
}
// Club 1987: the dance floor, the DJ booth, a mirror ball, and the light it throws
function drawClub(P) {
  const x0 = Math.round(-cam), beat = Math.floor(radioHere() ? beatPos() : frameNo / 15);   // the floor keeps the music's time
  R(0, 0, LW, LH, "#120f18");
  for (let i = 0; i < 12; i++) { const a = frameNo / 60 + i * 0.52; g.globalAlpha = 0.08; g.fillStyle = i % 2 ? "#c96bd8" : "#3d7bff"; g.beginPath(); g.moveTo(x0 + 320, 22); g.lineTo(x0 + 320 + Math.cos(a) * 400 - 20, 150 + Math.sin(a) * 30); g.lineTo(x0 + 320 + Math.cos(a) * 400 + 20, 150 + Math.sin(a) * 30); g.fill(); }
  g.globalAlpha = 1;
  g.fillStyle = "#cfd6e0"; g.beginPath(); g.arc(x0 + 320, 22, 9, 0, 7); g.fill(); for (let i = 0; i < 6; i++) R(x0 + 314 + (i % 3) * 4, 16 + (i / 3 | 0) * 6, 2, 2, "#ffffff");
  // the stage: DJ Rewind's booth between two stacks of speakers, his name in lights above
  R(x0 + 200, 128, 240, 22, "#2a2232"); R(x0 + 200, 128, 240, 2, "#c96bd8");
  text("DJ REWIND", x0 + 320, 64, 10, (beat % 2) ? "#ff6ad5" : "#c96bd8", "center", "Newsreader");
  const thump = beat % 2 ? 1 : 0;
  if (!spr("c_speakers", x0 + 212, 150 + thump)) R(x0 + 192, 78, 40, 72, "#1d1b18");
  if (!spr("c_speakers", x0 + 428, 150 + thump)) R(x0 + 408, 78, 40, 72, "#1d1b18");
  if (!spr("c_djbooth", x0 + 320, 132)) { R(x0 + 280, 106, 80, 26, "#2a2232"); for (let i = 0; i < 4; i++) R(x0 + 284 + i * 20, 110, 14, 8, (beat + i) % 2 ? "#3d7bff" : "#c96bd8"); }
  // the bar on the left, the jukebox on the right, neon palms on the walls
  text("CLUB 1987", x0 + 90, 44, 12, "#c96bd8", "center", "Newsreader");
  spr("c_palm", x0 + 40, 104); spr("c_palm", x0 + 560, 104);
  spr("c_bar", x0 + 96, 150); sprAt("c_jukebox", x0 + 500, 150, false, 0.75);
  // the crowd at the back of the floor, swapping moves on the beat
  const D = SPRITES.dancers;
  if (D) for (let i = 0; i < 6; i++) {
    const k = (i % 4) + ((beat + i) % 2 ? 4 : 0), [sx, sy, w, h, ax, ay] = FIGHTER_FRAMES.dancers[k], dx = x0 + 170 + i * 58 + (i % 2) * 10;
    g.save(); g.translate(dx, 156 + (i % 2) * 3); if (i % 3 === 1) g.scale(-1, 1); g.drawImage(D, sx, sy, w, h, -ax / 2, -ay / 2, w / 2, h / 2); g.restore();
  }
  // the floor: tiles that light up with the beat
  for (let y = 150; y < LH; y += 12) for (let x = x0 - 24; x < x0 + street.w + 24; x += 24) {
    const k = (Math.floor((x - x0) / 24) + Math.floor(y / 12) + beat) % 4;
    R(x, y, 23, 11, ["#2a1f3a", "#3a1f4a", "#1f2a4a", "#4a1f3a"][k]);
  }
  R(0, 148, LW, 2, "#c96bd8");
  spr("c_table", x0 + 70, 206); spr("c_table", x0 + 580, 206);
  R(x0 + street.w - 50, 66, 36, 84, "#2a2232"); R(x0 + street.w - 46, 70, 28, 80, "#0e0c12");   // the door out
}
