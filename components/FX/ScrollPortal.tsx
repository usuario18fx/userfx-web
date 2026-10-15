"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import "./ScrollPortal.css";

export default function ScrollPortal(){
 const root=useRef<HTMLElement>(null);
 const reduce=useReducedMotion();
 const {scrollYProgress}=useScroll({target:root,offset:["start start","end end"]});
 const emblemScale=useTransform(scrollYProgress,[0,.32,.72,1],[1,1.4,.48,.25]);
 const emblemY=useTransform(scrollYProgress,[0,.3,.7,1],["0vh","-6vh","-27vh","-45vh"]);
 const emblemRotate=useTransform(scrollYProgress,[0,.4,1],[0,-9,25]);
 const titleOpacity=useTransform(scrollYProgress,[0,.13,.28],[1,1,0]);
 const storyOpacity=useTransform(scrollYProgress,[.27,.42,.67,.83],[0,1,1,0]);
 const storyY=useTransform(scrollYProgress,[.3,.52,.76],["17vh","0vh","-14vh"]);
 const photoScale=useTransform(scrollYProgress,[.32,.56,.84],[.8,1.14,1.55]);
 const photoRadius=useTransform(scrollYProgress,[.3,.5,.82],["38px","9px","0px"]);
 const photoOpacity=useTransform(scrollYProgress,[.21,.38,.8,.96],[0,1,1,0]);
 const curtain=useTransform(scrollYProgress,[.68,.89],[0,1]);
 const progress=useTransform(scrollYProgress,[0,1],["0%","100%"]);
 return <section ref={root} className="fx-scroll-portal" aria-label="FX scroll-controlled cinematic opening">
   <div className="fx-scroll-portal-sticky">
     <div className="fx-scroll-portal-grain" aria-hidden="true"/>
     <motion.div className="fx-scroll-portal-photo" style={reduce?undefined:{opacity:photoOpacity,scale:photoScale,borderRadius:photoRadius}} aria-hidden="true">
       <img src="/assets/album/PRVW/PRVW-01.jpg" alt="" draggable={false}/>
     </motion.div>
     <motion.div className="fx-scroll-portal-emblem" style={reduce?undefined:{scale:emblemScale,y:emblemY,rotateZ:emblemRotate}} aria-hidden="true">
       <img className="fx-portal-f" src="/iconF.png" alt=""/>
       <img className="fx-portal-x" src="/iconX.png" alt=""/>
       <img className="fx-portal-rose" src="/iconRosa.png" alt=""/>
       <img className="fx-portal-crown" src="/iconCorona.png" alt=""/>
     </motion.div>
     <motion.div className="fx-scroll-portal-title" style={reduce?undefined:{opacity:titleOpacity}}>
       <span>01 — IDENTITY</span>
       <h2>THE STORY<br/><em>BEHIND FX.</em></h2>
       <p>SCROLL TO ENTER ↓</p>
     </motion.div>
     <motion.div className="fx-scroll-portal-story" style={reduce?undefined:{opacity:storyOpacity,y:storyY}}>
       <span>02 — THE PERSON BEHIND THE IMAGE</span>
       <h2>EVERY FRAME<br/><em>HAS A STORY.</em></h2>
       <p>Personal photographs. A journey told through movement, light and perspective.</p>
     </motion.div>
     <motion.div className="fx-scroll-portal-curtain" style={reduce?undefined:{opacity:curtain}} aria-hidden="true"/>
     <div className="fx-scroll-portal-counter"><span>FX / SCROLL EXPERIENCE</span><span>01—02 / 04</span></div>
     <div className="fx-scroll-portal-progress"><motion.div style={{width:progress}}/></div>
   </div>
 </section>;
}
