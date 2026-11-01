/* Rollback City: finding the way (DESIGN 3.1, 9).
   A plain script that shares globals with the others; index.html loads them in order.

   The street strip along the bottom of the HUD is the current street end to end: its junctions
   and doors, the players, and an arrow with where to go next for the objective. M opens the
   paper map: every street as an inked line, the players, the objective and the next mission. */
"use strict";

// every way out of a street: junctions, doors and links (stairs and the like), with where they lead
const exitsOf = (s) => (s.junctions || []).concat(s.doors || [], s.links || []).filter((e) => unlocked(e.needs));
// the first step on the shortest way from street `from` to street `to`: { exit, hops }, or null
function route(from, to) {
  if (from === to) return { exit: null, hops: 0 };
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const id = q.shift();
    for (const e of exitsOf(WORLD.streets[id])) {
      if (!WORLD.streets[e.to] || e.to in prev) continue;
      prev[e.to] = { id, e }; q.push(e.to);
      if (e.to === to) {
        let hops = 1, at = prev[to];
        while (at.id !== from) { at = prev[at.id]; hops++; }
        return { exit: at.e, hops };
      }
    }
  }
  return null;
}
// where the objective arrow points on this street, and what it says
function guide() {
  const ob = objective(); if (!ob || !ob.at || !street) return null;
  if (ob.at.street === street.id) return { x: ob.at.x, label: Math.max(1, Math.round(Math.abs(ob.at.x - (alivePlayers()[0] || players[0]).x) / 8)) + " m" };
  const r = route(street.id, ob.at.street); if (!r) return null;
  const nx = WORLD.streets[r.exit.to];
  return { x: r.exit.x, label: (nx.interior ? "into " : "") + nx.name + (r.hops > 1 ? ", " + r.hops + " turns" : "") };
}

// the strip: the whole street in one bar along the bottom. Blue arrows for alleys up and turns down,
// amber doors for the places you can go in, green diamonds for stairs, ladders and trains, gold specks
// for things still to find here, red for goondas after you, the objective's marker, and the players
function drawStrip(P) {
  if (!street || street.interior) return;
  const x0 = 56, x1 = LW - 56, y = LH - 8, k = (x1 - x0) / street.w, X = (wx) => Math.round(x0 + wx * k);
  R(x0 - 6, y - 7, x1 - x0 + 12, 13, "rgba(14,13,12,0.72)"); R(x0 - 6, y - 7, x1 - x0 + 12, 1, "rgba(247,244,238,0.18)");
  R(x0, y, x1 - x0, 2, "rgba(247,244,238,0.5)");
  { const vx = X(cam), vw = Math.max(4, Math.round(LW * k)); R(vx, y - 5, vw, 1, "rgba(247,244,238,0.55)"); R(vx, y + 4, vw, 1, "rgba(247,244,238,0.55)"); R(vx, y - 5, 1, 10, "rgba(247,244,238,0.55)"); R(vx + vw - 1, y - 5, 1, 10, "rgba(247,244,238,0.55)"); }   // what the screen shows
  for (const e of exitsOf(street)) {
    const ex = X(e.x);
    if (e.dir === "up") { R(ex - 2, y - 3, 5, 1, "#7fb2e6"); R(ex - 1, y - 4, 3, 1, "#7fb2e6"); R(ex, y - 5, 1, 1, "#7fb2e6"); }
    else if (e.dir) { R(ex - 2, y + 3, 5, 1, "#7fb2e6"); R(ex - 1, y + 4, 3, 1, "#7fb2e6"); R(ex, y + 5, 1, 1, "#7fb2e6"); }
    else if (e.verb) { R(ex - 1, y - 4, 3, 1, "#5cd08a"); R(ex - 2, y - 3, 5, 1, "#5cd08a"); R(ex - 1, y - 2, 3, 1, "#5cd08a"); }
    else { R(ex - 2, y - 5, 5, 6, "#1d1b18"); R(ex - 1, y - 4, 3, 5, "#e8b84a"); }
  }
  if (typeof SPOTS !== "undefined") for (const key in SPOTS) SPOTS[key].list.forEach(([sid, wx], i) => { if (sid === street.id && !(progress[key] || []).includes(i)) R(X(wx), y + 3, 1, 1, "#ffe066"); });
  for (const e of enemies) if (e.aggro && !e.gone && !DOWN_STATES.includes(e.st) && e.st !== "flee") R(X(e.x) - 1, y - 1, 2, 2, "#ff5a4a");
  const gd = guide();
  if (gd) { const gx = X(gd.x), b = Math.round(Math.sin(frameNo / 8)); g.fillStyle = mission ? P.T.accent : "#f2c230"; g.beginPath(); g.moveTo(gx, y - 2 + b); g.lineTo(gx - 4, y - 8 + b); g.lineTo(gx + 4, y - 8 + b); g.fill(); R(gx, y - 2, 1, 4, mission ? P.T.accent : "#f2c230"); }
  for (const p of players) if (p && p.lives > 0) { const px = X(p.x); R(px - 2, y - 3, 5, 6, "#1d1b18"); R(px - 1, y - 2, 3, 4, fighterColour(p, P)); }
  if (gd) {
    const me = alivePlayers()[0] || players[0], dir = gd.x > me.x + 4 ? 1 : gd.x < me.x - 4 ? -1 : 0;
    // which way, and where to: in its own box at the right end of the objective's line
    const label = (dir > 0 ? "→ " : dir < 0 ? "← " : "↑ ") + gd.label;
    g.font = "600 6.5px 'IBM Plex Sans', sans-serif"; const w = g.measureText(label).width + 12;
    R(LW - 4 - w, LH - 30, w, 12, "rgba(14,13,12,0.72)"); R(LW - 6, LH - 30, 2, 12, mission ? P.T.accent : "#f2c230");
    text(label, LW - 10, LH - 21, 6.5, "#f7f4ee", "right", "IBM Plex Sans");
    // off screen: a chevron at that edge, so the way is clear without looking down
    const sx = gd.x - cam;
    if (sx < 4 || sx > LW - 4) {
      const ex = sx < 4 ? 8 : LW - 8, d = sx < 4 ? -1 : 1, cy = 120 + Math.sin(frameNo / 10) * 2;
      g.globalAlpha = 0.85; g.fillStyle = mission ? P.T.accent : "#f2c230";
      g.beginPath(); g.moveTo(ex + d * 4, cy); g.lineTo(ex - d * 2, cy - 6); g.lineTo(ex - d * 2, cy + 6); g.fill(); g.globalAlpha = 1;
    }
  }
}

