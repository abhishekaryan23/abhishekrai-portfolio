/* Rollback Street: the story.
   Told in short comic-style panels between stages (the way Streets of
   Rage 4 does it), so the fighting is never interrupted. Each stage ends
   on a cliffhanger that changes the place, the people or the stakes, and
   every question it raises is answered later:
   - who took Nani, and why did they leave her watch behind?
   - who is the man in the old photo?
   - what happened to the street "before the fire"?
   Four letters from Nani are hidden in barrels, one per stage. Find all
   four (or finish without a continue) for the true ending.
   Raghav and Cheel are Nani's old students who chose the wrong side. Once
   beaten they come back to hers, and can be played from the next stage on
   (Raghav from the rooftops, Cheel at the mill) with scenes of their own
   (SCENES["name_rook"], SCENES["name_crane"]). A turncoat gets one chance,
   which is why they play with a single life.
   Loaded after street.js and shares its globals. */
"use strict";

const SCENES = {
  prologue: [
    { who: "N", dark: 0.82, text: "Chandni Lane. 11:58 at night. Every light on the lane goes out at once." },
    { who: "rai", text: "Nani? Nani, where are you?" },
    { who: "N", dark: 0.4, text: "When the lights return, their grandmother's dhaba is empty. Her chai is still warm." },
    { who: "kai", text: "Her pocket watch. Stopped at 11:58. And a card tucked under it." },
    { who: "card", text: "Everything goes back.\nR." },
    { who: "rai", text: "Somebody took her, and they want us to know it." },
    { who: "kai", duo: true, text: "Then we go together. Block by block, all night if we have to." },
    { who: "rai", solo: true, text: "Kai, stay by the phone in case she calls. I'll follow them, block by block." },
    { who: "kai", solo: true, text: "Go, bhaiya. I'm keeping her watch right here where I can see it." }
  ],
  bossox: [{ who: "ox", text: "Dhaba's closed, kids. The whole lane is closing." }],
  end0: [
    { who: "ox", text: "Bas, bas. I only empty shops. The boss wanted your Nani." },
    { who: "ox", text: "And he said to leave the watch where you two would find it." },
    { who: "rai", swap: true, text: "Who is your boss?" },
    { who: "ox", text: "Ask Raghav. The Harbour Line. He rides the last train. Me, I'm going back to my akhada." },
    { who: "kai", text: "The Harbour Line? That station closed before we were born." },
    { who: "N", dark: 0.6, text: "Somewhere under the city, a train that should not exist blows its horn." }
  ],
  intro1: [{ who: "N", dark: 0.5, text: "Bunder Road station, on the old Harbour Line. Shut since 1987. Tonight every lamp is lit, and the platform clock is stuck at 11:58, like Nani's watch." }],
  bossrook: [{ who: "rook", text: "Nani taught me this stance. Let's see if she taught you better." }],
  end1: [
    { who: "rook", text: "She trained me, you know. Long before she trained you." },
    { who: "rai", swap: true, text: "Then why fight for the man who took her?" },
    { who: "rook", text: "He promised me Nani's old kalari. It stood on the half of the lane she sold after the fire. He said it would all go back the way it was." },
    { who: "kai", text: "What fire?" },
    { who: "N", text: "Raghav holds out an old photo: young Nani on a rooftop, laughing, beside a man in dark glasses." },
    { who: "rook", text: "Cheel has her up on the roofs. Get there before she takes Nani on to the mill. And ask Nani about the fire." },
    { who: "rook", text: "She trained me in that kalari for nothing. He only promised me its keys. From tonight I fight for her. Call me when you need me." }
  ],
  intro2: [{ who: "N", dark: 0.5, text: "The rooftops. Kites from last Sankranti still hang in the wires. Six floors down the whole lane is dark, and the station clock still says 11:58." }],
  bosscrane: [{ who: "crane", text: "Six floors for one old woman? She said you would come. She smiled when she said it." }],
  end2: [
    { who: "crane", text: "I never dragged her anywhere. She walked with us. Her choice." },
    { who: "rai", swap: true, text: "That's a lie." },
    { who: "crane", text: "Is it? The man in that photo was her partner. Together they owned this whole lane." },
    { who: "crane", text: "Then one night it burned. She sold half the lane to rebuild the rest. He never forgave her." },
    { who: "crane", text: "She left for the mill an hour ago, to cook dinner for him. Does that sound like a hostage to you?" },
    { who: "N", dark: 0.6, text: "Across the river, the old mill chimney starts to smoke for the first time in forty years." },
    { who: "kai", text: "He doesn't just want Nani. He wants the whole lane." },
    { who: "crane", text: "I flew his messages across these roofs for years. I'll fly one more, for her. I'm with you." }
  ],
  intro3: [{ who: "N", dark: 0.5, text: "Chandni Mills. Its looms went quiet forty years ago. Tonight they are running." }],
  block3_3: [{ who: "N", dark: 0.5, text: "On a desk: two cups of chai, one untouched, beside a second pocket watch. Stopped at the same minute." }],
  bossrollback: [{ who: "rollback", text: "Welcome home. Tonight the clock goes back to 1987, and so does everything else." }],
  end3: [
    { who: "rollback", name: "Ranjit", text: "I lit the lamp that night, at 11:58. The fire was mine. I have spent forty years trying to undo it." },
    { who: "nani", text: "The fire was never yours to carry, Ranjit. The running was. Nothing goes back. Not lanes. Not people." },
    { who: "nani", duo: true, text: "I came tonight to tell you that myself. These two just arrived a little early." },
    { who: "nani", solo: true, text: "I came tonight to tell you that myself. This one just arrived a little early." },
    { who: "nani", text: "But people can go forward. You could too, if you let them." },
    { who: "N", dark: 0.82, text: "The mill hooter sounds. On Nani's watch, on the station wall, on the desk upstairs, the stopped clocks move at last. 11:59. Then midnight." },
    { who: "kai", duo: true, text: "Nani, your watch. It's ticking again." },
    { who: "kai", solo: true, text: "Bhaiya? Her watch, here on the counter. It just started ticking again." },
    { who: "nani", duo: true, text: "Of course it is. Now come home, you two. Rai, Kai. Who's hungry?" },
    { who: "nani", solo: true, text: "Of course it is. Now come home, and tell whoever is minding my dhaba to put the chai on." }
  ],
  trueEnd: [
    { who: "N", text: "The next morning, a card lies on the dhaba counter. Same handwriting as before." },
    { who: "card", text: "Table for one?\nR." },
    { who: "nani", text: "Set out another plate. Some people take forty years to find their way home." },
    { who: "N", text: "The end. Thank you for playing Rollback Street." }
  ],
  plainEnd: [
    { who: "N", text: "Nani sets out a plate that no one comes for. Some of her letters are still out there." },
    { who: "N", text: "The end, for now. Find all four letters to see what happens the next morning." }
  ],
  join: [{ who: "kai", swap: true, text: "Changed my mind, bhaiya. The phone can ring without me." }],

  intro2_rook: [
    { who: "N", dark: 0.5, text: "The rooftops. Kites from last Sankranti still hang in the wires. Six floors down the whole lane is dark, and the station clock still says 11:58." },
    { who: "rook", alone: true, text: "Rai and Kai are patching up after the station. I'll go up first." },
    { who: "rook", pair: true, text: "Stay close, Kai. Cheel fights from above." },
    { who: "rook", text: "I sold her out once. A man who changes sides gets one chance, not two." }
  ],
  bosscrane_rook: [
    { who: "crane", text: "Raghav? You of all people. He promised you the kalari." },
    { who: "rook", text: "Nani gave me everything I know in that kalari. He only promised me its keys. Step aside, Cheel." }
  ],
  end2_rook: [
    { who: "crane", text: "You know she walked with us. Her choice. She's at the mill now, cooking dinner for him." },
    { who: "crane", text: "The man in that photo was her partner. The night the lane burned, he ran, and she rebuilt it alone." },
    { who: "rook", text: "Then she's not his prisoner. She's there to finish something." },
    { who: "N", dark: 0.6, text: "Across the river, the old mill chimney starts to smoke for the first time in forty years." },
    { who: "crane", text: "I flew his messages across these roofs for years. I'll fly one more, for her." }
  ],
  intro3_rook: [
    { who: "N", dark: 0.5, text: "Chandni Mills. Its looms went quiet forty years ago. Tonight they are running." },
    { who: "rook", alone: true, text: "Rai and Kai are holding the lane. If I fall here, they finish it." }
  ],
  intro3_crane: [
    { who: "N", dark: 0.5, text: "Chandni Mills. Its looms went quiet forty years ago. Tonight they are running." },
    { who: "crane", alone: true, text: "Rai and Kai went back down to get the shopkeepers off the lane. The mill is mine. I know every door in it; I carried his notes through all of them." },
    { who: "crane", pair: true, text: "Stay behind me, Kai. His men know my face. They will hesitate before they swing." },
    { who: "crane", text: "One chance to make it right." }
  ],
  bossrollback_rook: [
    { who: "rollback", text: "Raghav. I promised you a kalari and you bring me a fight." },
    { who: "rook", text: "You promised me what was never yours." }
  ],
  bossrollback_crane: [
    { who: "rollback", text: "My own messenger. Who are you carrying notes for tonight, Cheel?" },
    { who: "crane", text: "For her. This one says: let her go home." }
  ],
  end3_rook: [
    { who: "rollback", name: "Ranjit", text: "I lit the lamp that night, at 11:58. The fire was mine. I have spent forty years trying to undo it." },
    { who: "nani", text: "The fire was never yours to carry, Ranjit. The running was. Nothing goes back. Not lanes. Not people." },
    { who: "nani", text: "Raghav. You came back to your teacher after all." },
    { who: "N", dark: 0.82, text: "The mill hooter sounds. On Nani's watch, on the station wall, on the desk upstairs, the stopped clocks move at last. 11:59. Then midnight." },
    { who: "nani", alone: true, text: "Rai and Kai are waiting at the dhaba. Walk me home, beta." },
    { who: "nani", pair: true, text: "Kai, Raghav. Walk an old woman home." }
  ],
  end3_crane: [
    { who: "rollback", name: "Ranjit", text: "I lit the lamp that night, at 11:58. The fire was mine. I have spent forty years trying to undo it." },
    { who: "nani", text: "The fire was never yours to carry, Ranjit. The running was. Nothing goes back. Not lanes. Not people." },
    { who: "nani", text: "Cheel. Still flying his kites for him?" },
    { who: "crane", text: "Not any more. Tonight I flew one for you." },
    { who: "N", dark: 0.82, text: "The mill hooter sounds. On Nani's watch, on the station wall, on the desk upstairs, the stopped clocks move at last. 11:59. Then midnight." },
    { who: "nani", alone: true, text: "Rai and Kai are waiting at the dhaba. Come, there's chai for everyone." },
    { who: "nani", pair: true, text: "Come home, both of you. There's chai for everyone." }
  ],
  join_rook: [{ who: "kai", text: "Raghav! You're not doing this alone. Nani taught all three of us." }],
  join_crane: [{ who: "kai", text: "Cheel. We don't trust you yet. But we're going the same way." }]
};
// Nani's letters, one hidden in a barrel on each stage
const LETTERS = [
  "R, the lane is ours now. Promise me we never sell a single brick of it. N. (1985)",
  "R, the fire was not your fault. Stop running and come home. N. (1987)",
  "R, I kept your glasses. They are on the shelf behind the counter. Come and get them. N.",
  "If the children ever find these: he is not a monster. He is only lost. Be kind. Nani."
];
const LETTER_SPOTS = [[980, 196], [560, 160], [1100, 196], [1450, 168]];

