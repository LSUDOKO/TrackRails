"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Dithering } from "@paper-design/shaders-react";
import StatsMarquee from "@/components/ui/stats-marquee";

// ── Intersection Observer scroll reveal ────────────────────────────
function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("animate-fade-up");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ── Data ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    title: "Threshold Encryption",
    description:
      "Every track is AES-encrypted client-side and split across CDR validators. No single party — not even us — holds the full decryption key.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "IP Asset Registration",
    description:
      "Tracks are registered as IP Assets on Story Protocol with enforceable license terms. Your ownership is immutable and verifiable on-chain.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "License Mint Revenue",
    description:
      "Fans mint license tokens to stream your tracks. Each mint generates MERC20 revenue that flows directly to you — claimable at any time.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Story Protocol CDR",
    description:
      "Built on Confidential Data Rails — threshold-encrypted vaults with on-chain access control. Only license holders can trigger decryption.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    number: "01",
    title: "Upload & Encrypt",
    description:
      "Drag and drop any audio file. It is AES-256 encrypted in your browser, split into shards, and distributed across the CDR validator network — before it ever leaves your machine.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Register & Set Terms",
    description:
      "Your track becomes an IP Asset on Story Protocol. Define license pricing, revenue splits, and minting fees. Terms are enforced by smart contracts — no intermediaries.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "License & Earn",
    description:
      "Listeners mint license tokens to stream your tracks. Each mint pays you MERC20. CDR validators enable threshold decryption so authorized users can listen.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const DEFAULT_STATS = [
  { value: "—", label: "Total MERC20 Earned" },
  { value: "—", label: "Tracks Registered" },
  { value: "—", label: "Licenses Minted" },
  { value: "100%", label: "On-Chain Royalties" },
];

