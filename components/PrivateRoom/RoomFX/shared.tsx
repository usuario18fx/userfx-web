import { useEffect, useRef } from "react";
import type { Mood } from "./client";
const paths: Record<string, string> = {
  chat: "M4 4h16v12H9l-5 4V4zM8 8h8M8 12h5",
  calendar: "M3 5h18v16H3zM7 3v4M17 3v4M3 10h18",
  camera: "M15 10l5-3v10l-5-3M3 6h12v12H3z",
  mic: "M9 3h6v10a3 3 0 0 1-6 0zM5 10v3a7 7 0 0 0 14 0v-3M12 20v2M8 22h8",
  send: "M3 3l19 9-19 9 4-9-4-9zM7 12h15",
  link: "M10 8l2-2a5 5 0 0 1 7 7l-3 3M14 16l-2 2a5 5 0 0 1-7-7l3-3M8 16l8-8",
  expand: "M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6",
  close: "M6 6l12 12M6 18L18 6",
  home: "M3 11l9-8 9 8M5 10v11h14V10M9 21v-7h6v7",
  stage: "M8 5a10 10 0 0 0 0 14M16 5a10 10 0 0 1 0 14M10 8a5 5 0 0 0 0 8M14 8a5 5 0 0 1 0 8M12 12h.01",
  inbox: "M3 6h18v14H3zM3 6l9 8 9-8",
  gallery: "M3 3h18v18H3zM3 16l6-6 7 7 5-5M15 7h.01",
  arrow: "M4 12h16M14 6l6 6-6 6",
  check: "M4 12l5 5L20 6",
  leave: "M9 3H3v18h6M8 12h13M16 7l5 5-5 5",
  profile: "M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3",
  shield: "M12 2l9 4v6c0 6-9 10-9 10S3 18 3 12V6zM8 12l3 3 5-6",
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
<path d={paths[name] || paths.stage} />
</svg>
  );
}
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
<span className={`ufx-avatar${large ? " ufx-avatar-large" : ""}`} aria-label={name}>
{name.replace(/^@/, "").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "FX"}
</span>
  );
}
export function MoodPicker({ mood, onChange }: { mood: Mood; onChange: (value: Mood) => void }) {
  return (
<div className="ufx-mood">
<span>
CHOOSE YOUR ATMOSPHERE
</span>
<div role="group" aria-label="Room atmosphere">
{(["cine", "arcade", "vintage"] as const).map((value) => (
<button key={value} type="button" className={mood === value ? "is-active" : ""} aria-pressed={mood === value} onClick={() => onChange(value)}>
{`${value === "cine" ? "◈" : value === "arcade" ? "✦" : "❖"} ${value.toUpperCase()}`}
</button>
    ))}
</div>
</div>
  );
}
// Muted video avoids double audio; each remote stream has one audio sink.
export function VideoStream({ stream, mirrored = false }: { stream: MediaStream; mirrored?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);
  return (
<video ref={ref} autoPlay playsInline muted className={mirrored ? "ufx-mirrored" : ""} />
);
}
export function AudioStream({ stream, onBlocked, unlocked }: { stream: MediaStream; onBlocked: () => void; unlocked: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.srcObject = stream;
    void audio.play().catch(onBlocked);
    return () => { audio.srcObject = null; };
  }, [stream, onBlocked, unlocked]);
  return (
<audio ref={ref} autoPlay />
);
}
