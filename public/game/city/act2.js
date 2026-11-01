/* Rollback City: Act 2, "The Notice", missions 2-1 to 2-5 (DESIGN 6), the Lane Committee board
   and the debt. A plain script that shares globals with the others; index.html loads them in order.

   Each mission waits at a marker like Act 1's, some only at certain hours (hours: [from, to]).
   The lane owes Kaal Group ₹25 lakh; the board in Nani's dhaba keeps the goals, the debt paid
   so far and the next job, and anyone can drop money in the committee tin beside it. */
"use strict";

const DEBT = 2500000;
const pay = (n) => { progress.debt = Math.min(DEBT, (progress.debt || 0) + n); };
// the notices Kaal Security pastes on every shutter (2-1)
const notice = (street, x, guard) => ({ street, x, label: "Tear down the notice", back: true, notice: true, guard, panels: [{ who: "N", text: pick([
  "\"NOTICE OF ACQUISITION. These premises are to be vacated within 30 days. Kaal Group thanks you for your cooperation.\" You rip it in half.",
  "\"KAAL HEIGHTS: A NEW BUNDERPUR.\" There is a drawing of a glass tower where the lane should be. It comes off the shutter in one long strip.",
  "The glue is still wet. Somebody has scrawled \"NEVER\" across it in kajal. You finish the job.",
  "The paanwala watches you tear it off and quietly hands you a free meetha paan for later."]) }] });
const dabba = (street, x, who, text) => ({ street, x, label: "Hand over the dabba", back: street !== "mandiRoad" && street !== "weighbridge", panels: [{ who, text }] });

