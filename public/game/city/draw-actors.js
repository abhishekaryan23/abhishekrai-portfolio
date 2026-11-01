/* Rollback City: characters, effects, HUD and the frame.
   A plain script that shares globals with the others; index.html loads them in order. */
"use strict";

/* ---------- characters ----------
   Joints are posed per state facing right with feet at (0,0), then the
   figure is mirrored and scaled. Each body part is drawn twice: a dark
   outline pass and a colour pass, in three layers (back limbs, body,
   front limbs) so overlapping parts keep their edges. */
const COSTUME = {
  avatar:  { rai: (P) => ({ jacket: "#d9741c", shirt: "#f2c230" }), kai: (P) => ({ jacket: "#d9741c", shirt: "#2b54a8" }) },
  classic: { rai: (P) => ({ jacket: P.T.accent, shirt: "#f4efe6" }), kai: (P) => ({ jacket: P.T.teal, shirt: "#22252b" }) },
  neon:    { rai: (P) => ({ jacket: "#141218", shirt: "#f07ab8" }), kai: (P) => ({ jacket: "#141218", shirt: "#5cc8c0" }) },
  gold:    { rai: (P) => ({ jacket: "#c9a227", shirt: "#1d1b18" }), kai: (P) => ({ jacket: "#c9a227", shirt: "#13756f" }) }
};
/* Body types: each character has their own build, so silhouettes read
   at a glance. cw/ww: chest and waist half-widths, belly: forward bulge,
   aw/fw: upper arm and forearm thickness, lw/sw: thigh and shin, hw: head
   half-width, stance: how wide the feet sit. */
const BODY = {
  base:    { cw: 6.6, ww: 5, belly: 0, aw: 3.8, fw: 3.4, lw: 4.6, sw: 4, hw: 4.8, stance: 1 },
  slim:    { cw: 6, ww: 4.5, belly: 0, aw: 3.4, fw: 3.1, lw: 4.3, sw: 3.8, hw: 4.6, stance: 1 },
  lean:    { cw: 7, ww: 4.4, belly: 0, aw: 4, fw: 3.6, lw: 5.2, sw: 4.4, hw: 4.6, stance: 1.1 },
  stocky:  { cw: 8, ww: 7, belly: 2.4, aw: 5, fw: 4.4, lw: 5.6, sw: 4.8, hw: 5.2, stance: 1.2 },
  wrestler:{ cw: 8.8, ww: 7.6, belly: 3.2, aw: 5.6, fw: 4.8, lw: 6.4, sw: 5.2, hw: 5.2, stance: 1.3 },
  kalari:  { cw: 7.6, ww: 4.6, belly: 0, aw: 4.4, fw: 3.7, lw: 5.4, sw: 4.5, hw: 4.6, stance: 1.3 },
  boss:    { cw: 7.6, ww: 6.6, belly: 1.6, aw: 4.4, fw: 3.8, lw: 5, sw: 4.4, hw: 4.9, stance: 1.1 },
  elder:   { cw: 6, ww: 5.6, belly: 0.8, aw: 3.4, fw: 3, lw: 4.4, sw: 3.8, hw: 4.6, stance: 0.9 }
};
const LOOKS = {
  // Nani: plum cardigan over a maroon sari with a gold border, grey bun with a jasmine gajra
  nani:      (P) => ({ body: "elder", pallu: true, skin: P.skin[2], jacket: "#6e4f7a", shirt: "#efe6d6", skirt: "#7a2230", border: "#d9a441", shoe: "#5a3a22", sole: "#2a1a10", hair: "#d6d0c8", hairStyle: "bun", gajra: true, specs: true, mood: "kind" }),
  // Rai: magenta jacket with the collar up, white tee, jeans, headband
  rai:       (P) => ({ body: "base", skin: P.skin[0], ...COSTUME[costume].rai(P), pants: "#2f3448", knee: "#3d4560", shoe: "#ece6dc", sole: "#8b8478", shoeStripe: P.T.accent, hair: P.hair, hairStyle: "spiky", band: "#f4efe6", collar: true, rolled: true, mood: "hero" }),
  // Kai: his sister. Teal vest over a dark tee, cargo trousers, a long braid
  kai:       (P) => ({ body: "slim", skin: P.skin[2], ...COSTUME[costume].kai(P), pants: "#4f4335", knee: "#5d503f", shoe: "#2b2622", sole: "#14110f", hair: "#3a2416", hairStyle: "braid", vest: true, wrist: P.T.teal, mood: "hero", lashes: true }),
  grunt:     (P) => ({ body: "base", skin: P.skin[1], shirt: P.T.amber, pants: "#4a5560", shoe: "#2a2420", sole: "#111", hair: P.hair, hairStyle: "cap", cap: "#2f3a4a", sleeves: "short", stubble: true, mood: "mean" }),
  pipeGrunt: (P) => ({ body: "base", skin: P.skin[0], jacket: "#6d7a45", shirt: "#3a3a32", pants: "#4a4038", shoe: "#2a2420", sole: "#111", hair: "#6b3b24", hairStyle: "beanie", cap: "#8a2f2f", stubble: true, mood: "mean" }),
  kicker:    (P) => ({ body: "lean", skin: P.skin[3], vest: true, jacket: "#26242a", pants: "#24407a", stripe: "#f4efe6", shoe: "#d9d2c6", sole: "#555", hair: P.T.red, hairStyle: "mohawk", sleeves: "none", chain: true, mood: "mean" }),
  thrower:   (P) => ({ body: "slim", skin: P.skin[2], jacket: "#4a3326", shirt: "#bfb7aa", pants: "#2c2a30", shoe: "#1a1816", sole: "#000", hair: P.hair, hairStyle: "bandana", cap: P.T.amber, shades: true, knives: true, mood: "mean" }),
  bruiser:   (P) => ({ body: "stocky", skin: P.skin[1], shirt: P.T.red, pants: "#3f4636", shoe: "#1a1a1a", sole: "#000", hair: P.hair, hairStyle: "bald", beard: true, sleeves: "none", mood: "mean" }),
  // Bhola, a pehelwan: white banian, red langot sash, loose dhoti, handlebar moustache, black thread on the arm
  ox:        (P) => ({ body: "wrestler", skin: P.skin[1], shirt: "#f4efe6", banian: true, pants: "#ece6dc", dhoti: true, belt: "#b42318", sash: true, shoe: "#7a4a22", sole: "#3a2410", jutti: true, hair: P.hair, hairStyle: "bald", handlebar: true, scar: true, sleeves: "none", thread: true, mood: "mean" }),
  // Raghav, a kalaripayattu master: bare chest, red kacha with a tail, white mundu, kudumi tuft, sandal tilak, barefoot
  rook:      (P) => ({ body: "kalari", skin: P.skin[1], bare: true, pants: "#efe9dd", dhoti: true, belt: "#b42318", sash: true, shoe: P.skin[1], sole: shade(P.skin[1], -0.3), barefoot: true, hair: P.hair, hairStyle: "kudumi", tilak: true, armband: "#d9a441", wrist: "#efe9dd", sleeves: "none", mood: "calm" }),
  // Cheel, a kite runner: teal kurta to the knee, churidar, an amber dupatta over her face, a kite reel at her hip
  crane:     (P) => ({ body: "slim", skin: P.skin[2], jacket: "#3d2b78", kurta: true, shirt: "#3d2b78", pants: "#2a2230", shoe: "#0e0e0e", sole: "#000", hair: "#1d1b18", hairStyle: "braid", mask: true, dupatta: P.T.amber, reel: true, mood: "calm", lashes: true }),
  // Ranjit, "Mr. Rollback": forty years older now. Grey hair, charcoal Nehru jacket with gold buttons, white kurta, dark glasses
  rollback:  (P) => ({ body: "boss", skin: P.skin[0], jacket: P.dark ? "#4a4660" : "#2b2b33", nehru: true, kurta: true, shirt: "#f4efe6", pocket: "#b42318", pants: "#f4efe6", shoe: "#0e0e0e", sole: "#000", hair: "#a7a19a", hairStyle: "slick", grey: true, shades: true, mustache: true, watchChain: true, mood: "mean" })
};

function pose(f) {
  let p = { hip: [0, -18], sh: [1, -31], head: [2, -38], hf: [9, -27], ef: [6, -24], hb: [5, -28], eb: [1, -25], ff: [6, 0], kf: [5, -9], fb: [-5, 0], kb: [-3, -9], rot: 0, rc: [0, -18] };
  const s = f.st, t = f.t, at = f.atkName;
  const bob = Math.round(Math.sin(frameNo / 14 + f.id * 10) * 0.7);
  if (s === "idle" || s === "grabbed") { for (const j of ["sh", "head", "hf", "ef", "hb", "eb"]) p[j] = [p[j][0], p[j][1] + bob]; }
  if (s === "walk" || s === "run") {
    const sp = s === "run" ? 1.9 : 1.6, a = Math.sin(f.walkPh * sp), c = Math.cos(f.walkPh * sp), r = s === "run" ? 1.6 : 1;
    p.ff = [5 + a * 6 * r, -Math.max(0, c) * 2 * r]; p.kf = [6 + a * 4 * r, -9 - Math.max(0, c) * 2];
    p.fb = [-3 - a * 6 * r, -Math.max(0, -c) * 2 * r]; p.kb = [-2 - a * 3 * r, -9 - Math.max(0, -c) * 2];
    p.hf = [6 - a * 5 * r, -23]; p.ef = [3 - a * 2, -26]; p.hb = [-2 + a * 5 * r, -23]; p.eb = [-1 + a * 2, -26];
    if (s === "run") { p.sh = [5, -30]; p.head = [7, -36]; }
    p.sh[1] += Math.abs(c) > 0.7 ? -1 : 0; p.head[1] = p.sh[1] - 7;
  }
  if ((KINDS[f.kind].look || f.kind) === "ox" && (s === "idle" || s === "grabbed" || s === "taunt")) { p.hf = [13, -22]; p.ef = [12, -28]; p.hb = [-8, -22]; p.eb = [-8, -28]; }
  const A = (name) => s === "attack" && at === name, ext = (lo, hi) => f.atk && t >= f.atk.a0 - lo && t <= f.atk.a1 + hi;
  if (A("jab") || A("jab2") || A("ePunch")) {
    const e = ext(2, 2), front = at !== "jab2";
    p.sh = [3, -31]; p.head = [4, -38]; p.ff = [8, 0]; p.kf = [8, -9]; p.fb = [-6, 0]; p.kb = [-4, -9];
    if (front) { p.hf = e ? [21, -30] : [10, -27]; p.ef = e ? [12, -30] : [7, -26]; }
    else { p.hb = e ? [20, -31] : [6, -28]; p.eb = e ? [11, -31] : [2, -26]; p.hf = [8, -27]; }
  }
  if (A("upper") || A("heavy")) {
    const e = ext(1, 4), w = t < f.atk.a0 - 1;
    p.sh = w ? [-1, -29] : [3, -32]; p.head = w ? [0, -36] : [5, -39];
    p.hf = e ? [13, -45] : w ? [-6, -24] : [9, -30]; p.ef = e ? [10, -36] : [-2, -26];
    p.ff = [8, 0]; p.kf = [9, -10]; p.fb = [-6, 0]; p.kb = [-4, -8];
  }
  if (A("kick") || A("eKick") || A("round")) {
    const e = ext(1, 3), hi = at === "round";
    p.sh = [-3, -30]; p.head = [-4, -37];
    p.ff = e ? (hi ? [22, -34] : [25, -18]) : [8, -12]; p.kf = e ? (hi ? [12, -28] : [12, -19]) : [8, -16];
    p.fb = [-3, 0]; p.kb = [-2, -9]; p.hf = [2, -27]; p.ef = [3, -24]; p.hb = [-8, -25]; p.eb = [-4, -27];
  }
  if (A("spinheel")) {
    const ph = t / f.atk.len;
    p.rot = 0; p.sh = [-4, -30]; p.head = [-5, -37];
    if (ph < 0.3) { p.ff = [-14, -20]; p.kf = [-7, -18]; }
    else { p.ff = [26, -26]; p.kf = [13, -23]; }
    p.fb = [-2, 0]; p.kb = [-1, -9]; p.hf = [-6, -28]; p.hb = [-10, -24];
  }
  if (A("elbow")) {
    const e = ext(1, 3);
    p.sh = [2, -31]; p.head = [3, -38]; p.eb = e ? [-14, -28] : [-6, -27]; p.hb = e ? [-6, -29] : [-1, -26];
    p.ff = [7, 0]; p.fb = [-7, 0];
  }
  if (A("tackle")) { p.sh = [9, -28]; p.head = [11, -34]; p.hf = [10, -24]; p.ef = [12, -27]; p.hb = [4, -22]; p.ff = [10, 0]; p.kf = [9, -10]; p.fb = [-10, 0]; p.kb = [-6, -8]; }
  if (A("pipe")) {
    const ph = t / f.atk.len, ang = ph < 0.35 ? -2.2 : ph < 0.55 ? -2.2 + (ph - 0.35) / 0.2 * 2.6 : 0.4;
    p.hf = [3 + Math.cos(ang) * 14, -30 + Math.sin(ang) * 14]; p.ef = [3 + Math.cos(ang) * 7, -30 + Math.sin(ang) * 7]; p.pipeAng = ang;
    p.ff = [8, 0]; p.kf = [8, -9]; p.fb = [-6, 0]; p.kb = [-4, -9];
  }
  if (A("flurry")) { const hi = (t % 6) < 3; p.sh = [-3, -30]; p.head = [-4, -37]; p.ff = hi ? [24, -28] : [25, -16]; p.kf = hi ? [12, -25] : [12, -18]; p.fb = [-3, 0]; p.kb = [-2, -9]; p.hf = [2, -27]; p.hb = [-8, -25]; }
  if (A("toss") || A("eToss") || A("fan") || A("chakra")) { const e = t > 6; p.hf = e ? [18, -32] : [-8, -36]; p.ef = e ? [10, -31] : [-3, -32]; p.sh = e ? [3, -31] : [-2, -30]; }
  if (A("pound") || A("quake")) { const up = t < 20; p.hf = up ? [4, -50] : [14, -6]; p.ef = up ? [3, -42] : [10, -16]; p.hb = up ? [-2, -50] : [8, -6]; p.eb = up ? [-1, -42] : [4, -16]; p.sh = up ? [0, -32] : [6, -24]; p.head = up ? [1, -39] : [9, -30]; if (!up) { p.kf = [8, -6]; p.kb = [-4, -6]; p.hip = [1, -12]; } }
  if (A("charge") || A("rush")) { const a = Math.sin(frameNo / 3); p.sh = [7, -29]; p.head = [9, -35]; p.hf = [16, -26]; p.hb = [-6, -22 + a * 3]; p.ff = [6 + a * 7, 0]; p.kf = [7 + a * 5, -9]; p.fb = [-4 - a * 7, 0]; p.kb = [-3 - a * 4, -9]; }
  if (A("roll") || A("eRoll") || A("kroll")) {
    // rolling kick: tuck into a ball and somersault forward, legs whipping out
    p.rot = t * 0.42; p.rc = [0, -14];
    p.hip = [0, -14]; p.sh = [4, -24]; p.head = [7, -28]; p.hf = [6, -16]; p.ef = [7, -20]; p.hb = [2, -16]; p.eb = [3, -20];
    const out = (t % 8) < 4; p.ff = out ? [16, -14] : [6, -6]; p.kf = out ? [8, -14] : [8, -12]; p.fb = [-2, -6]; p.kb = [2, -10];
  }
  if (s === "windup") {
    const q = Math.sin(frameNo / 2) * 0.6;
    p.sh = [-2 + q, -30]; p.head = [-3 + q, -37]; p.hf = [-7, -27]; p.ef = [-2, -29]; p.hb = [-9, -24];
    if (f.atkName === "charge" || f.atkName === "eRoll") { p.sh = [-4, -28]; p.head = [-5, -34]; p.ff = [9, 0]; p.kf = [8, -8]; p.hip = [0, -16]; }
  }
  if (s === "taunt") { const w = Math.sin(t / 3) * 4; p.hf = [12, -38 + w]; p.ef = [8, -32]; p.hb = [-3, -19]; p.eb = [-4, -24]; p.head = [3, -39]; }
  if (s === "pickup") { p.sh = [6, -24]; p.head = [9, -30]; p.hf = [12, -6]; p.ef = [9, -15]; p.kf = [9, -10]; p.kb = [-1, -10]; p.hip = [1, -15]; }
  if (s === "air") {
    const k = f.airAtk;
    p.ff = [4, -6]; p.kf = [8, -13]; p.fb = [-4, -4]; p.kb = [-1, -12]; p.hf = [8, -35]; p.ef = [6, -31]; p.hb = [-6, -33]; p.eb = [-3, -30];
    if (k === "jkick" || k === "eFly" || k === "dive") { p.ff = [22, -12]; p.kf = [11, -15]; p.fb = [-6, -8]; p.kb = [-2, -14]; p.hf = [4, -34]; p.hb = [-9, -30]; p.sh = [-2, -31]; p.head = [-3, -38]; if (k === "dive") { p.rot = 0.5; } }
    if (k === "flykick") { p.rot = -0.5; p.ff = [24, -16]; p.kf = [12, -17]; p.fb = [-8, -14]; p.kb = [-3, -15]; p.hf = [-6, -34]; p.hb = [-10, -30]; }
    if (k === "cyclone") { p.ff = [24, -20]; p.kf = [12, -20]; p.fb = [-5, -6]; p.kb = [-1, -12]; p.hf = [-8, -32]; p.hb = [-10, -28]; }
    if (k === "dragon") { p.hf = [6, -54]; p.ef = [5, -44]; p.sh = [3, -33]; p.head = [5, -40]; p.ff = [6, -2]; p.kf = [8, -12]; p.fb = [-3, -6]; }
  }
  if (s === "grab") { p.hf = [14, -29]; p.ef = [8, -29]; p.hb = [12, -25]; p.eb = [5, -25]; }
  if (s === "knee") { p.hf = [14, -29]; p.hb = [12, -25]; p.kf = [12, -22]; p.ff = [7, -14]; p.sh = [3, -31]; p.head = [4, -38]; }
  if (s === "throw") { const k = 1 - t / 22; p.sh = [-4 * k, -30]; p.head = [-5 * k, -37]; p.hf = [-12 * k + 4, -40]; p.hb = [-10 * k, -38]; }
  if (s === "hurt") { p.sh = [-5, -30]; p.head = [-7, -36]; p.hf = [-2, -36]; p.ef = [-2, -31]; p.hb = [-10, -33]; p.ff = [4, 0]; p.fb = [-6, 0]; }
  if (s === "fly" || s === "thrown") { p.rot = -Math.min(1.45, 0.3 + (3.6 - f.vz) * 0.3); p.hf = [-4, -40]; p.hb = [-10, -38]; p.ff = [8, -2]; }
  if (s === "lying" || s === "dead" || s === "out") { p.rot = -Math.PI / 2; p.hf = [6, -30]; p.hb = [-4, -34]; p.rc = [0, -4]; }
  if (s === "getup") { const k = t / 26; p.rot = -Math.PI / 2 * k; p.hip = [0, -14]; p.kf = [8, -8]; p.rc = [0, -4]; }
  return p;
}

