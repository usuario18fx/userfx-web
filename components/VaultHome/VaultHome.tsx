import { PLAN_DAYS } from "../../lib/access-plans.js";
          "use client";

          import React, { useEffect, useRef, useState } from "react";
          import Scramble from "../Scramble";
          import VisitorCounter from "../VisitorCounter";
          import VaultDevice from "../VaultDevice/VaultDevice";
          import Crown4D from "../Crown4D/Crown4D";
          import "./VaultHome.css";

          import VaultHeroDoors from "../VaultDoors/VaultHeroDoors";
          import VaultMediaDevice from "../VaultInfo/VaultInfoDevice";

          import { FxAccessBtn } from "../FxAccess/FxAccessBtn";
          import { FxAccessModal } from "../FxAccess/FxAccessModal/FxAccessModal";

          const LOGO = "/assets/userfx-logo-sin.png";

          const BRICK = "/assets/brick-wall.png";

          const DAMASK = "/assets/damask.png";

          const privatePhoto = (pathname: string) => `/api/private-media?pathname=${encodeURIComponent(pathname)}`;

const PREVIEW_INSIDE = ["/assets/album/PRVW/PRVW-01.jpg", "/assets/album/PRVW/PRVW-02.jpg", "/assets/album/PRVW/PRVW-03.jpg", "/assets/album/PRVW/PRVW-04.jpg", "/assets/album/PRVW/PRVW-05.jpg", "/assets/album/PRVW/PRVW-06.jpg", "/assets/album/PRVW/PRVW-07.jpg"];
const BASIC_INSIDE = [privatePhoto("userfx-album/BSIC/BSIC-01.jpg"), privatePhoto("userfx-album/BSIC/BSIC-02.jpg"), privatePhoto("userfx-album/BSIC/BSIC-03.jpg"), privatePhoto("userfx-album/BSIC/BSIC-04.jpg"), privatePhoto("userfx-album/BSIC/BSIC-05.jpg")];
const PRO_INSIDE = [privatePhoto("userfx-album/PRX0/PRX0-01.jpg"), privatePhoto("userfx-album/PRX0/PRX0-02.jpg"), privatePhoto("userfx-album/PRX0/PRX0-03.jpg")];
const VIP_INSIDE = [privatePhoto("userfx-album/VIPX/VIPX-01.jpg"), privatePhoto("userfx-album/VIPX/VIPX-02.jpg"), privatePhoto("userfx-album/VIPX/VIPX-03.jpg"), privatePhoto("userfx-album/VIPX/VIPX-04.jpg")];
const ICONS = {
  corona: "/assets/iconos/corona.png",
  candado: "/assets/iconos/candado.png",
  rosa: "/assets/iconos/rosa.png",
  rosa1: "/assets/iconos/rosa1.png",
  laurel: "/assets/iconos/laurel.png",
  doorLaurel: "/assets/doorLaurel.png",
  dossier: "/assets/iconos/icon.png",
  support: "/assets/iconos/support.png",
  chat: "/assets/iconos/chat.png",
  tv: "/assets/iconos/tv.png",
};

const TICKER_ITEMS = ["YOUR CODE. YOUR WAY IN.", "PRIVATE ACCESS · TELEGRAM STARS", "FRESH DROPS · FRIDAY 22:00 UTC", "USER FX · TORONTO, CANADA"];
const STEPS = [
  { n: "01", title: "OPEN THE TELEGRAM BOT", text: "Start in Telegram. Check out the plans and find your way in." },
  { n: "02", title: "CHOOSE YOUR ACCESS", text: "Find your fit: BASIC, PRO or VIP. Compare the perks and make it yours." },
  { n: "03", title: "COMPLETE YOUR PAYMENT", text: "Pay with Telegram Stars. Once payment is confirmed, the bot sends your personal access code." },
  { n: "04", title: "UNLOCK THE VAULT", text: "Got your code? Head back here, paste it in and step inside. Your plan unlocks your perks." },
];

