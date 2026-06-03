import { StoryClient, WIP_TOKEN_ADDRESS } from "@story-protocol/core-sdk";
import { custom, toHex, parseEther } from "viem";
import type { WalletClient, Address, Hash } from "viem";

// ---------------------------------------------------------------------------
// Constants — Aeneid testnet contract addresses
// ---------------------------------------------------------------------------

export const STORY_CONTRACTS = {
  IP_ASSET_REGISTRY:
    "0x77319B4031e6eF1250907aa00018B8B1c67a244b" as const,
  LICENSING_MODULE:
    "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f" as const,
  ROYALTY_MODULE:
    "0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086" as const,
  LICENSE_TOKEN:
    "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC" as const,
  /** Royalty Policy LAP used for commercial revenue share */
  ROYALTY_POLICY_LAP:
    "0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E" as const,
  /** Programmable IP License template */
  PIL_TEMPLATE:
    "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316" as const,
  /** Registration workflows (SPG) */
  REGISTRATION_WORKFLOWS:
    "0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424" as const,
} as const;

/**
 * Default SPG NFT collection contract on Aeneid.
 * You can also create your own via `createNFTCollection`.
 */
export const DEFAULT_SPG_NFT_CONTRACT =
    "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc" as const;

/**
 * Track Rails Protocol contract address.
 * Set NEXT_PUBLIC_TRACK_RAILS_PROTOCOL after deploying via:
 *   forge script script/DeployTrackRails.s.sol --broadcast
 */
export const TRACK_RAILS_PROTOCOL =
    (process.env.NEXT_PUBLIC_TRACK_RAILS_PROTOCOL ?? "") as `0x${string}`;

/** WIP (Wrapped IP) token address — the ERC-20 form of native IP */
export { WIP_TOKEN_ADDRESS };

/**
 * Revenue token addresses whitelisted on Aeneid.
 * MERC20 is the standard mock ERC-20 used in Story examples.
 */
export const REVENUE_TOKENS = {
  /** MockERC20 — used for testing revenue flows */
  MERC20: "0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E" as const,
  /** Wrapped IP */
  WIP: WIP_TOKEN_ADDRESS,
} as const;

