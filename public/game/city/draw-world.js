/* Rollback City: palette, sprite loading and backgrounds.
   A plain script that shares globals with the others; index.html loads them in order. */
"use strict";

/* ---------- palette ---------- */
let PAL = null;
/* Generated sprites (OpenArt: GPT Image 2.5 Flare stills, PixVerse V6 for
   the cow's idle loop), cut from a green screen and shrunk to game scale.
   Each has a drawn fallback until it loads. */
const SPRITES = {};
// Art is fetched a stage at a time (plus the next stage, in the background), so a
// phone only downloads what it is about to show. Anything not loaded yet is drawn
// the old way, in code, so a slow connection never blocks play.
const ART_V = 30, ART = "/game/city/sprites/", asked = new Set(), failed = new Set();
function sprite(name, src) { if (asked.has(name)) return; asked.add(name); const im = new Image(); im.onload = () => (SPRITES[name] = im); im.onerror = () => failed.add(name); im.src = src + "?v=" + ART_V; }
// When a stage opens, hold play for a moment (6 s at most) until the fighters on screen
// have their 8-bit sheets, so nobody flashes up in the old drawn style first.
let artWaitUntil = 0;
function fightersPending() {
  if (performance.now() > artWaitUntil || typeof FIGHTER_FRAMES === "undefined") return false;
  const sheets = new Set();
  for (const f of players.concat(enemies)) if (f && SHEET_OF[f.kind]) sheets.add(f.team === "e" ? spriteSheet(f) : SHEET_OF[f.kind]);
  for (const sh of sheets) if (!SPRITES["f_" + sh] && !failed.has("f_" + sh)) return true;
  return false;
}
const art = (names) => names.forEach((n) => sprite(n, ART + n + ".png"));
// the cast who sit down (at a tea stall, or a café table) have a seated frame of their own
const SIT_SHEETS = new Set(["rai", "kai", "rook", "crane", "kaal"]);
const fighterArt = (sheet) => { if (!sheet) return; sprite("f_" + sheet, ART + "fighters/" + sheet + ".png"); sprite("w_" + sheet, ART + "fighters/" + sheet + "_walk.png"); if (SIT_SHEETS.has(sheet)) sprite("s_" + sheet, ART + "fighters/" + sheet + "_sit.png"); };
const STAGE_ART = [
  ["birds", "cow", "auto", "cat", "cat_run1", "cat_run2", "st_lamp", "st_garbage", "st_cycle", "st_milk", "poster_film", "poster_circus", "poster_tuition", "dhaba_table", "dhaba_kettle", "dhaba_chairs",
    "sign_0", "sign_1", "sign_2", "sign_3", "sign_4", "sign_5", "sign_6", "sign_7", "sign_8", "sign_9", "sign_10", "sign_11"],
  ["routemap", "ad_chai", "ad_film", "clock", "sb_bench", "sb_cooler", "sb_scale", "sb_cagelamp", "train_coach"],
  ["birds", "poster", "kite_m", "kite_y", "kite_b", "kite_o", "cloth_sari", "cloth_dupatta", "cloth_kurta", "cloth_gamcha", "roof_exit", "roof_dish", "roof_ac", "roof_tanks"],
  ["mill_loom", "mill_firebox", "mill_lamp", "mill_bales", "bolt_m", "bolt_b", "bolt_o", "bolt_t"]
];
// a street's art: its painter's props (the lane's too), plus every fighter who can turn up there
function streetArt(s) {
  artWaitUntil = performance.now() + 6000;
  art(STAGE_ART[{ subway: 1, train: 1, trainroof: 1, roof: 2, factory: 3 }[s.theme] || 0]); if (s.theme !== "street") art(STAGE_ART[0]);
  const kinds = new Set((s.spawn ? s.spawn.kinds : []).concat(...(s.arenas || []).map((a) => [].concat(...a.waves)), s.civs ? CIV_LOOKS.map((c) => c[2]) : []));
  if (s.civs) for (const n of ["civ_a", "civ_b", "civ_c", "civ_d"]) sprite("c_" + n, ART + n + ".png");
  for (const k of kinds) fighterArt(SHEET_OF[k]);
  if (kinds.has("pipeGrunt")) fighterArt("pipeBare");
  art(["v_fruitcart", "m_dustbin", "m_pco", "m_teastall", "v_bicycle", "v_scooter", "v_motorbike", "h_0", "h_1", "h_2", "h_3", "h_4", "h_5", "h_6", "n_poster", "n_poster_moustache", "n_flag", "n_banner", "n_cutout", "p_cards", "p_stones", "p_checkpost"]);
  for (const n of ["civ_f", "civ_i", "civ_j"]) sprite("c_" + n, ART + n + ".png");
  if (s.theme === "seafront") { art(["m_seadlamp", "m_bhelcart", "v_motorbike", "c_table"]); fighterArt("biker"); sprite("c_civ_h", ART + "civ_h.png"); }
  if (s.theme === "docks" || s.theme === "opensea") { art(["d_crane", "d_auction", "d_bollard", "d_fishcart", "d_drums", "d_boatup", "m_ice", "m_nets", "m_fishcrates", "m_container", "v_boat"]); fighterArt("netman"); fighterArt("hookman"); }
  if (s.theme === "icefactory") art(["i_machine", "i_iceblocks", "i_hooks"]);
  if (s.theme === "akhada") art(["a_photo", "a_rack", "a_charpai"]);
  if ((s.junctions || []).some((j) => j.dir === "up" && !j.gate)) art(["gali_d", "gali_n"]);
  // the painted far layers, day and night
  const far = { street: "city", roof: "city", seafront: "sea", opensea: "sea", docks: "harbour", ghat: "river" }[s.theme];
  if (far) { const n = "bg_" + far + (worldDark() ? "_n" : "_d"); sprite(n, ART + n + ".webp"); }   // the other one when the light turns
  if (s.theme === "seafront") for (const n of ["bg_hotel", "bg_club"]) sprite(n, ART + n + ".webp");
  if (PAINTED_ROOMS.has(s.id)) sprite("room_" + s.id, ART + "rooms/" + s.id + ".webp");
  if (s.theme === "godown9") art(["g_ring", "g_board", "g_bulbs", "crowd"]);
  if (s.theme === "club") art(["c_djbooth", "c_speakers", "c_bar", "c_palm", "c_table", "c_jukebox", "dancers"]);
  if (s.district === "mandi") { art(["m_stall", "m_sacks", "m_crates", "v_handcart", "v_truck", "v_scooter"]); fighterArt("porter"); }
  for (const n of s.npcs || []) if (n.kind) fighterArt(SHEET_OF[n.kind]); else sprite("c_" + n.look, ART + n.look + ".png");
  if (s.patrol) fighterArt("constable");
  if (s.theme === "factory") sprite("f_nani", ART + "fighters/nani.png");   // she waits at the back of the mill
  if (s.theme === "roof") fighterArt("avatar");   // the divine form, from the poster on the roof
}
// shared by every stage: pickups, barrels, story portraits
art(["oneup", "samosa", "kulhad", "lathi", "knife", "letter", "barrel", "barrel_broken", "pump", "chai_machine"]);
// portraits load when a scene first needs them (playScene asks for the whole cast up front)
const portraitArt = (n) => n && sprite("p_" + n, ART + "portraits/" + n + ".png");
// draw a sprite at half its pixel size (the canvas is scaled 2x), bottom-centred on (x, y), snapped to device pixels
function spr(name, x, y, flip) {
  const im = SPRITES[name]; if (!im) return false;
  const w = im.width / 2, h = im.height / 2, x0 = Math.round((x - w / 2) * 2) / 2, y0 = Math.round((y - h) * 2) / 2;
  if (flip) { g.save(); g.translate(x0 + w, y0); g.scale(-1, 1); g.drawImage(im, 0, 0, w, h); g.restore(); }
  else g.drawImage(im, x0, y0, w, h);
  return true;
}   // fan nod to Unleash The Avatar by Aeos Games
// the same, drawn s times bigger (the auto-rickshaw is drawn a little larger than its sheet)
function sprAt(name, x, y, flip, s) {
  const im = SPRITES[name]; if (!im) return false;
  const w = im.width / 2 * s, h = im.height / 2 * s;
  g.save(); g.translate(Math.round(x), Math.round(y - h)); if (flip) g.scale(-1, 1); g.drawImage(im, -w / 2, 0, w, h); g.restore();
  return true;
}
const COW_LOOP = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];

const SHADES = new Map();
function shade(hex, f) {
  const key = hex + f; let v = SHADES.get(key); if (v) return v;
  const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const m = (c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
  v = "#" + ((1 << 24) | (m(r) << 16) | (m(gg) << 8) | m(b)).toString(16).slice(1);
  SHADES.set(key, v); return v;
}
// blend two #rrggbb colours: t = 0 gives a, 1 gives b
function mix(a, b, t) {
  if (!/^#[0-9a-f]{6}$/i.test(a)) return a;
  const p = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0")).join("");
}
function palette() {
  const T = Arcade.tokens(), d = typeof worldDark === "function" && street ? worldDark() : T.dark;   // the clock decides once it runs
  PAL = {
    T, dark: d, ol: "#15121a", spark: d ? "#fff6e0" : "#ffffff", wood: d ? "#7a5233" : "#8a5d3b",
    sky: d ? "#121628" : "#a9d3e6", sky2: d ? "#1a1d33" : "#cfe4ea", far: d ? "#1f2438" : "#b4c3cf", farWin: d ? "#7a6238" : "#eef3f4",
    walls: d ? ["#4c3d2c", "#28423f", "#4a3140", "#3c4630"] : ["#e9bb72", "#8fc2b8", "#e6a7a0", "#cfd590"],   // ochre, turquoise, rose and lime wash
    trim: d ? "#3b3631" : "#8a6a4e", brick: d ? "#40281f" : "#c67a5a", brickLine: d ? "#2c1a14" : "#a85f44",
    glass: d ? "#1c2a33" : "#86b2c0", glassLit: d ? "#6a4e22" : "#f6dfa8",
    side: d ? "#3d3731" : "#d6c7a6", sideLine: d ? "#2f2a25" : "#bba985", curb: d ? "#4d463e" : "#a99878",
    road: d ? "#2f2d2c" : "#8b8984", lane: d ? "#635a4c" : "#f4ecdc",
    tile: d ? "#2c2d31" : "#e6e2da", tileLine: d ? "#232427" : "#cfc9be", ceil: d ? "#151417" : "#3b3832", lamp: d ? "#e9e2c8" : "#fffbe9",
    plat: d ? "#3a3836" : "#b9b2a7", platLine: d ? "#2f2d2b" : "#a39b8f", rail: d ? "#6b6560" : "#77706a", pit: d ? "#0f0e10" : "#4a4640",
    trainBody: d ? "#8d939b" : "#c9ced4", trainWin: d ? "#2a3440" : "#5d6b78",
    tar: d ? "#343138" : "#6b6570", tarDot: d ? "#45414a" : "#7c7681", parapet: d ? "#45404a" : "#b9aab6",
    steel: d ? "#2f3236" : "#5d6168", steelHi: d ? "#43474d" : "#7a7f86", plate: d ? "#38373c" : "#6e6a66", plateDot: d ? "#4a494e" : "#807b77",
    corr: d ? "#2a292d" : "#4e4b52", corrLine: d ? "#343338" : "#59565d",
    skin: ["#c98e62", "#9a6440", "#e0b088", "#7b4a2c"], hair: d ? "#2a221e" : "#1d1b18", looks: {},
    shadow: "rgba(0,0,0,0.28)", neon: mix(T.accent, "#e8c39a", 0.22), neon2: mix(T.teal, "#e8c39a", 0.22), amber: T.amber
  };
}
Arcade.onTheme(palette);

/* ---------- backgrounds ---------- */
const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
const SIGNS = ["NANI'S DHABA", "CHAI", "SWEETS", "PAAN", "TAILOR", "KIRANA", "STD PCO", "BANGLES", "PHOTO STUDIO", "MOBILE REPAIR", "LASSI", "CHEMIST"];
function text(s, x, y, size, c, align = "center", font = "IBM Plex Mono") { g.font = "bold " + size + "px " + (font === "sans-serif" ? "sans-serif" : "'" + font + "', monospace"); g.textAlign = align; g.fillStyle = c; g.fillText(s, x, y); }
// stars: scattered by a hash (the old i*97, i*53 grid lined them up in diagonal stripes), drifting a
// little with the camera, most faint, a few bright ones with a soft cross, twinkling rather than blinking off
const STAR_H = (i, k) => { let h = (i * 374761393 + k * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h ^ (h >>> 16)) / 4294967296; };
function stars(P, n, maxY) {
  if (!P.dark) return;
  const W = LW + 40, drift = cam * 0.02;
  for (let i = 0; i < n; i++) {
    const sx = Math.round((((STAR_H(i, 1) * W - drift) % W) + W) % W - 20), sy = Math.round(STAR_H(i, 2) * maxY), b = STAR_H(i, 3);
    const tw = 0.55 + 0.45 * Math.sin(frameNo / (40 + b * 50) + i);
    g.globalAlpha = (b > 0.9 ? 1 : 0.35 + b * 0.4) * tw; R(sx, sy, 1, 1, b > 0.8 ? "#ffffff" : b > 0.4 ? "#d8d2e8" : "#a9a3c0");
    if (b > 0.94) { g.globalAlpha *= 0.45; R(sx - 1, sy, 3, 1, "#ffffff"); R(sx, sy - 1, 1, 3, "#ffffff"); }
  }
  g.globalAlpha = 1;
}
// A painted far layer (from local MOSS, a day and a night version): a little wider than the screen,
// slid slowly as you walk so its ends never show. The sky above it is filled with a gradient taken
// from its own top edge, so the two meet without a seam. False if the art isn't there (yet).
// The painted rooms: each a MOSS repaint of the room as the game drew it, so the door, the bed,
// the cell and the counter are still where the game expects them. The picture goes down first; then
// the room's own painter runs again with every shape switched off, so only its lettering draws (the
// menu, the board, the signs), each on a small plate, crisp where the painting's letters would blur.
const PAINTED_ROOMS = new Set(["dhaba", "clinic", "thana", "chaiShop", "sweetShop", "paanShop", "tailorShop", "kiranaShop", "kaalOffice", "garage"]);
function paintedRoom(P, paint) {
  const im = PAINTED_ROOMS.has(street.id) && SPRITES["room_" + street.id]; if (!im) return false;
  const x0 = Math.round(-cam);
  R(0, 0, LW, LH, "#1d1b18"); g.drawImage(im, x0, 0, street.w, LH);   // a wide screen sees dark beyond the walls
  const keep = ["fill", "stroke", "fillRect", "strokeRect", "drawImage", "fillText"], was = {}, proto = Object.getPrototypeOf(g);
  for (const k of keep) was[k] = proto[k];
  const off = () => {};
  g.fill = g.stroke = g.fillRect = g.strokeRect = g.drawImage = off;
  g.fillText = function (s, x, y) {
    const tw = this.measureText(s).width, size = parseFloat((this.font.match(/([\d.]+)px/) || [0, 7])[1]), col = this.fillStyle;
    const lx = this.textAlign === "center" ? x - tw / 2 : this.textAlign === "right" ? x - tw : x;
    const n = typeof col === "string" && col[0] === "#" ? parseInt(col.slice(1, 7), 16) : 0xffffff, lum = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11);
    this.fillStyle = lum > 128 ? "rgba(26,22,18,0.84)" : "rgba(250,244,230,0.9)"; was.fillRect.call(this, Math.round(lx - 5), Math.round(y - size - 1), Math.ceil(tw + 10), Math.ceil(size + 6));
    this.fillStyle = col; was.fillText.call(this, s, x, y);
  };
  try { paint(P); } finally { for (const k of keep) delete g[k]; }
  if (street.id === "clinic") drawNaniInBed(P);   // what lives in the room is drawn as usual
  if (street.shop) shopKeeper(113);
  if (street.id === "dhaba") drawCup(P);
  return true;
}
function backdrop(key, bottom, v) {
  // only the version on show is fetched (night art when night falls), as a small WebP
  const name = "bg_" + key + (v || (PAL.dark ? "_n" : "_d")), im = SPRITES[name];
  if (!im) { sprite(name, ART + name + ".webp"); return false; }
  if (!im.top) {   // its top-edge colour and its bottom-edge colour, measured once
    const c = document.createElement("canvas"); c.width = 16; c.height = 2; const x = c.getContext("2d");
    x.drawImage(im, 0, 0, im.width, 2, 0, 0, 16, 1); x.drawImage(im, 0, im.height - 2, im.width, 2, 0, 1, 16, 1);
    const avg = (row) => { const d = x.getImageData(0, row, 16, 1).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < 64; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } return "#" + ((1 << 24) | ((r / 16 | 0) << 16) | ((gg / 16 | 0) << 8) | (b / 16 | 0)).toString(16).slice(1); };
    im.top = avg(0); im.bot = avg(1);
  }
  const w = im.width / 2, h = im.height / 2, span = (street.w || LW) - LW, par = span > 0 ? Math.min(1, (w - LW) / span) : 0;
  const y = Math.round(bottom - h);
  if (y > 0) { const gr = g.createLinearGradient(0, 0, 0, y + 1); gr.addColorStop(0, shade(im.top, -0.12)); gr.addColorStop(1, im.top); g.fillStyle = gr; g.fillRect(0, 0, LW, y + 1); }
  g.drawImage(im, -Math.round(Math.max(0, cam) * par), y, w, h);
  return im;
}
function skyline(P, par, base, tall) {
  const off = cam * par;
  for (let i = -1; i < 14; i++) {
    const seed = Math.floor(off / 40) + i, bx = i * 40 - (off % 40), h = tall + ((seed * 37) % 45);
    R(bx, base - h, 36, h + 20, P.far);
    if (seed % 5 === 0) { R(bx + 16, base - h - 10, 2, 10, P.far); if (frameNo % 60 < 30) R(bx + 15, base - h - 12, 3, 2, P.T.red); }
    for (let wy = base - h + 6; wy < base - 4; wy += 9) for (let wx = 4; wx < 32; wx += 8) if (((seed * 7 + wx * 3 + wy) % 5) === 0) R(bx + wx, wy, 3, 4, P.farWin);
  }
}

