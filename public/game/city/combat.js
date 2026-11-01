/* Rollback City: physics, projectiles, hits, items and stage life.
   A plain script that shares globals with the others; index.html loads them in order. */
"use strict";

/* ---------- physics, projectiles, hits ---------- */
function physics(f) {
  if (f.finisher && Math.abs(f.x - f.finisher.x) < 8) { f.vx = 0; f.y += (Y0 + 6 - f.y) * 0.3; }   // thrown at a cart: it drops in
  if (f.slide) { f.x += f.slide; f.slide *= 0.9; if (Math.abs(f.slide) < 0.15) f.slide = 0; }
  if (f.z > 0 || f.vz) {
    f.z += f.vz; f.vz -= GRAV;
    if (f.st === "fly" || f.st === "thrown") {
      f.x += f.vx; f.vx *= 0.99;
      if (f.team === "e" && !f.bounced && (f.x < cam + 8 || f.x > cam + LW - 8)) { f.bounced = true; f.vx = -f.vx * 0.8; f.vz = Math.max(f.vz, 2.4); damage(f, 3, f.lastBy || f); burst(f.x, f.y - 20, 6, PAL.spark); texts.push({ x: f.x, y: f.y - 60, s: "Wall bounce", t: 50 }); Arcade.noise(0.08, 0.08); if (++wallCount === 3) Arcade.secret("walls"); }
    }
    if (f.z <= 0) {
      f.z = 0; f.vz = 0;
      if (f.st === "air") { setState(f, "idle"); f.vx = 0; f.airAtk = null; f.landF = frameNo; if (f.team === "e") f.cool = rand(...KINDS[f.kind].cool); dust(f.x, f.y); }
      else if (f.st === "fly" || f.st === "thrown") {
        shake = Math.max(shake, 3); Arcade.noise(0.07, 0.06);
        slamLanding(f); floodSplash(f);
        if (f.finisher) finish(f);
        if (wetFloor()) { f.slide = f.vx * 1.4; if (Math.abs(f.slide) > 0.5) fx.push({ kind: "water", x: f.x, y: f.y - 2, vx: f.vx, vy: -1.5, t: 20 }); }   // wet ground: they skid
        setState(f, "lying", f.team === "p" ? 50 : 46); f.vx = 0; f.bounced = false; dust(f.x, f.y);
      }
    }
  }
  // street goondas (and a runner) roam the whole street; everyone else stays near the screen
  if (f.team === "e" && f.st !== "dead") f.x = f.roam || f.runner ? clamp(f.x, 10, street.w - 10) : clamp(f.x, cam - 30, cam + LW + 30);
  f.y = clamp(f.y, Y0, Y1);
}

// thrown things: a vinyl record (spins, stings), a fishing net (tangles: you slow down), a sack of onions (knocks you over)
const THROWN = { record: { v: 4.2, dmg: 6, z: 26 }, net: { v: 2.8, dmg: 2, z: 22 }, sack: { v: 2.6, dmg: 9, z: 28 }, cracker: { v: 3, dmg: 3, z: 24 } };
function shoot(kind, owner, dy, dir) {
  const face = dir || owner.face, sc = KINDS[owner.kind].scale * BS;
  if (kind === "chakra") { shots.push({ kind, team: owner.team, owner, x: owner.x + face * 12, y: owner.y, z: 26 * sc, vx: face * 4.2, face, dmg: 12, life: 110, pierce: 3 }); Arcade.tone(1200, 0.12, "triangle", 0.05, -600); return; }
  if (kind === "knife") shots.push({ kind, team: owner.team, owner, x: owner.x + face * 14, y: clamp(owner.y + dy, Y0, Y1), z: 26 * sc, vx: face * 3.6, face, dmg: 8, life: 150 });
  else if (THROWN[kind]) shots.push({ kind, team: owner.team, owner, x: owner.x + face * 14, y: clamp(owner.y + dy, Y0, Y1), z: THROWN[kind].z * sc, vx: face * THROWN[kind].v, face, dmg: THROWN[kind].dmg, life: 150 });
  else shots.push({ kind, team: owner.team, owner, x: owner.x + face * 20, y: owner.y, z: 0, vx: face * 2.4, face, dmg: 10, life: 100 });
  Arcade.tone(kind === "knife" ? 900 : 90, 0.08, "triangle", 0.05, kind === "knife" ? -300 : 0);
}
function chakraKO() {
  chakraKOs++; try { localStorage.setItem("city:chakra", String(chakraKOs)); } catch (e) { /* ignore */ }
  if (chakraKOs === 5) { Arcade.secret("chakra", true); Arcade.toast("Avatar costume unlocked. Pick it from the menu."); }
}
function updateShots() {
  const all = players.filter((p) => p && p.lives > 0).concat(enemies);
  for (const s of shots) {
    s.x += s.vx; s.life--;
    if (s.kind === "cracker" && s.life < 105) s.life = 0;   // a firecracker flies a short way, then goes off
    if (s.x < cam - 20 || s.x > cam + LW + 20) s.life = 0;
    for (const d of all) {
      if (s.life <= 0 || d.team === s.team || d.inv > 0 || DOWN_STATES.includes(d.st) || (s.hitIds && s.hitIds.has(d.id))) continue;
      const near = Math.abs(d.x - s.x) < 10 && Math.abs(d.y - s.y) < (s.kind === "wave" ? 12 : 7);
      const height = s.kind === "wave" ? d.z < 3 : d.z < 14;   // jump over knives and shockwaves
      if (near && height && (s.kind === "knife" || s.kind === "record") && d.weapon && d.weapon.kind === "umbrella" && d.face === -s.face && d.st !== "attack") { s.life = 0; texts.push({ x: d.x, y: d.y - 60, s: "Brolly!", t: 40 }); Arcade.tone(300, 0.05); continue; }
      if (near && height) {
        hurt(d, { x: s.x - s.face * 10, face: s.face, team: s.team, kind: s.owner.kind, rage: s.owner.rage, owner: s.owner }, { dmg: s.dmg, knock: s.kind !== "knife" && s.kind !== "record" && s.kind !== "net", sfx: 500 });
        if (s.kind === "net" && d.team === "p") { d.slowT = Math.max(d.slowT || 0, 100); texts.push({ x: d.x, y: d.y - 66, s: "Tangled!", t: 50 }); }
        if (s.team === "p" && s.owner) s.owner.score += 80;
        if (s.kind === "knife" || THROWN[s.kind]) s.life = 0;
        if (s.kind === "chakra") { s.hitIds = s.hitIds || new Set(); s.hitIds.add(d.id); if (--s.pierce <= 0) s.life = 0; if (d.hp <= 0 && s.owner) chakraKO(); }
      }
    }
  }
  for (const s of shots) if (s.kind === "cracker" && s.life <= 0) crackerBang(s);
  shots = shots.filter((s) => s.life > 0);
}

