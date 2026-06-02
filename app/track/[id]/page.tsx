"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import { useAccount } from "wagmi";
import { useCDRClient } from "@/hooks/use-cdr";
import { useStoryClient } from "@/hooks/use-story";
import { mintLicenseToken } from "@/lib/story";

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];

const MOCK_TRACK = {
  title: "Mock Track",
  artist: "Mock Artist",
  genre: "Electronic",
  duration: 180,
  description: "This is a mock track for demonstration purposes.",
  licensePrice: "0.01 IP",
  licenseTermsId: 1,
};

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isConnected } = useAccount();
  const { client: cdrClient } = useCDRClient();
  const { client: storyClient, address } = useStoryClient();
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<bigint[] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  if (!id || typeof id !== "string") return notFound();

  const track = MOCK_TRACK;
  const gradientIndex = parseInt(id.slice(-1), 16) % GRADIENTS.length;

  async function handleMintLicense() {
    if (!storyClient) return;
    setMinting(true);
    try {
      const result = await mintLicenseToken(storyClient, {
        licensorIpId: id as `0x${string}`,
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className={`h-64 w-full rounded-2xl bg-gradient-to-br ${GRADIENTS[gradientIndex]} flex items-center justify-center`}>
            <span className="text-7xl text-white/20 select-none">♪</span>
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
                <p className="text-xs text-muted">{track.duration}s</p>
              </div>
            </button>

            {isPlaying && (
              <div className="border-t border-border/50 px-4 pb-4 pt-3">
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-accent animate-pulse" />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted">
                  <span>0:00</span>
                  <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <h1 className="text-3xl font-bold tracking-tight">{track.title}</h1>
          <p className="mt-1 text-lg text-muted">{track.artist}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
              {track.genre}
            </span>
          </div>

          <p className="mt-6 leading-relaxed text-muted">{track.description}</p>

          <div className="mt-8 border-t border-border/50 pt-6">
            <h3 className="text-lg font-semibold">License Terms</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Price</span>
                <span className="font-medium">{track.licensePrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Commercial Use</span>
                <span className="font-medium text-emerald-400">Allowed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Derivatives</span>
                <span className="font-medium text-emerald-400">Allowed</span>
              </div>
            </div>

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

            {!isConnected && (
              <p className="mt-2 text-xs text-muted">Connect your wallet to mint a license.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
