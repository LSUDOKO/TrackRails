"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/components/ui/use-scroll";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/browse", label: "Browse" },
  { href: "/cdr", label: "CDR" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useScroll(20);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full border-b transition-all duration-300 ease-out",
        scrolled && !mobileOpen
          ? "border-border/50 glass"
          : "border-transparent bg-transparent",
        mobileOpen && "glass border-border/50"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <img
            src="/logo.png"
            alt="Track Rails"
            className="h-9 w-auto"
            width={50}
            height={50}
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Track Rails
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-accent/5 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ConnectButton
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
            showBalance={false}
            chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
          />

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-accent/5 hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            <MenuToggleIcon open={mobileOpen} className="size-5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "fixed top-16 left-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden border-t border-border/50 md:hidden transition-all duration-300",
          mobileOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
      >
        <div className="flex h-full w-full flex-col justify-between bg-background/95 backdrop-blur-xl gap-y-2 p-6">
          <div className="grid gap-y-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-accent/5 hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