/* the paper map: Nani's map of Bunderpur, kept in a drawer since 1987. The land, the sea and the river
   are drawn in map units (120 across, 72 down); the districts are soft washes with their names
   written large and faint underneath, the streets are proper roads (tinted by who holds the turf),
   rooms are small marks, and only the streets are named, each where it has room. */
const MAP_W = 120, MAP_H = 72;
// the coast: the sea fills the bottom left, past the docks and along the Kinara's sea wall
const SEA = [[0, 26], [2, 34], [2.5, 42], [6, 50], [12, 56], [20, 61.5], [34, 62.8], [56, 62.4], [80, 62.6], [94, 64.5], [104, 68], [108, 72], [0, 72]];
// the river, from the hills in the north, past the ghat and the mills, out into the bay
const RIVER = [[[105, 0], [107.5, 10], [109.5, 22], [110.5, 34], [111, 46], [111.5, 58], [112.5, 72]], 2.6];
// each district's outline, in map units, drawn as a smooth hand-drawn ward
const DISTRICT_SHAPE = {
  chandni: [[15, 18], [30, 14.5], [55, 15], [72, 19], [75, 30], [72, 40], [50, 42.5], [24, 41.5], [15, 34]],
  harbour: [[24, 44], [50, 43.5], [72, 44], [74, 52], [60, 56], [34, 56], [23, 52]],
  kinara: [[18, 57], [40, 57.5], [70, 57], [88, 58], [90, 61.8], [60, 62.2], [30, 62.4], [19, 61]],
  docks: [[2, 31], [12, 33], [24, 41], [27, 52], [20, 58], [10, 55], [4, 47]],
  mandi: [[74, 11], [92, 9], [103, 12], [106.5, 30], [107, 50], [104, 60.5], [86, 61], [76, 52], [73, 32]],
  mills: [[113.5, 26], [120, 24], [120, 66], [114.5, 66]]
};
const DISTRICT_LOOK = {
  chandni: { box: [14, 15, 74, 41], col: "#c0506a", name: "CHANDNI", at: [62, 18] },
  harbour: { box: [22, 44, 72, 56], col: "#3d6a9a", name: "HARBOUR", at: [36, 45] },
  kinara: { box: [16, 56, 88, 62], col: "#2f8a8a", name: "SAGAR KINARA", at: [52, 66.5] },
  docks: { box: [1, 32, 26, 57], col: "#5a6a7a", name: "THE DOCKS", at: [14, 31] },
  mandi: { box: [72, 10, 107, 60], col: "#c9a227", name: "THE MANDI", at: [92, 52] },
  river: { box: [96, 8, 108, 34], col: "#2f6b8a", name: "", at: [0, 0] },
  mills: { box: [113, 24, 120, 66], col: "#6b6560", name: "MILLS", at: [116, 66] }
};
let mapOpen = false;
function openMap() {
  if (mapOpen || state !== "play" || paused) return;
  mapOpen = true; paused = true; down.clear();
  showCard("card-map", "map-close"); drawMap();
}
function closeMap() {
  if (!mapOpen) return;
  mapOpen = false; paused = false; showCard(null);
}
let mapArtAsked = false;
function drawMap() {
  if (!mapArtAsked) { mapArtAsked = true; sprite("map_paper", ART + "map_paper.jpg"); for (const n of ["map_compass", "map_boat"]) sprite(n, ART + n + ".webp"); setTimeout(() => mapOpen && drawMap(), 600); }
  const cv = $("map-canvas"), box = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  const W = Math.max(300, Math.round(box.width)), H = Math.round(W * MAP_H / MAP_W), u = W / MAP_W;
  const fsz = (sz) => Math.round(sz * Math.max(1, W / 560)), mc = document.createElement("canvas").getContext("2d");
  // the strip under the map: izzat bars (wrapping) and where you are
  const here = mapStreet(street);
  const seen = hasHeat() ? Object.keys(DISTRICT_NAMES).filter((d) => d === "chandni" || (progress.respect && d in progress.respect) || Object.values(WORLD.streets).some((s) => s.district === d && s === here)) : [];
  mc.font = "italic 600 " + fsz(9) + "px Newsreader, Georgia, serif";
  const rows = [[]]; let rx = 50;
  for (const d of seen) { const w = mc.measureText(DISTRICT_NAMES[d]).width + 33; if (rx + w > W - 10 && rows[rows.length - 1].length) { rows.push([]); rx = 50; } rows[rows.length - 1].push(d); rx += w; }
  mc.font = "italic 600 " + fsz(11) + "px Newsreader, Georgia, serif";
  if (rx + mc.measureText("You are here: " + street.name).width + 20 > W - 10) rows.push([]);
  const BAND = 8 + rows.length * 14, HT = H + BAND;
  cv.width = W * dpr; cv.height = HT * dpr; cv.style.height = HT + "px";
  const m = cv.getContext("2d"), ink = "#2a2622", paper = "#f1e6cc", P = PAL;
  m.setTransform(dpr, 0, 0, dpr, 0, 0);
  const font = (sz, it, wt) => (m.font = (it ? "italic " : "") + (wt || 600) + " " + fsz(sz) + "px Newsreader, Georgia, serif");
  const X = (x) => x * u, Y = (y) => y * u;
  const poly = (pts) => { m.beginPath(); pts.forEach(([x, y], i) => (i ? m.lineTo(X(x), Y(y)) : m.moveTo(X(x), Y(y)))); m.closePath(); };

  // paper
  m.fillStyle = paper; m.fillRect(0, 0, W, HT);
  if (SPRITES.map_paper) m.drawImage(SPRITES.map_paper, 0, 0, W, HT);
  // the sea: a wash of blue, ripples, and a deeper edge along the shore
  poly(SEA); m.fillStyle = "rgba(92,150,170,0.42)"; m.fill();
  m.save(); poly(SEA); m.clip();
  m.strokeStyle = "rgba(40,90,110,0.35)"; m.lineWidth = 1;
  for (let y = 26; y < MAP_H; y += 2.6) for (let x = (y * 7) % 9; x < MAP_W; x += 9) { m.beginPath(); m.moveTo(X(x), Y(y)); m.quadraticCurveTo(X(x + 1), Y(y - 0.6), X(x + 2), Y(y)); m.stroke(); }
  m.restore();
  m.strokeStyle = "rgba(40,90,110,0.55)"; m.lineWidth = 1.5; m.beginPath(); SEA.slice(0, -2).forEach(([x, y], i) => (i ? m.lineTo(X(x), Y(y)) : m.moveTo(X(x), Y(y)))); m.stroke();
  // the river
  const [rv, rw] = RIVER;
  m.strokeStyle = "rgba(92,150,170,0.55)"; m.lineWidth = rw * u; m.lineCap = "round"; m.lineJoin = "round";
  m.beginPath(); rv.forEach(([x, y], i) => (i ? m.lineTo(X(x), Y(y)) : m.moveTo(X(x), Y(y)))); m.stroke();
  m.strokeStyle = "rgba(40,90,110,0.45)"; m.lineWidth = 1; for (const s of [-1, 1]) { m.beginPath(); rv.forEach(([x, y], i) => (i ? m.lineTo(X(x + s * rw / 2), Y(y)) : m.moveTo(X(x + s * rw / 2), Y(y)))); m.stroke(); }
  m.lineCap = "butt";
  // districts: a watercolour wash in a hand-drawn ward shape (green or red once the turf war is on),
  // with a dashed ward line round it
  const ward = (pts) => { m.beginPath(); pts.forEach(([x, y], i) => { const [nx, ny] = pts[(i + 1) % pts.length], mx = (x + nx) / 2, my = (y + ny) / 2; if (!i) m.moveTo(X((pts[pts.length - 1][0] + x) / 2), Y((pts[pts.length - 1][1] + y) / 2)); m.quadraticCurveTo(X(x), Y(y), X(mx), Y(my)); }); m.closePath(); };
  for (const d in DISTRICT_SHAPE) {
    const L = DISTRICT_LOOK[d] || {}, held = TURF[d] && clockRuns() ? (turfWon(d) ? "#2f8a4a" : "#b03a2e") : L.col || "#8a7a5a";
    m.filter = "blur(" + Math.max(2, Math.round(u * 0.8)) + "px)"; ward(DISTRICT_SHAPE[d]); m.fillStyle = held; m.globalAlpha = 0.15; m.fill(); m.globalAlpha = 1; m.filter = "none";
    ward(DISTRICT_SHAPE[d]); m.strokeStyle = held; m.globalAlpha = 0.45; m.lineWidth = 1; m.setLineDash([5, 3, 1, 3]); m.stroke(); m.setLineDash([]); m.globalAlpha = 1;
  }
  // the bay's name, the compass and a fishing boat on the water
  font(10, true); m.fillStyle = "rgba(30,70,90,0.55)"; m.textAlign = "center"; m.fillText("Bunderpur Bay", X(30), Y(69.5));
  // (inked on white: multiplied onto the paper, the white disappears)
  m.globalCompositeOperation = "multiply";
  if (SPRITES.map_compass) m.drawImage(SPRITES.map_compass, X(98) - u * 5, Y(64) - u * 5, u * 10, u * 10);
  if (SPRITES.map_boat) m.drawImage(SPRITES.map_boat, X(4), Y(61), u * 10, u * 7.5);
  m.globalCompositeOperation = "source-over";
  // hills in the north, a few trees: so the paper isn't empty where no street goes
  m.strokeStyle = "rgba(90,70,50,0.35)"; m.lineWidth = 1;
  for (const [hx, hy] of [[84, 6], [90, 4], [96, 7], [60, 8], [66, 6], [8, 10], [14, 8]]) { m.beginPath(); m.moveTo(X(hx - 3), Y(hy + 1.5)); m.quadraticCurveTo(X(hx), Y(hy - 2.5), X(hx + 3), Y(hy + 1.5)); m.stroke(); }
  // a few trees: little inked crowns
  for (const [tx, ty] of [[119, 12], [118, 69], [3, 22], [9, 26], [96, 4], [56, 5]]) { m.fillStyle = "rgba(80,110,64,0.5)"; m.beginPath(); m.arc(X(tx), Y(ty), u * 0.9, 0, 7); m.fill(); m.strokeStyle = "rgba(50,70,40,0.6)"; m.lineWidth = 0.8; m.stroke(); }

  const along = (s, x) => { const [a, b, c, d] = s.map, t = clamp(x / s.w, 0, 1); return [(a + (c - a) * t) * u, (b + (d - b) * t) * u]; };
  // the ways between streets: faint dotted paths, under the roads
  m.strokeStyle = "rgba(60,48,36,0.35)"; m.lineWidth = 1; m.setLineDash([2, 3]);
  for (const id in WORLD.streets) {
    const s = WORLD.streets[id]; if (!s.map) continue;
    for (const e of exitsOf(s)) {
      const t = WORLD.streets[e.to]; if (!t || !t.map || t.interior) continue;
      const back = (t.junctions || []).concat(t.doors || [], t.links || []).find((j) => j.to === id); if (!back) continue;
      const [ex, ey] = along(s, e.x), [tx, ty] = along(t, back.x); m.beginPath(); m.moveTo(ex, ey); m.lineTo(tx, ty); m.stroke();
    }
  }
  m.setLineDash([]);
  // rooftops along both sides of each road, the way the city fills in round its streets (never in the water)
  const inSea = (x, y) => { let c = false; for (let i = 0, j = SEA.length - 1; i < SEA.length; j = i++) { const [xi, yi] = SEA[i], [xj, yj] = SEA[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const riverX = (y) => { for (let i = 1; i < rv.length; i++) if (y <= rv[i][1]) { const [x0, y0] = rv[i - 1], [x1, y1] = rv[i]; return x0 + (x1 - x0) * (y - y0) / (y1 - y0); } return rv[rv.length - 1][0]; };
  const ROOF = ["#b8826a", "#c99e78", "#a99c88", "#c4876a", "#b5a68a"];
  for (const id in WORLD.streets) {
    const s = WORLD.streets[id]; if (!s.map || s.layer) continue;
    const [a, b, c, d] = s.map, len = Math.hypot(c - a, d - b), nx = -(d - b) / len, ny = (c - a) / len, tx = (c - a) / len, ty = (d - b) / len;
    for (const side of [-1, 1]) for (let t = 0.6, k = 0; t < len - 0.6; k++) {
      const h = (id.length * 7 + k * 13 + (side > 0 ? 5 : 0)) % 7, bl = 1.3 + (h % 3) * 0.5, off = 1.5 + (h % 2) * 0.35, dep = 1.1 + (h % 4) * 0.25;
      const cx = a + tx * (t + bl / 2) + nx * side * (off + dep / 2), cy = b + ty * (t + bl / 2) + ny * side * (off + dep / 2);
      t += bl + 0.35 + (h === 3 ? 0.9 : 0);
      if (inSea(cx, cy) || Math.abs(cx - riverX(cy)) < rw + 0.8) continue;
      m.save(); m.translate(X(cx), Y(cy)); m.rotate(Math.atan2(ty, tx));
      m.fillStyle = ROOF[h % ROOF.length]; m.globalAlpha = 0.55; m.fillRect(-X(bl) / 2, -Y(dep) / 2, X(bl), Y(dep)); m.globalAlpha = 0.5; m.strokeStyle = "#5a4a38"; m.lineWidth = 0.6; m.strokeRect(-X(bl) / 2, -Y(dep) / 2, X(bl), Y(dep));
      m.restore(); m.globalAlpha = 1;
    }
  }
  // the roads: a dark edge and a cream top (yours in your colour), the turf showing in a thin centre line
  const placed = [], labels = [];
  const fits = (x, y, w, h) => !placed.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
  for (const id in WORLD.streets) {
    const s = WORLD.streets[id]; if (!s.map) continue;
    const [a, b, c, d] = s.map, cur = s === here;
    m.lineCap = "round";
    if (s.layer) { m.strokeStyle = "rgba(60,48,36,0.6)"; m.lineWidth = 1.5; m.setLineDash([3, 3]); m.beginPath(); m.moveTo(X(a), Y(b)); m.lineTo(X(c), Y(d)); m.stroke(); m.setLineDash([]); }
    else {
      m.strokeStyle = "#4a3a2a"; m.lineWidth = cur ? 6.5 : 5; m.beginPath(); m.moveTo(X(a), Y(b)); m.lineTo(X(c), Y(d)); m.stroke();
      m.strokeStyle = cur ? P.T.accent : "#fdf7e6"; m.lineWidth = cur ? 4 : 3; m.stroke();
      if (TURF[s.district] && clockRuns() && !cur) { m.strokeStyle = turfWon(s.district) ? "rgba(47,138,74,0.8)" : "rgba(176,58,46,0.7)"; m.lineWidth = 1.2; m.stroke(); }
    }
    m.lineCap = "butt";
    // a room off the street: a small mark; home gets a little house
    for (const e of exitsOf(s)) {
      const t = WORLD.streets[e.to]; if (!t || !t.interior) continue;
      const [ex, ey] = along(s, e.x);
      if (t.savePoint) { m.fillStyle = "#c9a227"; m.strokeStyle = ink; m.lineWidth = 1; m.beginPath(); m.moveTo(ex - 4, ey - 2); m.lineTo(ex, ey - 7); m.lineTo(ex + 4, ey - 2); m.lineTo(ex + 4, ey + 3); m.lineTo(ex - 4, ey + 3); m.closePath(); m.fill(); m.stroke(); placed.push({ x: ex - 5, y: ey - 8, w: 10, h: 12 }); }
      else { m.fillStyle = t.shop ? "rgba(60,48,36,0.55)" : ink; const r = t.shop ? 1.5 : 2.2; m.fillRect(ex - r, ey - r, r * 2, r * 2); }
    }
    labels.push({ txt: s.name, x: X((a + c) / 2), y: Y((b + d) / 2), cur, upright: Math.abs(c - a) < 3, tries: [-7, 15, -16, 24, -26, 34] });
  }
  // the objective's star and Chhotu's marks
  const mark = (at, col, txt) => {
    const s = WORLD.streets[at.street], s2 = mapStreet(s); if (!s2 || !s2.map) return;
    const door = s2 !== s && (s2.doors || []).concat(s2.links || []).find((d) => d.to === s.id);
    const [x, y] = s2 === s ? along(s2, at.x) : along(s2, door ? door.x : s2.w / 2);
    m.fillStyle = col; m.strokeStyle = ink; m.lineWidth = 0.8; m.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.2 : 7.5, an = -Math.PI / 2 + i * Math.PI / 5; m.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } m.closePath(); m.fill(); m.stroke();
    placed.push({ x: x - 8, y: y - 8, w: 16, h: 16 });
    font(9); const w = m.measureText(txt).width + 10, right = x + 10 + w > W - 6, bx = right ? x - 10 - w : x + 10, by = y - 18;
    m.fillStyle = "rgba(251,243,223,0.92)"; m.fillRect(bx, by, w, 13); m.strokeStyle = col; m.lineWidth = 1; m.strokeRect(bx + 0.5, by + 0.5, w - 1, 12);
    m.fillStyle = ink; m.textAlign = "left"; m.fillText(txt, bx + 5, by + 10); placed.push({ x: bx, y: by, w, h: 13 });
  };
  const ob = objective();
  if (ob && ob.at) mark(ob.at, mission ? P.T.accent : "#c9a227", ob.text.replace(/\s+\d+s$/, ""));
  mapFinds(m, along);
  // the players
  players.forEach((p) => {
    if (!p || p.lives <= 0) return;
    const door = here !== street && (here.doors || []).concat(here.links || []).find((d) => d.to === street.id);
    const [x, y] = here === street ? along(here, p.x) : along(here, door ? door.x : here.w / 2);
    m.fillStyle = "rgba(251,243,223,0.9)"; m.beginPath(); m.arc(x, y, 7, 0, 7); m.fill();
    m.fillStyle = fighterColour(p, P); m.beginPath(); m.arc(x, y, 4.5, 0, 7); m.fill(); m.strokeStyle = ink; m.lineWidth = 1; m.stroke();
    placed.push({ x: x - 7, y: y - 7, w: 14, h: 14 });
  });
  font(16, false, 700); const tw = Math.max(m.measureText("Bunderpur").width, 90) + 22, th = fsz(16) + fsz(9) + 22;
  placed.push({ x: 0, y: 0, w: tw + 12, h: th + 12 });   // the title's corner
  // the street names, each where it fits (your street's first), on a little patch of paper
  labels.sort((a, b) => (b.cur ? 1 : 0) - (a.cur ? 1 : 0));
  for (const L of labels) {
    font(L.cur ? 10 : 9, true, L.cur ? 700 : 600); const w = m.measureText(L.txt).width + 6, h = fsz(9) + 4;
    // along the road first; beside it, for a road that runs up the page
    const spots = (L.upright ? [[-w / 2 - 8, 4], [w / 2 + 8, 4], [-w / 2 - 8, -20], [-w / 2 - 8, 28]] : []).concat(L.tries.flatMap((dy) => [[0, dy], [-w * 0.35, dy], [w * 0.35, dy], [-w * 0.7, dy], [w * 0.7, dy]]));
    for (const [dx, dy] of spots) {
      const x = clamp(L.x + dx, w / 2 + 4, W - w / 2 - 4), y = clamp(L.y + dy, h + 2, H - 4);
      if (!fits(x - w / 2, y - h + 3, w, h)) continue;
      m.fillStyle = "rgba(241,230,204,0.75)"; m.fillRect(x - w / 2, y - h + 3, w, h);
      m.fillStyle = L.cur ? P.T.accent : ink; m.textAlign = "center"; m.fillText(L.txt, x, y); placed.push({ x: x - w / 2, y: y - h + 3, w, h }); break;
    }
  }
  // the districts' names, in spaced capitals, wherever they fit near their middle
  if ("letterSpacing" in m) m.letterSpacing = "3px";
  for (const d in DISTRICT_LOOK) {
    const L = DISTRICT_LOOK[d]; if (!L.name) continue;
    font(11, false, 700); const w = m.measureText(L.name).width + 6, h = fsz(11);
    for (const [dx, dy] of [[0, 0], [0, -3], [0, 3], [-6, 0], [6, 0], [0, -6], [0, 6]]) {
      const x = clamp(X(L.at[0] + dx), w / 2 + 4, W - w / 2 - 4), y = clamp(Y(L.at[1] + dy), h + 50, H - 4);
      if (!fits(x - w / 2, y - h, w, h + 2)) continue;
      m.fillStyle = "rgba(70,54,38,0.42)"; m.textAlign = "center"; m.fillText(L.name, x, y); placed.push({ x: x - w / 2, y: y - h, w, h: h + 2 }); break;
    }
  }
  if ("letterSpacing" in m) m.letterSpacing = "0px";
  // the title, in a cartouche
  font(16, false, 700);
  m.fillStyle = "rgba(251,243,223,0.92)"; m.fillRect(8, 8, tw, th); m.strokeStyle = "#8a6a42"; m.lineWidth = 1; m.strokeRect(10.5, 10.5, tw - 5, th - 5);
  m.fillStyle = ink; m.textAlign = "left"; m.fillText("Bunderpur", 18, 12 + fsz(16));
  font(9, true); m.fillStyle = "rgba(42,38,34,0.75)"; m.fillText(clockRuns() ? clockText().toLowerCase().replace(/^day (\d+)\s+/, "day $1, ") : "by night, 11:58", 18, 16 + fsz(16) + fsz(9));
  // the strip
  m.fillStyle = paper; m.fillRect(0, H, W, BAND); m.strokeStyle = "rgba(42,38,34,0.35)"; m.lineWidth = 1; m.beginPath(); m.moveTo(8, H + 1.5); m.lineTo(W - 8, H + 1.5); m.stroke();
  font(11, true); m.fillStyle = "rgba(42,38,34,0.75)"; m.textAlign = "right"; m.fillText("You are here: " + street.name, W - 10, H + rows.length * 14 + 2);
  rows.forEach((row, ri) => {
    const y = H + 15 + ri * 14; let ix = 10;
    if (ri === 0 && seen.length) { font(9); m.textAlign = "left"; m.fillStyle = ink; m.fillText("Izzat", ix, y); }
    ix += 40;
    for (const d of row) {
      font(9, true); const nw = m.measureText(DISTRICT_NAMES[d]).width, r = respect(d);
      m.textAlign = "left"; m.fillStyle = ink; m.fillText(DISTRICT_NAMES[d], ix, y); ix += nw + 3;
      m.fillStyle = "rgba(42,38,34,0.15)"; m.fillRect(ix, y - 6, 22, 5); m.fillStyle = r >= 60 ? "#2f6b3a" : r >= 30 ? "#c9a227" : "#a8322a"; m.fillRect(ix, y - 6, 22 * r / 100, 5); ix += 30;
    }
  });
}