/* ---------- 8-bit sprite fighters ---------- */
const SHEET_OF = { nani: "nani", rai: "rai", kai: "kai", grunt: "grunt", pipeGrunt: "pipeGrunt", pipeBare: "pipeBare", kicker: "kicker", thrower: "thrower", bruiser: "bruiser",
  ox: "ox", rook: "rook", crane: "crane", rollback: "rollback", pOx: "ox", pRook: "rook", pCrane: "crane", pRollback: "rollback",
  kaal: "kaal", arsonist: "kaal", catcher: "netman", constable: "constable", riot: "constable", tola: "tola", porter: "porter", wrestler: "wrestler",
  biker: "biker", spinner: "spinner", breaker: "breaker", netman: "netman", hookman: "hookman", djrewind: "djrewind", mausi: "mausi", godbole: "godbole", netagoon: "netagoon", fakecop: "constable" };
// sheets drawn holding a lathi, in the lathi thug's frame order
const LATHI_SHEETS = new Set(["pipeGrunt", "constable", "hookman"]);
// which frame to show, and an optional spin, for each state and move
// sheets whose frame 4 is not a punch wind-up (an uppercut or a raised knee): they punch from guard
const NO_PUNCH_COCK = new Set(["rook", "crane", "kicker", "ox"]);
// frames for a fighter holding a lathi (the lathi thug, or a player's "<name>Lathi" sheet)
function lathiFrame(f) {
  const s = f.st, at = f.atkName;
  if (s === "taunt") return { i: 11 };
  if (s === "air") return { i: f.airAtk && f.airAtk !== "dragon" ? 8 : f.airAtk === "dragon" ? 4 : 7, rot: f.airAtk === "cyclone" ? f.airT * 0.5 : 0 };
  if (s !== "attack") return null;
  if (at === "pipe") return { i: f.t < f.atk.a0 ? 4 : 5 };
  if (at === "roll" || at === "kroll" || at === "eRoll") return { i: 7, rot: f.t * 0.42 };
  if (at === "flurry") return { i: (f.t % 6) < 3 ? 6 : 3 };
  if (at === "kick" || at === "eKick" || at === "round" || at === "spinheel") return { i: 6 };
  if (at === "upper" || at === "heavy" || at === "quake") return { i: f.t < 8 ? 4 : 5 };
  return { i: 3 };
}
function spriteFrame(f, sheet) {
  const s = f.st === "flee" ? "run" : f.st, at = f.atkName;
  if (sheet === "nani") return { i: f.pose || 0 };   // 0 hands clasped, 1 arms open, 2 waving, 3 chai
  if (LATHI_SHEETS.has(sheet) || sheet.endsWith("Lathi")) { const lf = lathiFrame(f); if (lf) return lf; }
  if ((s === "walk" || s === "run") && SPRITES["w_" + sheet] && FIGHTER_FRAMES[sheet + "_walk"]) return { i: Math.floor(f.walkPh / 0.8) % 8, walk: true };
  if (s === "walk") return { i: [1, 0, 2, 0][Math.floor(f.walkPh / 1.4) % 4] };
  if (s === "run") return { i: [1, 2][Math.floor(f.walkPh / 1.2) % 2] };
  if (s === "windup") {
    if (at === "charge") return { i: 6 };   // brace low before the rush
    return { i: (at === "eKick" && sheet !== "kicker") || (at === "ePunch" && NO_PUNCH_COCK.has(sheet)) ? 0 : 4 };
  }
  if (s === "hurt" || s === "grabbed") return { i: 9 };
  if (s === "fly" || s === "thrown") return f.vz > 0 ? { i: 9, rot: -0.35 } : { i: 10 };
  if (s === "lying" || s === "dead" || s === "out") return { i: 10 };
  if (s === "getup") return { i: f.t > 13 ? 10 : 7 };
  if (s === "pickup") return { i: 7 };
  if (s === "duck") return { i: 9, squash: 0.7 };   // hunched and low, under a bridge
  if (s === "roll") return { i: 7, rot: f.t * 0.45 * (f.face || 1) };   // a dodge roll, tucked
  if (s === "block" || s === "eblock") return { i: 0, guard: true };  // standing guard (a shimmer shows it)
  if (s === "zip") return { i: 7 };                  // hanging from the kite wire
  if (s === "sit") return { i: 7 };                  // on a stool at a café table, knees up
  if (s === "ride") return (f.ride || f.bike || {}).kind === "bicycle" && SPRITES["w_" + sheet] && FIGHTER_FRAMES[sheet + "_walk"] ? { i: Math.floor(f.walkPh / 0.8) % 8, walk: true } : { i: 0 };   // hanging from the kite wire, or in the saddle                  // hanging from the kite wire
  if (s === "taunt") return { i: sheet === "rai" || sheet === "crane" ? 11 : 0 };
  if (s === "grab" || s === "knee") return { i: 3 };
  if (s === "throw") return { i: 4 };
  if (s === "air") {
    const a = f.airAtk;
    if (a === "dragon") return { i: 4 };
    if (a === "cyclone" && f.team === "p") return { i: 8, rot: f.t * 0.5 * f.face };   // the Kalari whirl
    if (a === "jkick" || a === "flykick" || a === "eFly" || a === "dive" || a === "cyclone") return { i: 8 };
    return { i: 7 };
  }
  if (s === "attack") {
    if (at === "roll") return { i: 7, rot: f.t * 0.42 };
    if (at === "eRoll" || at === "kroll") return { i: 11, rot: sheet === "rook" ? f.t * 0.42 : 0 };
    if (at === "flurry") return { i: (f.t % 6) < 3 ? 11 : 6 };
    if (at === "rush") return { i: 11 };
    if (at === "charge") return { i: sheet === "ox" ? 11 : 6 };
    if (at === "fan") return { i: sheet === "crane" ? 11 : 3 };
    if (at === "quake" || at === "pound") return { i: 11 };
    if (at === "eToss") return { i: f.t < ATK.eToss.spawn ? 4 : 6 };
    if (at === "eSweep") return { i: f.t < f.atk.a0 ? 4 : 5 };   // the b-boy low on the floor
    if (at === "eChain" || at === "eSlap") return { i: f.t < f.atk.a0 ? 4 : 6 };
    if (at === "eShove") return { i: f.t < f.atk.a0 ? 0 : 11 };
    if (at === "whistle") return { i: 11 };
    if (at === "pipe") return { i: f.t < f.atk.a0 ? 4 : 3 };
    if (at === "toss") return { i: f.t < ATK.toss.spawn ? 4 : 3 };
    if (at === "chakra") return { i: sheet === "avatar" ? 11 : 3 };
    if (at === "upper") return { i: 4 };
    // Bhola's heavy is a two-fisted hammer: fists overhead, then the slam (his 13th frame)
    if (at === "heavy" && FIGHTER_FRAMES[sheet][12]) return { i: f.t < f.atk.a0 ? 4 : f.t <= f.atk.a1 + 8 ? 12 : 0 };
    if (at === "heavy" || at === "ePunch") return { i: f.t < f.atk.a0 ? (at === "ePunch" && NO_PUNCH_COCK.has(sheet) ? 0 : 4) : f.t <= f.atk.a1 + 6 ? 3 : 0 };
    if (at === "eKick") return { i: f.t < f.atk.a0 && sheet === "kicker" ? 4 : f.t <= f.atk.a1 + 6 ? 5 : 0 };
    if (at === "kick") return { i: 5 };
    if (at === "round" || at === "spinheel") return { i: 6 };
    if (at === "elbow") return { i: 3, back: true };
    return { i: 3 };   // jab, jab2, ePunch, tackle, toss, chakra
  }
  return { i: 0 };
}
// one frame of sprites/birds.png at half size, bottom-centred on (x, y)
function bird(i, x, y, flip) {
  const im = SPRITES.birds, d = typeof FIGHTER_FRAMES !== "undefined" && FIGHTER_FRAMES.birds && FIGHTER_FRAMES.birds[i];
  if (!im || !d) return false;
  const [sx, sy, w, h, ax, ay] = d;
  g.save(); g.translate(Math.round(x * 2) / 2, Math.round(y * 2) / 2); if (flip) g.scale(-1, 1);
  g.drawImage(im, sx, sy, w, h, -ax / 2, -ay / 2, w / 2, h / 2); g.restore();
  return true;
}
// the top of a fighter's head in one atlas frame (atlas pixels), measured once from the art
const HEAD_TOP = new Map();
function headTop(im, key, sx, sy, w, h) {
  let r = HEAD_TOP.get(key);
  if (!r) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, sx, sy, w, h, 0, 0, w, h);
    const a = x.getImageData(0, 0, w, h).data;
    let top = -1, sum = 0, n = 0;
    for (let yy = 0; yy < h && (top < 0 || yy < top + 6); yy++) for (let xx = 0; xx < w; xx++) if (a[(yy * w + xx) * 4 + 3] > 0) { if (top < 0) top = yy; sum += xx; n++; }
    r = [n ? sum / n : w / 2, Math.max(0, top)];
    HEAD_TOP.set(key, r);
  }
  return r;
}
// Costumes recolour Rai's magenta jacket / Kai's teal vest in the 8-bit sheets
// (hue range, minimum saturation, typical brightness), built once per sheet and costume.
const COSTUME_TINT = { avatar: "#d9741c", neon: "#2a2433", gold: "#c9a227", hero: "#7a2230", sherwani: "#efe2c0" };   // hero: the film costume (S11); sherwani: the Baraat (S15)
const COSTUME_HUE = { rai: [300, 350, 0.3, 0.72], kai: [150, 200, 0.25, 0.62] };
const TINTED = new Map();
function costumeAtlas(im, base, key) {
  const tint = COSTUME_TINT[costume]; if (!tint) return im;
  const k = key + "@" + costume; let c = TINTED.get(k); if (c) return c;
  c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data, [h0, h1, smin, ref] = COSTUME_HUE[base];
  const t = parseInt(tint.slice(1), 16), tr = t >> 16, tg = (t >> 8) & 255, tb = t & 255;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const r = a[i], gg = a[i + 1], b = a[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    if (mx === mn || (mx - mn) / mx < smin) continue;
    let h = mx === r ? ((gg - b) / (mx - mn)) % 6 : mx === gg ? (b - r) / (mx - mn) + 2 : (r - gg) / (mx - mn) + 4;
    h = (h * 60 + 360) % 360;
    if (h < h0 || h > h1) continue;
    const f = Math.min(1.6, mx / 255 / ref);
    a[i] = Math.min(255, tr * f); a[i + 1] = Math.min(255, tg * f); a[i + 2] = Math.min(255, tb * f);
  }
  x.putImageData(d, 0, 0); TINTED.set(k, c);
  return c;
}
// a red silhouette of one atlas frame, built once and reused: the rage glow
const RAGE_SIL = new Map();
function rageSilhouette(im, key, sx, sy, w, h, col = "#ff2a1a") {
  key += col;
  let c = RAGE_SIL.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"); x.drawImage(im, sx, sy, w, h, 0, 0, w, h);
    x.globalCompositeOperation = "source-in"; x.fillStyle = col; x.fillRect(0, 0, w, h);
    RAGE_SIL.set(key, c);
  }
  return c;
}
// on a stool with a glass of chai: the seated frame, feet on the ground at (x, y)
const seated = (f) => f.st === "sit" || (typeof sitting !== "undefined" && !!sitting && sitting.p === f && street.id === sitting.street);
function drawSeated(f, x, y, sheet) {
  const base = f.team === "p" && /^(rai|kai)/.test(sheet) ? sheet.slice(0, 3) : null;
  let im = SPRITES["s_" + sheet]; if (base && costume !== "classic") im = costumeAtlas(im, base, "s_" + sheet);
  const sc = KINDS[f.kind].scale, w = im.width, h = im.height;
  g.save(); g.translate(x, y); g.scale(f.face * sc, sc);
  if (f.flash > 0) { f.flash--; g.filter = "brightness(2.6)"; }
  g.drawImage(im, -w / 4, -h / 2 + 1, w / 2, h / 2);
  g.restore();
}
function drawSpriteFighter(f, x, y) {
  const ss = spriteSheet(f).replace(/Lathi$/, "");
  if (seated(f) && SPRITES["s_" + ss]) { drawSeated(f, x, y, ss); return; }
  const k = KINDS[f.kind], sheet = spriteSheet(f), fr = spriteFrame(f, sheet);
  const ikey = (fr.walk ? "w_" : "f_") + sheet, base = f.team === "p" && /^(rai|kai)/.test(sheet) ? sheet.slice(0, 3) : null;
  let im = SPRITES[ikey];
  if (base && costume !== "classic") im = costumeAtlas(im, base, ikey);
  const d = FIGHTER_FRAMES[fr.walk ? sheet + "_walk" : sheet][fr.i], [sx, sy, w, h, ax, ay] = d, sc = k.scale;
  const face = fr.back ? -f.face : f.face;
  // knocked flying: two fading copies trail behind
  if (f.st === "fly" || f.st === "thrown") {
    const tr = f.trail || (f.trail = []); if (!hitStop && !paused) tr.unshift([f.x, f.z]); if (tr.length > 7) tr.length = 7;
    for (let j = 6; j >= 3; j -= 3) if (tr[j]) { g.save(); g.globalAlpha = j === 3 ? 0.26 : 0.13; g.translate(Math.round(tr[j][0] - cam), y - Math.round(tr[j][1])); g.scale(face * sc, sc); if (fr.rot) { g.translate(0, -h / 4); g.rotate(fr.rot); g.translate(0, h / 4); } g.drawImage(im, sx, sy, w, h, -ax / 2, -ay / 2, w / 2, h / 2); g.restore(); }
  } else if (f.trail) f.trail = null;
  g.save();
  g.translate(x, y - Math.round(f.z));
  // squash on landing, stretch on the way up, and a slow breath standing still
  const land = frameNo - (f.landF || -99), sq = land < 6 ? 0.86 + land * 0.023 : f.st === "air" && f.vz > 1.5 ? 1.06 : 1;
  const breath = f.st === "idle" ? 1 + 0.02 * Math.sin(frameNo / 24 + (f.ph || (f.ph = Math.random() * 6))) : 1;
  g.scale(face * sc * (2 - sq), sc * (fr.squash || 1) * sq * breath);
  if (fr.rot) { g.translate(0, -h / 4); g.rotate(fr.rot); g.translate(0, h / 4); }
  // a pulsing outline: red for an enraged boss, gold for a player in the Avatar's divine form
  const glow = f.st === "dead" ? null : f.rage ? "#ff2a1a" : f.avatarT > 0 ? "#ffd23a" : null;
  const sil = glow ? rageSilhouette(im, ikey + ":" + fr.i, sx, sy, w, h, glow) : null, pulse = 0.5 + Math.sin(frameNo / 5) * 0.5;
  if (sil) {
    g.globalAlpha = 0.55 + pulse * 0.35;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1.5, -1], [1.5, -1]]) g.drawImage(sil, -ax / 2 + ox, -ay / 2 + oy, w / 2, h / 2);
    g.globalAlpha = 1;
  }
  if (f.flash > 0) { f.flash--; g.filter = "brightness(2.6)"; }
  g.drawImage(im, sx, sy, w, h, -ax / 2, -ay / 2, w / 2, h / 2);
  g.filter = "none";
  // a red cast over an enraged boss; only a faint shimmer on the divine form, so skin keeps its natural colour
  if (sil) { g.globalAlpha = f.rage ? 0.14 + pulse * 0.14 : 0.03 + pulse * 0.05; g.drawImage(sil, -ax / 2, -ay / 2, w / 2, h / 2); g.globalAlpha = 1; }
  if (bigHead || (base && costume === "avatar")) {
    const [hx, hy] = headTop(im, ikey + ":" + fr.i, sx, sy, w, h), hh = Math.round(h * 0.24), hw = Math.round(hh * 1.2);
    const cx = (hx - ax) / 2, top = (hy - ay) / 2;
    if (bigHead && fr.i !== 10) {   // not on the knocked-down frame, where the top is a shoulder
      const s0 = Math.max(sx, Math.round(sx + hx - hw / 2)), s1 = Math.min(sx + w, s0 + hw);
      const dw = (s1 - s0) / 2 * 1.7, dh = hh / 2 * 1.7;
      g.drawImage(im, s0, sy + hy, s1 - s0, hh, cx - dw / 2, top + hh / 2 - dh, dw, dh);
    }
    // a peacock feather tucked into the hair for the Avatar costume
    if (base && costume === "avatar") { const fy = bigHead ? top + hh / 2 - hh / 2 * 1.7 : top; R(cx - 3, fy - 6, 1.5, 7, "#1f7a6a"); R(cx - 3.5, fy - 7.5, 2.5, 2.5, "#2b54a8"); R(cx - 3, fy - 7, 1.2, 1.2, "#f2c230"); }
  }
  // the pigeon friend rides on the head
  if (f.pigeon && SPRITES.birds) { const [hx, hy] = headTop(im, ikey + ":" + fr.i, sx, sy, w, h); bird(0, (hx - ax) / 2 - 1, (hy - ay) / 2 + 2 - (bigHead && fr.i !== 10 ? Math.round(h * 0.24) / 2 * 0.7 : 0)); }
  if (fr.guard) { g.globalAlpha = 0.35 + 0.2 * Math.sin(frameNo / 4); g.strokeStyle = f.team === "p" ? "#5cc8c0" : "#e8b65a"; g.lineWidth = 2; g.beginPath(); g.arc(10, -34, 20, -1.1, 1.1); g.stroke(); g.globalAlpha = 1; }
  if (f.weapon && !LATHI_SHEETS.has(sheet) && !sheet.endsWith("Lathi")) spriteWeapon(f, fr.walk ? 1 : fr.i);
  g.restore();
}
// a picked-up lathi or knife, drawn in the sprite's front hand (game pixels from the feet, facing right)
const HAND = [[9, -33], [8, -30], [8, -30], [24, -40], [6, -50], [6, -32], [4, -34], [9, -30], [8, -30], [-4, -36], null, [5, -48]];
function spriteWeapon(f, i) {
  const h = HAND[i];
  if (!h) return;
  let ang = f.weapon.kind === "pipe" ? -1.2 : -0.3;
  if (f.st === "attack" && f.atkName === "pipe") { const ph = f.t / f.atk.len; ang = ph < 0.35 ? -2.2 : ph < 0.55 ? -2.2 + (ph - 0.35) / 0.2 * 2.6 : 0.4; }
  const c = Math.cos(ang), sn = Math.sin(ang), [hx, hy] = h;
  const seg = (a, b, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(hx + c * a, hy + sn * a); g.lineTo(hx + c * b, hy + sn * b); g.stroke(); };
  g.lineCap = "butt";
  if (f.weapon.kind === "pipe") { seg(-7, 21, 3.4, "#2a1a0e"); seg(-6.5, 20.5, 2, "#c79a52"); seg(1, 3, 2.2, "#6b4a22"); seg(11, 12.5, 2.2, "#6b4a22"); }
  else if (f.weapon.kind === "umbrella") {
    // a black umbrella: furled in the hand, opened over the head when it rains (and not swinging)
    if (typeof raining === "function" && raining() && f.st !== "attack") { g.fillStyle = "#1d1b22"; g.beginPath(); g.ellipse(hx - 2, hy - 30, 20, 8, 0, Math.PI, 0); g.fill(); R(hx - 22, hy - 30, 40, 1.5, "#3a3640"); seg(-30, 0, 1.2, "#4a453f"); }
    else {
      // furled and carried point-down like a walking stick, crook handle up, so it never reads as
      // anything but an umbrella; in a swing it arcs like the lathi
      let a = 1.15;
      if (f.st === "attack") { const ph = f.t / ((f.atk && f.atk.len) || 20); a = ph < 0.35 ? -2.2 : ph < 0.55 ? -2.2 + (ph - 0.35) / 0.2 * 2.6 : 0.4; }
      g.save(); g.translate(hx, hy); g.rotate(a);
      g.fillStyle = "#3a0e16"; g.beginPath(); g.moveTo(1, -1.6); g.lineTo(8, -2.6); g.lineTo(19, -0.9); g.lineTo(19, 0.9); g.lineTo(8, 2.6); g.lineTo(1, 1.6); g.closePath(); g.fill();
      g.fillStyle = "#8a2433"; g.beginPath(); g.moveTo(2, -0.9); g.lineTo(8, -1.8); g.lineTo(18, -0.4); g.lineTo(18, 0.4); g.lineTo(8, 1.2); g.lineTo(2, 0.9); g.closePath(); g.fill();   // the furled canopy
      R(9, -1.8, 1, 3.6, "#d8b06a");   // the strap and its press-stud
      R(19, -0.5, 4, 1, "#c9ced4");    // the ferrule
      g.strokeStyle = "#8a5d3b"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(1, 0); g.lineTo(-3, 0); g.arc(-3, 2.6, 2.6, -Math.PI / 2, Math.PI / 2, true); g.stroke();   // the crook
      g.restore();
    }
  }
  else if (f.weapon.kind === "bat") { seg(-6, 3, 2, "#3a2a1a"); seg(3, 22, 4.2, "#c9a26a"); seg(3, 22, 1.2, "#e8cf9a"); seg(-6, -2, 2.4, "#c0392b"); }   // a taped handle, a willow blade
  else if (f.weapon.kind === "manjha") {   // a chakri (reel) in the fist and the glass string flicking out
    R(hx - 3, hy - 3, 6, 6, "#c0392b"); R(hx - 1, hy - 1, 2, 2, "#f2c230");
    const L = f.st === "attack" ? 34 : 9; g.strokeStyle = "rgba(250,240,220,0.9)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx + c * L * 0.5, hy + sn * L * 0.5 - 6, hx + c * L, hy + sn * L); g.stroke();
  }
  else if (SPRITES.knife) { g.save(); g.translate(hx, hy); g.rotate(ang); g.drawImage(SPRITES.knife, -3, -1.5, 14, 3); g.restore(); }
  else { seg(-2, 8, 2.6, "#1e2226"); seg(-1.5, 1.5, 1.6, "#6b4a22"); seg(1.5, 7.5, 1.4, "#d8dde2"); }
}
const spriteSheet = (f) => {
  if (f.kind === "pipeGrunt" && !f.weapon) return "pipeBare";
  if (f.team === "p" && f.avatarT > 0 && SPRITES.f_avatar && typeof FIGHTER_FRAMES !== "undefined" && FIGHTER_FRAMES.avatar) return "avatar";
  const base = SHEET_OF[f.kind], armed = base + "Lathi";
  return f.team === "p" && f.weapon && f.weapon.kind === "pipe" && SPRITES["f_" + armed] && typeof FIGHTER_FRAMES !== "undefined" && FIGHTER_FRAMES[armed] ? armed : base;
};
const usesSprite = (f) => SHEET_OF[f.kind] && SPRITES["f_" + spriteSheet(f)] && typeof FIGHTER_FRAMES !== "undefined" && FIGHTER_FRAMES[spriteSheet(f)];

