/* Rollback City: the Second Fire (DESIGN 6, 2-9; 3.7 of the plan). A plain script that shares
   globals with the others; index.html loads them in order.

   At 11:58, in the blackout, Kaal's men set Chandni Lane alight. A mission step, { rescue }, has
   people trapped behind burning shutters: carry each one out (slowly, unable to fight; a knock
   drops them back into the smoke) to the pump at the safe end. The floor burns in patches, smoke
   hides whoever is in it, and arsonists with torches keep coming.

   After the fire the lane stays burnt (flag "fire", until "rebuilt" in Act 3): charred fronts,
   the shops shut, smoke still rising. Nani lies in Dr. Mehta's clinic, and the hub (the bed, the
   Lane Committee board, the fighter swap, the save point) moves to Bhola's akhada. */
"use strict";

const burnt = () => flag("fire") && !flag("rebuilt");
const hubHere = (s) => (burnt() ? s.id === "akhada" : s.id === "dhaba");

/* ---------- the rescue ---------- */
const FIRE_FLOOR = [1330, 1450, 1578, 1706, 1834];   // burning patches between the shop doors
function rescueTarget(p) {
  const s = mission && mission.def.steps[mission.i], st = mission && mission.st;
  if (!s || !s.rescue || s.rescue.street !== street.id || !st.people) return null;
  const R0 = s.rescue, back = p.y < Y0 + 26;
  if (p.carry != null && Math.abs(p.x - R0.safe) < 70) return { label: "Set them down at the clinic steps", x: R0.safe, y: Y0 - 50, act: (q) => {
    st.people[q.carry] = "safe"; q.carry = null; st.saved++; freed(R0.safe + rand(-40, 40))();
    texts.push({ x: q.x, y: q.y - 74, s: st.saved + " of " + R0.doors.length + " out", t: 80 }); Arcade.tone(880, 0.1, "triangle", 0.04);
  } };
  if (p.carry != null || !back) return null;
  const k = R0.doors.findIndex((x, k) => st.people[k] === "inside" && Math.abs(p.x - x) < 22);
  if (k < 0) return null;
  return { label: "Carry them out", x: R0.doors[k], y: Y0 - 50, act: (q) => { q.carry = k; st.people[k] = "carried"; texts.push({ x: q.x, y: q.y - 74, s: pick(["Hold on to me!", "I've got you. Don't breathe."]), t: 70 }); } };
}
function updateRescue(s, st) {
  const R0 = s.rescue;
  if (!st.people) { st.people = R0.doors.map(() => "inside"); st.saved = 0; st.arsonT = 120; for (const p of players) if (p) p.carry = null; }
  blackT = Math.max(blackT, 2);   // the minute that won't end: the lights stay out and the clock stays at 11:58
  if (street.id !== R0.street) { for (const p of players) if (p && p.carry != null) { st.people[p.carry] = "inside"; p.carry = null; } return false; }
  // a carrier knocked over drops them, and they stagger back into the smoke
  for (const p of alivePlayers()) if (p.carry != null && (DOWN_STATES.includes(p.st) || p.st === "hurt")) { st.people[p.carry] = "inside"; p.carry = null; texts.push({ x: p.x, y: p.y - 70, s: "They're back in the smoke!", t: 80 }); }
  // the floor burns in patches
  for (const p of alivePlayers()) if (p.z < 2 && frameNo % 20 === 0 && FIRE_FLOOR.some((fx) => Math.abs(p.x - fx) < 14 && p.y > 172 && p.y < 194)) { damage(p, 2, p); p.flash = 6; texts.push({ x: p.x, y: p.y - 60, s: "Hot!", t: 30 }); }
  // arsonists keep coming, a few at a time
  if (--st.arsonT <= 0 && enemies.filter((e) => !DOWN_STATES.includes(e.st) && !e.ally).length < 3) {
    st.arsonT = Math.round(rand(300, 480)); const x = offscreenX(30);
    if (x !== null) { const e = fighter("arsonist", x, rand(Y0 + 8, Y1 - 4), "e"); Object.assign(e, { aggro: true, roam: true, engaged: true, cool: 40 }); enemies.push(e); fighterArt(SHEET_OF.arsonist); }
  }
  return st.saved >= R0.doors.length;
}
// a carried person: across the shoulders, so the carrier is slow and cannot fight
const carrying = (p) => p.carry != null;
function drawCarried(f, x, y) {
  if (!carrying(f)) return;
  const im = SPRITES.c_civ_a; if (!im) { R(x - 10, y - 50, 20, 6, "#efe6d2"); return; }
  const [sx, sy, w, h] = FIGHTER_FRAMES.civ_a[0];
  g.save(); g.translate(x, y - 48 - f.z); g.rotate(f.face * Math.PI / 2); g.drawImage(im, sx, sy, w, h, -w / 4, -h / 4, w / 2, h / 2); g.restore();
}

