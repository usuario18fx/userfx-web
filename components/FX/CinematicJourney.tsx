"use client";
import { useState, type CSSProperties, type PointerEvent } from "react";
import dynamic from "next/dynamic";
const MyRoom3D = dynamic(() => import("./MyRoom3D"), { ssr: false, loading: () => <div className="fx-room3d-loading">LOADING 3D ROOM…</div> });
import "./CinematicJourney.css";
import ScrollPortal from "./ScrollPortal";

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
  <div id="identity"><ScrollPortal /></div>
  <section id="story" className="fx-full-gallery" aria-label="Cinematic photography chapter">
    <div className="fx-gallery-title"><span>02 / PRIVATE PHOTOGRAPHY</span><h2>BEHIND<br/><em>THE FRAME.</em></h2><p>PUBLIC PREVIEW / EXCLUSIVE COLLECTIONS REQUIRE ACCESS</p></div>
    <div className="fx-gallery-strip">
      {["01","02","03"].map((n,i)=><figure key={n}><img loading="lazy" src={`/assets/album/PRVW/PRVW-${n}.jpg`} alt={`USER FX public photography preview ${n}`}/><figcaption>{String(i+1).padStart(2,"0")} / USER FX</figcaption></figure>)}
    </div>
    <a className="fx-gallery-enter" href="/#/private-room/gallery">UNLOCK THE COLLECTION ↗</a>
  </section>
  <section id="room" className="fx-full-room">
    <div className="fx-full-room-copy"><span>03 / BEYOND THE DOOR</span><h2>ENTER<br/><em>MY ROOM.</em></h2><p>Move the camera. Explore the objects. Change the lights.</p><button type="button" onClick={()=>setRoomLight(v=>!v)}>{roomLight?"DIM LIGHTS":"TURN ON LIGHTS"} ↗</button></div>
    <MyRoom3D lightsOn={roomLight}/>
    <a href="/#/private-room" className="fx-full-room-enter">ENTER PRIVATE ROOM ↗</a>
  </section>
  <section id="stage" className="fx-full-stage">
    <div className="fx-full-stage-light" aria-hidden="true"/>
    <div className="fx-full-stage-ring" aria-hidden="true"/>
    <div className="fx-full-stage-content"><span>04 / THE LIVE EXPERIENCE</span><h2>TAKE<br/>THE <em>STAGE.</em></h2><p>PRIVATE CALLS / LIVE MOMENTS / AN EXCLUSIVE COLLECTION</p><div className="fx-full-stage-actions"><a href="/#/private-room/stage">ENTER THE STAGE ↗</a><a href="/#/private-room/gallery">VIEW THE GALLERY ↗</a></div></div>
    <span className="fx-full-stage-bottom">USER FX / SHARED EXPERIENCE</span>
  </section>
  {missing.length>0&&<aside className="fx-journey-assets" role="alert">Missing from public/: {missing.join(", ")}</aside>}
  <footer className="fx-journey-footer"><a href="/">RETURN TO USER18FX.COM ↗</a><span>EXPERIMENTAL PREVIEW · 2026</span></footer>
 </main>;
}
