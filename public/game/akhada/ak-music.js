/* Akhada: soft 8-bit background music, one tune per stage, played live with Web Audio
   (nothing to download). Each tune is built on a raga with a tanpura-like drone of Sa and Pa:

     Varanasi Ghats       raga Bhairav (a morning raga), slow and gentle
     Thar Fort            Khamaj, a Rajasthani folk lilt over a soft dholak pulse
     Kerala Backwaters    raga Megh (the rain raga), flowing, with falling raindrop notes
     Himalayan Monastery  raga Bhupali, calm, with bell-like tones

   Melodies are written in sargam: S r R g G m M P d D n N (komal notes in lower case),
   ' for the upper octave and . before a note for the lower one, :n for its length in beats,
   - for a rest. It follows the site's Sound on/off setting and the Music chip on the select
   screen, and it rests while the game is paused or the tab is hidden. */
"use strict";

const SWAR = { S: 0, r: 1, R: 2, g: 3, G: 4, m: 5, M: 6, P: 7, d: 8, D: 9, n: 10, N: 11 };
const TUNES = {
  ghats: { sa: 261.63, bpm: 66, lead: "triangle", echo: true, drum: false, drops: false, bell: false,
    phrases: ["S:2 r G m:2 P:2 d:2 P m G:2 r S:2", "G m d:2 N S':3 N d P:2 m G r:2 S:2",
      "P:2 d N S' r' S':2 N d P m G m r S:2", "m G r:2 S .N S:2 G m P:2 m G r S:3"] },
  fort: { sa: 293.66, bpm: 84, lead: "square", echo: false, drum: true, drops: false, bell: false,
    phrases: ["S G m P:2 D P m G:2 m P D n D P m G R S:2", "P D S':2 S' n D P m G m P G R S:2",
      "G m P D n:2 D P D:2 P m G:2 R S:2", "S R G m P:2 m G R S .n S:3 -:2"] },
  kerala: { sa: 220.0, bpm: 72, lead: "triangle", echo: true, drum: false, drops: true, bell: false,
    phrases: ["R m P n:2 P m R:2 m P n S':2 n P m:2", ".n S R:2 m R .n S:3 R m P:2 m R S:2",
      "P n S' R':2 S' n P:2 m P n:2 P m R:2", "m R S .n:2 S R m:2 R S .n S:3 -:2"] },
  himalaya: { sa: 329.63, bpm: 60, lead: "triangle", echo: true, drum: false, drops: false, bell: true,
    phrases: ["S:2 R G:2 P G R S:2 G P D:2 S':2 D P G:2", "P D S' R' S':2 D P G R G P G R S:3",
      "G:2 P D:2 P G R:2 S R G:2 P:3 -:1", "D S' D P:2 G R G:2 R S .D S:3 -:2"] }
};
function parsePhrase(str) {
  return str.split(/\s+/).filter(Boolean).map((tok) => {
    const [n, len] = tok.split(":"), beats = +(len || 1);
    if (n === "-") return [null, beats];
    let semi = SWAR[n.replace(/[.']/g, "")];
    if (semi == null) return [null, beats];
    if (n.startsWith(".")) semi -= 12;
    semi += 12 * (n.match(/'/g) || []).length;
    return [semi, beats];
  });
}
for (const t of Object.values(TUNES)) t.notes = t.phrases.map(parsePhrase).flat();

const MUSIC = { ctx: null, master: null, filter: null, tune: null, id: null, drone: [], next: 0, i: 0, beat: 0, on: true };
try { MUSIC.on = localStorage.getItem("akhada:music") !== "0"; } catch (e) { /* ignore */ }
const soundMuted = () => { try { return localStorage.getItem("arcade-muted") === "1"; } catch (e) { return false; } };

function musicCtx() {
  if (MUSIC.ctx) return MUSIC.ctx;
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    MUSIC.ctx = c; MUSIC.filter = c.createBiquadFilter(); MUSIC.filter.type = "lowpass"; MUSIC.filter.frequency.value = 2600;
    MUSIC.master = c.createGain(); MUSIC.master.gain.value = 0;
    MUSIC.filter.connect(MUSIC.master).connect(c.destination);
  } catch (e) { MUSIC.ctx = null; }
  return MUSIC.ctx;
}
// browsers only start audio after a gesture
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => { const c = musicCtx(); if (c && c.state === "suspended") c.resume(); }, { capture: true, passive: true });

function mNote(freq, at, dur, type, vol, decay) {
  const c = MUSIC.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + (decay || dur));
  o.connect(g).connect(MUSIC.filter); o.start(at); o.stop(at + (decay || dur) + 0.05);
}
function mTap(at, len, vol) {   // a soft dholak-like tap: a short noise burst through a band filter
  const c = MUSIC.ctx, n = Math.floor(c.sampleRate * len), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  f.type = "bandpass"; f.frequency.value = 900; g.gain.value = vol; s.buffer = b;
  s.connect(f).connect(g).connect(MUSIC.filter); s.start(at);
}
function startDrone(t) {
  const c = MUSIC.ctx, now = c.currentTime;
  for (const [ratio, vol] of [[0.5, 0.11], [0.75, 0.07], [0.25, 0.08]]) {   // Sa below, Pa, Sa two octaves down
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = "triangle"; o.frequency.value = t.sa * ratio;
    lfo.frequency.value = 0.15 + ratio * 0.1; lg.gain.value = vol * 0.35; lfo.connect(lg).connect(g.gain);   // a slow tanpura swell
    g.gain.value = vol; o.connect(g).connect(MUSIC.filter); o.start(now); lfo.start(now);
    MUSIC.drone.push(o, lfo);
  }
}
function stopDrone() { for (const o of MUSIC.drone) try { o.stop(); } catch (e) { /* already stopped */ } MUSIC.drone = []; }

function setTune(id) {
  if (MUSIC.id === id) return;
  const c = MUSIC.ctx; if (!c) return;
  const now = c.currentTime;
  MUSIC.master.gain.cancelScheduledValues(now); MUSIC.master.gain.setTargetAtTime(0, now, 0.25);   // fade out
  const old = MUSIC.drone; MUSIC.drone = []; setTimeout(() => { for (const o of old) try { o.stop(); } catch (e) { /* gone */ } }, 1200);
  MUSIC.id = id; MUSIC.tune = id ? TUNES[id] : null;
  if (!id) return;
  setTimeout(() => {
    if (MUSIC.id !== id) return;
    startDrone(MUSIC.tune); MUSIC.i = 0; MUSIC.beat = 0; MUSIC.next = c.currentTime + 0.15;
    MUSIC.master.gain.setTargetAtTime(0.11, c.currentTime, 0.8);   // fade in, softly under the fight
  }, 700);
}
// the sequencer: every 50 ms, schedule the notes that fall in the next quarter second
setInterval(() => {
  const c = MUSIC.ctx; if (!c || c.state !== "running") return;
  const fighting = typeof state !== "undefined" && ["intro", "fight", "ko", "over", "menu"].includes(state);
  const want = MUSIC.on && !soundMuted() && !document.hidden && !(typeof paused !== "undefined" && paused) && fighting && stage ? stage.id : null;
  setTune(want);
  const t = MUSIC.tune; if (!t || !MUSIC.drone.length) return;
  const spb = 60 / t.bpm;
  while (MUSIC.next < c.currentTime + 0.25) {
    const [semi, beats] = t.notes[MUSIC.i % t.notes.length], at = MUSIC.next, dur = beats * spb;
    if (semi != null) {
      const f = t.sa * 2 ** (semi / 12);
      mNote(f, at, dur * 0.9, t.lead, t.lead === "square" ? 0.18 : 0.32, t.bell ? dur * 1.6 : dur * 0.95);
      if (t.bell) mNote(f * 2, at, dur, "sine", 0.06, dur * 1.2);   // the bell's shimmer
      if (t.echo) mNote(f, at + spb * 0.5, dur * 0.6, "triangle", 0.07, dur * 0.7);
    }
    for (let b = 0; b < beats; b++) {   // the pulse under the melody
      const bt = at + b * spb, whole = MUSIC.beat + b;
      if (t.drum) { mTap(bt, 0.09, whole % 4 === 0 ? 0.32 : 0.14); if (whole % 2 === 1) mTap(bt + spb / 2, 0.05, 0.08); }
      if (whole % 4 === 0) mNote(t.sa / 2 * (whole % 8 === 0 ? 1 : 2 ** (7 / 12)), bt, spb * 1.8, "triangle", 0.12, spb * 1.9);
      if (t.drops && whole % 3 === 2) mNote(t.sa * 4 * 2 ** ([0, 7, 10, 12][whole % 4] / 12), bt + spb * 0.25, 0.08, "sine", 0.04, 0.25);
    }
    MUSIC.beat += beats; MUSIC.i++; MUSIC.next += dur;
  }
}, 50);
document.addEventListener("visibilitychange", () => { if (document.hidden) setTune(null); });
function setMusic(on) { MUSIC.on = on; try { localStorage.setItem("akhada:music", on ? "1" : "0"); } catch (e) { /* ignore */ } }
if (typeof buildGrids === "function") buildGrids();
