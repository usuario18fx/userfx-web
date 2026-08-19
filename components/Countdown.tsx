"use client";

import { useEffect, useState } from "react";

/** Cuenta regresiva en vivo hasta el próximo drop (viernes 22:00 UTC). */
function nextDropDate(): Date {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0),
  );
  let add = (5 - d.getUTCDay() + 7) % 7; // 5 = viernes
  if (add === 0 && d.getTime() <= now.getTime()) add = 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d;
}

export default function Countdown({ className = "" }: { className?: string }) {
  const [left, setLeft] = useState("· · ·");

  useEffect(() => {
    const target = nextDropDate().getTime();
    const tick = () => {
      const ms = Math.max(0, target - Date.now());
      const dd = Math.floor(ms / 86_400_000);
      const hh = Math.floor((ms / 3_600_000) % 24);
      const mm = Math.floor((ms / 60_000) % 60);
      const ss = Math.floor((ms / 1000) % 60);
      const p = (n: number) => String(n).padStart(2, "0");
      setLeft(`${dd}d ${p(hh)}:${p(mm)}:${p(ss)}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className={`tabular font-mono ${className}`}>{left}</span>;
}
