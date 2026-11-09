"use client";
import { useEffect, useState } from "react";
export function useMediaQuery(query: string, fallback = false) {
  const [matches, setMatches] = useState(fallback);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    setMounted(true);
    list.addEventListener("change", sync);
    return () => list.removeEventListener("change", sync);
  }, [query]);
  return { matches, mounted };
}
