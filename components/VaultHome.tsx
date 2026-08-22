import React, { useEffect, useRef, useState } from "react";
import Scramble from "./Scramble";
import VaultDevice from '../components/VaultDevice';
import '../components/VaultDevice.css';
import VisitorCounter from './VisitorCounter';

  const LOGO =    "/assets/userfx-logo-sin.png";
  const BRICK =   "/assets/brick-wall.png";
  const DAMASK =  "/assets/damask.png";
  const INSIDE = ["/assets/pic01.png",
                  "/assets/pic05.png",
                  "/assets/pic06.png",
                  "/assets/pic07.png",
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
  const TICKER_ITEMS = [
     "𝓤𝐒𝐄𝐑 🜲 𝓕𝐗 · PRIVATE VAULT",
     "NEW DROP EVERY FRIDAY · 𝟮𝟮﹕𝟬𝟬UTC",
     "PRIVATE ACCESS · TELEGRAM",
     "PRIVATE CODE · FX-USER18-0001",
     "«NOCTURNA» · A PRIVATE COLLECTION"
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
    const PLANS = [{id:  "basic",
                tab: "BS02-",
                name:"BASIC",
                days: 7,
                benefits: [
      { icon: ICONS.candado, text: "Enter the vault" },
      { icon: ICONS.fotos, text: "BASIC drops" },
      { icon: ICONS.corona, text: "Instant access" },],},
    { id:  "pro",
      tab: "PX01-",
      name:"PRO",
      days: 30,
      benefits: [
      { icon: ICONS.candado, text: "Unlock more" },
      { icon: ICONS.fotos, text: "Exclusive PRO drops" },
      { icon: ICONS.telegram, text: "Private channels" },],},
    { id:  "vip",
      tab: "VX03-",
      name:"VIP",
      days: 90,
      benefits: [
      { icon: ICONS.candado, text: "No limits" },
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
    const target = new Date( Date.UTC(
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
      if (diff <= 0) {setLabel("NOW");
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
     const isVideo = src.endsWith(".mp4") || src.endsWith(".webm");
        return (
                <div className={`vx-shot ${hold ? "is-open" : ""}`} onContextMenu={(e) => e.preventDefault()} onPointerDown={() => setHold(true)} onPointerUp={() => setHold(false)} onPointerLeave={() => setHold(false)} onPointerCancel={() => setHold(false)}>
                 {isVideo ? (
                <video src={src} className="vx-shotMedia" muted loop playsInline preload="metadata"/>
                 ) : (
                <img src={src} alt="" draggable={false} className="vx-shotMedia"/>
                 )}
                <div className="vx-shotMask" aria-hidden>
                <span>
                 🜲
                </span>
                <span>
                 HOLD TO REVEAL</span>
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
  
  useEffect(()  => {
  const tick = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
                };
      tick();
  const id = window.setInterval(tick, 1000);
         return () => window.clearInterval(id);
           },[]);

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
                <style>{CSS}</style>
                <header className="vx-hud">
                <a href="#top" className="vx-brand">
                <img src={LOGO} alt="USER FX" />
                <span className="vx-live" />
                <span>
                 | Priv Vault |</span>
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
                   𝐔𝐒𝐄𝐑⭑🜲𝓕𝐗 <i/> Priv⭑Vault<i/> Official
                 </p>
                 <h1 className="vx-title">
             <Scramble text="ACCESS" className="vx-access" delay={160}/>
                 <img src={ICONS.corona} alt="" className="vx-subIcon" draggable={false}/>
             <Scramble text="RESTRICTED" className="vx-rest" delay={420}/>
                 </h1>
                 <p className="vx-p vx-pNormal">
                  There are images that were never meant to be seen..
                 </p>
                 <p className="vx-p">
                 <strong> 
                  USER<span> 
                  🜲 FX </span> <i/> 
                   —ᴘʀɪᴠᴀᴛᴇ ᴠᴀᴜʟᴛ— </strong>
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
                 <aside className="vx-lock">
                 <div className="vx-frameA" />
                 <div className="vx-frameB" />
                 <div className="vx-lockCard">
                 <div className="vx-lockVideo">
                 <video key={LOCK_VIDEOS[lockVideo]} src={LOCK_VIDEOS[lockVideo]} autoPlay muted playsInline preload="metadata" onEnded={() => setLockVideo((current) => (current + 1) % LOCK_VIDEOS.length)}/>
                 <span className="vx-lockVideoTag">
                  PRIVATE PREVIEW</span>
                 </div>
                 <button type="button" className="vault-unlock" onClick={() => setDm(true)}>
                 <span className="vault-unlock__icon">
                 < svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 </svg>
                 </span>
                 <span className="vault-unlock__text">
                 <span className="vault-unlock__title">
                   UNLOCK ALBUM</span>
                 </span>
                 </button>
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
            </ Reveal>{" "}
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
                 <p className="vx-goldk">◈ INSIDE THE VAULT</p>
                 <h2 className="vx-insideTitle">
                    WHAT&apos;S <span>
                    INSIDE</span>
                 </h2>
                 <p className="vx-lead">
                   You’re only seeing part of it. Every Friday at 22:00 UTC a new drop
                   is added. This is just a glimpse of <strong>«Nocturna».</strong>
                 </p>
                 </div>
                 <div className="vx-count">
                 <p>DROP IN</p>
                 <strong>{countdown}</strong>
                 <p>FRIDAY · 22:00 UTC</p>
                 </div>
             </Reveal>
                 <div className="vx-archive">
                  {INSIDE.map((src, i) => (
             <Reveal key={src} delay={i * 70}>
             <HoldShot src={src} />
             </Reveal>
                 ))}
                 </div>
                 </section>
                 <section id="faq" className="vx-sec">
             <Reveal>
                 <p className="vx-goldk">
                   ◈ ᴘʀɪᴠᴀᴛᴇ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ</p>
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
          USER<span> 🜲FX </span>
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
         ᴅɪɢɪᴛᴀʟ ᴀʀᴄʜɪᴠᴇ</a>
        </div>
        </div>
       </div>
       <p className="vx-legal">
       18+ CONTENT · PERSONAL & NON-TRANSFERABLE
       Access to Vault is personal, confidential and non-transferable. Sharing, reselling, recording, screenshotting, downloading, copying, reproducing, reposting or redistributing Vault content outside the platform is strictly prohibited, including through Telegram, social media, messaging apps, websites, cloud storage or file-sharing services.
       Unauthorized disclosure or distribution may result in immediate termination of access without refund, subject to applicable consumer rights under Ontario law.
       All content remains protected by applicable Canadian copyright law, including the **Copyright Act, R.S.C. 1985, c. C-42**. Unauthorized reproduction or distribution may constitute copyright infringement and may result in civil remedies, including damages or injunctions.
       Digital purchases are generally final once access has been delivered, except where a refund is required by applicable law, including applicable rights under Ontario’s **Consumer Protection Act, 2002**.
      </p>
      <div className="vx-bar">
      <span>
       ᴠɪᴀ ᴛᴇʟᴇɢʀᴀᴍ | ᴄᴏᴅᴇᴅ ᴀᴄᴄᴇss | ᴛᴇʟᴇɢʀᴀᴍ | ʙᴏᴛ
       ᴛᴇʟᴇɢʀᴀᴍ | ᴠɪᴅᴇᴏᴄᴀʟʟ | ꜰx | ᴄʟᴏsᴇᴅ ᴄɪʀᴄᴜɪᴛ |
       ᴡᴇʙꜱɪᴛᴇ 𝟮𝟬𝟮𝟲 | ᴛᴏʀᴏɴᴛᴏ, ᴄᴀɴᴀᴅᴀ | ᴀʟʟ ʀɪɢʜᴛꜱ
       ʀᴇꜱᴇʀᴠᴇᴅ |
      </span>
      <span>ᴄᴏᴅᴇ | @ᴜꜱᴇʀ𝟣𝟪ꜰx_ʙᴏᴛ</span>
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
      <img src={ICONS.corona} alt="" className="vx-modalCrown" draggable={false}/>
      </div>
      <p className="vx-modalKicker">
        𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT
      </p>
      <h3 className="vx-modalTitle">
        <span className="vx-modalTitleShimmer">ACCESS RESTRICTED</span>
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
const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@500;600;700&display=swap");
html,body,#root{margin:0;padding:0;min-height:100%;background: #07060a}
.vx{--ink: #07060a;--bone: #f4eee4;--dim: #b7aebc;--faint: #7a7286;--gold: #e0b85a; --rose: #b94a5c; --line: #ece5d824; --display:"Cormorant Garamond",Georgia,serif;--mono:"JetBrains Mono",ui-monospace,monospace;color:var(--bone);font-family:var(--display);background: #07060a;min-height:100dvh}
.vx-reveal{opacity:.2;transform:translateY(26px);filter:brightness(.55);transition:opacity .75s ease,transform .75s ease,filter .75s ease}
.vx-reveal.is-on{opacity:1;transform:none;filter:none}
/*HUD*/
.vx-ticker{
  position:relative;
  overflow:hidden;
  height:34px;
  border-top:1px solid #73b2ff92;
  border-bottom:1px solid #73b2ff92;
  background:
    linear-gradient(
      90deg,
      #3b83f682,
      #3a41606b 18%,
      #5d5f6080,
      #3a41606b 62%,
      #376dff91 ),
    url("/assets/damask.png");
  background-size:auto, 180px;
  background-repeat:no-repeat, repeat;
  background-position:center, center;
  box-shadow:
      inset 0 1px 0 #f4eee409,
    inset 0 -1px 0 #0000008c,
    0 8px 26px #00000033;
}
.vx-ticker::before,
.vx-ticker::after{
  content:"";
  position:absolute;
  top:0;
  bottom:0;
  z-index:2;
  width:72px;
  pointer-events:none;}
.vx-ticker::before{
  left:0;
  background:linear-gradient(90deg, rgb(25, 22, 35), transparent);}
.vx-ticker::after{
  right:0;
  background:linear-gradient(-90deg, #07060a, transparent);}
.vx-tickerTrack{
  display:flex;
  width:max-content;
  white-space:nowrap;
  animation:vxL 44s linear infinite;
  font-family:var(--mono);
  font-size:10px;
  font-weight:600;
  letter-spacing:.24em;
  line-height:34px;
  color:rgba(244,238,228,.68);
  text-transform:uppercase;
  text-shadow:0 0 10px rgba(96,165,250,.12);}
.vx-tickerTrack span{
  display:inline-block;
  padding-right:48px;}
.vx-tickerTrack span::first-letter{
  color:var(--gold);}
.vx-ticker.is-rev{
  border-top-color: #fdbf2fa8;
  border-bottom-color: #fdbf2fa8;
  background:
    linear-gradient(
      90deg,
      #fbcd62d1,
      #60563a6b 8%,
      #605f5d80,
      #60563a6b 65%,
      #fbcd62d1);}
.vx-ticker.is-rev .vx-tickerTrack{
  animation-name:vxR;
  color:rgba(240, 236, 228, 0.72);
  text-shadow:0 0 12px rgba(224, 184, 90, 0.24);}
.vx-ticker:hover .vx-tickerTrack{
  animation-play-state:paused;
}
@keyframes vxL{to{transform:translateX(-50%)}}
@keyframes vxR{from{transform:translateX(-50%)}to{transform:translateX(0)}}
.vx-hud{ position:sticky;
  top:0;
  z-index:30;
  display:flex;
  justify-content:space-between;
  align-items:center;
  height:52px;
  padding:0 16px;
  overflow:hidden;
  border-bottom:1px solid #e0b85c57;
  background:
    linear-gradient(90deg,
      #081221eb,
      #122b46db,
      #081221eb),
    url("/assets/damask.png");
  background-size:auto, 230px;
  background-repeat:no-repeat, repeat;
  background-position:center;
  box-shadow:
    inset 0 -1px 0 #e0b85a1f,
    0 6px 22px #00000061;
  backdrop-filter:blur(8px);
}
  .vx-visitorCount{
  font-family:var(--mono);
  font-size:10px;
  letter-spacing:.16em;
  color:var(--dim);
  white-space:nowrap;
}
.vx-brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;font-family:var(--mono);font-size:10px;letter-spacing:.22em}
.vx-brand img{height:28px}
.vx-live{width:6px;height:6px;border-radius:50%;background:var(--rose);box-shadow:0 0 10px #dd334f}
.vx-hudRight{display:flex;gap:10px;align-items:center;font-family:var(--mono);font-size:10px;letter-spacing:.16em;color:var(--dim)}
.vx-hudRight b{border:1px solid #ed1a3d91;color: #943243d2;padding:4px 8px;font-weight:600}
.vx-open{position:relative;overflow:hidden;padding:36px 16px 48px}
.vx-bg{position:absolute;inset:0;pointer-events:none}
.vx-damask{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.vx-brick{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.12}
.vx-blob{position:absolute;border-radius:50%}
.vx-blobA{left:-160px;top:-160px;width:640px;height:640px;background:radial-gradient(circle,rgba(59,130,246,.22),transparent 62%)}
.vx-blobB{right:-180px;top:20%;width:560px;height:560px;background:radial-gradient(circle,rgba(192,45,90,.24),transparent 62%)}
.vx-grid{position:relative;z-index:1;max-width:72rem;margin:0 auto;display:grid;gap:36px}
@media(min-width:960px){.vx-grid{grid-template-columns:1.05fr .7fr;align-items:end}}
.vx-logoWrap img{width:min(420px,90vw);filter:drop-shadow(0 0 28px #1863dc9f)}
.vx-kicker{display:flex;align-items:center;gap:10px;margin:22px 0 0;font-family:var(--mono);font-size:11px;letter-spacing:.28em;color: #bedbff}
.vx-kicker i{width:40px;height:1px;background: #0a66d699}
.vx-access,
.vx-access{font-size:clamp(3rem,10vw,6.4rem);font-weight:600}
/*Title*/
.vx-rest{
  display:block;
  margin-top:.08em;
  font-size:clamp(2.8rem,9vw,4.8rem);
  font-weight:300;
  font-style:italic;
  letter-spacing:-.025em;
  color:#b64b5d;
  text-shadow:0 0 18px #b64b5d;
}
text-shadow:0 0 18px #b64b5d2e;}
.vx-p{max-width:36rem;color:var(--dim);line-height:1.65}
.vx-p strong,.vx-p em{color:var(--blue) }
@media(min-width:960px){.vx-lock{justify-self:start;}}
.vx-frameA,.vx-frameB{position:absolute;inset:-10px;pointer-events:none}
.vx-frameA{transform:translate(10px,10px);border:1px solid rgba(96,165,250,.15)}
.vx-frameB{transform:translate(-8px,-8px);border:1px solid rgba(163,68,85,.12)}
.vx-dossier{
  width:100%;
  max-width:34rem;
  margin-top:28px;
  border:1px solid rgba(224,184,90,.24);
  background:
    linear-gradient(rgba(7,6,10,.64), rgba(7,6,10,.84)),
    url("/assets/damask.png");
  background-size:auto, 210px;
  background-repeat:no-repeat, repeat;
  box-shadow:
    inset 0 1px 0 rgba(244,238,228,.04),
    0 12px 28px rgba(0,0,0,.18);
}
.vx-dossierHead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  min-height:34px;
  padding:0 12px;
  border-bottom:1px solid rgba(224,184,90,.2);
  color:var(--gold);
  font-family:var(--mono);
  font-size:8px;
  font-weight:700;
  letter-spacing:.2em;
}
.vx-dossierHead i{
  color:var(--rose);
  font-size:7px;
  font-style:normal;
  letter-spacing:.16em;
}
.vx-dossierGrid{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
}
.vx-dossierItem{
  min-width:0;
  min-height:76px;
  padding:12px;
  border-right:1px solid rgba(236,229,216,.1);
  border-bottom:1px solid rgba(236,229,216,.1);
}
.vx-dossierItem:nth-child(even){
  border-right:0;
}
.vx-dossierItem small{
  display:block;
  margin-bottom:8px;
  color:var(--faint);
  font-family:var(--mono);
  font-size:8px;
  font-weight:600;
  letter-spacing:.16em;
}
.vx-dossierItem strong{
  display:block;
  overflow:hidden;
  color:var(--bone);
  font-family:var(--mono);
  font-size:10px;
  font-weight:600;
  letter-spacing:.08em;
  line-height:1.45;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.vx-dossierDrop strong{
  color:var(--gold);
  font-size:12px;
}
.vx-dossierCode{
  grid-column:1 / -1;
  min-height:64px;
  border-right:0;
  border-bottom:0;
  background:rgba(185,74,92,.06);
}
.vx-dossierCode strong{
  color:rgba(244,238,228,.82);
  letter-spacing:.18em;
}
@media(max-width:420px){
  .vx-dossierItem{
    min-height:70px;
    padding:10px;
  }
  .vx-dossierItem strong{
    font-size:9px;
    letter-spacing:.04em;
  }
  .vx-dossierDrop strong{
    font-size:11px;
  }}
/* Card-Video */
:root {
  --line: #2a2a3a;
  --faint: #888899;
  --mono: 'Courier New', monospace;
}

/* ---- Lock Card Container ---- */
.vx-lockCard {
  position: relative;
  width: 300px;
  padding: 22px 16px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background-color: #09070c;
  background-image:
    linear-gradient(
      170deg,
      rgba(36, 41, 60, 0.8) 0%,
      rgba(7, 6, 10, 0.83) 100%
    ),
    url("/assets/damask.png");
  background-size: auto, 260px;
  background-repeat: no-repeat, repeat;
  background-position: center, center;
  text-align: center;
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(244, 238, 228, 0.17),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    0 14px 34px rgba(0, 0, 0, 0.38),
    0 4px 12px rgba(0, 0, 0, 0.25);
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}

.vx-lockCard:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(244, 238, 228, 0.22),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    0 18px 42px rgba(0, 0, 0, 0.45),
    0 6px 16px rgba(0, 0, 0, 0.3);
}

/* ---- Decorative top accent line ---- */
.vx-lockCard::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(140, 160, 200, 0.4), transparent);
  border-radius: 1px;
}

/* ---- Corner accents ---- */
.vx-lockCard::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(140, 160, 200, 0.3), transparent);
  border-radius: 1px;
}

/* ---- Lock area (video/image wrapper) ---- */
.vx-lock {
  position: relative;
  width: min(100%, 300px);
  transform: translateX(-2px);
  border-radius: 2px;
  overflow: hidden;
}
/* ---- Video/Image Frame ---- */
.vx-lock video,
.vx-lock img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 2px;
  filter: saturate(0.7) brightness(0.85) contrast(1.05);
  transition: filter 0.4s ease;
}
.vx-lock:hover video,
.vx-lock:hover img {
  filter: saturate(0.85) brightness(0.9) contrast(1.08);
}
/* ---- Frame Overlays (decorative borders) ---- */
.vx-frameA,
.vx-frameB {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 2;
}
.vx-frameA {
  border: 1px solid rgba(140, 160, 200, 0.12);
  border-radius: 2px;
  /* Inner shadow for depth */
  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.3),
    inset 0 0 60px rgba(0, 0, 0, 0.15);
}
.vx-frameB {
  border: 1px solid rgba(140, 160, 200, 0.06);
  border-radius: 2px;
  /* Subtle vignette */
  background: radial-gradient(
    ellipse at center,
    transparent 50%,
    rgba(0, 0, 0, 0.25) 100%
  );}
/* ---- Title (h2) ---- */
.vx-lockCard h2 {
  margin: 10px 0 0;
  padding-bottom: 15px;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--faint);
  opacity: 0.65;
  line-height: 1;
}
/* ---- Subtitle / Description (p) ---- */
.vx-lockCard > p {
  margin: 10px 0 0;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  color: var(--faint);
  line-height: 1.4;
}
/* ---- Unlock Button ---- */
.vx-lockCard .vx-unlockBtn {
  display: inline-block;
  margin-top: 14px;
  padding: 8px 24px;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(220, 225, 240, 0.9);
  background: linear-gradient(
    180deg,
    rgba(60, 70, 100, 0.35) 0%,
    rgba(35, 40, 60, 0.5) 100% );
  border: 1px solid rgba(120, 140, 180, 0.2);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.vx-lockCard .vx-unlockBtn:hover {
  background: linear-gradient(
    180deg,
    rgba(80, 90, 130, 0.45) 0%,
    rgba(50, 55, 80, 0.6) 100% );
  border-color: rgba(140, 160, 200, 0.3);
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}
.vx-lockCard .vx-unlockBtn:active {
  transform: translateY(0);
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
/* ---- Status indicator (locked badge) ---- */
.vx-lockCard .vx-status {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--mono);
  font-size: 7px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c06060;
  opacity: 0.7;
  z-index: 3;
}
.vx-lockCard .vx-status::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c06060;
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
/* ---- Timestamp (top-right) ---- */
.vx-lockCard .vx-time {
  position: absolute;
  top: 8px;
  left: 8px;
  font-family: var(--mono);
  font-size: 7px;
  letter-spacing: 0.08em;
  color: rgba(140, 160, 200, 0.4);
  z-index: 3;
}
/* ---- Card inner glow effect ---- */
.vx-lockCard .vx-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(
    180deg,
    rgba(100, 130, 200, 0.04) 0%,
    transparent 100% );
  pointer-events: none;
  z-index: 1;
}
/* ---- Responsive adjustments ---- */
@media (max-width: 340px) {
  .vx-lockCard {
    width: 100%;
    padding: 16px 12px; }
  .vx-lockCard h2 {
    font-size: 7px;
    padding-bottom: 10px;}
  .vx-lockCard > p {
    font-size: 7px;}
}
.vx-gold{width:70%;height:46px;border:2px solid  #7b611dcb; background:linear-gradient(180deg, #9d884a, #c9a24b 48%, #8d6a28);color: #1c1508;font-family:var(--mono);font-size:11px;letter-spacing:.018em;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.vx-protocolReveal.is-on .vx-stepNum{opacity:.7; color: #eaaf26; text-shadow:0 0 18px #e0b85a29;}
.vx-benefitIcon{ width:18px; height:18px; flex:0 0 18px; object-fit:contain;  opacity:.9;}
.vx-stepNum{ opacity:.5; transition: opacity .7s ease, color .7s ease, text-shadow .7s ease;}
.vx-shotMask{ position:absolute;inset:0; display:flex; flex-direction:column;  align-items:center; justify-content:center; gap:6px; background:rgba(7,6,10,.42);  color: #f4eee499; font-family:var(--mono);  font-size:9px; letter-spacing:.18em;  transition:opacity .25s ease;}
.vx-shot.is-open .vx-shotMedia{filter:none; transform:scale(1);}
.vx-shot.is-open .vx-shotMask{ opacity:0;}
.vx-shot{ position:relative; width:100%; aspect-ratio:3 / 4; overflow:hidden; border:1px solid var(--line); background: #0a090e; cursor:pointer; touch-action:none; user-select:none;}
.vx-shotMedia{ width:100%; height:100%; display:block; object-fit:cover;pointer-events:none; filter:blur(14px) grayscale(1) brightness(.4); transform:scale(1.12); transition:filter .25s ease, transform .25s ease;}
.vx-sec{max-width:56rem;margin:0 auto;padding:72px 16px;border-top:1px solid var(--line)}
.vx-tint{max-width:none;padding-left:max(16px,calc(50% - 36rem));padding-right:max(16px,calc(50% - 36rem));background:rgba(13,11,18,.4)}
.vx-goldk{margin:0;font-family:var(--mono);font-size:11px;letter-spacing:.3em;color:var(--gold); font-weight:900}
.vx-sec h2{margin:10px 0 0;font-size:clamp(2.2rem,7vw,3.6rem);line-height:.95;font- font-size: bold; weight:500}
.vx-sec h2.vx-insideTitle span{ display:inline; margin-left:.12em; color:#b64b5d; font-style:italic;}
.vx-step{
  position:relative;
  display:grid;
  grid-template-columns:72px 1fr;
  gap:16px;
  margin-top:12px;
  padding:22px 18px;
  border:1px solid var(--line);
  background-color: #042d7f8c;
  background:
    linear-gradient( #0252b381, #023d824c),
    url("/assets/damask.png");
  background-size:auto, 240px;
  background-repeat:no-repeat, repeat;
  background-position:center, center;
  box-shadow:inset 0 1px 0 #f5efe608;
  transition:
    border-color .3s ease,
    transform .3s ease,
    background-color .3s ease;
}
    .vx-step:hover{
  border-color: #e0b85a61;
  transform:translateX(4px);
  background-color: #07060aad;
}
.vx-step b{font-size:3rem;font-weight:300;font-style:italic;color:rgba(224,184,90,.35);line-height:1}
.vx-step h3{margin:0;font-family:var(--mono);font-size:11px;letter-spacing:.22em;color:var(--gold)}
.vx-step p,.vx-lead,.vx-faq p{color:var(--dim);line-height:1.7}
.vx-step small{display:none}
.step-text { font-family: Arial, sans-serif; font-style: normal;}
.vx-shotMedia{
  width:100%;
  height:100%;
  display:block;
  object-fit:cover;
  pointer-events:none;
  filter:blur(14px) grayscale(1) brightness(.4);
  transform:scale(1.12);
  transition:filter .25s ease,transform .25s ease;
}
.vx-shot.is-open .vx-shotMedia,
.vx-shot:hover .vx-shotMedia{
  filter:none;
  transform:none;
}
.vx-shotMask{
  position:absolute;
  inset:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:6px;
  background: #07060a66;
  color: #f4eee48c;
  font-family:var(--mono);
  font-size:8px;
  letter-spacing:.18em;
  transition:opacity .25s ease;
}
.vx-shot.is-open .vx-shotMask,
.vx-shot:hover .vx-shotMask{
  opacity:0;
  }
.vx-archive{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:32px;}
@media(min-width:700px){
.vx-archive{ grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px;}}
@media(min-width:1100px){
.vx-archive{ grid-template-columns:repeat(6,minmax(0,1fr)); gap:24px;}}
@media(hover:hover){
.vx-shot:hover .vx-shotMedia{ filter:none; transform:scale(1);} 
.vx-shot:hover .vx-shotMask{ opacity:0;}}
@media(min-width:900px){.vx-step small{display:block;position:absolute;right:0;top:50%;transform:translateY(-50%);font-family:var(--mono);font-size:9px;letter-spacing:.2em;color:var(--faint)}}
.vx-shift{margin-left:0}
@media(min-width:900px){.vx-shift{margin-left:4rem}}
.vx-lead{max-width:32rem}
.vx-count{margin:22px 0;padding:16px;border:1px solid var(--line);width:fit-content;font-family:var(--mono)}
.vx-count p{margin:0;font-size:9px;letter-spacing:.22em;color:var(--faint)}
.vx-count strong{display:block;margin:6px 0;font-size:2rem;color:var(--rose)}

 .vx-planSelector{
  display:grid;
  grid-template-columns:220px minmax(0, 1fr);
  gap:16px;
  margin-top:28px;
  min-height:300px;
}
.vx-planButtons{
  display:grid;
  gap:10px;
  align-content:start;
}
.vx-planSelect{
  position:relative;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  min-height:88px;
  padding:14px 16px;
  overflow:hidden;
  border:1px solid rgba(236,229,216,.16);
  background:
    linear-gradient(rgba(7,6,10,.7), rgba(7,6,10,.9)),
    url("/assets/damask.png");
  background-size:auto, 160px;
  background-repeat:no-repeat, repeat;
  background-position:center;
  color:var(--bone);
  text-align:left;
  cursor:pointer;
  transition:
    border-color .25s ease,
    transform .25s ease,
    background-color .25s ease;
}
.vx-planSelect:hover,
.vx-planSelect.is-active{
  border-color:#4e7db3b8;
  background-color:rgba(31, 117, 171, 0.28);
  transform:translateX(5px);
}
.vx-planSelectTab{
  color:var(--gold);
  font-family:var(--mono);
  font-size:8px;
  font-weight:700;
  letter-spacing:.18em;
}
.vx-planSelect strong{
  margin:7px 0 4px;
  color:var(--bone);
  font-family:var(--display);
  font-size:1.8rem;
  font-style:italic;
  font-weight:500;
  line-height:.9;
}
.vx-planSelect small{
  color:var(--faint);
  font-family:var(--mono);
  font-size:8px;
  letter-spacing:.14em;
}
.vx-planSelectRose{
  position:absolute;
  right:12px;
  top:50%;
  width:32px;
  height:32px;
  object-fit:contain;
  transform:translateY(-50%);
  filter:drop-shadow(0 0 8px #115a9675);
}
.vx-planPanel{
  position:relative;
  display:none;
  width:100%;
  max-width:380px;
  min-height:230px;
  padding:18px 20px;
  overflow:hidden;
  border:1px solid #607fceba;
  background:
    linear-gradient( #325a8b57, #2e5c9157),
    url("/assets/damask.png");
  background-size:auto, 210px;
  background-repeat:no-repeat, repeat;
  background-position:center;
  box-shadow:
    inset 0 1px 0 rgba(244,238,228,.06),
    0 14px 30px rgba(7, 75, 123, 0.23);

  animation:vx-planPanelIn .28s ease both;
}
.vx-planPanel.is-active{
  display:block; justify-self:start;
}
.vx-planPanel em{
  position:absolute;
  top:16px;
  right:18px;
  color:var(--gold);
  font-family:var(--mono);
  font-size:8px;
  font-style:normal;
  letter-spacing:.12em;
}
.vx-planPanelTab{
  color:var(--gold);
  font-family:var(--mono);
  font-size:9px;
  font-weight:700;
  letter-spacing:.2em;
}
.vx-planPanel h3{
  margin:8px 0 4px;
  color:var(--bone);
  font-family:var(--display);
  font-size:clamp(2.2rem,5vw,3.2rem);
  font-style:italic;
  font-weight:500;
  line-height:.9;
}
.vx-planPanelTime{
  margin:0;
  color:var(--rose);
  font-family:var(--mono);
  font-size:9px;
  letter-spacing:.14em;
}
.vx-planPanel ul{
  display:grid;
  gap:7px;
  margin:14px 0;
  padding:0;
  list-style:none;
}
.vx-planPanel li{
  display:flex;
  align-items:center;
  gap:9px;
  color:var(--dim);
  font-size:.9rem;
}
.vx-planPanel .vx-gold{
  width:100%;
  height:44px;
  margin:0;
  font-size:9px;
}
@keyframes vx-planPanelIn{
  from{ opacity:0; transform:translateX(10px);}
  to{
    opacity:1; transform:none;
  }}
@media(max-idth:700px){
  .vx-planSelector{
    grid-template-columns:1fr;
    min-height:0;
  }
  .vx-planButtons{
    grid-template-columns:repeat(3, minmax(0, 1fr));
  }
  ..vx-planSelect{
  position:relative;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  min-height:88px;
  padding:14px 16px;
  overflow:hidden;
  border:1px solid #4484ae29;
  background-color:#07060a;
  background-image:
    linear-gradient(
      #0e48828c ),
      #054d9ac7 ),
  url("/assets/damask.png");
  background-size:auto, 160px;
  background-repeat:no-repeat, repeat;
  background-position:center, center;
  color:var(--bone);
  text-align:left;
  cursor:pointer;
  transition:
  border-color .25s ease,
  transform .25s ease,
  background-color .25s ease;
}
  .vx-planSelect strong{
    font-size:1.3rem;
  }
  .vx-planSelectRose{
    width:25px;
    height:25px;
    right:7px;
  }
  .vx-planPanel{
    min-height:0;
    padding:22px 18px;
  }}
    .vx-planSelect:hover,
.vx-planSelect.is-active{
  border-color:rgba(224,184,90,.72);
  background-image:
    linear-gradient(
      rgba(7,6,10,.35),
      rgba(7,6,10,.62)),
    url("/assets/damask.png");
  transform:translateX(5px);
}
.vx-archive{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.vx-archiveHead{ display:grid; gap:28px; align-items:end;}
@media(min-width:760px){
.vx-archiveHead{ grid-template-columns:1fr auto;}}
.vx-archiveHead .vx-count{ justify-self:start;}
@media(min-width:760px){.vx-archiveHead .vx-count{justify-self:end;}}
@media(min-width:700px){.vx-archive{grid-template-columns:repeat(3,1fr)}}
@media(min-width:1100px){.vx-archive{grid-template-columns:repeat(6,1fr)}}
.vx-shot{position:relative;aspect-ratio:3/4;overflow:hidden;border:1px solid var(--line);cursor:pointer;touch-action:none;user-select:none}
.vx-shot img{width:100%;height:100%;object-fit:cover;pointer-events:none;filter:blur(14px) grayscale(1) brightness(.4);transform:scale(1.12);transition:.25s ease}
.vx-shotMask{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(7,6,10,.4);color:rgba(244,238,228,.55);font-family:var(--mono);font-size:8px;letter-spacing:.18em}
.vx-shot em{position:absolute;left:8px;bottom:6px;font-style:normal;font-family:var(--mono);font-size:9px;color:rgba(244,238,228,.45)}
.vx-shot.is-open img,.vx-shot:hover img{filter:none;transform:none}
.vx-shot.is-open .vx-shotMask,.vx-shot:hover .vx-shotMask{opacity:0}
.vx-faq{margin-top:18px;border-top:1px solid var(--line)}
.vx-faqItem{border-bottom:1px solid var(--line)}
.vx-faqItem button{width:100%;display:grid;grid-template-columns:42px 1fr 18px;gap:10px;padding:16px 0;border:0;background:none;color:var(--bone);text-align:left;cursor:pointer;font-family:var(--display);font-size:1.05rem}
.vx-faqItem b{color:rgba(49, 163, 229, 0.78);font-style:italic;font-weight:400}
.vx-faqItem p{margin:0;padding:0 0 16px 52px}
@media(min-width:900px){.vx-footGrid{grid-template-columns:1.2fr .8fr}}
.vx-links{ display:flex; flex-wrap: wrap;gap:8px; margin-top:1px}
.vx-links a{border:1px solid #2166ba9c; padding:8px 10px;color: #73b2ff3b; text-decoration:none; font-family:var(--mono); font-size:10px; letter-spacing:.016em}

vx-bar{max-width:72rem;margin:24px auto 0;padding-top:14px;border-top:1px solid var(--line);display:flex;justify-content:space-between}
/* MODAL — PRIVATE VAULT ═════════════════ */
.vx-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(9, 77, 136, 0.88);
  backdrop-filter: blur(12px);
  animation: vx-modalIn 0.3s ease both;
}
.vx-modalCard {
  position: relative;
  width: min(100%, 420px);
  overflow: hidden;
  padding: 48px 32px 36px;
  border: 1px solid rgba(90, 108, 224, 0.3);
  background:
    linear-gradient(170deg, rgba(15, 12, 18, 0.92), rgba(7, 6, 10, 0.97)),
    url("/assets/damask.png");
  background-size: auto, 260px;
  background-repeat: no-repeat, repeat;
  background-position: center;
  text-align: center;
  border-radius: 6px;
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(224, 184, 90, 0.08),
    inset 0 1px 0 rgba(244, 238, 228, 0.06);
  animation: vx-modalCardIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
}
/* ── esquinas decorativas ── */
.vx-modalCard::before,
.vx-modalCard::after {
  content: "";
  position: absolute;
  width: 40px;
  height: 40px;
  pointer-events: none;
}
.vx-modalCard::before {
  top: 12px;
  left: 12px;
  border-top: 1px solid rgba(224, 184, 90, 0.6);
  border-left: 1px solid rgba(224, 184, 90, 0.6);
}
.vx-modalCard::after {
  right: 12px;
  bottom: 12px;
  border-right: 1px solid rgba(185, 74, 92, 0.6);
  border-bottom: 1px solid rgba(185, 74, 92, 0.6);
}
/* ── partículas doradas flotantes ── */
.vx-modalParticles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.vx-modalParticles span {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(224, 184, 90, 0.5);
  box-shadow: 0 0 6px rgba(224, 184, 90, 0.3);
  animation: vxFloat linear infinite;
  opacity: 0;
}
.vx-modalParticles span:nth-child(1) {
  left: 15%;
  bottom: -4px;
  animation-duration: 4.5s;
  animation-delay: 0s;
}
.vx-modalParticles span:nth-child(2) {
  left: 35%;
  bottom: -4px;
  animation-duration: 5.2s;
  animation-delay: 0.8s;
}
.vx-modalParticles span:nth-child(3) {
  left: 55%;
  bottom: -4px;
  animation-duration: 4s;
  animation-delay: 1.5s;
  width: 2px;
  height: 2px;
}
.vx-modalParticles span:nth-child(4) {
  left: 72%;
  bottom: -4px;
  animation-duration: 5.8s;
  animation-delay: 0.3s;
}
.vx-modalParticles span:nth-child(5) {
  left: 88%;
  bottom: -4px;
  animation-duration: 4.8s;
  animation-delay: 2s;
  width: 2px;
  height: 2px;
}
@keyframes vxFloat {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  15% {
    opacity: 0.7;
  }
  85% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(-320px) scale(0.3);
    opacity: 0;
  }
}
/* ── botón cerrar ── */
.vx-modalClose {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 2;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--dim, #888);
  font-family: var(--mono, monospace);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease,
    transform 0.25s ease;
}
.vx-modalClose:hover {
  border-color: rgba(185, 74, 92, 0.5);
  background: rgba(185, 74, 92, 0.08);
  color: #e0546c;
  transform: rotate(90deg);
}
@keyframes vxPulse {
  0%, 100% {box-shadow: 0 0 0 0 rgba(224, 184, 90, 0.15);}
  50% {box-shadow: 0 0 0 12px rgba(224, 184, 90, 0);
  }}
/* ── kicker ── */
.vx-modalKicker {
  margin: 0;
  color: var(--gold, #d4a83a);
  font-family: var(--mono, monospace);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
/* ── título con shimmer ── */
.vx-modalTitle {
  margin: 14px 0 12px;
  color: var(--bone, #f4eee4);
  font-family: var(--display, serif);
  font-size: clamp(2rem, 8vw, 2.8rem);
  font-style: italic;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 0.95;
}
.vx-modalTitleShimmer {
  position: relative;
  display: inline-block;
  background: linear-gradient(
    120deg,
    var(--bone, #f4eee4) 30%,
    rgba(224, 184, 90, 0.85) 50%,
    var(--bone, #f4eee4) 70%
  );
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: vxShimmer 4s ease-in-out infinite;
}
@keyframes vxShimmer {
  0%, 100% { background-position: 150% center;
  }
  50% { background-position: -50% center;
  }}
/* ── texto descriptivo ── */
.vx-modalText {
  max-width: 280px;
  margin: 0 auto;
  color: var(--dim, #888);
  font-family: var(--mono, monospace);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  line-height: 1.75;
}
/* ── divisor ── */
.vx-modalDivider {
  width: 40px;
  height: 1px;
  margin: 22px auto 0;
  background: linear-gradient(90deg, transparent, rgba(224, 184, 90, 0.4), transparent);
}
/* ── botón principal (DM) ── */
.vx-modalLink {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: auto;
  min-height: 40px;
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid rgba(212, 168, 58, 0.6);
  border-radius: 3px;
  background: transparent;
  color: #f6d77a;
  font-family:"Inter", system-ui, sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-decoration: none;
  text-transform: uppercase;
  cursor: pointer;
  isolation: isolate;
  transition:
    color 0.3s ease,
    border-color 0.3s ease,
    transform 0.25s ease,
    box-shadow 0.3s ease;
    padding: 0 20px;
    box-sizing:border-box;
  margin-left:auto;
  margin-right:auto;

    gap:16px;
  font-family:var(--mono);
  font-size:9px;
  font-weight:600;
  letter-spacing:.16em;
  line-height:1.6;
  color:var(--dim);
}
.vx-modalLinkBg {
  position: absolute;
  inset: 0;
  z-index: -2;
  background: linear-gradient(180deg, #f6d77a, #b8861f);
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.vx-modalLinkContent {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: color 0.3s ease;
}
.vx-modalLinkIcon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}
.vx-modalLink:hover {
  border-color: #f6d77a;
  color: #1a0d05;
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgba(224, 184, 90, 0.2),
    0 0 0 1px rgba(224, 184, 90, 0.1);
}
.vx-modalLink:hover .vx-modalLinkBg {
  transform: scaleY(1);
}
.vx-modalLink:hover .vx-modalLinkContent {
  color: #1a0d05;
}
.vx-modalLink:hover .vx-modalLinkIcon {
  transform: scale(1.1);
}
.vx-modalLink:active {
  transform: translateY(0) scale(0.98);
}
/* ── footer texto ── */
.vx-modalFooter {
  margin: 16px 0 0;
  color: rgba(255, 209, 102, 0.54);
  font-family: var(--mono, monospace);
  font-size: 8.5px;
  letter-spacing: 0.12em;
}
/* ── animaciones de entrada ── */
@keyframes vx-modalIn {from { opacity: 0; } to   { opacity: 1; }
}
@keyframes vx-modalCardIn {
  from { opacity: 0;transform: translateY(20px) scale(0.95); filter: blur(4px);}
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0);
  }}
/* ── responsive ── */
@media (max-width: 520px) {
  .vx-modalCard {
    padding: 44px 20px 28px;
  }
  .vx-modalKicker {
    font-size: 7.5px;
    letter-spacing: 0.14em;
  }
  .vx-modalTitle {
    font-size: clamp(1.8rem, 10vw, 2.4rem);
  }
  .vx-modalText {
    font-size: 10px;
  }
  .vx-modalIcon {
    width: 48px;
    height: 48px;
  }
  .vx-modalIcon svg {
    width: 20px;
    height: 20px;
  }}
.vx-modalCrown{
  width:44px;
  height:44px;
  display:block;
  object-fit:contain;
  filter:
    drop-shadow(0 0 8px rgba(224,184,90,.28));
}
.vx-modalRose{
  width:50px;
  height:50px;
  display:block;
  object-fit:contain;
  flex:0 0 25px;
  transition:transform .3s ease;
}
.vx-modalLink:hover .vx-modalRose{
  transform:rotate(-10deg) scale(1.12);
}
.vx-modalCrown{
  display:block;
  width:44px;
  height:44px;
  margin:0 auto;
  object-fit:contain;
  transform:translateY(-2px);
  filter:drop-shadow(0 0 8px rgba(224,184,90,.28));
}
  .vx-modalLink,
.vx-modalLinkContent{
  font-family:"Inter", system-ui, sans-serif;
  font-size:.85rem;
  font-weight:700;
  letter-spacing:.2em;
  text-transform:uppercase;
}
  .vx-modalLink{
  min-height:40px;
  padding:0 20px;
}
/*candado*/
.vd-lock-prompt-icon .vx-titleCandado{
  width:20px;
  height:20px;
  display:block;
  object-fit:contain;
  pointer-events:none;
}
/*Iconos*//*rosa*/
.vx-buttonIcon{ left:24px; width:50px; height:50px; object-fit:contain;}
.vx-titleRose{ width:45px; height:45px; margin:0 10px; display:inline-block; vertical-align:middle; object-fit:contain; transform:translateY(-2px);}
/*corona*/
.vx-inlineIcon{ width:16px;  height:16px; vertical-align:middle; object-fit:contain;}
.vx-subIcon{ width:65px;  height:65px; vertical-align:middle; object-fit:contain;}
/*coronaButton*/
.vx-planButtonIcon{
  width:37px;
  height:37px;object-fit:contain; flex:0 0 22px; pointer-events:none;}
.vx-planButtonCrown{ margin-right:8px;}
.vx-planButtonFire{ margin-left:8px;}
.vx-planPanel .vx-gold{display:inline-flex; align-items:center;justify-content:center;
}
.vd-option-img{
  width:30px;
  height:30px;
  display:block;
  object-fit:contain;
  pointer-events:none;
}
  .vd-sheet-title{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
}

.vd-sheet-title-icon,
.vd-benefit-img{
  width:18px;
  height:18px;
  display:block;
  object-fit:contain;
  pointer-events:none;
}
/**/
.vd-benefit-icon {
  width: 45px;
  height: 45px;
  flex: 0 0 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vd-benefit-img {
  width: 35px;
  height: 35px;
  display: block;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}
/*Fuego text*/
.vd-benefit-img{
  width:18px;
  height:18px;
  display:block;
  object-fit:contain;
  pointer-events:none;
}
/*line*/
.vx-kicker i.vx-kickerShort{ width:20px; flex-basis:20px;}
/*Fuente*/
.vx-pNormal{ font-family:system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size:18px; font-style:normal; font-weight:350; font-family: var(--display);}
/*Nocturno*/
.vx-lead strong{
  color:var(--rose);
  font-weight:bold;}
/*Get in */
.vx-sec h2 .vx-getIn {
  display: inline;
  margin-left: .12em;
  color: #b64b5d;
  font-style: italic;
  text-shadow: 0 0 18px rgba(182, 75, 93, 0.25);
}
  .vx-sec h2 .vx-theVault{
  display:inline;
  margin-left:.12em;
  color:#b64b5d;
  font-style:italic;
  text-shadow:0 0 18px #b64b5d29;
}
  .vx-sec h2 .vx-codeTitle{
  display:inline;
  margin-left:.12em;
  color:#b64b5d;
  font-style:italic;
  text-shadow:0 0 18px #b64b5d29;
}
.vx-foot{
  position:relative;
  padding:72px 16px 10px;
  border-top:1px solid var(--line);
  background:
    linear-gradient(rgba(7,6,10,.82), rgba(13,11,18,.76)),
    url("/assets/damask.png");
  background-size:auto, 300px;
  background-repeat:no-repeat, repeat;
}
.vx-footGrid{
  position:relative;
  max-width:72rem;
  margin:0 auto;
  display:grid;
  gap:32px;
  padding-bottom:0px;
}
@media(min-width:900px){
  .vx-footGrid{grid-template-columns:1.2fr .8fr;align-items:start;
  }}
.vx-footBrand{
  display:flex;
  align-items:center;
  gap:16px;
}
.vx-footBrand img{
  width:auto;
  height:84px;
  object-fit:contain;
  border:1px solid rgba(96,165,250,.16);
  box-shadow:0 8px 20px rgba(0,0,0,.35);
}
.vx-footBrand p{
  margin:0;
  font-family:var(--mono);
  font-size:15px;
  font-weight:700;
  letter-spacing:.22em;
  color:var(--bone);
}
.vx-footBrand p span{
  color:#60a5fa;
}
.vx-footBrand small{
  display:block;
  margin-top:7px;
  font-family:var(--mono);
  font-size:10px;
  letter-spacing:.3em;
  color:var(--dim);
}
.vx-links{
  display:flex;
  flex-wrap:wrap;
  justify-content:flex-start;
  gap:10px;}
@media(min-width:900px){
.vx-links{justify-content:flex-end;
  }}
.vx-links a{
  display:inline-flex;
  align-items:center;
  min-height:42px;
  border:1px solid var(--line);
  padding:0 14px;
  background:rgba(7,6,10,.4);
  color:var(--dim);
  text-decoration:none;
  font-family:var(--mono);
  font-size:10px;
  letter-spacing:.18em;
  transition:
    color .25s ease,
    border-color .25s ease,
    background .25s ease;
}
.vx-links a:hover{
  border-color:var(--gold);
  background:rgba(224,184,90,.08);
  color:var(--goldhi);
}
.vx-bw{
  margin:18px 0 0;
  font-family:var(--mono);
  font-size:10px;
  letter-spacing:.22em;
  color:rgba(191,219,254,.55);
}
@media(min-width:900px){
  .vx-bw{ text-align:right;}}
.vx-legal{
  width:100%;
  max-width:72rem;
  margin:8px auto 0;
  padding:22px 0 24px;
  border-top:1px solid var(--line);
  border-bottom:1px solid rgba(236,229,216,.08);
  font-family:var(--mono);
  font-size:10px;
  letter-spacing:.14em;
  line-height:1.85;
  color:var(--faint);
  text-transform:uppercase;
}
.vx-bar{
  max-width:72rem;
  margin:22px auto 0;
  padding-top:0;
  border-top:0;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  font-family:var(--mono);
  font-size:9px;
  font-weight:600;
  letter-spacing:.16em;
  line-height:1.6;
  color:var(--dim);
}
.vx-bar span:first-child{
  color:rgba(244,238,228,.82);
}
.vx-bar span:last-child{
  color:var(--goldhi);
  white-space:nowrap;
}
@media(max-width:700px){.vx-foot{ padding-top:52px;}
  .vx-footBrand img{
    height:62px;
  }
  .vx-footBrand p{
    font-size:12px;
  }
  .vx-bar{ flex-direction:column; align-items:flex-start;
  }
  .vx-bar span:last-child{
    white-space:normal;
  }}
.vx-p {
    max-width: 46rem;
    color: var(--blue);
    line-height: 1.65;
}
.vx-lockVideo{
  position:relative;
  width:100%;
  aspect-ratio:2.5 / 3;
  margin:0 0 14px;
  overflow:hidden;
  border:1px solid rgba(224,184,90,.32);
  background:#07060a;
  box-shadow:0 8px 20px rgba(0,0,0,.32);
}
.vx-lockVideo video{
  width:100%;
  height:100%;
  display:block;
  object-fit:cover;
  filter:brightness(.62) contrast(1.1) saturate(.78);
}
.vault-unlock{
  position:relative;
  display:inline-flex;
  align-items:center;
  gap:.9rem;
  padding:.9rem 1.6rem .9rem 1.2rem;
  overflow:hidden;
  border:1px solid #d4a83a;
  border-radius:4px;
  background:linear-gradient(180deg, #2a2a2a, #111);
  color:#f6d77a;
  text-transform:uppercase;
  cursor:pointer;
  transition:
    color .3s ease,
    border-color .3s ease;
}
.vault-unlock::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:0;
  background:linear-gradient(180deg, #f6d77a, #b8861f);
  transform:scaleY(0);
  transform-origin:bottom;
  transition:transform .35s ease;
}
.vault-unlock > *{
  position:relative;
  z-index:1;
}
.vault-unlock:hover{
  color:#1a0d05;
  border-color:#f6d77a;
}
.vault-unlock:hover::after{
  transform:scaleY(1);
}
.vault-unlock__icon{
  display:inline-flex;
  transition:transform .4s cubic-bezier(.34, 1.56, .64, 1);
}
.vault-unlock:hover .vault-unlock__icon{
  transform:rotate(-12deg) scale(1.1);
}
.vault-unlock__text{
  position:relative;
  display:block;
  min-width:190px;
  height:16px;
  overflow:hidden;
}
.vault-unlock__title{
  font-size:.85rem;
  font-weight:700;
  letter-spacing:.2em;
}

.vx-sec h2 .vx-getIn {
  display: inline;
  margin-left: .12em;
  color: #b64b5d;
  font-style: italic;
  text-shadow: 0 0 18px rgba(182, 75, 93, 0.25);
}
  .vx-codeForm{ margin-top:20px; }
.vx-codeInputs{ display:flex; gap:8px; margin-bottom:16px; }
.vx-codeInputs input{
  flex:1; min-width:0; height:42px; padding:0 10px;
  border:1px solid rgba(236,229,216,.16);
  background:#0d0b12; color:#f4eee4;
  font-family:var(--mono); font-size:11px; letter-spacing:.1em;
  text-align:center; text-transform:uppercase;
}
.vx-codeInputs input:focus{ outline:none; border-color:var(--gold); }
.vx-unlockedBadge{ border-color:#4ab97e91 !important; color:#4ab97e !important; cursor:default; }
  `;
