import React, { useState } from "react";
import "./VaultHeroDoors.css";

const LOCK_VIDEO = "/assets/FX-Y24V01.mp4";

type VaultHeroDoorsProps = {
  unlocked?: boolean;
};

export default function VaultHeroDoors({
  unlocked = false,
}: VaultHeroDoorsProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`vhd-root${open ? " is-open" : ""}`}>
      <div className="vhd-doors">
        <div className="vhd-videoStage">
          <video
            src={LOCK_VIDEO}
            className="vhd-doorVideo"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"/>
        </div> 
        <button
          type="button"
          className="vhd-door left"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open left vault door">
            <div className="vhd-door-inner">
            <span>
                  USER FX
            </span>
            <i />
            </div> 
        </button> 
        <button
          type="button"
          className="vhd-door right"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open right vault door">
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