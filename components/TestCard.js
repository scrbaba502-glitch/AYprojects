"use client";
import Link from "next/link";

export default function TestCard({ test, count, icon, accent }) {
  function onMove(e) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--rx", `${(y / r.height - 0.5) * -8}deg`);
    el.style.setProperty("--ry", `${(x / r.width - 0.5) * 8}deg`);
  }
  function onLeave(e) {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <Link
      href={`/test/${test.id}`}
      className="tcard"
      style={{ "--accent": accent }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="ticon">{icon}</div>
      <span className="chip">{test.type}</span>
      <h3>{test.title}</h3>
      <p className="muted">{test.subjects.join(" · ")}</p>
      <div className="tmeta">
        <span><b>{count}</b> Qs</span>
        <span><b>{test.minutes}</b> min</span>
        <span><b>{count * 4}</b> marks</span>
      </div>
      <span className="go">Start →</span>
    </Link>
  );
}
