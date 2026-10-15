"use client";
import { useState, type CSSProperties, type PointerEvent } from "react";
import dynamic from "next/dynamic";
const MyRoom3D = dynamic(() => import("./MyRoom3D"), { ssr: false, loading: () => <div className="fx-room3d-loading">LOADING 3D ROOM…</div> });
import "./CinematicJourney.css";

const chapters = [
  {num:"01",title:"PORTADA / FX IDENTITY",id:"identity",description:"Four independent pieces become one identity. Scroll to reveal the story."},
  {num:"02",title:"MY STORY",id:"story",description:"Photography becomes a sequence of moments, memories and personal chapters."},
  {num:"03",title:"MYROOM 3D",id:"room",description:"A concept for a personal virtual room with objects and lighting."},
  {num:"04",title:"STAGE / GALLERY",id:"stage",description:"Your private collection and shared stage, with access through the existing site."}
] as const;
export default function CinematicJourney(){
 const [pointer,setPointer]=useState({x:0,y:0});
 const [roomLight,setRoomLight]=useState(true);
 const [missing,setMissing]=useState<string[]>([]);
 const fail=(n:string)=>setMissing(old=>old.includes(n)?old:[...old,n]);
 const move=(e:PointerEvent<HTMLDivElement>)=>{
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const r=e.currentTarget.getBoundingClientRect();
  setPointer({x:((e.clientX-r.left)/r.width-.5)*2,y:((e.clientY-r.top)/r.height-.5)*2});
 };
 return <main className="fx-journey">
  <header className="fx-journey-header"><a href="/">USER FX</a><span>PRIVATE VAULT / CINEMATIC STUDY</span><a href="/crown-lab">CROWN LAB ↗</a></header>
  <nav className="fx-journey-nav" aria-label="Chapters">{chapters.map(c=><a href={"#"+c.id} key={c.id}>{c.num} <span>{c.title}</span></a>)}</nav>
  <section id="identity" className="fx-journey-section fx-journey-identity">
   <div className="fx-journey-copy"><span className="fx-journey-kicker">01 / FX IDENTITY</span><h1>THIS IS<br/><em>USER FX.</em></h1><p>Four elements. One signature. A cinematic identity built from metallic blue letters, a red rose and a floating crown.</p><a className="fx-journey-action" href="#story">EXPLORE MY STORY ↓</a></div>
   <div className="fx-journey-emblem" onPointerMove={move} onPointerLeave={()=>setPointer({x:0,y:0})} style={{"--move-x":pointer.x,"--move-y":pointer.y} as CSSProperties} aria-label="FX emblem in four visual layers">
    <div className="fx-journey-orbit"/>
    <img className="piece piece-f" src="/iconF.png" alt="Metallic blue letter F" onError={()=>fail("iconF.png")}/>
    <img className="piece piece-x" src="/iconX.png" alt="Metallic blue letter X" onError={()=>fail("iconX.png")}/>
    <img className="piece piece-rose" src="/iconRosa.png" alt="Red rose" onError={()=>fail("iconRosa.png")}/>
    <img className="piece piece-crown" src="/iconCorona.png" alt="Blue crown" onError={()=>fail("iconCorona.png")}/>
   </div>
  </section>
  <section id="story" className="fx-journey-section fx-journey-story"><div className="fx-journey-intro"><span className="fx-journey-kicker">02 / MY STORY</span><h2>NOT JUST PHOTOS.<br/><em>MY STORY.</em></h2><p>Portraits, places, details and moments told through image-led chapters. Public preview photographs are used here; private albums remain protected.</p></div>
   <div className="fx-journey-photo-grid">
    <figure className="fx-journey-photo fx-journey-photo-tall"><img src="/assets/album/PRVW/PRVW-01.jpg" alt="User FX portrait preview" loading="lazy"/><figcaption>01 / IDENTITY</figcaption></figure>
    <figure className="fx-journey-photo"><img src="/assets/album/PRVW/PRVW-02.jpg" alt="User FX photo memory" loading="lazy"/><figcaption>02 / MOMENTS</figcaption></figure>
    <figure className="fx-journey-photo"><img src="/assets/album/PRVW/PRVW-03.jpg" alt="User FX portrait chapter" loading="lazy"/><figcaption>03 / EXPERIENCES</figcaption></figure>
   </div>
  </section>
  <section id="room" className="fx-journey-section fx-journey-room"><div className="fx-journey-intro"><span className="fx-journey-kicker">03 / MYROOM 3D</span><h2>A SPACE<br/><em>OF MY OWN.</em></h2><p>Explore an interactive 3D bedroom. Drag to rotate, scroll to zoom, click an object, and switch the ambient lighting.</p><button type="button" className="fx-journey-action" onClick={()=>setRoomLight(v=>!v)} aria-pressed={roomLight}>{roomLight?"DIM THE LIGHTS":"TURN ON LIGHTS"} ↗</button></div>
   <MyRoom3D lightsOn={roomLight}/>
   <a className="fx-journey-link" href="/#/private-room">OPEN EXISTING MYROOM ↗</a>
  </section>
  <section id="stage" className="fx-journey-section fx-journey-stage"><div className="fx-journey-intro"><span className="fx-journey-kicker">04 / STAGE + GALLERY</span><h2>THE SPOTLIGHT.<br/><em>THE COLLECTION.</em></h2><p>The live stage and private gallery remain connected to the existing access system. These previews do not expose protected media.</p></div><div className="fx-journey-end-grid"><a href="/#/private-room/stage" className="fx-journey-end-card"><img src="/assets/videocall.jpg" alt="Video call preview" loading="lazy"/><strong>STAGE <span>↗</span></strong><small>SHARED SPACE / LIVE SESSIONS</small></a><a href="/#/private-room/gallery" className="fx-journey-end-card"><img src="/assets/album/PRVW/PRVW-01.jpg" alt="Gallery public preview" loading="lazy"/><strong>GALLERY <span>↗</span></strong><small>PRIVATE COLLECTION / VERIFIED ACCESS</small></a></div></section>
  {missing.length>0&&<aside className="fx-journey-assets" role="alert">Missing from public/: {missing.join(", ")}</aside>}
  <footer className="fx-journey-footer"><a href="/">RETURN TO USER18FX.COM ↗</a><span>EXPERIMENTAL PREVIEW · 2026</span></footer>
 </main>;
}
