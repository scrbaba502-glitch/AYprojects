"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Ring from "./Ring";
import Radar from "./Radar";
import Confetti from "./Confetti";
import { recordAttempt } from "../lib/progress";
import { STATUS_LABEL } from "../lib/pyqLabels";

const CORRECT = 4;
const WRONG = -1;

function fmt(s) {
  const m = Math.max(0, Math.floor(s / 60));
  const sec = Math.max(0, s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function tierFor(pct) {
  if (pct >= 85) return { t: "Elite", d: "Top-rank territory. Keep this consistency." };
  if (pct >= 70) return { t: "Strong", d: "Great performance. Polish the weak chapters." };
  if (pct >= 50) return { t: "Solid base", d: "Good foundation. Revise and push higher." };
  return { t: "Warming up", d: "Every topper started here. Review and retry." };
}

export default function TestRunner({ test, questions }) {
  const [phase, setPhase] = useState("intro"); // intro | count | test | result
  const [count, setCount] = useState(3);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [spent, setSpent] = useState({});
  const [timeLeft, setTimeLeft] = useState(test.minutes * 60);
  const [result, setResult] = useState(null);
  const [shown, setShown] = useState(0);
  const [copied, setCopied] = useState(false);

  const doneRef = useRef(false);
  const q = questions[idx];
  const qidRef = useRef(q.id);
  qidRef.current = q.id;

  // 3-2-1 countdown
  useEffect(() => {
    if (phase !== "count") return;
    if (count <= 0) {
      setPhase("test");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count]);

  // main timer + per-question time tracking
  useEffect(() => {
    if (phase !== "test") return;
    const t = setInterval(() => {
      setTimeLeft((s) => s - 1);
      setSpent((sp) => ({ ...sp, [qidRef.current]: (sp[qidRef.current] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // auto-submit
  useEffect(() => {
    if (phase === "test" && timeLeft <= 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  function choose(i) {
    setAnswers((a) => ({ ...a, [q.id]: i }));
  }
  function clearAnswer() {
    setAnswers((a) => {
      const n = { ...a };
      delete n[q.id];
      return n;
    });
  }
  function toggleMark() {
    setMarked((m) => ({ ...m, [q.id]: !m[q.id] }));
  }

  // keyboard shortcuts
  useEffect(() => {
    if (phase !== "test") return;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const map = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      if (k in map) choose(map[k]);
      else if (k === "arrowright" || k === "n") setIdx((i) => Math.min(questions.length - 1, i + 1));
      else if (k === "arrowleft" || k === "p") setIdx((i) => Math.max(0, i - 1));
      else if (k === "m") toggleMark();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  function submit() {
    if (doneRef.current) return;
    doneRef.current = true;

    let score = 0, correct = 0, wrong = 0, skipped = 0;
    const by = {};
    questions.forEach((qq) => {
      const s = (by[qq.subject] ||= { score: 0, correct: 0, wrong: 0, skipped: 0, total: 0 });
      s.total += 1;
      const a = answers[qq.id];
      if (a === undefined) {
        skipped++; s.skipped++;
      } else if (a === qq.answer) {
        score += CORRECT; correct++; s.score += CORRECT; s.correct++;
      } else {
        score += WRONG; wrong++; s.score += WRONG; s.wrong++;
      }
    });

    const total = questions.length * CORRECT;
    const timeTaken = test.minutes * 60 - Math.max(0, timeLeft);
    const info = recordAttempt({
      id: test.id, title: test.title, score, total, correct, wrong, skipped, date: Date.now(),
    });

    setResult({
      score, correct, wrong, skipped, total, by, timeTaken,
      gained: info.gained, level: info.level, title: info.title, leveled: info.leveled,
    });
    setPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmSubmit() {
    const left = questions.length - Object.keys(answers).length;
    const msg = left ? `You have ${left} unanswered question(s). Submit anyway?` : "Submit your test?";
    if (window.confirm(msg)) submit();
  }

  // score count-up
  useEffect(() => {
    if (!result) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1300);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(result.score * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  function share() {
    const text = `I scored ${result.score}/${result.total} on ${test.title} at AYneetpyq+ 🔥 Can you beat me?`;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  }

  // ================= INTRO =================
  if (phase === "intro") {
    return (
      <div className="glass intro">
        <span className="chip">{test.type}</span>
        <h1>{test.title}</h1>
        <p className="muted">{test.subjects.join(" · ")}</p>
        <div className="introstats">
          <div><b>{questions.length}</b><small>Questions</small></div>
          <div><b>{test.minutes}</b><small>Minutes</small></div>
          <div><b>{questions.length * CORRECT}</b><small>Marks</small></div>
        </div>
        <ul className="rules">
          <li><b>+4</b> for a correct answer, <b>−1</b> for a wrong one, <b>0</b> if skipped.</li>
          <li>Shortcuts: <kbd>A</kbd>–<kbd>D</kbd> answer · <kbd>N</kbd>/<kbd>P</kbd> next/prev · <kbd>M</kbd> mark.</li>
          <li>The test auto-submits when the timer hits zero.</li>
        </ul>
        <div className="row">
          <button className="btn" onClick={() => { setCount(3); setPhase("count"); }}>Begin test</button>
          <Link className="btn ghost" href="/">Back</Link>
        </div>
      </div>
    );
  }

  // ================= COUNTDOWN =================
  if (phase === "count") {
    return (
      <div className="countdown">
        <div key={count} className="cnum">{count > 0 ? count : "GO"}</div>
        <p className="muted">Get ready…</p>
      </div>
    );
  }

  // ================= RESULT =================
  if (phase === "result" && result) {
    const pct = Math.max(0, Math.round((result.score / result.total) * 100));
    const attempted = result.correct + result.wrong;
    const accuracy = attempted ? Math.round((result.correct / attempted) * 100) : 0;
    const avg = attempted ? Math.round(result.timeTaken / attempted) : 0;
    const tier = tierFor(pct);
    const radarData = Object.entries(result.by).map(([label, s]) => ({
      label,
      value: Math.max(0, (s.score / (s.total * CORRECT)) * 100),
    }));

    return (
      <div>
        {pct >= 50 && <Confetti />}

        <div className="glass resulthero">
          <Ring value={pct / 100} size={190} stroke={12} label={<><b className="bignum">{shown}</b><small>/ {result.total}</small></>} />
          <div className="rtext">
            <p className="eyebrow">{test.title}</p>
            <h2 className="grad">{tier.t}</h2>
            <p className="muted">{tier.d}</p>
            <div className="rpills">
              <span>🎯 {accuracy}% accuracy</span>
              <span>⏱️ {avg}s / question</span>
              <span>⚡ +{result.gained} XP</span>
            </div>
            {result.leveled && <p className="levelup">🎉 Level up! You are now Level {result.level} · {result.title}</p>}
          </div>
        </div>

        <div className="rgrid">
          <div className="glass">
            <p className="eyebrow">Breakdown</p>
            <div className="stats3">
              <div className="s ok"><b>{result.correct}</b>Correct</div>
              <div className="s bad"><b>{result.wrong}</b>Wrong</div>
              <div className="s"><b>{result.skipped}</b>Skipped</div>
            </div>
            <div className="table">
              <div className="tr th five"><span>Subject</span><span>Score</span><span>✓</span><span>✗</span><span>–</span></div>
              {Object.entries(result.by).map(([sub, s]) => (
                <div className="tr five" key={sub}>
                  <span>{sub}</span><span>{s.score}/{s.total * CORRECT}</span><span>{s.correct}</span><span>{s.wrong}</span><span>{s.skipped}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass">
            <p className="eyebrow">Strength map</p>
            <Radar data={radarData} />
          </div>
        </div>

        <div className="row wrapr">
          <button className="btn" onClick={() => window.location.reload()}>Retake test</button>
          <button className="btn ghost" onClick={share}>{copied ? "Copied!" : "Challenge a friend"}</button>
          <Link className="btn ghost" href="/">All tests</Link>
        </div>

        <h2 className="h2">Answer review</h2>
        {questions.map((qq, i) => {
          const a = answers[qq.id];
          const status = a === undefined ? "skip" : a === qq.answer ? "ok" : "bad";
          return (
            <div className={`glass review ${status}`} key={qq.id}>
              <div className="row between">
                <span className="muted small">Q{i + 1} · {qq.year ? `NEET ${qq.year} Q${qq.qno} · ` : ""}{qq.subject} · {qq.chapter}</span>
                <span className="muted small">⏱ {spent[qq.id] || 0}s</span>
              </div>
              <p className="rq"><b>{qq.q}</b></p>
              {qq.image && <img className="qimg" src={qq.image} alt="Question figure" />}
              <p className="small">
                Your answer: <b>{a === undefined ? "Not attempted" : qq.options[a]}</b>
                <br />
                Correct answer: <b>{qq.options[qq.answer]}</b>
              </p>
              {qq.explanation && <p className="muted small">💡 {qq.explanation}</p>}
              {qq.year && <span className={`xbadge ${qq.explanationStatus}`}>{STATUS_LABEL[qq.explanationStatus] || STATUS_LABEL.missing}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  // ================= TEST =================
  const selected = answers[q.id];
  const answeredCount = Object.keys(answers).length;
  const low = timeLeft < 60;

  return (
    <div>
      <div className="topbar glass">
        <div className="tinfo">
          <b>{test.title}</b>
          <span className="muted small">{answeredCount}/{questions.length} answered</span>
        </div>
        <div className="progress"><i style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
        <Ring
          value={timeLeft / (test.minutes * 60)}
          size={64}
          stroke={5}
          className={low ? "low" : ""}
          label={<span className="tlabel">{fmt(timeLeft)}</span>}
        />
      </div>

      <div className="testlayout">
        <div className="glass qcard" key={q.id}>
          <div className="row between">
            <span className="chip">{q.subject}</span>
            <span className="muted small">Question {idx + 1} / {questions.length}</span>
          </div>
          <p className="muted small chap">{q.chapter}</p>
          <h2 className="qtext">{q.q}</h2>
          {q.image && <img className="qimg" src={q.image} alt="Question figure" />}

          <div className="options">
            {q.options.map((o, i) => (
              <button key={i} className={`opt ${selected === i ? "sel" : ""}`} onClick={() => choose(i)}>
                <span className="letter">{String.fromCharCode(65 + i)}</span>
                <span>{o}</span>
              </button>
            ))}
          </div>

          <div className="row wrapr">
            <button className="btn ghost" onClick={clearAnswer}>Clear</button>
            <button className={`btn ghost ${marked[q.id] ? "on" : ""}`} onClick={toggleMark}>
              {marked[q.id] ? "★ Marked" : "☆ Mark for review"}
            </button>
            <span className="grow" />
            <button className="btn ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Prev</button>
            <button className="btn" disabled={idx === questions.length - 1} onClick={() => setIdx(idx + 1)}>Next →</button>
          </div>
        </div>

        <aside className="glass palette">
          <p className="eyebrow">Question palette</p>
          <div className="pal">
            {questions.map((x, i) => {
              const cls = [
                "pbtn",
                answers[x.id] !== undefined ? "answered" : "",
                marked[x.id] ? "marked" : "",
                i === idx ? "current" : "",
              ].join(" ");
              return (
                <button key={x.id} className={cls} onClick={() => setIdx(i)}>{i + 1}</button>
              );
            })}
          </div>
          <div className="legend small muted">
            <span><i className="dot answered" /> Answered</span>
            <span><i className="dot marked" /> Marked</span>
            <span><i className="dot" /> Not answered</span>
          </div>
          <button className="btn full" onClick={confirmSubmit}>Submit test</button>
        </aside>
      </div>
    </div>
  );
}
