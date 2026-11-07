/**
 * USER FX — MY ROOM · fuente ÚNICA del recorrido.
 * La comparten CinematicTour (cámara, TV, laptop) y RoomIntro (texto, overlay,
 * bloqueo de scroll, snap y enlaces).
 *
 * ESTRUCTURA (15 steps)
 *   0  welcome          intro
 *   1  corridor         intro
 *   2  enter-room       intro
 *   ── BLOQUE 1 · TV videollamada ───────────────────────────────
 *   3  videocall-a      vacío  (ángulo A: desde la cama)
 *   4  videocall-b      vacío  (ángulo B: diagonal alta)
 *   5  videocall-focus  enfoque exacto a la TV
 *   6  videocall-lock   botones + texto  ← BLOQUEO
 *   ── BLOQUE 2 · Laptop (My Gallery / Multimedia) ──────────────
 *   7  gallery-a        vacío
 *   8  gallery-b        vacío
 *   9  gallery-focus    enfoque exacto a la pantalla
 *   10 gallery-lock     botones + texto  ← BLOQUEO
 *   ── BLOQUE 3 · TV pasarela (Stage) ───────────────────────────
 *   11 stage-a          vacío
 *   12 stage-b          vacío
 *   13 stage-focus      enfoque exacto a la TV
 *   14 stage-lock       botones + texto  ← BLOQUEO (salida de la sección)
 *
 * ENLACES A STEPS
 *   • Hash:    #tour/gallery-focus   (cualquier key de STEPS)
 *   • Evento:  window.dispatchEvent(new CustomEvent("fx:tour-goto", { detail: { key: "stage-a" } }))
 *   Ambos desbloquean los bloques anteriores al destino.
 *
 * Para mover un step: cambia su `t` (0..1). Los holds no deben solaparse
 * (t[i+1] - t[i] debe ser mayor que (hold[i] + hold[i+1]) / 2).
 */

export type BlockId = "tv-videocall" | "laptop-gallery" | "tv-stage";
export type StepKind = "intro" | "empty" | "focus" | "lock";
export type StepDef = {
  key: string;
  block: BlockId | null;
  kind: StepKind;
  /** progreso del scroll (0..1) en el que la cámara está en el step */
  t: number;
  /** ancho de la pausa (cámara frenada) centrada en t */
  hold: number;
};