const STANCE_STATES = new Set(["idle", "walk", "run", "windup", "grabbed", "hurt", "taunt"]);
const DOWN_DRAW = new Set(["lying", "dead", "getup", "out"]);
function drawFighter(f) {
  const P = PAL, k = KINDS[f.kind], lk = (k.look || f.kind) + ":" + costume, L = P.looks[lk] || (P.looks[lk] = (LOOKS[k.look || f.kind] || LOOKS[SHEET_OF[f.kind]] || LOOKS.grunt)(P)), B = BODY[L.body || "base"], sc = k.scale * BS;
  if (f.st === "out") return;
  if (f.st === "dead" && Math.floor(f.t / 4) % 2) return;
  if (f.inv > 0 && f.team === "p" && Math.floor(f.inv / 4) % 2 && !["attack", "air"].includes(f.st)) return;
  const x = Math.round(f.x - cam), y = Math.round(f.y);
  if (x < -70 || x > LW + 70) return;   // a goonda further down the street
  if ((f.ride || f.bike || f.boat) && !DOWN_STATES.includes(f.st)) { drawRider(f, x, y); return; }   // in the saddle: the vehicle draws the shadow
  const flat = f.st === "lying" || f.st === "dead" || f.st === "getup";
  g.fillStyle = P.shadow; g.beginPath(); g.ellipse(flat && !usesSprite(f) ? x - f.face * 14 * sc : x, y, flat ? 18 * sc : Math.max(5, 9 + B.cw * 0.35 - f.z * 0.08) * sc, 3 * sc, 0, 0, 7); g.fill();
  if (usesSprite(f)) { drawSpriteFighter(f, x, y); fighterExtras(f, x, y, sc, P); return; }
  const p = pose(f), flash = f.flash > 0;
  if (flash) f.flash--;
  // heavier builds stand wider
  if (B.stance !== 1 && (STANCE_STATES.has(f.st) || (f.st === "attack" && f.atk && !f.atk.move))) for (const j of ["ff", "fb", "kf", "kb"]) p[j] = [p[j][0] * B.stance, p[j][1]];
  g.save();
  g.translate(x, y - Math.round(f.z));
  g.scale(f.face * sc, sc);
  if (p.rot) { g.translate(p.rc[0], p.rc[1]); g.rotate(p.rot); g.translate(-p.rc[0], -p.rc[1]); }
  const C = (c) => (flash ? "#ffffff" : c);
  const dk = (c, a = 0.22) => shade(c, -a), lt = (c, a = 0.14) => shade(c, a);
  const back = (c) => dk(c, 0.2), same = (c) => c;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const wave = Math.sin(frameNo / 7 + f.id * 5);

  // each layer is a list of shapes: a dark outline pass, then a colour pass
  const layer = (ops) => {
    for (const pass of [0, 1]) for (const o of ops) {
      if (pass === 0 && o.no) continue;
      const col = pass ? C(o.c) : P.ol, grow = pass ? 0 : 1;
      if (o.t === "l") { g.strokeStyle = col; g.lineWidth = o.w + grow * 2; g.lineCap = "round"; g.beginPath(); g.moveTo(o.a[0], o.a[1]); g.lineTo(o.b[0], o.b[1]); g.stroke(); }
      else if (o.t === "r") { g.fillStyle = col; g.fillRect(o.x - grow, o.y - grow, o.w + grow * 2, o.h + grow * 2); }
      else if (o.t === "e") { g.fillStyle = col; g.beginPath(); g.ellipse(o.x, o.y, o.rx + grow, o.ry + grow, 0, 0, 7); g.fill(); }
      else if (o.t === "p") { g.fillStyle = col; g.beginPath(); o.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); if (pass === 0) { g.strokeStyle = col; g.lineWidth = 2; g.lineJoin = "round"; g.stroke(); } g.fill(); }
    }
  };
  // a limb with a thin highlight along its top edge, so it reads as round
  const limb = (a, b, w, c) => [{ t: "l", a, b, w, c }, { t: "l", a: [a[0] + 0.4, a[1] - w * 0.22], b: [b[0] + 0.4, b[1] - w * 0.22], w: Math.max(0.7, w * 0.26), c: lt(c, 0.16), no: true }];

  const leg = (h, kn, ft, cl, front) => {
    const pc = cl(L.pants), loose = L.dhoti ? 1.25 : 1, ops = [];
    ops.push(...limb(h, kn, B.lw * loose, pc), ...limb(kn, ft, B.sw * (L.dhoti ? 1.12 : 1), pc));
    if (L.knee && front) ops.push({ t: "r", x: kn[0] - 1, y: kn[1] - 1.2, w: 2.2, h: 2, c: L.knee, no: true });
    if (L.stripe) ops.push({ t: "l", a: [h[0] + 1, h[1]], b: [kn[0] + 1, kn[1]], w: 1, c: L.stripe, no: true }, { t: "l", a: [kn[0] + 1, kn[1]], b: [ft[0] + 1, ft[1] - 2], w: 1, c: L.stripe, no: true });
    if (L.barefoot) ops.push({ t: "p", pts: [[ft[0] - 2, ft[1] - 2.6], [ft[0] + 3.5, ft[1] - 1.4], [ft[0] + 4.6, ft[1] + 0.8], [ft[0] - 2, ft[1] + 0.8]], c: cl(L.skin) });
    else if (L.jutti) ops.push({ t: "p", pts: [[ft[0] - 2.6, ft[1] - 2.6], [ft[0] + 3.6, ft[1] - 1.8], [ft[0] + 6.2, ft[1] - 3.4], [ft[0] + 5.2, ft[1] + 1], [ft[0] - 2.6, ft[1] + 1]], c: cl(L.shoe) }, { t: "r", x: ft[0] - 1, y: ft[1] - 1.4, w: 4, h: 0.8, c: "#d9a441", no: true });
    else {
      ops.push({ t: "p", pts: [[ft[0] - 2.8, ft[1] - 2.9], [ft[0] + 2.8, ft[1] - 2.5], [ft[0] + 5, ft[1] - 0.8], [ft[0] + 5, ft[1] + 1], [ft[0] - 2.8, ft[1] + 1]], c: cl(L.shoe) },
        { t: "r", x: ft[0] - 2.8, y: ft[1] + 0.1, w: 7.8, h: 0.9, c: cl(L.sole), no: true });
      if (L.shoeStripe) ops.push({ t: "r", x: ft[0] - 0.5, y: ft[1] - 1.7, w: 3.2, h: 0.8, c: L.shoeStripe, no: true });
    }
    return ops;
  };
  const bareArm = L.bare || L.sleeves === "none";
  const sleeveC = bareArm ? L.skin : L.sleeves === "short" ? L.shirt : (L.jacket || L.shirt);
  const foreC = bareArm || L.sleeves || L.rolled ? L.skin : (L.jacket || L.shirt);
  const arm = (s, el, hd, cl) => {
    const ops = [...limb(s, el, B.aw, cl(sleeveC)), ...limb(el, hd, B.fw, cl(foreC))];
    const mid = lerp(s, el, 0.5);
    if (bareArm && B.aw >= 5) ops.push({ t: "e", x: mid[0] + 0.5, y: mid[1] - 0.5, rx: B.aw * 0.55, ry: B.aw * 0.42, c: cl(L.skin), no: true });
    if (L.sleeves === "short") ops.push({ t: "l", a: lerp(s, el, 0.55), b: lerp(s, el, 0.7), w: B.aw + 0.6, c: cl(L.shirt) });
    if (L.rolled) ops.push({ t: "l", a: lerp(el, hd, 0.02), b: lerp(el, hd, 0.28), w: B.fw + 0.9, c: cl(L.jacket) });
    if (L.thread) ops.push({ t: "l", a: [mid[0] - 1.6, mid[1] + 0.4], b: [mid[0] + 1.6, mid[1] - 0.4], w: 0.9, c: "#111", no: true });
    if (L.armband) ops.push({ t: "l", a: [mid[0] - 1.8, mid[1] + 0.4], b: [mid[0] + 1.8, mid[1] - 0.4], w: 1.2, c: L.armband, no: true });
    if (L.wrist) ops.push({ t: "l", a: lerp(el, hd, 0.62), b: lerp(el, hd, 0.8), w: B.fw + 0.7, c: cl(L.wrist) });
    const fc = cl(L.glove || L.skin);
    ops.push({ t: "r", x: hd[0] - 2.4, y: hd[1] - 2.4, w: 4.8, h: 4.8, c: fc }, { t: "r", x: hd[0] + 0.6, y: hd[1] - 2.4, w: 0.8, h: 4.8, c: dk(fc, 0.25), no: true });
    return ops;
  };
  const shB = [p.sh[0] - 1.6, p.sh[1] + 2], shF = [p.sh[0] + 1.6, p.sh[1] + 2];

  // the dupatta streams out behind, drawn first
  if (L.dupatta && !DOWN_DRAW.has(f.st)) {
    // a ribbon of cloth that falls from her head and ripples behind her
    const s0 = [p.head[0] - B.hw, p.head[1] - 1], topE = [], botE = [];
    for (let i = 0; i <= 6; i++) {
      const t2 = i / 6, xx = s0[0] - t2 * 14, yy = s0[1] + t2 * 18 + Math.sin(frameNo / 6 + f.id * 5 - i * 0.9) * (0.4 + t2 * 3.2), w2 = 4.4 - t2 * 2.6;
      topE.push([xx, yy - w2 / 2]); botE.unshift([xx, yy + w2 / 2]);
    }
    layer([{ t: "p", pts: topE.concat(botE), c: L.dupatta }, { t: "l", a: topE[2], b: topE[5], w: 0.5, c: lt(L.dupatta, 0.25), no: true }]);
  }
  // legs (Nani wears a sari instead)
  if (L.skirt) {
    const lo = Math.min(p.ff[0], p.fb[0]) - 3.5, hi = Math.max(p.ff[0], p.fb[0]) + 3.5, top = p.hip[1] + 1;
    layer([{ t: "p", pts: [[p.hip[0] - B.ww - 0.5, top], [p.hip[0] + B.ww + 0.5, top], [hi, -0.6], [lo, -0.6]], c: L.skirt },
      { t: "p", pts: [[lo, -2.6], [hi, -2.6], [hi, -0.6], [lo, -0.6]], c: L.border, no: true },
      { t: "l", a: [p.hip[0] + 1, top + 2], b: [(lo + hi) / 2 + 1, -3], w: 0.6, c: dk(L.skirt, 0.25), no: true },
      { t: "l", a: [p.hip[0] - 2, top + 2], b: [lo + 2, -3], w: 0.6, c: dk(L.skirt, 0.25), no: true },
      { t: "r", x: p.ff[0] + 1, y: -1.4, w: 3.5, h: 1.6, c: L.shoe }]);
  } else {
    layer(leg(p.hip, p.kb, p.fb, back, false));
    // the loose cloth of a dhoti or mundu hangs between the legs
    if (L.dhoti) layer([{ t: "p", pts: [[p.hip[0] - B.ww + 1, p.hip[1]], [p.hip[0] + B.ww - 1, p.hip[1]], [Math.min(p.kf[0], p.hip[0] + 6) + 1.5, Math.max(p.kf[1], p.hip[1] + 6) + 3], [p.kb[0] - 1.5, p.kb[1] + 3]], c: L.pants },
      { t: "l", a: [p.hip[0] + 1, p.hip[1] + 2], b: [(p.kf[0] + p.kb[0]) / 2, (p.kf[1] + p.kb[1]) / 2 + 2], w: 0.6, c: dk(L.pants, 0.18), no: true }]);
  }
  layer(arm(shB, p.eb, p.hb, back));

  // torso, drawn in its own frame from hip to shoulder
  const ang = Math.atan2(p.sh[0] - p.hip[0], -(p.sh[1] - p.hip[1])), tl = Math.hypot(p.sh[0] - p.hip[0], p.sh[1] - p.hip[1]);
  g.save(); g.translate(p.hip[0], p.hip[1]); g.rotate(ang);
  const top = -tl - 2, cw = B.cw, ww = B.ww, bl = B.belly, hb = L.nehru ? 4 : 1;
  const outer = L.bare ? L.skin : (L.jacket || L.shirt);
  const T = [{ t: "p", pts: [[-ww, hb], [ww, hb], [ww + bl, top * 0.45], [cw, top], [-cw * 0.85, top], [-ww - bl * 0.2, top * 0.45]], c: outer }];
  T.push({ t: "p", pts: [[-ww, 1], [-ww + 2.4, 1], [-cw * 0.85 + 2.4, top], [-cw * 0.85, top]], c: dk(outer, 0.16), no: true });
  T.push({ t: "p", pts: [[ww - 1.1, 0], [ww, 0], [ww + bl, top * 0.45], [cw, top + 1], [cw - 1.1, top + 1], [ww + bl - 1.1, top * 0.45]], c: lt(outer, 0.12), no: true });
  if (L.bare) {
    const sk = dk(L.skin, 0.18);
    T.push({ t: "r", x: 0, y: top + 3.5, w: cw - 1.5, h: 0.8, c: sk, no: true }, { t: "r", x: 1.6, y: top + 6, w: 0.7, h: tl - 9, c: sk, no: true });
    for (let r = 0; r < 3; r++) T.push({ t: "r", x: 0.4, y: top + 7.5 + r * 2.6, w: 3.2, h: 0.6, c: sk, no: true });
  }
  if (L.banian) T.push({ t: "p", pts: [[-cw * 0.85, top], [-1.5, top], [-cw * 0.55, top + 4.5]], c: L.skin, no: true }, { t: "p", pts: [[cw, top], [2.6, top], [cw - 1, top + 4.5]], c: L.skin, no: true }, { t: "r", x: -1.5, y: top, w: 4, h: 2.2, c: L.skin, no: true });
  if (L.jacket && L.shirt && !L.vest && !L.nehru && !L.kurta) {
    T.push({ t: "p", pts: [[0.5, 0], [3.5, 0], [cw - 1.8, top + 1], [0, top + 1]], c: L.shirt, no: true });
    if (L.collar) T.push({ t: "p", pts: [[-1.2, top - 0.5], [2, top - 0.5], [0.4, top + 4]], c: lt(L.jacket, 0.1), no: true }, { t: "p", pts: [[cw - 2.6, top - 0.5], [cw + 0.8, top - 1.2], [cw - 1.2, top + 3.6]], c: lt(L.jacket, 0.1), no: true });
  }
  if (L.vest) { const inner = L.shirt || L.skin; T.push({ t: "p", pts: [[-1, 0], [4, 0], [cw - 1, top + 1], [-2, top + 1]], c: inner, no: true }); if (!L.shirt) T.push({ t: "r", x: 0.5, y: top + 6, w: 3, h: 0.7, c: dk(L.skin, 0.2), no: true }); }
  if (L.kurta && !L.nehru) T.push({ t: "l", a: [cw - 2, top + 0.5], b: [cw - 2.4, top + 6], w: 0.6, c: dk(outer, 0.25), no: true });
  if (L.nehru) {
    T.push({ t: "r", x: -cw * 0.85 + 1, y: top - 1.2, w: cw * 1.85 - 1, h: 2.2, c: lt(L.jacket, 0.18), no: true });
    for (let b = 0; b < 4; b++) T.push({ t: "r", x: cw * 0.42, y: top + 3 + b * 3.3, w: 1.2, h: 1.2, c: "#d9a441", no: true });
  }
  if (L.pocket) T.push({ t: "p", pts: [[-4, top + 4.6], [-1, top + 4.6], [-1.6, top + 3], [-3, top + 3.4]], c: L.pocket, no: true });
  if (L.watchChain) T.push({ t: "l", a: [cw * 0.42, top + 10], b: [-2.5, top + 12.5], w: 0.6, c: "#d9a441", no: true });
  if (L.chain) T.push({ t: "l", a: [-1.5, top + 0.5], b: [2, top + 4.5], w: 0.8, c: "#c9c4bc", no: true }, { t: "l", a: [2, top + 4.5], b: [cw - 1, top + 0.5], w: 0.8, c: "#c9c4bc", no: true });
  if (L.dupatta) T.push({ t: "l", a: [-cw * 0.8, top + 1], b: [ww, -2], w: 2.2, c: L.dupatta, no: true });
  if (L.pallu) T.push({ t: "l", a: [-cw * 0.8, top + 1], b: [ww, -2], w: 2.6, c: L.skirt, no: true }, { t: "l", a: [-cw * 0.8 + 0.6, top + 1.6], b: [ww + 0.4, -1.6], w: 0.6, c: L.border, no: true });
  if (L.sash) {
    T.push({ t: "r", x: -ww - 0.5, y: -3, w: ww * 2 + bl * 0.3 + 1, h: 3.4, c: L.belt }, { t: "r", x: -ww - 0.5, y: -3, w: ww * 2 + 1, h: 0.8, c: lt(L.belt, 0.2), no: true });
    T.push({ t: "p", pts: [[-ww + 1, 0], [-ww - 1, 0], [-ww - 3 + wave, 6], [-ww - 0.5 + wave, 6.5]], c: L.belt });
  } else if (!L.nehru) {
    T.push({ t: "r", x: -ww, y: -2, w: ww * 2, h: 2.5, c: L.belt || "#1d1b18", no: true });
    if (!L.belt) T.push({ t: "r", x: 2, y: -2, w: 2, h: 2.5, c: "#c9b37a", no: true });
  }
  if (L.knives) for (let n = 0; n < 3; n++) T.push({ t: "r", x: -ww + 1 + n * 2.2, y: -4.6, w: 0.8, h: 3, c: "#d8dde2", no: true });
  layer(T);
  g.restore();

  // head (bigger in big-head mode, scaled around the neck)
  const hx = p.head[0], hy = p.head[1], hw = B.hw, skin = L.skin, Hc = L.hair, hs = L.hairStyle;
  g.save(); if (bigHead) { g.translate(hx, hy + 6); g.scale(1.7, 1.7); g.translate(-hx, -(hy + 6)); }
  const headPts = [[hx - hw, hy - 3.5], [hx - hw + 1.6, hy - 6], [hx + hw - 1.4, hy - 6], [hx + hw, hy - 3.8], [hx + hw + 0.4, hy + 1.5], [hx + hw - 1.6, hy + 5], [hx - hw + 1.5, hy + 5], [hx - hw, hy + 2]];
  const H = [{ t: "r", x: hx - 2, y: hy + 4, w: 4.5, h: 3, c: skin }, { t: "p", pts: headPts, c: skin },
    { t: "p", pts: [[hx - hw, hy - 3.5], [hx - hw + 2.2, hy - 3.5], [hx - hw + 2.6, hy + 4.5], [hx - hw + 1.5, hy + 5], [hx - hw, hy + 2]], c: dk(skin, 0.12), no: true }];
  // Rai: hair swept back in spikes, like he has been running all night
  if (hs === "spiky") H.push({ t: "p", pts: [[hx - hw - 0.8, hy + 1], [hx - hw - 4.5, hy - 2.4], [hx - hw - 1, hy - 4.6], [hx - hw - 4, hy - 8], [hx - 1.4, hy - 7], [hx - 1.6, hy - 10.4], [hx + 1.8, hy - 7.6], [hx + hw + 1.6, hy - 8.6], [hx + hw + 0.2, hy - 4.6], [hx + hw - 1.2, hy - 3.6], [hx - 2.4, hy - 3.4], [hx - 2.8, hy + 1.6]], c: Hc }, { t: "l", a: [hx - 3, hy - 7.4], b: [hx + 2.6, hy - 7.2], w: 1, c: lt(Hc, 0.5), no: true });
  if (hs === "braid") {
    H.push({ t: "p", pts: [[hx - hw - 0.6, hy + 2], [hx - hw - 0.6, hy - 4.2], [hx - hw + 1.6, hy - 6.8], [hx + hw - 1, hy - 6.8], [hx + hw + 0.2, hy - 4], [hx - 1, hy - 4.2], [hx - 2.4, hy + 2]], c: Hc });
    for (let n = 0; n < 4; n++) { const sway = Math.sin(frameNo / 9 + n * 0.7) * (0.6 + n * 0.4); H.push({ t: "e", x: hx - hw - 1.2 - n * 0.7 + sway, y: hy + 3.2 + n * 3, rx: 1.7 - n * 0.1, ry: 1.9, c: Hc }); }
    H.push({ t: "l", a: [hx - 1, hy - 6], b: [hx + 2.5, hy - 5.6], w: 0.7, c: lt(Hc, 0.3), no: true });
  }
  if (hs === "cap") H.push({ t: "p", pts: [[hx - hw - 0.4, hy - 3], [hx - hw + 1.2, hy - 7.4], [hx + hw - 1, hy - 7.4], [hx + hw + 0.2, hy - 3.6]], c: L.cap }, { t: "r", x: hx + 2, y: hy - 4.4, w: hw + 3.4, h: 1.6, c: dk(L.cap, 0.15) }, { t: "r", x: hx - hw - 0.4, y: hy - 3, w: 2.2, h: 3.4, c: Hc });
  if (hs === "beanie") H.push({ t: "p", pts: [[hx - hw - 0.4, hy - 3.2], [hx - hw + 1, hy - 8.5], [hx + hw - 1, hy - 8.5], [hx + hw + 0.2, hy - 3.2]], c: L.cap }, { t: "r", x: hx - hw - 0.4, y: hy - 4.4, w: hw * 2 + 0.6, h: 1.6, c: dk(L.cap, 0.25), no: true }, { t: "r", x: hx - hw - 0.4, y: hy - 3, w: 2.2, h: 4, c: Hc });
  if (hs === "mohawk") H.push({ t: "p", pts: [[hx - 4, hy - 5], [hx - 3.4, hy - 12], [hx - 0.6, hy - 9.6], [hx + 1.6, hy - 13], [hx + 3.6, hy - 6]], c: Hc }, { t: "r", x: hx - hw, y: hy - 4.6, w: 2, h: 3, c: dk(skin, 0.3), no: true });
  if (hs === "bandana") H.push({ t: "p", pts: [[hx - hw - 0.4, hy - 2.8], [hx - hw + 1.2, hy - 7], [hx + hw - 1, hy - 7], [hx + hw + 0.2, hy - 3.4]], c: L.cap }, { t: "p", pts: [[hx - hw, hy - 4.4], [hx - hw - 5, hy - 1 + wave], [hx - hw - 4.4, hy - 5.4 + wave]], c: L.cap });
  if (hs === "kudumi") H.push({ t: "p", pts: [[hx - hw - 0.4, hy - 1], [hx - hw + 1.2, hy - 6.4], [hx + hw - 1.2, hy - 6.4], [hx + hw, hy - 4.2], [hx - 2, hy - 4.6], [hx - 2.6, hy - 0.6]], c: Hc }, { t: "e", x: hx + 1.2, y: hy - 7.6, rx: 3.1, ry: 2.4, c: Hc }, { t: "l", a: [hx + 0.2, hy - 8.6], b: [hx - 1.6, hy - 10.4 + wave * 0.6], w: 1.6, c: Hc });
  if (hs === "slick") H.push({ t: "p", pts: [[hx - hw - 0.6, hy + 1], [hx - hw + 0.4, hy - 6.4], [hx + hw - 1, hy - 7], [hx + hw + 0.6, hy - 5], [hx - 1.8, hy - 4.4], [hx - 2.6, hy + 1.4]], c: Hc }, { t: "l", a: [hx - 2, hy - 5.8], b: [hx + 3, hy - 6], w: 0.7, c: L.grey ? "#e9e4dc" : lt(Hc, 0.3), no: true });
  if (hs === "bun") H.push({ t: "p", pts: [[hx - hw - 0.4, hy + 1], [hx - hw + 1, hy - 6.4], [hx + hw - 1.2, hy - 6.6], [hx + hw, hy - 4.4], [hx - 1.6, hy - 4.6], [hx - 2.4, hy + 1]], c: Hc }, { t: "e", x: hx - hw - 1.6, y: hy - 4.6, rx: 3, ry: 2.8, c: Hc });
  if (hs === "bald") H.push({ t: "r", x: hx + 0.4, y: hy - 5.6, w: 2.4, h: 1, c: lt(skin, 0.28), no: true });
  layer(H);
  // face details, no outline
  const fd = (x0, y0, w, h, c) => R(x0, y0, w, h, C(c));
  const ouch = ["hurt", "fly", "lying", "thrown", "dead"].includes(f.st);
  fd(hx - 1.6, hy - 0.8, 2, 2.6, dk(skin, 0.22));                                      // ear
  if (ouch && (L.shades || L.mask)) fd(hx + 1.2, hy - 4.4, 3.2, 0.9, dk(skin, 0.4));
  if (L.shades) { fd(hx + 0.6, hy - 2.8, hw + 0.2, 2.4, "#111"); fd(hx + 2, hy - 2.4, 1, 0.8, "#6f6a78"); }
  else if (L.specs) { fd(hx + 1.2, hy - 3, 3.8, 3.2, "#1d1b18"); fd(hx + 1.7, hy - 2.5, 2.8, 2.2, "#e9eef2"); fd(hx + 3, hy - 1.9, 1, 1.4, "#111"); }
  else if (ouch) fd(hx + 1.6, hy - 1.4, 2.8, 0.7, dk(skin, 0.5));
  else { fd(hx + 1.6, hy - 2.4, 2.6, 1.9, "#fbf8f2"); fd(hx + 3.1, hy - 2.4, 1.1, 1.9, "#111"); if (L.lashes) fd(hx + 1.6, hy - 2.9, 2.8, 0.6, "#111"); }
  if (!L.shades && !L.specs) {
    const mood = L.mood || "hero", bc = dk(Hc === "#d6d0c8" ? "#8a8278" : Hc, 0.1);
    if (mood === "mean") { fd(hx + 1.2, hy - 4.4, 1.6, 0.9, bc); fd(hx + 2.6, hy - 3.8, 1.8, 0.9, bc); }
    else if (mood === "kind") fd(hx + 1.4, hy - 4.6, 3, 0.7, bc);
    else fd(hx + 1.3, hy - 4.1, 3.2, 0.85, bc);
  }
  fd(hx + hw - 0.2, hy - 0.6, 1, 2.2, dk(skin, 0.2));                                   // nose
  if (L.mask) { fd(hx - 0.6, hy + 0.6, hw + 1.4, 4.4, L.dupatta || "#1b1b1b"); fd(hx - 0.6, hy + 2.4, hw + 1.4, 0.6, dk(L.dupatta || "#1b1b1b", 0.25)); }
  else {
    fd(hx + 2, hy + 2.6, ouch ? 1.8 : 2.6, ouch ? 1.6 : 0.8, ouch ? "#5a1f1f" : dk(skin, 0.38));
    if (L.stubble) fd(hx - 0.4, hy + 3.2, hw + 0.6, 1.6, dk(skin, 0.14));
    if (L.beard) { fd(hx - 1, hy + 2, hw + 1.2, 3.6, Hc); fd(hx + 1.6, hy + 2.6, 2.6, 0.8, dk(skin, 0.38)); }
    if (L.mustache || L.handlebar) fd(hx + 1, hy + 1.5, hw - 0.2, 1.4, Hc);
    if (L.handlebar) { fd(hx - 0.4, hy - 0.4, 1.4, 2.8, Hc); fd(hx + hw + 0.4, hy - 0.6, 1.4, 3, Hc); fd(hx + hw + 1.6, hy - 1.4, 1, 1, Hc); }
  }
  if (L.tilak) { fd(hx + 2.2, hy - 6.2, 0.9, 2.2, "#f2e6c8"); fd(hx + 2.3, hy - 4.6, 0.7, 0.7, "#b42318"); }
  if (L.scar) fd(hx + 1, hy - 4.6, 1, 4, "#e9b9a0");
  if (L.gajra) for (let n = 0; n < 5; n++) fd(hx - hw - 4 + n * 1.2, hy - 7.2 + Math.abs(n - 2) * 0.6, 1, 1, "#fbf8f2");
  if (L.band) { fd(hx - hw, hy - 3.9, hw * 2, 1.1, L.band); fd(hx - hw - 4, hy - 4 + wave * 1.4, 4, 1.2, L.band); fd(hx - hw - 6.5, hy - 2.6 + wave * 1.8, 3, 1.2, L.band); }
  if (costume === "avatar" && f.team === "p") { fd(hx - 6, hy - 13, 2, 9, "#1f7a6a"); fd(hx - 6.5, hy - 14, 3, 3, "#2b54a8"); fd(hx - 6, hy - 13.5, 2, 2, "#f2c230"); }
  if (f.pigeon) { const pc = P.dark ? "#8c8794" : "#6f6a78"; R(hx - 3, hy - 12, 7, 4, pc); R(hx + 3, hy - 14, 3, 3, pc); R(hx + 6, hy - 13, 1, 1, P.amber); }
  g.restore();

  if (!L.skirt) layer(leg(p.hip, p.kf, p.ff, same, true));
  // a kurta hangs over the thighs; Cheel carries a kite reel at her hip
  if (L.kurta) {
    g.save(); g.translate(p.hip[0], p.hip[1]); g.rotate(ang);
    const hc = L.nehru ? L.shirt : (L.jacket || L.shirt);
    layer([{ t: "p", pts: L.nehru ? [[-ww - 0.2, 2], [ww + 0.2, 2], [ww + 0.8, 8], [-ww - 0.8, 8]] : [[-ww - 0.4, -1], [ww + 0.4, -1], [ww + 2, 7], [-ww - 2, 7]], c: hc }, { t: "l", a: [ww - 1, 0], b: [ww + 0.6, 6.5], w: 0.6, c: dk(hc, 0.22), no: true }]);
    g.restore();
  }
  if (L.reel) layer([{ t: "r", x: p.hip[0] - B.ww - 3.2, y: p.hip[1] + 0.5, w: 3.4, h: 4, c: "#8a5d3b" }, { t: "r", x: p.hip[0] - B.ww - 2.6, y: p.hip[1] + 1.4, w: 2.2, h: 2.2, c: "#fbf8f2", no: true }]);
  if (f.weapon && !["lying", "fly", "dead", "thrown"].includes(f.st)) {
    const a = p.pipeAng !== undefined ? p.pipeAng : -1.2;
    if (f.weapon.kind === "pipe") layer([{ t: "l", a: p.hf, b: [p.hf[0] + Math.cos(a) * 18, p.hf[1] + Math.sin(a) * 18], w: 2.4, c: "#b08a4a" }, { t: "l", a: [p.hf[0] + Math.cos(a) * 6, p.hf[1] + Math.sin(a) * 6], b: [p.hf[0] + Math.cos(a) * 7.5, p.hf[1] + Math.sin(a) * 7.5], w: 2.6, c: "#6b4a22", no: true }]);
    else layer([{ t: "p", pts: [[p.hf[0], p.hf[1] - 1], [p.hf[0] + 9, p.hf[1] - 2.5], [p.hf[0] + 9, p.hf[1] - 0.5], [p.hf[0], p.hf[1] + 1]], c: "#d8dde2" }]);
  }
  layer(arm(shF, p.ef, p.hf, same));
  g.restore();
  fighterExtras(f, x, y, sc, P);
}
// aura, special-move warning and motion trail, shared by sprite and drawn fighters
function fighterExtras(f, x, y, sc, P) {
  if (f.ally && !DOWN_STATES.includes(f.st)) { const ty = y - f.z - 60 * sc; g.fillStyle = "#3fae5a"; g.beginPath(); g.moveTo(x - 3, ty); g.lineTo(x + 3, ty); g.lineTo(x, ty + 4); g.fill(); }   // an ally: a green marker
  drawShield(f, x, y, sc);
  // golden motes rising around the divine form
  if (f.avatarT > 0 && f.st !== "dead") for (let m = 0; m < 4; m++) { const ph = (frameNo * 0.6 + m * 23) % 46; g.globalAlpha = 1 - ph / 46; R(x + Math.sin(m * 2.1 + frameNo / 20) * 12 * sc, y - f.z - ph * sc, 1.5, 1.5, m % 2 ? "#ffd23a" : "#fff4c2"); g.globalAlpha = 1; }
  // special move warning: a red "!" over bosses and specialists
  if (f.warn > 0 && f.st === "windup") { const wy = y - f.z - 58 * sc; text("!", x, wy, 14, P.T.red, "center", "IBM Plex Sans"); }
  // rolling / cyclone motion trail
  if ((f.st === "attack" && ["roll", "eRoll", "kroll"].includes(f.atkName)) || (f.st === "air" && f.airAtk === "cyclone")) {
    g.globalAlpha = 0.25; g.strokeStyle = f.team === "p" ? fighterColour(f, P) : P.T.red; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y - f.z - 16 * sc, 16 * sc, 0, 7); g.stroke(); g.globalAlpha = 1;
  }
}

