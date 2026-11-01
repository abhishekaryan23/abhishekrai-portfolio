/* Rollback City: the Act 3 side lines (DESIGN 6.1, S10 to S16; 4.10 of the plan). A plain script that
   shares globals with the others; index.html loads them in order.

   S10 Ctrl+Z: Bunty's five "fix the server" puzzles (it's always DNS); the prize is map intel (the
   lost tapes, Nani's recipes and Tiwari's reels on your map) and the Ghost Deploy cabinet in the
   cafe. S11 Stunt Double: Master-ji's eight gigs on the studio sets, one a day; the hero's costume,
   and his flying kick. S12 Godown No. 9 is the ring at the docks (Phase 3). S13 Nani's Recipes:
   twelve cards about the city, cooked at home (two cards a dish) for a dish of the day. S14
   Tiwari's Reels: six cans of his old film, and a VHS or 1987 look for the screen (the phone's Reels
   button). S15 The Baraat: a nervous groom's procession, a band to lead and a rival family's
   crashers. S16 Dahi Handi: the Mandi's pot-breaking contest, a pyramid built tier by tier. */
"use strict";

/* ---------- S10: Ctrl+Z ---------- */
const PUZZLES = [
  ["bunderpur.local is down. The server's up, ping works, nobody can reach the site.", ["It's DNS. It's always DNS", "Restart the router", "Blame the intern"]],
  ["Friday, 5:55 pm. The boss wants the fix live right now.", ["Deploy on Monday", "Deploy now, what could go wrong", "Turn off the alerts first"]],
  ["The disk is full: 40 GB of a file called debug.log.", ["Rotate the logs", "Delete the database", "Buy a bigger disk"]],
  ["\"It works on my machine,\" says the developer.", ["Make the versions match", "Ship his machine to the customer", "Add another if-statement"]],
  ["Production is on fire, and the last change was yours.", ["Roll it back", "Push a hotfix to the hotfix", "Close the laptop and go home"]]];
const BUNTY_NO = ["Bunty: \"Tried that. Twice. Think again.\"", "Bunty: \"That's how we got here.\"", "Bunty laughs so hard he has to take his glasses off."];
MISSIONS["s10-ctrlz"] = { side: true, title: "Ctrl+Z", start: { street: "cafe", x: 200 }, reward: { rs: 500 }, flags: ["intel"],
  after: () => message("Bunty: Your map knows where my contacts found tapes, recipe cards and film cans. And the cabinet in the corner is yours whenever you want."), steps: [
    { panels: [{ who: "N", text: "Bunty spins his chair round. \"Five servers in this city are down, and I'm out of tea. You fix, I'll type.\"" }] },
    ...PUZZLES.map(([q, opts], k) => ({ choice: { title: "Server " + (k + 1) + " of 5", text: q, options: opts.map((o, j) => ({ label: o, ok: () => j === 0, no: () => pick(BUNTY_NO) })) } })),
    { panels: [{ who: "N", text: "Five green lights. Bunty stands up, bows to the room, and the three customers in it clap politely." }] }] };
// the Ghost Deploy cabinet (the site's other game) in the cafe's corner, once the servers are up
function cabinetTarget(p) {
  if (street.id !== "cafe" || Math.abs(p.x - 300) > 22 || !flag("intel") || mission) return null;
  return { label: "Play Ghost Deploy on the old cabinet", x: 300, y: Y0 - 48, act: () => { try { window.open("/game/", "_blank", "noopener"); } catch (e) { /* ignore */ } } };
}

