
"use client";

import { useState } from "react";

export default function ReplayIntro() {
  const [showReplay, setShowReplay] = useState(false);

  const handleReplay = () => {
    window.dispatchEvent(new Event("ayneetpyq:replay-intro"));
    setShowReplay(false);
  };

  if (typeof window === "undefined") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowReplay(true)}
        className="replay-intro-button"
        aria-label="Replay cinematic introduction"
      >
        ↻ Replay Intro
      </button>

      {showReplay && (
        <div className="replay-intro-overlay">
          <div className="replay-intro-dialog">
            <p>Experience the journey again?</p>

            <div className="replay-intro-actions">
              <button type="button" onClick={handleReplay}>
                Replay
              </button>

              <button
                type="button"
                onClick={() => setShowReplay(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .replay-intro-button {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 999;
          padding: 10px 18px;
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 30px;
          background: rgba(10,15,30,.8);
          color: white;
          cursor: pointer;
        }

        .replay-intro-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: grid;
          place-items: center;
          background: rgba(0,0,0,.75);
        }

        .replay-intro-dialog {
          padding: 30px;
          border-radius: 16px;
          background: #101827;
          color: white;
          text-align: center;
        }

        .replay-intro-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .replay-intro-actions button {
          padding: 10px 18px;
          border: 0;
          border-radius: 8px;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
