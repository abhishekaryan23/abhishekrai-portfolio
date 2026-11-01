/* Rollback City: players and enemies.
   A plain script that shares globals with the others; index.html loads them in order. */
"use strict";

/* ---------- players ---------- */
function useSP(p, cost) {
  if (p.sp >= cost) { p.sp -= cost; return true; }
  texts.push({ x: p.x, y: p.y - 66, s: "Need " + cost + " SP", t: 45 });
  return false;
}
function startAttack(f, name) {
  if (f.team === "p" && f.pi !== undefined) dropDisguise();
  if (f.team === "p" && ASSIST && !ATK[name].back) {
    // turn toward the closest enemy in reach and step onto its lane
    let best = null, bd = 1e9;
    for (const e of enemies) { if (DOWN_STATES.includes(e.st) || e.ally) continue; const dx = Math.abs(e.x - f.x), dy = Math.abs(e.y - f.y); if (dx < 48 && dy < 18 && dx + dy * 2 < bd) { bd = dx + dy * 2; best = e; } }
    if (best) { f.face = Math.sign(best.x - f.x) || f.face; f.y += clamp(best.y - f.y, -10, 10); }
  }
  f.atk = ATK[name]; f.atkName = name; setState(f, "attack"); f.hits.clear();
  if (f.atk.sp) flashSpecial(f);
  // goondas who see a light attack coming sometimes put their guard up (more often later in the night)
  if (f.team === "p" && !f.atk.knock && !f.atk.sp) for (const e of enemies) {
    if ((e.st === "idle" || e.st === "walk") && !KINDS[e.kind].boss && !e.runner && Math.sign(f.x - e.x) === e.face && Math.abs(e.x - f.x) < 44 && Math.abs(e.y - f.y) < 12 && Math.random() < (KINDS[e.kind].shield ? 0.5 : KINDS[e.kind].guard || 0.12 + stageIdx * 0.04)) setState(e, "eblock", KINDS[e.kind].shield ? 40 : 26);
  }
}
function startAir(f, name, vz, vx) {
  if (vz !== undefined) { f.vz = vz; f.z = Math.max(f.z, 0.01); }
  if (vx !== undefined) f.vx = vx;
  f.st = "air"; f.airAtk = name; f.airT = 0; f.hits.clear();
  if (name && ATK[name].sp) flashSpecial(f);
}
function flashSpecial(f) { fx.push({ kind: "ring", x: f.x, y: f.y - 30, t: 14, big: true }); Arcade.tone(980, 0.12, "triangle", 0.05, 400); }

