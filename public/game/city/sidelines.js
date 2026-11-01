/* Rollback City: the story side lines (DESIGN 6.1: S3 Rani, S5 the Ghost of Platform 0, S6 Lost
   Tapes, S8 Night Catch; 3.11 of the plan). A plain script that shares globals with the others;
   index.html loads them in order.

   Rani: Lakhan has an old auto-rickshaw under a tarpaulin. Find him four parts in the city's scrap
   and beat his ghost (his best time) in three races on two wheels, and Rani is yours: a driver and a
   passenger, a horn that stops goondas in their tracks (special), the radio, and taxi fares as an
   odd job (a goat, a bride, a man who wants the long way round).
   The Ghost of Platform 0: late at night a lantern moves past the end of Platform 2. It is Station
   Master Joshi, retired, still winding the station clock every night since 1987; after that his
   handcar takes you anywhere the old lines go, at night.
   Lost Tapes: DJ Rewind's ten cassettes from '87, dropped all over the city. Each one found goes on
   Rewind FM. Night Catch: Machhi Mausi's night work at the docks, chasing smugglers' boats or
   hauling nets in a storm; three nights and her boat will take you along the coast whenever. */
"use strict";

/* ---------- S3: Rani ---------- */
VEHICLES.rani = { sprite: "auto", name: "Rani", max: 4.4, acc: 0.1, seats: 2, seat: [6, -13], sink: 10, legs: 0, scale: 1.75 };
WORLD.streets.mandiRoad.parked.push({ id: "rani", kind: "rani", x: 1400, y: 190, needs: "s3-rani" });
const RACES = [
  // a clean run is about two-thirds of the ghost's time: room for a scrape with a handcart, not a crash
  { street: "mandiRoad", from: 200, to: 2050, time: 9 * 60, ghost: 8 * 60, name: "the Mandi main road" },
  { street: "kinara", from: 250, to: 2650, time: 11.5 * 60, ghost: 10.5 * 60, name: "the whole Kinara" },
  { street: "bunderRoad", from: 120, to: 1500, time: 7.5 * 60, ghost: 6.5 * 60, name: "Bunder Road, through the traffic" }];
MISSIONS["s3-rani"] = { side: true, title: "Rani", start: { street: "garage", x: 200 }, reward: { respect: { mandi: 5 } },
  after: () => { banner = { text: "Rani is parked on the Mandi main road", t: 180, big: true }; }, steps: [
    { panels: [
      { who: "lakhan", text: "Rani." },
      { who: "N", text: "He lifts a tarpaulin at the back of the garage. Under it: the bones of an auto-rickshaw, black and yellow once, with RANI painted on the back in curly gold." },
      { who: "lakhan", text: "Parts. Four. Scrap." },
      { who: "N", text: "He counts them off on his fingers: a carburettor, a gear stick, a headlamp, a fare meter. Then he points out of the door, at the whole city." }] },
    { find: [
      { street: "truckYard", x: 1500, label: "Dig through the scrap heap", panels: [{ who: "N", text: "Under a bald truck tyre: a carburettor, more rust than metal. Lakhan will love it." }] },
      { street: "docks", x: 1700, label: "Search the dead boat engines", panels: [{ who: "N", text: "Among the outboard motors: a gear stick with a plastic rose on the knob." }] },
      { street: "weighbridge", x: 600, label: "Look behind the weighbridge shed", panels: [{ who: "N", text: "A headlamp, the glass not even cracked, wrapped in a Kaal Group flyer." }] },
      { street: "millGate", x: 1200, label: "Search the mill's scrap pile", panels: [{ who: "N", text: "A fare meter, stopped at 0.00. Some things never change." }] }],
      obj: "Find Rani's four parts in the city's scrap" },
    { talk: { street: "garage", x: 200, label: "Give Lakhan the parts" }, obj: "Take the parts to Lakhan", panels: [
      { who: "lakhan", text: "Good." },
      { who: "lakhan", text: "Races. Three. Beat me." },
      { who: "N", text: "Not him: his ghost. He taps his wrist. Three roads, three of his best times, and a faded rider who rides them exactly as he did. Beat it on two wheels." }] },
    ...RACES.map((r, k) => ({ race: r, obj: "Race " + (k + 1) + ": " + r.name + ", on two wheels", checkpoint: true })),
    { panels: [
      { who: "lakhan", text: "Rani." },
      { who: "lakhan", text: "Yours." },
      { who: "N", text: "She's polished till she squeaks. A horn that could stop a train (special, while you drive). A radio. A back seat for a passenger, and a goat if it comes to that." }] }] };
