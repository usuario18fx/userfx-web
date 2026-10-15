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
import MyRoomLandingSection from "./MyRoomLandingSection";
import RoomIntro from "./RoomIntro";
import "./LandingWidthFix.css";

const SECTION_IDS = ["home", "spaces", "protocol", "access"] as const;

export default function Landing() {
  const active = useActiveSection(SECTION_IDS);

  return (
    <MenuProvider>
      <SmoothScroll />
      <ScrollProgress />
      <StickyHeader active={active} />
      <MenuOverlay />
      <div className="fx-landing">
        <main>
          <RoomIntro />
          <ScrollStory />
          <MyRoomLandingSection />
          <SectionMethod />
          <SectionTrainers />
          <SectionPricing />
          <SectionFaq />
        </main>
        <SiteFooter />
      </div>
    </MenuProvider>
  );
}
