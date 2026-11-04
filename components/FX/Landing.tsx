"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MenuOverlay, MenuProvider, StickyHeader, useActiveSection } from "./Chrome";
import { ScrollProgress, SmoothScroll, setSmoothScroll } from "./Motion";
import ScrollStory from "./ScrollStory";
import TelegramIdentityFooter from "./TelegramIdentityFooter";
import RoomIntro from "./RoomIntro";
import { SectionFaq, SectionMethod, SectionPricing } from "./Sections";
import SiteFooter from "./FooterRedesign";
import { ENTER_URL } from "@/lib/content";
import "./LandingWidthFix.css";

const AccessGate = dynamic(() => import("@/components/PrivateRoom/PR-DirectGate"), { ssr: false });

const SECTION_IDS = ["home", "protocol", "spaces", "access"] as const;

function EnterAuthorizedRoom() {
  useEffect(() => {
    window.location.hash = "#/private-room";
  }, []);

  return null;
}

export default function Landing() {
  const active = useActiveSection(SECTION_IDS);
  const [accessOpen, setAccessOpen] = useState(false);

  useEffect(() => {
    const onAccessClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (link?.getAttribute("href") !== ENTER_URL) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      event.stopPropagation();
      setAccessOpen(true);
    };

    document.addEventListener("click", onAccessClick, true);
    return () => document.removeEventListener("click", onAccessClick, true);
  }, []);

  useEffect(() => {
    if (!accessOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    setSmoothScroll(false);

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccessOpen(false);
    };
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousOverflow;
      setSmoothScroll(true);
      previousFocus?.focus();
    };
  }, [accessOpen]);

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
          <SectionPricing />
          <SectionFaq />
          <TelegramIdentityFooter onVerified={() => setAccessOpen(true)} />
        </main>
      </div>
      {accessOpen && (
        <div className="fx-landing-access-modal" role="dialog" aria-modal="true" aria-label="Vault access">
          <AccessGate forceOpen onRequestClose={() => setAccessOpen(false)}>
            <EnterAuthorizedRoom />
          </AccessGate>
        </div>
      )}
    </MenuProvider>
  );
}
