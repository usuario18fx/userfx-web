"use client";
import {useRef,useState} from "react";
import dynamic from "next/dynamic";
import {useMotionValueEvent,useScroll} from "framer-motion";
import "./RoomIntro.css";
const MyRoom3D=dynamic(()=>import("./MyRoom3D"),{ssr:false,loading:()=> <div className="fx-room-intro-loading">LOADING MY ROOM…</div>});
export default function RoomIntro(){
 const section=useRef<HTMLElement>(null);
 const [progress,setProgress]=useState(0);
 const [opened,setOpened]=useState(false);
 const {scrollYProgress}=useScroll({target:section,offset:["start start","end end"]});
 useMotionValueEvent(scrollYProgress,"change",v=>setProgress(Math.max(0,Math.min(1,v))));
 const labels=["LEFT WALL","BACK WALL","RIGHT WALL","MY GALLERY"];
 const label=labels[Math.min(3,Math.floor(progress*4))];
 return <section className="fx-room-intro" ref={section} aria-label="Enter USER FX virtual room">
  <div className="fx-room-intro-sticky">
   <div className="fx-room-intro-scene"><MyRoom3D intro mode="bedroom" lightsOn journeyProgress={progress}/></div>
   <div className="fx-room-intro-gradient" aria-hidden="true"/>
   <div className="fx-room-intro-top"><span>USER FX / PRIVATE ROOM</span><span>{label}</span></div>
   <div className="fx-room-intro-caption"><span>01 / YOUR WORLD</span><h1>WELCOME<br/><em>INSIDE.</em></h1><p>SCROLL TO EXPLORE THE ROOM ↓</p></div>
   {progress>.84&&<div className="fx-room-intro-screen"><span>THE SCREEN IS READY</span><button type="button" onClick={()=>setOpened(true)}>OPEN MY GALLERY ↗</button></div>}
   {opened&&<div className="fx-room-intro-gallery" role="dialog" aria-modal="true" aria-label="MY GALLERY"><button type="button" className="fx-room-intro-close" onClick={()=>setOpened(false)}>CLOSE ×</button><h2>MY GALLERY</h2><div className="fx-room-intro-images">{["01","02","03"].map(n=><img key={n} src={`/assets/album/PRVW/PRVW-${n}.jpg`} alt={`USER FX public photo ${n}`}/>)}</div><a href="/#/private-room/gallery">ENTER THE PRIVATE COLLECTION ↗</a></div>}
   <div className="fx-room-intro-progress"><div style={{width:(progress*100)+"%"}}/></div>
  </div>
 </section>;
}
