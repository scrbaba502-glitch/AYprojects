
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
  "Mechanics", "Genetics", "Organic Chemistry", "Human Physiology",
  "Optics", "Chemical Bonding", "Ecology", "Electromagnetism",
  "Thermodynamics", "Cell Biology", "Coordination Compounds",
  "Modern Physics", "Biotechnology", "Equilibrium",
];

const features = [
  { i: "⏱️", t: "Exam-grade timer", d: "A live countdown ring with auto-submit, like the real exam." },
  { i: "⌨️", t: "Keyboard-first", d: "Use A–D to answer, N / P to move and M to mark." },
  { i: "🔥", t: "XP, levels & streaks", d: "Earn XP, climb levels and keep your practice streak alive." },
  { i: "🕸️", t: "Radar analytics", d: "Understand your Physics, Chemistry and Biology performance." },
  { i: "🧠", t: "Instant explanations", d: "Learn why an answer is correct or incorrect." },
  { i: "🎉", t: "Made to feel good", d: "Smooth animations and rewarding progress." },
];

export default function Home() {
  return (
    <>
      <div className="cinematic-intro" aria-label="A squared presents AYneetPYQ plus">
        <div className="intro-stars" />
        <div className="intro-earth" />
        <div className="intro-impact">A²</div>
        <div className="intro-caption">
          <span>A² PRESENTS</span>
          <strong>AYneetPYQ+</strong>
        </div>
      </div>

      <section className="hero">
        <div className="herotext">
          <span className="chip">✦ YOUR NEET JOURNEY STARTS HERE</span>
          <h1>
            Prepare with purpose.
            <br />
            <span className="grad">Rise beyond limits.</span>
          </h1>
          <p className="lead">
            Your NEET preparation companion. Practice tests, track progress,
            understand your mistakes and keep moving towards your dream.
          </p>
          <div className="row">
            <Link href="/#tests" className="btn">Explore tests</Link>
            <Link href="/#dashboard" className="btn ghost">My progress</Link>
          </div>
        </div>

        <div className="herovis">
          <div className="halo" />
          <span className="orb o1">⚛️</span>
          <span className="orb o2">🧪</span>
          <span className="orb o3">🧬</span>
          <div className="glass scorecard">
            <p className="eyebrow">YOUR POTENTIAL</p>
            <div className="row center">
              <Ring value={0.85} size={110} stroke={9}
                label={<><b>612</b><small>/ 720</small></>} />
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

      <div className="marquee" aria-hidden="true">
        <div className="track">
          {[...topics, ...topics].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      <section id="tests" className="section">
        <p className="eyebrow">YOUR PREPARATION</p>
        <h2>Choose your next challenge</h2>
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

      <section id="dashboard" className="section">
        <p className="eyebrow">YOUR JOURNEY</p>
        <h2>Every effort moves you forward</h2>
        <Dashboard />
      </section>

      <section id="features" className="section">
        <p className="eyebrow">THE AYneetPYQ+ EXPERIENCE</p>
        <h2>Everything you need to improve</h2>
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

      <section className="mission">
        <p className="eyebrow">OUR PURPOSE</p>
        <h2>Education should never be a privilege.</h2>
        <p>
          Our goal is simple: free education for everyone, with NEET previous
          year questions, clear explanations and practice mock tests.
        </p>
        <strong>A² — Learning without limits.</strong>
      </section>
    </>
  );
}
