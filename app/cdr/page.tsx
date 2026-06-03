"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { getUploadedTracks } from "@/lib/local-tracks";
import type { LocalTrackEntry } from "@/lib/local-tracks";
import { fetchTrackMetadata, shortenAddress } from "@/lib/queries";
import type { TrackMetadata } from "@/lib/queries";
import Link from "next/link";

const FLOW_STEPS = [
  {
    title: "AES-256 Encryption",
    desc: "Your audio file is encrypted client-side with AES-256-GCM before leaving your browser. The encryption key is generated fresh for every upload.",
    icon: "🔐",
    color: "from-rose-500/20 to-pink-500/10",
  },
  {
    title: "IPFS Storage",
    desc: "The encrypted audio is uploaded to IPFS via Pinata. Only the ciphertext leaves your device — the key never touches any server.",
    icon: "☁️",
    color: "from-sky-500/20 to-cyan-500/10",
  },
  {
    title: "TDH2 Key Splitting",
    desc: "The AES key is encrypted using TDH2 (Threshold Distributed Hashing) and split across multiple independent CDR validator nodes. No single validator holds the full key.",
    icon: "🧩",
    color: "from-violet-500/20 to-purple-500/10",
  },
  {
    title: "On-Chain Vault",
    desc: "The encrypted key shards are stored in a CDR vault on Story Protocol. Access is gated by license token ownership — only verified license holders can request decryption.",
    icon: "🔒",
    color: "from-emerald-500/20 to-teal-500/10",
  },
  {
    title: "Threshold Decryption",
    desc: "When a license holder requests access, a threshold of CDR validators independently decrypt their shards. The key is reconstructed only after the threshold is met — never before.",
    icon: "🔑",
    color: "from-amber-500/20 to-orange-500/10",
  },
];

const BENEFITS = [
  {
    title: "No Single Point of Failure",
    desc: "The AES key is split across multiple validators. Even if one validator is compromised, the key remains secure.",
    icon: "🛡️",
  },
  {
    title: "Client-Side Encryption",
    desc: "Your audio never exists in plaintext on any server. Encryption happens in your browser before anything is uploaded.",
    icon: "🖥️",
  },
  {
    title: "Programmable Access Control",
    desc: "Access is gated by Story Protocol license tokens. Only verified token holders can trigger decryption through the validator network.",
    icon: "🎛️",
  },
  {
    title: "Fully On-Chain Audit Trail",
    desc: "Every vault allocation, key write, and decryption request is recorded on Story Protocol. Complete transparency for rights holders.",
    icon: "📋",
  },
];

