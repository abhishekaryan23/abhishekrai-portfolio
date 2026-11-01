/* Rollback City: missions.
   A plain script that shares globals with the others; index.html loads them in order.

   A mission is a list of steps (DESIGN 10.1), run one after another:
     scene   story panels (a SCENES name, or panels given inline)
     go      reach a spot: { street, x, r }
     talk    use someone at a spot, then their panels play
     find    use every spot in a list, in any order; a spot can be guarded by waves
     fight   waves at a spot; the camera holds there until they are down
     boss    the same, with a boss in the first wave and adds as its health falls
     protect waves at a spot while goondas go for the stalls; too many lost fails
     chase   knock down someone running for the end of the street before he gets there
     ride    a scripted trip (onto the train, across the river): a wipe to another street
     eavesdrop  listen at tables without being spotted (stealth.js); spotted, it is a fight
     dance   a dance-off: arrows on the beat (beat.js); enough hits to pass
     drill   Bhola's training: a sparring partner who only taps, until enough blocks, parries or dodges
   A step can also carry then (run when it is done) and fragile (that many knock-downs during
   it, counted across the mission, spill the cargo and fail it); a mission can have hours (when
   its marker is open) and a reward (rupees, respect).
   A step with checkpoint: true is where Retry starts from. Being knocked out, losing the stalls,
   letting a runner escape or running out of time fails the mission. */
"use strict";

let progress = { done: [], flags: {}, clock: { day: 1, min: 0 } };   // this save's story: missions finished, what they unlocked
let mission = null;                       // the mission being played