// A street's look tunes the painter: wareFrom (where godowns start), gateAt (an arch over the
// road), dhaba (the building that is Nani's), godown (the first godown's number), narrow (a gali of
// houses, no road), station (where the Bunder Road terminus stands).
const look = () => street.look || {};
// painted scenery (a parked auto, the cow, a bicycle against a wall) only goes where nothing real
// stands: no barrel, prop, cart, vehicle, door or junction within r of world x
function clearAt(wx, r) {
  const near = (x) => Math.abs(x - wx) < r;
  return !(barrels.some((b) => near(b.x)) || (street.props || []).some((p) => near(p.x)) || carts.some((c) => near(c.x)) || rides.some((v) => near(v.x)) ||
    (street.doors || []).concat(street.junctions || [], street.links || []).some((d) => near(d.x)));
}
function drawStreet(P) {
  const L = look(), wareFrom = L.wareFrom === undefined ? Infinity : L.wareFrom, dhabaI = L.dhaba === undefined ? null : L.dhaba;
  if (!backdrop("city", 112)) {   // the painted far layer; the old drawn one until it loads
  R(0, 0, LW, LH, P.sky); stars(P, 40, 60);
    g.fillStyle = P.dark ? "#3a3440" : "#f6eff3"; g.beginPath(); g.arc(300 - cam * 0.05, 26, 11, 0, 7); g.fill();
    skyline(P, 0.3, 112, 50);
    // a temple spire and a mobile tower on the far skyline
    for (let tx = -(cam * 0.3 % 520) + 140; tx < LW + 60; tx += 520) {
      const c = P.far, d = shade(P.far, -0.08);
      R(tx - 14, 42, 28, 70, c); R(tx - 11, 30, 22, 12, c); R(tx - 8, 21, 16, 10, c); R(tx - 5, 14, 10, 8, c); R(tx - 2, 9, 4, 6, d);
      R(tx - 1, 6, 2, 3, P.amber); g.fillStyle = "#d9741c"; g.beginPath(); g.moveTo(tx, 0); g.lineTo(tx + 7 + Math.sin(frameNo / 12) * 1.5, 2); g.lineTo(tx, 4); g.fill(); R(tx, 0, 0.8, 8, P.rail);
      const mx = tx + 260; g.strokeStyle = P.far; g.lineWidth = 1; g.beginPath(); g.moveTo(mx - 6, 112); g.lineTo(mx, 10); g.lineTo(mx + 6, 112); for (let yy = 20; yy < 110; yy += 10) { g.moveTo(mx - 6 + (yy - 10) / 17, yy); g.lineTo(mx + 6 - (yy - 10) / 17, yy + 8); } g.stroke();
      R(mx - 4, 16, 3, 6, P.far); R(mx + 2, 22, 3, 6, P.far); if (frameNo % 70 < 35) R(mx - 1, 7, 2, 2, P.T.red);
    }
  }
  drawCrows(13);
  const first = Math.floor(cam / 128) - 1;
  // the mouths of galis and gates: the buildings make room for them (a sign fits into the wall beside,
  // the awning and the marigold lights stop short), so nothing is sliced by the gap
  const gaps = (street.junctions || []).filter((j) => j.dir === "up").map((j) => (j.gate ? [j.x - 50, j.x + 50] : [j.x - 28, j.x + 28]));
  const open = (wx) => !gaps.some(([a, b]) => wx > a && wx < b);
  for (let i = first; i < first + Math.ceil(LW / 128) + 2; i++) {
    const x = i * 128 - cam, ware = i * 128 >= wareFrom, top = 26 + (i % 2) * 10;
    if (L.station !== undefined && i * 128 >= L.station && i * 128 < L.station + 384) continue;   // the station stands here
    if (ware) {
      R(x, 34, 128, 116, P.brick);
      for (let by = 38; by < 150; by += 6) { R(x, by, 128, 1, P.brickLine); for (let bx = (by / 6) % 2 ? 0 : 8; bx < 128; bx += 16) R(x + bx, by - 5, 1, 5, P.brickLine); }
      drawGodownFront(P, x, i, (L.names && L.names[i]) || "GODOWN " + (i + L.godown));
      R(x + 10, 120, 6, 30, P.T.amber); for (let s = 0; s < 30; s += 6) R(x + 10, 120 + s, 6, 3, P.ol);
      if (i * 128 === L.gateAt) { R(x - 6, 60, 10, 90, P.trim); R(x + 124, 60, 10, 90, P.trim); R(x - 6, 50, 140, 12, P.trim); R(x - 6, 50, 140, 2, shade(P.trim, 0.15)); text("CHANDNI MANDI", x + 64, 59, 7, P.amber); }
    } else {
      const wall = P.walls[((i % P.walls.length) + P.walls.length) % P.walls.length];
      R(x, top, 128, 150 - top, wall); R(x, top, 128, 3, P.trim);
      // cornice and roof clutter
      R(x + 4, top - 4, 120, 4, shade(wall, -0.12));
      if (i % 3 === 0) { R(x + 90, top - 18, 16, 14, P.trim); R(x + 92, top - 4, 2, 4, P.trim); R(x + 102, top - 4, 2, 4, P.trim); }
      // windows with sills, curtains and an AC unit
      for (let wx = 10; wx < 120; wx += 28) {
        const lit = (i + wx) % 3 === 0, wy = 44 + (i % 2) * 6;
        R(x + wx, wy, 18, 20, lit ? P.glassLit : P.glass);
        R(x + wx + 8, wy, 2, 20, shade(wall, -0.2));
        if (lit) R(x + wx + 1, wy + 1, 5, 18, shade(P.glassLit, -0.15));
        R(x + wx - 1, wy + 20, 20, 2, P.trim);
        if ((i * 3 + wx) % 4 === 0) { R(x + wx + 3, wy + 22, 12, 7, P.trim); R(x + wx + 5, wy + 24, 8, 1, P.ol); R(x + wx + 5, wy + 26, 8, 1, P.ol); }
      }
      // fire escape on every other building
      if (i % 2 === 0) {
        g.strokeStyle = P.dark ? "#56504a" : "#4a453f"; g.lineWidth = 1;
        for (let fy = 70; fy < 100; fy += 26) { g.strokeRect(x + 66.5, fy + 0.5, 34, 1); for (let rx = 0; rx < 35; rx += 4) R(x + 66 + rx, fy - 6, 1, 7, g.strokeStyle); }
        g.beginPath(); g.moveTo(x + 68, 96); g.lineTo(x + 98, 72); g.stroke();
      }
      if (L.narrow) { drawHouseFront(P, x, i, wall); R(x + 126, 30, 2, 120, P.trim); continue; }
      // shop front, sign, awning, door
      R(x + 10, 104, 74, 40, P.glass);
      R(x + 10, 104, 74, 2, shade(P.glass, -0.2));
      R(x + 16, 128, 14, 16, shade(P.glass, -0.25)); R(x + 50, 124, 10, 20, shade(P.glass, -0.25));
      R(x + 94, 104, 24, 46, P.trim); R(x + 97, 108, 18, 42, shade(wall, -0.25)); R(x + 111, 128, 2, 2, P.amber);
      if (i !== dhabaI && !shopsOpen()) { drawShutter(P, x + 10, 104, 74, 40); drawShutter(P, x + 96, 107, 20, 43); }   // shut for the night (Nani's never closes)
      // signs count on from Nani's dhaba, which always gets the first one
      const si = (((i - (dhabaI || 0)) % SIGNS.length) + SIGNS.length) % SIGNS.length, sign = SIGNS[si], neon = i % 2 ? P.neon : P.neon2;
      let sa = x + 8, sb = x + 120;   // the stretch of front the sign can use
      for (const [a, b] of gaps) { const A = a - cam, B = b - cam; if (B <= sa || A >= sb) continue; if (A - sa >= sb - B) sb = Math.min(sb, A); else sa = Math.max(sa, B); }
      const signIm = SPRITES["sign_" + si], whole = sa === x + 8 && sb === x + 120;
      if (signIm && sb - sa >= 44) sprAt("sign_" + si, (sa + sb) / 2, 100, false, Math.min(1, (sb - sa - 4) / (signIm.width / 2)));
      else if (!signIm && whole) {
        R(x + 12, 84, 105, 15, P.dark ? "#18161b" : shade(wall, -0.08));
        g.strokeStyle = neon; g.lineWidth = 1; g.strokeRect(x + 12.5, 84.5, 104, 14);
        g.globalAlpha = (frameNo + i * 37) % 240 < 4 ? 0.35 : 1; text(sign, x + 64, 95, 9, neon); g.globalAlpha = 1;
      }
      for (let s = 0; s < 8; s++) { if (!open(x + cam + 13 + s * 10)) continue; g.globalAlpha = s % 2 ? 1 : 0.6; R(x + 8 + s * 10, 100, 10, 4, s % 2 ? P.trim : neon); }
      g.globalAlpha = 1;
      // a marigold toran with mango leaves strung under the awning
      for (let s = 0; s <= 20; s++) { const tx = x + 9 + s * 4, ty = 105 + Math.sin(s / 20 * Math.PI) * 4; if (!open(tx + cam)) continue; R(tx, ty, 2, 2, s % 2 ? "#f2a91a" : "#e2701c"); if (s % 4 === 2) R(tx, ty + 2, 1, 3, "#2f6b3a"); }
      // the reflection of the sign on the wet road
      g.globalAlpha = P.dark ? 0.16 : 0.09; R(x + 28 + Math.sin(frameNo / 18 + i) * 1, 180, 70, 3, neon); R(x + 36 + Math.sin(frameNo / 15 + i) * 1.4, 188, 54, 2, neon); R(x + 46, 196, 34, 2, neon); g.globalAlpha = 1;
      // poster and a little graffiti
      // a poster on bare wall: below the windows' sills and above the shop sign, clear of the fire escape
      // (on even buildings, so it goes left) and of the last window (on odd ones, so it goes to the corner)
      const posX = x + (i % 2 === 0 ? 22 : 119);
      if (i % 3 === 1 && open(posX + cam) && !spr(["poster_film", "poster_circus", "poster_tuition"][((Math.floor(i / 3) % 3) + 3) % 3], posX, 83)) { R(posX - 6, 66, 12, 16, P.T.amber); R(posX - 4, 69, 8, 2, P.ol); R(posX - 4, 73, 6, 1, P.ol); }
      if (i % 4 === 2) text("RAI", x + 52, 80, 8, shade(P.neon, 0.15), "center", "Newsreader");
      if (i === dhabaI) {
        // Nani's dhaba: a steel kettle on the stove, a table and two tumblers, a bulb over the door
        if (!sprAt("dhaba_table", x + 25, 151, false, 1.6)) { R(x + 14, 138, 22, 3, "#8a6a4a"); R(x + 15, 141, 2, 9, "#5d4630"); R(x + 33, 141, 2, 9, "#5d4630"); R(x + 18, 134, 3, 4, "#c9ced4"); R(x + 26, 134, 3, 4, "#c9ced4"); }
        sprAt("dhaba_chairs", x + 50, 151, false, 1.25);
        if (!spr("dhaba_kettle", x + 62, 151)) { R(x + 54, 140, 18, 10, "#3b3832"); R(x + 58, 132, 10, 8, "#c9ced4"); R(x + 67, 134, 4, 1.5, "#c9ced4"); }
        g.globalAlpha = 0.5; R(x + 61 + Math.sin(frameNo / 9), 126, 1, 5, "#ffffff"); g.globalAlpha = 1;
        R(x + 104, 100, 4, 4, P.lamp); g.globalAlpha = P.dark ? 0.2 : 0.08; g.fillStyle = P.lamp; g.beginPath(); g.arc(x + 106, 102, 14, 0, 7); g.fill(); g.globalAlpha = 1;
      }
    }
    R(x + 126, 30, 2, 120, P.trim);
    drawBurnt(P, x, i);
  }
  drawHoardings(P, first, Math.ceil(LW / 128) + 2);
  if (L.station !== undefined) drawStationFront(P, Math.round(L.station - cam));
  if (L.narrow) { drawGaliFloor(P); return; }
  // sidewalk, kerb, road
  R(0, 150, LW, 24, P.side);
  for (let sx = -(cam % 32); sx < LW; sx += 32) R(sx, 150, 1, 24, P.sideLine);
  R(0, 160, LW, 1, P.sideLine); R(0, 174, LW, 3, P.curb); R(0, 177, LW, LH - 177, P.road);
  for (let lx = -(cam % 48); lx < LW; lx += 48) R(lx, 197, 24, 2, P.lane);
  for (let mx = -(cam % 300) + 140; mx < LW; mx += 300) { g.fillStyle = P.sideLine; g.beginPath(); g.ellipse(mx, 188, 9, 3, 0, 0, 7); g.fill(); }
  // an auto-rickshaw parked at the kerb, and a cow who owns the road
  for (let ax = -(cam % 512) + 300; ax < LW + 40; ax += 512) {
    if (!clearAt(ax + 20 + cam, 66)) continue;
    if (sprAt("auto", ax + 20, 183, false, 1.75)) continue;
    // a black-and-yellow auto-rickshaw: canopy, open side, single headlight
    g.fillStyle = P.ol; g.beginPath(); g.moveTo(ax - 1, 177); g.lineTo(ax - 1, 158); g.quadraticCurveTo(ax + 2, 150, ax + 14, 150); g.lineTo(ax + 30, 150); g.quadraticCurveTo(ax + 38, 152, ax + 39, 162); g.lineTo(ax + 40, 177); g.closePath(); g.fill();
    g.fillStyle = "#1d1b18"; g.beginPath(); g.moveTo(ax, 160); g.quadraticCurveTo(ax + 3, 151, ax + 14, 151); g.lineTo(ax + 30, 151); g.quadraticCurveTo(ax + 37, 153, ax + 37, 160); g.closePath(); g.fill();
    R(ax, 160, 38, 15, "#f2c230"); R(ax + 6, 160, 16, 9, P.dark ? "#2a2724" : "#4a453f"); R(ax + 24, 160, 2, 15, "#c9a227");
    R(ax + 34, 163, 4, 4, "#fff4d6"); R(ax, 172, 38, 2, "#2f2b28"); R(ax + 8, 162, 6, 4, "#7a2230");
    g.fillStyle = P.ol; g.beginPath(); g.arc(ax + 8, 177, 3.6, 0, 7); g.arc(ax + 33, 177, 3.6, 0, 7); g.fill();
    R(ax + 7, 176, 2, 2, "#8a8278"); R(ax + 32, 176, 2, 2, "#8a8278");
  }
  for (let cx = -((cam + 200) % 768) + 600; cx < LW + 40; cx += 768) {
    if (!clearAt(cx + 26 + cam, 60)) continue;
    // a white zebu cow resting on the road with a marigold garland
    if (SPRITES.cow) {
      const fr = COW_LOOP[Math.floor(frameNo / 9) % COW_LOOP.length];
      g.fillStyle = P.shadow; g.beginPath(); g.ellipse(cx + 28, 197, 30, 3.5, 0, 0, 7); g.fill();
      g.drawImage(SPRITES.cow, fr * 136, 0, 136, 71, Math.round(cx - 8), 165.5, 68, 35.5);
      continue;
    }
    const cw = "#ece6dc", cs = "#b9ad98", chew = frameNo % 40 < 20 ? 0 : 1;
    R(cx - 1, 183, 38, 14, P.ol); R(cx, 184, 36, 12, cw); R(cx + 22, 181, 8, 5, cw); R(cx + 4, 188, 10, 6, cs);
    R(cx + 33, 178, 11, 10, P.ol); R(cx + 34, 179, 9, 8, cw); R(cx + 40, 183 + chew, 3, 3, "#d9b9a0");
    R(cx + 34, 176, 1, 3, "#8a7f70"); R(cx + 33, 175, 2, 1, "#8a7f70"); R(cx + 41, 176, 1, 3, "#8a7f70"); R(cx + 41, 175, 2, 1, "#8a7f70");
    R(cx + 38, 181, 1.5, 1.5, "#1d1b18"); R(cx - 4 + Math.sin(frameNo / 20) * 1.5, 186, 4, 1, cs); R(cx - 6 + Math.sin(frameNo / 20) * 2, 185, 2, 3, cs);
  }
  // street props along the back of the sidewalk
  for (let px = -(cam % 256); px < LW + 40; px += 256) {
    const wx = px + cam;
    drawNetaFlags(P, px);
    // no lamp where a gali opens or the street has a gap: the gali is drawn over it and would slice the arm off
    const lampOk = !(street.junctions || []).some((j) => j.dir === "up" && Math.abs(j.x - (wx + 7)) < 50) && !(street.gaps || []).some(([a, b]) => wx + 28 > a && wx - 12 < b);
    if (lampOk) {
    if (!sprAt("st_lamp", px - 5, 153, false, 1.6)) { R(px + 2, 92, 3, 60, P.dark ? "#4a4540" : "#5d5852"); R(px - 4, 90, 14, 4, P.dark ? "#4a4540" : "#5d5852"); R(px - 2, 94, 10, 2, P.lamp); }
    g.globalAlpha = P.dark ? 0.12 : 0.06; g.fillStyle = P.lamp; g.beginPath(); g.moveTo(px - 4, 54); g.lineTo(px + 8, 54); g.lineTo(px + 34, 168); g.lineTo(px - 30, 168); g.fill();
    g.globalAlpha = P.dark ? 0.16 : 0.07; g.beginPath(); g.ellipse(px + 3, 170, 28, 6, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    }
    const lot = ((Math.floor(wx / 256) % 4) + 4) % 4;
    const spot = { 0: 76, 1: 150, 2: 76, 3: 72 }[lot]; if (!clearAt(px + spot + cam, 34)) continue;
    if (lot % 2 === 0) { if (!spr("st_garbage", px + 76, 155)) { g.fillStyle = P.dark ? "#1d1c1f" : "#3b3832"; g.beginPath(); g.ellipse(px + 70, 149, 8, 6, 0, 0, 7); g.ellipse(px + 80, 150, 6, 5, 0, 0, 7); g.fill(); } }
    else if (lot === 1) sprAt("st_cycle", px + 150, 155, false, 1.45);
    else spr("st_milk", px + 72, 155);
  }
}

function drawSubway(P) {
  R(0, 0, LW, LH, P.tile);
  for (let ty = 26; ty < 118; ty += 6) R(0, ty, LW, 1, P.tileLine);
  for (let tx = -(cam % 12); tx < LW; tx += 12) R(tx, 26, 1, 92, P.tileLine);
  R(0, 64, LW, 8, P.neon); R(0, 74, LW, 2, P.neon2);
  // ceiling with strip lights
  R(0, 0, LW, 26, P.ceil);
  for (let lx = -(cam % 128); lx < LW + 64; lx += 128) {
    R(lx + 10, 18, 40, 4, P.lamp); g.globalAlpha = 0.08; g.fillStyle = P.lamp; g.fillRect(lx, 22, 60, 20); g.globalAlpha = 1;
    // a slow ceiling fan, as on every suburban platform
    const fx0 = lx + 92, a = frameNo / 5; R(fx0 - 0.5, 8, 1, 10, P.rail); R(fx0 - 2, 17, 4, 3, P.rail);
    g.strokeStyle = P.dark ? "#6b6560" : "#5d5852"; g.lineWidth = 2; g.beginPath();
    for (let b = 0; b < 3; b++) { const ba = a + b * 2.094; g.moveTo(fx0, 19); g.lineTo(fx0 + Math.cos(ba) * 13, 19 + Math.sin(ba) * 2.2); }
    g.stroke();
  }
  // station boards, route maps, posters, clocks
  for (let px = -(cam % 256); px < LW + 60; px += 256) {
    const slot = Math.floor((px + cam) / 256);
    if (px + cam >= 880) {
      // the service tunnel: bare brick, a caged lamp, pipes
      R(px, 26, 256, 92, P.brick);
      for (let by = 30; by < 118; by += 6) { R(px, by, 256, 1, P.brickLine); for (let bx = (by / 6) % 2 ? 0 : 8; bx < 256; bx += 16) R(px + bx, by - 5, 1, 5, P.brickLine); }
      R(px, 40, 256, 3, P.rail); R(px, 46, 256, 2, P.rail); if (!spr("sb_cagelamp", px + 124, 71)) { R(px + 120, 60, 8, 8, P.lamp); R(px + 119, 59, 10, 1, P.rail); R(px + 119, 68, 10, 1, P.rail); }
      continue;
    }
    if (slot % 2 === 0) { R(px + 20, 34, 70, 20, "#f2c230"); text("BUNDER ROAD", px + 55, 44, 6.5, "#1d1b18"); text("बंदर रोड", px + 55, 52, 6.5, "#1d1b18", "center", "sans-serif"); }
    else { R(px + 20, 36, 60, 14, "#2f6b3a"); text("WAY OUT  >", px + 50, 46, 6.5, "#f7f4ee"); }
    if (!spr("routemap", px + 127, 111)) {
      R(px + 110, 80, 34, 30, "#f7f4ee"); R(px + 111, 81, 32, 28, P.dark ? "#d9d4cb" : "#fffdf9");
      g.strokeStyle = P.neon; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + 114, 100); g.lineTo(px + 126, 90); g.lineTo(px + 140, 96); g.stroke();
      g.strokeStyle = P.neon2; g.beginPath(); g.moveTo(px + 116, 86); g.lineTo(px + 128, 104); g.stroke();
    }
    if (!spr(slot % 2 ? "ad_film" : "ad_chai", px + 183, 118)) { R(px + 170, 82, 26, 34, P.T.amber); R(px + 174, 88, 18, 3, "#1d1b18"); R(px + 174, 94, 14, 2, "#1d1b18"); R(px + 174, 104, 18, 8, P.neon); }
    if (spr("clock", px + 225, 53)) continue;
    g.fillStyle = "#f7f4ee"; g.beginPath(); g.arc(px + 225, 44, 7, 0, 7); g.fill(); g.strokeStyle = "#1d1b18"; g.lineWidth = 1; g.stroke();
    g.strokeStyle = "#1d1b18"; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 225.5, 44.5); g.lineTo(px + 224.5, 39); g.moveTo(px + 225.5, 44.5); g.lineTo(px + 223.6, 41.2); g.stroke();
  }
  // platform pillars with painted bases
  for (let px = -(cam % 192) + 150; px < LW + 20; px += 192) { R(px, 26, 8, 92, P.dark ? "#3a3836" : "#d7d2c9"); for (let sy = 104; sy < 118; sy += 4) R(px, sy, 8, 2, sy % 8 ? "#f2c230" : "#1d1b18"); }
  // track pit with rails; trains pass now and then
  R(0, 118, LW, 26, P.pit);
  R(0, 128, LW, 2, P.rail); R(0, 137, LW, 2, P.rail);
  for (let sx = -(cam % 14); sx < LW; sx += 14) R(sx, 130, 6, 7, shade(P.pit, 0.12));
  if (train) {
    for (let c = 0; c < 4; c++) {
      const tx = train.x + c * 315;
      if (sprAt("train_coach", tx + 151, 139, false, 1.5)) continue;
      R(tx, 58, 204, 82, "#7a2230"); R(tx, 58, 204, 3, "#9a3a46"); R(tx, 104, 204, 5, "#f2c230"); R(tx, 112, 204, 2, "#f2c230");
      for (let w = 10; w < 196; w += 32) {
        R(tx + w, 70, 22, 22, P.trainWin);
        // commuters at the windows
        const n = (c * 7 + w) % 3; for (let q = 0; q < n + 1; q++) { R(tx + w + 3 + q * 7, 80, 5, 12, "#1b1a1d"); R(tx + w + 4 + q * 7, 76, 4, 4, "#1b1a1d"); }
      }
      // open doors, and someone leaning out holding the pole
      for (const dx of [64, 160]) { R(tx + dx, 70, 14, 44, "#1b1a1d"); R(tx + dx + 2, 70, 1, 44, "#c9ced4"); }
      R(tx + 96, 70, 14, 44, "#1b1a1d"); R(tx + 98, 70, 1, 44, "#c9ced4");
      R(tx + 92, 78, 6, 14, "#2b54a8"); R(tx + 92, 73, 5, 5, "#7b4a2c"); R(tx + 89, 92, 3, 12, "#2a2230"); R(tx + 96, 80, 3, 2, "#7b4a2c");
    }
  }
  // platform with tactile strip
  R(0, 144, LW, LH - 144, P.plat);
  R(0, 144, LW, 3, P.amber); for (let dx = -(cam % 6); dx < LW; dx += 6) R(dx, 145, 2, 1, shade(P.amber, -0.3));
  for (let sx = -(cam % 40); sx < LW; sx += 40) R(sx, 147, 1, LH - 147, P.platLine);
  for (let sy = 166; sy < LH; sy += 20) R(0, sy, LW, 1, P.platLine);
  // benches along the back
  for (let bx = -(cam % 192) + 60; bx < LW + 120; bx += 192) {
    if (!spr("sb_bench", bx + 20, 157)) { R(bx, 146, 40, 4, P.dark ? "#5b4a3a" : "#8a6a4a"); R(bx + 3, 150, 3, 6, P.rail); R(bx + 34, 150, 3, 6, P.rail); }
    spr(Math.floor((bx + cam) / 192) % 2 ? "sb_scale" : "sb_cooler", bx + 112, 157);
  }
}