export default function CDRPage() {
  const { address, isConnected } = useAccount();
  const [vaults, setVaults] = useState<{ track: LocalTrackEntry; meta?: TrackMetadata }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    const local = getUploadedTracks(address);
    Promise.all(
      local.map(async (t) => {
        const m = t.meta ?? (t.metadataURI ? await fetchTrackMetadata(t.metadataURI).catch(() => undefined) : undefined);
        return { track: t, meta: m ?? undefined };
      }),
    ).then((results) => {
      setVaults(results);
      setLoading(false);
    });
  }, [address]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative mb-20 overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-[#001122] via-[#001a2e] to-[#002244] p-8 sm:p-12">
        <div className="absolute inset-0 hero-grid opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Confidential Data Rails
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Threshold-Encrypted{" "}
            <span className="text-gradient">Audio Vaults</span>
          </h1>
          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-muted">
            Track Rails uses <strong className="text-foreground">CDR (Confidential Data Rails)</strong> — a threshold encryption
            framework built on Story Protocol. Every track is AES-256 encrypted client-side,
            split across independent validators using TDH2, and gated behind on-chain license tokens.
            No single party — not even us — can access your audio without authorization.
          </p>
        </div>
      </div>

      {/* ── How CDR Works (Flow) ─────────────────────────────────────── */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-2">How CDR Works</h2>
        <p className="text-sm text-muted mb-10 max-w-xl">
          From upload to playback — every track passes through this encryption pipeline
          before it reaches a listener.
        </p>

        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-accent/40 via-accent/20 to-transparent hidden sm:block" />

          <div className="space-y-8">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.title} className="relative flex flex-col sm:flex-row gap-5 sm:gap-8 group">
                {/* Step number */}
                <div className="sm:absolute sm:left-0 sm:top-0 z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-card border border-border/50 group-hover:border-accent/30 transition-all">
                  <span className="text-2xl">{step.icon}</span>
                </div>

                {/* Content */}
                <div className={`sm:ml-24 flex-1 rounded-2xl border border-border/30 bg-gradient-to-br ${step.color} p-5 sm:p-6 transition-all group-hover:border-border/60`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold">{step.title}</h3>
                    <span className="text-xs text-muted font-mono">Step {i + 1}</span>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture Overview ────────────────────────────────────── */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-2">Architecture</h2>
        <p className="text-sm text-muted mb-8 max-w-xl">
          How Track Rails integrates CDR with Story Protocol for end-to-end
          encrypted audio distribution.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Client App",
              items: ["AES-256 encryption", "IPFS upload via Pinata", "Wallet signing"],
              gradient: "from-accent/10 to-accent/5",
              border: "border-accent/20",
            },
            {
              title: "CDR Network",
              items: ["TDH2 key splitting", "Threshold validators", "Partial decryption"],
              gradient: "from-violet-500/10 to-purple-500/5",
              border: "border-violet-500/20",
            },
            {
              title: "Story Protocol",
              items: ["IP Asset Registry", "License tokens (ERC-721)", "Royalty payment engine"],
              gradient: "from-emerald-500/10 to-teal-500/5",
              border: "border-emerald-500/20",
            },
          ].map((col) => (
            <div key={col.title} className={`rounded-2xl border ${col.border} bg-gradient-to-br ${col.gradient} p-5`}>
              <h3 className="text-base font-bold mb-3">{col.title}</h3>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted">
                    <span className="h-1 w-1 rounded-full bg-current shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────── */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-2">Why CDR?</h2>
        <p className="text-sm text-muted mb-8 max-w-xl">
          Threshold encryption gives artists and rights holders control they can&apos;t get
          from traditional platforms.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="glass-card rounded-2xl p-5 flex gap-4">
              <span className="text-2xl shrink-0 mt-0.5">{b.icon}</span>
              <div>
                <h3 className="font-bold text-sm mb-1">{b.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Key Numbers ──────────────────────────────────────────────── */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-8">Protocol Numbers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "AES-256-GCM", label: "Encryption Algorithm" },
            { value: "TDH2", label: "Key Splitting Scheme" },
            { value: "3-of-5", label: "Validator Threshold" },
            { value: "100%", label: "On-Chain Audit Trail" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-5 text-center">
              <div className="text-lg font-bold text-foreground sm:text-xl">{stat.value}</div>
              <div className="mt-1 text-xs text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── User's Vaults ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold mb-2">Your CDR Vaults</h2>
        <p className="text-sm text-muted mb-8 max-w-xl">
          Tracks you&apos;ve uploaded with their corresponding CDR vaults.
          Each vault stores the encrypted AES key shards for your audio.
        </p>

        {!isConnected ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-muted">Connect your wallet to see your CDR vaults.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : vaults.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-muted">You haven&apos;t uploaded any tracks yet.</p>
            <Link href="/upload" className="mt-4 inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
              Upload Your First Track
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vaults.map(({ track, meta }) => (
              <div key={track.vaultUuid} className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Vault icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>

                {/* Track info */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{meta?.title ?? `Track #${track.tokenId.toString()}`}</p>
                  <p className="text-sm text-muted">{meta?.artist ?? shortenAddress(track.owner as `0x${string}`)}</p>
                </div>

                {/* Vault details */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-6 gap-y-1 text-xs shrink-0">
                  <div>
                    <span className="text-muted">Vault UUID</span>
                    <p className="font-mono text-accent">#{track.vaultUuid}</p>
                  </div>
                  <div>
                    <span className="text-muted">Encryption</span>
                    <p className="text-emerald-400">AES-256 ✓</p>
                  </div>
                  <div>
                    <span className="text-muted">Access</span>
                    <p className={track.vaultLinked ? "text-accent" : "text-muted"}>
                      {track.vaultLinked ? "License-gated" : "Not linked"}
                    </p>
                  </div>
                  <div>
                    <Link
                      href={`/track/${track.ipId}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-hover transition-colors"
                    >
                      View Track
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
