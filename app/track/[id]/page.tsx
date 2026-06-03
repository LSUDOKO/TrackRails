"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useCDRClient } from "@/hooks/use-cdr";
import { useStoryClient } from "@/hooks/use-story";
import { fetchTrackMetadata, formatTimestamp } from "@/lib/queries";
import type { TrackData, TrackMetadata } from "@/lib/queries";
import { mintLicenseToken } from "@/lib/story";
import { aesDecrypt, buildAccessAuxData, accessCDR } from "@/lib/cdr";
import { getUploadedTracks } from "@/lib/local-tracks";
import { useTransactionToasts } from "@/components/TransactionToastProvider";
import { discoverOwnedLicenseTokenIds, saveLicenseTokenIds } from "@/lib/license-tokens";
import { getTimedOutTransactionHash, getTransactionErrorMessage } from "@/lib/tx-error";
import { TrackDetailSkeleton } from "@/components/ui/skeleton";

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];

interface EnrichedMetadata extends TrackMetadata {
  encryptedAudioCID?: string;
}

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();
  const { client: storyClient } = useStoryClient();
  const { client: cdrClient } = useCDRClient();
  const { addTransactionToast } = useTransactionToasts();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<TrackData | null>(null);
  const [meta, setMeta] = useState<EnrichedMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasLicense, setHasLicense] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintedTokenIds, setMintedTokenIds] = useState<bigint[] | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);

  const loadTrack = useCallback(async (ipId: `0x${string}`) => {
    setLoading(true);
    setError("");
    try {
      const tokenRes = await fetch(`/api/tracks?action=getTokenIdForIp&ipId=${ipId}`);
      if (!tokenRes.ok) {
        const body = await tokenRes.json().catch(() => ({}));
        throw new Error(body.error || "Track not found");
      }
      const { tokenId: tokenIdStr } = await tokenRes.json();
      const tokenId = BigInt(tokenIdStr as string);

      if (tokenId === BigInt(0)) {
        setError("Track not found");
        setLoading(false);
        return;
      }

      const trackRes = await fetch(`/api/tracks?action=getTrack&tokenId=${tokenIdStr}`);
      if (!trackRes.ok) {
        throw new Error("Track not found");
      }
      const trackData = await trackRes.json();
      const data: TrackData = {
        tokenId,
        ipId: trackData.ipId as `0x${string}`,
        vaultUuid: trackData.vaultUuid as number,
        owner: trackData.owner as `0x${string}`,
        metadataURI: trackData.metadataURI as string,
        licenseTermsId: BigInt(trackData.licenseTermsId as string),
        timestamp: BigInt(trackData.timestamp as string),
        vaultLinked: trackData.vaultLinked as boolean,
      };

      setTrack(data);
      const metadata = await fetchTrackMetadata(data.metadataURI);
      setMeta(metadata as EnrichedMetadata | null);
    } catch {
      const localTrack = getUploadedTracks().find(
        (item) => item.ipId.toLowerCase() === ipId.toLowerCase(),
      );

      if (localTrack) {
        setTrack(localTrack);
        setMeta((localTrack.meta ?? null) as EnrichedMetadata | null);
        return;
      }

      setError("Track not found");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkLicense = useCallback(async (
    owner: `0x${string}`,
    ipId: `0x${string}`,
    termsId: bigint,
  ) => {
    try {
      const tokenIds = await discoverOwnedLicenseTokenIds({
        owner,
        ipId,
        licenseTermsId: termsId,
      });
      setMintedTokenIds(tokenIds.length > 0 ? tokenIds : null);
      setHasLicense(tokenIds.length > 0);
    } catch {
      setMintedTokenIds(null);
      setHasLicense(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const timer = window.setTimeout(() => {
      void loadTrack(id as `0x${string}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, loadTrack]);

  useEffect(() => {
    if (!address || !track) return;
    const timer = window.setTimeout(() => {
      void checkLicense(address, track.ipId, track.licenseTermsId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [address, track, checkLicense]);

  async function handleMintLicense() {
    if (!storyClient || !track || !address) return;
    setMinting(true);
    setMintError(null);
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
      setMintedTokenIds(result.licenseTokenIds);
      setHasLicense(true);
    } catch (err) {
      const timedOutHash = getTimedOutTransactionHash(err);
      if (timedOutHash) {
        addTransactionToast({ label: "Transaction pending", hash: timedOutHash });
      }
      setMintError(getTransactionErrorMessage(err));
      console.error("Mint failed:", err);
    } finally {
      setMinting(false);
    }
  }

  const decryptAudio = useCallback(async (): Promise<Blob | null> => {
    if (!track || !address || !meta?.encryptedAudioCID) return null;
    setDecrypting(true);
    setDecryptError(null);
    try {
      const tokenIds = mintedTokenIds ?? await discoverOwnedLicenseTokenIds({
        owner: address,
        ipId: track.ipId,
        licenseTermsId: track.licenseTermsId,
      });
      if (tokenIds.length === 0) throw new Error("No license token ID available");

      const { dataKey: aesKey } = await accessCDR(cdrClient, {
        uuid: track.vaultUuid,
        accessAuxData: buildAccessAuxData(tokenIds),
        timeoutMs: 120_000,
      });

      if (!aesKey || aesKey.length === 0) {
        throw new Error("CDR decryption returned an empty key");
      }

      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${meta.encryptedAudioCID}`);
      if (!res.ok) throw new Error("Failed to download encrypted audio from IPFS");
      const encryptedAudio = new Uint8Array(await res.arrayBuffer());

      if (encryptedAudio.length === 0) {
        throw new Error("Downloaded audio is empty");
      }

      const decrypted = aesDecrypt({ ciphertext: encryptedAudio, key: aesKey });

      if (decrypted.length === 0) {
        throw new Error("Decrypted audio is empty — the AES key may be incorrect");
      }

      const blob = new Blob([decrypted.buffer as ArrayBuffer], { type: "audio/mpeg" });
      setDecryptedBlob(blob);
      setDecrypting(false);
      return blob;
    } catch (err) {
      setDecrypting(false);
      const msg = err instanceof Error ? err.message : "Decryption/playback failed";
      setDecryptError(msg);
      console.error("Decryption/playback failed:", err);
      return null;
    }
  }, [track, address, meta, mintedTokenIds, cdrClient]);

  const handlePlayRequest = useCallback(async () => {
    const blob = await decryptAudio();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = 0.8;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
      setDecryptError("Failed to play the decrypted audio. The file may be corrupted.");
    };

    audioRef.current = audio;
    await audio.play();
  }, [decryptAudio]);

  const handleDownload = useCallback(async () => {
    const blob = await decryptAudio();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta?.title ?? "track"}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [decryptAudio, meta]);

  const getAudioElement = useCallback(() => audioRef.current, []);
  const setAudioElement = useCallback((a: HTMLAudioElement | null) => { audioRef.current = a; }, []);

  const hasTokenIds = mintedTokenIds !== null && mintedTokenIds.length > 0;
  const canPlay = hasLicense && !!track?.vaultLinked && !!meta?.encryptedAudioCID;

  const disabledReason = !track?.vaultLinked
    ? "No CDR vault linked"
    : !hasLicense
      ? "Mint a license to play"
      : !meta?.encryptedAudioCID
        ? "No encrypted audio found"
        : !hasTokenIds
          ? "Mint license to get token ID for decryption"
          : "";

  if (loading) {
    return <TrackDetailSkeleton />;
  }

  if (error || !track) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">Track not found</p>
          <p className="text-sm text-muted mb-6">{error}</p>
          <Link
            href="/browse"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
            </svg>
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const title = meta?.title ?? `Track #${track.tokenId.toString()}`;
  const artist = meta?.artist ?? shortenAddress(track.owner);
  const gradientIndex = Number(track.tokenId % BigInt(6)) % GRADIENTS.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 text-sm">
        <Link href="/browse" className="text-muted hover:text-accent transition-colors">Browse</Link>
        <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-foreground truncate max-w-[200px]">{title}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
        {/* Left: Artwork + Audio */}
        <div className="lg:col-span-3 space-y-6">
          {/* Artwork */}
          <div className={`relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br ${GRADIENTS[gradientIndex]} shadow-2xl`}>
            {meta?.artworkUri ? (
              <img
                src={meta.artworkUri.startsWith("ipfs://")
                  ? `https://gateway.pinata.cloud/ipfs/${meta.artworkUri.replace("ipfs://", "")}`
                  : meta.artworkUri}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-8xl text-white/20 select-none">♪</span>
              </div>
            )}
            {/* Gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            {/* Track info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-accent/20 text-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm border border-accent/20">
                  Token #{track.tokenId.toString()}
                </span>
                {track.vaultLinked && (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm border border-emerald-500/20">
                    Encrypted
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-white drop-shadow-lg">{title}</h1>
              <p className="text-base text-white/70 mt-1 drop-shadow">{artist}</p>
            </div>
          </div>

          {/* Audio Player Card */}
          <div className="glass-card rounded-2xl p-6">
            <AudioPlayer
              onPlayRequest={handlePlayRequest}
              getAudioElement={getAudioElement}
              setAudioElement={setAudioElement}
              isDecrypting={decrypting}
              canPlay={canPlay && hasTokenIds}
              disabledReason={disabledReason}
            />

            {decryptError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {decryptError}
              </div>
            )}

            {hasLicense && canPlay && hasTokenIds && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleDownload}
                  disabled={decrypting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-5 py-3 text-sm font-semibold text-accent transition-all hover:bg-accent/10 hover:border-accent/40 disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {decrypting ? "Decrypting..." : "Download Track"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Track Details */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">Track Details</h3>
            <div className="space-y-3">
              {[
                { label: "Genre", value: meta?.genre || "—" },
                { label: "Duration", value: meta?.duration ? `${meta.duration}s` : "—" },
                { label: "Token ID", value: `#${track.tokenId.toString()}` },
                { label: "Registered", value: formatTimestamp(track.timestamp) },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-muted">{item.label}</span>
                  <span className="text-xs font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* On-Chain Info */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">On-Chain</h3>
            <div className="space-y-3">
              {[
                { label: "Owner", value: shortenAddress(track.owner), copy: true },
                { label: "IP Asset ID", value: shortenAddress(track.ipId), copy: true },
                { label: "CDR Vault", value: track.vaultLinked ? `UUID ${track.vaultUuid}` : "Not linked" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-muted">{item.label}</span>
                  <code className="text-xs font-mono text-accent">{item.value}</code>
                </div>
              ))}
            </div>
          </div>

          {/* License Section */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2">License</h3>
            <p className="text-xs text-muted mb-5 leading-relaxed">
              Mint a license token to access the full decrypted audio.
            </p>

            {hasLicense && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  License held
                </div>
                {mintedTokenIds && (
                  <p className="mt-1 text-xs text-emerald-400/70 font-mono">
                    Token ID: {mintedTokenIds[0].toString()}
                  </p>
                )}
              </div>
            )}

            {!mintedTokenIds && (
              <button
                onClick={handleMintLicense}
                disabled={!isConnected || minting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent/10"
              >
                {minting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Minting…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Mint License
                  </>
                )}
              </button>
            )}

            {mintError && (
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                {mintError}
              </div>
            )}

            {!isConnected && !mintedTokenIds && (
              <p className="mt-3 text-xs text-muted text-center">Connect your wallet to mint a license.</p>
            )}
          </div>

          {/* Description */}
          {meta?.description && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2">Description</h3>
              <p className="text-sm leading-relaxed text-muted">{meta.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function shortenAddress(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Inline AudioPlayer ──────────────────────────────────────────────

function AudioPlayer({
  onPlayRequest,
  getAudioElement,
  setAudioElement,
  isDecrypting,
  canPlay,
  disabledReason,
}: {
  onPlayRequest: () => Promise<void>;
  getAudioElement: () => HTMLAudioElement | null;
  setAudioElement: (audio: HTMLAudioElement | null) => void;
  isDecrypting: boolean;
  canPlay: boolean;
  disabledReason?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  const connectAnalyser = useCallback((audio: HTMLAudioElement) => {
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(audio);
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    an.connect(ctx.destination);
    audioCtxRef.current = ctx;
    sourceRef.current = src;
    setAnalyser(an);
  }, []);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    sourceRef.current = null;
    setAnalyser(null);
  }, []);

  const handlePlayPause = useCallback(async () => {
    let audio = getAudioElement();
    if (audio) {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
      return;
    }
    await onPlayRequest();
    audio = getAudioElement();
    if (!audio) return;
    connectAnalyser(audio);
  }, [onPlayRequest, getAudioElement, connectAnalyser]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = getAudioElement();
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }, [getAudioElement, duration]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    const audio = getAudioElement();
    if (audio) audio.volume = v;
  }, [getAudioElement]);

  useEffect(() => {
    const audio = getAudioElement();
    if (!audio) { setIsPlaying(false); return; }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => { setIsPlaying(false); cleanup(); setAudioElement(null); };
    const onMeta = () => setDuration(audio.duration);
    const onTime = () => setCurrentTime(audio.currentTime);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
    };
  }, [getAudioElement, cleanup, setAudioElement]);

  function fmt(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="w-full">
      {/* Waveform */}
      <div className="h-32 rounded-xl bg-accent/[0.03] overflow-hidden border border-accent/5">
        <Waveform analyser={analyser} isPlaying={isPlaying} />
      </div>

      {/* Controls */}
      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          disabled={!canPlay || isDecrypting}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isDecrypting ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : isPlaying ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          ) : (
            <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className="h-1.5 cursor-pointer rounded-full bg-accent/10 overflow-hidden group"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 group-hover:bg-accent-hover"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>{fmt(currentTime)}</span>
            <span>{duration > 0 ? fmt(duration) : "—:—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
            className="h-1 w-16 cursor-pointer accent-accent"
          />
        </div>
      </div>

      {!canPlay && disabledReason && (
        <div className="mt-4 rounded-xl bg-accent/[0.04] border border-accent/10 px-4 py-3">
          <p className="text-center text-xs text-muted flex items-center justify-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {disabledReason}
          </p>
        </div>
      )}
    </div>
  );
}

function Waveform({ analyser, isPlaying }: { analyser: AnalyserNode | null; isPlaying: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser || !isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (!ctx || !canvas) return;
      analyser!.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 64;
      const step = Math.floor(bufferLength / barCount);
      const w = canvas.width / barCount - 1;

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] / 255;
        const h = val * canvas.height * 0.9;
        const x = i * (w + 1);
        ctx.fillStyle = `rgba(255, 0, 136, ${0.3 + val * 0.7})`;
        ctx.fillRect(x, canvas.height - h, w, h);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={120}
      className="h-full w-full"
    />
  );
}