function groundAction(p, btn, mx) {
  const i = p.pi, wantDown = held(i, "down");
  if (btn === "S" && held(i, "up")) {
    setState(p, "taunt", 44);
    p.tauntNear = enemies.some((e) => !DOWN_STATES.includes(e.st) && Math.abs(e.x - p.x) < 60 && Math.abs(e.y - p.y) < 20);
    Arcade.tone(330, 0.1, "square", 0.04); setTimeout(() => Arcade.tone(440, 0.12, "square", 0.04), 120);
    return true;
  }
  if (btn === "S") {
    if (wantDown) { if (useSP(p, 40)) { startAir(p, "dragon", 6.2, p.face * 0.8); p.inv = 16; } return true; }
    if (p.avatarT > 0) { if (useSP(p, 10)) startAttack(p, "chakra"); return true; }
    // the Kalari whirl (from Raghav, after 3-6): forward and special, as Rai or Kai
    if (flag("kalari") && (p.kind === "rai" || p.kind === "kai") && held(i, p.face > 0 ? "right" : "left")) { if (useSP(p, 35)) { startAir(p, "cyclone", 5.6, p.face * 1.2); p.inv = 20; } return true; }
    const [move, cost] = SPECIALS[p.kind] || SPECIALS.rai;
    if (!useSP(p, cost)) return true;
    if (move === "dive") {
      let t = null, bd = 1e9; for (const e of enemies) { if (DOWN_STATES.includes(e.st)) continue; const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y); if (d < bd) { bd = d; t = e; } }
      startAir(p, "dive", 7, t ? clamp((t.x - p.x) / 44, -3.2, 3.2) : p.face * 2); if (t) p.y += clamp(t.y - p.y, -10, 10); p.inv = 20;
    } else { startAttack(p, move); p.inv = move === "quake" ? 26 : 30; }
    return true;
  }
  if (btn === "J") { startAir(p, null, (p.st === "run" ? 5 : 5.4) * (KINDS[p.kind].jump ? KINDS[p.kind].jump / 5.4 : 1), p.st === "run" ? p.face * 2.8 : mx * 1.5); return true; }
  if (btn === "P") {
    if (p.weapon) { startAttack(p, p.weapon.kind === "knife" || p.weapon.kind === "cracker" ? "toss" : "pipe"); return true; }
    // the Avatar's divine form fights bare-handed
    const it = !p.avatarT && items.find((it) => (it.kind === "pipe" || it.kind === "knife" || it.kind === "cracker") && Math.abs(it.x - p.x) < 16 && Math.abs(it.y - p.y) < 9);
    if (it) { items.splice(items.indexOf(it), 1); p.weapon = { kind: it.kind, uses: 8 }; setState(p, "pickup", 10); Arcade.tone(700, 0.06); return true; }
    // down, forward, punch: rising dragon
    const dn = p.cmd.find((c) => c[0] === "D" && frameNo - c[1] < 18), fw = p.cmd.find((c) => c[0] === "F" && frameNo - c[1] < 8);
    if (dn && fw && fw[1] > dn[1] && fw[1] - dn[1] < 10) { p.cmd = []; if (useSP(p, 40)) { startAir(p, "dragon", 6.2, p.face * 0.8); p.inv = 16; return true; } }
    const back = p.cmd.some((c) => c[0] === "B" && frameNo - c[1] < 10);
    if (back || (mx && mx === -p.face)) { if (back && p.backFace) p.face = p.backFace; p.cmd = []; startAttack(p, "elbow"); return true; }
    if (p.st === "run") { startAttack(p, "tackle"); return true; }
    chainAttack(p, "P"); return true;
  }
  if (btn === "K") {
    if (p.st === "run") { startAir(p, "flykick", 4.2, p.face * 3); return true; }
    chainAttack(p, "K"); return true;
  }
  return false;
}
function chainAttack(p, b) {
  const c = (p.chainT > 0 ? p.chain : "") + b, n = c.length;
  let name;
  if (n >= 3) name = b === "P" ? "upper" : "spinheel";
  else if (n === 2) name = b === "P" ? "jab2" : c === "KK" ? "round" : "kick";
  else name = b === "P" ? "jab" : "kick";
  startAttack(p, name);
  const fin = ["upper", "spinheel", "round"].includes(name);
  p.chain = fin ? "" : c; p.chainT = fin ? 0 : ATK[name].len + 18;
}

