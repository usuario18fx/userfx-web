"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE, rise, stagger } from "@/lib/motion";

type Space = "myroom" | "stage" | "gallery" | "buzon" | "profiles";
const LABELS: Record<Space, string> = {
  myroom: "MyRoom",
  stage: "Stage",
  gallery: "Gallery",
  buzon: "Buzón",
  profiles: "Members",
};

// Animate the new surface only. Exiting calls and media still clean up immediately.
export function SpaceMotion({ space, children }: { space: Space; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.main
      className="ufx-main fx-space-motion"
      data-fx-space={space}
      aria-label={LABELS[space]}
      variants={stagger(0.075, 0.03)}
      initial={reduced ? false : "hidden"}
      animate="show">
      {!reduced && (
        <motion.span
          className="fx-space-arrival"
          aria-hidden="true"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 1], opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.85, times: [0, 0.6, 1], ease: EASE }}
        />
      )}
      {children}
    </motion.main>
  );
}

export function SpacePanel({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const reduced = useReducedMotion();
  const Tag = as === "section" ? motion.section : motion.div;
  return (
    <Tag className={className} variants={reduced ? { hidden: {}, show: {} } : rise}>
      {children}
    </Tag>
  );
}
