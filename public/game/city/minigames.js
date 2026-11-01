/* Rollback City: the minigames (DESIGN 6.1: S2 Chandni XI, S4 Pappu's Kites, S7 the Kushti Ladder;
   3.10 of the plan). A plain script that shares globals with the others; index.html loads them in order.

   Gully cricket in the Back Gali: you bat for Chandni XI. The bowler runs in, the ball bounces once,
   and you swing (punch) as it reaches you: middle it for four or six (and maybe a window), edge it
   and you might be caught, miss and it might hit the stumps. Three matches, one a day: Mandi XI,
   Docks XI, Kinara XI. Win all three and the street cup goes on Nani's counter, and the bat is yours.
   Kite duels on the rooftops with Pappu: steer your kite (left and right), pull (up) to climb, give
   slack (down). Where the strings cross, the one pulling cuts the other, and from above you cut
   faster. Three rivals and then Pappu himself; beat him and his manjha is yours.
   The kushti ladder at Bhola's akhada: ten bouts in the pit, a step at a time, with two visitors from
   the Akhada (one from the Varanasi ghats, one from a Himalayan monastery), a rematch with Tola, and
   last of all Bhola himself. Strength at the fifth; Bhola's slam (a thrown man shakes the floor) at
   the tenth. */
"use strict";

const minigameOn = () => !!(cricket || kiteDuel);
// a match on: the street's loiterers wander off rather than pick on a batter who can't move
function clearRoamers() { for (const e of enemies) if (e.roam && !e.ally && !DOWN_STATES.includes(e.st)) { e.aggro = false; setState(e, "flee"); } }
// players are held in place while a minigame runs; true when it has taken their turn
function holdForGame(p) {
  if (minigameOn() && (DOWN_STATES.includes(p.st) || p.st === "hurt")) { if (cricket) endCricket(); else { kiteDuel = null; } return false; }   // knocked about: the game's off
  if (cricket) { batterTurn(p); return true; }
  if (kiteDuel) { p.x = kiteDuel.px; p.y = kiteDuel.py; p.face = 1; if (p.st !== "idle") setState(p, "idle"); return true; }
  return false;
}

/* ---------- S2: Chandni XI ---------- */
const XI = [
  { name: "Mandi XI", target: 18, v: 3.4, kind: "medium", say: "Mandi XI bowl straight and talk a lot." },
  { name: "Docks XI", target: 22, v: 3.0, kind: "spin", say: "Docks XI have a spinner. The ball dies after it bounces." },
  { name: "Kinara XI", target: 26, v: 4.3, kind: "fast", say: "Kinara XI bowl fast. Very fast. Their bowler is fourteen and has a moustache." }];