/* ---------- fire, smoke and embers ---------- */
function onFire() { const s = mission && mission.def.steps[mission.i]; return !!(s && s.rescue && s.rescue.street === street.id) || (mission && mission.id === "2-9" && street.id === "lane"); }
// one tongue of flame: three layers (deep red, orange, a yellow heart), swaying at the tip
function tongue(x, base, h, w, sway) {
  for (const [k, c] of [[1, "#b8321e"], [0.72, "#ff6a1a"], [0.42, "#ffd23a"]]) {
    const hw = w * k / 2, th = h * (0.55 + 0.45 * k), tx = x + sway * k;
    g.fillStyle = c; g.beginPath(); g.moveTo(x - hw, base);
    g.bezierCurveTo(x - hw * 1.1, base - th * 0.45, tx - hw * 0.4, base - th * 0.7, tx, base - th);
    g.bezierCurveTo(tx + hw * 0.4, base - th * 0.7, x + hw * 1.1, base - th * 0.45, x + hw, base); g.fill();
  }
}
const flick = (i, sp) => Math.sin(frameNo / sp + i * 2.3) * 0.5 + Math.sin(frameNo / (sp * 0.37) + i * 5.1) * 0.5;   // a ragged flicker, never a smooth pulse
// the shop fronts burning: windows lit from inside, fire through the shutters and licking up the walls
function drawFlames(P) {
  if (!onFire()) return;
  for (let i = 9; i <= 14; i++) {
    const x = Math.round(i * 128 - cam); if (x < -140 || x > LW + 20) continue;
    g.globalAlpha = 0.5 + 0.2 * flick(i, 6); R(x + 10, 104, 74, 40, "#ff7a1a"); R(x + 14, 112, 66, 28, "#ffc23a"); g.globalAlpha = 1;   // the shop, ablaze inside
    for (let k = 0; k < 5; k++) { g.globalAlpha = 0.45 + 0.35 * flick(i * 5 + k, 5); R(x + 8 + k * 24, 34 + ((i + k) % 3) * 9, 10 + (k % 2) * 6, 18, "#ff8a2a"); }   // upstairs windows
    g.globalAlpha = 1;
    for (let k = 0; k < 7; k++) {
      const fx = x + 14 + k * 11, h = 22 + ((i * 7 + k * 3) % 5) * 5 + flick(i * 7 + k, 4) * 7;
      tongue(fx, 146, h, 12 + (k % 3) * 3, flick(i * 3 + k, 9) * 4);
    }
    if (i % 2) tongue(x + 106, 104, 26 + flick(i, 5) * 6, 14, flick(i + 1, 8) * 3);   // out of the doorway's top
  }
  for (const fx of FIRE_FLOOR) {
    const x = Math.round(fx - cam); if (x < -30 || x > LW + 30) continue;
    g.globalAlpha = 0.28 + 0.1 * flick(fx, 5); g.fillStyle = "#ff8a2a"; g.beginPath(); g.ellipse(x, 186, 22, 6, 0, 0, 7); g.fill(); g.globalAlpha = 1;   // the glow on the road
    for (let k = 0; k < 4; k++) tongue(x - 9 + k * 6, 188, 10 + ((k * 5 + fx) % 4) * 2 + flick(fx + k, 3.5) * 3, 7, flick(fx * 2 + k, 7) * 2);
  }
}
// smoke drifting across the band, over everyone (it hides goondas), and rising embers
function drawSmoke() {
  if (!onFire()) return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  for (let i = 0; i < 9; i++) {
    const x = ((i * 137 + frameNo * (0.3 + i * 0.05) - cam * 0.2) % (LW + 160)) - 80, y = 90 + (i % 4) * 28 + Math.sin(frameNo / 60 + i) * 6;
    g.globalAlpha = 0.22; g.fillStyle = "#2a2622"; g.beginPath(); g.ellipse(x, y, 60, 22, 0, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 14; i++) { const ex = ((i * 53 + frameNo * 0.7) % LW), ey = LH - ((frameNo * (0.8 + (i % 3) * 0.3) + i * 31) % LH); R(ex, ey, 1, 1, i % 2 ? "#ffb04a" : "#ff6a1a"); }
  g.globalAlpha = 0.08 + 0.04 * Math.sin(frameNo / 7); g.fillStyle = "#ff6a1a"; g.fillRect(0, 0, LW, LH); g.globalAlpha = 1;   // the glow
}
// the lane after the fire: scorched fronts, smoke still rising from the ash
function drawBurnt(P, x, i) {
  if (!burnt() || street.id !== "lane" || onFire() || i * 128 + 104 < 1256 || i * 128 + 104 > 1898) return;   // the dhaba and the five shops past it
  g.globalAlpha = 0.55; R(x, 26, 128, 124, "#1d1813"); g.globalAlpha = 1;
  // burnt-out windows, each with a plume of soot licked up the wall above it
  for (let k = 0; k < 5; k++) {
    const wx = x + 8 + k * 24, wy = 30 + ((i + k) % 3) * 9, ww = 10 + (k % 2) * 6;
    g.globalAlpha = 0.6; g.fillStyle = "#0e0b09"; g.beginPath(); g.moveTo(wx - 1, wy + 2); g.quadraticCurveTo(wx + ww / 2, wy - 26, wx + ww + 1, wy + 2); g.fill(); g.globalAlpha = 1;
    R(wx, wy, ww, 22 + (k % 3) * 8, "#0e0b09"); R(wx + 2, wy + 6, 1, 10, "#3a2c22");   // a charred frame bar
  }
  g.globalAlpha = 0.7; g.fillStyle = "#0e0b09"; g.beginPath(); g.moveTo(x + 8, 106); g.quadraticCurveTo(x + 47, 60, x + 86, 106); g.fill(); g.globalAlpha = 1;   // soot over the shopfront
  R(x + 10, 104, 74, 40, "#2a2420"); for (let yy = 106; yy < 144; yy += 3) R(x + 10, yy, 74, 1, "#1a1512");   // shutters, blackened
  const wisp = (frameNo / 3 + i * 40) % 80; g.globalAlpha = Math.max(0, 0.35 - wisp / 240); g.fillStyle = "#6a6560"; g.beginPath(); g.ellipse(x + 64 + Math.sin(frameNo / 30 + i) * 6, 26 - wisp, 10 + wisp / 6, 6, 0, 0, 7); g.fill(); g.globalAlpha = 1;
}

/* ---------- after the fire: the hub at the akhada, Nani in the clinic ---------- */
// the bed, the Lane Committee board, the fighter swap and the save point live wherever the hub is
const HUB_AT = { dhaba: { bed: 28, swap: 150, board: 236 }, akhada: { bed: 24, swap: 140, board: 56 } }, HUB_TEXT = WORLD.streets.dhaba.board.text;
function placeHub() {
  for (const id in HUB_AT) {
    const s = WORLD.streets[id], on = hubHere(s), at = HUB_AT[id];
    s.savePoint = on; s.bed = on ? at.bed : 0; s.swap = on ? { x: at.swap } : null; s.board = on ? { x: at.board, text: HUB_TEXT } : null;
  }
}
// the akhada as home: a rope charpai by the wall and the committee board, rescued with soot on it
function drawAkhadaHub(P) {
  if (!hubHere(street) || street.id !== "akhada") return;
  const x0 = Math.round(-cam), wood = P.dark ? "#5a3a24" : "#8a5d3b";
  if (!sprAt("a_charpai", x0 + 30, 152, false, 1)) {
    R(x0 + 4, 136, 44, 4, wood); for (let k = 0; k < 9; k++) R(x0 + 7 + k * 4.5, 133, 2, 3, P.dark ? "#a89878" : "#d9c9a0");
    R(x0 + 6, 140, 3, 10, wood); R(x0 + 43, 140, 3, 10, wood); R(x0 + 8, 128, 12, 5, P.dark ? "#8a8278" : "#efe6d2");   // a rolled-up bedding
  }
  R(x0 + 32, 56, 48, 36, wood); R(x0 + 34, 58, 44, 32, P.dark ? "#7a5e40" : "#b8956a");
  g.globalAlpha = 0.45; R(x0 + 60, 58, 18, 14, "#1d1813"); R(x0 + 34, 80, 10, 10, "#1d1813"); g.globalAlpha = 1;   // scorched corners
  text("LANE COMMITTEE", x0 + 56, 66, 4, P.dark ? "#2a1e12" : "#3b2a18");
  for (const [px, py] of [[38, 70], [52, 72], [64, 70]]) { R(x0 + px, py, 10, 14, P.dark ? "#d8d0c0" : "#fbf8f2"); R(x0 + px + 4, py - 1, 2, 2, "#c0392b"); }
}
// Nani in Dr. Mehta's bed, a drip stand beside her, till the lane is rebuilt
function drawNaniInBed(P) {
  if (!burnt()) return;
  const x0 = Math.round(-cam);
  R(x0 + 126, 62, 2, 88, "#9aa3ab"); R(x0 + 120, 62, 14, 2, "#9aa3ab"); R(x0 + 121, 64, 6, 10, "rgba(220,235,240,0.85)"); R(x0 + 123, 74, 1, 40, "#c9d6dc");
  R(x0 + 36, 106, 10, 7, "#d9d4cc"); R(x0 + 33, 107, 5, 5, "#c9c2b8");   // grey hair in a bun, on the pillow
  R(x0 + 44, 107, 8, 7, "#a8704a"); R(x0 + 46, 109, 1, 1, "#3a2a1e"); R(x0 + 49, 109, 1, 1, "#3a2a1e");
  R(x0 + 50, 111, 66, 9, "#7a2230"); R(x0 + 50, 111, 66, 2, "#d9a441"); R(x0 + 70, 109, 30, 4, "#7a2230");   // her own shawl over the sheet
}
const NANI_BED = { x: 75, label: "Sit with Nani", who: "nani", when: () => burnt(), lines: [
  "They tell me I mustn't get up. Forty years I've got up at five. My knees don't know how to lie in.",
  "The dhaba will smell of smoke for a year. Good. Let people remember what they did.",
  "Ranjit carried me out. Don't make that face. I know what I know. Go and see him, if they let you.",
  "Eat something. Dr. Mehta's biscuits are terrible, but they're free, and you're thin.",
  "A wall is a wall. Bricks we can buy. The lane is the people, and the people are all out. Remember that."] };
(WORLD.streets.clinic.talk = WORLD.streets.clinic.talk || []).push(NANI_BED);
// a burnt-out door on the lane: nothing left inside
function ashTarget(p) {
  if (!burnt() || street.id !== "lane") return null;
  const d = street.doors.find((d) => d.burns && Math.abs(d.x - p.x) < 18);
  return d && { label: d.to === "dhaba" ? "The dhaba: shuttered, black, the sign hanging by one nail" : "Burnt out. Nothing left inside", x: d.x, y: Y0 - 52, act: () => {} };
}
for (const d of WORLD.streets.lane.doors) if (d.to === "dhaba" || d.shop) d.burns = true;

/* ---------- mission 2-9 ---------- */
function lightTheFire() {
  progress.clock.min = 23 * 60 + 58; progress.clock.frac = 0; blackT = BLACKOUT;
  banner = { text: "11:58. The lights go out", t: 140, big: true }; shake = 5; Arcade.noise(0.6, 0.08);
}
function afterFire() {
  blackT = 0; for (const p of players) if (p) { p.carry = null; if (p.lives > 0) { p.hp = p.max; } }
  progress.clock.day++; progress.clock.min = 7 * 60; progress.clock.frac = 0;
  travelTo("akhada", HUB_AT.akhada.swap);
  setTimeout(() => { banner = { text: "Bhola's Akhada: home, for now", t: 200, big: true }; message("Dr. Mehta: Nani is sleeping. Smoke in the lungs, a cracked wrist, and a temper. She'll mend. Come by the clinic."); saveGame(true); }, 900);
}
Object.assign(MISSIONS, {
  "2-9": { act: 2, title: "The Second Fire", needs: ["2-8"], hours: [21, 24], start: { street: "lane", x: 1216 }, reward: { respect: { chandni: 10 } }, flags: ["fire"], after: afterFire, steps: [
    { panels: [
      { who: "N", dark: 0.6, text: "11:57. The lane is asleep. Shutters down, the kettle cold, and somewhere a dog with an opinion." },
      { who: "chhotu", text: "Bhaiya! Didi! Kaal's men, at the back of the lane, with cans. Kerosene. I ran all the way from the Marina, I swear on my peanuts." },
      { who: "N", dark: 0.85, text: "11:58. The lights go out, the way they went out forty years ago. Then the lane is lit again: orange, and from the wrong end." }], then: lightTheFire },
    { rescue: { street: "lane", x: 1640, doors: [1386, 1514, 1642, 1770, 1898], safe: 1130 }, time: 60 * 240, timeFail: "The roofs came down with people still inside", checkpoint: true,
      obj: () => (players.some((p) => p && carrying(p)) ? "Get them to the clinic steps" : "Carry everyone out of the burning shops") },
    { fight: { street: "lane", x: 1256, name: "In the firelight", waves: [["arsonist", "arsonist"], ["arsonist", "kaal", "arsonist"]] }, obj: "Stop the men with the cans", checkpoint: true },
    { talk: { street: "lane", x: 1256, label: "Go in after Nani" }, obj: "Nani is still in the dhaba", panels: [
      { who: "N", dark: 0.7, text: "The doorway is a wall of heat. You get one step in before the smoke shoves you back out, coughing." },
      { who: "N", dark: 0.7, text: "A man walks past you into it. Grey hair, a charcoal jacket, a wet gamcha over his face. He doesn't stop." },
      { who: "N", dark: 0.8, text: "Ten long seconds. Then Ranjit comes out of the smoke with Nani over his shoulder, the way you carry someone who weighs nothing and everything." },
      { who: "nani", text: "Put me down, Ranjit. Put me down, I said. My slippers are still in there." },
      { who: "rollback", name: "Ranjit", text: "I'll buy you new ones." },
      { who: "N", dark: 0.5, text: "A siren, at last. Inspector Godbole is out of the jeep before it has stopped. He looks at Ranjit, at the fire, and at Ranjit again." },
      { who: "godbole", text: "1987, you were here. Tonight, here you are again. Twice in forty years? Not a coincidence." },
      { who: "rai", text: "He just carried her out of it! Kaal's men had the cans. We fought them off. Ask anyone on the lane!" },
      { who: "godbole", text: "I will ask everyone. At the thana. Pandu, the cuffs." },
      { who: "kai", text: "Nani needs Dr. Mehta, now. Rai. Help me lift her." },
      { who: "N", dark: 0.5, text: "By morning the lane is wet ash and black glass. The dhaba's sign hangs by one nail. Bhola sends word: the akhada has floor space, a kettle and a door that locks. Come." }] }
  ] }
});
