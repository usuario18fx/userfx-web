"use client";
  import React, { useEffect, useState } from "react";
  import styles from "./AlbumLocked.module.css";
  const LOGO = "/assets/userfx-logo.png";
  const HUD_TOP =
    "𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT  ✦  NEW DROP EVERY FRIDAY · 22:00 UTC  ✦  PRIVATE ACCESS  ✦  NOCTURNA  ✦  ";
  const HUD_BOTTOM =
    "HOLD TO REVEAL  ✦  PRIVATE KEY BY DM  ✦  ACCESS IS NOT PUBLIC  ✦  USER FX 2026  ✦  ";
  const STEPS = [
    { n: "01",
      title: "UNLOCK YOUR ACCESS",
      text: "Each key unlocks the private collection for a set period of time.",},
    { n: "02",
      title: "REQUEST YOUR KEY",
      text: "This pre does not generate codes. Ask for your private key by DM.",},
    { n: "03",
      title: "RECEIVE YOUR KEY",
      text: "Once confirmed, you receive your personal code. Keep it safe.",},
    { n: "04",
      title: "OPEN THE VAULT",
      text: "Enter the vault with your key. The door takes care of the rest.",},
    ];
const PATHS = [
    { id: "BS02-",
      name: "BASIC",
      lines: ["Enter the vault", "BASIC drops", "Instant access"],
      meta: "7 DAYS",},
    { id: "PX01-",
      name: "PRO",
      lines: ["Unlock more", "PRO drops", "Private channels"],
      meta: "30 DAYS",
      hot: true,},
    { id: "VX03-",
      name: "VIP",
      lines: ["No limits", "Full drops", "Private chat"],
      meta: "90 DAYS",},
    ];
const INSIDE = [
    "/images/pic01.png",
    "/images/pic02.png",
    "/images/pic03.png",
    "/images/pic04.png",
    "/images/pic05.png",
    "/images/pic06.png",
  ];
const FAQ = [
  { q: "How do I get a code?",
    a: "This preview does not generate keys. Request yours by DM on Telegram.",},
  { q: "Is access public?",
    a: "No. The vault is reserved. You’ll need a private key.",},
  { q: "Can I share my code?",
    a: "No. Your key is personal and non-transferable.",},
  { q: "What happens if I don’t receive my code?",
    a: "Contact @User18Fx_bot and we’ll review your request.",
  },];
function Hud({
  text,
  reverse = false,
  }:{
  text: string;
  reverse?: boolean;
  }){
  const line = text.repeat(6);
  return (
        <div className={`${styles.hud} ${reverse ? styles.hudReverse : ""}`}>
        <div className={styles.hudTrack}>
        <span>{line}</span>
        <span>{line}</span>
        </div>
        </div>
       );}
       function HoldShot({src, active,}:
        { src: string;
          active: boolean;
        }) {
        const [hold, setHold] = useState(false);
  return (
        <div className={`${styles.shot} ${active ? styles.slideOn : styles.slide} ${ hold ? styles.shotOpen : ""}`}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={() => setHold(true)}
          onPointerUp={() => setHold(false)}
          onPointerLeave={() => setHold(false)}
          onPointerCancel={() => setHold(false)}>
        <img src={src} alt="" draggable={false} className={styles.shotImg} />
        <div className={styles.shotCover} aria-hidden>
        <span className={styles.shotLock}>🜲</span>
        <span className={styles.shotHint}>HOLD TO REVEAL</span>
        </div>
        </div>
        );
      }
function RoseMark() {
  return (
        <span className={styles.btnRose} aria-hidden>
        <svg viewBox="0 0 32 32" width="16" height="16">
        <path d="M16 26c-3-4.6-7.2-7.4-7.2-11.4 0-2.8 2.3-5 5.4-5 .9 0 1.7.3 2.4.9.7-.6 1.5-.9 2.4-.9 3.1 0 5.4 2.2 5.4 5 0 4-4.2 6.8-7.2 11.4z"
              fill="#7a1528"/>
        <path d="M16 12.2c1.6.5 2.5 1.9 2.9 3.3-1.3-.3-2.1 0-2.9.8-.8-.8-1.6-1.1-2.9-.8.4-1.4 1.3-2.8 2.9-3.3z"
              fill="#c43b4e" />
        <path d="M16 14.8c.8.5 1.2 1.3 1.2 2.1s-.5 1.6-1.2 2.1c-.7-.5-1.2-1.3-1.2-2.1s.5-1.6 1.2-2.1z"
              fill="#e8a0aa"/>
        </svg>
        </span>
        );
      }
