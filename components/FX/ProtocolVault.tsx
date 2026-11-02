"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import ProtocolCrown from "./ProtocolCrown";
import "./Protocolvault.css";

export type VaultStep = {
  title: string;
  text: ReactNode;
  cta: string;
  href: string;
  external?: boolean;
};

export type VaultQuad = {
  src: string;
  kind: "video" | "image";
  label: string;        // título (ej. "VIDEO CALLS")
  sub?: string;         // subtítulo (ej. "MyRoom · your private space")
  position?: string;    // object-position de la foto / video
  icon?: ReactNode;
};

type Props = {
  id?: string;
  eyebrowIndex?: string;
  eyebrow: string;
  title: ReactNode;
  intro: ReactNode;
  steps: VaultStep[];
  /** 4 cuadrantes: arriba-izq, arriba-der, abajo-izq, abajo-der */
  quads: VaultQuad[];
  crownSrc?: string;
};

const STEP = 32; // grados entre tarjetas del tambor

/* Duración de cada fase, en alturas de pantalla de scroll */
const STEP_SVH = 70;
const DISSOLVE_SVH = 55;
const QUAD_SVH = 50;

/* Cada cuadrante se abre desde su propia esquina */
const CORNER_CLIP = [
  "inset(0% 100% 100% 0%)", // arriba izquierda
  "inset(0% 0% 100% 100%)", // arriba derecha
  "inset(100% 100% 0% 0%)", // abajo izquierda
  "inset(100% 0% 0% 100%)", // abajo derecha
];
const OPEN_CLIP = "inset(0% 0% 0% 0%)";

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

/* ---------- Tarjetas del tambor ---------- */
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

function Slot({
  step, i, active, isActive, h, radius,
}: {
  step: VaultStep; i: number; active: MotionValue<number>;
  isActive: boolean; h: number; radius: number;
}) {
  const opacity = useTransform(active, (v) => Math.max(0.07, 1 - Math.abs(v - i) * 0.62));
  const ref = useRef<HTMLElement>(null);
  // inert por DOM: funciona igual en React 18 y 19
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !isActive);
  }, [isActive]);
  return (
    <div
      className="pv-slot"
      style={{
        height: h,
        marginTop: -h / 2,
        transform: `rotateX(${-i * STEP}deg) translateZ(${radius}px)`,
      }}
    >
      <motion.article ref={ref} className={"pv-card" + (isActive ? " is-active" : "")} style={{ opacity }} aria-hidden={!isActive} >
        <Card step={step} n={i + 1} />
      </motion.article>
    </div>
  );
}

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
          <text key={k} x="0" y="-146" textAnchor="middle" className="pv-dial-num" transform={`rotate(${k * 30})`}>
            {k}
          </text>
        ))}
      </motion.svg>
    </div>
  );
}

/* ---------- Cuadrante (1/4 de pantalla) ---------- */
function QuadMedia({ quad, videoRef }: { quad: VaultQuad; videoRef?: Ref<HTMLVideoElement> }) {
  return quad.kind === "video" ? (
    <video ref={videoRef} src={quad.src} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} style={{ objectPosition: quad.position }} />
  ) : (
    <img src={quad.src} alt="" loading="lazy" draggable={false} style={{ objectPosition: quad.position }} />
  );
}

