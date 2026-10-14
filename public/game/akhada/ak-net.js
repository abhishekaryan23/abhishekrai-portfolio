/* Akhada online versus (beta).

   Two browsers each run the whole fight and swap only button presses through a small
   Cloudflare Durable Object room (/api/akhada/room/CODE). The fight is lockstep: a frame runs
   only once both players' inputs for it have arrived, and every input is scheduled D frames
   ahead so the wait is hidden in normal play. The host (who made the room) is the referee:
   it decides when a round ends, on a frame both sides apply, and it sends small corrections
   so floating-point differences between browsers never grow into a different fight. */
"use strict";

const NET = {
  ws: null, side: 0, code: "", peer: false, started: false, D: 6, t: 0,
  inp: [new Map(), new Map()], out: [], press: 0, ev: [], endAt: -1, snaps: new Map(), later: new Map(), strikes: 0,
  picks: [null, null], ready: [false, false], rtt: 0, stall: 0, seed: 1, stage: 0, lastPing: 0
};
const NBIT = { up: 1, down: 2, left: 4, right: 8, A: 16, J: 32, D: 64, run: 128, charge: 256, touch: 512, chord: 1024 };
const ORDER_EV = ["up", "down", "left", "right", "D", "run", "A", "J"];

function netSend(o) { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(o)); }
function netPress(action) { if (NBIT[action]) NET.press |= NBIT[action]; }
// this frame's buttons, from either key set or the touch pad
function netSample() {
  const held = (a) => heldK(0, a) || heldK(1, a);
  let h = 0;
  for (const a of ["up", "down", "left", "right", "A", "J", "D", "run", "charge"]) if (held(a)) h |= NBIT[a];
  if (held("A") && held("J") && held("D")) h |= NBIT.chord;
  if (TOUCH && !document.documentElement.classList.contains("kbd")) h |= NBIT.touch;
  const p = NET.press; NET.press = 0;
  return [h, p];
}
function netFlush() { if (NET.out.length) { netSend({ k: "i", i: NET.out }); NET.out = []; } }

// one frame of the online fight; false when the opponent's input for it has not arrived yet
function netStep() {
  if (!NET.started) { update(); return true; }
  const t = NET.t, mine = NET.inp[NET.side], theirs = NET.inp[1 - NET.side];
  if (!mine.has(t + NET.D)) { const v = netSample(); mine.set(t + NET.D, v); NET.out.push([t + NET.D, v[0], v[1]]); if (NET.out.length >= 3) netFlush(); }
  if (!theirs.has(t)) {
    NET.stall++; netFlush();
    if (NET.stall > 60 * 45) { netLost("The connection to your opponent was lost."); return false; }
    // insurance: after a long wait, send our recent inputs again (the other side keeps whichever it lacks)
    if (NET.stall % 240 === 0) { const again = []; for (let n = t; n <= t + NET.D; n++) if (mine.has(n)) again.push([n, ...mine.get(n)]); if (again.length) netSend({ k: "i", i: again }); }
    return false;
  }
  NET.stall = 0;
  for (const f of fighters) if (f.net) f.netIn = NET.inp[f.team].get(t);
  for (const e of NET.ev.filter((e) => e.at === t)) { if (e.kind === "end") { if (NET.side === 1) { checkEnd(e.w); if (!NET.started) return true; } NET.endAt = -1; endRound(e.w); } }
  NET.ev = NET.ev.filter((e) => e.at > t);
  update();
  if (NET.side === 1) {
    NET.snaps.set(t, fighters.map((f) => [f.x, f.y, f.z, f.hp, f.mp])); NET.snaps.delete(t - 240);
    const held = NET.later.get(t); if (held) { NET.later.delete(t); netFix(held); }
  }
  else if (t % 12 === 0 && (state === "fight" || state === "intro")) netSend({ k: "fix", t, f: fighters.map((f) => [f.x, f.y, f.z, f.hp, f.mp].map((v) => Math.round(v * 100) / 100)), tm: timer });
  mine.delete(t - 120); theirs.delete(t - 120);
  NET.t++;
  return true;
}
// turn the exchanged bits into the same hold / events the keyboard would give
function netApply(f) {
  const [h, p] = f.netIn || [0, 0], rev = f.fx.reverse ? -1 : 1, b = (n) => (h & NBIT[n]) !== 0;
  f.hold.mx = ((b("right") ? 1 : 0) - (b("left") ? 1 : 0)) * rev;
  f.hold.my = ((b("down") ? 1 : 0) - (b("up") ? 1 : 0)) * rev;
  f.hold.D = b("D"); f.hold.chord = b("chord"); f.hold.charge = b("charge") || b("chord"); f.touchInput = b("touch");
  if (b("run") && f.st === "walk" && f.hold.mx) startRun(f, Math.sign(f.hold.mx));
  for (const a of ORDER_EV) if (p & NBIT[a]) f.evq.push(a);
}
// the host calls a round over on a frame far enough ahead that the guest has not passed it yet
function netRoundOver(w) {
  if (NET.side !== 0 || NET.endAt >= 0) return;
  NET.endAt = NET.t + NET.D + 4;
  const e = { kind: "end", at: NET.endAt, w };
  NET.ev.push(e); netSend({ k: "ev", e });
}
function netLoading() {
  if (loadT > 1200) { netLost("Your opponent could not start the fight."); return; }
  const ids = match.list.map((s) => s.id);
  if (artReady(ids) && (IMG["st_" + stage.id] || failed.has("st_" + stage.id)) && !NET.ready[NET.side]) { NET.ready[NET.side] = true; netSend({ k: "ready" }); }
  if (NET.side === 0 && NET.ready[0] && NET.ready[1]) { const seed = (Math.random() * 2 ** 31) | 0; netSend({ k: "go", seed, D: NET.D }); netGo(seed); }
}
function netGo(seed) {
  NET.ready = [false, false]; NET.t = 0; NET.ev = []; NET.endAt = -1; NET.snaps.clear(); NET.later.clear(); NET.out = []; NET.press = 0;
  NET.inp = [new Map(), new Map()];
  for (let t = 0; t < NET.D; t++) { NET.inp[0].set(t, [0, 0]); NET.inp[1].set(t, [0, 0]); }
  seedRng(seed); tick = 0; NETON = true; NET.started = true; keysDown.clear();
  startRound();
}
function netMatchOver(w) {
  NET.started = false; NETON = false;
  const won = w === NET.side;
  $("end-title").textContent = w < 0 ? "Draw" : won ? "You win" : "You lose";
  $("end-result").textContent = fighters.map((f) => f.d.name + (f.team === NET.side ? " (you)" : "")).join(" vs ");
  $("end-note").textContent = NET.side === 0 ? "Rematch with the same fighters, or go back to pick again." : "Waiting for the host to start a rematch.";
  $("continue").textContent = "Rematch"; $("continue").disabled = NET.side !== 0; $("continue").dataset.online = "1";
  $("again").textContent = "Back to the room";
  $("card-menu").hidden = true; $("card-end").hidden = false; $("overlay").hidden = false;
}
/* anti-cheat. Each browser runs the whole fight, so editing your own copy only changes your own
   screen. What could still decide a result is the host's refereeing, so the guest checks every
   correction and round call against its own fight, and both sides reject impossible inputs.
   Three strikes and the match ends as no contest on both screens: tampering never wins. */
