"use client";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import "./MyRoomLandingSection.css";
import type { RoomScene } from "./MyRoom3D";

const MyRoom3D = dynamic(() => import("./MyRoom3D"), {ssr:false,loading:()=> <div className="ufx-myroom-landing-loading">OPENING 3D EXPERIENCE…</div>});
const chapters:{mode:RoomScene;title:string;eyebrow:string}[]=[
 {mode:"bedroom",title:"MY ROOM",eyebrow:"01 / PRIVATE SPACE"},
 {mode:"gallery",title:"GALLERY",eyebrow:"02 / PHOTOGRAPHY"},
 {mode:"stage",title:"RUNWAY STAGE",eyebrow:"03 / LIVE EXPERIENCE"}
];
export default function MyRoomLandingSection(){
 const section=useRef<HTMLElement>(null);
 const [progress,setProgress]=useState(0);
 const [lightsOn,setLightsOn]=useState(true);
 const reduce=useReducedMotion();
 const {scrollYProgress}=useScroll({target:section,offset:["start start","end end"]});
 useMotionValueEvent(scrollYProgress,"change",v=>setProgress(Math.max(0,Math.min(1,v))));
 const index=reduce?0:Math.min(2,Math.floor(progress*3));
 const chapter=chapters[index];
 const local=reduce?0:Math.min(1,Math.max(0,progress*3-index));
 return <section ref={section} className="ufx-scroll-house" aria-label="Scroll through USER FX spaces">
  <div className="ufx-scroll-house-sticky">
   <div className="ufx-scroll-house-copy"><span>{chapter.eyebrow}</span><h2>{chapter.title}</h2><p>{index===0?"Explore my private space.":index===1?"Behind each photograph, another story.":"The runway is yours."}</p><button type="button" onClick={()=>setLightsOn(x=>!x)}>{lightsOn?"DIM LIGHTS":"TURN ON LIGHTS"} ↗</button></div>
   <div className="ufx-scroll-house-viewport"><MyRoom3D mode={chapter.mode} lightsOn={lightsOn} journeyProgress={local}/></div>
   <div className="ufx-scroll-house-bottom"><span>SCROLL TO EXPLORE ↓</span><div className="ufx-scroll-house-bars">{chapters.map((c,i)=><span key={c.mode} className={i===index?"is-current":""}/>)}</div><a href="/#/private-room">ENTER PRIVATE ROOM ↗</a></div>
  </div>
 </section>;
}
