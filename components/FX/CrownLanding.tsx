"use client";

import { useEffect, useRef, useState } from "react";
import "./CrownLanding.css";

const CHAPTERS = [
{ number:"01", name:"THE SIGNAL", subtitle:"Your moment begins here", description:"Every experience starts with a signal.", tone:"signal" },
{ number:"02", name:"YOUR WORLD", subtitle:"An entrance to something personal", description:"A space created for expression without limits.", tone:"world" },
{ number:"03", name:"UNFILTERED", subtitle:"Your moment. Your rules.", description:"Discover what comes next, one moment at a time.", tone:"unfiltered" }
] as const;

const clamp = (n:number) => Math.min(1,Math.max(0,n));
const smoothstep = (n:number) => {const t=clamp(n);return t*t*(3-2*t);};

export default function CrownLanding() {
const root = useRef<HTMLElement>(null);
const [scroll,setScroll] = useState(0);
useEffect(() => {
let frame=0;
const update=()=>{
cancelAnimationFrame(frame);
frame=requestAnimationFrame(()=>{
if(!root.current)return;
const rect=root.current.getBoundingClientRect();
const distance=Math.max(1,root.current.offsetHeight-window.innerHeight);
setScroll(clamp(-rect.top/distance));
});
};
update();
window.addEventListener("scroll",update,{passive:true});
window.addEventListener("resize",update);
return ()=>{cancelAnimationFrame(frame);window.removeEventListener("scroll",update);window.removeEventListener("resize",update);};
},[]);

const rise=smoothstep(scroll/.43);
const unveil=smoothstep((scroll-.22)/.28);
const story=smoothstep((scroll-.43)/.3);
const chapterIndex=Math.min(CHAPTERS.length-1,Math.floor(clamp((scroll-.58)/.4)*CHAPTERS.length));
return (
<section className="fx-crown-page" ref={root} aria-label="USER FX crown experience">
<div className="fx-crown-sticky">
<div className="fx-crown-grain" aria-hidden="true" />
<header className="fx-crown-bar">
<span>USER <b>FX</b></span>
<span>THE EXPERIENCE / 001</span>
</header>
<div className="fx-crown-hero" style={{opacity:1-story}}>
<div className="fx-crown-object" style={{transform:`translate3d(-50%,calc(-50% - ${rise*20}vh),0) rotate(${scroll*115}deg) scale(${1-rise*.20})`}}>
<video autoPlay muted loop playsInline preload="metadata" aria-label="Blue USER FX crown rotating">
<source src="/assets/crown/CORONA-DARK.mp4" type="video/mp4" />
</video>
<div className="fx-crown-aura" />
</div>
<div className="fx-crown-brand" style={{opacity:unveil,transform:`translateY(${(1-unveil)*42}px)`}}>
<p>ENTER THE EXPERIENCE</p>
<h1>USER<span>FX</span></h1>
<strong>YOUR MOMENT. UNFILTERED.</strong>
</div>
<div className="fx-crown-scrollcue">SCROLL TO REVEAL <span>↓</span></div>
</div>
<div className="fx-crown-story" style={{opacity:story,pointerEvents:story>.9?"auto":"none",transform:`translateY(${(1-story)*8}vh)`}}>
<div className="fx-crown-storyhead">
<span>USER FX / INSIDE THE EXPERIENCE</span>
<h2>EVERY FRAME <em>MATTERS.</em></h2>
</div>
<div className="fx-crown-panels">
{CHAPTERS.map((chapter,i)=>(
<article className={`fx-crown-panel fx-crown-panel--${chapter.tone} ${chapterIndex===i?"is-active":""}`} key={chapter.number}>
<div className="fx-crown-panel-art"><span>{chapter.number}</span><div className="fx-crown-panel-shine" /></div>
<div className="fx-crown-panel-content">
<small>{chapter.number} / 03</small>
<h3>{chapter.name}</h3>
<p>{chapter.subtitle}</p>
</div>
</article>
))}
</div>
<div className="fx-crown-timeline">
<span>00:00</span>
<div className="fx-crown-track">
<div className="fx-crown-trackfill" style={{width:`${clamp((scroll-.58)/.42)*100}%`}} />
{CHAPTERS.map((chapter,i)=>(
<span className="fx-crown-tracktick" key={chapter.number} style={{left:`${(i+.5)/CHAPTERS.length*100}%`}} />
))}
</div>
<span>01:00</span>
</div>
<div className="fx-crown-storycaption"><b>{CHAPTERS[chapterIndex].name}</b><span>{CHAPTERS[chapterIndex].description}</span></div>
</div>
</div>
</section>
);
}
