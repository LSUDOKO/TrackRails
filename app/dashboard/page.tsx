"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useStoryClient } from "@/hooks/use-story";
import Link from "next/link";
import { fetchTrackMetadata, shortenAddress, CONTRACTS_NOT_DEPLOYED_ERROR } from "@/lib/queries";
import type { TrackData, TrackMetadata } from "@/lib/queries";
import { claimRevenue, REVENUE_TOKENS } from "@/lib/story";
import { formatEther } from "viem";
import { isContractConfigured } from "@/lib/env";
import { getUploadedTracks, mergeTracksWithLocal } from "@/lib/local-tracks";
import { useTransactionToasts } from "@/components/TransactionToastProvider";
import { getOwnedLicenseCount } from "@/lib/license-tokens";
import RippleWaveLoader from "@/components/ui/ripple-wave-loader";

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];

type Tab = "tracks" | "licenses" | "revenue";

interface TrackEntry extends TrackData {
  meta?: TrackMetadata;
  localOnly?: boolean;
}

type RevenueInfo = {
  claimableWip: bigint;
  loading: boolean;
  error?: string;
};

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-5 text-center">
      <div className={`text-2xl font-black tracking-tight tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { client: storyClient } = useStoryClient();
  const { addTransactionToast } = useTransactionToasts();
  const [tab, setTab] = useState<Tab>("tracks");
  const [tracks, setTracks] = useState<TrackEntry[]>([]);
  const [licenseCount, setLicenseCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimResults, setClaimResults] = useState<Record<string, string>>({});
  const [revenueInfo, setRevenueInfo] = useState<Record<string, RevenueInfo>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!address) return;

    if (!isContractConfigured("NEXT_PUBLIC_TRACK_RAILS_PROTOCOL")) {
      setLoading(false);
      setLoadError(CONTRACTS_NOT_DEPLOYED_ERROR);
      return;
    }

    setLoading(true);
    setLoadError(null);

    async function fetchTracksByOwner(owner: `0x${string}`): Promise<TrackEntry[]> {
      const res = await fetch(`/api/tracks?action=getTracksByOwner&owner=${owner}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API error (${res.status})`);
      }
      const data = await res.json();
      return (data.tracks ?? []).map((t: Record<string, unknown>) => ({
        tokenId: BigInt((t as { tokenId: string }).tokenId),
        ipId: t.ipId as `0x${string}`,
        vaultUuid: t.vaultUuid as number,
        owner: t.owner as `0x${string}`,
        metadataURI: t.metadataURI as string,
        licenseTermsId: BigInt(t.licenseTermsId as string),
        timestamp: BigInt(t.timestamp as string),
        vaultLinked: t.vaultLinked as boolean,
      }));
    }

    const localTracks = getUploadedTracks(address);

    Promise.all([
      fetchTracksByOwner(address).then(async (data) => {
        const merged = mergeTracksWithLocal(data, localTracks);
        const withMeta = await Promise.all(
          merged.map(async (t) => {
            const meta = t.meta ?? (await fetchTrackMetadata(t.metadataURI)) ?? undefined;
            return { ...t, meta };
          }),
        );
        return withMeta;
      }),
      getLicenseCount(address),
    ])
      .then(([t, count]) => {
        setTracks(t as TrackEntry[]);
        setLicenseCount(count);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        if (localTracks.length > 0) {
          setTracks(localTracks as TrackEntry[]);
          setLicenseCount(0);
          setLoadError(null);
          return;
        }
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      })
      .finally(() => setLoading(false));
  }, [address]);

  useEffect(() => {
    void loadDashboard();

    window.addEventListener("trackrails:tracks-updated", loadDashboard);
    return () => window.removeEventListener("trackrails:tracks-updated", loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    if (!storyClient || tracks.length === 0) {
      setRevenueInfo({});
      return;
    }

    const client = storyClient;
    let cancelled = false;
    const trackKeys = tracks.map((track) => track.tokenId.toString());

    setRevenueInfo((prev) => {
      const next: Record<string, RevenueInfo> = {};
      for (const key of trackKeys) {
        next[key] = prev[key] ?? { claimableWip: BigInt(0), loading: true };
        next[key] = { ...next[key], loading: true, error: undefined };
      }
      return next;
    });

    async function loadRevenue() {
      const entries = await Promise.all(
        tracks.map(async (track) => {
          const key = track.tokenId.toString();
          try {
            const claimableWip = await client.royalty.claimableRevenue({
              ipId: track.ipId,
              claimer: address!,
              token: REVENUE_TOKENS.WIP,
            });
            return [key, { claimableWip, loading: false }] as const;
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to load revenue.";
            return [
              key,
              {
                claimableWip: BigInt(0),
                loading: false,
                error: message,
              },
            ] as const;
          }
        }),
      );

      if (!cancelled) {
        setRevenueInfo(Object.fromEntries(entries));
      }
    }

    void loadRevenue();

    return () => {
      cancelled = true;
    };
  }, [storyClient, tracks, address]);

  async function getLicenseCount(owner: `0x${string}`): Promise<number> {
    try {
      return await getOwnedLicenseCount(owner);
    } catch { return 0; }
  }

  const handleClaim = useCallback(async (track: TrackEntry) => {
    if (!storyClient) return;
    const key = track.tokenId.toString();
    setClaiming(key);
    setClaimResults((prev) => ({ ...prev, [key]: "" }));
    try {
      const claimableWip = revenueInfo[key]?.claimableWip ?? BigInt(0);
      if (claimableWip <= BigInt(0)) {
        setClaimResults((prev) => ({
          ...prev,
          [key]: "No claimable WIP revenue yet.",
        }));
        return;
      }

      const result = await claimRevenue(storyClient, {
        ancestorIpId: track.ipId,
        claimer: track.ipId,
        childIpIds: [],
        currencyTokens: [REVENUE_TOKENS.WIP],
      });
      if (result.txHash) {
        addTransactionToast({ label: "Revenue claimed", hash: result.txHash });
      }
      const total = result.totalClaimed;
      setClaimResults((prev) => ({
        ...prev,
        [key]: `Claimed ${formatEther(total)} WIP`,
      }));
      setRevenueInfo((prev) => ({
        ...prev,
        [key]: { claimableWip: BigInt(0), loading: false },
      }));
    } catch (err) {
      setClaimResults((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "Claim failed",
      }));
    } finally {
      setClaiming(null);
    }
  }, [storyClient, addTransactionToast, revenueInfo]);

  const totalClaimable = tracks.reduce((sum, t) => {
    const info = revenueInfo[t.tokenId.toString()];
    return sum + (info?.claimableWip ?? BigInt(0));
  }, BigInt(0));

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-lg text-muted">Connect your wallet to view your dashboard.</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-amber-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="font-semibold">Dashboard Unavailable</span>
          </div>
          <p className="text-sm text-muted">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
          <code className="rounded bg-accent/10 px-2 py-0.5 text-xs font-mono text-accent">
            {shortenAddress(address!)}
          </code>
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <RippleWaveLoader />
            <p className="text-sm text-muted animate-pulse">Loading your dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stat summary cards */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <StatCard label="Tracks" value={tracks.length.toString()} />
            <StatCard label="Licenses Minted" value={licenseCount.toString()} />
            <StatCard
              label="Claimable WIP"
              value={totalClaimable > BigInt(0) ? `${formatEther(totalClaimable).slice(0, 8)} WIP` : "0 WIP"}
              accent={totalClaimable > BigInt(0)}
            />
          </div>

          {/* Tab bar */}
          <div className="mb-8 flex gap-1 rounded-xl bg-card p-1.5">
            {(["tracks", "licenses", "revenue"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all capitalize ${
                  tab === t ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted hover:text-foreground hover:bg-accent/5"
                }`}
              >
                {t === "tracks"
                  ? `My Tracks (${tracks.length})`
                  : t === "licenses"
                    ? `Licenses (${licenseCount})`
                    : "Revenue"}
              </button>
            ))}
          </div>

          {/* Tracks Tab */}
          {tab === "tracks" && (
            <div className="space-y-3">
              {tracks.length === 0 ? (
                <div className="glass-card rounded-2xl p-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                    <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-2">No tracks yet</p>
                  <p className="text-sm text-muted mb-6">You haven&apos;t uploaded any tracks.</p>
                  <Link href="/upload" className="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover transition-all shadow-lg shadow-accent/20">
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
                      className="glass-card group flex items-center gap-4 rounded-2xl p-4 transition-all hover:translate-x-1"
                    >
                      <div className={`h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br ${GRADIENTS[Number(gradientIndex)]} flex items-center justify-center shadow-lg`}>
                        <span className="text-2xl text-white/50 group-hover:scale-110 transition-transform">♪</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-accent transition-colors">{title}</h3>
                        <p className="text-sm text-muted">{artist}</p>
                      </div>
                      <div className="hidden sm:block text-right text-sm shrink-0">
                        <p className="text-muted flex items-center gap-1.5 justify-end">
                          <span className={`inline-block h-2 w-2 rounded-full ${track.vaultLinked ? "bg-emerald-500" : "bg-amber-500/50"}`} />
                          {track.vaultLinked ? "Encrypted" : "Pending vault"}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          Token #{track.tokenId.toString()}{track.localOnly ? " · syncing" : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}

          {/* Licenses Tab */}
          {tab === "licenses" && (
            <div className="space-y-3">
              {licenseCount === 0 ? (
                <div className="glass-card rounded-2xl p-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                    <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-2">No licenses minted</p>
                  <p className="text-sm text-muted mb-6">Mint a license to show your support.</p>
                  <Link href="/browse" className="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover transition-all shadow-lg shadow-accent/20">
                    Browse Catalog
                  </Link>
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <div className="text-5xl font-black text-accent tabular-nums">{licenseCount}</div>
                  <p className="mt-2 text-sm text-muted">License token{licenseCount !== 1 ? "s" : ""} minted</p>
                </div>
              )}
            </div>
          )}

          {/* Revenue Tab */}
          {tab === "revenue" && (
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Claimable Revenue</h2>
                    <p className="text-sm text-muted mt-1">License mints generate WIP revenue. Each mint costs 0.01 WIP — claimable by the track owner.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted uppercase tracking-wider">Total Claimable</p>
                    <p className={`text-2xl font-black tabular-nums ${totalClaimable > BigInt(0) ? "text-accent" : "text-foreground"}`}>
                      {totalClaimable > BigInt(0) ? `${formatEther(totalClaimable).slice(0, 10)}` : "0"} WIP
                    </p>
                  </div>
                </div>

                {tracks.length === 0 ? (
                  <p className="text-sm text-muted text-center py-8">Upload a track to start earning revenue.</p>
                ) : (
                  <>
                    {/* Mini bar chart */}
                    {(() => {
                      const amounts = tracks.map((t) => {
                        const info = revenueInfo[t.tokenId.toString()];
                        return info?.claimableWip ?? BigInt(0);
                      });
                      const maxAmount = amounts.reduce((a, b) => (a > b ? a : b), BigInt(0));
                      const hasRevenue = maxAmount > BigInt(0);
                      return hasRevenue ? (
                        <div className="mb-8 flex items-end gap-1.5 rounded-xl bg-background p-4 h-36">
                          {tracks.map((track, i) => {
                            const amt = amounts[i];
                            const pct = amt > BigInt(0) ? Number((amt * BigInt(10000)) / maxAmount) / 100 : 0;
                            return (
                              <div
                                key={track.tokenId.toString()}
                                className="group relative flex flex-1 flex-col items-center justify-end h-full"
                              >
                                <div
                                  className="w-full rounded-t-md bg-accent/60 transition-all hover:bg-accent hover:shadow-lg hover:shadow-accent/20"
                                  style={{ height: `${Math.max(pct, 2)}%` }}
                                />
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100 shadow-xl font-medium">
                                  {formatEther(amt)} WIP
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null;
                    })()}

                    <div className="space-y-2">
                      {tracks.map((track) => {
                        const title = track.meta?.title ?? `Track #${track.tokenId.toString()}`;
                        const key = track.tokenId.toString();
                        const result = claimResults[key];
                        const isClaiming = claiming === key;
                        const revenue = revenueInfo[key];
                        const claimableWip = revenue?.claimableWip ?? BigInt(0);
                        const canClaim = claimableWip > BigInt(0) && !revenue?.loading;
                        return (
                          <div
                            key={track.tokenId.toString()}
                            className="flex flex-col gap-3 rounded-xl bg-background p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-accent/5 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">{title}</p>
                              <p className="text-xs text-muted font-mono">{shortenAddress(track.ipId)}</p>
                              <p className="mt-1.5 text-xs text-muted">
                                Claimable:{" "}
                                <span className="font-mono text-foreground font-medium">
                                  {revenue?.loading ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="h-3 w-3 animate-pulse rounded-full bg-accent/50" />
                                      Checking...
                                    </span>
                                  ) : (
                                    `${formatEther(claimableWip)} WIP`
                                  )}
                                </span>
                              </p>
                              {revenue?.error ? (
                                <p className="mt-1 text-xs text-amber-400/80">
                                  Revenue check failed. Try reconnecting.
                                </p>
                              ) : null}
                            </div>
                            <div className="shrink-0 sm:ml-4">
                              {result ? (
                                <span className={`text-xs font-medium ${result.startsWith("Claimed") ? "text-emerald-400" : "text-red-400"}`}>
                                  {result.length > 44 ? result.slice(0, 44) + "…" : result}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleClaim(track)}
                                  disabled={isClaiming || !canClaim}
                                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent/10"
                                  title={canClaim ? "Claim WIP revenue" : "No claimable WIP revenue yet"}
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
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
