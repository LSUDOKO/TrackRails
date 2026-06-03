"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useCDRClient } from "@/hooks/use-cdr";
import { useWalletClient, useAccount } from "wagmi";
import { encryptFile } from "@piplabs/cdr-sdk";
import { createCDRVault } from "@/lib/cdr";
import { registerTrackOnProtocol, linkVaultOnProtocol } from "@/lib/contract";
import { isContractConfigured } from "@/lib/env";
import { saveUploadedTrack } from "@/lib/local-tracks";
import { useTransactionToasts } from "@/components/TransactionToastProvider";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

const CONTRACTS_READY = isContractConfigured("NEXT_PUBLIC_TRACK_RAILS_PROTOCOL");

interface UploadForm {
  title: string;
  artist: string;
  genre: string;
  revShare: number;
}

type UploadStep =
  | "form"
  | "encrypting"
  | "uploading_ipfs"
  | "registering"
  | "creating_vault"
  | "linking"
  | "done"
  | "error";

const STEPS: { key: UploadStep; label: string; icon: string }[] = [
  { key: "encrypting", label: "Encrypting audio", icon: "🔐" },
  { key: "uploading_ipfs", label: "Uploading to IPFS", icon: "☁️" },
  { key: "registering", label: "Registering IP Asset", icon: "📜" },
  { key: "creating_vault", label: "Creating CDR vault", icon: "🔒" },
  { key: "linking", label: "Linking vault to IPA", icon: "🔗" },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function UploadPage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { client: cdrClient } = useCDRClient();
  const { addTransactionToast } = useTransactionToasts();

  const [form, setForm] = useState<UploadForm>({
    title: "",
    artist: "",
    genre: "",
    revShare: 10,
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string>("");
  const [step, setStep] = useState<UploadStep>("form");
  const [showConfirm, setShowConfirm] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step !== "form" && step !== "done" && step !== "error") {
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const [result, setResult] = useState<{
    tokenId: string;
    ipId: string;
    uuid: number;
    vaultTxHash: string;
    registerTxHash: string;
    linkTxHash: string;
  } | null>(null);

  // ── Audio dropzone ──────────────────────────────────────────────────
  const audioDrop = useDropzone({
    onDrop: (accepted) => {
      const f = accepted[0];
      if (f?.type.startsWith("audio/")) setAudioFile(f);
    },
    accept: { "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  // ── Artwork dropzone ────────────────────────────────────────────────
  const artworkDrop = useDropzone({
    onDrop: (accepted) => {
      const f = accepted[0];
      if (f?.type.startsWith("image/")) {
        setArtworkFile(f);
        const reader = new FileReader();
        reader.onload = () => setArtworkPreview(reader.result as string);
        reader.readAsDataURL(f);
      }
    },
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  async function uploadToIPFS(data: Uint8Array): Promise<string> {
    const blob = new Blob([data.buffer as ArrayBuffer]);
    const res = await fetch("/api/ipfs/upload", { method: "POST", body: blob });
    if (!res.ok) throw new Error("IPFS upload failed");
    const { cid } = await res.json();
    return cid as string;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!audioFile || !walletClient || !address) return;

    if (!CONTRACTS_READY) {
      setError(
        "Track Rails contracts are not deployed yet. " +
        "Run `forge script script/DeployTrackRails.s.sol --broadcast` first, " +
        "then set the contract addresses in your .env.local file."
      );
      return;
    }

    try {
      setError("");

      setStep("encrypting");
      const content = new Uint8Array(await audioFile.arrayBuffer());
      const { ciphertext: encryptedAudio, key: aesKey } = encryptFile(content);

      setStep("uploading_ipfs");
      setProgress(25);
      const encryptedCID = await uploadToIPFS(encryptedAudio);

      // Upload artwork if provided
      let artworkCID: string | undefined;
      if (artworkFile) {
        const artBytes = new Uint8Array(await artworkFile.arrayBuffer());
        artworkCID = await uploadToIPFS(artBytes);
      }

      const metadata = {
        title: form.title,
        artist: form.artist,
        genre: form.genre || undefined,
        encryptedAudioCID: encryptedCID,
        ...(artworkCID ? { artworkUri: `ipfs://${artworkCID}` } : {}),
      };
      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
      const metadataCID = await uploadToIPFS(metadataBytes);
      const metadataURI = `ipfs://${metadataCID}`;

      setStep("registering");
      setProgress(45);
      const reg = await registerTrackOnProtocol(walletClient, {
        receiver: address,
        revShare: form.revShare,
        metadataURI,
      });
      addTransactionToast({ label: "Track registered", hash: reg.txHash, type: "register" });

      setStep("creating_vault");
      setProgress(65);
      const vault = await createCDRVault(cdrClient, {
        dataKey: aesKey,
        owner: address,
        ipId: reg.ipId,
        gated: true,
        updatable: false,
      });
      if (vault.txHashes.allocate?.startsWith("0x")) {
        addTransactionToast({ label: "CDR vault allocated", hash: vault.txHashes.allocate as `0x${string}`, type: "vault" });
      }
      if (vault.txHashes.write?.startsWith("0x")) {
        addTransactionToast({ label: "CDR vault written", hash: vault.txHashes.write as `0x${string}`, type: "vault" });
      }

      setStep("linking");
      setProgress(85);
      const link = await linkVaultOnProtocol(walletClient, {
        tokenId: reg.tokenId,
        vaultUuid: vault.uuid,
      });
      addTransactionToast({ label: "Vault linked", hash: link.txHash, type: "vault" });

      saveUploadedTrack({
        tokenId: reg.tokenId.toString(),
        ipId: reg.ipId,
        vaultUuid: vault.uuid,
        owner: address,
        metadataURI,
        licenseTermsId: reg.licenseTermsId.toString(),
        timestamp: Math.floor(Date.now() / 1000).toString(),
        vaultLinked: true,
        meta: {
          title: form.title,
          artist: form.artist,
          genre: form.genre || undefined,
          ...(artworkCID ? { artworkUri: `ipfs://${artworkCID}` } : {}),
        },
        txHashes: {
          register: reg.txHash,
          vaultAllocate: vault.txHashes.allocate,
          vaultWrite: vault.txHashes.write,
          link: link.txHash,
        },
      });

      setStep("done");
      setProgress(100);
      setResult({
        tokenId: reg.tokenId.toString(),
        ipId: reg.ipId,
        uuid: vault.uuid,
        vaultTxHash: vault.txHashes.allocate,
        registerTxHash: reg.txHash,
        linkTxHash: link.txHash,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("error");
    }
  }

  const isFormValid = audioFile && form.title && form.artist && CONTRACTS_READY;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Upload Track</h1>
        <p className="mt-2 text-muted max-w-2xl">
          Encrypt your audio with AES-256, register it as an IP Asset on Story Protocol,
          and gate access behind CDR threshold encryption + license tokens.
        </p>
      </div>

      {!isConnected && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <p className="text-lg font-medium">Connect your wallet to upload a track</p>
          <p className="mt-1 text-sm text-muted">You&apos;ll need $IP tokens for gas fees and Story Protocol registration.</p>
        </div>
      )}

      {/* ── SUCCESS ──────────────────────────────────────────────────── */}
      {step === "done" && result ? (
        <div className="glass-card rounded-2xl p-8 sm:p-10 animate-fade-up">
          {/* Success header */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">Track Registered! 🎉</h2>
              <p className="text-sm text-muted">AES-encrypted audio stored in a license-gated CDR vault on Story Protocol.</p>
            </div>
          </div>

          {/* Track info card */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 rounded-xl bg-background p-5">
            {artworkPreview && (
              <img src={artworkPreview} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-lg font-bold">{form.title}</p>
              <p className="text-sm text-muted">{form.artist}{form.genre ? ` · ${form.genre}` : ""}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted">Token ID</span><span className="font-mono text-accent">{result.tokenId}</span></div>
                <div className="flex justify-between"><span className="text-muted">CDR Vault</span><span className="font-mono text-accent">#{result.uuid}</span></div>
                <div className="flex justify-between col-span-2"><span className="text-muted">IP Asset</span><code className="font-mono text-accent truncate">{result.ipId}</code></div>
              </div>
            </div>
          </div>

          {/* Tx hashes */}
          <details className="group mb-6">
            <summary className="cursor-pointer text-xs text-muted hover:text-foreground transition-colors">Transaction details</summary>
            <div className="mt-2 space-y-1 rounded-lg bg-background/50 p-3 text-xs font-mono">
              {[
                { label: "Register IPA", hash: result.registerTxHash },
                { label: "Allocate vault", hash: result.vaultTxHash },
                { label: "Link vault", hash: result.linkTxHash },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2">
                  <span className="text-muted shrink-0">{t.label}:</span>
                  <code className="truncate text-accent/80">{t.hash.slice(0, 18)}...{t.hash.slice(-6)}</code>
                </div>
              ))}
            </div>
          </details>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => router.push(`/track/${result.ipId}`)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover transition-all glow-accent-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
              View Track
            </button>
            <button onClick={() => { setStep("form"); setAudioFile(null); setArtworkFile(null); setArtworkPreview(""); setResult(null); setForm({ title: "", artist: "", genre: "", revShare: 10 }); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-card-hover transition-all">
              Upload Another
            </button>
          </div>
        </div>
      ) : step === "error" ? (
        /* ── ERROR ──────────────────────────────────────────────────── */
        <div className="glass-card rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-400">Upload Failed</h3>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">{error}</p>
          <button onClick={() => setStep("form")} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover">
            Try Again
          </button>
        </div>
      ) : step !== "form" ? (
        /* ── UPLOAD PROGRESS ────────────────────────────────────────── */
        <div className="glass-card rounded-2xl p-10 sm:p-12">
          <div className="mx-auto max-w-md text-center">
            {/* Spinner */}
            <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
            <h3 className="text-lg font-bold mb-2">{STEPS.find((s) => s.key === step)?.label ?? "Processing…"}</h3>

            {/* Progress bar */}
            <div className="mb-2 h-2 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted/60">{progress}%</p>

            {/* Step timeline */}
            <div className="mt-8 space-y-2 text-left">
              {STEPS.map((s) => {
                const isActive = step === s.key;
                const isDone = STEPS.findIndex((x) => x.key === step) > STEPS.findIndex((x) => x.key === s.key);
                return (
                  <div key={s.key} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-accent/10 text-foreground" : "text-muted/50"}`}>
                    <span className={`shrink-0 text-base ${isDone ? "opacity-100" : isActive ? "opacity-100" : "opacity-40"}`}>
                      {isDone ? "✅" : s.icon}
                    </span>
                    <span className={isDone ? "text-foreground" : ""}>{s.label}</span>
                    {isActive && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-accent" />}
                    {isDone && <span className="ml-auto text-xs text-emerald-400">Done</span>}
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-xs text-muted">
              Please confirm the transactions in your wallet.
              {elapsed > 0 && <span className="block mt-1 font-mono text-accent/80">Elapsed: {formatDuration(elapsed)}</span>}
            </p>
          </div>
        </div>
      ) : (
        /* ── FORM ───────────────────────────────────────────────────── */
        <>
          <form onSubmit={(e) => { e.preventDefault(); setShowConfirm(true); }} className="space-y-8">
            {/* ── Split: Audio dropzone + Artwork ─────────────────────── */}
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Audio drop (2/3) */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Audio File *</label>
                <div
                  {...audioDrop.getRootProps()}
                  className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    audioDrop.isDragActive
                      ? "border-accent bg-accent/10 scale-[1.02]"
                      : "border-border hover:border-accent/50 hover:bg-accent/5"
                  }`}
                >
                  <input {...audioDrop.getInputProps()} />
                  {audioFile ? (
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                        <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-medium truncate">{audioFile.name}</p>
                        <p className="text-sm text-muted">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setAudioFile(null); }} className="ml-auto shrink-0 rounded-lg p-2 text-muted hover:bg-card-hover hover:text-foreground transition-colors" aria-label="Remove">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3 flex items-center justify-center text-muted">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </div>
                      <p className="font-medium">{audioDrop.isDragActive ? "Drop your file here" : "Drag & drop your audio file"}</p>
                      <p className="mt-1 text-sm text-muted">MP3, WAV, FLAC, OGG — up to 50 MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Artwork drop (1/3) */}
              <div>
                <label className="mb-2 block text-sm font-medium">Artwork</label>
                <div
                  {...artworkDrop.getRootProps()}
                  className={`group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all ${
                    artworkDrop.isDragActive
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50 hover:bg-accent/5"
                  } ${artworkPreview ? "p-0 overflow-hidden" : "p-6 text-center"}`}
                >
                  <input {...artworkDrop.getInputProps()} />
                  {artworkPreview ? (
                    <div className="relative">
                      <img src={artworkPreview} alt="Artwork preview" className="w-full aspect-square object-cover rounded-xl" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); setArtworkFile(null); setArtworkPreview(""); }} className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white/80 hover:text-white backdrop-blur-sm transition-colors" aria-label="Remove artwork">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2 flex items-center justify-center text-muted">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium">{artworkDrop.isDragActive ? "Drop artwork" : "Add artwork"}</p>
                      <p className="text-xs text-muted mt-0.5">PNG, JPG, WebP</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Track Preview ───────────────────────────────────────── */}
            {audioFile && form.title && (
              <div className="flex items-center gap-4 rounded-xl bg-background p-4 border border-border/50">
                {artworkPreview ? (
                  <img src={artworkPreview} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <span className="text-xl text-accent/60">♪</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{form.title}</p>
                  <p className="text-sm text-muted">{form.artist || "Unknown artist"}{form.genre ? ` · ${form.genre}` : ""}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted">
                  <p>{audioFile.name}</p>
                  <p>{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
            )}

            {/* ── Form Fields ──────────────────────────────────────────── */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Track Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                  placeholder="My Awesome Track" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Artist Name *</label>
                <input required value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                  placeholder="Your Artist Name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Genre</label>
                <input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                  placeholder="Electronic, Hip-Hop, etc." />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Revenue Share (%)</label>
                <input type="number" min={0} max={100} value={form.revShare} onChange={(e) => setForm({ ...form, revShare: Number(e.target.value) })}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            {/* ── Submit ───────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button type="submit" disabled={!isFormValid}
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-accent px-8 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed glow-accent-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Upload & Register
              </button>
              <p className="text-xs text-muted">You&apos;ll confirm the transaction{form.revShare > 0 ? "s" : ""} in your wallet</p>
            </div>
          </form>

          {/* ── Confirmation Modal ──────────────────────────────────────── */}
          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                    <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Confirm Upload</h3>
                    <p className="text-sm text-muted">This will execute {form.revShare > 0 ? "5" : "4"} blockchain transactions</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { num: 1, label: "Encrypt & Upload Audio", desc: "AES-256 encrypt, upload encrypted file to IPFS", type: "free" as const },
                    { num: 2, label: "Upload Metadata", desc: "Upload track info + artwork to IPFS", type: "free" as const },
                    { num: 3, label: "Register IP Asset", desc: "Create Story Protocol IP Asset (gas fee)", type: "tx" as const },
                    { num: 4, label: "Create CDR Vault", desc: "License-gated threshold encryption vault (2 txns)", type: "tx" as const },
                    ...(form.revShare > 0
                      ? [{ num: 5, label: "Link Vault to IPA", desc: "Attach CDR vault to the IP Asset", type: "tx" as const }]
                      : []),
                  ].map((s) => (
                    <div key={s.num} className="flex items-center gap-3 rounded-xl bg-background px-4 py-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{s.num}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{s.label}</p>
                        <p className="text-xs text-muted">{s.desc}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-medium ${s.type === "tx" ? "text-amber-400" : "text-emerald-400"}`}>
                        {s.type === "tx" ? "⧗ TX" : "✓ Free"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>Make sure you have enough $IP tokens for gas. Each transaction requires a small gas fee.</span>
                </div>

                <div className="mt-6 flex gap-3">
                  <button onClick={() => { setShowConfirm(false); handleSubmit(); }} className="flex-1 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
                    Start Upload
                  </button>
                  <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-card-hover transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