function activeAtk(a) {
  if (a.st === "attack") { const k = a.atk; return k && a.t >= k.a0 && a.t <= k.a1 ? [k, a.t] : null; }
  if (a.st === "air" && a.airAtk) {
    const k = ATK[a.airAtk];
    if (a.airAtk === "dragon") return a.vz > -1 ? [k, a.airT] : null;
    if (a.airAtk === "dive") return a.vz < 0 ? [k, a.airT] : null;
    return a.airT >= 2 ? [k, a.airT] : null;
  }
  return null;
}

function resolveHits() {
  const all = players.filter((p) => p && p.lives > 0).concat(enemies);
  for (const a of all) {
    const act = activeAtk(a); if (!act) continue;
    const [atk, t] = act, scale = KINDS[a.kind].scale * BS;
    if (atk.rearm && t % atk.rearm === 0) a.hits.clear();
    const knock = atk.knock || (atk.knockAfter && t >= atk.knockAfter);
    for (const d of all) {
      if (d === a || d.team === a.team || a.hits.has(d.id) || d.inv > 0 || DOWN_STATES.includes(d.st)) continue;
      let dx = (d.x - a.x) * (atk.back ? -a.face : a.face);
      if (atk.both) dx = Math.abs(d.x - a.x);
      if (dx > -6 && dx < atk.reach * scale && Math.abs(d.y - a.y) < (a.team === "p" && ASSIST ? 14 : 9) && Math.abs(d.z - a.z) < 28 && !(atk.low && d.z > 4)) {
        a.hits.add(d.id);
        const heavy = a.team === "p" && KINDS[a.kind].heavy ? KINDS[a.kind].heavy : 0;
        const hit = heavy || (knock && !atk.knock) ? { ...atk, dmg: atk.dmg + heavy, knock: atk.knock || knock } : atk;
        hurt(d, a, hit);
        if (a.team === "p") {
          a.score += atk.dmg * 10 * (1 + Math.floor(a.combo / 5));
          a.sp = Math.min(100, a.sp + (atk.sp ? 0 : 3 * statSp()));
          a.combo++; a.comboT = 80;
        }
      }
    }
    // a passer-by in the way of a punch
    if (a.team === "p" && hasHeat()) for (const c of civs) {
      if (c.hit || a.hits.has(c)) continue;
      const dx = (c.x - a.x) * (atk.back ? -a.face : a.face);
      if ((atk.both ? Math.abs(c.x - a.x) : dx) > -6 && dx < atk.reach * scale && Math.abs(c.y - a.y) < 9 && a.z < 28) { a.hits.add(c); hitCiv(c, a); }
    }
    if (a.team === "p") for (const b of barrels) {
      if (b.hp <= 0 || a.hits.has(b)) continue;
      const dx = atk.both ? Math.abs(b.x - a.x) : (b.x - a.x) * (atk.back ? -a.face : a.face);
      if (dx > -6 && dx < atk.reach + 6 && Math.abs(b.y - a.y) < 10) {
        a.hits.add(b); b.hp--; b.shake = 10; Arcade.noise(0.06, 0.06);
        if (b.hp <= 0) breakProp(b);
      }
    }
  }
  for (const t of enemies.filter((e) => e.st === "thrown")) {
    for (const o of enemies) if (o !== t && !busy(o) && Math.abs(o.x - t.x) < 16 && Math.abs(o.y - t.y) < 10) hurt(o, { x: t.x, face: Math.sign(t.vx) || 1, team: "p", kind: t.kind, owner: t.thrownBy }, { dmg: 8, knock: true, sfx: 250 });
  }
}