function drawItems() {
  const P = PAL;
  if (cat) drawCat(P);
  // Nani waits at the back of the final arena
  if (arena && arena.a.boss === "rollback") {
    if (!naniRef) { naniRef = fighter("nani", 0, Y0 + 2, "e"); naniRef.face = -1; }
    naniRef.x = cam + LW - 30; naniRef.pose = bossRef && bossRef.st === "dead" ? 1 : 0; drawFighter(naniRef);
    if (bossRef && bossRef.st === "dead") text("Nani!", cam + LW - 30 - cam, Y0 - 62, 7, P.T.ink, "center", "IBM Plex Sans");
  }
  if (pigeons) drawPigeons(P);
  for (const it of items) drawItem(it, P);
  for (const sh of shots) drawShot(sh, P);
}
function drawBarrel(b) {
  const P = PAL;
  {
    const x = Math.round(b.x - cam + (b.shake ? (b.shake % 2 ? 1 : -1) : 0)), y = b.y;
    if (b.kind === "hydrant" && SPRITES.pump) { g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, y, 8, 2, 0, 0, 7); g.fill(); spr("pump", x + 2, y + 1); return; }
    if (b.kind === "vending" && SPRITES.chai_machine) {
      spr("chai_machine", x, y + 1);
      if (b.hp <= 0) { g.globalAlpha = 0.45; R(x - 8, y - 42, 16, 14, "#1d1b18"); g.globalAlpha = 1; R(x - 5, y - 36, 10, 1, "#888"); }
      return;
    }
    if (b.kind === "barrel" && b.hp <= 0) { spr("barrel_broken", x, y + 1); return; }
    if (b.kind === "barrel" && SPRITES.barrel) { g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, y, 10, 3, 0, 0, 7); g.fill(); spr("barrel", x, y + 1); return; }
    if (b.kind === "hydrant") { // a street hand pump
      const c = b.hp > 0 ? "#2f6b3a" : shade("#2f6b3a", -0.3), hy = b.hp > 0 ? Math.sin(frameNo / 25) * 1.5 : 4;
      R(x - 3, y - 18, 6, 18, P.ol); R(x - 2, y - 17, 4, 17, c); R(x + 2, y - 12, 6, 2, c); R(x - 4, y - 2, 8, 2, "#5d5852");
      g.strokeStyle = P.ol; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 1, y - 17); g.lineTo(x - 11, y - 20 + hy); g.stroke(); return; }
    if (b.kind === "vending") {
      const lit = b.hp > 0 && frameNo % 90 > 3;
      R(x - 10, y - 36, 20, 36, P.ol); R(x - 9, y - 35, 18, 34, P.T.teal); R(x - 7, y - 32, 10, 20, lit ? "#f7f4ee" : "#555");
      for (let r = 0; r < 4; r++) R(x - 6, y - 31 + r * 5, 8, 2, [P.T.red, P.T.amber, P.T.accent, P.T.good][r]);
      R(x + 4, y - 30, 3, 8, "#1d1b18"); R(x - 7, y - 9, 14, 4, "#1d1b18");
      if (b.hp <= 0) { R(x - 7, y - 32, 10, 20, "#2a2a2a"); R(x - 4, y - 28, 6, 1, "#888"); }
      return;
    }
    if (b.hp <= 0) return;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, y, 10, 3, 0, 0, 7); g.fill();
    R(x - 9, y - 21, 18, 21, P.ol); R(x - 8, y - 20, 16, 20, P.wood);
    R(x - 8, y - 15, 16, 2, shade(P.wood, -0.35)); R(x - 8, y - 6, 16, 2, shade(P.wood, -0.35)); R(x - 5, y - 20, 2, 20, shade(P.wood, 0.15));
  }
}
function drawItem(it, P) {
  {
    const x = Math.round(it.x - cam), y = Math.round(it.y - it.z);
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, it.y, 7, 2, 0, 0, 7); g.fill();
    if (it.kind === "pipe" && spr("lathi", x, y - 1)) { /* bamboo lathi */ }
    else if (it.kind === "knife" && spr("knife", x, y - 1)) { /* throwing knife */ }
    else if (it.kind === "food" && spr("samosa", x, y)) { /* samosa */ }
    else if (it.kind === "letter" && spr("letter", x, y)) { /* Nani's letter */ }
    else if (it.kind === "cash") {
      // small change is a few coins; more is a fold of notes with a rubber band; both catch the light
      g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, y + 1, 7, 2, 0, 0, 7); g.fill();
      if ((it.amount || 0) < 50) for (const [cx, cy] of [[-3, 0], [2, -1], [0, -3]]) { R(x + cx - 3, y + cy - 3, 6, 4, "#5a4210"); R(x + cx - 2, y + cy - 3, 4, 3, "#e8b84a"); R(x + cx - 2, y + cy - 3, 4, 1, "#fff0a8"); }
      else {
        R(x - 7, y - 9, 13, 6, "#2a2a22"); R(x - 6, y - 8, 11, 4, "#d9b45a"); R(x - 6, y - 8, 11, 1, "#f0d890");   // the note underneath
        R(x - 6, y - 6, 14, 6, "#24321e"); R(x - 5, y - 5, 12, 4, "#8fc07a"); R(x - 5, y - 5, 12, 1, "#c4e4b0"); R(x + 2, y - 4, 3, 2, "#4f7a40");   // the top note, its watermark
        R(x - 1, y - 6, 2, 6, "#b0382c");   // the rubber band
      }
      if ((frameNo + Math.round(it.x)) % 70 < 8) { R(x + 4, y - 11, 1, 3, "#fffbe0"); R(x + 3, y - 10, 3, 1, "#fffbe0"); }
    }
    else if (it.kind === "pipe") { g.strokeStyle = P.ol; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 9, y - 2); g.lineTo(x + 9, y - 4); g.stroke(); g.strokeStyle = "#b08a4a"; g.lineWidth = 2.4; g.stroke(); }
    else if (it.kind === "knife") { R(x - 6, y - 4, 4, 3, "#3b2a1d"); R(x - 2, y - 4, 9, 2, "#d8dde2"); }
    else if (it.kind === "food") { // a samosa
      g.fillStyle = P.ol; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x, y - 11); g.lineTo(x + 7, y); g.closePath(); g.fill();
      g.fillStyle = "#d9a441"; g.beginPath(); g.moveTo(x - 5.5, y - 1); g.lineTo(x, y - 9); g.lineTo(x + 5.5, y - 1); g.closePath(); g.fill(); R(x - 1, y - 6, 2, 1, "#a8742a"); R(x - 3, y - 3, 2, 1, "#a8742a"); }
    else if (it.kind === "letter") { R(x - 8, y - 9, 16, 10, P.ol); R(x - 7, y - 8, 14, 8, "#f7f1e3"); g.strokeStyle = "#b9ad98"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 7, y - 8); g.lineTo(x, y - 3); g.lineTo(x + 7, y - 8); g.stroke(); R(x - 1.5, y - 5, 3, 3, P.T.accent); }
    else if (it.kind === "oneup" && spr("oneup", x, y + Math.sin(frameNo / 10))) { /* extra-life coin */ }
    else if (it.kind === "cracker") { R(x - 2, y - 8, 4, 8, "#c0392b"); R(x - 2, y - 6, 4, 1, "#f2c230"); R(x, y - 10, 1, 2, "#e8dcc4"); }   // a Diwali firecracker
    else if (it.kind === "oneup") { R(x - 9, y - 10, 18, 9, P.ol); R(x - 8, y - 9, 16, 7, P.T.good); text("1UP", x, y - 3.5, 6, "#fff"); }
    else if (SPRITES.kulhad) { g.drawImage(SPRITES.kulhad, 0, 0, 22, 39, x - 5.5, y - 19.5, 11, 19.5); }
    else { // chai in a clay kulhad
      R(x - 5, y - 9, 10, 9, P.ol); R(x - 4, y - 8, 8, 8, "#a5532e"); R(x - 4, y - 8, 8, 2, "#c98a5a");
      g.globalAlpha = 0.6; R(x - 2 + Math.sin(frameNo / 8), y - 14, 1, 4, "#ffffff"); R(x + 1 + Math.sin(frameNo / 9), y - 15, 1, 4, "#ffffff"); g.globalAlpha = 1; }
    if (frameNo % 40 < 20) R(x - 1, y - 16, 2, 2, P.spark);
  }
}
function drawShot(s, P) {
  {
    const x = Math.round(s.x - cam), y = Math.round(s.y - s.z);
    if (s.kind === "chakra") { g.save(); g.translate(x, y); g.rotate(frameNo / 2); g.strokeStyle = "#f2c230"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.stroke(); g.strokeStyle = "#d9741c"; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.moveTo(0, 0); g.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } g.stroke(); g.restore(); return; }
    if (s.kind === "knife") {
      g.fillStyle = P.shadow; g.fillRect(x - 4, s.y - 1, 8, 2);
      g.save(); g.translate(x, y); g.scale(s.face, 1);
      if (SPRITES.knife) g.drawImage(SPRITES.knife, -7, -1.5, 14, 3); else { R(-6, -1.5, 4, 3, "#3b2a1d"); R(-2, -1, 9, 2, "#e4e8ec"); }
      g.restore();
    }
    else if (s.kind === "record") { g.save(); g.translate(x, y); g.scale(1, 0.45); g.rotate(frameNo / 2); g.fillStyle = "#15121a"; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.fillStyle = "#c0392b"; g.beginPath(); g.arc(0, 0, 2.2, 0, 7); g.fill(); g.restore(); }
    else if (s.kind === "net") { g.strokeStyle = "#cfc4ae"; g.lineWidth = 0.8; const r = 6 + Math.min(6, (150 - s.life) / 8); for (let i = -r; i <= r; i += 3) { g.beginPath(); g.moveTo(x + i, y - r); g.lineTo(x + i, y + r); g.moveTo(x - r, y + i); g.lineTo(x + r, y + i); g.stroke(); } }
    else if (s.kind === "cracker") { g.save(); g.translate(x, y); g.rotate(frameNo / 3); R(-2, -4, 4, 8, "#c0392b"); g.restore(); if (frameNo % 4 < 2) R(x - 1, y - 6, 2, 2, "#ffd34a"); }
    else if (s.kind === "sack") { R(x - 6, y - 5, 12, 10, "#c9a26a"); R(x - 6, y - 5, 12, 2, "#a8834a"); R(x - 1, y - 7, 2, 3, "#8a6a3a"); }
    else { g.strokeStyle = P.amber; g.lineWidth = 2; for (let r = 0; r < 3; r++) { g.globalAlpha = 0.8 - r * 0.25; g.beginPath(); g.ellipse(x - s.face * r * 6, s.y, 6 + r * 3, 3 + r, 0, Math.PI, 0); g.stroke(); } g.globalAlpha = 1; }
  }
}

