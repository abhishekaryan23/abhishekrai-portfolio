/* Rollback City: Act 3, "The Truth Comes Out" (DESIGN 6, 3-1 to 3-10 and the epilogue; 4.2 to 4.9 of
   the plan). A plain script that shares globals with the others; index.html loads them in order.

   The truth: in 1987 Seth Dhanraj Kaal's men poured kerosene behind the dhaba at 11:57; when Ranjit
   lit the lamp at 11:58 he thought he'd started the fire, and ran. Tiwari Dada was shooting Chandni
   Raat from a rooftop that night and his camera kept rolling. Act 3 finds the cameraman, the reel,
   the fire-brigade report and the copy, and shows it to the whole city on the Kinara screen at 11:58.
   New places: Sitara Studios (off Mandi Gate), the Records Office and the Ctrl+Z Cyber Cafe (Bunder
   Road), Tiwari Dada's flat (the Back Gali), the old station cinema's booth (Platform 2), and Kaal
   Heights (the end of Bunder Road): lobby, gym, server floor, boardroom, helipad. */
"use strict";

/* ---------- the places ---------- */
const room = (name, district, mapOn, back, extra) => Object.assign({ name, district, w: 384, theme: "act3room", interior: true, mapOn, doors: [{ x: 352, to: back[0], label: back[1] }] }, extra || {});
Object.assign(WORLD.streets, {
  sitara: { name: "Sitara Studios", district: "studios", tier: 3, w: 1800, theme: "studio", map: [30, 9, 64, 9],
    junctions: [{ x: 120, to: "mandiGate", dir: "down", label: "Mandi Gate" }],
    doors: [{ x: 640, to: "canteen", label: "Studio canteen" }, { x: 1560, to: "vault", label: "The archive vault", needs: "3-2" }],
    spawn: { kinds: ["studioGuard", "studioGuard", "kaal"], cap: 2, every: 900, when: "night" }, civs: 3, radio: true },   // playback on the lot, for the shoots
  canteen: room("Studio canteen", "studios", "sitara", ["sitara", "Sitara Studios"], { art: "chaiShop" }),
  vault: room("The archive vault", "studios", "sitara", ["sitara", "Sitara Studios"], { art: "records" }),
  tiwariFlat: room("Tiwari Dada's flat", "chandni", "gali", ["gali", "Back Gali"], { art: "booth" }),
  cafe: room("Ctrl+Z Cyber Cafe", "harbour", "bunderRoad", ["bunderRoad", "Bunder Road"], { art: "cafe" }),
  records: room("Records Office, ground floor", "harbour", "bunderRoad", ["bunderRoad", "Bunder Road"], { art: "records", links: [{ x: 40, to: "records2", verb: "Stairs up" }] }),
  records2: room("Records Office, first floor", "harbour", "bunderRoad", ["records", "Stairs down"], { art: "records", links: [{ x: 40, to: "records3", verb: "Stairs up" }] }),
  records3: room("Records Office, top floor", "harbour", "bunderRoad", ["records2", "Stairs down"], { art: "records" }),
  booth: room("Station cinema, projection booth", "harbour", "platform", ["platform", "Platform 2"], { art: "booth" }),
  heights: { name: "Kaal Heights plaza", district: "heights", tier: 3, w: 1200, theme: "heights", map: [70, 50, 82, 46],
    junctions: [{ x: 80, to: "bunderRoad", dir: "down", label: "Bunder Road" }], doors: [{ x: 900, to: "heightsLobby", label: "Kaal Heights", needs: "3-8" }], civs: 2 },
  heightsLobby: room("Kaal Heights: lobby", "heights", "heights", ["heights", "The plaza"], { art: "heightsLobby", links: [{ x: 40, to: "heightsGym", verb: "Lift up" }] }),
  heightsGym: room("Kaal Heights: the gym", "heights", "heights", ["heightsLobby", "Lift down"], { art: "heightsGym", links: [{ x: 40, to: "heightsServer", verb: "Lift up" }] }),
  heightsServer: room("Kaal Heights: the server floor", "heights", "heights", ["heightsGym", "Lift down"], { art: "heightsServer", links: [{ x: 40, to: "heightsBoard", verb: "Lift up" }] }),
  heightsBoard: room("Kaal Heights: the boardroom", "heights", "heights", ["heightsServer", "Lift down"], { art: "heightsBoard", links: [{ x: 40, to: "helipad", verb: "Stairs to the roof" }] }),
  helipad: { name: "Kaal Heights: the helipad", district: "heights", tier: 3, w: 640, theme: "helipad", mapOn: "heights", links: [{ x: 40, to: "heightsBoard", verb: "Stairs down" }] }
});
for (const id of ["canteen", "vault", "tiwariFlat", "cafe", "records", "records2", "records3", "booth", "heights", "heightsLobby", "heightsGym", "heightsServer", "heightsBoard", "helipad", "sitara"]) WORLD.streets[id].id = id;
WORLD.streets.mandiGate.junctions.push({ x: 400, to: "sitara", dir: "up", label: "Sitara Studios", needs: "2-11" });
WORLD.streets.bunderRoad.doors.push({ x: 150, to: "records", label: "Municipal Records Office", needs: "3-3" }, { x: 620, to: "cafe", label: "Ctrl+Z Cyber Cafe", needs: "2-11" });
WORLD.streets.bunderRoad.junctions.push({ x: 1322, to: "heights", dir: "up", label: "Kaal Heights", needs: "2-11" });
WORLD.streets.gali.doors = (WORLD.streets.gali.doors || []).concat({ x: 700, to: "tiwariFlat", label: "Tiwari Dada's flat", needs: "3-1" });
WORLD.streets.platform.doors.push({ x: 760, to: "booth", label: "The old station cinema", needs: "3-7" });
DISTRICT_NAMES.studios = DISTRICT_NAMES.studios || "Sitara Studios";

