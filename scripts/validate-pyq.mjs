// Checks every data/pyq/neet-<year>.json before you deploy. Errors stop the build (so a broken
// answer key never reaches students); warnings are just reminders.
//   node scripts/validate-pyq.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "pyq");
const SUBJECTS = ["Physics", "Chemistry", "Biology"];
const STATUSES = ["verified", "draft", "missing"];
const files = readdirSync(dir).filter((f) => /^neet-\d{4}\.json$/.test(f)).sort();

let errors = 0;
let warnings = 0;
const ids = new Set();
const err = (f, m) => { errors++; console.error(`  ✖ ${f}: ${m}`); };
const warn = (f, m) => { warnings++; console.warn(`  ⚠ ${f}: ${m}`); };

console.log("PYQ bank check\n");
for (const f of files) {
  let data;
  try { data = JSON.parse(readFileSync(join(dir, f), "utf8")); }
  catch (e) { err(f, "not valid JSON — " + e.message); continue; }

  const year = Number(f.match(/\d{4}/)[0]);
  if (data.year !== year) err(f, `"year" is ${data.year} but the file name says ${year}`);
  if (!Array.isArray(data.questions)) { err(f, '"questions" must be an array'); continue; }
  if (!Number.isFinite(data.minutes) || data.minutes <= 0) err(f, '"minutes" must be a positive number');

  const qnos = new Set();
  const count = { Physics: 0, Chemistry: 0, Biology: 0 };
  let verified = 0, draft = 0, missing = 0;

  data.questions.forEach((q, i) => {
    const w = `${f} #${i + 1}${q.qno ? ` (Q${q.qno})` : ""}`;
    if (!q.id || typeof q.id !== "string") err(w, 'missing string "id"');
    else if (ids.has(q.id)) err(w, `duplicate id ${q.id}`);
    else ids.add(q.id);
    if (!Number.isInteger(q.qno) || q.qno < 1) err(w, '"qno" must be a positive integer');
    else if (qnos.has(q.qno)) err(w, `duplicate question number ${q.qno}`);
    else qnos.add(q.qno);
    if (!SUBJECTS.includes(q.subject)) err(w, `subject must be one of ${SUBJECTS.join(", ")} (got "${q.subject}")`);
    else count[q.subject]++;
    if (!q.chapter || typeof q.chapter !== "string") err(w, 'missing "chapter"');
    if (!q.q || typeof q.q !== "string" || q.q.trim().length < 5) err(w, 'missing question text "q"');
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => typeof o !== "string" || !o.trim())) err(w, '"options" must be exactly 4 non-empty strings');
    else if (new Set(q.options.map((o) => o.trim())).size !== 4) warn(w, "two options are identical");
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) err(w, '"answer" must be 0, 1, 2 or 3 (A=0 … D=3)');

    const st = q.explanationStatus || (q.explanation ? "draft" : "missing");
    if (!STATUSES.includes(st)) err(w, `explanationStatus must be ${STATUSES.join(" | ")}`);
    if (st === "verified") { verified++; if (!q.explanation || q.explanation.length < 20) err(w, 'marked "verified" but has no real explanation'); }
    else if (st === "draft") { draft++; if (!q.explanation) err(w, 'status "draft" but explanation is empty'); }
    else missing++;
  });

  const n = data.questions.length;
  const line = n
    ? `${f}: ${n} questions (P ${count.Physics} · C ${count.Chemistry} · B ${count.Biology}) — explanations: ${verified} verified, ${draft} draft, ${missing} missing`
    : `${f}: empty (shows as "Coming soon")`;
  console.log("  " + line);
  if (n && ![180, 200].includes(n)) warn(f, `has ${n} questions — a full NEET paper has 180 (or 200 with optional Section B)`);
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
if (errors) { console.error("Fix the errors above, then run again."); process.exit(1); }
