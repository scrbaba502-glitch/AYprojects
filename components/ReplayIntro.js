"use client";

export default function ReplayIntro() {
  return (
    <button
      className="replay"
      onClick={() => {
        try {
          sessionStorage.removeItem("a2-intro-seen");
        } catch (e) {}
        window.scrollTo(0, 0);
        window.location.reload();
      }}
    >
      ▶ Replay intro
    </button>
  );
}