export const STEPS = [
  { key: "welcome",         block: null,             kind: "intro", t: 0,     hold: 0.028 },
  { key: "corridor",        block: null,             kind: "intro", t: 0.06,  hold: 0.03 },
  { key: "enter-room",      block: null,             kind: "intro", t: 0.12,  hold: 0.034 },

  { key: "videocall-a",     block: "tv-videocall",   kind: "empty", t: 0.193, hold: 0.03 },
  { key: "videocall-b",     block: "tv-videocall",   kind: "empty", t: 0.267, hold: 0.03 },
  { key: "videocall-focus", block: "tv-videocall",   kind: "focus", t: 0.34,  hold: 0.034 },
  { key: "videocall-lock",  block: "tv-videocall",   kind: "lock",  t: 0.413, hold: 0.045 },

  { key: "gallery-a",       block: "laptop-gallery", kind: "empty", t: 0.487, hold: 0.03 },
  { key: "gallery-b",       block: "laptop-gallery", kind: "empty", t: 0.56,  hold: 0.03 },
  { key: "gallery-focus",   block: "laptop-gallery", kind: "focus", t: 0.633, hold: 0.034 },
  { key: "gallery-lock",    block: "laptop-gallery", kind: "lock",  t: 0.707, hold: 0.045 },

  { key: "stage-a",         block: "tv-stage",       kind: "empty", t: 0.78,  hold: 0.03 },
  { key: "stage-b",         block: "tv-stage",       kind: "empty", t: 0.853, hold: 0.03 },
  { key: "stage-focus",     block: "tv-stage",       kind: "focus", t: 0.927, hold: 0.03 },
  { key: "stage-lock",      block: "tv-stage",       kind: "lock",  t: 1,     hold: 0 },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/** Vistas compatibles con el código anterior. */
export const STOP_T: number[] = STEPS.map((s) => s.t);
export const STOP_HOLD: number[] = STEPS.map((s) => s.hold);

/** Momento en que se activa el step (al entrar en la pausa). El último step se activa a medio camino. */
export const ENTER_AT: number[] = STOP_T.map((t, i) =>
  i === 0 ? 0 : i === STOP_T.length - 1 ? (STOP_T[i - 1] + t) / 2 : t - STOP_HOLD[i] / 2
);

/** Índice de step asociado al progreso del scroll. */
export const stageIndexAt = (p: number): number => {
  let idx = 0;
  for (let i = 0; i < ENTER_AT.length; i++) if (p >= ENTER_AT[i]) idx = i;
  return idx;
};

/** Índice del stop más cercano, usado por el snap. */
export const nearestStop = (p: number): number => {
  let best = 0;
  for (let i = 1; i < STOP_T.length; i++) {
    if (Math.abs(STOP_T[i] - p) < Math.abs(STOP_T[best] - p)) best = i;
  }
  return best;
};

// ─── Búsqueda por key (para enlaces) ───────────────────────────────────────
export const STEP_KEYS: string[] = STEPS.map((s) => s.key);
export const stepIndex = (key: string): number => STEP_KEYS.indexOf(key);
export const stepT = (key: string): number => {
  const i = stepIndex(key);
  return i < 0 ? 0 : STOP_T[i];
};

// ─── Bloques y bloqueo ─────────────────────────────────────────────────────
export type BlockDef = {
  id: BlockId;
  /** 1..3 */
  number: number;
  /** índice del primer step del bloque */
  first: number;
  /** índice del step de botones (bloqueo) */
  lock: number;
};

export const BLOCKS: BlockDef[] = (["tv-videocall", "laptop-gallery", "tv-stage"] as const).map(
  (id, n) => {
    const idxs = STEPS.map((s, i) => (s.block === id ? i : -1)).filter((i) => i >= 0);
    return { id, number: n + 1, first: idxs[0], lock: idxs[idxs.length - 1] };
  }
);
export const BLOCK_COUNT = BLOCKS.length;

/** Bloque (0..2) al que pertenece el step, o -1 si es intro. */
export const blockIndexAt = (stepIdx: number): number =>
  BLOCKS.findIndex((b) => stepIdx >= b.first && stepIdx <= b.lock);

/** Posición del step dentro de su bloque (1..4), o 0 si es intro. */
export const stepInBlock = (stepIdx: number): number => {
  const b = blockIndexAt(stepIdx);
  return b < 0 ? 0 : stepIdx - BLOCKS[b].first + 1;
};

/** Hasta dónde se puede hacer scroll mientras el bloque `b` siga bloqueado. */
export const LOCK_CAP: number[] = BLOCKS.map((b) => Math.min(1, STOP_T[b.lock] + STOP_HOLD[b.lock] / 2));

/**
 * Progreso máximo permitido dado cuántos bloques están desbloqueados.
 * 0 → tope en el bloque 1 · 3 → sin tope.
 */
export const capFor = (unlocked: number): number =>
  unlocked >= BLOCK_COUNT ? Infinity : LOCK_CAP[Math.max(0, unlocked)];

/** Bloques que quedan desbloqueados al saltar directamente a un step (enlaces). */
export const unlockedBefore = (stepIdx: number): number => BLOCKS.filter((b) => b.lock < stepIdx).length;

// ─── Enlaces por hash ──────────────────────────────────────────────────────
export const STEP_HASH_PREFIX = "#tour/";
export const stepHash = (key: string): string => `${STEP_HASH_PREFIX}${key}`;
export const keyFromHash = (hash: string): string | null => {
  if (!hash.startsWith(STEP_HASH_PREFIX)) return null;
  const key = decodeURIComponent(hash.slice(STEP_HASH_PREFIX.length));
  return stepIndex(key) >= 0 ? key : null;
};

if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
  for (let i = 1; i < STEPS.length; i++) {
    const gap = STEPS[i].t - STEPS[i - 1].t;
    const need = (STEPS[i].hold + STEPS[i - 1].hold) / 2;
    if (gap <= need) console.warn("[tourTimeline] holds solapados entre", STEPS[i - 1].key, "y", STEPS[i].key);
  }
}