/* ---------- the cast ---------- */
Object.assign(KINDS, {
  studioGuard: { hp: 30, speed: 0.9, scale: 1, look: "constable", name: "Studio security", score: 200, windup: 14, cool: [50, 85], moves: ["ePunch", "eKick"], weapon: "pipe", cash: 30 },
  peon: { hp: 22, speed: 0.9, scale: 0.96, look: "grunt", name: "Peon", score: 100, windup: 15, cool: [55, 90], moves: ["ePunch", "eShove"], coward: true, cash: 10 },
  lawyer: { hp: 26, speed: 0.95, scale: 1, look: "kaal", name: "Kaal's lawyer", score: 200, windup: 14, cool: [50, 80], moves: ["ePunch", "eShove"], lob: "sack", cash: 80 },
  steel: { hp: 420, speed: 0.9, scale: 1.12, look: "bruiser", name: "Steel Sultan", score: 5000, windup: 15, cool: [30, 55], moves: ["ePunch", "heavy", "eKick"], specials: ["charge", "pound"], poise: 48, boss: true, cash: 0 },
  vikram: { hp: 460, speed: 1.1, scale: 1.15, look: "kaal", name: "Vikram Kaal", score: 8000, windup: 11, cool: [26, 48], moves: ["ePunch", "eKick", "ePunch"], specials: ["charge", "whistle"], poise: 44, boss: true, cash: 0 }
});
Object.assign(SHEET_OF, { studioGuard: "constable", peon: "grunt", lawyer: "kaal", steel: "bruiser", vikram: "kaal" });
// their own sheets, once made (4.0): a boss on his own art, not a borrowed one
const ACT3_SHEETS = { steel: "steel", vikram: "vikram" };
for (const k in ACT3_SHEETS) if (typeof FIGHTER_FRAMES !== "undefined" && FIGHTER_FRAMES[ACT3_SHEETS[k]]) SHEET_OF[k] = ACT3_SHEETS[k];
// people who stand and talk: one painted sprite each (MOSS)
const NPC_ART = { tiwari: "npc_tiwari", masterji: "npc_masterji", bunty: "npc_bunty", seth: "npc_seth" };
art(Object.values(NPC_ART));
function drawPerson(name, wx, y, face) {
  const x = Math.round(wx - cam); if (x < -40 || x > LW + 40) return;
  g.fillStyle = PAL.shadow; g.beginPath(); g.ellipse(x, y, 8, 2.5, 0, 0, 7); g.fill();
  if (!sprAt(NPC_ART[name], x, y + 1, face > 0, 1)) { R(x - 5, y - 40, 10, 40, "#6b5a48"); R(x - 4, y - 48, 8, 8, "#a8704a"); }
}
// who stands where in Act 3 (and the epilogue)
const ACT3_PEOPLE = [
  { who: "tiwari", street: "tiwariFlat", x: 200, from: "3-1" }, { who: "masterji", street: "sitara", x: 360, from: "2-11" },
  { who: "bunty", street: "cafe", x: 200, from: "2-11" }, { who: "tiwari", street: "booth", x: 240, from: "3-7", until: "3-8" }];
function drawAct3People() {
  for (const q of ACT3_PEOPLE) if (q.street === street.id && progress.done.includes(q.from) && !(q.until && progress.done.includes(q.until))) drawPerson(q.who, q.x, Y0 + 12, -1);
  if (epilogueOn()) for (const q of EPILOGUE_CAST) if (q.street === street.id && (!q.when || q.when())) drawPerson(q.who, q.x, Y0 + 12, q.face || -1);
}