let scene = null;   // { panels, i, shown, done }
let storyOn = true;
try { storyOn = localStorage.getItem("street:story") !== "off"; } catch (e) { /* ignore */ }
const lettersFound = () => { try { return JSON.parse(localStorage.getItem("street:letters")) || []; } catch (e) { return []; } };

function playScene(name, then, extra) {
  // in single player the sibling not being played stays by the phone;
  // when a boss is picked, the siblings' phone lines are left out
  const solo = !players[1], p1 = players[0] ? players[0].kind : "rai", sibling = p1 === "rai" || p1 === "kai";
  const swap = (p) => (p1 === "kai" && (p.solo || p.swap) ? { ...p, who: p.who === "rai" ? "kai" : p.who === "kai" ? "rai" : p.who, text: p.text.replace("Kai,", "Bhaiya,").replace("Go, bhaiya.", "Go, Kai.").replace("Bhaiya? Her", "Kai? Her").replace("Changed my mind, bhaiya.", "Changed my mind, Kai.") } : p);
  const guest = { pRook: "rook", pCrane: "crane" }[p1], key = guest && SCENES[name + "_" + guest] ? name + "_" + guest : name;
  const panels = (extra || []).concat(SCENES[key] || []).filter((p) => (!p.solo || (solo && sibling)) && (!p.duo || !solo || !sibling) && (!p.alone || solo) && (!p.pair || !solo)).map(swap);
  if (!storyOn || !panels.length) { then(); return; }
  if (scene) { const prev = scene.then; scene.panels.push(...panels); scene.then = () => { prev(); then(); }; return; }
  scene = { panels, i: 0, shown: 0, then, name };
  down.clear();
  const wrapEl = document.getElementById("stage-wrap"); if (wrapEl) wrapEl.classList.add("story");
  state = "story";
}
function advanceScene(skipAll) {
  if (!scene) return;
  const p = scene.panels[scene.i];
  if (!skipAll && scene.shown < p.text.length) { scene.shown = p.text.length; return; }
  scene.i++; scene.shown = 0;
  if (skipAll || scene.i >= scene.panels.length) {
    const then = scene.then; scene = null; state = "play"; artWaitUntil = performance.now() + 6000;   // fresh art wait once the story hands back to play
    const wrapEl = document.getElementById("stage-wrap"); if (wrapEl) wrapEl.classList.remove("story");
    then();
  }
  else Arcade.tone(660, 0.03, "square", 0.02);
}
function storyUpdate() {
  if (!scene) { state = "play"; return; }
  const p = scene.panels[scene.i];
  if (scene.shown < p.text.length) { scene.shown = Math.min(p.text.length, scene.shown + 1.4); if (Math.floor(scene.shown) % 4 === 0) Arcade.tone(880, 0.01, "square", 0.012); }
  const any = [0, 1].some((i) => ["punch", "kick", "jump", "special"].some((a) => tapped(i, a)));
  if (any || storyTap) advanceScene(false);
  storyTap = false;
  fx = fx.filter((f) => --f.t > 0);
  pressed.clear();
}
let storyTap = false;
canvas.addEventListener("pointerdown", (e) => {
  if (state !== "story") return;
  // the top right corner skips the whole scene
  const r = canvas.getBoundingClientRect();
  let x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  if (Arcade.isFullscreen() && r.height > r.width) [x, y] = [(e.clientY - r.top) / r.height, 1 - (e.clientX - r.left) / r.width];
  if (x > 0.84 && y < 0.14) advanceScene(true); else storyTap = true;
});
addEventListener("keydown", (e) => {
  if (state !== "story" || e.repeat) return;
  if (e.code === "Escape") { e.preventDefault(); advanceScene(true); }
  else if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); storyTap = true; }
});

