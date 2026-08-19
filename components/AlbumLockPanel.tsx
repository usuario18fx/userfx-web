"use client";
import styles from "./AlbumLockPanel.module.css";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const CODE_LENGTH = 4;

type Status = "locked" | "verifying" | "error" | "unlocked";
type ErrKind = "invalid" | "used" | "ratelimit";

type AlbumLockPanelProps = {
  onUnlock?: () => void;
  videoSrc?: string;
  prefill?: string | null;
};

// Textos de error adaptados para la PREVIEW
const ERR_TEXT: Record<ErrKind, string> = {
  invalid: "✕ MODO PREVIEW — El Vault se habilitará pronto",
  used: "✕ MODO PREVIEW — El Vault se habilitará pronto",
  ratelimit: "✕ MODO PREVIEW — El Vault se habilitará pronto",
};

export default function AlbumLockPanel({
  onUnlock,
  videoSrc = "",
  prefill = null,
}: AlbumLockPanelProps) {
  const [chars, setChars] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState<Status>("locked");
  const [errKind, setErrKind] = useState<ErrKind>("invalid");
  const [activeTab, setActiveTab] = useState("FX-USER01-");
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const consumedPrefill = useRef<string | null>(null);

  const focusInput = useCallback((index: number) => {
    if (index < 0 || index >= CODE_LENGTH) return;
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  }, []);

  const resetInputs = useCallback(() => {
    setChars(Array(CODE_LENGTH).fill(""));
    setStatus("locked");
    setTimeout(() => focusInput(0), 0);
  }, [focusInput]);

  // ── Submit code (Simulado para Preview, sin API de pago) ──
  const submitCode = useCallback(
    async (value: string) => {
      const clean = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(-CODE_LENGTH);

      if (clean.length !== CODE_LENGTH || status === "verifying") {
        return;
      }

      setStatus("verifying");

      // Simulamos la verificación sin llamar a /api/verify
      setTimeout(() => {
        setErrKind("invalid"); // Mostramos mensaje de Preview
        setStatus("error");
        setTimeout(() => {
          resetInputs();
        }, 1800);
      }, 600);
    },
    [status, resetInputs]
  );

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const value = raw.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const next = [...chars];
      next[index] = value;
      setChars(next);

      if (value && index < CODE_LENGTH - 1) {
        focusInput(index + 1);
      }
      if (next.every(Boolean)) {
        submitCode(next.join(""));
      }
    },
    [chars, focusInput, submitCode]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const next = [...chars];
        if (chars[index]) {
          next[index] = "";
          setChars(next);
          return;
        }
        if (index > 0) {
          next[index - 1] = "";
          setChars(next);
          focusInput(index - 1);
        }
        return;
      }
      if (e.key === "ArrowLeft") { e.preventDefault(); focusInput(index - 1); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); focusInput(index + 1); return; }
      if (e.key === "Enter") { e.preventDefault(); submitCode(chars.join("")); }
    },
    [chars, focusInput, submitCode]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-CODE_LENGTH);
      if (!pasted) return;
      const next = Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] || "");
      setChars(next);
      if (next.every(Boolean)) {
        submitCode(next.join(""));
      } else {
        focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
      }
    },
    [focusInput, submitCode]
  );

  useEffect(() => { focusInput(0); }, [focusInput]);

  return (
    <section className={styles.root}>
      <div className={styles.wp} />
      <div className={styles.vignette} />
      <div className={styles.scanlines} />

      {/* HUD */}
      <header className={styles.hud}>
        <div className={styles.hudLeft}>
          <span className={styles.hudDot} />
          <span className={styles.hudLabel}>PREVIEW SESSION</span>
        </div>
        <span className={styles.hudPill}>{activeTab}</span>
      </header>

      {/* Lock badge */}
      <div className={styles.lockBadge}>
        <div className={styles.lockIconWrap}>
          <span className={styles.lockPulse} />
          <svg className={styles.lockSvg} width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <h1 className={styles.lockTitle}>COMING SOON</h1>
      </div>

      {/* Input panel */}
      <div className={`${styles.inputPanel} ${status === "error" ? styles.inputPanelError : ""}`}>
        <div className={styles.panelTopLine} />

        {/* Tabs */}
        <div className={styles.tabRow}>
          <button type="button" className={`${styles.tab} ${activeTab === "FX-USER01-" ? styles.tabActive : ""}`} onClick={() => setActiveTab("FX-USER01-")}>
            <span className={styles.tabDot} />
            FX-USER01-
          </button>
          <button type="button" className={`${styles.tab} ${activeTab === "VAULT" ? styles.tabActive : ""}`} onClick={() => setActiveTab("VAULT")}>
            VAULT
          </button>
          <span className={styles.tabSpacer} />
          <span className={styles.tabPrefix}>PREVIEW</span>
        </div>

        {/* Code */}
        <div className={styles.codeRow}>
          {chars.map((char, i) => (
            <div key={i} className={styles.codeCell}>
              <input
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={char}
                maxLength={1}
                aria-label={`Código ${i + 1}`}
                disabled={status === "verifying"}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onPaste={handlePaste}
                className={`${styles.codeBox} ${status === "error" ? styles.codeBoxError : ""}`}
              />
              {char && <span className={styles.cellGlow} />}
            </div>
          ))}
        </div>

        {/* Error / Message */}
        {status === "error" && (
          <p className={styles.errorText}>{ERR_TEXT[errKind]}</p>
        )}

        {/* Unlock Button -> Ahora dice Próximamente */}
        <button type="button" onClick={() => submitCode(chars.join(""))} className={styles.unlockBtn} disabled={status === "verifying"}>
          <span className={styles.unlockBtnShine} />
          <span className={styles.unlockBtnText}>
            {status === "verifying" ? "VERIFICANDO..." : "PRÓXIMAMENTE"}
          </span>
        </button>

        <p className={styles.hint}>
          El acceso al Vault completo se habilitará pronto.
        </p>
      </div>

      <footer className={styles.footer}>
        <div>
          <span className={styles.footerFx}>FX</span> · PRIVATE ACCESS SYSTEM
        </div>
        <div className={styles.footerBot}>SESSION ENCRYPTED · PREVIEW MODE</div>
      </footer>

      {/* ── CSS INTEGRADO PARA FACILIDAD DE COPIA ── */}
      <style jsx>{`
        .root {
          position: relative;
          width: 100%;
          height: 100dvh;
          min-height: 580px;
          overflow: hidden;
          background: #010103;
          color: #f5f9ff;
          font-family: "DM Sans", "Inter", system-ui, sans-serif;
        }
        .wp { position: absolute; inset: 0; background-image: var(--wp); background-position: center top; background-repeat: no-repeat; background-size: cover; filter: brightness(0.84) contrast(1.1) saturate(1.08); }
        .vignette { position: absolute; inset: 0; background: radial-gradient(ellipse 120% 60% at 50% 0%, transparent 30%, rgba(0,0,0,0.45) 100%), linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.02) 8%, transparent 18%, transparent 54%, rgba(0,0,0,0.5) 66%, rgba(0,0,0,0.82) 80%, rgba(0,0,0,0.92) 100%); }
        .scanlines { position: absolute; inset: 0; background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px); pointer-events: none; z-index: 2; opacity: 0.5; }
        .hud { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 10px 16px 8px; border-bottom: 1px solid rgba(137,216,255,0.06); background: linear-gradient(to bottom, rgba(0,0,0,0.42), transparent); }
        .hudLeft { display: flex; align-items: center; gap: 7px; }
        .hudDot { display: block; width: 6px; height: 6px; border-radius: 50%; background: #89d8ff; box-shadow: 0 0 6px #89d8ff, 0 0 12px rgba(137,216,255,0.5); animation: dotBlink 2.4s ease-in-out infinite; }
        @keyframes dotBlink { 0%, 100% { opacity: 1; box-shadow: 0 0 6px #89d8ff, 0 0 12px rgba(137,216,255,0.5); } 50% { opacity: 0.4; box-shadow: 0 0 2px #89d8ff; } }
        .hudLabel { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; color: rgba(137,216,255,0.92); text-shadow: 0 0 14px rgba(137,216,255,0.4), 0 2px 10px rgba(0,0,0,1); }
        .hudPill { display: inline-flex; align-items: center; height: 24px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); font-size: 0.57rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #e2f6ff; text-shadow: 0 2px 10px rgba(0,0,0,1); }
        
        .lockBadge { position: absolute; top: 16%; left: 0; right: 0; z-index: 20; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0 18px; }
        .lockIconWrap { position: relative; display: inline-grid; place-items: center; width: 36px; height: 36px; flex-shrink: 0; }
        .lockPulse { position: absolute; inset: -4px; border-radius: 60%; border: 2px solid rgba(255,65,111,0.4); animation: lockPulse 2.2s ease-out infinite; }
        @keyframes lockPulse { 0% { transform: scale(1); opacity: 0.8; } 70% { transform: scale(1.55); opacity: 0; } 100% { transform: scale(1.55); opacity: 0; } }
        .lockSvg { color: #ff416f; filter: drop-shadow(0 0 8px rgba(255,65,111,0.7)); position: relative; z-index: 1; }
        .lockTitle { margin: 0; font-size: clamp(1.3rem, 5.5vw, 1.9rem); font-weight: 900; letter-spacing: 0.03em; color: #ffffff; line-height: 1; text-shadow: 0 1px 0 rgba(255,255,255,0.12), 0 -1px 0 rgba(0,0,0,0.8), 0 2px 20px rgba(0,0,0,1), 0 0 30px rgba(0,0,0,0.9); }
        
        .inputPanel { position: absolute; bottom: 52px; left: 0; right: 0; z-index: 20; padding: 0 16px 10px; display: flex; flex-direction: column; gap: 10px; }
        .panelTopLine { width: 100%; height: 1px; background: linear-gradient(to right, transparent, rgba(137,216,255,0.35) 30%, rgba(137,216,255,0.6) 50%, rgba(137,216,255,0.35) 70%, transparent); box-shadow: 0 0 8px rgba(137,216,255,0.25); margin-bottom: 2px; }
        .inputPanelError { animation: shakePan 0.4s ease; }
        @keyframes shakePan { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
        
        .tabRow { display: flex; align-items: center; gap: 7px; }
        .tab { appearance: none; display: inline-flex; align-items: center; gap: 5px; border: 1px solid rgba(255,255,255,0.13); background: none; color: rgba(255,255,255,0.55); height: 28px; padding: 0 12px; border-radius: 999px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; text-shadow: 0 2px 10px rgba(0,0,0,0.9); transition: all 160ms; }
        .tab:hover { border-color: rgba(137,216,255,0.22); color: rgba(255,255,255,0.8); }
        .tabActive { border-color: rgba(137,216,255,0.38); color: #e8f7ff; box-shadow: 0 0 10px rgba(137,216,255,0.1), inset 0 0 10px rgba(137,216,255,0.04); text-shadow: 0 0 8px rgba(137,216,255,0.3), 0 2px 10px rgba(0,0,0,0.9); }
        .tabDot { display: block; width: 4px; height: 4px; border-radius: 50%; background: #89d8ff; box-shadow: 0 0 5px #89d8ff; flex-shrink: 0; }
        .tabSpacer { flex: 1; }
        .tabPrefix { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(137,216,255,0.95); text-shadow: 0 0 10px rgba(137,216,255,0.35), 0 2px 10px rgba(0,0,0,1); }
        
        .codeRow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; width: 60%; }
        .codeCell { position: relative; }
        .codeBox { width: 70%; height: 50px; border: 2px solid rgba(255,255,255,0.22); border-radius: 8px; background: rgba(5,12,22,0.52); outline: none; text-align: center; font-size: 1.18rem; font-weight: 950; color: #ffffff; text-transform: uppercase; text-shadow: 0 0 10px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,1); caret-color: #89d8ff; letter-spacing: 0.05em; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 14px rgba(0,0,0,0.3); transition: all 160ms; }
        .codeBox:focus { border-color: rgba(137,216,255,0.55); background: rgba(8,25,45,0.58); transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 3px rgba(137,216,255,0.09), 0 0 16px rgba(137,216,255,0.12), 0 6px 16px rgba(0,0,0,0.35); }
        .codeBoxError { border-color: rgba(255,65,111,0.55); background: rgba(45,5,18,0.52); box-shadow: inset 0 1px 0 rgba(255,100,120,0.08), 0 0 0 3px rgba(255,65,111,0.08), 0 0 14px rgba(255,65,111,0.14); }
        .cellGlow { position: absolute; bottom: -3px; left: 15%; right: 15%; height: 3px; border-radius: 999px; background: rgba(137,216,255,0.55); box-shadow: 0 0 8px rgba(137,216,255,0.6), 0 0 16px rgba(137,216,255,0.3); animation: cellGlowFade 0.3s ease-out; }
        @keyframes cellGlowFade { from { opacity: 0; transform: scaleX(0.4); } to { opacity: 1; transform: scaleX(1); } }
        .errorText { margin: -4px 0 -2px; font-size: 0.76rem; font-weight: 600; color: #ff8aa3; text-shadow: 0 0 10px rgba(255,65,111,0.4), 0 2px 10px rgba(0,0,0,0.9); text-align: center; }
        
        .unlockBtn { appearance: none; position: relative; width: 100%; height: 50px; border: 0; border-radius: 15px; background: linear-gradient(12deg, #a8e8ff 0%, #64c6ff 24%, #1c8af6 70%, #1070d8 100%); color: #03111e; font-size: 0.82rem; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; cursor: pointer; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.5), 0 2px 14px rgba(28,138,246,0.4), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.15); transition: all 160ms; }
        .unlockBtn:hover { transform: translateY(-2px); filter: brightness(1.06); }
        .unlockBtnShine { position: absolute; top: 0; bottom: 0; left: -70%; width: 60%; background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.28) 60%, rgba(255,255,255,0) 80%, transparent 90%); transform: skewX(-7deg); animation: btnShine 7.5s ease-in-out infinite; }
        @keyframes btnShine { 0% { left: -70%; opacity: 0; } 10% { opacity: 1; } 40% { left: 130%; opacity: 0; } 100% { left: 130%; opacity: 0; } }
        .unlockBtnText { position: relative; z-index: 1; }
        
        .hint { margin: -4px 0 0; font-size: 0.66rem; color: rgba(255,255,255,0.38); text-shadow: 0 2px 10px rgba(0,0,0,0.9); text-align: center; }
        .footer { position: absolute; bottom: 0; left: 0; right: 0; z-index: 20; height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-top: 1px solid rgba(255,255,255,0.05); background: linear-gradient(to top, rgba(0,0,0,0.5), transparent); font-size: 0.57rem; font-weight: 600; letter-spacing: 0.1em; color: rgba(255,255,255,0.26); text-shadow: 0 2px 8px rgba(0,0,0,0.9); }
        .footerFx { color: rgba(232,51,109,0.75); }
        .footerBot { font-size: 0.59rem; color: rgba(255,255,255,0.18); }
      `}</style>
    </section>
  );
}