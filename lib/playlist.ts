import { createPublicClient, http, encodeFunctionData, decodeEventLog } from "viem";
import type { WalletClient, Hash } from "viem";
import { aeneid } from "@story-protocol/core-sdk";
import { env, isContractConfigured } from "./env";
import { getTrack, fetchTrackMetadata, type TrackData, type TrackMetadata } from "./queries";

const PLAYLIST_CONTRACT = (process.env.NEXT_PUBLIC_PLAYLIST_CONTRACT ?? "") as `0x${string}`;
const PLAYLIST_CONTRACT_ENV = "NEXT_PUBLIC_PLAYLIST_CONTRACT";

function requirePlaylist(): `0x${string}` {
  if (!isContractConfigured(PLAYLIST_CONTRACT_ENV)) {
    throw new Error(
      "[Playlist] TrackRailsPlaylist contract not deployed. " +
      "Run `forge script script/DeployTrackRails.s.sol --broadcast` first, " +
      "then set NEXT_PUBLIC_PLAYLIST_CONTRACT in .env.local."
    );
  }
  return PLAYLIST_CONTRACT;
}

const publicClient = createPublicClient({
  chain: aeneid,
  transport: http(env.RPC_URL),
});

const PLAYLIST_ABI = [
  {
    type: "function", name: "createPlaylist",
    inputs: [
      { type: "string", name: "name" },
      { type: "string", name: "description" },
    ],
    outputs: [{ type: "uint256", name: "id" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "addTrack",
    inputs: [
      { type: "uint256", name: "playlistId" },
      { type: "uint256", name: "trackTokenId" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "removeTrack",
    inputs: [
      { type: "uint256", name: "playlistId" },
      { type: "uint256", name: "trackTokenId" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "getPlaylist",
    inputs: [{ type: "uint256", name: "id" }],
    outputs: [{
      type: "tuple", components: [
        { type: "uint256", name: "id" },
        { type: "string", name: "name" },
        { type: "string", name: "description" },
        { type: "address", name: "owner" },
        { type: "uint256[]", name: "trackTokenIds" },
        { type: "uint256", name: "createdAt" },
      ],
    }],
    stateMutability: "view",
  },
  {
    type: "function", name: "getPlaylistsByOwner",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "getPlaylistCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "getPlaylistIds",
    inputs: [
      { type: "uint256", name: "offset" },
      { type: "uint256", name: "limit" },
    ],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "event", name: "PlaylistCreated",
    inputs: [
      { type: "uint256", name: "id", indexed: true },
      { type: "string", name: "name", indexed: false },
      { type: "address", name: "owner", indexed: true },
    ],
  },
] as const;

export interface PlaylistData {
  id: bigint;
  name: string;
  description: string;
  owner: `0x${string}`;
  trackTokenIds: readonly bigint[];
  createdAt: bigint;
}

export interface PlaylistEntry extends PlaylistData {
  tracks: (TrackData & { meta?: TrackMetadata })[];
}

function parsePlaylist(raw: unknown): PlaylistData {
  const r = raw as [bigint, string, string, `0x${string}`, readonly bigint[], bigint];
  return {
    id: r[0],
    name: r[1],
    description: r[2],
    owner: r[3],
    trackTokenIds: r[4],
    createdAt: r[5],
  };
}

export async function createPlaylist(
  walletClient: WalletClient,
  params: { name: string; description: string },
): Promise<{ id: bigint; txHash: Hash }> {
  const { name, description } = params;
  const account = walletClient.account?.address;
  if (!account) throw new Error("[Playlist] Wallet not connected");

  const contract = requirePlaylist();

  const hash: Hash = await walletClient.sendTransaction({
    account,
    chain: aeneid,
    to: contract,
    data: encodeFunctionData({
      abi: PLAYLIST_ABI,
      functionName: "createPlaylist",
      args: [name, description],
    }),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const log = receipt.logs.find(
    (l) => l.address.toLowerCase() === contract.toLowerCase(),
  );
  if (!log) throw new Error("[Playlist] createPlaylist: no event found");

  const decoded = decodeEventLog({
    abi: PLAYLIST_ABI,
    data: log.data,
    topics: log.topics,
  });

  if (decoded.eventName !== "PlaylistCreated") {
    throw new Error("[Playlist] createPlaylist: unexpected event");
  }

  return { id: decoded.args.id, txHash: hash };
}

export async function addTrackToPlaylist(
  walletClient: WalletClient,
  params: { playlistId: bigint; trackTokenId: bigint },
): Promise<Hash> {
  const account = walletClient.account?.address;
  if (!account) throw new Error("[Playlist] Wallet not connected");

  const contract = requirePlaylist();

  const hash: Hash = await walletClient.sendTransaction({
    account,
    chain: aeneid,
    to: contract,
    data: encodeFunctionData({
      abi: PLAYLIST_ABI,
      functionName: "addTrack",
      args: [params.playlistId, params.trackTokenId],
    }),
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function getPlaylist(id: bigint): Promise<PlaylistData> {
  const contract = requirePlaylist();
  const raw = await publicClient.readContract({
    address: contract,
    abi: PLAYLIST_ABI,
    functionName: "getPlaylist",
    args: [id],
  });
  return parsePlaylist(raw);
}

export async function getPlaylistsByOwner(owner: `0x${string}`): Promise<bigint[]> {
  const contract = requirePlaylist();
  const ids = await publicClient.readContract({
    address: contract,
    abi: PLAYLIST_ABI,
    functionName: "getPlaylistsByOwner",
    args: [owner],
  });
  return [...ids];
}

export async function getPlaylistIds(offset = 0, limit = 50): Promise<bigint[]> {
  const contract = requirePlaylist();
  const ids = await publicClient.readContract({
    address: contract,
    abi: PLAYLIST_ABI,
    functionName: "getPlaylistIds",
    args: [BigInt(offset), BigInt(limit)],
  });
  return [...ids];
}

export async function getAllPlaylists(offset = 0, limit = 50): Promise<PlaylistData[]> {
  const ids = await getPlaylistIds(offset, limit);
  return Promise.all(ids.map((id) => getPlaylist(id)));
}

export async function getPlaylistWithTracks(id: bigint): Promise<PlaylistEntry> {
  const data = await getPlaylist(id);
  const tracks = await Promise.all(
    data.trackTokenIds.map(async (tid) => {
      try {
        const t = await getTrack(tid);
        const meta = (await fetchTrackMetadata(t.metadataURI)) ?? undefined;
        return { ...t, meta };
      } catch {
        return null;
      }
    }),
  );
  return { ...data, tracks: tracks.filter(Boolean) as PlaylistEntry["tracks"] };
}