function updatePlayer(p) {
  const i = p.pi;
  if (p.lives <= 0) return;
  if (p.inv > 0) p.inv--;
  if (p.chainT > 0) p.chainT--;
  if (p.comboT > 0) p.comboT--; else p.combo = 0;
  if (p.staggerT > 0) p.staggerT--; else p.stagger = 0;
  if (dancing()) { setState(p, "idle"); return; }   // everyone dances while the dance-off runs
  if (holdForGame(p)) return;   // batting, or flying a kite
  if (p.ride) { updateRider(p); if (p.ride && p.st !== "attack" && p.st !== "hurt") return; }

  const tp = tapped(i, "punch"), tk = tapped(i, "kick");
  if (tp) p.lastP = frameNo; if (tk) p.lastK = frameNo;
  const both = (tp || tk) && Math.abs(p.lastP - p.lastK) <= 3 && held(i, "punch") && held(i, "kick");
  const BUF = TOUCH ? 12 : 8;
  if (tapped(i, "special") || both) { p.buf = "S"; p.bufT = BUF; p.lastP = p.lastK = -99; }
  else if (tp) { p.buf = "P"; p.bufT = BUF; }
  else if (tk) { p.buf = "K"; p.bufT = BUF; }
  else if (tapped(i, "jump")) { p.buf = "J"; p.bufT = 6; }
  else if (p.bufT > 0) p.bufT--; else p.buf = null;

  for (const [a, d] of [["left", -1], ["right", 1]]) if (tapped(i, a)) {
    const key = d < 0 ? "L" : "R";
    p.cmd.push([d === p.face ? "F" : "B", frameNo]);
    if (d !== p.face) p.backFace = p.face;      // remember which way we faced before turning
    if (frameNo - p.lastTap[key] < 14 && ["idle", "walk"].includes(p.st)) { setState(p, "run"); p.face = d; }
    p.lastTap[key] = frameNo;
  }
  if (tapped(i, "down")) p.cmd.push(["D", frameNo]);
  if (tapped(i, "up")) p.upTap = frameNo;
  // a dodge roll in depth: double-tap up or down (not on a train roof, where down ducks)
  for (const [a, d] of [["up", -1], ["down", 1]]) if (tapped(i, a) && !street.duck) {
    if (frameNo - (p.lastDepthTap || -99) < 14 && p.lastDepthDir === d && (p.st === "idle" || p.st === "walk")) { setState(p, "roll", 16); p.rollDir = d; p.inv = Math.max(p.inv, 14); drillNote("dodge", p); Arcade.noise(0.06, 0.04); }
    p.lastDepthTap = frameNo; p.lastDepthDir = d;
  }
  const anyHeld = ["up", "down", "left", "right", "punch", "kick", "jump", "special"].some((a) => held(i, a));
  p.stillT = p.st === "idle" && !anyHeld ? (p.stillT || 0) + 1 : 0;
  if (p.cmd.length > 8) p.cmd.shift();

  const mx = (held(i, "right") ? 1 : 0) - (held(i, "left") ? 1 : 0);
  // on a train roof there is no depth to walk in: down ducks instead
  const ducking = !!street.duck, my = ducking ? 0 : (held(i, "down") ? 1 : 0) - (held(i, "up") ? 1 : 0);
  if (p.slowT > 0) p.slowT--;
  const sp = KINDS[p.kind].speed * statSpeed() * (p.slowT > 0 ? 0.6 : 1) * (carrying(p) ? 0.6 : 1) * wade();   // too many samosas, someone over your shoulders, or knee-deep water, or someone over your shoulders
  if (carrying(p)) { p.buf = null; if (p.st === "run") setState(p, "walk"); }   // your hands are full: no fighting, no running

  switch (p.st) {
    case "idle": case "walk": case "run": {
      if (ducking && held(i, "down")) { setState(p, "duck"); break; }
      if (held(i, "block")) { setState(p, "block"); p.blockT = 0; break; }
      if (p.buf && groundAction(p, p.buf, mx)) { p.buf = null; break; }
      if (p.st !== "run" && mx && held(i, "dash")) { setState(p, "run"); p.face = mx; break; }
      if (p.st === "run") {
        if (mx !== p.face) { setState(p, "idle"); break; }
        p.x += p.face * 2.5; p.y += my * sp * 0.6; p.walkPh += 2.5 * STRIDE;
        if (frameNo % 10 === 0) dust(p.x - p.face * 6, p.y);
        break;
      }
      if (mx) {
        const tgt = enemies.find((e) => e.st === "hurt" && !KINDS[e.kind].boss && !e.heldBy && Math.sign(e.x - p.x) === mx && Math.abs(e.x - p.x) < 20 && Math.abs(e.y - p.y) < 7);
        if (tgt) { p.hold = tgt; tgt.heldBy = p; setState(tgt, "grabbed"); setState(p, "grab", 100); p.face = mx; tgt.face = -mx; p.knees = 0; break; }
      }
      const boost = p.avatarT > 0 ? 1.15 : 1;
      p.x += mx * sp * boost; p.y += my * sp * 0.7 * boost;
      if (mx) p.face = mx;
      setState(p, mx || my ? "walk" : "idle", p.t + 1);
      if (mx || my) p.walkPh += Math.max(Math.abs(mx) * sp, Math.abs(my) * sp * 0.7) * boost * STRIDE;   // slowed down (carrying someone, say), the legs slow too
      break;
    }
    case "attack": {
      const a = p.atk;
      if (a.move && p.t >= a.a0 && p.t <= a.a1) p.x += p.face * a.move;
      if (a.spawn && p.t === a.spawn) {
        if (p.atkName === "quake") { shoot("wave", p, 0, 1); shoot("wave", p, 0, -1); shake = 8; Arcade.noise(0.3, 0.12); }
        else if (p.atkName === "chakra") shoot("chakra", p, 0);
        else { shoot(p.weapon && p.weapon.kind === "cracker" ? "cracker" : "knife", p, 0); p.weapon = null; }
      }
      if (p.atkName === "pipe" && p.t === a.a1 && p.weapon && --p.weapon.uses <= 0) { texts.push({ x: p.x, y: p.y - 60, s: { umbrella: "Umbrella broke", bat: "The bat split", manjha: "The manjha snapped" }[p.weapon.kind] || "Lathi broke", t: 50 }); p.weapon = null; }
      // cancel windows: chain light hits, or cancel a fresh hit into a special
      if (p.buf === "S" && p.t <= 5 && ["jab", "kick"].includes(p.atkName)) { setState(p, "idle"); groundAction(p, "S", mx); p.buf = null; break; }
      if (a.chain && p.buf && (p.buf === "P" || p.buf === "K") && p.t > a.a1 + 1) { const b = p.buf; p.buf = null; groundAction(p, b, mx); break; }
      if (++p.t >= a.len) setState(p, "idle");
      break;
    }
    case "pickup": if (--p.t <= 0) setState(p, "idle"); break;
    case "duck": if (!ducking || !held(i, "down")) setState(p, "idle"); break;
    case "zip": updateZip(p); break;
    case "block": p.blockT++; if (!held(i, "block")) setState(p, "idle"); break;
    case "roll": p.y += p.rollDir * 2.6; p.walkPh += 0.4; if (--p.t <= 0) setState(p, "idle"); break;
    case "taunt":
      if (--p.t <= 0) {
        setState(p, "idle"); p.sp = Math.min(100, p.sp + 15); texts.push({ x: p.x, y: p.y - 66, s: "+15 SP", t: 50 });
        if (p.tauntNear) Arcade.secret("taunt");
      }
      break;
    case "air": {
      p.x += p.vx; p.airT++;
      if (!p.airAtk && p.buf) {
        if (p.buf === "S") { if (useSP(p, 25)) startAir(p, "cyclone"); }
        else if (p.buf === "P" || p.buf === "K") startAir(p, Math.abs(p.vx) > 2 || (p.buf === "K" && flag("flykick")) ? "flykick" : "jkick");   // Master-ji's flying kick (S11)
        p.buf = null;
      }
      if (p.airAtk === "cyclone" && p.airT % 4 === 0) p.face = -p.face;
      if (p.airAtk === "dive") {
        // the kite dive homes in on the nearest enemy
        let t = null, bd = 1e9; for (const e of enemies) { if (DOWN_STATES.includes(e.st)) continue; const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y); if (d < bd) { bd = d; t = e; } }
        if (t) { const left = Math.max(4, (p.vz + Math.sqrt(p.vz * p.vz + 2 * GRAV * p.z)) / GRAV); p.vx = clamp((t.x - p.x) / left, -3.4, 3.4); p.y += clamp(t.y - p.y, -1, 1); p.face = Math.sign(t.x - p.x) || p.face; }
      }
      break;
    }
    case "grab": {
      const e = p.hold;
      if (!e || e.st !== "grabbed") { p.hold = null; setState(p, "idle"); break; }
      e.x = p.x + p.face * 16; e.y = p.y;
      if (p.buf === "P") {
        p.buf = null; p.knees++;
        hurt(e, p, p.knees >= 3 ? { ...ATK.knee, dmg: 7, knock: true } : ATK.knee);
        p.score += 50; p.sp = Math.min(100, p.sp + 5); setState(p, "knee", 14);
        if (p.knees >= 3) { e.heldBy = null; p.hold = null; }
        break;
      }
      if (p.buf === "K" || (mx && mx === -p.face)) {
        p.buf = null; e.heldBy = null; p.hold = null;
        const dir = mx || -p.face;
        e.face = -dir; e.x = p.x; e.thrownBy = p; setState(e, "thrown"); e.vx = 3.6 * dir; e.vz = 4.2; e.z = 10;
        e.finisher = finisherAhead(e, dir);   // a fruit cart or a dustbin in the way: into it
        damage(e, 10, p); p.score += 200; setState(p, "throw", 22); p.face = dir;
        Arcade.noise(0.12, 0.08);
        break;
      }
      if (--p.t <= 0) { e.heldBy = null; p.hold = null; setState(e, "idle"); setState(p, "idle"); }
      break;
    }
    case "knee": case "throw": if (--p.t <= 0) setState(p, p.hold ? "grab" : "idle", p.hold ? 60 : 0); break;
    case "hurt": if (--p.t <= 0) { setState(p, "idle"); p.inv = Math.max(p.inv, 6); } break;
    case "lying": if (--p.t <= 0) { if (p.hp <= 0) loseLife(p); else setState(p, "getup", 22); } break;
    case "getup": if (--p.t <= 0) { setState(p, "idle"); p.inv = 50; } break;
  }
  if (p.st !== "zip") p.x = clamp(p.x, cam + 10, cam + LW - 10);   // on the wire the camera catches up
  p.y = clamp(p.y, Y0, Y1);
}