/* ---------- painters: the studio lot, the plaza, the helipad, the painted rooms ---------- */
art(["set_myth", "set_western", "set_village"]);
function drawStudio(P) {
  if (!backdrop("studio", 120)) { R(0, 0, LW, LH, P.sky); }
  R(0, 120, LW, 30, P.dark ? "#4a4440" : "#c9bfae"); R(0, 150, LW, LH - 150, P.dark ? "#3a3632" : "#a8a090");
  for (let x = -(cam % 64); x < LW; x += 64) R(x, 150, 1, LH - 150, P.dark ? "#2e2a26" : "#968e80");
  // the set flats: a palace, a saloon, a village, each on its struts
  for (const [wx, name] of [[360, "set_myth"], [960, "set_western"], [1300, "set_village"]]) { const x = Math.round(wx - cam); if (x > -160 && x < LW + 160) sprAt(name, x, 150, false, 1); }
  { const x = Math.round(960 - cam), im = SPRITES.set_western; if (im && x > -120 && x < LW + 120) { const w = im.width / 2, top = 150 - im.height / 2; R(x - w * 0.21, top + 7, w * 0.42, 12, "#5a3a20"); R(x - w * 0.21, top + 7, w * 0.42, 1, "#8a6a3a"); text("SALOON", x, top + 16, 8, "#f2c230", "center", "Newsreader"); } }   // the painting's own sign was gibberish
  // lighting stands
  for (let wx = 200; wx < street.w; wx += 340) { const x = Math.round(wx - cam); if (x < -20 || x > LW + 20) continue; R(x, 70, 2, 80, "#2a2622"); R(x - 6, 64, 14, 8, "#3a3632"); g.globalAlpha = P.dark ? 0.2 : 0.08; g.fillStyle = "#fff4c8"; g.beginPath(); g.moveTo(x - 6, 72); g.lineTo(x + 40, 150); g.lineTo(x - 30, 150); g.fill(); g.globalAlpha = 1; }
}
function drawPlaza(P) {
  if (!backdrop("heights", 112)) R(0, 0, LW, LH, P.sky);
  R(0, 30, LW, 120, P.dark ? "rgba(20,30,48,0.55)" : "rgba(170,200,220,0.5)");
  for (let x = -(cam * 1 % 40); x < LW; x += 40) { R(x, 30, 1, 120, P.dark ? "#4a6a8a" : "#e8f2fa"); for (let y = 40; y < 150; y += 18) R(x + 4, y, 32, 1, P.dark ? "#2a3a52" : "#c8dce8"); }   // the glass curtain wall
  R(0, 150, LW, LH - 150, P.dark ? "#2a2a30" : "#d8d8dc"); for (let x = -(cam % 48); x < LW; x += 48) R(x, 150, 1, LH - 150, P.dark ? "#3a3a44" : "#c0c0c8");
  const dx = Math.round(900 - cam); if (dx > -60 && dx < LW + 60) { R(dx - 26, 70, 52, 80, P.dark ? "#121820" : "#5a7a94"); R(dx - 30, 60, 60, 12, "#1d1b18"); text("KAAL HEIGHTS", dx, 69, 7, "#d9b77a", "center", "Newsreader"); }
  const fx = Math.round(500 - cam); if (fx > -50 && fx < LW + 50) { g.fillStyle = P.dark ? "#3a4a5a" : "#b8c8d4"; g.beginPath(); g.ellipse(fx, 176, 34, 8, 0, 0, 7); g.fill(); for (let k = 0; k < 5; k++) R(fx - 2 + Math.sin(frameNo / 8 + k) * 3, 150 + k * 4, 2, 4, "rgba(220,240,255,0.7)"); }
}
function drawHelipad(P) {
  if (!backdrop("storm", 150, "_n")) R(0, 0, LW, LH, "#10141e");
  R(0, 150, LW, LH - 150, "#2a2c32"); g.strokeStyle = "#d9b77a"; g.lineWidth = 2; const hx = Math.round(320 - cam);
  g.beginPath(); g.ellipse(hx, 186, 70, 18, 0, 0, 7); g.stroke(); text("H", hx, 192, 14, "#d9b77a", "center", "IBM Plex Sans");
  for (let x = -(cam % 24); x < LW; x += 24) R(x, 150, 12, 3, frameNo % 40 < 20 ? "#c0392b" : "#5a1a16");   // the edge lights
}
const ACT3_ROOMS = { canteen: "chaiShop", vault: "records", tiwariFlat: "booth", cafe: "cafe", records: "records", records2: "records", records3: "records", booth: "booth", heightsLobby: "heightsLobby", heightsGym: "heightsGym", heightsServer: "heightsServer", heightsBoard: "heightsBoard" };
function drawAct3Room(P) {
  const id = street.art || ACT3_ROOMS[street.id], name = "room_" + id, im = SPRITES[name];
  if (!im) { sprite(name, ART + "rooms/" + id + ".webp"); R(0, 0, LW, LH, "#2a2622"); R(0, 150, LW, LH - 150, "#3a3430"); return; }
  R(0, 0, LW, LH, "#1d1b18"); g.drawImage(im, Math.round(-cam), 0, street.w, LH);
  if (street.id === "vault") { g.globalAlpha = 0.35; R(0, 0, LW, LH, "#1a2028"); g.globalAlpha = 1; }   // the archive, with the lights half off
}

/* ---------- the stunt gig (a dance step, judged for the camera) and the darkroom ---------- */
// a gig is the dance-off's arrows played as moves for the camera: { stunt: { street, x, need, notes } }
// (missions.js runs it as a dance step; this just renames it on screen)
const stuntOn = () => !!(mission && (mission.def.steps[mission.i] || {}).dance && mission.def.steps[mission.i].dance.stunt);
// developing the reel: three baths, each stopped when the needle is in the green
function updateDevelop(s, st) {
  if (street.id !== "booth") return false;
  st.stage = st.stage || 0; st.ph = (st.ph || 0) + 0.04 + st.stage * 0.012;
  if (alivePlayers().some((p) => tapped(p.pi, "punch") || tapped(p.pi, "use"))) {
    if (Math.abs(Math.sin(st.ph)) < 0.22) { st.stage++; texts.push({ x: players[0].x, y: players[0].y - 70, s: ["Developer: done.", "Stop bath: done.", "Fixer: done. It's coming up!"][st.stage - 1], t: 80 }); Arcade.tone(500 + st.stage * 150, 0.12, "triangle", 0.05); }
    else { st.spoil = (st.spoil || 0) + 1; texts.push({ x: players[0].x, y: players[0].y - 70, s: "Too soon! Tiwari winces.", t: 60 }); if (st.spoil >= 4) { failMission("The film fogged. Tiwari has one more length of it; try again"); return false; } }
  }
  return st.stage >= 3;
}
function drawDevelop() {
  const s = mission && mission.def.steps[mission.i], st = mission && mission.st; if (!s || !s.develop || street.id !== "booth") return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0); g.globalAlpha = 0.35; R(0, 0, LW, LH, "#5a0a0a"); g.globalAlpha = 1;   // the red safelight
  const cx = LW / 2, cy = 60, n = Math.sin(st.ph || 0);
  R(cx - 62, cy - 10, 124, 26, "rgba(14,13,12,0.8)"); R(cx - 56, cy, 112, 5, "#3a1a16"); R(cx - 56 * 0.22, cy, 112 * 0.22, 5, "#c9a227"); R(cx + n * 56 - 1, cy - 4, 2, 13, "#f7f4ee");
  text(["DEVELOPER", "STOP BATH", "FIXER", "DONE"][st.stage || 0] + "  (punch when the needle is in the gold)", cx, cy + 14, 5, "#f7f4ee");
}

