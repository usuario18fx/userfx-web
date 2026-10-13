type CrownFXIconProps = {
  source?: string;
  className?: string;
};

/**
 * Crown cutout from the UserFX emblem itself.
 * It uses the original artwork (same colors/gems), rather than an approximation.
 * The companion logo layer masks the same area so the crown can animate alone.
 */
export default function CrownFXIcon({ source = "/icon4.png", className = "" }: CrownFXIconProps) {
  return (
    <span className={`ufx-crown-icon ${className}`} aria-hidden="true">
      <img src={source} alt="" className="ufx-crown-icon-art" draggable={false} />
    </span>
  );
}