// Act 1, "11:58": the original night as missions (DESIGN 5). Each one's start waits at a marker.
const watchFound = () => { progress.flags.watch = true; rewinds = rewindMax(); texts.push({ x: players[0].x, y: players[0].y - 80, s: "Nani's watch: " + (padLast ? "RT" : TOUCH ? "the gold button" : "R") + " turns back ten seconds", t: 240 }); };
const freed = (x) => () => { const c = makeCiv(x); Object.assign(c, { st: "stand", wait: 400, y: Y0 + 6 }); civs.push(c); };
const MISSIONS = {
  "1-1": { act: 1, title: "Lights Out", start: { street: "lane", x: 1216 }, steps: [
    { scene: "prologue" },
    { find: [
      { street: "dhaba", x: 90, label: "Pick up the watch", back: true, then: watchFound, panels: [
        { who: "kai", text: "I wound it while you were looking. The hands pull backwards, bhaiya. Like they want to." },
        { who: "rai", text: "Keep it on you. Nani never let it out of her sight for a reason." }] },
      { street: "lane", x: 860, label: "Look around the pump", panels: [
        { who: "N", text: "Under the hand pump: a marigold from Nani's hair, crushed, and the marks of a cart dragged east." }] },
      { street: "lane", x: 2236, label: "Read the chit", guard: [["grunt", "grunt"]], panels: [
        { who: "N", text: "One of the goondas dropped a chit: \"Bhola. Empty every shop on the lane by twelve.\"" }] }
    ], obj: "Search the lane for clues" },
    { panels: [
      { who: "rai", text: "Bhola's men. They're emptying the shops, and they took Nani with the stock." },
      { who: "kai", text: "Then we start with the shops. Every shutter on the lane." }] }
  ] },
  "1-2": { act: 1, title: "The Whole Lane Is Closing", needs: ["1-1"], start: { street: "lane", x: 2120 }, steps: [
    { panels: [{ who: "N", dark: 0.6, text: "Every shutter on Chandni Lane is coming down. Behind three of them, someone is banging to be let out." }] },
    { find: [
      { street: "lane", x: 1898, label: "Open the shutter", back: true, shutter: true, guard: [["grunt", "pipeGrunt"]], then: freed(1898), panels: [
        { who: "N", text: "The kirana man tumbles out: \"They took the till, and the photo off my wall. Bhola's boys, every one of them.\"" }] },
      { street: "gali", x: 700, label: "Open the back door", back: true, shutter: true, guard: [["kicker", "grunt"]], then: freed(700), panels: [
        { who: "N", text: "The tailor, with a mouthful of pins: \"Bhola wants the lane empty by midnight. Who wants a lane at midnight?\"" }] },
      { street: "mandiGate", x: 450, label: "Open the godown", back: true, shutter: true, guard: [["bruiser", "grunt"]], then: freed(450), panels: [
        { who: "N", text: "The chemist, blinking at the light: \"Bhola is at the gate with a truck. He's loading the whole lane onto it.\"" }] }
    ], obj: "Free the shopkeepers" },
    { go: { street: "mandiGate", x: 1080 }, obj: "Find Bhola at the Mandi Gate truck", checkpoint: true },
    { boss: { street: "mandiGate", x: 1250, kind: "ox", name: "Bhola the Ox", waves: [["ox"]], adds: [[0.5, ["grunt", "pipeGrunt"]]] }, obj: "Beat Bhola", checkpoint: true },
    { scene: "end0" }
  ] },
  "1-3": { act: 1, title: "The Last Train", needs: ["1-2"], start: { street: "bunderRoad", x: 760 }, steps: [
    { scene: "intro1" },
    { go: { street: "platform", x: 320 }, obj: "Into the station" },
    { fight: { street: "platform", x: 620, name: "Platform 2", waves: [["grunt", "kicker"], ["thrower", "grunt", "grunt"]] }, obj: "Clear the platform", checkpoint: true },
    { panels: [{ who: "N", dark: 0.6, text: "A horn from the tunnel. The 11:58 pulls in, every window lit, nobody at the controls." },
      { who: "kai", text: "That's the 11:58. Nani used to say it still runs for the people who missed it. Get on." }] },
    { ride: { street: "train", x: 90 }, obj: "Board the last train" },
    { fight: { street: "train", x: 300, name: "Carriage 1", waves: [["bruiser", "kicker", "grunt"]] }, obj: "Fight through the carriages", checkpoint: true },
    { fight: { street: "train", x: 820, name: "Carriage 2", waves: [["thrower", "thrower", "grunt"], ["kicker", "kicker", "pipeGrunt"]] }, obj: "Fight through the carriages" },
    { go: { street: "train", x: 1440 }, obj: "Up through the roof hatch" },
    { panels: [{ who: "N", dark: 0.5, text: "On the roof the wind is a wall. Bridges come out of the dark every few seconds. Hold down to duck." }] },
    { ride: { street: "trainRoof", x: 140 }, obj: "Climb onto the roof" },
    { boss: { street: "trainRoof", x: 620, kind: "rook", name: "Raghav", waves: [["rook"]], adds: [[0.5, ["kicker", "kicker"]]] }, obj: "Beat Raghav on the roof", checkpoint: true },
    { scene: "end1" },
    { ride: { street: "platform", x: 700 }, obj: "The train pulls back into Bunder Road" }
  ] },
  "1-4": { act: 1, title: "Kite Wars", needs: ["1-3"], start: { street: "lane", x: 560 }, steps: [
    { scene: "intro2" },
    { go: { street: "roofs", x: 320 }, obj: "Up the stairs to the roofs" },
    { fight: { street: "roofs", x: 700, name: "Water Tanks", waves: [["kicker", "thrower", "grunt"]] }, obj: "Take the roofs back from Cheel's runners", checkpoint: true },
    { go: { street: "roofs", x: 1180 }, obj: "Jump the gap: run, then jump" },
    { fight: { street: "roofs", x: 1400, name: "Billboard", waves: [["bruiser", "bruiser", "thrower"], ["kicker", "pipeGrunt", "thrower"]] }, obj: "Clear the billboard roof", checkpoint: true },
    { go: { street: "roofs", x: 1900 }, obj: "Grab the kite wire and zip across" },
    { boss: { street: "roofs", x: 2020, kind: "crane", name: "Cheel", waves: [["crane"]], adds: [[0.5, ["thrower", "thrower"]]] }, obj: "Beat Cheel", checkpoint: true },
    { scene: "end2" }
  ] },
  "1-5": { act: 1, title: "Across the River", needs: ["1-4"], start: { street: "mandiGate", x: 1600 }, steps: [
    { panels: [{ who: "N", dark: 0.5, text: "Behind the Mandi the old ferry still runs at night. Across the water the mill is lit like a wedding, and somebody has started the looms." }] },
    { go: { street: "ghat", x: 520 }, obj: "Down to the ghat" },
    { ride: { street: "ferry", x: 160 }, obj: "Take the ferry" },
    { fight: { street: "ferry", x: 320, name: "The ferry deck", waves: [["kicker", "kicker", "pipeGrunt"], ["bruiser", "thrower", "grunt"]] }, obj: "Keep the deck clear", checkpoint: true },
    { ride: { street: "millGate", x: 140 }, obj: "Off at the mill" },
    { scene: "intro3" },
    { fight: { street: "millGate", x: 470, name: "Mill Gate", waves: [["bruiser", "kicker", "thrower"], ["grunt", "grunt", "pipeGrunt"]] }, obj: "Through the mill gate", checkpoint: true },
    { fight: { street: "millGate", x: 960, name: "Loom Floor", waves: [["bruiser", "bruiser", "kicker"], ["thrower", "thrower", "kicker"]] }, obj: "Across the loom floor" },
    { fight: { street: "millGate", x: 1450, name: "Boiler Hall", waves: [["kicker", "kicker", "thrower"], ["bruiser", "pipeGrunt", "kicker"]] }, obj: "Through the boiler hall", checkpoint: true },
    { find: [{ street: "millGate", x: 1925, label: "Look at the desk", back: true, scene: "block3_3" }], obj: "The office upstairs" }
  ] },
  "1-6": { act: 1, title: "Everything Goes Back", needs: ["1-5"], start: { street: "millGate", x: 2010 }, after: actOneEnd, steps: [
    { boss: { street: "millGate", x: 2260, kind: "rollback", name: "Ranjit", waves: [["rollback"]], adds: [[0.66, ["kicker", "thrower"]], [0.33, ["bruiser", "pipeGrunt"]]], belts: true }, obj: "Stop Ranjit", checkpoint: true },
    { scene: "end3" },
    { scene: () => (lettersFound().length === 4 ? "act1True" : "act1Plain") },
    { ride: { street: "lane", x: 1216 }, obj: "Home to the dhaba" }
  ] },
  // every step type, start to finish: reachable from the console with startMission("test")
  test: { title: "Test run", start: { street: "lane", x: 1400 }, steps: [
    { panels: [{ who: "N", text: "A test of every kind of mission step." }] },
    { go: { street: "lane", x: 1500 }, obj: "Walk to the lamp post" },
    { talk: { street: "lane", x: 1600, label: "Talk", npc: ["grunt", "#efe6d2"] }, panels: [{ who: "N", text: "The paanwala says hello." }], obj: "Talk to the paanwala" },
    { find: [{ street: "lane", x: 1700, label: "Search", panels: [{ who: "N", text: "A clue." }] },
             { street: "lane", x: 1850, label: "Search", guard: [["grunt"]], panels: [{ who: "N", text: "Another clue." }] }], obj: "Search two spots" },
    { fight: { street: "lane", x: 1950, waves: [["grunt", "kicker"]] }, obj: "Beat the goondas", checkpoint: true },
    { protect: { street: "lane", x: 2050, stalls: [1990, 2110], hp: 30, waves: [["grunt", "grunt"]], keep: 1 }, obj: "Keep the stalls standing" },
    { chase: { street: "lane", kind: "grunt", x: 2120, to: 2390 }, obj: "Catch him before the gate", time: 60 * 20 },
    { ride: { street: "gali", x: 400 }, obj: "Into the gali" },
    { boss: { street: "gali", x: 800, kind: "ox", waves: [["ox"]], adds: [[0.5, ["grunt"]]] }, obj: "Beat Bhola", checkpoint: true }
  ] }
};

