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
      <div className="vhd-damask" />
{/* ═════════════ PUERTAS DERECHA ═════════════ */}
      <div className="vhd-doors">
{/* ═════════════ PUERTA IZQUIERDA ═════════════ */}
      <div className="vhd-door left" onClick={() => setOpen((v) => !v)}>
      <div className="vhd-door-inner">
      <span>
       USER FX
      </span>
      <i />
      </div>
      </div>
{/* ═════════════ PUERTA DERECHA ═════════════ */}
      <div className="vhd-door right" onClick={() => setOpen((v) => !v)}>
      <div className="vhd-door-inner">
       <span>
        PRIVATE
       </span>
       <i /> 
       </div>
       </div>
       </div>
       </div>
       ); 
        }