/* ---------- S11: Stunt Double ---------- */
const GIGS = ["the mythology set", "the western set", "the village set", "a car chase (on foot)", "a fall from the water tower", "a fight on the palace stairs", "the hero's double, in the rain", "the climax, in one take"];
MISSIONS["s11-gig"] = { side: true, title: "Stunt gig", start: { street: "sitara", x: 360 }, make: () => {
  const n = progress.gigs || 0;
  return [
    { panels: [{ who: "N", text: "Master-ji, through the megaphone: \"Gig " + (n + 1) + " of 8: " + GIGS[n] + ". Hit your marks. The camera loves a liar.\"" }] },
    { dance: { street: "sitara", x: 360, need: 7 + n, notes: 10 + n, stunt: true, fail: "Cut! CUT! Tomorrow. With feeling." }, obj: "Hit your marks for the camera" },
    { panels: [{ who: "N", text: n === 7 ? "\"Print it! That's a career!\" Master-ji gives you the hero's costume off the rail and shows you his flying kick: run, jump, and kick in the air. (A new costume; the flying kick from a standing jump.)" : "\"Print it. Not bad. Come back tomorrow.\"" }],
      then: () => { progress.gigs = n + 1; progress.gigDay = progress.clock.day; earn(250 + n * 50); if (n === 7) { progress.flags.flykick = true; Arcade.secret("hero"); } } }];
} };
function gigTarget(p) {
  if (street.id !== "sitara" || Math.abs(p.x - 360) > 24 || mission || arena || !progress.done.includes("3-2") || (progress.gigs || 0) >= 8 || !hourIn([9, 19])) return null;
  if (progress.gigDay === progress.clock.day) return { label: "Master-ji: one gig a day", x: 360, y: Y0 - 48, act: () => {} };
  return { label: "Stunt gig " + ((progress.gigs || 0) + 1) + " of 8", x: 360, y: Y0 - 48, act: () => startMission("s11-gig") };
}

/* ---------- S13: Nani's Recipes, and S14: Tiwari's Reels (things to find) ---------- */
const RECIPES = [["mandiRoad", 300], ["truckYard", 900], ["weighbridge", 300], ["kinara", 500], ["docks", 2000], ["ghat", 200], ["bunderRoad", 1000], ["gali", 400], ["roofs", 300], ["mandiGate", 700], ["sitara", 1100], ["heights", 300]];
const DISHES = [
  { id: "chai", name: "Nani's adrak chai", does: "SP fills twice as fast" }, { id: "omelette", name: "Masala omelette", does: "more grit: knockdowns hurt less" },
  { id: "poha", name: "Poha", does: "quicker on your feet" }, { id: "kheer", name: "Kheer", does: "one free revive today" },
  { id: "vadapav", name: "Vada pav", does: "harder hits" }, { id: "khichdi", name: "Dal khichdi", does: "more health today" }];
