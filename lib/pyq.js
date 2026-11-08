// NEET previous-year-question (PYQ) bank, 2019–2026.
// Each year lives in its own file: data/pyq/neet-<year>.json  (see README for the format).
import y2019 from "../data/pyq/neet-2019.json";
import y2020 from "../data/pyq/neet-2020.json";
import y2021 from "../data/pyq/neet-2021.json";
import y2022 from "../data/pyq/neet-2022.json";
import y2023 from "../data/pyq/neet-2023.json";
import y2024 from "../data/pyq/neet-2024.json";
import y2025 from "../data/pyq/neet-2025.json";
import y2026 from "../data/pyq/neet-2026.json";

import { SUBJECTS, STATUS_LABEL } from "./pyqLabels";
export { SUBJECTS, STATUS_LABEL };

// newest first
export const pyqYears = [y2026, y2025, y2024, y2023, y2022, y2021, y2020, y2019].map((y) => ({
  ...y,
  questions: [...y.questions].sort((a, b) => a.qno - b.qno).map((q) => ({
    explanationStatus: q.explanation ? "draft" : "missing",
    ...q,
    year: y.year,
  })),
}));

export const pyqQuestions = pyqYears.flatMap((y) => y.questions);

export function pyqYear(year) {
  return pyqYears.find((y) => y.year === Number(year));
}

export function pyqStats() {
  const total = pyqQuestions.length;
  const verified = pyqQuestions.filter((q) => q.explanationStatus === "verified").length;
  return { total, verified, years: pyqYears.filter((y) => y.questions.length).length };
}

// Timed tests generated automatically from whatever has been loaded.
export const pyqTests = [
  ...pyqYears
    .filter((y) => y.questions.length > 0)
    .map((y) => ({
      id: `pyq-${y.year}`,
      title: `${y.exam} — Full Paper`,
      type: "Previous Year",
      subjects: SUBJECTS,
      minutes: y.minutes || y.questions.length,
      pyqYear: y.year,
    })),
  ...SUBJECTS.filter((s) => pyqQuestions.some((q) => q.subject === s)).map((s) => {
    const n = pyqQuestions.filter((q) => q.subject === s).length;
    return {
      id: `pyq-all-${s.toLowerCase()}`,
      title: `${s} PYQs — All Years`,
      type: "PYQ Subject-wise",
      subjects: [s],
      minutes: n,
      pyqSubject: s,
    };
  }),
];

export function pyqQuestionsForTest(test) {
  if (test.pyqYear) return pyqYear(test.pyqYear)?.questions || [];
  if (test.pyqSubject) return pyqQuestions.filter((q) => q.subject === test.pyqSubject);
  return null;
}
