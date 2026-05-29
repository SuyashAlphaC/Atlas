"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useMemo, useState } from "react";
import { mantleMainnet, mantleSepolia } from "./chain";

// Lazy config — only constructed once we're in the browser. Prevents WalletConnect
// connector from triggering indexedDB access during Next server render.
function buildConfig() {
  return getDefaultConfig({
    appName: "Atlas",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "atlas-dev-placeholder-replace-before-deploy",
    chains: [mantleMainnet, mantleSepolia],
    ssr: false,
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const config = useMemo(() => buildConfig(), []);
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#6B5BE6",
            accentColorForeground: "#FFFFFF",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
