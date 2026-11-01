/* Rollback City: odd jobs (DESIGN 9: repeatable work for money).
   A plain script that shares globals with the others; index.html loads them in order.

   A job is a short mission (the same runner, the same steps) that never counts towards the
   story: it waits at its own marker (a green ₹), pays when it is done, and rests for a few game
   hours before it can be taken again. Failing one costs nothing but the time.
     Chai delivery    the lane's chai stall: three customers, against the clock; jump or get hit
                      and the tray spills
     Vendor protection   a won district's stalls (the Mandi, after 2-3): see off a shakedown
     Dabba run        Bunder Road at lunchtime: the train, a fight in the carriage, two deliveries */
"use strict";

const JOB_REST = 6 * 60;   // game minutes before a finished job can be taken again
const nowMin = () => progress.clock.day * 1440 + progress.clock.min;
const CHAI_STOPS = [["lane", 470, "The pharmacist"], ["lane", 760, "A tailor's apprentice"], ["lane", 1642, "The paanwala"], ["lane", 1898, "The kirana man"],
  ["lane", 2150, "Two card players"], ["gali", 600, "A grandmother on her step"], ["gali", 1100, "The washerman"], ["mandiGate", 450, "The godown watchman"]];
const DABBA_STOPS = [["mandiRoad", 1100, "rafiq", "Rafiq: \"Hot! The lane's dabbas are back.\""], ["weighbridge", 300, "tola", "Tola takes it without looking up. Behind him the scale reads true."],
  ["akhada", 200, "ox", "Bhola: \"Two dabbas today. I am a growing boy.\""], ["lane", 1898, "N", "The kirana man pays the dabbawala's share with a toffee on top."]];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

Object.assign(MISSIONS, {
  "job:chai": { job: true, title: "Chai delivery", needs: ["2-1"], hours: [7, 21], pay: 150, start: { street: "lane", x: 1330 }, make: () => [
    { panels: [{ who: "N", text: "The chaiwala loads a wire tray with three glasses, filled to the brim. \"Don't jump, don't fight, don't spill. Seventy-five seconds, or they're cold.\"" }] },
    { find: shuffle(CHAI_STOPS).slice(0, 3).map(([s, x, who]) => ({ street: s, x, label: "Hand over the chai", back: true, panels: [{ who: "N", text: who + " takes a glass. " + pick(["\"Perfect. Not a drop spilled.\"", "\"Still hot! Here, for you.\"", "\"Tell him less sugar tomorrow.\""]) }] })),
      obj: "Deliver the chai, steadily", brimming: true, time: 75 * 60 }
  ] },
  "job:protect": { job: true, title: "Vendor protection", needs: ["2-3"], hours: [6, 20], pay: 400, payBy: "mandi", respect: 3, start: { street: "mandiRoad", x: 1840 }, make: () => [
    { panels: [{ who: "rafiq", text: pick(["Some of Tola's cousins didn't get the message. They're coming round for \"rent\" again.", "Strangers asking for protection money at the stalls. Protect us from the protection, beta."]) }] },
    { protect: { street: "mandiRoad", x: 1600, stalls: [1520, 1650], hp: 24, waves: shuffle([["porter", "grunt"], ["porter", "porter"], ["grunt", "kicker", "porter"]]).slice(0, 2), keep: 1, name: "The shakedown" }, obj: "Keep the stalls standing" }
  ] },
  "job:dabba": { job: true, title: "Dabba run", needs: ["2-4"], hours: [11, 14], pay: 600, start: { street: "bunderRoad", x: 700 }, make: () => [
    { panels: [{ who: "N", text: "The dabbawalas are a man short again. Six dabbas, two stops at the Mandi end, and Kaal's boys are riding the trains." }] },
    { go: { street: "platform", x: 360 }, obj: "Into the station with the dabbas" },
    { ride: { street: "train", x: 200 }, obj: "Board the lunchtime local" },
    { fight: { street: "train", x: 500, name: "The carriage", waves: [shuffle(["kaal", "grunt", "kicker", "thrower"]).slice(0, 2), ["kaal", "kaal"]] }, obj: "Don't let them spill the dabbas", fragile: 3 },
    { ride: { street: "mandiRoad", x: 2080 }, obj: "Off at the Mandi Road halt" },
    { find: shuffle(DABBA_STOPS).slice(0, 2).map(([s, x, who, text]) => ({ street: s, x, label: "Hand over the dabba", back: s === "akhada" || s === "lane", panels: [{ who, text }] })), obj: "Deliver the dabbas", fragile: 3 }
  ] }
});
const JOBS = Object.keys(MISSIONS).filter((id) => MISSIONS[id].job);
const raidOpen = (j) => !j.raid || !!(progress.raid && progress.raid.d === j.raid && !progress.raid.done && progress.raid.day === progress.clock.day);
const jobOpen = (id) => { const j = MISSIONS[id]; return hasMoney() && raidOpen(j) && (j.needs || []).every((n) => progress.done.includes(n)) && nowMin() >= ((progress.jobs || {})[id] || 0); };
const inHours = hourIn;
// a job's marker for missionTarget: open, resting, or out of hours
function jobTarget(p) {
  for (const id of JOBS) {
    const j = MISSIONS[id];
    if (j.start.street !== street.id || Math.abs(p.x - j.start.x) > 24 || !hasMoney() || !(j.needs || []).every((n) => progress.done.includes(n)) || !raidOpen(j)) continue;
    if (!jobOpen(id)) return { label: j.title + ": nothing for now, come back later", x: j.start.x, y: Y0 - 40, act: () => {} };
    if (!inHours(j.hours)) return { label: j.title + ": " + hoursText(j.hours), x: j.start.x, y: Y0 - 40, act: () => {} };
    return { label: "Job: " + j.title + " (" + rupees(j.pay) + ")", x: j.start.x, y: Y0 - 40, act: () => startMission(id) };
  }
  return null;
}
// a finished job pays, and rests
function finishJob(def, id) {
  (progress.jobs = progress.jobs || {})[id] = nowMin() + JOB_REST;
  const pay = Math.round(def.pay * (def.payBy ? 0.5 + respect(def.payBy) / 100 : 1) / 10) * 10;   // a district that trusts you pays you better
  earn(pay); if (def.respect) changeRespect(def.respect);
  if (def.raid) { progress.raid.done = true; changeRespect(3, def.raid); }
  banner = { text: def.title + ": paid " + rupees(pay), t: 150, big: true };
}
function drawJobMarkers(P) {
  for (const id of JOBS) {
    const j = MISSIONS[id]; if (j.start.street !== street.id || !jobOpen(id) || !inHours(j.hours)) continue;
    const x = Math.round(j.start.x - cam); if (x < -20 || x > LW + 20) continue;
    g.globalAlpha = 0.5 + 0.3 * Math.sin(frameNo / 9); g.strokeStyle = "#3fae5a"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, Y0 + 14, 16, 4, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
    text("₹", x, Y0 - 6 + Math.sin(frameNo / 10) * 2, 11, "#3fae5a", "center", "IBM Plex Sans");
  }
}
// the chai tray: a jump, a hit or a fall spills it
function brimming(s) {
  return s.brimming && alivePlayers().some((p) => p.st === "air" || p.st === "hurt" || DOWN_STATES.includes(p.st));
}
