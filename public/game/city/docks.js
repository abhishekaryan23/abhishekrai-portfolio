/* Rollback City: the docks (DESIGN 4, district 4; 3.4 of the plan). A plain script that shares
   globals with the others; index.html loads them in order.

   Bunder Docks: the fish market on wet ice (everyone slides), the quay and its cranes, boats
   moored at the back, the ice factory, and Godown No. 9, where the dock crews fight for money at
   night and anyone can bet. The open sea is a street of water: there you are always in a boat.
   Once Machhi Mausi is on your side (2-7) the ferries take you to any pier: the docks, Sagar
   Kinara, Mandi Ghat and the mill. */
"use strict";

/* ---------- ice: whoever walks on it keeps going ---------- */
const onIce = (f) => street.ice === true || !!(street.look && street.look.ice && f.x > street.look.ice[0] && f.x < street.look.ice[1]);
function updateIce() {
  if (!street.ice && !(street.look && street.look.ice)) return;
  for (const f of alivePlayers().concat(enemies)) {
    if (f.ride || f.bike || f.boat) continue;
    if (!onIce(f)) { f.iceV = 0; f.iceX = f.x; continue; }
    const dx = f.x - (f.iceX === undefined ? f.x : f.iceX);
    if (f.st === "walk" || f.st === "run") f.iceV = clamp((f.iceV || 0) * 0.85 + dx * 0.15, -3, 3);   // picking up speed
    else if (f.st === "idle" || f.st === "hurt" || f.st === "windup" || f.st === "attack") { f.x = clamp(f.x + (f.iceV || 0), 10, street.w - 10); f.iceV = (f.iceV || 0) * 0.95; }   // stopping takes a while
    if (Math.abs(f.iceV) > 1.6 && f.st === "idle" && Math.random() < 0.004 && f.team === "e") { setState(f, "fly"); f.vz = 2; f.z = 1; f.vx = f.iceV; sayAt(f.x, f.y - 60, "Arre arre arre!", 50); }
    f.iceX = f.x;
  }
}

/* ---------- the ferry ---------- */
const FERRY = [["docks", 2440, "Bunder Docks"], ["kinara", 2740, "Sagar Kinara"], ["ghat", 600, "Mandi Ghat"], ["millGate", 160, "Chandni Mills"]];
function ferryTarget(p) {
  const here = FERRY.find((f) => f[0] === street.id);
  if (!here || !flag("docks") || Math.abs(p.x - here[1]) > 24) return null;
  return { label: "Take the ferry (" + rupees(20) + ")", x: here[1], y: Y0 - 54, act: () => choose("The ferry", "\"Where to? Twenty rupees, any pier. Mind the gap, mind the fish.\"",
    FERRY.filter((f) => f !== here).map(([id, x, name]) => ({ label: name, act: () => {
      if (money() < 20) { sayAt(players[0].x, Y0 - 30, "\"Twenty rupees. Mausi's orders.\""); return; }
      progress.money -= 20; progress.clock.min = (progress.clock.min + 25) % 1440; travelTo(id, x + (id === "millGate" ? 40 : -40), Y0 + 10);
    } })).concat([{ label: "Stay here" }])) };
}

/* ---------- the open sea: everyone is in a boat ---------- */
// on a water street nobody gets off, and each player gets a seat in a boat
function seaSeats() {
  if (!street.water) return;
  for (const p of players) {
    if (!p || p.ride || p.lives <= 0) continue;
    const v = rides.find((r) => r.kind === "boat" && (!r.rider || !r.pillion)) || (rides.push({ veh: true, id: "seaboat" + rides.length, kind: "boat", x: p.x, y: 186, vx: 0, face: 1, rider: null, pillion: null, down: 0, paveT: 0, loot: true }), rides[rides.length - 1]);
    mount(p, v, v.rider ? "pillion" : "rider", true);
  }
}

