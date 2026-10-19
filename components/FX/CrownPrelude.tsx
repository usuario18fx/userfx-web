"use client";

import { useRef, type PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import "./CrownPrelude.css";

export default function CrownPrelude() {
    const sectionRef = useRef<HTMLElement>(null);
    const reduced = useReducedMotion();
    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);
    const crownX = useSpring(pointerX, { stiffness: 70, damping: 19, mass: 0.65 });
    const crownY = useSpring(pointerY, { stiffness: 70, damping: 19, mass: 0.65 });
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"],
    });
    const sceneOpacity = useTransform(scrollYProgress, [0, 0.28, 0.76, 1], [1, 1, 0.68, 0]);
    const emblemScale = useTransform(scrollYProgress, [0, 0.32, 1], [1, 1.04, 1.68]);
    const copyY = useTransform(scrollYProgress, [0, 1], [0, -76]);

    const moveCrown = (event: PointerEvent<HTMLElement>) => {
        if (reduced || event.pointerType === "touch") return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        pointerX.set(-x * 72);
        pointerY.set(-y * 56);
    };

    const resetCrown = () => {
        pointerX.set(0);
        pointerY.set(0);
    };

    return (
        <section ref={sectionRef} className="fx-crown-prelude" aria-label="UserFX introduction" onPointerMove={moveCrown} onPointerLeave={resetCrown}>
            <div className="fx-crown-prelude-sticky">
                <motion.div className="fx-crown-prelude-stage" style={reduced ? undefined : { opacity: sceneOpacity }}>
                    <span className="fx-crown-prelude-eyebrow">
                        USER FX — THE PRIVATE EXPERIENCE
                    </span>
                    <motion.div className="fx-crown-prelude-emblem" style={reduced ? undefined : { scale: emblemScale }}>
                        <span className="fx-crown-prelude-aura" aria-hidden="true">
                        </span>
                        <img src="/iconLogo.png" alt="" className="fx-crown-prelude-logo" draggable={false} />
                        <motion.img src="/iconCorona.png" alt="The UserFX crown" className="fx-crown-prelude-crown" draggable={false} style={reduced ? undefined : { x: crownX, y: crownY }} />
                    </motion.div>
                    <motion.div className="fx-crown-prelude-copy" style={reduced ? undefined : { y: copyY }}>
                        <h2>
                            YOUR SPACE.
                            <span>
                                YOUR RULES.
                            </span>
                        </h2>
                        <p>
                            One identity. Four spaces. Your moment begins beyond the crown.
                        </p>
                        <a href="#home" className="fx-crown-prelude-enter">
                            EXPLORE USERFX
                            <span aria-hidden="true">
                                ↘
                            </span>
                        </a>
                    </motion.div>
                </motion.div>
                <a href="#home" className="fx-crown-prelude-scroll">
                    SCROLL TO ENTER
                    <span aria-hidden="true">
                        ↓
                    </span>
                </a>
                <span className="fx-crown-prelude-number" aria-hidden="true">
                    00 / 04
                </span>
            </div>
        </section>
    );
}
