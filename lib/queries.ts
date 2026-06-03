import { createPublicClient, http } from "viem";
import { aeneid } from "@story-protocol/core-sdk";
import { env, isContractConfigured } from "./env";

const client = createPublicClient({
  chain: aeneid,
  transport: http(env.RPC_URL),
});

const TRACK_RAILS_PROTOCOL = process.env.NEXT_PUBLIC_TRACK_RAILS_PROTOCOL as `0x${string}` | undefined;
const TRACK_NFT_ADDRESS = process.env.NEXT_PUBLIC_TRACK_NFT as `0x${string}` | undefined;

const CONTRACTS_DEPLOYED = isContractConfigured("NEXT_PUBLIC_TRACK_RAILS_PROTOCOL");

/** Clear error message shown when browsing before contracts are deployed. */
export const CONTRACTS_NOT_DEPLOYED_ERROR =
  "Track Rails contracts are not deployed yet. " +
  "Run `forge script script/DeployTrackRails.s.sol --broadcast` first, " +
  "then set NEXT_PUBLIC_TRACK_RAILS_PROTOCOL and NEXT_PUBLIC_TRACK_NFT in .env.local.";

function requireProtocol(): `0x${string}` {
  if (!TRACK_RAILS_PROTOCOL) {
    throw new Error(CONTRACTS_NOT_DEPLOYED_ERROR);
  }
  return TRACK_RAILS_PROTOCOL;
}

const NFT_ABI = [
  { type: "function", name: "tokenURI", inputs: [{ type: "uint256", name: "tokenId" }], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "ownerOf", inputs: [{ type: "uint256", name: "tokenId" }], outputs: [{ type: "address" }], stateMutability: "view" },
] as const;

const PROTOCOL_ABI = [
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

function parseTokenId(tokenId: string | bigint): bigint {
  return typeof tokenId === "bigint" ? tokenId : BigInt(tokenId);
}

export async function getTrack(tokenId: string | bigint): Promise<TrackData> {
  const tid = parseTokenId(tokenId);
  const protocol = requireProtocol();
  const result = (await client.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTrack",
    args: [tid],
  })) as unknown as [string, number, string, string, bigint, bigint, boolean];
  return {
    tokenId: tid,
    ipId: result[0] as `0x${string}`,
    vaultUuid: result[1] as number,
    owner: result[2] as `0x${string}`,
    metadataURI: result[3] as string,
    licenseTermsId: result[4] as bigint,
    timestamp: result[5] as bigint,
    vaultLinked: result[6] as boolean,
  };
}

export async function getTrackCount(): Promise<bigint> {
  const protocol = requireProtocol();
  return client.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTrackCount",
  });
}

export async function getTrackIds(offset = 0, limit = 50): Promise<readonly bigint[]> {
  const protocol = requireProtocol();
  const ids: readonly bigint[] = await client.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTrackIds",
    args: [BigInt(offset), BigInt(limit)],
  });
  return ids;
}

export async function getAllTracks(offset = 0, limit = 50): Promise<TrackData[]> {
  const ids: readonly bigint[] = await getTrackIds(offset, limit);
  return Promise.all(ids.map((id) => getTrack(id)));
}

export async function getTracksByOwner(owner: `0x${string}`): Promise<TrackData[]> {
  const protocol = requireProtocol();
  const ids: readonly bigint[] = await client.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTracksByOwner",
    args: [owner],
  });
  return Promise.all(ids.map((id) => getTrack(id)));
}

export async function getTokenIdForIp(ipId: `0x${string}`): Promise<bigint> {
  const protocol = requireProtocol();
  return client.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTokenIdForIp",
    args: [ipId],
  });
}

export async function getTokenURI(tokenId: string | bigint): Promise<string> {
  if (!TRACK_NFT_ADDRESS) {
    return "";
  }
  return client.readContract({
    address: TRACK_NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: "tokenURI",
    args: [parseTokenId(tokenId)],
  });
}

export async function fetchTrackMetadata(metadataURI: string): Promise<TrackMetadata | null> {
  if (!metadataURI) return null;
  try {
    if (metadataURI.startsWith("ipfs://")) {
      const cid = metadataURI.replace("ipfs://", "");
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (!res.ok) return null;
      return res.json();
    }
    if (metadataURI.startsWith("http")) {
      const res = await fetch(metadataURI);
      if (!res.ok) return null;
      return res.json();
    }
    return null;
  } catch {
    return null;
  }
}

export function shortenAddress(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) * 1000;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}
