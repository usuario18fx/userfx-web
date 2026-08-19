"use client";

import React, { useState, useEffect } from "react";
import styles from "./VaultPreview.module.css"; // Asegúrate de que el CSS tenga este nombre

export default function VaultPreview() {
  const [time, setTime] = useState("");

  // Reloj de ejemplo para la topbar
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
          <span className={styles.brandMark}>FX</span>
          <span className={styles.brandFx}>VAULT</span>
        </div>
        <div className={styles.topMeta}>SECURE SESSION</div>
        <div className={styles.topRight}>
          <span className={styles.clock}>{time}</span>
          <div className={styles.lockedPill}>PREVIEW MODE</div>
        </div>
      </header>

      {/* Stage principal de 2 columnas */}
      <div className={styles.stage}>
        
        {/* Columna Izquierda: Editorial */}
        <div className={styles.editorial}>
          <div className={styles.watermark}>FX</div>
          
          <p className={styles.kicker}>PRIVATE COLLECTION</p>
          <h1 className={styles.hero}>
            <span className={styles.heroAccess}>ACCESS</span>
            <span className={styles.heroRestricted}>RESTRICTED</span>
          </h1>
          
          <p className={styles.lead}>
            Bienvenido al archivo privado. Una selección curada de contenido exclusivo.
          </p>
          <p className={styles.body}>
            Actualmente nos encontramos en la fase final de ensamblaje del Vault. 
            <strong> El acceso completo se habilitará muy pronto.</strong> Manténganse atentos para obtener su llave de acceso privada y descubrir el contenido.
          </p>
        </div>

        {/* Columna Derecha: Gate / Preview */}
        <div className={styles.gate}>
          <div className={styles.watermark}>VAULT</div>

          <div className={styles.gateArt}>
            <div className={styles.gateMark}>FX</div>
            <div className={styles.padlock}>🔒</div>
            <h2 className={styles.gateTitle}>COMING SOON</h2>
          </div>

          <div className={styles.panel}>
            <div className={styles.tabRow}>
              <button className={`${styles.tab} ${styles.tabActive}`}>FX-USER01-</button>
              <button className={styles.tabGhost}>VAULT</button>
            </div>

            <div className={styles.codeRow}>
              <input className={styles.codeBox} maxLength={1} disabled placeholder="•" />
              <input className={styles.codeBox} maxLength={1} disabled placeholder="•" />
              <input className={styles.codeBox} maxLength={1} disabled placeholder="•" />
              <input className={styles.codeBox} maxLength={1} disabled placeholder="•" />
            </div>

            <button className={styles.goldBtn} disabled>
              PRÓXIMAMENTE
            </button>

            <p className={styles.hint}>
              EL ACCESO AL VAULT SE HABILITARÁ PRONTO
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}