export default function Home() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const howRef = useScrollReveal<HTMLElement>();
  const featuresRef = useScrollReveal<HTMLElement>();
  const telegramRef = useScrollReveal<HTMLElement>();
  const ctaRef = useScrollReveal<HTMLElement>();

  useEffect(() => {
    fetch("/api/tracks?action=getTrackIds")
      .then((res) => res.json())
      .then((data) => {
        const trackIds = (data.trackIds ?? []) as string[];
        const count = trackIds.length;
        setStats([
          { value: "—", label: "Total MERC20 Earned" },
          { value: count.toString(), label: "Tracks Registered" },
          { value: "—", label: "Licenses Minted" },
          { value: "100%", label: "On-Chain Royalties" },
        ]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════
          Hero
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen overflow-hidden">
        {/* Left: Content */}
        <div className="relative z-10 flex w-full flex-col justify-center px-12 sm:px-16 lg:w-1/2 lg:pl-20 xl:pl-28">
          <div className="max-w-2xl">
            {/* Heading */}
            <h1 className="animate-fade-up mb-8 text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              Collect the money your
              <br />
              music has earned from
              <br />
              <span className="text-gradient">listeners.</span>
            </h1>

            {/* Description */}
            <p className="animate-fade-up animation-delay-200 mb-12 max-w-lg text-sm leading-[1.8] text-muted sm:text-base">
              Connect your wallet to see your earnings and withdraw your balance.
              Every time someone buys a license to listen to your track, you get
              paid automatically — no middleman, no minimum threshold.
            </p>

            {/* CTA buttons */}
            <div className="animate-fade-up animation-delay-300 flex flex-col gap-5 sm:flex-row">
              <Link
                href="/dashboard"
                className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-accent px-8 text-sm font-semibold text-white transition-all hover:bg-accent-hover glow-accent-sm"
              >
                Go to Dashboard
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/upload"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 text-sm font-semibold text-foreground transition-all hover:bg-card-hover"
              >
                Upload New Track
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Paper Dithering Shader */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 z-10 bg-gradient-to-l from-transparent via-[#001122]/40 to-[#001122]" />
          <Dithering
            style={{ height: "100%", width: "100%", position: "absolute", inset: 0 }}
            colorBack="#0a1a2e"
            colorFront="#ff0088"
            shape="warp"
            type="8x8"
            pxSize={5}
            offsetX={0.2}
            offsetY={0.1}
            scale={1.1}
            rotation={0.02}
            speed={0.08}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Stats Marquee
      ════════════════════════════════════════════════════════════════ */}
      <section>
        <StatsMarquee stats={stats} />
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          How It Works
      ════════════════════════════════════════════════════════════════ */}
      <section ref={howRef} className="relative border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8 opacity-0 overflow-hidden">
        {/* Background accent */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[60vh] w-[60vw] -translate-x-1/2 rounded-full bg-accent/[0.02] blur-[120px]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              How It Works
            </span>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              From upload to earnings in{" "}
              <span className="text-gradient">three steps</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              Get your music on-chain and earning in minutes. No technical expertise required.
            </p>
          </div>
          <div className="relative grid gap-6 md:grid-cols-3 md:gap-8">
            {/* Connecting line */}
            <div className="pointer-events-none absolute top-16 left-0 right-0 hidden h-px md:block" style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,0,136,0.3) 20%, rgba(255,0,136,0.3) 80%, transparent 100%)"
            }} />
            {STEPS.map((step, i) => (
              <div key={step.number} className="group relative">
                {/* Step number badge */}
                <div className="relative z-10 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-background text-lg font-black text-accent shadow-lg shadow-accent/5 transition-all duration-300 group-hover:border-accent/40 group-hover:shadow-accent/20 md:mx-0">
                  {step.number}
                  {/* Numbered step indicator */}
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <div className="glass-card group rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl hover:shadow-accent/5">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent/20 group-hover:scale-110">
                    {step.icon}
                  </div>
                  <h3 className="mb-3 text-lg font-bold group-hover:text-accent transition-colors">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{step.description}</p>
                </div>
                {/* Arrow connector */}
                {i < STEPS.length - 1 && (
                  <div className="pointer-events-none absolute top-14 -right-4 hidden text-accent/30 md:block">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Features
      ════════════════════════════════════════════════════════════════ */}
      <section ref={featuresRef} className="relative border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8 opacity-0 overflow-hidden">
        {/* Background dots */}
        <div className="pointer-events-none absolute inset-0 hero-grid opacity-30" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Why Track Rails
            </span>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Built for{" "}
              <span className="text-gradient">creators</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              Everything you need to distribute, protect, and monetize your music on-chain.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="group relative">
                {/* Hover glow */}
                <div className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-xl" style={{
                  background: "linear-gradient(135deg, rgba(255,0,136,0.15), transparent 50%)"
                }} />
                <div className="relative glass-card group rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:translate-y-[-4px]">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent/20 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-accent/10">
                    {feature.icon}
                  </div>
                  <h3 className="mb-3 text-lg font-bold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
                  {/* Bottom accent line */}
                  <div className="mt-5 h-0.5 w-0 rounded-full bg-accent/50 transition-all duration-300 group-hover:w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Telegram Bot
      ════════════════════════════════════════════════════════════════ */}
      <section ref={telegramRef} className="relative border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8 opacity-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-grid opacity-20" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Integration
            </span>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Your tracks on <span className="text-gradient">Telegram</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              Browse, search, and track your on-chain music directly from Telegram. No wallet needed.
            </p>
          </div>

          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            {/* Left: Bot info */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-card shadow-lg">
                  <img
                    src="/telegram-bot.png"
                    alt="Telegram Bot"
                    className="h-10 w-10"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold">@TrackRailsBot</h3>
                  <p className="text-sm text-muted">Your on-chain music assistant</p>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    label: "Browse Tracks",
                    desc: "Paginated catalog with inline keyboard navigation",
                  },
                  {
                    label: "Track Details",
                    desc: "View token ID, IP Asset, vault status, metadata",
                  },
                  {
                    label: "Live Stats",
                    desc: "Total tracks, licenses minted, and platform metrics",
                  },
                  {
                    label: "My Dashboard",
                    desc: "Your uploads, licenses, and claimable revenue",
                  },
                  {
                    label: "Search",
                    desc: "Find any track by title or artist instantly",
                  },
                ].map((feat) => (
                  <div key={feat.label} className="flex items-start gap-3 rounded-xl border border-accent/10 bg-accent/[0.02] p-4 transition-colors hover:bg-accent/[0.05]">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{feat.label}</p>
                      <p className="text-xs text-muted mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="https://t.me/TrackRailsBot"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-accent px-8 text-sm font-semibold text-white transition-all duration-300 hover:bg-accent-hover hover:shadow-2xl hover:shadow-accent/30 sm:w-auto"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Open in Telegram
                <svg className="h-4 w-4 transition-all duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>

            {/* Right: Bot screenshot */}
            <div className="relative hidden md:block">
              <div className="relative mx-auto max-w-sm">
                <div className="rounded-[2.5rem] border-4 border-border bg-background p-3 shadow-2xl shadow-accent/5">
                  <img
                    src="/telegram-preview.jpeg"
                    alt="TrackRailsBot Telegram preview"
                    className="w-full rounded-[1.2rem]"
                  />
                </div>
                <div className="pointer-events-none absolute -inset-10 rounded-[3rem] bg-accent/[0.03] blur-[60px]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════════════════════ */}
      <section ref={ctaRef} className="relative border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8 opacity-0 overflow-hidden">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/[0.04] via-background to-accent/[0.04] p-10 sm:p-16 text-center shadow-2xl">
            {/* Grid overlay */}
            <div className="pointer-events-none absolute inset-0" style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,0,136,0.06) 1px, transparent 0)",
              backgroundSize: "32px 32px"
            }} />
            {/* Glow orbs */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-accent/10 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-accent/10 blur-[80px]" />
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                Get Started
              </div>
              <h2 className="mb-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Ready to own your music?
              </h2>
              <p className="mx-auto mb-10 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
                Upload your first track, register it as an IP Asset, and start earning
                revenue from license mints — all on-chain, all yours.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/upload"
                  className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-accent px-8 text-sm font-semibold text-white transition-all duration-300 hover:bg-accent-hover hover:shadow-2xl hover:shadow-accent/30 glow-accent-sm"
                >
                  Upload Your First Track
                  <svg className="h-4 w-4 transition-all duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/browse"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 text-sm font-semibold text-foreground transition-all duration-300 hover:bg-card-hover hover:border-accent/30"
                >
                  Browse Catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
