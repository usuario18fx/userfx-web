"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/client";

const GLYPHS = "█▓▒░/<>\\|=+*#Ŧχ01FX";

/** Título que se "decodifica" carácter a carácter al montar. */
export default function Scramble({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const [out, setOut] = useState(text);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || prefersReducedMotion()) return;
    ran.current = true;

    const total = 24;
    let frame = 0;
    let timer = 0;

    const start = window.setTimeout(() => {
      const tick = () => {
        frame += 1;
        const settled = Math.floor((frame / total) * text.length);
        let s = "";
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === " " || ch === "\n") {
            s += ch;
            continue;
          }
          s += i < settled ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        setOut(s);
        if (frame < total) {
          timer = window.setTimeout(tick, 42);
        } else {
          setOut(text);
        }
      };
      tick();
    }, delay);

    return () => {
      window.clearTimeout(start);
      window.clearTimeout(timer);
    };
  }, [text, delay]);

  return (
    <span className={className} aria-label={text}>
      {out}
    </span>
  );
}
