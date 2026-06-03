import { publicClient, PROTOCOL_ADDRESS, PROTOCOL_ABI, type TrackData, type TrackMetadata } from "./client.js";

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) * 1000;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function requireProtocol(): `0x${string}` {
  if (!PROTOCOL_ADDRESS) {
    throw new Error("❌ Track Rails protocol not configured. Set NEXT_PUBLIC_TRACK_RAILS_PROTOCOL in .env");
  }
  return PROTOCOL_ADDRESS;
}

function parseTrack(raw: unknown, tokenId: string): TrackData {
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
    tokenId: BigInt(tokenId),
    ipId: ipId as `0x${string}`,
    vaultUuid: vaultUuid as number,
    owner: owner as `0x${string}`,
    metadataURI,
    licenseTermsId: licenseTermsId as bigint,
    timestamp: timestamp as bigint,
    vaultLinked,
  };
}

export async function getTrackCount(): Promise<bigint> {
  const protocol = requireProtocol();
  return publicClient.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTrackCount",
  }) as Promise<bigint>;
}

export async function getTrackIds(offset = 0, limit = 50): Promise<bigint[]> {
  const protocol = requireProtocol();
  const ids = await publicClient.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTrackIds",
    args: [BigInt(offset), BigInt(limit)],
  });
  return [...(ids as readonly bigint[])];
}

export async function getTrack(tokenId: string | bigint): Promise<TrackData> {
  const protocol = requireProtocol();
  const tid = typeof tokenId === "bigint" ? tokenId : BigInt(tokenId);
  const raw = await publicClient.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTrack",
    args: [tid],
  });
  return parseTrack(raw, tid.toString());
}

export async function getTracksByOwner(owner: `0x${string}`): Promise<TrackData[]> {
  const protocol = requireProtocol();
  const ids = await publicClient.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTracksByOwner",
    args: [owner],
  }) as readonly bigint[];
  return Promise.all([...ids].map((id) => getTrack(id)));
}

export async function getTokenIdForIp(ipId: `0x${string}`): Promise<bigint> {
  const protocol = requireProtocol();
  return publicClient.readContract({
    address: protocol,
    abi: PROTOCOL_ABI,
    functionName: "getTokenIdForIp",
    args: [ipId],
  }) as Promise<bigint>;
}

export async function fetchTrackMetadata(metadataURI: string): Promise<TrackMetadata | null> {
  if (!metadataURI) return null;
  try {
    if (metadataURI.startsWith("ipfs://")) {
      const cid = metadataURI.replace("ipfs://", "");
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (!res.ok) return null;
      return res.json() as Promise<TrackMetadata>;
    }
    if (metadataURI.startsWith("http")) {
      const res = await fetch(metadataURI);
      if (!res.ok) return null;
      return res.json() as Promise<TrackMetadata>;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatTrackEntry(track: TrackData, meta: TrackMetadata | null): string {
  const title = meta?.title ?? `Track #${track.tokenId.toString()}`;
  const artist = meta?.artist ?? shortenAddress(track.owner);
  const genre = meta?.genre ? ` 🎵 ${meta.genre}` : "";
  return [
    `🎵 *${escapeMD(title)}*`,
    `👤 ${escapeMD(artist)}${genre}`,
    `🆔 \`${track.ipId}\``,
    `📅 ${formatTimestamp(track.timestamp)}`,
    track.vaultLinked ? "🔒 Vault linked" : "🔓 No vault",
  ].join("\n");
}

function escapeMD(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export { escapeMD };
