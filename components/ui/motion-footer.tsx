"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import Link from "next/link";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
.cinematic-footer-wrapper {
  -webkit-font-smoothing: antialiased;
  --pill-bg-1: color-mix(in oklch, #ffffff 3%, transparent);
  --pill-bg-2: color-mix(in oklch, #ffffff 1%, transparent);
  --pill-shadow: color-mix(in oklch, #001122 50%, transparent);
  --pill-highlight: color-mix(in oklch, #ffffff 10%, transparent);
  --pill-inset-shadow: color-mix(in oklch, #001122 80%, transparent);
  --pill-border: color-mix(in oklch, #ffffff 8%, transparent);
  --pill-bg-1-hover: color-mix(in oklch, #ff0088 12%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, #ff0088 5%, transparent);
  --pill-border-hover: color-mix(in oklch, #ff0088 40%, transparent);
  --pill-shadow-hover: color-mix(in oklch, #001122 70%, transparent);
  --pill-highlight-hover: color-mix(in oklch, #ff0088 25%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); }
  15%, 45% { transform: scale(1.2); }
  30% { transform: scale(1); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 40s linear infinite;
}

.animate-footer-heartbeat {
  animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}

.footer-bg-grid {
  background-size: 60px 60px;
  background-image: 
    linear-gradient(to right, color-mix(in oklch, #ffffff 3%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, #ffffff 3%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%, 
    color-mix(in oklch, #ff0088 15%, transparent) 0%, 
    color-mix(in oklch, #ff3399 10%, transparent) 40%, 
    transparent 70%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow: 0 10px 30px -10px var(--pill-shadow), inset 0 1px 1px var(--pill-highlight), inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow: 0 20px 40px -10px var(--pill-shadow-hover), inset 0 1px 1px var(--pill-highlight-hover);
  color: #ffffff;
}

.footer-giant-bg-text {
  font-size: 26vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in oklch, #ffffff 5%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, #ffffff 10%, transparent) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, #ffffff 0%, color-mix(in oklch, #ffffff 40%, transparent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px color-mix(in oklch, #ffffff 15%, transparent));
}
`;

type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType;
  };

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = "button", ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;
      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const h = rect.width / 2;
          const w = rect.height / 2;
          const x = e.clientX - rect.left - h;
          const y = e.clientY - rect.top - w;
          gsap.to(element, {
            x: x * 0.4, y: y * 0.4,
            rotationX: -y * 0.15, rotationY: x * 0.15,
            scale: 1.05, ease: "power2.out", duration: 0.4,
          });
        };
        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0, y: 0, rotationX: 0, rotationY: 0, scale: 1,
            ease: "elastic.out(1, 0.3)", duration: 1.2,
          });
        };
        element.addEventListener("mousemove", handleMouseMove as any);
        element.addEventListener("mouseleave", handleMouseLeave);
        return () => {
          element.removeEventListener("mousemove", handleMouseMove as any);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, element);
      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement) => {
          (localRef as any).current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as any).current = node;
        }}
        className={cn("cursor-pointer", className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
MagneticButton.displayName = "MagneticButton";

const MarqueeItem = () => (
  <div className="flex items-center space-x-12 px-6">
    <span>Upload &amp; Encrypt</span> <span className="text-[#ff0088]/60">✦</span>
    <span>Register IP Asset</span> <span className="text-[#ff0088]/60">✦</span>
    <span>License &amp; Earn</span> <span className="text-[#ff0088]/60">✦</span>
    <span>Threshold Encrypted</span> <span className="text-[#ff0088]/60">✦</span>
    <span>Story Protocol CDR</span> <span className="text-[#ff0088]/60">✦</span>
    <span>On-Chain Royalties</span> <span className="text-[#ff0088]/60">✦</span>
    <span>No Middleman</span>
  </div>
);

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(giantTextRef.current,
        { y: "10vh", scale: 0.8, opacity: 0 },
        { y: "0vh", scale: 1, opacity: 1, ease: "power1.out",
          scrollTrigger: { trigger: wrapperRef.current, start: "top 80%", end: "bottom bottom", scrub: 1 } }
      );
      gsap.fromTo([headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.15, ease: "power3.out",
          scrollTrigger: { trigger: wrapperRef.current, start: "top 40%", end: "bottom bottom", scrub: 1 } }
      );
    }, wrapperRef);
    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        ref={wrapperRef}
        className="relative h-screen w-full"
        style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        <footer className="fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-[#001122] text-white cinematic-footer-wrapper">
          <div className="footer-aurora absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px] pointer-events-none z-0" />
          <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

          <div ref={giantTextRef} className="footer-giant-bg-text absolute -bottom-[5vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none">
            TRACK RAILS
          </div>

          <div className="absolute top-12 left-0 w-full overflow-hidden border-y border-white/10 bg-[#001122]/60 backdrop-blur-md py-4 z-10 -rotate-2 scale-110 shadow-2xl">
            <div className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-bold tracking-[0.3em] text-white/40 uppercase">
              <MarqueeItem /><MarqueeItem />
            </div>
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 mt-20 w-full max-w-5xl mx-auto">
            <h2 ref={headingRef} className="text-5xl md:text-8xl font-black footer-text-glow tracking-tighter mb-12 text-center">
              Your Music, On-Chain.
            </h2>

            <div ref={linksRef} className="flex flex-col items-center gap-8 w-full">
              <div className="flex flex-wrap justify-center gap-4 w-full">
                <MagneticButton as={Link} href="/upload" className="footer-glass-pill px-10 py-5 rounded-full text-white font-bold text-sm md:text-base flex items-center gap-3 group">
                  <svg className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Upload Your Track
                </MagneticButton>
                <MagneticButton as={Link} href="/dashboard" className="footer-glass-pill px-10 py-5 rounded-full text-white font-bold text-sm md:text-base flex items-center gap-3 group">
                  <svg className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                  </svg>
                  View Dashboard
                </MagneticButton>
              </div>
              <div className="flex flex-wrap justify-center gap-3 md:gap-6 w-full">
                <MagneticButton as={Link} href="/browse" className="footer-glass-pill px-6 py-3 rounded-full text-white/40 font-medium text-xs md:text-sm hover:text-white">
                  Browse Tracks
                </MagneticButton>
                <MagneticButton as={Link} href="/cdr" className="footer-glass-pill px-6 py-3 rounded-full text-white/40 font-medium text-xs md:text-sm hover:text-white">
                  CDR Vaults
                </MagneticButton>
                <MagneticButton as="a" href="https://story.foundation" target="_blank" className="footer-glass-pill px-6 py-3 rounded-full text-white/40 font-medium text-xs md:text-sm hover:text-white">
                  Story Protocol
                </MagneticButton>
                <MagneticButton as={Link} href="/" className="footer-glass-pill px-6 py-3 rounded-full text-white/40 font-medium text-xs md:text-sm hover:text-white">
                  Support
                </MagneticButton>
              </div>

              {/* Link columns */}
              <div className="flex flex-wrap justify-center gap-12 w-full mt-4">
                <div className="text-center">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-3">Platform</h4>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                    {[
                      { href: "/", label: "Home" },
                      { href: "/upload", label: "Upload" },
                      { href: "/browse", label: "Browse" },
                      { href: "/cdr", label: "CDR" },
                      { href: "/dashboard", label: "Dashboard" },
                    ].map((link) => (
                      <Link key={link.href} href={link.href} className="text-xs text-white/40 hover:text-accent transition-colors">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-3">Ecosystem</h4>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                    {[
                      { href: "https://story.foundation", label: "Story Protocol" },
                      { href: "https://docs.story.foundation", label: "Documentation" },
                      { href: "https://www.pinata.cloud", label: "IPFS via Pinata" },
                      { href: "https://github.com/piplabs/cdr-sdk", label: "CDR SDK" },
                    ].map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="text-xs text-white/40 hover:text-accent transition-colors">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 w-full pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-white/30 text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1">
              &copy; 2026 Track Rails. All rights reserved.
            </div>
            <div className="footer-glass-pill px-6 py-3 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default border-white/10">
              <span className="text-white/30 text-[10px] md:text-xs font-bold uppercase tracking-widest">Built on</span>
              <span className="text-[#ff0088] text-xs font-black">Story Protocol</span>
            </div>
            <MagneticButton as="button" onClick={scrollToTop} className="w-12 h-12 rounded-full footer-glass-pill flex items-center justify-center text-white/40 hover:text-white group order-3">
              <svg className="w-5 h-5 transform group-hover:-translate-y-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  );
}
