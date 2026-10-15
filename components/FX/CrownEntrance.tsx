"use client";
import {useState} from "react";
import "./CrownEntrance.css";
type Props={onEnter:()=>void};
export default function CrownEntrance({onEnter}:Props){
 const [entering,setEntering]=useState(false);
 function enter(){if(entering)return;setEntering(true);window.setTimeout(onEnter,1050)}
 return <section className={"fx-crown-entry"+(entering?" is-entering":"")} aria-label="USER FX crown portal">
  <div className="fx-crown-entry-aura" aria-hidden="true"/>
  <div className="fx-crown-entry-door" aria-hidden="true"/>
  <div className="fx-crown-entry-floor" aria-hidden="true"/>
  <div className="fx-crown-entry-center">
   <button type="button" className="fx-crown-entry-trigger" onClick={enter} aria-label="Enter USER FX through the crown diamond">
    <img src="/iconCorona.png" alt="USER FX blue sapphire crown" draggable={false}/>
    <span className="fx-crown-entry-gem" aria-hidden="true"/>
   </button>
   <span className="fx-crown-entry-reflection" aria-hidden="true"><img src="/iconCorona.png" alt=""/></span>
  </div>
  <div className="fx-crown-entry-copy"><span>USER FX / PRIVATE WORLD</span><h1>THE WORLD<br/><em>BEHIND THE CROWN.</em></h1><p>ENTER THE EXPERIENCE</p></div>
  <button className="fx-crown-entry-access" type="button" onClick={enter}>{entering?"ENTERING…":"ENTER MY ROOM ↗"}</button>
  <div className="fx-crown-entry-flash" aria-hidden="true"/>
 </section>;
}
