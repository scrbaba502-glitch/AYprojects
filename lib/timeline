
// Single source of truth for the cinematic intro timing (seconds).
// Used by the WebGL scene, the sound engine and the React overlay so they always stay in sync.
//
// The intro has three parts:
//   1. ARRIVAL  (0 → impact)       all focus on A² — a golden A² is thrown from deep space toward Earth
//   2. IMPACT   (impact → reveal)  all focus on the explosion and the Earth
//   3. REVEAL   (reveal → exit)    "A² presents AYneetPYQ+" appears (the explosion has had its full moment)
export const TL = {
  flight: 0.6,   // A² appears as a faint glint, ~450 units away
  impact: 6.2,   // A² hits Earth
  reveal: 9.0,   // "A² presents AYneetPYQ+" appears (the explosion has had its full moment)
  exit: 13.0,    // overlay starts fading out
  end: 13.9,     // overlay removed
};

export function phaseAt(t) {
  if (t < TL.flight) return "void";
  if (t < TL.impact) return "arrival";
  if (t < TL.reveal) return "impact";
  if (t < TL.exit) return "reveal";
  return "exit";
}