// a race: get on two wheels at the start, wait for the count, beat the faded ghost of Lakhan's time
let raceGhost = null;
function updateRace(s, st) {
  const r = s.race, p = alivePlayers()[0];
  if (!p || street.id !== r.street) return false;
  const rider = p.ride && p.ride.rider === p && p.ride.kind !== "bicycle" && p.ride.kind !== "boat" ? p.ride : null;
  if (!st.go) {
    // Lakhan's lad leaves a motorbike at the start if you came without one
    if (!rider && !st.bike && !s.need) { st.bike = true; (progress.vehicles = progress.vehicles || {}).motorbike = { street: r.street, x: r.from - 50 }; rides = vehiclesHere(); texts.push({ x: r.from - 50, y: Y0 - 50, s: "Lakhan's lad: \"Bike. Here. Go.\"", t: 120 }); }
    if (!rider || Math.abs(p.x - r.from) > 70) { st.wait = 0; return false; }
    rider.vx = 0; p.x = rider.x = r.from;
    st.wait = (st.wait || 0) + 1;   // (already on the bike at the line: start counting from nothing)
    if (st.wait === 1) banner = { text: "3", t: 50, big: true };
    if (st.wait === 60) banner = { text: "2", t: 50, big: true };
    if (st.wait === 120) banner = { text: "1", t: 50, big: true };
    if (st.wait === 180) { banner = { text: "Go!", t: 60, big: true }; st.go = true; st.t0 = st.t; raceGhost = { x: r.from, y: Y1 - 6, r }; Arcade.tone(880, 0.2, "square", 0.05); }
    return false;
  }
  const t = st.t - st.t0;
  raceGhost = { x: r.from + (r.to - r.from) * Math.min(1, t / r.ghost), y: Y1 - 6, r };
  if (p.x >= r.to) { raceGhost = null; texts.push({ x: p.x, y: p.y - 70, s: (t / 60).toFixed(2) + "s! Lakhan's ghost: " + (r.ghost / 60).toFixed(2) + "s", t: 140 }); return true; }
  if (t > r.time) { raceGhost = null; failMission("Lakhan's ghost wins. It always looks so pleased with itself"); }
  return false;
}
function drawRaceGhost(P) {
  if (!raceGhost || !mission || street.id !== raceGhost.r.street) { if (!mission) raceGhost = null; return; }
  const x = Math.round(raceGhost.x - cam); if (x < -40 || x > LW + 40) return;
  g.globalAlpha = 0.45; sprAt("v_motorbike", x, raceGhost.y + 2, false, 1); R(x - 3, raceGhost.y - 30, 7, 14, "#cfe6ff"); R(x - 3, raceGhost.y - 36, 7, 6, "#e8f2ff"); g.globalAlpha = 1;
  text("LAKHAN'S BEST", x, raceGhost.y - 42, 5, "#cfe6ff");
  // the finish line
  const fx = Math.round(raceGhost.r.to - cam); if (fx > -10 && fx < LW + 10) for (let y = 160; y < LH; y += 6) R(fx, y, 3, 3, (y / 6) % 2 ? "#f7f4ee" : "#1d1b18");
}
// the horn: everyone in front of Rani freezes for a moment
function honk(v, p) {
  if ((p.hornT || 0) > frameNo) return; p.hornT = frameNo + 150;
  Arcade.tone(392, 0.25, "square", 0.05); setTimeout(() => Arcade.tone(370, 0.3, "square", 0.05), 260);
  texts.push({ x: v.x + v.face * 30, y: v.y - 50, s: "PAAAM PAAAM!", t: 60 });
  for (const e of enemies) if (e.team === "e" && !DOWN_STATES.includes(e.st) && Math.sign(e.x - v.x) === v.face && Math.abs(e.x - v.x) < 110 && !KINDS[e.kind].boss) setState(e, "hurt", 50);
}
// taxi fares, once Rani is yours: a passenger with a quirk, somewhere to be, a clock
const FARES = [
  { who: "a man with a goat", look: "civ_c", base: 0, line: "The goat gets in first and takes the good seat. The man perches on the edge. \"She gets carsick. Drive smooth.\"" },
  { who: "a bride in red, late for her own wedding", look: "civ_a", base: 0, line: "Gold to the elbows and a phone in each hand. \"Bhaiya, the groom's family is already there. FLY.\"", rush: true },
  { who: "a man who wants the long way round", look: "civ_d", base: 0, line: "\"Go by the sea. I like to see the sea. Then go where I'm going.\"", via: "kinara" },
  { who: "a college boy with a cricket kit", look: "civ_b", base: 0, line: "\"Nets at four. If I'm late, coach makes me field at fine leg all season.\"" },
  { who: "an aunty with six bags of vegetables", look: "civ_e", base: 0, line: "She hands you two bags to hold while she counts the other four. \"Don't bargain with me, I know the fare.\"" }];
