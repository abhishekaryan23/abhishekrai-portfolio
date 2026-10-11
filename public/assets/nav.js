/* Shared navigation for pages other than the home page: the mobile menu,
   the theme button (unless the arcade script handles it), and course
   progress read from what each course saves in this browser. */
(function () {
  const root = document.documentElement;
  const menu = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
  if (menu && nav) {
    const close = () => { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); menu.textContent = "Menu"; };
    menu.addEventListener("click", () => { const open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open)); menu.textContent = open ? "Close" : "Menu"; });
    nav.addEventListener("click", (e) => { if (e.target.tagName === "A") close(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) { close(); menu.focus(); } });
  }
  const themeBtn = document.getElementById("theme-btn");
  if (themeBtn && !window.Arcade) {
    const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
    const paint = () => { themeBtn.textContent = isDark() ? "Light" : "Dark"; };
    paint();
    themeBtn.addEventListener("click", () => { root.dataset.theme = isDark() ? "light" : "dark"; try { localStorage.setItem("site-theme", root.dataset.theme); } catch (e) { /* ignore */ } paint(); });
  }
  // course progress: each course keeps finished modules and the last place read
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  document.querySelectorAll("[data-progress]").forEach((el) => {
    const [ns, total, path] = el.dataset.progress.split("|");
    const done = Object.values(read(ns + "devops-done") || {}).filter(Boolean).length;
    let last = null; try { last = localStorage.getItem(ns + "devops-last"); } catch (e) { /* ignore */ }
    const bar = el.querySelector(".bar i"), label = el.querySelector(".label"), go = el.closest(".course") && el.closest(".course").querySelector(".go");
    if (bar) bar.style.width = Math.round((done / +total) * 100) + "%";
    if (label) label.textContent = done ? done + " of " + total + " modules done" : last ? "Started" : "Not started yet";
    if (last && go) { go.textContent = "Continue where you left off"; go.closest("a").href = path + "#/" + last; }
    el.hidden = false;
  });
})();
