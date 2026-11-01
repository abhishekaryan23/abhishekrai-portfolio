/* Rollback City: companions and informants (DESIGN 6.1, S1 Moti and S9 Chhotu; 3.9 of the plan).
   A plain script that shares globals with the others; index.html loads them in order.

   Moti is a stray with one floppy ear. Feed him a pav in five places, one a day; the fifth time the
   municipal dog squad turns up, and once you've seen them off he follows you everywhere: he waits
   outside any door you go through, barks a goonda off balance (and nips his ankles), and digs up
   what's buried. Chhotu, the peanut boy from the Marina, picks your pocket three times: chase him
   through the gali, the Mandi crowd and over the rooftops. Nobody catches him the first two times.
   Catch him the third, and he's your informant: Nani's letters and the 1987 polaroids go on your map.
   Nobody hits a child: you catch Chhotu by reaching him. */
"use strict";

/* ---------- polaroids from 1987: some buried (Moti finds them), some tucked away ---------- */
const POLAROIDS = [
  { id: "p1", street: "lane", x: 520, dig: true, text: "A polaroid, 1987: Nani at the dhaba counter, laughing at something just out of the picture. On the back: \"Diwali. The year the kettle exploded.\"" },
  { id: "p2", street: "ghat", x: 560, dig: true, text: "A polaroid, 1987: two boys on the ghat steps with a cricket bat taped in three places. On the back: \"R and the Mehta boy. R out first ball.\"" },
  { id: "p3", street: "kinara", x: 2300, dig: true, text: "A polaroid, 1987: the open-air screen at the Kinara, a crowd on the sea wall, the hero in mid-leap. On the back, in a stranger's hand: \"Sitara Studios, location unit.\"" },
  { id: "p4", street: "mandiRoad", x: 1200, dig: true, text: "A polaroid, 1987: a young pehelwan holding a trophy over his head, the Mandi behind him. On the back: \"Bhola, first title. Still owes me ten rupees.\"" },
  { id: "p5", street: "roofs", x: 1400, look: "Look under the water tank", text: "A polaroid, 1987: the lane from a rooftop at night, every window lit. A tripod's shadow lies across one corner of the frame." },
  { id: "p6", street: "docks", x: 1500, look: "Look in the old nets", text: "A polaroid, 1987: a fishing boat called Machhi Rani, and a girl of about twelve at the tiller, scowling. On the back: \"Mausi, aged 12. Already the boss.\"" },
  { id: "p7", street: "bunderRoad", x: 1100, look: "Look behind the timetable board", text: "A polaroid, 1987: Bunder Road station, the clock at 11:58. Someone has drawn a circle round it in biro." },
  { id: "p8", street: "gali", x: 900, look: "Look behind the loose brick", text: "A polaroid, 1987: paper lanterns strung along the gali's washing lines, and a dozen children asleep on one charpai. On the back: \"Nobody would go home.\"" }];
const gotPolaroid = (id) => (progress.polaroids || []).includes(id);
function takePolaroid(P0) {
  if (gotPolaroid(P0.id)) return;
  (progress.polaroids = progress.polaroids || []).push(P0.id);
  Arcade.tone(1175, 0.08, "triangle", 0.04); setTimeout(() => Arcade.tone(1568, 0.12, "triangle", 0.04), 90);
  say([{ who: "N", text: P0.text + "\n\n(" + progress.polaroids.length + " of " + POLAROIDS.length + " polaroids)" }]);
  saveGame(true);
}
// the tucked-away ones: a spot you can search, if you know where to look
function polaroidTarget(p) {
  const P0 = POLAROIDS.find((d) => d.look && d.street === street.id && !gotPolaroid(d.id) && Math.abs(d.x - p.x) < 20);
  return P0 && clockRuns() ? { label: P0.look, x: P0.x, y: Y0 - 48, act: () => takePolaroid(P0) } : null;
}

