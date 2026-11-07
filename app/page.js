
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
          margin: 0 !important;
          display: grid;
          place-items: center;
          overflow: hidden;
          isolation: isolate;
          perspective: 900px;
          background: #000;
          animation: infinityFade 9.2s ease forwards !important;
        }

        /* Phase 1: hold on almost-total darkness. */
        .intro-stars {
          position: absolute;
          inset: -30%;
          z-index: 0;
          opacity: 0;
          background-image:
            radial-gradient(1px 1px at 12% 18%, #fff 60%, transparent),
            radial-gradient(1px 1px at 73% 22%, #fff 60%, transparent),
            radial-gradient(1.5px 1.5px at 42% 66%, #dcecff 60%, transparent),
            radial-gradient(1px 1px at 88% 74%, #fff 60%, transparent),
            radial-gradient(1px 1px at 25% 83%, #fff 60%, transparent),
            radial-gradient(1px 1px at 61% 47%, #fff 60%, transparent);
          background-size: 240px 240px;
          animation: starsWake 9.2s ease forwards;
        }

        /* Star field stretches into hyperspace streaks as A² approaches. */
        .intro-warp {
          position: absolute;
          inset: -60%;
          z-index: 1;
          opacity: 0;
          background:
            repeating-conic-gradient(from 0deg at 50% 50%,
              transparent 0deg 3.2deg,
              rgba(130,190,255,.0) 3.2deg 3.35deg,
              rgba(190,225,255,.72) 3.4deg 3.48deg,
              transparent 3.55deg 7deg);
          -webkit-mask-image: radial-gradient(ellipse at center, transparent 0 5%, #000 18% 70%, transparent 83%);
          mask-image: radial-gradient(ellipse at center, transparent 0 5%, #000 18% 70%, transparent 83%);
          animation: warpRush 3.1s cubic-bezier(.2,.7,.1,1) 1.15s both;
        }

        .intro-earth {
          position: absolute;
          z-index: 2;
          width: min(145vw, 1050px);
          aspect-ratio: 1;
          border-radius: 50%;
          bottom: -92%;
          opacity: 0;
          background:
            radial-gradient(ellipse at 38% 22%, rgba(111,210,255,.35), transparent 24%),
            radial-gradient(ellipse at 62% 34%, rgba(47,132,190,.28), transparent 25%),
            radial-gradient(circle at 50% 42%, #23649b 0%, #10365f 38%, #07182f 66%, #010611 76%);
          box-shadow:
            0 -5px 25px rgba(100,190,255,.5),
            0 -25px 100px rgba(40,130,255,.32),
            inset 0 24px 80px rgba(105,198,255,.22);
          animation: earthReveal 2.2s cubic-bezier(.15,.75,.25,1) 2.7s forwards;
        }

        .intro-earth::before {
          content: "";
          position: absolute;
          inset: 1.5%;
          border-radius: 50%;
          border-top: 3px solid rgba(151,225,255,.65);
          filter: blur(7px);
          box-shadow: 0 -18px 45px rgba(74,180,255,.8);
        }

        .intro-earth::after {
          content: "";
          position: absolute;
          inset: 5%;
          border-radius: 50%;
          background:
            radial-gradient(ellipse at 30% 35%, rgba(70,155,105,.5), transparent 13%),
            radial-gradient(ellipse at 64% 48%, rgba(65,145,100,.42), transparent 17%),
            radial-gradient(ellipse at 48% 70%, rgba(48,120,95,.35), transparent 12%);
          filter: blur(12px);
          opacity: .8;
        }

        /* A² starts as a speck at the vanishing point, then rockets forward. */
        .intro-impact {
          position: absolute;
          z-index: 4;
          top: 39%;
          left: 50%;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(6rem, 24vw, 14rem);
          line-height: 1;
          font-weight: 900;
          color: #fff1bd;
          transform-style: preserve-3d;
          transform-origin: center;
          opacity: 0;
          text-shadow:
            0 0 8px #fff,
            0 0 25px #f8d47b,
            0 0 65px #d99b35,
            0 0 130px #a96d22;
          animation: infinityLaunch 3.15s cubic-bezier(.12,.78,.16,1) 1.15s both;
        }

        .intro-impact::before {
          content: "";
          position: absolute;
          z-index: -1;
          inset: 12%;
          border-radius: 50%;
          background: #ffcb68;
          filter: blur(48px);
          opacity: .75;
        }

        .intro-shockwave {
          position: absolute;
          z-index: 3;
          left: 50%;
          top: 61%;
          width: 8vmin;
          height: 8vmin;
          border: 2px solid rgba(255,225,160,.95);
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%,-50%) scale(.1);
          box-shadow: 0 0 35px rgba(110,195,255,.9), inset 0 0 25px rgba(255,220,150,.6);
          animation: shockwave 1.45s cubic-bezier(.12,.7,.18,1) 3.9s both;
        }

        .intro-flash {
          position: absolute;
          z-index: 6;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          background: radial-gradient(ellipse at 50% 59%, #fff 0%, #fff4cf 8%, rgba(106,190,255,.8) 23%, transparent 65%);
          animation: impactFlash 1.1s ease-out 3.85s both;
        }

        .intro-caption {
          position: absolute;
          z-index: 7;
          top: 47%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 13px;
          width: 100%;
          padding: 0 14px;
          opacity: 0;
          transform: translateY(22px);
          animation: titleReveal 2s cubic-bezier(.2,.7,.2,1) 5.1s forwards;
        }

        .intro-caption span {
          color: #e8d2a1;
          font-size: .72rem;
          letter-spacing: .62em;
          text-indent: .62em;
          text-shadow: 0 0 18px rgba(255,210,130,.55);
        }

        .intro-caption strong {
          color: #fff3d4;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(2rem, 8vw, 4.6rem);
          letter-spacing: .035em;
          text-align: center;
          text-shadow: 0 0 18px rgba(255,235,190,.55), 0 0 55px rgba(220,166,77,.65);
        }

        @keyframes starsWake {
          0%, 12% { opacity: 0; transform: scale(.8); }
          25%, 100% { opacity: .8; transform: scale(1); }
        }

        @keyframes warpRush {
          0% { opacity: 0; transform: scale(.08) rotate(0deg); }
          18% { opacity: .95; }
          75% { opacity: .75; transform: scale(1.15) rotate(12deg); }
          100% { opacity: 0; transform: scale(2.8) rotate(25deg); }
        }

        @keyframes infinityLaunch {
          0% {
            opacity: 0;
            transform: translate3d(-50%,-50%,-2600px) scale(.006) rotate(-8deg);
            filter: blur(3px);
          }
          12% {
            opacity: .8;
            transform: translate3d(-50%,-50%,-1700px) scale(.025) rotate(-5deg);
            filter: blur(2px);
          }
          52% {
            opacity: 1;
            transform: translate3d(-50%,-50%,-220px) scale(.42) rotate(2deg);
            filter: blur(1px);
          }
          72% {
            opacity: 1;
            transform: translate3d(-50%,-50%,90px) scale(1.18) rotate(0deg);
            filter: blur(0);
          }
          84% {
            opacity: 1;
            transform: translate3d(-50%,22vh,0) scale(.72) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate3d(-50%,22vh,0) scale(.55);
          }
        }

        @keyframes earthReveal {
          0% { opacity: 0; transform: scale(.82) translateY(10%); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes shockwave {
          0% { opacity: .95; transform: translate(-50%,-50%) scale(.1); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(18); }
        }

        @keyframes impactFlash {
          0% { opacity: 0; }
          12% { opacity: 1; }
          42% { opacity: .48; }
          100% { opacity: 0; }
        }

        @keyframes titleReveal {
          0% { opacity: 0; transform: translateY(22px); filter: blur(12px); }
          35% { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @keyframes infinityFade {
          0%, 88% { opacity: 1; visibility: visible; }
          100% { opacity: 0; visibility: hidden; pointer-events: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cinematic-intro { animation: infinityFade 1s ease 1s forwards !important; }
          .intro-stars, .intro-warp, .intro-earth, .intro-impact,
          .intro-shockwave, .intro-flash, .intro-caption { animation: none !important; }
          .intro-caption { opacity: 1; transform: none; }
        }
      `}</style>

      <div
        className="cinematic-intro"
        aria-label="A squared presents AYneetPYQ plus"
      >
        <div className="intro-stars" />
        <div className="intro-warp" />
        <div className="intro-earth" />
        <div className="intro-shockwave" />
        <div className="intro-impact">A²</div>
        <div className="intro-flash" />
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
