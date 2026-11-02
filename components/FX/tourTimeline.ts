/**
 * Fuente unica de los siete stops del recorrido.
 * Compartida por CinematicTour (camara y TV) y RoomIntro (texto, overlay y snap).
 * 0 welcome; 1 corridor; 2 enter-room;
 * 3 gallery; 4 videocall; 5 multimedia; 6 stage.
 */
export const STOP_T = [0, 0.15, 0.29, 0.43, 0.57, 0.70, 0.82, 0.91, 1] as const;
export const STOP_HOLD = [0.028, 0.03, 0.034, 0.040, 0.040, 0.030, 0.030, 0.025, 0] as const;

/** Momento en que se activa la etapa, al entrar en la pausa del stop. */
export const ENTER_AT: number[] = STOP_T.map((t, i) =>
  i === 0 ? 0 : i === STOP_T.length - 1 ? (STOP_T[i - 1] + t) / 2 : t - STOP_HOLD[i] / 2
);

/** Indice de etapa asociado al progreso del scroll. */
export const stageIndexAt = (p: number): number => {
  let idx = 0;
  for (let i = 0; i < ENTER_AT.length; i++) if (p >= ENTER_AT[i]) idx = i;
  return idx;
};

/** Indice del stop mas cercano, usado por el snap. */
export const nearestStop = (p: number): number => {
  let best = 0;
  for (let i = 1; i < STOP_T.length; i++) {
    if (Math.abs(STOP_T[i] - p) < Math.abs(STOP_T[best] - p)) best = i;
  }
  return best;
};
