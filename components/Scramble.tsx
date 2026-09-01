"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/client";

const GLYPHS = "█▓▒░/<>\\|=+*#Ŧχ01FX";

export default function Scramble({
  text,
  className = "",
  delay = 0,
  hover = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  hover?: boolean;
}) {
  const [out, setOut] = useState(text);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  function runScramble(customDelay = 0) {
    if (prefersReducedMotion()) {
      setOut(text);
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    if (startRef.current) {
      window.clearTimeout(startRef.current);
    }

    const total = 24;
    let frame = 0;

    startRef.current = window.setTimeout(() => {

      const tick = () => {
        frame += 1;

        const settled = Math.floor(
          (frame / total) * text.length
        );

        let s = "";

        for (let i = 0; i < text.length; i++) {
          const ch = text[i];

          if (ch === " " || ch === "\n") {
            s += ch;
            continue;
          }

          s += i < settled
            ? ch
            : GLYPHS[
                Math.floor(
                  Math.random() * GLYPHS.length
                )
              ];
        }

        setOut(s);

        if (frame < total) {
          timerRef.current = window.setTimeout(
            tick,
            42
          );
        } else {
          setOut(text);
        }
      };

      tick();

    }, customDelay);
  }

  useEffect(() => {
    runScramble(delay);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      if (startRef.current) {
        window.clearTimeout(startRef.current);
      }
    };
  }, [text, delay]);

  return (
    <span
      className={className}
      aria-label={text}
      onMouseEnter={
        hover
          ? () => runScramble(0)
          : undefined
      }
      onFocus={
        hover
          ? () => runScramble(0)
          : undefined
      }
    >
      {out}
    </span>
  );
}