"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import "./MyRoomLandingSection.css";

const MyRoom3D = dynamic(() => import("./MyRoom3D"), {
  ssr: false,
  loading: () => <div className="ufx-myroom-landing-loading" role="status">OPENING MY ROOM…</div>,
});

export default function MyRoomLandingSection() {
  const [lightsOn, setLightsOn] = useState(true);
  return (
    <section className="ufx-myroom-landing" aria-labelledby="ufx-myroom-heading">
      <div className="ufx-myroom-landing-layout">
        <div className="ufx-myroom-landing-copy">
          <span className="ufx-myroom-landing-kicker">A PRIVATE SPACE / 3D EXPERIENCE</span>
          <h2 id="ufx-myroom-heading">ENTER<br/><em>MY<br/>ROOM.</em></h2>
          <p>Move the camera. Explore the objects. Change the lights.</p>
          <button type="button" aria-pressed={!lightsOn} onClick={() => setLightsOn(value => !value)}>
            {lightsOn ? "DIM LIGHTS" : "TURN ON LIGHTS"} <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="ufx-myroom-landing-view"><MyRoom3D lightsOn={lightsOn} /></div>
      </div>
      <a className="ufx-myroom-landing-enter" href="/#/private-room">ENTER PRIVATE ROOM ↗</a>
    </section>
  );
}