const missionReady = (id) => !!MISSIONS[id] && !progress.done.includes(id) && (MISSIONS[id].needs || []).every((n) => progress.done.includes(n));
// the next story mission waiting to be started (test missions have no act)
const nextMission = () => !progress.mode1987 && !progress.explore && Object.keys(MISSIONS).find((id) => MISSIONS[id].act && missionReady(id));
const flag = (f) => !!progress.flags[f];

function startMission(id) {
  const def = MISSIONS[id].make ? { ...MISSIONS[id], steps: MISSIONS[id].make() } : MISSIONS[id];   // a job is dealt fresh each time
  mission = { id, def, i: -1, st: null, cp: null };
  banner = { text: def.title, t: 150, big: true };
  Arcade.tone(523, 0.1, "square", 0.05); setTimeout(() => Arcade.tone(784, 0.14, "square", 0.05), 110);
  setCheckpoint(0);
  rewindReset();
  beginStep(0);
}
function setCheckpoint(i) {
  mission.cp = { i, street: street.id, x: Math.round((alivePlayers()[0] || players[0]).x), y: Math.round((alivePlayers()[0] || players[0]).y),
    players: players.map((p) => p && { hp: p.hp, lives: p.lives, sp: p.sp, weapon: p.weapon && { ...p.weapon } }) };
}
function beginStep(i) {
  mission.i = i;
  const s = mission.def.steps[i];
  if (!s) { completeMission(); return; }
  if (s.if && !s.if()) { beginStep(i + 1); return; }   // a step on the other branch
  if (s.checkpoint && i > 0) setCheckpoint(i);
  const st = mission.st = { t: 0, done: false, found: [], arenas: [] };
  rwBuf = [];   // the watch does not turn back across a step
  if ((s.scene || s.panels) && !s.talk) playScene((typeof s.scene === "function" ? s.scene() : s.scene) || null, () => { st.done = true; }, s.panels);   // a talk step plays its panels when you talk
  if (s.ride) travelTo(s.ride.street, s.ride.x, s.ride.y);
  if (s.find) st.arenas = s.find.map((f) => f.guard && { x: f.x, name: f.name || "", waves: f.guard });
  if (s.protect) st.stalls = s.protect.stalls.map((x) => ({ x, hp: s.protect.hp, max: s.protect.hp }));
  st.count = 0;
}
// the spot a step points at, for the objective arrow and the map
function stepTarget(s) {
  if (!s) return null;
  const at = s.go || s.talk || s.fight || s.boss || s.protect || s.chase || s.ride || s.dance || s.eavesdrop || s.rescue || s.catch || s.brawl || (s.sneak && { street: (s.sneak.files.find(([id]) => !(mission.st.found || []).includes(id)) || s.sneak.files[0])[0], x: 200 }) || (s.race && { street: s.race.street, x: s.race.from });
  if (at) return at;
  if (s.find) { const left = s.find.filter((f, k) => !mission.st.found.includes(k)); return left.find((f) => f.street === street.id) || left[0] || null; }
  return null;
}
function objective() {
  if (!mission) { const id = nextMission(); return id ? { text: "Next: " + MISSIONS[id].title, at: MISSIONS[id].start } : null; }
  const s = mission.def.steps[mission.i]; if (!s || ((s.scene || s.panels) && !s.talk)) return null;
  let t = (typeof s.obj === "function" ? s.obj() : s.obj) || "";
  if (s.find) t += " (" + mission.st.found.length + " of " + s.find.length + ")";
  if (s.rescue && mission.st.people) t += " (" + mission.st.saved + " of " + s.rescue.doors.length + " out)";
  if (s.time) t += "  " + Math.max(0, Math.ceil((s.time - mission.st.t) / 60)) + "s";
  if (s.drill) t += " (" + mission.st.count + " of " + s.drill.n + ")";
  if (s.fragile) t += "  dabbas " + (6 - (mission.spilled || 0)) + "/6";
  return { text: t, at: stepTarget(s) };
}

