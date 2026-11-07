import Link from "next/link";
import { tests, getQuestionsFor } from "../lib/questions";
import TestCard from "../components/TestCard";
import Dashboard from "../components/Dashboard";
import Ring from "../components/Ring";

const meta = {
  "full-mock-1": { icon: "🏆", accent: "#fbbf24" },
  "physics-quick": { icon: "⚛️", accent: "#22d3ee" },
  "chemistry-quick": { icon: "🧪", accent: "#a78bfa" },
  "biology-quick": { icon: "🧬", accent: "#34d399" },
};

const topics = [
  "Mechanics", "Genetics", "Organic Chemistry", "Human Physiology", "Optics",
  "Chemical Bonding", "Ecology", "Electromagnetism", "Thermodynamics", "Cell Biology",
  "Coordination Compounds", "Modern Physics", "Biotechnology", "Equilibrium",
];

const features = [
  { i: "⏱️", t: "Exam-grade timer", d: "A live countdown ring with auto-submit, exactly like the real hall." },
  { i: "⌨️", t: "Keyboard-first", d: "Press A–D to answer, N / P to move, M to mark. Zero mouse needed." },
  { i: "🔥", t: "XP, levels & streaks", d: "Every test earns XP. Climb from Aspirant to Topper and keep your daily streak alive." },
  { i: "🕸️", t: "Radar analytics", d: "See your Physics / Chemistry / Biology balance as a shape, not a table." },
  { i: "🧠", t: "Instant explanations", d: "Every answer comes with a reason and the time you spent on it." },
  { i: "🎉", t: "Made to feel good", d: "Count-up scores, confetti and smooth motion keep practice addictive." },
];

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="herotext">
          <span className="chip">✨ NEET practice, reimagined</span>
          <h1>
            Don&apos;t just practise.
            <br />
            <span className="grad">Level up</span> to your rank.
          </h1>
          <p className="lead">
            Timed tests, NEET-style +4 / −1 marking, XP, streaks and a radar view of your strengths — all in
            one beautifully fast app.
          </p>
          <div className="row">
            <Link href="/#tests" className="btn">Start a test</Link>
            <Link href="/#features" className="btn ghost">See what&apos;s inside</Link>
          </div>
        </div>

        <div className="herovis">
          <div className="halo" />
          <span className="orb o1">⚛️</span>
          <span className="orb o2">🧪</span>
          <span className="orb o3">🧬</span>
          <div className="glass scorecard">
            <p className="eyebrow">Sample scorecard</p>
            <div className="row center">
              <Ring value={0.85} size={110} stroke={9} label={<><b>612</b><small>/ 720</small></>} />
              <div>
                <p className="stat">✅ 158 correct</p>
                <p className="stat">❌ 20 wrong</p>
                <p className="stat">⏭️ 2 skipped</p>
              </div>
            </div>
            <div className="mini">
              <i style={{ width: "92%" }} /><span>Biology</span>
              <i style={{ width: "81%" }} /><span>Chemistry</span>
              <i style={{ width: "74%" }} /><span>Physics</span>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden="true">
        <div className="track">
          {[...topics, ...topics].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      {/* TESTS */}
      <section id="tests" className="section">
        <p className="eyebrow">Test series</p>
        <h2>Pick your battle</h2>
        <div className="grid">
          {tests.map((t) => (
            <TestCard
              key={t.id}
              test={t}
              count={getQuestionsFor(t).length}
              icon={meta[t.id]?.icon || "📘"}
              accent={meta[t.id]?.accent || "#7c5cff"}
            />
          ))}
        </div>
      </section>

      {/* DASHBOARD */}
      <section id="dashboard" className="section">
        <p className="eyebrow">Your progress</p>
        <h2>Every test makes you stronger</h2>
        <Dashboard />
      </section>

      {/* FEATURES */}
      <section id="features" className="section">
        <p className="eyebrow">Why AYneetpyq+</p>
        <h2>Built different</h2>
        <div className="feats">
          {features.map((f) => (
            <div className="glass feat" key={f.t}>
              <span className="fi">{f.i}</span>
              <h3>{f.t}</h3>
              <p className="muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
