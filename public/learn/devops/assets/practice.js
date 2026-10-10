/* ============================================================
   DevOps From Basics: practice engine (see ENGAGEMENT-RESEARCH.md)
   Everything is stored in this browser only (localStorage), no tracking.
   - Quizzes: per-option explanations, saved scores, retakes.
   - Every question feeds a spaced, mixed "Review 5" (1, 3, 7, 21 days).
   - Guess-first questions point to the slide that teaches the answer.
   - Self-explanation boxes and capstone checklists are saved.
   - Progress strip, weekly study log (no streaks), study planner with
     .ics calendar file, and a certificate that needs 80% on every quiz.
   ============================================================ */
(function () {
  /* progress is stored per course; the DevOps course keeps its original key names */
  const NS = document.documentElement.dataset.course && document.documentElement.dataset.course !== "devops" ? document.documentElement.dataset.course + ":" : "";
  const KEY = NS + "devops-practice";
  const MASTERY = 0.8;
  const INTERVALS = [1, 3, 7, 21]; // days
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  ["items", "quiz", "days", "text", "checks", "visited"].forEach((k) => { S[k] = S[k] || {}; });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } };

  /* ---------- dates (local calendar days) ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const dstr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dstr(new Date());
  const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return dstr(d); };
  const nice = (s) => new Date(s + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const logActivity = () => { const t = today(); S.days[t] = (S.days[t] || 0) + 1; };

  /* ---------- modules ---------- */
  const modules = [...document.querySelectorAll(".slides > section[data-module]")].filter((m) => m.dataset.module !== "welcome");
  const modOf = (el) => el.closest(".slides > section[data-module]");
  const firstId = (m) => (m.querySelector(":scope > section[id]") || {}).id || "";
  const label = (m) => `${m.dataset.num || ""} ${m.dataset.title || ""}`.trim();
  const minutes = (m) => Math.max(1, Math.round(m.textContent.trim().split(/\s+/).length / 200));
  const titleOf = (sec) => { const h = sec && sec.querySelector("h2, h1"); return h ? h.textContent.trim() : ""; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- question bank ---------- */
  const isFinal = (sec) => /quiz$/.test(sec.id || "");
  const bank = [];
  document.querySelectorAll(".slides section[id] .quiz .q").forEach((q) => {
    if (q.closest("#review-host")) return;
    const sec = q.closest("section[id]");
    const i = [...sec.querySelectorAll(".quiz .q")].indexOf(q);
    q.dataset.qid = `${sec.id}-q${i}`;
    const m = modOf(q);
    bank.push({ qid: q.dataset.qid, el: q, module: m ? m.dataset.module : "", kind: q.closest(".quiz.guess") ? "guess" : isFinal(sec) ? "final" : "check" });
  });
  const byQid = Object.fromEntries(bank.map((b) => [b.qid, b]));

  function schedule(qid, right) {
    const r = S.items[qid] || { box: 0, seen: 0, right: 0 };
    r.seen++; r.last = today();
    if (right) { r.right++; r.due = addDays(today(), INTERVALS[Math.min(r.box, INTERVALS.length - 1)]); r.box = Math.min(r.box + 1, INTERVALS.length - 1); }
    else { r.box = 0; r.due = addDays(today(), 1); }
    S.items[qid] = r;
  }

  /* ---------- answering a question (shared by slides and the review deck) ---------- */
  function wire(q, qid, onAnswer) {
    const ans = Number(q.dataset.answer);
    const opts = [...q.querySelectorAll("button.opt")];
    const guess = !!q.closest(".quiz.guess");
    opts.forEach((b, i) => {
      b.type = "button";
      b.addEventListener("click", () => {
        if (q.classList.contains("answered")) return;
        q.classList.add("answered");
        const right = i === ans;
        b.classList.add(right ? "right" : "wrong");
        opts[ans].classList.add("right");
        const why = (btn) => {
          if (!btn.dataset.why || btn.nextElementSibling?.classList.contains("opt-why")) return;
          const p = document.createElement("p");
          p.className = "opt-why";
          p.textContent = btn.dataset.why;
          btn.after(p);
        };
        why(b); if (!right) why(opts[ans]);
        if (guess && q.dataset.where && !q.querySelector(".where")) {
          const t = document.getElementById(q.dataset.where);
          if (t) {
            const p = document.createElement("p");
            p.className = "where";
            p.innerHTML = `You will see why in <a href="#/${t.id}">${esc(titleOf(t))}</a>.`;
            q.appendChild(p);
          }
        }
        schedule(qid, right);
        logActivity();
        save();
        onAnswer && onAnswer(right);
        refreshAll();
      });
    });
  }
  function resetQ(q) {
    q.classList.remove("answered");
    q.querySelectorAll("button.opt").forEach((b) => b.classList.remove("right", "wrong"));
    q.querySelectorAll(".opt-why, .where").forEach((n) => n.remove());
  }

  /* ---------- end-of-module quizzes: score, best, retake ---------- */
  bank.forEach((b) => wire(b.el, b.qid));
  document.querySelectorAll(".slides section[id]").forEach((sec) => {
    if (!isFinal(sec) || !sec.querySelector(".quiz .q")) return;
    const qs = [...sec.querySelectorAll(".quiz .q")];
    const m = modOf(sec);
    const mod = m ? m.dataset.module : sec.id;
    const box = document.createElement("div");
    box.className = "score-box";
    sec.querySelector(".quiz").after(box);
    const paint = () => {
      const done = qs.filter((q) => q.classList.contains("answered"));
      const right = done.filter((q) => !q.querySelector("button.opt.wrong"));
      const best = S.quiz[mod] ? Math.round(S.quiz[mod].best * 100) : null;
      if (done.length < qs.length) {
        box.innerHTML = `<p>${done.length} of ${qs.length} answered.${best !== null ? ` Your best so far: ${best}%.` : ""} ${Math.ceil(qs.length * MASTERY)} or more correct counts as mastered.</p>`;
        return;
      }
      const pct = right.length / qs.length;
      if (!box.dataset.recorded) {
        box.dataset.recorded = "1";
        const prev = S.quiz[mod] || { best: 0, attempts: 0 };
        S.quiz[mod] = { best: Math.max(prev.best, pct), last: pct, attempts: prev.attempts + 1, date: today() };
        save();
      }
      const mastered = pct >= MASTERY;
      box.innerHTML = `<p><b>${right.length} of ${qs.length} correct (${Math.round(pct * 100)}%).</b> ${mastered
        ? "Mastered. These questions will come back in your daily review so they stay fresh."
        : "Not mastered yet. Reread the slides behind the missed questions, then try again."}</p>
        <button type="button" class="btn retake">Try the quiz again</button>`;
      box.querySelector(".retake").addEventListener("click", () => { qs.forEach(resetQ); delete box.dataset.recorded; paint(); refreshAll(); });
      refreshAll();
    };
    qs.forEach((q) => q.addEventListener("click", () => setTimeout(paint, 0)));
    paint();
  });

  /* ---------- self-explanation boxes and checklists (saved) ---------- */
  document.querySelectorAll(".explain-prompt[data-id] textarea").forEach((ta) => {
    const id = ta.closest(".explain-prompt").dataset.id;
    ta.value = S.text[id] || "";
    let t;
    ta.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { const first = !S.text[id]; S.text[id] = ta.value; if (first && ta.value.trim()) logActivity(); save(); }, 500);
    });
    ta.addEventListener("keydown", (e) => e.stopPropagation()); // typing must not change slides
  });
  document.querySelectorAll("ul.checklist[data-id]").forEach((ul) => {
    const id = ul.dataset.id;
    const boxes = [...ul.querySelectorAll('input[type="checkbox"]')];
    const st = S.checks[id] || [];
    boxes.forEach((b, i) => {
      b.checked = !!st[i];
      b.addEventListener("change", () => { S.checks[id] = boxes.map((x) => x.checked); logActivity(); save(); refreshAll(); });
    });
  });

  /* ---------- module status ---------- */
  const done = () => { try { return JSON.parse(localStorage.getItem(NS + "devops-done")) || {}; } catch (e) { return {}; } };
  const hasQuiz = (m) => !!m.querySelector("section[id$='quiz'] .quiz .q");
  function status(m) {
    const id = m.dataset.module;
    const q = S.quiz[id];
    if (q && q.best >= MASTERY) return { key: "mastered", text: `Mastered (${Math.round(q.best * 100)}%)` };
    if (done()[id]) return { key: "done", text: q ? `Marked complete, quiz ${Math.round(q.best * 100)}%` : "Marked complete" };
    if (S.visited[id] || q) return { key: "started", text: q ? `Started, quiz ${Math.round(q.best * 100)}%` : "Started" };
    return { key: "new", text: "Not started" };
  }
  const finished = (m) => ["mastered", "done"].includes(status(m).key);

  /* ---------- Review 5: spaced and mixed ---------- */
  function pickReview() {
    const t = today();
    const visitedMods = new Set(Object.keys(S.visited).concat(Object.keys(S.quiz)));
    const pool = bank.filter((b) => visitedMods.has(b.module));
    const due = pool.filter((b) => S.items[b.qid] && S.items[b.qid].due <= t).sort((a, b) => S.items[a.qid].due.localeCompare(S.items[b.qid].due));
    const fresh = pool.filter((b) => !S.items[b.qid]);
    const mix = (list) => { // round-robin across modules so topics interleave
      const groups = {};
      list.forEach((b) => (groups[b.module] = groups[b.module] || []).push(b));
      const keys = Object.keys(groups).sort(() => Math.random() - 0.5);
      const out = [];
      while (keys.some((k) => groups[k].length)) keys.forEach((k) => groups[k].length && out.push(groups[k].shift()));
      return out;
    };
    const chosen = mix(due).slice(0, 5);
    mix(fresh.sort(() => Math.random() - 0.5)).forEach((b) => { if (chosen.length < 5) chosen.push(b); });
    return { chosen, dueCount: due.length };
  }
  function renderReview() {
    const host = document.getElementById("review-host");
    if (!host) return;
    const { chosen, dueCount } = pickReview();
    host.innerHTML = "";
    if (!chosen.length) {
      const next = Object.values(S.items).map((r) => r.due).filter(Boolean).sort()[0];
      host.innerHTML = Object.keys(S.visited).length
        ? `<p>Nothing is due today. ${next ? `Your next review is on ${nice(next)}.` : ""} Keep going with the next module.</p>`
        : `<p>Your review questions appear here once you have read a module. Start with <a href="#/${firstId(modules[0])}">${esc(label(modules[0]))}</a>.</p>`;
      return;
    }
    const intro = document.createElement("p");
    intro.className = "small";
    intro.textContent = `${Math.min(dueCount, chosen.length)} due for review, ${chosen.length - Math.min(dueCount, chosen.length)} new. Mixed across modules on purpose: telling similar ideas apart is the skill.`;
    host.appendChild(intro);
    const quiz = document.createElement("div");
    quiz.className = "quiz";
    let answered = 0;
    chosen.forEach((b) => {
      const c = b.el.cloneNode(true);
      resetQ(c);
      const m = modules.find((x) => x.dataset.module === b.module);
      const src = document.createElement("p");
      src.className = "q-source";
      src.textContent = m ? label(m) : "";
      c.prepend(src);
      quiz.appendChild(c);
      wire(c, b.qid, () => {
        answered++;
        if (answered === chosen.length) {
          const p = document.createElement("p");
          p.className = "review-done";
          const next = Object.values(S.items).map((r) => r.due).filter((d) => d > today()).sort()[0];
          p.innerHTML = `Done for today. ${next ? `Next review: ${nice(next)}.` : ""} <button type="button" class="btn">Another 5</button>`;
          p.querySelector("button").addEventListener("click", renderReview);
          host.appendChild(p);
        }
      });
    });
    host.appendChild(quiz);
  }

  /* ---------- progress strip ---------- */
  function renderProgress() {
    document.querySelectorAll(".progress-host").forEach((host) => {
      const st = modules.map(status);
      const fin = modules.filter(finished);
      const left = modules.filter((m) => !finished(m));
      const mins = left.reduce((a, m) => a + minutes(m), 0);
      const hrs = mins >= 90 ? `about ${Math.round(mins / 60)} hours` : `about ${mins} minutes`;
      const next = left[0];
      const line = fin.length === modules.length
        ? "Every module is finished. The daily review keeps it fresh."
        : fin.length >= modules.length / 2
          ? `${left.length} modules left, ${hrs} of reading. Next: ${esc(label(next))}.`
          : `${fin.length} of ${modules.length} modules finished. Next: ${esc(label(next))}, ${hrs} of reading in total remaining.`;
      host.innerHTML = `<ol class="mod-strip">${modules.map((m, i) =>
        `<li class="s-${st[i].key}"><a href="#/${firstId(m)}" title="${esc(label(m))}: ${st[i].text}"><span>${esc(m.dataset.num || "")}</span></a></li>`).join("")}</ol>
        <p class="strip-line">${line}</p>
        <p class="small strip-legend"><i class="s-mastered"></i> quiz 80% or more <i class="s-done"></i> marked complete <i class="s-started"></i> started</p>`;
    });
  }

  /* ---------- weekly study log (no streaks) ---------- */
  function renderLog() {
    const host = document.getElementById("log-host");
    if (!host) return;
    const now = new Date();
    const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekDays = [...Array(7)].map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return dstr(d); });
    const sessions = weekDays.filter((d) => S.days[d]).length;
    const cells = [];
    for (let w = 7; w >= 0; w--) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() - w * 7 + i);
        const k = dstr(d);
        const future = k > today();
        cells.push(`<i class="${S.days[k] ? "on" : ""}${future ? " future" : ""}" title="${k}${S.days[k] ? ": studied" : ""}"></i>`);
      }
    }
    host.innerHTML = `<p><b>This week: ${sessions} study day${sessions === 1 ? "" : "s"}.</b> ${sessions >= 3 ? "A steady rhythm." : "Two or three short sessions a week is plenty."}</p>
      <div class="log-grid" aria-label="Study days over the last 8 weeks">${cells.join("")}</div>
      <p class="small">Each square is a day you answered a question or wrote an explanation. Missing days are normal; just pick up again.</p>`;
  }

  /* ---------- certificate (mastery only) ---------- */
  function renderCert() {
    const host = document.getElementById("cert-host");
    if (!host) return;
    const graded = modules.filter(hasQuiz);
    const rows = graded.map((m) => {
      const q = S.quiz[m.dataset.module];
      const ok = q && q.best >= MASTERY;
      return `<tr><td>${esc(label(m))}</td><td>${q ? Math.round(q.best * 100) + "%" : "not taken"}</td><td>${ok ? "Mastered" : `<a href="#/${m.querySelector("section[id$='quiz']").id}">Take the quiz</a>`}</td></tr>`;
    }).join("");
    const left = graded.filter((m) => !(S.quiz[m.dataset.module] && S.quiz[m.dataset.module].best >= MASTERY));
    host.innerHTML = left.length
      ? `<p>${graded.length - left.length} of ${graded.length} quizzes mastered. The certificate unlocks when every module quiz is at 80% or more.</p>
         <div class="table-wrap"><table><tr><th>Module</th><th>Best score</th><th></th></tr>${rows}</table></div>`
      : `<p><b>Every quiz is mastered.</b> Type your name to create your certificate.</p>
         <p class="row"><input type="text" id="cert-name" placeholder="Your name" autocomplete="name"><button type="button" class="btn" id="cert-make">Create certificate</button></p>
         <div id="cert-out"></div>`;
    const btn = host.querySelector("#cert-make");
    if (btn) {
      const name = host.querySelector("#cert-name");
      name.value = S.name || "";
      name.addEventListener("keydown", (e) => e.stopPropagation());
      btn.addEventListener("click", () => { S.name = name.value.trim(); save(); drawCert(S.name, graded); });
    }
  }
  function drawCert(name, graded) {
    if (!name) return;
    const out = document.getElementById("cert-out");
    const c = document.createElement("canvas");
    c.width = 1600; c.height = 1130;
    const g = c.getContext("2d");
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--accent").trim() || "#a8186a";
    g.fillStyle = "#fbfaf7"; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "#cfc8bb"; g.lineWidth = 3; g.strokeRect(40, 40, c.width - 80, c.height - 80);
    g.fillStyle = accent; g.fillRect(40, 40, c.width - 80, 10);
    g.textAlign = "center"; g.fillStyle = "#66625b";
    g.font = "500 30px 'IBM Plex Sans', sans-serif"; g.fillText("Certificate of completion", 800, 170);
    g.fillStyle = "#1f2328"; g.font = "600 92px 'Newsreader', Georgia, serif"; g.fillText(name, 800, 300);
    g.font = "400 32px 'IBM Plex Sans', sans-serif"; g.fillStyle = "#3b3f45";
    g.fillText("has completed DevOps From Basics, passing every module quiz at 80% or higher:", 800, 380);
    g.font = "400 25px 'IBM Plex Sans', sans-serif"; g.fillStyle = "#1f2328";
    graded.forEach((m, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      g.textAlign = "left";
      g.fillText(`${label(m)}  (${Math.round(S.quiz[m.dataset.module].best * 100)}%)`, col ? 830 : 200, 460 + row * 44);
    });
    g.textAlign = "center"; g.fillStyle = "#66625b"; g.font = "400 24px 'IBM Plex Sans', sans-serif";
    g.fillText(`Issued ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`, 800, 1000);
    g.font = "400 20px 'IBM Plex Sans', sans-serif";
    g.fillText("Self-issued from quiz results stored in the learner's own browser. Ask the holder to explain any module.", 800, 1040);
    out.innerHTML = "";
    const img = new Image(); img.src = c.toDataURL("image/png"); img.alt = "Certificate"; img.className = "cert-img";
    const dl = document.createElement("a"); dl.className = "btn"; dl.textContent = "Download PNG"; dl.href = img.src; dl.download = "devops-from-basics-certificate.png";
    const pr = document.createElement("button"); pr.type = "button"; pr.className = "btn"; pr.textContent = "Print";
    pr.addEventListener("click", () => {
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<!doctype html><title>Certificate</title><style>@page{size:landscape;margin:0}body{margin:0}img{width:100%}</style><img src="${img.src}" onload="print()">`);
      w.document.close();
    });
    const row = document.createElement("p"); row.className = "row"; row.append(dl, pr);
    out.append(img, row);
  }

  /* ---------- study planner: printable plan + .ics calendar ---------- */
  function buildPlan(days, time, len, start) {
    const left = modules.filter((m) => !finished(m));
    const parts = [];
    left.forEach((m) => {
      const n = Math.max(1, Math.round(minutes(m) / len));
      for (let k = 1; k <= n; k++) parts.push({ m, k, n });
    });
    const sessions = [];
    let d = new Date(start + "T12:00:00");
    for (let guard = 0; sessions.length < parts.length && guard < 800; guard++) {
      if (days.includes(d.getDay())) sessions.push({ date: dstr(d), ...parts[sessions.length] });
      d.setDate(d.getDate() + 1);
    }
    return sessions;
  }
  function icsFor(sessions, time, len) {
    const base = location.href.split("#")[0].split("?")[0];
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const [hh, mm] = time.split(":");
    const fold = (s) => s.replace(/[,;\\]/g, (c) => "\\" + c);
    const ev = sessions.map((s, i) => [
      "BEGIN:VEVENT",
      `UID:devops-basics-${s.date}-${i}@local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${s.date.replace(/-/g, "")}T${hh}${mm}00`,
      `DURATION:PT${len}M`,
      `SUMMARY:${fold(`DevOps study: ${label(s.m)}${s.n > 1 ? ` (part ${s.k} of ${s.n})` : ""}`)}`,
      `DESCRIPTION:${fold(`Open ${base}#/${firstId(s.m)} and start with today's Review 5, then continue.`)}`,
      "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:DevOps study session", "END:VALARM",
      "END:VEVENT",
    ].join("\r\n"));
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DevOps From Basics//Study plan//EN", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
  }
  function renderPlan() {
    const host = document.getElementById("plan-host");
    if (!host) return;
    const P = S.plan || { days: [2, 4, 6], time: "19:00", len: 25, start: today() };
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    host.innerHTML = `<form class="plan-form">
      <fieldset><legend>Which days?</legend>${[1, 2, 3, 4, 5, 6, 0].map((i) =>
        `<label><input type="checkbox" value="${i}" ${P.days.includes(i) ? "checked" : ""}> ${names[i]}</label>`).join("")}</fieldset>
      <label>Time <input type="time" name="time" value="${P.time}"></label>
      <label>Minutes per session <select name="len">${[15, 20, 25, 30, 45, 60].map((v) => `<option ${v === P.len ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Start <input type="date" name="start" value="${P.start < today() ? today() : P.start}"></label>
      <button type="submit" class="btn">Make my plan</button></form><div id="plan-out"></div>`;
    const form = host.querySelector("form");
    form.querySelectorAll("input,select").forEach((x) => x.addEventListener("keydown", (e) => e.stopPropagation()));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const days = [...form.querySelectorAll("fieldset input:checked")].map((x) => Number(x.value));
      if (!days.length) { host.querySelector("#plan-out").innerHTML = "<p>Pick at least one day.</p>"; return; }
      const plan = { days, time: form.time.value || "19:00", len: Number(form.len.value), start: form.start.value || today() };
      S.plan = plan; save();
      const ses = buildPlan(plan.days, plan.time, plan.len, plan.start);
      const out = host.querySelector("#plan-out");
      if (!ses.length) { out.innerHTML = "<p>Every module is already finished.</p>"; return; }
      const rows = ses.map((s) => `<tr><td>${nice(s.date)}</td><td>${plan.time}</td><td><a href="#/${firstId(s.m)}">${esc(label(s.m))}</a>${s.n > 1 ? ` <span class="small">part ${s.k} of ${s.n}</span>` : ""}</td></tr>`).join("");
      out.innerHTML = `<p><b>${ses.length} sessions of ${plan.len} minutes, finishing around ${nice(ses[ses.length - 1].date)}.</b> Start each session with the Review 5 on this page.</p>
        <p class="row"><a class="btn" id="ics-dl">Add to my calendar (.ics)</a><button type="button" class="btn" id="plan-print">Print plan</button></p>
        <div class="table-wrap"><table><tr><th>Day</th><th>Time</th><th>Study</th></tr>${rows}</table></div>`;
      const blob = new Blob([icsFor(ses, plan.time, plan.len)], { type: "text/calendar" });
      const a = out.querySelector("#ics-dl");
      a.href = URL.createObjectURL(blob); a.download = "devops-study-plan.ics";
      out.querySelector("#plan-print").addEventListener("click", () => {
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(`<!doctype html><title>DevOps study plan</title><style>body{font:14px/1.5 system-ui,sans-serif;margin:32px;color:#1f2328}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}h1{font-family:Georgia,serif}</style>
          <h1>My DevOps study plan</h1><p>${ses.length} sessions of ${plan.len} minutes at ${plan.time}. Tick each one off.</p>
          <table><tr><th></th><th>Day</th><th>Study</th></tr>${ses.map((s) => `<tr><td>&#9744;</td><td>${nice(s.date)}</td><td>${esc(label(s.m))}${s.n > 1 ? ` (part ${s.k} of ${s.n})` : ""}</td></tr>`).join("")}</table><script>print()<\/script>`);
        w.document.close();
      });
    });
    if (S.plan) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit"));
  }

  /* ---------- reading mode: a stopping point about every 10 minutes ---------- */
  function stopPoints() {
    if (!document.documentElement.classList.contains("article-mode")) return;
    modules.forEach((m) => {
      let words = 0, part = 1;
      const secs = [...m.querySelectorAll(":scope > section[id]")];
      secs.forEach((s, i) => {
        words += s.textContent.trim().split(/\s+/).length;
        const next = secs[i + 1];
        if (next && words >= 2000) {
          const div = document.createElement("div");
          div.className = "stop-point";
          div.innerHTML = `<b>Good place to stop.</b> That was part ${part} of this module, about ${Math.round(words / 200)} minutes.
            Next: <a href="#/${next.id}">${esc(titleOf(next))}</a>. When you come back, "Continue where you left off" brings you here.`;
          s.after(div);
          words = 0; part++;
        }
      });
    });
  }

  function refreshAll() { renderProgress(); renderLog(); renderCert(); }

  /* ---------- public API (used by app.js) ---------- */
  window.DevOpsPractice = {
    visit(moduleId) { if (moduleId && moduleId !== "welcome" && !S.visited[moduleId]) { S.visited[moduleId] = today(); save(); renderProgress(); } },
    status(moduleId) { const m = modules.find((x) => x.dataset.module === moduleId); return m ? status(m) : null; },
    refresh: () => { refreshAll(); renderReview(); },
  };

  stopPoints();
  renderReview();
  renderPlan();
  refreshAll();
})();