/* ---------- the reel on the Kinara screen ---------- */
function drawReel(x) {
  if (!(mission && mission.id === "3-10") || street.id !== "kinara") return;
  const t = mission.st.t || 0, scene = Math.floor(t / 300) % 4;
  g.save(); g.beginPath(); g.rect(x - 70, 46, 140, 66); g.clip();
  R(x - 70, 46, 140, 66, "#3a2e22");
  // grainy sepia: the lane in 1987, the dhaba's lamp, two men with cans behind it, and then the fire
  R(x - 70, 80, 140, 32, "#5a4a36"); for (let k = 0; k < 4; k++) R(x - 64 + k * 34, 56 + (k % 2) * 6, 26, 26, "#6e5a42");
  if (scene >= 1) { R(x - 20, 70, 6, 8, "#e8d4a0"); g.globalAlpha = 0.3; g.fillStyle = "#f2dca8"; g.beginPath(); g.arc(x - 17, 74, 12, 0, 7); g.fill(); g.globalAlpha = 1; }
  if (scene >= 2) for (const mx of [x + 22, x + 38]) { R(mx, 78, 7, 20, "#1d1610"); R(mx + 1, 74, 5, 5, "#1d1610"); R(mx + 7, 88, 5, 6, "#8a7a5a"); }   // the men with the kerosene
  if (scene >= 3) for (let k = 0; k < 6; k++) { const h = 10 + Math.sin(frameNo / 5 + k) * 4; R(x + 10 + k * 8, 112 - h - 8, 6, h, k % 2 ? "#e8b060" : "#c87030"); }
  for (let k = 0; k < 30; k++) R(x - 70 + Math.random() * 140, 46 + Math.random() * 66, 1, 1, "rgba(255,240,210,0.25)");   // grain
  if (frameNo % 90 < 3) R(x - 70 + Math.random() * 140, 46, 1, 66, "rgba(255,240,210,0.4)");   // a scratch
  text(["CHANDNI LANE, 1987", "11:56", "11:57", "11:58"][scene], x + 46, 54, 5, "#f2dca8");
  g.restore();
}

