import React, { useState } from "react";
import "./VaultHeroDoors.css";

const LOCK_VIDEO = "/assets/FX-Y24V01.mp4";
type VaultHeroDoorsProps = { unlocked?: boolean;
         };
export default function VaultHeroDoors({ unlocked = false,
         }: VaultHeroDoorsProps) {
   const [manualOpen, setManualOpen] = useState(false);
   const open = unlocked || manualOpen;
  return (
        <div className={`vhd-root${manualOpen ? " is-open" : ""}`}>
        <div className="vhd-doors">
        <div className="vhd-videoStage">
        <video src={LOCK_VIDEO} className="vhd-doorVideo" autoPlay muted loop playsInline preload="auto"/>
        </div>
        {/* PUERTA IZQUIERDA */}
        <button type="button" className="vhd-door left" onClick={() => setManualOpen((open) => !open)} aria-label={manualOpen ? "Close vault doors" : "Open vault doors"}>
        <div className="vhd-door-inner">
        <span>
          USER FX
        </span>
        <i />
        </div>
        </button>
        {/* PUERTA DERECHA */}
        <button type="button" className="vhd-door right" onClick={() => setManualOpen((open) => !open)} aria-label={manualOpen ? "Close vault doors" : "Open vault doors"}>
        <div className="vhd-door-inner">
        <span>
          PRIVATE
        </span>
        <i />
        </div>
        </button>
        </div>
        </div>
  );
}
