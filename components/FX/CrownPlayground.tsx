"use client";
import { useEffect, useRef, useState } from "react";
import { useScroll } from "framer-motion";
import CrownEnergyStage from "./CrownEnergyStage";
import "./CrownPlayground.css";

export default function CrownPlayground() {
  const host = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const { scrollYProgress } = useScroll({ target: host, offset: ["start start", "end end"] });

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="crown-playground" className="fx-crown-playground fx-crown-playground--energy" ref={host} aria-label="Interactive crown stage">
      <div className="fx-crown-playground-sticky">
        <CrownEnergyStage progress={scrollYProgress} active={visible} />
      </div>
    </section>
  );
}