/* ---------- the missions ---------- */
const swapTo = (kind) => () => { const p = players[0]; p.wasKind = p.wasKind || p.kind; p.kind = kind; p.max = KINDS[kind].hp + statHp(); p.hp = Math.min(p.hp, p.max); fighterArt(SHEET_OF[kind]); };
const swapBack = () => { const p = players[0]; if (p.wasKind) { p.kind = p.wasKind; p.wasKind = null; p.max = KINDS[p.kind].hp + statHp(); p.hp = p.max; } };
Object.assign(MISSIONS, {
  "3-1": { act: 3, title: "Chandni Raat", needs: ["2-11"], hours: [9, 20], start: { street: "akhada", x: 300 }, reward: { respect: { chandni: 5 } }, steps: [
    { panels: [
      { who: "rollback", name: "Ranjit", text: "The camera on the roof. It belonged to a film unit: Chandni Raat, a Sitara picture. Whoever was behind it saw the whole night." },
      { who: "kai", text: "Forty years on. They'd be... old." },
      { who: "rollback", name: "Ranjit", text: "Old men remember. Ask at Raja Talkies on Mandi Gate, ask at the studio canteen, ask around the Back Gali. Somebody knows the name." }] },
    { talk: { street: "mandiGate", x: 1450, label: "Ask the old projectionist", npc: { look: "civ_e", base: 0 } }, obj: "Raja Talkies, Mandi Gate: the old projectionist", panels: [{ who: "N", text: "An old man in a cardigan sits outside Raja Talkies, threading a film strip through his fingers out of habit." }] },
    { choice: { title: "The projectionist", text: "He looks you up and down. How do you go about it?", options: [
      { label: "Buy him a chai and ask about the old days", flag: "w1kind" }, { label: "Show him the Sitara polaroid", flag: "w1photo" }, { label: "Lean on him", flag: "w1hard" }] } },
    { if: () => flag("w1kind"), panels: [{ who: "N", text: "Two chais and a samosa later: \"Chandni Raat? Never finished. The cameraman lived in your lane, a Tiwari. Ask at the studio canteen; they never forget a man who owes them money.\"" }] },
    { if: () => flag("w1photo"), panels: [{ who: "N", text: "He holds it to the light. \"That's a Sitara unit, all right. That's Tiwari's camera on the roof, the Arriflex. Tiwari still owes the canteen for his teas.\"" }] },
    { if: () => flag("w1hard"), panels: [{ who: "N", text: "He doesn't flinch. \"I ran a projector through the '87 riots, beta. You don't scare me.\" He tells you anyway, out of pity: \"Tiwari. The canteen knows him.\"" }] },
    { talk: { street: "canteen", x: 160, label: "Ask the canteen cook" }, obj: "Sitara Studios canteen: ask the cook", panels: [{ who: "N", text: "The cook doesn't look up from his tawa. \"Tiwari? Two hundred and twelve rupees of tea, since 1986.\"" }] },
    { choice: { title: "The canteen cook", text: "He's still frying. What do you say?", options: [
      { label: "Pay Tiwari's tab (Rs 212)", flag: "w2paid", ok: () => money() >= 212, no: "Not enough on you.", act: () => { progress.money -= 212; } }, { label: "Tell him what Tiwari saw that night", flag: "w2truth" }] } },
    { panels: [{ who: "N", text: "\"He lives in the Back Gali. Third door, the one with film cans for a doorstop.\" The cook pauses. \"He never shot again after that night. Never said why.\"" }],
      then: () => { if (flag("w2paid")) changeRespect(3, "chandni"); } },
    { talk: { street: "gali", x: 700, label: "Knock at Tiwari Dada's door" }, obj: "The Back Gali: Tiwari Dada's door", panels: [
      { who: "N", text: "A thin old man opens the door on the chain. Behind him, film cans to the ceiling." },
      { who: "N", text: "\"I knew someone would come. Forty years I waited for it to be the police. It's children.\"" }] },
    { choice: { title: "Tiwari Dada", text: "He's frightened. How do you ask him?", options: [
      { label: "Tell him Nani sent you", flag: "w3nani" }, { label: "Tell him Ranjit is out of jail", flag: "w3ranjit" }] } },
    { panels: [
      { who: "N", text: "The chain comes off." },
      { who: "N", text: "\"I was on the roof across from the dhaba. Night shoot. At 11:57 I saw two men behind the dhaba with cans. I kept rolling. Then the lamp, then the fire.\"" },
      { who: "N", text: "\"Kaal's men came for the reel the next week. I'd already sent it to the studio vault. I have been afraid of my own camera ever since.\"" }] }
  ] },
  "3-2": { act: 3, title: "Cut! Again!", needs: ["3-1"], hours: [9, 19], start: { street: "sitara", x: 360 }, reward: { rs: 1500, respect: { chandni: 5 } }, steps: [
    { panels: [
      { who: "N", text: "Master-ji, megaphone in hand, aviators on, looks at you the way a butcher looks at a goat." },
      { who: "N", text: "\"The vault is crew only. You want to be crew? Be a stunt double. Today. The hero is sick, the hero is always sick. Hit your marks for the camera.\"" }] },
    { dance: { street: "sitara", x: 360, need: 9, notes: 12, stunt: true, fail: "Cut! CUT! Again, with feeling. Tomorrow." }, obj: "The mythology set: hit your marks for the camera" },
    { panels: [{ who: "N", text: "\"Cut! Print it! Who are you? Never mind. You're crew.\" Then the studio security come round the western set, and they're not there for autographs. Kaal pays them too." }] },
    { fight: { street: "sitara", x: 960, name: "The western set", waves: [["studioGuard", "studioGuard"], ["studioGuard", "kaal", "studioGuard"]] }, obj: "Studio security, on the western set", checkpoint: true }
  ] },
  "3-3": { act: 3, title: "The Vault", needs: ["3-2"], start: { street: "tiwariFlat", x: 200 }, reward: { respect: { chandni: 5 } }, steps: [
    { panels: [{ who: "N", text: "\"Shelf C, can 1987-114. CHANDNI RAAT, ROLLS 7 TO 9. I wrote it myself.\" Tiwari Dada's hands shake as he draws you the vault's layout on a cigarette packet." }] },
    { go: { street: "vault", x: 200, r: 60 }, obj: "Sitara Studios: the archive vault" },
    { find: [{ street: "vault", x: 120, label: "Shelf C, can 1987-114", panels: [{ who: "N", text: "The can is there. It's empty." }] },
      { street: "vault", x: 280, label: "The logbook on the desk", panels: [{ who: "N", text: "The logbook, last year: ARCHIVE SOLD TO KAAL GROUP. And in red ink, a month ago: CAN 1987-114, CONTENTS TO KAAL HEIGHTS, BY ORDER OF V. KAAL." }] }], obj: "Search the vault" },
    { panels: [{ who: "kai", text: "Kaal Heights. He's had it all along." }, { who: "rai", text: "Then we need to know what else he's hiding before we go in. Bunty. The Ctrl+Z on Bunder Road. He knows how a building like that thinks." }],
      then: () => { progress.flags.cafe = true; } }
  ] },
  "3-4": { act: 3, title: "Paper Trail", needs: ["3-3"], hours: [10, 17], start: { street: "cafe", x: 200 }, reward: { rs: 1000, respect: { harbour: 5 } }, steps: [
    { panels: [
      { who: "N", text: "Bunty pushes his glasses up. \"Kaal's lawyers file the auction papers on Friday. But in 1987 the fire brigade wrote a report. If it says what I think it says, the case reopens and the auction stops.\"" },
      { who: "N", text: "\"It's in the Records Office, three floors of paper. My uncle's a clerk there: here's his coat. Walk, don't run. Peons notice running.\"" }], then: () => { progress.disguise = true; } },
    { sneak: { files: [["records", 200], ["records2", 120], ["records3", 260]] }, obj: () => "The Records Office: find the 1987 fire-brigade file (" + ((mission.st.found || []).length) + " of 3 floors searched)" },
    { panels: [
      { who: "N", text: "BUNDERPUR FIRE BRIGADE. CHANDNI LANE, 11:58 P.M. CAUSE: ACCELERANT (KEROSENE) FOUND BEHIND PREMISES. NOT A LAMP. FILE CLOSED ON INSTRUCTION." },
      { who: "kai", text: "\"Closed on instruction.\" Whose instruction?" },
      { who: "rai", text: "We know whose." }], then: () => { progress.flags.report = true; } }
  ] },
  "3-5": { act: 3, title: "Messages by Kite", needs: ["3-4"], hours: [9, 18], start: { street: "roofs", x: 600 }, reward: { respect: { chandni: 5, mandi: 3, kinara: 3 } },
    giveUp: swapBack, after: swapBack, steps: [
    { panels: [{ who: "crane", text: "Kaal listens to the phones now. So we talk the old way: by kite. Three districts, three messages. And his surveillance kites are up; cut them down as you go." }], then: swapTo("pCrane") },
    { find: [
      { street: "roofs", x: 1880, label: "Cut down the surveillance kite", guard: [["kaal", "kaal"]] },
      { street: "roofs", x: 1180, label: "Send the message to the Mandi", panels: [{ who: "N", text: "A red kite goes up with a paper twist on its string. On the Mandi roofs, a boy runs to Rafiq." }] },
      { street: "kinara", x: 1600, label: "Send the message to the Kinara", guard: [["biker", "kaal"]], panels: [{ who: "N", text: "From the sea wall, a kite with a cassette ribbon tail. DJ Rewind sees it from the club window and grins." }] },
      { street: "docks", x: 1200, label: "Send the message to the docks", guard: [["kaal", "kaal", "kaal"]], panels: [{ who: "N", text: "Machhi Mausi watches the kite come down onto her boat, unrolls the message and nods to her crews." }] }],
      obj: "As Cheel: cut Kaal's kite, then send the messages", time: 300 * 60, timeFail: "The messages didn't go in time. Kaal's men got there first" },
    { panels: [{ who: "crane", text: "Everyone knows. Everyone's ready. Now all we need is the film." }] }
  ] },
  "3-6": { act: 3, title: "Raghav's Kalari", needs: ["3-5"], hours: [8, 19], start: { street: "lane", x: 1500 }, reward: { respect: { chandni: 10 } },
    giveUp: swapBack, after: () => { swapBack(); progress.flags.kalari = true; }, steps: [
    { panels: [
      { who: "rook", text: "Nani's mother taught kalari here, in this lane, before any of us. I'm opening it again, in the ash. Today. And Kaal's men will come to stop it." },
      { who: "rook", text: "Hold the four posts. If they knock three down, the kalari's done before it starts." }], then: swapTo("pRook") },
    { protect: { street: "lane", x: 1500, stalls: [1440, 1500, 1560, 1620], hp: 30, waves: [["kaal", "kaal"], ["kaal", "bruiser", "kaal"], ["kaal", "kaal", "bruiser", "kaal"]], keep: 2, name: "The kalari", fail: "They knocked the posts down" }, obj: "As Raghav: hold the kalari" },
    { panels: [
      { who: "rook", text: "It stands. Now, you two. One move, the one Nani's mother used: you go up turning, and nobody standing near you stays standing." },
      { who: "N", text: "(Kalari whirl: hold forward and press special, as Rai or Kai. It costs 35 SP.)" }] }
  ] },
  "3-7": { act: 3, title: "Steel", needs: ["3-6"], hours: [17, 23], start: { street: "mandiRoad", x: 1440 }, reward: { respect: { kinara: 5 } },
    after: () => { progress.weather.kind = "showers"; }, steps: [
    { panels: [
      { who: "N", text: "Chhotu, breathless: \"A Kaal convoy! The reel, out of Kaal Heights, to a private vault. Down the coast road, now, in this rain!\"" },
      { who: "lakhan", text: "Rani. Go." }], then: () => { progress.weather = { kind: "storm", t: 3 * 3600, wet: 0, flood: 0.4 }; if (!progress.done.includes("s3-rani")) progress.done.push("s3-rani"); (progress.vehicles = progress.vehicles || {}).rani = { street: "kinara", x: 250 }; } },   // Lakhan lends Rani, side line done or not
    { ride: { street: "kinara", x: 300 }, obj: "To the coast road" },
    { race: { street: "kinara", from: 300, to: 2550, time: 26 * 60, ghost: 24 * 60, name: "the convoy" }, need: inRani, obj: "In Rani: catch the convoy truck before the vault (Saanp out-riders on the way)", checkpoint: true },
    { boss: { street: "kinara", x: 2600, kind: "steel", name: "Steel Sultan", waves: [["steel"]], adds: [[0.6, ["kaal", "kaal"]], [0.3, ["kaal", "bruiser"]]] }, obj: "Steel Sultan, on the stopped truck", checkpoint: true },
    { panels: [
      { who: "N", text: "In the back of the truck, wrapped in plastic: three cans. CHANDNI RAAT, ROLLS 7 TO 9. One of them is wet through." },
      { who: "kai", text: "Water got in. Will it still play?" },
      { who: "N", text: "Tiwari Dada, on the phone: \"Bring it to the old station cinema. There's a projector and a darkroom there nobody's touched since '87. Hurry. Wet film doesn't wait.\"" }] }
  ] },
  "3-8": { act: 3, title: "Monsoon", needs: ["3-7"], start: { street: "bunderRoad", x: 900 }, reward: { respect: { harbour: 5 } }, steps: [
    { panels: [{ who: "N", text: "The Harbour Line is under water. Knee-deep on the platforms, and the lights are out. Somewhere the wires are live." }], then: () => { progress.weather = { kind: "storm", t: 2 * 3600, wet: 0, flood: 1 }; } },
    { fight: { street: "platform", x: 600, name: "The flooded platform", waves: [["kaal", "kaal"], ["kaal", "studioGuard", "kaal"]] }, obj: "Get through the flooded platform to the old cinema", checkpoint: true },
    { go: { street: "booth", x: 200, r: 60 }, obj: "The old station cinema: the projection booth", checkpoint: true },
    { develop: true, obj: "In the darkroom: develop the reel" },
    { panels: [
      { who: "N", text: "In the tray, slowly, the lane comes up out of the white: the dhaba, the lamp, and behind it two men with cans. At 11:57." },
      { who: "N", text: "Tiwari Dada makes one copy, onto a hard drive Bunty brought, and holds the negative to his chest." },
      { who: "N", dark: 0.6, text: "Then the booth door bursts open. Kaal's men. They take the drive, and the negative, and they're gone into the rain before anyone can stand." },
      { who: "rai", text: "Kaal Heights. Tonight." }] }
  ] },
  "3-9": { act: 3, title: "Kaal Heights", needs: ["3-8"], start: { street: "heights", x: 700 }, reward: { respect: { harbour: 10 } }, steps: [
    { panels: [{ who: "N", text: "The tower stands over the plaza, glass from the ground to the clouds. Everyone you've helped is somewhere in the city, waiting for the film." }] },
    { fight: { street: "heightsLobby", x: 200, name: "The lobby", waves: [["kaal", "kaal", "kaal"], ["kaal", "studioGuard", "kaal"]] }, obj: "Kaal Heights: the lobby", checkpoint: true },
    { fight: { street: "heightsGym", x: 200, name: "The gym", waves: [["bruiser", "kaal"], ["bruiser", "bruiser", "kaal"]] }, obj: "Up to the gym: Steel's men", checkpoint: true },
    { panels: [{ who: "kai", text: "The server floor. They've deleted the digital copy, but deletions go into a log. I can roll it back. Give me two minutes and don't let anyone through that door." }] },
    { protect: { street: "heightsServer", x: 200, stalls: [300], hp: 40, waves: [["kaal", "kaal"], ["kaal", "lawyer", "kaal"], ["kaal", "kaal", "bruiser"]], keep: 1, name: "Hold the door", fail: "They got through the door; Kai's terminal is smashed" }, obj: "The server floor: hold the door while Kai rolls it back", checkpoint: true },
    { panels: [{ who: "kai", text: "Rolled back. The copy's on my phone. Now we just have to get out." }] },
    { fight: { street: "heightsBoard", x: 200, name: "The boardroom", waves: [["lawyer", "lawyer"], ["lawyer", "kaal", "lawyer"]] }, obj: "The boardroom: Kaal's lawyers", checkpoint: true },
    { panels: [{ who: "vikram", text: "You're on my roof, in my storm. Give me the phone and you can still walk down the stairs." }], then: () => { progress.weather = { kind: "storm", t: 3600, wet: 0, flood: 0 }; } },
    { boss: { street: "helipad", x: 320, kind: "vikram", name: "Vikram Kaal", waves: [["vikram"]], adds: [[0.5, ["kaal", "kaal"]]] }, obj: "The helipad: Vikram Kaal", checkpoint: true },
    { panels: [
      { who: "vikram", text: "It doesn't matter. The auction is at midnight. You can't show a film to a whole city by midnight." },
      { who: "rai", text: "Watch us." }] }
  ] },
  "3-10": { act: 3, title: "11:58", needs: ["3-9"], hours: [20, 24], start: { street: "kinara", x: 2300 }, after: () => startEpilogue(), steps: [
    { panels: [
      { who: "N", text: "Diwali night. Diyas along the sea wall, the whole city on the promenade. DJ Rewind has the old screen up and a generator humming behind it." },
      { who: "N", text: "The auction is at midnight. The screening starts at 11:50. Kaal's men will try to cut the power at 11:58, like every night." }],
      then: () => { progress.clock.min = 23 * 60 + 50; for (const d of Object.keys(TURF).filter(turfWon)) for (const k of TURF[d].allies) { fighterArt(SHEET_OF[k]); const a = fighter(k, rand(2200, 2500), rand(Y0 + 6, Y1 - 4), "p"); Object.assign(a, { ally: true, roam: true, aggro: false, wx: 2380, wt: 0, cool: 40 }); enemies.push(a); } } },
    { protect: { street: "kinara", x: 2400, stalls: [2460], hp: 60, waves: [["kaal", "kaal", "kaal"], ["kaal", "lawyer", "kaal", "bruiser"], ["kaal", "kaal", "bruiser", "kaal"]], keep: 1, name: "Defend the generator", fail: "The generator died. The screen went dark" }, obj: "Defend the generator while the film plays", checkpoint: true },
    { panels: [
      { who: "N", dark: 0.6, text: "On the screen: 11:57. Two men behind the dhaba, pouring from cans. The whole promenade goes quiet." },
      { who: "N", text: "11:58. The lights stay on." },
      { who: "N", text: "Inspector Godbole walks through the crowd to the front row, where an old man in a gold-buttoned waistcoat is trying to leave." },
      { who: "godbole", text: () => flag("broke") ? "Seth Dhanraj Kaal. You're under arrest. And you two: I still have your faces. I'm letting it go. Tonight." : "Seth Dhanraj Kaal. You're under arrest, for the fire on Chandni Lane, the night of 1987. Forty years late. By the book." },
      { who: "rollback", name: "Ranjit", text: "It wasn't me. Forty years, and it wasn't me." },
      { who: "nani", text: "I know, Ranjit. I always knew. Come home. Bring a plate." }] }
  ] }
});
// a step's line can depend on a choice made earlier (a function of the moment)
for (const id of ["3-10"]) for (const s of MISSIONS[id].steps) for (const p of s.panels || []) if (typeof p.text === "function") { const f = p.text; Object.defineProperty(p, "text", { get: f }); }