function breakProp(b) {
  if (b.kind === "hydrant") {
    spray.push({ x: b.x, y: b.y, t: 240 }); Arcade.noise(0.5, 0.06);
    items.push({ kind: b.drop, x: b.x + 10, y: Math.min(Y1, b.y + 12), z: 30, vz: 3 });
    if (b.drop === "oneup") texts.push({ x: b.x, y: b.y - 50, s: "Something was stuck in there", t: 90 });
    Arcade.secret("hydrant");
  } else if (b.kind === "vending") {
    for (let i = 0; i < 3; i++) items.push({ kind: "drink", x: b.x - 10 + i * 10, y: Math.min(Y1, b.y + 8 + i * 4), z: 20, vz: 2 + i * 0.5 });
    texts.push({ x: b.x, y: b.y - 50, s: "Out of order", t: 80 }); Arcade.secret("vending");
  } else {
    items.push({ kind: b.drop, x: b.x, y: b.y, z: 14, vz: 2, n: b.letter });
  }
  burst(b.x, b.y - 12, 10, b.kind === "barrel" ? PAL.wood : PAL.spark);
}

function hurt(d, a, atk) {
  noteCrime(d, a);
  if (d.team === "e" && !a.env) d.aggro = true;   // (an auto or a falling crate is nobody's fault: it makes no one angry at you)
  // a guard facing the blow: a player's block (a parry if it went up just in time), a goonda's guard
  const front = Math.sign(a.x - d.x) === d.face;
  if (front && d.st === "block") {
    if (d.blockT <= 6 && a.st !== undefined && a !== d) {
      drillNote("parry", d);
      setState(a, "hurt", KINDS[a.kind] && KINDS[a.kind].boss ? 16 : 34); a.cool = Math.max(a.cool || 0, 50); d.sp = Math.min(100, d.sp + 10);
      texts.push({ x: d.x, y: d.y - 66, s: "Parry!", t: 50 }); fx.push({ kind: "ring", x: d.x + d.face * 10, y: d.y - 34, t: 14, big: true }); Arcade.tone(1400, 0.08, "triangle", 0.05);
      return;
    }
    damage(d, 1, a.owner || a); d.x -= d.face * 3; spark(d, a, { sfx: 900 }); drillNote("block", d); return;
  }
  if (front && d.st === "eblock" && !atk.knock && !atk.poiseBreak) { damage(d, 1, a.owner || a); d.x -= d.face * 2; texts.push({ x: d.x, y: d.y - 60, s: "Blocked", t: 30 }); spark(d, a, { sfx: 900 }); return; }
  if (a.spar) atk = { ...atk, dmg: 1, knock: false };   // Bhola's pehelwan only taps
  if (d.heldBy && d.heldBy !== a) { d.heldBy.hold = null; d.heldBy = null; }
  const dmg = beatMul(a, d) * Math.max(1, Math.round((a.team === "e" ? atk.dmg * diff() * (KINDS[a.kind] && KINDS[a.kind].boss ? (a.rage ? 1.5 : 1.2) * (EASY ? 0.8 : 1) : EASY ? 0.6 : 1) : atk.dmg * (a.team === "p" && d.team === "e" ? statDmg() : 1)) * (d.st === "taunt" ? 2 : 1)));
  damage(d, dmg, a.owner || a);
  const dir = Math.sign(d.x - a.x) || a.face;
  if (atk.push) d.x += dir * atk.push;
  if (KINDS[a.kind] && KINDS[a.kind].pull && atk === ATK.pipe && d.team === "p") { d.x -= dir * 16; texts.push({ x: d.x, y: d.y - 66, s: "Hooked!", t: 40 }); }   // the boathook drags you in
  let knock = atk.knock || d.hp <= 0 || !!d.bike || !!d.boat;   // any hit knocks a rider off his bike
  if (d.team === "p") {
    d.sp = Math.min(100, d.sp + 3); d.stagger++; d.staggerT = 70; if (d.stagger >= (KINDS[d.kind].sturdy || 3) + statGrit()) knock = true;
    if (d.hold) { d.hold.heldBy = null; setState(d.hold, "idle"); d.hold = null; }
    if (d.st === "air") d.airAtk = null;
    // a rider stays in the saddle: goondas, villains and the police can hurt you on a bike, not
    // unseat you (a crash, traffic or a knockout still can)
    if (d.ride && d.hp > 0 && a.team === "e" && !a.env) { knock = false; d.stagger = 0; }
  }
  if (KINDS[d.kind].boss) {
    d.poise += atk.dmg;
    if (d.hp > 0 && d.poise < KINDS[d.kind].poise && !atk.poiseBreak) { d.flash = 6; spark(d, a, atk); return; }
    d.poise = 0; knock = true;
  }
  if (d.st === "attack" || d.st === "windup") d.cool = Math.max(d.cool, 40);
  if (knock || d.st === "air") {
    if (d.heldBy) { d.heldBy.hold = null; d.heldBy = null; }
    setState(d, "fly"); d.airAtk = null; d.vx = dir * 2.2; d.vz = atk.lift || 3.6; d.z = Math.max(d.z, 1); d.face = -dir; d.stagger = 0;
    if (d.team === "p" && d.weapon) dropWeapon(d);
    if (d.team === "p" && d.pi !== undefined) missionKnock(d);
    if (d.team === "p" && d.pi !== undefined && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(40); } catch (e) { /* ignore */ }
    if (d.team === "e" && d.weapon && !KINDS[d.kind].keepWeapon && Math.random() < 0.5) dropWeapon(d);
  } else if (d.st !== "grabbed") {
    if (d.team === "e") { d.hurtN = frameNo - (d.hurtF || -999) < 60 ? (d.hurtN || 0) + 1 : 1; d.hurtF = frameNo; }
    if (d.team === "e" && d.hurtN >= (EASY ? 6 : 4) && !KINDS[d.kind].boss && d.hp > 0) {
      // too many light hits in a row: the enemy hops back out of the combo
      d.hurtN = 0; setState(d, "air"); d.airAtk = null; d.vz = 3; d.z = 1; d.vx = dir * 2.4; d.face = -dir; d.inv = 14; d.cool = Math.max(d.cool, 30);
    } else { setState(d, "hurt", d.team === "p" ? 16 : 22); d.face = -dir; d.x += dir * 3; }
  }
  d.flash = 6;
  spark(d, a, atk);
}
function damage(d, n, a) { d.hp = Math.max(0, d.hp - n); d.lastBy = a; if (d.team === "e") lastHit = { f: d, t: 180 }; }
function spark(d, a, atk) {
  const T = PAL.T, h = d.y - d.z - 30 * KINDS[d.kind].scale * BS;
  burst(d.x - (a.face || 1) * 4, h, 7, d.team === "p" ? T.red : PAL.spark);
  fx.push({ kind: "ring", x: d.x - (a.face || 1) * 4, y: h, t: 8 });
  fx.push({ kind: "star", x: d.x - (a.face || 1) * 6, y: h, t: 6 });
  Arcade.tone(atk.sfx || 400, 0.06, "square", 0.05, -120); Arcade.noise(0.05, 0.05);
  shake = Math.max(shake, atk.knock ? 4 : 1.5);
  const mine = (f) => f && f.pi != null;   // a real player: allies on team "p" scrapping off-screen must not freeze the game
  if (mine(d) || mine(a) || mine(a.owner)) hitStop = Math.max(hitStop, atk.knock ? 5 : 2);
  if (atk.knock) fx.push({ kind: "streak", x: d.x - (a.face || 1) * 4, y: h, t: 8, a: rand(0, 1) });
}
function burst(x, y, n, c) { for (let i = 0; i < n; i++) fx.push({ kind: "dot", x, y, vx: rand(-1.6, 1.6), vy: rand(-2.2, 0.4), c, t: rand(12, 22) }); }
function dust(x, y) { for (let i = 0; i < 5; i++) fx.push({ kind: "dust", x: x + rand(-8, 8), y, vx: rand(-0.6, 0.6), vy: rand(-0.6, -0.1), t: rand(14, 24) }); }

