"use client";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { motion, type MotionValue } from "framer-motion";
import { FX, IMG } from "@/lib/assets";
import { BOT_URL, ENTER_URL, HERO, NAV } from "@/lib/content";
import {
  capTop,
  centered,
  DESKTOP_FRAME,
  DESKTOP_VISUAL,
  MOBILE_FRAME,
  MOBILE_VISUAL,
  stageVars,
  u,
  type VisualSpec,
} from "@/lib/design";
import { bloom, EASE, fade, maskWord, rise, stagger, useHeroParallax } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { useAdminMode, AdminModeSwitch } from "@/components/PrivateRoom/PR-AdminMode";
import { MenuButton } from "./Chrome";
import { Magnetic } from "./Motion";
import { Glyph } from "./Glyph";

type Layers = Record<"far" | "mid" | "brain" | "near" | "front", MotionValue<number>>;
type Mode = "static" | "video";
export default function Hero({ active }: { active: string }) {
  const { matches: isDesktop, mounted } = useMediaQuery(
    "(min-width: 1024px), (min-aspect-ratio: 3/2)",
    true,
  );
  const frame = isDesktop ? DESKTOP_FRAME : MOBILE_FRAME;
  const visual = isDesktop ? DESKTOP_VISUAL : MOBILE_VISUAL;
  const { sectionRef, stageRef, y, reduced } = useHeroParallax(frame.w);
  const [mode, setMode] = useState<Mode>("video");
  const [playing, setPlaying] = useState(false),
    [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = mode === "video";
  useEffect(() => {
    if (reduced) {
      videoRef.current?.pause();
      setMode("static");
      return;
    }
    if (mode === "video") void videoRef.current?.play().catch(() => undefined);
  }, [mode, reduced]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);
  function showFilm() {
    setMode("video");
    void videoRef.current?.play().catch(() => undefined);
  }
  function showStill() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setMode("static");
  }
  return (
    <motion.section
      ref={sectionRef}
      id="home"
      data-artboard={isDesktop ? "desktop" : "mobile"}
      data-mode={mode}
      className="fx-hero stage-frame relative flex h-svh w-full items-center justify-center overflow-hidden transition-colors duration-1000"
      style={{ backgroundColor: isVideo ? "var(--color-sky-lit)" : "var(--color-sky)" }}
      variants={stagger()}
      initial="hidden"
      animate={mounted ? "show" : "hidden"}>
      <div
        ref={stageRef}
        className={`stage ${isDesktop ? "overflow-hidden" : ""}`}
        style={stageVars(frame)}>
        <Backdrop
          visual={visual}
          layers={y}
          isVideo={isVideo}
          playing={playing && !reduced}
          muted={muted}
          videoRef={videoRef}
          setPlaying={setPlaying}
        />
        {isDesktop && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{ y: y.far }}
            variants={fade}
            aria-hidden>
            <p
              className="absolute whitespace-nowrap font-wide uppercase"
              style={{
                left: u(70),
                top: u(620),
                fontSize: u(240),
                lineHeight: 1,
                letterSpacing: "-.06em",
                filter: `blur(${u(20.2)})`,
                opacity: 0.5,
                backgroundImage: "linear-gradient(180deg, #d5be861a, #789cdd10)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}>
              USER FX
            </p>
          </motion.div>
        )}
        {isDesktop ? <HeroHeader active={active} /> : <HeroHeaderMobile />}
        <motion.div className="pointer-events-none absolute inset-0" style={{ y: y.near }}>
          <div
            className="absolute"
            style={{
              left: u(isDesktop ? 34.32 : 20),
              top: capTop(isDesktop ? 167.47 : 129.33, isDesktop ? 72 : 56, 0.873),
            }}>
            <Headline size={isDesktop ? 72 : 56} />
          </div>
          <motion.p
            variants={rise}
            className="absolute font-sans text-ink/70"
            style={{
              left: u(isDesktop ? 111.52 : 76.72),
              top: u(isDesktop ? 442.03 : 347),
              width: u(isDesktop ? 258 : 237.963),
              fontSize: u(isDesktop ? 16 : 14),
              lineHeight: 1.4,
            }}>
            {HERO.lede}
          </motion.p>
          <div
            className="pointer-events-auto absolute"
            style={{ left: u(isDesktop ? 111.52 : 76.72), top: u(isDesktop ? 559.01 : 429.16) }}>
            <CtaPill />
          </div>
        </motion.div>
        <motion.div className="pointer-events-none absolute inset-0" style={{ y: y.front }}>
          <LearnersCard desktop={isDesktop} />
          <StatsCard desktop={isDesktop} />
          <InsightCard desktop={isDesktop} />
          {isDesktop && (
            <>
              <motion.img
                variants={rise}
                src={FX.foliage}
                alt=""
                aria-hidden
                className="absolute block object-contain"
                style={{
                  left: u(1306.26),
                  top: u(643.03),
                  width: u(107.371),
                  height: u(107.371),
                  filter: "drop-shadow(0 0 16px #839c621c)",
                }}
              />
              <motion.p
                variants={rise}
                className="absolute font-display font-semibold uppercase text-ink"
                style={{
                  left: u(1245.2),
                  top: capTop(704.97, 24),
                  fontSize: u(24),
                  lineHeight: 1,
                  letterSpacing: "-.03em",
                }}>
                {HERO.badge.map((line) => (
                  <span className="block" key={line}>
                    {line}
                  </span>
                ))}
              </motion.p>
              <div
                className="pointer-events-auto absolute flex items-end"
                aria-label="Hero visual"
                style={{ left: u(34.32), top: u(750.03), gap: u(20) }}>
                <button
                  type="button"
                  onClick={showStill}
                  aria-label="01 · Still image"
                  aria-pressed={!isVideo}
                  className={`font-display font-semibold transition-opacity duration-500 ${!isVideo ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
                  style={{ fontSize: u(14) }}>
                  01
                </button>
                <span
                  aria-hidden
                  className="bg-gold"
                  style={{ width: u(41.777), height: "1px", marginBottom: u(4) }}
                />
                <button
                  type="button"
                  onClick={showFilm}
                  aria-label="02 · Play film"
                  aria-pressed={isVideo}
                  className={`font-display font-semibold transition-opacity duration-500 ${isVideo ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
                  style={{ fontSize: u(28) }}>
                  02
                </button>
              </div>
            </>
          )}
        </motion.div>
        <SoundToggle visual={visual} muted={muted} onClick={() => setMuted((value) => !value)} />
      </div>
    </motion.section>
  );
}
function Backdrop({
  visual: v,
  layers,
  isVideo,
  playing,
  muted,
  videoRef,
  setPlaying,
}: {
  visual: VisualSpec;
  layers: Layers;
  isVideo: boolean;
  playing: boolean;
  muted: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  setPlaying: (value: boolean) => void;
}) {
  const mask = "radial-gradient(circle at 50% 50%, #000 56%, transparent 84%)";
  return (
    <div className="pointer-events-none absolute inset-0">
      <motion.div
        style={{ y: layers.far }}
        className="absolute inset-0"
        variants={bloom}
        aria-hidden>
        {v.arc && (
          <div style={centered(v.arc.x, v.arc.y, v.arc.w, v.arc.h)}>
            <div className="absolute" style={{ inset: "-66.45% -24.74%" }}>
              <img src={IMG.arc} alt="" className="block h-full w-full max-w-none opacity-15" />
            </div>
          </div>
        )}
      </motion.div>
      <motion.div
        style={{ y: layers.mid }}
        className="absolute inset-0"
        variants={bloom}
        aria-hidden>
        <motion.img
          src={IMG.glow}
          alt=""
          className="max-w-none object-bottom"
          style={{
            ...centered(v.glow.x, v.glow.y, v.glow.w, v.glow.h),
            filter: `blur(${u(v.glow.blur)}) saturate(.35)`,
          }}
          animate={{ opacity: isVideo ? 0.35 : 0 }}
          transition={{ duration: 1.2, ease: EASE }}
        />
        <img
          src={IMG.ringOuter}
          alt=""
          className="fx-ring block max-w-none"
          style={centered(v.center.x, v.center.y, v.ringOuter)}
        />
        <div style={centered(v.center.x, v.center.y, v.ringInner)}>
          <div className="absolute" style={{ inset: "-1.02%" }}>
            <motion.img
              src={IMG.ringInner}
              alt=""
              className="fx-ring block h-full w-full max-w-none"
              animate={{ rotate: playing ? 360 : 0 }}
              transition={
                playing
                  ? { duration: 140, ease: "linear", repeat: Infinity }
                  : { duration: 1.2, ease: EASE }
              }
            />
          </div>
        </div>
      </motion.div>
      <motion.div style={{ y: layers.brain }} className="absolute inset-0" variants={bloom}>
        <motion.img
          src={FX.emblem}
          alt="UserFX sculpted silver emblem"
          fetchPriority="high"
          className="max-w-none object-contain"
          style={{
            ...centered(v.brain.x, v.brain.y, v.brain.w, v.brain.h),
            rotate: 15,
            filter: "drop-shadow(0 0 40px #7eac6720)",
          }}
          animate={{ opacity: isVideo ? 0 : 1, scale: isVideo ? 1.03 : 1 }}
          transition={{ duration: 0.9, ease: EASE }}
        />
        <motion.div
          className="overflow-hidden rounded-full"
          style={centered(v.center.x, v.center.y, v.ringInner)}
          animate={{ opacity: isVideo ? 1 : 0 }}
          transition={{ duration: 0.9, ease: EASE }}>
          <video
            ref={videoRef}
            src={FX.film}
            poster={FX.poster}
            autoPlay
            muted={muted}
            loop
            playsInline
            preload="auto"
            aria-label="UserFX identity film"
            className="h-full w-full object-cover"
            style={{ maskImage: mask, WebkitMaskImage: mask }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
function HeroBrand({ mobile = false }: { mobile?: boolean }) {
  const admin = useAdminMode();
  return (
    <div
      className="absolute flex items-center"
      style={{ left: u(mobile ? 20 : 38), top: u(mobile ? 41.43 : 31.8), gap: u(10) }}>
      <motion.button
        variants={rise}
        className="flex items-center"
        type="button"
        aria-label="UserFX · PRIV Vault · User/Admin"
        style={{ gap: u(3.5) }}
        onClick={() => {
          if (!admin.revealSwitch()) window.location.hash = "#/";
        }}>
        <img
          src={FX.logo}
          alt=""
          style={{
            width: u(mobile ? 32.194 : 26),
            height: u(mobile ? 32.511 : 20),
            objectFit: "contain",
          }}
        />
        {!mobile && (
          <span
            className="font-wide uppercase"
            style={{ fontSize: u(10), lineHeight: 1, letterSpacing: "-.06em" }}>
            USER FX · PRIV VAULT
          </span>
        )}
      </motion.button>
      <AdminModeSwitch />
    </div>
  );
}
function HeroHeader({ active }: { active: string }) {
  return (
    <>
      <HeroBrand />
      <motion.nav
        variants={rise}
        aria-label="Hero navigation"
        className="absolute left-1/2 flex -translate-x-1/2"
        style={{ top: capTop(34.4, 12), gap: u(95) }}>
        {NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`font-display transition-opacity duration-300 hover:opacity-100 ${active === item.id ? "opacity-100" : "opacity-40"}`}
            aria-current={active === item.id ? "page" : undefined}
            style={{ fontSize: u(12), lineHeight: 1 }}>
            {item.label}
          </a>
        ))}
      </motion.nav>
      <motion.div
        variants={rise}
        className="absolute flex items-center"
        style={{ left: u(1265.62), top: capTop(34.4, 12), gap: u(38) }}>
        <a
          href="#contact"
          className="font-display uppercase transition-opacity hover:opacity-60"
          style={{ fontSize: u(12) }}>
          Contact us
        </a>
        <MenuButton width={u(22.756)} gap={u(4.559)} />
      </motion.div>
      <span
        aria-hidden
        className="absolute w-px bg-gold/30"
        style={{ left: u(513.55), top: 0, height: u(18.024) }}
      />
    </>
  );
}
function HeroHeaderMobile() {
  return (
    <>
      <HeroBrand mobile />
      <motion.div
        variants={rise}
        className="absolute flex items-center"
        style={{ left: u(283.24), top: capTop(53.578, 12), gap: u(38) }}>
        <a
          href="#contact"
          className="font-display uppercase transition-opacity hover:opacity-60"
          style={{ fontSize: u(12) }}>
          Contact us
        </a>
        <MenuButton width={u(22.756)} gap={u(4.559)} />
      </motion.div>
    </>
  );
}
function Headline({ size }: { size: number }) {
  const indent = ["0em", "0em", "2.18em", "1.01em"];
  return (
    <motion.h1
      variants={stagger(0.09, 0)}
      className="font-display font-semibold uppercase"
      style={{ fontSize: u(size), lineHeight: 0.873, letterSpacing: "-.03em" }}>
      {HERO.headline.map((line, i) => (
        <span key={line} className="block overflow-hidden" style={{ marginLeft: indent[i] }}>
          <motion.span
            variants={maskWord}
            className="block whitespace-nowrap will-change-transform"
            style={
              i === 2
                ? {
                    backgroundImage: "linear-gradient(180deg, #b45b69 89.759%, #b45b6900 132.46%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }
                : undefined
            }>
            {line}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}
export function RollLabel({ children }: { children: string }) {
  return (
    <span className="relative block overflow-hidden">
      <span className="block transition-transform duration-500 ease-out group-hover:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden
        className="absolute left-0 top-0 block translate-y-full whitespace-nowrap transition-transform duration-500 ease-out group-hover:translate-y-0">
        {children}
      </span>
    </span>
  );
}
function CtaPill() {
  return (
    <Magnetic strength={0.28}>
      <motion.a
        variants={rise}
        href={ENTER_URL}
        className="group inline-flex items-center justify-center border border-gold/25 bg-white/7 transition-colors hover:bg-white/12"
        style={{
          gap: u(20),
          paddingLeft: u(4),
          paddingRight: u(32),
          paddingTop: u(4),
          paddingBottom: u(4),
          borderRadius: u(999),
        }}>
        <span
          className="grid place-items-center rounded-full bg-orb text-sky transition-transform duration-500 ease-out group-hover:scale-110"
          style={{ width: u(72), height: u(72) }}>
          <Glyph name="crown" style={{ width: u(26), height: u(26) }} />
        </span>
        <span
          className="flex items-center"
          style={{
            gap: u(12),
            fontSize: u(16),
            lineHeight: 1,
            letterSpacing: "-.02em",
            fontWeight: 600,
          }}>
          <RollLabel>{HERO.cta}</RollLabel>
          <Glyph
            name="caret"
            className="transition-transform duration-500 group-hover:translate-x-1"
            style={{ width: u(18), height: u(18) }}
          />
        </span>
      </motion.a>
    </Magnetic>
  );
}
function LearnersCard({ desktop }: { desktop: boolean }) {
  const k = desktop ? 1 : 0.7468,
    s = (n: number) => u(n * k);
  return (
    <motion.div
      variants={rise}
      className="glass absolute"
      style={{
        left: u(desktop ? 970 : 226),
        top: u(desktop ? 174.97 : 692),
        width: u(desktop ? 321 : 193.098),
        height: u(desktop ? 73 : 53.356),
        borderRadius: s(24),
      }}>
      <div
        className="absolute flex -translate-y-1/2"
        style={{ left: s(19), top: "50%", gap: s(8) }}>
        {["camera", "stage", "lock"].map((name) => (
          <span
            key={name}
            className="grid place-items-center rounded-full border border-gold/20 bg-sky text-gold"
            style={{ width: s(33), height: s(33) }}>
            <Glyph name={name as "camera"} style={{ width: s(16), height: s(16) }} />
          </span>
        ))}
      </div>
      <div
        className="absolute flex -translate-y-1/2 flex-col"
        style={{ left: u(desktop ? 155 : 108), top: "50%", gap: s(8) }}>
        <strong className="font-display" style={{ fontSize: s(21), lineHeight: 1 }}>
          Your identity
        </strong>
        <span className="text-ink/60" style={{ fontSize: s(14), lineHeight: 1 }}>
          One private club
        </span>
      </div>
    </motion.div>
  );
}
function StatsCard({ desktop }: { desktop: boolean }) {
  const k = desktop ? 1 : 0.8375,
    s = (n: number) => u(n * k);
  function gauge(width: number, offset: number, opacity: number, src: string) {
    return (
      <div
        className="absolute overflow-hidden"
        style={{ left: s(8.5), top: s(22.55), width: s(width), height: s(98.904), opacity }}>
        <img
          src={src}
          alt=""
          className="absolute block max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `calc(50% + ${s(offset)})`,
            top: `calc(50% + ${s(58.03)})`,
            width: s(215.009),
            height: s(215.009),
            filter: "sepia(1) saturate(.5)",
          }}
        />
      </div>
    );
  }
  return (
    <motion.div
      variants={rise}
      className="glass absolute overflow-hidden"
      style={{
        left: u(desktop ? 1090 : 20),
        top: u(desktop ? 328.72 : 692),
        width: u(desktop ? 231 : 193.48),
        height: u(desktop ? 267 : 223.633),
        borderRadius: s(40),
      }}>
      <div aria-hidden>
        {gauge(215.009, -0.54, 0.1, IMG.gaugeTrack)}
        {gauge(116.105, 48.91, 1, IMG.gaugeFill)}
      </div>
      <strong
        className="absolute left-1/2 -translate-x-1/2 font-display"
        style={{ top: capTop(71 * k, 32 * k), fontSize: s(32) }}>
        04
      </strong>
      <span
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-ink/60"
        style={{ top: capTop(101 * k, 14 * k), fontSize: s(14) }}>
        connected spaces
      </span>
      {[
        { name: "camera", value: "01", label: "your room" },
        { name: "stage", value: "06", label: "Stage seats" },
      ].map((tile, i) => (
        <div
          key={tile.name}
          className="glass-tile absolute"
          style={{
            bottom: s(6),
            [i ? "right" : "left"]: s(6),
            width: s(106.5),
            height: s(115),
            borderRadius: i
              ? `${s(12)} ${s(12)} ${s(34)} ${s(12)}`
              : `${s(12)} ${s(12)} ${s(12)} ${s(34)}`,
          }}>
          <Glyph
            name={tile.name as "camera"}
            className="absolute text-gold"
            style={{ left: s(15), top: s(11), width: s(26), height: s(26) }}
          />
          <strong
            className="absolute"
            style={{ left: s(15), top: capTop(65 * k, 21 * k), fontSize: s(21) }}>
            {tile.value}
          </strong>
          <span
            className="absolute text-ink/60"
            style={{ left: s(15), top: capTop(86.64 * k, 14 * k), fontSize: s(14) }}>
            {tile.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
function InsightCard({ desktop }: { desktop: boolean }) {
  const k = desktop ? 1 : 0.8375,
    s = (n: number) => u(n * k);
  return (
    <motion.div
      variants={rise}
      className="glass absolute overflow-hidden"
      style={{
        left: u(desktop ? 545 : 226),
        top: u(desktop ? 476.97 : 757),
        width: u(desktop ? 231 : 193),
        height: u(desktop ? 176 : 156),
        borderRadius: s(40),
      }}>
      <img
        src={FX.foliage}
        alt=""
        className="absolute object-contain"
        style={{ left: s(-3.07), top: s(21.56), width: s(124.603), height: s(69.832) }}
      />
      <span
        className="absolute text-ink/60"
        style={{ left: s(121.53), top: capTop(37.49 * k, 14 * k), fontSize: s(14) }}>
        Code
      </span>
      <strong
        className="absolute"
        style={{ left: s(121.53), top: capTop(59.12 * k, 21 * k), fontSize: s(21) }}>
        Protected
      </strong>
      <span
        className="absolute border-t border-gold/20 text-gold"
        style={{
          left: s(18),
          right: s(18),
          top: s(105),
          paddingTop: s(13),
          fontSize: s(12),
          letterSpacing: ".14em",
        }}>
        BSIC · PRX0 · VIPX
      </span>
    </motion.div>
  );
}
function SoundToggle({
  visual,
  muted,
  onClick,
}: {
  visual: VisualSpec;
  muted: boolean;
  onClick: () => void;
}) {
  const size = visual.sound.size;
  return (
    <motion.button
      type="button"
      variants={bloom}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.35, ease: EASE }}
      aria-label={muted ? "Unmute the film" : "Mute the film"}
      title={muted ? "Unmute the film" : "Mute the film"}
      onClick={onClick}
      className="absolute grid place-items-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-white/10"
      style={{ left: u(visual.sound.x), top: u(visual.sound.y), width: u(size), height: u(size) }}>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ width: u(size / 2), height: u(size / 2) }}>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {muted ? (
          <path d="m16 9 5 6m0-6-5 6" />
        ) : (
          <>
            <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
          </>
        )}
      </svg>
    </motion.button>
  );
}
