import { useCallback, useEffect, useRef, useState } from "react";

type Cue = "open" | "close" | "message";
const KEY = "userfx_room_sound";
// Original FX-room signature: a soft glass fifth, reversed on dismissal.
const SCORES: Record<Cue, readonly [number, number, number][]> = {
  open: [[392, 0, 0.18], [587.33, 0.055, 0.22], [784, 0.11, 0.2]],
  close: [[587.33, 0, 0.13], [392, 0.06, 0.18]],
  message: [[659.25, 0, 0.16], [987.77, 0.075, 0.2]],
};
export function useFxSound() {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const audio = useRef<AudioContext | null>(null);
  const last = useRef(-Infinity);
  useEffect(() => {
    try { enabledRef.current = localStorage.getItem(KEY) !== "off"; } catch {}
    setEnabled(enabledRef.current);
    const sync = () => { try { enabledRef.current = localStorage.getItem(KEY) !== "off"; setEnabled(enabledRef.current); } catch {} };
    window.addEventListener("userfx-room-sound", sync);
    window.addEventListener("storage", sync);
    const unlock = () => {
      if (!enabledRef.current || !window.AudioContext) return;
      try {
        audio.current ??= new AudioContext();
        if (audio.current.state === "suspended") void audio.current.resume().catch(() => {});
      } catch {}
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("userfx-room-sound", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      const context = audio.current; audio.current = null;
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
  }, []);
  const play = useCallback((cue: Cue) => {
    const context = audio.current;
    if (!enabledRef.current || !context || context.state !== "running" || document.hidden) return;
    // One alert per polling batch; rapid clicks cannot create a loud stack.
    const now = context.currentTime;
    if (now - last.current < 0.12) return;
    last.current = now;
    try {
      for (const [frequency, offset, duration] of SCORES[cue]) {
        const tone = context.createOscillator(), gain = context.createGain();
        tone.type = "sine"; tone.frequency.value = frequency;
        const start = now + offset;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.035, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        tone.connect(gain); gain.connect(context.destination);
        tone.onended = () => { tone.disconnect(); gain.disconnect(); };
        tone.start(start); tone.stop(start + duration + 0.02);
      }
    } catch { /* Audio is optional; room actions always continue. */ }
  }, []);
  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
    try { localStorage.setItem(KEY, enabledRef.current ? "on" : "off"); } catch {}
    window.dispatchEvent(new Event("userfx-room-sound"));
  }, []);
  return { enabled, toggle, play };
}