const PITCH = { street: "gali", x: 560 };
let cricket = null;
function cricketTarget(p) {
  const n = progress.cricket || 0, O = XI[n];
  if (street.id !== PITCH.street || !O || Math.abs(p.x - (PITCH.x + 80)) > 24 || mission || arena || !clockRuns() || !hourIn([9, 18])) return null;
  if (progress.cricketDay === progress.clock.day) return { label: "Chandni XI: the next match is tomorrow", x: PITCH.x + 80, y: Y0 - 44, act: () => {} };
  return { label: "Bat for Chandni XI against " + O.name, x: PITCH.x + 80, y: Y0 - 44, act: () => startCricket(n) };
}
function startCricket(n) {
  const O = XI[n], p = players[0];
  cricket = { n, O, runs: 0, out: 0, balls: 12, faced: 0, ball: null, t: 60, log: [], bat: p.weapon };
  Object.assign(p, { x: PITCH.x, y: Y0 + 14, face: 1, weapon: { kind: "bat", uses: 999 } }); setState(p, "idle");
  clearRoamers();
  cricket.bowler = { civ: true, look: "civ_f", base: 4, x: PITCH.x + 200, y: Y0 + 14, face: -1, st: "stand", walkPh: 0 };
  npcs.push(cricket.bowler);
  say([{ who: "N", text: "Chandni XI against " + O.name + ": two overs, three wickets, " + O.target + " to win. " + O.say + " The stumps are a crate. The boundary is the end of the gali. Swing (punch) as the ball reaches you." }]);
}
function batterTurn(p) {
  const c = cricket;
  p.x = PITCH.x; p.y = Y0 + 14; p.face = 1;
  if (p.st === "attack") { if (++p.t >= p.atk.len) setState(p, "idle"); return; }
  if (p.pi === 0 && (tapped(0, "punch") || tapped(0, "kick")) && c.ball && !c.ball.swing) { startAttack(p, "pipe"); c.ball.swing = frameNo; }
}
// the ball: run-up, release, one bounce, and then whatever you make of it
function updateCricket() {
  const c = cricket; if (!c) return;
  if (scene || state !== "play") return;
  const B = c.bowler, O = c.O;
  if (!c.ball) {
    if (--c.t > 0) return;
    // the run-up
    B.st = "walk"; B.x -= 2.2; B.walkPh += 0.35;
    if (B.x > PITCH.x + 130) return;
    B.st = "stand";
    const v = O.v * (O.kind === "fast" ? rand(0.95, 1.12) : rand(0.9, 1.05));
    c.ball = { x: PITCH.x + 122, z: 26, vz: 1.2, v, bounced: false, swing: 0, done: false };
    return;
  }
  const b = c.ball;
  if (!b.done) {
    b.x -= b.v; b.z += b.vz; b.vz -= 0.16;
    if (b.z <= 0 && !b.bounced) { b.bounced = true; b.z = 0; b.vz = 2.4; if (O.kind === "spin") b.v *= 0.72; dust(b.x, Y0 + 14); }
    // the moment of truth: where the ball is when the bat comes through
    if (b.swing && frameNo === b.swing + ATK.pipe.a0) {
      const early = (b.x - (PITCH.x + 12)) / b.v;   // frames until the ball would reach the bat
      const q = Math.abs(early) <= 2 ? "middle" : Math.abs(early) <= 5 ? "good" : Math.abs(early) <= 8 ? "edge" : "miss";
      if (q !== "miss") return shot(q);
    }
    if (b.x <= PITCH.x - 12) {   // past the bat
      b.done = true;
      b.vx = 0; if (Math.random() < (b.swing ? 0.6 : 0.5)) wicket("Bowled! The crate goes over."); else ball("Beaten! Past the crate by a whisker.", 0);
    }
    return;
  }
  // the hit ball flying off down the gali
  b.x += b.vx; b.z += b.vz; b.vz -= 0.12;
  if (b.z < 0 || b.x > cam + LW + 40) { c.ball = null; c.t = 50; B.x = PITCH.x + 200; if (c.over) endCricket(); }
}
function shot(q) {
  const c = cricket, b = c.ball;
  b.done = true; Arcade.tone(q === "middle" ? 880 : 520, 0.08, "square", 0.05);
  if (q === "edge" && Math.random() < 0.35) { b.vx = 2; b.vz = 3; return wicket("Edged and caught! The wicketkeeper is seven, and delighted."); }
  const r = q === "middle" ? (Math.random() < 0.65 ? 6 : 4) : q === "good" ? pick([4, 2, 2, 1]) : pick([1, 1, 0]);
  b.vx = r >= 4 ? 5.5 : 3; b.vz = r === 6 ? 5 : r === 4 ? 2.2 : 3;
  let line = r === 6 ? "SIX! Over the washing lines!" : r === 4 ? "FOUR! Down the gali." : r ? r + (r === 1 ? " run." : " runs.") : "Straight to the fielder.";
  if (r === 6 && Math.random() < 0.3) {   // and somebody's window
    line = "SIX! Through Mrs. Joshi's window!"; Arcade.noise(0.3, 0.06);
    setTimeout(() => texts.push({ x: PITCH.x + 140, y: Y0 - 60, s: pick(["Arre! Who's paying for that?!", "My good glass! Your Nani will hear about this!"]), t: 110 }), 500);
    if (money() >= 20) progress.money -= 20;
  }
  ball(line, r);
}
function ball(line, r) {
  const c = cricket; c.faced++; c.runs += r;
  texts.push({ x: PITCH.x + 30, y: Y0 - 50, s: line, t: 90 });
  if (r >= 4) shake = 2;
  if (c.runs >= c.O.target || c.faced >= c.balls) c.over = true;
  if (!c.ball || c.ball.done === false) { c.ball = null; c.t = 50; c.bowler.x = PITCH.x + 200; if (c.over) endCricket(); }
}
function wicket(line) {
  const c = cricket; c.out++; c.faced++;
  texts.push({ x: PITCH.x, y: Y0 - 50, s: line, t: 100 }); Arcade.noise(0.15, 0.05);
  if (c.out >= 3 || c.faced >= c.balls) c.over = true;
  c.ball = null; c.t = 60; c.bowler.x = PITCH.x + 200; if (c.over) endCricket();
}
function endCricket() {
  const c = cricket; if (!c) return;
  cricket = null; npcs = npcs.filter((n) => n !== c.bowler);
  const p = players[0]; p.weapon = c.bat; progress.cricketDay = progress.clock.day;
  if (c.runs >= c.O.target) {
    progress.cricket = c.n + 1; earn(150 * (c.n + 1)); changeRespect(4, "chandni");
    if (progress.cricket >= XI.length) {
      progress.flags.cup = true; p.weapon = { kind: "bat", uses: 14 };
      say([{ who: "N", text: "Chandni XI beat " + c.O.name + " with " + (c.balls - c.faced) + " balls to spare, and win the street cup: a steel tumbler on a block of wood. It goes on Nani's counter, next to the kettle." },
        { who: "N", text: "The captain gives you the bat. It's taped in three places and signed by everyone, including the dog. (A cricket bat: it swings like a lathi.)" }]);
    } else say([{ who: "N", text: "Chandni XI win! " + c.runs + "/" + c.out + ". " + XI[c.n + 1].name + " want a match tomorrow." }]);
  } else say([{ who: "N", text: c.O.name + " win by " + (c.O.target - 1 - c.runs) + " runs. The captain says the pitch was bad. The pitch is a gali. Rematch tomorrow." }]);
  saveGame(true);
}
// the stumps (a crate), the ball and its shadow, and the scoreboard
function drawCricket(P) {
  const c = cricket; if (!c || street.id !== PITCH.street) return;
  const sx = Math.round(PITCH.x - 18 - cam), y = Y0 + 14;
  R(sx - 6, y - 16, 12, 16, "#8a5d3b"); R(sx - 6, y - 16, 12, 2, "#a8784a"); for (let k = 0; k < 3; k++) R(sx - 4 + k * 4, y - 22, 1.5, 6, "#efe6d2");
  const b = c.ball;
  if (b) { const bx = Math.round(b.x - cam); g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(bx, y, 3, 1, 0, 0, 7); g.fill(); g.fillStyle = "#c0392b"; g.beginPath(); g.arc(bx, y - 4 - b.z, 2.2, 0, 7); g.fill(); R(bx - 1, y - 5 - b.z, 2, 0.6, "#f7f4ee"); }
}
// the scoreboard, with the HUD (over the washing lines)
function drawScoreboard() {
  const c = cricket; if (!c || street.id !== PITCH.street) return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const left = c.O.target - c.runs, bl = c.balls - c.faced, line = "CHANDNI XI " + c.runs + "/" + c.out + "  v  " + c.O.name.toUpperCase() + "   " + (left > 0 ? "need " + left + " off " + bl : "won");
  g.font = "bold 7px 'IBM Plex Mono', monospace"; const w = g.measureText(line).width + 14;
  R(LW / 2 - w / 2, 40, w, 13, "rgba(14,13,12,0.78)"); R(LW / 2 - w / 2, 52, w, 1, "#f2c230");
  text(line, LW / 2, 49, 7, "#f7f4ee");
}