/* ---------- the Records Office: walk, don't run ---------- */
const PEONS = { records: [140, 290], records2: [230], records3: [110, 300] };
function updateSneak(s, st) {
  st.found = st.found || []; st.sus = st.sus || 0;
  const p = alivePlayers()[0]; if (!p) return false;
  const files = s.sneak.files, here = PEONS[street.id];
  if (here && !st.fight) {
    st.peons = st.peons || {}; const P0 = st.peons[street.id] || (st.peons[street.id] = here.map((x) => ({ x, d: 1, t: rand(0, 200) })));
    for (const q of P0) { q.t++; q.x += q.d * 0.5; if (Math.abs(q.x - here[P0.indexOf(q)]) > 50) q.d = -q.d; }
    const seen = P0.some((q) => Math.sign(p.x - q.x) === q.d && Math.abs(p.x - q.x) < 80);
    if (seen) st.sus += (p.st === "run" ? 3 : p.st === "walk" ? 0.4 : 0.1) * (disguised() ? 0.6 : 2);
    else st.sus = Math.max(0, st.sus - 0.25);
    if (st.sus >= 100) { st.fight = { x: p.x, name: "Spotted among the files", waves: [["peon", "peon", "kaal"], ["peon", "kaal"]] }; startArena(st.fight); banner = { text: "Spotted!", t: 90, big: true }; }
  }
  if (st.fight && st.fight.done) { st.fight = null; st.sus = 0; }
  return st.found.length >= files.length;
}
function sneakTarget(p) {
  const s = mission && mission.def.steps[mission.i], st = mission && mission.st; if (!s || !s.sneak || st.fight) return null;
  const k = s.sneak.files.findIndex(([id, x]) => id === street.id && Math.abs(x - p.x) < 22 && !(st.found || []).includes(id));
  if (k < 0) return null;
  const [id] = s.sneak.files[k];
  return { label: "Search the files", x: s.sneak.files[k][1], y: Y0 - 48, act: () => { (st.found = st.found || []).push(id); texts.push({ x: p.x, y: p.y - 70, s: st.found.length < 3 ? "Not here. Upstairs." : "FIRE BRIGADE, 1987. Found it.", t: 90 }); } };
}
function drawSneak() {
  const s = mission && mission.def.steps[mission.i], st = mission && mission.st; if (!s || !s.sneak || !st.peons || !st.peons[street.id]) return;
  for (const q of st.peons[street.id]) { const x = Math.round(q.x - cam); drawCivLook("civ_d", 0, x + cam, Y0 + 8, q.d, Math.floor(q.t / 20) % 2 ? "walk" : "stand", q.t * 0.05); text(Math.sign(players[0].x - q.x) === q.d && Math.abs(players[0].x - q.x) < 80 ? "?" : "", x, Y0 - 44, 9, "#c0392b"); }
  if (st.sus > 1) { g.setTransform(SCALE, 0, 0, SCALE, 0, 0); const w = 80, x = LW / 2 - w / 2; R(x - 2, 28, w + 4, 9, "rgba(14,13,12,0.7)"); R(x, 30, w * Math.min(1, st.sus / 100), 5, st.sus > 66 ? CB(1) : "#f2c230"); text("SUSPICION", LW / 2, 43, 5, "#f7f4ee"); }
}
// a townsperson drawn from their own sheet, anywhere (the peons)
function drawCivLook(look, base, wx, y, face, st, ph) { drawCiv({ civ: true, look, base, x: wx, y, face, st, walkPh: ph }, PAL); }

