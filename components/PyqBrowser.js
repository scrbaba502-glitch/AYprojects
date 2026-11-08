"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SUBJECTS, STATUS_LABEL } from "../lib/pyqLabels";

const PAGE = 20;

export default function PyqBrowser({ years, questions }) {
  const [year, setYear] = useState("all");
  const [subject, setSubject] = useState("all");
  const [chapter, setChapter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  // support links like /pyq?year=2024
  useEffect(() => {
    const y = new URLSearchParams(window.location.search).get("year");
    if (y && years.some((x) => String(x.year) === y)) setYear(y);
  }, [years]);

  const byYearSubject = useMemo(
    () => questions.filter((q) => (year === "all" || String(q.year) === year) && (subject === "all" || q.subject === subject)),
    [questions, year, subject]
  );
  const chapters = useMemo(() => [...new Set(byYearSubject.map((q) => q.chapter))].sort(), [byYearSubject]);

  const list = useMemo(() => {
    const s = query.trim().toLowerCase();
    return byYearSubject.filter(
      (q) =>
        (chapter === "all" || q.chapter === chapter) &&
        (!verifiedOnly || q.explanationStatus === "verified") &&
        (!s || q.q.toLowerCase().includes(s) || q.chapter.toLowerCase().includes(s))
    );
  }, [byYearSubject, chapter, verifiedOnly, query]);

  useEffect(() => setShown(PAGE), [year, subject, chapter, verifiedOnly, query]);

  const current = years.find((y) => String(y.year) === year);
  const total = questions.length;

  return (
    <>
      <div className="ychips" role="tablist" aria-label="Exam year">
        <button className={`ychip ${year === "all" ? "on" : ""}`} onClick={() => { setYear("all"); setChapter("all"); }}>
          All years <small>{total}</small>
        </button>
        {years.map((y) => (
          <button
            key={y.year}
            className={`ychip ${year === String(y.year) ? "on" : ""} ${y.count ? "" : "empty"}`}
            onClick={() => { setYear(String(y.year)); setChapter("all"); }}
          >
            {y.year} <small>{y.count ? y.count : "soon"}</small>
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="glass pyqempty">
          <h3>Papers are being added year by year</h3>
          <p className="muted">
            Each paper goes live only after its questions and options are checked against the official NTA paper and final answer key.
            Check back soon — or use the practice tests on the home page in the meantime.
          </p>
          <Link href="/#tests" className="btn">Go to practice tests</Link>
        </div>
      ) : (
        <>
          <div className="filters glass">
            <select value={subject} onChange={(e) => { setSubject(e.target.value); setChapter("all"); }} aria-label="Subject">
              <option value="all">All subjects</option>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={chapter} onChange={(e) => setChapter(e.target.value)} aria-label="Chapter">
              <option value="all">All chapters</option>
              {chapters.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="search" placeholder="Search questions…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
            <label className="check">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Verified only
            </label>
          </div>

          <div className="row between wrapr">
            <p className="muted small">{list.length} question{list.length === 1 ? "" : "s"}</p>
            {current && current.count > 0 && (
              <Link className="btn" href={`/test/pyq-${current.year}`}>▶ Take NEET {current.year} as a timed paper</Link>
            )}
          </div>

          <div className="pqlist">
            {list.slice(0, shown).map((q) => (
              <details className="glass pq" key={q.id}>
                <summary>
                  <span className="pqmeta">NEET {q.year} · Q{q.qno} · {q.subject} · {q.chapter}</span>
                  <span className="pqtext">{q.q}</span>
                </summary>
                {q.image && <img className="qimg" src={q.image} alt="Question figure" />}
                <ol className="pqopts" type="A">
                  {q.options.map((o, i) => (
                    <li key={i} className={i === q.answer ? "right" : ""}>{o}{i === q.answer ? "  ✓" : ""}</li>
                  ))}
                </ol>
                {q.explanation && <p className="pqexp">💡 {q.explanation}</p>}
                <span className={`xbadge ${q.explanationStatus}`}>{STATUS_LABEL[q.explanationStatus] || STATUS_LABEL.missing}</span>
              </details>
            ))}
          </div>
          {shown < list.length && (
            <div className="center" style={{ marginTop: 18 }}>
              <button className="btn ghost" onClick={() => setShown((n) => n + PAGE)}>Show more ({list.length - shown} left)</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