/* ---------- Moti ---------- */
const MOTI_SPOTS = [["lane", 760], ["mandiRoad", 900], ["bunderRoad", 600], ["kinara", 700], ["ghat", 400]];
const motiFollows = () => flag("moti");
let moti = null;   // the dog on this street: { dog, x, y, face, st, t }
// where the stray is today: the next place on his round, once a day, until he's yours
function motiStrayX() {
  const m = progress.moti || {}, k = m.fed || 0;
  if (motiFollows() || !clockRuns() || !progress.done.includes("2-1") || isNight()) return null;
  if (k >= MOTI_SPOTS.length) return MOTI_LAST[0] === street.id ? MOTI_LAST[1] : null;   // fed five times: he waits for you (and the squad) at the ghat
  if (m.day === progress.clock.day) return null;
  return MOTI_SPOTS[k][0] === street.id ? MOTI_SPOTS[k][1] : null;
}
// on every street: Moti at your heels (waiting outside while you're indoors), or the stray in his spot
function placeCompanions() {
  moti = null; kid = null;
  const ashore = !street.interior && !street.water && !["train", "trainroof", "ferry"].includes(street.theme);   // he waits on dry land
  if (ashore && motiFollows()) { const p = players[0]; moti = { dog: true, x: clamp(p.x - 30, 20, street.w - 20), y: clamp(p.y + 8, Y0, Y1), face: 1, st: "sit", t: 0, barkT: 120 }; }
  else { const x = motiStrayX(); if (x !== null) moti = { dog: true, stray: true, x, y: Y0 + 14, face: -1, st: "sit", t: 0 }; }
  placeKid();
}
function motiTarget(p) {
  if (!moti || !moti.stray || moti.st !== "sit" || mission || Math.abs(p.x - moti.x) > 26) return null;
  if ((progress.moti || {}).fed >= MOTI_SPOTS.length) return { label: "The stray, waiting for you", x: moti.x, y: moti.y - 40, act: () => startMission("s1-moti") };
  return { label: "Feed the stray a pav (" + rupees(10) + ")", x: moti.x, y: moti.y - 40, act: (q) => {
    if (money() < 10) { texts.push({ x: q.x, y: q.y - 70, s: "Not even ten rupees. He understands.", t: 80 }); return; }
    progress.money -= 10; const m = progress.moti = progress.moti || {}; m.fed = (m.fed || 0) + 1; m.day = progress.clock.day;
    moti.st = "eat"; moti.t = 150; moti.face = Math.sign(q.x - moti.x) || 1;
    texts.push({ x: moti.x, y: moti.y - 40, s: ["He wolfs it down and wags at you, one ear up.", "He remembers you. The tail says so.", "He eats it slowly this time, as if you'll stay.", "He follows you three steps, then thinks better of it.", "He sits on your foot and won't move."][m.fed - 1], t: 140 });
    Arcade.tone(660, 0.06, "triangle", 0.04);
  } };
}
// the dog squad, the fifth time: see them off and he's yours
const MOTI_LAST = MOTI_SPOTS[MOTI_SPOTS.length - 1];
MISSIONS["s1-moti"] = { side: true, title: "Moti", start: { street: MOTI_LAST[0], x: MOTI_LAST[1] }, reward: { respect: { chandni: 5 } }, flags: ["moti"],
  after: () => { if (moti) { moti.stray = false; moti.barkT = 120; } texts.push({ x: players[0].x, y: players[0].y - 74, s: "Moti is with you now", t: 120 }); }, steps: [
    { panels: [
      { who: "N", dark: 0.4, text: "A white van with MUNICIPAL DOG SQUAD painted on the side brakes hard. Two men climb out with a net and a long pole. \"Stray! Get it!\"" },
      { who: "N", dark: 0.4, text: "He doesn't run. He backs up against your legs, one ear up, and growls at them." }] },
    { fight: { street: MOTI_LAST[0], x: MOTI_LAST[1] + 20, name: "The dog squad", waves: [["catcher", "catcher"], ["catcher", "catcher", "catcher"]] }, obj: "Don't let them take him" },
    { panels: [{ who: "N", text: "The van leaves faster than it came. The dog sits down on your foot, which settles it. He's yours now, or you're his. Moti, then. The pearl." }] }] };