function updateMission() {
  if (!mission || state !== "play") return;
  const s = mission.def.steps[mission.i], st = mission.st; if (!s) return;
  st.t++;
  const ap = alivePlayers(), on = (at) => at && street.id === at.street;
  const near = (at, r) => on(at) && ap.some((p) => Math.abs(p.x - at.x) < r);
  let done = st.done;
  if (s.go) done = near(s.go, s.go.r || 30);
  else if (s.find) {
    s.find.forEach((f, k) => {
      const a = st.arenas[k];
      if (a && !a.done && !arena && near(f, 70)) startArena(a);
    });
    done = st.found.length >= s.find.length;
  }
  else if (s.fight || s.boss) {
    const at = s.fight || s.boss;
    if (st.arena && !st.arena.done && !arena && near(at, 50)) startArena(st.arena);   // back after a fall
    else if (!st.arena && near(at, 50)) { st.arena = { x: at.x, name: at.name || "", waves: at.waves, adds: at.adds, boss: s.boss ? at.kind : null, belts: at.belts }; startArena(st.arena); }
    done = !!st.arena && st.arena.done;
  }
  else if (s.protect) {
    const at = s.protect;
    if (!st.arena && near(at, 80)) {
      st.arena = { x: at.x, name: at.name || "", waves: at.waves }; startArena(st.arena);
      st.arena.onSpawn = (e, n) => { if (n % 2 === 0) e.goal = st.stalls[n % st.stalls.length]; };
    }
    if (st.stalls.filter((g) => g.hp > 0).length < at.keep) { failMission(at.fail || "Too many stalls were smashed"); return; }
    done = !!st.arena && st.arena.done;
  }
  else if (s.chase) {
    const c = s.chase;
    if (!st.runner && on(c)) { const e = fighter(c.kind, c.x, street.water ? 186 : Y0 + 20, "e"); e.runner = c.to; e.face = Math.sign(c.to - c.x) || 1; if (street.water) e.boat = { veh: true, kind: "boat", x: e.x, y: e.y, face: e.face, down: 0 }; enemies.push(e); st.runner = e; fighterArt(SHEET_OF[c.kind]); }
    const e = st.runner;
    if (e && !done && !on(c)) { failMission(c.fail || "He got away"); return; }
    if (e && !done) {
      if (DOWN_STATES.includes(e.st) || e.st === "hurt") { done = true; e.runner = null; e.roam = true; e.aggro = true; if (e.boat) { e.gone = true; sayAt(e.x, e.y - 50, "Splash! He swims for it", 100); } }
      else if (Math.abs(e.x - c.to) < 6 || (on(c) && Math.sign(c.to - e.x) !== e.face)) { failMission(c.fail || "He got away"); return; }
    }
  }
  else if (s.ride) done = !wipe && street.id === s.ride.street;
  else if (s.eavesdrop) {
    if (!st.ev && near(s.eavesdrop, 200)) startEavesdrop(s, st);
    if (st.ev) done = updateEavesdrop(s, st);
  }
  else if (s.rescue) done = updateRescue(s, st);
  else if (s.brawl) done = updateBrawl(s, st);
  else if (s.catch) done = updateCatch(s, st);
  else if (s.race) done = updateRace(s, st);
  else if (s.haul) done = updateHaul(s, st);
  else if (s.sneak) done = updateSneak(s, st);
  else if (s.develop) done = updateDevelop(s, st);
  else if (s.choice) {
    // a decision card; closing it without choosing just asks again
    const c = s.choice;
    if (!st.picked && !choiceOpen && state === "play" && !wipe) choose(c.title, (typeof c.text === "function" ? c.text() : c.text) + (st.why ? "\n\n" + st.why : ""), c.options.map((o) => ({
      label: typeof o.label === "function" ? o.label() : o.label,
      act: () => { if (o.ok && !o.ok()) { st.why = typeof o.no === "function" ? o.no() : o.no; return; } st.picked = true; for (const o2 of c.options) if (o2.flag) delete progress.flags[o2.flag]; if (o.flag) progress.flags[o.flag] = true; if (o.act) o.act(); } })));
    done = !!st.picked;
  }
  else if (s.dance) {
    if (!st.dance && near(s.dance, 60)) startDance(s);
    if (st.dance && !st.dance.over && updateDance()) {
      if (st.dance.hits >= s.dance.need) done = true;
      else { failMission(s.dance.fail || "The bouncer shakes his head: not tonight"); return; }
    }
  }
  else if (s.drill) {
    // the sparring partner: back on his feet (or back in the room) whenever he is down
    const p0 = ap[0];
    if (p0 && (!st.spar || st.spar.gone || !enemies.includes(st.spar))) {
      const e = fighter("wrestler", clamp(p0.x + 60, 40, street.w - 40), p0.y, "e"); Object.assign(e, { spar: true, aggro: true, hp: 999, max: 999, cool: 40 }); enemies.push(e); st.spar = e; fighterArt("wrestler");
    }
    if (st.spar && st.spar.hp < 900) st.spar.hp = 999;
    done = st.count >= s.drill.n;
    if (done && st.spar) { st.spar.gone = true; st.spar = null; }
  }
  if (done && s.need && !s.need()) done = false;   // e.g. a taxi fare only counts in Rani
  if (s.time && st.t > s.time) { failMission(s.timeFail || "Out of time"); return; }
  if (brimming(s)) { failMission("You spilled the chai"); return; }
  if (done) { if (s.then) s.then(); beginStep(mission.i + 1); }
}
// someone running for the end of the street (a chase): ignores the players, just runs
function updateRunner(e) {
  if (e.boat) { e.x += e.face * 3; Object.assign(e.boat, { x: e.x, y: e.y, face: e.face }); setState(e, "ride", e.t + 1); return; }   // at sea, in a boat
  e.x += e.face * 1.7;   // quicker than a walk, slower than a run
  e.walkPh += 0.3; setState(e, "walk", e.t + 1); }

