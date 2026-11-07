# AYneetpyq+

NEET practice-test app built with Next.js 14 (App Router). No database or backend needed.

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

The included questions are basic samples. Use official NTA papers for real previous-year questions.
