/* Rollback City: money, and waking up after a bad night (DESIGN 7.2).
   A plain script that shares globals with the others; index.html loads them in order.

   Money arrives with Act 2 (once the clock runs): the ₹ counter takes the score's place in the HUD,
   knocked-out gang members drop a little cash, and it is saved with the game. Knocked out outside
   a mission, you wake at Dr. Mehta's clinic on Chandni Lane, ten per cent poorer for the bill;
   arrested (the police, step 2.7), you wake at the Bunder Road thana, pay a fine and lose your
   weapon. */
"use strict";

const hasMoney = () => clockRuns();
const money = () => progress.money || 0;
const rupees = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
function earn(n, p) {
  if (!hasMoney() || !n) return;
  progress.money = Math.max(0, money() + Math.round(n));
  const q = p || alivePlayers()[0] || players[0];
  if (q) texts.push({ x: q.x, y: q.y - 72, s: (n > 0 ? "+" : "−") + rupees(Math.abs(n)), t: 70 });
}
// a knocked-out gang member's pocket money (not the police's)
function dropCash(e) {
  const k = KINDS[e.kind];
  if (!hasMoney() || k.police || e.runner || e.ally) return;
  const n = k.cash !== undefined ? k.cash : 20;
  if (n > 0) items.push({ kind: "cash", amount: Math.round(n * rand(0.6, 1.4) / 5) * 5, x: e.x + rand(-6, 6), y: e.y, z: 12, vz: 2 });
}
// a forced story panel (shown even with cutscenes off): wake-up notes, receipts
function say(panels, then) {
  const was = storyOn; storyOn = true;
  playScene(null, () => { storyOn = was; if (then) then(); }, panels);
}
// the morning after: everyone up again (lives refilled), somewhere safe, a little poorer
function wakeUp(where, x, panels, cost) {
  mission = null; state = "play"; paused = false; showCard(null); progress.heat = 0; jeep = null; sitting = null;
  if (scene) { scene = null; $("stage-wrap").classList.remove("story"); }
  for (const p of players) if (p) { p.lives = KINDS[p.kind].guest ? 1 : EASY ? 5 : 3; p.hp = p.max; p.inv = 90; setState(p, "idle"); }
  loadStreet(where, x);
  if (cost) progress.money = Math.max(0, money() - cost);
  say(panels, () => saveGame(true));
}
function wakeAtClinic() {
  const bill = Math.round(money() * 0.1 / 10) * 10;
  wakeUp("clinic", 200, [
    { who: "N", dark: 0.7, text: "A ceiling fan turning slowly, the smell of antiseptic, and somebody eating a samosa very close to your ear." },
    { who: "mehta", text: pick(["Nothing broken. Some pride, maybe. That is not my department.", "You again. Sit up slowly, and do not fight anyone on the way out.", "Two stitches and a lecture. The stitches were free."]) + (bill ? " The bill is " + rupees(bill) + "." : " Pay me when you have money.") }
  ], bill);
}
function arrest() {
  const fine = Math.max(200, Math.round(money() * rand(0.1, 0.25) / 10) * 10);   // the duty officer's mood
  for (const p of players) if (p) p.weapon = null;
  wakeUp("thana", 120, [
    { who: "N", dark: 0.7, text: "A wooden bench, a ledger the size of a door, and the smell of files nobody has opened since the British left: the Bunder Road thana." },
    { who: "N", text: "The duty officer counts out your fine (" + rupees(Math.min(fine, money())) + ") and keeps whatever you were carrying. \"Next time, beta, fight somewhere else.\"" }
  ], fine);
}

