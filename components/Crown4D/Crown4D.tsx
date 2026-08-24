"use client";

import { useRef, type PointerEvent } from "react";
import styles from "./Crown4D.module.css";

export default function Crown4D() {
  const crownRef = useRef<HTMLDivElement>(null);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = crownRef.current;
    if (!element) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    element.style.setProperty("--rotateX", `${(0.5 - y) * 18}deg`);
    element.style.setProperty("--rotateY", `${(x - 0.5) * 24}deg`);
    element.style.setProperty("--lightX", `${x * 100}%`);
    element.style.setProperty("--lightY", `${y * 100}%`);
  };

  const handleLeave = () => {
    const element = crownRef.current;
    if (!element) return;

    element.style.setProperty("--rotateX", "0deg");
    element.style.setProperty("--rotateY", "0deg");
    element.style.setProperty("--lightX", "50%");
    element.style.setProperty("--lightY", "40%");
  };

  return (
    <div
      ref={crownRef}
      className={styles.scene}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div className={styles.floating}>
        <div className={styles.crown}>
          <img
            src="/assets/iconos/corona.png"
            alt="Corona azul"
            className={styles.depth}
            draggable={false}
          />

          <img
            src="/assets/iconos/corona.png"
            alt=""
            className={styles.image}
            draggable={false}
          />

          <span className={styles.light} />

          <span className={`${styles.spark} ${styles.spark1}`} />
          <span className={`${styles.spark} ${styles.spark2}`} />
          <span className={`${styles.spark} ${styles.spark3}`} />
          <span className={`${styles.spark} ${styles.spark4}`} />
          <span className={`${styles.spark} ${styles.spark5}`} />
        </div>
      </div>
    </div>
  );
}