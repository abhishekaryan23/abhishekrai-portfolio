/* Rollback City: the 5 pm truce, disguises and eavesdropping (DESIGN 6, 2-8; 3.6 of the plan).
   A plain script that shares globals with the others; index.html loads them in order.

   At five every afternoon the whole city stops for chai, gangs included: till 5:40 nobody picks a
   fight, and jumping a goonda with a glass in his hand costs you respect. A clerk's disguise from
   the tailor keeps goondas from recognising you until you throw a punch. Mission steps can
   eavesdrop: { eavesdrop: { street, tables: [x...], lines: [...] } }. Stand still by a table to
   listen; when the men there look up, being close or moving fills a suspicion meter; fill it and
   you're spotted: the tables turn into a fight, and their notebook tells you the rest. */
"use strict";

const truce = () => clockRuns() && hour() === 17 && clockMin() % 60 < 40;
const disguised = () => !!progress.disguise;
// throwing a punch gives the game away
function dropDisguise() { if (!progress.disguise) return; progress.disguise = false; texts.push({ x: players[0].x, y: players[0].y - 74, s: "Disguise blown", t: 70 }); }

/* ---------- eavesdropping ---------- */
function startEavesdrop(s, st) {
  const ev = s.eavesdrop;
  st.ev = { listen: ev.tables.map(() => 0), heard: ev.tables.map(() => false), sus: 0, spotted: false, men: [] };
  for (const tx of ev.tables) for (const dx of [-14, 14]) { fighterArt("kaal"); const m = fighter("kaal", tx + dx * 1.3, Y0 + 9, "n"); m.face = dx < 0 ? 1 : -1; m.table = tx; setState(m, "sit"); npcs.push(m); st.ev.men.push(m); }
}
// once a frame (from updateMission); returns true when everything has been heard
function updateEavesdrop(s, st) {
  const ev = s.eavesdrop, E = st.ev, p = alivePlayers()[0];
  if (!p) return false;
  if (E.spotted) {
    // a fight: done when the men are down; their notebook has the rest
    if (E.men.every((m) => DOWN_STATES.includes(m.st) || m.gone || m.hp <= 0)) { if (!E.read) { E.read = true; say([{ who: "N", text: "On the table, under a saucer, a Kaal notebook: " + ev.lines.filter((l, k) => !E.heard[k]).join(" ") }]); } return true; }
    return false;
  }
  let near = false;
  ev.tables.forEach((tx, k) => {
    const alert = ((frameNo + k * 97) % 360) < 70, d = Math.abs(p.x - tx), moving = p.st === "walk" || p.st === "run", close = d < 34 && p.y < Y0 + 26;
    if (alert && (close || (d < 110 && moving))) E.sus += (moving ? 2.2 : close ? 0.9 : 0) * (disguised() ? 0.6 : 1);
    if (close) near = true;
    if (close && !alert && !moving && !E.heard[k]) { if (++E.listen[k] >= 240) { E.heard[k] = true; say([{ who: "N", dark: 0.3, text: ev.lines[k] }]); } }
  });
  if (!near) E.sus = Math.max(0, E.sus - 0.3);
  if (E.sus >= 100) {
    E.spotted = true; banner = { text: "Spotted!", t: 100, big: true }; Arcade.noise(0.2, 0.06);
    for (const m of E.men) { npcs = npcs.filter((n) => n !== m); m.team = "e"; setState(m, "idle"); Object.assign(m, { aggro: true, roam: true, engaged: true, cool: 30 }); enemies.push(m); }
    return false;
  }
  return E.heard.every(Boolean);
}
function drawEavesdrop(P) {
  const s = mission && mission.def.steps[mission.i], E = mission && mission.st && mission.st.ev;
  if (!s || !s.eavesdrop || !E || s.eavesdrop.street !== street.id) return;
  s.eavesdrop.tables.forEach((tx, k) => {
    const x = Math.round(tx - cam); if (x < -40 || x > LW + 40) return;
    spr("c_table", x, Y0 + 12);
    if (E.spotted || E.heard[k]) return;
    const alert = ((frameNo + k * 97) % 360) < 70;
    if (alert) text("!", x, Y0 - 52, 12, "#c0392b", "center", "IBM Plex Sans");
    else { R(x - 14, Y0 - 48, 28, 3, "rgba(14,13,12,0.6)"); R(x - 14, Y0 - 48, 28 * E.listen[k] / 240, 3, "#5cc8c0"); }
  });
}
// the suspicion meter, top centre under the clock
function drawSuspicion() {
  const E = mission && mission.st && mission.st.ev; if (!E || E.spotted) return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const w = 80, x = LW / 2 - w / 2, y = 30;
  R(x - 2, y - 2, w + 4, 9, "rgba(14,13,12,0.7)"); R(x, y, w * Math.min(1, E.sus / 100), 5, E.sus > 66 ? "#c0392b" : E.sus > 33 ? "#f2c230" : "#5cc8c0");
  text("SUSPICION", LW / 2, y + 13, 5, "#f7f4ee");
}
