/* Rollback City: vehicles, first version (DESIGN 3.2: the bicycle and the scooter).
   A plain script that shares globals with the others; index.html loads them in order.

   Interact next to a vehicle to get on; Interact again to get off. Left and right speed up and
   brake, up and down change lane (the pavement is the top of the band, the road the bottom),
   punch and kick hit out from the saddle. A vehicle carries you through junctions and stays
   where you leave it (the save remembers). Moving fast it knocks goondas flying; hit a barrel
   or a street's end too fast and you are thrown off; a heavy hit knocks a rider off too.
   The bicycle is free and silent. The scooter (Lakhan's, from 2-3) is faster and seats two:
   in co-op player 2 hops on the back and fights from the pillion. Riding a scooter along the
   pavement with people about raises heat; so does riding off on someone else's scooter while
   the owner watches. */
"use strict";

const VEHICLES = {
  bicycle: { sprite: "v_bicycle", name: "bicycle", max: 3.3, acc: 0.09, seats: 1, quiet: true, seat: [-3, 0], sink: 4, legs: 0 },
  scooter: { sprite: "v_scooter", name: "scooter", max: 5.2, acc: 0.13, seats: 2, seat: [-4, -15], sink: 9, legs: 6 },
  motorbike: { sprite: "v_motorbike", name: "motorbike", max: 6.2, acc: 0.15, seats: 2, seat: [-3, -15], sink: 8, legs: 7 },
  boat: { sprite: "v_boat", name: "boat", max: 4.6, acc: 0.1, seats: 2, seat: [-8, -30], sink: 16, legs: 14 }
};
const SEAT_Z = 0, PAVEMENT = 176;   // riders stay on the ground; drawRider sits them on the seat
let rides = [];
// every vehicle in the city: where the world puts it (street.parked), moved to wherever it was
// left (progress.vehicles, saved), and only once it is unlocked (needs)
function vehiclesHere() {
  const out = [], moved = progress.vehicles || {};
  for (const id in WORLD.streets) for (const v of WORLD.streets[id].parked || []) {
    if (!unlocked(v.needs)) continue;
    const at = moved[v.id] || { street: id, x: v.x };
    if (at.street === street.id) out.push({ veh: true, id: v.id, kind: v.kind, owner: v.owner, x: at.x, y: v.y || 190, vx: 0, face: 1, rider: null, pillion: null, down: 0, paveT: 0 });
  }
  return out;
}
// on every new street: the vehicles parked here, and whoever rode in still riding
function setupRides() {
  const riding = players.filter((p) => p && p.ride);
  if (street.interior) { for (const p of riding) p.ride = null; rides = []; return; }
  progress.vehicles = progress.vehicles || {};
  for (const p of riding) if (p.ride.rider === p) progress.vehicles[p.ride.id] = { street: street.id, x: Math.round(p.x) };
  rides = vehiclesHere();
  for (const p of riding) {
    const v = rides.find((r) => r.id === p.ride.id), seat = p.ride.rider === p ? "rider" : "pillion";
    p.ride = null; if (v) mount(p, v, seat, true);
  }
}
function mount(p, v, seat, quietly) {
  v[seat] = p; p.ride = v; p.mountF = frameNo; setState(p, "ride"); if (p.weapon) dropWeapon(p);
  v.face = p.face; if (seat === "rider") { v.y = clamp(p.y, Y0, Y1); }
  if (quietly) return;
  Arcade.tone(VEHICLES[v.kind].quiet ? 1200 : 220, 0.12, VEHICLES[v.kind].quiet ? "triangle" : "sawtooth", 0.03);
  hint("ride", p, (padLast ? "LB" : TOUCH ? "Use" : p.pi ? "Enter" : "E") + " to get off");
  // somebody's scooter, and he is standing right there
  if (v.owner && !(progress.flags || {})["took:" + v.id] && civs.some((c) => Math.abs(c.x - v.x) < 180)) {
    progress.flags["took:" + v.id] = true; texts.push({ x: v.x, y: v.y - 70, s: "Chor! Chor! My scooter!", t: 90 });
    changeRespect(-5); crime(2, v.x, "civ");
  }
}
function dismount(p, thrown) {
  const v = p.ride; if (!v) return;
  if (v.rider === p) { v.rider = null; if (v.pillion) dismount(v.pillion); }
  if (v.pillion === p) v.pillion = null;
  p.ride = null;
  if (!thrown) { setState(p, "idle"); p.z = 0; p.y = clamp(v.y + 6, Y0, Y1); p.x = v.x - v.face * 14; }
  (progress.vehicles = progress.vehicles || {})[v.id] = { street: street.id, x: Math.round(v.x) };
}
// a target for findTargets: get on (a free saddle, or the pillion of a scooter that is ridden)
function rideTarget(p) {
  const v = rides.find((r) => !r.down && Math.abs(r.x - p.x) < 24 && Math.abs(r.y - p.y) < 16 && Math.abs(r.vx) < 1 && (!r.rider || (VEHICLES[r.kind].seats > 1 && !r.pillion)));
  if (!v) return null;
  const back = !!v.rider;
  return { label: back ? "Hop on the back" : "Ride the " + VEHICLES[v.kind].name, x: v.x, y: v.y - 46, act: (q) => mount(q, v, back ? "pillion" : "rider") };
}

