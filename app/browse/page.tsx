"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";

const MOCK_TRACKS = Array.from({ length: 12 }, (_, i) => ({
  ipId: `0x${String(i + 1).padStart(40, "0")}`,
  title: `Track ${i + 1}`,
  artist: `Artist ${i + 1}`,
  genre: ["Electronic", "Hip-Hop", "Ambient", "Jazz", "Rock", "Classical"][i % 6],
  duration: `${Math.floor(120 + i * 30)}s`,
  price: `${(i + 1) * 0.01} IP`,
}));

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
];

export default function BrowsePage() {
  const { isConnected } = useAccount();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");

  const filtered = MOCK_TRACKS.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.artist.toLowerCase().includes(search.toLowerCase())) return false;
    if (genre && t.genre !== genre) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Browse Catalog</h1>
        <p className="mt-2 text-muted">
          Discover tracks registered on Story Protocol. License tokens grant CDR-decrypted access.
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            placeholder="Search tracks or artists..."
          />
        </div>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          <option value="">All Genres</option>
          {["Electronic", "Hip-Hop", "Ambient", "Jazz", "Rock", "Classical"].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-muted">No tracks found.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((track, i) => (
            <Link
              key={track.ipId}
              href={`/track/${track.ipId}`}
              className="glass-card group cursor-pointer rounded-2xl overflow-hidden"
            >
              <div className={`h-48 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center relative`}>
                <span className="text-6xl text-white/20 select-none">♪</span>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <svg className="ml-0.5 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-semibold truncate">{track.title}</h3>
                  <span className="shrink-0 rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] font-medium text-accent">
                    License
                  </span>
                </div>
                <p className="text-sm text-muted">{track.artist}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{track.genre}</span>
                  <span>{track.price}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
