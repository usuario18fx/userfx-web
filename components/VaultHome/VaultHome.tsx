"use client";
import React, {useEffect, useRef, useState,} from "react";
import Scramble from "../Scramble";
import VisitorCounter from "../VisitorCounter";
import VaultDevice from "../VaultDevice/VaultDevice";
import "../VaultDevice/VaultDevice.css";
import Crown4D from "../Crown4D/Crown4D";
import "../VaultHome/VaultHome.css";
import VaultHeroDoors from "../VaultDoors/VaultHeroDoors";
import VaultActions from "../VaultActionsBtns/VaultActions";

  const LOGO="/assets/userfx-logo-sin.png";
  const BRICK="/assets/brick-wall.png";
  const DAMASK="/assets/damask.png";

  const privatePhoto=(pathname:string)=>
    `/api/private-media?pathname=${encodeURIComponent(pathname)}`;
  const PREVIEW_INSIDE=["/assets/album/PRVW/PRVW-01.jpg",
                     "/assets/album/PRVW/PRVW-02.jpg",
                     "/assets/album/PRVW/PRVW-03.jpg",
                     "/assets/album/PRVW/PRVW-04.jpg",
                     "/assets/album/PRVW/PRVW-05.jpg",
                     "/assets/album/PRVW/PRVW-06.jpg",
                     "/assets/album/PRVW/PRVW-07.jpg",
    ];
  const BASIC_INSIDE = [privatePhoto("userfx-album/BSIC/BSIC-01.jpg"),
                       privatePhoto("userfx-album/BSIC/BSIC-02.jpg"),
                       privatePhoto("userfx-album/BSIC/BSIC-03.jpg"),
                       privatePhoto("userfx-album/BSIC/BSIC-04.jpg"),
                       privatePhoto("userfx-album/BSIC/BSIC-05.jpg"),
    ];
  const PRO_INSIDE  = [privatePhoto("userfx-album/PRX0/PRX0-01.jpg"),
                      privatePhoto("userfx-album/PRX0/PRX0-02.jpg"),
                      privatePhoto("userfx-album/PRX0/PRX0-03.jpg"),
    ];
  const VIP_INSIDE =  [privatePhoto("userfx-album/VIPX/VIPX-01.jpg"),
                      privatePhoto("userfx-album/VIPX/VIPX-02.jpg"),
                      privatePhoto("userfx-album/VIPX/VIPX-03.jpg"),
                      privatePhoto("userfx-album/VIPX/VIPX-04.jpg"),
    ];

  const ICONS =       {corona:"/assets/iconos/corona.png",
                       candado:"/assets/iconos/candado.png",
                       rosa:"/assets/iconos/rosa.png",
    };
  const TICKER_ITEMS =["| VIA TELEGRAM | CODED ACCESS | TELEGRAM ",
                      "| BOT | TELEGRAM | VIDEOCALL | WEBSITE 2026",
                      "| FX | CLOSED CIRCUIT | TORONTO,CANADA",
                      "| ALL RIGHTS RESERVED |",
    ];
  const STEPS  =      [{n: "01",
                        title: "UNLOCK YOUR ACCESS",
                        text: "Each key unlocks the private collection for a set number of entries.",},
                       {n: "02",
                        title: "REQUEST YOUR KEY",
                        text: "Choose ʙᴀꜱɪᴄ ᴘʀᴏ or ᴠɪᴘ, then use ɢᴇᴛ ᴍʏ ᴄᴏᴅᴇ to request your private key.",},
                       {n: "03",
                        title: "RECEIVE YOUR KEY",
                        text: "Once confirmed, you receive your private code. Keep it safe.",},
                       {n: "04",
                        title: "OPEN THE VAULT",
                        text: "Enter your complete access code. The door verifies it and unlocks your plan.",},
    ];
  const FAQS = [
    { q: "How do I get a code?",
      a: "Choose your access level and use GET MY CODE to continue through Telegram.",},
    { q: "How many times can I enter?",
      a: "BASIC includes 1 entry, PRO includes 10 entries, and VIP includes unlimited entries.",},
    { q: "Can I share my code?",
      a: "No. Your key is personal and non-transferable.",},
    { q: "What happens if I don’t receive my code?",
      a: "Contact @User18Fx_bot and we’ll review your request.",},
    { q: "Are refunds available?",
      a: "Digital access is non-refundable once the key is delivered, except payment errors or delivery failures.",},
    ];

    function nextFridayUtc() {
  const now = new Date();
  const day = now.getUTCDay(); let add = (5 - day + 7) % 7;
  const target = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + add, 22, 0, 0));
    if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 7);
    }
    return target;
    }

    function useCountdown() {
  const [label, setLabel] = useState("· · ·");

  useEffect(() => {
  const tick = () => {
  const diff = nextFridayUtc().getTime() - Date.now();
    if (diff <= 0) {
        setLabel("NOW");
    return;
    }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const p = (n: number) => String(n).padStart(2, "0");
      setLabel(`${d}d ${p(h)}:${p(m)}:${p(s)}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    }, []);
    return label;
    }

function Reveal({ children, delay = 0, className = "",
    }: {children: React.ReactNode; delay?: number; className?: string;}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
  const el = ref.current;
    if (!el) return;
  const io = new IntersectionObserver(
     ([e]) => {
    if (e.isIntersecting) setOn(true);
    },{threshold: 0.16 }
    );
    io.observe(el);
    return () => io.disconnect();
    }, []);

    return (
              <div ref={ref} className={`vx-reveal ${on ? "is-on" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
               {children}
              </div>
    );
    }

  function Ticker({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
    const line = items.join("   🜲   ") + "   🜲   ";
    return (
              <div className={`vx-ticker ${reverse ? "is-rev" : ""}`}>
              <div className="vx-tickerTrack">
              <span>{line.repeat(4)}</span>
              <span>{line.repeat(4)}</span>
              </div>
              </div>
    );
    }

function HoldShot({ src }: { src: string }) {
  const [hold, setHold] = useState(false);
  const isVideo = src.endsWith(".mp4") ||
                  src.endsWith(".webm");

    return (
              <div className={`vx-shot ${hold ? "is-open" : ""}`} onContextMenu={(e) => e.preventDefault()} onPointerDown={() => setHold(true)} onPointerUp={() => setHold(false)} onPointerLeave={() => setHold(false)} onPointerCancel={() => setHold(false)}>
               {isVideo ? (
              <video src={src} className="vx-shotMedia" muted loop playsInline preload="metadata" width={300} height={400}/>
    ) : (
              <img src={src} alt="" draggable={false} className="vx-shotMedia" width={300} height={400}/>
    )}
              <div className="vx-shotMask" aria-hidden>
              <span>
                🜲
              </span>
              <span>
               HOLD TO REVEAL
              </span>
              </div>
              </div>
    );}

  const SAVED_CODE_KEY = "vault_saved_code";
  const MAX_ATTEMPTS = 5;

  type AccessPlanId = "basic" | "pro" | "vip";

  const ACCESS_PLAN_PREFIX: Record<AccessPlanId, "BSIC" | "PRX0" | "VIPX"> = {
    basic: "BSIC",
    pro: "PRX0",
    vip: "VIPX",
  };

  type TelegramWindow = Window & {
    Telegram?: { WebApp?: { initData?: string } };
  };

  function isAccessPlanId(value: unknown): value is AccessPlanId {
    return value === "basic" || value === "pro" || value === "vip";
  }

export default function VaultHome() {

  const [clock, setClock] = useState("--:--:--");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [dm, setDm] = useState(false);
  const countdown = useCountdown();
  const [codeModal, setCodeModal] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [activePlanId, setActivePlanId] = useState<AccessPlanId | null>(null);
  const [remainingAccesses, setRemainingAccesses] = useState<number | null>(null);
  const [unlimitedAccess, setUnlimitedAccess] = useState(false);

  const activePlanPrefix = activePlanId
    ? ACCESS_PLAN_PREFIX[activePlanId]
    : "";

  const unlockedPhotos = activePlanId === "vip"
    ? [...BASIC_INSIDE, ...PRO_INSIDE, ...VIP_INSIDE]
    : activePlanId === "pro"
      ? [...BASIC_INSIDE, ...PRO_INSIDE]
      : activePlanId === "basic"
        ? BASIC_INSIDE
        : [];

  const visiblePhotos = unlocked
        ? [...PREVIEW_INSIDE, ...unlockedPhotos]
        : PREVIEW_INSIDE;

  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const inlineCodeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
  fetch("/api/access-session", {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data?.ok && data?.authenticated && isAccessPlanId(data.planId)) {
        sessionStorage.setItem("vault_plan", data.planId);
        setActivePlanId(data.planId);
        setRemainingAccesses(
          Number.isFinite(Number(data.remainingAccesses))
            ? Number(data.remainingAccesses)
            : null
        );
        setUnlimitedAccess(data.unlimitedAccess === true);
        setUnlocked(true);
        }})
    .catch(() => {});

  const codeFromTelegram = new URLSearchParams(
    window.location.search
        ).get("code");

  const savedCode = localStorage.getItem(SAVED_CODE_KEY);
  const codeToLoad = codeFromTelegram || savedCode;

  const match = String(codeToLoad || "")
    .trim()
    .toUpperCase()
    .match(/^(BSIC|PRX0|VIPX)-([A-HJ-NP-Z2-9]{4})$/);

    if (match) {
      if (codeFromTelegram || match[1] === "PRX0") {
        setPrefix(match[1]);
        setSuffix(match[2]);
      }

      if (codeFromTelegram) {
        window.setTimeout(() => inlineCodeRef.current?.focus(), 150);
      } else if (match[1] !== "PRX0") {
        localStorage.removeItem(SAVED_CODE_KEY);
      }}

  fetch("/api/miniapp-track", {
    method: "POST",
    headers: {
    "Content-Type": "application/json",
    },
    body: JSON.stringify({
      initData: (window as TelegramWindow).Telegram?.WebApp?.initData || "",
    }),
    }).catch(() => {});
    }, []);

  useEffect(() => {
    const tick = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");

    setClock(
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    );
    };

    tick();

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

    if (attempts >= MAX_ATTEMPTS) {
      setVerifyError(
        'ᴛᴏᴏ ᴍᴀɴʏ ᴀᴛᴛᴇᴍᴘᴛꜱ. ᴘʟᴇᴀꜱᴇ ʀᴇꜰʀᴇꜱʜ ᴛʜᴇ ᴘᴀɢᴇ..'
      );
    return;
    }

    const normalizedPrefix = prefix
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    const normalizedSuffix = suffix
      .trim()
      .toUpperCase()
      .replace(/[^A-HJ-NP-Z2-9]/g, "");

    if (
      !/^(BSIC|PRX0|VIPX)$/.test(normalizedPrefix) ||
      normalizedSuffix.length !== 4
    ) {
      setVerifyError("ᴇɴᴛᴇʀ ʏᴏᴜʀ ᴄᴏᴍᴘʟᴇᴛᴇ ᴀᴄᴄᴇꜱꜱ ᴋᴇʏ");
      return;
    }

    setPrefix(normalizedPrefix);
    setSuffix(normalizedSuffix);
    setVerifyLoading(true);
    setVerifyError('');

    try {
    const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          prefix: normalizedPrefix,
          suffix: normalizedSuffix,
    }),});

    const data = await res.json();

    if (data.ok) {
    if (!isAccessPlanId(data.planId)) {
      setVerifyError("ɪɴᴠᴀʟɪᴅ ᴀᴄᴄᴇꜱꜱ ᴘʟᴀɴ");
      return;
    }

    sessionStorage.setItem("vault_plan", data.planId);
    setActivePlanId(data.planId);

    setRemainingAccesses(
      Number.isFinite(Number(data.remainingAccesses))
        ? Number(data.remainingAccesses)
        : null
    );

    setUnlimitedAccess(data.unlimitedAccess === true);

    if (data.planId === "pro") {
        localStorage.setItem(
          SAVED_CODE_KEY,
          `${normalizedPrefix}-${normalizedSuffix}`
    );
    } else {
        localStorage.removeItem(SAVED_CODE_KEY);
    }

      setUnlocked(true);
      setCodeModal(false);
      setVerifyError("");

    const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("code");

      window.history.replaceState(
    {},
    "",
    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );

  window.setTimeout(() => {
    document
      .getElementById("unlocked-vault")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
    }, 200);

  return;
    } else {
        setAttempts((n) => n + 1);
        setVerifyError(
          data.error || 'ᴄᴏ́ᴅɪɢᴏ ɪɴᴠᴀ́ʟɪᴅᴏ'
        );
    }
    } catch {
      setVerifyError('ᴇʀʀᴏʀ ᴅᴇ ᴄᴏɴᴇxɪᴏ́ɴ');
    } finally {
      setVerifyLoading(false);
    }}

    function handleInlineCodeChange(value: string) {
      const compactCode = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);

      setPrefix(compactCode.slice(0, 4));
      setSuffix(compactCode.slice(4, 8));
      setVerifyError("");
    }

    const inlineCodeValue = prefix || suffix
      ? `${prefix}${prefix.length === 4 ? "-" : ""}${suffix}`
      : "";

    const inlineCodeTemplate = inlineCodeValue.startsWith("V")
      ? "VIPX-CODE"
      : inlineCodeValue.startsWith("P")
        ? "PRX0-CODE"
        : "BSIC-CODE";
   return (
              <div id="top" className="vx">
              <header className="vx-hud">
              <a href="#top" className="vx-brand">
              <img src={LOGO} alt="USER FX" />
              <span className="vx-live" />
              <span>
               | PRIV⭑VAULT |
              </span>
              </a>
              <div className="vx-hudRight">
              <VisitorCounter />
              <time>
               {clock}
              </time>
              <b onClick={() => !unlocked && setCodeModal(true)} className={unlocked ? "vx-unlockedBadge" : ""} aria-live="polite" aria-label={unlocked ? `${activePlanPrefix} unlocked` : "Vault locked"}>
               {unlocked ? (
              <>
              <span className="vx-unlockedPrefix">
               {activePlanPrefix}
              </span>
              <span className="vx-unlockedState">
               UNLOCKED
              </span>
              </>
    ) : (
               "🜲 LOCKED"
    )}
              </b>
              </div>
              </header>

              <section className="vx-open">
              <div className="vx-bg">
              <img src={DAMASK} alt="" className="vx-damask" />
              <img src={BRICK} alt="" className="vx-brick" />
              <i className="vx-blob vx-blobA" />
              <i className="vx-blob vx-blobB" />
              </div>
              <div className="vx-grid">
              <div>
              <div className="vx-logoWrap">
              <img src={LOGO} alt="𝐔𝐒𝐄𝐑🜲𝓕𝐗" />
              </div>
              <p className="vx-kicker">
              <i />
               PRIV⭑VAULT
              <i/>
               User🜲𝓕𝓧
              <i/>
               OFFICIAL
              <i/>
              </p>
              <h1 className="vx-title">
        <Scramble text="ACCESS" className="vx-access" delay={160}/>
              <div className="vx-titleCrown">
        <Crown4D />
              </div>
        <Scramble text="RESTRICTED" className="vx-rest" delay={420}/>
              </h1>
              <p className="vx-p vx-pNormal">
               There are images that were never meant to be seen..{" "}
              <strong>
               USER🜲 FX —ᴘʀɪᴠᴀᴛᴇ ᴠᴀᴜʟᴛ—
              </strong>{" "}
               Is a reserved place. access is not public. You’ll need a ᴄᴏᴅᴇ
              </p>
              <div className="vx-dossier">
              <div className="vx-dossierHead">
              <span>
               🜲 ACCESS DOSSIER
              </span>
              <i>
               LIVE
              </i>
              </div>
              <div className="vx-dossierGrid">
              <div className="vx-dossierItem">
              <small>
               BRAND
              </small>
              <strong>
               𝐔𝐒𝐄𝐑 🜲 𝓕𝐗
              </strong>
              </div>
              <div className="vx-dossierItem">
              <small>
               CONTENT
              </small>
              <strong>
               PRIVATE COLLECTION
              </strong>
              </div>
              <div className="vx-dossierItem vx-dossierDrop">
              <small>
               NEXT DROP
              </small>
              <strong>
               {countdown}
              </strong>
              </div>
              <div className="vx-dossierItem">
              <small>
               ACCESS
              </small>
              <strong>
               DM / PRIVATE KEY
              </strong>
              </div>
              <div className="vx-dossierItem vx-dossierCode">
              <small>
               CODE
              </small>
              <strong>
               🜲 ∣ BSIC / PRX0 / VIPX
              </strong>
              </div>
              </div>
              </div>
              </div>
            <aside className="vx-lock vx-lockRaise">
      <VaultHeroDoors unlocked={unlocked}/>
             {!unlocked ? (
      <VaultActions value={inlineCodeValue} onChange={handleInlineCodeChange} onSubmit={handleVerify} onGetCode={() => setDm(true)} loading={verifyLoading} error={verifyError} placeholder={inlineCodeTemplate} inputRef={inlineCodeRef}/>
             ) : null}
            </aside>
{/*➡️ CIERRE PANEL DERECHO */}
              </div>
            </section>
      <Ticker items={TICKER_ITEMS} />
               {unlocked ? (
            <section id="unlocked-vault" className="vx-privateAlbum" aria-label="Unlocked private album">
              <div className="vx-privateAlbumInner">
              <header className="vx-privateAlbumHeader">
              <p className="vx-privateAlbumStatus">
              <span>
                ✓
              </span>
               ACCESS GRANTED
              </p>
              <h2 className="vx-privateAlbumTitle">
               PRIVATE
              <span>
               ALBUM
              </span>
              </h2>
              <p className="vx-privateAlbumDescription">
               Your {activePlanPrefix}
               access key has been verified. {unlimitedAccess
                 ? "Unlimited entries available."
                 : remainingAccesses === null
                    ? "Welcome inside the private vault."
                    : `${remainingAccesses} future ${remainingAccesses === 1 ? "entry" : "entries"} remaining.`}
              </p>
              <div className="vx-privateAlbumLine" />
              </header>
              <div className="vx-privateAlbumGrid">
               {unlockedPhotos.map((src, index) => (
              <figure key={`unlocked-${src}`} className="vx-privateAlbumItem" onContextMenu={(event) => event.preventDefault()}>
              <img src={src} alt={`Private vault image ${index + 1}`} draggable={false} loading={index === 0 ? "eager" : "lazy"}/>
              <figcaption>
              <span>
               USER 🜲 FX
              </span>
              <small>
               PRIVATE FILE {String(index + 1).padStart(2, "0")}
              </small>
              </figcaption>
              </figure>
              ))}
              </div>
              <footer className="vx-privateAlbumFooter">
              <span>
               PERSONAL ACCESS
              </span>
              <i />
              <span>
               DO NOT DISTRIBUTE
              </span>
              </footer>

              </div>
              </section>
               ) : null}
              <section id="protocolo" className="vx-sec">
        <Reveal>
              <p className="vx-goldk">
               🜲 ACCESS PROTOCOL
              </p>
              <h2>
               HOW TO UNLOCK
              <span className="vx-theVault">
               THE VAULT
              </span>
              </h2>
        </Reveal>{" "}
               {STEPS.map((s, i) => (
        <Reveal key={s.n} delay={i * 90} className={i % 2 ? "vx-shift vx-protocolReveal" : "vx-protocolReveal"}>
              <article className="vx-step">
              <b className="vx-stepNum">
               {s.n}
              </b>
              <div>
              <h3>
               {s.title}
              </h3>
              <p>
               {s.text}
              </p>
              </div>
              <small>
               {s.n} / 04
              </small>
              </article>
        </Reveal>
               ))}
              </section>
              <section id="llaves" className="vx-sec vx-tint">
        <Reveal>
              <p className="vx-goldk">
               🜲 ACCESS CODE
              </p>
              <h2>
               CHOOSE YOUR
              <span className="vx-codeTitle">
               CODE
              </span>
              </h2>
              <div className="vx-deviceStage">
        <VaultDevice />
              </div>
              <div className="vx-insideBlock">
              <p className="vx-goldk">
               🜲 INSIDE THE VAULT
              </p>
              <h2 className="vx-insideTitle">
               WHAT&apos;S
              <span>
               INSIDE
              </span>
              </h2>
              <div className="vx-insideRow">
              <p className="vx-lead">
               You’re only seeing part of it. Every Friday at 22:00 UTC a new drop
               is added. This is just a glimpse of
              <strong>
               —Nocturna—
              </strong>
              </p>
              <div className="vx-count">
              <p>
               DROP IN
              </p>
              <strong>
               {countdown}
              </strong>
              <p>
               FRIDAY · 22:00 UTC
              </p>
              </div>
              </div>
              </div>
        </Reveal>
              <div className="vx-carousel">
              <div className="vx-carouselTrack">
               {[...visiblePhotos, ...visiblePhotos].map((src, i) => (
              <div className="vx-carouselSlide" key={`${src}-${i}`}>
        <HoldShot src={src} />
              </div>
               ))}
              </div>
              </div>
              </section>
              <section id="faq" className="vx-sec">
        <Reveal>
              <p className="vx-goldk">
               ◈ PRIVATE INFORMATION
              </p>
              <h2>
               BEFORE YOU
              <img src={ICONS.rosa} alt="" className="vx-titleRose" draggable={false}/>
              <span className="vx-getIn">
               GET IN
              </span>
              </h2>
        </Reveal>
              <div className="vx-faq">
               {FAQS.map((f, i) => {
                const open = openFaq === i;
        return (
        <Reveal key={f.q} delay={i * 50}>
              <div className="vx-faqItem">
              <button type="button" onClick={() => setOpenFaq(open ? null : i)}>
              <b>
               {String(i + 1).padStart(2, "0")}
              </b>
              <span>
               {f.q}
              </span>
              <i>
               {open ? "–" : "+"}
              </i>
              </button>
               {open ? <p>{f.a}</p> : null}
              </div>
        </Reveal>
               );
              })}
              </div>
              </section>
              <footer className="vx-foot">
              <div className="vx-footGrid">
              <div>
              <div className="vx-footBrand">
              <img src={LOGO} alt="" />
              <div>
              <p>
               USER
              <span>
               🜲
              </span>
               FX
              </p>
              <small>
               PRIVATE VAULT
              </small>
              </div>
              </div>
              </div>
              <div>
              <div className="vx-footActions">
              <div className="vx-links">
              <a href="https://t.me/User18Fx" target="_blank" rel="noreferrer">
        <Scramble text="@USER18FX" hover />
              </a>
              <a href="#top">
        <Scramble text="VAULT" hover />
              </a>
              <a href="/admin" className="vx-digitalArchive">
        <Scramble text="DIGITAL ARCHIVE" hover />
              </a>
              </div>
              <div className="vx-footCode">
                | CODE | FX-011897-190122-CAHATO |
              </div>
              </div>
              </div>
              </div>
              <p className="vx-legal">
               | 18+ CONTENT | PERSONAL &amp; NON-TRANSFERABLE | Vault access is
               confidential and for personal use only. Sharing, reselling, recording,
               downloading, copying, or redistributing content is prohibited and may
               result in immediate termination without refund. All content is protected
               by Canadian copyright law. Digital purchases are final once access is
               delivered, except where Ontario law requires otherwise.
              </p>
              </footer>
        <Ticker items={TICKER_ITEMS} reverse />
               {dm ? (
              <div className="vx-modal" onClick={() => setDm(false)}>
              <div className="vx-modalCard" onClick={(e) => e.stopPropagation()}>
{/* ── partículas doradas ── */}
              <div className="vx-modalParticles">
              <span/>
              <span/>
              <span/>
              <span/>
              <span/>
              </div>
              <button type="button" className="vx-modalClose" onClick={() => setDm(false)} aria-label="Close modal">
               ×
              </button>
              <div className="vx-modalIcon">
              </div>
              <p className="vx-modalKicker">
               𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT
              </p>
              <h3 className="vx-modalTitle vx-modalTitleWithCrown">
              <span className="vx-modalTitleShimmer">
               ACCESS RESTRICTED
              </span>
              <img src={ICONS.corona} alt="" className="vx-modalTitleCrown" draggable={false}/>
              </h3>
              <p className="vx-modalText">
               Choose your access level, then continue on Telegram to request your private access code.
              </p>
              <div className="vx-modalDivider" />
              <a className="vx-modalLink" href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noreferrer">
              <span className="vx-modalLinkBg" />
              <span className="vx-modalLinkContent">
              <img src={ICONS.rosa} alt="" className="vx-modalRose" draggable={false}/>
               GET MY CODE
              </span>
              </a>
              <p className="vx-modalFooter">
               BASIC · PRO · VIP
              </p>
              </div>
              </div>
               ) : null}
               {codeModal ? (
              <div className="vx-modal" onClick={() => setCodeModal(false)}>
              <div className="vx-modalCard" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="vx-modalClose" onClick={() => setCodeModal(false)} aria-label="Close modal">
               ×
              </button>
              <div className="vx-modalIcon">
              <img src={ICONS.candado} alt="" className="vx-modalCrown" draggable={false}/>
              </div>
              <p className="vx-modalKicker">
               𝐔𝐒𝐄𝐑🜲𝓕𝐗 · ENTER CODE
              </p>
              <h3 className="vx-modalTitle">
              <span className="vx-modalTitleShimmer">
               YOUR ACCESS KEY
              </span>
              </h3>
              <form onSubmit={handleVerify} className="vx-codeForm">
              <div className="vx-codeInputs">
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="PREFIX"
                maxLength={4}
                autoCapitalize="characters"
                autoComplete="off"
                disabled={verifyLoading || attempts >= MAX_ATTEMPTS}/>
              <input
                value={suffix}
                onChange={(e) => setSuffix(e.target.value.toUpperCase())}
                placeholder="SUFFIX"
                maxLength={4}
                autoCapitalize="characters"
                autoComplete="off"
                disabled={verifyLoading || attempts >= MAX_ATTEMPTS}/>
              </div>
              <button type="submit" className="vx-gold" disabled={verifyLoading || attempts >= MAX_ATTEMPTS}>
               {verifyLoading ? 'VERIFYING...' : 'UNLOCK'}
              </button>
               {verifyError && (
              <p className="vx-modalError">
               {verifyError}
              </p>
               )}
              </form>
              <p className="vx-modalFooter">
               Don&apos;t have a code? Use GET MY CODE or contact @User18Fx_bot.
              </p>
              </div>
              </div>
               ) : null}
              </div>
               );
               }