/* ---------- the epilogue: the next morning, the lane rebuilt, everybody out ---------- */
let credits = null;
const epilogueOn = () => flag("rebuilt");
// the lane the morning after: Bhola and Ranjit, and the gangs of every district you won, out with bricks
WORLD.streets.lane.npcs = (WORLD.streets.lane.npcs || []).concat(
  { kind: "ox", x: 1360, y: 170, needs: "3-10" }, { kind: "rollback", x: 1290, y: 166, needs: "3-10" },
  { kind: "wrestler", x: 980, y: 176, needs: "3-10", when: () => turfWon("mandi") }, { kind: "porter", x: 1700, y: 172, needs: "3-10", when: () => turfWon("mandi") },
  { kind: "biker", x: 2000, y: 174, needs: "3-10", when: () => turfWon("kinara") }, { kind: "netman", x: 2150, y: 170, needs: "3-10", when: () => turfWon("docks") });
const EPILOGUE_CAST = [
  { who: "tiwari", street: "lane", x: 1180 }, { who: "masterji", street: "lane", x: 1560 }, { who: "bunty", street: "lane", x: 1820 }];
function startEpilogue() {
  progress.flags.rebuilt = true; progress.flags.ending = true; progress.clock.day++; progress.clock.min = 8 * 60; progress.weather = { kind: "clear", t: 3600, wet: 0, flood: 0 };
  travelTo("lane", 300);
  setTimeout(() => {
    say([{ who: "N", text: "The next morning. Chandni Lane is full of people with bricks: vendors, wrestlers, dock crews, bikers, a director with a megaphone shouting \"Cut! Again!\" at a wall going up." },
      { who: "N", text: "The dhaba is open. On the counter, Ranjit's card: \"Table for everyone? R.\"" },
      { who: "nani", text: "Nothing goes back. But some things come out." },
      { who: "N", text: "(Walk down the lane.)" }], () => { credits = { t: 0 }; });
  }, 900);
}
const CREDITS = ["ROLLBACK CITY", "a game by Abhishek Rai", "Chandni Lane, Bunderpur", "Rai and Kai", "Nani", "Ranjit", "Bhola the Ox", "Raghav and Cheel", "Lakhan, Rafiq, Machhi Mausi", "DJ Rewind and the Neon Saanp", "Chhotu and Moti", "Inspector Godbole", "Tiwari Dada, Master-ji, Bunty",
  () => Object.keys(TURF).filter(turfWon).length + " of 3 districts stood with the lane", () => flag("broke") ? "Ranjit came out over a wall" : "Ranjit came out on bail", "Thank you for playing", "The city is still open: keep walking"];
function updateCredits() { if (credits && state === "play" && !scene && ++credits.t > CREDITS.length * 240 + 120) { credits = null; banner = { text: "The End. The city goes on", t: 240, big: true }; saveGame(true); } }
function drawCredits() {
  if (!credits) return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const k = Math.floor(credits.t / 240), a = Math.min(1, (credits.t % 240) / 40, (240 - credits.t % 240) / 40), line = CREDITS[k];
  if (!line) return;
  g.globalAlpha = a; text(typeof line === "function" ? line() : line, LW / 2, 64, k === 0 ? 14 : 8, "#f7f4ee", "center", "Newsreader"); g.globalAlpha = 1;
}

/* ---------- hooks ---------- */
function updateAct3() { updateCredits(); }
function act3Target(p) { return sneakTarget(p); }
function drawAct3(P) { drawAct3People(); drawSneak(); }
function drawAct3Hud() { drawDevelop(); drawCredits(); }
