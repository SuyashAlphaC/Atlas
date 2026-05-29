"use client";

import { ReactNode } from "react";
import { Providers } from "@/lib/providers";
import { Header } from "./Header";
import { CursorAura } from "./CursorAura";
import { CommandPalette } from "./CommandPalette";

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <CursorAura />
      <CommandPalette />
      <Header />
      {children}
    </Providers>
  );
}
