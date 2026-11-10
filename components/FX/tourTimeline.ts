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
 * Los componentes de interfaz (RoomIntro, HUD de Landing, etc.) necesitan
 * leer el guion SIN esperar al primer frame de la cámara. Este módulo
 * expone ahora, además de todo lo de v3:
 *
 *   · stageIndexAt(p)  → índice del step activo para un progreso dado.
 *                        MISMA FUENTE QUE LA CÁMARA: usa exactamente el
 *                        mismo criterio geométrico que CinematicTour usa
 *                        para su onStepChange (stepAt), así que la UI y la
 *                        cámara nunca discrepan.
 *   · stageAt(p)       → stage completo: step + fase + bloque (o null).
 *   · BLOCKS           → los 4 bloques de contenido (gallery, videocall,
 *                        multimedia, stage) derivados automáticamente de
 *                        STEP_DEFS: índices de steps, ventana t en la que
 *                        el bloque está activo y metadatos para el HUD.
 *   · blockIndexAt(i)  → índice de step → índice de bloque (-1 = intro).
 *   · blockAt(p)       → bloque activo según la ventana t (null en la intro).
 *
 * CÓMO SE USA
 * ───────────
 * 1. Edita STEP_DEFS: los valores son UNIDADES RELATIVAS de guion (no hace
 *    falta que sumen 1 ni ningún otro total).
 * 2. El módulo compone el timeline normalizado (t ∈ 0..1) con la fórmula
 *
 *        t_i = t_(i-1) + travel_i + (hold_(i-1) + hold_i) / 2
 *
 *    es decir: el espacio LIBRE entre dos pausas es EXACTAMENTE `travel`.
 *    Por construcción ninguna pausa puede solaparse con la siguiente, por
 *    más que subas los hold. Cambiar un valor reescala el recorrido entero
 *    automáticamente (todo sigue normalizado a 0..1).
 * 3. Regla práctica: travel ≈ 2× hold se siente "pausa y sigue";
 *    travel ≈ hold se siente "flujo continuo". Los travesíos largos
 *    (pasillo→habitación, multimedia→pasarela) llevan travel alto.
 * 4. Añadir/quitar/reordenar steps NO exige tocar nada más: los índices de
 *    BLOCKS, el mapa step→bloque y todas las ventanas se recalculan solos.
 *
 * EXPORTS
 * ───────
 *  · STEPS / STOP_T / ENTER_AT / stepIndex / StepKey  (compatibles con v2)
 *  · stepAt(p) → step activo + fase ("travel" | "hold") para la UI
 *  · stageIndexAt(p) / stageAt(p) → stage activo (mismo criterio que la cámara)
 *  · BLOCKS / blockIndexAt / blockAt → bloques de contenido para HUD
 *  · capFor(unlocked) → tope de progreso según lo desbloqueado (puertas)
 *  · Cada Step lleva block / label / drift / life listos para HUD o debug.
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
  readonly kind: "angle" | "focus" | "lock";
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
  // welcome abre con un latido corto (el primer 1% de scroll es "beat").
  { key: "welcome",    block: "intro", label: "Bienvenida",          travel: 0,     hold: 0.030, drift: 0,    life: 1.00 },
  { key: "corridor",   block: "intro", label: "El pasillo",          travel: 0.085, hold: 0.040, drift: 0.06, life: 0.90 },
  { key: "enter-room", block: "intro", label: "Entrar en la sala",   travel: 0.080, hold: 0.038, drift: 0.03, life: 0.95 },

  // ── BLOQUE 1 · Laptop My Gallery ─────────────────────────────────────────
  // Viajes cortos (la cámara ya está junto a la mesa) y pausetas de ángulo.
  // focus y lock son los pasos "de lectura": pausa larga, casi sin drift.
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
  // El travesío multimedia-lock → stage-a es el más largo de la sala: el
  // travel mayor le da espacio y CinematicTour inserta ahí un via alto.
  { key: "stage-a",     block: "stage", label: "Pasarela · grúa",    travel: 0.062, hold: 0.040, drift: 0.02, life: 1.15 },
  { key: "stage-b",     block: "stage", label: "Pasarela · raso",    travel: 0.045, hold: 0.040, drift: 0.02, life: 1.15 },
  { key: "stage-focus", block: "stage", label: "Pasarela · pantalla", travel: 0.040, hold: 0.055, drift: 0.01, life: 0.55 },
  // Cierre: la pausa más larga del tour y la más quieta (life bajo).
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
  kind: s.key.endsWith("-lock") ? "lock" : s.key.endsWith("-focus") ? "focus" : "angle",
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
 * Es geométrico (no depende de la spline), así que la UI puede usarlo sin
 * esperar al primer frame renderizado.
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
// `block` (≠ "intro") es un bloque. Así, editar los steps nunca rompe la UI.

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
  readonly number: number;
  readonly lock: number;
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
   * arranca el viaje hacia su primer step (termina la pausa anterior) y
   * sale al acabar la última pausa del bloque. Contiguos entre sí.
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
    number: i + 1,
    lock: b.last,
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
 * criterio que usa la cámara para onStepChange (stepAt), más su bloque.
 * La UI (RoomIntro, HUD) y CinematicTour comparten ESTA fuente, así que
 * lo que muestra la interfaz y lo que hace la cámara nunca discrepan.
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
 * Bloque activo según la ventana t (a diferencia de stageAt().block, que
 * sigue al step más cercano, este usa el rango enterT..exitT del bloque):
 * útil para fondos, acentos de color o paneles que cambian "por sala".
 * Devuelve null durante la intro.
 */