// what a player can use for the mission right here: a mission's start, someone to talk to, a spot to search
function missionTarget(p) {
  const back = p.y < Y0 + 26;
  if (!mission) {
    const id = nextMission(), m = id && MISSIONS[id];
    if (m && m.start && m.start.street === street.id && Math.abs(p.x - m.start.x) < 24 && !arena) {
      if (m.tin && (progress.tin || 0) < m.tin) return { label: m.title + ": put " + rupees(m.tin - (progress.tin || 0)) + " more in the committee tin first", x: m.start.x, y: Y0 - 40, act: () => {} };
      if (m.hours && !hourIn(m.hours)) return { label: m.title + ": come back " + hoursText(m.hours), x: m.start.x, y: Y0 - 40, act: () => {} };
      return { label: "Start: " + m.title, x: m.start.x, y: Y0 - 40, act: () => startMission(id) };
    }
    return arena ? null : jobTarget(p);
  }
  const s = mission.def.steps[mission.i], st = mission.st; if (!s || st.busy) return null;
  if (s.rescue) return rescueTarget(p);
  if (s.brawl) return brawlTarget(p);
  if (s.talk && s.talk.street === street.id && Math.abs(p.x - s.talk.x) < 26)
    return { label: s.talk.label || "Talk", x: s.talk.x, y: Y0 - 48, act: () => { st.busy = true; playScene(s.scene || null, () => { st.done = true; st.busy = false; }, s.panels); } };
  if (s.find) for (let k = 0; k < s.find.length; k++) {
    const f = s.find[k], a = st.arenas[k];
    if (st.found.includes(k) || f.street !== street.id || Math.abs(p.x - f.x) > 26 || (a && !a.done) || (f.back && !back)) continue;
    return { label: f.label || "Search", x: f.x, y: Y0 - 44, act: () => { st.busy = true; playScene(f.scene || null, () => { st.found.push(k); st.busy = false; if (f.then) f.then(); }, f.panels); } };
  }
  return null;
}

