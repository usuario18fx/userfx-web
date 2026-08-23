import React, { useEffect, useRef, useState } from "react";
import Scramble from "./Scramble";
import VaultDevice from "../components/VaultDevice";
import "../components/VaultDevice.css";
import "./VaultHome.css"; // ← el CSS ahora vive en su propio archivo (con los 7 fixes)
import VisitorCounter from "./VisitorCounter";

const LOGO = "/assets/userfx-logo-sin.png";
const BRICK = "/assets/brick-wall.png";
const DAMASK = "/assets/damask.png";
const PUBLIC_INSIDE = ["/assets/album/pic01.png",
                       "/assets/album/pic02.png",
                       "/assets/album/pic03.png",
                       "/assets/album/pic04.png",
                       "/assets/album/pic05.png",
                       "/assets/album/pic06.png",
                       "/assets/album/pic07.png",
];
const PRIVATE_INSIDE = ["/assets/album/pix01.png",
                        "/assets/album/pix02.png",
                        "/assets/album/pix03.png",
];
const LOCK_VIDEOS = ["/assets/video01.mp4",
                     "/assets/video02.mp4",
];
const ICONS = { corona: "/assets/iconos/corona.png",
                candado: "/assets/iconos/candado.png",
                rosa: "/assets/iconos/rosa.png",
                fotos: "/assets/iconos/fotos.png",
                telegram: "/assets/iconos/telegram.png",
};
const TICKER_ITEMS = ["| VIA TELEGRAM | CODED ACCESS | TELEGRAM ",
                      "| BOT | TELEGRAM | VIDEOCALL | WEBSITE 2026",
                      "| FX | CLOSED CIRCUIT | TORONTO,CANADA",
                      "| ALL RIGHTS RESERVED |",
];
const STEPS = [{ n: "01",
                 title: "UNLOCK YOUR ACCESS",
                 text: "Each key unlocks the private collection for a set period of time.",},
               { n: "02",
                title: "REQUEST YOUR KEY",
                text: "This pre does not generate codes. Ask for your private key by DM.",},
               { n: "03",
                title: "RECEIVE YOUR KEY",
                text: "Once confirmed, you receive your private code. Keep it safe.",},
               { n: "04",
                title: "OPEN THE VAULT",
                text: "Enter the final four characters of your code. The door takes care of the rest.",},
];
const PLANS = [{ id: "basic",
                 tab: "BS02-",
                 name: "BASIC",
                 days: 7,
                 benefits: [{icon:ICONS.candado,text: "Enter the vault" },
                            {icon:ICONS.fotos,text: "BASIC drops" },
                            {icon:ICONS.corona,text: "Instant access" },],},
               { id: "pro",
                 tab: "PX01-",
                 name: "PRO",
                 days: 30,
                 benefits: [{ icon: ICONS.candado, text: "Unlock more" },
                            { icon: ICONS.fotos, text: "Exclusive PRO drops" },
                            { icon: ICONS.telegram, text: "Private channels" },],},
               { id: "vip",
                 tab: "VX03-",
                 name: "VIP",
                 days: 90,
                 benefits: [{ icon: ICONS.candado, text: "No limits" },
                            { icon: ICONS.fotos, text: "Full drops" },
                            { icon: ICONS.telegram, text: "Private chat" },],},
];
const FAQS = [
  { q: "How do I get a code?",
    a: "This preview does not generate keys. Request yours by DM on Telegram.",},
  { q: "How long does my access last?",
    a: "It depends on the key you choose. While active, you can return whenever you want.",},
  { q: "Can I share my code?",
    a: "No. Your key is personal and non-transferable.",},
  { q: "What happens if I don’t receive my code?",
    a: "Contact @User18Fx_bot and we’ll review your request.",},
  { q: "Are refunds available?",
    a: "Digital access is non-refundable once the key is delivered, except payment errors or delivery failures.",},
];

