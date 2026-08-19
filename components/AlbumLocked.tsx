import { useEffect, useState } from "react";
import styles from "./VaultPreview.module.css";

type AlbumLockPanelProps = {
  prefill: string | null;
  accessCode: string;
  onUnlock: () => void;
};

export default function AlbumLocked({
  prefill,
  accessCode,
  onUnlock,
}: AlbumLockPanelProps) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );
  const [code, setCode] = useState<string[]>(() =>
    (prefill || "").slice(-4).padStart(4, " ").split(""),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const updateCode = (index: number, value: string) => {
    setCode((current) =>
      current.map((character, position) =>
        position === index ? value.slice(-1) : character,
      ),
    );
    setError("");
  };

  const attemptUnlock = () => {
    if (code.join("") === accessCode.slice(-4)) {
      onUnlock();
    } else {
      setError("CÓDIGO INCORRECTO");
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.scanlines} />

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.topDot} />
          <span className={styles.brandMark}>FX</span>
          <span className={styles.brandFx}>VAULT</span>
        </div>

        <div className={styles.topMeta}>SECURE SESSION</div>

        <div className={styles.topRight}>
          <span className={styles.clock}>{time}</span>
          <div className={styles.lockedPill}>PREVIEW MODE</div>
        </div>
      </header>

      <div className={styles.stage}>
        <div className={styles.editorial}>
          <div className={styles.watermark}>FX</div>

          <p className={styles.kicker}>PRIVATE COLLECTION</p>

          <h1 className={styles.hero}>
            <span className={styles.heroAccess}>ACCESS</span>
            <span className={styles.heroRestricted}>RESTRICTED</span>
          </h1>

          <p className={styles.lead}>
            Bienvenido al archivo privado. Una selección curada de contenido
            exclusivo.
          </p>

          <p className={styles.body}>
            Actualmente nos encontramos en la fase final de ensamblaje del
            Vault. <strong>El acceso completo se habilitará muy pronto.</strong>
          </p>
        </div>

        <div className={styles.gate}>
          <div className={styles.watermark}>VAULT</div>

          <div className={styles.gateArt}>
            <div className={styles.gateMark}>FX</div>
            <div className={styles.padlock}>🔒</div>
            <h2 className={styles.gateTitle}>ACCESS CODE</h2>
          </div>

          <div className={styles.panel}>
            <div className={styles.tabRow}>
              <span className={`${styles.tab} ${styles.tabActive}`}>
                FX-USER01-
              </span>
              <span className={styles.tabGhost}>VAULT</span>
            </div>

            <div className={styles.codeRow}>
              {code.map((value: string, index: number) => (
                <input
                  key={index}
                  className={styles.codeBox}
                  value={value}
                  maxLength={1}
                  inputMode="text"
                  autoComplete="off"
                  aria-label={`Carácter ${index + 1} del código`}
                  onChange={(event) => updateCode(index, event.target.value)}
                />
              ))}
            </div>

            <button
              type="button"
              className={styles.goldBtn}
              onClick={attemptUnlock}
            >
              DESBLOQUEAR
            </button>

            <p className={styles.hint}>
              {error || "INTRODUCE LOS ÚLTIMOS 4 CARACTERES DEL CÓDIGO"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}