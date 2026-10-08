"use client";
import { MenuOverlay, MenuProvider, StickyHeader, useActiveSection } from "./Chrome";
import Hero from "./Hero";
import { Marquee, ScrollProgress, SmoothScroll } from "./Motion";
import {
  SectionCourses,
  SectionFaq,
  SectionMethod,
  SectionPricing,
  SectionTrainers,
  SiteFooter,
} from "./Sections";
const SECTION_IDS = ["home", "spaces", "protocol", "access"] as const;
const DOMAINS = ["MyRoom", "Stage", "Gallery", "Buzón"] as const;
const CLAIMS = ["Your identity", "Your space", "Your code", "Your moment"] as const;
export default function Landing() {
  const active = useActiveSection(SECTION_IDS);
  return (
    <MenuProvider>
      <SmoothScroll />
      <ScrollProgress />
      <StickyHeader active={active} />
      <MenuOverlay />
      <div className="fx-landing">
        <main className="overflow-x-clip">
          <Hero active={active} />
          <SectionCourses />
          <Marquee words={DOMAINS} />
          <SectionMethod />
          <SectionTrainers />
          <Marquee words={CLAIMS} baseVelocity={1.8} />
          <SectionPricing />
          <SectionFaq />
        </main>
        <SiteFooter />
      </div>
    </MenuProvider>
  );
}
