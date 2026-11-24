"use client";
import { useEffect, useRef, useState } from "react";
import { useScroll } from "framer-motion";
import ProtocolCrown, { type CrownTL } from "./ProtocolCrown";
import "./CrownPlayground.css";

const STAGE_TIMELINE: CrownTL = {
  descend: [0.99, 1],
  rise: [0.99, 1],
  breakStart: 0.66,
  fade: [0.98, 1],
};

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
    <section id="crown-playground" className="fx-crown-playground" ref={host} aria-label="Interactive crown stage">
      <div className="fx-crown-playground-sticky">
        <ProtocolCrown progress={scrollYProgress} tl={STAGE_TIMELINE} active={visible} interactive className="fx-crown-playground-canvas" />
        <div className="fx-crown-playground-info" aria-hidden="true">
          <span>ᴄʀᴏᴡɴ ᴜɴʟᴏᴄᴋᴇᴅ</span>
          <small>ᴄʟɪᴄᴋ ᴛᴏ ᴅʀᴏᴘ · ᴅʀᴀɢ ᴛᴏ ʀᴏᴛᴀᴛᴇ · ᴄʟɪᴄᴋ ᴀɢᴀɪɴ ᴛᴏ ʀᴇʙᴜɪʟᴅ</small>
        </div>
      </div>
    </section>
  );
}
