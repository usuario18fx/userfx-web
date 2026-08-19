import type { ReactNode } from "react";

/** Cinta continua con datos de la bóveda. */
export default function Ticker({ items }: { items: string[] }) {
  const row = (hidden: boolean): ReactNode => (
    <div
      className="flex shrink-0 items-center"
      aria-hidden={hidden || undefined}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-5 font-mono text-[11px] tracking-[0.24em] text-dim">
            {item}
          </span>
          <span className="text-gold">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="marquee overflow-hidden border-y border-line bg-ink2/70 py-2.5">
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
