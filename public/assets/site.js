/* abhishekrai.dev: small, dependency-free behaviour. */
(function () {
  const root = document.documentElement;

  /* ---------- mobile menu ---------- */
  const menu = document.querySelector(".menu-btn");
  const nav = document.getElementById("nav");
  if (menu && nav) {
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
      menu.textContent = open ? "Close" : "Menu";
    });
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); menu.textContent = "Menu"; }
    });
  }

  /* ---------- theme ---------- */
  const themeBtn = document.getElementById("theme-btn");
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const paintBtn = () => { if (themeBtn) themeBtn.textContent = isDark() ? "Light" : "Dark"; };
  paintBtn();
  themeBtn && themeBtn.addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("site-theme", root.dataset.theme); } catch (e) { /* ignore */ }
    paintBtn(); drawFlow(false);
  });

  /* ---------- reveal on scroll ---------- */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = document.querySelectorAll(".reveal-up");
  if (reduce || !("IntersectionObserver" in window)) items.forEach((el) => el.classList.add("in"));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- hero diagram: request to running infrastructure ----------
     Plays once when visible (or shows the end state with reduced motion). */
  const svg = document.getElementById("flow");
  const cap = document.getElementById("flow-cap");
  const NS = "http://www.w3.org/2000/svg";
  const steps = [
    { x: 20, y: 30, t: "Request", s: "a form in the catalog", c: "A team asks for a VM or a Kubernetes cluster from a self-service catalog." },
    { x: 280, y: 30, t: "Policy", s: "approval, quota, lease", c: "Policies decide automatically: who may ask, how much, and for how long." },
    { x: 280, y: 125, t: "Blueprint", s: "infrastructure as code", c: "A versioned blueprint describes exactly what to build, every time." },
    { x: 20, y: 125, t: "Integrations", s: "IPAM, AD, CMDB, Ansible", c: "Workflows register the IP, join the domain, update the CMDB and configure the guest." },
    { x: 20, y: 220, t: "VCF 9", s: "vCenter, NSX, VKS", c: "VCF places it on the right cluster and network, with segmentation built in." },
    { x: 280, y: 220, t: "Ready", s: "minutes, not days", c: "The requester gets a compliant, networked machine. Day-2 actions stay self-service." },
  ];
  function el(tag, a, txt) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt) e.textContent = txt; svg.appendChild(e); return e; }
  let played = false;
  function drawFlow(animate) {
    if (!svg) return;
    svg.innerHTML = "";
    const css = getComputedStyle(root);
    const v = (n) => css.getPropertyValue(n).trim();
    const W = 220, H = 64;
    const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];
    const center = (s) => [s.x + W / 2, s.y + H / 2];
    const paths = links.map(([a, b]) => {
      const [x1, y1] = center(steps[a]), [x2, y2] = center(steps[b]);
      const d = x1 === x2 ? `M${x1} ${y1 + H / 2} L${x2} ${y2 - H / 2}` : `M${x1 + (x2 > x1 ? W / 2 : -W / 2)} ${y1} L${x2 - (x2 > x1 ? W / 2 : -W / 2)} ${y2}`;
      return el("path", { d, stroke: v("--line2"), "stroke-width": 2, fill: "none" });
    });
    const boxes = steps.map((s) => {
      const r = el("rect", { x: s.x, y: s.y, width: W, height: H, rx: 6, fill: v("--surface"), stroke: v("--line2"), "stroke-width": 1.5 });
      const a = el("text", { x: s.x + 16, y: s.y + 27, "font-size": 17, "font-weight": 600, fill: v("--ink") }, s.t);
      const b = el("text", { x: s.x + 16, y: s.y + 48, "font-size": 13, fill: v("--muted") }, s.s);
      return { r, a, b };
    });
    const light = (i) => {
      boxes.forEach((bx, j) => {
        bx.r.setAttribute("stroke", j === i ? v("--accent") : j < i ? v("--good") : v("--line2"));
        bx.r.setAttribute("fill", j === i ? v("--accent-bg") : v("--surface"));
      });
      paths.forEach((p, j) => p.setAttribute("stroke", j < i ? v("--good") : v("--line2")));
      cap.textContent = steps[i].c;
    };
    if (!animate || reduce) { light(steps.length - 1); return; }
    let i = 0;
    light(0);
    const timer = setInterval(() => { i++; if (i >= steps.length) { clearInterval(timer); return; } light(i); }, 1700);
  }
  if (svg) {
    drawFlow(false);
    if (!reduce && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !played) { played = true; drawFlow(true); io.disconnect(); } }, { threshold: 0.5 });
      io.observe(svg);
    }
  }

  /* ---------- course stats (read from the built courses, if available) ---------- */
  [["devops-stats", "/learn/devops/"], ["vcf-stats", "/learn/vcf-automation/"]].forEach(([id, url]) => {
    const t = document.getElementById(id);
    if (!t || location.protocol === "file:") return;
    fetch(url).then((r) => (r.ok ? r.text() : "")).then((html) => {
      if (!html) return;
      const mods = (html.match(/<section data-module="/g) || []).length - 1;
      const slides = (html.match(/<section id="/g) || []).length;
      const qs = (html.match(/class="q" data-answer=/g) || []).length;
      if (mods > 0) t.textContent = `${mods} modules · ${slides} slides · ${qs} practice questions`;
    }).catch(() => {});
  });

  /* ---------- a small secret: seven quick clicks on the logo ---------- */
  const brand = document.querySelector(".brand");
  if (brand) {
    let n = 0, t0 = 0;
    brand.addEventListener("click", () => {
      const now = Date.now(); n = now - t0 < 2500 ? n + 1 : 1; t0 = now;
      if (n < 7) return;
      n = 0;
      let list = [];
      try { list = JSON.parse(localStorage.getItem("arcade:secrets")) || []; } catch (e) { /* ignore */ }
      const isNew = !list.includes("neon");
      if (isNew) { list.push("neon"); try { localStorage.setItem("arcade:secrets", JSON.stringify(list)); } catch (e) { /* ignore */ } }
      const t = document.createElement("a");
      t.className = "toast"; t.href = "/game/street/"; t.setAttribute("role", "status");
      t.textContent = "A neon costume is waiting in Rollback Street";
      document.body.appendChild(t); requestAnimationFrame(() => t.classList.add("in"));
      setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, 4500);
    });
  }

  /* ---------- contact form (posts to the Worker at /functions/submit-contact) ---------- */
  const form = document.getElementById("contact-form");
  if (form) {
    const fb = document.getElementById("form-feedback");
    const btn = document.getElementById("submit-btn");
    const say = (msg, kind) => { fb.textContent = msg; fb.className = "feedback " + (kind || ""); };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form._honeypot.value) return;
      const name = form.name.value.trim(), email = form.email.value.trim(), message = form.message.value.trim();
      if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say("Please fill in your name, a valid email and a message.", "err"); return; }
      const key = "submitted_form_" + email.toLowerCase();
      try { if (localStorage.getItem(key)) { say("You have already sent a message from this address. I will reply soon.", "ok"); return; } } catch (e2) { /* ignore */ }
      btn.disabled = true; btn.textContent = "Sending...";
      say("");
      try {
        const res = await fetch("/functions/submit-contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, message }) });
        if (!res.ok) throw new Error(String(res.status));
        try { localStorage.setItem(key, "1"); } catch (e3) { /* ignore */ }
        form.reset();
        say("Thanks. Your message is on its way, and I will reply by email.", "ok");
      } catch (err) {
        say("Sorry, that did not send. Please email abhishek@abhishekrai.dev directly.", "err");
      } finally {
        btn.disabled = false; btn.textContent = "Send message";
      }
    });
  }
})();
