"use client";

import { MenuOverlay, MenuProvider, StickyHeader, useActiveSection } from "./Chrome";
import { ScrollProgress, SmoothScroll } from "./Motion";
import ScrollStory from "./ScrollStory";

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
          <ScrollStory />
        </main>
      </div>
    </MenuProvider>
  );
}