function loseLife(p) {
  if (dish("kheer") && !progress.buff.used) { progress.buff.used = true; p.hp = p.max; setState(p, "getup", 22); texts.push({ x: p.x, y: p.y - 70, s: "Nani's kheer! Back on your feet", t: 100 }); return; }
  nemesisNote(p);   // the one who put you down remembers it
  p.lives--;
  if (p.weapon) dropWeapon(p);
  if (p.lives > 0) {
    p.hp = p.max; p.sp = Math.max(p.sp, 40); setState(p, "air"); p.airAtk = null; p.inv = 120; p.z = 40; p.vz = 0; p.vx = 0;
    texts.push({ x: p.x, y: p.y - 74, s: p.lives + (p.lives === 1 ? " life left" : " lives left"), t: 80 });
  } else setState(p, "out");
}

/* ---------- enemies ---------- */
function updateEnemy(e) {
  const k = KINDS[e.kind];
  if (e.inv > 0) e.inv--;
  if (e.bike && e.st !== "windup" && e.st !== "attack") { updateBiker(e); return; }
  // a fake constable loses his nerve when it goes badly, and his "fines" fall out of his pocket
  if (k.coward && !e.fled && e.hp > 0 && e.hp < e.max * 0.4 && !DOWN_STATES.includes(e.st)) { e.fled = true; dropCash(e); setState(e, "flee"); texts.push({ x: e.x, y: e.y - 60, s: pick(["Asli fighter! Bhaago!", "I'm not even a policeman!"]), t: 70 }); }
  if (convoyMan(e)) return;   // walking with Netaji's car (flavour.js moves him)
  if (k.boss && !e.rage && e.hp > 0 && e.hp <= k.hp * 0.5) {
    e.rage = true; shake = 6; Arcade.noise(0.25, 0.1);
    texts.push({ x: e.x, y: e.y - 80 * k.scale, s: k.name + " is enraged!", t: 100 });
  }
  if (e.cool > 0) e.cool -= e.rage ? 2 : 1;
  if (e.warn > 0) e.warn--;
  switch (e.st) {
    case "idle": case "walk": {
      const tgts = e.ally ? allyTargets(e) : alivePlayers();
      if (e.ally) { if (!tgts.length) { e.aggro = false; allyHello(e); wander(e); break; } e.aggro = true; }   // an ally fights whoever is fighting near you
      if (!tgts.length) { setState(e, "idle"); break; }
      if (e.runner) { updateRunner(e); break; }
      if (e.goal && goForStall(e)) break;
      if (e.roam && !e.aggro) { wander(e); break; }
      if (e.roam && !tgts.some((p) => Math.abs(p.x - e.x) < 320)) { if (arena) setState(e, "flee"); else { e.aggro = false; e.engaged = false; } break; }   // lost them
      const p = tgts.reduce((a, b) => (Math.abs(a.x - e.x) + Math.abs(a.y - e.y) * 2 < Math.abs(b.x - e.x) + Math.abs(b.y - e.y) * 2 ? a : b));
      const engaged = enemies.filter((o) => o !== e && o.target === p && o.engaged && !busy(o)).length;
      if (!e.engaged && engaged < 2 && e.cool < 40) e.engaged = true;
      e.target = p;
      let side = Math.sign(e.x - p.x) || 1;
      if (e.engaged) {
        const mate = enemies.find((o) => o !== e && o.engaged && o.target === p && !busy(o) && (Math.sign(o.x - p.x) || 1) === side);
        if (mate && Math.abs(mate.x - p.x) < Math.abs(e.x - p.x) && p.x - cam > 40 && cam + LW - p.x > 40) side = -side;
      }
      const adx = Math.abs(p.x - e.x), ady = Math.abs(p.y - e.y), pDown = DOWN_STATES.includes(p.st) || p.st === "out";
      e.face = Math.sign(p.x - e.x) || -side;
      // bosses back off every few seconds to set up a special move
      if (k.boss) { e.spT = (e.spT || 0) + 1; if (e.spT > (e.rage ? 180 : 300) && !e.retreat) { e.retreat = true; e.retreatT = 150; } }
      if (e.retreat && e.retreatT > 0) e.retreatT--;
      if (e.retreat && (adx > 80 || e.retreatT <= 0) && !pDown) {
        e.retreat = false; e.spT = 0;
        const sp = adx <= 80 ? k.specials.filter((m) => m === "pound" || m === "eRoll" || m === "fan") : k.specials.filter((m) => m !== "pound" || adx < 120);
        const m = pick(sp.length ? sp : k.specials);
        if (m) { windup(e, m, m === "charge" ? 30 : 22, true); break; }
        windup(e, "heavy", 22, true); break;
      }
      // specials and ranged moves
      if (e.cool <= 0 && !pDown && !e.retreat) {
        const sp = k.specials || [], rr = e.rage ? 2 : 1;
        if (k.ranged && adx > 60 && ady < 8 && frameNo - lastKnife > 70 && Math.random() < 0.05) { lastKnife = frameNo; windup(e, "eToss", 16); break; }
        if (k.lob && adx > 36 && adx < 140 && ady < 10 && frameNo - (e.lobF || -999) > 480) { e.lobF = frameNo; e.face = Math.sign(p.x - e.x) || e.face; windup(e, "eToss", 16); break; }   // a net, a sack: opens with one, then every few seconds
        if (sp.includes("whistle") && !e.whistled && e.hp < e.max * 0.6) { e.whistled = true; windup(e, "whistle", 16, true); break; }
        if (k.fly && adx > 46 && adx < 100 && ady < 8 && Math.random() < 0.04) { windup(e, "eFly", 12); break; }
        if (sp.includes("charge") && adx > 80 && ady < 18 && Math.random() < 0.05 * rr) { windup(e, "charge", 30, true); break; }
        if (sp.includes("eRoll") && adx > 40 && adx < 140 && ady < 10 && Math.random() < 0.03 * rr) { windup(e, "eRoll", 24, true); break; }
        if (sp.includes("dive") && adx > 60 && Math.random() < 0.02 * rr) { windup(e, "dive", 18, true); break; }
        if (sp.includes("fan") && adx > 70 && ady < 30 && Math.random() < 0.015 * rr) { windup(e, "fan", 20, true); break; }
        if (sp.includes("pound") && adx < 90 && Math.random() < 0.012 * rr) { windup(e, "pound", 26, true); break; }
      }
      const keepOff = e.retreat ? 110 : k.ranged ? 110 : 70 + e.id * 40;
      const close = e.engaged && !k.ranged && !e.retreat;
      if (e.retreat && (p.x - cam < 110 || cam + LW - p.x < 110) && Math.abs((p.x + side * 110) - clamp(p.x + side * 110, cam + 16, cam + LW - 16)) > 1) side = -side;
      // a waiting spot off the screen used to be clamped onto the screen's edge, which could be right on top
      // of the player (and in a narrow gali there was no room to step aside): wait on whichever side has room
      let want = p.x + side * (close ? 22 * k.scale * BS : keepOff);
      if (!close) {
        const room = (sd) => (sd > 0 ? cam + LW - 16 - p.x : p.x - cam - 16);
        if (room(side) < Math.min(keepOff, 60) && room(-side) > room(side)) side = -side;
        want = p.x + side * Math.max(34, Math.min(keepOff, room(side)));
      }
      if ((e.flipT || 0) > 0) { e.flipT--; want = p.x - side * (close ? 22 * k.scale * BS : 60); }   // unsticking: try the other side
      const tx = clamp(want, cam + 16, cam + LW - 16);
      let ty = e.engaged || k.ranged || e.retreat ? p.y : clamp(p.y + Math.sin(frameNo / 60 + e.id * 9) * 22, Y0, Y1);
      // going to his other side: round him in depth, not through him
      if (Math.sign(tx - p.x) !== Math.sign(e.x - p.x) && Math.abs(e.x - p.x) < 40) ty = clamp(p.y + (e.y <= p.y && p.y - 18 >= Y0 ? -18 : 18), Y0, Y1);
      const dx = tx - e.x, dy = ty - e.y, spd = k.speed * (e.engaged ? 1 : 0.8) * (e.rage ? 1.25 : 1) * wade();
      if (Math.abs(dx) > 2) e.x += Math.sign(dx) * Math.min(spd, Math.abs(dx));
      if (Math.abs(dy) > 1.5) e.y += Math.sign(dy) * Math.min(spd * 0.7, Math.abs(dy));
      // elbow room: apart in depth if there is depth to spare, else along the street
      for (const o of enemies) if (o !== e && !DOWN_STATES.includes(o.st) && Math.abs(o.x - e.x) < 14 && Math.abs(o.y - e.y) < 6) { const dyo = e.y < o.y || (e.y === o.y && e.id < o.id) ? -1 : 1; if (e.y + dyo > Y0 && e.y + dyo < Y1) e.y += dyo; else e.x += e.x < o.x || (e.x === o.x && e.id < o.id) ? -1.2 : 1.2; }
      if (!close && Math.abs(e.x - p.x) < 24 && Math.abs(e.y - p.y) < 10 && !pDown) e.x += (Math.sign(e.x - p.x) || side) * 1.2;   // never stand inside the player
      e.y = clamp(e.y, Y0, Y1);
      // a goonda that has been walking without getting anywhere for a second and a half picks another spot
      if (frameNo % 90 === 0) { if (e.st === "walk" && Math.abs(e.x - (e.px90 ?? e.x - 99)) < 3 && Math.abs(e.y - (e.py90 ?? e.y)) < 3) { e.flipT = 90; e.engaged = false; e.cool = Math.max(e.cool, 30); } e.px90 = e.x; e.py90 = e.y; }
      const inRange = adx < 30 * k.scale * BS && ady < 6 && p.z < 8;
      if (e.engaged && inRange && e.cool <= 0 && !pDown && !e.retreat) { windup(e, e.weapon ? "pipe" : pick(k.moves), k.windup); break; }
      setState(e, Math.abs(dx) > 2 || Math.abs(dy) > 1.5 ? "walk" : "idle", e.t + 1);
      if (e.st === "walk") e.walkPh += Math.max(Math.min(spd, Math.abs(dx)), Math.min(spd * 0.7, Math.abs(dy))) * STRIDE * 1.1;
      break;
    }
    case "windup":
      if (--e.t <= 0) {
        if (AIR.has(e.atkName)) {
          const p = e.target || alivePlayers()[0];
          if (e.atkName === "dive") { const dx = p ? p.x - e.x : 0; startAir(e, "dive", 7, clamp(dx / 44, -3.2, 3.2)); }
          else startAir(e, "eFly", 4.2, e.face * 2.6);
        } else { startAttack(e, e.atkName); if (e.atkName === "charge" || e.atkName === "eRoll") Arcade.tone(140, 0.4, "sawtooth", 0.05, 60); }
      }
      break;
    case "attack": {
      const a = e.atk;
      if (e.atkName === "charge") {
        e.x += e.face * 3.4;
        if (e.x < cam + 12 || e.x > cam + LW - 12 || e.t > 70) { e.x = clamp(e.x, cam + 12, cam + LW - 12); setState(e, "idle"); e.cool = rand(...k.cool) + 60; break; }
      }
      if (a.move && e.t >= a.a0 && e.t <= a.a1) e.x = clamp(e.x + e.face * a.move, cam + 12, cam + LW - 12);
      if (a.spawn && e.t === a.spawn) {
        if (e.atkName === "pound") { shoot("wave", e, 0, 1); shoot("wave", e, 0, -1); shake = 8; Arcade.noise(0.3, 0.12); }
        else if (e.atkName === "fan") { const s = k.shot || "knife"; shoot(s, e, -12); shoot(s, e, 0); shoot(s, e, 12); }
        else if (e.atkName === "whistle") whistleBackup(e);
        else shoot(k.shot || k.lob || "knife", e, 0);
      }
      if (++e.t >= a.len) { setState(e, "idle"); e.cool = rand(...k.cool); e.engaged = Math.random() < 0.7; }
      break;
    }
    case "air": e.x += e.vx; e.airT++; break;
    case "hurt": if (--e.t <= 0 && !e.heldBy) setState(e, "idle"); break;
    case "grabbed": if (!e.heldBy) setState(e, "idle"); break;
    case "eblock": if (--e.t <= 0) setState(e, "idle"); break;
    case "lying": if (--e.t <= 0) { if (e.hp <= 0 && !e.roam) { setState(e, "dead", 50); onKO(e); } else { if (e.hp <= 0) { onKO(e); e.ko = true; } setState(e, "getup", 26); } } break;
    case "getup": if (--e.t <= 0) { if (e.ko) { setState(e, "flee"); if (Math.random() < 0.5) texts.push({ x: e.x, y: e.y - 60, s: pick(["Bas, bas!", "I'm going!", "Maaf karo!"]), t: 50 }); } else { setState(e, "idle"); e.inv = 30; e.cool = 30; } } break;
    case "flee": {
      // a knocked-out street goonda limps off the way he is facing away from the players, and is gone
      const p = alivePlayers()[0], dir = e.fleeDir || (e.fleeDir = (p ? Math.sign(e.x - p.x) : 1) || 1);
      e.x += dir * 1.7; e.face = dir; e.walkPh += 0.3;
      if (e.x < cam - 50 || e.x > cam + LW + 50 || e.x <= 12 || e.x >= street.w - 12) e.gone = true;
      break;
    }
    case "dead": if (--e.t <= 0) e.gone = true; break;
  }
}
function windup(e, name, t, special) {
  if (e.rage) t = Math.max(6, Math.round(t * 0.7));   // an enraged boss telegraphs less
  e.atkName = name; e.atk = ATK[name]; e.hits.clear(); setState(e, "windup", t); if (special) e.warn = t;
  if (e.team === "e") streetHelps(e);
}

