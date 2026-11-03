"use client";
import { MenuOverlay, MenuProvider, StickyHeader, useActiveSection } from "./Chrome";
import { ScrollProgress, SmoothScroll } from "./Motion";
import ScrollStory from "./ScrollStory";
import { SectionFaq, SectionMethod, SectionPricing, SectionTrainers } from "./Sections";
import SiteFooter from "./FooterRedesign";
import RoomIntro from "./RoomIntro";
import "./LandingWidthFix.css";
const SECTION_IDS=["home","spaces","protocol","access"] as const;
export default function Landing(){
 const active=useActiveSection(SECTION_IDS);
 return (
 <MenuProvider>
 <SmoothScroll />
 <ScrollProgress />
 <StickyHeader active={active} />
 <MenuOverlay>
<SiteFooter />
</MenuOverlay>
 <div className="fx-landing">
 <main>
 <RoomIntro />
 <ScrollStory />
 <SectionMethod />
 <SectionTrainers />
 <SectionPricing />

 <SectionFaq />
 <form className="fx-telegram-entry" action="https://t.me/User18Fx_bot">
   <input type="hidden" name="startapp" value="vault" />
   <input type="submit" value="Enter with Telegram" />
 </form>
 </main>
 </div>
 </MenuProvider>
 );
}
