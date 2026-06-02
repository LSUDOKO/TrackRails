"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { getTracksByOwner, fetchTrackMetadata, shortenAddress, getTrackIds } from "@/lib/queries";
import type { TrackData, TrackMetadata } from "@/lib/queries";
import { createPublicClient, http } from "viem";
import { aeneid } from "@story-protocol/core-sdk";

const publicClient = createPublicClient({
  chain: aeneid,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://aeneid.storyrpc.io"),
});

type Tab = "tracks" | "licenses";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("tracks");
  const [tracks, setTracks] = useState<(TrackData & { meta?: TrackMetadata })[]>([]);
  const [licenseCount, setLicenseCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    setLoading(true);

    Promise.all([
      getTracksByOwner(address).then(async (data) => {
        const withMeta = await Promise.all(
          data.map(async (t) => ({ ...t, meta: (await fetchTrackMetadata(t.metadataURI)) ?? undefined })),
        );
        return withMeta;
      }),
      getLicenseCount(address),
    ])
      .then(([t, count]) => {
        setTracks(t);
        setLicenseCount(count);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address]);

  async function getLicenseCount(owner: `0x${string}`): Promise<number> {
    try {
      const ids = await getTrackIds(0, 100);
      let count = 0;
      for (const tokenId of ids) {
        try {
          const bal = await publicClient.readContract({
            address: "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC" as `0x${string}`,
            abi: [
              { type: "function", name: "balanceOf", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
            ],
            functionName: "balanceOf",
            args: [owner, tokenId],
          });
          count += Number(bal);
        } catch {
          continue;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-muted">Connect your wallet to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted">
          <code className="rounded bg-card px-2 py-0.5 text-xs font-mono text-accent">
            {shortenAddress(address!)}
          </code>
        </p>
      </div>

      <div className="mb-8 flex gap-1 rounded-xl bg-card p-1">
        {(["tracks", "licenses"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {t === "tracks" ? `My Tracks (${tracks.length})` : `My Licenses (${licenseCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : tab === "tracks" ? (
        <div className="space-y-3">
          {tracks.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-muted">You haven&apos;t uploaded any tracks yet.</p>
              <Link href="/upload" className="mt-4 inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">
                Upload Your First Track
              </Link>
            </div>
          ) : (
            tracks.map((track) => {
              const title = track.meta?.title ?? `Track #${track.tokenId.toString()}`;
              const artist = track.meta?.artist ?? shortenAddress(track.owner);
              return (
                <Link
                  key={track.tokenId.toString()}
                  href={`/track/${track.ipId}`}
                  className="glass-card flex items-center justify-between rounded-2xl p-4 transition-all hover:translate-x-1"
                >
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm text-muted">{artist}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted">{track.vaultLinked ? "Vault linked" : "No vault"}</p>
                    <p className="text-xs text-muted">Token #{track.tokenId.toString()}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {licenseCount === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-muted">You haven&apos;t minted any licenses yet.</p>
              <Link href="/browse" className="mt-4 inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-3xl font-bold text-accent">{licenseCount}</p>
              <p className="mt-1 text-sm text-muted">License token{licenseCount !== 1 ? "s" : ""} minted</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
