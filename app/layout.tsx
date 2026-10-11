import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { ASSET_ORIGIN } from "@/lib/assets";
import { MotionProvider } from "@/components/FX/Motion";
import "./globals.css";
export const metadata: Metadata = {
  title: "USER FX — Your Private Vault",
  description:
    "Your identity. Your room. A shared stage. Private collections that open with your code.",
  icons: { icon: "/assets/userfx-logo-sin.png" },
};
export const viewport: Viewport = { themeColor: "#08090d" };
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600;700&family=Funnel+Sans:wght@300;400;500;600&family=Michroma&display=swap"
        />
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