function drawRoof(P) {
  if (!backdrop("city", 128)) {   // the painted far layer; the old drawn one until it loads
  R(0, 0, LW, 50, P.sky); R(0, 50, LW, 40, P.sky2); R(0, 90, LW, 60, P.dark ? "#241f2c" : "#d2c3d0");
    stars(P, 60, 80);
    g.fillStyle = P.dark ? "#d9d0c0" : "#fff8f0"; g.beginPath(); g.arc(214 - cam * 0.03, 44, 13, 0, 7); g.fill();
    // slow clouds drifting past the moon
    g.globalAlpha = P.dark ? 0.35 : 0.6; g.fillStyle = P.dark ? "#3a3444" : "#f6eff3";
    for (let c = 0; c < 3; c++) { const cx = ((c * 170 + frameNo * 0.08 - cam * 0.05) % (LW + 120) + LW + 120) % (LW + 120) - 60, cy = 22 + c * 12; g.beginPath(); g.ellipse(cx, cy, 26, 5, 0, 0, 7); g.ellipse(cx + 14, cy - 3, 14, 5, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    skyline(P, 0.15, 128, 60);
  }
  // mid layer: water towers, a billboard, antennas
  const off = cam * 0.6;
  for (let i = -1; i < 4; i++) {
    const x = i * 220 - (off % 220), seed = Math.floor(off / 220) + i;
    if (seed % 2 === 0) {
      // black plastic water tanks, the skyline of every Indian rooftop
      if (!spr("roof_tanks", x + 41, 126)) {
        for (let t = 0; t < 2; t++) { const tx = x + 16 + t * 26; R(tx, 84, 22, 24, "#1b1a1d"); R(tx - 1, 82, 24, 4, "#2a292d"); R(tx + 2, 90, 18, 1, "#2f2e33"); R(tx + 2, 98, 18, 1, "#2f2e33"); }
        R(x + 14, 108, 54, 18, P.dark ? "#3a3640" : "#9a90a0");
      }
    } else {
      // a washing line with saris drying
      g.strokeStyle = P.rail; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 10, 80); g.quadraticCurveTo(x + 70, 88, x + 130, 80); g.stroke();
      [["#d9741c", 20, "cloth_sari"], ["#a8186a", 50, "cloth_dupatta"], ["#2b54a8", 80, "cloth_kurta"], ["#2f6b3a", 108, "cloth_gamcha"]].forEach(([c, dx, n]) => {
        const sw = Math.sin(frameNo / 30 + dx) * 1.5, im = SPRITES[n], top = 80 + 4 * (1 - ((dx + 7 - 70) / 60) ** 2) - 1;   // pegged to the sagging line
        if (!im || !spr(n, x + dx + 7 + sw, Math.round(top + im.height / 2))) { R(x + dx + sw, 84, 14, 26, c); R(x + dx + sw, 84, 14, 2, "#f2c230"); }
      });
      R(x + 8, 78, 2, 48, P.rail); R(x + 130, 78, 2, 48, P.rail);
    }
    R(x + 170, 50, 1, 76, P.rail); R(x + 166, 60, 9, 1, P.rail); R(x + 167, 72, 7, 1, P.rail);
    if (frameNo % 50 < 25) R(x + 169, 48, 3, 3, P.T.red);
  }
  // kites in the sky (Sankranti is over, nobody told them)
  for (let k = 0; k < 4; k++) {
    const kx = ((k * 131 + frameNo * 0.15 - cam * 0.4) % (LW + 60) + LW + 60) % (LW + 60) - 30, ky = 24 + k * 9 + Math.sin(frameNo / 40 + k) * 4;
    const c = ["#a8186a", "#f2c230", "#2b54a8", "#d9741c"][k];
    if (SPRITES.kite_m) {
      // a long, faint manja string down to a roof somewhere off to the left
      g.globalAlpha = 0.35; g.strokeStyle = P.dark ? "#8f8a96" : "#6f6a78"; g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(kx + 1, ky + 7); g.quadraticCurveTo(kx - 6, ky + 50, kx - 40, ky + 96); g.stroke(); g.globalAlpha = 1;
      if (spr(["kite_m", "kite_y", "kite_b", "kite_o"][k], kx, ky + 10)) continue;
    }
    g.fillStyle = c; g.beginPath(); g.moveTo(kx, ky - 6); g.lineTo(kx + 5, ky); g.lineTo(kx, ky + 6); g.lineTo(kx - 5, ky); g.fill();
    g.strokeStyle = P.dark ? "#8f8a96" : "#6f6a78"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(kx, ky + 6); g.quadraticCurveTo(kx + 6, ky + 14, kx + 2, ky + 22); g.stroke();
  }
  drawCrows(34);
  // near parapet with vents, AC units and a stair door
  R(0, 120, LW, 30, P.parapet); R(0, 120, LW, 3, shade(P.parapet, 0.12));
  for (let px = -(cam % 300); px < LW + 60; px += 300) {
    if (!spr("roof_ac", px + 42, 130)) {
      R(px + 20, 100, 44, 30, P.trim); R(px + 24, 104, 20, 20, shade(P.trim, -0.2));
      g.strokeStyle = P.ol; g.lineWidth = 1; g.beginPath(); const a = frameNo / 6;
      g.moveTo(px + 34 + Math.cos(a) * 8, 114 + Math.sin(a) * 8); g.lineTo(px + 34 - Math.cos(a) * 8, 114 - Math.sin(a) * 8);
      g.moveTo(px + 34 + Math.cos(a + 1.57) * 8, 114 + Math.sin(a + 1.57) * 8); g.lineTo(px + 34 - Math.cos(a + 1.57) * 8, 114 - Math.sin(a + 1.57) * 8); g.stroke();
    }
    if (!sprAt("roof_exit", px + 123, 130, false, 1.7)) { R(px + 100, 84, 46, 46, P.walls[1]); R(px + 112, 98, 20, 32, shade(P.walls[1], -0.3)); R(px + 114, 90, 16, 6, P.T.good); text("EXIT", px + 122, 95, 5, "#fff"); }
    R(px + 206, 104, 8, 26, P.rail); R(px + 202, 100, 16, 5, P.rail);
    // a satellite dish
    if (!spr("roof_dish", px + 182, 124)) { g.fillStyle = P.dark ? "#8f8a96" : "#c9c4cc"; g.beginPath(); g.ellipse(px + 182, 110, 7, 9, -0.4, 0, 7); g.fill(); R(px + 182, 112, 1.5, 9, P.rail); }
  }
  // festival string lights along the parapet
  for (let lx = -(cam % 160); lx < LW + 160; lx += 160) {
    g.strokeStyle = P.dark ? "#4a4550" : "#6f6a78"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(lx, 112); g.quadraticCurveTo(lx + 80, 124, lx + 160, 112); g.stroke();
    for (let b = 1; b < 16; b++) { const t2 = b / 16, bx2 = lx + t2 * 160, by2 = 112 + 24 * t2 * (1 - t2), on = (Math.floor(frameNo / 20) + b) % 3 !== 0;
      const col = ["#f2c230", "#a8186a", "#5cc8c0", "#e2701c"][b % 4]; if (on) { g.globalAlpha = 0.35; R(bx2 - 1.5, by2 - 0.5, 4, 4, col); g.globalAlpha = 1; } R(bx2 - 0.3, by2 + 0.6, 1.8, 2.2, P.ol); R(bx2, by2 + 1, 1.2, 1.6, on ? col : shade(col, -0.5)); }
  }
  // the big poster for Unleash The Avatar, standing on the roof
  const bx = POSTER_X - cam;
  if (bx > -170 && bx < LW + 90) {
    if (SPRITES.poster) {
      // a billboard on two steel legs, the pixelated key art inside a dark frame
      const x0 = Math.round(bx - 56), y0 = 36;
      R(x0 + 14, y0 + 92, 4, 22, P.rail); R(x0 + 94, y0 + 92, 4, 22, P.rail);
      R(x0 - 3, y0 - 3, 118, 96, "#0b0912"); R(x0 - 2, y0 - 2, 116, 1, "#3a2c4a");
      g.drawImage(SPRITES.poster, x0, y0, 112, 90);
      const near = theme() === "roof" && !posterUsed && alivePlayers().some((q) => Math.abs(q.x - POSTER_X) < 46 && q.y < Y0 + 14);
      if (near && frameNo % 90 < 12) { g.globalAlpha = 0.14; R(x0, y0, 112, 90, "#ffd75e"); g.globalAlpha = 1; }
      text("fan art", x0 + 109, y0 + 87, 4, "#cfc6b7", "right", "IBM Plex Sans");
    } else { R(bx - 52, 108, 3, 42, P.rail); R(bx + 49, 108, 3, 42, P.rail); drawAvatarPoster(bx - 58, 40, 116, 70, false); }
  }
  // tar roof
  // the terrace: square tiles in rows that widen towards you, water stains, moss by the parapet
  const tile = P.dark ? "#4a4652" : "#b3a99a", grout = shade(tile, -0.22);
  R(0, 150, LW, LH - 150, tile);
  let ty = 150; for (let r = 0; ty < LH; r++) { const h = 6 + r * 2; R(0, ty, LW, 1, grout); const tw = 14 + r * 3, off = (r % 2) * tw / 2; for (let tx = -((cam * (0.9 + r * 0.03) + off) % tw); tx < LW; tx += tw) R(Math.round(tx), ty, 1, h, grout); ty += h; }
  g.globalAlpha = P.dark ? 0.25 : 0.18; g.fillStyle = P.dark ? "#2a2730" : "#7a7062";
  for (let k = 0; k < 6; k++) { const sx = ((k * 157 + 40 - cam) % (LW + 80) + LW + 80) % (LW + 80) - 40; g.beginPath(); g.ellipse(sx, 166 + (k * 23) % 40, 18 + (k % 3) * 8, 3 + (k % 2) * 2, 0, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  R(0, 150, LW, 2, shade(tile, -0.35)); for (let mx = -(cam % 37); mx < LW; mx += 37) R(mx, 152, 6 + (Math.abs(Math.round(mx + cam)) % 5), 1, P.dark ? "#3a4a34" : "#6a7a4a");   // moss at the foot of the parapet
  for (let px = -(cam % 420) + 260; px < LW + 60; px += 420) {   // a tulsi pot and a broom, and a rope charpai
    R(px, 150, 10, 8, "#9a4a28"); R(px - 1, 149, 12, 2, "#b85c30"); for (let k = 0; k < 7; k++) R(px + (k * 3) % 10, 141 + (k * 5) % 9, 3, 2, k % 2 ? "#3f7a3a" : "#5c9a46");
    g.strokeStyle = "#c9a26a"; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 20, 158); g.lineTo(px + 34, 140); g.stroke(); R(px + 16, 156, 8, 3, "#d9b46a");
  }
}

function drawFactory(P) {
  R(0, 0, LW, LH, P.corr);
  for (let cx = -(cam * 0.9 % 6); cx < LW; cx += 6) R(cx, 0, 2, 150, P.corrLine);
  // high windows
  for (let wx = -(cam * 0.9 % 180); wx < LW; wx += 180) {
    R(wx + 20, 14, 90, 30, P.dark ? "#2a3440" : "#9fb3c0");
    for (let gx = 0; gx <= 90; gx += 15) R(wx + 20 + gx, 14, 2, 30, P.steel);
    R(wx + 20, 28, 90, 2, P.steel);
  }
  // looms on the back wall, shuttles still flying
  for (let lx = -(cam * 0.95 % 140) + 20; lx < LW + 60; lx += 140) {
    const sh = (Math.sin(frameNo / 10 + lx) + 1) / 2;
    if (spr("mill_loom", lx + 28, 115)) R(lx + 15 + sh * 25, 93, 6, 2, "#c9a227");
    else {
      R(lx, 82, 56, 30, P.dark ? "#26252a" : "#5d5a62"); R(lx + 4, 86, 48, 18, ["#a8186a", "#2b54a8", "#d9741c", "#2f6b3a"][Math.abs(Math.floor((lx + cam * 0.95) / 140)) % 4]);
      for (let w = 0; w < 48; w += 3) R(lx + 4 + w, 86, 1, 18, "rgba(255,255,255,0.18)");
      R(lx + 4 + sh * 42, 92, 6, 3, "#c9a227");
    }
    R(lx - 2, 112, 60, 3, P.steel);
  }
  // catwalk
  R(0, 58, LW, 4, P.steel);
  for (let rx = -(cam % 16); rx < LW; rx += 16) R(rx, 46, 1, 12, P.steelHi);
  R(0, 46, LW, 1, P.steelHi);
  // boiler fireboxes with flicker (the mill's steam came from here)
  for (let fx0 = -(cam % 512) + 256 - 40; fx0 < LW + 80; fx0 += 512) {
    const fl = 0.65 + Math.sin(frameNo / 5) * 0.15 + Math.random() * 0.1;
    if (spr("mill_firebox", fx0 + 40, 130)) {
      g.globalAlpha = fl; g.fillStyle = P.amber; g.beginPath(); g.moveTo(fx0 + 30, 112); g.lineTo(fx0 + 30, 105); g.arc(fx0 + 40, 105, 10, Math.PI, 0); g.lineTo(fx0 + 50, 112); g.fill();
      g.fillStyle = P.T.red; g.fillRect(fx0 + 31, 104, 18, 8); g.globalAlpha = 1;
      continue;
    }
    R(fx0, 70, 80, 60, P.steel); R(fx0 + 4, 74, 72, 52, P.steelHi);
    g.fillStyle = P.dark ? "#1a0f0a" : "#2b1a10"; g.beginPath(); g.moveTo(fx0 + 14, 126); g.lineTo(fx0 + 14, 96); g.arc(fx0 + 40, 96, 26, Math.PI, 0); g.lineTo(fx0 + 66, 126); g.fill();
    g.globalAlpha = fl; g.fillStyle = P.amber; g.beginPath(); g.moveTo(fx0 + 20, 126); g.lineTo(fx0 + 20, 102); g.arc(fx0 + 40, 102, 20, Math.PI, 0); g.lineTo(fx0 + 60, 126); g.fill();
    g.fillStyle = P.T.red; g.fillRect(fx0 + 22, 112, 36, 14); g.globalAlpha = 1;
  }
  // mill name painted on the wall
  for (let mx0 = -(cam * 0.9 % 640) + 300; mx0 < LW + 100; mx0 += 640) { R(mx0, 50, 120, 14, P.dark ? "#2a2830" : "#3b3832"); text("CHANDNI MILLS  EST. 1931", mx0 + 60, 60, 7, "#f2c230"); }
  // conveyor carrying bolts of cloth
  R(0, 128, LW, 4, P.steel); R(0, 138, LW, 2, P.steel);
  for (let rx = -((cam + frameNo * 0.8) % 12); rx < LW; rx += 12) { g.fillStyle = P.steelHi; g.beginPath(); g.arc(rx, 134, 3, 0, 7); g.fill(); }
  for (let bx = -((cam + frameNo * 0.8) % 90); bx < LW; bx += 90) { const ci = Math.abs(Math.floor((bx + cam + frameNo * 0.8) / 90)) % 4, cc = ["#a8186a", "#2b54a8", "#d9741c", "#2f6b3a"][ci]; if (spr(["bolt_m", "bolt_b", "bolt_o", "bolt_t"][ci], bx + 12, 129)) continue; R(bx, 116, 22, 12, cc); R(bx, 118, 22, 1, shade(cc, 0.25)); R(bx, 124, 22, 1, shade(cc, -0.25)); g.fillStyle = shade(cc, -0.3); g.beginPath(); g.ellipse(bx + 22, 122, 2, 6, 0, 0, 7); g.fill(); }
  // steel columns and hanging lamps
  for (let cx = -(cam % 160); cx < LW + 20; cx += 160) {
    R(cx, 0, 10, 146, P.steel); R(cx - 2, 0, 14, 3, P.steelHi); R(cx + 4, 0, 2, 146, P.steelHi);
    R(cx + 80, 0, 1, 24, P.rail);
    if (!spr("mill_lamp", cx + 81, 42)) { R(cx + 80, 24, 1, 10, P.rail); R(cx + 74, 34, 14, 5, P.steelHi); }
    if (Math.floor((cx + cam) / 160) % 2) spr("mill_bales", cx + 30, 148);
    g.globalAlpha = P.dark ? 0.12 : 0.07; g.fillStyle = P.lamp; g.beginPath(); g.moveTo(cx + 74, 39); g.lineTo(cx + 88, 39); g.lineTo(cx + 110, 150); g.lineTo(cx + 52, 150); g.fill(); g.globalAlpha = 1;
    const sw = Math.sin(frameNo / 40 + cx) * 3; g.strokeStyle = P.rail; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + 120, 0); g.lineTo(cx + 120 + sw, 52); g.stroke(); R(cx + 117 + sw, 52, 6, 3, P.rail);
  }
  // light falls through the high windows, cotton lint drifting in it
  g.globalAlpha = P.dark ? 0.07 : 0.1; g.fillStyle = "#fff4d6";
  for (let wx = -(cam * 0.9 % 180); wx < LW + 60; wx += 180) { g.beginPath(); g.moveTo(wx + 24, 44); g.lineTo(wx + 104, 44); g.lineTo(wx + 150, 150); g.lineTo(wx + 60, 150); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 40; i++) { const lx2 = ((i * 53 + frameNo * 0.2 * (1 + (i % 3) * 0.3) - cam * 0.9) % LW + LW) % LW, ly2 = 50 + ((i * 37 + Math.sin(frameNo / 50 + i) * 6) % 90); g.globalAlpha = 0.5; R(lx2, ly2, 1, 1, "#fbf8f2"); }
  g.globalAlpha = 1;
  const deskAt = street.desk;   // the office desk, two cups of chai
  if (deskAt) {
    const wx = deskAt - cam;
    if (wx > -60 && wx < LW + 60) {
      R(wx, 136, 34, 4, P.wood); R(wx + 2, 140, 3, 8, shade(P.wood, -0.3)); R(wx + 29, 140, 3, 8, shade(P.wood, -0.3));
      R(wx + 4, 130, 6, 6, "#a5532e"); R(wx + 14, 130, 6, 6, "#a5532e"); g.globalAlpha = 0.5; R(wx + 6 + Math.sin(frameNo / 9), 124, 1, 5, "#ffffff"); g.globalAlpha = 1;
      g.fillStyle = "#d9a441"; g.beginPath(); g.arc(wx + 27, 133, 2.5, 0, 7); g.fill();
      g.fillStyle = "#f7f4ee"; g.beginPath(); g.arc(wx + 17, 74, 8, 0, 7); g.fill(); g.strokeStyle = "#1d1b18"; g.lineWidth = 1; g.stroke();
      g.beginPath(); g.moveTo(wx + 17.5, 74.5); g.lineTo(wx + 16.5, 68); g.moveTo(wx + 17.5, 74.5); g.lineTo(wx + 15.4, 71); g.stroke();
    }
  }
  // floor plates and hazard edge
  R(0, 146, LW, 4, P.amber); for (let hx = -(cam % 12); hx < LW; hx += 12) { g.fillStyle = P.ol; g.beginPath(); g.moveTo(hx, 150); g.lineTo(hx + 6, 146); g.lineTo(hx + 10, 146); g.lineTo(hx + 4, 150); g.fill(); }
  R(0, 150, LW, LH - 150, P.plate);
  for (let px = -(cam % 48); px < LW; px += 48) R(px, 150, 1, LH - 150, shade(P.plate, -0.2));
  for (let py = 170; py < LH; py += 22) R(0, py, LW, 1, shade(P.plate, -0.2));
  for (let dx = -(cam % 8); dx < LW; dx += 8) for (let dy = 154; dy < LH; dy += 8) R(dx + ((dy / 8) % 2) * 4, dy, 2, 1, P.plateDot);
}

/* A fan nod to "Unleash The Avatar", the upcoming game by Aeos Games
   (Bengaluru). Original pixel art: a figure with a glowing chakra and a
   peacock feather, the title and the studio name. */
const POSTER_X = 660;
let posterUsed = false, naniRef = null;
function drawAvatarPoster(x, y, w, h, small) {
  // a faint shimmer on the chakra, only when you stand right under it
  const near = !small && theme() === "roof" && !posterUsed && alivePlayers().some((q) => Math.abs(q.x - POSTER_X) < 46 && q.y < Y0 + 14);
  const glow = near && frameNo % 90 < 12;
  R(x - 1, y - 1, w + 2, h + 2, "#0b0912"); R(x, y, w, h, "#1b1530");
  R(x, y + h * 0.62, w, h * 0.38, "#2a1a3a");
  // the chakra: a spinning ring of spokes behind the figure
  const cx = x + w * 0.5, cy = y + h * 0.42, r = Math.min(w, h) * 0.3, a0 = frameNo / 30;
  g.strokeStyle = glow ? "#ffd75e" : "#d9741c"; g.lineWidth = small ? 1 : 2; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
  g.lineWidth = small ? 0.6 : 1; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = a0 + i * Math.PI / 4; g.moveTo(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.stroke();
  // the figure: a silhouette with a crown and a feather
  const fw = w * 0.16, fh = h * 0.5;
  g.fillStyle = "#33254f"; g.beginPath(); g.moveTo(cx - fw, y + h * 0.86); g.lineTo(cx - fw * 0.6, cy - fh * 0.15); g.lineTo(cx, cy - fh * 0.42); g.lineTo(cx + fw * 0.6, cy - fh * 0.15); g.lineTo(cx + fw, y + h * 0.86); g.fill();
  R(cx - fw * 0.35, cy - fh * 0.62, fw * 0.7, fh * 0.22, "#1a1030");
  R(cx + fw * 0.2, cy - fh * 0.9, Math.max(1, w * 0.02), fh * 0.3, "#1f7a6a"); R(cx + fw * 0.1, cy - fh * 0.95, Math.max(1.5, w * 0.04), Math.max(1.5, w * 0.04), "#2b54a8");
  if (glow) { g.globalAlpha = 0.12; g.fillStyle = "#ffd75e"; g.beginPath(); g.arc(cx, cy, r * 1.15, 0, 7); g.fill(); g.globalAlpha = 1; }
  if (small) { text("UNLEASH", cx, y + h - 8, 4, "#f2c230", "center", "Newsreader"); text("THE AVATAR", cx, y + h - 3, 3.2, "#f2c230", "center", "Newsreader"); return; }
  text("UNLEASH THE AVATAR", cx, y + h - 13, 10, "#f2c230", "center", "Newsreader");
  text("AEOS GAMES", cx, y + h - 4, 5, "#cfc6b7", "center", "IBM Plex Sans");
  text("fan art", x + w - 3, y + 7, 4, "#8a7f9a", "right", "IBM Plex Sans");
}
function drawForeground(P) {
  const th = theme();
  if (th === "roof") { R(0, LH - 9, LW, 9, P.parapet); R(0, LH - 9, LW, 2, shade(P.parapet, 0.15)); for (let bx = -(cam % 24); bx < LW; bx += 24) R(bx, LH - 6, 1, 6, shade(P.parapet, -0.2)); }
  if (th === "trainroof") drawBridge(P);
  if (th === "street" && look().narrow) drawWashing(P);
  else if (th === "street") {
    g.strokeStyle = P.dark ? "rgba(10,9,12,0.85)" : "rgba(29,27,24,0.4)"; g.lineWidth = 0.8;
    for (let wx = -(cam * 1.05 % 220) - 20; wx < LW + 40; wx += 220) {
      for (let w = 0; w < 4; w++) { g.beginPath(); g.moveTo(wx, 6 + w * 3); g.quadraticCurveTo(wx + 110, 22 + w * 4 + Math.sin(frameNo / 60 + w) * 0.8, wx + 220, 8 + w * 2); g.stroke(); }
      R(wx - 1, 0, 3, 30, P.dark ? "#2a2724" : "#4a453f");
    }
    const kx = -(cam * 1.05 % 660) + 400; g.fillStyle = "#a8186a"; g.beginPath(); g.moveTo(kx, 12); g.lineTo(kx + 5, 18); g.lineTo(kx, 24); g.lineTo(kx - 5, 18); g.fill();
    g.strokeStyle = "#f2c230"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(kx, 24); g.quadraticCurveTo(kx + 4, 32 + Math.sin(frameNo / 15) * 2, kx - 2, 40); g.stroke();
  }
  if (th === "subway") for (let px = -(cam * 1.2 % 300); px < LW + 20; px += 300) { R(px, 36, 10, LH, P.dark ? "#2a2b2f" : "#d7d2c9"); R(px + 2, 36, 2, LH, P.dark ? "#34353a" : "#e9e5de"); R(px - 2, 84, 14, 6, P.neon); }
  if (th === "factory") for (let px = -(cam * 1.25 % 360) + 180; px < LW + 20; px += 360) { R(px, 36, 8, LH, P.ol); R(px + 2, 36, 2, LH, P.steel); R(px - 6, 36, 20, 4, P.ol); }
}

/* ---------- the open world: galis, junctions ---------- */
// a house in a gali: a wooden door with a step, barred windows, a little shrine niche, a nameplate
art(["st_outdoor", "st_cement", "st_metal", "st_wood", "st_ladder", "st_spiral"]);
function drawHouseFront(P, x, i, wall) {
  if (((i % 4) + 4) % 4 === 3) spr("st_spiral", x + 126, 150);   // an iron spiral stair up the side of every fourth house
  const dark = shade(wall, -0.25), wood = P.dark ? "#4a3424" : "#7a5233";
  R(x + 50, 104, 28, 46, P.trim); R(x + 53, 107, 22, 43, wood); R(x + 63, 107, 2, 43, shade(wood, -0.25)); R(x + 58, 126, 2, 2, P.amber); R(x + 68, 126, 2, 2, P.amber);
  R(x + 47, 148, 34, 3, shade(P.trim, -0.1));
  for (const wx of [12, 94]) { R(x + wx, 106, 20, 22, P.glass); for (let b = 3; b < 20; b += 4) R(x + wx + b, 106, 1, 22, dark); R(x + wx - 1, 128, 22, 2, P.trim); }
  if (i % 3 === 1) { R(x + 30, 112, 10, 12, dark); R(x + 33, 117, 4, 5, "#e2701c"); if (frameNo % 40 < 30) R(x + 34, 115, 2, 2, "#f2c230"); }   // a diya in a niche
  if (i % 2 === 0) { R(x + 54, 98, 20, 5, P.dark ? "#d8d0c0" : "#f7f4ee"); R(x + 56, 100, 16, 1, P.ol); }   // a nameplate
  // the lit window of someone still awake
  if ((i * 7) % 5 === 0) { g.globalAlpha = P.dark ? 0.25 : 0.1; R(x + 12, 106, 20, 22, P.glassLit); g.globalAlpha = 1; }
}
// the gali's floor: worn flagstones down to a drain channel, no road
function drawGaliFloor(P) {
  R(0, 150, LW, LH - 150, P.side);
  for (let row = 0, y = 150; y < LH; row++, y += 11) {
    R(0, y, LW, 1, P.sideLine);
    for (let sx = -((cam + row * 13) % 26); sx < LW; sx += 26) R(sx, y, 1, 11, P.sideLine);
  }
  R(0, 176, LW, 3, shade(P.side, -0.25)); R(0, 179, LW, 1, P.curb);
  // puddles that catch the light from the windows
  g.globalAlpha = P.dark ? 0.18 : 0.1;
  for (let px = -((cam * 1) % 340) + 90; px < LW + 40; px += 340) { g.fillStyle = P.glassLit; g.beginPath(); g.ellipse(px, 196, 16, 3, 0, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  for (let px = -(cam % 256); px < LW + 40; px += 256) if (!spr("st_garbage", px + 176, 155)) { g.fillStyle = P.dark ? "#1d1c1f" : "#3b3832"; g.beginPath(); g.ellipse(px + 170, 149, 8, 6, 0, 0, 7); g.fill(); }
  drawGaliLife(P);
}
// the gali lived in, drawn in code (cheap): a stone step at every door, tulsi pots and blue water drums by
// the walls, a rangoli by day, and by night a bulb over each door throwing a warm pool on the stones
function drawGaliLife(P) {
  const d = P.dark, stone = d ? "#5a554e" : "#bdb4a4";
  R(0, 157, LW, 2, shade(P.side, -0.35)); for (let gx = -(cam % 40); gx < LW; gx += 40) R(gx, 157, 6, 2, d ? "#2a2724" : "#6a645a");   // the drain channel and its grates
  const first = Math.floor(cam / 128) - 1;
  for (let i = first; i < first + Math.ceil(LW / 128) + 3; i++) {
    const x = Math.round(i * 128 - cam), h = ((i * 37 + 11) % 7 + 7) % 7;
    R(x + 44, 150, 40, 5, stone); R(x + 44, 150, 40, 1, shade(stone, 0.18)); R(x + 44, 154, 40, 1, shade(stone, -0.3));   // the otla
    if (h % 2 === 0) { R(x + 87, 146, 9, 8, "#9a4a28"); R(x + 86, 145, 11, 2, "#b85c30"); for (let k = 0; k < 7; k++) R(x + 87 + (k * 3) % 9, 137 + (k * 5) % 9, 3, 2, k % 2 ? "#3f7a3a" : "#5c9a46"); }   // tulsi in a pot
    if (h % 3 === 1) { R(x + 12, 135, 15, 19, "#245f9e"); R(x + 12, 135, 15, 2, "#3b7fc4"); R(x + 12, 141, 15, 1, "#1a4676"); R(x + 12, 148, 15, 1, "#1a4676"); R(x + 15, 137, 2, 15, "#3b7fc4"); }   // a water drum
    if (!d && h % 3 === 0) { const rx = x + 64, ry = 166, cols = ["#e2701c", "#f2c230", "#c0392b", "#efe6d2"]; for (let k = 0; k < 8; k++) { const a = k * 0.785; R(rx + Math.round(Math.cos(a) * 7), ry + Math.round(Math.sin(a) * 3), 2, 2, cols[k % 4]); } R(rx - 1, ry - 1, 3, 2, "#c0392b"); }   // a rangoli at the step
    if (d) {
      R(x + 62, 99, 4, 3, "#2a2622"); R(x + 63, 102, 2, 2, frameNo % 300 < 4 && h === 3 ? "#8a7a50" : "#ffe9a8");   // the bulb (one of them flickers)
      g.globalAlpha = 0.1; g.fillStyle = "#ffcf7a"; g.beginPath(); g.moveTo(x + 61, 103); g.lineTo(x + 67, 103); g.lineTo(x + 92, 172); g.lineTo(x + 36, 172); g.fill();
      g.globalAlpha = 0.16; g.beginPath(); g.ellipse(x + 64, 170, 26, 5, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    }
  }
}
// washing strung across the gali between the upper windows
function drawWashing(P) {
  for (let wx = -(cam * 1.05 % 260) - 20; wx < LW + 40; wx += 260) {
    g.strokeStyle = P.dark ? "rgba(10,9,12,0.85)" : "rgba(29,27,24,0.45)"; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(wx, 40); g.quadraticCurveTo(wx + 130, 56, wx + 260, 40); g.stroke();
    ["#d9741c", "#a8186a", "#2b54a8", "#f2c230", "#2f6b3a"].forEach((c, k) => {
      const t = (k + 1) / 6, cx = wx + t * 260, cy = 40 + 32 * t * (1 - t) + Math.sin(frameNo / 30 + k) * 0.8;
      R(cx - 5, cy, 10, 13 + (k % 2) * 5, c); R(cx - 5, cy, 10, 1, shade(c, 0.25));
    });
  }
}
// links (stairs, a gangway, a hatch): a green sign on a post with where it goes, and a ring at
// the back of the band when someone stands where Interact will take them
// an iron ladder up the side of a building to the roofs (and its top, hooked over the parapet, up there)
// a godown front: a tin roof edge, barred vents, a hand-painted name board, and a framed rolling shutter
// (every third one rolled up on a lit room of sacks and crates), with jute sacks out front now and then
function drawGodownFront(P, x, i, name) {
  const d = P.dark, tin = d ? "#4a4f55" : "#8a939b", steel = d ? "#3a3d42" : "#7d848b", board = ["#7a2230", "#245a34", "#1f4e8c"][((i % 3) + 3) % 3];
  R(x, 26, 128, 8, tin); for (let rx = 0; rx < 128; rx += 6) R(x + rx, 26, 2, 8, shade(tin, 0.15)); R(x, 33, 128, 2, shade(tin, -0.35));   // the corrugated roof edge
  for (const vx of [18, 94]) { R(x + vx, 42, 16, 10, d ? "#14151a" : "#2a2a30"); for (let b = 2; b < 16; b += 4) R(x + vx + b, 42, 1, 10, steel); }   // barred vents
  const bw = Math.max(54, Math.min(100, name.length * 5 + 14));
  R(x + 64 - bw / 2 - 1, 57, bw + 2, 15, "#1d1b18"); R(x + 64 - bw / 2, 58, bw, 13, board); R(x + 64 - bw / 2, 58, bw, 1, shade(board, 0.25));
  text(name, x + 64, 68, 7, "#f2ead8", "center", "IBM Plex Sans");
  const open = ((i % 3) + 3) % 3 === 0 && clockRuns() && !isNight();
  R(x + 16, 80, 96, 70, steel); R(x + 16, 80, 96, 3, shade(steel, 0.2));   // the frame
  if (open) {
    R(x + 20, 86, 88, 64, d ? "#120f0c" : "#2a2118"); R(x + 20, 83, 88, 6, shade(steel, -0.1)); for (let sy = 83; sy < 89; sy += 2) R(x + 20, sy, 88, 1, shade(steel, -0.3));   // rolled up
    R(x + 62, 89, 4, 3, "#ffe9a8"); g.globalAlpha = 0.22; g.fillStyle = "#ffd98a"; g.beginPath(); g.moveTo(x + 58, 92); g.lineTo(x + 70, 92); g.lineTo(x + 96, 150); g.lineTo(x + 32, 150); g.fill(); g.globalAlpha = 1;   // a bulb inside
    for (const [sx, sy] of [[28, 136], [44, 136], [36, 126], [84, 132], [96, 132], [90, 122]]) { R(x + sx - 7, sy, 14, 14, "#8a6a40"); R(x + sx - 6, sy + 1, 12, 12, "#c9a26a"); R(x + sx - 6, sy + 5, 12, 1, "#a8834a"); }   // sacks
    R(x + 56, 132, 16, 18, "#6a4a2a"); R(x + 56, 132, 16, 2, "#8a6a40"); R(x + 56, 140, 16, 1, "#4a3420");   // a crate
  } else {
    R(x + 20, 84, 88, 66, d ? "#5a5e64" : "#b4bac0");
    for (let sy = 86; sy < 150; sy += 4) { R(x + 20, sy, 88, 1, d ? "#43474c" : "#8d949b"); R(x + 20, sy + 1, 88, 1, d ? "#6a6e74" : "#c8ced4"); }
    R(x + 58, 144, 12, 3, "#2a2a30"); R(x + 62, 140, 5, 6, "#c9a227"); R(x + 63, 138, 3, 3, "#2a2a30");   // the handle and its padlock
    if ((i * 5) % 7 === 2) { g.globalAlpha = 0.5; text("NO PARKING", x + 64, 110, 5, "#c0392b"); g.globalAlpha = 1; }   // stencilled
  }
  if (((i % 4) + 4) % 4 === 1) for (const [sx, sy] of [[118, 140], [124, 140], [121, 132]]) { R(x + sx - 5, sy, 10, 10, "#8a6a40"); R(x + sx - 4, sy + 1, 8, 8, "#c9a26a"); }   // sacks waiting outside
}
function drawLadder(P, x, top) {
  const iron = P.dark ? "#3a3530" : "#4a4038", hi = P.dark ? "#6a6258" : "#8a7e70", y0 = top ? 106 : 30, y1 = 150;
  if (top) { g.strokeStyle = iron; g.lineWidth = 2; for (const dx of [-7, 7]) { g.beginPath(); g.moveTo(x + dx, y1); g.lineTo(x + dx, y0 + 6); g.quadraticCurveTo(x + dx, y0, x + dx + (dx < 0 ? 4 : -4), y0); g.stroke(); } }
  else { R(x - 8, y0, 2, y1 - y0, iron); R(x + 6, y0, 2, y1 - y0, iron); R(x - 8, y0, 1, y1 - y0, hi); R(x + 6, y0, 1, y1 - y0, hi);
    for (let y = y0 + 16; y < y1; y += 28) { R(x - 11, y, 3, 2, iron); R(x + 8, y, 3, 2, iron); }   // brackets into the wall
    g.strokeStyle = iron; g.lineWidth = 1; for (let y = y0 + 4; y < y0 + 40; y += 9) { g.beginPath(); g.arc(x, y, 10, Math.PI * 0.05, Math.PI * 0.95, true); g.stroke(); } }   // the safety hoops at the top
  for (let y = (top ? y0 + 10 : y0 + 4); y < y1 - 2; y += 7) { R(x - 6, y, 12, 1, iron); R(x - 6, y - 1, 12, 1, hi); }   // rungs
}
function drawLinks(P) {
  for (const l of street.links || []) {
    if (!isOpen(l)) continue;
    const x = Math.round(l.x - cam); if (x < -60 || x > LW + 60) continue;
    if (/climb/i.test(l.verb)) { const top = theme() === "roof"; if (top || !spr("st_ladder", x, 150)) drawLadder(P, x, top); }   // the iron ladder (MOSS); its top hooked over the parapet on the roof
    // stairs: on the roof the stair hut is the way down (nothing drawn over it); elsewhere a solid flight with a rail
    // the stairs (MOSS): cement in the records office, steel in Kaal Heights, wood in other rooms, an
    // outdoor flight with a railing in the street; a flight going down faces the other way
    const flight = !/stair/i.test(l.verb) || theme() === "roof" ? null : !street.interior ? "st_outdoor" : /^records/.test(street.id) ? "st_cement" : /^heights|helipad/.test(street.id) ? "st_metal" : "st_wood";
    if (flight && spr(flight, x + (/down/i.test(l.verb) ? -24 : 24), 150, /down/i.test(l.verb))) { /* drawn */ }
    else if (/stair/i.test(l.verb) && theme() !== "roof") {
      const st = P.dark ? "#5a5550" : "#9a9088", up = /down/i.test(l.verb) ? -1 : 1;
      for (let k = 0; k < 8; k++) { const sx = x - 14 + k * 4 * up, sy = 150 - (k + 1) * 11; R(sx, sy, 20, 11 * (k + 1), shade(st, -0.08 * (k % 2))); R(sx, sy, 20, 1, shade(st, 0.2)); }
      g.strokeStyle = P.dark ? "#3a3530" : "#4a4038"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 12, 140); g.lineTo(x - 12 + 28 * up, 52); g.stroke();
    }
    const label = l.sign || WORLD.streets[l.to].name;
    g.font = "bold 6px 'IBM Plex Sans', sans-serif"; const w = Math.ceil(g.measureText(label).width) + 12, sx = x + 26;
    R(sx - 1, 112, 2, 40, P.dark ? "#4a4540" : "#5d5852");
    R(sx - w / 2, 102, w, 11, "#245a34"); R(sx - w / 2 + 1, 103, w - 2, 9, "#2f6b3a");
    text(label, sx, 110, 6, "#ffffff", "center", "IBM Plex Sans");
    const here = alivePlayers().some((p) => Math.abs(p.x - l.x) < 18);
    g.globalAlpha = here ? 0.55 + 0.35 * Math.sin(frameNo / 8) : 0.22; g.fillStyle = "#f2c230";
    for (const k of [0, 5]) { g.beginPath(); g.moveTo(x - 6, Y0 + 8 - k); g.lineTo(x, Y0 + 4 - k); g.lineTo(x + 6, Y0 + 8 - k); g.lineTo(x + 6, Y0 + 10 - k); g.lineTo(x, Y0 + 6 - k); g.lineTo(x - 6, Y0 + 10 - k); g.fill(); }
    g.globalAlpha = 1;
  }
}
// junctions: the mouth of an alley (or a market gate) at the back, a blue street sign with an
// arrow, and a chevron on the ground when someone stands where pushing up or down will turn
// every door you can go through gets the same cue, so the open ones stand out from the painted ones:
// a lamp over it, light spilling onto the pavement, a mat at the step, and the chevron when you're close;
// a door that isn't open yet (story, or after hours) gets a small padlock instead
function drawDoorCues(P) {
  if (street.interior || street.water) return;
  for (const d of street.doors || []) {
    const x = Math.round(d.x - cam); if (x < -40 || x > LW + 40) continue;
    if (!isOpen(d)) { R(x - 3, 132, 7, 6, "#c9a227"); R(x - 2, 128, 5, 5, "#1d1b18"); R(x - 1, 129, 3, 4, P.dark ? "#3a3632" : "#cfc6b7"); R(x - 3, 132, 7, 6, "#c9a227"); R(x, 134, 1, 2, "#1d1b18"); continue; }
    const here = !arena && alivePlayers().some((p) => Math.abs(p.x - d.x) < 22);
    R(x - 2, 101, 5, 2, P.ol); R(x - 1, 103, 3, 1, "#ffe9a8");   // the lamp, on the door frame (below the shop signs)
    g.globalAlpha = (P.dark ? 0.2 : 0.09) + (here ? 0.08 : 0); g.fillStyle = "#ffd98a"; g.beginPath(); g.moveTo(x - 12, 150); g.lineTo(x + 12, 150); g.lineTo(x + 24, 166); g.lineTo(x - 24, 166); g.fill(); g.globalAlpha = 1;
    R(x - 11, 150, 22, 3, P.dark ? "#6a3a2a" : "#a8553a"); R(x - 11, 151, 22, 1, P.dark ? "#7a4a32" : "#c0693e");   // the mat
    g.globalAlpha = here ? 0.55 + 0.35 * Math.sin(frameNo / 8) : 0.22; g.fillStyle = "#f2c230";
    for (const k of [0, 5]) { g.beginPath(); g.moveTo(x - 6, Y0 + 8 - k); g.lineTo(x, Y0 + 4 - k); g.lineTo(x + 6, Y0 + 8 - k); g.lineTo(x + 6, Y0 + 10 - k); g.lineTo(x, Y0 + 6 - k); g.lineTo(x - 6, Y0 + 10 - k); g.fill(); }
    g.globalAlpha = 1;
  }
}
function drawJunctions(P) {
  for (const j of street.junctions || []) {
    const x = Math.round(j.x - cam); if (x < -90 || x > LW + 90) continue;
    if (j.dir === "up" && j.gate) {
      const c = P.trim, hi = shade(P.trim, 0.15);
      R(x - 34, 60, 68, 90, P.dark ? "#0d0c0f" : "#3b3832");
      g.globalAlpha = P.dark ? 0.5 : 0.3; R(x - 34, 120, 68, 30, P.far); g.globalAlpha = 1;
      R(x - 44, 56, 10, 94, c); R(x + 34, 56, 10, 94, c); R(x - 48, 44, 96, 13, c); R(x - 48, 44, 96, 2, hi);
      text(j.gate, x, 53, 7, P.amber);
      for (let k = 0; k < 7; k++) R(x - 30 + k * 10, 57, 2, 3 + (k % 2) * 2, "#e2701c");   // marigolds on the arch
    } else if (j.dir === "up" && SPRITES[P.dark ? "gali_n" : "gali_d"]) {
      // the gali itself (MOSS): walls going away, washing across, a light at the far end; and the
      // paving leading into it off the pavement, so it reads as somewhere you can go
      R(x - 26, 30, 52, 120, "#1d1b18");
      g.drawImage(SPRITES[P.dark ? "gali_n" : "gali_d"], x - 25, 32, 50, 118);
      R(x - 27, 30, 2, 120, P.trim); R(x + 25, 30, 2, 120, P.trim); R(x - 27, 30, 54, 2, shade(P.trim, -0.2));
      g.fillStyle = P.dark ? "rgba(140,128,110,0.35)" : "rgba(214,200,176,0.7)"; g.beginPath(); g.moveTo(x - 25, 150); g.lineTo(x + 25, 150); g.lineTo(x + 32, 160); g.lineTo(x - 32, 160); g.fill();
    } else if (j.dir === "up") {
      R(x - 20, 36, 40, 114, P.dark ? "#0d0c0f" : "#3b3832");
      R(x - 20, 36, 40, 2, shade(P.trim, -0.2)); R(x - 21, 36, 1, 114, P.trim); R(x + 20, 36, 1, 114, P.trim);
      for (let wy = 50; wy < 130; wy += 22) { R(x - 14, wy, 5, 6, P.dark ? "#2a2730" : "#5a5560"); if ((wy + j.x) % 3 === 0) R(x + 8, wy + 6, 5, 6, P.glassLit); }
      R(x - 2, 96, 4, 3, P.lamp); g.globalAlpha = P.dark ? 0.18 : 0.08; g.fillStyle = P.lamp; g.beginPath(); g.arc(x, 98, 12, 0, 7); g.fill(); g.globalAlpha = 1;
    }
    // the street sign: white on municipal blue, with the arrow
    const sx = j.dir === "up" ? x + (j.gate ? 56 : 30) : x;
    R(sx - 1, 112, 2, 40, P.dark ? "#4a4540" : "#5d5852");
    g.font = "bold 6px 'IBM Plex Sans', sans-serif"; const w = Math.ceil(g.measureText(j.label).width) + 16;
    R(sx - w / 2, 102, w, 11, "#1f4e8c"); R(sx - w / 2 + 1, 103, w - 2, 9, "#24599f"); R(sx - w / 2, 112, w, 1, "#163a69");
    text((j.dir === "up" ? "\u2191 " : "\u2193 ") + j.label, sx, 110, 6, "#ffffff", "center", "IBM Plex Sans");
    // the chevron: at the back of the band for an alley, at the front for a turn towards the viewer
    const here = !arena && alivePlayers().some((p) => Math.abs(p.x - j.x) < JUNCTION_W);
    g.globalAlpha = here ? 0.55 + 0.35 * Math.sin(frameNo / 8) : 0.18; g.fillStyle = P.T.accent;
    const cy = j.dir === "up" ? Y0 + 2 : Y1 - 3, d = j.dir === "up" ? -1 : 1;
    for (const k of [0, 5]) { g.beginPath(); g.moveTo(x - 8, cy + k * d); g.lineTo(x, cy + (k + 4) * d); g.lineTo(x + 8, cy + k * d); g.lineTo(x + 8, cy + (k + 2) * d); g.lineTo(x, cy + (k + 6) * d); g.lineTo(x - 8, cy + (k + 2) * d); g.fill(); }
    g.globalAlpha = 1;
  }
}

/* ---------- interiors ---------- */
// Nani's dhaba: a counter with the kettle on the stove, a chalk menu, tables, the clock stopped at
// 11:58, an old photo and the Lane Committee board; the glass door back to the lane on the right.
// The room is 384 wide; a wider view simply shows more wall.
function drawDhaba(P) {
  const x0 = Math.round(-cam), d = P.dark;
  const wall = d ? "#4a3a2c" : "#e8d2b0", low = shade(wall, -0.14), wood = d ? "#5a3a24" : "#8a5d3b", steel = d ? "#9aa0a6" : "#c9ced4";
  const tile = d ? "#5a2a22" : "#b5523b", tile2 = shade(tile, -0.2);
  R(0, 0, LW, LH, wall); R(0, 0, LW, 18, d ? "#2a221c" : "#cdb48e"); R(0, 18, LW, 2, shade(wall, -0.3));
  R(0, 96, LW, 54, low); R(0, 95, LW, 2, shade(wall, -0.3));
  // floor: red oxide tiles
  R(0, 150, LW, LH - 150, tile);
  for (let y = 150, r = 0; y < LH; y += 11, r++) { R(0, y, LW, 1, tile2); for (let tx = ((x0 + r * 9) % 18 + 18) % 18 - 18; tx < LW; tx += 18) R(tx, y, 1, 11, tile2); }
  R(0, 150, LW, 2, shade(tile, -0.35));
  // tubelight and a slow ceiling fan
  R(x0 + 160, 22, 64, 3, P.lamp); g.globalAlpha = d ? 0.14 : 0.07; g.fillStyle = P.lamp; g.beginPath(); g.ellipse(x0 + 192, 30, 90, 22, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  R(x0 + 99, 18, 2, 8, P.ol); g.strokeStyle = d ? "#2a2724" : "#4a453f"; g.lineWidth = 2;
  for (let k = 0; k < 3; k++) { const a = frameNo / 14 + k * 2.094; g.beginPath(); g.moveTo(x0 + 100, 27); g.lineTo(x0 + 100 + Math.cos(a) * 22, 27 + Math.sin(a) * 3); g.stroke(); }
  // the back room, behind a flowered curtain: where you sleep once the clock runs
  R(x0 + 4, 30, 44, 78, P.trim); R(x0 + 7, 33, 38, 75, d ? "#7a2a3a" : "#c84a5a"); for (let k = 0; k < 5; k++) { R(x0 + 9 + k * 8, 33, 1, 75, d ? "#5a1e2a" : "#a83a4a"); R(x0 + 11 + k * 8, 44 + (k % 2) * 20, 3, 3, "#f2c230"); }
  // chalk menu over the counter
  R(x0 + 30, 34, 86, 46, wood); R(x0 + 33, 37, 80, 40, "#1f2b24");
  text("CHAI    5", x0 + 40, 50, 6, "#e9e4d8", "left"); text("SAMOSA 10", x0 + 40, 60, 6, "#e9e4d8", "left"); text("BUN MASKA 8", x0 + 40, 70, 6, "#e9e4d8", "left");
  // the clock, stopped at 11:58 like every clock on the lane tonight
  const cx = x0 + 170, cy = 52;
  g.fillStyle = d ? "#d8d0c0" : "#fbf8f2"; g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.fill(); g.strokeStyle = P.ol; g.lineWidth = 1.5; g.stroke();
  g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 1, cy - 6); g.moveTo(cx, cy); g.lineTo(cx - 2, cy - 8.5); g.stroke();
  // an old photo with a marigold garland
  R(x0 + 280, 40, 20, 24, wood); R(x0 + 282, 42, 16, 20, d ? "#8a7a62" : "#c9b48e"); R(x0 + 286, 46, 4, 6, "#5a4a36"); R(x0 + 291, 47, 4, 6, "#5a4a36");
  for (let k = 0; k < 7; k++) R(x0 + 279 + k * 3.4, 63 + Math.sin(k / 6 * Math.PI) * 4, 2, 2, k % 2 ? "#f2a91a" : "#e2701c");
  // the Lane Committee board: cork, a header, pinned papers (empty for now)
  R(x0 + 204, 42, 64, 44, wood); R(x0 + 206, 44, 60, 40, d ? "#8a6a44" : "#c8a070");
  text("LANE COMMITTEE", x0 + 236, 52, 5, d ? "#2a1e12" : "#3b2a18");
  for (const [px, py, w, h] of [[212, 56, 16, 20], [232, 58, 14, 14], [250, 56, 12, 22]]) { R(x0 + px, py, w, h, d ? "#d8d0c0" : "#fbf8f2"); R(x0 + px + w / 2 - 1, py - 1, 2, 2, "#c0392b"); for (let l = 4; l < h - 2; l += 3) R(x0 + px + 2, py + l, w - 4, 1, d ? "#9a9488" : "#bdb6aa"); }
  // the counter, the stove and the kettle, jars of biscuits
  R(x0 + 16, 108, 140, 5, steel); R(x0 + 20, 113, 132, 37, wood); for (let k = 0; k < 4; k++) R(x0 + 26 + k * 32, 118, 26, 26, shade(wood, -0.15));
  R(x0 + 46, 102, 30, 6, d ? "#2a2724" : "#3b3832");
  if (frameNo % 6 < 4) { R(x0 + 52, 100, 3, 2, "#4a7bd8"); R(x0 + 64, 100, 3, 2, "#4a7bd8"); }
  if (!spr("dhaba_kettle", x0 + 61, 102)) { R(x0 + 54, 90, 16, 12, steel); R(x0 + 69, 93, 5, 2, steel); }
  g.globalAlpha = 0.5; R(x0 + 60 + Math.sin(frameNo / 9), 80, 1, 6, "#ffffff"); R(x0 + 63 + Math.sin(frameNo / 7), 74, 1, 5, "#ffffff"); g.globalAlpha = 1;
  for (let k = 0; k < 3; k++) { R(x0 + 96 + k * 14, 96, 10, 12, d ? "#7a8a8c" : "#b9d0d0"); R(x0 + 96 + k * 14, 94, 10, 2, "#c0392b"); R(x0 + 98 + k * 14, 100, 6, 6, "#d9a441"); }
  // tables and chairs along the back of the floor
  for (const tx of [150, 268]) {
    if (!sprAt("dhaba_table", x0 + tx, 158, false, 1.6)) { R(x0 + tx - 11, 145, 22, 3, wood); R(x0 + tx - 10, 148, 2, 10, shade(wood, -0.3)); R(x0 + tx + 8, 148, 2, 10, shade(wood, -0.3)); }
    sprAt("dhaba_chairs", x0 + tx + 26, 158, false, 1.25);
  }
  // the glass door to the lane: night outside, a little neon
  R(x0 + 334, 66, 36, 86, P.trim); R(x0 + 338, 70, 28, 80, d ? "#141822" : "#5d6b78");
  R(x0 + 340, 120, 24, 2, P.neon); g.globalAlpha = 0.25; R(x0 + 340, 74, 8, 70, "#ffffff"); g.globalAlpha = 1; R(x0 + 360, 108, 2, 6, P.amber);
  // beyond the room (a wide screen): the side walls
  if (x0 > 0) { R(x0 - 6, 0, 6, LH, shade(wall, -0.35)); }
  if (x0 + 384 < LW) { R(x0 + 384, 0, 6, LH, shade(wall, -0.35)); }
  drawCup(P);   // the street cup, once Chandni XI have won it
}

/* ---------- the Harbour Line ---------- */
// Bunder Road terminus: a stone facade three buildings wide, a clock tower stopped at 11:58, an
// arched entrance lit from inside, and the name in brass
function drawStationFront(P, x) {
  if (x < -400 || x > LW + 20) return;
  const stone = P.dark ? "#5a5248" : "#d8c9ae", dk = shade(stone, -0.22), hi = shade(stone, 0.12);
  R(x, 30, 384, 120, stone); R(x, 30, 384, 3, hi); R(x, 60, 384, 2, dk); R(x, 100, 384, 2, dk);
  R(x + 160, 0, 64, 32, stone); R(x + 156, 0, 72, 3, hi); R(x + 170, -4, 44, 6, dk);
  const cx = x + 192, cy = 16;   // the clock
  g.fillStyle = P.dark ? "#e9e2c8" : "#fbf8f2"; g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.fill(); g.strokeStyle = P.ol; g.lineWidth = 1.5; g.stroke();
  g.lineWidth = 1.3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 1, cy - 7); g.moveTo(cx, cy); g.lineTo(cx - 2.5, cy - 9.5); g.stroke();
  R(x + 60, 40, 264, 16, P.dark ? "#2a2520" : "#3b3226"); text("BUNDER ROAD", cx, 52, 11, "#d9a441", "center", "Newsreader");
  text("HARBOUR LINE \u00b7 1887", cx, 70, 6, dk, "center", "IBM Plex Mono");
  // arched windows either side, a few still lit
  for (const wx of [20, 76, 268, 324]) { R(x + wx, 76, 36, 22, P.dark ? "#1e2a2c" : "#9fb0ae"); g.fillStyle = P.dark ? "#1e2a2c" : "#9fb0ae"; g.beginPath(); g.arc(x + wx + 18, 76, 18, Math.PI, 0); g.fill(); if ((wx / 4) % 3 === 1) { g.globalAlpha = 0.5; R(x + wx + 2, 80, 32, 16, P.glassLit); g.globalAlpha = 1; } }
  for (const wx of [20, 76, 268, 324]) R(x + wx - 2, 98, 40, 3, hi);
  // the entrance: an arch, a lit hall inside, ticket windows
  g.fillStyle = dk; g.beginPath(); g.arc(cx, 96, 44, Math.PI, 0); g.fill(); R(cx - 44, 96, 88, 54, dk);
  // inside the arch: the lit concourse, deeper and warmer at the back, so it reads as a way in
  const hall = P.dark ? "#8a6232" : "#f3dfb2", hall2 = P.dark ? "#5a3e20" : "#d9bf8c";
  g.fillStyle = hall; g.beginPath(); g.arc(cx, 98, 38, Math.PI, 0); g.fill(); R(cx - 38, 98, 76, 52, hall);
  R(cx - 38, 128, 76, 22, hall2); for (const px of [-26, 22]) { R(cx + px, 92, 4, 36, shade(hall2, -0.2)); }   // the far wall and two pillars
  R(cx - 22, 74, 44, 12, "#141210"); for (let k = 0; k < 9; k++) if ((k * 7 + Math.floor(frameNo / 40)) % 4) R(cx - 19 + k * 4.5, 77 + (k % 2) * 4, 3, 2, "#f2a33a");   // the departure board
  text("TRAINS", cx, 92, 5, P.dark ? "#2a1d10" : "#6a4a2a", "center", "IBM Plex Mono");
  for (let k = 0; k < 3; k++) { R(cx - 30 + k * 22, 108, 16, 14, P.dark ? "#3a2614" : "#8a6a44"); R(cx - 28 + k * 22, 110, 12, 7, P.dark ? "#ffd98a" : P.lamp); }   // ticket windows, lit
  for (let k = 0; k < 3; k++) R(cx - 44 - k * 3, 141 + k * 3, 88 + k * 6, 3, k % 2 ? dk : hi);   // the steps down to the pavement
  R(cx - 1, 56, 2, 6, P.ol); R(cx - 4, 62, 8, 4, P.ol); R(cx - 3, 63, 6, 2, "#ffe9a8");   // the lamp over the arch
  g.globalAlpha = P.dark ? 0.16 : 0.06; g.fillStyle = "#ffd98a"; g.beginPath(); g.moveTo(cx - 30, 150); g.lineTo(cx + 30, 150); g.lineTo(cx + 54, 176); g.lineTo(cx - 54, 176); g.fill(); g.globalAlpha = 1;   // light spilling out
  // a lamp post either side of the steps
  for (const lx of [cx - 62, cx + 62]) { R(lx - 1, 112, 3, 38, P.ol); R(lx - 4, 108, 9, 5, P.ol); R(lx - 3, 109, 7, 3, P.lamp); }
}
// inside the last train: benches along the back, windows on the city streaming past, handles
// swinging from the rail, and the gangway doors between carriages
function drawTrain(P) {
  const d = P.dark, wall = d ? "#3d4a52" : "#8fa0aa", wall2 = shade(wall, -0.18), lit = d ? "#1a2026" : "#2a3440";
  R(0, 0, LW, LH, wall);
  // outside the windows: the night city at speed
  R(0, 40, LW, 56, lit);
  for (let k = 0; k < 26; k++) { const sx = ((k * 83 - frameNo * (5 + (k % 3) * 3)) % (LW + 60) + LW + 60) % (LW + 60) - 30; R(sx, 44 + (k * 13) % 46, 10 + (k % 4) * 6, 1, k % 3 ? "#e8c39a" : "#f7f4ee"); }
  // the wall between the windows (the windows travel with the carriage)
  for (let wx = -((cam % 64) + 64) % 64 - 64; wx < LW + 64; wx += 64) { R(wx, 40, 14, 56, wall); R(wx + 14, 40, 1, 56, wall2); R(wx + 63, 40, 1, 56, wall2); }
  R(0, 36, LW, 4, wall2); R(0, 96, LW, 4, wall2);
  R(0, 0, LW, 18, d ? "#262d33" : "#c8d0d4"); for (let lx = -(cam % 96) + 30; lx < LW; lx += 96) { R(lx, 18, 30, 3, frameNo % 97 < 3 ? wall2 : P.lamp); }
  R(0, 26, LW, 1, P.rail);   // the grab rail, and its handles swaying
  for (let hx = -(cam % 32) + 8; hx < LW; hx += 32) { const sw = Math.sin(frameNo / 14 + hx) * 1.5; g.strokeStyle = P.rail; g.lineWidth = 1; g.beginPath(); g.moveTo(hx, 26); g.lineTo(hx + sw, 32); g.stroke(); g.beginPath(); g.ellipse(hx + sw, 34, 2, 2.5, 0, 0, 7); g.stroke(); }
  // benches, the floor and the carriage ends
  R(0, 112, LW, 30, d ? "#2b4a6a" : "#5b7fa6"); R(0, 110, LW, 3, shade(d ? "#2b4a6a" : "#5b7fa6", 0.2)); for (let bx = -(cam % 48); bx < LW; bx += 48) R(bx, 112, 1, 30, shade(d ? "#2b4a6a" : "#5b7fa6", -0.3));
  R(0, 142, LW, 8, wall2); R(0, 150, LW, LH - 150, d ? "#2c2d31" : "#7a7f86");
  for (let fx0 = -(cam % 10); fx0 < LW; fx0 += 10) R(fx0, 150, 1, LH - 150, d ? "#26272b" : "#6e737a");
  for (const ex of [0, 500, 1000, 1500]) { const x = ex - cam; if (x < -30 || x > LW + 30) continue; R(x - 10, 18, 20, 132, d ? "#1d2226" : "#4a5560"); R(x - 6, 30, 12, 110, d ? "#0f1214" : "#2a3138"); R(x - 1, 70, 2, 10, P.amber); }
}
// on the roof: the city tearing past below, catenary poles and wires flicking by, the coach roofs
function drawTrainRoof(P) {
  R(0, 0, LW, LH, P.sky); stars(P, 50, 70);
  g.fillStyle = P.dark ? "#3a3440" : "#f6eff3"; g.beginPath(); g.arc(LW * 0.7, 26, 10, 0, 7); g.fill();
  const camWas = cam; cam = frameNo * 2.2; skyline(P, 1, 140, 40); cam = camWas;
  for (let k = 0; k < 16; k++) { const sx = ((k * 61 - frameNo * 6) % (LW + 40) + LW + 40) % (LW + 40) - 20; R(sx, 118 + (k * 7) % 22, 6 + (k % 3) * 4, 1, P.farWin); }
  R(0, 30, LW, 1, P.dark ? "#56504a" : "#4a453f");   // the overhead wire
  for (let px = -((frameNo * 7) % 180); px < LW + 20; px += 180) { R(px, 24, 3, 126, P.dark ? "#4a4540" : "#5d5852"); R(px - 8, 26, 30, 2, P.dark ? "#4a4540" : "#5d5852"); }
  // the coaches: a curved roof, ventilators, the gap between coaches
  const roof = P.dark ? "#6b7078" : "#a8aeb6";
  R(0, 152, LW, LH - 152, shade(roof, -0.15)); R(0, 148, LW, 6, roof); R(0, 148, LW, 1, shade(roof, 0.25));
  for (let vx = -(cam % 120) + 40; vx < LW; vx += 120) { R(vx, 142, 22, 8, shade(roof, -0.05)); R(vx + 2, 140, 18, 2, shade(roof, 0.15)); }
  for (const gx of [430, 860]) { const x = gx - cam; if (x > -20 && x < LW + 20) { R(x - 3, 148, 6, LH - 148, P.dark ? "#141216" : "#3b3832"); R(x - 8, 160, 16, 3, P.rail); } }
  for (let lx = -(cam % 12); lx < LW; lx += 12) R(lx, 180, 1, LH - 180, shade(roof, -0.25));
}
// a bridge coming at the train: a red signal first, then the girder sweeps past at head height
function drawBridge(P) {
  if (!bridge) return;
  if (bridge.warn > 0) {
    if (frameNo % 16 < 10) { R(LW - 34, 40, 26, 14, "rgba(14,13,12,0.8)"); g.fillStyle = "#ff3b30"; g.beginPath(); g.arc(LW - 21, 47, 4, 0, 7); g.fill(); }
    text("BRIDGE", LW - 21, 66, 7, "#ff7b72", "center", "IBM Plex Sans");
    return;
  }
  const x = Math.round(bridge.x - cam);
  R(x - 40, 0, 80, 106, P.dark ? "#26292d" : "#4e5258"); R(x - 40, 100, 80, 14, P.dark ? "#1b1d20" : "#3b3e43");
  for (let k = 0; k < 7; k++) { R(x - 36 + k * 12, 0, 2, 100, P.dark ? "#3a3e44" : "#6a6f76"); }
  for (let ry = 8; ry < 100; ry += 18) R(x - 40, ry, 80, 2, P.dark ? "#3a3e44" : "#6a6f76");
  for (let k = 0; k < 9; k++) R(x - 38 + k * 9, 106, 2, 2, "#8a8278");
}

// a gap between roofs: the lane far below (lamps, a lit window), the cut edges of the parapet,
// and a kite wire strung over the widest, from bamboo pole to bamboo pole
function drawGaps(P) {
  for (const [a, b] of street.gaps) {
    const x0 = Math.round(a - cam), x1 = Math.round(b - cam); if (x1 < -10 || x0 > LW + 10) continue;
    R(x0, 118, x1 - x0, LH - 118, P.dark ? "#0b0a0d" : "#3b3832");
    R(x0, 200, x1 - x0, 16, P.dark ? "#1d1a20" : "#55505a");
    for (let lx = x0 + 6; lx < x1 - 4; lx += 22) { g.globalAlpha = 0.5; R(lx, 206, 2, 2, P.lamp); g.globalAlpha = 1; }
    if (x1 - x0 > 80) { R(x0 + 20, 150, 10, 8, P.glassLit); R(x1 - 40, 170, 8, 6, P.glassLit); }
    R(x0 - 3, 118, 3, LH - 118, shade(P.parapet, -0.3)); R(x1, 118, 3, LH - 118, shade(P.parapet, -0.3));
    R(x0 - 3, 150, 3, LH - 150, shade(P.tar, -0.35)); R(x1, 150, 3, LH - 150, shade(P.tar, -0.35));
  }
  for (const w of street.wires || []) {
    const x0 = Math.round(w.x0 - cam), x1 = Math.round(w.x1 - cam); if (x1 < -20 || x0 > LW + 20) continue;
    for (const px of [x0, x1]) { R(px - 1, 96, 3, 56, "#c9a227"); R(px - 2, 94, 5, 3, "#9a7a1a"); }
    g.strokeStyle = P.dark ? "#cfc6b7" : "#4a453f"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0, 98); g.quadraticCurveTo((x0 + x1) / 2, 110, x1, 98); g.stroke();
    for (const [kx, c] of [[0.3, "#a8186a"], [0.62, "#f2c230"]]) { const x = x0 + (x1 - x0) * kx, y = 98 + 12 * 4 * kx * (1 - kx) * 0.25 + 2; g.fillStyle = c; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 5); g.lineTo(x, y + 10); g.lineTo(x - 4, y + 5); g.fill(); }
  }
}

/* ---------- the river ---------- */
// the far bank: the mill, its chimney smoking, lit windows, and the river catching the light
function drawFarBank(P, y0, near) {
  R(0, 0, LW, LH, P.sky); stars(P, 50, 60);
  g.fillStyle = P.dark ? "#3a3440" : "#f6eff3"; g.beginPath(); g.arc(LW * 0.25, 24, 10, 0, 7); g.fill();
  const camWas = cam; cam = camWas * 0.2 + (near ? frameNo * 0.3 : 0); skyline(P, 1, y0 - 6, 18); cam = camWas;
  const mx = Math.round(LW * 0.62 - cam * 0.25 + (near ? 0 : 0)), base = y0 - 4, mill = P.dark ? "#2a2530" : "#8f8496";
  R(mx - 70, base - 46, 140, 46, mill); R(mx - 70, base - 50, 140, 4, shade(mill, 0.1)); for (let k = 0; k < 6; k++) R(mx - 62 + k * 22, base - 38, 10, 12, frameNo % 120 < 100 || k % 2 ? P.glassLit : mill);
  R(mx + 40, base - 110, 14, 64, mill); R(mx + 38, base - 112, 18, 4, shade(mill, 0.1));
  for (let k = 0; k < 5; k++) { const t = (frameNo * 0.4 + k * 30) % 150; g.globalAlpha = 0.25 * (1 - t / 150); g.fillStyle = P.dark ? "#8f8a96" : "#d8d0c0"; g.beginPath(); g.arc(mx + 47 + t * 0.4, base - 116 - t * 0.5, 4 + t * 0.08, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  // the water: dark, with long reflections that move
  R(0, y0, LW, 150 - y0, P.dark ? "#121a24" : "#5a7488");
  for (let k = 0; k < 30; k++) { const wx = ((k * 71 - frameNo * (0.4 + (k % 3) * 0.2) - cam * 0.6) % (LW + 40) + LW + 40) % (LW + 40) - 20; R(wx, y0 + 4 + (k * 11) % (146 - y0), 8 + (k % 4) * 5, 1, k % 4 ? (P.dark ? "#2a3a4c" : "#7d97ab") : P.glassLit); }
}
// Mandi Ghat: stone steps down to the water, a lamp, a small shrine, the ferry tied up
function drawGhat(P) {
  if (!backdrop("river", 134)) drawFarBank(P, 104, false);
  const stone = P.dark ? "#4a4440" : "#c8b8a0";
  for (let k = 0; k < 4; k++) { const y = 132 + k * 5; R(0, y, LW, 5, shade(stone, -0.06 * (3 - k))); R(0, y, LW, 1, shade(stone, 0.12)); }
  R(0, 150, LW, LH - 150, stone); for (let sx = -(cam % 40); sx < LW; sx += 40) R(sx, 150, 1, LH - 150, shade(stone, -0.15)); for (let y = 162; y < LH; y += 14) R(0, y, LW, 1, shade(stone, -0.12));
  // the ferry, tied up by the last step
  const fx0 = Math.round(720 - cam);
  if (fx0 > -140 && fx0 < LW + 140) { R(fx0 - 70, 116, 140, 18, P.dark ? "#5a3a24" : "#8a5d3b"); R(fx0 - 74, 112, 148, 5, P.dark ? "#d8d0c0" : "#f7f4ee"); R(fx0 - 30, 92, 50, 20, P.dark ? "#3d4a52" : "#8fa0aa"); R(fx0 - 26, 96, 12, 8, P.glassLit); R(fx0 - 8, 96, 12, 8, P.glassLit); text("FERRY", fx0, 128, 6, "#f2c230"); }
  for (const lx of [260, 600]) { const x = Math.round(lx - cam); if (x < -20 || x > LW + 20) continue; R(x - 1, 96, 3, 54, P.ol); R(x - 5, 92, 11, 5, P.ol); R(x - 4, 93, 9, 3, P.lamp); g.globalAlpha = P.dark ? 0.15 : 0.06; g.fillStyle = P.lamp; g.beginPath(); g.ellipse(x, 160, 30, 8, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
  const sh = Math.round(430 - cam); if (sh > -30 && sh < LW + 30) { R(sh - 10, 120, 20, 30, P.dark ? "#7a3a2a" : "#c8603a"); R(sh - 12, 116, 24, 5, P.dark ? "#9a4a32" : "#e2701c"); R(sh - 3, 132, 6, 8, "#f2c230"); if (frameNo % 40 < 28) R(sh - 1, 128, 2, 3, "#ffd75e"); }
}
// the night ferry's deck: planks, a cabin, railings; the far bank drifts by and the boat rocks
function drawFerry(P) {
  const rock = Math.round(Math.sin(frameNo / 40) * 2);
  g.save(); g.translate(0, rock);
  drawFarBank(P, 96, true);
  R(0, 128, LW, 4, P.dark ? "#d8d0c0" : "#f7f4ee"); for (let px = -(cam % 24); px < LW; px += 24) R(px, 128, 2, 22, P.dark ? "#d8d0c0" : "#f7f4ee"); R(0, 140, LW, 1, P.dark ? "#d8d0c0" : "#f7f4ee");
  const cab = Math.round(300 - cam); R(cab - 60, 86, 120, 64, P.dark ? "#3d4a52" : "#8fa0aa"); R(cab - 64, 82, 128, 6, P.dark ? "#5a3a24" : "#8a5d3b"); for (let k = 0; k < 4; k++) R(cab - 50 + k * 26, 96, 16, 14, P.glassLit); R(cab - 8, 116, 16, 34, P.dark ? "#26292d" : "#4e5258");
  const ring = Math.round(520 - cam); g.strokeStyle = "#e2701c"; g.lineWidth = 3; g.beginPath(); g.arc(ring, 136, 6, 0, 7); g.stroke();
  R(0, 150, LW, LH - 150, P.dark ? "#5a3a24" : "#8a5d3b"); for (let y = 156; y < LH; y += 8) R(0, y, LW, 1, P.dark ? "#4a3020" : "#7a5233"); for (let px = -(cam % 64); px < LW; px += 64) R(px, 150, 1, LH - 150, P.dark ? "#4a3020" : "#7a5233");
  g.restore();
}
// Ranjit's second phase: the looms run wild and two belts carry everything on the floor
function drawBelts(P) {
  for (const [y, d] of [[158, 1], [184, -1]]) {
    R(0, y, LW, 14, P.dark ? "#1d1c20" : "#3b3a40"); R(0, y, LW, 1, P.steelHi); R(0, y + 13, LW, 1, P.ol);
    for (let x = ((frameNo * d * 1.2 - cam) % 16 + 16) % 16 - 16; x < LW; x += 16) { g.fillStyle = P.amber; g.beginPath(); g.moveTo(x + (d > 0 ? 0 : 8), y + 3); g.lineTo(x + (d > 0 ? 8 : 0), y + 7); g.lineTo(x + (d > 0 ? 0 : 8), y + 11); g.fill(); }
  }
}

