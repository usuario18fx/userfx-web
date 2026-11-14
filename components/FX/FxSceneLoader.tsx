"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { FX } from "@/lib/assets";

const FxIntroModel = dynamic(() => import("./FxIntroModel"), { ssr: false });

type Props = {
  onComplete: () => void;
};

const INTRO_DURATION_MS = 4200;
const FINAL_HOLD_MS = 520;

export default function FxSceneLoader({ onComplete }: Props) {
  const [percent, setPercent] = useState(1);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    const timer = window.setTimeout(() => setModelStatus((status) => status === "loading" ? "fallback" : status), 7000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (modelStatus === "loading") return;
    let frame = 0;
    let finishTimer: number | null = null;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = Math.min(1, (now - start) / INTRO_DURATION_MS);
      const next = Math.min(100, Math.max(1, Math.round(1 + elapsed * 99)));
      setPercent((current) => current === next ? current : next);
      if (elapsed < 1) {
        frame = window.requestAnimationFrame(animate);
      } else {
        finishTimer = window.setTimeout(() => completeRef.current(), FINAL_HOLD_MS);
      }
    };
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
      if (finishTimer !== null) window.clearTimeout(finishTimer);
    };
  }, [modelStatus]);

  const edgeOpacity = Math.min(0.94, percent / 20) * (1 - Math.max(0, percent - 30) / 100);
  const fillProgress = Math.max(0, Math.min(1, (percent - 20) / 60));
  const crownProgress = Math.max(0, Math.min(1, (percent - 80) / 20));
  const crownOpacity = Math.min(1, crownProgress * 5);
  const glow = Math.max(0, Math.min(1, (percent - 98) / 2));

  return (
    <div className="fx-scene-loader" role="status" aria-label="USER FX opening sequence">
      <svg className="fx-scene-loader-filter" aria-hidden="true" focusable="false">
        <defs>
          <filter id="fx-scene-loader-edge-filter" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="expanded" />
            <feComposite in="expanded" in2="SourceAlpha" operator="out" result="outline" />
            <feFlood floodColor="#3fd8d0" floodOpacity="0.92" result="tint" />
            <feComposite in="tint" in2="outline" operator="in" />
          </filter>
        </defs>
      </svg>
      <div className={`fx-scene-loader-mark${modelStatus === "fallback" ? " is-fallback" : ""}`} style={{ "--fx-scene-glow": glow } as CSSProperties}>
        <FxIntroModel percent={percent} onReady={() => setModelStatus((status) => status === "loading" ? "ready" : status)} onError={() => setModelStatus((status) => status === "loading" ? "fallback" : status)} />
        {modelStatus === "fallback" && (
          <div className="fx-scene-loader-fallback">
            <img src={FX.logo} alt="" className="fx-scene-loader-mark-edge" style={{ opacity: edgeOpacity }} draggable={false} />
            <img src={FX.logo} alt="USER FX" className="fx-scene-loader-mark-fill" style={{ clipPath: `circle(${Math.round(115 * fillProgress)}% at 50% 50%)` }} draggable={false} />
          </div>
        )}
        <img src={FX.vip} alt="" className="fx-scene-loader-crown" style={{ opacity: crownOpacity, transform: `perspective(450px) rotateY(${Math.round(crownProgress * 360)}deg)` }} draggable={false} />
      </div>
      <span className="fx-scene-loader-label">
        USER FX · ENTERING THE ROOM
      </span>
      <div className="fx-scene-loader-progress" role="progressbar" aria-label="USER FX introduction" aria-valuemin={1} aria-valuemax={100} aria-valuenow={percent}>
        <span className="fx-scene-loader-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="fx-scene-loader-percent">
        {String(percent).padStart(2, "0")}%
      </span>
    </div>
  );
}