const DROPS = [["lane", 1100, "Chandni Lane"], ["kinara", 900, "Sagar Kinara"], ["docks", 900, "Bunder Docks"], ["bunderRoad", 700, "Bunder Road"], ["mandiGate", 900, "Mandi Gate"], ["ghat", 300, "Mandi Ghat"]];
let fare = null;
const inRani = () => players.some((p) => p && p.ride && p.ride.kind === "rani" && p.ride.rider === p);
MISSIONS["job:taxi"] = { job: true, title: "Taxi fares", needs: ["s3-rani"], hours: [7, 23], pay: 120, start: { street: "mandiRoad", x: 1440 }, make: () => {
  const F = pick(FARES), [ps, px, pn] = pick(DROPS.filter((d) => d[0] !== "kinara" || !F.via)), [ds, dx, dn] = pick(DROPS.filter((d) => d[0] !== ps && d[0] !== F.via));
  const steps = [
    { panels: [{ who: "N", text: "Rani's meter clicks on. A call comes through on the PCO line: " + F.who + " on " + pn + "." }] },
    { talk: { street: ps, x: px, label: "Pick up the fare", npc: { look: F.look, base: F.base } }, need: inRani, obj: () => "In Rani: pick up " + F.who + " on " + pn, panels: [{ who: "N", text: F.line }], then: () => { fare = F; } }];
  if (F.via) steps.push({ go: { street: F.via, x: 1200, r: 80 }, need: inRani, obj: "The long way round: by the sea first" });
  steps.push({ go: { street: ds, x: dx, r: 60 }, need: inRani, time: (F.rush ? 70 : 110) * 60, obj: () => "Take " + F.who + " to " + dn,
    then: () => { const tip = Math.max(0, Math.round((1 - mission.st.t / ((F.rush ? 70 : 110) * 60)) * 200 / 10) * 10); if (tip) { earn(tip); texts.push({ x: players[0].x, y: players[0].y - 74, s: "Tip: " + rupees(tip), t: 100 }); } fare = null; } });
  return steps; } };
JOBS.push("job:taxi");
// the passenger in the back of Rani
function drawFare(v, x) {
  if (!fare || !v.rider) return;
  R(x - v.face * 10 - 3, v.y - 30, 7, 9, "#c96bd8"); R(x - v.face * 10 - 2, v.y - 36, 5, 6, "#a8704a");
  if (fare.who.includes("goat")) { R(x - v.face * 18 - 4, v.y - 26, 9, 6, "#f0e6d2"); R(x - v.face * 18 - v.face * 5, v.y - 30, 4, 4, "#f0e6d2"); }
}