Object.assign(MISSIONS, {
  "2-1": { act: 2, title: "Notice Board", needs: ["1-6"], hours: [8, 20], start: { street: "lane", x: 1216 }, reward: { rs: 500, respect: { chandni: 10 } }, flags: ["board"], steps: [
    { panels: [
      { who: "N", dark: 0.4, text: "Bunderpur's clocks ran again, but the city had forty years of catching up to do. Nobody told the hoardings." },
      { who: "N", dark: 0.5, text: "Morning on Chandni Lane. A white car with tinted windows idles outside the dhaba. Men in black safari suits are pasting paper on every shutter." },
      { who: "vikram", text: "Vikram Kaal, Kaal Group. In 1987 your partner borrowed forty thousand rupees from my father to rebuild this lane, Nani-ji, against its deeds. Nobody repaid a paisa. Forty years of interest makes that twenty-five lakh. Pay it by Diwali, or we build." },
      { who: "nani", text: "We'll pay. One brick at a time. Now get off my step, you're blocking the light." },
      { who: "kai", text: "Every shutter on the lane has one of his notices on it. Not for long." },
      { who: "rai", text: "Tear them down. Don't start anything. The whole lane is watching from behind the shutters." }] },
    { find: [notice("lane", 470), notice("lane", 760, [["kaal", "kaal"]]), notice("lane", 1386), notice("lane", 1642, [["kaal", "grunt"]]),
      notice("lane", 1898), notice("lane", 2150, [["kaal", "kaal"]]), notice("gali", 600), notice("gali", 1100, [["kaal", "kicker"]])], obj: "Tear down Kaal's notices", checkpoint: true },
    { fight: { street: "lane", x: 1300, name: "Kaal Security", waves: [["kaal", "kaal"], ["kaal", "kaal", "kaal"]] }, obj: "Run Kaal Security off the lane", checkpoint: true },
    { panels: [
      { who: "nani", text: "The whole lane watched from behind its shutters. Let them. Tomorrow they come out from behind them." },
      { who: "nani", text: "I've put up a board in the dhaba: the Lane Committee. Twenty-five lakh, one brick at a time. Whatever you can spare goes in the tin." },
      { who: "nani", text: "And Ranjit's card is still on the counter. Leave it there. If he wants to help, he knows where the plates are." },
      { who: "kai", text: "And I've got Bunty's old Nokla. It has Snake. It does not have anything else." }] }
  ] },
  "2-2": { act: 2, title: "Akhada Rules", needs: ["2-1"], start: { street: "akhada", x: 236 }, reward: { respect: { mandi: 10 } }, steps: [
    { panels: [
      { who: "ox", text: "The shops have their stock back. The kirana man has his photo. We are not friends; I owe your Nani, and I pay in sweat." },
      { who: "ox", text: "I watched you on the lane. You fight like children. Children lose." },
      { who: "ox", text: "Kaal's men are trained. So you will be trained. First lesson: stop getting hit." }] },
    { drill: { kind: "block", n: 3 }, obj: () => "Block Bhola's pehelwan 3 times: hold " + (padLast ? "RB" : TOUCH ? "Guard" : "U") },
    { panels: [{ who: "ox", text: "Good. Now block at the very last moment, just as the blow lands. That is a parry: he staggers, you strike." }] },
    { drill: { kind: "parry", n: 2 }, obj: "Parry 2 blows: block just as they land" },
    { panels: [{ who: "ox", text: "Last lesson. Sometimes the best block is not being there. Double-tap up or down and roll out of the way." }] },
    { drill: { kind: "dodge", n: 3 }, obj: "Roll away from 3 attacks: double-tap up or down" },
    { panels: [{ who: "ox", text: "Now, your first bout. Kushti rules: nobody cries, nobody bites." }] },
    { fight: { street: "akhada", x: 236, name: "Kushti bout", waves: [["wrestler"]] }, obj: "Win the kushti bout", checkpoint: true },
    { panels: [
      { who: "ox", text: "Not bad. Come back every day and I'll make you stronger. It costs. The mud is free; my wrestlers are not." },
      { who: "ox", text: "And go and see Rafiq at the Mandi at dawn. Tola's men are robbing him blind." }] }
  ] },
  "2-3": { act: 2, title: "Mandi Morning", needs: ["2-2"], hours: [5, 10], start: { street: "mandiRoad", x: 1180 }, reward: { rs: 2000, respect: { mandi: 25 } }, flags: ["mandi"], steps: [
    { panels: [
      { who: "rafiq", text: "You're Nani's? Sit. No, don't sit, there's no time. Every morning Tola's men put our carts on that crooked weighbridge and take a cut." },
      { who: "rafiq", text: "Today they say they'll smash the stalls of anyone who won't pay. Mine first, I expect. I talk too much." }] },
    { protect: { street: "mandiRoad", x: 1300, stalls: [1100, 1250, 1520, 1650], hp: 30, waves: [["porter", "porter"], ["porter", "bruiser", "porter"], ["porter", "porter", "bruiser"]], keep: 2, name: "The morning rush" }, obj: "Keep the stalls standing through the rush", checkpoint: true },
    { go: { street: "weighbridge", x: 600 }, obj: "Go and see Tola at the weighbridge" },
    { boss: { street: "weighbridge", x: 700, kind: "tola", name: "Tola", waves: [["tola"]], adds: [[0.6, ["porter", "porter"]], [0.3, ["bruiser"]]] }, obj: "Beat Tola on his own weighbridge", checkpoint: true },
    { panels: [
      { who: "tola", text: "Enough! Enough. The scale was a bit bent. A bit. Kaal's people paid me to squeeze the lane, that's all I know." },
      { who: "rafiq", text: "Today the Mandi weighs honest! Lakhan at the garage has something for you. He won't say what. He never says what. \"Vroom\", he says." },
      { who: "lakhan", text: "Scooter. Yours. Vroom." }] }
  ] },
  "2-4": { act: 2, title: "Dabba Run", needs: ["2-3"], hours: [10, 15], start: { street: "bunderRoad", x: 760 }, reward: { rs: 1500, respect: { harbour: 15 } },
    after: () => setTimeout(() => { banner = { text: "The day trains are running: Mandi Road to Bunder Road", t: 200 }; }, 3500), steps: [
    { panels: [
      { who: "N", dark: 0.4, text: "A dabbawala in a white Gandhi cap is sitting on the station steps with his head in his hands. Six tiffins, stacked." },
      { who: "N", text: "\"Kaal's boys jump my men on the trains and tip the lunches on the floor. They say the lane's tiffin service is finished. Help me finish the round?\"" },
      { who: "kai", text: "Six dabbas. Don't drop them. Easy." }] },
    { go: { street: "platform", x: 360 }, obj: "Into the station with the dabbas" },
    { ride: { street: "train", x: 200 }, obj: "Board the lunchtime local" },
    { fight: { street: "train", x: 320, name: "Carriage 1", waves: [["kaal", "grunt"], ["kaal", "kicker"]] }, obj: "Don't let them spill the dabbas", fragile: 3, checkpoint: true },
    { fight: { street: "train", x: 900, name: "Carriage 2", waves: [["kaal", "kaal", "thrower"]] }, obj: "Don't let them spill the dabbas", fragile: 3 },
    { ride: { street: "mandiRoad", x: 2080 }, obj: "Off at the Mandi Road halt" },
    { find: [dabba("mandiRoad", 1100, "rafiq", "Rafiq lifts the lid. \"Bhindi! My wife knows I hate bhindi. She knows.\""),
      dabba("akhada", 200, "ox", "Bhola lifts the lid. \"No onion, no garlic. She remembers the akhada rules. Good woman.\""),
      dabba("weighbridge", 300, "tola", "Tola takes his dabba without a word. Then, quietly: \"...Thank you.\""),
      dabba("clinic", 200, "mehta", "\"Lunch at a reasonable hour. A medical miracle.\""),
      dabba("lane", 1642, "N", "The paanwala takes his dabba. \"Tell the dabbawala: no coriander. Twenty years I have been telling him.\""),
      dabba("dhaba", 140, "nani", "\"Who sent a dabba to the dhaba? I am the dabba. Sit, eat it here.\"")], obj: "Deliver the dabbas", fragile: 3, checkpoint: true },
    { panels: [
      { who: "nani", text: "The dabbawalas sent word. Every lunch on the line arrived hot today, and the lane gets the delivery money for a month." },
      { who: "nani", text: "With what the families gave, it's enough. Five lakh. Masterji pawned his machine; don't tell him I told you. Tomorrow we take it to Kaal's office ourselves." }] }
  ] },
  "2-5": { act: 2, title: "First Instalment", needs: ["2-4"], tin: 3000, hours: [9, 18], start: { street: "dhaba", x: 200 }, reward: { respect: { chandni: 15 } }, flags: ["kaalPatrols"], steps: [
    { panels: [
      { who: "nani", text: "Five lakh rupees. Every family on the lane put something in this envelope. Don't lose it, don't spend it, don't let Vikram count it twice." },
      { who: "kai", text: "Straight there, straight back." },
      { who: "rai", text: "And if Vikram offers us chai, we don't drink it." }] },
    { go: { street: "kaalOffice", x: 160, r: 40 }, obj: "Take the money to Kaal's office on Bunder Road" },
    { talk: { street: "kaalOffice", x: 160, label: "Pay the first instalment", npc: { look: "civ_d", base: 0 } }, panels: [
      { who: "N", dark: 0.3, text: "Glass, marble and air conditioning. A clerk counts the notes twice, then a third time, and stamps a receipt: PAID, RS 5,00,000." },
      { who: "vikram", text: "Five lakh. Do you know what my father paid for the other half of your lane in 1987? Less. Show them out." }], then: () => pay(500000), obj: "Pay the first instalment" },
    { go: { street: "bunderRoad", x: 1250 }, obj: "Back to the car park" },
    { fight: { street: "bunderRoad", x: 1300, name: "Kaal's car park", waves: [["kaal", "kaal"], ["kaal", "kaal", "kaal"], ["kaal", "bruiser", "kaal"], ["kaal", "bruiser", "kaal", "kaal"]] }, obj: "Get out of the car park", checkpoint: true },
    { panels: [
      { who: "nani", text: "Paid. One brick. He looked at your faces too long, that one. Expect his safari suits on our streets in daylight now. Let them sweat in them." },
      { who: "nani", text: "Twenty lakh to go. The board says what's next. Eat something first." }] }
  ] }
});

