/* Rollback City: Kai's phone and the PCO booths (DESIGN 7.8, quirk 5).
   A plain script that shares globals with the others; index.html loads them in order.

   From Act 2 Kai carries an old Nokia-style phone. Tab (LT on a pad, the Phone button on touch)
   opens it over the paused game: Contacts, Messages, Map, Notes (the Lane Committee's goals) and
   Snake. Calls ring while you play; answer (Tab) and they play as a small portrait strip at the
   top of the screen without stopping the fight; let one ring out and it is missed. STD PCO booths
   save the game and replay missed calls. Nani rings now and then with advice; ignore her three
   times running and she texts instead. */
"use strict";

const hasPhone = () => clockRuns();
let ring = null, call = null, phoneOpen = false, naniT = 0, snake = null;
const CONTACTS = [
  { who: "nani", name: "Nani", lines: () => [pick(["Have you eaten? Don't say yes, I can hear your stomach from here.", "Wear something warm, it's going to rain. Don't argue with me.", "Who was that at the bhel stall? Never mind. Come home for dinner.", "Bhola says you block like a goat. Go and see him.", "The lane is quiet today. I don't trust it."])] },
  { who: "lakhan", name: "Lakhan", lines: () => [pick(["Vroom. Vroom vroom.", "Garage. Busy.", "Spare parts. Tomorrow."])] },
  { who: "mehta", name: "Dr. Mehta", lines: () => [pick(["If you are calling, you are not bleeding. Good.", "Eat something with iron in it. And stop getting hit.", "Clinic closes at nine. Unless you are dying. Then it is open."])] }
];
const SPAM = ["CONGRATULATIONS! You have won a FREE plot in Kaal Heights. Reply YES to claim.", "Lucky draw! Rs 1 lakh in your name. Send your bank details to claim.", "Bunty: Ctrl+Z Cyber Cafe, new games in. Ghost Deploy high score is still mine."];
function message(text) { progress.messages = (progress.messages || []).concat(text).slice(-30); const p = players[0]; if (hasPhone() && p) texts.push({ x: p.x, y: p.y - 70, s: "New message", t: 70 }); Arcade.tone(1568, 0.05, "square", 0.03); }

/* calls */
function callIn(who, lines, name) {
  if (!hasPhone() || ring || call) { (progress.missed = progress.missed || []).push({ who, lines, name }); return; }
  ring = { who, lines, name, t: 6 * 60 };
}
function answer() {
  if (!ring) return false;
  call = { who: ring.who, name: ring.name, lines: ring.lines.slice(), i: 0, t: 0 }; ring = null;
  if (call.who === "nani") progress.naniIgnored = 0;
  return true;
}
function updatePhone() {
  if (!hasPhone()) return;
  if (ring && --ring.t <= 0) {
    (progress.missed = progress.missed || []).push({ who: ring.who, lines: ring.lines, name: ring.name });
    if (ring.who === "nani" && (progress.naniIgnored = (progress.naniIgnored || 0) + 1) >= 3) { progress.naniIgnored = 0; message("Nani: Three calls. THREE. Fine. The dal is in the fridge. Heat it properly this time, not like a bachelor."); }
    ring = null;
  }
  if (call && ++call.t > 200) { call.t = 0; if (++call.i >= call.lines.length) call = null; }
  // Nani rings every few game hours, when nothing else is going on
  if (!mission && !arena && !ring && !call && ++naniT > 9 * 3600) { naniT = rand(0, 3600); const c = CONTACTS[0]; callIn("nani", c.lines(), c.name); }
}
// the ring and the call, at the top of the screen under the HUD
function drawPhone(P) {
  if (!hasPhone() || (!ring && !call)) return;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (ring) {
    if (Math.floor(frameNo / 15) % 2) return;
    const s = (ring.name || ring.who) + " calling  " + (padLast ? "[LT]" : TOUCH ? "[Phone]" : "[Tab]");
    g.font = "600 6.5px 'IBM Plex Sans', sans-serif"; const w = g.measureText(s).width + 14;
    R(LW - 4 - w, LH - 44, w, 12, "rgba(14,13,12,0.82)"); R(LW - 4 - w, LH - 44, 2, 12, "#5cc8c0"); text(s, LW - 10, LH - 35, 6.5, "#f7f4ee", "right", "IBM Plex Sans");
    if (frameNo % 30 === 0) Arcade.tone(1175, 0.05, "square", 0.03);
    return;
  }
  const line = call.lines[call.i] || "", w = Math.min(LW - 24, 300), x = LW / 2 - w / 2, y = 40;
  R(x, y, w, 30, "rgba(14,13,12,0.86)"); R(x, y + 29, w, 1, "#5cc8c0");
  drawPortrait(STORY_CAST[call.who] || "nani", x + 2, y + 2, 24, 26);
  text(call.name || call.who, x + 32, y + 9, 6, "#5cc8c0", "left", "IBM Plex Sans");
  const lines = wrap(line, w - 40, "500 6.5px 'IBM Plex Sans', sans-serif");
  g.font = "500 6.5px 'IBM Plex Sans', sans-serif"; g.fillStyle = "#f7f4ee"; g.textAlign = "left";
  lines.slice(0, 2).forEach((l, i) => g.fillText(l, x + 32, y + 17 + i * 8));
}

