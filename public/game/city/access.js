/* Rollback City: accessibility, phone limits and balance (DESIGN 10.2; 5.7 to 5.9 of the plan). A plain
   script that shares globals with the others; index.html loads them in order.

   Settings (kept per device): bigger subtitles, less screen shake, colour-blind safe HUD colours,
   and remapped keys for player one. A minigame you fail twice at the same step can be skipped from
   the failure card. On a phone the effects, floating lines and crowds are capped so the busiest
   street holds 60 frames a second. Story difficulty eases the money: the second instalment asks a
   smaller share from you, and odd jobs pay a quarter more. */
"use strict";

const A11Y = (() => { try { return JSON.parse(localStorage.getItem("city:a11y")) || {}; } catch (e) { return {}; } })();
const saveA11y = () => { try { localStorage.setItem("city:a11y", JSON.stringify(A11Y)); } catch (e) { /* ignore */ } };
// colour-blind safe pairs (blue and orange instead of red and green)
const CB = (red, green) => (A11Y.cb ? (red ? "#e8871e" : "#2b7bd8") : red ? "#c0392b" : "#2f8a4a");

/* ---------- the settings, added to the existing card ---------- */
const KEY_ACTIONS = ["left", "right", "up", "down", "punch", "kick", "jump", "special", "block", "use"];
(() => { try { const k = JSON.parse(localStorage.getItem("city:keys")); if (k) for (const a of KEY_ACTIONS) if (k[a]) BIND[0][a] = [k[a]]; } catch (e) { /* ignore */ } })();
const baseSettings = buildSettings;
buildSettings = function () {
  baseSettings();
  const box = $("settings"); if (!box) return;
  const chip = (label, on, fn, keep) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", String(!!on)); b.addEventListener("click", () => { fn(); saveA11y(); if (!keep) buildSettings(); }); box.appendChild(b); };   // (keep: the remap prompt must stay on the card)
  chip("Bigger subtitles", A11Y.bigText, () => { A11Y.bigText = !A11Y.bigText; });
  chip("Less screen shake", A11Y.calm, () => { A11Y.calm = !A11Y.calm; });
  chip("Colour-blind HUD", A11Y.cb, () => { A11Y.cb = !A11Y.cb; });
  chip("Street goons: " + ["normal", "few", "none"][A11Y.goons || 0], A11Y.goons, () => { A11Y.goons = ((A11Y.goons || 0) + 1) % 3; });   // story fights stay as they are
  chip("Keys (player one)…", false, remapKeys, true);
};
// remap: each action in turn waits for a key; Escape keeps the old one
function remapKeys() {
  const keys = {}; let i = 0;
  const ask = () => { const a = KEY_ACTIONS[i]; if (!a) { try { localStorage.setItem("city:keys", JSON.stringify(keys)); } catch (e) { /* ignore */ } showToast("Keys saved"); return; } showToast("Press a key for: " + a + " (Esc keeps " + BIND[0][a][0].replace("Key", "") + ")"); };
  const on = (e) => { e.preventDefault(); e.stopPropagation(); const a = KEY_ACTIONS[i]; if (e.code !== "Escape") { BIND[0][a] = [e.code]; keys[a] = e.code; } i++; if (i >= KEY_ACTIONS.length) removeEventListener("keydown", on, true); ask(); };
  addEventListener("keydown", on, true); ask();
}
function showToast(msg) { const host = document.querySelector("#settings") || document.body, t = document.createElement("p"); t.className = "muted"; t.textContent = msg; const old = document.getElementById("keys-toast"); if (old) old.remove(); t.id = "keys-toast"; host.appendChild(t); }

/* ---------- skip a minigame failed twice ---------- */
const MINIGAME_STEPS = ["dance", "haul", "race", "catch", "develop", "brawl", "rescue"];
const baseFail = failMission;
failMission = function (why) {
  if (mission && state !== "failed") {
    const s = mission.def.steps[mission.i], key = mission.id + ":" + mission.i;
    mission.fails = mission.fails || {}; mission.fails[key] = (mission.fails[key] || 0) + 1;
    baseFail(why);
    let b = document.getElementById("f-skip");
    const can = s && MINIGAME_STEPS.some((k) => s[k]) && mission.fails[key] >= 2;
    if (can && !b) { b = document.createElement("button"); b.className = "btn ghost"; b.id = "f-skip"; b.type = "button"; b.textContent = "Skip this part"; b.addEventListener("click", skipStep); document.getElementById("f-retry").after(b); }
    if (b) b.hidden = !can;
    return;
  }
  baseFail(why);
};
function skipStep() { if (!mission) return; const i = mission.i; retryMission(); while (scene) advanceScene(true); beginStep(i + 1); banner = { text: "Skipped", t: 60 }; }

/* ---------- phone limits ---------- */
function capActors() {
  if (fx.length > (TOUCH ? 160 : 260)) fx.splice(0, fx.length - (TOUCH ? 160 : 260));
  if (texts.length > 24) texts.splice(0, texts.length - 24);
}

/* ---------- balance (Story difficulty) ---------- */
function applyBalance() {
  if (MISSIONS["2-11"]) MISSIONS["2-11"].tin = EASY ? 4000 : 6000;
  for (const id of JOBS) { const j = MISSIONS[id]; if (j.basePay === undefined) j.basePay = j.pay; j.pay = Math.round(j.basePay * (EASY ? 1.25 : 1)); }
}

/* ---------- hooks ---------- */
function updateAccess() { capActors(); if (frameNo % 120 === 0) applyBalance(); }
const shakeOk = () => !A11Y.calm;
// roaming goondas on the streets: 0 normal, 1 few (one at a time, far apart), 2 none (missions and set fights only)
const goonsSetting = () => A11Y.goons || 0;
