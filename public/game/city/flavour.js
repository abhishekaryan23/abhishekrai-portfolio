/* Rollback City: street satire (DESIGN 8.1; 3.4a of the plan). A plain script that shares globals
   with the others; index.html loads them in order.

   The roads of an 80s Indian city, loud and a little crooked, played for comedy: painted
   hoardings over the shops and neta posters on every wall; Netaji Bhairav Singh's convoy (a white
   car with a red light and a fleet of goons who shove everyone off the road); Havaldar Pandu, who
   forgets your heat for a consideration, and a traffic constable who fines you for the helmet
   nobody owns; fake goods on the shelves; and hustlers on every busy road. Every brand and every
   politician is invented. A small choice card (choose) asks what you do. */
"use strict";

/* ---------- the choice card: a question and a few answers ---------- */
let choiceOpen = false;
function choose(title, textStr, options) {
  if (state !== "play") return;
  choiceOpen = true; paused = true; down.clear();
  $("choice-title").textContent = title; $("choice-text").textContent = textStr;
  const box = $("choice-list"); box.innerHTML = "";
  options.forEach((o, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "btn" + (i ? " ghost" : ""); b.textContent = o.label; b.id = "choice-" + i;
    b.addEventListener("click", () => { closeChoice(); if (o.act) o.act(); });
    box.appendChild(b);
  });
  showCard("card-choice", "choice-0");
}
function closeChoice() { if (!choiceOpen) return; choiceOpen = false; paused = false; showCard(null); }
// a line said over someone's head
const sayAt = (x, y, s, t = 110) => texts.push({ x, y, s, t });

/* ---------- hoardings, posters, flags ---------- */
// a street's own sequence: which buildings carry a hoarding, which walls a poster
const HOARDINGS = 7;   // h_6: the Dhurandhar fan-art hoarding (original art, the title lettered in)
// which film or brand a hoarding shows: the designs vary by street (they used to come out the same
// everywhere), and Dhurandhar has the best spots, over Bunder Road and the lane
const HOARDING_PICK = { bunderRoad: { 9: 6 }, lane: { 13: 6 } };
const hoardingFor = (i) => { const pk = HOARDING_PICK[street.id]; return pk && pk[i] !== undefined ? pk[i] : (((i * 5 + street.id.length * 3) % 6) + 6) % 6; };
function drawHoardings(P, first, count) {
  if (!clockRuns() && !flag("midnight")) return;   // Act 1 keeps its own walls
  for (let i = first; i < first + count; i++) {
    const x = Math.round(i * 128 - cam), k = ((i * 7 + 3) % 11 + 11) % 11;
    if (street.look && i === street.look.dhaba) continue;   // nobody pastes anything on Nani's dhaba
    if (k === 0 || k === 6) { const h = hoardingFor(i); if (!spr("h_" + h, x + 64, 82)) { R(x + 6, 26, 116, 52, "#c0392b"); text("GOLD FIZZ", x + 64, 58, 12, "#f7f4ee"); } }
    else if (k === 4 || k === 8) spr(k === 8 && i % 2 ? "n_poster_moustache" : "n_poster", x + 118, 128);
  }
}
// party flags on the lamp posts, and a banner on the wires now and then
function drawNetaFlags(P, px) {
  if (!clockRuns()) return;
  const n = Math.floor((px + cam) / 256);
  if (n % 2 === 0) spr("n_flag", px + 10, 104);
  // Netaji's hoarding stands on one roof on two steel legs (it used to hang across two buildings of
  // different heights, half in the sky)
  if (n % 5 === 2) { const bx = px + 64; R(bx - 12, 20, 2, 7, P.rail); R(bx + 10, 20, 2, 7, P.rail); R(bx - 13, 25, 26, 1, P.rail); spr("n_banner", bx, 22); }
}

