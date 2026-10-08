"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { EASE, stagger } from "@/lib/motion";

type Space = "myroom" | "stage" | "gallery" | "buzon" | "profiles";
const LABELS: Record<Space, string> = {
  myroom: "MyRoom",
  stage: "Stage",
  gallery: "Gallery",
  buzon: "Buzón",
  profiles: "Members",
};
const panelArrival = {
  hidden: { opacity: 0, y: 42, scale: 0.975, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: EASE },
  },
};

// Animate the new surface only. Exiting calls and media still clean up immediately.
export function SpaceMotion({ space, children }: { space: Space; children: ReactNode }) {
  const reduced = useReducedMotion();
  const [arriving, setArriving] = useState(true);
  return (
    <motion.main
      className="ufx-main fx-space-motion"
      data-fx-space={space}
      aria-label={LABELS[space]}
      variants={stagger(0.1, 0.2)}
      initial={reduced ? false : "hidden"}
      animate="show">
      {!reduced && arriving && (
        <motion.div
          className="fx-space-curtain"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.82, times: [0, 0.12, 0.62, 1], ease: EASE }}
          onAnimationComplete={() => setArriving(false)}>
          <div className="fx-space-curtain-copy">
            <span className="fx-space-curtain-brand">USER FX · YOUR PRIVATE WORLD</span>
            <motion.span
              className="fx-space-curtain-title"
              initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [28, 0, 0, -22],
                filter: ["blur(10px)", "blur(0px)", "blur(0px)", "blur(4px)"],
              }}
              transition={{ duration: 0.76, times: [0, 0.22, 0.66, 1], ease: EASE }}>
              {LABELS[space]}
            </motion.span>
            <motion.span
              className="fx-space-curtain-rule"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
            />
          </div>
        </motion.div>
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
    <Tag className={className} variants={reduced ? { hidden: {}, show: {} } : panelArrival}>
      {children}
    </Tag>
  );
}
