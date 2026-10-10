/* ============================================================
   DevOps From Basics — animation engine (GSAP + inline SVG)
   ------------------------------------------------------------
   Any element  <div class="stage" data-anim="NAME"></div>
   gets an SVG drawn by ANIMS[NAME] and a GSAP timeline that
   plays when its slide becomes visible. A "Replay" button and
   a caption bar are added automatically.
   ============================================================ */
(function () {
  gsap.registerPlugin(MotionPathPlugin);

  const NS = "http://www.w3.org/2000/svg";
  let C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    C = {
      card: v("--d-node"), card2: v("--d-node2"), line: v("--d-stroke"), ink: v("--ink"), muted: v("--muted"),
      teal: v("--d-a"), info: v("--d-a"), violet: v("--d-b"), amber: v("--d-hi"),
      good: v("--d-good"), bad: v("--d-bad"), brick: v("--d-brick"),
      goodBg: v("--d-good-bg"), badBg: v("--d-bad-bg"), hiBg: v("--d-hi-bg"), aBg: v("--d-a-bg"),
      chipInk: v("--d-chip-ink"), codeBg: v("--d-code-bg"), codeInk: v("--d-code-ink"),
    };
  }

  /* Copy hygiene for every diagram string: no emoji, no em dashes, no all-caps emphasis */
  const ACRONYMS = new Set("HTTP HTTPS DNS SSH TLS JSON JPEG TCP UDP MAC CPU RAM URL HTML API YAML SHA VPC AWS VMs ETH FCS CVE CVEs TTL ISP TLD SYN ACK GET ESXi KVM HCL SRE OIDC ECR GHCR ALB HEAD CMD FROM RUN COPY WORKDIR PATH NAT CDN IAM GPU MFA CIDR SLA SLO SLI RDS VCF NSX VKS ESX ABX IPAM CMDB SDDC SSO LDAP SAML RBAC VPN IOPS OVA OVF ISO REST SDK CLI".split(" "));
  function clean(str) {
    if (typeof str !== "string") return str;
    let t = str
      .replace(/([0-9])\uFE0F?\u20E3/g, "$1.")
      .replace(/\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}]*/gu, "")
      .replace(/\uFE0F/g, "")
      .replace(/\s*—\s*/g, ", ")
      .replace(/\b[A-Z][A-Z]{2,}\b/g, (w) => (ACRONYMS.has(w) ? w : w.toLowerCase()))
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s,:]+/, "")
      .trim();
    return /^[a-z][A-Z]/.test(t) ? t : t.charAt(0).toUpperCase() + t.slice(1); // keep vCenter, vSphere
  }

  /* ---------- tiny SVG helpers ---------- */
  function el(p, tag, a = {}, txt) {
    const e = document.createElementNS(NS, tag);
    for (const k in a) e.setAttribute(k, a[k]);
    if (txt != null) e.textContent = txt;
    if (p) p.appendChild(e);
    return e;
  }
  function text(p, x, y, s, o = {}) {
    return el(p, "text", {
      x, y, "text-anchor": o.anchor || "middle", "dominant-baseline": "middle",
      "font-size": o.fs || 16, "font-weight": o.fw || 600, fill: o.fill || C.ink,
      ...(o.attrs || {}),
    }, clean(s));
  }
  function box(p, x, y, w, h, label, o = {}) {
    const g = el(p, "g");
    g.rect = el(g, "rect", {
      x, y, width: w, height: h, rx: o.rx != null ? o.rx : 12,
      fill: o.fill || C.card, stroke: o.stroke || C.line, "stroke-width": o.sw || 2,
    });
    const lines = String(label).split("\n");
    const fs = o.fs || 17;
    const lh = fs * 1.25;
    const y0 = y + h / 2 - ((lines.length - 1) * lh) / 2;
    g.texts = lines.map((t, i) =>
      text(g, x + w / 2, y0 + i * lh, t, {
        fs: i === 0 ? fs : fs * 0.78, fw: i === 0 ? 700 : 500,
        fill: i === 0 ? o.color || C.ink : C.muted,
      })
    );
    g.cx = x + w / 2; g.cy = y + h / 2;
    return g;
  }
  function line(p, x1, y1, x2, y2, o = {}, ctx) {
    const a = { x1, y1, x2, y2, stroke: o.stroke || C.muted, "stroke-width": o.sw || 2.5 };
    if (o.dash) a["stroke-dasharray"] = o.dash;
    if (o.arrow && ctx) a["marker-end"] = `url(#${ctx.id}-ah)`;
    return el(p, "line", a);
  }
  function path(p, d, o = {}, ctx) {
    const a = { d, fill: "none", stroke: o.stroke || C.muted, "stroke-width": o.sw || 2.5 };
    if (o.dash) a["stroke-dasharray"] = o.dash;
    if (o.arrow && ctx) a["marker-end"] = `url(#${ctx.id}-ah)`;
    return el(p, "path", a);
  }
  /* a small labelled "chip" (packet, file, message) centered on 0,0 so we can move it with x/y */
  function chip(p, label, o = {}) {
    const g = el(p, "g");
    const w = o.w || label.length * 9 + 26, h = o.h || 32;
    g.rect = el(g, "rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2,
      fill: o.fill || C.amber, stroke: "none" });
    g.label = text(g, 0, 1, label, { fs: o.fs || 14, fw: 800, fill: o.color || C.chipInk });
    g.w = w;
    return g;
  }
  /* draw a line/path in like a pen stroke */
  function draw(tl, e, dur = 0.8, pos) {
    const len = e.getTotalLength ? e.getTotalLength() : 500;
    tl.fromTo(e, { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: dur, ease: "power1.inOut" }, pos);
  }
  /* simple person glyph (replaces emoji) */
  function person(p, x, y, col) {
    const g = el(p, "g");
    el(g, "circle", { cx: x, cy: y - 14, r: 9, fill: "none", stroke: col || C.ink, "stroke-width": 2.5 });
    el(g, "path", { d: `M ${x - 15} ${y + 18} Q ${x - 15} ${y - 2} ${x} ${y - 2} Q ${x + 15} ${y - 2} ${x + 15} ${y + 18}`, fill: "none", stroke: col || C.ink, "stroke-width": 2.5 });
    return g;
  }
  /* shield glyph centered on 0,0 */
  function shield(p, col) {
    const g = el(p, "g");
    el(g, "path", { d: "M0,-38 L32,-26 L32,4 C32,24 16,36 0,44 C-16,36 -32,24 -32,4 L-32,-26 Z", fill: C.goodBg, stroke: col, "stroke-width": 3 });
    text(g, 0, 4, "Sec", { fs: 15, fw: 700, fill: col });
    return g;
  }
  const pop = (tl, e, pos, d = 0.45) =>
    tl.from(e, { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%", duration: d, ease: "back.out(2)" }, pos);
  const fadeIn = (tl, e, pos, d = 0.4) => tl.from(e, { autoAlpha: 0, duration: d }, pos);
  const setFill = (tl, rect, color, pos) => tl.to(rect, { attr: { fill: color }, duration: 0.3 }, pos);
  const setText = (tl, node, s, pos) => tl.set(node, { textContent: clean(String(s)) }, pos);

  /* ============================================================
     ANIMATIONS — each gets ctx {svg, say(tl,text,pos), id} and
     returns a GSAP timeline.
     ============================================================ */
  const ANIMS = {};

  /* ---- 1. Client ↔ Server request/response ---- */
  ANIMS.clientServer = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const cl = box(s, 40, 120, 220, 120, "💻 Client\nyour browser / phone app", { stroke: C.teal });
    const sv = box(s, 740, 120, 220, 120, "🖥️ Server\nalways-on computer", { stroke: C.violet });
    el(s, "ellipse", { cx: 500, cy: 180, rx: 160, ry: 70, fill: C.card2, stroke: C.line, "stroke-dasharray": "6 6" });
    text(s, 500, 180, "🌐 Internet", { fs: 20, fill: C.muted });
    const req = chip(s, "GET /home  (request)"); req.setAttribute("transform", "translate(150,90)");
    const res = chip(s, "200 OK + HTML  (response)", { fill: C.good }); res.setAttribute("transform", "translate(850,280)");
    ctx.say(tl, "1️⃣ You type a URL and press Enter — the client builds a REQUEST", 0);
    pop(tl, req, 0.2);
    ctx.say(tl, "2️⃣ The request travels across the internet to the server", 1.2);
    tl.to(req, { x: 850, duration: 1.6, ease: "power1.inOut" }, 1.2);
    tl.to(req, { autoAlpha: 0, duration: 0.2 }, ">");
    ctx.say(tl, "3️⃣ The server runs code, reads a database, and builds the answer", ">");
    tl.to(sv.rect, { attr: { fill: C.card2, stroke: C.amber }, duration: 0.25, yoyo: true, repeat: 5 }, "<");
    ctx.say(tl, "4️⃣ It sends back a RESPONSE (status code + data)", ">0.2");
    pop(tl, res, "<");
    tl.to(res, { x: 150, duration: 1.6, ease: "power1.inOut" }, ">");
    ctx.say(tl, "5️⃣ The browser renders the page 🎉  — this round trip happens dozens of times per page!", ">");
    tl.to(cl.rect, { attr: { stroke: C.good, fill: C.goodBg }, duration: 0.4 }, "<");
    return tl;
  };

  /* ---- 2. Wall of confusion ---- */
  ANIMS.wallOfConfusion = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const dev = box(s, 40, 130, 240, 130, "👩‍💻 Developers\nGoal: ship CHANGES fast", { stroke: C.teal });
    const ops = box(s, 720, 130, 240, 130, "🧑‍🔧 Operations\nGoal: keep things STABLE", { stroke: C.violet });
    const wall = el(s, "g");
    for (let r = 0; r < 9; r++) for (let c = 0; c < 2; c++)
      el(wall, "rect", { x: 470 + c * 30 + (r % 2 ? 15 : 0) - (r % 2 && c ? 30 : 0), y: 50 + r * 32, width: 30, height: 30, fill: C.brick, stroke: C.line });
    text(wall, 500, 30, "🧱 THE WALL OF CONFUSION", { fs: 15, fill: C.amber });
    const pkg = chip(s, "📦 release-v2.zip"); pkg.setAttribute("transform", "translate(240,110)");
    const boom = text(s, 820, 310, "💥 Crashes in production!", { fs: 18, fill: C.bad });
    const shrug = text(s, 160, 310, "🤷 \"Works on my machine!\"", { fs: 18, fill: C.amber });
    const team = box(s, 330, 130, 340, 130, "🤝 ONE DevOps team\nshared goals · shared tools · shared on-call", { stroke: C.good, fill: C.goodBg });
    gsap.set(team, { autoAlpha: 0 });

    ctx.say(tl, "Old world: Devs write code for months, then 'throw it over the wall' to Ops", 0);
    pop(tl, pkg, 0.3);
    tl.to(pkg, { duration: 1.6, ease: "power1.inOut",
      motionPath: { path: [{ x: 240, y: 110 }, { x: 500, y: -10 }, { x: 760, y: 110 }], curviness: 1.4 } }, 0.9);
    ctx.say(tl, "Ops has never seen this code, environment differs, nothing is documented…", ">");
    pop(tl, boom, ">0.2");
    tl.to(ops.rect, { attr: { stroke: C.bad }, duration: 0.2, yoyo: true, repeat: 5 }, "<");
    pop(tl, shrug, ">0.3");
    ctx.say(tl, "…and everybody blames each other. Releases become slow, scary and rare.", "<");
    ctx.say(tl, "DevOps: tear down the wall — build it, ship it, run it, TOGETHER", ">1.4");
    tl.to([boom, shrug, pkg], { autoAlpha: 0, duration: 0.3 }, "<");
    tl.to(wall, { scaleY: 0, transformOrigin: "50% 100%", duration: 0.8, ease: "power2.in" }, "<");
    tl.to(dev, { x: 120, autoAlpha: 0, duration: 0.8 }, ">");
    tl.to(ops, { x: -120, autoAlpha: 0, duration: 0.8 }, "<");
    tl.to(team, { autoAlpha: 1, duration: 0.6 }, ">-0.2");
    return tl;
  };

  /* ---- 3. Waterfall vs DevOps cadence ---- */
  ANIMS.waterfallVsDevops = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    text(s, 20, 90, "Waterfall", { anchor: "start", fs: 20, fill: C.amber });
    text(s, 20, 250, "DevOps", { anchor: "start", fs: 20, fill: C.teal });
    [90, 250].forEach((y) => line(s, 170, y + 40, 970, y + 40, { stroke: C.line }));
    for (let m = 0; m <= 12; m++) {
      text(s, 170 + m * 66.6, 145, m ? `M${m}` : "", { fs: 11, fill: C.muted });
    }
    const phases = ["Requirements", "Design", "Build", "Test", "Release"];
    const widths = [130, 130, 220, 160, 50];
    let x = 170;
    const blocks = phases.map((p, i) => {
      const b = box(s, x, 60, widths[i] - 4, 60, p, { fs: 13, fill: C.hiBg, stroke: C.amber, rx: 6 });
      x += widths[i];
      return b;
    });
    const big = text(s, 900, 30, "One big release after about 12 months", { fs: 15, fill: C.amber, anchor: "end" });
    ctx.say(tl, "Waterfall: each phase must FINISH before the next one starts", 0);
    blocks.forEach((b, i) => tl.from(b, { scaleX: 0, transformOrigin: "0% 50%", duration: 0.55 }, i * 0.55 + 0.2));
    pop(tl, big, ">");
    ctx.say(tl, "Bugs found in month 11 are VERY expensive. Customers wait a year for feedback.", "<");
    ctx.say(tl, "DevOps: tiny changes, released continuously — plan→code→test→deploy every few days (or hours)", ">1.2");
    for (let i = 0; i < 24; i++) {
      const cx = 190 + i * 32;
      const d = el(s, "circle", { cx, cy: 290, r: 11, fill: C.teal });
      const t = text(s, cx, 291, "✓", { fs: 12, fill: C.chipInk, fw: 900 });
      tl.from([d, t], { scale: 0, transformOrigin: "50% 50%", duration: 0.2 }, `>-0.08`);
    }
    const small = text(s, 970, 340, "24 or more small, low-risk releases in the same year", { fs: 15, fill: C.teal, anchor: "end" });
    pop(tl, small, ">");
    ctx.say(tl, "Small batches = less risk, fast feedback, happier users. That's the heart of DevOps.", ">");
    return tl;
  };

  /* ---- 4. DevOps infinity loop ---- */
  ANIMS.devopsLoop = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const d = "M500,210 C400,60 160,60 160,210 C160,360 400,360 500,210 C600,60 840,60 840,210 C840,360 600,360 500,210";
    const glow = path(s, d, { stroke: C.card2, sw: 34 });
    const p = path(s, d, { stroke: C.teal, sw: 4 });
    text(s, 320, 210, "Dev", { fs: 34, fw: 900, fill: C.line });
    text(s, 680, 210, "Ops", { fs: 34, fw: 900, fill: C.line });
    const stages = [
      ["📝 Plan", "Decide WHAT to build: user stories, tickets (Jira, GitHub Issues)"],
      ["💻 Code", "Write code & commit to Git; review via Pull Requests"],
      ["🔨 Build", "Compile / package the code automatically (Maven, npm, docker build)"],
      ["🧪 Test", "Automated unit, integration & security tests run on every change"],
      ["📦 Release", "Version & approve a build that's ready to ship (artifact + tag)"],
      ["🚀 Deploy", "Push it to servers / Kubernetes automatically (CD)"],
      ["⚙️ Operate", "Keep it running: scaling, patching, configuration, incidents"],
      ["📈 Monitor", "Watch metrics, logs & user feedback… which feeds the next PLAN!"],
    ];
    const total = p.getTotalLength();
    const pos = [[290, 50], [95, 120], [95, 300], [290, 372], [710, 50], [905, 120], [905, 300], [710, 372]];
    const labels = stages.map(([name], i) => {
      const pt = p.getPointAtLength(((i + 0.5) / 8) * total);
      el(s, "circle", { cx: pt.x, cy: pt.y, r: 7, fill: C.line });
      return text(s, pos[i][0], pos[i][1], name, { fs: 17, fill: C.muted });
    });
    const dot = el(s, "circle", { r: 13, fill: C.amber, stroke: C.card, "stroke-width": 3 });
    draw(tl, p, 1.6, 0);
    tl.from(glow, { autoAlpha: 0, duration: 0.6 }, 0);
    tl.from(labels, { autoAlpha: 0, y: 8, stagger: 0.08, duration: 0.3 }, 0.6);
    let last = -1;
    tl.to(dot, {
      duration: 14, ease: "none", repeat: 1,
      motionPath: { path: p, align: p, alignOrigin: [0.5, 0.5] },
      onUpdate() {
        const i = Math.min(7, Math.floor(this.progress() * 8));
        if (i !== last) {
          last = i;
          labels.forEach((l, j) => { l.setAttribute("fill", j === i ? C.amber : C.muted); l.setAttribute("font-size", j === i ? 20 : 17); });
          ctx.cap.textContent = clean(`${stages[i][0]}: ${stages[i][1]}`);
        }
      },
    }, 1.4);
    return tl;
  };

  /* ---- 5. Linux filesystem tree ---- */
  ANIMS.linuxTree = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const root = box(s, 455, 20, 90, 50, "/", { fs: 26, stroke: C.amber });
    const kids = [
      ["/bin", "essential commands\nls, cp, cat"], ["/etc", "config files\nnginx.conf, passwd"],
      ["/home", "users' personal\nfolders"], ["/var", "variable data\nlogs in /var/log"],
      ["/usr", "user programs\n& libraries"], ["/tmp", "temporary files\nwiped on reboot"],
      ["/dev", "devices as files\n/dev/sda (disk)"], ["/root", "home of the\nsuperuser"],
    ];
    ctx.say(tl, "Everything starts at ROOT ( / ). Linux has ONE tree — no C:\\ or D:\\ drives", 0);
    pop(tl, root, 0.2);
    kids.forEach(([n, d], i) => {
      const x = 15 + i * 123, cx = x + 55;
      const l = line(s, 500, 70, cx, 150, { stroke: C.line });
      const b = box(s, x, 150, 110, 46, n, { fs: 17, stroke: C.teal });
      const t1 = d.split("\n");
      const tt = t1.map((t, k) => text(s, cx, 215 + k * 18, t, { fs: 12, fw: 500, fill: C.muted }));
      draw(tl, l, 0.35, `>${i ? -0.1 : 0.4}`);
      pop(tl, b, ">-0.1");
      tl.from(tt, { autoAlpha: 0, duration: 0.3 }, "<");
      ctx.say(tl, `${n} → ${d.replace("\n", " ")}`, "<");
    });
    const hx = 15 + 2 * 123 + 55;
    ["/home/abhi", "/home/priya"].forEach((n, i) => {
      const cx = hx - 70 + i * 140;
      const l = line(s, hx, 196, cx, 300, { stroke: C.line, dash: "4 4" });
      const b = box(s, cx - 62, 300, 124, 40, n, { fs: 14, stroke: C.violet });
      draw(tl, l, 0.3, ">0.3");
      pop(tl, b, ">-0.1");
    });
    ctx.say(tl, "Each user gets a folder under /home. '~' is a shortcut for YOUR home folder.", "<");
    const pth = text(s, 760, 330, "📍 Absolute path: /home/abhi/notes.txt", { fs: 15, fill: C.amber });
    pop(tl, pth, ">0.4");
    ctx.say(tl, "An ABSOLUTE path starts from /. A RELATIVE path starts from where you are now (pwd).", "<");
    return tl;
  };

  /* ---- 6. Linux permissions → octal ---- */
  ANIMS.permissions = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const chars = "-rwxr-xr--".split("");
    const cols = [C.muted, C.teal, C.teal, C.teal, C.amber, C.amber, C.amber, C.violet, C.violet, C.violet];
    const X = (i) => 140 + i * 72;
    const cells = chars.map((c, i) => box(s, X(i), 40, 62, 62, c, { fs: 30, stroke: cols[i], color: cols[i] }));
    const groups = [["file type", 0, 0, C.muted], ["OWNER (u)", 1, 3, C.teal], ["GROUP (g)", 4, 6, C.amber], ["OTHERS (o)", 7, 9, C.violet]];
    const glabels = groups.map(([n, a, b, col]) => text(s, (X(a) + X(b) + 62) / 2, 125, n, { fs: 15, fill: col }));
    ctx.say(tl, "ls -l shows permissions as 10 characters: e.g.  -rwxr-xr--", 0);
    tl.from(cells, { y: -30, autoAlpha: 0, stagger: 0.08, duration: 0.35 }, 0.2);
    ctx.say(tl, "1st = type (- file, d directory). Then 3 groups of rwx: OWNER, GROUP, OTHERS", ">0.2");
    tl.from(glabels, { autoAlpha: 0, stagger: 0.25, duration: 0.3 }, "<");
    const vals = { r: 4, w: 2, x: 1 };
    const order = ["r", "w", "x"];
    const nums = [];
    for (let i = 1; i < 10; i++) {
      const c = chars[i], want = order[(i - 1) % 3];
      const v = c === "-" ? 0 : vals[want];
      nums.push(text(s, X(i) + 31, 185, v, { fs: 26, fw: 800, fill: v ? cols[i] : C.line }));
    }
    const legend = text(s, 500, 230, "r = 4 (read)     w = 2 (write)     x = 1 (execute)     - = 0", { fs: 16, fill: C.ink });
    ctx.say(tl, "Each letter has a number value: r=4, w=2, x=1. A dash means 0.", ">0.6");
    fadeIn(tl, legend, "<");
    tl.from(nums, { autoAlpha: 0, y: -20, stagger: 0.12, duration: 0.3 }, ">");
    const sums = [[1, 3, "4+2+1 = 7"], [4, 6, "4+0+1 = 5"], [7, 9, "4+0+0 = 4"]].map(([a, b, t], k) =>
      text(s, (X(a) + X(b) + 62) / 2, 280, t, { fs: 18, fill: [C.teal, C.amber, C.violet][k] }));
    ctx.say(tl, "Add each group up…", ">0.3");
    tl.from(sums, { autoAlpha: 0, stagger: 0.3, duration: 0.3 }, "<");
    const cmd = text(s, 500, 335, "chmod 754 script.sh", { fs: 30, fw: 900, fill: C.good, attrs: { "font-family": "JetBrains Mono, monospace" } });
    pop(tl, cmd, ">0.3");
    ctx.say(tl, "…and you get the octal form: 754 → owner can do everything, group can read+run, others can only read", "<");
    return tl;
  };

  /* ---- 7. OSI encapsulation ---- */
  ANIMS.osi = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const L = [["7 Application", "HTTP, DNS, SSH"], ["6 Presentation", "TLS, JSON, JPEG"], ["5 Session", "sessions"], ["4 Transport", "TCP / UDP · ports"],
      ["3 Network", "IP · routers"], ["2 Data Link", "Ethernet · MAC · switches"], ["1 Physical", "cables, Wi-Fi, bits"]];
    const Y = (i) => 20 + i * 52;
    const left = L.map(([n, d], i) => box(s, 10, Y(i), 210, 46, `${n}\n${d}`, { fs: 14, rx: 8 }));
    const right = L.map(([n, d], i) => box(s, 780, Y(i), 210, 46, `${n}\n${d}`, { fs: 14, rx: 8 }));
    text(s, 115, 395, "💻 SENDER", { fs: 15, fill: C.teal });
    text(s, 885, 395, "🖥️ RECEIVER", { fs: 15, fill: C.violet });
    const wire = line(s, 220, Y(6) + 23, 780, Y(6) + 23, { stroke: C.line, sw: 4, dash: "3 6" });
    const pk = el(s, "g");
    const r = el(pk, "rect", { x: -60, y: -18, width: 120, height: 36, rx: 8, fill: C.amber });
    const t = text(pk, 0, 1, "DATA", { fs: 13, fw: 800, fill: C.chipInk, attrs: { "font-family": "JetBrains Mono, monospace" } });
    const steps = [
      ["DATA", 110, "L7-5: your app creates DATA (e.g. an HTTP request, encrypted by TLS)"],
      ["DATA", 110, ""], ["DATA", 110, ""],
      ["TCP|DATA", 150, "L4 Transport adds a TCP header (ports 51000 → 443) → now a SEGMENT"],
      ["IP|TCP|DATA", 190, "L3 Network adds an IP header (source & destination IP) → a PACKET"],
      ["ETH|IP|TCP|DATA|FCS", 260, "L2 Data Link wraps it with MAC addresses + checksum → a FRAME"],
      ["0110100101110…", 220, "L1 Physical turns it into BITS: electrical signals, light or radio waves"],
    ];
    gsap.set(pk, { x: 360, y: Y(0) + 23 });
    tl.set(r, { attr: { width: 110, x: -55 } }, 0);
    setText(tl, t, "DATA", 0);
    steps.forEach(([lab, w, cap], i) => {
      const at = i === 0 ? 0.2 : ">0.5";
      tl.to(pk, { y: Y(i) + 23, duration: 0.5 }, at);
      tl.set(r, { attr: { width: w, x: -w / 2 } }, "<");
      setText(tl, t, lab, "<");
      tl.to(left[i].rect, { attr: { stroke: C.amber, fill: C.card2 }, duration: 0.2 }, "<");
      if (cap) ctx.say(tl, cap, "<");
    });
    ctx.say(tl, "The bits travel over the network (through switches & routers) to the receiver", ">0.4");
    tl.to(pk, { x: 640, duration: 1.4, ease: "power1.inOut" }, "<");
    for (let i = 6; i >= 0; i--) {
      const lab = steps[i][0], w = steps[i][1];
      tl.to(pk, { y: Y(i) + 23, duration: 0.4 }, ">0.25");
      tl.set(r, { attr: { width: w, x: -w / 2 } }, "<");
      setText(tl, t, lab, "<");
      tl.to(right[i].rect, { attr: { stroke: C.violet, fill: C.card2 }, duration: 0.2 }, "<");
      if (i === 5) ctx.say(tl, "Receiver goes UP the stack, peeling off one header per layer (DE-capsulation)", "<");
    }
    ctx.say(tl, "✅ The web server finally gets the original DATA. Every layer only talks to its 'twin' layer.", ">0.3");
    return tl;
  };

  /* ---- 8. DNS lookup ---- */
  ANIMS.dns = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const N = {
      b: box(s, 20, 160, 170, 90, "💻 Browser\n+ OS cache", { stroke: C.teal, fs: 16 }),
      r: box(s, 300, 160, 210, 90, "🏢 Recursive Resolver\nISP / 8.8.8.8 / 1.1.1.1", { stroke: C.amber, fs: 16 }),
      root: box(s, 690, 20, 290, 80, "🌳 Root server ( . )\n13 named roots, many copies", { stroke: C.violet, fs: 15 }),
      tld: box(s, 690, 165, 290, 80, "🏷️ TLD server ( .com )\nrun by the registry", { stroke: C.violet, fs: 15 }),
      auth: box(s, 690, 310, 290, 80, "📒 Authoritative NS\nns1.example.com — knows the answer", { stroke: C.violet, fs: 15 }),
    };
    const pt = (n, side) => ({ x: side === "l" ? n.rect.x.baseVal.value : side === "r" ? n.rect.x.baseVal.value + n.rect.width.baseVal.value : n.cx, y: n.cy });
    const msg = chip(s, "", { w: 250 });
    gsap.set(msg, { autoAlpha: 0 });
    const hops = [
      ["b", "r", "where is example.com?", "1️⃣ Browser & OS check their cache — miss! Ask the recursive resolver"],
      ["r", "root", "where is example.com?", "2️⃣ Resolver (cache miss) asks a ROOT server"],
      ["root", "r", "ask the .com servers →", "3️⃣ Root doesn't know, but REFERS it to the .com TLD servers"],
      ["r", "tld", "where is example.com?", "4️⃣ Resolver asks the .com TLD server"],
      ["tld", "r", "ask ns1.example.com →", "5️⃣ TLD refers it to the domain's AUTHORITATIVE name server"],
      ["r", "auth", "A record for example.com?", "6️⃣ Resolver asks the authoritative server"],
      ["auth", "r", "93.184.215.14  (TTL 3600)", "7️⃣ The authoritative server answers with the IP (an A record) + TTL"],
      ["r", "b", "93.184.215.14", "8️⃣ Resolver caches it for TTL seconds and returns it. Browser now connects to the IP!"],
    ];
    Object.values(N).forEach((n, i) => pop(tl, n, i * 0.12));
    hops.forEach(([a, b, lab, cap], i) => {
      const A = N[a], B = N[b];
      const from = { x: A.cx, y: A.cy }, to = { x: B.cx, y: B.cy };
      tl.set(msg, { x: from.x, y: from.y - 60 }, ">0.4");
      setText(tl, msg.label, lab, "<");
      ctx.say(tl, cap, "<");
      tl.to(msg, { autoAlpha: 1, duration: 0.2 }, "<");
      tl.to(msg, { x: to.x, y: to.y - 60, duration: 1.1, ease: "power1.inOut" }, ">");
      tl.to(B.rect, { attr: { fill: C.card2 }, duration: 0.15, yoyo: true, repeat: 1 }, ">");
      tl.to(msg, { autoAlpha: 0, duration: 0.2 }, ">0.3");
    });
    return tl;
  };

  /* ---- 9. TCP 3-way handshake ---- */
  ANIMS.tcp = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    box(s, 120, 10, 160, 50, "💻 Client", { stroke: C.teal });
    box(s, 720, 10, 160, 50, "🖥️ Server :443", { stroke: C.violet });
    line(s, 200, 60, 200, 390, { stroke: C.line, dash: "4 6" });
    line(s, 800, 60, 800, 390, { stroke: C.line, dash: "4 6" });
    const msgs = [
      [200, 90, 800, 140, "SYN  (seq=100)", C.amber, "1️⃣ SYN: 'Hi, can we talk? My starting number is 100'"],
      [800, 160, 200, 210, "SYN-ACK  (seq=300, ack=101)", C.info, "2️⃣ SYN-ACK: 'Sure! Got your 100. Mine is 300'"],
      [200, 230, 800, 280, "ACK  (ack=301)", C.good, "3️⃣ ACK: 'Got your 300 — we're connected!'"],
    ];
    msgs.forEach(([x1, y1, x2, y2, lab, col, cap], i) => {
      const l = line(s, x1, y1, x2, y2, { stroke: col, sw: 3, arrow: true }, ctx);
      const t = text(s, 500, (y1 + y2) / 2 - 14, lab, { fs: 16, fill: col, attrs: { transform: `rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + (x2 < x1 ? 180 : 0)} 500 ${(y1 + y2) / 2 - 14})` } });
      ctx.say(tl, cap, i ? ">0.4" : 0.3);
      draw(tl, l, 0.9, "<");
      fadeIn(tl, t, ">-0.3");
    });
    const data = text(s, 500, 340, "⇄  Now data flows both ways reliably (ordered, acknowledged, retransmitted if lost)", { fs: 16, fill: C.ink });
    ctx.say(tl, "TCP = reliable phone call. UDP skips all this: fast 'postcards' with no guarantee (video calls, DNS, games)", ">0.5");
    fadeIn(tl, data, "<");
    return tl;
  };

  /* ---- 10. Ports analogy ---- */
  ANIMS.ports = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const bld = el(s, "g");
    el(bld, "rect", { x: 560, y: 30, width: 400, height: 330, rx: 10, fill: C.card, stroke: C.violet, "stroke-width": 2 });
    text(bld, 760, 55, "🏢 Server  IP 203.0.113.5  (the street address)", { fs: 15, fill: C.violet });
    const doors = [[22, "SSH — remote login"], [80, "HTTP — web"], [443, "HTTPS — secure web"], [5432, "PostgreSQL DB"], [6443, "Kubernetes API"]];
    const D = doors.map(([p, n], i) => box(bld, 580, 75 + i * 56, 360, 46, `Port ${p}  ·  ${n}`, { fs: 15, rx: 8 }));
    const pkt = chip(s, "to 203.0.113.5 : 443", { w: 230 });
    gsap.set(pkt, { x: 140, y: 200 });
    ctx.say(tl, "An IP address finds the BUILDING (computer). A PORT finds the right APARTMENT (program).", 0);
    pop(tl, bld, 0.2);
    tl.from(D, { autoAlpha: 0, x: 30, stagger: 0.15, duration: 0.3 }, ">");
    ctx.say(tl, "Ports are numbers 0–65535. Well-known ones (0–1023) have standard services.", ">0.2");
    pop(tl, pkt, ">0.4");
    ctx.say(tl, "A packet addressed to IP:PORT = 'street address + apartment number'", "<");
    tl.to(pkt, { x: 450, y: 75 + 2 * 56 + 23, duration: 1.2, ease: "power1.inOut" }, ">0.3");
    tl.to(D[2].rect, { attr: { fill: C.goodBg, stroke: C.good }, duration: 0.3 }, ">");
    ctx.say(tl, "✅ Delivered to the program LISTENING on port 443 (e.g. nginx). Check with:  ss -tulpn", "<");
    return tl;
  };

  /* ---- 11. Git's 4 areas ---- */
  ANIMS.gitAreas = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const names = ["📂 Working Directory\nfiles you edit", "📋 Staging Area\n'the shopping cart'", "🗄️ Local Repo (.git)\nsaved snapshots", "☁️ Remote (GitHub)\nshared with team"];
    const cols = [C.teal, C.amber, C.violet, C.info];
    const B = names.map((n, i) => box(s, 15 + i * 248, 140, 225, 110, n, { stroke: cols[i], fs: 17 }));
    const cmds = [["git add app.py", 0, 1], ["git commit -m \"login\"", 1, 2], ["git push", 2, 3]];
    const arrows = cmds.map(([c, a, b]) => {
      const x1 = 15 + a * 248 + 225, x2 = 15 + b * 248;
      const l = line(s, x1 + 2, 120, x2 - 4, 120, { stroke: C.muted, arrow: true }, ctx);
      const t = text(s, (x1 + x2) / 2 + 0, 95, c, { fs: 13, fill: C.amber, attrs: { "font-family": "JetBrains Mono, monospace" } });
      return [l, t];
    });
    const back = path(s, "M 880 255 C 880 360, 120 360, 120 255", { stroke: C.good, arrow: true, dash: "6 5" }, ctx);
    const backT = text(s, 500, 345, "git pull  (fetch + merge)  /  git clone", { fs: 14, fill: C.good, attrs: { "font-family": "JetBrains Mono, monospace" } });
    const f = chip(s, "📄 app.py ✏️", { w: 130 });
    gsap.set(f, { x: B[0].cx, y: 215 });
    tl.from(B, { autoAlpha: 0, y: 20, stagger: 0.15, duration: 0.35 }, 0);
    ctx.say(tl, "You edit app.py — Git notices it's MODIFIED in your working directory", ">");
    pop(tl, f, "<");
    cmds.forEach(([c], i) => {
      const caps = [
        "git add → put the change in the staging area (choose WHAT goes into the next snapshot)",
        "git commit → take a permanent snapshot (with message, author, time, unique SHA id)",
        "git push → upload your commits to the shared remote so teammates (and CI!) see them",
      ];
      ctx.say(tl, caps[i], ">0.5");
      draw(tl, arrows[i][0], 0.4, "<");
      fadeIn(tl, arrows[i][1], "<");
      tl.to(f, { x: B[i + 1].cx, duration: 0.9, ease: "power1.inOut" }, ">");
      tl.to(B[i + 1].rect, { attr: { fill: C.card2 }, duration: 0.2, yoyo: true, repeat: 1 }, ">");
    });
    ctx.say(tl, "Teammates run git pull to get your commit into THEIR working directory 🔁", ">0.5");
    draw(tl, back, 1, "<");
    fadeIn(tl, backT, "<");
    tl.to(f, { motionPath: { path: back, align: back, alignOrigin: [0.5, 0.5] }, duration: 1.4 }, "<");
    return tl;
  };

  /* ---- 12. Git branching & merging ---- */
  ANIMS.gitBranch = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    text(s, 20, 100, "main", { anchor: "start", fs: 16, fill: C.teal });
    text(s, 20, 260, "feature/login", { anchor: "start", fs: 16, fill: C.amber });
    const node = (x, y, lab, col) => {
      const g = el(s, "g");
      el(g, "circle", { cx: x, cy: y, r: 22, fill: col, stroke: C.card, "stroke-width": 2 });
      text(g, x, y + 1, lab, { fs: 13, fw: 800, fill: C.chipInk });
      return g;
    };
    const seq = [
      ["l", 160, 100, 240, 100, C.teal], ["n", 160, 100, "C1", C.teal, "Every commit is a snapshot; it points to its PARENT commit"],
      ["n", 240, 100, "C2", C.teal, "main grows: C1 → C2"],
      ["l", 240, 100, 360, 260, C.amber], ["n", 360, 260, "F1", C.amber, "git switch -c feature/login → a new pointer starting at C2. Work safely in isolation"],
      ["l", 360, 260, 480, 260, C.amber], ["n", 480, 260, "F2", C.amber, "More commits on the feature branch — main is untouched"],
      ["l", 240, 100, 480, 100, C.teal], ["n", 480, 100, "C3", C.teal, "Meanwhile a teammate's fix lands on main (C3)"],
      ["l", 480, 260, 640, 100, C.amber], ["l", 480, 100, 640, 100, C.teal], ["n", 640, 100, "M", C.violet, "Pull Request approved → git merge creates a MERGE commit with TWO parents"],
      ["l", 640, 100, 780, 100, C.teal], ["n", 780, 100, "C5", C.teal, "main continues. Delete the branch — branches in Git are cheap (just a 41-byte file)!"],
    ];
    seq.forEach((st) => {
      if (st[0] === "l") {
        const l = line(s, st[1], st[2], st[3], st[4], { stroke: st[5], sw: 4 });
        s.insertBefore(l, s.firstChild.nextSibling);
        draw(tl, l, 0.4, ">0.15");
      } else {
        const n = node(st[1], st[2], st[3], st[4]);
        pop(tl, n, ">-0.05");
        ctx.say(tl, st[5], "<");
        tl.to({}, { duration: 1.1 });
      }
    });
    const head = chip(s, "HEAD → main", { fill: C.good, w: 130 });
    gsap.set(head, { x: 780, y: 40 });
    pop(tl, head, ">");
    ctx.say(tl, "HEAD = 'you are here'. It points to the branch you have checked out.", "<");
    return tl;
  };

  /* ---- 13. CI/CD pipeline ---- */
  ANIMS.pipeline = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const st = ["📝 Commit", "🔨 Build", "🧪 Test", "🔐 Scan", "📦 Package", "🚀 Deploy"];
    const B = st.map((n, i) => box(s, 15 + i * 165, 130, 145, 80, n, { fs: 17 }));
    const status = st.map((_, i) => text(s, B[i].cx, 235, "", { fs: 14, fill: C.good }));
    for (let i = 0; i < 5; i++) line(s, 15 + i * 165 + 147, 170, 15 + (i + 1) * 165 - 3, 170, { stroke: C.line, arrow: true }, ctx);
    const dev = text(s, 87, 60, "👩‍💻 git push", { fs: 18, fill: C.teal });
    const tok = el(s, "circle", { r: 12, fill: C.amber, stroke: C.card, "stroke-width": 2 });
    gsap.set(tok, { x: B[0].cx, y: 110, autoAlpha: 0 });
    const msgs = ["triggered by webhook", "compiled", "all tests passed", "no critical CVEs", "image:v1.4.2", "live in prod"];
    const run = (fail) => {
      const at = fail ? ">1" : 0.3;
      tl.set(tok, { x: B[0].cx, autoAlpha: 1 }, at);
      ctx.say(tl, fail ? "Run #2: another push… this one has a bug 🐛" : "Run #1: a developer pushes code → the pipeline starts AUTOMATICALLY", "<");
      B.forEach((b, i) => {
        tl.set(status[i], { textContent: "" }, fail && i === 0 ? "<" : undefined);
      });
      for (let i = 0; i < st.length; i++) {
        tl.to(tok, { x: B[i].cx, duration: i ? 0.55 : 0.01 }, ">");
        if (fail && i === 2) {
          tl.to(B[i].rect, { attr: { fill: C.badBg, stroke: C.bad }, duration: 0.3 }, ">");
          tl.set(status[i], { textContent: "2 tests failed", attr: { fill: C.bad } }, "<");
          ctx.say(tl, "❌ Tests FAIL → pipeline STOPS. Broken code never reaches users!", "<");
          const fb = path(s, `M ${B[2].cx} 215 C ${B[2].cx} 330, 90 330, 90 215`, { stroke: C.bad, arrow: true, dash: "6 5" }, ctx);
          const fbt = text(s, 240, 320, "📧 dev notified in minutes", { fs: 15, fill: C.bad });
          draw(tl, fb, 0.8, ">0.2");
          fadeIn(tl, fbt, "<");
          ctx.say(tl, "Fast feedback: the dev fixes it while the code is still fresh in their head. Cheap & easy!", ">0.3");
          tl.to(tok, { autoAlpha: 0 }, "<");
          return;
        }
        tl.to(B[i].rect, { attr: { fill: C.goodBg, stroke: C.good }, duration: 0.25 }, ">");
        tl.set(status[i], { textContent: msgs[i], attr: { fill: C.good } }, "<");
      }
      ctx.say(tl, "✅ Every stage green → deployed automatically. Total time: ~8 minutes, zero manual steps", ">");
      tl.to(tok, { autoAlpha: 0 }, ">0.6");
      tl.to(B.map((b) => b.rect), { attr: { fill: C.card, stroke: C.line }, duration: 0.3 }, ">0.8");
      tl.set(status, { textContent: "" }, "<");
    };
    pop(tl, dev, 0);
    run(false);
    run(true);
    return tl;
  };

  /* ---- 14. VM vs Container ---- */
  ANIMS.vmVsContainer = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    text(s, 250, 20, "🖥️ Virtual Machines", { fs: 20, fill: C.amber });
    text(s, 750, 20, "📦 Containers", { fs: 20, fill: C.teal });
    const H = 42, base = 400;
    const L = (x, w, lvl, lab, col, fill) => box(s, x, base - (lvl + 1) * (H + 4), w, H, lab, { fs: 14, stroke: col, fill: fill || C.card, rx: 6 });
    const vm = [L(20, 460, 0, "Physical hardware (CPU, RAM, disk)", C.muted), L(20, 460, 1, "Host OS (or none, for bare-metal)", C.muted), L(20, 460, 2, "Hypervisor (VMware ESXi, KVM, Hyper-V)", C.amber)];
    const vmCols = [0, 1, 2].map((k) => [L(20 + k * 155, 150, 3, "Guest OS 🐧 (GBs)", C.bad, C.badBg), L(20 + k * 155, 150, 4, "Bins / Libs", C.muted), L(20 + k * 155, 150, 5, `App ${"ABC"[k]}`, C.amber, C.hiBg)]);
    const ct = [L(520, 460, 0, "Physical hardware (CPU, RAM, disk)", C.muted), L(520, 460, 1, "Host OS — ONE shared Linux kernel", C.muted), L(520, 460, 2, "Container runtime (containerd / Docker Engine)", C.teal)];
    const ctCols = [0, 1, 2].map((k) => [L(520 + k * 155, 150, 3, "Bins / Libs (MBs)", C.muted), L(520 + k * 155, 150, 4, `App ${"ABC"[k]}`, C.teal, C.goodBg)]);
    ctx.say(tl, "Both start with real hardware and an operating system…", 0);
    tl.from([vm[0], ct[0], vm[1], ct[1]], { y: 60, autoAlpha: 0, stagger: 0.2, duration: 0.4 }, 0.2);
    ctx.say(tl, "VMs use a HYPERVISOR to fake whole computers. Containers use a runtime that ISOLATES processes.", ">0.2");
    tl.from([vm[2], ct[2]], { y: 60, autoAlpha: 0, stagger: 0.2, duration: 0.4 }, "<");
    ctx.say(tl, "Each VM needs its OWN full guest operating system → heavy (GBs), boots in minutes", ">0.4");
    tl.from(vmCols.map((c) => c[0]), { y: 60, autoAlpha: 0, stagger: 0.15, duration: 0.4 }, "<");
    tl.from(vmCols.flatMap((c) => c.slice(1)), { y: 60, autoAlpha: 0, stagger: 0.08, duration: 0.3 }, ">");
    ctx.say(tl, "Containers SHARE the host kernel → only app + its libraries (MBs), start in milliseconds–seconds", ">0.6");
    tl.from(ctCols.flat(), { y: 60, autoAlpha: 0, stagger: 0.08, duration: 0.3 }, "<");
    ctx.say(tl, "Trade-off: VMs = stronger isolation (separate kernels). Containers = lighter & faster. Clouds often run containers INSIDE VMs!", ">0.8");
    return tl;
  };

  /* ---- 15. Docker build → push → run ---- */
  ANIMS.dockerFlow = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const df = box(s, 15, 140, 170, 90, "📄 Dockerfile\nthe recipe", { stroke: C.amber });
    const im = box(s, 270, 140, 170, 90, "💿 Image\nfrozen snapshot", { stroke: C.violet });
    const rg = box(s, 525, 140, 190, 90, "🏬 Registry\nDocker Hub · ECR · GHCR", { stroke: C.info });
    const cs = [0, 1, 2].map((k) => box(s, 800, 40 + k * 105, 185, 85, `🐳 Container ${k + 1}\nrunning process`, { stroke: C.teal, fs: 16 }));
    const arr = [[185, 270, "docker build"], [440, 525, "docker push"]].map(([a, b, t]) => {
      const l = line(s, a + 3, 185, b - 4, 185, { arrow: true }, ctx);
      const tt = text(s, (a + b) / 2, 160, t, { fs: 13, fill: C.amber, attrs: { "font-family": "JetBrains Mono, monospace" } });
      return [l, tt];
    });
    const runs = cs.map((c) => path(s, `M 718 185 C 760 185, 760 ${c.cy}, 797 ${c.cy}`, { arrow: true }, ctx));
    const rt = text(s, 757, 275, "docker run", { fs: 13, fill: C.amber, attrs: { "font-family": "JetBrains Mono, monospace" } });
    ctx.say(tl, "A Dockerfile is a text RECIPE: base OS, dependencies, your code, start command", 0);
    pop(tl, df, 0.2);
    ctx.say(tl, "docker build → follows the recipe and produces an IMAGE (read-only template, like a cake mould)", ">0.4");
    draw(tl, arr[0][0], 0.5, "<"); fadeIn(tl, arr[0][1], "<"); pop(tl, im, ">");
    ctx.say(tl, "docker push → uploads the image to a REGISTRY (an app store for images), tagged e.g. myapp:1.4", ">0.6");
    draw(tl, arr[1][0], 0.5, "<"); fadeIn(tl, arr[1][1], "<"); pop(tl, rg, ">");
    ctx.say(tl, "docker run (on ANY machine) → pulls the image and starts CONTAINERS: live, isolated copies. Same image = same behaviour everywhere!", ">0.6");
    runs.forEach((r, i) => draw(tl, r, 0.4, i ? "<0.15" : "<"));
    fadeIn(tl, rt, "<");
    tl.from(cs, { autoAlpha: 0, x: 30, stagger: 0.2, duration: 0.35 }, ">-0.2");
    return tl;
  };

  /* ---- 16. Image layers & cache ---- */
  ANIMS.layers = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const lines = ["FROM python:3.12-slim", "WORKDIR /app", "COPY requirements.txt .", "RUN pip install -r requirements.txt", "COPY . .", "CMD [\"python\",\"app.py\"]"];
    el(s, "rect", { x: 10, y: 30, width: 450, height: 330, rx: 10, fill: C.codeBg, stroke: C.line });
    text(s, 25, 50, "Dockerfile", { anchor: "start", fs: 13, fill: C.muted });
    const T = lines.map((l, i) => text(s, 25, 90 + i * 44, l, { anchor: "start", fs: 15, fw: 500, fill: C.codeInk, attrs: { "font-family": "JetBrains Mono, monospace" } }));
    const sizes = ["~45 MB base", "tiny", "1 KB", "~80 MB deps", "your code", "metadata only"];
    const cols = [C.info, C.muted, C.violet, C.amber, C.teal, C.muted];
    const Ls = lines.map((l, i) => box(s, 520, 330 - i * 50, 460, 44, `Layer ${i + 1}: ${l.split(" ")[0]} · ${sizes[i]}`, { fs: 14, stroke: cols[i], rx: 6 }));
    ctx.say(tl, "Each instruction in a Dockerfile creates a LAYER, stacked on top of the previous one", 0);
    lines.forEach((_, i) => {
      tl.to(T[i], { attr: { fill: C.amber }, duration: 0.15 }, ">0.2");
      tl.from(Ls[i], { y: -200, autoAlpha: 0, duration: 0.45, ease: "bounce.out" }, "<");
      tl.to(T[i], { attr: { fill: C.codeInk }, duration: 0.15 }, ">");
    });
    ctx.say(tl, "Now you edit app.py and run docker build again…", ">0.6");
    tl.to(T[4], { attr: { fill: C.bad }, duration: 0.2 }, "<");
    ctx.say(tl, "Layers 1-4 haven't changed → reused from CACHE instantly ⚡ (that's why we COPY requirements BEFORE the code)", ">0.8");
    [0, 1, 2, 3].forEach((i) => tl.to(Ls[i].rect, { attr: { fill: C.goodBg, stroke: C.good }, duration: 0.2 }, i ? "<0.1" : "<"));
    ctx.say(tl, "Only the changed layer and everything ABOVE it are rebuilt 🔨 → builds take seconds, not minutes", ">0.9");
    [4, 5].forEach((i) => tl.fromTo(Ls[i], { x: 0 }, { x: 8, duration: 0.06, repeat: 7, yoyo: true }, i === 4 ? "<" : ">"));
    tl.to([Ls[4].rect, Ls[5].rect], { attr: { stroke: C.amber, fill: C.hiBg }, duration: 0.3 }, ">");
    return tl;
  };

  /* ---- 17. Kubernetes architecture ---- */
  ANIMS.k8sArch = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const kc = box(s, 10, 50, 160, 90, "👩‍💻 kubectl\napply -f app.yaml", { stroke: C.amber, fs: 16 });
    el(s, "rect", { x: 210, y: 10, width: 780, height: 165, rx: 14, fill: C.card2, stroke: C.violet, "stroke-width": 2 });
    text(s, 230, 30, "🧠 CONTROL PLANE — the brain", { anchor: "start", fs: 15, fill: C.violet });
    const cp = ["🚪 kube-apiserver\nfront door, all talk goes here", "🗃️ etcd\nkey-value 'source of truth'", "📅 kube-scheduler\npicks a node for each pod", "🔁 controller-manager\nmakes actual = desired"]
      .map((n, i) => box(s, 225 + i * 190, 50, 178, 110, n, { fs: 14, stroke: C.violet }));
    const nodes = [0, 1, 2].map((k) => {
      const x = 10 + k * 330;
      el(s, "rect", { x, y: 215, width: 310, height: 190, rx: 14, fill: C.card2, stroke: C.teal, "stroke-width": 2 });
      text(s, x + 15, 235, `⚙️ Worker Node ${k + 1}`, { anchor: "start", fs: 15, fill: C.teal });
      text(s, x + 155, 390, "kubelet · kube-proxy · containerd", { fs: 12, fw: 500, fill: C.muted });
      return x;
    });
    const msg = chip(s, "Deployment: replicas=3", { w: 220 });
    gsap.set(msg, { x: 90, y: 160, autoAlpha: 0 });
    ctx.say(tl, "Kubernetes has a CONTROL PLANE (decides) and WORKER NODES (do the work)", 0);
    tl.from(cp, { autoAlpha: 0, y: -20, stagger: 0.15, duration: 0.35 }, 0.2);
    ctx.say(tl, "You describe WHAT you want in YAML and send it with kubectl", ">0.4");
    pop(tl, kc, "<");
    tl.to(msg, { autoAlpha: 1, duration: 0.2 }, ">0.2");
    ctx.say(tl, "1️⃣ kube-apiserver authenticates & validates the request…", ">");
    tl.to(msg, { x: cp[0].cx, y: 175, duration: 0.9 }, "<");
    tl.to(cp[0].rect, { attr: { fill: C.card2, stroke: C.amber }, duration: 0.3 }, ">");
    ctx.say(tl, "2️⃣ …and stores the DESIRED STATE in etcd", ">0.3");
    tl.to(msg, { x: cp[1].cx, duration: 0.7 }, "<");
    tl.to(cp[1].rect, { attr: { fill: C.card2, stroke: C.amber }, duration: 0.3 }, ">");
    tl.to(msg, { autoAlpha: 0, duration: 0.2 }, ">0.2");
    ctx.say(tl, "3️⃣ The controller sees '3 pods wanted, 0 exist' and creates 3 pod objects", ">0.2");
    tl.to(cp[3].rect, { attr: { fill: C.card2, stroke: C.amber }, duration: 0.3 }, "<");
    ctx.say(tl, "4️⃣ The scheduler picks the best node for each pod (CPU/RAM free, rules)…", ">0.9");
    tl.to(cp[2].rect, { attr: { fill: C.card2, stroke: C.amber }, duration: 0.3 }, "<");
    const pods = nodes.map((x, k) => {
      const g = el(s, "g");
      el(g, "rect", { x: x + 60, y: 260, width: 190, height: 100, rx: 50, fill: C.goodBg, stroke: C.good, "stroke-width": 2 });
      text(g, x + 155, 300, `🫛 Pod web-${k + 1}`, { fs: 16, fill: C.ink });
      text(g, x + 155, 325, "🐳 nginx container", { fs: 13, fw: 500, fill: C.muted });
      return g;
    });
    ctx.say(tl, "5️⃣ …and each node's kubelet tells the container runtime to start the containers ✅", ">0.9");
    tl.from(pods, { scale: 0, transformOrigin: "50% 50%", stagger: 0.25, duration: 0.45, ease: "back.out(2)" }, "<");
    return tl;
  };

  /* ---- 18. Kubernetes self-healing & scaling ---- */
  ANIMS.k8sHeal = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const desired = text(s, 30, 30, "📜 Desired: replicas = 3", { anchor: "start", fs: 20, fill: C.violet });
    const actual = text(s, 970, 30, "👀 Actual: 3", { anchor: "end", fs: 20, fill: C.good });
    const nx = [20, 350, 680];
    nx.forEach((x, k) => {
      el(s, "rect", { x, y: 70, width: 300, height: 290, rx: 14, fill: C.card2, stroke: C.teal, "stroke-width": 2 });
      text(s, x + 150, 92, `⚙️ Node ${k + 1}`, { fs: 15, fill: C.teal });
    });
    const mk = (x, y, lab) => {
      const g = el(s, "g");
      g.r = el(g, "rect", { x, y, width: 220, height: 64, rx: 32, fill: C.goodBg, stroke: C.good, "stroke-width": 2 });
      g.t = text(g, x + 110, y + 33, lab, { fs: 15, fill: C.ink });
      return g;
    };
    const p = [mk(60, 120, "🫛 web-a1"), mk(390, 120, "🫛 web-b2"), mk(720, 120, "🫛 web-c3")];
    ctx.say(tl, "Kubernetes constantly compares DESIRED state with ACTUAL state (the 'reconciliation loop')", 0);
    tl.from(p, { scale: 0, transformOrigin: "50% 50%", stagger: 0.2, duration: 0.4 }, 0.3);
    ctx.say(tl, "💥 Pod web-b2 crashes (bug, out of memory, or its node dies)…", ">1");
    tl.to(p[1].r, { attr: { fill: C.badBg, stroke: C.bad }, duration: 0.3 }, "<");
    setText(tl, p[1].t, "💀 web-b2 CrashLoop", "<");
    tl.to(p[1], { autoAlpha: 0, duration: 0.6 }, ">0.8");
    setText(tl, actual, "👀 Actual: 2  ⚠️", "<");
    tl.set(actual, { attr: { fill: C.bad } }, "<");
    ctx.say(tl, "Controller: 'Desired 3, actual 2 → create 1 more!' — no human woke up at 3 a.m. 😴", ">0.3");
    const n1 = mk(720, 210, "🫛 web-d4 (new)");
    pop(tl, n1, ">0.8");
    setText(tl, actual, "👀 Actual: 3", "<");
    tl.set(actual, { attr: { fill: C.good } }, "<");
    ctx.say(tl, "Traffic spike! You run:  kubectl scale deployment web --replicas=5  (or an autoscaler does it)", ">1.2");
    setText(tl, desired, "📜 Desired: replicas = 5", "<");
    const n2 = mk(60, 210, "🫛 web-e5 (new)"), n3 = mk(390, 210, "🫛 web-f6 (new)");
    tl.from([n2, n3], { scale: 0, transformOrigin: "50% 50%", stagger: 0.3, duration: 0.4, ease: "back.out(2)" }, ">0.8");
    setText(tl, actual, "👀 Actual: 5 ✅", ">");
    ctx.say(tl, "✅ Self-healing + scaling, all declarative: you say WHAT, Kubernetes figures out HOW", "<");
    return tl;
  };

  /* ---- 19. Load balancer ---- */
  ANIMS.loadBalancer = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const users = [0, 1, 2, 3].map((i) => person(s, 60, 70 + i * 80, C.teal));
    const lb = box(s, 330, 150, 200, 90, "⚖️ Load Balancer\nround-robin + health checks", { stroke: C.amber, fs: 16 });
    const sv = [0, 1, 2].map((i) => box(s, 760, 40 + i * 120, 220, 90, `🖥️ Server ${i + 1}`, { stroke: C.teal }));
    ctx.say(tl, "Many users → one public address. The load balancer spreads requests across servers", 0);
    tl.from(users, { autoAlpha: 0, x: -20, stagger: 0.1 }, 0);
    pop(tl, lb, 0.3); tl.from(sv, { autoAlpha: 0, x: 30, stagger: 0.15 }, 0.4);
    const send = (u, target, pos) => {
      const d = el(s, "circle", { r: 9, fill: C.amber });
      tl.set(d, { x: 95, y: 70 + u * 80, autoAlpha: 1 }, pos);
      tl.to(d, { x: 330, y: 195, duration: 0.5, ease: "none" }, ">");
      tl.to(d, { x: 760, y: sv[target].cy, duration: 0.5, ease: "none" }, ">");
      tl.to(sv[target].rect, { attr: { fill: C.card2 }, duration: 0.1, yoyo: true, repeat: 1 }, ">");
      tl.to(d, { autoAlpha: 0, duration: 0.1 }, "<");
    };
    let t = 1.4;
    for (let i = 0; i < 6; i++) { send(i % 4, i % 3, t); t += 0.45; }
    ctx.say(tl, "Round-robin: request 1 → server 1, request 2 → server 2, request 3 → server 3, repeat…", 1.4);
    t += 1.6;
    ctx.say(tl, "💀 Server 2 dies. Health check (GET /healthz every 5s) fails → it's removed from the pool", t);
    tl.to(sv[1].rect, { attr: { fill: C.badBg, stroke: C.bad }, duration: 0.3 }, t);
    setText(tl, sv[1].texts[0], "💀 Server 2 (unhealthy)", t);
    t += 1.2;
    for (let i = 0; i < 6; i++) { send(i % 4, i % 2 ? 2 : 0, t); t += 0.45; }
    ctx.say(tl, "✅ Users notice nothing — traffic only goes to healthy servers. That's HIGH AVAILABILITY.", t + 0.6);
    return tl;
  };

  /* ---- 20. Blue/Green deployment ---- */
  ANIMS.blueGreen = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    person(s, 70, 195, C.teal); text(s, 70, 240, "Users", { fs: 14, fill: C.muted });
    const rt = box(s, 150, 150, 170, 90, "🔀 Router / LB", { stroke: C.amber });
    const blue = box(s, 620, 40, 330, 110, "🔵 BLUE  — v1 (live)", { stroke: C.info, fill: C.aBg });
    const green = box(s, 620, 240, 330, 110, "🟢 GREEN — v2 (idle)", { stroke: C.good, fill: C.goodBg });
    const toB = path(s, "M 320 195 C 470 195, 470 95, 616 95", { stroke: C.info, sw: 8 });
    const toG = path(s, "M 320 195 C 470 195, 470 295, 616 295", { stroke: C.good, sw: 8 });
    gsap.set(toG, { autoAlpha: 0 });
    ctx.say(tl, "Two identical environments. BLUE serves 100% of users with version 1", 0);
    draw(tl, toB, 0.8, 0.3);
    ctx.say(tl, "Deploy v2 to GREEN. Test it with real infrastructure — users don't see it yet", ">0.6");
    tl.to(green.rect, { attr: { stroke: C.amber }, duration: 0.2, repeat: 5, yoyo: true }, "<");
    setText(tl, green.texts[0], "🟢 GREEN — v2 (tested ✓)", ">");
    ctx.say(tl, "Flip the switch: router now sends ALL traffic to GREEN. Instant release, zero downtime", ">0.6");
    tl.to(toB, { autoAlpha: 0.1, duration: 0.3 }, "<");
    tl.set(toG, { autoAlpha: 1 }, "<");
    draw(tl, toG, 0.6, "<");
    setText(tl, blue.texts[0], "🔵 BLUE — v1 (standby)", "<");
    setText(tl, green.texts[0], "🟢 GREEN — v2 (LIVE)", "<");
    ctx.say(tl, "Problem found? Flip back to BLUE in seconds ⏪ — that's an instant ROLLBACK", ">1.4");
    return tl;
  };

  /* ---- 21. Canary deployment ---- */
  ANIMS.canary = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    text(s, 500, 30, "🐤 Canary release — shift traffic gradually while watching metrics", { fs: 17, fill: C.amber });
    el(s, "rect", { x: 100, y: 120, width: 800, height: 70, rx: 12, fill: C.card, stroke: C.line });
    const v1 = el(s, "rect", { x: 100, y: 120, width: 800, height: 70, rx: 12, fill: C.info });
    const v2 = el(s, "rect", { x: 900, y: 120, width: 0, height: 70, rx: 12, fill: C.good });
    const lab = text(s, 500, 230, "v1: 100%   |   v2: 0%", { fs: 22, fill: C.ink });
    const err = text(s, 500, 290, "📈 v2 error rate: —", { fs: 18, fill: C.muted });
    const steps = [[5, "0.1%"], [25, "0.1%"], [50, "0.2%"], [100, "0.1%"]];
    ctx.say(tl, "Start: everyone on stable v1", 0);
    steps.forEach(([p, e]) => {
      const w = 8 * p;
      ctx.say(tl, p < 100 ? `Send ${p}% of users to v2 (the 'canary'). Watch errors & latency…` : "All metrics healthy at every step → promote v2 to 100% 🎉", ">1");
      tl.to(v2, { attr: { x: 900 - w, width: w }, duration: 0.8 }, "<");
      tl.to(v1, { attr: { width: 800 - w }, duration: 0.8 }, "<");
      setText(tl, lab, `v1: ${100 - p}%   |   v2: ${p}%`, "<");
      setText(tl, err, `📈 v2 error rate: ${e}  ✅ within limits`, ">0.2");
    });
    ctx.say(tl, "If errors had spiked at 5%, only 5% of users would be affected — and you'd roll back automatically (Argo Rollouts / Flagger)", ">1.4");
    return tl;
  };

  /* ---- 22. Infrastructure as Code ---- */
  ANIMS.iac = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    el(s, "rect", { x: 10, y: 20, width: 380, height: 370, rx: 10, fill: C.codeBg, stroke: C.line });
    text(s, 25, 40, "main.tf", { anchor: "start", fs: 13, fill: C.muted });
    const code = ['resource "aws_vpc" "main" {', '  cidr_block = "10.0.0.0/16"', "}", 'resource "aws_instance" "web" {', "  count         = 2", '  instance_type = "t3.micro"', "}", 'resource "aws_db_instance" "db" {', '  engine = "postgres"', "}"];
    code.forEach((l, i) => text(s, 25, 70 + i * 28, l, { anchor: "start", fs: 14, fw: 500, fill: C.codeInk, attrs: { "font-family": "JetBrains Mono, monospace", "xml:space": "preserve" } }));
    el(s, "rect", { x: 450, y: 20, width: 540, height: 370, rx: 14, fill: C.card2, stroke: C.amber, "stroke-width": 2, "stroke-dasharray": "8 6" });
    text(s, 470, 42, "☁️ AWS account · region ap-south-1", { anchor: "start", fs: 15, fill: C.amber });
    const cmd = text(s, 720, 410, "", { fs: 15, fill: C.good, attrs: { "font-family": "JetBrains Mono, monospace" } });
    const vpc = el(s, "g");
    el(vpc, "rect", { x: 470, y: 60, width: 500, height: 315, rx: 12, fill: "none", stroke: C.violet, "stroke-width": 2 });
    text(vpc, 490, 80, "🛡️ VPC 10.0.0.0/16", { anchor: "start", fs: 14, fill: C.violet });
    const res = [box(s, 500, 110, 200, 80, "🖥️ EC2 web-0\nt3.micro", { stroke: C.teal, fs: 15 }), box(s, 740, 110, 200, 80, "🖥️ EC2 web-1\nt3.micro", { stroke: C.teal, fs: 15 }), box(s, 620, 250, 200, 90, "🗄️ RDS\npostgres", { stroke: C.info, fs: 15 })];
    ctx.say(tl, "You DESCRIBE the infrastructure you want in code (Terraform's HCL language)", 0);
    setText(tl, cmd, "$ terraform init", 0.6);
    ctx.say(tl, "terraform init → downloads the AWS 'provider' plugin", "<");
    setText(tl, cmd, "$ terraform plan   → Plan: 4 to add, 0 to change, 0 to destroy", ">1.6");
    ctx.say(tl, "terraform plan → a DRY RUN: shows exactly what will change. Review it like a code diff!", "<");
    setText(tl, cmd, "$ terraform apply", ">2.2");
    ctx.say(tl, "terraform apply → calls the cloud APIs and creates everything, in the right order", "<");
    pop(tl, vpc, ">0.3");
    tl.from(res, { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%", stagger: 0.3, duration: 0.45, ease: "back.out(2)" }, ">");
    ctx.say(tl, "Terraform records what it built in a STATE file, so next time it only changes the DIFFERENCE", ">0.4");
    setText(tl, cmd, '$ git commit -m "infra: 2 web servers + db"', ">1.8");
    ctx.say(tl, "The code lives in Git → reviewed, versioned, repeatable. Need staging? Same code, different variables.", "<");
    return tl;
  };

  /* ---- 23. Monitoring & alerting ---- */
  ANIMS.monitoring = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    line(s, 80, 340, 700, 340, { stroke: C.line });
    line(s, 80, 40, 80, 340, { stroke: C.line });
    text(s, 40, 190, "CPU %", { fs: 13, fill: C.muted, attrs: { transform: "rotate(-90 40 190)" } });
    [0, 50, 100].forEach((v) => text(s, 65, 340 - v * 3, v, { fs: 12, fill: C.muted, anchor: "end" }));
    const th = line(s, 80, 100, 700, 100, { stroke: C.bad, dash: "8 6" });
    text(s, 700, 88, "alert threshold 80%", { fs: 12, fill: C.bad, anchor: "end" });
    const pts = [30, 35, 32, 40, 38, 45, 52, 60, 72, 85, 92, 95, 93, 60, 45, 40, 38];
    const d = pts.map((v, i) => `${i ? "L" : "M"} ${80 + i * 38.75} ${340 - v * 3}`).join(" ");
    const p = path(s, d, { stroke: C.teal, sw: 3.5 });
    const bell = box(s, 740, 40, 245, 80, "🔔 ALERT (Prometheus)\nCPU > 80% for 5 minutes", { stroke: C.bad, fill: C.badBg, fs: 15 });
    const page = box(s, 740, 150, 245, 70, "📱 On-call engineer paged\nvia PagerDuty / Slack", { stroke: C.amber, fs: 15 });
    const fix = box(s, 740, 250, 245, 80, "➕ Autoscaler adds 2 pods\nload spreads, CPU drops", { stroke: C.good, fill: C.goodBg, fs: 15 });
    ctx.say(tl, "Prometheus scrapes metrics every 15s; Grafana draws them as a graph", 0);
    tl.fromTo(p, { strokeDasharray: 2000, strokeDashoffset: 2000 }, { strokeDashoffset: 2000 - p.getTotalLength() * (10 / 16), duration: 3, ease: "none" }, 0.2);
    fadeIn(tl, th, 0.2);
    ctx.say(tl, "Traffic grows… CPU climbs past 80% and STAYS there", 1.6);
    pop(tl, bell, ">");
    ctx.say(tl, "An alert rule fires (not on every blip — only if it lasts, to avoid 'alert fatigue')", "<");
    pop(tl, page, ">0.8");
    ctx.say(tl, "A human is notified with a link to the dashboard & a runbook", "<");
    pop(tl, fix, ">0.8");
    ctx.say(tl, "Fix (or automation) kicks in → CPU returns to normal. Then: a blameless post-mortem 📝", "<");
    tl.to(p, { strokeDashoffset: 2000 - p.getTotalLength(), duration: 1.6, ease: "none" }, ">");
    return tl;
  };

  /* ---- 24. Shift left / cost of bugs ---- */
  ANIMS.shiftLeft = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const ph = [["Design", 1], ["Code", 6], ["Build/Test", 15], ["Staging", 30], ["Production", 100]];
    line(s, 60, 330, 960, 330, { stroke: C.line });
    text(s, 500, 25, "Relative cost to fix a security bug, by WHEN it's found (illustrative)", { fs: 16, fill: C.muted });
    const bars = ph.map(([n, v], i) => {
      const x = 90 + i * 175, h = v * 2.6;
      const r = el(s, "rect", { x, y: 330 - h, width: 120, height: h, rx: 6, fill: i < 2 ? C.good : i < 4 ? C.amber : C.bad });
      text(s, x + 60, 352, n, { fs: 15 });
      const t = text(s, x + 60, 315 - h, `${v}×`, { fs: 18, fw: 800 });
      return [r, t];
    });
    ctx.say(tl, "The later you find a vulnerability, the more it costs (rework, outages, breaches, fines)", 0);
    bars.forEach(([r, t], i) => {
      tl.from(r, { scaleY: 0, transformOrigin: "50% 100%", duration: 0.5 }, 0.3 + i * 0.3);
      fadeIn(tl, t, ">");
    });
    const sh = shield(s, C.good); gsap.set(sh, { x: 900, y: 150 });
    const arrow = text(s, 500, 110, "⬅  SHIFT LEFT: test security EARLY & automatically, in every commit", { fs: 18, fill: C.good });
    ctx.say(tl, "DevSecOps = move security checks LEFT, into coding & CI — not a gate at the very end", ">0.6");
    pop(tl, sh, "<");
    tl.to(sh, { x: 140, duration: 1.6, ease: "power2.inOut" }, ">");
    fadeIn(tl, arrow, "<0.4");
    return tl;
  };


  /* ---- 25. VCF Automation tenancy ---- */
  ANIMS.vcfTenancy = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const prov = box(s, 330, 15, 340, 70, "Provider\nthe cloud team running VCF Automation", { stroke: C.violet, fs: 17 });
    const orgs = [box(s, 60, 140, 380, 70, "Organization A (tenant)\nfor example: Finance", { stroke: C.teal, fs: 16 }),
                  box(s, 560, 140, 380, 70, "Organization B (tenant)\nfor example: Engineering", { stroke: C.teal, fs: 16 })];
    const projs = [[60, "Project: payroll"], [255, "Project: reports"], [560, "Project: web-shop"], [755, "Project: ci-builds"]]
      .map(([x, t]) => box(s, x, 260, 185, 60, t, { stroke: C.amber, fs: 14 }));
    const res = box(s, 60, 360, 880, 50, "Shared infrastructure: regions, vCenter clusters, NSX networks, storage", { stroke: C.muted, fs: 15, fill: C.card2 });
    const ln = (a, b) => line(s, a.cx, a.cy + 35, b.cx, b.cy - 30, { stroke: C.line });
    const L1 = orgs.map((o) => ln(prov, o));
    const L2 = projs.map((p, i) => ln(orgs[i < 2 ? 0 : 1], p));
    ctx.say(tl, "The provider runs the platform and decides which infrastructure each tenant may use", 0);
    pop(tl, prov, 0.2); pop(tl, res, 0.5);
    ctx.say(tl, "Each organization is a tenant with its own users, catalog and policies, isolated from other tenants", ">0.6");
    L1.forEach((l) => draw(tl, l, 0.4, "<")); tl.from(orgs, { autoAlpha: 0, y: -10, stagger: 0.2, duration: 0.4 }, "<0.2");
    ctx.say(tl, "Inside an organization, projects group people and set what they can deploy, where, and how much", ">0.8");
    L2.forEach((l) => draw(tl, l, 0.3, "<")); tl.from(projs, { autoAlpha: 0, y: -10, stagger: 0.15, duration: 0.35 }, "<0.2");
    ctx.say(tl, "Every deployment belongs to a project, so quotas, costs and permissions always have an owner", ">0.8");
    tl.to(projs.map((p) => p.rect), { attr: { fill: C.hiBg }, duration: 0.3, stagger: 0.1 }, "<");
    return tl;
  };

  /* ---- 26. VCF Automation self-service request ---- */
  ANIMS.vcfRequest = (ctx) => {
    const s = ctx.svg, tl = gsap.timeline();
    const steps = [["Catalog", "user picks an item"], ["Policy", "approval, limits"], ["Blueprint", "YAML template"],
      ["Placement", "tags pick a zone"], ["Provision", "vCenter + NSX"], ["Extensibility", "events run workflows"], ["Deployment", "ready, day-2 actions"]];
    const B = steps.map(([a, b], i) => box(s, 10 + i * 141, 140, 128, 80, `${a}\n${b}`, { fs: 15, stroke: C.line }));
    for (let i = 0; i < 6; i++) line(s, 10 + i * 141 + 129, 180, 10 + (i + 1) * 141 - 2, 180, { stroke: C.line, arrow: true }, ctx);
    const tok = chip(s, "request: 1 x Linux VM", { w: 190 });
    gsap.set(tok, { x: B[0].cx, y: 90, autoAlpha: 0 });
    const caps = [
      "A user opens the self-service catalog and requests an item, filling in a short form",
      "Policies check the request: does it need approval, and is the project within its limits?",
      "The catalog item points to a blueprint: YAML that describes machines, networks and disks",
      "Placement matches the blueprint's constraint tags to cloud zones, and picks one with capacity",
      "VCF Automation calls vCenter and NSX to create the VM, network and storage",
      "Lifecycle events trigger extensibility: Orchestrator workflows or ABX actions, for example to register DNS or a CMDB record",
      "The deployment is ready. The owner can run day-2 actions such as resize, snapshot or delete",
    ];
    tl.to(tok, { autoAlpha: 1, duration: 0.3 }, 0.2);
    steps.forEach((_, i) => {
      ctx.say(tl, caps[i], i ? ">0.5" : 0.2);
      tl.to(tok, { x: B[i].cx, duration: i ? 0.6 : 0.01 }, "<");
      tl.to(B[i].rect, { attr: { fill: C.goodBg, stroke: C.good }, duration: 0.3 }, ">");
      tl.to({}, { duration: 0.9 });
    });
    const back = path(s, `M ${B[6].cx} 222 C ${B[6].cx} 330, ${B[0].cx} 330, ${B[0].cx} 222`, { stroke: C.amber, dash: "6 5", arrow: true }, ctx);
    const bt = text(s, 500, 318, "Same request, same result, every time: that is the point of automation", { fs: 15, fill: C.amber });
    draw(tl, back, 1, ">"); fadeIn(tl, bt, "<0.3");
    return tl;
  };

  /* ============================================================
     ENGINE — build stages lazily, play on slide enter
     ============================================================ */
  let counter = 0;
  const mkBtn = (label, title, cls) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label; b.title = title; b.className = "ctl " + (cls || "");
    return b;
  };

  /* Full-screen view (reading mode only). On a phone held upright the diagram is
     turned sideways so it can use the long edge of the screen. */
  function setExpanded(stage, on) {
    const rotate = on && window.innerHeight > window.innerWidth && window.innerWidth < 700;
    stage.classList.toggle("expanded", on);
    stage.classList.toggle("rotated", rotate);
    document.body.classList.toggle("no-scroll", on);
    stage._enlarge.textContent = on ? "Close" : "Enlarge";
    stage._enlarge.setAttribute("aria-pressed", on ? "true" : "false");
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const st = document.querySelector(".stage.expanded");
    if (st) { e.stopPropagation(); setExpanded(st, false); }
  }, true);
  window.addEventListener("resize", () => {
    const st = document.querySelector(".stage.expanded");
    if (st) setExpanded(st, true);
  });

  function build(stage) {
    if (stage._tl) return stage._tl;
    const name = stage.dataset.anim;
    const fn = ANIMS[name];
    if (!fn) { stage.textContent = "Unknown animation: " + name; return null; }
    const id = "a" + ++counter;
    const svg = el(null, "svg", { viewBox: stage.dataset.vb || "0 0 1000 420", role: "img", "aria-label": stage.dataset.label || name });
    const defs = el(svg, "defs");
    const m = el(defs, "marker", { id: id + "-ah", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
    el(m, "path", { d: "M0,0 L10,5 L0,10 z", fill: C.muted });
    stage.innerHTML = "";
    const scroller = document.createElement("div");
    scroller.className = "scroller";
    scroller.appendChild(svg);
    stage.appendChild(scroller);
    const cap = document.createElement("div");
    cap.className = "caption";
    cap.setAttribute("aria-live", "polite");
    stage.appendChild(cap);

    /* Every caption change is a "step" the learner can move between. */
    const steps = [];
    const ctx = {
      svg, cap, id,
      say: (tl, t, pos) => { tl.set(cap, { textContent: clean(t) }, pos); steps.push(tl.recent().startTime()); },
    };
    readColors();
    const tl = fn(ctx);
    tl.pause(0);
    stage._tl = tl;
    const S = [...new Set(steps.map((t) => Math.round(t * 1000) / 1000))].sort((a, b) => a - b);

    const bar = document.createElement("div");
    bar.className = "anim-controls";
    const label = document.createElement("span");
    label.className = "step-label";
    const back = mkBtn("Back", "Previous step");
    const play = mkBtn("Pause", "Pause or play");
    const next = mkBtn("Next", "Next step");
    const enlarge = mkBtn("Enlarge", "Show this diagram full screen", "enlarge");
    stage._enlarge = enlarge;
    let manual = null;
    const cur = () => { const t = tl.time(); let i = 0; S.forEach((v, k) => { if (v <= t + 0.001) i = k; }); return i; };
    const refresh = () => {
      const i = cur();
      const running = (!tl.paused() && tl.progress() < 1) || (manual && manual.isActive());
      label.textContent = S.length > 1 ? `Step ${i + 1} of ${S.length}` : "";
      play.textContent = running ? "Pause" : tl.progress() >= 1 ? "Replay" : "Play";
      back.disabled = i <= 0;
      next.disabled = i >= S.length - 1;
    };
    const goStep = (i) => {
      i = Math.max(0, Math.min(S.length - 1, i));
      if (manual) manual.kill();
      const end = i + 1 < S.length ? S[i + 1] - 0.02 : tl.duration();
      tl.pause().seek(S[i]);
      manual = tl.tweenFromTo(S[i], end, { onUpdate: refresh, onComplete: refresh });
      refresh();
    };
    back.addEventListener("click", (e) => { e.stopPropagation(); goStep(cur() - 1); });
    next.addEventListener("click", (e) => { e.stopPropagation(); goStep(cur() + 1); });
    play.addEventListener("click", (e) => {
      e.stopPropagation();
      if (manual) { manual.kill(); manual = null; }
      if (tl.progress() >= 1) tl.restart();
      else if (tl.paused()) tl.play();
      else tl.pause();
      refresh();
    });
    enlarge.addEventListener("click", (e) => { e.stopPropagation(); setExpanded(stage, !stage.classList.contains("expanded")); });
    if (S.length > 1) bar.append(label, back, play, next, enlarge);
    else bar.append(label, play, enlarge);
    stage.appendChild(bar);
    tl.eventCallback("onUpdate", refresh);
    tl.eventCallback("onComplete", refresh);
    stage._restart = () => { if (manual) { manual.kill(); manual = null; } tl.restart(); refresh(); };
    refresh();
    return tl;
  }

  function onSlide(slide) {
    document.querySelectorAll(".stage[data-anim]").forEach((st) => {
      if (st._tl && !slide.contains(st)) st._tl.pause();
    });
    slide.querySelectorAll(".stage[data-anim]").forEach((st) => {
      const tl = build(st);
      if (tl) st._restart();
    });
  }

  window.DevOpsAnim = { onSlide, build, ANIMS, buildAll: () => document.querySelectorAll(".stage[data-anim]").forEach(build) };
})();
