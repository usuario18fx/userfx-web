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
{title:"WELCOME",accent:"INSIDE",sub:"SCROLL TO ENTER YOUR WORLD",body:"Una entrada distinta a USER FX. Desliza para descubrir el espacio."},
{title:"THE",accent:"CORRIDOR",sub:"YOUR PRIVATE JOURNEY BEGINS",body:"Luz, arte y detalles. Cada paso te acerca a una experiencia privada."},
{title:"MY",accent:"GALLERY",sub:"ART WITH PERSONALITY",body:"Una colección de piezas y símbolos que hacen único este lugar."},
{title:"ENTER",accent:"MY ROOM",sub:"AN INTIMATE WORLD",body:"Una habitación diseñada para explorar, conectar y permanecer."},
{title:"VIDEO",accent:"CALLS",sub:"CONNECT IN YOUR OWN SPACE",body:"Un ambiente privado para conversaciones y encuentros en vivo."},
{title:"THE",accent:"LOUNGE",sub:"MAKE YOURSELF COMFORTABLE",body:"Toma asiento. Aquí cada detalle forma parte de la experiencia."},
{title:"STAGE",accent:"",sub:"YOUR MOMENT TO SHINE",body:"Las luces cambian y el espacio se transforma en tu escenario."},
{title:"USER",accent:"FX",sub:"WELCOME TO YOUR WORLD",body:"El recorrido termina aquí. Lo que sucede después lo decides tú."}
];
// Match the existing eight camera keyframes exactly; each interval holds
// its initial view for 38% of the scroll distance, then moves smoothly.
const CAMERA_STOPS=[0,.13,.28,.41,.57,.70,.84,1];
function tourCameraProgress(scroll:number){
const value=Math.max(0,Math.min(1,scroll));
const segments=CAMERA_STOPS.length-1;
const scaled=Math.min(value*segments,segments);
const index=Math.min(Math.floor(scaled),segments-1);
const part=scaled-index;
const moving=Math.max(0,Math.min(1,(part-.38)/.62));
const eased=moving*moving*(3-2*moving);
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