// the rider's (or the pillion's) turn, from updatePlayer: steer, hit out, get off
function updateRider(p) {
  const v = p.ride, i = p.pi, V = VEHICLES[v.kind];
  if (p.st === "fly" || p.st === "thrown" || p.st === "lying" || p.st === "grabbed") { dismount(p, true); return; }
  if (p.st === "hurt" || p.st === "attack") return;   // the hit plays out in the saddle
  if (tapped(i, "use") && p.mountF !== frameNo && !street.water) { dismount(p); return; }   // nobody steps off at sea   // not the press that got us on
  setState(p, "ride", p.t + 1);
  if (tapped(i, "punch")) { startAttack(p, "jab"); return; }
  if (tapped(i, "kick")) { startAttack(p, "kick"); return; }
  if (v.kind === "rani" && v.rider === p && tapped(i, "special")) honk(v, p);   // Rani's horn
  // the pillion looks whichever way it likes, to kick at whoever is chasing
  if (v.rider !== p) { if (held(i, "left")) p.face = -1; else if (held(i, "right")) p.face = 1; return; }
  const dir = held(i, "left") ? -1 : held(i, "right") ? 1 : 0;
  if (dir) { v.vx = clamp(v.vx + dir * V.acc * (Math.sign(v.vx) === -dir ? 2.5 : 1), -V.max, V.max); v.face = dir; }
  else v.vx *= 0.965;
  if (held(i, "up")) v.y = Math.max(Y0, v.y - 1.3);
  if (held(i, "down")) v.y = Math.min(Y1, v.y + 1.3);
  if (Math.abs(v.vx) < 0.05) v.vx = 0;
}
// the vehicles' turn, from updateStreet: move, carry the riders, ram, crash
function updateRides() {
  for (const v of rides) {
    if (v.down > 0) { v.down--; v.vx *= 0.9; v.x += v.vx; continue; }
    // a rider knocked flying is off, whatever hit him
    for (const p of [v.rider, v.pillion]) if (p && ["fly", "thrown", "lying", "grabbed", "out"].includes(p.st)) dismount(p, true);
    if (!v.rider) { v.vx *= 0.9; if (Math.abs(v.vx) < 0.05) v.vx = 0; v.x += v.vx; continue; }
    v.x = clamp(v.x + v.vx, 12, street.w - 12);
    const fast = Math.abs(v.vx) > 3, end = (v.x <= 12 || v.x >= street.w - 12) && Math.abs(v.vx) > 2.5;
    // the camera keeps up, but a rider never leaves the screen
    v.x = clamp(v.x, cam + 14, cam + LW - 14);
    const S = VEHICLES[v.kind].seat;
    for (const [p, dx, dy] of [[v.rider, v.face * S[0], 0], [v.pillion, v.face * S[1], -1]]) if (p) { p.x = v.x + dx; p.y = v.y + dy; p.z = SEAT_Z; p.vz = 0; p.vx = 0; if (p.st === "ride" && p === v.rider) p.face = v.face; }
    // into a barrel or the street's end too fast: the rider goes over the handlebars
    const wall = end;
    const barrel = fast && barrels.find((b) => b.hp > 0 && Math.abs(b.x - v.x) < 16 && Math.abs(b.y - v.y) < 10);
    if (wall || barrel) { crash(v); continue; }
    // ramming: goondas go flying, passers-by get knocked aside
    if (Math.abs(v.vx) > 2) {
      for (const e of enemies) {
        if (e.rammed === v && frameNo - e.ramF < 40 || Math.abs(e.x - v.x) > 20 || Math.abs(e.y - v.y) > 11 || DOWN_STATES.includes(e.st) || e.inv > 0) continue;
        // run the same one down again soon and it hurts more each time: 1.5x, 2x, up to 3x
        e.ramN = frameNo - (e.ramF || -999) < 300 ? (e.ramN || 0) + 1 : 1; e.rammed = v; e.ramF = frameNo;
        hurt(e, { x: v.x - v.face * 10, face: v.face, team: "p", kind: v.rider.kind, owner: v.rider }, { dmg: Math.round((4 + Math.abs(v.vx) * 1.5) * Math.min(3, 1 + (e.ramN - 1) * 0.5)), knock: true, sfx: 200 });
        if (e.ramN > 1) texts.push({ x: e.x, y: e.y - 70, s: "Rammed x" + e.ramN + "!", t: 50 });
        v.vx *= 0.7;
      }
      for (const c of civs) if (!c.hit && Math.abs(c.x - v.x) < 18 && Math.abs(c.y - v.y) < 10) hitCiv(c, v.rider);
    }
    // a scooter on the pavement with people about: someone calls the police
    if (!VEHICLES[v.kind].quiet && v.y < PAVEMENT && Math.abs(v.vx) > 1.5 && civs.some((c) => Math.abs(c.x - v.x) < 160)) {
      if (++v.paveT === 60) { texts.push({ x: v.x, y: v.y - 70, s: pick(["Arre! This is a footpath!", "Oi! Get off the pavement!"]), t: 80 }); crime(1, v.x, "civ"); }
    } else v.paveT = 0;
    if (v.rider) v.rider.walkPh += Math.abs(v.vx) * 0.12;   // pedalling, on the bicycle
    if (!VEHICLES[v.kind].quiet && frameNo % 24 === 0 && Math.abs(v.vx) > 0.5) Arcade.tone(90 + Math.abs(v.vx) * 18, 0.08, "sawtooth", 0.012);
  }
}
function crash(v) {
  shake = 6; Arcade.noise(0.3, 0.1); texts.push({ x: v.x, y: v.y - 60, s: "Crash!", t: 70 });
  for (const p of [v.rider, v.pillion]) if (p) {
    dismount(p, true); p.inv = 0;
    hurt(p, { x: v.x - v.face * 20, face: v.face, team: "e", kind: "grunt" }, { dmg: 8, knock: true, lift: 4.4, sfx: 160 });
    p.vx = v.face * 2.6;
  }
  v.vx = -v.vx * 0.2; v.down = 60;
  const b = barrels.find((b) => b.hp > 0 && Math.abs(b.x - v.x) < 18 && Math.abs(b.y - v.y) < 12); if (b) { b.hp = 0; breakProp(b); }
}
// a rider with their own riding art (MOSS: the fighter on this very bike, hands on the bars, feet on
// the pegs) is drawn as one picture with the bike; anyone else sits on it the old way
const RIDE_ART = ["rai", "kai", "rook", "crane"].flatMap((s) => ["motorbike", "scooter"].map((k) => "ride_" + s + "_" + k)).concat("ride_biker_motorbike");
art(RIDE_ART);
const riderOf = (v) => v.rider || enemies.find((e) => e.bike === v);
function rideArt(v) { const r = riderOf(v); return r && SPRITES["ride_" + SHEET_OF[r.kind] + "_" + v.kind] ? "ride_" + SHEET_OF[r.kind] + "_" + v.kind : null; }
function drawVehicle(v, P) {
  const x = Math.round(v.x - cam); if (x < -60 || x > LW + 60) return;
  const V = VEHICLES[v.kind], both = rideArt(v);
  if (both) {
    const r = riderOf(v), lunge = r.st === "attack" ? v.face * 2 : 0;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, v.y, 26, 3.5, 0, 0, 7); g.fill();
    g.save(); g.translate(x + lunge, v.y + 2); if (v.down > 0) g.rotate(v.face * -0.5);
    if (r.flash > 0) { r.flash--; g.filter = "brightness(2.6)"; }   // (the rider's own drawing, which counts this down, is skipped)
    sprAt(both, 0, 0, v.face < 0, 1); g.filter = "none"; g.restore();
    if (v.kind === "rani") drawFare(v, x);
    return;
  }
  g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, v.y, 24, 3.5, 0, 0, 7); g.fill();
  g.save(); g.translate(x, v.y + 2);
  if (v.down > 0) g.rotate(v.face * -0.5);
  if (!sprAt(V.sprite, 0, 0, v.face < 0, V.scale || 1)) { R(-24, -16, 48, 6, v.kind === "scooter" ? "#5cc8c0" : "#3a3632"); g.fillStyle = P.ol; g.beginPath(); g.arc(-16, -6, 6, 0, 7); g.arc(16, -6, 6, 0, 7); g.fill(); }
  g.restore();
  if (v.kind === "rani") drawFare(v, x);   // a taxi fare in the back
}
// where every vehicle stands right now, for the save (a ridden one is wherever it is)
function parkedNow() {
  const out = { ...(progress.vehicles || {}) };
  if (street && !street.interior) for (const v of rides) out[v.id] = { street: street.id, x: Math.round(v.x) };
  return out;
}
// a rider drawn in the saddle: sunk onto the seat, the legs hidden by the vehicle (the bicycle's
// pedal); someone whose sheet has not loaded yet is not drawn rather than drawn as a stand-in
function drawRider(f, x, y) {
  const veh = f.ride || f.bike || f.boat, V = VEHICLES[veh.kind];
  if (riderOf(veh) === f && rideArt(veh)) return;   // drawn with the bike, in one piece
  if (!usesSprite(f)) return;
  g.save(); g.beginPath(); g.rect(x - 80, 0, 160, y - V.legs); g.clip();
  drawSpriteFighter(f, x, y + V.sink);
  g.restore();
}
