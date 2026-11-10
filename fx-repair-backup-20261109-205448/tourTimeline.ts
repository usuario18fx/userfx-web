/**
 * tourTimeline — GUION DEL RECORRIDO (los STEPS) · v4
 *
 * Este módulo es la ÚNICA fuente de verdad de la coreografía:
 *   · travel → cuánto viaja la cámara para llegar a cada step
 *   · hold   → cuánto se detiene en él
 *   · drift  → cuánto avanza "respirando" dentro de la pausa
 *   · life   → cuánta vida tiene la pausa (respiración/parallax/roll)
 * CinematicTour.tsx solo aporta las POSES (posición / mirada / fov) por step,
 * así que TODO el ritmo del tour se edita aquí, en un solo sitio.
 *
 * NUEVO EN v4 — STAGES Y BLOQUES PARA LA UI
 * ─────────────────────────────────────────
 *   · stageIndexAt(p)  → índice del step activo. MISMA FUENTE QUE LA CÁMARA:
 *                        usa el mismo criterio (stepAt) que CinematicTour
 *                        emplea para su onStepChange.
 *   · stageAt(p)       → stage completo: step + fase + bloque (o null).
 *   · BLOCKS           → los 4 bloques de contenido, derivados automáticamente
 *                        de STEP_DEFS (índices, ventana t y metadatos HUD).
 *   · blockIndexAt(i)  → índice de step → índice de bloque (-1 = intro).
 *   · blockAt(p)       → bloque activo según la ventana t (null en la intro).
 *
 * EXPORTS
 * ───────
 *  · STEPS / STOP_T / ENTER_AT / stepIndex / StepKey  (compatibles con v2/v3)
 *  · stepAt(p) → step activo + fase ("travel" | "hold")
 *  · stageIndexAt(p) / stageAt(p) → stage activo (mismo criterio que la cámara)
 *  · BLOCKS / blockIndexAt / blockAt → bloques de contenido para HUD
 */

export type StepKey =
  | "welcome"
  | "corridor"
  | "enter-room"
  | "gallery-a"
  | "gallery-b"
  | "gallery-focus"
  | "gallery-lock"
  | "videocall-a"
  | "videocall-b"
  | "videocall-focus"
  | "videocall-lock"
  | "multimedia-a"
  | "multimedia-b"
  | "multimedia-focus"
  | "multimedia-lock"
  | "stage-a"
  | "stage-b"
  | "stage-focus"
  | "stage-lock";

export type StepBlock = "intro" | "gallery" | "videocall" | "multimedia" | "stage";
export type StepPhase = "travel" | "hold";

export type Step = {
  readonly key: StepKey;
  readonly block: StepBlock;
  /** Etiqueta corta, lista para HUD/subtítulos/depuración. */
  readonly label: string;
  /** Tiempo normalizado del stop (0..1) — DERIVADO, no editar a mano. */
  readonly t: number;
  /** Duración normalizada de la pausa — DERIVADA. */
  readonly hold: number;
  /** Avance residual de keyframes dentro de la pausa (el stop "respira"). */
  readonly drift: number;
  /** Intensidad de la vida en la pausa: 0.5 = plano fijo · 1.15 = amplia. */
  readonly life: number;
};

/** Declaración editable. El orden del array ES el orden del recorrido. */
type StepDef = {
  key: StepKey;
  block: StepBlock;
  label: string;
  /** Viaje desde el step anterior (el primero lo ignora). */
  travel: number;
  /** Pausa sobre el step. */
  hold: number;
  /** Avance residual dentro de la pausa (unidades de keyframe). */
  drift: number;
  /** Personalidad de la pausa (multiplica respiración/parallax/micro-roll). */
  life: number;
};

