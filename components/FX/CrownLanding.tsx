"use client";

import { useEffect, useRef, useState } from "react";
import "./CrownLanding.css";

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(v:number)=>{const x=clamp(v);return x*x*(3-2*x);};
const ITEMS=[
{n:"01",title:"THE SIGNAL",caption:"Every moment starts somewhere."},
{n:"02",title:"MY ROOM",caption:"A private world behind the crown."},
{n:"03",title:"UNFILTERED",caption:"Your moment. Your rules."}
] as const;

export default function CrownLanding(){
const page=useRef<HTMLElement>(null);
const [progress,setProgress]=useState(0);
useEffect(()=>{
let request=0;
const update=()=>{
cancelAnimationFrame(request);
request=requestAnimationFrame(()=>{
const section=page.current;
if(!section)return;
const rect=section.getBoundingClientRect();
const length=Math.max(1,rect.height-window.innerHeight);
setProgress(clamp(-rect.top/length));
});
};
update();
window.addEventListener("scroll",update,{passive:true});
window.addEventListener("wheel",update,{passive:true});
window.addEventListener("resize",update);
return ()=>{window.removeEventListener("scroll",update);window.removeEventListener("wheel",update);window.removeEventListener("resize",update);cancelAnimationFrame(request);};
},[]);
const rise=ease(progress/.37);
const launch=ease((progress-.29)/.23);
const reveal=ease((progress-.36)/.18);
const gallery=ease((progress-.58)/.18);
const active=Math.min(2,Math.floor(clamp((progress-.72)/.28)*3));
const angle=progress*440;
const crownOpacity=1-ease((progress-.47)/.12);
return (
<main className="fx-crown-scroll-page" ref={page}>
<div className="fx-crown-fixed">
<div className="fx-crown-backdrop" aria-hidden="true" />
<div className="fx-crown-beam" aria-hidden="true" />
<div className="fx-crown-mist" aria-hidden="true" />
<div className="fx-crown-floor" style={{opacity:1-launch}} aria-hidden="true" />
<header className="fx-crown-navigation" style={{opacity:reveal,pointerEvents:reveal>.9?"auto":"none"}}>
<a href="/crown" className="fx-crown-logo">USER <strong>FX</strong></a>
<nav aria-label="Navegación principal">
<a href="#experience">EXPERIENCE</a>
<a href="#my-room">MY ROOM</a>
<a href="#moments">MOMENTS</a>
</nav>
<a className="fx-crown-enter" href="/#home">ENTER MY ROOM <span>↗</span></a>
</header>
<div className="fx-crown-crown" style={{opacity:crownOpacity,transform:`translate3d(-50%,calc(-50% - ${rise*27}vh),0) perspective(1000px) rotateY(${angle}deg) rotateZ(${-rise*8}deg) scale(${1+launch*3.7})`}}>
<video autoPlay loop muted playsInline preload="auto" aria-label="Corona azul de USER FX">
<source src="/assets/crown/CORONA-DARK.mp4" type="video/mp4" />
</video>
<div className="fx-crown-halo" />
</div>
<section className="fx-crown-wordmark" id="experience" style={{opacity:reveal*(1-gallery*.9),transform:`translate3d(0,${(1-reveal)*45-gallery*12}px,0) scale(${.87+reveal*.13})`}}>
<p className="fx-crown-overline">THIS IS YOUR EXPERIENCE</p>
<h1>USER<span>FX</span></h1>
<p className="fx-crown-slogan">YOUR MOMENT. <em>UNFILTERED.</em></p>
<a href="#my-room" className="fx-crown-discover">DISCOVER MY ROOM <span>↓</span></a>
</section>
<section className="fx-crown-gallery" id="my-room" style={{opacity:gallery,transform:`translateY(${(1-gallery)*12}vh)`,pointerEvents:gallery>.9?"auto":"none"}}>
<div className="fx-crown-gallery-heading">
<div><span>THE WORLD OF USER FX</span><h2>BEYOND THE <em>ORDINARY.</em></h2></div>
<span className="fx-crown-gallery-sequence">001 — 003</span>
</div>
<div className="fx-crown-triptych" id="moments">
{ITEMS.map((item,i)=>(
<article key={item.n} className={`fx-crown-tile fx-crown-tile-${i} ${active===i?"is-current":""}`}>
<div className="fx-crown-tile-light" />
<div className="fx-crown-tile-copy">
<small>{item.n} / 03</small>
<h3>{item.title}</h3>
<p>{item.caption}</p>
</div>
</article>
))}
</div>
<div className="fx-crown-timeline">
<span>00:00</span>
<div className="fx-crown-timeline-rail">
<div className="fx-crown-timeline-fill" style={{width:`${clamp((progress-.72)/.28)*100}%`}} />
{ITEMS.map((item,i)=><span key={item.n} className="fx-crown-timeline-tick" style={{left:`${(i+.5)/3*100}%`}} />)}
</div>
<span>01:00</span>
</div>
<p className="fx-crown-timeline-description">{ITEMS[active].caption}</p>
</section>
{progress<.6&&<div className="fx-crown-hint">SCROLL TO ENTER <span>↓</span></div>}
</div>
</main>
);
}