/* the phone itself: a card styled as an old handset */
function openPhone(tab) {
  if (!hasPhone() || state !== "play" || paused) return;
  if (answer()) return;   // Tab while it rings answers the call
  phoneOpen = true; paused = true; down.clear(); showCard("card-phone"); phoneTab(tab || "home");
}
function closePhone() { if (!phoneOpen) return; phoneOpen = false; stopSnake(); paused = false; showCard(null); }
function phoneTab(tab) {
  stopSnake();
  const scr = $("phone-screen"); scr.innerHTML = ""; $("snake").hidden = tab !== "snake";
  const add = (tag, txt, cls) => { const el = document.createElement(tag); el.textContent = txt; if (cls) el.className = cls; scr.appendChild(el); return el; };
  const btn = (txt, fn) => { const b = add("button", txt, "phone-item"); b.type = "button"; b.addEventListener("click", fn); return b; };
  if (tab === "home") {
    add("p", clockText() + "   " + rupees(money()), "phone-status");
    btn("Contacts", () => phoneTab("contacts")); btn("Messages" + ((progress.messages || []).length ? " (" + progress.messages.length + ")" : ""), () => phoneTab("messages"));
    btn("Map", () => { closePhone(); openMap(); }); btn("Notes", () => phoneTab("notes")); btn("Snake", () => phoneTab("snake")); btn("Gallery", () => openGallery()); if ((progress.reels || []).length >= 3) btn("Reels", () => { cycleFilter(); });
  } else if (tab === "contacts") {
    for (const c of CONTACTS) btn("Call " + c.name, () => { closePhone(); call = { who: c.who, name: c.name, lines: c.lines(), i: 0, t: 0 }; });
    btn("Back", () => phoneTab("home"));
  } else if (tab === "messages") {
    const m = (progress.messages || []).slice().reverse();
    if (!m.length) add("p", "No messages.");
    for (const t of m.slice(0, 8)) add("p", t, "phone-msg");
    btn("Back", () => phoneTab("home"));
  } else if (tab === "notes") {
    add("p", "LANE COMMITTEE", "phone-status");
    for (const n of laneNotes()) add("p", n, "phone-msg");
    btn("Back", () => phoneTab("home"));
  } else if (tab === "snake") { startSnake(); btn("Back", () => phoneTab("home")); }
  const first = scr.querySelector("button"); if (first && !TOUCH) first.focus({ preventScroll: true });
}
// the Lane Committee's goals (DESIGN 5, Act 2), read by Notes and the dhaba board
function laneNotes() {
  const debt = progress.debt || 0;
  return ["1. Raise the money: " + rupees(debt) + " of " + rupees(2500000) + " paid.", "2. Win the districts back from the gangs Kaal pays.", "3. Find out what Kaal really wants with one old lane."];
}

/* Snake, of course: a 32 x 18 grid on the phone's screen; arrows or WASD, or the d-pad */
function startSnake() {
  const cv = $("snake"); cv.width = 192; cv.height = 108;
  snake = { body: [[8, 9], [7, 9], [6, 9]], dir: [1, 0], next: [1, 0], food: [20, 9], t: 0, score: 0, over: false };
  const step = () => {
    if (!snake) return;
    if (++snake.t % 8 === 0 && !snake.over) {
      snake.dir = snake.next;
      const h = [snake.body[0][0] + snake.dir[0], snake.body[0][1] + snake.dir[1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= 32 || h[1] >= 18 || snake.body.some((b) => b[0] === h[0] && b[1] === h[1])) { snake.over = true; Arcade.tone(160, 0.3, "square", 0.04); }
      else {
        snake.body.unshift(h);
        if (h[0] === snake.food[0] && h[1] === snake.food[1]) { snake.score++; Arcade.tone(1320, 0.04, "square", 0.03); do snake.food = [Math.floor(Math.random() * 32), Math.floor(Math.random() * 18)]; while (snake.body.some((b) => b[0] === snake.food[0] && b[1] === snake.food[1])); }
        else snake.body.pop();
      }
    }
    const x = cv.getContext("2d");
    x.fillStyle = "#9bbc6a"; x.fillRect(0, 0, 192, 108); x.fillStyle = "#1f2a14";
    for (const [bx, by] of snake.body) x.fillRect(bx * 6, by * 6, 5, 5);
    x.fillRect(snake.food[0] * 6 + 1, snake.food[1] * 6 + 1, 3, 3);
    x.font = "bold 8px monospace"; x.fillText(snake.over ? "GAME OVER  " + snake.score + "  (A or Enter)" : String(snake.score), 3, 9);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function stopSnake() { snake = null; }
// keys while Snake is on the phone's screen (from onDown, which hands them here first)
function snakeKey(code) {
  if (!snake) return false;
  const k = keyOf(code), a = k && k[1], d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[a];
  if (d && !(d[0] === -snake.dir[0] && d[1] === -snake.dir[1])) { snake.next = d; return true; }
  if (snake.over && (a === "kick" || a === "punch" || a === "use" || code === "Enter")) { startSnake(); return true; }
  return !!d;
}

/* PCO booths: save, and hear the calls you missed */
function usePco() {
  const saved = saveGame();
  const missed = progress.missed || []; progress.missed = [];
  if (!missed.length) { texts.push({ x: players[0].x, y: players[0].y - 70, s: saved === false ? "No missed calls." : "Saved. No missed calls.", t: 80 }); return; }
  const lines = [].concat(...missed.map((m) => m.lines.map((l) => (m.name || m.who) + ": " + l)));
  call = { who: missed[0].who, name: missed.length + " missed call" + (missed.length > 1 ? "s" : ""), lines, i: 0, t: 0 };
}