const STORY_TX_OPTIONS = {
  timeout: 600_000,
  pollingInterval: 4_000,
  retryCount: 12,
  retryDelay: 2_000,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrackMetadata {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  artworkUri?: string;
  duration?: number;
  year?: number;
}

export interface RegisterTrackParams {
  /** SPG NFT collection contract address (defaults to `DEFAULT_SPG_NFT_CONTRACT`) */
  spgNftContract?: Address;
  /** Metadata for the track (IP + NFT) */
  track: TrackMetadata;
  /** Address to receive the minted NFT (defaults to wallet) */
  recipient?: Address;
  /** Allow minting with duplicate metadata hash */
  allowDuplicates?: boolean;
}

export interface LicenseTermsConfig {
  transferable?: boolean;
  defaultMintingFee?: bigint | number;
  expiration?: bigint | number;
  commercialUse?: boolean;
  derivativesAllowed?: boolean;
  /** Revenue share percentage (0–100). 10_000_000 = 10%. */
  commercialRevShare?: number;
  commercialRevCeiling?: bigint | number;
  derivativeRevCeiling?: bigint | number;
  commercialAttribution?: boolean;
  derivativesAttribution?: boolean;
  derivativesApproval?: boolean;
  derivativesReciprocal?: boolean;
}

export interface MintLicenseTokenParams {
  licensorIpId: Address;
  licenseTermsId: bigint | number;
  amount?: number;
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

/**
 * Create a `StoryClient` from a wagmi `WalletClient`.
 *
 * Requires a connected wallet with a signer on the Aeneid testnet.
 */
export function createStoryClient(walletClient: WalletClient) {
  return StoryClient.newClient({
    wallet: walletClient,
    transport: custom(walletClient.transport),
    chainId: "aeneid",
  });
}

// ---------------------------------------------------------------------------
// SPG NFT Collection
// ---------------------------------------------------------------------------

export interface CreateCollectionParams {
  name: string;
  symbol: string;
  owner: Address;
  maxSupply?: number;
  mintFee?: bigint | number;
  mintOpen?: boolean;
  isPublicMinting?: boolean;
}

/**
 * Create a new SPG NFT collection.
 *
 * @returns The address of the newly created SPGNFT contract.
 */
export async function createNFTCollection(
  client: StoryClient,
  params: CreateCollectionParams,
): Promise<Address> {
  const {
    name,
    symbol,
    owner,
    maxSupply = 100,
    mintFee = 0,
    mintOpen = true,
    isPublicMinting = false,
  } = params;

  const response = await client.nftClient.createNFTCollection({
    name,
    symbol,
    contractURI: "",
    maxSupply,
    mintFee,
    mintFeeToken: "0x0000000000000000000000000000000000000000" as Address,
    mintFeeRecipient: owner,
    owner,
    mintOpen,
    isPublicMinting,
  });

  return response.spgNftContract as Address;
}

// ---------------------------------------------------------------------------
// Metadata helpers
// ---------------------------------------------------------------------------

/**
 * Build IP and NFT metadata from track info.
 *
 * Produces `data:` URIs and 32-byte hex hashes suitable for
 * `ipMetadata` on `mintAndRegisterIpAssetWithPilTerms`.
 */
export function buildTrackMetadata(
  track: TrackMetadata,
): {
  ipMetadataURI: string;
  ipMetadataHash: `0x${string}`;
  nftMetadataURI: string;
  nftMetadataHash: `0x${string}`;
} {
  const { title, artist, album, genre, artworkUri, duration, year } = track;

  const ipMetadata = {
    title,
    artist,
    album: album ?? "",
    genre: genre ?? "",
    duration: duration ?? 0,
    year: year ?? new Date().getFullYear(),
    description: `${title} by ${artist}${album ? ` from ${album}` : ""}`,
    type: "audio",
  };

  const nftMetadata = {
    name: title,
    description: `${title} by ${artist}`,
    image: artworkUri ?? "",
    external_url: "",
    attributes: [
      { trait_type: "Artist", value: artist },
      { trait_type: "Genre", value: genre ?? "Unknown" },
      ...(duration ? [{ trait_type: "Duration (s)", value: duration }] : []),
      ...(year ? [{ trait_type: "Year", value: year }] : []),
    ],
  };

  const ipMetadataURI = `data:application/json,${encodeURIComponent(JSON.stringify(ipMetadata))}`;
  const nftMetadataURI = `data:application/json,${encodeURIComponent(JSON.stringify(nftMetadata))}`;

  return {
    ipMetadataURI,
    ipMetadataHash: toHex(JSON.stringify(ipMetadata), { size: 32 }),
    nftMetadataURI,
    nftMetadataHash: toHex(JSON.stringify(nftMetadata), { size: 32 }),
  };
}

// ---------------------------------------------------------------------------
// IPA Registration (Track)
// ---------------------------------------------------------------------------

/**
 * Register an audio track as an IP Asset on Story Protocol.
 *
 * Mints an NFT via SPG, registers it as an IPA, and attaches default
 * commercial-remix license terms (10% rev share) — all in one call.
 *
 * @returns `{ ipId, tokenId, txHash, licenseTermsIds }`
 */
export async function registerTrack(
  client: StoryClient,
  params: RegisterTrackParams,
) {
  const {
    spgNftContract = DEFAULT_SPG_NFT_CONTRACT,
    track,
    recipient,
    allowDuplicates = true,
  } = params;

  const metadata = buildTrackMetadata(track);

  const response = await client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
    spgNftContract,
    allowDuplicates,
    licenseTermsData: [
      {
        terms: {
          transferable: true,
          defaultMintingFee: 10000000000000000, // 0.01 WIP
          expiration: 0,
          commercialUse: true,
          commercialAttribution: true,
          commercializerChecker:
            "0x0000000000000000000000000000000000000000" as Address,
          commercializerCheckerData: "0x" as Hash,
          commercialRevShare: 10_000_000, // 10%
          commercialRevCeiling: 0,
          derivativesAllowed: true,
          derivativesAttribution: true,
          derivativesApproval: false,
          derivativesReciprocal: true,
          derivativeRevCeiling: 0,
          royaltyPolicy: STORY_CONTRACTS.ROYALTY_POLICY_LAP,
          currency: WIP_TOKEN_ADDRESS,
          uri: "",
        },
      },
    ],
    ipMetadata: metadata,
    recipient,
  });

  return {
    ipId: response.ipId as Address,
    tokenId: response.tokenId,
    txHash: response.txHash as Hash,
    licenseTermsIds: (response.licenseTermsIds ?? []) as bigint[],
  };
}

// ---------------------------------------------------------------------------
// License Terms
// ---------------------------------------------------------------------------

/**
 * Register custom PIL license terms on Story Protocol.
 *
 * @returns The `licenseTermsId` of the newly registered terms.
 */
export async function registerLicenseTerms(
  client: StoryClient,
  config: LicenseTermsConfig = {},
) {
  const {
    transferable = true,
    defaultMintingFee = 0,
    expiration = 0,
    commercialUse = true,
    commercialAttribution = true,
    derivativesAllowed = true,
    derivativesAttribution = true,
    derivativesApproval = false,
    derivativesReciprocal = true,
    commercialRevShare = 10_000_000,
    commercialRevCeiling = 0,
    derivativeRevCeiling = 0,
  } = config;

  const response = await client.license.registerPILTerms({
    transferable,
    defaultMintingFee,
    expiration,
    commercialUse,
    commercialAttribution,
    commercializerChecker:
      "0x0000000000000000000000000000000000000000" as Address,
    commercializerCheckerData: "0x" as Hash,
    commercialRevShare,
    commercialRevCeiling,
    derivativesAllowed,
    derivativesAttribution,
    derivativesApproval,
    derivativesReciprocal,
    derivativeRevCeiling,
    royaltyPolicy: STORY_CONTRACTS.ROYALTY_POLICY_LAP,
    currency: WIP_TOKEN_ADDRESS,
    uri: "",
  });

  return {
    licenseTermsId: response.licenseTermsId,
    txHash: response.txHash as Hash,
  };
}