const STEP_DEFS: readonly StepDef[] = [
  // ── INTRO · pasillo y entrada ────────────────────────────────────────────
  { key: "welcome",    block: "intro", label: "Bienvenida",          travel: 0,     hold: 0.030, drift: 0,    life: 1.00 },
  { key: "corridor",   block: "intro", label: "El pasillo",          travel: 0.085, hold: 0.040, drift: 0.06, life: 0.90 },
  { key: "enter-room", block: "intro", label: "Entrar en la sala",   travel: 0.080, hold: 0.038, drift: 0.03, life: 0.95 },

  // ── BLOQUE 1 · Laptop My Gallery ─────────────────────────────────────────
  { key: "gallery-a",     block: "gallery", label: "My Gallery · ángulo",   travel: 0.052, hold: 0.040, drift: 0.02,  life: 1.15 },
  { key: "gallery-b",     block: "gallery", label: "My Gallery · ángulo 2", travel: 0.045, hold: 0.040, drift: 0.02,  life: 1.15 },
  { key: "gallery-focus", block: "gallery", label: "My Gallery · pantalla", travel: 0.040, hold: 0.055, drift: 0.01,  life: 0.55 },
  { key: "gallery-lock",  block: "gallery", label: "My Gallery · UI",       travel: 0.034, hold: 0.050, drift: 0.015, life: 0.80 },

  // ── BLOQUE 2 · TV videollamada ───────────────────────────────────────────
  { key: "videocall-a",     block: "videocall", label: "Videollamada · desde la cama", travel: 0.055, hold: 0.040, drift: 0.02,  life: 1.15 },
  { key: "videocall-b",     block: "videocall", label: "Videollamada · diagonal",      travel: 0.050, hold: 0.040, drift: 0.02,  life: 1.15 },
  { key: "videocall-focus", block: "videocall", label: "Videollamada · pantalla",      travel: 0.040, hold: 0.055, drift: 0.01,  life: 0.55 },
  { key: "videocall-lock",  block: "videocall", label: "Videollamada · UI",            travel: 0.034, hold: 0.050, drift: 0.015, life: 0.80 },

  // ── BLOQUE 3 · Laptop multimedia ─────────────────────────────────────────
  { key: "multimedia-a",     block: "multimedia", label: "Multimedia · ángulo",   travel: 0.050, hold: 0.040, drift: 0.02,  life: 1.15 },
  { key: "multimedia-b",     block: "multimedia", label: "Multimedia · picado",   travel: 0.045, hold: 0.040, drift: 0.02,  life: 1.15 },
  { key: "multimedia-focus", block: "multimedia", label: "Multimedia · pantalla", travel: 0.040, hold: 0.055, drift: 0.01,  life: 0.55 },
  { key: "multimedia-lock",  block: "multimedia", label: "Multimedia · UI",       travel: 0.034, hold: 0.050, drift: 0.015, life: 0.80 },

  // ── BLOQUE 4 · TV pasarela (Stage) ───────────────────────────────────────
  { key: "stage-a",     block: "stage", label: "Pasarela · grúa",    travel: 0.062, hold: 0.040, drift: 0.02, life: 1.15 },
  { key: "stage-b",     block: "stage", label: "Pasarela · raso",    travel: 0.045, hold: 0.040, drift: 0.02, life: 1.15 },
  { key: "stage-focus", block: "stage", label: "Pasarela · pantalla", travel: 0.040, hold: 0.055, drift: 0.01, life: 0.55 },
  { key: "stage-lock",  block: "stage", label: "Pasarela · UI",      travel: 0.034, hold: 0.065, drift: 0,    life: 0.50 },
];

// ── Layout automático del timeline (no tocar) ──────────────────────────────
// t_i = t_(i-1) + travel_i + hold_(i-1)/2 + hold_i/2  →  hueco libre = travel.
const HALF = STEP_DEFS.map((s) => s.hold / 2);
const RAW_T: number[] = [];
let acc = 0;
STEP_DEFS.forEach((s, i) => {
  if (i > 0) acc += s.travel + HALF[i - 1] + HALF[i];
  RAW_T.push(acc);
});
const TOTAL = RAW_T[RAW_T.length - 1] + HALF[HALF.length - 1];

export const STEPS: readonly Step[] = STEP_DEFS.map((s, i) => ({
  ...s,
  t: RAW_T[i] / TOTAL,
  hold: s.hold / TOTAL,
}));

/** Tiempo del stop de cada step (índice = orden del recorrido). */
export const STOP_T: readonly number[] = STEPS.map((s) => s.t);

/** Instante en el que la cámara ENTRA en la pausa de cada step. */
export const ENTER_AT: readonly number[] = STEPS.map((s) => Math.max(0, s.t - s.hold / 2));

