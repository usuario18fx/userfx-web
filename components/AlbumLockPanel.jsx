import React from "react";
import styles from "./HeroRealBg.module.css";

export default function HeroRealBg() {
  return (
    <section className={styles.hero}>
      <div className={styles.bgPhoto} />
      <div className={styles.bgShade} />
      <div className={styles.bgGlow} />
      <div className={styles.bgNoise} />

      <div className={styles.brandLayer}>
        <div className={styles.userfxWrap}>
          <span className={styles.userWord}>USER</span>

          <div className={styles.fxBlock}>
            <div className={styles.crownWrap}>
              <img
                src="/assets/corona.png"
                alt=""
                className={styles.crownImg}
                aria-hidden="true"
              />
              <span className={styles.crownShine} />
            </div>

            <span className={styles.fxWord}>FX</span>
          </div>

          <div className={styles.roseWrap}>
            <img
              src="/assets/rosa.png"
              alt=""
              className={styles.roseImg}
              aria-hidden="true"
            />
            <span className={styles.roseGlow} />
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.panel}>
          <p className={styles.kicker}>REAL BACKGROUND / ATMOSPHERIC FX</p>
          <h1 className={styles.title}>USER FX</h1>
          <p className={styles.text}>
            Fondo real con capas leves, brillo fino en corona y bloom suave en la rosa.
          </p>
        </div>
      </div>
    </section>
  );
}
