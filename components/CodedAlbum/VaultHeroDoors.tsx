import React, { useEffect, useState } from "react";
import "./VaultHeroDoors.css";

const LOCK_VIDEO = "/assets/FX-Y24V01.mp4";
const PREVIEW_INSIDE = "/assets/album/PRVW/PRVW-01.jpg";
const DOOR_RIGHT = "/public/doorRight.avif";
const DOOR_LEFT =  "/public/doorLeft.png"; 

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  loading?: boolean;
  error?: string;
  unlocked?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onUnlock?: () => void;
};

export default function VaultHeroDoors({
  value = "",
  onChange = () => {},
  onSubmit = (e) => e.preventDefault(),
  loading = false,
  error = "",
  unlocked = false,
  placeholder = "PRX0-CODE",
  inputRef,
  onUnlock,
}: Props) {
  const [open, setOpen] = useState(false);
  const typing = value.length > 0;
  const isVideo = PREVIEW_INSIDE.endsWith(".mp4") || PREVIEW_INSIDE.endsWith(".webm");

  useEffect(() => {
    if (unlocked) {
      setOpen(true);
      const t = setTimeout(() => onUnlock?.(), 1200);
      return () => clearTimeout(t);
    }
  }, [unlocked, onUnlock]);

  return (
         <div className={`vhd-root${open ? " is-open" : ""}${typing ? " is-typing" : ""}`}>
         <div className="vhd-bg" style={{ backgroundImage: `url(${PREVIEW_INSIDE})` }} />
         <div className="vhd-damask" />
{/* LOGO IZQUIERDA */}
        <div className="vhd-logoSide">
        <div className="vhd-logoGlow" />
        <video src={LOCK_VIDEO} className="vhd-logo" autoPlay muted loop playsInline preload="auto" aria-label="USER FX" />
        <p className="vhd-logoSub">PRIVATE VAULT • TORONTO 2026</p>
        </div>
{/* PUERTAS DERECHA */}
        <div className="vhd-doors">
        <figure className="vhd-reveal">
          {isVideo ? (
        <video src={PREVIEW_INSIDE} autoPlay muted loop playsInline />
          ) : (
        <img src={PREVIEW_INSIDE} alt="" draggable={false} />
          )}
        <figcaption>
          PRIVATE VAULT • TORONTO 2026 • {PREVIEW_INSIDE.split("/").pop()}</figcaption>
        </figure>
        <div className="vhd-door left" onClick={() => setOpen((v) => !v)}>
        <div className="vhd-door-inner"><span>
          USER FX</span><i /></div>
        </div>
        <div className="vhd-door right" onClick={() => setOpen((v) => !v)}>
        <div className="vhd-door-inner"><span>
          PRIVATE</span><i /></div>
        </div>
{/* INPUT — hijo de .vhd-doors: el absolute se ancla al panel derecho */}
        <form className={`vhd-form${error ? " is-error" : ""}`} onSubmit={onSubmit} onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="vhd-input" type="text"  value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" autoCapitalize="characters" maxLength={9} disabled={loading} aria-label="Access code"  />
        <button className="vhd-go" type="submit" disabled={loading} aria-label="Entrar">
         {loading ? "…" : "→"}
        </button>
        </form>
        </div>
        </div>
        );
        }