/* ---------- S4: Pappu's kites ---------- */
const KITE_RIVALS = [
  { name: "Bunty from the next roof", pull: 0.55, skill: 0.5, col: "#3d7bff" },
  { name: "The Mandi twins", pull: 0.65, skill: 0.65, col: "#2f8a4a" },
  { name: "Kite Raja of the Kinara", pull: 0.75, skill: 0.8, col: "#c96bd8" },
  { name: "Pappu himself", pull: 0.85, skill: 0.95, col: "#f2c230" }];
const PAPPU = { street: "roofs", x: 1480 };
let kiteDuel = null;
WORLD.streets.roofs.npcs = (WORLD.streets.roofs.npcs || []).concat({ look: "civ_b", base: 0, x: PAPPU.x, y: Y0 + 8, face: -1, hours: [9, 18], needs: "2-1" });
function kiteTarget(p) {
  const n = progress.kites || 0, K = KITE_RIVALS[n];
  if (street.id !== PAPPU.street || Math.abs(p.x - PAPPU.x) > 24 || mission || arena || !clockRuns() || !hourIn([9, 18]) || !progress.done.includes("2-1")) return null;
  if (!K) return { label: "Talk to Pappu", x: PAPPU.x, y: Y0 - 44, act: () => say([{ who: "pappu", text: pick(["Sankranti's coming. The whole sky will be kites. Save some manjha for me.", "You cut me fair and square. Nobody's done that since my uncle.", "Never fly near the wires. Never. Not even to show off. Especially to show off."]) }]) };
  if (progress.kiteDay === progress.clock.day) return { label: "Pappu: the wind's gone for today. Tomorrow", x: PAPPU.x, y: Y0 - 44, act: () => {} };
  return { label: "Kite duel against " + K.name, x: PAPPU.x, y: Y0 - 44, act: () => startKites(n) };
}
function startKites(n) {
  const K = KITE_RIVALS[n], p = players[0];
  clearRoamers();
  kiteDuel = { n, K, px: p.x, py: Y0 + 10, me: { x: 140, y: 60, vx: 0, vy: 0, cut: false }, them: { x: 280, y: 50, vx: 0, vy: 0, cut: false, pullT: 0, aim: 0 }, saw: 0, score: [0, 0], t: 0, pause: 90 };
  say([{ who: "pappu", text: n === 3 ? "So. You've cut everyone on these roofs. Now you cut me. Glass manjha, both of us. No crying." : "Your kite, my manjha. You fly against " + K.name + ". Steer left and right, pull (up) to climb, give slack (down). Where the strings cross, whoever is pulling cuts. From above, you cut faster. Best of three." }]);
}
function updateKites() {
  const d = kiteDuel; if (!d || scene || state !== "play") return;
  const me = d.me, th = d.them, p = players[0];
  if (d.pause > 0) { d.pause--; if (d.pause === 0) Object.assign(me, { x: 140, y: 60, vx: 0, vy: 0, cut: false }, {}), Object.assign(th, { x: 280, y: 50, vx: 0, vy: 0, cut: false }); return; }
  d.t++;
  // yours: steer, pull to climb, slack to sink; the wind keeps everything moving
  const pull = held(0, "up") || held(0, "punch"), slack = held(0, "down"), mx = (held(0, "right") ? 1 : 0) - (held(0, "left") ? 1 : 0);
  if (!me.cut) {
    me.vx += mx * 0.12 + Math.sin(d.t / 50) * 0.02; me.vy += pull ? -0.14 : slack ? 0.12 : 0.03;
    me.vx *= 0.94; me.vy *= 0.92; me.x = clamp(me.x + me.vx, 30, LW - 30); me.y = clamp(me.y + me.vy, 18, 120);
  } else { me.y += 0.8; me.x += Math.sin(d.t / 9) * 0.8 - 0.5; }
  // theirs: go after your string, a point along it and a little above, and pull in bursts
  const hand = { x: d.px - cam + 6, y: d.py - 38 }, other = { x: LW + 20, y: 140 };
  if (!th.cut) {
    if (--th.aim <= 0) { const t = rand(0.35, 0.8); th.aim = Math.round(rand(80, 160) * (1.4 - d.K.skill)); th.tx = clamp(hand.x + (me.x - hand.x) * t + rand(-15, 15), 30, LW - 30); th.ty = clamp(hand.y + (me.y - hand.y) * t - rand(8, 26) * d.K.skill, 18, 110); }
    th.vx += Math.sign(th.tx - th.x) * 0.05 * (0.6 + d.K.skill); th.vy += Math.sign(th.ty - th.y) * 0.05;
    th.vx *= 0.95; th.vy *= 0.93; th.x = clamp(th.x + th.vx, 30, LW - 30); th.y = clamp(th.y + th.vy, 18, 120);
    if (th.pullT > 0) th.pullT--; else if (Math.random() < 0.012 + d.K.pull * 0.01) th.pullT = Math.round(rand(30, 60));
  } else { th.y += 0.8; th.x += Math.sin(d.t / 9) * 0.8 + 0.5; }
  // the strings: where they cross, someone is sawing
  const X = !me.cut && !th.cut && cross(hand, me, other, th);
  if (X) {
    const above = me.y < th.y ? 1.5 : 0.7, mine = pull ? 1 * above : 0, theirs = th.pullT > 0 ? d.K.pull * (me.y < th.y ? 0.8 : 1.4) : 0;
    d.saw += (mine - theirs) * 1.2;
    if (frameNo % 6 === 0) fx.push({ kind: "dot", x: X.x + cam, y: X.y, vx: rand(-1, 1), vy: rand(-1, 0), c: "#f7f4ee", t: 14 });
    if (d.saw >= 60) { th.cut = true; d.score[0]++; progress.kitesCut = (progress.kitesCut || 0) + 1; texts.push({ x: X.x + cam, y: X.y + 10, s: "Woh kaata!", t: 90 }); Arcade.tone(990, 0.12, "triangle", 0.05); round(); }
    else if (d.saw <= -60) { me.cut = true; d.score[1]++; texts.push({ x: X.x + cam, y: X.y + 10, s: "Cut! Your kite drifts off", t: 90 }); Arcade.tone(220, 0.2, "sawtooth", 0.04, -80); round(); }
  } else d.saw *= 0.98;
  if (me.cut || th.cut) return;
  // a kite that sits on the roof has lost the round; and a round that drags on goes to the higher kite
  d.ground = me.y >= 117 ? (d.ground || 0) + 1 : 0; d.roundT = (d.roundT || 0) + 1;
  if (d.ground > 180 || d.roundT > 2400) {
    const iWin = d.ground <= 180 && me.y < th.y; (iWin ? th : me).cut = true; d.score[iWin ? 0 : 1]++;
    texts.push({ x: (iWin ? th : me).x + cam, y: 60, s: d.ground > 180 ? "Your kite's on the roof!" : "Time! The higher kite takes it", t: 90 }); round();
  }
}
function round() {
  const d = kiteDuel; d.saw = 0; d.pause = 100; d.ground = 0; d.roundT = 0;
  if (d.score[0] < 2 && d.score[1] < 2) return;
  const won = d.score[0] >= 2; kiteDuel = null; progress.kiteDay = progress.clock.day;
  if (won) {
    progress.kites = d.n + 1; earn(120 * (d.n + 1)); changeRespect(3, "chandni");
    if (progress.kites >= KITE_RIVALS.length) {
      progress.flags.manjha = true; players[0].weapon = { kind: "manjha", uses: 20 };
      say([{ who: "pappu", text: "Cut by my own manjha. My uncle will laugh at me for a year." }, { who: "pappu", text: "Take a reel. Glass-coated, fine as hair and twice as mean. Swing it and they'll wish they'd stayed home. (Manjha: it lashes like a lathi.)" }]);
    } else say([{ who: "pappu", text: "Two cuts! " + d.K.name + " is going home with a bare reel. Next: " + KITE_RIVALS[d.n + 1].name + ", tomorrow." }]);
  } else say([{ who: "pappu", text: "They cut you twice. Fly higher before you cross, and pull when they're slack. Tomorrow." }]);
  saveGame(true);
}
// where the segment a-b crosses c-d, if it does (screen coordinates)
function cross(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y }, den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  return t > 0.05 && t < 0.98 && u > 0.05 && u < 0.98 ? { x: a.x + r.x * t, y: a.y + r.y * t } : null;
}
function drawKites() {
  const d = kiteDuel; if (!d) return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const hand = { x: d.px - cam + 6, y: d.py - 38 }, other = { x: LW + 20, y: 140 };
  const kite = (k, col, from) => {
    g.strokeStyle = "rgba(250,244,230,0.85)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(from.x, from.y); g.quadraticCurveTo((from.x + k.x) / 2, (from.y + k.y) / 2 + (k.cut ? 0 : 12), k.x, k.y + 6); g.stroke();
    // a patang: a diamond of paper on a bamboo cross, with a tail
    g.fillStyle = col; g.beginPath(); g.moveTo(k.x, k.y - 11); g.lineTo(k.x + 10, k.y); g.lineTo(k.x, k.y + 11); g.lineTo(k.x - 10, k.y); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,0.28)"; g.beginPath(); g.moveTo(k.x, k.y - 11); g.lineTo(k.x + 10, k.y); g.lineTo(k.x, k.y); g.closePath(); g.fill();
    g.strokeStyle = "rgba(20,16,12,0.75)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(k.x, k.y - 11); g.lineTo(k.x + 10, k.y); g.lineTo(k.x, k.y + 11); g.lineTo(k.x - 10, k.y); g.closePath(); g.stroke();
    R(k.x - 0.5, k.y - 11, 1, 22, "rgba(60,40,20,0.7)"); g.strokeStyle = "rgba(60,40,20,0.7)"; g.beginPath(); g.moveTo(k.x - 10, k.y); g.quadraticCurveTo(k.x, k.y - 5, k.x + 10, k.y); g.stroke();
    for (let i = 0; i < 5; i++) R(k.x - 1.5 + Math.sin(frameNo / 6 + i) * 2.5, k.y + 12 + i * 3.5, 3, 3, i % 2 ? "#f7f4ee" : col);   // the tail
  };
  if (d.them.y < 240) kite(d.them, d.K.col, d.them.cut ? { x: d.them.x + 30, y: d.them.y + 40 } : other);
  if (d.me.y < 240) kite(d.me, "#f07ab8", d.me.cut ? { x: d.me.x - 30, y: d.me.y + 40 } : hand);
  // the score and the saw meter
  const line = "YOU " + d.score[0] + " - " + d.score[1] + " " + d.K.name.toUpperCase();
  g.font = "bold 7px 'IBM Plex Mono', monospace"; const w = g.measureText(line).width + 14;
  R(LW / 2 - w / 2, 40, w, 13, "rgba(14,13,12,0.78)"); text(line, LW / 2, 49, 7, "#f7f4ee");
  R(LW / 2 - 40, 56, 80, 4, "rgba(14,13,12,0.6)"); R(LW / 2, 56, clamp(d.saw, -60, 60) / 60 * 40, 4, d.saw >= 0 ? "#5cc8c0" : "#c0392b");
}

