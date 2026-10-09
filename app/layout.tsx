import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Funnel_Display, Funnel_Sans, Michroma } from "next/font/google";
import Script from "next/script";
import { ASSET_ORIGIN } from "@/lib/assets";
import { MotionProvider } from "@/components/FX/Motion";
import "./globals.css";
const display = Funnel_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-funnel-display",
  display: "swap",
});
const sans = Funnel_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-funnel-sans",
  display: "swap",
});
const wide = Michroma({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-michroma",
  display: "swap",
});
export const metadata: Metadata = {
  title: "USER FX — Your Private Vault",
  description:
    "Your identity. Your room. A shared stage. Private collections that open with your code.",
  icons: { icon: "/assets/userfx-logo-sin.png" },
};
export const viewport: Viewport = { themeColor: "#08090d" };
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${wide.variable}`}>
      <head>
        {ASSET_ORIGIN && (
          <>
            <link rel="preconnect" href={ASSET_ORIGIN} crossOrigin="" />
            <link rel="dns-prefetch" href={ASSET_ORIGIN} />
          </>
        )}
      </head>
      <body>
        <MotionProvider>{children}</MotionProvider>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