const INDEX: ReadonlyMap<StepKey, number> = new Map(STEPS.map((s, i) => [s.key, i]));

export const stepIndex = (key: StepKey): number => {
  const i = INDEX.get(key);
  if (i === undefined) throw new Error(`[tourTimeline] step desconocido: ${key}`);
  return i;
};

/**
 * Step activo para un progreso dado, con su fase:
 *   · "hold"   → el progreso cae dentro de la pausa (con un pelín de margen)
 *   · "travel" → la cámara está viajando hacia él (o saliendo)
 */
export const stepAt = (
  progress: number
): { key: StepKey; index: number; phase: StepPhase } => {
  const p = Math.max(0, Math.min(1, progress));
  let index = 0;
  let best = Infinity;
  for (let i = 0; i < STEPS.length; i++) {
    const d = Math.abs(p - STEPS[i].t);
    if (d < best) {
      best = d;
      index = i;
    }
  }
  const s = STEPS[index];
  return { key: s.key, index, phase: best <= s.hold / 2 + 0.004 ? "hold" : "travel" };
};

// ── BLOQUES DE CONTENIDO (v4) ──────────────────────────────────────────────
// Se DERIVAN de STEP_DEFS: cada secuencia consecutiva de steps con el mismo
// `block` (≠ "intro") es un bloque. Editar los steps nunca rompe la UI.

export type BlockId = Exclude<StepBlock, "intro">;

const BLOCK_META: Record<BlockId, { name: string; description: string }> = {
  gallery:    { name: "My Gallery",   description: "La laptop sobre la mesa: la puerta a la galería." },
  videocall:  { name: "Videollamada", description: "La TV junto a la ventana, en llamada." },
  multimedia: { name: "Multimedia",   description: "La laptop en modo reels y vídeo." },
  stage:      { name: "Pasarela",     description: "La TV grande: cierre del recorrido." },
};

export type Block = {
  readonly id: BlockId;
  /** Posición del bloque dentro de BLOCKS (0-based). */
  readonly index: number;
  /** Nombre corto del bloque. */
  readonly name: string;
  /** Alias de `name`, por comodidad para el HUD. */
  readonly title: string;
  /** Etiqueta lista para HUD: "01 · My Gallery". */
  readonly label: string;
  /** Una línea de contexto para subtítulos o paneles. */
  readonly description: string;
  /** Índice (en STEPS) del primer y último step del bloque. */
  readonly first: number;
  readonly last: number;
  /**
   * Ventana normalizada en la que el bloque está EN cámara: entra cuando
   * arranca el viaje hacia su primer step y sale al acabar la última pausa.
   */
  readonly enterT: number;
  readonly exitT: number;
  /** Steps que componen el bloque, en orden del recorrido. */
  readonly keys: readonly StepKey[];
};

const BLOCKS_RAW = (() => {
  const out: { id: BlockId; first: number; last: number; keys: StepKey[] }[] = [];
  STEPS.forEach((s, i) => {
    if (s.block === "intro") return;
    const prev = out[out.length - 1];
    if (prev && prev.id === s.block) {
      prev.last = i;
      prev.keys.push(s.key);
    } else {
      out.push({ id: s.block, first: i, last: i, keys: [s.key] });
    }
  });
  return out;
})();

export const BLOCKS: readonly Block[] = BLOCKS_RAW.map((b, i) => {
  const meta = BLOCK_META[b.id];
  const prevT = b.first > 0 ? STEPS[b.first - 1].t + STEPS[b.first - 1].hold / 2 : 0;
  const exitT = Math.min(1, STEPS[b.last].t + STEPS[b.last].hold / 2);
  return {
    id: b.id,
    index: i,
    name: meta.name,
    title: meta.name,
    label: `${String(i + 1).padStart(2, "0")} · ${meta.name}`,
    description: meta.description,
    first: b.first,
    last: b.last,
    enterT: Math.max(0, Math.min(1, prevT)),
    exitT,
    keys: b.keys,
  };
});

/** step index → block index (-1 = intro o fuera de rango). */
const STEP_TO_BLOCK: readonly number[] = (() => {
  const map = new Array<number>(STEPS.length).fill(-1);
  BLOCKS.forEach((b) => {
    for (let i = b.first; i <= b.last; i++) map[i] = b.index;
  });
  return map;
})();

