import { useEffect, useRef } from "react";

/** Isolates the WebGL cover's styles and releases its animation on unmount. */
export default function CrownLanding({ onEnter }) {
  const frameRef = useRef(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (
        event.origin === window.location.origin &&
        event.source === frameRef.current?.contentWindow &&
        event.data?.type === "userfx:enter-vault"
      ) {
        onEnter();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEnter]);

  return (
    <iframe
      ref={frameRef}
      src={`${import.meta.env.BASE_URL}corona/index.html`}
      title="USER FX — Corona interactiva y entrada al vault"
      style={{ display: "block", width: "100%", height: "100dvh", border: 0, background: "#070b12" }}
    />
  );
}