/* ---------- the Lane Committee board and the tin ---------- */
function boardText() {
  const next = nextMission(), done = Object.keys(MISSIONS).filter((id) => MISSIONS[id].act === 2 && progress.done.includes(id));
  return "THE LANE COMMITTEE\n\n" + laneNotes().join("\n") + "\nYour own share in the tin: " + rupees(progress.tin || 0) + (progress.done.includes("2-5") ? "" : " of " + rupees(3000) + " before the first instalment") + "." +
    "\n\nNext: " + (next ? MISSIONS[next].title + (MISSIONS[next].hours ? " (" + hoursText(MISSIONS[next].hours) + ")" : "") : "nothing yet. Walk the city; there is work about.") +
    (done.length ? "\nDone: " + done.map((id) => MISSIONS[id].title).join(", ") + "." : "") +
    "\n\nOdd jobs: " + JOBS.filter((id) => (MISSIONS[id].needs || []).every((n) => progress.done.includes(n))).map((id) => MISSIONS[id].title + " (" + WORLD.streets[MISSIONS[id].start.street].name + ")").join(", ") + ".";
}
const hoursText = ([a, b]) => { const f = (h) => ((h + 11) % 12 + 1) + (h < 12 ? " am" : " pm"); return f(a) + " to " + f(b); };
// the committee tin, next to the board: a thousand rupees at a time towards the debt
function tinTarget(p) {
  const b = street.board; if (!b || !flag("board") || Math.abs(b.x + 40 - p.x) > 16) return null;
  return { label: "Put " + rupees(1000) + " in the committee tin", x: b.x + 40, y: Y0 - 50, act: (q) => {
    if (money() < 1000) { texts.push({ x: q.x, y: q.y - 70, s: "Not enough on you", t: 70 }); return; }
    progress.money -= 1000; pay(1000); progress.tin = (progress.tin || 0) + 1000; changeRespect(1);
    texts.push({ x: q.x, y: q.y - 70, s: rupees(progress.debt) + " of " + rupees(DEBT) + " paid", t: 100 }); Arcade.tone(1320, 0.08, "triangle", 0.04);
  } };
}