export const blockAt = (progress: number): Block | null => {
  const p = Math.max(0, Math.min(1, progress));
  for (const b of BLOCKS) {
    if (p >= b.enterT && p <= b.exitT) return b;
  }
  return null;
};

// ── PUERTA DE PROGRESO (capFor) ────────────────────────────────────────────
// El tour puede ser progresivo: cada bloque se DESBLOQUEA (p. ej. al pulsar
// el CTA de su pantalla) y el scroll se recorta hasta esa puerta. capFor
// convierte "cuánto hay desbloqueado" en el progreso máximo (0..1) que se
// permite alcanzar. La UI lo usa en su clamp del scroll:
//
//     const cap = capFor(unlockedRef.current);
//     if (!Number.isFinite(cap)) return;   // Infinity o NaN = sin tope
//     ... scrollY = Math.min(scrollY, cap * maxScroll) ...
//
// CONTRATO PRINCIPAL — unlocked = NÚMERO de bloques de contenido desbloqueados:
//   · 0          → solo la intro        (tope = puerta del bloque 1)
//   · 1..n-1     → visitables 1..n      (tope = puerta del bloque n+1)
//   · ≥ BLOCKS.length → Infinity        (tour abierto, sin tope)
// Es TOLERANTE con otras convenciones para que la UI no pueda romperse:
//   · true / false            → Infinity / puerta del bloque 1
//   · StepKey ("gallery-lock") → final de la pausa de ese step
//   · "all" | "*"             → Infinity
//   · array de StepKey        → final de la pausa del más avanzado
//   · null / undefined / NaN / desconocido → NaN (= "sin cap" para la UI)
export const capFor = (
  unlocked: number | boolean | string | readonly (string | number)[] | null | undefined
): number => {
  if (typeof unlocked === "number") {
    if (!Number.isFinite(unlocked)) return NaN;
    const n = Math.floor(unlocked);
    if (n <= 0) return BLOCKS[0]?.enterT ?? NaN;
    if (n >= BLOCKS.length) return Infinity;
    return BLOCKS[n].enterT;
  }
  if (typeof unlocked === "boolean") {
    return unlocked ? Infinity : (BLOCKS[0]?.enterT ?? NaN);
  }
  if (typeof unlocked === "string") {
    if (unlocked === "all" || unlocked === "*") return Infinity;
    try {
      const i = stepIndex(unlocked as StepKey);
      return Math.min(1, STEPS[i].t + STEPS[i].hold / 2);
    } catch {
      return NaN; // key desconocida: sin cap
    }
  }
  if (Array.isArray(unlocked)) {
    let best = -1;
    for (const item of unlocked) {
      if (typeof item !== "string") continue;
      try {
        best = Math.max(best, stepIndex(item as StepKey));
      } catch {
        /* key desconocida: se ignora */
      }
    }
    return best < 0 ? NaN : Math.min(1, STEPS[best].t + STEPS[best].hold / 2);
  }
  return NaN;
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
  // v4: los bloques derivados deben cuadrar con los steps.
  BLOCKS.forEach((b) => {
    if (b.keys.length !== b.last - b.first + 1) console.warn(`[tourTimeline] bloque ${b.id} con rango de steps inconsistente`);
    if (b.keys.some((k) => INDEX.get(k) === undefined)) console.warn(`[tourTimeline] bloque ${b.id} con steps desconocidos`);
    if (b.enterT >= b.exitT) console.warn(`[tourTimeline] bloque ${b.id} con ventana vacía`);
    const ids = new Set(b.keys.map((k) => STEPS[stepIndex(k)].block));
    if (ids.size !== 1 || !ids.has(b.id)) console.warn(`[tourTimeline] bloque ${b.id} mezcla steps de otros bloques`);
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

// Compatibilidad: RoomIntro / tourTimeline
export const BLOCK_COUNT = BLOCKS.length;
export const stepInBlock = (stepIdx: number): number => {
  const bi = blockIndexAt(stepIdx);
  const block = bi >= 0 ? BLOCKS[bi] : null;
  return block ? stepIdx - block.first + 1 : 0;
};
export const nearestStop = (progress: number): number => {
  if (!Number.isFinite(progress) || STOP_T.length === 0) return 0;
  let index = 0;
  let distance = Infinity;
  STOP_T.forEach((stop, i) => {
    const difference = Math.abs(stop - progress);
    if (difference < distance) { distance = difference; index = i; }
  });
  return index;
};
export const keyFromHash = (hash: string): StepKey | null => {
  const match = /^#\/?tour\/([^/?#]+)/.exec(hash);
  if (!match) return null;
  let key: string;
  try { key = decodeURIComponent(match[1]); } catch { return null; }
  return INDEX.has(key as StepKey) ? key as StepKey : null;
};
export const unlockedBefore = (stepIdx: number): number =>
  Math.max(0, blockIndexAt(stepIdx));
