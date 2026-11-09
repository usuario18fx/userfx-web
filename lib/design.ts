import type { CSSProperties } from "react";
export const u = (n: number) => `calc(${n} * var(--u))`;
export const DESKTOP_FRAME = { w: 1440, h: 810 };
export const MOBILE_FRAME = { w: 440, h: 956 };
export const stageVars = (frame: { w: number; h: number }) =>
  ({
    "--stage-ar": `${frame.w / frame.h}`,
    "--stage-cols": `${frame.w}`,
  }) as CSSProperties;
export const centered = (cx: number, cy: number, w: number, h = w) =>
  ({
    position: "absolute",
    left: u(cx - w / 2),
    top: u(cy - h / 2),
    width: u(w),
    height: u(h),
  }) as CSSProperties;
const FONT_BOX = 1.23;
const ASCENT_ABOVE_CAP = 0.28;
export const capTop = (y: number, size: number, lineHeight = 1) =>
  u(y - size * ((lineHeight - FONT_BOX) / 2 + ASCENT_ABOVE_CAP));
export type VisualSpec = {
  center: { x: number; y: number };
  ringOuter: number;
  ringInner: number;
  glow: { x: number; y: number; w: number; h: number; blur: number };
  brain: { x: number; y: number; w: number; h: number };
  sound: { x: number; y: number; size: number };
  arc?: { x: number; y: number; w: number; h: number };
};
export const DESKTOP_VISUAL: VisualSpec = {
  center: { x: 851.18, y: 414.13 },
  ringOuter: 974.937,
  ringInner: 787.663,
  glow: { x: 851.18, y: 426.69, w: 768, h: 585, blur: 115 },
  brain: { x: 851.18, y: 414.13, w: 910, h: 619.502 },
  sound: { x: 210, y: 748, size: 32 },
  arc: { x: 720, y: 765.01, w: 1616.883, h: 602 },
};
export const MOBILE_VISUAL: VisualSpec = {
  center: { x: 220, y: 732.37 },
  ringOuter: 736.937,
  ringInner: 595.38,
  glow: { x: 220, y: 739.44, w: 524.36, h: 399.415, blur: 78.517 },
  brain: { x: 220, y: 732.37, w: 590, h: 422.971 },
  sound: { x: 376, y: 560, size: 36 },
};
