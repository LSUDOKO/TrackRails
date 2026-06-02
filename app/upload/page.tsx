"use client";

import { useState, useCallback } from "react";
import { useCDRClient } from "@/hooks/use-cdr";
import { useWalletClient, useAccount } from "wagmi";
import { encryptFile } from "@piplabs/cdr-sdk";
import { createCDRVault } from "@/lib/cdr";
import { registerTrackOnProtocol, linkVaultOnProtocol } from "@/lib/contract";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

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

const STEP_LABELS: Record<UploadStep, string> = {
  form: "",
  encrypting: "Encrypting audio…",
  uploading_ipfs: "Uploading to IPFS…",
  registering: "Registering IP Asset on Story…",
  creating_vault: "Creating license-gated CDR vault…",
  linking: "Linking vault to IP Asset…",
  done: "Complete!",
  error: "Error",
};

export default function UploadPage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { client: cdrClient } = useCDRClient();

  const [form, setForm] = useState<UploadForm>({
    title: "",
    artist: "",
    genre: "",
    revShare: 10,
  });
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("form");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    tokenId: string;
    ipId: string;
    uuid: number;
    vaultTxHash: string;
    registerTxHash: string;
    linkTxHash: string;
  } | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f && f.type.startsWith("audio/")) {
      setFile(f);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  async function uploadToIPFS(data: Uint8Array): Promise<string> {
    const blob = new Blob([data.buffer as ArrayBuffer]);
    const res = await fetch("/api/ipfs/upload", {
      method: "POST",
      body: blob,
    });
    if (!res.ok) throw new Error("IPFS upload failed");
    const { cid } = await res.json();
    return cid as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !walletClient || !address) return;

    try {
      setError("");

      // ── Step 1: AES-encrypt ──────────────────────────────────────────
      setStep("encrypting");
      const content = new Uint8Array(await file.arrayBuffer());
      const { ciphertext: encryptedAudio, key: aesKey } = encryptFile(content);

      // ── Step 2: Upload encrypted audio to IPFS ────────────────────────
      setStep("uploading_ipfs");
      setProgress(30);
      const encryptedCID = await uploadToIPFS(encryptedAudio);

      // Build + upload metadata JSON
      const metadata = {
        title: form.title,
        artist: form.artist,
        genre: form.genre || undefined,
        encryptedAudioCID: encryptedCID,
      };
      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
      const metadataCID = await uploadToIPFS(metadataBytes);
      const metadataURI = `ipfs://${metadataCID}`;

      // ── Step 3: Register track on protocol ────────────────────────────
      setStep("registering");
      setProgress(50);
      const reg = await registerTrackOnProtocol(walletClient, {
        receiver: address,
        revShare: form.revShare,
        metadataURI,
      });

      // ── Step 4: Create license-gated CDR vault (stores AES key) ───────
      setStep("creating_vault");
      setProgress(70);
      const vault = await createCDRVault(cdrClient, {
        dataKey: aesKey,
        owner: address,
        ipId: reg.ipId,
        gated: true,
        updatable: false,
      });

      // ── Step 5: Link vault to IPA ─────────────────────────────────────
      setStep("linking");
      setProgress(90);
      await linkVaultOnProtocol(walletClient, {
        tokenId: reg.tokenId,
        vaultUuid: vault.uuid,
      });

      setStep("done");
      setProgress(100);
      setResult({
        tokenId: reg.tokenId.toString(),
        ipId: reg.ipId,
        uuid: vault.uuid,
        vaultTxHash: vault.txHashes.allocate,
        registerTxHash: reg.txHash,
        linkTxHash: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Upload Track</h1>
        <p className="mt-2 text-muted">
          Encrypt your audio, register it as an IP Asset on Story Protocol,
          and gate access behind CDR threshold encryption + license tokens.
        </p>
      </div>

      {!isConnected && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-muted">
            Connect your wallet to upload a track.
          </p>
        </div>
      )}

      {step === "done" && result ? (
        <div className="glass-card rounded-2xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Track Registered!</h2>
              <p className="text-sm text-muted">
                AES-encrypted audio stored in a license-gated CDR vault.
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-background p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Token ID</span>
              <span>{result.tokenId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">IP Asset ID</span>
              <code className="font-mono text-xs text-accent">{result.ipId.slice(0, 18)}...</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">CDR Vault UUID</span>
              <span>{result.uuid}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push(`/track/${result.ipId}`)}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              View Track
            </button>
            <button
              onClick={() => {
                setStep("form");
                setFile(null);
                setResult(null);
                setForm({ title: "", artist: "", genre: "", revShare: 10 });
              }}
              className="rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-card-hover"
            >
              Upload Another
            </button>
          </div>
        </div>
      ) : step === "error" ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-red-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="font-semibold">Upload Failed</span>
          </div>
          <p className="text-sm text-muted">{error}</p>
          <button
            onClick={() => setStep("form")}
            className="mt-4 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Try Again
          </button>
        </div>
      ) : step !== "form" ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="font-semibold">{STEP_LABELS[step]}</p>
          <div className="mx-auto mt-4 h-2 max-w-xs rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted">Please confirm the transactions in your wallet.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div
            {...getRootProps()}
            className={`glass-card cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
              isDragActive ? "border-accent bg-accent-subtle" : "border-border hover:border-accent/50"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <div className="mb-3 flex items-center justify-center gap-2 text-accent">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                </div>
                <p className="font-medium">{file.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-3 text-sm text-accent hover:text-accent-hover"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-center text-muted">
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <p className="font-medium">
                  {isDragActive ? "Drop your file here" : "Drag & drop your audio file"}
                </p>
                <p className="mt-1 text-sm text-muted">MP3, WAV, FLAC, OGG — up to 50 MB</p>
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Track Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                placeholder="My Awesome Track"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Artist Name *</label>
              <input
                required
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                placeholder="Your Artist Name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Genre</label>
              <input
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                placeholder="Electronic, Hip-Hop, etc."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Revenue Share (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.revShare}
                onChange={(e) => setForm({ ...form, revShare: Number(e.target.value) })}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || !form.title || !form.artist}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-8 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed glow-accent-sm"
          >
            Upload & Register
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}