function updateItems() {
  for (const it of items) if (it.z > 0 || it.vz) { it.z += it.vz; it.vz -= GRAV; if (it.z <= 0) { it.z = 0; it.vz = 0; } }
  for (const p of alivePlayers()) {
    const it = items.find((it) => (it.kind === "food" || it.kind === "drink" || it.kind === "oneup" || it.kind === "letter" || it.kind === "cash") && it.z === 0 && Math.abs(it.x - p.x) < 14 && Math.abs(it.y - p.y) < 9);
    if (!it) continue;
    if (it.kind === "food" && p.hp < p.max) { eat(p, { heal: 30 }); texts.push({ x: p.x, y: p.y - 66, s: "+30 health", t: 60 }); }
    else if (it.kind === "drink" && (p.sp < 100 || (hasWatch() && rewinds < rewindMax()))) {
      // kulhad chai: SP, and it winds Nani's watch by one rewind
      p.sp = Math.min(100, p.sp + 50); const wind = hasWatch() && rewinds < rewindMax(); if (wind) rewinds++;
      texts.push({ x: p.x, y: p.y - 66, s: wind ? "+50 SP, +1 rewind" : "+50 SP", t: 60 });
    }
    else if (it.kind === "letter") { items.splice(items.indexOf(it), 1); takeLetter(p, it); return; }
    else if (it.kind === "cash") { items.splice(items.indexOf(it), 1); earn(it.amount, p); Arcade.tone(1320, 0.05, "triangle", 0.04); continue; }
    else if (it.kind === "oneup" && KINDS[p.kind].guest) { p.score += 1000; texts.push({ x: p.x, y: p.y - 66, s: "+1000", t: 80 }); }
    else if (it.kind === "oneup") { p.lives = Math.min(5, p.lives + 1); texts.push({ x: p.x, y: p.y - 66, s: "1UP", t: 80 }); }
    else continue;
    items.splice(items.indexOf(it), 1); p.score += 50;
    Arcade.tone(660, 0.08, "triangle", 0.06); setTimeout(() => Arcade.tone(990, 0.1, "triangle", 0.06), 80);
  }
  for (const b of barrels) if (b.shake > 0) b.shake--;
  enemies = enemies.filter((e) => !e.gone);
  if (lastHit && --lastHit.t <= 0) lastHit = null;
}