/* ---------- Netaji's convoy ---------- */
let convoy = null, convoyT = 1800;
const CONVOY_STREETS = ["bunderRoad", "mandiRoad", "lane"];
function updateConvoy() {
  if (!clockRuns() || street.interior || !CONVOY_STREETS.includes(street.id) || mission || arena) { convoy = null; return; }
  if (!convoy) {
    if (isNight() || --convoyT > 0) return;
    convoyT = Math.round(rand(150, 260) * 60);
    const d = Math.random() < 0.5 ? 1 : -1, x0 = d > 0 ? cam - 140 : cam + LW + 140;
    convoy = { x: x0, d, goons: [], fled: false, t: 0 };
    fighterArt("netagoon"); art(["v_amby"]);
    for (const [dx, y] of [[-70, 182], [-40, 200], [50, 184], [80, 200], [-100, 192]]) {
      const e = fighter("netagoon", x0 + dx * d, y, "e"); Object.assign(e, { convoy, cdx: dx, cy: y, roam: true, aggro: false, face: d, cool: 60 }); enemies.push(e); convoy.goons.push(e);
    }
    banner = { text: "Netaji's convoy", t: 100 }; Arcade.tone(1500, 0.12, "square", 0.02);
    return;
  }
  // the car only runs (and calls his police) when one of you actually picked the fight: a man knocked
  // flying by an auto, or caught by somebody else's punch, isn't you starting a riot
  const byPlayer = (e) => { const b = e.lastBy && (e.lastBy.owner || e.lastBy); return !!(b && b.pi !== undefined); };
  const c = convoy, angry = c.goons.some((e) => e.aggro && byPlayer(e));
  if (angry && !c.fled) {   // a fight: the car speeds off and leaves his men to it; the police are his
    c.fled = true; sayAt(c.x, 150, "Netaji's car speeds away", 90); crime(2, c.x, "police");
    for (const e of c.goons) { e.aggro = true; e.convoy = null; }
  }
  c.x += c.d * (c.fled ? 4 : 0.9); c.t++;
  if (!c.fled) for (const e of c.goons) if (e.convoy && !DOWN_STATES.includes(e.st)) {
    // walking alongside, clearing the road
    e.x = c.x + e.cdx * c.d; e.y += clamp(e.cy - e.y, -0.6, 0.6); e.face = c.d; e.walkPh += 0.12; setState(e, "walk", e.t + 1);
    for (const p of alivePlayers()) if (!p.ride && Math.abs(p.x - e.x) < 18 && Math.abs(p.y - e.y) < 12 && (p.x - e.x) * c.d > -4 && p.st !== "hurt") {
      p.x += c.d * 10; p.y = clamp(p.y - 6, Y0, Y1); setState(p, "hurt", 10); p.inv = Math.max(p.inv, 12);
      if (frameNo % 40 < 20) sayAt(e.x, e.y - 64, pick(["Hatt! Netaji aa rahe hain!", "Side! Side!", "Move, hero!"]), 60);
    }
  }
  // a car with a red light pushes riders into the kerb too
  for (const p of alivePlayers()) if (p.ride && p.ride.rider === p && Math.abs(p.x - c.x) < 50 && p.y > 186) { p.ride.y = Math.max(Y0 + 4, p.ride.y - 2); p.ride.vx *= 0.9; }
  if (c.x < cam - 300 || c.x > cam + LW + 300 || c.x < -300 || c.x > street.w + 300) { for (const e of c.goons) if (e.convoy) e.gone = true; convoy = null; }
}
// his men walk with the car, unless someone has started something
const convoyMan = (e) => !!(e.convoy && !e.aggro);
function drawConvoy(P) {
  if (!convoy) return;
  const x = Math.round(convoy.x - cam);
  if (x < -120 || x > LW + 120) return;
  g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, 204, 46, 4, 0, 0, 7); g.fill();
  if (!sprAt("v_amby", x, 206, convoy.d < 0, 1.1)) { R(x - 44, 180, 88, 24, "#f2f0ec"); R(x - 24, 170, 48, 12, "#e2e0dc"); }
  if (Math.floor(frameNo / 8) % 2) { R(x - 3, 158, 6, 4, "#ff3b30"); g.globalAlpha = 0.3; g.fillStyle = "#ff3b30"; g.beginPath(); g.arc(x, 160, 10, 0, 7); g.fill(); g.globalAlpha = 1; }
}