/* ---------- S7: the kushti ladder ---------- */
// ten bouts; the kinds are made here so each opponent has his own name on the health bar
const KUSHTI = [
  { id: "k1", name: "Chhote Pehelwan", look: "wrestler", hp: 46, scale: 0.94, line: "Chhote. Sixteen, all elbows. Go easy. Not too easy." },
  { id: "k2", name: "Lallu of the Mandi", look: "porter", hp: 58, line: "Lallu carries sacks all day. He'll carry you out of the pit too, if you let him." },
  { id: "k3", name: "Bhim Singh", look: "wrestler", hp: 70, scale: 1.04, line: "Bhim Singh trains on buffalo milk and bad temper." },
  { id: "k4", name: "Kalu Pehelwan", look: "bruiser", hp: 82, line: "Kalu once threw a man into the river. The man was his brother. They're still not talking." },
  { id: "k5", name: "The Ghat Wanderer", look: "kicker", hp: 90, speed: 1.05, line: "A visitor from the Akhada on the Varanasi ghats. He fights barefoot and smiles the whole time." },
  { id: "k6", name: "Sher Khan", look: "bruiser", hp: 100, scale: 1.08, specials: ["charge"], line: "Sher Khan charges like a bus with no brakes. Step aside." },
  { id: "k7", name: "Iron Ramu", look: "wrestler", hp: 112, scale: 1.06, sturdy: 3, line: "Ramu works the foundry. Hit him and you'll feel it more than he does." },
  { id: "k8", name: "The Mountain Monk", look: "pipeBare", hp: 118, speed: 1.1, line: "Another Akhada visitor, down from a Himalayan monastery. Very calm. Very, very fast." },
  { id: "k9", kind: "tola", line: "Tola. He asked for a rematch. Bhola said yes before I could say no." },
  { id: "k10", kind: "ox", line: "Me. Last bout. I won't go easy, and if you go easy on me, I'll never forgive you." }];
