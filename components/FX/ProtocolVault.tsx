"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRef } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import "./ProtocolVault.css";

export type VaultStep = {
  title: string;
  text: ReactNode;
  cta: string;
  href: string;
  external?: boolean;
};

type Props = {
  id?: string;            // "protocol" (lo usa useActiveSection)
  eyebrowIndex?: string;  // "02"
  eyebrow: string;        // "ACCESS PROTOCOL"
  title: ReactNode;       // "HOW TO UNLOCK THE VAULT."
  intro: ReactNode;       // "Start in Telegram. Choose your code..."
  steps: VaultStep[];
  children?: ReactNode;   // p. ej. el adorno plateado, fijo bajo el texto
};

const STEP = 32; // grados entre tarjetas del tambor

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 900px)");
    const read = () => setMobile(q.matches);
    read();
    q.addEventListener("change", read);
    return () => q.removeEventListener("change", read);
  }, []);
  return mobile;
}

function Card({ step, n, flat }: { step: VaultStep; n: number; flat?: boolean }) {
  return (
    <>
      <div className="pv-card-head">
        <span className="pv-card-num">
{String(n).padStart(2, "0")}
</span>
        <span className="pv-card-rule" aria-hidden="true" />
      </div>
      <h3 className="pv-card-title">
{step.title}
</h3>
      <p className="pv-card-text">
{step.text}
</p>
      <a className="pv-card-cta" href={step.href} tabIndex={flat ? 0 : undefined} {...(step.external ? { target: "_blank", rel: "noreferrer" } : {})} >
        <span>
{step.cta}
</span>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </a>
    </>
  );
}

/* Un paso del tambor: se coloca a i*STEP grados y se desvanece al alejarse */
function Slot({
  step, i, active, isActive, h, radius,
}: {
  step: VaultStep; i: number; active: MotionValue<number>;
  isActive: boolean; h: number; radius: number;
}) {
  const opacity = useTransform(active, (v) => Math.max(0.07, 1 - Math.abs(v - i) * 0.62));
  return (
    <div
      className="pv-slot"
      style={{
        height: h,
        marginTop: -h / 2,
        transform: `rotateX(${-i * STEP}deg) translateZ(${radius}px)`,
      }}
    >
      <motion.article
        className={"pv-card" + (isActive ? " is-active" : "")}
        style={{ opacity }}
        aria-hidden={!isActive}
        // inert evita que se pueda tabular a las tarjetas que no están al frente
        {...(!isActive ? ({ inert: "" } as object) : {})}
      >
        <Card step={step} n={i + 1} />
      </motion.article>
    </div>
  );
}

/* Disco de combinación detrás del tambor: gira junto con el scroll */
function Dial({ active }: { active: MotionValue<number> }) {
  const rotate = useTransform(active, (v) => -v * 72);
  const ticks = Array.from({ length: 60 }, (_, k) => k);
  return (
    <div className="pv-dial" aria-hidden="true">
      <motion.svg viewBox="-200 -200 400 400" style={{ rotate }}>
        <circle r="190" className="pv-dial-ring" />
        <circle r="128" className="pv-dial-ring pv-dial-ring--inner" />
        {ticks.map((k) => {
          const major = k % 5 === 0;
          return (
            <line
              key={k}
              x1="0" x2="0"
              y1={-190} y2={major ? -170 : -180}
              className={major ? "pv-dial-tick pv-dial-tick--major" : "pv-dial-tick"}
              transform={`rotate(${k * 6})`}
            />
          );
        })}
        {Array.from({ length: 12 }, (_, k) => (
          <text
            key={k}
            x="0" y="-146"
            textAnchor="middle"
            className="pv-dial-num"
            transform={`rotate(${k * 30})`}
          >
            {k}
          </text>
        ))}
      </motion.svg>
      <span className="pv-dial-pointer" />
    </div>
  );
}

export default function ProtocolVault({
  id = "protocol",
  eyebrowIndex = "02",
  eyebrow,
  title,
  intro,
  steps,
  children,
}: Props) {
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const wrap = useRef<HTMLElement>(null);
  const n = steps.length;

  const h = mobile ? 300 : 400;
  const radius = Math.round(h / 2 / Math.tan((STEP / 2) * (Math.PI / 180)));

  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.4 });
  const active = useTransform(smooth, [0, 1], [0, n - 1]);        // 0 … n-1 (continuo)
  const drum = useTransform(smooth, [0, 1], [0, (n - 1) * STEP]);  // grados del tambor

  const [idx, setIdx] = useState(0);
  useMotionValueEvent(active, "change", (v) => setIdx(Math.round(v)));

  const head = (
    <div className="pv-left">
      <p className="pv-eyebrow">
        <b>
{eyebrowIndex}
</b>
        <i aria-hidden="true" />
        <span>
{eyebrow}
</span>
      </p>
      <h2 className="pv-title">
{title}
</h2>
      <p className="pv-intro">
{intro}
</p>
      {!reduced && (
        <p className="pv-counter" aria-live="polite">
          <b>
{String(idx + 1).padStart(2, "0")}
</b> / {String(n).padStart(2, "0")}
        </p>
      )}
      {children ? <div className="pv-extra">
{children}
</div> : null}
    </div>
  );

  /* Sin animación: lista normal */
  if (reduced) {
    return (
      <section id={id} className="pv pv--flat">
        <div className="pv-stage">
          {head}
          <div className="pv-flat-list">
            {steps.map((s, i) => (
              <article key={i} className="pv-card is-active">
                <Card step={s} n={i + 1} flat />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      ref={wrap}
      className="pv"
      style={{ height: `calc(100svh + ${(n - 1) * 70}svh)` }}
    >
      <div className="pv-stage">
        {head}
        <div className="pv-right">
          <Dial active={active} />
          <span className="pv-pointer" aria-hidden="true" />
          <div className="pv-viewport">
            <motion.div className="pv-drum" style={{ rotateX: drum, z: -radius }}>
              {steps.map((s, i) => (
                <Slot key={i} step={s} i={i} active={active} isActive={i === idx} h={h} radius={radius} />
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}