function onKO(e) {
  const k = KINDS[e.kind];
  const killer = e.lastBy && e.lastBy.team === "p" ? e.lastBy : alivePlayers()[0];
  if (killer) killer.score += k.score;
  texts.push({ x: e.x, y: e.y - 60, s: "+" + k.score, t: 60 });
  if (e.weapon) dropWeapon(e);
  nemesisBeaten(e);
  if (e.kind === "godbole") godboleDown(e);
  dropCash(e);
  if (!k.police && !e.ally && e.aggro && !mission && streetRespectToday()) changeRespect(1);   // a fight he started, won fair (up to five a district a day)
  if (Math.random() < 0.12 && !k.boss) items.push({ kind: Math.random() < 0.5 ? "food" : "drink", x: e.x, y: e.y, z: 10, vz: 2 });
  if (k.boss) {
    shake = 10; Arcade.noise(0.4, 0.12);
    const u = UNLOCK_BY[e.kind];
    if (u && !rosterUnlocked().includes(u)) { const r = rosterUnlocked(); r.push(u); try { localStorage.setItem("city:roster", JSON.stringify(r)); } catch (x) { /* ignore */ } Arcade.toast(KINDS[u].name + " is on Nani's side now. Swap fighters at the dhaba."); }
  }
}
function rosterUnlocked() { try { return JSON.parse(localStorage.getItem("city:roster")) || []; } catch (e) { return []; } }
function dropWeapon(f) { if (!f.weapon) return; items.push({ kind: f.weapon.kind, x: f.x + f.face * 8, y: f.y, z: 20, vz: 1.5 }); f.weapon = null; }