function drawCat(P) {
  // the cat bolts left when a fight gets too close: two running frames, flipped to face left
  if (cat.st === "run" && sprAt(frameNo % 8 < 4 ? "cat_run1" : "cat_run2", Math.round(cat.x - cam), cat.y + 1, true, 0.6)) return;
  if (cat.st !== "run" && SPRITES.cat) {
    const x = Math.round(cat.x - cam);
    sprAt("cat", x, cat.y + 1, false, 0.6);
    if (cat.st === "purr" && frameNo % 60 < 30) text("z", x + 6, cat.y - 13, 6, P.T.muted);
    return;
  }
  const x = Math.round(cat.x - cam), y = cat.y, sw = Math.sin(frameNo / 12) * 3;
  const c = P.dark ? "#0b0a0c" : "#1d1b18";
  if (cat.st === "run") { const b = Math.abs(Math.sin(frameNo / 3)) * 2; R(x - 7, y - 7 - b, 14, 5, c); R(x - 9, y - 10 - b, 5, 5, c); R(x + 6, y - 9 - b, 5, 2, c); return; }
  R(x - 5, y - 9, 10, 9, c); R(x - 4, y - 15, 8, 7, c); R(x - 4, y - 17, 2, 2, c); R(x + 2, y - 17, 2, 2, c);
  R(x - 3, y - 12, 2, 2, P.amber); R(x + 1, y - 12, 2, 2, P.amber);
  g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 5, y - 2); g.quadraticCurveTo(x + 12, y - 4, x + 10 + sw, y - 12); g.stroke();
  if (cat.st === "purr" && frameNo % 60 < 30) text("z", x + 8, y - 18, 6, P.T.muted);
}
// now and then a crow or two crosses the night sky, flapping and gliding
function drawCrows(top) {   // top: flight height, above that stage's rooftops
  if (!SPRITES.birds) return;
  for (let k = 0; k < 2; k++) {
    const t = (frameNo + k * 900) % (1500 + k * 700);
    if (t > (LW + 40) / 0.8) continue;   // off screen most of the time
    const x = -20 + t * 0.8, y = top + k * 8 + Math.sin(t / 30) * 3;
    bird(t % 90 < 30 ? 7 : Math.floor(t / 6) % 2 ? 5 : 6, x, y);
  }
}
function drawPigeons(P) {
  const base = Math.round(pigeons.x - cam), c = P.dark ? "#8c8794" : "#6f6a78";
  for (let i = 0; i < 3; i++) {
    let x = base + i * 12, y = 119;
    if (pigeons.st === "fly") { x += pigeons.t * (1 + i * 0.4); y -= pigeons.t * (0.7 + i * 0.2); if (y < -10) continue; }
    const flap = pigeons.st === "fly" && (frameNo + i * 3) % 8 < 4;
    // sitting pigeons peck now and then; flying ones beat their wings
    const fi = pigeons.st === "fly" ? (flap ? 2 : 3) : (frameNo + i * 53) % 170 < 22 ? 1 : 0;
    if (bird(fi, x + 1, y + 2, i === 1 && pigeons.st !== "fly")) continue;
    R(x - 3, y - 4, 7, 4, c); R(x + 3, y - 6, 3, 3, c); R(x + 6, y - 5, 1, 1, P.amber);
    R(x - 2, y - (flap ? 8 : 5), 5, flap ? 3 : 1, shade(c, -0.2));
  }
}

