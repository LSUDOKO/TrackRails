"use client";

import { createPublicClient, http } from "viem";
import { aeneid } from "@story-protocol/core-sdk";
import { CDR_CONTRACTS } from "@/lib/cdr";

const STORAGE_KEY = "trackrails:license-tokens";
const MAX_LICENSES_TO_SCAN = 100;

interface StoredLicenseTokens {
  owner: `0x${string}`;
  ipId: `0x${string}`;
  licenseTermsId: string;
  tokenIds: string[];
}

const publicClient = createPublicClient({
  chain: aeneid,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.ankr.com/story_aeneid_testnet"),
});

const LICENSE_TOKEN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ type: "address", name: "owner" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    inputs: [
      { type: "address", name: "owner" },
      { type: "uint256", name: "index" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLicenseTokenMetadata",
    inputs: [{ type: "uint256", name: "tokenId" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { type: "address", name: "licensorIpId" },
          { type: "address", name: "licenseTemplate" },
          { type: "uint256", name: "licenseTermsId" },
          { type: "bool", name: "transferable" },
          { type: "uint32", name: "commercialRevShare" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

function readStoredLicenseTokens(): StoredLicenseTokens[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredLicenseTokens(entries: StoredLicenseTokens[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveLicenseTokenIds(params: {
  owner: `0x${string}`;
  ipId: `0x${string}`;
  licenseTermsId: bigint;
  tokenIds: bigint[];
}) {
  const normalizedOwner = params.owner.toLowerCase();
  const normalizedIpId = params.ipId.toLowerCase();
  const licenseTermsId = params.licenseTermsId.toString();
  const existing = readStoredLicenseTokens();
  const previous = existing.find(
    (entry) =>
      entry.owner.toLowerCase() === normalizedOwner &&
      entry.ipId.toLowerCase() === normalizedIpId &&
      entry.licenseTermsId === licenseTermsId,
  );
  const tokenIds = new Set([
    ...(previous?.tokenIds ?? []),
    ...params.tokenIds.map((id) => id.toString()),
  ]);

  writeStoredLicenseTokens([
    {
      owner: params.owner,
      ipId: params.ipId,
      licenseTermsId,
      tokenIds: [...tokenIds],
    },
    ...existing.filter(
      (entry) =>
        entry.owner.toLowerCase() !== normalizedOwner ||
        entry.ipId.toLowerCase() !== normalizedIpId ||
        entry.licenseTermsId !== licenseTermsId,
    ),
  ]);
}

export function getSavedLicenseTokenIds(params: {
  owner: `0x${string}`;
  ipId: `0x${string}`;
  licenseTermsId: bigint;
}): bigint[] {
  const match = readStoredLicenseTokens().find(
    (entry) =>
      entry.owner.toLowerCase() === params.owner.toLowerCase() &&
      entry.ipId.toLowerCase() === params.ipId.toLowerCase() &&
      entry.licenseTermsId === params.licenseTermsId.toString(),
  );

  return (match?.tokenIds ?? []).map((id) => BigInt(id));
}

function parseLicenseMetadata(raw: unknown): {
  licensorIpId: `0x${string}`;
  licenseTermsId: bigint;
} {
  const metadata = raw as
    | [`0x${string}`, `0x${string}`, bigint, boolean, number]
    | {
        licensorIpId: `0x${string}`;
        licenseTermsId: bigint;
      };

  if (Array.isArray(metadata)) {
    return {
      licensorIpId: metadata[0],
      licenseTermsId: metadata[2],
    };
  }

  return {
    licensorIpId: metadata.licensorIpId,
    licenseTermsId: metadata.licenseTermsId,
  };
}

export async function discoverOwnedLicenseTokenIds(params: {
  owner: `0x${string}`;
  ipId: `0x${string}`;
  licenseTermsId: bigint;
}): Promise<bigint[]> {
  const saved = getSavedLicenseTokenIds(params);
  const matched = new Set(saved.map((id) => id.toString()));

  const balance = await publicClient.readContract({
    address: CDR_CONTRACTS.LICENSE_TOKEN,
    abi: LICENSE_TOKEN_ABI,
    functionName: "balanceOf",
    args: [params.owner],
  });
  const scanCount = Math.min(Number(balance), MAX_LICENSES_TO_SCAN);

  for (let index = 0; index < scanCount; index += 1) {
    const tokenId = await publicClient.readContract({
      address: CDR_CONTRACTS.LICENSE_TOKEN,
      abi: LICENSE_TOKEN_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: [params.owner, BigInt(index)],
    });

    const metadata = parseLicenseMetadata(
      await publicClient.readContract({
        address: CDR_CONTRACTS.LICENSE_TOKEN,
        abi: LICENSE_TOKEN_ABI,
        functionName: "getLicenseTokenMetadata",
        args: [tokenId],
      }),
    );

    if (
      metadata.licensorIpId.toLowerCase() === params.ipId.toLowerCase() &&
      metadata.licenseTermsId === params.licenseTermsId
    ) {
      matched.add(tokenId.toString());
    }
  }

  const tokenIds = [...matched].map((id) => BigInt(id));
  if (tokenIds.length > 0) {
    saveLicenseTokenIds({ ...params, tokenIds });
  }
  return tokenIds;
}

export async function getOwnedLicenseCount(owner: `0x${string}`): Promise<number> {
  const balance = await publicClient.readContract({
    address: CDR_CONTRACTS.LICENSE_TOKEN,
    abi: LICENSE_TOKEN_ABI,
    functionName: "balanceOf",
    args: [owner],
  });

  return Number(balance);
}
