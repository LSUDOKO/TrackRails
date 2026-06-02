"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import { useAccount } from "wagmi";
import { useStoryClient } from "@/hooks/use-story";
import { getTokenIdForIp, getTrack, fetchTrackMetadata, formatTimestamp } from "@/lib/queries";
import type { TrackData, TrackMetadata } from "@/lib/queries";
import { mintLicenseToken } from "@/lib/story";
import { CDR_CONTRACTS } from "@/lib/cdr";
import { createPublicClient, http } from "viem";
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

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();
  const { client: storyClient } = useStoryClient();

  const [track, setTrack] = useState<TrackData | null>(null);
  const [meta, setMeta] = useState<TrackMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasLicense, setHasLicense] = useState(false);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<bigint[] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadTrack(id as `0x${string}`);
  }, [id]);

  useEffect(() => {
    if (!address || !track) return;
    checkLicense(address, track.ipId, track.licenseTermsId);
  }, [address, track]);

  async function loadTrack(ipId: `0x${string}`) {
    setLoading(true);
    setError("");
    try {
      const tokenId = await getTokenIdForIp(ipId);
      if (tokenId === BigInt(0)) {
        setError("Track not found");
        setLoading(false);
        return;
      }
      const data = await getTrack(tokenId);
      setTrack(data);
      const metadata = await fetchTrackMetadata(data.metadataURI);
      setMeta(metadata);
    } catch (err) {
      setError("Track not found");
    } finally {
      setLoading(false);
    }
  }

  async function checkLicense(owner: `0x${string}`, ipId: `0x${string}`, termsId: bigint) {
    try {
      const count = await publicClient.readContract({
        address: CDR_CONTRACTS.LICENSE_TOKEN,
        abi: [
          {
            type: "function", name: "balanceOf",
            inputs: [{ type: "address" }, { type: "uint256" }],
            outputs: [{ type: "uint256" }],
            stateMutability: "view",
          },
        ],
        functionName: "balanceOf",
        args: [owner, termsId],
      });
      setHasLicense(count > BigInt(0));
    } catch {
      setHasLicense(false);
    }
  }

  async function handleMintLicense() {
    if (!storyClient || !track) return;
    setMinting(true);
    try {
      const result = await mintLicenseToken(storyClient, {
        licensorIpId: track.ipId,
        licenseTermsId: track.licenseTermsId,
        amount: 1,
      });
      setMinted(result.licenseTokenIds);
    } catch (err) {
      console.error("Mint failed:", err);
    } finally {
      setMinting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-muted">Loading track...</p>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-muted">{error || "Track not found"}</p>
        </div>
      </div>
    );
  }

  const title = meta?.title ?? `Track #${track.tokenId.toString()}`;
  const artist = meta?.artist ?? shortenAddress(track.owner);
  const gradientIndex = Number(track.tokenId % BigInt(6)) % GRADIENTS.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className={`h-64 w-full rounded-2xl bg-gradient-to-br ${GRADIENTS[gradientIndex]} flex items-center justify-center overflow-hidden`}>
            {meta?.artworkUri ? (
              <img src={meta.artworkUri} alt={title} className="h-full w-full object-cover" />
            ) : (
              <span className="text-7xl text-white/20 select-none">♪</span>
            )}
          </div>

          <div className="mt-4 glass-card rounded-2xl">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex w-full items-center gap-3 p-4 transition-colors hover:text-accent"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
                {isPlaying ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                  </svg>
                ) : (
                  <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
              <div className="text-left">
                <p className="font-semibold">{isPlaying ? "Pause" : "Play Preview"}</p>
                <p className="text-xs text-muted">{meta?.duration ? `${meta.duration}s` : "—"}</p>
              </div>
            </button>

            {isPlaying && (
              <div className="border-t border-border/50 px-4 pb-4 pt-3">
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-accent animate-pulse" />
                </div>
                <div className="mt-2 text-xs text-muted text-right">Live preview</div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-lg text-muted">{artist}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {meta?.genre && (
              <span className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
                {meta.genre}
              </span>
            )}
            <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted">
              Token #{track.tokenId.toString()}
            </span>
          </div>

          <p className="mt-6 leading-relaxed text-muted">
            {meta?.description ?? `Registered on ${formatTimestamp(track.timestamp)}`}
          </p>

          <div className="mt-4 space-y-2 rounded-xl bg-card p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Owner</span>
              <code className="font-mono text-xs text-accent">{shortenAddress(track.owner)}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">IP Asset ID</span>
              <code className="font-mono text-xs text-accent">{shortenAddress(track.ipId)}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">CDR Vault</span>
              <span>{track.vaultLinked ? `UUID ${track.vaultUuid}` : "Not linked"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Registered</span>
              <span>{formatTimestamp(track.timestamp)}</span>
            </div>
          </div>

          <div className="mt-8 border-t border-border/50 pt-6">
            <h3 className="text-lg font-semibold">License</h3>
            <p className="mt-1 text-sm text-muted">
              Mint a license token to access the full decrypted audio.
            </p>

            {hasLicense && (
              <div className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-400">
                You hold a license for this track.
              </div>
            )}

            {minted ? (
              <div className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-400">
                License minted! Token ID: {minted[0].toString()}
              </div>
            ) : (
              <button
                onClick={handleMintLicense}
                disabled={!isConnected || minting}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-8 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed glow-accent-sm"
              >
                {minting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Minting...
                  </>
                ) : (
                  <>
                    Mint License
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </>
                )}
              </button>
            )}

            {!isConnected && !minted && (
              <p className="mt-2 text-xs text-muted">Connect your wallet to mint a license.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function shortenAddress(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