/* ---------- Godown No. 9: bets and bouts ---------- */
let bout = null, ringFight = null;
const FIGHTERS9 = [["wrestler", "Bhima the Bull", 2, 0.55], ["hookman", "Hook Hussain", 2, 0.5], ["netman", "Machli Mohan", 3, 0.33], ["breaker", "Dancing Danny", 3, 0.3], ["biker", "Chain Charlie", 2.5, 0.42]];
function godownBet() {
  if (bout || ringFight || arena) { sayAt(players[0].x, Y0 - 30, "Wait for this one to finish"); return; }
  const pair = shuffle(FIGHTERS9).slice(0, 2), [a, b] = pair, pa = a[3] / (a[3] + b[3]);
  // the odds the bookie chalks up: fair odds, less his tenth
  const odds = (p) => Math.max(1.1, Math.round(0.9 / p * 10) / 10); a[2] = odds(pa); b[2] = odds(1 - pa);
  const stake = (n, side) => ({ label: rupees(n) + " on " + side[1] + " (pays " + side[2] + "x)", act: () => {
    if (money() < n) { sayAt(players[0].x, Y0 - 30, "\"Cash first, boss.\""); return; }
    progress.money -= n; startBout(a, b, side === a ? "a" : "b", n);
  } });
  choose("Tonight's bout", a[1] + " against " + b[1] + ". The bookie licks his pencil: \"" + a[1] + " pays " + a[2] + " to 1, " + b[1] + " pays " + b[2] + " to 1. Place your money.\"",
    [stake(100, a), stake(100, b), stake(500, a), stake(500, b)].concat(progress.ring === progress.clock.day ? [] : [{ label: "Fight in the ring yourself (" + rupees(800) + " prize)", act: ringTime }], [{ label: "Just watch" }]));
}
function startBout(A, B, pick1, stake) {
  for (const k of [A[0], B[0]]) fighterArt(SHEET_OF[k]);
  const a = fighter(A[0], 280, 182, "n"), b = fighter(B[0], 360, 182, "n");
  a.face = 1; b.face = -1;
  // the house: each favourite wins a little less often than his odds would pay for
  const pa = A[3] / (A[3] + B[3]);
  bout = { a, b, A, B, pick: pick1, stake, hits: { a: 0, b: 0 }, t: 0, winner: Math.random() < pa ? "a" : "b", over: 0 };
  npcs.push(a, b);
  banner = { text: A[1] + " v " + B[1], t: 100 };
}
function updateBout() {
  const B = bout; if (!B) return;
  B.t++;
  for (const f of [B.a, B.b]) { if (f.st === "attack" && ++f.t > f.atk.len) setState(f, "idle"); if (f.st === "hurt" && --f.t <= 0) setState(f, "idle"); }
  if (B.over) { if (--B.over === 0) { npcs = npcs.filter((n) => n !== B.a && n !== B.b); bout = null; } return; }
  if (B.t % 34 === 0) {
    // the winner lands more, but the loser gets his licks in
    const s = Math.random() < 0.62 ? B.winner : B.winner === "a" ? "b" : "a", att = B[s], def = s === "a" ? B.b : B.a;
    att.atk = ATK[pick(["ePunch", "eKick"])]; att.atkName = att.atk === ATK.ePunch ? "ePunch" : "eKick"; setState(att, "attack"); att.t = 0;
    setState(def, "hurt", 16); def.x += def.face * -3; Arcade.noise(0.05, 0.04); burst(def.x, def.y - 34, 4, PAL.spark);
    if (++B.hits[s] >= 7 && s === B.winner) {
      setState(def, "lying", 999); def.st = "lying";
      const won = B.winner === B.pick, name = (B.winner === "a" ? B.A : B.B)[1];
      if (won) earn(Math.round(B.stake * (B.winner === "a" ? B.A : B.B)[2]));
      banner = { text: name + " wins" + (won ? ": you collect" : ": the bookie collects"), t: 150, big: true };
      B.over = 150; Arcade.noise(0.3, 0.08);
    }
  }
}
// into the ring yourself: two crew champions, one after the other, for the prize
function ringTime() {
  ringFight = { x: 320, name: "Godown No. 9", waves: [[pick(["wrestler", "hookman"])], [pick(["netman", "breaker"]), pick(["biker", "spinner"])]] };
  startArena(ringFight); banner = { text: "Into the ring", t: 90, big: true };
}
function updateRing() {
  if (ringFight && ringFight.done) { ringFight = null; earn(800); if (!progress.ringWon) { progress.ringWon = true; changeRespect(3); } progress.ring = progress.clock.day; banner = { text: "Champion of Godown No. 9", t: 160, big: true }; }
}

