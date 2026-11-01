/* Rollback City: the beat (DESIGN 6, mission 2-6; 3.3 of the plan). A plain script that shares
   globals with the others; index.html loads them in order.

   The beat is the radio's own clock (radio.js counts sixteenth notes), so what you hear and what
   counts always agree. In a room with a beat (street.beat: Club 1987) the sound system plays
   Rewind FM whatever the dial says, the floor pulses, and any hit that lands on the beat does
   double damage, for both sides.

   The dance-off is a mission step: { dance: { street, x, notes, need } }. Arrows rise to a line in
   time with the music; press that direction as each one reaches it. Enough hits and the bouncer
   lets you in; fewer and he doesn't. Everyone stands and dances meanwhile. */
"use strict";

const beatPos = () => Math.max(0, radioStep - 1 + radioT) / 4;   // in beats; the kick falls on whole numbers
const beatWindow = () => (EASY ? 0.2 : 0.14);
function onBeat() {
  if (!street || !street.beat || !radioHere()) return false;
  const f = ((beatPos() % 1) + 1) % 1, w = beatWindow();
  return f < w || f > 1 - w;
}
// a hit's damage on the beat (hurt, combat.js): doubled, and said so for the player's hits
function beatMul(a, d) {
  if (!onBeat()) return 1;
  if (a.team === "p" || (a.owner && a.owner.team === "p")) texts.push({ x: d.x, y: d.y - 74, s: "On the beat!", t: 40 });
  return 2;
}

/* ---------- the dance-off ---------- */
const DANCE_DIRS = ["left", "down", "up", "right"];
const dancing = () => !!(mission && mission.st && mission.st.dance && !mission.st.dance.over);
function startDance(s) {
  const d = s.dance, b0 = Math.ceil(beatPos()) + 3, notes = [];
  for (let k = 0, b = b0; k < d.notes; k++) { notes.push({ beat: b, dir: pick(DANCE_DIRS) }); b += k > 5 && k % 3 === 2 ? 0.5 : 1; }
  mission.st.dance = { notes, need: d.need, hits: 0, misses: 0, last: null, lastT: 0, over: false };
  banner = { text: d.stunt ? "Action!" : "Dance-off!", t: 90, big: true };
}
// once a frame while dancing (from updateMission): judge presses and late notes; true when done
function updateDance() {
  const dn = mission.st.dance, pos = beatPos(), w = EASY ? 0.35 : 0.25;
  if (dn.lastT > 0) dn.lastT--;
  for (const p of alivePlayers()) for (const dir of DANCE_DIRS) if (tapped(p.pi, dir)) {
    const n = dn.notes.find((n) => !n.done && n.dir === dir && Math.abs(pos - n.beat) < w);
    if (n) { n.done = "hit"; dn.hits++; dn.last = Math.abs(pos - n.beat) < w / 2 ? "Perfect!" : "Good"; Arcade.tone(880 + DANCE_DIRS.indexOf(dir) * 110, 0.06, "triangle", 0.04); }
    else { dn.last = "Off the beat"; }
    dn.lastT = 30;
  }
  for (const n of dn.notes) if (!n.done && pos - n.beat > w) { n.done = "miss"; dn.misses++; dn.last = "Miss"; dn.lastT = 30; }
  if (dn.notes.every((n) => n.done)) { dn.over = true; return true; }
  return false;
}
// the dance-off on screen: four lanes, arrows rising to the line, the count so far
function drawDance() {
  if (!dancing()) return;
  const dn = mission.st.dance, pos = beatPos();
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const w = 120, x = LW - w - 18, top = 34, line = 64, lane = w / 4;   // off to the side, so the dancer stays in view
  R(x - 6, top - 10, w + 12, 150, "rgba(14,13,12,0.82)"); R(x - 6, top - 10, w + 12, 2, "#c96bd8");
  text((stuntOn() ? "TAKE 1: MARKS  " : "DANCE-OFF  ") + dn.hits + " / " + dn.need, x + w / 2, top - 1, 6, "#f7f4ee");
  const pulse = 1 - (((pos % 1) + 1) % 1);
  R(x, line - 1, w, 2, pulse > 0.8 ? "#ff6ad5" : "#c96bd8");
  const arrow = (cx, cy, dir, c) => {
    g.save(); g.translate(cx, cy); g.rotate({ left: Math.PI, down: Math.PI / 2, up: -Math.PI / 2, right: 0 }[dir]);
    g.fillStyle = c; g.beginPath(); g.moveTo(6, 0); g.lineTo(-1, -6); g.lineTo(-1, -2.5); g.lineTo(-6, -2.5); g.lineTo(-6, 2.5); g.lineTo(-1, 2.5); g.lineTo(-1, 6); g.closePath(); g.fill(); g.restore();
  };
  DANCE_DIRS.forEach((d, i) => arrow(x + lane * (i + 0.5), line, d, "rgba(255,255,255,0.25)"));
  for (const n of dn.notes) {
    if (n.done === "hit") continue;
    const y = line + (n.beat - pos) * 22; if (y < top + 4 || y > top + 136) continue;
    arrow(x + lane * (DANCE_DIRS.indexOf(n.dir) + 0.5), y, n.dir, n.done === "miss" ? "#6a6560" : ["#3d7bff", "#5cc8c0", "#f2c230", "#ff6ad5"][DANCE_DIRS.indexOf(n.dir)]);
  }
  if (dn.lastT > 0) text(dn.last, x + w / 2, line + 18, 7, dn.last === "Miss" || dn.last === "Off the beat" ? "#ff8a7a" : "#f2c230");
}