// A street goonda minding his own business: strolls about, stops, strolls again, and picks a fight
// as soon as a player on screen comes within sight (or hits him: see hurt).
function wander(e) {
  const k = KINDS[e.kind];
  if (!Number.isFinite(e.wx)) { e.wx = e.x; e.wt = 0; }   // (one placed by a scene or a mission has no stroll target yet)
  const seen = e.x > cam - 60 && e.x < cam + LW + 60 && alivePlayers().some((p) => Math.abs(p.x - e.x) < 110);
  // left far behind for five seconds: he goes home, and frees his place for someone nearer
  e.farT = e.x < cam - LW || e.x > cam + 2 * LW ? (e.farT || 0) + 1 : 0;
  if (e.farT > 300) { e.gone = true; return; }
  if (seen && !e.ally && !truce() && !disguised() && (!k.police || heat())) { e.aggro = true; e.cool = Math.max(e.cool, 30); texts.push({ x: e.x, y: e.y - 60, s: pick(["Oi!", "Arre, you!", "Ruk!", "Look who it is"]), t: 50 }); return; }
  if (e.wt > 0) { e.wt--; setState(e, "idle", e.t + 1); return; }
  const dx = e.wx - e.x;
  if (Math.abs(dx) < 3) { e.wt = rand(60, 200); e.wx = clamp(e.x + rand(-180, 180), 20, street.w - 20); return; }
  e.x += Math.sign(dx) * k.speed * 0.5; e.face = Math.sign(dx); e.walkPh += k.speed * 0.5 * STRIDE * 1.1; setState(e, "walk", e.t + 1);
}


// Godbole's whistle: two constables come running
function whistleBackup(e) {
  texts.push({ x: e.x, y: e.y - 70, s: "Phweeeet!", t: 60 }); Arcade.tone(2600, 0.3, "square", 0.03);
  for (const side of [-1, 1]) { const c = fighter("constable", side < 0 ? cam - 30 : cam + LW + 30, rand(Y0 + 6, Y1 - 4), "e"); Object.assign(c, { aggro: true, face: -side, cool: 60 }); enemies.push(c); }
  fighterArt("constable");
}