function drawFx() {
  const P = PAL;
  for (const f of fx) {
    const x = f.x - cam;
    if (f.kind === "dot") { f.x += f.vx; f.y += f.vy; f.vy += 0.15; R(x, f.y, 2, 2, f.c); }
    if (f.kind === "dust") { f.x += f.vx; f.y += f.vy; g.globalAlpha = f.t / 24; R(x, f.y - 2, 3, 3, P.curb); g.globalAlpha = 1; }
    if (f.kind === "ember") { f.x += f.vx; f.y += f.vy; g.globalAlpha = Math.min(1, f.t / 30); R(x, f.y, 1.5, 1.5, f.t % 6 < 3 ? P.amber : P.T.red); g.globalAlpha = 1; }
    if (f.kind === "steam") { f.x += f.vx; f.y += f.vy; g.globalAlpha = f.t / 140; g.fillStyle = P.dark ? "#8f8a96" : "#ffffff"; g.beginPath(); g.arc(x, f.y, 3 + (70 - f.t) * 0.08, 0, 7); g.fill(); g.globalAlpha = 1; }
    if (f.kind === "ring" && f.gold) { g.globalAlpha = f.t / 18; g.strokeStyle = "#ffd23a"; g.lineWidth = 2.5; g.beginPath(); g.arc(x, f.y, 8 + (18 - f.t) * 3, 0, 7); g.stroke(); g.globalAlpha = 1; }
    else if (f.kind === "ring") { g.strokeStyle = f.big ? P.T.accent : P.spark; g.lineWidth = 1.5; g.beginPath(); g.arc(x, f.y, (f.big ? 22 : 12) - f.t, 0, 7); g.stroke(); }
    if (f.kind === "streak") { g.strokeStyle = P.spark; g.lineWidth = 1.5; g.globalAlpha = f.t / 8; g.beginPath(); for (let i = 0; i < 7; i++) { const an = (i / 7 + f.a) * 6.283, r0 = 10 + (8 - f.t) * 3, r1 = r0 + 7 + (i % 2) * 5; g.moveTo(x + Math.cos(an) * r0, f.y + Math.sin(an) * r0 * 0.7); g.lineTo(x + Math.cos(an) * r1, f.y + Math.sin(an) * r1 * 0.7); } g.stroke(); g.globalAlpha = 1; }
    if (f.kind === "water") { f.x += f.vx; f.y += f.vy; f.vy += 0.18; R(x, f.y, 2, 2, P.dark ? "#6fb7d8" : "#4a90b8"); }
    if (f.kind === "heart") { f.x += f.vx; f.y += f.vy; g.globalAlpha = Math.min(1, f.t / 20); g.fillStyle = P.T.accent; g.beginPath(); g.arc(x - 1.5, f.y, 1.8, 0, 7); g.arc(x + 1.5, f.y, 1.8, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 3.2, f.y + 0.6); g.lineTo(x, f.y + 4); g.lineTo(x + 3.2, f.y + 0.6); g.fill(); g.globalAlpha = 1; }
    if (f.kind === "star") { g.fillStyle = P.spark; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 2 : 6, a = i * Math.PI / 4; g.lineTo(x + Math.cos(a) * r, f.y + Math.sin(a) * r); } g.fill(); }
  }
  // floating lines, kept on screen: a word said at the very edge slides in rather than being cut off
  g.font = "bold 7px 'IBM Plex Sans', monospace";
  for (const t of texts) { const hw = g.measureText(t.s).width / 2 + 3; g.globalAlpha = Math.min(1, t.t / 20); text(t.s, clamp(t.x - cam, hw, LW - hw), Math.max(12, t.y - (60 - t.t) * 0.2), 7, P.T.ink, "center", "IBM Plex Sans"); }
  g.globalAlpha = 1;
}

