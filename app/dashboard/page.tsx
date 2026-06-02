"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";

const MOCK_TRACKS = [
  { ipId: "0x0000000000000000000000000000000000000001", title: "My Track 1", artist: "Me", licenses: 3, revenue: "0.05 IP" },
  { ipId: "0x0000000000000000000000000000000000000002", title: "My Track 2", artist: "Me", licenses: 1, revenue: "0.01 IP" },
];

const MOCK_LICENSES = [
  { tokenId: 1, track: "Track Name", artist: "Artist", price: "0.01 IP" },
];

type Tab = "tracks" | "licenses";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("tracks");

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
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </code>
        </p>
      </div>

      <div className="mb-8 flex gap-1 rounded-xl bg-card p-1">
        {(["tracks", "licenses"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {t === "tracks" ? "My Tracks" : "My Licenses"}
          </button>
        ))}
      </div>

      {tab === "tracks" ? (
        <div className="space-y-3">
          {MOCK_TRACKS.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-muted">You haven&apos;t uploaded any tracks yet.</p>
              <Link href="/upload" className="mt-4 inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">
                Upload Your First Track
              </Link>
            </div>
          ) : (
            MOCK_TRACKS.map((track) => (
              <Link
                key={track.ipId}
                href={`/track/${track.ipId}`}
                className="glass-card flex items-center justify-between rounded-2xl p-4 transition-all hover:translate-x-1"
              >
                <div>
                  <h3 className="font-semibold">{track.title}</h3>
                  <p className="text-sm text-muted">{track.artist}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted">{track.licenses} licenses</p>
                  <p className="font-medium text-accent">{track.revenue}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {MOCK_LICENSES.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-muted">You haven&apos;t minted any licenses yet.</p>
              <Link href="/browse" className="mt-4 inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">
                Browse Catalog
              </Link>
            </div>
          ) : (
            MOCK_LICENSES.map((lic) => (
              <div key={lic.tokenId} className="glass-card flex items-center justify-between rounded-2xl p-4">
                <div>
                  <h3 className="font-semibold">{lic.track}</h3>
                  <p className="text-sm text-muted">{lic.artist}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-accent">{lic.price}</p>
                  <p className="text-xs text-muted">Token #{lic.tokenId}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