function completeMission() {
  const def = mission.def, id = mission.id;
  if (def.job) { mission = null; finishJob(def, id); [523, 784, 1047].forEach((f, i) => setTimeout(() => Arcade.tone(f, 0.12, "square", 0.05), i * 100)); saveGame(true); return; }
  if (!progress.done.includes(id)) progress.done.push(id);
  for (const f of def.flags || []) progress.flags[f] = true;
  const rw = def.reward || {};
  if (rw.rs) earn(rw.rs);
  for (const d in rw.respect || {}) changeRespect(rw.respect[d], d);
  mission = null;
  banner = { text: "Mission complete: " + def.title, t: 180, big: true };
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => Arcade.tone(f, 0.14, "square", 0.05), i * 110));
  if (def.after) def.after();
  if (HEADLINES[id]) logNews(typeof HEADLINES[id] === "function" ? HEADLINES[id]() : HEADLINES[id]);   // tomorrow's paper
  if (def.act) keepMoment(def.title);
  saveGame(true);   // after the after-hook, so what it sets (heat, a move) is in the slot
}
function failMission(why) {
  if (!mission || state === "failed") return;
  state = "failed"; down.clear(); progress.flags.failed = true;
  $("fail-why").textContent = why;
  showCard("card-fail", "f-retry");
  Arcade.tone(160, 0.5, "sawtooth", 0.05, -80);
}
// put everyone back as they were at the checkpoint and run that step again
function retryMission() {
  const cp = mission.cp;
  state = "play"; paused = false; showCard(null);
  if (scene) { scene = null; $("stage-wrap").classList.remove("story"); }
  loadStreet(cp.street, cp.x, cp.y);
  players.forEach((p, i) => { const q = cp.players[i]; if (!p || !q) return; Object.assign(p, { hp: q.hp, lives: q.lives, sp: q.sp, weapon: q.weapon && { ...q.weapon }, inv: 90 }); setState(p, q.lives > 0 ? "idle" : "out"); });
  rewindReset(); mission.spilled = 0;
  beginStep(cp.i);
}
function giveUpMission() {
  const start = mission.def.start || START_AT;
  if (mission.def.giveUp) mission.def.giveUp();   // undo what a half-done mission set up
  mission = null; state = "play"; paused = false; showCard(null);
  if (scene) { scene = null; $("stage-wrap").classList.remove("story"); }
  loadStreet(start.street, start.x);
  players.forEach((p) => { if (p && p.lives <= 0) { p.lives = 1; p.hp = p.max; setState(p, "idle"); } });
  banner = { text: "Mission abandoned", t: 120 };
}

