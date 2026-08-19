import type { ReactNode } from "react";
type Variant = "default" | "featured" | "rose";
/**
 * Card con la estética "LOCKED ACCESS":
 *  · Fondo casi negro con leve degradado dorado.
 *  · Esquinas doradas de visor (tipo cámara).
 *  · Línea superior dorada.
 *  · Halo interior sutil que se enciende al hover.
 */
export default function VaultCard({
  children,
  variant = "default",
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  as?: "div" | "article" | "section";
}) {
  const borderCls =
    variant === "featured"
      ? "border-gold/60"
      : variant === "rose"
        ? "border-rose/40"
        : "border-line hover:border-gold/50";

  const cornerCls =
    variant === "rose"
      ? "border-rose/70"
      : "border-gold/70";

  const glowCls =
    variant === "featured"
      ? "shadow-[0_0_40px_rgba(211,163,92,0.18)]"
      : "shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

  return (
    <Tag
      className={`vault-card relative border bg-gradient-to-br from-ink3/95 via-ink2/95 to-ink/95 ${borderCls} ${glowCls} transition-all duration-500 ${className}`}
    >
      {/* línea superior dorada */}
      <span
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${
          variant === "rose" ? "via-rose/70" : "via-gold/80"
        } to-transparent`}
      />

      {/* halo interior */}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(211,163,92,0.08),transparent_60%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

      {/* esquinas de visor */}
      <span className={`pointer-events-none absolute left-0 top-0 h-4 w-4 border-l border-t ${cornerCls}`} />
      <span className={`pointer-events-none absolute right-0 top-0 h-4 w-4 border-r border-t ${cornerCls}`} />
      <span className={`pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b border-l ${cornerCls}`} />
      <span className={`pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r ${cornerCls}`} />

      {/* contenido */}
      <div className="relative z-[1]">{children}</div>
    </Tag>
  );
}
