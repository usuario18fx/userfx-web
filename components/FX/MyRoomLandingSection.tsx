"use client";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import "./MyRoomLandingSection.css";

const MyRoom3D = dynamic(() => import("./MyRoom3D"), {
  ssr: false,
  loading: () => <div className="ufx-myroom-landing-loading" role="status">OPENING MY ROOM…</div>,
});

export default function MyRoomLandingSection() {
  const [lightsOn, setLightsOn] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const roomY = useTransform(scrollYProgress, [0, .5, 1], [90, 0, -65]);
  const roomScale = useTransform(scrollYProgress, [0, .5, 1], [.92, 1, 1.04]);
  const roomOpacity = useTransform(scrollYProgress, [0, .24, .82, 1], [.45, 1, 1, .75]);
  const titleY = useTransform(scrollYProgress, [0, .5, 1], [48, 0, -35]);
  const titleOpacity = useTransform(scrollYProgress, [0, .2, .86, 1], [.3, 1, 1, .65]);
  return (
    <section ref={sectionRef} className="ufx-myroom-landing" aria-labelledby="ufx-myroom-heading">
      <div className="ufx-myroom-landing-layout">
        <motion.div className="ufx-myroom-landing-copy" style={reduced ? undefined : { y: titleY, opacity: titleOpacity }}>
          <span className="ufx-myroom-landing-kicker">A PRIVATE SPACE / 3D EXPERIENCE</span>
          <h2 id="ufx-myroom-heading">ENTER<br/><em>MY<br/>ROOM.</em></h2>
          <p>Move the camera. Explore the objects. Change the lights.</p>
          <button type="button" aria-pressed={!lightsOn} onClick={() => setLightsOn(value => !value)}>
            {lightsOn ? "DIM LIGHTS" : "TURN ON LIGHTS"} <span aria-hidden="true">↗</span>
          </button>
        </motion.div>
        <motion.div className="ufx-myroom-landing-view" style={reduced ? undefined : { y: roomY, scale: roomScale, opacity: roomOpacity }}><MyRoom3D lightsOn={lightsOn} /></motion.div>
      </div>
      <a className="ufx-myroom-landing-enter" href="/#/private-room">ENTER PRIVATE ROOM ↗</a>
    </section>
  );
}
