"use client";

import { useEffect, useState } from "react";

export default function CinematicIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 12600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="a2-film" role="presentation">
      <div className="a2-stars" />
      <div className="a2-streaks" />
      <div className="a2-earth">
        <div className="a2-earth-clouds" />
        <div className="a2-earth-glow" />
      </div>
      <div className="a2-logo-flight">A²</div>
      <div className="a2-impact">
        <span className="a2-blast-core" />
        <span className="a2-blast-ring a2-ring-one" />
        <span className="a2-blast-ring a2-ring-two" />
        <span className="a2-blast-rays" />
      </div>
      <div className="a2-film-title">
        <div>A² PRESENTS</div>
        <strong>AYneetPYQ+</strong>
      </div>
      <style jsx>{`
        .a2-film {
          position: fixed; inset: 0; z-index: 999999; overflow: hidden;
          width: 100%; height: 100vh; height: 100dvh; isolation: isolate;
          background: radial-gradient(ellipse at 50% 58%, #071b35 0%, #020711 44%, #000 78%);
          color: #fff1c9; pointer-events: none;
          animation: film-exit 1.1s ease-in 11.5s forwards;
        }
        .a2-stars, .a2-streaks { position:absolute; inset:-30%; pointer-events:none; }
        .a2-stars {
          opacity:.8;
          background-image:
            radial-gradient(1px 1px at 8% 16%,#fff,transparent),
            radial-gradient(1.5px 1.5px at 24% 72%,#d6eaff,transparent),
            radial-gradient(1px 1px at 43% 31%,#fff,transparent),
            radial-gradient(2px 2px at 67% 18%,#fff,transparent),
            radial-gradient(1px 1px at 83% 63%,#d6eaff,transparent),
            radial-gradient(1px 1px at 91% 37%,#fff,transparent),
            radial-gradient(1px 1px at 53% 84%,#fff,transparent);
          background-size: 230px 190px;
          animation: star-drift 4s linear infinite;
        }
        .a2-streaks {
          opacity:0; background:repeating-linear-gradient(90deg,transparent 0 7%,rgba(133,190,255,.0) 7.1% 7.3%,transparent 7.5% 14%);
          transform:perspective(250px) rotateX(65deg) scale(1.8);
          animation: streak-show 2.1s ease-in 2.5s forwards, streak-rush 1.5s linear 3.2s infinite;
        }
        .a2-earth {
          position:absolute; width:min(118vw,780px); aspect-ratio:1; left:50%; bottom:-78%;
          transform:translateX(-50%); border-radius:50%;
          opacity:0;
          background:
            radial-gradient(ellipse at 32% 27%,rgba(255,255,255,.9) 0 1%,transparent 2%),
            radial-gradient(ellipse at 32% 30%,#79c8a0 0 7%,transparent 8%),
            radial-gradient(ellipse at 65% 43%,#78b58a 0 10%,transparent 11%),
            radial-gradient(ellipse at 45% 62%,#4e9a78 0 8%,transparent 9%),
            radial-gradient(circle at 35% 28%,#65b7df,#17619a 43%,#071c43 72%);
          box-shadow:inset -35px -20px 80px #000b24, inset 15px 10px 45px #a8e4ff66, 0 -8px 55px #36aaff99;
          animation: earth-rise 8s cubic-bezier(.2,.7,.2,1) 3.1s forwards;
        }
        .a2-earth:before {
          content:""; position:absolute; inset:-2%; border-radius:50%;
          border:2px solid #70caff99; box-shadow:0 0 28px #2f9eff, inset 0 0 24px #55baff66;
        }
        .a2-earth-clouds {
          position:absolute; inset:5%; border-radius:50%;
          background:repeating-linear-gradient(165deg,transparent 0 13%,#d9f3ff30 14%,transparent 16% 25%);
          filter:blur(7px); transform:rotate(-18deg);
        }
        .a2-earth-glow { position:absolute; inset:-12%; border-radius:50%; background:radial-gradient(ellipse at 45% 4%,#8bdcff66,transparent 50%); }
        .a2-logo-flight {
          position:absolute; z-index:4; top:39%; left:50%; transform:translate(-50%,-50%) scale(.035);
          font:900 clamp(78px,19vw,190px)/1 Georgia,serif; letter-spacing:-.08em;
          color:#fff0bd; -webkit-text-stroke:1px #ffe0a0;
          text-shadow:0 0 12px #fff,0 0 35px #ffc45c,0 0 80px #ff9e35;
          opacity:0; animation: logo-flight 6.05s cubic-bezier(.15,.72,.2,1) 1.25s forwards;
          white-space:nowrap;
        }
        .a2-impact { position:absolute; z-index:5; left:50%; top:59%; width:10px; height:10px; transform:translate(-50%,-50%); opacity:0; }
        .a2-blast-core { position:absolute; inset:-2px; border-radius:50%; background:#fff9dc; box-shadow:0 0 30px 20px #fff,0 0 90px 55px #ffb23e,0 0 170px 90px #ff5a16; animation:blast-core 1.25s ease-out 5.55s both; }
        .a2-blast-ring { position:absolute; left:50%; top:50%; width:20px; height:20px; border:4px solid #ffe8a7; border-radius:50%; transform:translate(-50%,-50%); box-shadow:0 0 22px #ffb94e; }
        .a2-ring-one { animation:blast-ring 1.5s ease-out 5.55s both; }
        .a2-ring-two { border-color:#76d5ff; animation:blast-ring 1.8s ease-out 5.72s both; }
        .a2-blast-rays { position:absolute; inset:-4px; border-radius:50%; background:repeating-conic-gradient(#fff8d8 0 2deg,transparent 3deg 18deg); animation:blast-rays .8s ease-out 5.55s both; }
        .a2-film-title {
          position:absolute; z-index:8; left:5%; right:5%; top:37%; text-align:center;
          opacity:0; transform:translateY(24px) scale(.94);
          color:#f6dfad; text-shadow:0 0 22px #d99d43,0 2px 3px #000;
          animation:title-arrive 1.5s cubic-bezier(.2,.8,.2,1) 7s forwards;
        }
        .a2-film-title div { font:600 clamp(15px,3.8vw,26px)/1.4 Georgia,serif; letter-spacing:.42em; margin-bottom:13px; }
        .a2-film-title strong { display:block; font:900 clamp(34px,9.5vw,76px)/1.1 Georgia,serif; letter-spacing:.015em; color:#fff0c7; }
        @keyframes star-drift { to { transform:translateY(16%); } }
        @keyframes streak-show { to { opacity:.8; } }
        @keyframes streak-rush { to { transform:perspective(250px) rotateX(65deg) scale(2.8) translateY(18%); } }
        @keyframes earth-rise { 0% { opacity:0; bottom:-78%; } 100% { opacity:1; bottom:-49%; } }
        @keyframes logo-flight {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.035); filter:blur(5px); }
          12% { opacity:1; filter:blur(0); }
          62% { opacity:1; transform:translate(-50%,-50%) scale(.62); }
          82% { opacity:1; transform:translate(-50%,110%) scale(.9) rotate(-8deg); }
          91% { opacity:1; transform:translate(-50%,125%) scale(1.15) rotate(4deg); }
          100% { opacity:0; transform:translate(-50%,135%) scale(1.3); }
        }
        @keyframes blast-core { 0% { opacity:0; transform:scale(.1); } 20% { opacity:1; transform:scale(7); } 100% { opacity:0; transform:scale(18); } }
        @keyframes blast-ring { 0% { opacity:1; transform:translate(-50%,-50%) scale(.2); } 100% { opacity:0; transform:translate(-50%,-50%) scale(34); } }
        @keyframes blast-rays { 0% { opacity:0; transform:scale(.1) rotate(0); } 25% { opacity:1; transform:scale(9) rotate(20deg); } 100% { opacity:0; transform:scale(20) rotate(45deg); } }
        @keyframes title-arrive { to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes film-exit { to { opacity:0; visibility:hidden; } }
        @media (prefers-reduced-motion: reduce) {
          .a2-film { animation:none; }
          .a2-logo-flight,.a2-streaks,.a2-impact { display:none; }
          .a2-earth { opacity:1; bottom:-49%; animation:none; }
          .a2-film-title { opacity:1; transform:none; animation:none; }
        }
      `}</style>
    </div>
  );
}