function updateMoti() {
  if (!moti) return;
  const m = moti;
  if (m.stray) {
    if (m.st === "eat" && --m.t <= 0) {
      if ((progress.moti || {}).fed >= MOTI_SPOTS.length) { m.st = "sit"; if (!mission) startMission("s1-moti"); }
      else { m.st = "run"; m.face = 1; const nx = MOTI_SPOTS[progress.moti.fed]; texts.push({ x: m.x, y: m.y - 40, s: "He trots off, towards " + WORLD.streets[nx[0]].name + ".", t: 120 }); }
    }
    if (m.st === "run") { m.x += m.face * 2.4; if (m.x < cam - 60 || m.x > cam + LW + 60) moti = null; }
    if (m.stray && moti && m.st === "sit" && mission && mission.id === "s1-moti") m.face = -1;
    return;
  }
  const lead = alivePlayers()[0]; if (!lead) return;
  // barking: a goonda squaring up near him staggers, and gets his ankles nipped
  if (m.barkT > 0) m.barkT--;
  const foe = m.barkT <= 0 && enemies.find((e) => e.team === "e" && !e.ally && !DOWN_STATES.includes(e.st) && (e.aggro || arena) && Math.abs(e.x - m.x) < 70 && Math.abs(e.y - m.y) < 22);
  if (foe) {
    m.st = "bark"; m.t = 30; m.face = Math.sign(foe.x - m.x) || 1; m.barkT = 360;
    texts.push({ x: m.x, y: m.y - 30, s: "Woof! Woof!", t: 50 }); Arcade.tone(260, 0.07, "square", 0.04, -60); setTimeout(() => Arcade.tone(240, 0.07, "square", 0.04, -60), 110);
    if (!KINDS[foe.kind].boss) { setState(foe, "hurt", 30); foe.hp = Math.max(1, foe.hp - 2); }
  }
  if (m.st === "bark" && --m.t > 0) return;
  // digging: near something buried, off he goes
  if (!m.found && !mission && !arena) {
    const d = POLAROIDS.find((d) => d.dig && d.street === street.id && !gotPolaroid(d.id) && Math.abs(d.x - m.x) < 170);
    if (d && !m.dig) { m.dig = d; m.t = 0; texts.push({ x: m.x, y: m.y - 30, s: "Moti's nose goes down. He's onto something.", t: 90 }); }
  }
  if (m.dig) {
    const dx = m.dig.x - m.x;
    if (Math.abs(dx) > 3) { m.x += Math.sign(dx) * 2.2; m.face = Math.sign(dx); m.st = "run"; m.ph = (m.ph || 0) + 0.3; return; }
    m.st = "dig"; if (frameNo % 9 === 0) dust(m.x + m.face * 6, m.y);
    if (++m.t > 150) { m.found = m.dig; m.dig = null; m.st = "sit"; texts.push({ x: m.x, y: m.y - 34, s: "He's dug something up!", t: 100 }); Arcade.tone(880, 0.06, "triangle", 0.04); }
    return;
  }
  // a find: he sits by it, tail going, and barks now and then till you come and look
  if (m.found) { m.st = "sit"; if (frameNo % 150 === 0 && Math.abs(lead.x - m.x) > 60) texts.push({ x: m.x, y: m.y - 30, s: "Woof!", t: 40 }); return; }
  // at your heels: a little behind whoever leads, sitting when you stop
  const tx = lead.x - lead.face * 28, ty = clamp(lead.y + 8, Y0, Y1), dx = tx - m.x, dy = ty - m.y;
  if (Math.abs(dx) > 14 || Math.abs(dy) > 8) {
    const sp = Math.min(3.2, Math.max(1.2, Math.abs(dx) * 0.06));
    m.x += Math.sign(dx) * Math.min(sp, Math.abs(dx)); m.y += Math.sign(dy) * Math.min(1.2, Math.abs(dy)); m.face = Math.sign(dx) || m.face; m.st = "run"; m.ph = (m.ph || 0) + 0.3;
  } else { m.st = "sit"; m.face = lead.x > m.x ? 1 : -1; }
}
function motiFindTarget(p) {
  const f = moti && moti.found; if (!f || Math.abs(p.x - moti.x) > 24) return null;
  return { label: "See what Moti dug up", x: moti.x, y: moti.y - 36, act: () => { moti.found = null; takePolaroid(f); } };
}
function drawMoti(m) {
  const x = Math.round(m.x - cam), y = Math.round(m.y);
  g.fillStyle = "rgba(0,0,0,0.22)"; g.beginPath(); g.ellipse(x, y, 10, 2.5, 0, 0, 7); g.fill();
  const run = m.st === "run" ? (Math.floor((m.ph || 0) / 1.2) % 2 ? "moti_run2" : "moti_run1") : null;
  const name = run || (m.st === "bark" ? "moti_bark" : m.st === "dig" ? "moti_dig" : m.st === "eat" ? "moti_dig" : "moti_sit");
  if (sprAt(name, x, y + 1, m.face < 0, 1)) return;
  // until the art loads: a tan dog shape
  R(x - 8, y - 9, 16, 6, "#c08a4a"); R(x + m.face * 7 - 3, y - 13, 6, 6, "#c08a4a"); R(x - 7, y - 3, 2, 3, "#f0e6d2"); R(x + 5, y - 3, 2, 3, "#f0e6d2");
}