function strike(what) {
  NET.strikes = (NET.strikes || 0) + 1;
  if (NET.strikes >= 3 && NET.started) { netSend({ k: "void" }); netVoid(true); }
}
// the host called a round: does it match this browser's own fight?
function checkEnd(w) {
  const dying = (team) => fighters.filter((f) => f.team === team).every((f) => !alive(f) || f.hp <= f.maxHp * 0.35);
  const pct = (team) => fighters.filter((f) => f.team === team).reduce((a, f) => a + f.hp / f.maxHp, 0);
  if (timer > 2) { if ((w >= 0 && !dying(1 - w)) || (w < 0 && !dying(0) && !dying(1))) strike("end"); }
  else if (w >= 0 && pct(w) < pct(1 - w) - 0.1) strike("end");   // time up: the winner must not be clearly behind
}
function netVoid(local) {
  if (!NET.started && state === "over") return;
  NET.started = false; NETON = false; state = "over";
  $("end-title").textContent = "No contest";
  $("end-result").textContent = "";
  $("end-note").textContent = local ? "The two games disagreed about this fight, so it does not count. (Online is in beta.)" : "Your opponent's game reported a problem with this fight, so it does not count. (Online is in beta.)";
  $("continue").textContent = "Rematch"; $("continue").disabled = NET.side !== 0; $("continue").dataset.online = "1"; $("again").textContent = "Back to the room";
  $("card-menu").hidden = true; $("card-end").hidden = false; $("overlay").hidden = false;
}
function netDraw() {
  g.save(); g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  text("Online" + (NET.rtt ? " · " + Math.round(NET.rtt) + " ms" : ""), LW / 2, 28, 6, "#bfe0ff");
  if (NET.stall > 20) { g.fillStyle = "rgba(10,8,14,0.55)"; g.fillRect(0, LH / 2 - 14, LW, 28); text("Waiting for your opponent…", LW / 2, LH / 2, 9, "#f7f4ee"); }
  g.restore();
}

