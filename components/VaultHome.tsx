import React, { useEffect, useRef, useState } from "react";
import Scramble from "./Scramble";

  const LOGO =    "/assets/userfx-logo.png";
  const BRICK =   "/assets/brick-wall.png";
  const DAMASK =  "/assets/damask.png";
  const INSIDE = ["/assets/pic01.png",
                  "/assets/pic02.png",
                  "/assets/video01.mp4",
                  "/assets/pic04.png",
                  "/assets/pic05.png",
                  "/assets/pic06.png",
                  "/assets/pic07.png",
                  "/assets/video02.mp4",
  ];
  const TICKER_ITEMS = [
    "𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT",
    "NEW DROP EVERY FRIDAY · 22:00 UTC",
    "PRIVATE ACCESS · TELEGRAM",
    "PRIVATE CODE · FX-USER01-XXXX",
    "«NOCTURNA» ALBUM · A PRIVATE COLLECTION",
  ];
const STEPS = [
  { n: "01",
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
const PLANS = [
    { id:  "basic",
      tab: "BS02-",
      name:"BASIC",
      days: 7,
      benefits: ["🔐 Enter the vault", 
               "📸 BASIC drops", 
               "⚡ Instant access"],},
    { id:  "pro",
      tab: "PX01-",
      name:"PRO",
      days: 30,
      benefits: ["🔓 Unlock more",
               "📸 Exclusive PRO drops",
               "📺 Private channels",],},
    { id:  "vip",
      tab: "VX03-",
      name:"VIP",
      days: 90,
      benefits: ["🔓 No limits", 
               "📸 Full drops", 
               "💬 Private chat"],},
    ];
const FAQS = [
  { q: "How do I get a code?",
    a: "This preview does not generate keys. Request yours by DM on Telegram.",
  },
  { q: "How long does my access last?",
    a: "It depends on the key you choose. While active, you can return whenever you want.",
  },
  { q: "Can I share my code?",
    a: "No. Your key is personal and non-transferable.",
  },
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
    const day = now.getUTCDay();
    let add = (5 - day + 7) % 7;
    const target = new Date(
    Date.UTC(
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
    const line = items.join("   ✦   ") + "   ✦   ";
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
        />
      ) : (
        <img
          src={src}
          alt=""
          draggable={false}
          className="vx-shotMedia"
        />
      )}

      <div className="vx-shotMask" aria-hidden>
        <span>🜲</span>
        <span>HOLD TO REVEAL</span>
      </div>
    </div>
  );
}
export default function Vault() {
    const [clock, setClock] = useState("--:--:-- UTC");
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [dm, setDm] = useState(false);
    const countdown = useCountdown();
    useEffect(() => {
      const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
    };
    tick();
      const id = window.setInterval(tick, 1000);
      return () => window.clearInterval(id);
    }, []);
      return (
        <div id="top" className="vx">
          <style>{CSS}</style>
          <header className="vx-hud">
            <a href="#top" className="vx-brand">
              <img src={LOGO} alt="USER FX" />
              <span className="vx-live" />
              <span>BÓVEDA PRIVADA ·</span>
            </a>
            <div className="vx-hudRight">
              <time>{clock}</time>
              <b>🜲 LOCKED</b>
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
                  𝐔𝐒𝐄𝐑🜲𝓕𝐗 · ᴘʀɪᴠᴀᴛᴇ ᴠᴀᴜʟᴛ · ᴏꜰꜰɪᴄɪᴀʟ
                </p>
                <h1 className="vx-title">
                  <Scramble text="ACCESS" className="vx-access" delay={160} />
                  <span className="vx-rest">
                    ℝ𝔼𝕊𝕋ℝ𝕀ℂ𝕋𝔼𝔻<span>.</span>
                  </span>
                </h1>
                <p className="vx-p">
                  ᴛʜᴇʀᴇ ᴀʀᴇ ɪᴍᴀɢᴇꜱ ᴛʜᴀᴛ ᴡᴇʀᴇ ɴᴇᴠᴇʀ ᴍᴇᴀɴᴛ ᴛᴏ ʙᴇ ꜱᴇᴇɴ.
                </p>
                <p className="vx-p">
                  <strong>𝐔𝐒𝐄𝐑 🜲 𝓕𝐗 — ᴘʀɪᴠᴀᴛᴇ ᴠᴀᴜʟᴛ</strong>
                  ɪꜱ ᴀ ʀᴇꜱᴇʀᴠᴇᴅ ᴘʟᴀᴄᴇ. ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴛ ᴘᴜʙʟɪᴄ. ʏᴏᴜ’ʟʟ ɴᴇᴇᴅ ᴀ{" "}
                  <em>ᴘʀɪᴠᴀᴛᴇ ᴋᴇʏ.</em>
                </p>
                <dl className="vx-dl">
                  {[
                    ["BRAND", "𝐔𝐒𝐄𝐑 🜲𝓕𝐗"],
                    ["CONTENT", "PRIVATE COLLECTION"],
                    ["NEXT DROP", countdown],
                    ["ACCESS", "DM / PRIVATE KEY"],
                    ["CODE", "🜲 ∣ BS02- ∣ ····"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <aside className="vx-lock">
                <div className="vx-frameA" />
                <div className="vx-frameB" />
                <div className="vx-lockCard">
                  <h2>LOCKED ACCESS</h2>
                  <button
                    type="button"
                    className="vx-gold"
                    onClick={() => setDm(true)}
                  >
                    UNLOCK ALBUM
                  </button>
                  <p>SOLICITA TU CÓDIGO POR DM</p>
                </div>
              </aside>
            </div>
          </section>
          <Ticker items={TICKER_ITEMS} />
          <section id="protocolo" className="vx-sec">
            <Reveal>
              <p className="vx-goldk">◈ ACCESS PROTOCOL</p>
              <h2>
                HOW TO UNLOCK <span>THE VAULT</span>
              </h2>
            </Reveal>{" "}
            {STEPS.map((s, i) => (
              <Reveal
                key={s.n}
                delay={i * 90}
                className={
                  i % 2 ? "vx-shift vx-protocolReveal" : "vx-protocolReveal"
                }
              >
                <article className="vx-step">
                  <b className="vx-stepNum">{s.n}</b>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                  <small>STEP {s.n} / 04</small>
                </article>
              </Reveal>
            ))}
          </section>
          <section id="llaves" className="vx-sec vx-tint">
            <Reveal>
              <p className="vx-goldk">◈ ACCESS CODE</p>
              <h2>
                CHOOSE YOUR <span>CODE</span>
              </h2>
            </Reveal>
            <div className="vx-plans">
              {PLANS.map((plan, i) => (
                <Reveal key={plan.id} delay={i * 110}>
                  <article
                    className={`vx-plan ${plan.id === "pro" ? "is-hot" : ""}`}
                  >
                    {plan.id === "pro" ? <em>★ MOST POPULAR</em> : null}
                    <span>{plan.tab}</span>
                    <h3>{plan.name}</h3>
                    <ul>
                      {plan.benefits.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    <p>{plan.days} ᴅᴀʏꜱ ᴀᴄᴄᴇꜱꜱ</p>
                    <button
                      type="button"
                      className="vx-gold"
                      onClick={() => setDm(true)}>
                      GET MY KEY
                    </button>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>
          <section id="archivo" className="vx-sec">
            <Reveal>
              <p className="vx-goldk">◈ ɪɴꜱɪᴅᴇ ᴛʜᴇ ᴠᴀᴜʟᴛ</p>
              <h2>
                WHAT&apos;S <span>INSIDE</span>
              </h2>
              <p className="vx-lead">
                ʏᴏᴜ’ʀᴇ ᴏɴʟʏ ꜱᴇᴇɪɴɢ ᴘᴀʀᴛ ᴏꜰ ɪᴛ. ᴇᴠᴇʀʏ ꜰʀɪᴅᴀʏ ᴀᴛ 𝟮𝟮﹕𝟬𝟬 ᴜᴛᴄ ᴀ ɴᴇᴡ
                ᴅʀᴏᴘ ɪꜱ ᴀᴅᴅᴇᴅ. ᴛʜɪꜱ ɪꜱ ᴊᴜꜱᴛ ᴀ ɢʟɪᴍᴘꜱᴇ ᴏꜰ «Nocturna».
              </p>
            </Reveal>
            <div className="vx-count">
              <p>
                ᴅʀᴏᴘ ɪɴ</p>
              <strong>{countdown}</strong>
              <p>
                ғʀɪᴅᴀʏ · ２２﹕００ᴜᴛᴄ</p>
            </div>
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
              <p className="vx-goldk">◈ ᴘʀɪᴠᴀᴛᴇ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ</p>
              <h2>
                BEFORE YOU <span>ɢᴇᴛ ɪɴ</span>
              </h2>
            </Reveal>
            <div className="vx-faq">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <Reveal key={f.q} delay={i * 50}>
                    <div className="vx-faqItem">
                      <button type="button" onClick={() => setOpenFaq(open ? null : i)}>
                        <b>{String(i + 1).padStart(2, "0")}</b>
                        <span>{f.q}</span>
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
                      USER 🜲<span>FX</span> 🌹👑
                    </p>
                    <small>PRIVATE VAULT</small>
                  </div>
                </div>
                <p className="vx-legal">
                  𝟣𝟪+ ᴄᴏɴᴛᴇɴᴛ · ᴘᴇʀꜱᴏɴᴀʟ, ɴᴏɴ-ᴛʀᴀɴꜱꜰᴇʀᴀʙʟᴇ ᴀᴄᴄᴇꜱꜱ. ᴏɴᴄᴇ ᴛʜᴇ ᴋᴇʏ
                  ɪꜱ ᴅᴇʟɪᴠᴇʀᴇᴅ, ᴅɪɢɪᴛᴀʟ ᴘᴜʀᴄʜᴀꜱᴇꜱ ᴀʀᴇ ɴᴏɴ-ʀᴇꜰᴜɴᴅᴀʙʟᴇ, ᴇxᴄᴇᴘᴛ
                  ᴘᴀʏᴍᴇɴᴛ ᴇʀʀᴏʀꜱ ᴏʀ ᴅᴇʟɪᴠᴇʀʏ ꜰᴀɪʟᴜʀᴇꜱ.
                </p>
              </div>
              <div>
                <p className="vx-copy">
                  𝐔𝐬𝐞𝐫  | <em>🜲 Ŧҳ</em> | 𝟮𝟬𝟮𝟲 © ᴀʟʟ ʀɪɢʜᴛꜱ ʀᴇꜱᴇʀᴠᴇᴅ
                </p>
                <div className="vx-links">
                  <a href="https://t.me/User18Fx_bot" target="_blank" rel="noreferrer">
                    @User18Fx_bot
                  </a>
                  <a href="#top">VAULT</a>
                  <a href="/admin">OPERATOR PANEL</a>
                </div>
                <p className="vx-bw">👑 𝐔𝐬𝐞𝐫  Ŧҳ · ʙʟᴀᴄᴋ ᴡᴀʟʟ · ʀᴇᴅ ʀᴏꜱᴇ</p>
              </div>
            </div>
            <div className="vx-bar">
              <span>𝐔𝐬𝐞𝐫 Ŧҳ  · 𝟮𝟬𝟮𝟲 · ʙʟᴀᴄᴋ ᴡᴀʟʟ ᴇᴅɪᴛɪᴏɴ</span>
              <span>ᴄᴏᴅᴇ ʙ · @ᴜꜱᴇʀ𝟣𝟪ꜰx_ʙᴏᴛ</span>
            </div>
          </footer>
          <Ticker items={TICKER_ITEMS} reverse />
          {dm ? (
            <div className="vx-modal" onClick={() => setDm(false)}>
              <div onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => setDm(false)}>
                  ×
                </button>
                <p>𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT</p>
                <h3>ACCESS RESTRICTED</h3>
                <p>Solicita tu código por DM directo.</p>
                <a href="https://t.me/User18Fx" target="_blank" rel="noreferrer">
                  𝕊𝔼ℕ𝔻 𝐃𝐌
                </a>
              </div>
            </div>
          ) : null}
        </div>
      );
    }
const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@500;600;700&display=swap");
html,body,#root{margin:0;padding:0;min-height:100%;background:#07060a}
.vx{--ink:#07060a;--bone:#f4eee4;--dim:#b7aebc;--faint:#7a7286;--gold:#e0b85a;--rose:#e07a8b;--line:rgba(236,229,216,.14);--display:"Cormorant Garamond",Georgia,serif;--mono:"JetBrains Mono",ui-monospace,monospace;color:var(--bone);font-family:var(--display);background:#07060a;min-height:100dvh}
.vx-reveal{opacity:.2;transform:translateY(26px);filter:brightness(.55);transition:opacity .75s ease,transform .75s ease,filter .75s ease}
.vx-reveal.is-on{opacity:1;transform:none;filter:none}
.vx-ticker{overflow:hidden;height:28px;border-block:1px solid var(--line);background:rgba(7,6,10,.85)}
.vx-tickerTrack{display:flex;width:max-content;white-space:nowrap;animation:vxL 48s linear infinite;font-family:var(--mono);font-size:9px;letter-spacing:.2em;line-height:28px;color:rgba(236,229,216,.42)}
.vx-ticker.is-rev .vx-tickerTrack{animation-name:vxR}
@keyframes vxL{to{transform:translateX(-50%)}}
@keyframes vxR{from{transform:translateX(-50%)}to{transform:translateX(0)}}
.vx-hud{position:sticky;top:0;z-index:30;display:flex;justify-content:space-between;align-items:center;height:52px;padding:0 16px;border-bottom:1px solid var(--line);background:rgba(7,6,10,.88);backdrop-filter:blur(8px)}
.vx-brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;font-family:var(--mono);font-size:10px;letter-spacing:.22em}
.vx-brand img{height:28px}
.vx-live{width:6px;height:6px;border-radius:50%;background:var(--rose);box-shadow:0 0 10px #c0455a}
.vx-hudRight{display:flex;gap:10px;align-items:center;font-family:var(--mono);font-size:10px;letter-spacing:.16em;color:var(--dim)}
.vx-hudRight b{border:1px solid rgba(224,122,139,.5);color:#e07a8b;padding:4px 8px;font-weight:600}
.vx-open{position:relative;overflow:hidden;padding:36px 16px 48px}
.vx-bg{position:absolute;inset:0;pointer-events:none}
.vx-damask{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.vx-brick{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.12}
.vx-blob{position:absolute;border-radius:50%}
.vx-blobA{left:-160px;top:-160px;width:640px;height:640px;background:radial-gradient(circle,rgba(59,130,246,.22),transparent 62%)}
.vx-blobB{right:-180px;top:20%;width:560px;height:560px;background:radial-gradient(circle,rgba(192,45,90,.24),transparent 62%)}
.vx-grid{position:relative;z-index:1;max-width:72rem;margin:0 auto;display:grid;gap:36px}
@media(min-width:960px){.vx-grid{grid-template-columns:1.05fr .7fr;align-items:end}}
.vx-logoWrap img{width:min(420px,90vw);filter:drop-shadow(0 0 28px rgba(59,130,246,.45))}
.vx-kicker{display:flex;align-items:center;gap:10px;margin:22px 0 0;font-family:var(--mono);font-size:11px;letter-spacing:.28em;color:#bedbff}
.vx-kicker i{width:40px;height:1px;background:rgba(96,165,250,.6)}
.vx-access,.vx-rest{display:block;line-height:.9}
.vx-access{font-size:clamp(3rem,10vw,6.4rem);font-weight:600}
.vx-rest{margin-top:.08em;font-size:clamp(2.2rem,8vw,4.2rem);font-weight:300;font-style:italic;color:var(--rose)}
.vx-rest span{color:#93c5fd}
.vx-p{max-width:36rem;color:var(--dim);line-height:1.65}
.vx-p strong,.vx-p em{color:var(--bone)}
.vx-dl{max-width:28rem;margin-top:24px}
.vx-dl>div{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);padding:10px 0;font-family:var(--mono);font-size:10px;letter-spacing:.16em}
.vx-dl dt{color:var(--faint)}
.vx-lock{position:relative;width:min(100%,280px);justify-self:end}
.vx-frameA,.vx-frameB{position:absolute;inset:-10px;pointer-events:none}
.vx-frameA{transform:translate(10px,10px);border:1px solid rgba(96,165,250,.15)}
.vx-frameB{transform:translate(-8px,-8px);border:1px solid rgba(163,68,85,.12)}
.vx-lockCard{position:relative;padding:22px 16px;border:1px solid var(--line);background:rgba(7,6,10,.7);text-align:center}
.vx-lockCard h2{margin:0 0 14px;letter-spacing:.18em;font-size:1rem}
.vx-lockCard>p{margin:10px 0 0;font-family:var(--mono);font-size:8px;letter-spacing:.14em;color:var(--faint)}
.vx-gold{width:100%;height:46px;border:1px solid #e8c56a;background:linear-gradient(180deg,#f0d78a,#c9a24b 48%,#8d6a28);color:#1c1508;font-family:var(--mono);font-size:10px;letter-spacing:.18em;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.vx-sec{max-width:56rem;margin:0 auto;padding:72px 16px;border-top:1px solid var(--line)}
.vx-tint{max-width:none;padding-left:max(16px,calc(50% - 36rem));padding-right:max(16px,calc(50% - 36rem));background:rgba(13,11,18,.4)}
.vx-goldk{margin:0;font-family:var(--mono);font-size:11px;letter-spacing:.3em;color:var(--gold)}
.vx-sec h2{margin:10px 0 0;font-size:clamp(2.2rem,7vw,3.6rem);line-height:.95;font-weight:500}
.vx-sec h2 span{display:block;color:var(--rose);font-style:italic}
.vx-step{display:grid;grid-template-columns:72px 1fr;gap:16px;padding:22px 0;border-top:1px dashed var(--line);position:relative}
.vx-step b{font-size:3rem;font-weight:300;font-style:italic;color:rgba(224,184,90,.35);line-height:1}
.vx-step h3{margin:0;font-family:var(--mono);font-size:11px;letter-spacing:.22em;color:var(--gold)}
.vx-step p,.vx-lead,.vx-faq p{color:var(--dim);line-height:1.7}
.vx-step small{display:none}
@media(min-width:900px){.vx-step small{display:block;position:absolute;right:0;top:50%;transform:translateY(-50%);font-family:var(--mono);font-size:9px;letter-spacing:.2em;color:var(--faint)}}
.vx-shift{margin-left:0}
@media(min-width:900px){.vx-shift{margin-left:4rem}}
.vx-plans{display:grid;gap:14px;margin-top:28px}
@media(min-width:860px){.vx-plans{grid-template-columns:repeat(3,1fr)}}
.vx-plan{position:relative;padding:18px 16px 16px;border:1px solid var(--line);background:rgba(7,6,10,.55)}
.vx-plan.is-hot{border-color:rgba(224,184,90,.5)}
.vx-plan em{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--gold);color:#1c1508;font-style:normal;font-family:var(--mono);font-size:9px;padding:3px 8px}
.vx-plan>span{font-family:var(--mono);font-size:10px;color:var(--gold);letter-spacing:.16em}
.vx-plan h3{margin:8px 0 12px;font-size:1.7rem;font-style:italic}
.vx-plan ul{margin:0 0 12px;padding-left:16px;color:var(--dim)}
.vx-plan p{font-family:var(--mono);font-size:10px;letter-spacing:.14em;color:var(--gold)}
.vx-lead{max-width:32rem}
.vx-count{margin:22px 0;padding:16px;border:1px solid var(--line);width:fit-content;font-family:var(--mono)}
.vx-count p{margin:0;font-size:9px;letter-spacing:.22em;color:var(--faint)}
.vx-count strong{display:block;margin:6px 0;font-size:2rem;color:var(--gold)}
.vx-archive{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
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
.vx-faqItem b{color:rgba(224,184,90,.55);font-style:italic;font-weight:400}
.vx-faqItem p{margin:0;padding:0 0 16px 52px}
.vx-foot{padding:48px 16px 20px;border-top:1px solid var(--line);background:rgba(13,11,18,.45)}
.vx-footGrid{max-width:72rem;margin:0 auto;display:grid;gap:28px}
@media(min-width:900px){.vx-footGrid{grid-template-columns:1.2fr .8fr}}
.vx-footBrand{display:flex;gap:14px;align-items:center}
.vx-footBrand img{height:56px}
.vx-footBrand p{margin:0;font-family:var(--mono);letter-spacing:.2em}
.vx-footBrand span{color:#60a5fa}
.vx-footBrand small{display:block;color:var(--dim);letter-spacing:.24em}
.vx-legal,.vx-copy,.vx-bw,.vx-bar{font-family:var(--mono);letter-spacing:.14em;color:var(--faint);font-size:10px;line-height:1.7}
.vx-links{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.vx-links a{border:1px solid var(--line);padding:8px 10px;color:var(--dim);text-decoration:none;font-family:var(--mono);font-size:10px;letter-spacing:.16em}
.vx-bar{max-width:72rem;margin:24px auto 0;padding-top:14px;border-top:1px solid var(--line);display:flex;justify-content:space-between}
.vx-modal{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(7,6,10,.8)}
.vx-modal>div{position:relative;width:min(92%,400px);padding:28px 22px;border:1px solid var(--line);background:#0d0b12;text-align:center}
.vx-modal button{position:absolute;top:8px;right:12px;border:0;background:none;color:var(--dim);font-size:28px;cursor:pointer}
.vx-modal a{display:flex;align-items:center;justify-content:center;height:46px;margin-top:16px;border:1px solid #e8c56a;background:linear-gradient(180deg,#f0d78a,#c9a24b 48%,#8d6a28);color:#1c1508;text-decoration:none;font-family:var(--mono);letter-spacing:.18em}
`;