/* ---------- S5: the Ghost of Platform 0 ---------- */
const PLATFORM0 = { street: "platform", x: 1300 };
const lateNight = () => clockRuns() && (hour() >= 23 || hour() < 1);
function platformTarget(p) {
  if (street.id !== PLATFORM0.street || Math.abs(p.x - PLATFORM0.x) > 28 || mission || arena) return null;
  if (!flag("joshi")) {
    if (!lateNight()) return { label: "Platform 0: shut since 1987", x: PLATFORM0.x, y: Y0 - 48, act: () => {} };
    return { label: "Follow the lantern", x: PLATFORM0.x, y: Y0 - 48, act: () => {
      progress.flags.joshi = true;
      say([
        { who: "N", dark: 0.7, text: "Past the last lamp the platform carries on into the dark: Platform 0, shut since 1987. A lantern swings at the end of it." },
        { who: "N", dark: 0.7, text: "Under it, an old man in a railway coat stands on a stool, winding the station clock with a key the size of a spoon." },
        { who: "N", dark: 0.6, text: "\"Station Master Joshi. Retired. Nobody told the clock. If I don't wind it, it stops at 11:58, like every other clock in this city.\"" },
        { who: "N", dark: 0.6, text: "\"The last train that night came in on this platform. A film crew got off with cases and cases, SITARA STUDIOS on the side, and went up Chandni Lane at a run. Then the lane was on fire.\"" },
        { who: "N", dark: 0.5, text: "\"You look tired. My handcar still runs at night, on the old lines. Anywhere the tracks go. Don't tell the railway.\"" }], () => saveGame(true));
    } };
  }
  if (!isNight()) return { label: "Platform 0: Joshi comes at night", x: PLATFORM0.x, y: Y0 - 48, act: () => {} };
  return { label: "Joshi's handcar", x: PLATFORM0.x, y: Y0 - 48, act: () => choose("Joshi's handcar", "\"Where to? Hold on to your hat. The brakes are more of an idea.\"",
    [["lane", 1216, "Chandni Lane"], ["mandiGate", 300, "Mandi Gate"], ["kinara", 400, "Sagar Kinara"], ["docks", 400, "Bunder Docks"], ["ghat", 300, "Mandi Ghat"]]
      .map(([id, x, name]) => ({ label: name, act: () => { travelTo(id, x); Arcade.noise(0.4, 0.05); } })).concat({ label: "Stay", act: () => {} })) };
}
// Joshi and his lantern at the dark end of the platform
function drawJoshi(P) {
  if (street.id !== PLATFORM0.street || !(lateNight() || (flag("joshi") && isNight()))) return;
  const x = Math.round(PLATFORM0.x - cam + (flag("joshi") ? 0 : Math.sin(frameNo / 90) * 40)); if (x < -40 || x > LW + 40) return;
  const ly = Y0 - 18 + Math.sin(frameNo / 25) * 1.5;
  g.globalAlpha = 0.22 + 0.06 * Math.sin(frameNo / 7); g.fillStyle = "#ffd27a"; g.beginPath(); g.arc(x + 6, ly, 26, 0, 7); g.fill(); g.globalAlpha = 1;
  if (flag("joshi")) { const im = SPRITES.c_civ_a; if (im && FIGHTER_FRAMES.civ_a) { const [sx, sy, w, h, ax, ay] = FIGHTER_FRAMES.civ_a[4]; g.drawImage(im, sx, sy, w, h, x - ax / 2, Y0 + 12 - ay / 2, w / 2, h / 2); } }
  R(x + 4, ly - 3, 5, 7, "#3a2a1a"); R(x + 5, ly - 2, 3, 5, "#ffd27a");
}

/* ---------- S6: Lost Tapes ---------- */
const TAPES = [
  { street: "lane", x: 1980, title: "Disco Deewane (dub)" }, { street: "gali", x: 1250, title: "Rain on the Kinara" },
  { street: "mandiRoad", x: 700, title: "Weighbridge Funk" }, { street: "truckYard", x: 400, title: "Night Lorry" },
  { street: "kinara", x: 2050, title: "Club 1987, Side B" }, { street: "docks", x: 420, title: "Fish Market Breaks" },
  { street: "bunderRoad", x: 320, title: "The 11:58 Local" }, { street: "roofs", x: 620, title: "Kite Season" },
  { street: "ghat", x: 760, title: "River Steps" }, { street: "millGate", x: 900, title: "Loom Machine" }];
const TAPE_TUNES = [
  [".", ".", 7, ".", ".", 10, ".", 12, ".", ".", 7, ".", 5, ".", 3, "."], [0, ".", 3, 5, ".", 7, ".", 5, 3, ".", 0, ".", ".", -2, ".", "."],
  [12, ".", 12, 10, ".", 7, ".", ".", 5, ".", 7, ".", 10, ".", 12, "."], [0, ".", ".", 0, ".", ".", 3, ".", 5, ".", ".", 5, ".", 3, ".", "."],
  [7, ".", 12, ".", 15, ".", 12, ".", 7, ".", 12, ".", 17, ".", 15, "."], [".", 5, ".", 5, ".", 7, ".", 8, ".", 7, ".", 5, ".", 3, ".", 0],
  [0, 2, 3, ".", 3, 2, 0, ".", -2, ".", 0, ".", 3, ".", 7, "."], [12, ".", 14, ".", 15, ".", 19, ".", 17, ".", 15, ".", 14, ".", 12, "."],
  [0, ".", ".", ".", 7, ".", ".", ".", 5, ".", ".", ".", 3, ".", 2, "."], [0, 0, ".", 0, 0, ".", 3, ".", 0, 0, ".", 0, 5, ".", 3, "."]];
