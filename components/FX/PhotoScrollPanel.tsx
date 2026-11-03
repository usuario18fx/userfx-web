"use client";
import { useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useAdminMode } from "@/components/PrivateRoom/PR-AdminMode";
import { SCENES, type Scene } from "./fxScenes";
import "./PhotoScrollPanel.css";
const CrownRose = dynamic(() => import("./ProtocolCrown3D"), { ssr: false });
function Photo({ scene, index, progress }: { scene: Scene; index: number; progress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const admin = useAdminMode();
  const opacity = useTransform(progress, [index * .22 + .04, index * .22 + .18], [0, 1]);
  const y = useTransform(progress, [index * .22 + .04, index * .22 + .18], [48, 0]);
  const feature = (scene.id === "videocall" ? "myroom" : scene.id) as Parameters<typeof admin.requestFeature>[0];
  return <motion.a className="fx-photo-reveal" href={scene.href} aria-label={`${scene.title} · ${scene.subtitle}`}
    style={reduced ? undefined : { opacity, y }} onClick={event => { if (admin.requestFeature(feature)) event.preventDefault(); }}>
    <img src={index === 0 ? "/assets/album/PRVW/PRVW-00.jpg" : scene.image} alt={scene.imageAlt} style={{ objectPosition: scene.position }} loading="lazy" decoding="async" draggable={false}/>
  </motion.a>;
}
export default function PhotoScrollPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return <div ref={ref} id="spaces" className={`fx-photo-sequence${reduced ? " is-reduced" : ""}`} aria-label="Explore UserFX spaces">
    <div className="fx-photo-sequence-stage">
      <div className="fx-photo-crown-rose" aria-hidden="true"><CrownRose progress={scrollYProgress} dissolveAt={2}/></div>
      <div className="fx-photo-sequence-grid">{SCENES.slice(0,4).map((scene,index) => <Photo key={scene.id} scene={scene} index={index} progress={scrollYProgress}/>)}</div>
    </div>
  </div>;
}
