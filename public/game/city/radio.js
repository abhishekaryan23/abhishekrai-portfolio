/* Rollback City: the radio (DESIGN 7.9). A plain script that shares globals with the others;
   index.html loads them in order.

   Five stations, every note made on the spot with Arcade.tone and Arcade.noise (no audio files),
   so muting the game mutes the radio. It plays while a player is on a scooter or a motorbike,
   in Rani, or in a place with a sound system (street.radio: Club 1987). Q (R3 on a pad, the
   Radio button on touch) changes station, and the last one is off. A ticker under the station's
   name scrolls its patter and its ads.

   A station is a loop of 16 steps (sixteenth notes) at its tempo: on each step its parts play
   whatever note falls there. Notes are semitones above the station's root, "." is a rest. */
"use strict";

const ST = (f, n) => f * Math.pow(2, n / 12);
const STATIONS = [
  { name: "Rewind FM 98.3", bpm: 118, root: 110, parts: [
      { wave: "sine", vol: 0.05, dur: 0.09, oct: -1, notes: [0, ".", ".", ".", 0, ".", ".", ".", 0, ".", ".", ".", 0, ".", ".", "."] },   // the kick
      { wave: "square", vol: 0.016, dur: 0.1, oct: 0, notes: [0, ".", 12, ".", 0, ".", 12, ".", 5, ".", 17, ".", 7, ".", 19, "."] },   // octave bass
      { wave: "triangle", vol: 0.02, dur: 0.16, oct: 2, notes: [".", ".", 7, ".", ".", 10, ".", 12, ".", ".", 7, ".", 5, ".", 3, "."] }],
    hats: [2, 6, 10, 14], ticker: ["You're listening to Rewind FM, Bunderpur's disco since 1979.", "Club 1987 on the Kinara: ladies free before ten.", "Request line open. No, we will not play the Kaal Group jingle."] },
  { name: "Vividh Melody", bpm: 92, root: 220, parts: [
      { wave: "triangle", vol: 0.024, dur: 0.22, oct: 1, notes: [0, ".", 1, ".", 4, ".", 5, ".", 7, ".", 5, 4, 1, ".", 0, "."] },   // a film song in Bhairavi
      { wave: "sine", vol: 0.02, dur: 0.3, oct: -1, notes: [0, ".", ".", ".", ".", ".", ".", ".", 5, ".", ".", ".", ".", ".", ".", "."] }],
    tabla: [0, 3, 6, 8, 11, 14], ticker: ["Vividh Melody: songs from the films you saw with your first love.", "Next, a request from Nani of Chandni Lane. She says it is not a request, it is an order.", "Sponsored by Chamak Soap. For the glow of a girl who has done nothing all day."] },
  { name: "Bhakti 108", bpm: 66, root: 147, parts: [
      { wave: "sine", vol: 0.022, dur: 1.4, oct: -1, notes: [0, ".", ".", ".", ".", ".", ".", ".", 7, ".", ".", ".", ".", ".", ".", "."] },   // the drone
      { wave: "triangle", vol: 0.018, dur: 0.4, oct: 1, notes: [0, ".", 2, ".", 4, ".", ".", ".", 7, ".", 4, ".", 2, ".", ".", "."] },   // a harmonium line
      { wave: "triangle", vol: 0.012, dur: 0.6, oct: 3, notes: [0, ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."] }],   // the temple bell
    ticker: ["Bhakti 108: morning aarti, live from the Hanuman mandir.", "Om jai jagdish hare...", "The mandir committee thanks everyone who gave for the new bell."] },
  { name: "Cricket Live", bpm: 100, root: 0, crowd: true, parts: [],
    ticker: ["...and he comes in to bowl, and it's a short one, PULLED, that's four!", "Bunderpur 142 for 3, the asking rate climbing.", "A word from our sponsors: Gold Fizz. The fizz that finishes.", "...edged, and dropped at slip. Oh dear. Oh dear oh dear."] },
  { name: "Kaal Group Radio", bpm: 108, root: 262, parts: [
      { wave: "square", vol: 0.016, dur: 0.12, oct: 0, notes: [0, ".", 4, ".", 7, ".", 12, ".", 7, ".", 4, ".", 0, ".", ".", "."] },
      { wave: "sine", vol: 0.03, dur: 0.12, oct: -1, notes: [0, ".", ".", ".", 0, ".", ".", ".", 5, ".", ".", ".", 7, ".", ".", "."] }],
    ticker: ["KAAL HEIGHTS: a new Bunderpur, from the people who brought you the old one.", "Kaal Group. Building Tomorrow.", "Old lanes are a fire risk. Ask yourself: is your Nani safe?"] },
  { name: "Off", off: true, ticker: [""] }
];
let radioStep = 0, radioT = 0, tickerX = 0, radioShown = 0;
// a room with a beat (Club 1987) plays Rewind FM whatever the dial says
const station = () => (street && street.beat ? STATIONS[0] : STATIONS[progress.radio || 0] || STATIONS[0]);
// is there a radio playing here? a motor under you, or a sound system in the room
const radioHere = () => clockRuns() && state === "play" && !paused && !wipe &&
  (street.radio || dancing() || players.some((p) => p && p.ride && (p.ride.kind !== "bicycle")));
function updateRadio() {
  const on = radioHere();
  const btn = document.querySelector(".pad .radio-btn"); if (btn) btn.hidden = !on;
  if (!on) return;
  if (!street.beat) for (const p of players) if (p && tapped(p.pi, "radio")) {
    progress.radio = ((progress.radio || 0) + 1) % STATIONS.length; radioShown = 180; tickerX = 0; radioStep = 0; radioT = 0;
    Arcade.noise(0.06, 0.03);   // the dial between stations
  }
  const s = station(); if (s.off) return;
  radioT += s.bpm * 4 / 3600;   // sixteenth notes per frame at 60 frames a second
  if (radioT < 1) return;
  radioT -= 1;
  const i = radioStep++ % 16;
  for (const pt of s.parts) {
    const n = pt.notes[i]; if (n === ".") continue;
    Arcade.tone(ST(s.root, n + 12 * pt.oct), pt.dur, pt.wave, pt.vol);
  }
  if ((s.hats || []).includes(i)) Arcade.noise(0.02, 0.012);
  if ((s.tabla || []).includes(i)) { Arcade.tone(i % 2 ? 330 : 165, 0.06, "sine", 0.03, -60); }
  if (s.crowd && i % 4 === 0) Arcade.noise(0.25, 0.006 + (Math.random() < 0.08 ? 0.03 : 0));   // the crowd, and now and then a roar
}
// the station's name and its ticker, bottom right above the route strip
function drawRadio() {
  if (!radioHere()) return;
  const s = station(); if (s.off && radioShown <= 0) return;
  if (radioShown > 0) radioShown--;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const w = Math.min(200, LW * 0.45), x = LW - w - 6, y = LH - 58;
  R(x, y, w, 11, "rgba(14,13,12,0.78)"); R(x, y, 2, 11, "#c96bd8");
  text("♪ " + s.name.toUpperCase(), x + 6, y + 8, 5.5, "#f7f4ee", "left", "IBM Plex Mono");
  if (s.off) return;
  const line = s.ticker[Math.floor(frameNo / 900) % s.ticker.length];
  g.save(); g.beginPath(); g.rect(x, y + 11, w, 9); g.clip();
  R(x, y + 11, w, 9, "rgba(14,13,12,0.6)");
  g.font = "500 6px 'IBM Plex Sans', sans-serif"; const tw = g.measureText(line).width;
  tickerX = (tickerX + 0.4) % (tw + w); g.fillStyle = "#e8d9a8"; g.textAlign = "left"; g.fillText(line, x + w - tickerX, y + 18);
  g.restore();
}