const REWIND_LEAD = STATIONS[0].parts[2].notes.slice(), REWIND_TICKER = STATIONS[0].ticker.slice();
const tapesFound = () => progress.tapes || [];
function tapeTarget(p) {
  if (!progress.done.includes("2-6") || mission || arena) return null;
  const k = TAPES.findIndex((t, k) => t.street === street.id && !tapesFound().includes(k) && Math.abs(t.x - p.x) < 18);
  if (k < 0) return null;
  return { label: "Pick up the cassette", x: TAPES[k].x, y: Y0 - 40, act: () => {
    (progress.tapes = progress.tapes || []).push(k); const n = progress.tapes.length;
    texts.push({ x: p.x, y: p.y - 74, s: "Lost Tape " + n + " of 10: \"" + TAPES[k].title + "\"", t: 140 }); Arcade.tone(1047, 0.08, "triangle", 0.04);
    if (n === 1) message("DJ Rewind: You found one of my tapes?! Ten of them went missing the week of the fire. Bring me the rest and every one goes on air.");
    if (n === 10) { earn(1000); message("DJ Rewind: All ten! Tonight is the Lost Tapes hour on Rewind FM, and it's dedicated to you. (Rs 1,000 in your account, for finder's fees.)"); }
    tuneRewind(); saveGame(true);
  } };
}
// Rewind FM plays the found tapes in turn (a new lead line and its title on the ticker)
let tapeShown = -1;
function tuneRewind() {
  const got = tapesFound(); const S = STATIONS[0];
  if (!got.length) { S.parts[2].notes = REWIND_LEAD; S.ticker = REWIND_TICKER; return; }
  const k = got[Math.floor(frameNo / 3600) % got.length]; if (k === tapeShown) return; tapeShown = k;
  S.parts[2].notes = TAPE_TUNES[k]; S.ticker = ["Now playing a lost tape from '87: \"" + TAPES[k].title + "\". Found by a listener on " + WORLD.streets[TAPES[k].street].name + "."].concat(REWIND_TICKER);
}
function drawTapes(P) {
  if (!progress.done.includes("2-6")) return;
  TAPES.forEach((t, k) => {
    if (t.street !== street.id || tapesFound().includes(k)) return;
    const x = Math.round(t.x - cam), y = Y0 + 16; if (x < -20 || x > LW + 20) return;
    R(x - 5, y - 4, 10, 6, "#1d1b18"); R(x - 4, y - 3, 8, 3, "#f2c230"); R(x - 3, y - 2, 2, 1, "#1d1b18"); R(x + 1, y - 2, 2, 1, "#1d1b18");
    collectCue(t.x, y - 2);
  });
}

