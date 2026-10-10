# Portfolio review and redesign (October 2026)

The previous page is kept at `archive/index-before-redesign-2026-10-10.html` (outside `public/`, so it is not deployed).

## What was holding the old site back

**Bugs a visitor could see**
- Three credential logos were broken: `simple-icons@v16` has no `amazonaws`, `microsoftazure` or `microsoft` icons (all return 404).
- The SmartScissor link (`github.com/abhishekaryan23/SmartScissor`) returns 404, probably because the repository is private.
- Both Microsoft certifications linked to the same Microsoft Learn credential page.
- "Journal" in the footer linked to `#`, which goes nowhere.
- Two different contact addresses (`abhishek@` in the footer, `contact@` in the error message).

**Signals that read as AI-generated (anti-slop, taste)**
- A badge above the headline that repeated the headline, and uppercase, widely spaced mono labels on almost everything.
- A four-line headline made of buzzwords: "Sovereign", "Zero-Trust Orchestration", "Zero-Latency Edge", "Synthesizing", "World-Class", "cybernetic", "Transmission", "Close Protocol".
- Every project presented as finished, including three described as "Designing" or "Creating".
- Icon font glyphs and decorative glows that added noise but no information.
- A philosophy quote that said little about the work.

**Engineering**
- The Tailwind CDN script compiled CSS in every visitor's browser. Tailwind says not to use it in production; it is slow and needed `'unsafe-eval'` in the security policy.
- The Worker ran on every request just to add headers, which uses up the free 100,000 requests a day.

## What changed

- **Message first.** A two-to-three-line headline that says what you do, a short factual intro, and four real numbers (7+ years, 7 certifications, the 95% Kubernetes delivery gain, 2 free courses).
- **Proof over adjectives.** Each role lists outcomes with their real metrics (95%, 40%, 25%, under 2 minutes, 99.98%), taken from your existing text.
- **A purposeful animation.** The hero diagram walks through what you build (request, policy, blueprint, integrations, VCF 9, ready). It plays once when visible, and is static for visitors who prefer reduced motion.
- **Learn section (new).** Two complete free courses, linked from the hero, the nav and the footer, with live module and question counts read from the courses themselves.
  - `/learn/devops/`: DevOps From Basics (15 modules, capstone, about 220 practice questions).
  - `/learn/vcf-automation/`: VCF Automation From Basics (11 modules, mini capstone).
- **Honest projects.** Shipped work links to its code. Work in progress says "In progress". The broken SmartScissor link is removed until the repository is public.
- **Type and colour.** Newsreader for display, IBM Plex Sans and Plex Mono for text and code, the same system as the courses. Warm paper background, one rust accent, light and dark themes, no gradients or glows.
- **Speed.** No CSS framework, no icon font: one small CSS file and one small JS file.
- **Accessibility.** Skip link, visible focus, real buttons, labelled form fields, `aria-live` form feedback, reduced-motion support.
- **Contact form.** Same `/functions/submit-contact` endpoint and payload, a honeypot, the same duplicate-send guard, and one email address everywhere.

## Cloudflare free tier

- `wrangler.toml`: `run_worker_first = ["/functions/*", "/api/*"]`. Static pages and the courses are served directly by Cloudflare's asset storage. That is free and does not count toward the Worker's 100,000 requests a day. The Worker runs only for the contact form and the game's ghost relay.
- `public/_headers`: the security headers (HSTS, CSP, frame, referrer, permissions) now come from the edge without running code. The CSP no longer needs `'unsafe-eval'` or the Tailwind CDN.
- Caching: `/assets/*` and each course's `assets/` are cached for a day.
- Size: the whole site is a few megabytes and well under 100 files. Free-plan limits are 20,000 files per deployment and 25 MiB per file.
- KV (contact form duplicate check, game ghosts): unchanged. Free limits are 100,000 reads and 1,000 writes a day, which is far above this traffic.
- `public/404.html` with `not_found_handling = "404-page"`, and `sitemap.xml` now lists both courses.

## Worth doing next (your call)

1. Make SmartScissor public, or link a demo video, and add the link back.
2. Fix the Azure Fundamentals credential link (it currently reuses the AI Engineer one) and add public verification links for the VCAP, Aria Specialist and AWS credentials if you have them.
3. Add one case study page for a delivery you can talk about, for example VKS clusters in under 15 minutes: problem, constraints, architecture, result.
4. Add a real photo or a short "about" paragraph. People hire people.
5. Confirm the PGP fingerprint is current, or remove it.
6. If you want a writing outlet, a small `/notes/` section is better than a dead "Journal" link.