/* stage life: subway trains, foundry sparks, rooftop steam */
function hint(id, p, msg) {
  let seen = []; try { seen = JSON.parse(localStorage.getItem("city:hints")) || []; } catch (e) { /* ignore */ }
  if (seen.includes(id)) return;
  seen.push(id); try { localStorage.setItem("city:hints", JSON.stringify(seen)); } catch (e) { /* ignore */ }
  texts.push({ x: p.x, y: p.y - 78, s: msg, t: 150 });
}
function hints() {
  if (!TOUCH || frameNo % 10) return;
  const p = alivePlayers()[0]; if (!p) return;
  if (street.id === "lane" && frameNo > 200) hint("dash", p, "Push the stick all the way to the edge to run");
  if (enemies.some((e) => e.st === "hurt" && Math.abs(e.x - p.x) < 26 && Math.abs(e.y - p.y) < 8)) hint("grab", p, "Walk into a dazed enemy to grab them");
  if (p.sp >= 30) hint("special", p, "Special is ready: " + (SPECIALS[p.kind] || SPECIALS.rai)[2]);
  if (shots.some((s) => s.kind === "knife" && s.team === "e")) hint("knife", p, "Jump over thrown knives");
}
function updateStageFx() {
  hints();
  const th = theme();
  for (const w of spray) { w.t--; if (w.t > 0 && frameNo % 2 === 0) fx.push({ kind: "water", x: w.x + rand(-2, 2), y: w.y - 10, vx: rand(-1.2, 1.2), vy: rand(-3.4, -2), t: 40 }); }
  spray = spray.filter((w) => w.t > 0);
  if (cat) {
    cat.t++;
    const near = alivePlayers().find((p) => Math.abs(p.x - cat.x) < 20 && p.y < Y0 + 12);
    const rough = players.some((p) => p && activeAtk(p) && Math.abs(p.x - cat.x) < 40) || enemies.some((e) => (e.st === "fly" || e.st === "thrown") && Math.abs(e.x - cat.x) < 30);
    if (cat.st === "sit" && rough) { cat.st = "run"; texts.push({ x: cat.x, y: cat.y - 30, s: "Hiss", t: 50 }); Arcade.tone(900, 0.15, "sawtooth", 0.03, -500); }
    else if (cat.st === "sit" && near && frameNo - (near.upTap || -99) < 3) {
      cat.st = "purr"; cat.t = 0; near.hp = Math.min(near.max, near.hp + 10);
      for (let i = 0; i < 4; i++) fx.push({ kind: "heart", x: cat.x + rand(-6, 6), y: cat.y - 14, vx: rand(-0.3, 0.3), vy: -0.5, t: 50 + i * 8 });
      texts.push({ x: cat.x, y: cat.y - 36, s: "Purr. +10 health", t: 70 }); Arcade.secret("cat");
    }
    if (cat.st === "run") { cat.x -= 3; if (cat.x < cam - 40) cat = null; }
  }
  if (th === "roof" && !posterUsed) {
    const p = alivePlayers().find((q) => Math.abs(q.x - POSTER_X) < 46 && q.y < Y0 + 14 && frameNo - (q.upTap || -99) < 3);
    if (p) {
      posterUsed = true; p.avatarT = 600; p.inv = Math.max(p.inv, 30);
      if (p.weapon) dropWeapon(p);   // the divine form fights bare-handed
      fx.push({ kind: "ring", x: p.x, y: p.y - 30, t: 18, gold: true });
      for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; fx.push({ kind: "dot", x: p.x, y: p.y - 30, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, c: i % 2 ? "#f2c230" : "#d9741c", t: 30 }); }
      Arcade.tone(392, 0.2, "triangle", 0.06); setTimeout(() => Arcade.tone(587, 0.2, "triangle", 0.06), 140); setTimeout(() => Arcade.tone(784, 0.4, "triangle", 0.06), 280);
      texts.push({ x: p.x, y: p.y - 80, s: "Avatar unleashed. Special throws a chakra", t: 120 });
      Arcade.secret("unleash");
    }
  }
  for (const p of players) if (p && p.avatarT > 0 && --p.avatarT === 0) texts.push({ x: p.x, y: p.y - 70, s: "The glow fades", t: 60 });
  if (pigeons) {
    pigeons.t++;
    const scare = players.some((p) => p && (activeAtk(p) || p.st === "run") && Math.abs(p.x - pigeons.x) < 70);
    if (pigeons.st === "sit" && scare) { pigeons.st = "fly"; pigeons.t = 0; Arcade.noise(0.15, 0.04); players.forEach((p) => p && (p.pigeon = false)); }
    if (pigeons.st === "fly" && pigeons.t > 600) { pigeons.st = "sit"; pigeons.t = 0; }
    const calm = alivePlayers().find((p) => Math.abs(p.x - pigeons.x) < 60 && p.stillT > 300 && !p.pigeon);
    if (pigeons.st === "sit" && calm) { calm.pigeon = true; calm.sp = Math.min(100, calm.sp + 30); texts.push({ x: calm.x, y: calm.y - 70, s: "A friend. +30 SP", t: 80 }); Arcade.secret("pigeon"); }
  }
  for (const p of players) if (p && p.pigeon && (activeAtk(p) || p.st === "attack" || DOWN_STATES.includes(p.st) || p.st === "hurt")) p.pigeon = false;
  if (th === "subway") {
    if (!train && frameNo % 600 === 300) train = { x: LW + 40, dir: -1 };
    if (train) {
      train.x += train.dir * 9; if (train.x < -1300) train = null; else if (frameNo % 6 === 0) shake = Math.max(shake, 0.8);
      if (train) for (const e of enemies) if ((e.st === "fly" || e.st === "thrown") && e.y < Y0 + 8 && e.z > 6 && !e.trained) { e.trained = true; damage(e, 20, e.lastBy || e); texts.push({ x: e.x, y: e.y - 60, s: "Mind the gap", t: 60 }); Arcade.noise(0.2, 0.1); Arcade.secret("train"); }
    }
  }
  if ((th === "train" || th === "trainroof") && frameNo % 6 === 0) shake = Math.max(shake, 0.6);   // the rails
  if (th === "trainroof") updateBridge();
  if (th === "factory" && frameNo % 7 === 0) {
    const fx0 = Math.floor((cam + 120) / 512) * 512 + 256;
    fx.push({ kind: "ember", x: fx0 + rand(-20, 20), y: 112, vx: rand(-0.5, 0.5), vy: rand(-1.2, -0.4), t: rand(30, 60) });
  }
  if (th === "roof" && frameNo % 9 === 0) {
    const vx0 = Math.floor(cam / 300) * 300 + 210;
    fx.push({ kind: "steam", x: vx0, y: 116, vx: rand(0.1, 0.4), vy: rand(-0.5, -0.3), t: rand(40, 70) });
  }
}