function QuadTile({
  quad, k, progress, start, end,
}: {
  quad: VaultQuad; k: number; progress: MotionValue<number>; start: number; end: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clip = useTransform(progress, [start, end], [CORNER_CLIP[k] ?? CORNER_CLIP[0], OPEN_CLIP]);
  const reveal = useTransform(progress, [start, end], [0, 1]);
  const mediaScale = useTransform(progress, [start, end], [1.25, 1.03]);
  const textFrom = start + (end - start) * 0.55;
  const textOpacity = useTransform(progress, [textFrom, end], [0, 1]);
  const textY = useTransform(progress, [textFrom, end], [18, 0]);

  // El video solo corre mientras su cuadrante está abierto
  useMotionValueEvent(reveal, "change", (v) => {
    const el = videoRef.current;
    if (!el) return;
    if (v > 0.01) {
      if (el.paused) el.play().catch(() => {});
    } else if (!el.paused) {
      el.pause();
    }
  });

  return (
    <motion.figure className="pv-quad" style={{ clipPath: clip }}>
      <motion.div className="pv-quad-media" style={{ scale: mediaScale }}>
        <QuadMedia quad={quad} videoRef={videoRef} />
      </motion.div>
      <span className="pv-quad-shade" aria-hidden="true" />
      <motion.figcaption className="pv-quad-text" style={{ opacity: textOpacity, y: textY }}>
        <span className="pv-quad-head">
          <span className="pv-quad-index">
{String(k + 1).padStart(2, "0")}
</span>
          <span className="pv-quad-line" aria-hidden="true" />
          {quad.icon ? <span className="pv-quad-icon" aria-hidden="true">
{quad.icon}
</span> : null}
        </span>
        <span className="pv-quad-label">
          <strong>
{quad.label}
</strong>
          {quad.sub ? <small>
{quad.sub}
</small> : null}
        </span>
      </motion.figcaption>
    </motion.figure>
  );
}

/* ---------- Sección completa ---------- */
export default function ProtocolVault({
  id = "protocol",
  eyebrowIndex = "02",
  eyebrow,
  title,
  intro,
  steps,
  quads,
  crownSrc = "/corona/corona.bin",
}: Props) {
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const wrap = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const n = steps.length;
  const nq = Math.min(4, quads.length);

  // ---- Línea de tiempo (fracciones del scroll total) ----
  const stepSpan = Math.max(1, n - 1) * STEP_SVH;
  const total = stepSpan + DISSOLVE_SVH + nq * QUAD_SVH;
  const a = stepSpan / total;                       // termina el último paso
  const b = (stepSpan + DISSOLVE_SVH) / total;      // la corona ya cayó → empiezan los cuadrantes
  const q = QUAD_SVH / total;
  const dissolveAt = a * 0.93;                      // la corona se deshace al llegar al último paso

  const h = mobile ? 300 : 400;
  const radius = Math.round(h / 2 / Math.tan((STEP / 2) * (Math.PI / 180)));

  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.4 });
  const active = useTransform(smooth, [0, a], [0, n - 1]);
  const drum = useTransform(smooth, [0, a], [0, (n - 1) * STEP]);
  const contentOpacity = useTransform(smooth, [a + (b - a) * 0.35, b], [1, 0]);

  const [idx, setIdx] = useState(0);
  useMotionValueEvent(active, "change", (v) => setIdx(Math.round(v)));
  const [gone, setGone] = useState(false);
  useMotionValueEvent(smooth, "change", (v) => {
    setGone(v > b - (b - a) * 0.1);
  });
  useEffect(() => {
    contentRef.current?.toggleAttribute("inert", gone);
  }, [gone]);

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
    </div>
  );

  /* Sin animación: lista simple, sin corona, cuadrantes visibles */
  if (reduced) {
    return (
      <section id={id} className="pv pv--flat">
        <div className="pv-stage">
          <div className="pv-content">
            {head}
            <div className="pv-flat-list">
              {steps.map((s, i) => (
                <article key={i} className="pv-card is-active">
                  <Card step={s} n={i + 1} flat />
                </article>
              ))}
            </div>
          </div>
          <div className="pv-quads pv-quads--flat">
            {quads.slice(0, nq).map((qd, i) => (
              <figure key={i} className="pv-quad">
                <div className="pv-quad-media">
<QuadMedia quad={qd} />
</div>
                <span className="pv-quad-shade" aria-hidden="true" />
                <figcaption className="pv-quad-text">
                  <span className="pv-quad-head">
                    <span className="pv-quad-index">
{String(i + 1).padStart(2, "0")}
</span>
                    <span className="pv-quad-line" aria-hidden="true" />
                    {qd.icon ? <span className="pv-quad-icon" aria-hidden="true">
{qd.icon}
</span> : null}
                  </span>
                  <span className="pv-quad-label">
                    <strong>
{qd.label}
</strong>
                    {qd.sub ? <small>
{qd.sub}
</small> : null}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} ref={wrap} className="pv" style={{ height: `calc(100svh + ${total}svh)` }}>
      <div className="pv-stage">
        {/* Corona de partículas: gira con el scroll y se deshace en el último paso */}
        <ProtocolCrown progress={smooth} dissolveAt={dissolveAt} src={crownSrc} />

        {/* Texto fijo + tambor */}
        <motion.div ref={contentRef} className="pv-content" style={{ opacity: contentOpacity }} aria-hidden={gone} >
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
        </motion.div>

        {/* 4 cuadrantes de 1/4 de pantalla: ↖ ↗ ↙ ↘ */}
        <div className="pv-quads">
          {quads.slice(0, nq).map((qd, k) => (
            <QuadTile key={k} quad={qd} k={k} progress={smooth} start={b + k * q} end={b + k * q + q * 0.8} />
          ))}
        </div>
      </div>
    </section>
  );
}