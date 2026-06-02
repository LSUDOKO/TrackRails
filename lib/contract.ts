import { createPublicClient, http, encodeFunctionData, decodeEventLog } from "viem";
import type { WalletClient, Hash } from "viem";
import { aeneid } from "@story-protocol/core-sdk";
import { env } from "./env";
import { TRACK_RAILS_PROTOCOL } from "./story";

const publicClient = createPublicClient({
  chain: aeneid,
  transport: http(env.RPC_URL),
});

const PROTOCOL_ABI = [
  {
    type: "function", name: "registerTrack",
    inputs: [
      { type: "address", name: "receiver" },
      { type: "uint32", name: "revShare" },
      { type: "string", name: "metadataURI" },
    ],
    outputs: [
      { type: "uint256", name: "tokenId" },
      { type: "address", name: "ipId" },
      { type: "uint256", name: "licenseTermsId" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "linkVault",
    inputs: [
      { type: "uint256", name: "tokenId" },
      { type: "uint32", name: "vaultUuid" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event", name: "TrackRegistered",
    inputs: [
      { type: "uint256", name: "tokenId", indexed: true },
      { type: "address", name: "ipId", indexed: true },
      { type: "address", name: "owner", indexed: true },
      { type: "uint256", name: "licenseTermsId", indexed: false },
      { type: "string", name: "metadataURI", indexed: false },
      { type: "uint256", name: "timestamp", indexed: false },
    ],
  },
] as const;

export interface RegisterTrackResult {
  tokenId: bigint;
  ipId: `0x${string}`;
  licenseTermsId: bigint;
  txHash: `0x${string}`;
}

export interface LinkVaultResult {
  txHash: `0x${string}`;
}

/**
 * Register a track via TrackRailsProtocol.registerTrack.
 */
export async function registerTrackOnProtocol(
  walletClient: WalletClient,
  params: {
    receiver: `0x${string}`;
    revShare: number;
    metadataURI: string;
  },
): Promise<RegisterTrackResult> {
  const { receiver, revShare, metadataURI } = params;
  const account = walletClient.account?.address;
  if (!account) throw new Error("[Contract] Wallet not connected");

  const hash: Hash = await walletClient.sendTransaction({
    account,
    chain: aeneid,
    to: TRACK_RAILS_PROTOCOL,
    data: encodeFunctionData({
      abi: PROTOCOL_ABI,
      functionName: "registerTrack",
      args: [receiver, revShare, metadataURI],
    }),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const log = receipt.logs.find(
    (l) => l.address.toLowerCase() === TRACK_RAILS_PROTOCOL.toLowerCase(),
  );

  if (!log) throw new Error("[Contract] registerTrack: no protocol event found");

  const decoded = decodeEventLog({
    abi: PROTOCOL_ABI,
    data: log.data,
    topics: log.topics,
  });

  if (decoded.eventName !== "TrackRegistered") {
    throw new Error("[Contract] registerTrack: unexpected event");
  }

  return {
    tokenId: decoded.args.tokenId,
    ipId: decoded.args.ipId,
    licenseTermsId: decoded.args.licenseTermsId,
    txHash: hash,
  };
}

/**
 * Link a CDR vault to a registered track via TrackRailsProtocol.linkVault.
 */
export async function linkVaultOnProtocol(
  walletClient: WalletClient,
  params: {
    tokenId: bigint;
    vaultUuid: number;
  },
): Promise<LinkVaultResult> {
  const { tokenId, vaultUuid } = params;
  const account = walletClient.account?.address;
  if (!account) throw new Error("[Contract] Wallet not connected");

  const hash: Hash = await walletClient.sendTransaction({
    account,
    chain: aeneid,
    to: TRACK_RAILS_PROTOCOL,
    data: encodeFunctionData({
      abi: PROTOCOL_ABI,
      functionName: "linkVault",
      args: [tokenId, vaultUuid],
    }),
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return { txHash: hash };
}