function bar(x, y, w, h, frac, c) {
  const P = PAL;
  R(x - 1, y - 1, w + 2, h + 2, P.ol); R(x, y, w, h, P.dark ? "#2a2726" : "#e3dcd0");
  R(x, y, Math.round(w * clamp(frac, 0, 1)), h, c);
  if (h > 3) R(x, y, Math.round(w * clamp(frac, 0, 1)), 1, shade(c, 0.3));
}
// each fighter has their own colour in the HUD: Rai magenta, Kai teal, bosses their outfit colour
function fighterColour(f, P) {
  return { rai: P.T.accent, kai: P.T.teal, pOx: P.T.red, pRook: P.T.amber, pCrane: P.dark ? "#a58fe0" : "#5b45a8", pRollback: P.dark ? "#cfc6b7" : "#5d5852" }[f.kind] || P.T.accent;
}
function drawHud() {
  const P = PAL;
  const panel = (p, x) => {
    g.fillStyle = P.dark ? "rgba(0,0,0,0.6)" : "rgba(255,253,249,0.86)"; g.fillRect(x, 4, 124, 31);
    const c = fighterColour(p, P);
    text(KINDS[p.kind].name.toUpperCase(), x + 4, 12, 7, c, "left");
    // from Act 2 player 1's panel shows the money (it is shared); before that, the score
    if (p.pi === 0 && hasMoney()) text(rupees(money()), x + 120, 12, 7, P.T.good, "right");
    else text(String(p.score).padStart(7, "0"), x + 120, 12, 7, P.T.ink, "right");
    bar(x + 4, 15, 82, 6, p.hp / p.max, c);
    bar(x + 4, 25, 82, 3, p.sp / 100, P.amber);
    if (p.pi === 0) drawHeatLights(x + 98, 25);
    text("SP", x + 90, 29, 5, P.T.muted, "left");
    for (let i = 0; i < (KINDS[p.kind].guest ? 1 : Math.max(3, p.lives)); i++) R(x + 96 + i * (p.lives > 3 ? 5 : 8), 15, p.lives > 3 ? 4 : 6, 6, i < p.lives ? c : (P.dark ? "#3a3632" : "#cfc6b7"));
    if (p.combo >= 2 && p.comboT > 0) { g.globalAlpha = Math.min(1, p.comboT / 20); text(p.combo + " hits", x + 4, 46, 10, c, "left", "Newsreader"); g.globalAlpha = 1; }
  };
  if (players[0]) panel(players[0], 4);
  if (players[1]) panel(players[1], LW - 128);
  else if (!TOUCH && frameNo % 90 < 60) {   // on its own dark label, so a pale building behind can't swallow it
    g.font = "bold 7px 'IBM Plex Mono', monospace"; const w = g.measureText("P2: press 1 to join").width + 10;
    R(LW - 4 - w, 5, w, 13, "rgba(14,13,12,0.62)"); text("P2: press 1 to join", LW - 9, 14, 7, "#f7f4ee", "right");
  }
  const where = street.name.toUpperCase();
  g.font = "bold 6px 'IBM Plex Mono', monospace"; const ww = Math.max(72, g.measureText(where).width + 16);
  R(LW / 2 - ww / 2, 5, ww, 10, P.dark ? "rgba(0,0,0,0.6)" : "rgba(255,253,249,0.86)");
  text(where, LW / 2, 12, 6, P.T.muted);
  // the clock under the street name: stuck at 11:58 all through Act 1, and red at 11:58 every night after
  const ct = clockText(), red = clockRuns() && clockMin() === 23 * 60 + 58;
  g.font = "bold 6px 'IBM Plex Mono', monospace"; const cw = g.measureText(ct).width + 12;
  R(LW / 2 - cw / 2, 16, cw, 9, P.dark ? "rgba(0,0,0,0.6)" : "rgba(255,253,249,0.86)"); text(ct, LW / 2, 23, 6, red ? P.T.red : P.T.muted);
  if (lastHit && !KINDS[lastHit.f.kind].boss) { const e = lastHit.f; text(KINDS[e.kind].name, 8, players[0] && players[0].combo >= 2 ? 56 : 44, 7, P.T.ink, "left"); bar(48, players[0] && players[0].combo >= 2 ? 51 : 39, 50, 4, e.hp / e.max, P.amber); }
  if (bossRef && bossRef.st !== "dead" && arena && arena.a.boss) { text(KINDS[bossRef.kind].name.toUpperCase(), LW / 2, LH - 13, 7, P.T.ink); bar(LW / 2 - 90, LH - 10, 180, 5, bossRef.hp / bossRef.max, P.T.red); }
  const ob = state === "play" && objective();
  if (ob && ob.text && !(bossRef && arena && arena.a.boss)) {
    // it shares the row with the direction box on the right: a long objective gets smaller, then trimmed
    const gd = !street.interior && guide(); g.font = "600 6.5px 'IBM Plex Sans', sans-serif";
    const room = LW - 12 - (gd ? g.measureText("→ " + gd.label).width + 18 : 0);
    let fs = 7, t = ob.text; g.font = "600 7px 'IBM Plex Sans', sans-serif";
    if (g.measureText(t).width + 16 > room) { fs = 6; g.font = "600 6px 'IBM Plex Sans', sans-serif"; }
    while (t.length > 8 && g.measureText(t).width + 16 > room) t = t.slice(0, -2).trimEnd() + "…";
    const w = g.measureText(t).width + 16;
    R(4, LH - 30, w, 12, "rgba(14,13,12,0.72)"); R(4, LH - 30, 2, 12, mission ? P.T.accent : "#f2c230");
    text(t, 11, LH - 21, fs, "#f7f4ee", "left", "IBM Plex Sans");
  }
  if (state === "play" && !(bossRef && arena && arena.a.boss)) drawStrip(P);
  if (savedT > 0) {   // a quiet note in the corner after a save
    g.globalAlpha = Math.min(1, savedT / 20); R(LW - 52, LH - 18, 46, 12, "rgba(14,13,12,0.72)"); R(LW - 52, LH - 7, 46, 1, P.T.accent);
    text("Saved", LW - 29, LH - 9, 6, "#f7f4ee", "center", "IBM Plex Sans"); g.globalAlpha = 1;
  }
  if (goT > 0 && Math.floor(goT / 15) % 2 === 0) {
    text("GO", LW - 30, 92, 16, P.T.accent, "right", "IBM Plex Sans");
    g.fillStyle = P.T.accent; g.beginPath(); g.moveTo(LW - 24, 80); g.lineTo(LW - 12, 87); g.lineTo(LW - 24, 94); g.fill();
  }
  if (banner && banner.t > 0) {
    let fs = banner.big ? 16 : 12; g.font = "600 " + fs + "px 'Newsreader', Georgia, serif";
    const tw0 = g.measureText(banner.text).width; if (tw0 + 28 > LW - 12) fs = Math.max(8, Math.floor(fs * (LW - 40) / tw0));   // a long banner shrinks to fit
    g.font = "600 " + fs + "px 'Newsreader', Georgia, serif";
    const w = g.measureText(banner.text).width + 28, h = banner.big ? 26 : 20;
    g.globalAlpha = Math.min(1, banner.t / 20);
    R(LW / 2 - w / 2, 56, w, h, P.T.ink); R(LW / 2 - w / 2, 56 + h - 2, w, 2, P.T.accent);
    text(banner.text, LW / 2, 56 + h - (banner.big ? 8 : 6), fs, P.T.paper, "center", "Newsreader");
    g.globalAlpha = 1;
  }
}