/* the clinic and the thana: one screen each */
function drawRoom(P, kind) {
  const x0 = Math.round(-cam), d = P.dark;
  const clinic = kind === "clinic", wall = clinic ? (d ? "#4a5a5a" : "#d8e6e2") : (d ? "#4a4a3a" : "#d8d2b0"), low = shade(wall, -0.15);
  R(0, 0, LW, LH, wall); R(0, 0, LW, 18, shade(wall, -0.3)); R(0, 96, LW, 54, low); R(0, 95, LW, 2, shade(wall, -0.35));
  R(0, 150, LW, LH - 150, clinic ? (d ? "#3a4446" : "#c9d2d0") : (d ? "#3a3830" : "#a89c80"));
  for (let y = 150; y < LH; y += 12) R(0, y, LW, 1, shade(wall, -0.4));
  R(x0 + 160, 22, 64, 3, P.lamp); g.globalAlpha = d ? 0.14 : 0.07; g.fillStyle = P.lamp; g.beginPath(); g.ellipse(x0 + 192, 30, 90, 22, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  // the door out, on the right
  R(x0 + 334, 66, 36, 86, P.trim); R(x0 + 338, 70, 28, 80, d ? "#141822" : "#5d6b78");
  if (clinic) {
    // a bed with a white sheet, a cabinet with a red cross, the doctor's desk and his snacks
    R(x0 + 30, 120, 90, 8, "#e9ecef"); R(x0 + 30, 128, 90, 4, "#9aa3ab"); R(x0 + 32, 132, 3, 18, "#6a737b"); R(x0 + 115, 132, 3, 18, "#6a737b"); R(x0 + 32, 112, 22, 10, "#f7f8fa");
    R(x0 + 150, 50, 40, 60, "#f2f4f6"); R(x0 + 152, 52, 36, 56, "#e2e6ea"); R(x0 + 167, 64, 6, 18, "#c0392b"); R(x0 + 161, 70, 18, 6, "#c0392b");
    R(x0 + 220, 116, 80, 6, d ? "#5a3a24" : "#8a5d3b"); R(x0 + 224, 122, 4, 28, d ? "#4a3020" : "#7a5233"); R(x0 + 292, 122, 4, 28, d ? "#4a3020" : "#7a5233");
    R(x0 + 240, 108, 14, 8, "#d9a441"); R(x0 + 262, 110, 18, 6, "#f7f8fa");
    text("DR. MEHTA, M.B.B.S.", x0 + 260, 44, 6, d ? "#e9e4d8" : "#2a2622");
    drawNaniInBed(P);
  } else {
    // the duty desk, files, a wanted board and a cell with bars
    R(x0 + 20, 40, 100, 110, d ? "#26241e" : "#4a4636"); for (let bx = 24; bx < 120; bx += 8) R(x0 + bx, 40, 2, 110, d ? "#8a8478" : "#b8b2a2"); R(x0 + 20, 40, 100, 3, "#8a8478");
    R(x0 + 160, 116, 110, 6, d ? "#5a3a24" : "#8a5d3b"); R(x0 + 164, 122, 4, 28, d ? "#4a3020" : "#7a5233"); R(x0 + 262, 122, 4, 28, d ? "#4a3020" : "#7a5233");
    for (let k = 0; k < 3; k++) R(x0 + 176 + k * 6, 100 - k * 4, 30, 4 + k * 4, k % 2 ? "#c8b48e" : "#e2d2a8");
    R(x0 + 200, 40, 70, 44, d ? "#8a6a44" : "#c8a070"); text("WANTED", x0 + 235, 50, 6, "#7a2230");
    for (let k = 0; k < 3; k++) { R(x0 + 206 + k * 20, 56, 16, 22, "#f7f1e3"); R(x0 + 210 + k * 20, 60, 8, 8, "#5a4a36"); }
    text("BUNDER ROAD POLICE STATION", x0 + 192, 30, 6, d ? "#e9e4d8" : "#2a2622");
  }
}

/* ---------- shops, food and stats (DESIGN 7.4) ----------
   Each shop is a room behind its door (open 9 to 9) with a counter that opens its buy list. Food
   heals; the first taste of each dish at each shop raises one of the five stats for good; three
   helpings in a row means a burp and a slow walk. A haggle (once a visit) is a timing meter: stop
   it in the green for a discount, in the red and the shopkeeper puts the price up. */
const STATS = { health: "Health", strength: "Strength", speed: "Speed", chai: "Chai", grit: "Grit" };
const STAT_MAX = 5;
const stat = (n) => (progress.stats && progress.stats[n]) || 0;
// what the stats do: max health, damage, speed, SP from landing hits, how much it takes to stagger you
const dish = (id) => typeof buffToday === "function" && buffToday(id);   // a dish of the day from Nani's recipes
const statHp = () => stat("health") * 8 + (dish("khichdi") ? 16 : 0);
const statDmg = () => 1 + stat("strength") * 0.1 + (dish("vadapav") ? 0.12 : 0);
const statSpeed = () => 1 + stat("speed") * 0.06 + (dish("poha") ? 0.08 : 0);
const statSp = () => 1 + stat("chai") * 0.2;
const statGrit = () => Math.ceil(stat("grit") / 2) + (dish("omelette") ? 1 : 0);
function raiseStat(n) {
  progress.stats = progress.stats || {};
  if (stat(n) >= STAT_MAX) return false;
  progress.stats[n] = stat(n) + 1;
  if (n === "health") for (const p of players) if (p) { p.max += 8; p.hp += 8; }   // as statHp
  return true;
}
// a fighter's own numbers, from the stats (called when a player joins)
function applyStats(p) { const extra = statHp(); p.max += extra; p.hp += extra; }

const SHOPS = {
  chaiShop:   { name: "Chai stall", keeper: ["civ_c", 0], colour: "#7a4a2a", stock: [
    { id: "chai", name: "Cutting chai", price: 10, sp: 40, stat: "chai", desc: "+40 SP" },
    { id: "bunmaska", name: "Bun maska", price: 25, heal: 20, stat: "health", desc: "+20 health" },
    { id: "goldfizz", name: "Gold Fizz", price: 12, sp: 25, desc: "+25 SP" }, { id: "goldfiz", name: "Gold Fiz", price: 4, sp: 25, fake: true, desc: "+25 SP, says the label" }] },
  sweetShop:  { name: "Sweets", keeper: ["civ_c", 0], colour: "#c86a2a", stock: [
    { id: "samosa", name: "Samosa", price: 15, heal: 30, stat: "health", desc: "+30 health" },
    { id: "jalebi", name: "Jalebi", price: 20, heal: 15, sp: 20, stat: "speed", desc: "+15 health, +20 SP" }] },
  paanShop:   { name: "Paan shop", keeper: ["civ_a", 4], colour: "#2f6b3a", stock: [
    { id: "paan", name: "Meetha paan", price: 20, sp: 30, stat: "grit", desc: "+30 SP" }] },
  kiranaShop: { name: "Kirana store", keeper: ["civ_d", 0], colour: "#2b54a8", stock: [
    { id: "biscuits", name: "Glucose biscuits", price: 5, heal: 10, stat: "strength", desc: "+10 health" },
    { id: "umbrella", name: "Umbrella", price: 200, weapon: "umbrella", desc: "swings like a lathi, stops thrown knives, keeps the rain off" },
    { id: "umbrela", name: "Umbrela (Made in Japn)", price: 60, weapon: "umbrella", fake: true, desc: "just as good, says the kirana man" }] },
  // the city's other first tastes, at stalls on the street
  bhelCart:   { name: "Bhel cart", keeper: ["civ_h", 0], colour: "#e2701c", stock: [{ id: "bhel", name: "Bhel puri", price: 6, heal: 20, stat: "speed", desc: "+20 health" }, { id: "golagola", name: "Gola", price: 3, sp: 15, desc: "+15 SP" }] },
  vadaStall:  { name: "Vada pav stall", keeper: ["civ_c", 0], colour: "#c86a2a", stock: [{ id: "vadapav", name: "Vada pav", price: 5, heal: 30, stat: "health", desc: "+30 health" }, { id: "cuttingM", name: "Cutting chai", price: 3, sp: 30, desc: "+30 SP" }] },
  fishFry:    { name: "Fish fry", keeper: ["civ_h", 4], colour: "#2b54a8", stock: [{ id: "fishfry", name: "Bombil fry", price: 12, heal: 35, stat: "grit", desc: "+35 health" }, { id: "solkadhi", name: "Sol kadhi", price: 5, sp: 25, desc: "+25 SP" }] },
  clubBar:    { name: "Club 1987 bar", keeper: ["dancers", 1], colour: "#c96bd8", stock: [{ id: "nimbusoda", name: "Nimbu soda", price: 8, sp: 40, stat: "chai", desc: "+40 SP" }, { id: "goldfizzC", name: "Gold Fizz", price: 15, sp: 25, desc: "+25 SP, club prices" }] },
  tailorShop: { name: "Masterji, tailor", keeper: ["civ_b", 4], colour: "#5b45a8", stock: [
    { id: "kurta", name: "A new kurta", price: 350, clothes: true, desc: "a change of clothes: the police stop looking for you" },
    { id: "disguise", name: "A clerk's disguise", price: 200, disguise: true, desc: "glasses, a pen and a tired tie: goondas look right through you, until you throw a punch" }] }
};
let shopVisit = null;   // { id, haggled, mul }
let stall = null;   // a street stall's shop (the bhel cart, the vada pav stall), open while you stand at it
const shopOf = () => (stall && SHOPS[stall]) || (street && street.shop && SHOPS[street.shop]);
// prices go up a little for strangers to the district and down for its heroes (respect, step 2.7)
const priceMul = () => (typeof respectMul === "function" ? respectMul() : 1) * (shopVisit ? shopVisit.mul : 1);
const priceOf = (it) => Math.max(1, Math.round(it.price * priceMul()));
function openShop() {
  const s = shopOf(); if (!s) return;
  const sid = stall || street.id;
  if (!shopVisit || shopVisit.id !== sid) shopVisit = { id: sid, haggled: false, mul: 1, day: progress.clock.day };
  paused = true; down.clear(); buildShop(); showCard("card-shop");
}
function closeShop() { haggle = null; stall = null; $("haggle").hidden = true; paused = false; showCard(null); }
function openStall(id) { stall = id; openShop(); }
function buildShop() {
  const s = shopOf(), box = $("shop-list");
  $("shop-name").textContent = s.name; $("shop-money").textContent = rupees(money());
  box.innerHTML = "";
  for (const it of s.stock) {
    const b = document.createElement("button"); b.type = "button"; b.className = "btn ghost slot";
    const fresh = it.stat && !(progress.tasted || []).includes(street.id + ":" + it.id) && stat(it.stat) < STAT_MAX;
    b.textContent = it.name + "  " + rupees(priceOf(it)) + "  (" + it.desc + (fresh ? "; first taste: +1 " + STATS[it.stat] : "") + (it.fake && respect() >= 70 ? "; looks fake to you" : "") + ")";
    b.disabled = money() < priceOf(it);
    b.addEventListener("click", () => buy(it));
    box.appendChild(b);
  }
  $("shop-haggle").hidden = shopVisit.haggled; $("shop-msg").textContent = shopVisit.mul < 1 ? "Haggled: " + Math.round((1 - shopVisit.mul) * 100) + "% off" : shopVisit.mul > 1 ? "The price went up" : "";
}
function buy(it) {
  const cost = priceOf(it), p = players[0];
  if (money() < cost) return;
  progress.money -= cost; Arcade.tone(990, 0.06, "triangle", 0.04);
  if (it.weapon) { if (p.weapon) dropWeapon(p); p.weapon = { kind: it.weapon, uses: it.fake ? 2 : 16 }; }   // a fake gives way on the second swing
  else if (it.fake) { /* coloured water */ }
  else if (it.disguise) progress.disguise = true;
  else if (!it.clothes) eat(p, it);
  const key = (stall || street.id) + ":" + it.id;
  progress.tasted = progress.tasted || [];
  const first = it.stat && !progress.tasted.includes(key) && (progress.tasted.push(key), raiseStat(it.stat));
  buildShop();
  if (it.clothes) newClothes();
  if (it.fake && !it.weapon) $("shop-msg").textContent = "Coloured water with gas in it. The label said Gold Fiz.";
  if (first) $("shop-msg").textContent = "First taste! " + STATS[it.stat] + " +1 (now " + stat(it.stat) + " of " + STAT_MAX + ")";
}
// food and drink: heal, SP, and too much in a row makes you slow
function eat(p, it) {
  if (it.heal) p.hp = Math.min(p.max, p.hp + it.heal);
  if (it.sp) p.sp = Math.min(100, p.sp + it.sp);
  if (!it.heal) return;
  p.meals = (p.meals || []).filter((t) => frameNo - t < 30 * 60).concat(frameNo);
  if (p.meals.length >= 3) { p.meals = []; p.slowT = 5 * 60; texts.push({ x: p.x, y: p.y - 70, s: "Burp!", t: 70 }); Arcade.tone(110, 0.3, "sawtooth", 0.05, -40); }
}
// the haggle meter: a marker swings across; stop it near the middle
let haggle = null;
function startHaggle() {
  if (shopVisit.haggled) return;
  haggle = { t: 0 }; $("shop-haggle").hidden = true; $("haggle").hidden = false; $("haggle-stop").focus({ preventScroll: true });
  const tick = () => { if (!haggle) return; haggle.t++; $("haggle-mark").style.left = (50 + Math.sin(haggle.t / 9) * 48) + "%"; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
function stopHaggle() {
  if (!haggle) return;
  const off = Math.abs(Math.sin(haggle.t / 9));
  haggle = null; shopVisit.haggled = true; $("haggle").hidden = true;
  shopVisit.mul = off < 0.12 ? 0.75 : off < 0.35 ? 0.9 : off > 0.85 ? 1.1 : 1;
  const hk = "haggle:" + shopVisit.id, hd = progress.haggled || (progress.haggled = {});
  if (typeof changeRespect === "function" && (hd[hk] !== progress.clock.day || shopVisit.mul > 1)) { hd[hk] = progress.clock.day; changeRespect(shopVisit.mul < 1 ? 1 : shopVisit.mul > 1 ? -1 : 0); }
  buildShop();
  $("shop-msg").textContent = shopVisit.mul === 0.75 ? "\"Fine, fine. For Nani's grandchild.\" 25% off" : shopVisit.mul === 0.9 ? "\"Ten per cent, and not a paisa more.\"" : shopVisit.mul > 1 ? "\"For haggling like that? The price just went up.\"" : "\"That is already the best price, beta.\"";
}
$("shop-close").addEventListener("click", closeShop);
$("shop-haggle").addEventListener("click", startHaggle);
$("haggle-stop").addEventListener("click", stopHaggle);

// a shop's room: shelves in its colour, the counter, the shopkeeper behind it
// the shopkeeper behind the counter (in a painted shop, cut off at the counter top so he stands behind it)
function shopKeeper(clipY) {
  const s = shopOf(), keeper = s && SPRITES["c_" + s.keeper[0]]; if (!keeper) return;
  const [sx, sy, w, h, ax, ay] = FIGHTER_FRAMES[s.keeper[0]][s.keeper[1]];
  g.save(); if (clipY) { g.beginPath(); g.rect(0, 0, LW, clipY); g.clip(); }
  g.translate(Math.round(-cam) + 150, 132); g.drawImage(keeper, sx, sy, w, h, -ax / 2, -ay / 2, w / 2, h / 2); g.restore();
}
function drawShop(P) {
  const s = shopOf(), x0 = Math.round(-cam), d = P.dark, wall = d ? "#4a4038" : "#e8dcc4", col = s ? s.colour : "#7a4a2a";
  R(0, 0, LW, LH, wall); R(0, 0, LW, 18, shade(wall, -0.3)); R(0, 150, LW, LH - 150, d ? "#3a3430" : "#b8a888");
  for (let y = 150; y < LH; y += 11) R(0, y, LW, 1, shade(wall, -0.4));
  for (let k = 0; k < 3; k++) { const y = 36 + k * 26; R(x0 + 40, y + 18, 220, 3, shade(col, -0.2)); for (let j = 0; j < 11; j++) R(x0 + 46 + j * 19, y + 4, 12, 14, [col, "#d9a441", "#f7f1e3", "#c0392b", shade(col, 0.3)][(j + k * 2) % 5]); }
  shopKeeper();
  R(x0 + 60, 112, 190, 6, d ? "#5a3a24" : "#8a5d3b"); R(x0 + 64, 118, 182, 32, shade(col, -0.35)); R(x0 + 64, 118, 182, 2, shade(col, 0));
  text(s ? s.name.toUpperCase() : "", x0 + 155, 30, 7, d ? "#e9e4d8" : "#2a2622");
  R(x0 + 334, 66, 36, 86, P.trim); R(x0 + 338, 70, 28, 80, d ? "#141822" : "#5d6b78");
}
