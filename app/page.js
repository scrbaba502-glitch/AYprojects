
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
      <style>{`
        .cinematic-intro {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999 !important;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          min-height: 0 !important;
          margin: 0 !important;
          display: grid;
          place-items: center;
          overflow: hidden;
          isolation: isolate;
          background:
            radial-gradient(ellipse at 50% 65%, #172c54 0%, #080d1b 45%, #02040a 100%);
          animation: introExit 6.5s ease forwards !important;
        }

        .intro-stars {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image:
            radial-gradient(2px 2px at 15% 25%, #fff 60%, transparent),
            radial-gradient(2px 2px at 75% 18%, #fff 60%, transparent),
            radial-gradient(1px 1px at 45% 40%, #fff 60%, transparent),
            radial-gradient(2px 2px at 85% 70%, #fff 60%, transparent),
            radial-gradient(1px 1px at 25% 80%, #fff 60%, transparent);
          background-size: 180px 180px;
          opacity: .8;
          animation: starDrift 18s linear infinite;
        }

        .intro-earth {
          position: absolute;
          z-index: 1;
          width: min(100vw, 760px);
          aspect-ratio: 1;
          border-radius: 50%;
          bottom: -78%;
          background:
            radial-gradient(ellipse at 35% 28%, rgba(91,194,255,.5), transparent 28%),
            radial-gradient(circle at 50% 40%, #2867a5, #0b2850 62%, #020611 76%);
          box-shadow:
            0 -12px 75px rgba(65,165,255,.75),
            inset 0 20px 65px rgba(93,184,255,.35);
          animation: earthRise 3.5s cubic-bezier(.16,.8,.3,1) forwards !important;
        }

        .intro-impact {
          position: absolute;
          z-index: 2;
          font-family: Georgia, serif;
          font-size: clamp(7rem, 25vw, 15rem);
          font-weight: 900;
          color: #fff0b3;
          text-shadow:
            0 0 25px #e7bd65,
            0 0 65px #c18b2e,
            0 0 120px #a87928;
          animation: impactDrop 2.2s cubic-bezier(.15,.8,.25,1) forwards !important;
        }

        .intro-caption {
          position: absolute;
          z-index: 3;
          top: 53%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 0 12px;
          opacity: 0;
          animation: captionReveal 1.5s ease 2.6s forwards !important;
        }

        .intro-caption span {
          color: #e4ce9b;
          font-size: .75rem;
          letter-spacing: 7px;
        }

        .intro-caption strong {
          color: #fff4d6;
          font-family: Georgia, serif;
          font-size: clamp(2rem, 8vw, 4.5rem);
          letter-spacing: 2px;
          text-align: center;
          text-shadow: 0 0 35px rgba(220,177,91,.7);
        }

        @keyframes impactDrop {
          0% { transform: translateY(-120vh) scale(.3); opacity: 0; }
          65% { transform: translateY(0) scale(1.12); opacity: 1; }
          78% { transform: translateY(-25px) scale(.96); }
          100% { transform: translateY(0) scale(1); }
        }

        @keyframes earthRise {
          from { transform: scale(.65); opacity: .1; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes captionReveal {
          from { opacity: 0; transform: translateY(25px); }
          to { opacity: 1; transform: translateY(-15px); }
        }

        @keyframes starDrift {
          to { background-position: 180px 180px; }
        }

        @keyframes introExit {
          0%, 80% { opacity: 1; visibility: visible; }
          100% { opacity: 0; visibility: hidden; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cinematic-intro {
            animation: introExit .8s ease .5s forwards !important;
          }
          .intro-earth, .intro-impact, .intro-stars {
            animation: none !important;
          }
          .intro-caption {
            opacity: 1;
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="cinematic-intro"
        aria-label="A squared presents AYneetPYQ plus"
      >
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
              <Ring
                value={0.85}
                size={110}
                stroke={9}
                label={<><b>612</b><small>/ 720</small></>}
              />
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