/* ---------- the room ---------- */
function netStatus(msg) { const el = $("net-status"); if (el) el.textContent = msg; }
function netCode() { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = new Uint8Array(5); crypto.getRandomValues(b); return [...b].map((x) => a[x % a.length]).join(""); }
function netOpen(code, role) {
  netClose();
  NET.code = code; NET.peer = false; NET.picks = [null, null];
  const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/akhada/room/" + code + "?role=" + role);
  NET.ws = ws;
  ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } netMsg(m); };
  ws.onclose = (e) => {
    if (NET.ws !== ws) return;
    NET.ws = null; NET.peer = false;
    if (e.code === 4404) netStatus("No room with that code. Check it with your friend, or create a room.");
    else if (e.code === 4409) netStatus(role === "join" ? "That room already has two players." : "That code is taken, try again.");
    else netStatus("Disconnected from the room.");
    netLost();
    netUi();
  };
  netStatus(role === "create" ? "Opening the room…" : "Joining room " + code + "…");
}
function netClose() { const ws = NET.ws; NET.ws = null; if (ws) try { ws.close(1000); } catch (e) { /* ignore */ } NET.peer = false; NET.started = false; NETON = false; }
// the other player left mid-fight: end it and go back to the room screen
function netLost(why) {
  if (state === "over" && $("continue").dataset.online) { $("continue").disabled = true; if (!why) $("end-note").textContent = "Your friend left the room."; return; }
  if (state === "fight" || state === "intro" || state === "ko" || state === "loading") {
    NET.started = false; NETON = false;
    $("end-title").textContent = why ? "Fight stopped" : "Your opponent left"; $("end-result").textContent = ""; $("end-note").textContent = why || "The fight could not continue.";
    $("continue").textContent = "Rematch"; $("continue").disabled = !(NET.peer && NET.side === 0); $("continue").dataset.online = "1"; $("again").textContent = "Back to the room";
    state = "over"; $("card-menu").hidden = true; $("card-end").hidden = false; $("overlay").hidden = false;
  }
}
function netMsg(m) {
  if (m.type === "hello") { NET.side = m.side; netStatus(NET.side === 0 ? "Room " + NET.code + ": send this code to a friend. Waiting for them to join…" : "Joined room " + NET.code + "."); netUi(); netSend({ k: "pick", id: cfg.p1 }); return; }
  if (m.type === "peer") { NET.peer = true; netStatus(NET.side === 0 ? "Your friend joined room " + NET.code + ". Pick fighters, then Start." : "In room " + NET.code + " with your friend. The host starts the fight."); netSend({ k: "pick", id: cfg.p1 }); netUi(); return; }
  if (m.type === "left") { NET.peer = false; netStatus("Your friend left room " + NET.code + "."); netLost(); netUi(); return; }
  switch (m.k) {
    case "i":
      if (!Array.isArray(m.i) || m.i.length > 40) { strike("inputs"); break; }
      for (const e of m.i) {
        const [t, h, p] = Array.isArray(e) ? e : [];
        // only real button bits for frames near now are accepted
        if (![t, h, p].every(Number.isInteger) || h < 0 || h > 2047 || p < 0 || p > 2047 || t < NET.t - 64 || t > NET.t + 64) { strike("inputs"); continue; }
        if (t >= NET.t) NET.inp[1 - NET.side].set(t, [h, p]);   // resent frames already played are ignored
      }
      break;
    case "ev": if (NET.side === 1 && m.e && m.e.kind === "end" && Number.isInteger(m.e.at) && [-1, 0, 1].includes(m.e.w) && m.e.at > NET.t - 2) NET.ev.push(m.e); else strike("event"); break;
    case "void": netVoid(false); break;
    case "fix": netFix(m); break;
    case "pick": if (typeof m.id === "string" && ROSTER[m.id] && !ROSTER[m.id].hidden) { NET.picks[1 - NET.side] = m.id; netUi(); } break;
    case "start": if (NET.side === 1 && !NET.started) netBegin(m); break;
    case "abort": NET.ready = [false, false]; if (state === "loading" || NET.started) netLost("Your opponent left before the fight started."); break;
    case "ready": NET.ready[1 - NET.side] = true; break;
    case "go": if (NET.side === 1 && Number.isInteger(m.seed) && state === "loading" && match && match.online) { NET.D = clamp(m.D | 0, 1, 30); netGo(m.seed); } break;
    case "ping": netSend({ k: "pong", t: m.t }); break;
    case "pong": NET.rtt = NET.rtt ? NET.rtt * 0.7 + (performance.now() - m.t) * 0.3 : performance.now() - m.t; break;
  }
}
// the guest nudges itself toward the host's numbers for a frame both have already played
function netFix(m) {
  if (!NET.started || !Number.isInteger(m.t)) return;
  const mine = NET.snaps.get(m.t);
  if (!mine) {   // the host is ahead of this browser: hold the correction until that frame is played here
    if (m.t >= NET.t && m.t <= NET.t + 64 && NET.later.size < 8) NET.later.set(m.t, m);
    return;
  }
  if (!Array.isArray(m.f)) { strike("fix"); return; }
  // anti-cheat: a correction must be possible (health within the bar, inside the arena) and close
  // to what this browser computed for the same frame; small float drift is expected, big jumps are not
  for (let i = 0; i < fighters.length; i++) {
    const h = m.f[i], s = mine[i], f = fighters[i];
    if (!Array.isArray(h) || h.length !== 5 || !h.every(Number.isFinite)) { strike("fix"); return; }
    if (h[3] < 0 || h[3] > f.maxHp || h[4] < 0 || h[4] > 500 || h[0] < 0 || h[0] > AW || Math.abs(h[3] - s[3]) > f.maxHp * 0.44 || Math.abs(h[0] - s[0]) > 320) {
      if (m.t - (NET.fixStrikeAt ?? -999) >= 60) { NET.fixStrikeAt = m.t; strike("fix"); }
      return;
    }
  }
  fighters.forEach((f, i) => {
    const h = m.f[i], s = mine[i]; if (!h || !s) return;
    for (const [k, j, eps] of [["x", 0, 0.75], ["y", 1, 0.75], ["z", 2, 0.75], ["hp", 3, 0], ["mp", 4, 0.5]]) { const d = h[j] - s[j]; if (Math.abs(d) > eps) f[k] += d; }
    f.hp = clamp(Math.round(f.hp), 0, f.maxHp); f.mp = clamp(f.mp, 0, 500);
  });
  if (Number.isInteger(m.tm) && m.tm >= 0 && m.tm <= 99) { if (Math.abs(timer - m.tm) > 3) strike("timer"); else if (Math.abs(timer - m.tm) > 1) timer = m.tm; }
}
// both browsers load the same fight; the host's "go" starts it on frame 0 for both
function netBegin(m) {
  const okPick = (id) => ROSTER[id] && !ROSTER[id].hidden;
  if (!okPick(m.p0) || !okPick(m.p1) || !Number.isInteger(m.stage) || !STAGES[m.stage]) { strike("start"); return; }
  NET.started = false; NETON = false; NET.strikes = 0; NET.fixStrikeAt = -999;
  NET.stage = m.stage;
  const c = { mode: "versus", players: 2, lvl: 2, fair: true, online: true, p1: m.p0, p2: m.p1, stage: m.stage };
  NET.ready = [false, false];
  startMatch(c);
}
function netStart() {
  if (NET.side !== 0 || !NET.peer) return;
  const ok = (id) => id && ROSTER[id] && !ROSTER[id].hidden;
  const p0 = ok(NET.picks[0]) ? NET.picks[0] : ok(cfg.p1) ? cfg.p1 : "rai", p1 = ok(NET.picks[1]) ? NET.picks[1] : "kai";
  const stg = cfg.stage < 0 ? Math.floor(Math.random() * STAGES.length) : cfg.stage;
  NET.D = clamp(Math.ceil((NET.rtt || 80) / 2 / TICK) + 3, 4, 14);
  const m = { k: "start", p0, p1, stage: stg };
  netSend(m); netBegin(m);
}
setInterval(() => { if (NET.ws && NET.ws.readyState === 1) netSend({ k: "ping", t: performance.now() }); }, 2000);

