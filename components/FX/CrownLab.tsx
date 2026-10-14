"use client";

import { useState, type PointerEvent } from "react";
import "./CrownLab.css";

type Stage = "signature" | "crystal" | "virtual";
const stages: { id: Stage; title: string; description: string }[] = [
  { id: "signature", title: "01 / Signature", description: "The original FX crown, suspended above the rose." },
  { id: "crystal", title: "02 / Refraction", description: "A prism-inspired crown with light, reflection and depth." },
  { id: "virtual", title: "03 / Virtual Room", description: "The emblem as a centerpiece in the future MYROOM." },
];

export default function CrownLab() {
  const [stage, setStage] = useState<Stage>("signature");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [available, setAvailable] = useState(true);
  const [missingAssets, setMissingAssets] = useState<string[]>([]);
  const markMissing = (name: string) => setMissingAssets((current) => current.includes(name) ? current : [...current, name]);
  const onMove = (event: PointerEvent<HTMLElement>) => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - rect.top) / rect.height - 0.5) * -18,
      y: ((event.clientX - rect.left) / rect.width - 0.5) * 26,
    });
  };
  const reset = () => { setTilt({ x: 0, y: 0 }); setDragging(false); };
  return (
    <main className={"fx-crown-lab fx-crown-lab--" + stage}>
      <header className="fx-crown-lab-header">
        <a href="/" aria-label="Return to USER FX">USER FX</a>
        <span>EXPERIMENTAL / CROWN STUDIES</span>
        <a href="/">RETURN TO SITE ↗</a>
      </header>
      <div className="fx-crown-lab-layout">
        <section className="fx-crown-lab-copy">
          <p className="fx-crown-lab-eyebrow">PRIVATE VAULT / DESIGN LAB</p>
          <h1>THE CROWN <em>IN MOTION.</em></h1>
          <p>Three visual studies for the next generation of USER FX. Move your pointer over the emblem to explore its depth.</p>
          <nav aria-label="Crown visual studies" className="fx-crown-lab-options">
            {stages.map((item) => (
              <button type="button" key={item.id} aria-pressed={stage === item.id} onClick={() => { setStage(item.id); reset(); }}>
                <strong>{item.title}</strong><small>{item.description}</small>
              </button>
            ))}
          </nav>
        </section>
        <section
          className={"fx-crown-lab-stage" + (dragging ? " is-active" : "")}
          aria-label="Interactive FX crown preview"
          onPointerMove={onMove}
          onPointerEnter={() => setDragging(true)}
          onPointerLeave={reset}
          style={{ "--pointer-x": tilt.y / 26, "--pointer-y": -tilt.x / 18 } as React.CSSProperties}
        >
          <div className="fx-crown-lab-halo" />
          <div className="fx-crown-lab-grid" />
          <div className="fx-crown-lab-shadow" />
          <div className="fx-crown-layers">
            <div className="fx-layer fx-layer-f"><img src="/iconF.png" alt="Blue metallic letter F" draggable={false} onError={() => markMissing("iconF.png")} /></div>
            <div className="fx-layer fx-layer-x"><img src="/iconX.png" alt="Blue metallic letter X" draggable={false} onError={() => markMissing("iconX.png")} /></div>
            <div className="fx-layer fx-layer-rose"><div className="fx-layer-rose-motion"><img src="/iconRosa.png" alt="Red rose" draggable={false} onError={() => markMissing("iconRosa.png")} /></div></div>
            {available && <div className="fx-layer fx-layer-crown"><div className="fx-layer-crown-motion"><img src="/iconCorona.png" alt="Blue crown" draggable={false} onError={() => { setAvailable(false); markMissing("iconCorona.png"); }} /></div></div>}
          </div>
          <span className="fx-crown-lab-caption">{stage.toUpperCase()} / INTERACTIVE STUDY</span>
        </section>
      </div>
      {missingAssets.length > 0 && <p role="alert" className="fx-crown-lab-warning">Missing assets in /public: {missingAssets.join(", ")}</p>}
      <footer className="fx-crown-lab-bottom"><span>PROTOTYPE · NO CHANGES TO LIVE WEBSITE</span><span>USER FX © 2026</span></footer>
    </main>
  );
}