/* ---------- Chhotu ---------- */
const CHASES = [
  { street: "gali", from: 380, to: 1540, escape: true, after: "At the end of the gali he's over a wall like a cat. Your fifty rupees are on the wall, weighed down with a peanut shell and a note: FASTER, BHAIYA." },
  { street: "mandiRoad", from: 500, to: 2120, escape: true, after: "He's gone into the rush-hour crowd. A minute later a peanut seller hands you your fifty rupees. \"From the boy. He says you're getting better.\"" },
  { street: "roofs", from: 720, to: 2120, escape: false }];
let kid = null;   // Chhotu on this street: waiting to bump into you, or your informant at the Marina
const chhotuN = () => progress.chhotuN || 0;
function placeKid() {
  if (street.interior || !clockRuns()) return;
  if (flag("informant")) { if (street.id === "kinara") kid = { kid: true, x: 820, y: Y0 + 12, face: -1, st: "stand" }; return; }
  const c = CHASES[chhotuN()];
  if (!c || !progress.done.includes("2-8") || progress.chhotuDay === progress.clock.day || isNight() || c.street !== street.id) return;
  kid = { kid: true, lurk: true, x: c.from, y: Y0 + 14, face: -1, st: "stand" };
}
// the bump: he comes up to say sorry, and your money goes with him
function updateKid() {
  if (!kid || !kid.lurk || mission || arena) return;
  const p = alivePlayers().find((q) => Math.abs(q.x - kid.x) < 34 && Math.abs(q.y - kid.y) < 24); if (!p) return;
  const took = Math.min(50, money()); progress.money -= took; kid.took = took;
  texts.push({ x: kid.x, y: kid.y - 50, s: pick(["Sorry, bhaiya! Sorry!", "Oops! Wrong pocket!", "Arre, so sorry, didi!"]), t: 80 });
  kid.lurk = false; startMission("s9-chhotu");
}
const CHASE_SAY = ["Too slow!", "Catch me, catch me!", "My nani runs faster!", "Peanuts! Fresh peanuts!", "Bye-bye!"];
// one chase: { catch: { street, x (the far end), escape } }
function updateCatch(s, st) {
  const c = s.catch, ap = alivePlayers();
  if (street.id !== c.street) { failMission(c.escape ? "You lost him" : "He got away over the rooftops"); return false; }
  if (!st.k) { st.k = kid && !kid.lurk ? kid : { kid: true, x: c.from, y: Y0 + 14, face: 1, st: "run" }; kid = st.k; st.k.st = "run"; st.k.face = Math.sign(c.x - c.from); st.k.burst = 0; st.k.ty = st.k.y; }
  const k = st.k, near = ap.reduce((b, p) => (!b || Math.abs(p.x - k.x) < Math.abs(b.x - k.x) ? p : b), null); if (!near) return false;
  const d = Math.abs(near.x - k.x), dir = k.face;
  // he paces himself: waits for you when you're far behind, sprints when you're close, then tires
  let sp = d > 170 ? 1.2 : 2.15;
  if (d < 50 && k.burst <= 0 && !k.tired) k.burst = 80;
  if (k.burst > 0) { sp = 2.75; if (--k.burst === 0) k.tired = 100; }
  else if (k.tired > 0) { sp = 1.9; k.tired--; }
  k.x += dir * sp; k.ph = (k.ph || 0) + sp * 0.12;
  if (frameNo % 70 === 0) k.ty = rand(Y0 + 4, Y1 - 4);   // weaving through the crowd
  k.y += Math.sign(k.ty - k.y) * Math.min(1, Math.abs(k.ty - k.y));
  // over the gaps between the roofs
  const gap = (street.gaps || []).find(([a, b]) => k.x > a - 6 && k.x < b + 6);
  k.z = gap ? Math.sin((k.x - gap[0] + 6) / (gap[1] - gap[0] + 12) * Math.PI) * 34 : 0;
  if (frameNo % 150 === 0 && d > 60) texts.push({ x: k.x, y: k.y - 46, s: pick(CHASE_SAY), t: 60 });
  const level = (near.x - k.x) * dir > -12;   // drawn level with him, or past
  if (level && Math.abs(near.y - k.y) < 16 && !k.z && !c.escape) { k.st = "stand"; return true; }   // caught
  if (level && !k.hop) { k.hop = 30; k.x = near.x + dir * 34; k.burst = 60; k.tired = 0; texts.push({ x: k.x, y: k.y - 46, s: pick(["Missed me!", "Too slow!", "Hee hee!"]), t: 60 }); }   // under your arm and away
  if (k.hop > 0) k.hop--;
  if ((k.x - c.x) * dir >= 0) {
    if (!c.escape) { progress.chhotuDay = progress.clock.day; failMission("He got away. He'll be back tomorrow"); return false; }
    if (d > 260) { failMission("You lost him"); return false; }
    kid = null; return true;   // gone, but you kept up
  }
  return false;
}
MISSIONS["s9-chhotu"] = { side: true, title: "Chhotu", start: { street: "gali", x: 380 }, make: () => {
  const n = chhotuN(), c = CHASES[n] || CHASES[2];
  const steps = [{ catch: { street: c.street, x: c.to, from: kid ? kid.x : c.from, escape: c.escape }, obj: c.escape ? "After him! Keep up with Chhotu" : "Catch Chhotu" }];
  const back = () => { earn(kid && kid.took || 50); progress.chhotuN = n + 1; progress.chhotuDay = progress.clock.day; };
  if (c.escape) steps.push({ panels: [{ who: "N", text: c.after }], then: back });
  else steps.push({ panels: [
    { who: "chhotu", text: "Okay! Okay! You win. Nobody catches Chhotu. Not even Godbole's whistle." },
    { who: "chhotu", text: "Here, your fifty. I sell peanuts, I hear things, I see things. Where your Nani's old letters are. Where the old photos are buried." },
    { who: "chhotu", text: "Give me your map. I'll mark it. Partners? I'm at the Marina most days. Chhotu doesn't do credit, but for you, a discount." }],
    then: () => { back(); progress.flags.informant = true; kid = null; } });
  return steps; } };
