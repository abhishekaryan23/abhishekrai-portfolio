/* Rollback City: the heavy monsoon (DESIGN 7.1; 4.1 of the plan). A plain script that shares globals
   with the others; index.html loads them in order.

   From Act 3 the showers can turn into a storm. Streets at ground level flood as it goes on, up to
   the knee, and drain after it passes: wading is slow, a knockdown throws up a wall of spray, and a
   downed wire by a lamp-post makes a puddle live (anyone standing in it, or thrown into it, gets a
   shock). On the Kinara the waves come over the sea wall. */
"use strict";

WEATHER_NEXT.storm = [["showers", 0.7], ["cloudy", 0.3]];
const act3 = () => progress.done.includes("2-11");
const storming = () => weather() === "storm";
// how deep the water is here, 0 to 1 (knee-deep at 1)
const floodable = () => !street.interior && !street.water && !["roof", "trainroof", "train", "ferry", "helipad"].includes(street.theme);
const flood = () => (floodable() && progress.weather ? progress.weather.flood || 0 : 0);
const wade = () => (flood() > 0.4 ? 1 - flood() * 0.3 : 1);   // a speed factor for anyone walking in it
// live puddles: two to a street, by the lamp-posts, only in a storm
const livePuddles = () => (storming() && flood() > 0.3 && floodable() ? [0.27, 0.71].map((k) => Math.round((street.w || LW) * k / 130) * 130 + 4) : []);
function updateMonsoon() {
  const w = progress.weather; if (!w || !clockRuns()) return;
  // the water rises in a storm and drains after it
  w.flood = clamp((w.flood || 0) + (w.kind === "storm" ? 1 / 3600 : -1 / 2400), 0, 1);
  if (!floodable()) return;
  for (const px of livePuddles()) for (const f of alivePlayers().concat(enemies)) {
    if (f.z > 2 || Math.abs(f.x - px) > 22 || f.y < Y1 - 30 || DOWN_STATES.includes(f.st) || (f.zapT || 0) > frameNo) continue;
    f.zapT = frameNo + 50; damage(f, 4, f); setState(f, "hurt", 26); f.flash = 10; shake = Math.max(shake, 2);
    texts.push({ x: f.x, y: f.y - 60, s: "Zzzt!", t: 40 }); Arcade.noise(0.12, 0.05);
  }
  // spray over the sea wall
  if (storming() && street.theme === "seafront" && frameNo % 240 === 0) {
    for (let k = 0; k < 14; k++) fx.push({ kind: "water", x: cam + rand(0, LW), y: Y0 - 4, vx: rand(-0.5, 0.5), vy: rand(-3.5, -1.5), t: 30 });
    for (const p of alivePlayers()) if (p.y < Y0 + 12 && !p.ride && p.st !== "hurt") { p.y += 8; texts.push({ x: p.x, y: p.y - 60, s: "Splash!", t: 40 }); }
  }
}
// a splash when somebody goes down in the water (called on a landing)
function floodSplash(f) {
  if (flood() < 0.3) return;
  for (let k = 0; k < 8; k++) fx.push({ kind: "water", x: f.x + rand(-8, 8), y: f.y - 2, vx: rand(-1.5, 1.5), vy: rand(-3, -1), t: 24 });
}
// the water over the floor, a ripple at everyone's shins, and the sparking wires
function drawFloodFloor(P) {
  const d = flood(); if (d < 0.05) return;
  g.globalAlpha = 0.18 + d * 0.22; R(0, Y0 - 4, LW, LH - Y0 + 4, P.dark ? "#1a2a3a" : "#5a7f94"); g.globalAlpha = 1;
  for (let x = -(cam % 30); x < LW; x += 30) R(x + Math.sin(frameNo / 20 + x) * 3, Y0 + 6 + ((x / 30) % 4) * 14, 10, 1, "rgba(220,235,245,0.35)");
  for (const px of livePuddles()) {
    const x = Math.round(px - cam); if (x < -30 || x > LW + 30) continue;
    g.strokeStyle = "#2a2622"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 110); g.quadraticCurveTo(x + 8, 150, x + 4, Y1 - 6); g.stroke();   // the downed wire
    if (frameNo % 8 < 4) for (let k = 0; k < 4; k++) { const a = rand(0, 6.3), r = rand(4, 18); R(x + 4 + Math.cos(a) * r, Y1 - 8 + Math.sin(a) * r * 0.3, 2, 1, "#9fd8ff"); }
    g.globalAlpha = 0.25 + 0.1 * Math.sin(frameNo / 3); g.fillStyle = "#6fc0ff"; g.beginPath(); g.ellipse(x + 4, Y1 - 8, 22, 5, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  }
}
function drawWaterline(f) {
  const d = flood(); if (d < 0.2 || f.z > 4) return;
  const x = Math.round(f.x - cam), depth = Math.round(4 + d * 10);
  g.globalAlpha = 0.45; R(x - 11, f.y - depth, 22, depth, PAL.dark ? "#1a2a3a" : "#5a7f94"); g.globalAlpha = 1;
  R(x - 11 + Math.sin(frameNo / 6 + f.x) * 2, f.y - depth, 22, 1, "rgba(230,240,250,0.6)");
}
