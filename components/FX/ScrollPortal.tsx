"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import "./ScrollPortal.css";

export default function ScrollPortal() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  const artScale = useTransform(scrollYProgress, [0, .25, .55, .85, 1], [1, 1.07, 1.3, .84, .56]);
  const artY = useTransform(scrollYProgress, [0, .25, .55, 1], ["0vh", "-2vh", "-14vh", "-42vh"]);
  const fY = useTransform(scrollYProgress, [0, .5, 1], [0, -12, -60]);
  const xY = useTransform(scrollYProgress, [0, .5, 1], [0, 18, -42]);
  const roseY = useTransform(scrollYProgress, [0, .5, 1], [0, 14, -28]);
  const crownRotate = useTransform(scrollYProgress, [0, .1, .25, .48, .72, 1], [-8, 14, 40, 130, 260, 400]);
  const crownY = useTransform(scrollYProgress, [0, .5, 1], [0, -26, -115]);
  const crownScale = useTransform(scrollYProgress, [0, .5, 1], [1, 1.12, .87]);
  const introOpacity = useTransform(scrollYProgress, [0, .16, .3], [1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0, .3], [0, -55]);
  const photoOpacity = useTransform(scrollYProgress, [.18, .36, .75, 1], [0, 1, 1, .15]);
  const photoScale = useTransform(scrollYProgress, [.28, .56, .88], [.8, 1.12, 1.6]);
  const storyOpacity = useTransform(scrollYProgress, [.37, .52, .76, .92], [0, 1, 1, 0]);
  const storyY = useTransform(scrollYProgress, [.36, .6, .9], [65, 0, -95]);
  const curtainOpacity = useTransform(scrollYProgress, [.82, 1], [0, 1]);
  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return <section ref={root} className="fx-scroll-portal" aria-label="USER FX cinematic scroll entrance">
    <div className="fx-scroll-portal-sticky">
      <div className="fx-scroll-portal-bg" aria-hidden="true" />
      <motion.div className="fx-portal-photo" style={reduced ? undefined : { opacity: photoOpacity, scale: photoScale }} aria-hidden="true">
        <img src="/assets/album/PRVW/PRVW-01.jpg" alt="" draggable={false} />
      </motion.div>
      <motion.div className="fx-portal-art" style={reduced ? undefined : { scale: artScale, y: artY }} aria-hidden="true">
        <motion.div className="fx-portal-f-wrap" style={reduced ? undefined : { y: fY }}><img src="/iconF.png" alt="" draggable={false}/></motion.div>
        <motion.div className="fx-portal-x-wrap" style={reduced ? undefined : { y: xY }}><img src="/iconX.png" alt="" draggable={false}/></motion.div>
        <motion.div className="fx-portal-rose-wrap" style={reduced ? undefined : { y: roseY }}><img src="/iconRosa.png" alt="" draggable={false}/></motion.div>
        <motion.div className="fx-portal-crown-wrap" style={reduced ? undefined : { rotate: crownRotate, y: crownY, scale: crownScale }}>
          <img className="fx-portal-crown-spin" src="/iconCorona.png" alt="" draggable={false}/>
        </motion.div>
      </motion.div>
      <motion.div className="fx-scroll-portal-title" style={reduced ? undefined : { opacity: introOpacity, y: introY }}>
        <span>01 — IDENTITY</span><h2>THE STORY<br/><em>BEHIND FX.</em></h2><p>SCROLL TO ENTER ↓</p>
      </motion.div>
      <motion.div className="fx-scroll-portal-story" style={reduced ? undefined : { opacity: storyOpacity, y: storyY }}>
        <span>02 — MY STORY</span><h2>MORE THAN<br/><em>AN IMAGE.</em></h2><p>Exclusive photography. Your private world, revealed one frame at a time.</p>
      </motion.div>
      <motion.div className="fx-scroll-portal-curtain" style={reduced ? undefined : { opacity: curtainOpacity }} aria-hidden="true"/>
      <div className="fx-scroll-portal-counter"><span>USER FX / CINEMATIC ENTRY</span><span>01—02 / 04</span></div>
      <div className="fx-scroll-portal-progress"><motion.div style={{ width: progress }} /></div>
    </div>
  </section>;
}
