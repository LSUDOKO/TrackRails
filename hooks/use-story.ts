"use client";

import { useAccount, useWalletClient } from "wagmi";
import { useMemo } from "react";
import { createStoryClient } from "@/lib/story";
import type { StoryClient } from "@story-protocol/core-sdk";

export interface UseStoryClientReturn {
  /** StoryClient instance — `null` when wallet is not connected */
  client: StoryClient | null;
  /** Whether the user has a connected wallet */
  isConnected: boolean;
  /** Connected wallet address, if any */
  address: `0x${string}` | undefined;
}

/**
 * React hook that provides a `StoryClient` configured for the connected wallet.
 *
 * Returns `null` for `client` when no wallet is connected.
 *
 * @example
 * ```tsx
 * function RegisterTrackForm() {
 *   const { client, isConnected } = useStoryClient();
 *
 *   async function handleSubmit(track: TrackMetadata) {
 *     if (!client) return;
 *     const result = await registerTrack(client, { track });
 *     console.log("Registered IPA:", result.ipId);
 *   }
 * }
 * ```
 */
export function useStoryClient(): UseStoryClientReturn {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const client = useMemo(() => {
    if (!walletClient) return null;
    return createStoryClient(walletClient);
  }, [walletClient]);

  return {
    client,
    isConnected,
    address,
  } as const;
}