const REELS = [["lane", 2200], ["kinara", 2700], ["platform", 1200], ["millGate", 400], ["sitara", 1700], ["roofs", 2000]];
const got = (k) => (progress[k] || []);
function findTarget(p) {
  if (mission || arena) return null;
  const card = progress.done.includes("2-9") && RECIPES.findIndex(([s, x], k) => s === street.id && Math.abs(x - p.x) < 18 && !got("recipes").includes(k));
  if (card !== false && card >= 0) return { label: "A recipe card, in Nani's hand", x: RECIPES[card][1], y: Y0 - 40, act: () => { (progress.recipes = got("recipes")).push(card); texts.push({ x: p.x, y: p.y - 74, s: "Recipe card " + progress.recipes.length + " of 12", t: 100 }); if (progress.recipes.length % 2 === 0) message("Nani: You found my " + DISHES[progress.recipes.length / 2 - 1].name + "! Cook it at home and see."); saveGame(true); } };
  const can = progress.done.includes("3-1") && REELS.findIndex(([s, x], k) => s === street.id && Math.abs(x - p.x) < 18 && !got("reels").includes(k));
  if (can !== false && can >= 0) return { label: "A can of film", x: REELS[can][1], y: Y0 - 40, act: () => { (progress.reels = got("reels")).push(can); texts.push({ x: p.x, y: p.y - 74, s: "Tiwari's reel " + progress.reels.length + " of 6", t: 100 }); if (progress.reels.length === 3) message("Tiwari Dada: Three of my old cans! I've put a 1987 film look on your phone (Reels)."); if (progress.reels.length === 6) message("Tiwari Dada: All six. Here's my VHS look too. Don't tell anyone I shot weddings."); saveGame(true); } };
  return null;
}
function drawFinds() {
  const dot = (x, col) => { const sx = Math.round(x - cam); if (sx < -10 || sx > LW + 10) return; R(sx - 3, Y0 + 12, 6, 4, col); R(sx - 3, Y0 + 12, 6, 1, "#1d1b18"); collectCue(x, Y0 + 13); };
  if (progress.done.includes("2-9")) RECIPES.forEach(([s, x], k) => { if (s === street.id && !got("recipes").includes(k)) dot(x, "#f2e6c8"); });
  if (progress.done.includes("3-1")) REELS.forEach(([s, x], k) => { if (s === street.id && !got("reels").includes(k)) dot(x, "#3a3a44"); });
}
// cooking at home: two cards a dish, one dish a day, and its good lasts the day
const buffToday = (id) => progress.buff && progress.buff.id === id && progress.buff.day === progress.clock.day;
function cookTarget(p) {
  const known = Math.floor(got("recipes").length / 2); if (!known || !street.savePoint || Math.abs(p.x - (street.bed || 28) - 40) > 18 || mission) return null;
  return { label: buffToday(progress.buff && progress.buff.id) ? "Today's dish: " + DISHES.find((d) => d.id === progress.buff.id).name : "Cook one of Nani's recipes", x: (street.bed || 28) + 40, y: Y0 - 48, act: () => {
    if (progress.buff && progress.buff.day === progress.clock.day) return;
    choose("Nani's recipes", "One dish a day. What's cooking?", DISHES.slice(0, known).map((d) => ({ label: d.name + ": " + d.does, act: () => { progress.buff = { id: d.id, day: progress.clock.day, used: false }; if (d.id === "khichdi") for (const q of players) if (q) q.hp = Math.min(q.max + 16, q.hp + 16); texts.push({ x: p.x, y: p.y - 74, s: d.name + "! " + d.does, t: 120 }); } })).concat({ label: "Not now", act: () => {} }));
  } };
}
// the screen looks from Tiwari's reels
const FILTERS = ["none", "1987", "vhs"];
function cycleFilter() { const have = FILTERS.filter((f, k) => k === 0 || (k === 1 && got("reels").length >= 3) || (k === 2 && got("reels").length >= 6)); progress.filter = have[(have.indexOf(progress.filter || "none") + 1) % have.length]; banner = { text: "Screen: " + { none: "plain", 1987: "1987 film", vhs: "VHS" }[progress.filter], t: 90 }; }
function drawFilter() {
  const f = progress.filter; if (!f || f === "none") return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (f === "1987") { g.globalAlpha = 0.22; R(0, 0, LW, LH, "#7a5a2a"); g.globalAlpha = 1; for (let k = 0; k < 40; k++) R(Math.random() * LW, Math.random() * LH, 1, 1, "rgba(255,240,210,0.3)"); if (frameNo % 70 < 2) R(Math.random() * LW, 0, 1, LH, "rgba(255,240,210,0.35)"); }
  else { for (let y = 0; y < LH; y += 3) R(0, y, LW, 1, "rgba(0,0,0,0.12)"); g.globalAlpha = 0.08; R(1, 0, LW, LH, "#ff2a6a"); R(-1, 0, LW, LH, "#2ad8ff"); g.globalAlpha = 1; const j = (frameNo % 300) < 6 ? 2 : 0; if (j) R(0, (frameNo * 7) % LH, LW, 4, "rgba(255,255,255,0.15)"); }
}

/* ---------- S15: The Baraat, and S16: Dahi Handi ---------- */
KINDS.crasher = { hp: 24, speed: 1, scale: 1, look: "kicker", name: "Rival family", score: 150, windup: 14, cool: [50, 85], moves: ["ePunch", "eKick", "eShove"], coward: true, cash: 30 };
SHEET_OF.crasher = "kicker";
MISSIONS["s15-baraat"] = { side: true, title: "The Baraat", start: { street: "mandiGate", x: 900 }, reward: { rs: 1200, respect: { mandi: 5 } }, after: () => Arcade.secret("sherwani"), steps: [
  { panels: [
    { who: "N", text: "A groom on a white horse, sweating through his sherwani. \"The baraat has to cross half the city to the wedding hall. The band won't start, the horse is nervous, and my bride's cousins have sworn to stop us. Please.\"" }] },
  { dance: { street: "mandiGate", x: 900, need: 9, notes: 12, fail: "The band lost the beat; the procession stopped dead" }, obj: "Lead the band: get the baraat dancing" },
  { protect: { street: "mandiGate", x: 1300, stalls: [1300], hp: 40, waves: [["crasher", "crasher"], ["crasher", "crasher", "crasher"]], keep: 1, name: "The horse", fail: "The horse bolted" }, obj: "Keep the crashers off the groom's horse", checkpoint: true },
  { panels: [{ who: "N", text: "The baraat reaches the hall dancing. The groom presses a sherwani on you, his spare: \"You're family now. Everybody is, at a wedding.\" (The wedding sherwani: a new costume.)" }] }] };