WORLD.streets.kinara.talk = (WORLD.streets.kinara.talk || []).concat({ x: 820, label: "Talk to Chhotu", who: "chhotu", when: () => flag("informant"), lines: [
  "Kaal's men are buying kerosene by the drum at the docks. Nobody fries that much fish.",
  "Your map's marked. Letters with an envelope, photos with a square. Don't say Chhotu never gave you anything.",
  "Godbole bought peanuts from me today. He paid. Strange man.",
  "The Saanp have a new bike. Stolen, obviously. Everything they ride is stolen.",
  "Rani at Lakhan's garage? Don't let her drive you anywhere if you love your life."] });
function drawKid(k) {
  const x = Math.round(k.x - cam), y = Math.round(k.y);
  g.fillStyle = "rgba(0,0,0,0.22)"; g.beginPath(); g.ellipse(x, y, 7, 2, 0, 0, 7); g.fill();
  const name = k.st === "run" ? (Math.floor(k.ph || 0) % 2 ? "chhotu_run2" : "chhotu_run1") : "chhotu_stand";
  if (sprAt(name, x, y + 1 - (k.z || 0), k.face < 0, 1)) return;
  R(x - 4, y - 26 - (k.z || 0), 8, 8, "#a8704a"); R(x - 5, y - 18 - (k.z || 0), 10, 10, "#3d7bff"); R(x - 4, y - 8 - (k.z || 0), 8, 8, "#b8a070");
}

