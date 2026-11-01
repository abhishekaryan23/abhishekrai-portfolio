/* Rollback City: the end of Act 2 (DESIGN 6, 2-10 and 2-11; 3.8 of the plan). A plain script that
   shares globals with the others; index.html loads them in order.

   2-10 Bail or Break: Godbole has Ranjit in the Bunder Road lock-up. Pay the bail (your share of
   it, honest and dear) or break him out through Godbole himself (free, four lights, and a grudge).
   The choice is a flag, "bailed" or "broke", that later acts read. 2-11 Second Instalment: five
   lakh in a bag on Lakhan's motorbike, along the coast road, with the Neon Saanp coming alongside.
   Knocked off the bike, the bag flies: grab it back before one of them scoops it up. */
"use strict";

const BAIL = 5000;   // your share; the lane finds the rest of the three lakh

/* ---------- the coast road run (a mission step: { brawl: { street, x, to } }) ---------- */
const brawling = () => { const s = mission && mission.def.steps[mission.i]; return !!(s && (s.brawl || (s.race && s.race.name === "the convoy"))); };   // the coast road runs, with Saanp out-riders
const BAG_T = 8 * 60;   // how long a dropped bag lies on the road before a Saanp has it
function updateBrawl(s, st) {
  const B = s.brawl, p = alivePlayers()[0];
  if (!p) return false;
  if (street.id !== B.street) return !st.bag && street.id === "bunderRoad";   // off the coast road at the far end
  if (!st.begun) { st.begun = true; bikerT = 60; }   // they were waiting for you
  const riding = !!(p.ride && p.ride.rider === p);
  // thrown off the bike: the bag goes flying
  if (st.riding && !riding && !st.bag && (DOWN_STATES.includes(p.st) || p.st === "hurt" || p.st === "fly")) {
    st.bag = { x: clamp(p.x + p.face * 30, 40, street.w - 40), y: clamp(p.y + 6, Y0 + 6, Y1), t: 0 };
    banner = { text: "The bag!", t: 80 }; Arcade.noise(0.15, 0.05);
  }
  st.riding = riding;
  if (st.bag && ++st.bag.t > BAG_T) { failMission("A Saanp scooped up the bag and was gone"); return false; }
  return riding && !st.bag && p.x <= B.to;
}
function brawlTarget(p) {
  const st = mission.st;
  if (!st.bag || Math.abs(p.x - st.bag.x) > 20 || Math.abs(p.y - st.bag.y) > 16 || p.ride) return null;
  return { label: "Grab the bag", x: st.bag.x, y: st.bag.y - 30, act: () => { st.bag = null; Arcade.tone(880, 0.08, "triangle", 0.04); texts.push({ x: p.x, y: p.y - 70, s: "Got it. Back on the bike!", t: 80 }); } };
}
// the money bag on the road: an old tiffin bag, and a countdown over it
function drawBag(P) {
  const st = brawling() && mission.st; if (!st || !st.bag) return;
  const x = Math.round(st.bag.x - cam), y = st.bag.y;
  R(x - 7, y - 8, 14, 9, "#6b4a22"); R(x - 7, y - 8, 14, 2, "#8a6a3a"); R(x - 4, y - 12, 8, 2, "#3a2a1a"); R(x - 4, y - 12, 1, 4, "#3a2a1a"); R(x + 3, y - 12, 1, 4, "#3a2a1a");
  const left = 1 - st.bag.t / BAG_T; R(x - 12, y - 22, 24, 3, "rgba(14,13,12,0.6)"); R(x - 12, y - 22, 24 * left, 3, left < 0.35 ? "#c0392b" : "#f2c230");
}

/* ---------- Ranjit, at the akhada after 2-10 ---------- */
WORLD.streets.akhada.npcs.push({ kind: "rollback", x: 300, y: 168, needs: "2-10" });
WORLD.streets.akhada.talk.push({ x: 300, label: "Talk to Ranjit", who: "rollback", name: "Ranjit", needs: "2-10", lines: () => pick(flag("broke") ? [
  "Godbole came by the akhada gate twice today. Bhola told him it's a wrestling school, not a hotel. He wrote that down.",
  "I've been a wanted man before. It was easier at thirty. My knees have opinions now.",
  "A camera on the roof. I keep seeing it. Forty years, and I never once asked whose it was."] : [
  "Three lakh. I'll pay back every rupee, with interest, if I have to sell films on a footpath.",
  "Godbole's a good policeman. That's the trouble. A bad one I could have bribed.",
  "A camera on the roof. I keep seeing it. Forty years, and I never once asked whose it was."]) });

/* ---------- the missions ---------- */
const RANJIT_TELLS = [
  { who: "rollback", name: "Ranjit", text: "Forty years I've told the story of the lamp. The lamp was mine. The fire, I'm not so sure about any more." },
  { who: "rollback", name: "Ranjit", text: "A film crew was shooting on the lane that night. I saw a camera on the roof." },
  { who: "kai", text: "A camera. At 11:58." },
  { who: "rollback", name: "Ranjit", text: "If that reel still exists, it saw everything. Kaal's father knew it. Kaal knows it. That's why the lane has to burn: not for the land. For the film." },
  { who: "rai", text: "Then we find it first." }];
