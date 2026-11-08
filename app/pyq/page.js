import Link from "next/link";
import { pyqYears, pyqStats } from "../../lib/pyq";
import PyqBrowser from "../../components/PyqBrowser";

export const metadata = {
  title: "NEET Previous Year Questions 2019–2026 | AYneetPYQ+",
  description: "Free NEET previous year questions, year-wise and chapter-wise, with explanations and timed practice papers.",
};

export default function PyqPage() {
  const stats = pyqStats();
  const years = pyqYears.map((y) => ({ year: y.year, exam: y.exam, count: y.questions.length, minutes: y.minutes }));
  const questions = pyqYears.flatMap((y) => y.questions);

  return (
    <section className="section">
      <p className="eyebrow">Previous year questions</p>
      <h2>NEET PYQs, 2019 – 2026</h2>
      <p className="lead">
        Browse every paper year-wise or chapter-wise, read the explanation, then take the full paper as a timed test.
        {stats.total > 0 ? (
          <> <b>{stats.total}</b> questions loaded · <b>{stats.verified}</b> with verified explanations.</>
        ) : null}
      </p>
      <PyqBrowser years={years} questions={questions} />
      <p className="muted small" style={{ marginTop: 24 }}>
        Questions follow the official NTA papers and final answer keys. Explanations marked “Verified” have been checked against the
        answer key; “Draft” explanations are still being reviewed. <Link href="/" className="grad">Back to home</Link>
      </p>
    </section>
  );
}
