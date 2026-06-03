import { createPublicClient, http, type Chain } from "viem";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.ankr.com/story_aeneid_testnet";

const aeneid = {
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: { name: "IP Token", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const satisfies Chain;

export const publicClient = createPublicClient({
  chain: aeneid,
  transport: http(RPC_URL),
});

export const PROTOCOL_ADDRESS = (process.env.NEXT_PUBLIC_TRACK_RAILS_PROTOCOL ?? "") as `0x${string}`;

export const PROTOCOL_ABI = [
  {
    type: "function", name: "getTrack", inputs: [{ type: "uint256", name: "tokenId" }],
    outputs: [{
      type: "tuple", components: [
        { type: "address", name: "ipId" },
        { type: "uint32", name: "vaultUuid" },
        { type: "address", name: "owner" },
        { type: "string", name: "metadataURI" },
        { type: "uint256", name: "licenseTermsId" },
        { type: "uint256", name: "timestamp" },
        { type: "bool", name: "vaultLinked" },
      ],
    }],
    stateMutability: "view",
  },
  { type: "function", name: "getTrackCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTrackIds", inputs: [{ type: "uint256" }, { type: "uint256" }], outputs: [{ type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "getTracksByOwner", inputs: [{ type: "address" }], outputs: [{ type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "getTokenIdForIp", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export interface TrackData {
  tokenId: bigint;
  ipId: `0x${string}`;
  vaultUuid: number;
  owner: `0x${string}`;
  metadataURI: string;
  licenseTermsId: bigint;
  timestamp: bigint;
  vaultLinked: boolean;
}

export interface TrackMetadata {
  title: string;
  artist: string;
  genre?: string;
  artworkUri?: string;
  duration?: number;
  description?: string;
}
