import type { Address } from "viem";

// ── Static env map ─────────────────────────────────────────────────────
// Next.js inlines process.env.NEXT_PUBLIC_* at compile time via static
// property access (dot/property notation). Dynamic lookup via
// process.env[key] does NOT work in client components, so we eagerly
// capture all known vars here.
//
const _NEXT_PUBLIC: Record<string, string | undefined> = {
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_STORY_API_URL: process.env.NEXT_PUBLIC_STORY_API_URL,
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID:
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
  NEXT_PUBLIC_TRACK_RAILS_PROTOCOL:
    process.env.NEXT_PUBLIC_TRACK_RAILS_PROTOCOL,
  NEXT_PUBLIC_TRACK_NFT: process.env.NEXT_PUBLIC_TRACK_NFT,
  NEXT_PUBLIC_PLAYLIST_CONTRACT:
    process.env.NEXT_PUBLIC_PLAYLIST_CONTRACT,
};

// Regular (non-public) env vars — not inlined, but only accessed from
// server components / API routes where process.env is available.
const _ENV: Record<string, string | undefined> = {
  PINATA_JWT: process.env.PINATA_JWT,
};

function readEnv(key: string, fallback = ""): string {
  return _NEXT_PUBLIC[key] ?? _ENV[key] ?? process.env[key] ?? fallback;
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Get a required env var or throw a clear error.
 * Only use this for non-optional config (RPC, API URL).
 */
export function envVar(key: string): string {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Check whether a contract address env var has been set.
 * Returns `true` if the address is a valid non-empty hex string.
 */
export function isContractConfigured(key: string): boolean {
  const value = readEnv(key);
  return !!value && value.startsWith("0x") && value.length === 42;
}

/**
 * Assert that a required contract address env var is set, throwing
 * a descriptive message that tells the user what to do.
 */
export function requireContractAddress(key: string, label: string): Address {
  const value = readEnv(key);
  if (!value || !value.startsWith("0x") || value.length !== 42) {
    throw new Error(
      `[Config] ${label} contract address not configured. ` +
      `Set ${key} in your .env.local file after deploying the contract.`
    );
  }
  return value as Address;
}

export const env = {
  get RPC_URL() {
    return (
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://aeneid.storyrpc.io"
    );
  },
  get STORY_API_URL() {
    return (
      process.env.NEXT_PUBLIC_STORY_API_URL ?? "/api/story-proxy"
    );
  },
  get WALLET_CONNECT_PROJECT_ID() {
    return process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "";
  },
  get NETWORK() {
    return process.env.NEXT_PUBLIC_NETWORK ?? "testnet";
  },
  get TRACK_RAILS_PROTOCOL(): string {
    return readEnv("NEXT_PUBLIC_TRACK_RAILS_PROTOCOL");
  },
  get TRACK_NFT(): string {
    return readEnv("NEXT_PUBLIC_TRACK_NFT");
  },
  get PLAYLIST_CONTRACT(): string {
    return readEnv("NEXT_PUBLIC_PLAYLIST_CONTRACT");
  },
} as const;