// Bridges over the last train: a signal, then the girder sweeps the roof at head height. Anyone
// standing is knocked flat (players lose health, goondas go off the train); ducking is safe.
// Goondas see it coming too, most of the time; Raghav nearly always does.
function updateBridge() {
  if (!bridge) { if (--bridgeT <= 0) { bridge = { x: cam + LW + 80, warn: 100 }; bridgeT = Math.round(rand(360, 560)); Arcade.tone(220, 0.5, "sawtooth", 0.04, -40); } return; }
  if (bridge.warn > 0) {
    if (--bridge.warn === 40) for (const e of enemies) if (!DOWN_STATES.includes(e.st) && !["attack", "hurt", "grabbed"].includes(e.st) && Math.random() < (KINDS[e.kind].boss ? 0.9 : 0.45)) setState(e, "duck");
    if (bridge.warn === 0) bridge.x = cam + LW + 80;
    return;
  }
  bridge.x -= 8;
  for (const f of players.concat(enemies)) {
    if (!f || f.bridged || f.st === "duck" || DOWN_STATES.includes(f.st) || f.z > 30 || Math.abs(f.x - bridge.x) > 10) continue;
    f.bridged = true;
    if (f.team === "p") { f.inv = 0; hurt(f, { x: f.x - 10, face: 1, team: "e", kind: "grunt" }, { dmg: 8, knock: true, sfx: 160 }); texts.push({ x: f.x, y: f.y - 70, s: "Duck!", t: 50 }); }
    else if (KINDS[f.kind].boss) { f.inv = 0; f.poise = 999; hurt(f, { x: f.x - 10, face: 1, team: "p", kind: "rai", owner: alivePlayers()[0] }, { dmg: 20, knock: true, sfx: 160 }); }
    else { damage(f, f.hp, f.lastBy || players[0]); setState(f, "fly"); f.vx = -4; f.vz = 4; f.z = 2; f.bounced = true; texts.push({ x: f.x, y: f.y - 60, s: "Off the train!", t: 60 }); }
    shake = 6; Arcade.noise(0.2, 0.1);
  }
  if (bridge.x < cam - 80) { bridge = null; for (const f of players.concat(enemies)) if (f) { f.bridged = false; if (f.team === "e" && f.st === "duck") setState(f, "idle"); } }
}

