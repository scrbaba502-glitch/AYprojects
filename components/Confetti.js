"use client";
import { useEffect, useRef } from "react";

export default function Confetti() {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();

    const colors = ["#22c58b", "#4f8cff", "#fbbf24", "#ff5d8f", "#a78bfa", "#22d3ee"];
    const ps = Array.from({ length: 170 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height * 0.6,
      r: 5 + Math.random() * 7,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let raf;
    const start = performance.now();
    const tick = (t) => {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      if (t - start < 4500) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, c.width, c.height);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="confetti" />;
}