/**
 * Attach existing license terms to an IP Asset.
 *
 * Only the IPA owner can attach terms.
 */
export async function attachLicenseTerms(
  client: StoryClient,
  params: { ipId: Address; licenseTermsId: bigint | number },
) {
  const { ipId, licenseTermsId } = params;

  const response = await client.license.attachLicenseTerms({
    ipId,
    licenseTermsId,
  });

  return {
    success: response.success,
    txHash: response.txHash as Hash,
  };
}

// ---------------------------------------------------------------------------
// License Token Minting
// ---------------------------------------------------------------------------

/**
 * Mint a license token from an IP Asset.
 *
 * Handles the full prerequisite pipeline:
 * 1. Wrap IP → WIP (deposit)
 * 2. Approve RoyaltyModule to spend WIP
 * 3. Mint the license token(s)
 *
 * Note: The caller must have native IP tokens to wrap. If the deposit
 * or approve steps fail, check that your wallet has sufficient IP balance.
 *
 * @returns The minted license token IDs and transaction hashes.
 */
export async function mintLicenseToken(
  client: StoryClient,
  params: MintLicenseTokenParams,
) {
  const {
    licensorIpId,
    licenseTermsId,
    amount = 1,
  } = params;

  if (!licensorIpId || licensorIpId === "0x0000000000000000000000000000000000000000" as Address) {
    throw new Error("[Story] Invalid licensorIpId. Make sure the track has been registered as an IP Asset.");
  }

  if (!licenseTermsId || Number(licenseTermsId) === 0) {
    throw new Error("[Story] Invalid licenseTermsId. Make sure license terms are attached to the IP Asset.");
  }

  // 1. Wrap enough IP to cover fees (0.05 WIP is enough for 0.01 fee per license)
  const wrapAmount = parseEther("0.05");
  console.info("[Story] Wrapping IP → WIP...");
  const depositResult = await client.wipClient.deposit({
    amount: wrapAmount,
    txOptions: STORY_TX_OPTIONS,
  });

  // 2. Approve RoyaltyModule to spend WIP
  console.info("[Story] Approving RoyaltyModule...");
  const approveResult = await client.wipClient.approve({
    spender: STORY_CONTRACTS.ROYALTY_MODULE,
    amount: wrapAmount,
    txOptions: STORY_TX_OPTIONS,
  });

  // 3. Mint license token(s) — fee comes from the approved WIP
  const feePerLic = parseEther("0.01");
  console.info("[Story] Minting license token(s)...");
  const mintResult = await client.license.mintLicenseTokens({
    licensorIpId,
    licenseTermsId,
    amount,
    maxMintingFee: feePerLic * BigInt(amount),
    txOptions: STORY_TX_OPTIONS,
  });

  return {
    licenseTokenIds: (mintResult.licenseTokenIds ?? []) as bigint[],
    txHash: mintResult.txHash as Hash,
    depositTxHash: (depositResult as { txHash?: Hash })?.txHash,
    approveTxHash: (approveResult as { txHash?: Hash })?.txHash,
  };
}

// ---------------------------------------------------------------------------
// Revenue / Royalty
// ---------------------------------------------------------------------------

/**
 * Claim all available revenue for an IP Asset from its derivative IPs.
 *
 * @returns The amounts claimed per currency token.
 */
export async function claimRevenue(
  client: StoryClient,
  params: {
    ancestorIpId: Address;
    claimer?: Address;
    childIpIds: Address[];
    royaltyPolicies?: Address[];
    currencyTokens?: Address[];
  },
) {
  const {
    ancestorIpId,
    childIpIds,
    currencyTokens = [REVENUE_TOKENS.WIP],
  } = params;
  const claimer = params.claimer ?? ancestorIpId;
  const royaltyPolicies =
    params.royaltyPolicies ??
    childIpIds.map(() => STORY_CONTRACTS.ROYALTY_POLICY_LAP);

  if (currencyTokens.length === 0) {
    throw new Error("Select at least one revenue token to claim.");
  }

  const claimTokens =
    childIpIds.length > 0 && currencyTokens.length !== childIpIds.length
      ? childIpIds.map((_, index) => currencyTokens[index] ?? currencyTokens[0])
      : currencyTokens;

  const response = await client.royalty.claimAllRevenue({
    ancestorIpId,
    claimer,
    childIpIds,
    royaltyPolicies,
    currencyTokens: claimTokens,
    claimOptions: {
      autoTransferAllClaimedTokensFromIp: true,
      autoUnwrapIpTokens: true,
    },
  });
  const claimedTokens = response.claimedTokens ?? [];

  return {
    claimedTokens,
    totalClaimed: claimedTokens.reduce(
      (total, token) => total + token.amount,
      BigInt(0),
    ),
    txHash: response.txHashes?.[0] as Hash | undefined,
    txHashes: response.txHashes ?? [],
  };
}
