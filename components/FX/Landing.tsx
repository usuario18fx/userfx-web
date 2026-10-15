"use client";

import { MenuOverlay, MenuProvider, StickyHeader, useActiveSection } from "./Chrome";
import { ScrollProgress, SmoothScroll } from "./Motion";
import ScrollStory from "./ScrollStory";
import {
  SectionFaq,
  SectionMethod,
  SectionPricing,
  SectionTrainers,
} from "./Sections";
import SiteFooter from "./FooterRedesign";
import RoomIntro from "./RoomIntro";
import CrownEntrance from "./CrownEntrance";
import { useState } from "react";
import "./LandingWidthFix.css";

const SECTION_IDS = ["home", "spaces", "protocol", "access"] as const;

export default function Landing() {
  const active = useActiveSection(SECTION_IDS);
  const [entered, setEntered] = useState(false);

  return (
    <MenuProvider>
      <SmoothScroll />
      {entered && <ScrollProgress />}
      {entered && <StickyHeader active={active} />}
      {entered && <MenuOverlay />}
      <div className="fx-landing">
        <main>
          {!entered ? <CrownEntrance onEnter={() => {setEntered(true);window.scrollTo({top:0,behavior:"auto"});}} /> : <><RoomIntro />
          <ScrollStory />
          <SectionMethod />
          <SectionTrainers />
          <SectionPricing />
          <SectionFaq /></>}
        </main>
        {entered && <SiteFooter />}
      </div>
    </MenuProvider>
  );
}