MISSIONS["s16-handi"] = { side: true, title: "Dahi Handi", start: { street: "mandiRoad", x: 1100 }, reward: { rs: 800, respect: { mandi: 8 } }, steps: [
  { panels: [{ who: "N", text: "Festival day in the Mandi: a clay pot of curd strung high over the road, a crowd with buckets of water, and a team one climber short. \"You! Up the middle. Steady on each tier, or we all come down.\"" }] },
  { haul: { need: 4, misses: 3, street: "mandiRoad" }, time: 60 * 60, timeFail: "The pyramid came down in a heap. Everyone's laughing, nobody's hurt", obj: "Build the pyramid: steady (punch) when the needle's in the green" },
  { panels: [{ who: "N", text: "On the fourth tier you reach up, and the pot breaks over everyone. The Mandi roars. Rafiq hands you the trophy, a steel pot with a ribbon." }], then: () => { progress.flags.handi = true; } }] };
// the haul gauge is reused for the pyramid (on any street, not just at sea)
function sideStart(p) {
  if (mission || arena || !clockRuns()) return null;
  if (street.id === "cafe" && Math.abs(p.x - 200) < 24 && progress.done.includes("3-3") && !progress.done.includes("s10-ctrlz")) return { label: "Bunty: \"Ctrl+Z?\"", x: 200, y: Y0 - 48, act: () => startMission("s10-ctrlz") };
  if (street.id === "mandiGate" && Math.abs(p.x - 900) < 24 && progress.done.includes("3-1") && !progress.done.includes("s15-baraat") && hourIn([10, 19])) return { label: "A nervous groom on a white horse", x: 900, y: Y0 - 48, act: () => startMission("s15-baraat") };
  if (street.id === "mandiRoad" && Math.abs(p.x - 1100) < 24 && progress.done.includes("3-1") && !progress.done.includes("s16-handi") && hourIn([9, 18])) return { label: "Dahi Handi: join the pyramid", x: 1100, y: Y0 - 48, act: () => startMission("s16-handi") };
  return null;
}
// the groom on his horse and the pot over the road, while those lines are open
function drawSideScenes() {
  if (street.id === "mandiGate" && progress.done.includes("3-1") && !progress.done.includes("s15-baraat")) { const x = Math.round(((mission && mission.id === "s15-baraat") ? 1300 : 900) - cam); if (x > -40 && x < LW + 40) { R(x - 16, Y0 - 8, 32, 14, "#f2f0ea"); R(x + 12, Y0 - 18, 8, 12, "#f2f0ea"); for (const lx of [-12, -6, 8, 14]) R(x + lx, Y0 + 6, 3, 12, "#e8e4da"); R(x - 4, Y0 - 32, 10, 24, "#c9a227"); R(x - 3, Y0 - 40, 8, 8, "#a8704a"); R(x - 5, Y0 - 44, 12, 4, "#c0392b"); } }
  if (street.id === "mandiRoad" && progress.done.includes("3-1") && !flag("handi")) { const x = Math.round(1100 - cam); if (x > -40 && x < LW + 40) { g.strokeStyle = "#5a4a38"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 90, 40); g.quadraticCurveTo(x, 60, x + 90, 40); g.stroke(); R(x - 7, 56, 14, 11, "#b8603c"); R(x - 8, 55, 16, 3, "#8a4a2a"); R(x - 5, 52, 10, 3, "#f2f0ea"); } }
}

/* ---------- hooks ---------- */
function side2Target(p) { return sideStart(p) || gigTarget(p) || cabinetTarget(p) || findTarget(p) || cookTarget(p); }
function drawSide2(P) { drawFinds(); drawSideScenes(); }
// Nani's adrak chai: SP fills on its own
function updateSide2() { if (frameNo % 60 === 0 && buffToday("chai")) for (const p of alivePlayers()) p.sp = Math.min(100, p.sp + 2); }