export default function VaultHome() {
  const [clock, setClock] = useState("--:--:-- UTC");
  const [openPopup, setOpenPopup] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(
        `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % INSIDE.length);
    }, 3800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main className={styles.page}>
      <Hud text={HUD_TOP} />

      <header className={styles.header}>
        <img src={LOGO} alt="USER FX" className={styles.logo} />
        <div className={styles.headerRight}>
          <time className={styles.clock}>{clock}</time>
          <span className={styles.locked}>LOCKED</span>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.kicker}>
            𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT · Nº01 NOCTURNA
          </p>
          <h1>
            <span className={styles.hAccess}>ACCESS</span>
            <span className={styles.hRestricted}>RESTRICTED.</span>
          </h1>
          <p className={styles.dim}>
            There are images that were never meant to be seen.
          </p>
          <p className={styles.dim}>
            Access is not public. You’ll need a <em>private key</em>.
          </p>
        </div>

        <aside className={styles.gate}>
          <p className={styles.gateTitle}>LOCKED ACCESS</p>
          <button
            type="button"
            className={styles.unlockBtn}
            onClick={() => setOpenPopup(true)}
          >
            <RoseMark />
            UNLOCK ALBUM
          </button>
          <p className={styles.hint}>SOLICITA TU CÓDIGO POR DM</p>
        </aside>
      </section>

      <Hud text={HUD_BOTTOM} reverse />

      <section className={styles.block} id="protocol">
        <p className={styles.secKicker}>◈ ACCESS PROTOCOL</p>
        <h2 className={styles.secTitle}>
          HOW TO UNLOCK <span>THE VAULT</span>
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.n}>
              <span className={styles.num}>{step.n}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.block} id="path">
        <p className={styles.secKicker}>◈ CHOOSE YOUR PATH</p>
        <h2 className={styles.secTitle}>
          CHOOSE YOUR <span>CODE</span>
        </h2>
        <div className={styles.paths}>
          {PATHS.map((path) => (
            <article
              key={path.id}
              className={`${styles.path} ${path.hot ? styles.pathHot : ""}`}
            >
              <p className={styles.pathId}>{path.id}</p>
              <h3>{path.name}</h3>
              <ul>
                {path.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className={styles.pathMeta}>{path.meta}</p>
              <button
                type="button"
                className={styles.unlockBtn}
                onClick={() => setOpenPopup(true)}
              >
                REQUEST KEY
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.block} id="inside">
        <p className={styles.secKicker}>◈ INSIDE THE VAULT</p>
        <h2 className={styles.secTitle}>
          WHAT&apos;S <span>INSIDE</span>
        </h2>
        <div className={styles.carousel}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() =>
              setSlide((s) => (s - 1 + INSIDE.length) % INSIDE.length)
            }
            aria-label="Anterior"
          >
            ‹
          </button>
          <div className={styles.stage}>
            {INSIDE.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className={i === slide ? styles.slideOn : styles.slide}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => setSlide((s) => (s + 1) % INSIDE.length)}
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
        <div className={styles.dots}>
          {INSIDE.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === slide ? styles.dotOn : styles.dot}
              onClick={() => setSlide(i)}
              aria-label={`Foto ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <section className={styles.block} id="before">
        <p className={styles.secKicker}>◈ PRIVATE INFORMATION</p>
        <h2 className={styles.secTitle}>
          BEFORE YOU <span>GET IN</span>
        </h2>
        <div className={styles.faq}>
          {FAQ.map((item, i) => (
            <div key={item.q} className={styles.faqItem}>
              <button
                type="button"
                className={styles.faqBtn}
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              >
                <span className={styles.faqN}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item.q}</span>
                <span>{faqOpen === i ? "–" : "+"}</span>
              </button>
              {faqOpen === i && <p className={styles.faqA}>{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {openPopup && (
        <div className={styles.popup} onClick={() => setOpenPopup(false)}>
          <div
            className={styles.popupBox}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpenPopup(false)}
            >
              ×
            </button>
            <p className={styles.kicker}>𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT</p>
            <h2>ACCESS RESTRICTED</h2>
            <p className={styles.dim}>
              Solicita tu código por DM directo.
            </p>
            <a className={styles.unlockBtn} href="https://t.me/User18Fx"  target="_blank"  rel="noreferrer" >
              <RoseMark />
              ABRIR DM
            </a>
            </div>
            </div>
      )}
    </main>
  );
}


