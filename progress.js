// XP, levels and streaks, stored in the browser (localStorage). No backend needed.
const KEY = "ayneetpyq:v2";

export const TITLES = [
  "Aspirant", "Learner", "Challenger", "Strategist", "Scholar",
  "Specialist", "Expert", "Master", "Prodigy", "Topper",
];

const empty = { xp: 0, streak: 0, lastDay: null, attempts: [] };

function dayKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : { ...empty };
  } catch (e) {
    return { ...empty };
  }
}

export function levelInfo(xp) {
  const level = Math.floor(Math.sqrt(xp / 60)) + 1;
  const base = 60 * (level - 1) ** 2;
  const next = 60 * level ** 2;
  return {
    level,
    title: TITLES[Math.min(level - 1, TITLES.length - 1)],
    progress: (xp - base) / (next - base),
    toNext: next - xp,
  };
}

export function recordAttempt(a) {
  const p = loadProgress();
  const before = levelInfo(p.xp).level;

  const gained = Math.max(0, a.score) * 2 + a.correct * 5 + 20;
  p.xp += gained;

  const today = dayKey();
  if (p.lastDay !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    p.streak = p.lastDay === dayKey(y) ? p.streak + 1 : 1;
    p.lastDay = today;
  }

  p.attempts.unshift(a);
  p.attempts = p.attempts.slice(0, 30);

  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {}

  const info = levelInfo(p.xp);
  return { gained, level: info.level, title: info.title, leveled: info.level > before };
}