/* ---------- menu wiring ---------- */
function netUi() {
  const on = cfg.mode === "online";
  $("onlinewrap").hidden = !on;
  if (!on) return;
  const inRoom = !!NET.ws;
  $("net-create").hidden = inRoom; $("net-joinrow").hidden = inRoom; $("net-leave").hidden = !inRoom;
  $("stagewrap").hidden = !(inRoom && NET.side === 0);
  NET.picks[NET.side] = cfg.p1;
  const b = $("start1");
  b.textContent = !inRoom ? "Create or join a room" : NET.side === 0 ? (NET.peer ? "Start online fight" : "Waiting for your friend") : "The host starts the fight";
  b.disabled = !(inRoom && NET.side === 0 && NET.peer);
  const op = NET.picks[1 - NET.side];
  $("net-opp").textContent = NET.peer ? "Your friend picked " + (op ? ROSTER[op].name : "…") + "." : "";
}
$("net-create").addEventListener("click", () => netOpen(netCode(), "create"));
$("net-join").addEventListener("click", () => { const c = $("net-code").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); if (c.length >= 4) netOpen(c, "join"); else netStatus("Type the code your friend sent you."); });
$("net-code").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("net-join").click(); } });
$("net-leave").addEventListener("click", () => { netClose(); netStatus("Create a room and send the code to a friend, or join theirs."); netUi(); });
if (cfg.mode === "online") buildGrids();
