# AYneetpyq+

NEET practice-test app built with Next.js 14 (App Router). No database or backend needed.

## Cinematic intro
A real-time 3D scene (no libraries, raw WebGL2), deliberately restrained — near-black space, one neutral palette, no lens-flare/bokeh/sparkle effects. Three parts:
1. **Arrival** — suspense: no letters, no HUD. A tiny speck of light, 450 units out in deep space, lingers almost still above the planet, then rushes in a straight line and strikes the Earth's face (the camera starts far back and dollies in during the impact).
2. **Impact** — a hard white flash, a hot fireball, a thin shockwave ring with real refraction, sparks, camera shake and a small FOV kick over a calm, realistic Earth (relief shading, clouds with shadows, ocean sun-glint, city lights, thin atmosphere).
3. **Reveal** — **“A² presents AYneetPYQ+”** in tight Inter semibold with a champagne “+”, staggered blur-in, a hairline rule and “Dream. Prepare. Excel.”

Tech: HDR (RGBA16F) rendering into a 4× MSAA target, dual-filter bloom (low, subtle), filmic highlight roll-off, neutral grade, light vignette and grain + dithering. The Earth is baked once at start-up into HDR cubemaps, so every frame is just cheap texture fetches. Built for 60fps: if frame time slips, **dynamic resolution scaling** lowers the render resolution in a few gentle steps (never below 0.7×). Resolution is also capped for 4K screens.

Plays once per browser session; **Skip intro** and **▶ Replay intro** (footer) included.
- Sound is synthesized live (rumble, whoosh, impact boom, soft swell) — no audio files. Browsers only allow audio after a tap/click/key,
  so the first tap unlocks it; a **Sound on/off** button is on the intro.
- Falls back to a CSS animation if WebGL2 is missing, and a short title card for “reduce motion”. Timing lives in `lib/introTimeline.js`.
- The 3D A² and the title use the site's body font (Inter) automatically (read from the `--font-body` CSS variable).
- The mission statement appears only at the very bottom of the homepage.

## NEET PYQs 2019–2026 (new)
One file per year in `data/pyq/neet-<year>.json`. Years with questions appear automatically on the home page, at `/pyq`
(year / subject / chapter / search filters) and as timed papers at `/test/pyq-<year>`; subject-wise “all years” tests are generated too.
Empty years show “Coming soon”.

Add a paper from a spreadsheet:
```bash
# fill data/pyq/TEMPLATE.csv  (answer = A/B/C/D, explanation_status = verified | draft)
npm run import:pyq -- paper-2024.csv --year 2024 --minutes 200
npm run validate        # also runs automatically before every build
```
`validate` stops the build on a bad answer index, missing option, duplicate id, etc., so a broken key can't go live.
Explanation badges: **verified** (checked against the official NTA final answer key), **draft** (written, not yet reviewed), none.
Always copy questions and the answer key from the official NTA paper — don't mark an explanation `verified` until it has been checked.
Questions with diagrams: put the image in `public/pyq/` and set `"image": "/pyq/2024-q57.png"`.
Known limitation: scoring is +4 / −1 on every question; papers with optional Section B (2021–2024) need all 200 loaded to count correctly.

## What's inside
- Animated aurora UI with glass cards, 3D-tilt test cards and a live scorecard hero
- 3-2-1 countdown, timer ring, progress bar, per-question time tracking
- Keyboard shortcuts: A–D (or 1–4) answer, N / P next / previous, M mark for review
- NEET marking: +4 correct, −1 wrong, 0 unattempted
- XP, levels (Aspirant → Topper) and daily streaks, saved in the browser (localStorage)
- Result page: count-up score, confetti, accuracy, time per question, subject radar chart, answer review

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Deploy on Vercel
1. Push this folder to a GitHub repository.
2. Go to https://vercel.com/new, import the repo and click **Deploy** (Next.js is auto-detected).

## Add your own questions
Edit `lib/questions.js`: add to the `questions` array (subject, chapter, q, options, answer index, explanation) and define new tests in the `tests` array. Add matching icon/colour for a new test id in `app/page.js` (`meta`).

The practice questions in `lib/questions.js` are basic samples, not previous-year questions.
