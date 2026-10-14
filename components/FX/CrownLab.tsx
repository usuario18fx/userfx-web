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
  const [hasSeparateFx, setHasSeparateFx] = useState(true);
  const [hasRose, setHasRose] = useState(true);
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
          style={{ "--fx-tilt-x": tilt.x + "deg", "--fx-tilt-y": tilt.y + "deg" } as React.CSSProperties}
        >
          <div className="fx-crown-lab-halo" />
          <div className="fx-crown-lab-grid" />
          <div className="fx-crown-lab-shadow" />
          <div className="fx-crown-lab-object">
            {hasSeparateFx && hasRose ? (
              <>
                <img className="fx-crown-lab-emblem" src="/fxIcon.png" alt="Blue FX logo" draggable={false} onError={() => setHasSeparateFx(false)} />
                <img className="fx-crown-lab-rose" src="/iconRosa.png" alt="Red rose" draggable={false} onError={() => setHasRose(false)} />
              </>
            ) : (
              <img className="fx-crown-lab-emblem" src="/iconFoot.png" alt="FX logo with rose" draggable={false} />
            )}
            {available && (
              <img className="fx-crown-lab-crown" src="/iconCorona.png" alt="Floating FX crown" draggable={false}
                onError={() => setAvailable(false)} />
            )}
            <div className="fx-crown-lab-glint" aria-hidden="true" />
          </div>
          <span className="fx-crown-lab-caption">{stage.toUpperCase()} / INTERACTIVE STUDY</span>
        </section>
      </div>
      <footer className="fx-crown-lab-bottom"><span>PROTOTYPE · NO CHANGES TO LIVE WEBSITE</span><span>USER FX © 2026</span></footer>
    </main>
  );
}
