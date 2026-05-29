import "./globals.css";
import { ReactNode } from "react";
import { BackgroundFX } from "@/components/BackgroundFX";
import { Shell } from "@/components/Shell";

export const metadata = {
  title: "Atlas — Autonomous RWA Alpha Strategist",
  description: "AI fund manager on Mantle. Every decision verifiable on-chain.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <BackgroundFX />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