/* drawing: the start marker, people to talk to, spots to search, stalls to keep */
function drawMission(P) {
  // the spot to go to: a soft glow on the ground, a twinkle, and a small pixel arrow bobbing over it
  // (in place of the old pink ellipse, which read as a UI ring rather than part of the street)
  const ring = (x, y, c, bare) => {
    x = Math.round(x); if (x < -20 || x > LW + 20) return;
    const t = frameNo / 10, bob = Math.round(Math.sin(t) * 2);
    g.globalAlpha = 0.16 + 0.06 * Math.sin(t); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 13, 3.5, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    if (frameNo % 50 < 12) { const k = frameNo % 50 < 6 ? 2 : 1; R(x - k, y - 6, k * 2 + 1, 1, "#fff6d8"); R(x, y - 6 - k, 1, k * 2 + 1, "#fff6d8"); }
    if (bare) return;
    const ay = y - 34 + bob;
    R(x - 4, ay - 1, 9, 4, "#1d1b18"); R(x - 3, ay + 3, 7, 2, "#1d1b18"); R(x - 2, ay + 5, 5, 2, "#1d1b18"); R(x - 1, ay + 7, 3, 1, "#1d1b18");
    R(x - 3, ay, 7, 3, c); R(x - 2, ay + 3, 5, 2, c); R(x - 1, ay + 5, 3, 2, c); R(x - 3, ay, 7, 1, "#fff6d8");
  };
  if (!mission) {
    const id = nextMission(), m = id && MISSIONS[id];
    if (m && m.start && m.start.street === street.id) { const x = m.start.x - cam; ring(x, Y0 + 14, "#f2c230", true); text("!", x, Y0 - 6 + Math.sin(frameNo / 10) * 2, 12, "#f2c230", "center", "Newsreader"); }
    drawJobMarkers(P);
    return;
  }
  const s = mission.def.steps[mission.i], st = mission.st; if (!s) return;
  if (s.find) s.find.forEach((f, k) => {
    if (st.found.includes(k) || f.street !== street.id) return;
    const x = Math.round(f.x - cam);
    if (f.shutter) { R(x - 13, 104, 26, 46, P.dark ? "#4a4650" : "#8f8a96"); for (let y = 106; y < 150; y += 3) R(x - 13, y, 26, 1, P.dark ? "#36333b" : "#77727f"); R(x - 4, 146, 8, 2, P.ol); if (frameNo % 40 < 6) text("bang", x, 100, 5, P.T.amber); }
    if (f.notice) { R(x - 9, 102, 18, 22, "#f7f4ee"); R(x - 9, 102, 18, 5, "#c0392b"); for (let y = 110; y < 122; y += 3) R(x - 7, y, 14, 1, "#9aa5b0"); R(x - 1, 100, 2, 3, P.ol); }
    if (!(st.arenas[k] && !st.arenas[k].done)) ring(x, (f.back ? Y0 + 4 : Y0 + 14), "#f2c230");
  });
  if (s.go && s.go.street === street.id) ring(s.go.x - cam, Y0 + 14, "#f2c230");
  if (s.protect && st.stalls && s.protect.street === street.id) for (const g0 of st.stalls) {
    const x = g0.x - cam; if (x < -30 || x > LW + 30) continue;
    bar(x - 14, Y0 - 30, 28, 3, g0.hp / g0.max, g0.hp > 0 ? P.T.amber : P.T.red);
    if (g0.hp <= 0) text("Smashed", x, Y0 - 34, 5, P.T.red);
  }
}
// people a mission puts on the street (someone to talk to), drawn like passers-by
function missionNpcs() {
  if (!mission) return [];
  const s = mission.def.steps[mission.i];
  if (s && s.talk && s.talk.npc && s.talk.street === street.id) {
    const c = s.talk.npc, own = !Array.isArray(c);   // a townsperson's own sheet, or a goonda's tinted
    if (c.kind) {   // one of the cast, on their own fighter sheet
      if (!(mission.npc && mission.npc.at === s.talk)) { fighterArt(SHEET_OF[c.kind]); mission.npc = fighter(c.kind, s.talk.x, s.talk.y || Y0 + 8, "n"); mission.npc.face = c.face || -1; mission.npc.at = s.talk; }
      return [mission.npc];
    }
    const n = mission.npc && mission.npc.at === s.talk ? mission.npc : (mission.npc = { civ: true, at: s.talk, look: own ? c.look : null, base: own ? c.base : 0, sheet: own ? null : c[0], tint: own ? null : c[1], x: s.talk.x, y: Y0 + 4, face: -1, st: "stand", walkPh: 0 });
    return [n];
  }
  return [];
}
// a goonda sent for a stall: walks to it and smashes it unless a player is in the way
function goForStall(e) {
  const g0 = e.goal, k = KINDS[e.kind];
  if (!g0 || g0.hp <= 0 || alivePlayers().some((p) => Math.abs(p.x - e.x) < 46 && Math.abs(p.y - e.y) < 20)) return false;
  const dx = g0.x - e.x, dy = Y0 + 4 - e.y;
  if (Math.abs(dx) > 14 || Math.abs(dy) > 4) {
    e.x += Math.sign(dx) * Math.min(k.speed, Math.abs(dx)); e.y += Math.sign(dy) * Math.min(k.speed * 0.7, Math.abs(dy));
    e.face = Math.sign(dx) || e.face; e.walkPh += k.speed * STRIDE * 1.1; setState(e, "walk", e.t + 1); return true;
  }
  e.face = Math.sign(dx) || e.face;
  if (e.cool <= 0) { g0.hp = Math.max(0, g0.hp - 6); e.cool = rand(50, 80); windup(e, "heavy", 12); burst(g0.x, Y0 - 10, 6, PAL.wood); Arcade.noise(0.08, 0.06); }
  else setState(e, "idle", e.t + 1);
  return true;
}