/* ---------- corruption ---------- */
// Havaldar Pandu, outside the thana: lines, or chai-paani to forget your face
function pandu() {
  if (heat() > 0) {
    const fee = 150 * heat();
    choose("Havaldar Pandu", "\"Arre, you again. The sahib has your description... but descriptions can get lost. Paper is so fragile. Some chai-paani, maybe? " + rupees(fee) + ".\"", [
      { label: "Pay " + rupees(fee), act: () => { if (money() < fee) { sayAt(players[0].x, Y0 - 30, "Pandu: \"No money? No memory loss.\""); return; } progress.money -= fee; setHeat(0); changeRespect(-1); sayAt(players[0].x, Y0 - 30, "Pandu tears a page out of his notebook and eats it"); } },
      { label: "Walk on", act: () => sayAt(players[0].x, Y0 - 30, "Pandu: \"Your loss, beta. The jeep is very uncomfortable.\"") }]);
    return;
  }
  say([{ who: "pandu", text: pick(["Cricket tonight, beta. India-Pakistan. I'm running a small book. Very small. Practically charity.",
    "Inspector Godbole wants everything in writing. I want everything in cash. We are a balanced thana.",
    "No crime today? Good. Less paperwork. Have a paan, it's from the evidence locker."]) }]);
}
// riding past a traffic constable with no helmet (nobody in Bunderpur owns one)
let helmetChecked = null;
function helmetCheck() {
  if (!clockRuns() || helmetChecked === street.id || mission || arena) return;
  const p = alivePlayers().find((q) => q.ride && q.ride.rider === q && VEHICLES[q.ride.kind].seats > 1);
  if (!p) return;
  const cop = police().find((e) => !e.aggro && Math.abs(e.x - p.x) < 40 && Math.abs(e.y - p.y) < 30);
  if (!cop) return;
  helmetChecked = street.id; p.ride.vx = 0;
  choose("Traffic constable", "\"Ruko! Where is your helmet? Fine: " + rupees(100) + ". Receipt? What receipt.\"", [
    { label: "Pay " + rupees(100), act: () => { progress.money = Math.max(0, money() - 100); sayAt(cop.x, cop.y - 64, "\"Drive safely. Or don't. A hundred more next time.\""); } },
    { label: "\"Whose helmet? Nobody has a helmet!\"", act: () => {
      if (respect() >= 50) sayAt(cop.x, cop.y - 64, "He looks around at the helmetless traffic and waves you on", 120);
      else { sayAt(cop.x, cop.y - 64, "\"Arguing with a constable? That's another section.\""); raiseHeat(1); }
    } }]);
}

