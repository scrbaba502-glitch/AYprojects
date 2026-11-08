// Turn a spreadsheet (CSV) of one year's paper into data/pyq/neet-<year>.json
//   node scripts/import-pyq-csv.mjs paper-2024.csv --year 2024 [--minutes 200] [--replace]
// Columns (header row required, any order):
//   qno, subject, chapter, question, optionA, optionB, optionC, optionD, answer, explanation, explanation_status, image
// answer = A/B/C/D (or 1-4).  explanation_status = verified | draft  (blank = draft if there is an explanation).
// Existing questions with the same qno are updated; others are kept unless --replace is given.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--year" && args[args.indexOf(a) - 1] !== "--minutes");
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const year = Number(opt("--year"));
if (!file || !year) { console.error("Usage: node scripts/import-pyq-csv.mjs <file.csv> --year 2024 [--minutes 200] [--replace]"); process.exit(1); }

function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const rows = parseCSV(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const head = rows.shift().map((h) => h.trim().toLowerCase().replace(/[\s_-]/g, ""));
const col = (n) => head.indexOf(n);
const need = ["qno", "subject", "chapter", "question", "optiona", "optionb", "optionc", "optiond", "answer"];
const missing = need.filter((n) => col(n) < 0);
if (missing.length) { console.error("CSV is missing column(s): " + missing.join(", ")); process.exit(1); }

const target = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "pyq", `neet-${year}.json`);
const data = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : { year, exam: `NEET (UG) ${year}`, minutes: 180, source: "https://neet.nta.nic.in/", status: "pending", questions: [] };
if (opt("--minutes")) data.minutes = Number(opt("--minutes"));
const byNo = new Map(args.includes("--replace") ? [] : data.questions.map((q) => [q.qno, q]));

let bad = 0;
rows.forEach((r, i) => {
  const g = (n) => (col(n) >= 0 ? (r[col(n)] || "").trim() : "");
  const letter = g("answer").toUpperCase();
  const answer = "ABCD".includes(letter) && letter.length === 1 ? "ABCD".indexOf(letter) : Number(letter) - 1;
  const qno = Number(g("qno"));
  if (!qno || !(answer >= 0 && answer <= 3)) { console.warn(`Row ${i + 2}: skipped (bad qno or answer "${g("answer")}")`); bad++; return; }
  const explanation = g("explanation");
  const st = g("explanationstatus").toLowerCase();
  const q = {
    id: `neet-${year}-q${String(qno).padStart(3, "0")}`,
    qno,
    subject: g("subject"),
    chapter: g("chapter"),
    q: g("question"),
    options: [g("optiona"), g("optionb"), g("optionc"), g("optiond")],
    answer,
    explanation,
    explanationStatus: explanation ? (st === "verified" ? "verified" : "draft") : "missing",
  };
  if (g("image")) q.image = g("image");
  byNo.set(qno, q);
});

data.questions = [...byNo.values()].sort((a, b) => a.qno - b.qno);
data.status = data.questions.length >= 180 ? "complete" : "partial";
writeFileSync(target, JSON.stringify(data, null, 2) + "\n");
console.log(`Wrote ${data.questions.length} questions to data/pyq/neet-${year}.json${bad ? ` (${bad} row(s) skipped)` : ""}`);
console.log("Next: npm run validate");