/* ---------- Kaal Group's sales office ---------- */
function drawOffice(P) {
  const x0 = Math.round(-cam), d = P.dark;
  R(0, 0, LW, LH, d ? "#1c2228" : "#e9eef2");
  for (let x = x0 - 20; x < x0 + LW + 20; x += 48) { R(x, 10, 46, 118, d ? "#26303a" : "#cfdbe4"); R(x + 4, 14, 2, 110, "rgba(255,255,255,0.35)"); }   // glass panels
  R(0, 8, LW, 3, "#9aa5b0"); R(0, 126, LW, 3, "#9aa5b0");
  R(x0 + 120, 26, 144, 30, "#1d1b18"); text("KAAL GROUP", x0 + 192, 46, 12, "#c0392b", "center", "Newsreader");
  text("BUILDING TOMORROW", x0 + 192, 64, 5, d ? "#9aa5b0" : "#5d6670");
  // the model of Kaal Heights on a plinth, where the lane should be
  R(x0 + 250, 96, 60, 32, d ? "#3a3632" : "#f7f4ee"); R(x0 + 262, 52, 14, 44, "#8fb3d9"); R(x0 + 280, 66, 12, 30, "#a8c6e0"); R(x0 + 296, 74, 8, 22, "#8fb3d9");
  text("KAAL HEIGHTS", x0 + 280, 120, 4, P.ol);
  R(x0 + 120, 120, 90, 30, "#5d4630"); R(x0 + 118, 118, 94, 4, "#8a6a4a");   // the counter
  R(0, 150, LW, LH - 150, d ? "#2a2f36" : "#f2f0ec");
  for (let x = x0 % 32; x < LW; x += 32) R(x, 150, 1, LH - 150, d ? "#353b44" : "#dcd8d0");
  R(x0 + 334, 66, 36, 84, "#9aa5b0"); R(x0 + 338, 70, 28, 80, d ? "#141822" : "#bcd0de");   // the glass door out
}
