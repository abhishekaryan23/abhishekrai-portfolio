/* Shared helpers for the arcade pages: theme toggle, colour tokens read
   from the site's CSS variables, a tiny synth, and the touch pad. */
"use strict";
(function () {
  const root = document.documentElement;
  const listeners = [];
  let cache = null;

  function tokens() {
    if (cache) return cache;
    const cs = getComputedStyle(root);
    const v = (n) => cs.getPropertyValue(n).trim();
    const dark = (root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
    cache = {
      dark, paper: v("--paper"), surface: v("--surface"), surface2: v("--surface2"), ink: v("--ink"), ink2: v("--ink2"),
      muted: v("--muted"), line: v("--line"), line2: v("--line2"), accent: v("--accent"), accentBg: v("--accent-bg"), good: v("--good"),
      // game-only colours, picked to sit next to the magenta accent in both themes
      teal: dark ? "#5cc8c0" : "#13756f", amber: dark ? "#e8b65a" : "#9a6400", red: dark ? "#ff7b72" : "#b42318"
    };
    return cache;
  }
  function changed() { cache = null; listeners.forEach((f) => f(tokens())); }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changed);

  const btn = document.getElementById("theme-btn");
  function label() { if (btn) btn.textContent = tokens().dark ? "Light" : "Dark"; }
  if (btn) btn.addEventListener("click", () => {
    root.dataset.theme = tokens().dark ? "light" : "dark";
    try { localStorage.setItem("site-theme", root.dataset.theme); } catch (e) { /* private mode */ }
    changed(); label();
  });
  label();

  /* sound: off until the first key press or tap (browsers require a gesture) */
  let ctx = null, muted = false;
  try { muted = localStorage.getItem("arcade-muted") === "1"; } catch (e) { /* ignore */ }
  const muteBtn = document.getElementById("mute-btn");
  function muteLabel() { if (muteBtn) muteBtn.textContent = muted ? "Sound off" : "Sound on"; }
  if (muteBtn) muteBtn.addEventListener("click", () => {
    muted = !muted; muteLabel();
    try { localStorage.setItem("arcade-muted", muted ? "1" : "0"); } catch (e) { /* ignore */ }
  });
  muteLabel();
  function tone(freq, dur = 0.08, type = "square", vol = 0.05, slide = 0) {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  function noise(dur = 0.08, vol = 0.08) {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = b; g.gain.value = vol; s.connect(g).connect(ctx.destination); s.start();
    } catch (e) { /* no audio */ }
  }

  /* full screen play: real fullscreen and a landscape lock where the
     browser allows it; otherwise the stage fills the window and, on a phone
     held upright, is turned sideways so the game still plays landscape. */
  const fs = { on: false, rot: false, api: false, wrap: null, canvas: null, onChange: null };
  function fitStage() {
    if (!fs.on) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    fs.rot = !(document.fullscreenElement || document.webkitFullscreenElement) && matchMedia("(pointer: coarse)").matches && vh > vw;
    fs.wrap.classList.toggle("rot", fs.rot);
    const W = fs.rot ? vh : vw, H = fs.rot ? vw : vh;
    fs.wrap.style.width = W + "px"; fs.wrap.style.height = H + "px";
    const c = fs.canvas, k = Math.min(W / c.width, H / c.height);
    c.style.width = Math.floor(c.width * k) + "px"; c.style.height = Math.floor(c.height * k) + "px";
  }
  function enterFs() {
    if (fs.on) return;
    fs.on = true; fs.wrap.classList.add("fs"); root.classList.add("fs-lock");
    const req = fs.wrap.requestFullscreen || fs.wrap.webkitRequestFullscreen;
    if (req) {
      try {
        const pr = req.call(fs.wrap, { navigationUI: "hide" });
        Promise.resolve(pr).then(() => { fs.api = true; return screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape"); }).catch(() => {}).finally(fitStage);
      } catch (e) { fs.api = false; }
    }
    fitStage(); if (fs.onChange) fs.onChange(true);
  }
  function exitFs() {
    if (!fs.on) return;
    fs.on = false; fs.wrap.classList.remove("fs", "rot"); root.classList.remove("fs-lock");
    fs.wrap.style.width = fs.wrap.style.height = ""; fs.canvas.style.width = fs.canvas.style.height = "";
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* not supported */ }
    if (document.fullscreenElement || document.webkitFullscreenElement) Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(() => {});
    if (fs.onChange) fs.onChange(false);
  }
  function setupFullscreen(onChange) {
    fs.wrap = document.getElementById("stage-wrap"); fs.canvas = fs.wrap && fs.wrap.querySelector("canvas"); fs.onChange = onChange;
    if (!fs.wrap) return;
    const open = document.getElementById("fs-btn"), close = document.getElementById("fs-exit");
    if (open) open.addEventListener("click", enterFs);
    if (close) close.addEventListener("click", exitFs);
    addEventListener("resize", fitStage);
    addEventListener("orientationchange", () => setTimeout(fitStage, 150));
    const left = () => { if (fs.on && fs.api && !document.fullscreenElement && !document.webkitFullscreenElement) exitFs(); };
    document.addEventListener("fullscreenchange", left); document.addEventListener("webkitfullscreenchange", left);
    addEventListener("keydown", (e) => { if (e.code === "Escape" && fs.on && !fs.api) exitFs(); });
  }

  /* touch pad: buttons carry data-code="KeyW" etc. and fire the same
     handlers as the keyboard. A .stick is an 8-way thumb pad whose
     data-codes list up, down, left and right. */
  function bindStick(el, onDown, onUp) {
    const [U, D, Lf, Rt] = el.dataset.codes.split(","), knob = el.querySelector("span"), DASH = el.dataset.dash;
    let held = new Set(), id = null;
    const set = (next) => {
      for (const c of held) if (!next.has(c)) onUp(c);
      for (const c of next) if (!held.has(c)) onDown(c);
      held = next;
    };
    const move = (e) => {
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      if (fs.on && fs.rot) [dx, dy] = [dy, -dx];         // the stage is turned 90 degrees
      const dist = Math.hypot(dx, dy), max = el.offsetWidth * 0.38, next = new Set();
      if (dist > el.offsetWidth * 0.12) {
        const a = Math.atan2(dy, dx), oct = Math.round(a / (Math.PI / 4));
        if ([-1, 0, 1].includes(oct)) next.add(Rt);
        if ([3, 4, -4, -3].includes(oct)) next.add(Lf);
        if ([1, 2, 3].includes(oct)) next.add(D);
        if ([-1, -2, -3].includes(oct)) next.add(U);
        if (DASH && dist > el.offsetWidth * 0.34 && Math.abs(dx) > Math.abs(dy) * 1.6) next.add(DASH);
      }
      const k = Math.min(1, max / (dist || 1));
      if (knob) knob.style.transform = "translate(" + dx * k + "px," + dy * k + "px)";
      set(next);
    };
    const end = (e) => { if (e.pointerId !== id) return; id = null; set(new Set()); if (knob) knob.style.transform = ""; el.classList.remove("on"); };
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); id = e.pointerId; try { el.setPointerCapture(id); } catch (x) { /* ignore */ } el.classList.add("on"); move(e); });
    el.addEventListener("pointermove", (e) => { if (e.pointerId === id) move(e); });
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  }
  function bindGroup(grp, onDown, onUp) {
    // One finger can slide across the buttons. Hit-testing uses each button's
    // own rectangle in the same coordinates as the touch (like the stick), not
    // elementFromPoint, which can be offset on phones after a zoom or when the
    // browser bars move.
    const buttons = [...grp.querySelectorAll("button[data-code]")];
    const fingers = new Map();     // pointerId -> button under that finger
    const at = (e) => {
      for (const b of buttons) { const r = b.getBoundingClientRect(); if (e.clientX >= r.left - 4 && e.clientX <= r.right + 4 && e.clientY >= r.top - 4 && e.clientY <= r.bottom + 4) return b; }
      return null;
    };
    const press = (id, b) => {
      const was = fingers.get(id); if (was === b) return;
      fingers.set(id, b);
      if (was) { was.classList.remove("on"); if (![...fingers.values()].includes(was)) onUp(was.dataset.code); }
      if (b) { b.classList.add("on"); onDown(b.dataset.code); if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) { /* ignore */ } }
    };
    grp.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const b = (e.target.closest && e.target.closest("button[data-code]")) || at(e);
      try { if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      press(e.pointerId, b);
    });
    const slide = (e) => { if (!fingers.has(e.pointerId)) return; const b = at(e); if (b) press(e.pointerId, b); };
    grp.addEventListener("pointermove", slide);
    document.addEventListener("pointermove", slide);
    const lift = (e) => { if (!fingers.has(e.pointerId)) return; press(e.pointerId, null); fingers.delete(e.pointerId); };
    for (const t of ["pointerup", "pointercancel"]) { grp.addEventListener(t, lift); document.addEventListener(t, lift); }
    // stop long-press menus and the 300 ms click from interfering
    grp.addEventListener("contextmenu", (e) => e.preventDefault());
    const reset = () => { for (const [id] of fingers) press(id, null); fingers.clear(); };
    addEventListener("blur", reset); document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
  }
  function bindPad(onDown, onUp) {
    document.querySelectorAll(".pad .stick[data-codes]").forEach((el) => bindStick(el, onDown, onUp));
    document.querySelectorAll(".pad .grp.act").forEach((el) => bindGroup(el, onDown, onUp));
    document.querySelectorAll(".pad button[data-code]").forEach((b) => {
      if (b.closest(".grp.act")) return;
      const code = b.dataset.code;
      const down = (e) => { e.preventDefault(); b.classList.add("on"); onDown(code); };
      const up = (e) => { e.preventDefault(); if (!b.classList.contains("on")) return; b.classList.remove("on"); onUp(code); };
      b.addEventListener("pointerdown", down);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      b.addEventListener("pointerleave", up);
    });
  }

  /* hidden extras across both games (and the home page logo), remembered in
     this browser. They are never listed or called out anywhere: a player just
     stumbles on them, and a short chime and a toast with the name say "nice". */
  const CATALOG = [
    ["bighead", "Big heads", "Rollback Street: an old arcade habit, entered at the right moment."],
    ["cat", "Gali cat", "Rollback Street: someone on Chandni Lane only wants a little attention."],
    ["hydrant", "Hand pump", "Rollback Street: not everything on the pavement is as sturdy as it looks."],
    ["vending", "Chai machine", "Rollback Street: the station sells more than tickets."],
    ["pigeon", "Patience", "Rollback Street: patience is rewarded up high."],
    ["train", "Mind the gap", "Rollback Street: timing matters on the Harbour Line."],
    ["walls", "Wall to wall", "Rollback Street: the edge of the screen can hit back."],
    ["taunt", "Showboat", "Rollback Street: confidence has its own move."],
    ["onecredit", "One credit", "Rollback Street: finish the whole night in one go."],
    ["letters", "Nani's letters", "Rollback Street: Nani wrote more than one letter."],
    ["unleash", "Fan of the Avatar", "Rollback Street: high above the lane, a fan poster (a nod to Aeos Games, no affiliation) is more than decoration."],
    ["chakra", "Chakra", "Rollback Street: once the glow is yours, keep it busy."],
    ["neon", "Neon costume", "Home page: the logo likes attention."],
    ["duck", "Rubber duck", "Ghost Deploy: debugging has a famous companion."],
    ["speed", "Speedrunner", "Ghost Deploy: be very, very quick."],
    ["clean", "Clean deploy", "Ghost Deploy: never be seen."],
    ["friday", "Friday deploy", "Ghost Deploy: some days are riskier than others."],
    ["reboot", "Off and on again", "Ghost Deploy: the oldest fix in IT."]
  ];
  const SKEY = "arcade:secrets";
  function found() { try { return JSON.parse(localStorage.getItem(SKEY)) || []; } catch (e) { return []; } }
  function hasSecret(id) { return found().includes(id); }
  function toast(msg) {
    const host = fs.on ? fs.wrap : document.body, t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    host.appendChild(t); requestAnimationFrame(() => t.classList.add("in"));
    setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, 3200);
  }
  function secret(id, quiet) {   // quiet: the caller shows its own message
    const list = found(); if (list.includes(id)) return false;
    list.push(id); try { localStorage.setItem(SKEY, JSON.stringify(list)); } catch (e) { /* private mode */ }
    const item = CATALOG.find((c) => c[0] === id);
    if (item && !quiet) toast(item[1]);
    [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.1, "triangle", 0.05), i * 80));
    return true;
  }
  // typed words (letters only) and key sequences such as the arcade code
  function onSequence(codes, cb) {
    let i = 0;
    addEventListener("keydown", (e) => { if (e.repeat) return; i = e.code === codes[i] ? i + 1 : e.code === codes[0] ? 1 : 0; if (i === codes.length) { i = 0; cb(); } });
  }
  const onWord = (w, cb) => onSequence(w.toUpperCase().split("").map((c) => "Key" + c), cb);

  // the big Start on the game screen (shown when the menu sits under the screen) presses the menu's own start button
  for (const b of document.querySelectorAll("[data-start]")) b.addEventListener("click", () => { const t = document.getElementById(b.dataset.start); if (t) t.click(); });
  window.Arcade = { tokens, onTheme: (f) => listeners.push(f), tone, noise, bindPad, setupFullscreen, isFullscreen: () => fs.on, enterFullscreen: () => enterFs(), secret, hasSecret, toast, onSequence, onWord };
})();