// the end of Act 1: midnight, and the city's clocks run again
function actOneEnd() {
  progress.flags.midnight = true; progress.clock = { day: 1, min: 0, frac: 0 }; saveGame(true);
  $("end-title").textContent = "Act 1 complete: 11:58";
  $("end-result").textContent = "Score " + totalScore().toLocaleString() + ", Nani's letters " + lettersFound().length + " of 4";
  $("end-note").textContent = "Midnight. The clocks are running and the city is waking up. Sleep at the dhaba; in the morning there will be a notice on the door.";
  $("continue").hidden = false; $("continue").textContent = "Keep walking the city";
  state = "actend"; showCard("card-end", "continue");
  if (lettersFound().length === 4) Arcade.secret("letters");
  if (!flag("failed")) { Arcade.secret("onecredit", true); Arcade.toast("The whole night without a single retry: the gold costume is yours."); }
}


// Bhola's drills: a block, a parry or a dodge, counted when the step asks for it
function drillNote(kind, p) {
  const s = mission && mission.def.steps[mission.i], st = mission && mission.st;
  if (!s || !s.drill || state !== "play") return;
  if (kind === "dodge" && !(st.spar && ["windup", "attack"].includes(st.spar.st) && Math.abs(st.spar.x - p.x) < 80)) return;
  if (s.drill.kind !== kind && !(s.drill.kind === "block" && kind === "parry")) return;
  st.count++; texts.push({ x: p.x, y: p.y - 76, s: pick(["Shabash!", "Good!", "Again!"]) + " " + Math.min(st.count, s.drill.n) + "/" + s.drill.n, t: 70 });
}
// a player knocked down while carrying something that spills (the dabbas)
function missionKnock(p) {
  const s = mission && mission.def.steps[mission.i];
  if (!s || !s.fragile || state !== "play") return;
  mission.spilled = (mission.spilled || 0) + 1;
  texts.push({ x: p.x, y: p.y - 80, s: "A dabba spills!", t: 80 }); Arcade.noise(0.15, 0.06);
  if (mission.spilled >= s.fragile) failMission("Too many dabbas spilled");
}