/* ---------- finishers (DESIGN 7.6) ----------
   A dazed goonda grabbed and thrown towards a fruit cart or a dustbin goes into it (they land,
   groan and stay down; never gory). By day an auto-rickshaw drives the road now and then: anyone
   thrown into its path is taken out ("Beep beep!"), and anyone standing in the road is bumped. */
function finisherAhead(e, dir) {
  if (street.look && street.look.sea && seaHere(e.x + dir * 40)) return { kind: "sea", x: e.x + dir * 40 };
  for (const pr of street.props || []) if ((pr.kind === "fruitcart" || pr.kind === "dustbin") && (pr.x - e.x) * dir > 0 && Math.abs(pr.x - e.x) < 90) return pr;
  return null;
}
function finish(f) {
  const pr = f.finisher; f.finisher = null;
  if (!pr || Math.abs(f.x - pr.x) > 34) return;
  damage(f, KINDS[f.kind].boss ? 25 : f.hp, f.thrownBy || f.lastBy || players[0]);
  texts.push({ x: f.x, y: f.y - 66, s: { fruitcart: "Into the fruit cart!", dustbin: "Binned!", sea: "Into the sea!" }[pr.kind], t: 80 });
  for (let i = 0; i < 14; i++) fx.push({ kind: "dot", x: pr.x, y: Y0 - 6, vx: rand(-2, 2), vy: rand(-3, -0.5), c: pr.kind === "fruitcart" ? pick(["#f2c230", "#e2701c", "#6fa86a"]) : pr.kind === "sea" ? pick(["#a8d8ea", "#ffffff", "#3e8fb0"]) : pick(["#8a8278", "#d8d0c0", "#5a5560"]), t: rand(20, 35) });
  if (pr.kind === "sea" && !KINDS[f.kind].boss) { f.gone = true; f.ko = true; onKO(f); }   // he swims home
  shake = 8; Arcade.noise(0.35, 0.1);
  if (f.thrownBy) f.thrownBy.score += 400;
}
let auto = null, autoT = 600;
function updateTraffic() {
  // the mandi's trucks run in the dark too: the morning rush starts at five
  const rush = inMandi() && rushHour();
  const quiet = isNight() && !rush;   // at night only the ambulance still runs
  if (street.interior || street.theme !== "street" || (street.look && street.look.narrow) || !clockRuns() || (quiet && auto && !auto.amb)) { auto = null; if (street.interior || !clockRuns()) return; }
  if (street.theme !== "street" || (street.look && street.look.narrow)) return;
  if (!auto) {
    if (--autoT <= 0) {
      const d = Math.random() < 0.5 ? 1 : -1, amb = quiet ? Math.random() < 0.35 : Math.random() < 0.12, truck = !amb && (rush ? Math.random() < 0.75 : inMandi() && Math.random() < 0.3);
      autoT = Math.round(rush ? rand(180, 360) : rand(500, 900));
      if (quiet && !amb) return;
      auto = { x: d > 0 ? cam - 90 : cam + LW + 90, d, truck, amb };
      if (amb) return;
      Arcade.tone(truck ? 330 : 700, truck ? 0.25 : 0.08, truck ? "sawtooth" : "square", 0.03);
    }
    return;
  }
  auto.x += auto.d * (auto.amb ? 4 : auto.truck ? 2.6 : 3.4);
  if (auto.amb) {   // the siren while it's on screen, and nobody gets hit: it weaves
    if (Math.abs(auto.x - (cam + LW / 2)) < LW / 2 + 40 && frameNo % 24 === 0) Arcade.tone(frameNo % 48 ? 770 : 960, 0.18, "triangle", 0.02);
    if (auto.x < cam - 140 || auto.x > cam + LW + 140) auto = null;
    return;
  }
  if (Math.abs(auto.x - (cam + LW / 2)) < LW / 2 + 10 && frameNo % 50 === 0) Arcade.tone(auto.truck ? 300 : 760, 0.06, "square", 0.03);
  for (const f of players.concat(enemies)) {
    if (!f || f.autoHit === auto || Math.abs(f.x - auto.x) > (auto.truck ? 52 : 28) || f.y < 192) continue;
    f.autoHit = auto;
    if (f.team === "e" && (f.st === "thrown" || f.st === "fly")) { damage(f, f.hp, f.thrownBy || f.lastBy || players[0]); texts.push({ x: f.x, y: f.y - 66, s: auto.truck ? "Paaam!" : "Beep beep!", t: 80 }); shake = 8; Arcade.noise(0.3, 0.1); }
    else if (!DOWN_STATES.includes(f.st) && f.z < 10) { f.inv = 0; hurt(f, { x: auto.x - auto.d * 10, face: auto.d, team: f.team === "p" ? "e" : "p", kind: "grunt", env: true }, { dmg: auto.truck ? 10 : 6, knock: true, sfx: 180 }); texts.push({ x: f.x, y: f.y - 60, s: auto.truck ? "Paaam!" : "Beep beep!", t: 50 }); }
  }
  if (auto.x < cam - 160 || auto.x > cam + LW + 160 || auto.x < -140 || auto.x > street.w + 140) auto = null;
}
// props whose sheets were cut small for their real size (the size audit): drawn up to scale
const PROP_SCALE = { stall: 1.25, boatup: 1.6, container: 1.25, drums: 1.2 };
function drawStreetProps(P) {
  for (const pr of street.props || []) {
    const x = Math.round(pr.x - cam); if (x < -90 || x > LW + 90) continue;
    if (pr.hours && !hourIn(pr.hours)) continue;
    sprAt({ fruitcart: "v_fruitcart", dustbin: "m_dustbin", pco: "m_pco", stall: "m_stall", sacks: "m_sacks", crates: "m_crates", bhelcart: "m_bhelcart", netacutout: "n_cutout", cards: "p_cards", stones: "p_stones", checkpost: "p_checkpost", auction: "d_auction", fishcart: "d_fishcart", drums: "d_drums", boatup: "d_boatup", container: "m_container", nets: "m_nets", ice: "m_ice", fishcrates: "m_fishcrates" }[pr.kind], x, Y0 + 4, false, PROP_SCALE[pr.kind] || 1);
    if (pr.kind === "newsstand") drawNewsstand(x, P);
    if (pr.kind === "netacutout" && flag("moustache:" + street.id + ":" + pr.x)) { R(x - 5, Y0 - 41, 10, 2, P.ol); R(x - 6, Y0 - 45, 4, 3, P.ol); R(x + 2, Y0 - 45, 4, 3, P.ol); R(x - 2, Y0 - 44, 4, 1, P.ol); }   // the lane's opinion
  }
  drawHeatProps(P); drawHideouts(P); drawEavesdrop(P);
  drawLivingBack(P); drawSpots(); drawBooth(); drawMuseumFront(P);   // on the walls and the pavement: behind everyone
}
// passing traffic, drawn with the cast so it sorts by depth with the people
function drawTraffic(P) {
  if (auto && auto.truck) { const x = Math.round(auto.x - cam); if (!sprAt("v_truck", x, 214, auto.d < 0, 1.3)) { R(x - 60, 160, 120, 46, "#2b54a8"); R(x + (auto.d > 0 ? 34 : -60), 150, 26, 40, "#c0392b"); } }
  else if (auto && auto.amb) { const x = Math.round(auto.x - cam); if (spr("v_ambulance", x, 212, auto.d < 0)) { const on = frameNo % 16 < 8, lx = x + (auto.d < 0 ? 18 : -18); g.globalAlpha = 0.5; g.fillStyle = on ? "#ff3b30" : "#3d7bff"; g.beginPath(); g.arc(lx, 174, 9, 0, 7); g.fill(); g.globalAlpha = 1; text("AMBULANCE", x, 196, 5, "#c0392b", "center", "IBM Plex Sans"); } }
  else if (auto) { const x = Math.round(auto.x - cam); if (!sprAt("auto", x, 212, auto.d < 0, 1.75)) { R(x - 30, 178, 60, 32, "#f2c230"); R(x - 30, 170, 60, 8, "#1d1b18"); } }
}


// vehicles that move or stop in the band: each joins the cast at the depth of its wheels, so a goonda
// behind the van is hidden by it and one in front of it is drawn over it
function vehicleCast() {
  const out = [];
  if (auto) out.push({ y: 207, paint: () => drawTraffic(PAL) });
  if (jeep) out.push({ y: 209, paint: () => drawJeep(PAL) });
  if (convoy) out.push({ y: 204, paint: () => drawConvoy(PAL) });
  if (ev && ev.id === "van" && ev.street === street.id) out.push({ y: 186, paint: () => drawVanEvent(PAL) });
  return out;
}