const spBtn = document.querySelector('.pad button[data-code="KeyI"]'), useBtn = document.querySelector(".pad .use-btn"), rwBtn = document.querySelector(".pad .rw-btn"), phoneBtn = document.querySelector(".pad .phone-btn");
// the floating Interact prompt over whatever a player could use: the key, then the action
function drawPrompts(P) {
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const touch = TOUCH && !document.documentElement.classList.contains("kbd");
  for (const p of players) {
    if (!p || !p.target) continue;
    const key = padLast ? "LB" : touch ? "" : p.pi ? "Enter" : "E", t = p.target;
    g.font = "bold 6px 'IBM Plex Sans', sans-serif";
    const kw = key ? g.measureText(key).width + 6 : 0, w = kw + g.measureText(t.label).width + 10, ax = t.x - cam, x = Math.round(clamp(ax - w / 2, 2, LW - w - 2)), y = Math.round(t.y + Math.sin(frameNo / 10) * 1.5);
    R(x, y, w, 11, "rgba(14,13,12,0.82)"); R(x, y + 10, w, 1, fighterColour(p, P));
    if (key) { R(x + 3, y + 2, kw - 2, 7, "#f7f4ee"); text(key, x + 2 + kw / 2, y + 8, 5, "#15121a", "center", "IBM Plex Sans"); }
    text(t.label, x + kw + 5, y + 8, 6, "#f7f4ee", "left", "IBM Plex Sans");
    const tip = clamp(ax, x + 5, x + w - 5);   // the pointer still points at the thing, even when the label is held on screen
    g.fillStyle = "rgba(14,13,12,0.82)"; g.beginPath(); g.moveTo(tip - 3, y + 11); g.lineTo(tip, y + 14); g.lineTo(tip + 3, y + 11); g.fill();
  }
}
function draw() {
  if (!PAL || (street && PAL.dark !== worldDark())) palette();
  if (spBtn && players[0]) spBtn.classList.toggle("low", players[0].sp < 25);
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  g.imageSmoothingEnabled = false;
  const sh = shakeOk() ? shake : 0, sx = sh > 0.3 ? rand(-sh, sh) : 0, sy = sh > 0.3 ? rand(-sh, sh) * 0.5 : 0;   // (less shake in the settings)
  g.save(); g.translate(Math.round(sx), Math.round(sy));
  const paint = ({ street: drawStreet, subway: drawSubway, roof: drawRoof, factory: drawFactory, dhaba: drawDhaba, clinic: (P) => drawRoom(P, "clinic"), shop: drawShop, thana: (P) => drawRoom(P, "thana"), train: drawTrain, trainroof: drawTrainRoof, ghat: drawGhat, ferry: drawFerry, yard: drawYard, akhada: drawAkhada, garage: drawGarage, office: drawOffice, seafront: drawSeafront, studio: drawStudio, heights: drawPlaza, helipad: drawHelipad, act3room: drawAct3Room, museum: drawMuseum, club: drawClub, docks: drawDocks, icefactory: drawIceFactory, godown9: drawGodown9, opensea: drawOpenSea })[theme()];
  if (!paintedRoom(PAL, paint)) paint(PAL);
  drawJunctions(PAL); drawDoorCues(PAL); drawLinks(PAL); drawStreetProps(PAL); if (street.gaps) drawGaps(PAL); if (arena && arena.belts) drawBelts(PAL); if (state !== "menu") drawMission(PAL);
  drawFlames(PAL); drawBag(PAL);
  drawItems(); drawFloodFloor(PAL);
  const waiting = fightersPending();
  const cast = (waiting ? [] : enemies.concat(players.filter((p) => p && p.lives > 0), civs, missionNpcs(), npcs, carts, rides, enemies.filter((e) => e.bike || e.boat).map((e) => e.bike || e.boat), companions())).concat(barrels, waiting ? [] : vehicleCast(), waiting ? [] : eventCast());
  cast.sort((a, b) => a.y - b.y);
  for (const f of cast) if (f.paint) f.paint(); else if (f.dog) drawMoti(f); else if (f.kid) drawKid(f); else if (f.civ) drawCiv(f, PAL); else if (f.cart) drawCart(f, PAL); else if (f.veh) drawVehicle(f, PAL); else if (f.kind && KINDS[f.kind]) { if (f.fade) g.globalAlpha = 1 - f.fade * 0.85; drawFighter(f); g.globalAlpha = 1; drawWaterline(f); drawCarried(f, Math.round(f.x - cam), f.y); } else drawBarrel(f);
  drawFx();
  drawMinigames(PAL); drawSideLines(PAL); drawAct3(PAL); drawSide2(PAL); drawLiving(PAL); drawGallery(PAL);
  if (waiting && state === "play") text("Loading", LW / 2, LH / 2, 8, "#f7f4ee", "center", "IBM Plex Sans");
  drawForeground(PAL);
  g.restore();
  drawWeather();
  drawDaylight(); drawPowerCut();
  drawSmoke();
  drawGrade(PAL); drawFilter();
  if (state === "play" && !wipe && !paused) drawPrompts(PAL);
  if (phoneBtn) { const hide = !hasPhone(); if (phoneBtn.hidden !== hide) phoneBtn.hidden = hide; }
  if (rwBtn) { const hide = !(state === "play" && !paused && hasWatch() && rewinds > 0); if (rwBtn.hidden !== hide) rwBtn.hidden = hide; }
  if (useBtn) { const hide = !(state === "play" && !paused && players[0]), idle = hide || !(players[0].target || players[0].ride); if (useBtn.hidden !== hide) useBtn.hidden = hide; useBtn.classList.toggle("idle", idle); }
  if (state !== "menu" && state !== "story") drawHud();
  if (state === "play" && countdown > 0 && !paused) {
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    const n = Math.ceil(countdown / 60);
    R(LW / 2 - 46, LH / 2 - 26, 92, 44, "rgba(14,13,12,0.72)");
    text(String(n), LW / 2, LH / 2 + 2, 22, "#f07ab8", "center", "Newsreader");
    text("Get ready", LW / 2, LH / 2 + 13, 7, "#f7f4ee", "center", "IBM Plex Sans");
  }
  drawRewind(PAL);
  if (state === "play") { drawRadio(); drawDance(); drawSuspicion(); drawMinigamesHud(); drawHaul(); drawAct3Hud(); drawPhone(PAL); }
  if (state === "story") drawStory();
  if (wipe) {
    // the wipe between streets: a black edge sweeps across, the street changes behind it, and it sweeps on
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    const h = WIPE / 2, t = wipe.t;
    if (t < h) R(0, 0, Math.ceil(LW * t / h), LH, "#0e0d0c"); else R(Math.floor(LW * (t - h) / h), 0, LW, LH, "#0e0d0c");
  }
}

/* the nostalgic look: a faint warm amber wash that lifts the blacks like an
   old print, CRT scanlines and a soft vignette, as on a cabinet in a chai
   shop. Built once per theme and drawn with a single drawImage, so it costs
   next to nothing on a phone. */
let gradeCanvas = null;
function drawGrade(P) {
  if (!gradeCanvas || gradeCanvas.dark !== P.dark) {
    const c = document.createElement("canvas"); c.width = LW * SCALE; c.height = LH * SCALE; c.dark = P.dark;
    const x = c.getContext("2d");
    x.fillStyle = P.dark ? "rgba(40,30,70,0.10)" : "rgba(160,100,40,0.035)"; x.fillRect(0, 0, c.width, c.height);   // a light warm wash by day, a blue one by night
    for (let y = 0; y < c.height; y += 2) { x.fillStyle = "rgba(0,0,0," + (P.dark ? 0.08 : 0.045) + ")"; x.fillRect(0, y + 1, c.width, 1); }
    const v = x.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.45, c.width / 2, c.height / 2, c.width * 0.62);
    v.addColorStop(0, "rgba(30,16,4,0)"); v.addColorStop(1, P.dark ? "rgba(8,6,20,0.42)" : "rgba(70,40,10,0.16)");
    x.fillStyle = v; x.fillRect(0, 0, c.width, c.height);
    gradeCanvas = c;
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(gradeCanvas, 0, 0); g.restore();
}

// a passer-by: a goonda sheet recoloured to one plain tint, so they read as ordinary people
const CIV_ATLAS = new Map();
function civAtlas(im, key, tint) {
  const k = key + tint; let c = CIV_ATLAS.get(k); if (c) return c;
  c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data, t = parseInt(tint.slice(1), 16), tr = t >> 16, tg = (t >> 8) & 255, tb = t & 255;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const l = 0.32 + 0.72 * (0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) / 255;   // keep the shading, lift dark clothes
    a[i] = Math.min(255, tr * l); a[i + 1] = Math.min(255, tg * l); a[i + 2] = Math.min(255, tb * l);
  }
  x.putImageData(d, 0, 0); CIV_ATLAS.set(k, c);
  return c;
}
function drawCiv(c, P) {
  const x = Math.round(c.x - cam), y = c.y; if (x < -40 || x > LW + 40) return;
  const own = c.look && SPRITES["c_" + c.look];
  if (own) {   // the townsperson's own sheet: standing, two steps, fleeing
    // a four-beat walk (step, pass, step, pass) with a little bob on the steps; a runner bobs as he flees
    const beat = Math.floor(c.walkPh / 0.6) % 4, walkF = [1, 0, 2, 0][beat];
    const i = c.base + (c.st === "flee" ? 3 : c.st === "stand" ? 0 : walkF), [sx, sy, w, h, ax, ay] = FIGHTER_FRAMES[c.look][i];
    const bob = c.st === "flee" ? (Math.floor(c.walkPh / 0.5) % 2) * 1.5 : c.st === "walk" && walkF ? 0 : c.st === "walk" ? 0.8 : 0;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, y, 8, 2.5, 0, 0, 7); g.fill();
    g.save(); g.translate(x, y - bob); g.scale(c.face, 1); g.drawImage(own, sx, sy, w, h, -ax / 2, -ay / 2, w / 2, h / 2); g.restore();
    return;
  }
  const moving = c.st !== "stand", walk = moving && SPRITES["w_" + c.sheet] && FIGHTER_FRAMES[c.sheet + "_walk"];
  const im0 = SPRITES[(walk ? "w_" : "f_") + c.sheet]; if (!im0) return;
  const fr = walk ? FIGHTER_FRAMES[c.sheet + "_walk"][Math.floor(c.walkPh / 0.8) % 8] : FIGHTER_FRAMES[c.sheet][0];
  const [sx, sy, w, h, ax, ay] = fr, sc = 0.92, im = c.raw ? im0 : civAtlas(im0, (walk ? "w_" : "f_") + c.sheet, c.tint);
  g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, y, 9 * sc, 3 * sc, 0, 0, 7); g.fill();
  g.save(); g.translate(x, y); g.scale(c.face * sc, sc);
  g.drawImage(im, sx, sy, w, h, -ax / 2, -ay / 2, w / 2, h / 2);
  g.restore();
  if (c.raw) {   // a porter's sack, balanced on his head cloth
    const hy = Math.round(y - ay / 2 * sc) + 5;
    g.fillStyle = P.ol; g.beginPath(); g.ellipse(x, hy - 3, 9, 4.5, 0, 0, 7); g.fill();
    g.fillStyle = "#c9a26a"; g.beginPath(); g.ellipse(x, hy - 3, 8, 3.5, 0, 0, 7); g.fill(); R(x - 5, hy - 5, 10, 1, "#a8834a");
  }
}

