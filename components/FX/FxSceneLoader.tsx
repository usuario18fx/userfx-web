"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onComplete: () => void;
};

const INTRO_DURATION_MS = 4200;
const FINAL_HOLD_MS = 520;

export default function FxSceneLoader({ onComplete }: Props) {
  const [percent, setPercent] = useState(1);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    let frame = 0;
    let finishTimer: number | null = null;
    let fallbackTimer: number | null = null;
    let completed = false;
    const start = performance.now();

    const finish = () => {
      if (completed) return;
      completed = true;
      setPercent(100);
      completeRef.current();
    };

    const animate = (now: number) => {
      if (completed) return;
      const elapsed = Math.min(1, (now - start) / INTRO_DURATION_MS);
      setPercent(Math.min(100, Math.max(1, Math.round(1 + elapsed * 99))));

      if (elapsed < 1) {
        frame = window.requestAnimationFrame(animate);
      } else {
        finishTimer = window.setTimeout(finish, FINAL_HOLD_MS);
      }
    };

    frame = window.requestAnimationFrame(animate);
    fallbackTimer = window.setTimeout(finish, INTRO_DURATION_MS + FINAL_HOLD_MS + 2500);

    return () => {
      completed = true;
      window.cancelAnimationFrame(frame);
      if (finishTimer !== null) window.clearTimeout(finishTimer);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div className="fx-scene-loader" role="status" aria-label="USER FX loading screen">
      <div className="fx-scene-loader-content">
        <h1 className="fx-scene-loader-brand" aria-label="USER FX">
          <span className="fx-scene-loader-brand-user">
            USER
          </span>
          <span className="fx-scene-loader-brand-fx">
            FX
          </span>
        </h1>
        <div className="fx-scene-loader-subtitle">
          <span>
            LOADING
          </span>
        </div>
        <div className="fx-scene-loader-progress-row">
          <div className="fx-scene-loader-progress" role="progressbar" aria-label="USER FX opening sequence" aria-valuemin={1} aria-valuemax={100} aria-valuenow={percent}>
            <span className="fx-scene-loader-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <output className="fx-scene-loader-percent" aria-live="off">
            {String(percent).padStart(2, "0")}%
          </output>
        </div>
      </div>
    </div>
  );
}