export const blockIndexAt = (stepIdx: number): number =>
  stepIdx >= 0 && stepIdx < STEP_TO_BLOCK.length ? STEP_TO_BLOCK[stepIdx] : -1;

/**
 * Stage activo para un progreso dado: el índice del step con el mismo
 * criterio que usa la cámara para onStepChange (stepAt). La UI y la cámara
 * comparten ESTA fuente, así que nunca discrepan.
 */
export const stageIndexAt = (progress: number): number => stepAt(progress).index;

export type StageSnapshot = {
  readonly index: number;
  readonly key: StepKey;
  readonly phase: StepPhase;
  readonly step: Step;
  readonly blockIndex: number;
  readonly block: Block | null;
};

export const stageAt = (progress: number): StageSnapshot => {
  const { key, index, phase } = stepAt(progress);
  const blockIndex = blockIndexAt(index);
  return {
    index,
    key,
    phase,
    step: STEPS[index],
    blockIndex,
    block: blockIndex >= 0 ? BLOCKS[blockIndex] : null,
  };
};

/**
 * Bloque activo según la ventana t: útil para fondos, acentos de color o
 * paneles que cambian "por sala". Devuelve null durante la intro.
 */
export const blockAt = (progress: number): Block | null => {
  const p = Math.max(0, Math.min(1, progress));
  for (const b of BLOCKS) {
    if (p >= b.enterT && p <= b.exitT) return b;
  }
  return null;
};

// ── Validación en desarrollo ───────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<StepKey>();
  STEP_DEFS.forEach((s, i) => {
    if (seen.has(s.key)) console.warn(`[tourTimeline] step duplicado: ${s.key}`);
    seen.add(s.key);
    if (i > 0 && s.travel <= 0) console.warn(`[tourTimeline] travel ≤ 0 antes de ${s.key}`);
    if (s.hold < 0 || s.drift < 0) console.warn(`[tourTimeline] hold/drift negativos en ${s.key}`);
  });
  if (STEP_DEFS[0].travel !== 0) console.warn("[tourTimeline] el primer step debe tener travel = 0");
  for (let i = 1; i < STEPS.length; i++) {
    const free =
      STEPS[i].t - STEPS[i].hold / 2 - (STEPS[i - 1].t + STEPS[i - 1].hold / 2);
    if (free <= 0) {
      console.warn(`[tourTimeline] pausas solapadas entre ${STEPS[i - 1].key} y ${STEPS[i].key}`);
    }
  }
  BLOCKS.forEach((b) => {
    if (b.keys.length !== b.last - b.first + 1) console.warn(`[tourTimeline] bloque ${b.id} con rango de steps inconsistente`);
    if (b.enterT >= b.exitT) console.warn(`[tourTimeline] bloque ${b.id} con ventana vacía`);
  });
  for (let i = 1; i < BLOCKS.length; i++) {
    if (Math.abs(BLOCKS[i].enterT - BLOCKS[i - 1].exitT) > 1e-9) {
      console.warn(`[tourTimeline] bloques no contiguos: ${BLOCKS[i - 1].id} → ${BLOCKS[i].id}`);
    }
  }
  STEPS.forEach((s, i) => {
    const bi = STEP_TO_BLOCK[i];
    if (s.block === "intro" && bi !== -1) console.warn(`[tourTimeline] step de intro ${s.key} mapeado a un bloque`);
    if (s.block !== "intro" && (bi < 0 || BLOCKS[bi].id !== s.block)) {
      console.warn(`[tourTimeline] step ${s.key} mal mapeado a su bloque`);
    }
  });
}


/**
 * Limita el progreso del recorrido seg?n los bloques
 * desbloqueados. Los l?mites se derivan de BLOCKS.
 */
export const capFor = (unlocked: number): number => {
  if (!Number.isFinite(unlocked)) return 0;

  const count = BLOCKS.length;
  const level = Math.max(0, Math.floor(unlocked));

  // Todos los bloques desbloqueados
  if (level >= count) return Infinity;

  // Permitir recorrer el bloque actual
  return BLOCKS[level]?.exitT ?? 0;
};