/* ---------- painters ---------- */
function drawDocks(P) {
  const L = look(), d = P.dark;
  if (!backdrop("harbour", 130)) {   // the painted far layer; the old drawn one until it loads
  R(0, 0, LW, LH, P.sky); stars(P, 40, 50);
    const sea = d ? "#14283a" : "#3a7f9c";
    R(0, 70, LW, 60, sea); R(0, 70, LW, 1, d ? "#2a4a66" : "#8cc4da");
    for (let y = 76; y < 128; y += 7) for (let x = -((cam * (0.3 + y / 400) + frameNo * 0.25) % 40) - 40; x < LW; x += 40) R(x + (y * 11) % 40, y, 10 + (y - 76) / 6, 1, d ? "#24405a" : "#9ed0e2");
    // cranes and moored boats beyond the quay
    for (let i = -1; i < 5; i++) { const cx = i * 420 - ((cam * 0.5) % 420) + 120; if (!sprAt("d_crane", cx, 128, false, 1.25)) { R(cx - 2, 30, 4, 98, "#c9a227"); R(cx - 30, 30, 60, 4, "#c9a227"); } }
  }
  for (let bx = 140; bx < street.w; bx += 520) { const x = Math.round(bx - cam * 0.85); if (x > -140 && x < LW + 140) spr("v_boat", x, 126 + Math.sin(frameNo / 40 + bx) * 1.5); }
  // the quay: dressed stone, bollards
  const quay = d ? "#4a4642" : "#b0a894";
  R(0, 126, LW, 24, quay); R(0, 126, LW, 2, shade(quay, 0.2));
  for (let x = -(cam % 32); x < LW; x += 32) R(x, 128, 1, 22, shade(quay, -0.2));
  for (let bx = 60; bx < street.w; bx += 300) { const x = Math.round(bx - cam); if (x > -20 && x < LW + 20) spr("d_bollard", x, 150); }
  // the fish market's tin roof, over the stretch of ice
  if (L.ice) {
    const a = Math.round(L.ice[0] - cam), b = Math.round(L.ice[1] - cam);
    if (b > 0 && a < LW) {
      for (let x = Math.max(a, -10); x < Math.min(b, LW + 10); x += 120) R(x, 40, 3, 110, P.rail);
      R(Math.max(a, 0), 34, Math.min(b, LW) - Math.max(a, 0), 8, d ? "#5d6670" : "#8a95a0");
      for (let x = Math.max(a, 0); x < Math.min(b, LW); x += 6) R(x, 42, 1, 3, shade(d ? "#5d6670" : "#8a95a0", -0.3));
      if (a > -60 && a < LW) text("MACHHI BAZAAR", a + 70, 56, 7, d ? "#8fb3ff" : "#2b54a8");
    }
  }
  // the floor: concrete, wet and pale blue where the ice is
  R(0, 150, LW, LH - 150, d ? "#3a3836" : "#a8a49a");
  for (let y = 158; y < LH; y += 10) R(0, y, LW, 1, d ? "#323030" : "#9a968c");
  if (L.ice) {
    const a = Math.max(0, Math.round(L.ice[0] - cam)), b = Math.min(LW, Math.round(L.ice[1] - cam));
    if (b > a) { R(a, 150, b - a, LH - 150, d ? "#3a4a58" : "#cfe6ee"); for (let y = 154; y < LH; y += 6) for (let x = a + ((y * 7) % 23); x < b; x += 23) R(x, y, 9, 1, d ? "#56708a" : "#f4fbfd"); }
  }
}
function drawIceFactory(P) {
  const x0 = Math.round(-cam), d = P.dark;
  R(0, 0, LW, LH, d ? "#1e2a33" : "#cfe3ea"); R(0, 0, LW, 14, d ? "#152029" : "#9fbfcc");
  for (let x = x0 % 40; x < LW; x += 40) R(x, 14, 1, 136, d ? "#283844" : "#b8d2dc");
  spr("i_machine", x0 + 110, 150); spr("i_hooks", x0 + 330, 104); spr("i_iceblocks", x0 + 500, 150); spr("i_iceblocks", x0 + 560, 150);
  g.globalAlpha = 0.25; for (let i = 0; i < 18; i++) R(((i * 97 + frameNo * 0.3) % street.w) + x0, (i * 37) % 140, 1, 1, "#ffffff"); g.globalAlpha = 1;   // drifting frost
  R(0, 150, LW, LH - 150, d ? "#3a4a58" : "#dcedf3");
  for (let y = 154; y < LH; y += 6) for (let x = (y * 5) % 19; x < LW; x += 19) R(x, y, 8, 1, d ? "#56708a" : "#ffffff");
  R(x0 + street.w - 50, 66, 36, 84, "#5d6670"); R(x0 + street.w - 46, 70, 28, 80, d ? "#141822" : "#7a8a96");
}
function drawGodown9(P) {
  const x0 = Math.round(-cam), beat = Math.floor(frameNo / 20);
  R(0, 0, LW, LH, "#17130f");
  for (let x = x0 % 48; x < LW; x += 48) { R(x, 0, 2, 150, "#2a221b"); }
  spr("g_bulbs", x0 + 200, 40); spr("g_bulbs", x0 + 440, 40);
  g.globalAlpha = 0.14; g.fillStyle = "#f2c230"; g.beginPath(); g.ellipse(x0 + 320, 170, 170, 40, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  spr("g_board", x0 + 80, 150);
  // the crowd, packed along the back, cheering in turns
  const C = SPRITES.crowd;
  if (C) for (let i = 0; i < 9; i++) {
    const k = (i % 4) + ((beat + i) % 2 ? 4 : 0), [sx, sy, w, h, ax, ay] = FIGHTER_FRAMES.crowd[k], cx = x0 + 140 + i * 44;
    g.save(); g.translate(cx, 152); if (i % 3 === 1) g.scale(-1, 1); g.globalAlpha = 0.9; g.drawImage(C, sx, sy, w, h, -ax / 2, -ay / 2, w / 2, h / 2); g.restore();
  }
  g.globalAlpha = 1;
  R(0, 150, LW, LH - 150, "#2e2418"); for (let y = 156; y < LH; y += 8) R(0, y, LW, 1, "#261e14");
  spr("g_ring", x0 + 320, 204);
  R(x0 + street.w - 50, 66, 36, 84, "#3a2c20"); R(x0 + street.w - 46, 70, 28, 80, "#0e0c0a");
}
function drawOpenSea(P) {
  const d = P.dark;
  // the painted horizon, then open water right down to the bottom of the screen in its own colour
  const bg = backdrop("sea", 100), sea = bg ? bg.bot : d ? "#132538" : "#357a98";
  if (bg) R(0, 100, LW, LH - 100, sea);
  else {
    R(0, 0, LW, LH, P.sky); stars(P, 40, 50);
    g.fillStyle = d ? "#e8e2c8" : "#fff4d8"; g.beginPath(); g.arc(LW * 0.75, 34, 10, 0, 7); g.fill();
    R(0, 80, LW, LH - 80, sea); R(0, 80, LW, 1, d ? "#2a4a66" : "#8cc4da");
  }
  for (let y = 86; y < LH; y += 6) for (let x = -((cam * (0.4 + y / 300) + frameNo * 0.4) % 44) - 44; x < LW; x += 44) R(x + (y * 13) % 44, y, 12 + (y - 86) / 5, 1, d ? "#24405a" : "#9ed0e2");
  for (let i = 0; i < 3; i++) { const gx = ((frameNo * (0.6 + i * 0.2) + i * 140) % (LW + 40)) - 20, gy = 40 + i * 12 + Math.sin(frameNo / 15 + i) * 3; R(gx, gy, 3, 1, "#f7f4ee"); R(gx + 3, gy - 1, 3, 1, "#f7f4ee"); }   // gulls
}