for (const k of KUSHTI) if (!k.kind) {
  KINDS["kushti_" + k.id] = { hp: k.hp, speed: k.speed || 0.9, scale: k.scale || 1, look: k.look, name: k.name, score: 300, windup: 14, cool: [40, 75], moves: ["ePunch", "heavy", "eKick"], specials: k.specials, sturdy: k.sturdy, cash: 0 };
  SHEET_OF["kushti_" + k.id] = SHEET_OF[k.look] || k.look;
}
let kushtiBout = null;
function kushtiTarget(p) {
  const n = progress.kushti || 0, K = KUSHTI[n];
  if (street.id !== "akhada" || Math.abs(p.x - 186) > 24 || mission || arena || !clockRuns() || !progress.done.includes("2-2")) return null;
  if (!K) return { label: "The kushti ladder: champion", x: 186, y: Y0 - 44, act: () => say([{ who: "ox", text: "Ten bouts. Ten wins. Your name goes on the wall under my teacher's. Don't let it go to your head; it's a small wall." }]) };
  if (progress.kushtiDay === progress.clock.day) return { label: "Kushti: one bout a day. Rest", x: 186, y: Y0 - 44, act: () => {} };
  const kind = K.kind || "kushti_" + K.id;
  return { label: "Kushti ladder, bout " + (n + 1) + " of 10: " + KINDS[kind].name, x: 186, y: Y0 - 44, act: () => {
    say([{ who: "ox", text: K.line }], () => { kushtiBout = { n, a: { x: 192, name: "Bout " + (n + 1) + ": " + KINDS[kind].name, waves: [[kind]] } }; startArena(kushtiBout.a); });
  } };
}
function updateKushti() {
  if (!kushtiBout || !kushtiBout.a.done) return;
  const n = kushtiBout.n; kushtiBout = null; progress.kushti = n + 1; progress.kushtiDay = progress.clock.day;
  earn(80 * (n + 1)); changeRespect(3, "mandi");
  const lines = [{ who: "ox", text: pick(["Good. Now do it again tomorrow.", "Not bad. Your left foot was asleep. Wake it up.", "The pit doesn't lie. You won."]) }];
  if (n + 1 === 5) { raiseStat("strength"); lines.push({ who: "N", text: "Halfway up the ladder. Your arms have changed shape. (Strength +1)" }); }
  if (n + 1 === 10) { progress.flags.slam = true; lines.push({ who: "ox", text: "You beat me. In my own pit. Fine: here is my slam. Throw a man and plant him hard, and the floor itself knocks his friends over." }, { who: "N", text: "(Bhola's slam: a thrown goonda lands with a quake that knocks down everyone near.)" }); }
  say(lines); saveGame(true);
}
// Bhola's slam: a thrown body lands and the floor jumps (combat.js calls this on the landing)
function slamLanding(f) {
  if (!flag("slam") || f.st !== "thrown" || !f.thrownBy) return;
  shake = 7; Arcade.noise(0.25, 0.1); texts.push({ x: f.x, y: f.y - 60, s: "Bhola's slam!", t: 70 });
  for (const o of enemies) if (o !== f && !DOWN_STATES.includes(o.st) && o.team === "e" && Math.abs(o.x - f.x) < 60 && Math.abs(o.y - f.y) < 22) hurt(o, { x: f.x, face: Math.sign(o.x - f.x) || 1, team: "p", kind: f.kind, owner: f.thrownBy }, { dmg: 6, knock: true });
}

/* ---------- hooks ---------- */
function updateMinigames() { updateCricket(); updateKites(); updateKushti(); }
function minigameTarget(p) { return minigameOn() ? null : cricketTarget(p) || kiteTarget(p) || kushtiTarget(p); }
function drawMinigames(P) { drawCricket(P); }
function drawMinigamesHud() { drawScoreboard(); drawKites(); }
// the street cup on Nani's counter (wherever the dhaba is drawn)
function drawCup(P) {
  if (!flag("cup") || street.id !== "dhaba" || burnt()) return;
  const x = Math.round(150 - cam);
  R(x - 4, 104, 8, 3, "#5a3a24"); R(x - 3, 96, 6, 8, "#c9ced4"); R(x - 2, 97, 1, 6, "#f2f4f6"); R(x - 5, 97, 2, 4, "#c9ced4"); R(x + 3, 97, 2, 4, "#c9ced4");
}
