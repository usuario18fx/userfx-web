import type { Metadata } from "next";
import Experience from "@/components/FX/Experience";

export const metadata: Metadata = {
  metadataBase: new URL("https://user18fx.com"),
  alternates: { canonical: "/" },
  openGraph: {
    url: "https://user18fx.com/",
    title: "USER FX — Your Private ROOM",
    siteName: "USER FX",
  },
};

export default function Page() {
  return (
    <Experience />
  );
}
