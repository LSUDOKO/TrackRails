"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { aeneid } from "@story-protocol/core-sdk";
import { WagmiProvider, http } from "wagmi";
import type { ReactNode } from "react";
import "@rainbow-me/rainbowkit/styles.css";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "";

if (!projectId && process.env.NODE_ENV === "development") {
  console.warn(
    "[Track Rails] NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set. " +
      "Get one at https://cloud.walletconnect.com",
  );
}

const config = getDefaultConfig({
  appName: "Track Rails",
  projectId,
  chains: [aeneid],
  transports: {
    [aeneid.id]: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://aeneid.storyrpc.io"),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export default function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
