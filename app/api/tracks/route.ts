import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { aeneid } from "@story-protocol/core-sdk";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.ankr.com/story_aeneid_testnet";
const PROTOCOL = process.env.NEXT_PUBLIC_TRACK_RAILS_PROTOCOL as `0x${string}` | undefined;

const client = createPublicClient({
  chain: aeneid,
  transport: http(RPC_URL),
});

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

interface TrackRaw {
  tokenId: string;
  ipId: `0x${string}`;
  vaultUuid: number;
  owner: `0x${string}`;
  metadataURI: string;
  licenseTermsId: string;
  timestamp: string;
  vaultLinked: boolean;
}

function parseTrack(raw: unknown, tokenId: string): TrackRaw {
  const r = raw as
    | [string, number, string, string, bigint, bigint, boolean]
    | {
        ipId: string;
        vaultUuid: number;
        owner: string;
        metadataURI: string;
        licenseTermsId: bigint;
        timestamp: bigint;
        vaultLinked: boolean;
      };
  const ipId = Array.isArray(r) ? r[0] : r.ipId;
  const vaultUuid = Array.isArray(r) ? r[1] : r.vaultUuid;
  const owner = Array.isArray(r) ? r[2] : r.owner;
  const metadataURI = Array.isArray(r) ? r[3] : r.metadataURI;
  const licenseTermsId = Array.isArray(r) ? r[4] : r.licenseTermsId;
  const timestamp = Array.isArray(r) ? r[5] : r.timestamp;
  const vaultLinked = Array.isArray(r) ? r[6] : r.vaultLinked;

  return {
    tokenId,
    ipId: ipId as `0x${string}`,
    vaultUuid,
    owner: owner as `0x${string}`,
    metadataURI,
    licenseTermsId: licenseTermsId.toString(),
    timestamp: timestamp.toString(),
    vaultLinked,
  };
}

function requireProtocol(): `0x${string}` {
  if (!PROTOCOL) {
    throw new Error("CONTRACTS_NOT_DEPLOYED");
  }
  return PROTOCOL;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const protocol = requireProtocol();

    if (action === "getAllTracks") {
      const offset = BigInt(url.searchParams.get("offset") ?? "0");
      const limit = BigInt(url.searchParams.get("limit") ?? "50");

      const ids: readonly bigint[] = await client.readContract({
        address: protocol,
        abi: PROTOCOL_ABI,
        functionName: "getTrackIds",
        args: [offset, limit],
      });

      const tracks = await Promise.all(
        ids.map(async (id) => {
          const raw = await client.readContract({
            address: protocol,
            abi: PROTOCOL_ABI,
            functionName: "getTrack",
            args: [id],
          });
          return parseTrack(raw, id.toString());
        }),
      );

      return NextResponse.json({ tracks });
    }

    if (action === "getTrack") {
      const tokenId = url.searchParams.get("tokenId");
      if (!tokenId) return NextResponse.json({ error: "Missing tokenId" }, { status: 400 });

      const raw = await client.readContract({
        address: protocol,
        abi: PROTOCOL_ABI,
        functionName: "getTrack",
        args: [BigInt(tokenId)],
      });
      return NextResponse.json(parseTrack(raw, tokenId));
    }

    if (action === "getTrackCount") {
      const count: bigint = await client.readContract({
        address: protocol,
        abi: PROTOCOL_ABI,
        functionName: "getTrackCount",
      });
      return NextResponse.json({ count: count.toString() });
    }

    if (action === "getTrackIds") {
      const offset = BigInt(url.searchParams.get("offset") ?? "0");
      const limit = BigInt(url.searchParams.get("limit") ?? "100");
      const ids: readonly bigint[] = await client.readContract({
        address: protocol,
        abi: PROTOCOL_ABI,
        functionName: "getTrackIds",
        args: [offset, limit],
      });
      return NextResponse.json({ trackIds: ids.map(String) });
    }

    if (action === "getTracksByOwner") {
      const owner = url.searchParams.get("owner") as `0x${string}` | null;
      if (!owner) return NextResponse.json({ error: "Missing owner" }, { status: 400 });

      const ids: readonly bigint[] = await client.readContract({
        address: protocol,
        abi: PROTOCOL_ABI,
        functionName: "getTracksByOwner",
        args: [owner],
      });

      const tracks = await Promise.all(
        ids.map(async (id) => {
          const raw = await client.readContract({
            address: protocol,
            abi: PROTOCOL_ABI,
            functionName: "getTrack",
            args: [id],
          });
          return parseTrack(raw, id.toString());
        }),
      );

      return NextResponse.json({ tracks });
    }

    if (action === "getTokenIdForIp") {
      const ipId = url.searchParams.get("ipId") as `0x${string}` | null;
      if (!ipId) return NextResponse.json({ error: "Missing ipId" }, { status: 400 });

      const tokenId: bigint = await client.readContract({
        address: protocol,
        abi: PROTOCOL_ABI,
        functionName: "getTokenIdForIp",
        args: [ipId],
      });
      return NextResponse.json({ tokenId: tokenId.toString() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "CONTRACTS_NOT_DEPLOYED") {
      return NextResponse.json({
        error: "Track Rails contracts are not deployed yet. " +
          "Run `forge script script/DeployTrackRails.s.sol --broadcast` first, " +
          "then set NEXT_PUBLIC_TRACK_RAILS_PROTOCOL in .env.local.",
      }, { status: 503 });
    }
    console.error("[API tracks] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