const TEASERS = [1, 2, 3, 4, 5, 6].map(
  (n) => `/assets/pic${String(n).padStart(2, "0")}.png`
);

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
      if (diff <= 0) { setLabel("NOW");
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

  const isVideo =
    src.endsWith(".mp4") ||
    src.endsWith(".webm");

  return (
    <div
      className={`vx-shot ${hold ? "is-open" : ""}`}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={() => setHold(true)}
      onPointerUp={() => setHold(false)}
      onPointerLeave={() => setHold(false)}
      onPointerCancel={() => setHold(false)}
    >
      {isVideo ? (
        <video
          src={src}
          className="vx-shotMedia"
          muted
          loop
          playsInline
          preload="metadata"
          width={300}
          height={400}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <img
          src={src}
          alt=""
          draggable={false}
          className="vx-shotMedia"
          width={300}
          height={400}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            objectFit: "cover",
          }}
        />
      )}
      <div className="vx-shotMask" aria-hidden>
        <span>🜲</span>
        <span>HOLD TO REVEAL</span>
      </div>
    </div>
  );}

const STORAGE_KEY = 'vault_unlocked';
const MAX_ATTEMPTS = 5;

export default function VaultHome() {

  const [clock, setClock] = useState("--:--:-- UTC");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [dm, setDm] = useState(false);
  const [lockVideo, setLockVideo] = useState(0);
  const countdown = useCountdown();
  const [codeModal, setCodeModal] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const visiblePhotos = unlocked
                     ? [...PUBLIC_INSIDE, ...PRIVATE_INSIDE]
                     : PUBLIC_INSIDE;
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [activePlan, setActivePlan] = useState("basic");

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') setUnlocked(true);

    fetch('/api/miniapp-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: window.Telegram?.WebApp?.initData || '',
      }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
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
      setVerifyError('Demasiados intentos. Recarga la página.');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, suffix }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        setUnlocked(true);
        setCodeModal(false);
      } else {
        setAttempts((n) => n + 1);
        setVerifyError(data.error || 'Código inválido');
        setSuffix('');
      }
    } catch {
      setVerifyError('Error de conexión');
    } finally {
      setVerifyLoading(false);
    }}

  return (
    <div id="top" className="vx">
      <header className="vx-hud">
        <a href="#top" className="vx-brand">
          <img src={LOGO} alt="USER FX" />
          <span className="vx-live" />
          <span>
            | PrivVault |</span>
        </a>
        <div className="vx-hudRight">
          <VisitorCounter />
          <time>{clock}</time>
          <b onClick={() => !unlocked && setCodeModal(true)} className={unlocked ? 'vx-unlockedBadge' : ''}>
            {unlocked ? '✓ UNLOCKED' : '🜲 LOCKED'}
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
              ᴘʀɪᴠ⭑ᴠᴀᴜʟᴛ<i/>ᴜꜱᴇʀ🜲𝓕𝓧 <i/> ᴏꜰꜰɪᴄɪᴀʟ <i/>
            </p>
            <h1 className="vx-title">
              <Scramble text="ACCESS" className="vx-access" delay={160}/>
              <img src={ICONS.corona} alt="" className="vx-subIcon" draggable={false} width={65} height={65} style={{ width: "65px", height: "65px", maxWidth: "65px", maxHeight: "65px", objectFit: "contain", flex: "0 0 65px",}}/>
              <Scramble text="RESTRICTED" className="vx-rest" delay={420}/>
            </h1>
            <p className="vx-p vx-pNormal">
              There are images that were never meant to be seen..
            </p>
            <p className="vx-p">
              <strong>
                USER<span>
                  🜲 FX </span> <i/>
                —ᴘʀɪᴠᴀᴛᴇ ᴠᴀᴜʟᴛ— <i/></strong>
              Is a reserved place. access is not public.
              You’ll need a ᴄᴏᴅᴇ
            </p>
            <div className="vx-dossier">
              <div className="vx-dossierHead">
                <span>
                  ◈ ACCESS DOSSIER</span>
                <i>
                  LIVE</i>
              </div>
              <div className="vx-dossierGrid">
                <div className="vx-dossierItem">
                  <small>
                    BRAND</small>
                  <strong>
                    𝐔𝐒𝐄𝐑 🜲 𝓕𝐗</strong>
                </div>
                <div className="vx-dossierItem">
                  <small>
                    CONTENT</small>
                  <strong>
                    PRIVATE COLLECTION</strong>
                </div>
                <div className="vx-dossierItem vx-dossierDrop">
                  <small>
                    NEXT DROP</small>
                  <strong>{countdown}</strong>
                </div>
                <div className="vx-dossierItem">
                  <small>
                    ACCESS</small>
                  <strong>
                    DM / PRIVATE KEY</strong>
                </div>
                <div className="vx-dossierItem vx-dossierCode">
                  <small>
                    CODE</small>
                  <strong>
                    🜲 ∣ BS02- ∣ ····</strong>
                </div>
              </div>
            </div>
          </div>
          <aside className="vx-lock" style={{ position: "relative", width: "calc(100% - 24px)", maxWidth: "450px", minWidth: 0, margin: "0 auto", boxSizing: "border-box",}}>
            <div className="vx-frameA" />
            <div className="vx-frameB" />

            <div className="vx-lockCard" style={{ width: "100%", maxWidth: "450px", minWidth: 0, padding: "20px", boxSizing: "border-box",}}>
              <div className="vx-lockVideo" style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", overflow: "hidden", boxSizing: "border-box",}}>
                <video key={LOCK_VIDEOS[lockVideo]} src={LOCK_VIDEOS[lockVideo]} autoPlay muted playsInline preload="metadata" onEnded={() => setLockVideo((current) => (current + 1) % LOCK_VIDEOS.length)} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover",}}/>
                <span className="vx-lockVideoTag">
                  PRIVATE PREVIEW
                </span>
              </div>
              <div className="vx-lockActions" style={{ width: "80%", display: "flex", flexDirection: "column", alignItems: "stretch", gap: "14px", marginTop: "16px",}}>
                <button type="button" className="vault-unlock" onClick={() => setCodeModal(true)} style={{ width: "100%", minWidth: 0, minHeight: "56px", margin: 0, padding: "12px 16px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #d4a83a", borderRadius: "4px", background: "linear-gradient(180deg, #2a2a2a, #111111)", color: "#f6d77a", fontFamily: "var(--mono), monospace", fontSize: "12px", fontWeight: 800, letterSpacing: "0.18em", textAlign: "center", cursor: "pointer",}}>
                  UNLOCK ALBUM
                </button>
                <a className="vault-get-code" href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noreferrer" style={{ width: "80%", minWidth: 0, minHeight: "56px", margin: 0, padding: "12px 16px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #9f173d", borderRadius: "4px", background: "linear-gradient(180deg, #6f102d, #310713)", color: "#f18aa5", fontFamily: "var(--mono), monospace", fontSize: "12px", fontWeight: 800, letterSpacing: "0.18em", textAlign: "center", textDecoration: "none",}}>
                  GET MY CODE
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <Ticker items={TICKER_ITEMS} />
      <section id="protocolo" className="vx-sec">
        <Reveal>
          <p className="vx-goldk">
            ◈ ACCESS PROTOCOL</p>
          <h2>
            HOW TO UNLOCK
            <span className="vx-theVault">
              THE VAULT</span>
          </h2>
        </Reveal>{" "}
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 90} className={ i % 2 ? "vx-shift vx-protocolReveal" : "vx-protocolReveal"}>
            <article className="vx-step">
              <b className="vx-stepNum">{s.n}</b>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
              <small>
                {s.n}
                / 04</small>
            </article>
          </Reveal>
        ))}
      </section>
      <section id="llaves" className="vx-sec vx-tint">
        <Reveal>
          <p className="vx-goldk">
            ◈ ACCESS CODE</p>
          <h2>
            CHOOSE YOUR
            <span className="vx-codeTitle">
              CODE</span>
          </h2>
          <div style={{ display: 'flex',justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#050508'}}>
            <VaultDevice />
          </div>
          <div>
            <p className="vx-goldk">
              ◈ INSIDE THE VAULT</p>
            <h2 className="vx-insideTitle">
              WHAT&apos;S <span>
                INSIDE</span>
            </h2>
            <p className="vx-lead">
              You’re only seeing part of it. Every Friday at 22:00 UTC a new drop
              is added. This is just a glimpse of <strong>
                «Nocturna».</strong>
            </p>
          </div>
          <div className="vx-count">
            <p>
              DROP IN</p>
            <strong>{countdown}</strong>
            <p>
              FRIDAY · 22:00 UTC</p>
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
            ◈ PRIVATE INFORMATION</p>
          <h2>
            BEFORE YOU
            <img src={ICONS.rosa} alt="" className="vx-titleRose" draggable={false}/>
            <span className="vx-getIn">
              GET IN</span>
          </h2>
        </Reveal>
        <div className="vx-faq">
          {FAQS.map((f, i) => { const open = openFaq === i;
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
                    <i>{open ? "–" : "+"}</i>
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
                  USER<span>
                    🜲FX </span>
                </p>
                <small>PRIVATE VAULT</small>
              </div>
            </div>
          </div>
          <div>
            <div className="vx-links">
              <a href="https://t.me/User18Fx_bot" target="_blank" rel="noreferrer">
                @User18Fx_bot
              </a>
              <a href="#top">
                VAULT</a>
              <a href="/admin">
                DIGITAL ARCHIVE</a>
            </div>
          </div>
        </div>
        <p className="vx-legal">
          18+ CONTENT · PERSONAL & NON-TRANSFERABLE
          Vault access is confidential and for personal use only. Sharing, reselling, recording, downloading, copying, or redistributing content
          is prohibited and may result in immediate termination without refund. All content is protected by Canadian copyright law. Digital
          purchases are final once access is delivered, except where Ontario law requires otherwise.
        </p>
        <div className="vx-bar">
          <span>
            CODE | @user18Fx_bot</span>
        </div>
      </footer>
      <Ticker items={TICKER_ITEMS} reverse />
      {dm ? (
        <div className="vx-modal" onClick={() => setDm(false)}>
          <div className="vx-modalCard" onClick={(e) => e.stopPropagation()}>
            {/* ── partículas doradas ── */}
            <div className="vx-modalParticles">
              <span /><span /><span /><span /><span />
            </div>
            <button type="button" className="vx-modalClose" onClick={() => setDm(false)} aria-label="Close modal">
              ×
            </button>
            {/* ── ícono candado ── */}
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
              This content is encrypted. Send us a DM to unlock your exclusive access code.
            </p>
            <div className="vx-modalDivider" />
            <a className="vx-modalLink" href="https://t.me/User18Fx" target="_blank" rel="noreferrer">
              <span className="vx-modalLinkBg" />
              <span className="vx-modalLinkContent">
                <img src={ICONS.rosa} alt="" className="vx-modalRose" draggable={false}/>
                GET MY CODE
              </span>
            </a>
            <p className="vx-modalFooter">
              Usually responds right away.
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
                <input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="PREFIX" maxLength={10} autoCapitalize="characters" autoComplete="off" disabled={verifyLoading || attempts >= MAX_ATTEMPTS}/>
                <input value={suffix} onChange={(e) => setSuffix(e.target.value.toUpperCase())} placeholder="SUFFIX" maxLength={4} autoCapitalize="characters" autoComplete="off" disabled={verifyLoading || attempts >= MAX_ATTEMPTS}/>
              </div>
              <button type="submit" className="vx-gold" disabled={verifyLoading || attempts >= MAX_ATTEMPTS}>
                {verifyLoading ? 'VERIFYING...' : 'UNLOCK'}
              </button>
              {verifyError && (
                <p className="vx-modalText" style={{ color: '#b94a5c' }}>
                  {verifyError}
                </p>
              )}
            </form>
            <p className="vx-modalFooter">
              Don't have a code? DM @User18Fx to get one.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