/* ---------- once a frame, the drawing list and the map ---------- */
function updateCompanions() { updateMoti(); updateKid(); }
const companions = () => [moti, kid].filter(Boolean);
function companionTarget(p) { return motiTarget(p) || motiFindTarget(p) || polaroidTarget(p) || minigameTarget(p) || sideTarget(p) || act3Target(p) || side2Target(p) || livingTarget(p) || galleryTarget(p); }
// Chhotu's marks: an envelope for each letter still in its barrel, a square for each polaroid not found
function mapFinds(m, along) {
  if (!flag("informant")) return;
  const at = (id, x) => { const s = WORLD.streets[id], s2 = mapStreet(s); return s2 && s2.map ? along(s2, s2 === s ? x : s2.w / 2) : null; };
  const got = lettersFound();
  for (const id in WORLD.streets) {
    const L = WORLD.streets[id].letter; if (!L || got.includes(L[0])) continue;
    const p = at(id, L[1]); if (!p) continue;
    m.fillStyle = "#f7f1e3"; m.strokeStyle = "#7a2230"; m.lineWidth = 1.2; m.fillRect(p[0] - 5, p[1] - 12, 10, 7); m.strokeRect(p[0] - 5, p[1] - 12, 10, 7);
    m.beginPath(); m.moveTo(p[0] - 5, p[1] - 12); m.lineTo(p[0], p[1] - 8); m.lineTo(p[0] + 5, p[1] - 12); m.stroke();
  }
  for (const d of POLAROIDS) {
    if (gotPolaroid(d.id)) continue;
    const p = at(d.street, d.x); if (!p) continue;
    m.fillStyle = "#fbf8f2"; m.fillRect(p[0] - 4, p[1] + 4, 8, 9); m.fillStyle = d.dig ? "#8a5a2a" : "#2a2622"; m.fillRect(p[0] - 3, p[1] + 5, 6, 5); m.strokeStyle = "#2a2622"; m.lineWidth = 0.8; m.strokeRect(p[0] - 4, p[1] + 4, 8, 9);
  }
}

// the art: Moti and Chhotu (small, so loaded with the rest at the start)
art(["moti_sit", "moti_run1", "moti_run2", "moti_bark", "moti_dig", "chhotu_stand", "chhotu_run1", "chhotu_run2"]);
