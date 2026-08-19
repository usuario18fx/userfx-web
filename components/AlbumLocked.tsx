"use client";

import React, { useState, useEffect } from "react";
import styles from "./VaultPreview.module.css"; // Asegúrate de que el nombre coincida con tu archivo CSS

export default function VaultPreview() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString("es-ES", { hour12: false }));
    };
    updateClock();
    const t = setInterval(updateClock, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.scanlines}></div>

      {/* Topbar */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.topDot}></span>
          <span className={styles.brandMark}>USER</span>
          <span className={styles.brandFx}>FX</span>
        </div>
        <div className={styles.topMeta}>NEW CONTENT EVERY WEEK.</div>
        <div className={styles.topRight}>
          <span className={styles.clock}>{time}</span>
          <div className={styles.lockedPill}>LOCKED</div>
        </div>
      </header>

      {/* Stage principal de 2 columnas */}
      <div className={styles.stage}>
        
        {/* Columna Izquierda: Editorial */}
        <div className={styles.editorial}>
          <div className={styles.watermark}>FX</div>
          
          {/* Decoraciones (Rosas y Corona) - reemplaza el src con tus imágenes cuando las tengas */}
          <img src="/rose.png" className={styles.roseTL} alt="" />
          <img src="/rose.png" className={styles.roseBR} alt="" />
          
          <p className={styles.kicker}>PRIVATE COLLECTION</p>
          <h1 className={styles.hero}>
            <span className={styles.heroAccess}>ACCESS</span>
            <span className={styles.heroRestricted}>RESTRICTED</span>
          </h1>
          
          <p className={styles.lead}>
            Bienvenido al archivo privado. Una selección curada de contenido exclusivo.
          </p>
          <p className={styles.body}>
            Para acceder a las llaves privadas y desbloquear el archivo completo, completa el proceso de verificación en el panel derecho.
          </p>

          <div className={styles.editorialFooter}>
            USERFX · PRIVATE VAULT N°01 NOCTURNA
          </div>
        </div>

        {/* Columna Derecha: Gate / Preview */}
        <div className={styles.gate}>
          <div className={styles.watermark}>VAULT</div>
          <img src="/crown.png" className={styles.crown} alt="" />

          <div className={styles.gateArt}>
            <div className={styles.gateMark}>FX</div>
            <div className={styles.padlock}>🔒</div>
            <h2 className={styles.gateTitle}>LOCKED ACCESS</h2>
          </div>

          <div className={styles.panel}>
            <div className={styles.tabRow}>
              <button className={`${styles.tab} ${styles.tabActive}`}>BS02 -</button>
              <button className={`${styles.tab} ${styles.tabActive}`}>PX01 -</button>
              <button className={styles.tabGhost}>VX03 -</button>
            </div>

            <div className={styles.codeRow}>
              <input className={styles.codeBox} maxLength={1} disabled placeholder="•" />
              <input className={styles.codeBox} maxLength={1} disabled placeholder="•" />
              <input className={styles.codeBox} maxLength={1} disabled placeholder="•" />
              <input className={styles.codeBox} maxLength={1} disabled placeholder="•" />
            </div>

            <button className={styles.goldBtn} disabled>
              UNLOCK ALBUM
            </button>

            <p className={styles.hint}>
              INTRODUCE LA LLAVE DE 4 CARACTERES
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}