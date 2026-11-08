
"use client";

import { useEffect, useRef, useState } from "react";
import { createSpaceScene } from "../lib/spaceScene";
import { createIntroSound } from "../lib/introSound";
import { TL, phaseAt } from "../lib/introTimeline";

const SEEN = "a2-intro-seen";

// Plays once per browser tab/session:
//   1) a golden A² is thrown from infinity toward Earth  2) it hits — explosion + Earth  3) "A² presents AYneetPYQ+"
// Falls back to a lightweight CSS animation if WebGL2 isn't available, and to a short
// static title card if the visitor prefers reduced motion.
export default function CinematicIntro() {
  const [status, setStatus] = useState("pending"); // pending | play | static | done
  const [phase, setPhase] = useState("void");
  const [gl, setGl] = useState(true);
  const [audio, setAudio] = useState("locked"); // locked | on | muted
  const canvasRef = useRef(null);
  const soundRef = useRef(null);
  const skipRef = useRef(null);
  const panelRef = useRef(null);
  const retRef = useRef(null);
  const flagRef = useRef(null);
  const rangeRef = useRef(null);
  const etaRef = useRef(null);

  // decide what to do on first client render
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN) === "1";
    } catch (e) {}
    if (seen) {
      setStatus("done");
      return;
    }
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStatus(reduced ? "static" : "play");
  }, []);

  // lock page scroll while the overlay is up
  useEffect(() => {
    if (status !== "play" && status !== "static") return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [status]);

  // reduced-motion: short static title card
  useEffect(() => {
    if (status !== "static") return;
    setPhase("reveal");
    const a = setTimeout(() => setPhase("exit"), 2200);
    const b = setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN, "1");
      } catch (e) {}
      setStatus("done");
    }, 3000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [status]);

  // the cinematic
  useEffect(() => {
    if (status !== "play") return;

    const sound = createIntroSound();
    soundRef.current = sound;

    const scene = canvasRef.current ? createSpaceScene(canvasRef.current, { onError: (e) => console.warn("[intro]", e) }) : null;
    if (!scene) setGl(false);

    const running = sound.tryStart();
    setAudio(sound.muted ? "muted" : running ? "on" : "locked");

    const unlock = (e) => {
      if (e && e.target && e.target.closest && e.target.closest(".intro-sound")) return;
      sound.tryStart();
      setTimeout(() => setAudio(sound.muted ? "muted" : sound.isRunning() ? "on" : "locked"), 60);
    };
    const gestures = ["pointerdown", "keydown", "touchstart"];
    gestures.forEach((g) => window.addEventListener(g, unlock, { passive: true }));
    const onResize = () => scene && scene.resize();
    window.addEventListener("resize", onResize);

    let t = 0;
    let last = performance.now();
    let raf = 0;
    let cur = "void";
    let frames = 0;
    let ema = 1 / 60;
    let lastScale = 0;
    let scaleSteps = 0;
    let flagTxt = "";
    let finished = false;
    const clamp01 = (x) => Math.min(1, Math.max(0, x));

    const markSeen = () => {
      try {
        sessionStorage.setItem(SEEN, "1");
      } catch (e) {}
    };

    skipRef.current = () => {
      markSeen();
      if (t < TL.exit) t = TL.exit;
    };

    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;

      // dynamic resolution: if we can't hold ~60fps, trade pixels for smoothness
      frames++;
      ema = ema * 0.92 + dt * 0.08;
      if (scene && !window.__noDRS && frames > 24 && ema > 0.0225 && now - lastScale > 1400 && scaleSteps < 4) {
        scene.setDpr(Math.max(0.7, scene.dpr * 0.85));
        scaleSteps++;
        lastScale = now;
        ema = 1 / 60;
      }

      if (scene) scene.render(Math.min(t, TL.exit + 0.9));

      // engineering HUD
      if (scene && scene.info) {
        const info = scene.info;
        const panel = panelRef.current, ret = retRef.current;
        if (panel) {
          panel.style.opacity = String(clamp01((t - 0.9) / 0.7) * (1 - clamp01((t - (TL.reveal - 0.5)) / 0.5)));
          const txt = t < TL.impact ? "TRAJECTORY LOCKED" : "IMPACT CONFIRMED";
          if (txt !== flagTxt && flagRef.current) {
            flagTxt = txt;
            flagRef.current.textContent = txt;
          }
          if (rangeRef.current) rangeRef.current.textContent = Math.round(t < TL.impact ? info.range : 0).toLocaleString("en-US") + " km";
          if (etaRef.current) {
            const r = Math.max(0, TL.impact - t);
            etaRef.current.textContent = "00:" + (r < 10 ? "0" : "") + r.toFixed(2);
          }
        }
        if (ret) {
          const size = Math.min(380, Math.max(56, info.r * 2.5));
          ret.style.opacity = String(info.vis);
          ret.style.width = ret.style.height = size + "px";
          ret.style.transform = "translate3d(" + (info.x - size / 2).toFixed(1) + "px," + (info.y - size / 2).toFixed(1) + "px,0)";
        }
      }
      sound.sync(t);

      const ph = phaseAt(t);
      if (ph !== cur) {
        cur = ph;
        setPhase(ph);
        if (ph === "exit") {
          markSeen();
          sound.fadeOut();
        }
      }

      if (t >= TL.end) {
        if (!finished) {
          finished = true;
          setStatus("done");
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      gestures.forEach((g) => window.removeEventListener(g, unlock));
      window.removeEventListener("resize", onResize);
      if (scene) scene.destroy();
      sound.fadeOut();
      sound.destroy();
      soundRef.current = null;
      skipRef.current = null;
    };
  }, [status]);

  function toggleSound() {
    const s = soundRef.current;
    if (!s) return;
    if (audio === "muted") {
      s.setMuted(false);
      setAudio(s.tryStart() ? "on" : "locked");
      setTimeout(() => setAudio(s.isRunning() ? "on" : "locked"), 80);
    } else if (audio === "on") {
      s.setMuted(true);
      setAudio("muted");
    } else {
      s.tryStart();
      setTimeout(() => setAudio(s.isRunning() ? "on" : "locked"), 80);
    }
  }

  if (status === "done") return null;
  if (status === "pending") return <div className="intro-cover" aria-hidden="true" />;

  const skip = () => {
    if (skipRef.current) skipRef.current();
    else {
      try {
        sessionStorage.setItem(SEEN, "1");
      } catch (e) {}
      setStatus("done");
    }
  };

  const soundLabel = audio === "on" ? "🔊 Sound on" : audio === "muted" ? "🔇 Sound off" : "🔈 Tap for sound";

  return (
    <div
      className={`cinematic-intro intro-${phase} ${gl && status === "play" ? "has-gl" : "no-gl"}`}
      role="dialog"
      aria-label="A squared presents AYneetPYQ Plus"
    >
      {gl && status === "play" ? (
        <canvas ref={canvasRef} className="intro-canvas" aria-hidden="true" />
      ) : (
        <>
          <div className="space-stars" />
          <div className="space-nebula" />
          <div className="earth-horizon"><span className="earth-glow" /></div>
          <div className="meteor"><i /><b /><em>A<sup>²</sup></em></div>
          <div className="impact-ring" />
        </>
      )}

      <div className="hud" aria-hidden="true">
        <div className="hud-panel" ref={panelRef}>
          <p className="hud-flag"><i /><b ref={flagRef}>TRAJECTORY LOCKED</b></p>
          <dl>
            <div><dt>OBJECT</dt><dd>A²</dd></div>
            <div><dt>TARGET</dt><dd>EARTH</dd></div>
            <div><dt>RANGE</dt><dd ref={rangeRef}>384,400 km</dd></div>
            <div><dt>T–MINUS</dt><dd ref={etaRef}>00:05.60</dd></div>
          </dl>
        </div>
        <div className="hud-ret" ref={retRef}>
          <div className="hud-ret-in"><i /><i /><i /><i /></div>
        </div>
      </div>

      <div className="intro-brand">
        <div className="intro-seal">
          <svg className="seal-ring" viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              <linearGradient id="sealGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff1c0" />
                <stop offset=".5" stopColor="#c9972f" />
                <stop offset="1" stopColor="#f5dc92" />
              </linearGradient>
            </defs>
            <circle className="seal-c1" cx="100" cy="100" r="94" />
            <path className="seal-ticks" d="M100 0v12M100 188v12M0 100h12M188 100h12" />
          </svg>
          <div className="intro-emblem">A<sup>²</sup></div>
        </div>
        <p className="intro-presents"><i /><span>A² PRESENTS</span><i /></p>
        <h1 aria-label="AYneetPYQ+">
          <span className="w1">
            {"AYneet".split("").map((ch, i) => (
              <span key={i} className="ch" style={{ "--i": i }} aria-hidden="true">{ch}</span>
            ))}
          </span>
          <span className="w2">
            {"PYQ".split("").map((ch, i) => (
              <span key={i} className="ch" style={{ "--i": i + 6 }} aria-hidden="true">{ch}</span>
            ))}
            <span className="ch plus" style={{ "--i": 9 }} aria-hidden="true">+</span>
          </span>
        </h1>
        <div className="intro-rule"><b /></div>
        <p className="intro-tagline">DREAM. PREPARE. EXCEL.</p>
      </div>

      <div className="intro-frame" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="intro-meta" aria-hidden="true"><span>NEET UG 2027</span><span>PYQ 2019 — 2026</span></div>
      <div className="intro-bar top" aria-hidden="true" />
      <div className="intro-bar bottom" aria-hidden="true" />

      {status === "play" && (
        <button className="intro-sound" onClick={toggleSound} aria-label="Toggle intro sound">
          {soundLabel}
        </button>
      )}
      <button className="intro-skip" onClick={skip}>Skip intro <span>↗</span></button>
    </div>
  );
}