Object.assign(MISSIONS, {
  "2-10": { act: 2, title: "Bail or Break", giveUp: () => { if (progress.bailPaid) earn(BAIL); progress.bailPaid = false; delete progress.flags.bailed; delete progress.flags.broke; }, needs: ["2-9"], hours: [8, 22], start: { street: "clinic", x: 75 }, reward: { respect: { chandni: 5 } }, after: () => {
    if (!flag("broke")) return;
    progress.heat = 4; heatT = 0; banner = { text: "Every whistle on Bunder Road is for you", t: 150, big: true };
  }, steps: [
    { panels: [
      { who: "nani", text: "Godbole has Ranjit in the lock-up on Bunder Road. Arson, he says. The man carried me out of a fire." },
      { who: "nani", text: "Ranjit is the only one alive who knows what Kaal is really after. He won't say it in a cell. He'll say it to you, outside one." },
      { who: "kai", text: "Bail is three lakh. The lane can find most of it. Not all of it." },
      { who: "rai", text: "Or we go and get him." },
      { who: "nani", text: "Or you go and get him, and Godbole spends the rest of his life looking for you. It's your choice. You're old enough, apparently." }] },
    { choice: { title: "Bail or Break",
      text: () => "Bail: three lakh. The lane finds the rest if you put in " + rupees(BAIL) + ". Honest, and it costs you.\n\nBreak: through the thana, and through Godbole. It costs nothing, and he will never forget your faces.",
      options: [
        { label: () => "Pay the bail (" + rupees(BAIL) + ")", flag: "bailed", ok: () => money() >= BAIL, no: () => "You have " + rupees(money()) + ". Odd jobs, the board, the docks: find the rest, then come back to Nani.", act: () => { progress.money -= BAIL; progress.bailPaid = true; } },
        { label: "Break him out", flag: "broke" },
        { label: "Think it over", act: () => { mission = null; banner = { text: "Nani: Don't think too long. Ranjit's in a cell.", t: 160 }; } }] }, obj: "Bail or break?" },
    // the honest way
    { if: () => flag("bailed"), go: { street: "thana", x: 230, r: 40 }, obj: "Pay Ranjit's bail at the Bunder Road thana" },
    { if: () => flag("bailed"), talk: { street: "thana", x: 230, label: "Pay the bail", npc: { kind: "godbole" } }, obj: "Pay the bail", panels: [
      { who: "N", dark: 0.3, text: "The duty desk. Godbole reads every line of the bail bond twice with his finger, then once more without it." },
      { who: "godbole", text: "Bail is the law. I respect the law. I don't have to respect you." },
      { who: "godbole", text: "He doesn't leave the city. And if one more thing burns on Chandni Lane, I won't need a coincidence." },
      { who: "N", dark: 0.3, text: "Ranjit comes out of the lock-up rubbing his wrists, and gives Godbole a small, formal nod. Godbole does not nod back." }].concat(RANJIT_TELLS) },
    // the other way
    { if: () => flag("broke"), go: { street: "thana", x: 230, r: 60 }, obj: "Get into the Bunder Road thana" },
    { if: () => flag("broke"), boss: { street: "thana", x: 200, kind: "godbole", name: "Inspector Godbole", waves: [["godbole"]], adds: [[0.66, ["constable", "constable"]], [0.33, ["riot", "constable"]]] }, obj: "Get past Godbole", checkpoint: true },
    { if: () => flag("broke"), panels: [
      { who: "N", dark: 0.4, text: "Godbole sits down hard on the duty desk, moustache knocked crooked, and doesn't try to get up." },
      { who: "godbole", text: "Go on, then. Run. I have your faces, your names and your grandmother's address. I'll have the rest by Monday." },
      { who: "rollback", name: "Ranjit", text: "You shouldn't have done this. ...Thank you." },
      { who: "N", dark: 0.5, text: "Out the back, over a wall, through the fish market and up the Mandi road to the akhada, with every whistle on Bunder Road going." }],
      then: () => { progress.godboleDay = progress.clock.day; travelTo("akhada", 260); } },
    { if: () => flag("broke"), panels: RANJIT_TELLS }
  ] },
  "2-11": { act: 2, title: "Second Instalment", needs: ["2-10"], tin: 6000, hours: [9, 18], start: { street: "clinic", x: 75 }, reward: { respect: { chandni: 10, kinara: 5 } }, steps: [
    { panels: [
      { who: "nani", text: "Another five lakh, in Lakhan's old tiffin bag. The lane emptied its pockets again. Some of them twice." },
      { who: "nani", text: "Take the coast road. Lakhan has left his motorbike at the Kinara for you. And the Saanp know it's instalment day: this city has no secrets, only gossip." },
      { who: "kai", text: "Straight there, straight back. Again." }],
      then: () => { (progress.vehicles = progress.vehicles || {}).motorbike = { street: "kinara", x: 2560 }; } },
    { ride: { street: "kinara", x: 2610 }, obj: "To the Kinara" },
    { brawl: { street: "kinara", x: 300, to: 340 }, checkpoint: true,
      obj: () => (mission.st.bag ? "The bag! Grab it before a Saanp does" : "Ride the coast road to Bunder Road with the money") },
    { go: { street: "kaalOffice", x: 160, r: 40 }, obj: "Take the money to Kaal's office on Bunder Road" },
    { talk: { street: "kaalOffice", x: 160, label: "Pay the second instalment", npc: { look: "civ_d", base: 0 } }, obj: "Pay the second instalment", then: () => pay(500000), panels: [
      { who: "N", dark: 0.3, text: "The same clerk, the same three counts, the same stamp: PAID, RS 5,00,000. Vikram watches from his glass box. He has stopped smiling." },
      { who: "vikram", text: "Ten lakh. Very good. Do you know what ten lakh buys, against a man like my father?" },
      { who: "vikram", text: "Money won't save the lane. Paper will." },
      { who: "rai", text: "What paper?" },
      { who: "vikram", text: "Show them out." }] },
    { panels: [
      { who: "kai", text: "\"Paper.\" A deed, a file, a register. Something with the lane's name on it, somewhere in this city." },
      { who: "rai", text: "And a reel of film on a roof in 1987. The monsoon's coming. Let's find both before it does." }] }
  ] }
});
