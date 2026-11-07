"use client";
import { useEffect, useState } from "react";
import Ring from "./Ring";
import { loadProgress, levelInfo } from "../lib/progress";

export default function Dashboard() {
  const [p, setP] = useState(null);

  useEffect(() => {
    setP(loadProgress());
  }, []);

  if (!p) return <div className="glass dash skeleton" />;

  const lv = levelInfo(p.xp);
  const taken = p.attempts.length;
  const best = taken
    ? Math.max(...p.attempts.map((a) => Math.max(0, Math.round((a.score / a.total) * 100))))
    : 0;

  return (
    <div className="dashwrap">
      <div className="glass dash">
        <Ring value={lv.progress} size={120} stroke={9} label={<><small>LVL</small><b>{lv.level}</b></>} />
        <div className="dinfo">
          <p className="eyebrow">Your rank</p>
          <h3 className="grad">{lv.title}</h3>
          <p className="muted small">{p.xp} XP · {lv.toNext} XP to next level</p>
        </div>
      </div>

      <div className="glass kpi"><span className="kicon">🔥</span><b>{p.streak}</b><small>Day streak</small></div>
      <div className="glass kpi"><span className="kicon">📝</span><b>{taken}</b><small>Tests taken</small></div>
      <div className="glass kpi"><span className="kicon">🎯</span><b>{best}%</b><small>Best score</small></div>

      <div className="glass recent">
        <p className="eyebrow">Recent attempts</p>
        {taken === 0 ? (
          <p className="muted">Take your first test to start your streak and earn XP.</p>
        ) : (
          p.attempts.slice(0, 5).map((a, i) => (
            <div className="rrow" key={i}>
              <span>{a.title}</span>
              <b>{a.score}/{a.total}</b>
              <span className="muted small">{new Date(a.date).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
