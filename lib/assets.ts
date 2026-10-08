const DEFAULT_ASSET_BASE =
  "https://pub-36eefd528bbb4e28bdef0ce39a1018e0.r2.dev/Prompt/38-abrany-brain-trainer/public";
export const ASSET_BASE = (process.env.NEXT_PUBLIC_ASSET_BASE ?? DEFAULT_ASSET_BASE)
  .trim()
  .replace(/\/$/, "");
const asset = (path: string) => `${ASSET_BASE}${path}`;
export const ASSET_ORIGIN = /^https?:\/\//.test(ASSET_BASE) ? new URL(ASSET_BASE).origin : "";
export const IMG = {
  brain: asset("/img/brain-hero.png"),
  glow: asset("/img/glow.png"),
  ringOuter: asset("/img/ring-outer.svg"),
  ringInner: asset("/img/ring-inner.svg"),
  arc: asset("/img/arc.svg"),
  neuralThumb: asset("/img/neural-thumb.png"),
  chartLineA: asset("/img/chart-line-a.svg"),
  chartLineB: asset("/img/chart-line-b.svg"),
  gaugeTrack: asset("/img/gauge-a.png"),
  gaugeFill: asset("/img/gauge-b.png"),
  brainBadge: asset("/img/brain-badge.png"),
  logoMark: asset("/img/logo-mark.png"),
};
export const VIDEO = {
  film: asset("/video/brain-film.mp4"),
  poster: asset("/video/brain-film-poster.jpg"),
};
export const AVATARS = [1, 2, 3, 4, 5].map((n) => asset(`/img/avatar-${n}.png`));
// UserFX owns these assets. NEXT_PUBLIC_FX_ASSET_BASE can point at its CDN;
// an empty base serves the existing public assets on the same origin.
const FX_BASE = (process.env.NEXT_PUBLIC_FX_ASSET_BASE ?? "").trim().replace(/\/$/, "");
const fx = (path: string) => `${FX_BASE}${path}`;
export const FX = {
  logo: fx("/assets/userfx-logo-sin.png"),
  emblem: fx("/iconFX.png"),
  foliage: fx("/icon5.png"),
  wallpaper: fx("/wallpaperGeneral.png"),
  film: fx("/assets/video01.mp4"),
  poster: fx("/assets/userfx-logo-sin.png"),
  basic: fx("/assets/iconos/rosa.png"),
  pro: fx("/assets/iconos/fuego.png"),
  vip: fx("/assets/iconos/corona.png"),
  special: fx("/assets/userfx-logo-sin.png"),
};
