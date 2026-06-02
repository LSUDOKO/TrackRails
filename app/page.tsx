import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════
          Hero
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-4 hero-grid">
        {/* Background glow */}
        <div className="hero-glow" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-subtle px-3.5 py-1.5 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" />
              Built on Story Protocol &middot; Aeneid Testnet
            </span>
          </div>

          {/* Heading */}
          <h1 className="animate-fade-up animation-delay-100 mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Your Music,
            <br />
            <span className="text-gradient">On-Chain.</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-up animation-delay-200 mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            Upload encrypted audio tracks, register them as IP Assets on Story
            Protocol, and monetize access via threshold-encrypted license
            tokens. No single party ever holds the full decryption key.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up animation-delay-300 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/upload"
              className="group relative inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-accent px-8 text-sm font-semibold text-white transition-all hover:bg-accent-hover glow-accent-sm"
            >
              Upload Your Track
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="/browse"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 text-sm font-semibold text-foreground transition-all hover:bg-card-hover"
            >
              Browse Catalog
            </Link>
          </div>

          {/* Stats row */}
          <div className="animate-fade-up animation-delay-500 mt-16 flex items-center justify-center gap-10 sm:gap-16">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">100%</div>
              <div className="text-xs text-muted">On-Chain Ownership</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                Threshold
              </div>
              <div className="text-xs text-muted">Encrypted</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">IP</div>
              <div className="text-xs text-muted">Asset Licensing</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          How It Works
      ════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-xl text-muted">
              From upload to playback — every step is secured by Story
              Protocol&apos;s CDR and on-chain licensing.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Upload & Encrypt",
                description:
                  "Drag and drop your audio file. It gets AES-encrypted client-side and uploaded to IPFS. Only you hold the key.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Register & License",
                description:
                  "Your track becomes an IP Asset on Story Protocol with attached license terms. Set your revenue share and minting fee.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "License & Stream",
                description:
                  "Listeners mint a license token to access your track. CDR validators enable threshold decryption — no single party can decrypt alone.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="glass-card group rounded-2xl p-6 sm:p-8"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-subtle text-accent transition-colors group-hover:bg-accent/20">
                  {item.icon}
                </div>
                <span className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                  Step {item.step}
                </span>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Featured Tracks
      ════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Featured Tracks
              </h2>
              <p className="text-muted">
                Discover the latest tracks uploaded to Track Rails.
              </p>
            </div>
            <Link
              href="/browse"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent-subtle sm:inline-flex"
            >
              View all tracks &rarr;
            </Link>
          </div>

          {/* Placeholder track grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Track Name",
                artist: "Artist Name",
                art: "from-yellow-500",
                artTo: "to-orange-600",
              },
              {
                title: "Track Name",
                artist: "Artist Name",
                art: "from-violet-500",
                artTo: "to-purple-600",
              },
              {
                title: "Track Name",
                artist: "Artist Name",
                art: "from-emerald-500",
                artTo: "to-teal-600",
              },
            ].map((track, i) => (
              <div
                key={i}
                className="glass-card group cursor-pointer rounded-2xl overflow-hidden"
              >
                {/* Album art placeholder */}
                <div
                  className={`h-48 bg-gradient-to-br ${track.art} ${track.artTo} flex items-center justify-center`}
                >
                  <span className="text-5xl text-white/30 select-none">
                    ♪
                  </span>
                </div>
                <div className="p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-semibold">{track.title}</h3>
                    <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] font-medium text-accent">
                      License
                    </span>
                  </div>
                  <p className="text-sm text-muted">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile view all link */}
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent-subtle"
            >
              View all tracks &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="glass-card rounded-3xl p-10 sm:p-16 glow-accent">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Put Your Music
              <br />
              <span className="text-gradient">On-Chain?</span>
            </h2>
            <p className="mb-8 text-muted">
              Connect your wallet and upload your first track. No registration
              required — just your Story wallet on Aeneid.
            </p>
            <Link
              href="/upload"
              className="group relative inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-accent px-8 text-sm font-semibold text-white transition-all hover:bg-accent-hover glow-accent-sm"
            >
              Get Started
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
