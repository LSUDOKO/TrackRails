"use client";

import { useAccount, useWalletClient } from "wagmi";
import { useMemo } from "react";
import { createCDRClient } from "@/lib/cdr";
import { useWasm } from "@/components/WasmProvider";
import type { CDRClient } from "@piplabs/cdr-sdk";

export interface UseCDRClientReturn {
  /** Read‑only observer client — always available when WASM is ready */
  client: CDRClient;
  /** Whether the user has a connected wallet */
  isConnected: boolean;
  /** Connected wallet address, if any */
  address: `0x${string}` | undefined;
}

/**
 * React hook that provides a `CDRClient` configured for the current wallet state.
 *
 * - Always returns an **observer** client (read‑only queries).
 * - When a wallet is connected, the same `CDRClient` instance also exposes
 *   `uploader` and `consumer` via the wallet client.
 * - Relies on `WasmProvider` having already initialised the CDR WASM module.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { client, isConnected, address } = useCDRClient();
 *
 *   useEffect(() => {
 *     client.observer.getGlobalPubKey().then(console.log);
 *   }, [client]);
 * }
 * ```
 */
export function useCDRClient(): UseCDRClientReturn {
  // Ensure WASM is ready — parent WasmProvider blocks rendering otherwise
  useWasm();

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const client = useMemo(
    () =>
      createCDRClient({
        walletClient:
          isConnected && walletClient ? walletClient : undefined,
      }),
    // Re‑create only when wallet client instance changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletClient],
  );

  return {
    client,
    isConnected,
    address,
  } as const;
}
