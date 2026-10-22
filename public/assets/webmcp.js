/* WebMCP: tools that let an AI agent in the visitor's browser read this site and move around it,
   instead of scraping the page or clicking buttons. https://webmachinelearning.github.io/webmcp/
   Facts come from the home page itself (its schema.org data and visible sections), so the tools
   never drift from what a visitor reads. Does nothing in browsers without WebMCP. */
(function () {
  "use strict";
  // Spec: document.modelContext. Chrome's early origin trial used navigator.modelContext.
  const mc = document.modelContext || navigator.modelContext;
  if (!mc || typeof mc.registerTool !== "function") return;

  const ORIGIN = "https://abhishekrai.dev";
  const ME = "https://abhishekrai.dev/#person";
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  // Chrome before 155 may pass arguments as a JSON string
  const args = (input) => {
    if (typeof input === "string") { try { return JSON.parse(input) || {}; } catch (e) { return {}; } }
    return input || {};
  };

  /* ---------- the home page, parsed once ---------- */
  let homeDoc = null;
  async function home(signal) {
    if (location.pathname === "/" || location.pathname === "/index.html") return document;
    if (!homeDoc) {
      const res = await fetch("/", { signal });
      if (!res.ok) throw new Error("Could not load the home page (HTTP " + res.status + ").");
      homeDoc = new DOMParser().parseFromString(await res.text(), "text/html");
    }
    return homeDoc;
  }
  function graph(doc) {
    const out = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try { const d = JSON.parse(s.textContent); out.push(...(d["@graph"] || [d])); } catch (e) { /* skip */ }
    });
    return out;
  }
  const byId = (g, id) => g.find((n) => n["@id"] === id);

  /* ---------- readers ---------- */
  async function profile(signal) {
    const doc = await home(signal), p = byId(graph(doc), ME) || {};
    const contact = {};
    doc.querySelectorAll(".contact-list li").forEach((li) => {
      const k = clean(li.querySelector("span") && li.querySelector("span").textContent);
      const a = li.querySelector("a"), code = li.querySelector("code");
      if (k) contact[k.toLowerCase()] = a ? (a.href.startsWith("mailto:") ? a.href.slice(7) : a.href) : clean(code && code.textContent);
    });
    const addr = p.homeLocation && p.homeLocation.address;
    let country = addr && addr.addressCountry;
    try { country = new Intl.DisplayNames(["en"], { type: "region" }).of(country); } catch (e) { /* keep the code */ }
    return {
      name: p.name, also_known_as: p.alternateName, summary: p.description, job_title: p.jobTitle,
      employer: p.worksFor && p.worksFor.name,
      location: addr ? [addr.addressLocality, country].join(", ") : undefined,
      at_a_glance: [...doc.querySelectorAll(".facts li")].map((li) => clean(li.querySelector("b").textContent) + " " + clean(li.lastChild.textContent)),
      knows_about: p.knowsAbout, profiles: p.sameAs, contact, website: ORIGIN + "/",
      contact_form: ORIGIN + "/#contact"
    };
  }
  async function work(signal) {
    const doc = await home(signal);
    return [...doc.querySelectorAll("#work .role")].map((r) => {
      const when = r.querySelector(".when");
      return {
        role: clean(r.querySelector("h3").textContent),
        organization: clean(r.querySelector(".org") && r.querySelector(".org").textContent),
        dates: clean(when && when.querySelector("b") && when.querySelector("b").textContent),
        location: clean(when && when.lastChild && when.lastChild.textContent),
        summary: clean(r.querySelector("h3 ~ p") && r.querySelector("h3 ~ p").textContent) || undefined,
        outcomes: [...r.querySelectorAll(".wins li")].map((li) => clean(li.textContent))
      };
    });
  }
  async function credentials(signal) {
    const p = byId(graph(await home(signal)), ME) || {};
    return (p.hasCredential || []).map((c) => ({ name: c.name, issuer: c.recognizedBy && c.recognizedBy.name, verify: c.url }));
  }
  async function projects(signal) {
    const doc = await home(signal);
    return [...doc.querySelectorAll("#projects .proj")].map((el) => {
      const facts = {};
      el.querySelectorAll(".proj-facts dt").forEach((dt) => { facts[clean(dt.textContent).toLowerCase()] = clean(dt.nextElementSibling && dt.nextElementSibling.textContent); });
      return {
        name: clean(el.querySelector("h3").textContent), area: clean(el.querySelector(".kind") && el.querySelector(".kind").textContent),
        description: clean(el.querySelector("h3 ~ p") && el.querySelector("h3 ~ p").textContent),
        how_it_works: facts["how it works"], built_with: facts["built with"],
        links: [...el.querySelectorAll(".links a")].map((a) => ({ label: clean(a.textContent), url: a.href }))
      };
    });
  }
  async function stack(signal) {
    const doc = await home(signal), out = {};
    doc.querySelectorAll("#stack .stack > div").forEach((col) => {
      out[clean(col.querySelector("h3").textContent)] = [...col.querySelectorAll("dt")].map((dt) => ({
        tools: clean(dt.textContent), used_for: clean(dt.nextElementSibling && dt.nextElementSibling.textContent) }));
    });
    return out;
  }
  async function courses(signal) {
    const list = byId(graph(await home(signal)), "https://abhishekrai.dev/#courses");
    return ((list && list.itemListElement) || []).map((li) => ({
      name: li.item.name, url: li.url, description: li.item.description, price: "Free, no sign-up",
      // only courses on this site carry the outline tools
      outline_tool: li.url.startsWith(ORIGIN) ? "Open the course and call get_course_outline for its modules." : undefined
    }));
  }

  /* ---------- tools ---------- */
  const PAGES = {
    home: "/", work: "/#work", credentials: "/#credentials", learn: "/learn/", projects: "/#projects",
    tools: "/#stack", contact: "/#contact", devops_course: "/learn/devops/", vcf_automation_course: "/learn/vcf-automation/", games: "/game/"
  };
  const readOnly = { readOnlyHint: true };
  const tools = [
    { name: "get_profile", title: "About Abhishek Rai",
      description: "Who Abhishek Rai is: summary, current role and employer, location, headline numbers, areas of expertise, and how to contact him (email, LinkedIn, GitHub, contact form).",
      inputSchema: { type: "object", properties: {} }, annotations: readOnly, execute: (i, o) => profile(o && o.signal) },
    { name: "get_work_history", title: "Work history",
      description: "Abhishek Rai's jobs, newest first: role, organization, dates, location and measured outcomes (VMware Cloud Foundation, VCF Automation, NSX, Kubernetes, AWS, Azure).",
      inputSchema: { type: "object", properties: {} }, annotations: readOnly, execute: (i, o) => work(o && o.signal) },
    { name: "get_credentials", title: "Certifications",
      description: "Abhishek Rai's certifications (Broadcom VCF, VMware, AWS, Microsoft) with the issuer and a public verification link where one exists.",
      inputSchema: { type: "object", properties: {} }, annotations: readOnly, execute: (i, o) => credentials(o && o.signal) },
    { name: "list_projects", title: "Projects",
      description: "Abhishek Rai's software projects, mostly local AI on Apple Silicon: what each does, how it works, what it is built with, and links to the code.",
      inputSchema: { type: "object", properties: {} }, annotations: readOnly, execute: (i, o) => projects(o && o.signal) },
    { name: "get_tools_and_skills", title: "Tools and skills",
      description: "The tools Abhishek Rai works with, grouped into cloud and automation, and local AI (models, speech, images, vector search, agents, evaluation).",
      inputSchema: { type: "object", properties: {} }, annotations: readOnly, execute: (i, o) => stack(o && o.signal) },
    { name: "list_courses", title: "Free courses",
      description: "The free courses Abhishek Rai wrote (DevOps, VCF Automation, LLMs), with links. No sign-up needed.",
      inputSchema: { type: "object", properties: {} }, annotations: readOnly, execute: (i, o) => courses(o && o.signal) },
    { name: "open_page", title: "Go to a page",
      description: "Navigate this tab to a part of abhishekrai.dev.",
      inputSchema: { type: "object", properties: { page: { type: "string", enum: Object.keys(PAGES),
        description: "Where to go: home, work (job history), credentials, learn (course list), projects, tools (skills), contact (form), devops_course, vcf_automation_course, games." } }, required: ["page"] },
      execute: (input) => {
        const page = args(input).page, url = PAGES[page];
        if (!url) return Promise.reject(new Error("Unknown page. Use one of: " + Object.keys(PAGES).join(", ")));
        location.assign(url);
        return Promise.resolve("Opening " + ORIGIN + url);
      } },
    { name: "draft_contact_message", title: "Draft a message to Abhishek",
      description: "Fill in the contact form on the home page with the visitor's name, email and message, so the visitor can review it. It does not send anything: the visitor presses Send themselves.",
      inputSchema: { type: "object", properties: {
        name: { type: "string", description: "The visitor's name." },
        email: { type: "string", description: "The visitor's email address, for the reply." },
        message: { type: "string", description: "What the visitor wants to say or ask." } }, required: ["message"] },
      execute: (input) => {
        const a = args(input), form = document.getElementById("contact-form");
        if (!form) return Promise.resolve("The contact form is on the home page. Call open_page with page \"contact\" first, then call this tool again.");
        const set = (id, v) => { const el = document.getElementById(id); if (el && v) { el.value = String(v).slice(0, 5000); el.dispatchEvent(new Event("input", { bubbles: true })); } };
        set("contact-name", a.name); set("contact-email", a.email); set("contact-message", a.message);
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        const btn = document.getElementById("submit-btn"); if (btn) btn.focus({ preventScroll: true });
        return Promise.resolve("The form is filled in and not sent. Ask the visitor to check it and press Send message.");
      } }
  ];

  /* ---------- course pages: outline and module navigation ---------- */
  const course = document.documentElement.dataset.course;
  if (course) {
    const modules = () => [...document.querySelectorAll(".slides > section[data-module]")].map((s) => ({
      number: s.dataset.num, id: s.dataset.module, title: s.dataset.title, level: s.dataset.level,
      anchor: (s.querySelector("section[id]") || {}).id
    }));
    tools.push(
      { name: "get_course_outline", title: "Course outline",
        description: "The modules of the course open in this tab, in order, with number, title and level.",
        inputSchema: { type: "object", properties: {} }, annotations: readOnly,
        execute: () => Promise.resolve({ course: document.title, url: location.origin + location.pathname, modules: modules() }) },
      { name: "open_course_module", title: "Open a module",
        description: "Jump to a module of the course open in this tab, by its two-digit number (for example \"04\") or its id from get_course_outline.",
        inputSchema: { type: "object", properties: { module: { type: "string", description: "Module number such as \"04\", or module id." } }, required: ["module"] },
        execute: (input) => {
          const want = String(args(input).module || "").trim().toLowerCase();
          const m = modules().find((x) => x.id === want || x.number === want.padStart(2, "0"));
          if (!m || !m.anchor) return Promise.reject(new Error("No such module. Call get_course_outline for the list."));
          // slide mode (Reveal) and reading mode both switch modules on #/<id>
          location.hash = "#/" + m.anchor;
          return Promise.resolve("Showing module " + m.number + ": " + m.title);
        } }
    );
  }

  tools.forEach((t) => {
    try { Promise.resolve(mc.registerTool(t)).catch(() => {}); } catch (e) { /* older preview builds: ignore */ }
  });
})();
