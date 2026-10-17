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
// Story pacing: give each camera view a stable reading pause before moving on.
const STAGES=[
{title:"WELCOME",accent:"INSIDE",sub:"A PRIVATE WORLD AWAITS",body:"Comienza el recorrido. Cada paso revela una parte de USER FX."},
{title:"STEP",accent:"INSIDE",sub:"FOLLOW THE LIGHT",body:"Entra despacio. El ambiente y sus detalles marcan el camino."},
{title:"THE",accent:"CORRIDOR",sub:"THE JOURNEY CONTINUES",body:"Un pasillo de arte, reflejos y luz cálida conduce a tu habitación."},
{title:"ENTER",accent:"MY ROOM",sub:"WELCOME TO YOUR SPACE",body:"Deja atrás el pasillo y descubre el interior de MY ROOM."},
{title:"MY",accent:"GALLERY",sub:"A DIFFERENT PERSPECTIVE",body:"Desde una vista elevada, descubre la habitación y sus piezas de arte."},
{title:"VIDEO",accent:"CALLS",sub:"CONNECT IN PRIVATE",body:"Un lugar para conversar, compartir y encontrarse."},
{title:"STAGE",accent:"",sub:"THE ROOM IS YOUR STAGE",body:"Una perspectiva amplia, iluminación íntima y tu propio escenario."},
{title:"USER",accent:"FX",sub:"YOUR WORLD, YOUR EXPERIENCE",body:"Explora lo que sigue a tu manera."}
];
// Use one synchronized timeline for eight captions and eight 3D camera poses.
// Longer movement windows preserve the spatial continuity between viewpoints.
const CAMERA_STOPS=[0,.13,.28,.41,.57,.70,.84,1];
function tourCameraProgress(scroll:number){
const value=Math.max(0,Math.min(1,scroll));
const segments=CAMERA_STOPS.length-1;
const scaled=value*segments;
const index=Math.min(Math.floor(scaled),segments-1);
const part=Math.max(0,Math.min(1,scaled-index));
// A short reading hold, a long smooth move, then a brief arrival pause.
const moving=Math.max(0,Math.min(1,(part-.10)/.80));
const eased=moving*moving*moving*(moving*(moving*6-15)+10);
return CAMERA_STOPS[index]+(CAMERA_STOPS[index+1]-CAMERA_STOPS[index])*eased;
}
export default function RoomIntro(){
const section=useRef<HTMLElement>(null);
const [progress,setProgress]=useState(0);
const {scrollYProgress}=useScroll({target:section,offset:["start start","end end"]});
useMotionValueEvent(scrollYProgress,"change",v=>setProgress(Math.max(0,Math.min(1,v))));
const index=Math.min(Math.floor(progress*STAGES.length),STAGES.length-1);
const cameraProgress=tourCameraProgress(progress);
const current=STAGES[index];
return (
<section className="fx-room-intro" ref={section} id="home" aria-label="USER FX continuous cinematic 3D tour">
<div className="fx-room-intro-sticky">
<CinematicTour progress={cameraProgress} />
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
<p className="fx-room-intro-description">
{current.body}
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
