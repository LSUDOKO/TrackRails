export function envVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  get RPC_URL() {
    return (
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://aeneid.storyrpc.io"
    );
  },
  get STORY_API_URL() {
    return (
      process.env.NEXT_PUBLIC_STORY_API_URL ?? "http://172.192.41.96:1317"
    );
  },
  get WALLET_CONNECT_PROJECT_ID() {
    return process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "";
  },
  get NETWORK() {
    return process.env.NEXT_PUBLIC_NETWORK ?? "testnet";
  },
  get TRACK_RAILS_PROTOCOL() {
    return process.env.NEXT_PUBLIC_TRACK_RAILS_PROTOCOL ?? "";
  },
  get TRACK_NFT() {
    return process.env.NEXT_PUBLIC_TRACK_NFT ?? "";
  },
} as const;
