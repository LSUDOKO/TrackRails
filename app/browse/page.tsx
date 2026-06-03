"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useStoryClient } from "@/hooks/use-story";
import { fetchTrackMetadata } from "@/lib/queries";
import type { TrackData, TrackMetadata } from "@/lib/queries";
import { TrackCardSkeleton } from "@/components/ui/skeleton";
import { mintLicenseToken } from "@/lib/story";
import { getUploadedTracks, mergeTracksWithLocal } from "@/lib/local-tracks";
import { useTransactionToasts } from "@/components/TransactionToastProvider";
import { saveLicenseTokenIds } from "@/lib/license-tokens";
import { getTimedOutTransactionHash, getTransactionErrorMessage } from "@/lib/tx-error";

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
];

interface TrackEntry extends TrackData {
  meta?: TrackMetadata;
  localOnly?: boolean;
}

type MintState = { tokenId: string; loading: boolean; done: boolean; error?: string };

/**
 * Fetch tracks from the server-side API route, bypassing client-side process.env issues.
 */
async function fetchTracksFromApi(): Promise<TrackEntry[]> {
  const res = await fetch("/api/tracks?action=getAllTracks&offset=0&limit=50");
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

export default function BrowsePage() {
  const { address, isConnected } = useAccount();
  const { client: storyClient } = useStoryClient();
  const { addTransactionToast } = useTransactionToasts();
  const [tracks, setTracks] = useState<TrackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [minting, setMinting] = useState<Record<string, MintState>>({});

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const localTracks = getUploadedTracks();
    fetchTracksFromApi()
      .then(async (data) => {
        const merged = mergeTracksWithLocal(data, localTracks);
        const withMeta = await Promise.all(
          merged.map(async (t) => {
            try {
              const meta = t.meta ?? await fetchTrackMetadata(t.metadataURI);
              return { ...t, meta: meta ?? undefined };
            } catch {
              return { ...t, meta: undefined };
            }
          }),
        );
        setTracks(withMeta);
      })
      .catch((err) => {
        console.error("Failed to load tracks:", err);
        if (localTracks.length > 0) {
          setTracks(localTracks);
          setLoadError(null);
          return;
        }
        setLoadError(
          err instanceof Error
            ? err.message
            : "Failed to load tracks. Make sure the contracts are deployed and your RPC is accessible."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadTracks();

    window.addEventListener("trackrails:tracks-updated", loadTracks);
    return () => window.removeEventListener("trackrails:tracks-updated", loadTracks);
  }, [loadTracks]);

  const filtered = tracks.filter((t) => {
    const title = t.meta?.title ?? `Track #${t.tokenId.toString()}`;
    const artist = t.meta?.artist ?? shortenAddress(t.owner);
    const g = t.meta?.genre ?? "";
    if (search && !title.toLowerCase().includes(search.toLowerCase()) && !artist.toLowerCase().includes(search.toLowerCase())) return false;
    if (genre && g !== genre) return false;
    return true;
  });

  const handleMint = useCallback(async (track: TrackEntry) => {
    if (!storyClient || !address) return;
    const key = track.tokenId.toString();
    setMinting((prev) => ({ ...prev, [key]: { tokenId: key, loading: true, done: false } }));
    try {
      const result = await mintLicenseToken(storyClient, {
        licensorIpId: track.ipId,
        licenseTermsId: track.licenseTermsId,
        amount: 1,
      });
      if (result.depositTxHash) {
        addTransactionToast({ label: "WIP deposited", hash: result.depositTxHash });
      }
      if (result.approveTxHash) {
        addTransactionToast({ label: "Royalty spend approved", hash: result.approveTxHash });
      }
      addTransactionToast({ label: "License minted", hash: result.txHash });
      saveLicenseTokenIds({
        owner: address,
        ipId: track.ipId,
        licenseTermsId: track.licenseTermsId,
        tokenIds: result.licenseTokenIds,
      });
      setMinting((prev) => ({
        ...prev,
        [key]: { tokenId: key, loading: false, done: true, error: undefined },
      }));
    } catch (err) {
      const timedOutHash = getTimedOutTransactionHash(err);
      if (timedOutHash) {
        addTransactionToast({ label: "Transaction pending", hash: timedOutHash });
      }
      setMinting((prev) => ({
        ...prev,
        [key]: { tokenId: key, loading: false, done: false, error: getTransactionErrorMessage(err) },
      }));
    }
  }, [storyClient, address, addTransactionToast]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="h-9 w-48 animate-pulse rounded-lg bg-card/50" />
          <div className="mt-2 h-5 w-72 animate-pulse rounded-lg bg-card/50" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TrackCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-amber-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="font-semibold text-sm">Catalog Unavailable</span>
          </div>
          <p className="text-sm text-muted">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Browse Catalog</h1>
        <p className="mt-2 text-muted">
          {tracks.length} track{tracks.length !== 1 ? "s" : ""} registered on Story Protocol.
          Mint a license token to decrypt and play any track.
        </p>
      </div>

      {tracks.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                placeholder="Search tracks or artists..."
              />
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">All Genres</option>
              {[...new Set(tracks.map((t) => t.meta?.genre).filter(Boolean))].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Showing {filtered.length} of {tracks.length} track{tracks.length !== 1 ? "s" : ""}
            </span>
            {(search || genre) && (
              <button
                onClick={() => { setSearch(""); setGenre(""); }}
                className="flex items-center gap-1 text-accent transition-colors hover:text-accent-hover"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-muted">
            {tracks.length === 0
              ? "No tracks registered yet."
              : `No tracks match your search${search ? ` for "${search}"` : ""}${genre ? ` in "${genre}"` : ""}.`
            }
          </p>
          {(search || genre) && (
            <button
              onClick={() => { setSearch(""); setGenre(""); }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((track, i) => {
            const title = track.meta?.title ?? `Track #${track.tokenId.toString()}`;
            const artistName = track.meta?.artist ?? shortenAddress(track.owner);
            const genreLabel = track.meta?.genre ?? "";
            const m = minting[track.tokenId.toString()];

            return (
              <div
                key={track.tokenId.toString()}
                className="glass-card group rounded-2xl overflow-hidden"
              >
                <Link href={`/track/${track.ipId}`}>
                  <div className={`h-48 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center relative`}>
                    {track.meta?.artworkUri ? (
                      <img src={track.meta.artworkUri} alt={title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-6xl text-white/20 select-none">♪</span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <svg className="ml-0.5 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={`/track/${track.ipId}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-semibold truncate">{title}</h3>
                      <span className="shrink-0 rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] font-medium text-accent">
                        License
                      </span>
                    </div>
                    <p className="text-sm text-muted">{artistName}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted">
                      <span>{genreLabel || "Audio"}</span>
                      <span>Token #{track.tokenId.toString()}{track.localOnly ? " · syncing" : ""}</span>
                    </div>
                  </Link>

                  <div className="mt-4">
                    {m?.done ? (
                      <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-400">
                        License minted!
                      </div>
                    ) : m?.error ? (
                      <div className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
                        {m.error}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleMint(track)}
                        disabled={!isConnected || m?.loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {m?.loading ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Minting…
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                            Mint License
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isConnected && (
        <div className="mt-8 text-center">
          <p className="text-xs text-muted">Connect your wallet to mint licenses.</p>
        </div>
      )}
    </div>
  );
}

function shortenAddress(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
