import type { CSSProperties } from "react";
// Six inline glyphs; the existing private platform keeps its original controls.
export function Glyph({
  name,
  className,
  style,
}: {
  name: "crown" | "caret" | "camera" | "stage" | "lock" | "mail";
  className?: string;
  style?: CSSProperties;
}) {
  const paths = {
    crown: (
      <>
        <path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z" />
        <path d="M6 16h12" />
      </>
    ),
    caret: <path d="m9 5 7 7-7 7" />,
    camera: (
      <>
        <rect x="3" y="6" width="13" height="12" rx="3" />
        <path d="m16 10 5-3v10l-5-3" />
      </>
    ),
    stage: (
      <>
        <path d="M3 4h18v14H3zM2 21h20M8 4v14M16 4v14" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
