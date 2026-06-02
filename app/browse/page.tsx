"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useStoryClient } from "@/hooks/use-story";
import { getAllTracks, fetchTrackMetadata } from "@/lib/queries";
import type { TrackData, TrackMetadata } from "@/lib/queries";
import { mintLicenseToken } from "@/lib/story";
import { createPublicClient, http } from "viem";
import { aeneid } from "@story-protocol/core-sdk";
import { CDR_CONTRACTS } from "@/lib/cdr";

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
];

const publicClient = createPublicClient({
  chain: aeneid,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://aeneid.storyrpc.io"),
});

interface TrackEntry extends TrackData {
  meta?: TrackMetadata;
}

type MintState = { tokenId: string; loading: boolean; done: boolean; error?: string };

export default function BrowsePage() {
  const { address, isConnected } = useAccount();
  const { client: storyClient } = useStoryClient();
  const [tracks, setTracks] = useState<TrackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [minting, setMinting] = useState<Record<string, MintState>>({});

  useEffect(() => {
    setLoading(true);
    getAllTracks(0, 50)
      .then(async (data) => {
        const withMeta = await Promise.all(
          data.map(async (t) => {
            const meta = await fetchTrackMetadata(t.metadataURI);
            return { ...t, meta: meta ?? undefined };
          }),
        );
        setTracks(withMeta);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      setMinting((prev) => ({
        ...prev,
        [key]: { tokenId: key, loading: false, done: true, error: undefined },
      }));
    } catch (err) {
      setMinting((prev) => ({
        ...prev,
        [key]: { tokenId: key, loading: false, done: false, error: err instanceof Error ? err.message : "Mint failed" },
      }));
    }
  }, [storyClient, address]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-muted">Loading tracks from Story Protocol...</p>
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
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-4 pr-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="Search tracks or artists..."
            />
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
      )}

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-muted">
            {tracks.length === 0 ? "No tracks registered yet." : "No tracks match your search."}
          </p>
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
                      <span>Token #{track.tokenId.toString()}</span>
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
                            {!track.meta?.genre ? "" : ""}
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