const FAQS = [
  { q: "How do I get a code?", a: "Pick BASIC, PRO or VIP below, then finish checkout in Telegram. The bot sends your code after payment is confirmed." },
  { q: "How many times can I enter?", a: `Enter as often as you want while your code is active. BASIC includes camera and chat for ${PLAN_DAYS.basic} days. PRO adds recording and multimedia for ${PLAN_DAYS.pro} days. VIP adds exclusive Stage access for ${PLAN_DAYS.vip} days. Validity starts at first activation.` },
  { q: "Can I share my code?", a: "Your code is just for you. Keep it private; sharing or transferring it is not allowed." },
  { q: "What happens if I don't receive my code?", a: "Reach out to @User18Fx_bot with your payment details. We’ll help you track it down." },
  { q: "Are refunds available?", a: "Digital access is non-refundable once the key is delivered, except payment errors or delivery failures." },
];
function nextFridayUtc() {
  const now = new Date();
  const day = now.getUTCDay();
  let add = (5 - day + 7) % 7;
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + add, 22, 0, 0));
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
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setOn(true);
      },
      { threshold: 0.16 },
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
      {isVideo ? <video src={src} className="vx-shotMedia" muted loop playsInline preload="metadata" width={300} height={400} /> : <img src={src} alt="" draggable={false} className="vx-shotMedia" width={300} height={400} />}
      <div className="vx-shotMask" aria-hidden>
        <span>
        🜲
        </span>
        <span>
        HOLD TO REVEAL
        </span>
      </div>
    </div>
  );
}
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
function openLink(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
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
  const [fxAccessOpen, setFxAccessOpen] = useState(false);
  const [memberAccess, setMemberAccess] = useState(false);

  const activePlanPrefix = activePlanId ? ACCESS_PLAN_PREFIX[activePlanId] : "";
  const activeAccessPrefix = memberAccess ? "SPCL" : activePlanPrefix;
  const activeAccessState = memberAccess ? "MEMBER" : "UNLOCKED";

  const unlockedPhotos = activePlanId === "vip" ? [...BASIC_INSIDE, ...PRO_INSIDE, ...VIP_INSIDE] : activePlanId === "pro" ? [...BASIC_INSIDE, ...PRO_INSIDE] : activePlanId === "basic" ? BASIC_INSIDE : [];

  const visiblePhotos = unlocked ? [...PREVIEW_INSIDE, ...unlockedPhotos] : PREVIEW_INSIDE;

  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const inlineCodeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshAccessSession = async () => {
      try {
        const response = await fetch("/api/access-session", {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (response.ok && data?.authenticated && isAccessPlanId(data.planId)) {
          sessionStorage.setItem("vault_plan", data.planId);
          setActivePlanId(data.planId);
          setRemainingAccesses(Number.isFinite(Number(data.remainingAccesses)) ? Number(data.remainingAccesses) : null);
          setUnlimitedAccess(data.unlimitedAccess === true);
          setMemberAccess(data.accessMode === "telegram_identity");
          setUnlocked(true);
          return;
        }
        setMemberAccess(false);
      } catch {
        // Keep the current UI state if the session endpoint is temporarily unavailable.
      }
    };
    void refreshAccessSession();
    const handleWindowFocus = () => {
      void refreshAccessSession();
    };
    window.addEventListener("focus", handleWindowFocus);
    const codeFromTelegram = new URLSearchParams(window.location.search).get("code");
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
      }
    }
    fetch("/api/miniapp-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: (window as TelegramWindow).Telegram?.WebApp?.initData || "",
      }),
    }).catch(() => {});

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

    if (attempts >= MAX_ATTEMPTS) {
      setVerifyError("Too many attempts. Refresh the page to try again.");
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

    if (!/^(BSIC|PRX0|VIPX)$/.test(normalizedPrefix) || normalizedSuffix.length !== 4) {
      setVerifyError("ᴇɴᴛᴇʀ ʏᴏᴜʀ ᴄᴏᴍᴘʟᴇᴛᴇ ᴀᴄᴄᴇꜱꜱ ᴋᴇʏ");
      return;
    }
    setPrefix(normalizedPrefix);
    setSuffix(normalizedSuffix);
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ prefix: normalizedPrefix, suffix: normalizedSuffix }),
      });
      const data = await res.json();
      if (data.ok) {
        if (!isAccessPlanId(data.planId)) {
          setVerifyError("ɪɴᴠᴀʟɪᴅ ᴀᴄᴄᴇꜱꜱ ᴘʟᴀɴ");
          return;
        }
        sessionStorage.setItem("vault_plan", data.planId);
        setActivePlanId(data.planId);
        setRemainingAccesses(Number.isFinite(Number(data.remainingAccesses)) ? Number(data.remainingAccesses) : null);
        setUnlimitedAccess(data.unlimitedAccess === true);
        setMemberAccess(false);

        if (data.planId === "pro") {
          localStorage.setItem(SAVED_CODE_KEY, `${normalizedPrefix}-${normalizedSuffix}`);
        } else {
          localStorage.removeItem(SAVED_CODE_KEY);
        }
        setUnlocked(true);
        setCodeModal(false);
        setVerifyError("");

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("code");
        window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);

        window.setTimeout(() => {
          document.getElementById("unlocked-vault")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 200);
        return;
      }
      setAttempts((n) => n + 1);
      setVerifyError(data.error || "ᴛʜᴀᴛ ᴄᴏᴅᴇ ᴅɪᴅɴ’ᴛ ᴡᴏʀᴋ. ᴅᴏᴜʙʟᴇ-ᴄʜᴇᴄᴋ ɪᴛ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ.");
    } catch {
      setVerifyError("ᴄᴏɴɴᴇᴄᴛɪᴏɴ ᴅʀᴏᴘᴘᴇᴅ. ᴄʜᴇᴄᴋ ʏᴏᴜʀ ɪɴᴛᴇʀɴᴇᴛ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ.");
    } finally {
      setVerifyLoading(false);
    }
  }
  function handleInlineCodeChange(value: string) {
    const compactCode = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    setPrefix(compactCode.slice(0, 4));
    setSuffix(compactCode.slice(4, 8));
    setVerifyError("");
  }
  const inlineCodeValue = prefix || suffix ? `${prefix}${prefix.length === 4 ? "-" : ""}${suffix}` : "";
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
          <time>{clock}</time>
          <b onClick={() => !unlocked && setCodeModal(true)} className={unlocked ? "vx-unlockedBadge" : ""} aria-live="polite" aria-label={unlocked ? `${activeAccessPrefix} ${activeAccessState.toLowerCase()}` : "Vault locked"}>
            {unlocked ? (
              <>
                <span className="vx-unlockedPrefix">{activeAccessPrefix}</span>
                <span className="vx-unlockedState">{activeAccessState}</span>
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
            {/* ═════════ LOGO + KICKER + GET MY CODE ═════════ */}
            <div className="vx-heroIdentity">
              <div className="vx-logoWrap">
                <img src={LOGO} alt="𝐔𝐒𝐄𝐑🜲𝓕𝐗" draggable={false} />
              </div>
              <nav className="vx-kicker" aria-label="Quick links">
                <i />
                <button type="button" className="vx-kickerBtn" onClick={() => setCodeModal(true)}>
                  <Scramble text="PRIV⭑VAULT" hover />
                </button>
                <i />
                <a className="vx-kickerBtn" href="https://t.me/User18Fx_bot" target="_blank" rel="noopener noreferrer">
                  <Scramble text="TELEGRAM" hover />
                </a>
                <i />
                <a className="vx-kickerBtn" href="https://x.com/User18fx" target="_blank" rel="noopener noreferrer">
                  <Scramble text="X (TWITTER)" hover />
                </a>
                <i />
              </nav>
              {/* ─────   GET MY CODE ─────── */}
              <div className="vx-heroAccessBtn">
                <FxAccessBtn onOpen={() => setFxAccessOpen(true)} disabled={false} />
              </div>
            </div>
            {/* ═════════ FIN LOGO + KICKER + GET MY CODE ═════════ */}
            <h1 className="vx-title">
              <Scramble text="ACCESS" className="vx-access" delay={160} />
              <div className="vx-titleCrown">
                <Crown4D />
              </div>
              <Scramble text="RESTRICTED" className="vx-rest" delay={420} />
            </h1>
            <p className="vx-p vx-pNormal">
              <Scramble text="Some things stay off the feed." />{" "}
              <strong>
                <Scramble text="USER🜲 FX" delay={180} />
              </strong>
              <br />
              <strong className="vx-privateVaultLine">
                <Scramble text="—ᴘʀɪᴠᴀᴛᴇ ᴠᴀᴜʟᴛ—" delay={300} />
              </strong>{" "}
              <Scramble text="Your invite to the other side. Grab a code and make yourself at home." delay={420} />
            </p>
            <div className="vx-dossierRow">
              <div className="vx-dossierOrnament" aria-hidden="true">
                <img src="/icon8-transparent.png" alt="" draggable={false} />
              </div>
              <div className="vx-dossierDevice">
                <VaultMediaDevice />
              </div>
            </div>
          </div>
          <aside className="vx-lock vx-lockRaise">
            <div className="vx-doorLaurel" aria-hidden="true">
              <img src={ICONS.doorLaurel} alt="" draggable={false} />
            </div>
            <VaultHeroDoors />
          </aside>
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
                {memberAccess ? (
                  <>Your SPCL access is active. The private collection is ready to explore.</>
                ) : (
                  <>
                    Your {activePlanPrefix} access key has been verified. {unlimitedAccess ? "Unlimited entries available." : remainingAccesses === null ? "You’re in. Make yourself at home." : `${remainingAccesses} future ${remainingAccesses === 1 ? "entry" : "entries"} remaining.`}
                  </>
                )}
              </p>
              <div className="vx-privateAlbumLine" />
            </header>
            <div className="vx-privateAlbumGrid">
              {unlockedPhotos.map((src, index) => (
                <figure key={`unlocked-${src}`} className="vx-privateAlbumItem" onContextMenu={(event) => event.preventDefault()}>
                  <img src={src} alt={`Private vault image ${index + 1}`} draggable={false} loading={index === 0 ? "eager" : "lazy"} />
                  <figcaption>
                    <span>
                    USER 🜲 FX
                    </span>
                    <small>PRIVATE FILE {String(index + 1).padStart(2, "0")}</small>
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
      <section id="protocolo" className="vx-sec vx-protocol">
        <Reveal>
          <p className="vx-goldk">
          ◈ YOUR WAY IN
          </p>
          <h2>
            HOW TO UNLOCK
            <span className="vx-theVault">
            THE VAULT
            </span>
          </h2>
        </Reveal>
        <div className="vx-protocolSteps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90} className={i % 2 === 0 ? "vx-protocolReveal vx-stepLeft" : "vx-protocolReveal vx-stepRight"}>
              <article className="vx-step">
                {/* ✦ FONDO DE ESTRELLAS */}
                <div className="vx-stepStars" aria-hidden="true">
                  <div className="vx-stars vx-stars1" />
                  <div className="vx-stars vx-stars2" />
                  <div className="vx-stars vx-stars3" />
                </div>
                <b className="vx-stepNum">{s.n}</b>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
                <small>{s.n} / 04</small>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <section id="llaves" className="vx-sec vx-tint">
        <div className="vx-chooseZone">
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
          </Reveal>
        </div>
        {/* ⬆️ .vx-chooseZone → SOLO CHOOSE YOUR CODE + DEVICE */}
        <div className="vx-insideZone">
          <Reveal>
            <div className="vx-insideBlock">
              <p className="vx-goldk">
              🜲 INSIDE THE VAULT
              </p>
              <h2 className="vx-insideTitle">
                <Scramble text="WHAT'S" />
                <span>
                  <Scramble text="INSIDE" delay={180} />
                </span>
              </h2>
              <div className="vx-insideRow">
                <p className="vx-lead">
                  Find your people. Catch a vibe. Stay a little longer. A private space for open-minded guys, video calls and a collection that stays off the feed. This is your sneak peek. Fresh drops land every Friday at 22:00 UTC.
                  <strong>
                  —Your vibe. Your vault.—
                  </strong>
                </p>
                <div className="vx-count">
                  <p>
                  NEXT DROP IN
                  </p>
                  <strong>{countdown}</strong>
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
          <a
            href="https://t.me/+Smfuo6ObfVFkOTFh"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Telegram channel 𝐔𝐬𝐞𝐫 Ŧҳ 🜲"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "fit-content",
              maxWidth: "calc(100% - 32px)",
              margin: "24px auto 0",
              padding: "12px 28px",
              border: "1px solid rgba(220, 190, 125, 0.65)",
              borderRadius: "8px",
              background: "rgba(10, 12, 19, 0.9)",
              color: "#f6e6c2",
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            𝐔𝐬𝐞𝐫 Ŧҳ 🜲
          </a>
        </div>
        {/* ⬆️ .vx-insideZone → INSIDE THE VAULT + CAROUSEL */}
      </section>
      <div className="vx-finalBackdrop">
        <section id="faq" className="vx-sec">
          <Reveal>
            <p className="vx-goldk">
            ◈ GOOD TO KNOW
            </p>
            <h2>
              BEFORE YOU
              <span className="vx-getIn">
              GET IN
              </span>
              <img src={ICONS.rosa1} alt="" className="vx-titleRose1" draggable={false} />
            </h2>
          </Reveal>
          <div className="vx-faq">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={f.q} delay={i * 50}>
                  <div className="vx-faqItem">
                    <button type="button" onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}>
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
        {/* ⬆️ .vx-sec#faq → BEFORE YOU GET IN + preguntas */}
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
                <nav className="vx-links vx-sessionLinks" aria-label="Vault session actions">
                  <button type="button" onClick={() => openLink("https://t.me/User18Fx")} aria-label="Open private chat">
                    <img src={ICONS.chat} alt="" aria-hidden="true" />
                    <Scramble text="CHAT" hover />
                  </button>
                  <button type="button" onClick={() => openLink("https://t.me/User18Fx_bot?start=support")} aria-label="Open support">
                    <img src={ICONS.support} alt="" aria-hidden="true" />
                    <Scramble text="SUPPORT" hover />
                  </button>
                  <button type="button" onClick={() => openLink("https://t.me/+U1V9FZh0neUxYWFh")} aria-label="Open vault videos">
                    <img src={ICONS.tv} alt="" aria-hidden="true" />
                    <Scramble text="CHANNEL" hover />
                  </button>
                </nav>
                <div className="vx-footCode">
                | CODE | FX-011897-190122-CAHATO |
                </div>
              </div>
            </div>
          </div>
          <p className="vx-legal">
          | 18+ CONTENT | PERSONAL &amp; NON-TRANSFERABLE | Vault access is confidential and for personal use only. Sharing, reselling, recording, downloading, copying, or redistributing content is prohibited and may result in immediate termination without refund. All content is protected by Canadian copyright law. Digital purchases are final once access is delivered, except where Ontario law requires otherwise.
          </p>
        </footer>
      </div>
      <Ticker items={TICKER_ITEMS} reverse />
      <FxAccessModal id="fx-access-modal" open={fxAccessOpen} onClose={() => setFxAccessOpen(false)} accessCode={inlineCodeValue} onAccessCodeChange={handleInlineCodeChange} onAccessSubmit={handleVerify} accessLoading={verifyLoading} accessError={verifyError} inputRef={inlineCodeRef} />
      {dm ? (
        <div className="vx-modal" onClick={() => setDm(false)}>
          <div className="vx-modalCard" onClick={(e) => e.stopPropagation()}>
            {/* ── partículas doradas ── */}
            <div className="vx-modalParticles">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <button type="button" className="vx-modalClose" onClick={() => setDm(false)} aria-label="Close modal">
              ×
            </button>
            <div className="vx-modalIcon" />
            <p className="vx-modalKicker">
            𝐔𝐒𝐄𝐑🜲𝓕𝐗 · PRIVATE VAULT
            </p>
            <h3 className="vx-modalTitle vx-modalTitleWithCrown">
              <span className="vx-modalTitleShimmer">
              ACCESS RESTRICTED
              </span>
              <img src={ICONS.corona} alt="" className="vx-modalTitleCrown" draggable={false} />
            </h3>
            <p className="vx-modalText">
            Pick your plan. Head to Telegram. Get your code and come on in.
            </p>
            <div className="vx-modalDivider" />
            <a className="vx-modalLink" href="https://t.me/User18Fx_bot?start=getcode" target="_blank" rel="noreferrer">
              <span className="vx-modalLinkBg" />
              <span className="vx-modalLinkContent">
              GET MY CODE
              </span>
            </a>
            <p className="vx-modalFooter">
            BASIC · PRO · VIP
            </p>
            <img src={ICONS.laurel} alt="" className="vx-modalLaurel" draggable={false} />
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
              <img src={ICONS.candado} alt="" className="vx-modalCrown" draggable={false} />
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
                <input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="PREFIX" maxLength={4} autoCapitalize="characters" autoComplete="off" disabled={verifyLoading || attempts >= MAX_ATTEMPTS} />
                <input value={suffix} onChange={(e) => setSuffix(e.target.value.toUpperCase())} placeholder="SUFFIX" maxLength={4} autoCapitalize="characters" autoComplete="off" disabled={verifyLoading || attempts >= MAX_ATTEMPTS} />
              </div>
              <button type="submit" className="vx-gold" disabled={verifyLoading || attempts >= MAX_ATTEMPTS}>
                {verifyLoading ? "VERIFYING..." : "UNLOCK"}
              </button>
              {verifyError ? <p className="vx-modalError">{verifyError}</p> : null}
            </form>
            <p className="vx-modalFooter">
            Don&apos;t have a code? Use GET MY CODE or contact @User18Fx_bot.
            </p>
          </div>
          {/* ========   FX ACCESS MODAL =========================== */}
          <FxAccessModal id="fx-access-modal" open={fxAccessOpen} onClose={() => setFxAccessOpen(false)} accessCode={inlineCodeValue} onAccessCodeChange={handleInlineCodeChange} onAccessSubmit={handleVerify} accessLoading={verifyLoading} accessError={verifyError} inputRef={inlineCodeRef} />
        </div>
      ) : null}
    </div>
  );
}