/* ---------- S8: Night Catch ---------- */
KINDS.smuggler = { hp: 30, speed: 1, scale: 1, look: "netman", name: "Smuggler", score: 200, windup: 14, cool: [50, 85], moves: ["ePunch", "eKick"], cash: 60 };
SHEET_OF.smuggler = "netman";
MISSIONS["job:catch"] = { job: true, title: "Night catch", needs: ["2-7"], hours: [20, 4], pay: 300, start: { street: "docks", x: 2300 }, make: () => {
  const storm = (progress.catchN || 0) % 2 === 1;
  const end = { panels: [{ who: "mausi", text: pick(["Good. My boys eat tonight because of you. Don't let it go to your head.", "Not bad, for a lane kid. Same time tomorrow? Joking. Mostly."]) }],
    then: () => { progress.catchN = (progress.catchN || 0) + 1; if (progress.catchN === 3) { progress.flags.boats = true; message("Machhi Mausi: Three nights. You've earned a seat. My boat at the jetty takes you along the coast, any hour. Don't touch the wheel."); } } };
  if (!storm) return [
    { panels: [{ who: "mausi", text: "Smugglers. A boat with no lights, running gold biscuits and Kaal's cheap whisky past my nets. Catch it, and the coastguard pays us for the tip." }] },
    { ride: { street: "sea", x: 300 }, obj: "Out to sea with Mausi's crew" },
    { chase: { street: "sea", x: 800, to: 3200, kind: "smuggler", fail: "The smugglers' boat is gone into the dark" }, obj: "Catch the smugglers' boat" },
    { ride: { street: "docks", x: 2300 }, obj: "Back to the docks" }, end];
  return [
    { panels: [{ who: "mausi", text: "Storm coming in. The nets are out past the reef and they're full. Haul them before the sea takes them, and us." }] },
    { ride: { street: "sea", x: 600 }, obj: "Out to the nets in the storm" },
    { haul: { need: 5, misses: 3 }, time: 75 * 60, timeFail: "The storm took the nets", obj: "Haul the nets: pull (punch) when the needle's in the green" },
    { ride: { street: "docks", x: 2300 }, obj: "Back to the docks" }, end];
} };
JOBS.push("job:catch");
// the haul: a needle sweeps across a gauge as the boat rolls; pull while it's in the green
function updateHaul(s, st) {
  if (street.id !== (s.haul.street || "sea")) return false;
  const H = s.haul; st.got = st.got || 0; st.miss = st.miss || 0; st.ph = (st.ph || 0) + 0.035 + st.got * 0.006;
  if (alivePlayers().some((p) => tapped(p.pi, "punch") || tapped(p.pi, "use"))) {
    const n = Math.sin(st.ph), zone = 0.32 - st.got * 0.03;
    if (Math.abs(n) < zone) { st.got++; texts.push({ x: players[0].x, y: players[0].y - 70, s: pick(["Heave!", "One more!", "She's coming up!"]), t: 50 }); Arcade.tone(330 + st.got * 60, 0.1, "triangle", 0.05); shake = 2; }
    else { st.miss++; texts.push({ x: players[0].x, y: players[0].y - 70, s: "The net slips!", t: 50 }); Arcade.noise(0.15, 0.04); }
  }
  if (st.miss >= H.misses) { failMission("The nets went over the side"); return false; }
  return st.got >= H.need;
}
function drawHaul() {
  const s = mission && mission.def.steps[mission.i], st = mission && mission.st; if (!s || !s.haul || street.id !== (s.haul.street || "sea")) return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (s.haul.street) return drawGauge(st, s, "TIER ", "WOBBLES ");   // the pyramid: the gauge without the storm
  // the storm: rain, and lightning now and then
  g.strokeStyle = "rgba(200,220,240,0.35)"; g.lineWidth = 0.8; g.beginPath(); for (let i = 0; i < 60; i++) { const x = (i * 53 + frameNo * 7) % (LW + 40) - 20, y = (i * 37 + frameNo * 9) % LH; g.moveTo(x, y); g.lineTo(x - 4, y + 9); } g.stroke();
  if (frameNo % 400 < 4) { g.globalAlpha = 0.5; R(0, 0, LW, LH, "#e8f0ff"); g.globalAlpha = 1; }
  drawGauge(st, s, "NETS ", "SLIPS ");
}
function drawGauge(st, s, a, b) {
  const cx = LW / 2, cy = 70, zone = 0.32 - (st.got || 0) * 0.03, n = Math.sin(st.ph || 0);
  R(cx - 62, cy - 10, 124, 26, "rgba(14,13,12,0.75)");
  R(cx - 56, cy, 112, 5, "#5a2a22"); R(cx - 56 * zone, cy, 112 * zone, 5, CB(0));
  R(cx + n * 56 - 1, cy - 4, 2, 13, "#f7f4ee");
  text(a + (st.got || 0) + "/" + s.haul.need + "   " + b + (st.miss || 0) + "/" + s.haul.misses, cx, cy + 14, 6, "#f7f4ee");
}
// after three nights: Mausi's boat from the jetty, any hour
function boatTarget(p) {
  if (!flag("boats") || street.id !== "docks" || Math.abs(p.x - 2380) > 24 || mission || arena) return null;
  return { label: "Mausi's boat", x: 2380, y: Y0 - 48, act: () => choose("Mausi's boat", "\"Where? And don't touch anything. That rope is load-bearing.\"",
    [["kinara", 2740, "Sagar Kinara"], ["ghat", 600, "Mandi Ghat"], ["millGate", 160, "Chandni Mills"]].map(([id, x, name]) => ({ label: name, act: () => travelTo(id, x) })).concat({ label: "Stay", act: () => {} })) };
}

/* ---------- hooks ---------- */
function sideTarget(p) {
  // Lakhan offers Rani once the scooter is yours
  if (!mission && !arena && street.id === "garage" && Math.abs(p.x - 200) < 24 && progress.done.includes("2-3") && !progress.done.includes("s3-rani"))
    return { label: "Lakhan: \"Rani?\"", x: 200, y: Y0 - 48, act: () => startMission("s3-rani") };
  return platformTarget(p) || tapeTarget(p) || boatTarget(p);
}
function updateSideLines() { if (frameNo % 600 === 0) tuneRewind(); }
function drawSideLines(P) { drawRaceGhost(P); drawJoshi(P); drawTapes(P); }
