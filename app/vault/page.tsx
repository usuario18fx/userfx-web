"use client";
import { useEffect } from "react";

export default function VaultPage() {
  useEffect(() => {
    const target = new URL("/", window.location.origin);
    const search = new URLSearchParams(window.location.search);
    for (const key of ["code", "handoff", "identity"]) {
      const value = search.get(key);
      if (value) target.searchParams.set(key, value);
    }
    target.hash = "#/private-room-access";
    window.location.replace(target.toString());
  }, []);

  return (
    <main role="status" aria-live="polite" className="grid min-h-svh place-items-center bg-[#05070b] text-white">
      Opening your Vault…
    </main>
  );
}
