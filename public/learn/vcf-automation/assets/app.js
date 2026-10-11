/* ============================================================
   DevOps From Basics: app glue.
   Two ways to read the same content:
   - Slides (Reveal.js): default on laptops and desktops.
   - Reading mode: a responsive page, one module at a time, default
     on phones, tablets and touch screens. The mode is chosen in
     templates/head.html (no flash) and can be switched any time.
   Shared: contents, reading time, quizzes, progress, "continue".
   ============================================================ */
(function () {
  /* progress is stored per course; the DevOps course keeps its original key names */
  const NS = document.documentElement.dataset.course && document.documentElement.dataset.course !== "devops" ? document.documentElement.dataset.course + ":" : "";
  const root = document.documentElement;
  const article = root.classList.contains("article-mode");
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };
  const modules = [...document.querySelectorAll(".slides > section[data-module]")];
  const moduleOf = (el) => el && el.closest(".slides > section[data-module]");
  const firstId = (m) => (m.querySelector(":scope > section[id]") || {}).id || "";
  const titleOf = (sec) => { const h = sec && sec.querySelector("h2, h1"); return h ? h.textContent.trim() : ""; };
  const label = (m) => `${m.dataset.num || ""} ${m.dataset.title || ""}`.trim();

  /* ---------- Reading time per module (about 200 words a minute) ---------- */
  modules.forEach((m) => {
    const words = m.textContent.trim().split(/\s+/).length;
    m.dataset.minutes = Math.max(1, Math.round(words / 200));
    const t = m.querySelector(".module-title");
    if (t && m.dataset.module !== "welcome") {
      const p = document.createElement("p");
      p.className = "small module-meta";
      p.textContent = `About ${m.dataset.minutes} minutes of reading, ${m.querySelectorAll(":scope > section").length} sections.`;
      t.appendChild(p);
    }
  });

  /* ---------- Table of contents ---------- */
  function buildToc() {
    const done = store.get(NS + "devops-done", {});
    const host = document.querySelector("#toc-grid");
    if (!host) return;
    host.innerHTML = "";
    modules.forEach((sec, i) => {
      const id = firstId(sec);
      if (!id) return;
      const a = document.createElement("a");
      a.href = "#/" + id;
      const n = sec.dataset.num || String(i).padStart(2, "0");
      const st = window.DevOpsPractice && DevOpsPractice.status(sec.dataset.module);
      const badge = st && st.key !== "new" ? `<span class="done s-${st.key}">${st.text}</span>` : done[sec.dataset.module] ? '<span class="done">done</span>' : "";
      a.innerHTML = `<b>${n}</b>${sec.dataset.title}${badge}
        <br><small>About ${sec.dataset.minutes} min · ${sec.dataset.level || ""}</small>`;
      host.appendChild(a);
    });
  }

  /* ---------- "Continue where you left off" (both modes) ---------- */
  function remember(id) {
    if (id && id !== "home") store.set(NS + "devops-last", id);
    const el = id && document.getElementById(id);
    const m = el && moduleOf(el);
    if (m && window.DevOpsPractice) DevOpsPractice.visit(m.dataset.module);
  }
  function continueLink() {
    const host = document.querySelector("#home .module-title");
    const id = store.get(NS + "devops-last", "");
    const sec = id && document.getElementById(id);
    if (!host || !sec) return;
    const m = moduleOf(sec);
    const p = document.createElement("p");
    p.className = "mt";
    p.innerHTML = `<a class="btn" href="#/${id}">Continue where you left off</a>
      <span class="small"> ${label(m)}: ${titleOf(sec)}</span>`;
    host.appendChild(p);
  }

  /* ---------- "Mark module complete" buttons ---------- */
  function wireDone() {
    document.querySelectorAll("[data-mark-done]").forEach((btn) => {
      const id = btn.dataset.markDone;
      const paint = () => {
        const d = store.get(NS + "devops-done", {});
        btn.textContent = d[id] ? "Completed (click to undo)" : "Mark this module as complete";
      };
      paint();
      btn.addEventListener("click", () => {
        const d = store.get(NS + "devops-done", {});
        d[id] = !d[id];
        store.set(NS + "devops-done", d);
        paint(); buildToc();
      });
    });
  }

  /* ---------- Where am I? ---------- */
  let active = null; // reading mode: the module on screen
  function currentSection() {
    if (!article) return window.Reveal && Reveal.isReady() ? Reveal.getCurrentSlide() : null;
    if (!active) return null;
    let best = active.querySelector(":scope > section");
    for (const s of active.querySelectorAll(":scope > section[id]")) {
      if (s.getBoundingClientRect().top <= 118) best = s; else break;
    }
    return best;
  }

  /* ---------- Site navigation ----------
     Courses live at abhishekrai.dev/learn/<course>/. A small bar links back to
     the portfolio, the course list and the other course. */
  const COURSE = document.documentElement.dataset.course === "vcf" ? "vcf" : "devops";
  const SITE = {
    devops: { name: "DevOps From Basics", other: "/learn/vcf-automation/", otherName: "VCF Automation From Basics" },
    vcf: { name: "VCF Automation From Basics", other: "/learn/devops/", otherName: "DevOps From Basics" }
  }[COURSE];
  function siteLinks(cls) {
    const nav = document.createElement("nav");
    nav.className = cls; nav.setAttribute("aria-label", "Site");
    nav.innerHTML = '<a href="/">AbhishekrAI.dev</a><span aria-hidden="true">/</span><a href="/learn/">Learn</a><span aria-hidden="true">/</span><span class="cur">' + SITE.name + '</span>' +
      '<a class="other" href="' + SITE.other + '">' + SITE.otherName + '</a>';
    return nav;
  }
  function crossLinks() {
    // the contents page and the end of the last module point to the rest of the site
    const host = document.getElementById("contents");
    if (host && !host.querySelector(".site-more")) {
      const p = document.createElement("p"); p.className = "small site-more";
      p.innerHTML = 'Also free: <a href="' + SITE.other + '">' + SITE.otherName + '</a>. <a href="/learn/">All courses</a> · <a href="/">AbhishekrAI.dev</a>';
      host.appendChild(p);
    }
  }

  /* ---------- Toolbar ---------- */
  function toolbar() {
    const bar = document.createElement("nav");
    bar.id = "toolbar";
    bar.setAttribute("aria-label", "Course tools");
    const mk = (text, title, fn) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = text; b.title = title; b.addEventListener("click", fn.bind(b)); bar.appendChild(b);
    };
    const reloadAt = () => {
      const u = new URL(location.href);
      u.searchParams.delete("view");
      const s = currentSection();
      u.hash = s && s.id ? "#/" + s.id : "";
      location.href = u.toString();
      location.reload();
    };
    mk("Contents", "All modules", () => (location.hash = "#/contents"));
    mk("Review", "Today's spaced review, progress, plan and certificate", () => (location.hash = "#/today"));
    mk(article ? "Slide mode" : "Reading mode",
      article ? "Show as presentation slides" : "One module at a time as a scrollable page (best on phones and tablets)",
      () => { try { localStorage.setItem("devops-view", article ? "slides" : "article"); } catch (e) { /* ignore */ } reloadAt(); });
    const dark = root.getAttribute("data-theme") === "dark";
    mk(dark ? "Light theme" : "Dark theme", "Switch colour theme (remembered)", () => {
      try { localStorage.setItem("devops-theme", dark ? "light" : "dark"); } catch (e) { /* ignore */ }
      reloadAt();
    });
    /* Open or close every "Explain in detail" section at once (remembered) */
    const allMore = () => document.querySelectorAll("details.more");
    const setAll = (open) => { allMore().forEach((d) => { d.open = open; }); store.set(NS + "devops-expand", open); };
    if (allMore().length) {
      const expanded = store.get(NS + "devops-expand", false);
      if (expanded) setAll(true);
      mk(expanded ? "Hide details" : "Show details", "Open or close every 'Explain in detail' section", function () {
        const open = this.textContent === "Show details";
        setAll(open);
        this.textContent = open ? "Hide details" : "Show details";
      });
    }
    if (!article) {
      mk("Overview", "Bird's-eye view of all slides (Esc)", () => Reveal.toggleOverview());
      mk("Search", "Search all slides (Ctrl+Shift+F)", () => { const s = Reveal.getPlugin("search"); s && s.toggle(); });
      mk("Keys", "Keyboard shortcuts (?)", () => Reveal.toggleHelp());
    } else {
      mk("Top", "Back to the top of this module", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
    document.body.appendChild(bar);
  }

  /* If the window crosses the phone/desktop threshold and the learner never picked a
     mode themselves, reload into the right one (keeping their place). */
  (function watchMode() {
    let chosen = null;
    try { chosen = localStorage.getItem("devops-view"); } catch (e) { /* ignore */ }
    if (chosen || new URLSearchParams(location.search).get("view")) return;
    const mq = matchMedia("(max-width: 900px), (pointer: coarse)");
    let t = null;
    const check = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (mq.matches === article || document.querySelector(".stage.expanded")) return;
        const s = currentSection();
        const u = new URL(location.href);
        u.hash = s && s.id ? "#/" + s.id : u.hash;
        location.replace(u.toString());
        location.reload();
      }, 400);
    };
    mq.addEventListener ? mq.addEventListener("change", check) : mq.addListener(check);
  })();

  buildToc();
  continueLink();
  wireDone();

  /* ============================================================
     READING MODE
     ============================================================ */
  if (article) {
    /* Code: trim + dedent like Reveal's data-trim, then highlight */
    const H = typeof RevealHighlight === "function" ? RevealHighlight() : null;
    document.querySelectorAll(".reveal pre code").forEach((code) => {
      const lines = code.innerHTML.replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n");
      const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
      code.innerHTML = lines.map((l) => l.slice(Number.isFinite(ind) ? ind : 0)).join("\n");
      if (H && H.hljs) { try { H.hljs.highlightElement(code); } catch (e) { /* leave plain */ } }
    });

    /* Tables scroll sideways on narrow screens instead of squashing */
    document.querySelectorAll(".reveal table").forEach((t) => {
      if (t.parentElement.classList.contains("table-wrap")) return;
      const w = document.createElement("div");
      w.className = "table-wrap";
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });

    /* Previous / next module at the end of every module */
    modules.forEach((m, i) => {
      const nav = document.createElement("nav");
      nav.className = "module-nav";
      nav.setAttribute("aria-label", "Module navigation");
      const prev = modules[i - 1], next = modules[i + 1];
      nav.innerHTML =
        (prev ? `<a class="prev" href="#/${firstId(prev)}"><small>Previous module</small>${label(prev)}</a>` : "<span></span>") +
        (next ? `<a class="next" href="#/${firstId(next)}"><small>Next module</small>${label(next)}</a>` : `<a class="next" href="${SITE.other}"><small>Next course</small>${SITE.otherName}</a>`);
      m.appendChild(nav);
    });

    /* Header: which module, which section, how far through */
    const rb = document.createElement("div");
    rb.id = "readbar";
    rb.appendChild(siteLinks("rb-site"));
    rb.insertAdjacentHTML("beforeend", '<div class="rb-text"><b></b><span class="rb-mod"></span><span class="rb-sec"></span></div><div class="rb-progress"><i></i></div>');
    document.body.appendChild(rb);
    const rbNum = rb.querySelector("b"), rbMod = rb.querySelector(".rb-mod"), rbSec = rb.querySelector(".rb-sec"), rbBar = rb.querySelector("i");
    let lastSaved = 0;
    function updateHeader() {
      if (!active) return;
      const s = currentSection();
      const secs = [...active.querySelectorAll(":scope > section[id]")];
      const idx = Math.max(0, secs.indexOf(s));
      rbNum.textContent = active.dataset.num || "";
      rbMod.textContent = active.dataset.title || "";
      rbSec.textContent = s && idx > 0 ? `${titleOf(s)} (${idx + 1} of ${secs.length})` : "";
      const max = document.documentElement.scrollHeight - window.innerHeight;
      rbBar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + "%";
      const now = Date.now();
      if (s && now - lastSaved > 800) { lastSaved = now; remember(s.id); }
    }
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; updateHeader(); });
    }, { passive: true });

    /* One module on screen at a time; #/id links switch module and scroll */
    function show(m) {
      if (m === active) return;
      modules.forEach((x) => x.classList.toggle("active-module", x === m));
      active = m;
      document.querySelectorAll(".stage.expanded").forEach((st) => st._enlarge.click());
    }
    function go(smooth) {
      const mm = location.hash.match(/^#\/([^/?]+)/);
      const el = mm && document.getElementById(decodeURIComponent(mm[1]));
      const target = el && el.closest("section[id]") ? el : null;
      const m = moduleOf(target) || active || modules[0];
      const switching = m !== active;
      show(m);
      if (target && target.id !== firstId(m)) target.scrollIntoView({ behavior: smooth && !switching ? "smooth" : "auto", block: "start" });
      else window.scrollTo({ top: 0, behavior: "auto" });
      updateHeader();
    }
    window.addEventListener("hashchange", () => go(true));

    /* Draw every diagram now (paused at its first frame) so layout is final before jumping */
    DevOpsAnim.buildAll();
    go(false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (location.hash) go(false); });

    /* Animations play when they scroll into view, pause when they leave */
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const st = en.target;
        const tl = st._tl;
        if (!tl) return;
        if (en.isIntersecting) {
          if (reduce) { if (!st._played) { st._played = true; tl.progress(1).pause(); } }
          else if (!st._played) { st._played = true; st._restart(); }
        } else if (!st.classList.contains("expanded") && !tl.paused()) {
          tl.pause();
        }
      });
    }, { threshold: 0.35 });
    document.querySelectorAll(".stage[data-anim]").forEach((st) => io.observe(st));

    toolbar(); crossLinks();
    return;
  }

  /* ============================================================
     SLIDE MODE (Reveal.js)
     ============================================================ */
  Reveal.initialize({
    hash: true,
    width: 1280,
    height: 800,
    margin: 0.03,
    minScale: 0.2,
    maxScale: 1.6,
    center: false,
    controls: true,
    controlsTutorial: true,
    progress: true,
    slideNumber: "c/t",
    transition: "slide",
    backgroundTransition: "fade",
    navigationMode: "default",
    /* Reveal 5 switches itself to its own scroll view below 435px wide. We have our own
       reading mode for small screens, so keep Reveal in slide view always. */
    scrollActivationWidth: null,
    plugins: [RevealHighlight, RevealNotes, RevealSearch, RevealZoom],
  });

  Reveal.on("ready", (e) => { toolbar(); crossLinks(); document.body.appendChild(siteLinks("sitebar")); DevOpsAnim.onSlide(e.currentSlide); });
  Reveal.on("slidechanged", (e) => { DevOpsAnim.onSlide(e.currentSlide); remember(e.currentSlide.id); });
})();
