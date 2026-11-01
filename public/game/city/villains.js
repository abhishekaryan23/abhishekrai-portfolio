/* Rollback City: the Khalnayak Wax Museum, on the Kinara. A plain script that shares globals with the
   others; index.html loads it after gallery.js.

   Five villains of the Bunderpur screen, none of them real: the emperor with the cobra staff, the
   bandit chief, the old money man, the loud nineties goon and the silent hitman. Each stands on a
   plinth under a spotlight with a plaque you can read (the film, the year, the line everyone does at
   weddings). Reading all five counts in the phone's Gallery. */
"use strict";

const VILLAINS = [
  { x: 90, art: "vil_1", name: "SAMRAT VISHDANT", film: "Paataal Samrat (1986)", line: "\"My cobra never sleeps. Neither do my accountants.\"", note: "Fourteen costume changes, one crown, and a staff the props department still won't lend out." },
  { x: 190, art: "vil_2", name: "DAAKU BHAIRON SINGH", film: "Chambal Ki Chingari (1979)", line: "\"Fifty villages fear my whip. The fifty-first owes me rent.\"", note: "He never once raised the whip on screen. He just held it, and audiences paid the rent anyway." },
  { x: 290, art: "vil_3", name: "SETH CHANDI LAL", film: "Lakhpati Ka Lalach (1993)", line: "\"Everything has a price, beta. Yours is very small.\"", note: "The cane was hollow. What was in it is a question the sequel never answered." },
  { x: 390, art: "vil_4", name: "LUCKY LAFANGA", film: "Lucky Lottery Lafanga (1996)", line: "\"Lucky's specs go up, your luck goes down!\"", note: "The jacket glowed under the cinema lights. Three projectionists asked for one." },
  { x: 490, art: "vil_5", name: "KAALA BICHHU", film: "Zehreela Bichhu (2004)", line: "(He never says a word in the whole film.)", note: "Nobody in Bunderpur has dared to ask the actor why. Nobody has dared to ask him anything." }];
art(VILLAINS.map((v) => v.art).concat("v_ambulance"));

WORLD.streets.waxMuseum = { id: "waxMuseum", name: "Khalnayak Wax Museum", district: WORLD.streets.kinara.district, w: 640, theme: "museum", interior: true, mapOn: "kinara",
  doors: [{ x: 600, to: "kinara", label: "Sagar Kinara" }] };
WORLD.streets.kinara.doors = (WORLD.streets.kinara.doors || []).concat({ x: 1300, to: "waxMuseum", label: "Khalnayak Wax Museum" });   // its own pavilion on the promenade, between the hotel and the club

