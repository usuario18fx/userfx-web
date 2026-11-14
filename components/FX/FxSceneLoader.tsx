"use client";
type Props = {
  progress: number;
};
export default function FxSceneLoader({ progress }: Props) {
  const percent = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="fx-scene-loader" role="status" aria-label="Loading USER FX Room">
      <div
        className="fx-scene-loader-ring"
        role="progressbar"
        aria-label="Loading 3D Room"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{ background: `conic-gradient(#316de6 ${percent}%, rgba(49,109,230,.14) ${percent}%)` }}
      >
        <div className="fx-scene-loader-core">
          <span className="fx-scene-loader-ghost">FX</span>
          <span
            className="fx-scene-loader-fill"
            style={{ clipPath: `inset(${100 - percent}% 0 0 0)` }}
          >
            FX
          </span>
        </div>
      </div>
      <span className="fx-scene-loader-label">LOADING USER FX ROOM</span>
      <span className="fx-scene-loader-percent">{percent}%</span>
    </div>
  );
}
