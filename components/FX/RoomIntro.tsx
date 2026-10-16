"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useMotionValueEvent, useScroll } from "framer-motion";
import "./RoomIntro.css";
const CinematicTour=dynamic(()=>import("./CinematicTour"),{ssr:false,loading:()=>(
<div className="fx-room-intro-loading">
LOADING USER FX ROOM…
</div>
)});
const STAGES=[
{at:0,title:"WELCOME",accent:"INSIDE",sub:"SCROLL TO ENTER YOUR WORLD"},
{at:.12,title:"THE",accent:"CORRIDOR",sub:"STEP INSIDE · THE CAMERA KEEPS MOVING"},
{at:.28,title:"MY",accent:"GALLERY",sub:"ART ON THE WALLS"},
{at:.45,title:"VIDEO",accent:"CALLS",sub:"PRIVATE LIVE SESSIONS"},
{at:.69,title:"STAGE",accent:"",sub:"PRIVATE PERFORMANCE SPACE"},
{at:.88,title:"USER",accent:"FX",sub:"WELCOME TO MY ROOM"}
];
export default function RoomIntro(){
const section=useRef<HTMLElement>(null);
const [progress,setProgress]=useState(0);
const {scrollYProgress}=useScroll({target:section,offset:["start start","end end"]});
useMotionValueEvent(scrollYProgress,"change",v=>setProgress(Math.max(0,Math.min(1,v))));
const index=STAGES.reduce((n,s,i)=>progress>=s.at?i:n,0);
const current=STAGES[index];
return (
<section className="fx-room-intro" ref={section} id="home" aria-label="USER FX continuous cinematic 3D tour">
<div className="fx-room-intro-sticky">
<CinematicTour progress={progress} />
<div className="fx-room-intro-shade" aria-hidden="true" />
<div className="fx-room-intro-head">
<span>USER FX / PRIVATE WORLD</span>
<nav aria-label="Tour sections">
GALLERY / STAGE / CALLS / PROTOCOL
</nav>
</div>
<div className="fx-room-intro-copy" key={index}>
<small>{String(index+1).padStart(2,"0")} / CINEMATIC JOURNEY</small>
<h1>
{current.title} <strong>{current.accent}</strong>
</h1>
<p>
{current.sub}
</p>
</div>
<div className="fx-room-intro-index" aria-hidden="true">
{String(index+1).padStart(2,"0")}
</div>
<div className="fx-room-intro-progress" aria-hidden="true">
<div style={{width:progress*100+"%"}} />
</div>
</div>
</section>
);
}