// inside: velvet walls, a polished floor, five plinths under spotlights with ropes between them
function drawMuseum(P) {
  const velvet = "#4a1420", fold = "#3a0f18", gold = "#c9a227";
  R(0, 0, LW, 150, velvet); for (let fx = -(cam % 24); fx < LW; fx += 24) { R(fx, 0, 6, 150, fold); R(fx + 6, 0, 1, 150, "#5a1a28"); }
  R(0, 0, LW, 12, "#1d0a0e"); R(0, 12, LW, 2, gold); R(0, 128, LW, 2, gold); R(0, 130, LW, 20, "#2a0c12");
  const hx = Math.round(320 - cam); R(hx - 112, 22, 224, 22, "#1d0a0e"); R(hx - 111, 23, 222, 1, gold); R(hx - 111, 42, 222, 1, gold);
  text("KHALNAYAK", hx, 36, 11, gold, "center", "Newsreader"); text("VILLAINS OF THE SILVER SCREEN", hx, 52, 5, "#e8d4a0", "center", "IBM Plex Sans");
  R(0, 150, LW, LH - 150, "#5a3a22"); for (let py = 150, r = 0; py < LH; r++) { const h = 5 + r * 2; R(0, py, LW, 1, "#3e2616"); py += h; }   // floorboards
  g.globalAlpha = 0.12; R(0, 150, LW, 10, "#f2c890"); g.globalAlpha = 1;
  for (const v of VILLAINS) {
    const x = Math.round(v.x - cam); if (x < -60 || x > LW + 60) continue;
    g.globalAlpha = 0.13; g.fillStyle = "#fff0c8"; g.beginPath(); g.moveTo(x - 6, 14); g.lineTo(x + 6, 14); g.lineTo(x + 30, 152); g.lineTo(x - 30, 152); g.fill(); g.globalAlpha = 1;   // the spotlight
    R(x - 4, 12, 8, 4, "#1d1b18");
    R(x - 18, 136, 36, 18, "#2a2730"); R(x - 18, 136, 36, 2, "#5a5560"); R(x - 18, 152, 36, 2, "#141216"); R(x - 8, 142, 16, 7, gold); R(x - 7, 143, 14, 5, "#1d1b18");   // plinth and plaque
    if (waxFight && waxFight.k === VILLAINS.indexOf(v)) continue;   // he's down on the floor, fighting
    if (!spr(v.art, x, 137)) { R(x - 8, 92, 16, 44, "#6a5a50"); }
    if ((progress.waxBeat || []).includes(VILLAINS.indexOf(v))) R(x + 10, 144, 5, 4, "#2f9a4a");   // a small green tick on the plaque: beaten
  }
  if (waxFight && waxFight.k === 3) for (let k = 0; k < 4; k++) { const sx = LW / 2 + Math.sin(frameNo / 20 + k * 1.6) * 160; g.globalAlpha = 0.14; g.fillStyle = ["#ff3bd0", "#3bd0ff", "#ffe03b", "#3bff7a"][k]; g.beginPath(); g.moveTo(LW / 2, 0); g.lineTo(sx - 20, 200); g.lineTo(sx + 20, 200); g.fill(); g.globalAlpha = 1; }   // Lucky brings his own disco
  { // the way out: a lit double door with an EXIT sign, where you came in
    const dx = Math.round(600 - cam);
    if (dx > -40 && dx < LW + 40) {
      R(dx - 16, 96, 32, 56, "#1d0a0e"); R(dx - 14, 98, 28, 54, "#5a3a22"); R(dx - 1, 98, 2, 54, "#3e2616"); R(dx - 5, 124, 2, 4, "#c9a227"); R(dx + 3, 124, 2, 4, "#c9a227");
      R(dx - 16, 94, 32, 3, "#c9a227"); R(dx - 10, 82, 20, 9, "#0e3a1e"); text("EXIT", dx, 89, 6, "#5cff8a", "center", "IBM Plex Sans");
      g.globalAlpha = 0.14; g.fillStyle = "#ffd98a"; g.beginPath(); g.moveTo(dx - 14, 152); g.lineTo(dx + 14, 152); g.lineTo(dx + 26, 168); g.lineTo(dx - 26, 168); g.fill(); g.globalAlpha = 1;
    }
  }
  for (let k = 0; k < VILLAINS.length - 1; k++) {   // velvet ropes on brass posts
    const a = Math.round(VILLAINS[k].x + 26 - cam), b = Math.round(VILLAINS[k + 1].x - 26 - cam);
    for (const px of [a, b]) { R(px - 1, 150, 3, 16, gold); R(px - 2, 148, 5, 3, "#e8c860"); R(px - 3, 165, 7, 2, gold); }
    g.strokeStyle = "#a01828"; g.lineWidth = 2; g.beginPath(); g.moveTo(a + 1, 152); g.quadraticCurveTo((a + b) / 2, 160, b + 1, 152); g.stroke();
  }
}
// outside, on the Kinara: a little art deco front with a marquee and a lit doorway
function drawMuseumFront(P) {
  if (street.id !== "kinara") return; const x = Math.round(1300 - cam); if (x < -60 || x > LW + 60) return;
  const cream = P.dark ? "#8a8070" : "#efe2c4", trim = P.dark ? "#5a4a3a" : "#b88a5a";
  R(x - 40, 46, 80, 6, trim); R(x - 36, 40, 72, 7, cream); R(x - 26, 34, 52, 7, trim);   // a stepped deco crown
  R(x - 38, 70, 76, 80, cream); R(x - 38, 70, 76, 3, trim); for (const px of [-38, -26, 18, 30]) { R(x + px, 70, 8, 80, trim); R(x + px + 2, 70, 2, 80, shade(trim, 0.2)); }   // columns
  for (let k = 0; k < 3; k++) R(x - 44 - k * 3, 150 - k * 2, 88 + k * 6, 2, k % 2 ? shade(cream, -0.15) : cream);   // steps
  R(x - 34, 54, 68, 18, "#4a1420"); R(x - 33, 55, 66, 1, "#c9a227"); text("WAX MUSEUM", x, 66, 6, "#f2c230", "center", "IBM Plex Sans");
  for (let b = 0; b < 9; b++) if ((Math.floor(frameNo / 12) + b) % 3) R(x - 32 + b * 8, 52, 2, 2, "#ffe9a8");   // marquee bulbs
  R(x - 12, 100, 24, 50, "#1d0a0e"); R(x - 10, 102, 20, 48, P.dark ? "#6a2a1a" : "#8a3a24"); g.globalAlpha = 0.35; R(x - 10, 102, 20, 48, "#ffb070"); g.globalAlpha = 1;
  text("KHALNAYAK", x, 90, 5, "#4a1420", "center", "Newsreader");
}
function museumTarget(p) {
  if (street.id !== "waxMuseum") return null;
  const k = VILLAINS.findIndex((v) => Math.abs(v.x - p.x) < 22); if (k < 0) return null;
  const v = VILLAINS[k];
  if (waxFight) return null;
  const read = (progress.villains || []).includes(k), beat = (progress.waxBeat || []).includes(k);
  if (read) return { label: (beat ? "Rematch " : "Challenge ") + v.name, x: v.x, y: 128, act: () => startWaxFight(k) };
  return { label: "Read the plaque: " + v.name, x: v.x, y: 128, act: () => {
    showNote(v.name + "\n" + v.film + "\n\n" + v.line + "\n\n" + v.note);
    const seen = progress.villains = progress.villains || [];
    if (!seen.includes(k)) { seen.push(k); texts.push({ x: p.x, y: p.y - 74, s: "Villains met: " + seen.length + " of " + VILLAINS.length, t: 100 }); if (seen.length === VILLAINS.length) { earn(250); texts.push({ x: p.x, y: p.y - 88, s: "Every villain! The museum gives you a free pass (Rs 250)", t: 120 }); } }
  } };
}

