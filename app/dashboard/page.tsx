"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useStoryClient } from "@/hooks/use-story";
import Link from "next/link";
import { getTracksByOwner, fetchTrackMetadata, shortenAddress, getTrackIds } from "@/lib/queries";
import type { TrackData, TrackMetadata } from "@/lib/queries";
import { claimRevenue, REVENUE_TOKENS } from "@/lib/story";
import { createPublicClient, http, formatEther } from "viem";
import { aeneid } from "@story-protocol/core-sdk";

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];

const publicClient = createPublicClient({
  chain: aeneid,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://aeneid.storyrpc.io"),
});

const MERC20 = "0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E" as const;
const BALANCE_ABI = [
  {
    type: "function", name: "balanceOf",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

type Tab = "tracks" | "licenses" | "revenue";

interface TrackEntry extends TrackData {
  meta?: TrackMetadata;
  revenueBalance?: bigint;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { client: storyClient } = useStoryClient();
  const [tab, setTab] = useState<Tab>("tracks");
  const [tracks, setTracks] = useState<TrackEntry[]>([]);
  const [licenseCount, setLicenseCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimResults, setClaimResults] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!address) return;
    setLoading(true);

    Promise.all([
      getTracksByOwner(address).then(async (data) => {
        const withMeta = await Promise.all(
          data.map(async (t) => {
            const meta = (await fetchTrackMetadata(t.metadataURI)) ?? undefined;
            let revenueBalance = BigInt(0);
            try {
              const bal = await publicClient.readContract({
                address: MERC20,
                abi: BALANCE_ABI,
                functionName: "balanceOf",
                args: [address],
              });
              revenueBalance = bal as bigint;
            } catch {}
            return { ...t, meta, revenueBalance };
          }),
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
        } catch { continue; }
      }
      return count;
    } catch { return 0; }
  }

  const handleClaim = useCallback(async (track: TrackEntry) => {
    if (!storyClient) return;
    const key = track.tokenId.toString();
    setClaiming(key);
    setClaimResults((prev) => ({ ...prev, [key]: "" }));
    try {
      const result = await claimRevenue(storyClient, {
        ancestorIpId: track.ipId,
        childIpIds: [],
        currencyTokens: [REVENUE_TOKENS.MERC20],
      });
      const total = result.amountsClaimed.reduce((a, b) => a + b, BigInt(0));
      setClaimResults((prev) => ({
        ...prev,
        [key]: `Claimed ${formatEther(total)} MERC20`,
      }));
    } catch (err) {
      setClaimResults((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "Claim failed",
      }));
    } finally {
      setClaiming(null);
    }
  }, [storyClient]);

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
        {(["tracks", "licenses", "revenue"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {t === "tracks"
              ? `My Tracks (${tracks.length})`
              : t === "licenses"
                ? `My Licenses (${licenseCount})`
                : "Revenue"}
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
              const gradientIndex = Number(track.tokenId % BigInt(4));
              return (
                <Link
                  key={track.tokenId.toString()}
                  href={`/track/${track.ipId}`}
                  className="glass-card flex items-center gap-4 rounded-2xl p-4 transition-all hover:translate-x-1"
                >
                  <div className={`h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br ${GRADIENTS[Number(gradientIndex)]} flex items-center justify-center`}>
                    <span className="text-xl text-white/40">♪</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{title}</h3>
                    <p className="text-sm text-muted">{artist}</p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <p className="text-muted">{track.vaultLinked ? "Vault linked" : "No vault"}</p>
                    <p className="text-xs text-muted">Token #{track.tokenId.toString()}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      ) : tab === "licenses" ? (
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
      ) : (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-1">Claimable Revenue</h2>
            <p className="text-sm text-muted mb-4">
              Claim MERC20 revenue earned from license mints for your tracks.
            </p>
            {tracks.length === 0 ? (
              <p className="text-sm text-muted">Upload a track to start earning revenue.</p>
            ) : (
              <div className="space-y-3">
                {tracks.map((track) => {
                  const title = track.meta?.title ?? `Track #${track.tokenId.toString()}`;
                  const result = claimResults[track.tokenId.toString()];
                  const isClaiming = claiming === track.tokenId.toString();
                  return (
                    <div
                      key={track.tokenId.toString()}
                      className="flex items-center justify-between rounded-xl bg-background p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{title}</p>
                        <p className="text-xs text-muted">IP Asset: {shortenAddress(track.ipId)}</p>
                      </div>
                      <div className="shrink-0 ml-4">
                        {result ? (
                          <span className={`text-xs ${result.startsWith("Claimed") ? "text-emerald-400" : "text-red-400"}`}>
                            {result.length > 30 ? result.slice(0, 30) + "…" : result}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleClaim(track)}
                            disabled={isClaiming}
                            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isClaiming ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Claiming…
                              </>
                            ) : (
                              <>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Claim
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