/* letters: walking over one opens it as a panel */
function placeLetter() {
  const n = stageIdx;
  if (lettersFound().includes(n)) return;
  const [x, y] = LETTER_SPOTS[n];
  barrels.push({ x, y, drop: "letter", kind: "barrel", hp: 2, shake: 0, letter: n });
}
function takeLetter(p, it) {
  const list = lettersFound();
  if (!list.includes(it.n)) { list.push(it.n); try { localStorage.setItem("street:letters", JSON.stringify(list)); } catch (e) { /* ignore */ } }
  p.score += 500;
  texts.push({ x: p.x, y: p.y - 66, s: "Letter " + list.length + " of 4", t: 80 });
  if (list.length === 4) Arcade.secret("letters");
  renderLetters();
  const was = storyOn; storyOn = true;   // letters always open, even with cutscenes off
  playScene(null, () => { storyOn = was; }, [{ who: "letter", text: LETTERS[it.n] }]);
}

/* ---------- drawing ---------- */
const STORY_CAST = { rai: "rai", kai: "kai", nani: "nani", ox: "ox", rook: "rook", crane: "crane", rollback: "rollback" };
function wrap(textStr, maxW, font) {
  g.font = font; const out = [];
  for (const para of textStr.split("\n")) {
    let line = "";
    for (const w of para.split(" ")) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line);
  }
  return out;
}
function drawPortrait(kind, x, y, w, h) {
  R(x, y, w, h, PAL.dark ? "#26222a" : "#efe7ec");
  const im = SPRITES["p_" + kind];
  if (im) {
    // the generated 8-bit portrait, bottom-aligned in the frame
    const pw = im.width / 2, ph = im.height / 2;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.drawImage(im, Math.round((x + (w - pw) / 2) * 2) / 2, Math.round((y + h - ph) * 2) / 2, pw, ph);
    g.restore();
    g.strokeStyle = PAL.T.accent; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    return;
  }
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const f = fighter(kind, 0, 0, "e"); f.face = 1; f.st = "idle";
  const camWas = cam; cam = 0;
  const k = 2.3 / KINDS[kind].scale, z = 2.3 * BS; g.translate(x + w / 2 - 3 * z, y + h * 0.42 + 38 * z); g.scale(k, k);
  drawFighter(f);
  cam = camWas; g.restore();
  g.strokeStyle = PAL.T.accent; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function drawStory() {
  if (!scene) return;
  const P = PAL, p = scene.panels[scene.i], shown = p.text.slice(0, Math.floor(scene.shown));
  g.fillStyle = "rgba(10,9,12," + (p.dark || 0.35) + ")"; g.fillRect(0, 0, LW, LH);
  const blink = frameNo % 50 < 30 && scene.shown >= p.text.length;
  text("Skip", LW - 10, 14, 7, "#f7f4ee", "right", "IBM Plex Sans");
  if (p.who === "card" || p.who === "letter") {
    const w = 220, h = p.who === "letter" ? 92 : 70, x = (LW - w) / 2, y = (LH - h) / 2 - 6;
    R(x + 3, y + 3, w, h, "rgba(0,0,0,0.35)"); R(x, y, w, h, "#f7f1e3"); R(x, y, w, 3, P.T.accent);
    if (p.who === "letter") text("A letter from Nani", x + 12, y + 16, 7, "#8a7f70", "left", "IBM Plex Sans");
    const lines = wrap(shown, w - 24, "italic 11px 'Newsreader', Georgia, serif");
    g.font = "italic 11px 'Newsreader', Georgia, serif"; g.fillStyle = "#2a2622"; g.textAlign = "left";
    lines.forEach((l, i) => g.fillText(l, x + 12, y + (p.who === "letter" ? 32 : 26) + i * 14));
  } else {
    const narr = p.who === "N", px = 12, py = 126, pw = LW - 24, ph = 82;
    R(px, py, pw, ph, "#1d1b18"); R(px, py, pw, 2, "#f07ab8");
    let tx = px + 12, tw = pw - 24;
    if (!narr) {
      drawPortrait(STORY_CAST[p.who], px + 8, py - 30, 68, 96);
      tx = px + 86; tw = pw - 98;
      let name = p.name || KINDS[STORY_CAST[p.who]].name;
      const phone = players[0] && players[0].kind === "kai" ? "rai" : players[0] && players[0].kind === "rai" ? "kai" : null;
      if (p.who === phone && !players[1] && scene.name !== "prologue" && scene.name !== "join") name += ", on the phone";
      text(name, tx, py + 16, 8, p.who === "kai" ? "#5cc8c0" : "#f07ab8", "left", "IBM Plex Sans");
    }
    const big = TOUCH && !Arcade.isFullscreen();
    const fs = narr ? (big ? 13 : 11) : (big ? 11.5 : 9.5), lh = Math.round(fs * 1.28);
    const font = narr ? "italic " + fs + "px 'Newsreader', Georgia, serif" : "500 " + fs + "px 'IBM Plex Sans', sans-serif";
    const lines = wrap(shown, tw, font);
    g.font = font; g.fillStyle = "#f7f4ee"; g.textAlign = "left";
    lines.forEach((l, i) => g.fillText(l, tx, py + (narr ? 10 + lh : 18 + lh) + i * lh));
  }
  if (blink) text(TOUCH ? "Tap to continue" : "Press any key", LW - 18, LH - 14, 7, "#cfc6b7", "right", "IBM Plex Sans");
}
buildSettings();

/* letters found so far can be re-read from the menu */
function renderLetters() {
  const box = document.getElementById("letters"); if (!box) return;
  const got = lettersFound().sort((a, b) => a - b);
  box.hidden = !got.length; box.innerHTML = "";
  const sum = document.createElement("summary"); sum.textContent = "Nani's letters (" + got.length + " of 4)";
  box.appendChild(sum);
  for (const n of got) { const q = document.createElement("blockquote"); q.textContent = LETTERS[n]; box.appendChild(q); }
}
renderLetters();
