"use client";

import { useEffect, useState } from "react";

/** Barra superior tipo HUD: marca, reloj UTC en vivo y estado de la bóveda. */
export default function Hud() {
  const [clock, setClock] = useState("--:--:--");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);

    const refresh = () =>
      fetch("/api/session")
        .then((r) => r.json())
        .then((d: { unlocked?: boolean }) => setUnlocked(Boolean(d.unlocked)))
        .catch(() => {});
    refresh();
    const onUnlocked = () => setUnlocked(true);
    window.addEventListener("vault:unlocked", onUnlocked);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("vault:unlocked", onUnlocked);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-5">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="dot-live h-2 w-2 rounded-full bg-rose shadow-[0_0_10px_rgba(192,69,90,0.9)]" />
          <span className="font-mono text-[11px] tracking-[0.28em] text-bone/80">
            Ŧχ🜲 — BÓVEDA PRIVADA
          </span>
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[11px] tracking-[0.2em] text-dim sm:block tabular">
            {clock} UTC
          </span>
          <span
            className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] tracking-[0.22em] transition-colors duration-500 ${
              unlocked
                ? "border-gold/50 bg-gold/10 text-goldhi"
                : "border-rose/40 bg-rose/10 text-rosehi"
            }`}
          >
            {unlocked ? "✦ UNLOCKED" : "🜲 LOCKED"}
          </span>
        </div>
      </div>
    </header>
  );
}