/* ---------- the museum after hours: the wax comes alive ---------- */
// once you've read a plaque you can challenge that villain to a bout on the museum floor. Each has two
// super powers (called out as he winds up), a coloured aura, and moves like wax: stiff and heavy
const WAX = [
  { hp: 240, speed: 0.95, aura: "#a050ff", shot: "cobra", specials: ["pound", "fan"], powers: { pound: "NAAG SHAKTI!", fan: "COBRA VOLLEY!" } },
  { hp: 260, speed: 1.15, aura: "#ff5030", specials: ["charge", "eRoll"], powers: { charge: "CHAMBAL CHARGE!", eRoll: "WHIRLING WHIP!" } },
  { hp: 220, speed: 0.9, aura: "#ffd040", shot: "coin", specials: ["fan", "pound"], powers: { fan: "RAIN OF GOLD!", pound: "MARKET CRASH!" } },
  { hp: 230, speed: 1.25, aura: "#40ff90", shot: "record", specials: ["eRoll", "fan", "charge"], powers: { eRoll: "LUCKY SPIN!", fan: "DISCO DHAMAKA!", charge: "NINETIES RUSH!" } },
  { hp: 250, speed: 1.3, aura: "#8a7aa8", specials: ["dive", "charge"], powers: { dive: "SHADOW STING!", charge: "SILENT STRIKE!" } }];