/* ---------- scams ---------- */
const scamDay = (id) => (progress.scams || {})[id] === progress.clock.day;
const scamDone = (id) => { (progress.scams = progress.scams || {})[id] = progress.clock.day; };
// the three-card trick: you almost never win, unless you call him out with the street behind you
function threeCards(x) {
  if (scamDay("cards")) { sayAt(x, Y0 - 30, "The table's folded up. \"Come back tomorrow, lucky man.\""); return; }
  const bet = (pick1) => {
    if (money() < 50) { sayAt(x, Y0 - 30, "\"Fifty to play, boss. No credit.\""); return; }
    const win = Math.random() < 0.18;
    if (win) { earn(100); sayAt(x, Y0 - 30, "\"Arre! Beginner's luck. Again? Again!\""); }
    else { progress.money -= 50; progress.lostCards = (progress.lostCards || 0) + 50; sayAt(x, Y0 - 30, "The queen was under the " + pick(["other", "third", "first"].filter((w) => w !== pick1)) + " card. Of course it was."); }
  };
  choose("Three-card trick", "\"Find the queen, double your money! Watch closely, watch closely...\" His hands are very fast. His two friends in the crowd are winning a lot.", [
    { label: "Bet " + rupees(50) + " on the left card", act: () => bet("first") },
    { label: "Bet " + rupees(50) + " on the middle card", act: () => bet("middle") },
    { label: "\"The queen's up your sleeve\"", act: () => {
      scamDone("cards");
      if (respect() >= 50) { const back = progress.lostCards || 0; progress.lostCards = 0; if (back) earn(back); sayAt(x, Y0 - 30, "The crowd turns on him. He pays back what you lost and folds the table", 140); changeRespect(2); }
      else { sayAt(x, Y0 - 30, "His friends step out of the crowd"); for (const k of ["grunt", "kicker"]) { const e = fighter(k, x + rand(-40, 40), rand(Y0 + 10, Y1), "e"); Object.assign(e, { roam: true, aggro: true, cool: 40 }); enemies.push(e); } }
    } },
    { label: "Walk on" }]);
}
// the lucky-stone seller: glass, very lucky glass
function luckyStones(x) {
  choose("Lucky stones", "\"Gomed, neelam, panna! Planets in a bad position? One stone fixes all. Special price " + rupees(101) + ", only for you.\"", [
    { label: "Buy a stone (" + rupees(101) + ")", act: () => { if (money() < 101) { sayAt(x, Y0 - 30, "\"Bad planets AND no money. I'll pray for you.\""); return; } progress.money -= 101; sayAt(x, Y0 - 30, "A beautiful stone. Through it, the street looks green. It's a bottle bottom.", 140); } },
    { label: "\"That's bottle glass\"", act: () => {
      if (scamDay("stones")) { sayAt(x, Y0 - 30, "He pretends to be deaf today"); return; }
      scamDone("stones");
      if (respect() >= 40) { earn(10); sayAt(x, Y0 - 30, "\"Shh! Ten rupees and the planets never hear of it.\"", 120); } else sayAt(x, Y0 - 30, "\"Glass? This came from a mine in... a mine. Very deep.\"");
    } },
    { label: "Walk on" }]);
}
// the bus-fare uncle: same story, every single day
function busFareUncle(x) {
  const again = (progress.uncle || 0) > 0;
  choose("A respectable uncle", again ? "\"Beta! My wallet was stolen. ...Have we met? Twenty rupees, for the bus to Kalwapur.\"" : "\"Beta, forgive me, my wallet was stolen at the market. Twenty rupees, just for the bus home to Kalwapur?\"", [
    { label: "Give him " + rupees(20), act: () => { if (money() < 20) return; progress.money -= 20; progress.uncle = (progress.uncle || 0) + 1; if (progress.uncle === 1) changeRespect(1); sayAt(x, Y0 - 30, progress.uncle > 1 ? "He has been going home to Kalwapur for three years" : "\"God bless you. You have your grandmother's face.\"", 120); } },
    { label: "\"The bus to Kalwapur doesn't stop here\"", act: () => sayAt(x, Y0 - 30, "\"...It doesn't? Then I'll walk.\" He sits back down.", 110) }]);
}
// a ticket collector with a badge from a cereal packet
function fakeCollector(x) {
  choose("Ticket checking", "\"Ticket? No ticket? Spot fine: " + rupees(100) + ". Very serious offence.\" His badge says INSPECTER.", [
    { label: "Pay " + rupees(100), act: () => { progress.money = Math.max(0, money() - 100); sayAt(x, Y0 - 30, "He writes a receipt on a sweet wrapper"); } },
    { label: "\"Show me your railway ID\"", act: () => {
      if (scamDay("collector")) return; scamDone("collector");
      sayAt(x, Y0 - 30, "\"My... ID is at home. With my other ID.\" He runs for the stairs.", 120); changeRespect(2);
      const n = npcs.find((c) => c.look === "civ_j" && c.base === 4); if (n) { n.st = "flee"; n.gone = true; }
    } }]);
}
// a "checkpost" at night: a plank on two trestles and two men in borrowed khaki
function fakeCheckpost(x) {
  choose("Checkpost", "\"Night checking. Fine " + rupees(200) + ". For... the thing you did.\" Their khaki is two sizes too big and one of them is wearing chappals.", [
    { label: "Pay " + rupees(200), act: () => { progress.money = Math.max(0, money() - 200); sayAt(x, Y0 - 30, "\"Very good citizen. Very good.\""); } },
    { label: "\"Which police station?\"", act: () => {
      sayAt(x, Y0 - 30, "They look at each other, then at you. Then they roll up their sleeves.");
      for (const dx of [-20, 20]) { const e = fighter("fakecop", x + dx, rand(Y0 + 14, Y1), "e"); Object.assign(e, { roam: true, aggro: true, cool: 40 }); enemies.push(e); }
    } }]);
}
