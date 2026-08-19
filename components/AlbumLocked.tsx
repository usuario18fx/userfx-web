import { useEffect, useState } from "react";
import styles from "./VaultPreview.module.css";

type AlbumLockPanelProps = {
  prefill: string | null;
  accessCode: string;
  onUnlock: () => void;
};

export default function AlbumLockPanel({
  prefill,
  accessCode,
  onUnlock,
}: AlbumLockPanelProps) {
  const [time, setTime] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [error, setError] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const current = new Date();

      setTime(
        current.toLocaleTimeString("es-ES", {
          hour12: false,
        }),
      );
    };

    updateClock();

    const interval = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!prefill) {
      return;
    }

    const normalized = prefill
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-4)
      .toUpperCase();

    setCode(normalized.padEnd(4, "").split(""));
  }, [prefill]);

  const updateCode = (index: number, value: string) => {
    const next = [...code];
    next[index] = value.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();

    setCode(next);
    setError("");
  };

  const attemptUnlock = () => {
    const enteredCode = code.join("").toUpperCase();
    const validCode = accessCode
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-4)
      .toUpperCase();

    if (enteredCode !== validCode) {
      setError("CÓDIGO INVÁLIDO");
      return;
    }

    onUnlock();
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
              {code.map((value, index) => (
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