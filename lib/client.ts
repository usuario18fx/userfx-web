"use client";
/** Huella anónima y estable del dispositivo (sin datos personales). */
export function getFingerprint(): string {
  try {
    const raw = [
      navigator.userAgent,
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].join("|");

    let h = 5381;

    for (let i = 0; i < raw.length; i++) {
      h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
    }

    return "fp_" + (h >>> 0).toString(36);
  } catch {
    return "fp_anon";
  }
}

/** Detecta si el usuario prefiere reducir las animaciones. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Copia texto al portapapeles con fallback. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");

      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";

      document.body.appendChild(ta);

      ta.select();
      document.execCommand("copy");

      ta.remove();

      return true;
    } catch {
      return false;
    }
  }
}

/** Genera un código local únicamente para fallback/demo. */
export function generateVaultCode(): {
  full: string;
  last4: string;
} {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  const block = (length: number): string =>
    Array.from(
      { length },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");

  const a = block(4);
  const b = block(4);

  const full = `ŦX-${a}-${b}`;

  return {
    full,
    last4: b,
  };}