WAX.forEach((w, k) => {
  const id = "wax" + (k + 1);
  KINDS[id] = { hp: w.hp, speed: w.speed, scale: 1, look: "kaal", name: VILLAINS[k].name.replace(/\b\w+/g, (s) => s[0] + s.slice(1).toLowerCase()), score: 3000, windup: 12, cool: [24, 44], moves: ["ePunch", "eKick", "ePunch"], specials: w.specials, shot: w.shot, poise: 40, boss: true, cash: 0, wax: k };
});
THROWN.cobra = { v: 3, dmg: 8, z: 12 }; THROWN.coin = { v: 3.6, dmg: 5, z: 24 };
let waxFight = null;
function startWaxFight(k) {
  const v = VILLAINS[k], p = alivePlayers()[0]; if (!p) return;
  for (const q of alivePlayers()) { q.hp = q.max; q.sp = Math.max(q.sp, 60); }
  const e = fighter("wax" + (k + 1), v.x, Y0 + 16, "e"); Object.assign(e, { aggro: true, engaged: true, cool: 70 });
  enemies.push(e); bossRef = e;
  waxFight = { k, e, a: { boss: true, waves: [[]], name: v.name, x: 320 } };   // (the camera frames the bout on a.x)
  arena = { a: waxFight.a, wave: 0, queue: [], n: 0, added: 0 };
  banner = { text: v.name + "  vs  " + KINDS[p.kind].name.toUpperCase(), t: 150, big: true };
  texts.push({ x: v.x, y: Y0 - 80, s: "The wax cracks. He steps down.", t: 90 }); shake = 4; Arcade.noise(0.4, 0.08);
  setTimeout(() => { if (waxFight) texts.push({ x: e.x, y: Y0 - 90, s: "Lights... camera... FIGHT!", t: 80 }); }, 1200);
}
function endWaxFight(won) {
  const f = waxFight; if (!f) return; waxFight = null; arena = null; bossRef = null;
  if (!f.e.gone) f.e.gone = true;
  const v = VILLAINS[f.k];
  if (won) {
    const beat = progress.waxBeat = progress.waxBeat || [];
    if (!beat.includes(f.k)) { beat.push(f.k); earn(200); if (beat.length === VILLAINS.length) { banner = { text: "Every villain beaten. The museum names a plinth after you", t: 220, big: true }; } }
    if (!banner || !banner.big) banner = { text: "YOU WIN! " + v.name + " goes back on his plinth", t: 180, big: true };
  } else {
    for (const q of alivePlayers()) { q.hp = q.max; setState(q, "getup", 30); q.inv = 90; }
    banner = { text: "The wax wins this time. " + v.name + " climbs back up, smirking", t: 180, big: true };
  }
  saveGame(true);
}
function updateWax() {
  if (!waxFight) return;
  if (street.id !== "waxMuseum") { waxFight = null; return; }
  if (waxFight.a.done || waxFight.e.st === "dead" || (waxFight.e.hp <= 0 && DOWN_STATES.includes(waxFight.e.st))) endWaxFight(true);
}
// a wax villain's bout ends in the museum, not at the clinic: no life lost
const baseLoseLife = loseLife;
loseLife = function (p) { if (waxFight) { endWaxFight(false); return; } baseLoseLife(p); };
// the super power, called out as it winds up
const baseWindup = windup;
windup = function (e, name, t, special) {
  baseWindup(e, name, t, special);
  const k = KINDS[e.kind]; if (k && k.wax !== undefined && special) { const w = WAX[k.wax]; texts.push({ x: e.x, y: e.y - 78, s: w.powers[name] || "!", t: 70 }); shake = Math.max(shake, 3); e.flash = 8; }
};
// how a wax villain is drawn: his statue, come alive. Stiff: he leans, lunges, bobs and topples
const baseDrawFighter = drawFighter;
drawFighter = function (f) {
  const k = KINDS[f.kind]; if (!k || k.wax === undefined) return baseDrawFighter(f);
  const im = SPRITES[VILLAINS[k.wax].art], x = Math.round(f.x - cam), y = Math.round(f.y), w = WAX[k.wax];
  if (!im || f.st === "out" || (f.st === "dead" && Math.floor(f.t / 4) % 2) || x < -70 || x > LW + 70) return;
  g.fillStyle = PAL.shadow; g.beginPath(); g.ellipse(x, y, 13, 3, 0, 0, 7); g.fill();
  const flat = f.st === "lying" || f.st === "dead" || f.st === "getup";
  const pulse = 0.18 + 0.1 * Math.sin(frameNo / 8) + (f.st === "windup" ? 0.2 : 0) + (f.rage ? 0.12 : 0);   // the aura
  if (!flat) { g.globalAlpha = pulse; g.fillStyle = w.aura; g.beginPath(); g.ellipse(x, y - 28 - f.z, 20, 32, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
  let rot = 0, dx = 0, bob = 0;
  if (f.st === "walk") { bob = Math.abs(Math.sin(f.walkPh || 0)) * -2; rot = Math.sin(f.walkPh || 0) * 0.05; }
  else if (f.st === "windup") { rot = -0.12 * f.face; dx = (frameNo % 4 < 2 ? 1 : -1); }
  else if (f.st === "attack") { rot = 0.16 * f.face; dx = f.face * 7; }
  else if (f.st === "hurt") rot = -0.2 * f.face;
  else if (flat) rot = -f.face * Math.PI / 2;
  else if (f.st === "air") rot = 0.25 * f.face;
  const h = im.height / 2, wd = im.width / 2;
  g.save(); g.translate(x + dx, y - f.z + bob - (flat ? 6 : 0)); g.rotate(rot); if (f.face < 0) g.scale(-1, 1);
  if (f.flash > 0) g.filter = "brightness(2.2)";
  g.drawImage(im, -wd / 2, -h, wd, h); g.filter = "none"; g.restore();
};
// his special throws: a cobra slithering along the floor, and gold coins
const baseDrawShot = drawShot;
drawShot = function (s, P) {
  if (s.kind !== "cobra" && s.kind !== "coin") return baseDrawShot(s, P);
  const x = Math.round(s.x - cam), y = Math.round(s.y - s.z);
  if (s.kind === "coin") { const sq = Math.abs(Math.sin(frameNo / 3 + s.x)) * 3 + 1; R(x - sq, y - 3, sq * 2, 6, "#5a4210"); R(x - sq + 1, y - 2, Math.max(1, sq * 2 - 2), 4, "#ffd23a"); return; }
  for (let k = 0; k < 6; k++) R(x - s.face * k * 3, y + Math.round(Math.sin(frameNo / 4 + k) * 2), 4, 3, k ? "#3f9a4a" : "#2a6a32");   // the cobra
  R(x + s.face * 2, y - 2, 2, 2, "#f2c230");
};
