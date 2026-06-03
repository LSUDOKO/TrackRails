import {
  CDRClient,
  encryptFile,
  decryptFile,
  uuidToLabel,
} from "@piplabs/cdr-sdk";
import type { TDH2Ciphertext } from "@piplabs/cdr-sdk";
import {
  createPublicClient,
  http,
  encodeAbiParameters,
  toHex,
} from "viem";
import type { WalletClient } from "viem";
import { env } from "./env";

// ---------------------------------------------------------------------------
// Constants — Aeneid testnet contract addresses
// ---------------------------------------------------------------------------

export const CDR_CONTRACTS = {
  /** Write‑only — gates vault writes to a single owner address */
  OWNER_WRITE_CONDITION:
    "0x4C9bFC96d7092b590D497A191826C3dA2277c34B" as const,
  /** Read‑only — gates vault reads to License‑Token holders */
  LICENSE_READ_CONDITION:
    "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3" as const,
  /** ERC‑721 license token contract */
  LICENSE_TOKEN: "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC" as const,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal interface matching what CDR SDK expects for file storage */
export interface StorageProvider {
  upload(data: Uint8Array, options?: { pin?: boolean }): Promise<string>;
  download(cid: string): Promise<Uint8Array>;
}

export interface CDRClientOptions {
  walletClient?: WalletClient;
}

export interface OwnerOnlyConditions {
  writeConditionAddr: `0x${string}`;
  writeConditionData: `0x${string}`;
  readConditionAddr: `0x${string}`;
  readConditionData: `0x${string}`;
  skipConditionValidation: true;
}

export interface LicenseGatedConditions {
  writeConditionAddr: `0x${string}`;
  writeConditionData: `0x${string}`;
  readConditionAddr: `0x${string}`;
  readConditionData: `0x${string}`;
}

export interface AllocateVaultParams {
  /** Wallet address of the vault owner */
  owner: `0x${string}`;
  /** IPA ID — required when `gated: true` */
  ipId?: `0x${string}`;
  /** If true, read access requires a License Token for `ipId` */
  gated?: boolean;
  /** Allow vault contents to be updated later */
  updatable?: boolean;
}

export interface CDRInlineUploadParams {
  /** Raw data key to encrypt and store (≤1024 bytes) */
  dataKey: Uint8Array;
  owner: `0x${string}`;
  ipId?: `0x${string}`;
  gated?: boolean;
  updatable?: boolean;
}

export interface CDRFileUploadParams {
  /** Raw file content to AES‑encrypt and upload */
  content: Uint8Array;
  /** CDR‑compatible storage provider (Helia, Storacha, …) */
  storageProvider: StorageProvider;
  owner: `0x${string}`;
  ipId?: `0x${string}`;
  gated?: boolean;
  updatable?: boolean;
  /** Whether to pin the file for permanent storage */
  pin?: boolean;
}

export interface AccessCDRParams {
  uuid: number;
  /** Encoded license token IDs, e.g. `encodeAbiParameters([{ type: "uint256[]" }], [[tokenId]])` */
  accessAuxData?: `0x${string}`;
  /** Max time to wait for partial decryptions (ms) */
  timeoutMs?: number;
}

export interface DownloadFileParams {
  uuid: number;
  storageProvider: StorageProvider;
  accessAuxData?: `0x${string}`;
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

/**
 * Create a configured `CDRClient` for the Aeneid testnet.
 *
 * - Omit `walletClient` to get an **observer-only** instance
 *   (read‑only queries — no uploader/consumer).
 * - Pass a `walletClient` to enable uploader and consumer operations.
 */
export function createCDRClient(opts: CDRClientOptions = {}) {
  const publicClient = createPublicClient({
    transport: http(env.RPC_URL),
  });

  return new CDRClient({
    network: "testnet",
    publicClient,
    walletClient: opts.walletClient,
    apiUrl: env.STORY_API_URL,
  });
}

// ---------------------------------------------------------------------------
// Condition builders
// ---------------------------------------------------------------------------

/**
 * Build vault conditions for **owner-only** access.
 *
 * Write is gated by `OwnerWriteCondition` (must be the owner address).
 * Read is gated by the owner's EOA directly — no contract needed.
 * `skipConditionValidation: true` is required because an EOA has no code.
 *
 * ⚠️ These conditions CANNOT be used with `uploadCDR()` or `uploadFile()`
 *    because those methods don't accept `skipConditionValidation`.
 *    Use the low‑level `allocate()` → `encryptDataKey()` → `write()` path instead.
 */
export function buildOwnerOnlyConditions(
  owner: `0x${string}`,
): OwnerOnlyConditions {
  return {
    writeConditionAddr: CDR_CONTRACTS.OWNER_WRITE_CONDITION,
    writeConditionData: encodeAbiParameters(
      [{ type: "address" }],
      [owner],
    ),
    readConditionAddr: owner,
    readConditionData: "0x",
    skipConditionValidation: true,
  };
}

/**
 * Build vault conditions for **license‑gated** access.
 *
 * Write is gated by `OwnerWriteCondition` (must be the owner address).
 * Read is gated by `LicenseReadCondition` — caller must hold a
 * License Token for the given IPA.
 *
 * ✅ These conditions work with the high‑level `uploadCDR` and `uploadFile` methods.
 */
export function buildLicenseGatedConditions(
  owner: `0x${string}`,
  ipId: `0x${string}`,
): LicenseGatedConditions {
  return {
    writeConditionAddr: CDR_CONTRACTS.OWNER_WRITE_CONDITION,
    writeConditionData: encodeAbiParameters(
      [{ type: "address" }],
      [owner],
    ),
    readConditionAddr: CDR_CONTRACTS.LICENSE_READ_CONDITION,
    readConditionData: encodeAbiParameters(
      [{ type: "address" }, { type: "address" }],
      [CDR_CONTRACTS.LICENSE_TOKEN, ipId],
    ),
  };
}

// ---------------------------------------------------------------------------
// Vault operations
// ---------------------------------------------------------------------------

/**
 * Allocate a new CDR vault with the chosen access conditions.
 *
 * @returns `{ txHash, uuid }` — the on‑chain vault UUID.
 */
export async function allocateVault(
  client: CDRClient,
  params: AllocateVaultParams,
) {
  const { owner, ipId, gated = false, updatable = false } = params;

  if (gated && !ipId) {
    throw new Error("[CDR] ipId is required for license-gated vaults");
  }

  const conditions = gated && ipId
    ? buildLicenseGatedConditions(owner, ipId)
    : buildOwnerOnlyConditions(owner);

  return client.uploader.allocate({
    updatable,
    ...conditions,
  });
}

// ---------------------------------------------------------------------------
// High-level inline upload (< 1024 bytes)
// ---------------------------------------------------------------------------

/**
 * Result of an inline CDR upload.
 */
export interface CDRInlineUploadResult {
  uuid: number;
  ciphertext: TDH2Ciphertext;
  txHashes: { allocate: string; write: string };
}

/**
 * Encrypt a small data key (≤1024 bytes) and write it to a new CDR vault.
 *
 * - **License-gated** (`gated: true`): uses the high‑level `uploadCDR` method.
 * - **Owner-only** (`gated: false`): uses the low‑level path
 *   `allocate()` → `encryptDataKey()` → `write()` to work around
 *   EOA condition constraints.
 */
export async function createCDRVault(
  client: CDRClient,
  params: CDRInlineUploadParams,
): Promise<CDRInlineUploadResult> {
  const {
    dataKey,
    owner,
    ipId,
    gated = false,
    updatable = false,
  } = params;

  if (gated && !ipId) {
    throw new Error("[CDR] ipId is required for license-gated vaults");
  }

  // ── License‑gated: high‑level path ──────────────────────────────────
  if (gated && ipId) {
    const conditions = buildLicenseGatedConditions(owner, ipId);
    return client.uploader.uploadCDR({
      dataKey,
      updatable,
      ...conditions,
      accessAuxData: "0x",
    });
  }

  // ── Owner‑only: low‑level path (needs skipConditionValidation) ──────
  const conditions = buildOwnerOnlyConditions(owner);

  const { txHash: allocateTxHash, uuid } = await client.uploader.allocate({
    updatable,
    writeConditionAddr: conditions.writeConditionAddr,
    writeConditionData: conditions.writeConditionData,
    readConditionAddr: conditions.readConditionAddr,
    readConditionData: conditions.readConditionData,
    skipConditionValidation: conditions.skipConditionValidation,
  });

  const label = uuidToLabel(uuid);
  const ciphertext = await client.uploader.encryptDataKey({
    dataKey,
    label,
  });

  const { txHash: writeTxHash } = await client.uploader.write({
    uuid,
    accessAuxData: "0x",
    encryptedData: toHex(ciphertext.raw),
  });

  return {
    uuid,
    ciphertext,
    txHashes: { allocate: allocateTxHash, write: writeTxHash },
  };
}

// ---------------------------------------------------------------------------
// High-level file upload (audio files, large payloads)
// ---------------------------------------------------------------------------

/**
 * Result of a file CDR upload.
 */
export interface CDRFileUploadResult {
  uuid: number;
  cid: string;
  ciphertext: TDH2Ciphertext;
  txHashes: { allocate: string; write: string };
}

/**
 * AES‑encrypt a file, upload it to IPFS (or your storage provider), and
 * register the reference in a new CDR vault.
 *
 * - **License-gated** (`gated: true`): uses the high‑level `uploadFile` method.
 * - **Owner-only** (`gated: false`): uses the low‑level path
 *   `encryptFile()` → `storage.upload()` → `allocate()` → `encryptDataKey()` → `write()`.
 */
export async function uploadCDRFile(
  client: CDRClient,
  params: CDRFileUploadParams,
): Promise<CDRFileUploadResult> {
  const {
    content,
    storageProvider,
    owner,
    ipId,
    gated = false,
    updatable = false,
    pin = true,
  } = params;

  if (gated && !ipId) {
    throw new Error("[CDR] ipId is required for license-gated vaults");
  }

  // ── License‑gated: high‑level path ──────────────────────────────────
  if (gated && ipId) {
    const conditions = buildLicenseGatedConditions(owner, ipId);
    return client.uploader.uploadFile({
      content,
      storageProvider,
      updatable,
      pin,
      ...conditions,
      accessAuxData: "0x",
    });
  }

  // ── Owner‑only: low‑level path (needs skipConditionValidation) ──────
  // 1. AES‑encrypt the file
  const {
    ciphertext: encryptedContent,
    key: aesKey,
  } = encryptFile(content);

  // 2. Upload encrypted content to IPFS
  const cid = await storageProvider.upload(encryptedContent, { pin });

  // 3. Allocate vault with owner‑only conditions
  const conditions = buildOwnerOnlyConditions(owner);
  const { txHash: allocateTxHash, uuid } = await client.uploader.allocate({
    updatable,
    writeConditionAddr: conditions.writeConditionAddr,
    writeConditionData: conditions.writeConditionData,
    readConditionAddr: conditions.readConditionAddr,
    readConditionData: conditions.readConditionData,
    skipConditionValidation: conditions.skipConditionValidation,
  });

  // 4. TDH2‑encrypt the AES key and store it in the vault
  const label = uuidToLabel(uuid);
  const ciphertext = await client.uploader.encryptDataKey({
    dataKey: aesKey,
    label,
  });

  const { txHash: writeTxHash } = await client.uploader.write({
    uuid,
    accessAuxData: "0x",
    encryptedData: toHex(ciphertext.raw),
  });

  return {
    uuid,
    cid,
    ciphertext,
    txHashes: { allocate: allocateTxHash, write: writeTxHash },
  };
}

// ---------------------------------------------------------------------------
// Read / decrypt
// ---------------------------------------------------------------------------

/**
 * Result of a CDR access (read + decrypt).
 */
export interface CDRAccessResult {
  dataKey: Uint8Array;
}

/**
 * Read and decrypt a data key from a CDR vault.
 *
 * For license‑gated vaults, encode the caller's license token IDs
 * into `accessAuxData`:
 * ```
 * encodeAbiParameters([{ type: "uint256[]" }], [[BigInt(tokenId)]])
 * ```
 *
 * Includes automatic retry logic for timeout scenarios. The CDR read flow
 * can fail if not enough validators respond in time. This wrapper retries
 * once with a longer timeout before giving up.
 */
export async function accessCDR(
  client: CDRClient,
  params: AccessCDRParams,
): Promise<CDRAccessResult> {
  const { uuid, accessAuxData = "0x", timeoutMs = 120_000 } = params;

  try {
    return await client.consumer.accessCDR({
      uuid,
      accessAuxData,
      timeoutMs,
    });
  } catch (err) {
    // Retry once with a longer timeout on timeout errors
    const isTimeout =
      err instanceof Error &&
      (err.message.includes("timeout") ||
        err.message.includes("TIMEOUT") ||
        err.message.includes("PartialCollectionTimeout"));

    if (isTimeout) {
      console.warn(`[CDR] accessCDR timed out after ${timeoutMs}ms. Retrying with ${timeoutMs * 2}ms…`);
      return await client.consumer.accessCDR({
        uuid,
        accessAuxData,
        timeoutMs: timeoutMs * 2,
      });
    }

    throw err;
  }
}

/**
 * Result of downloading and decrypting a CDR file vault.
 */
export interface DownloadFileResult {
  content: Uint8Array;
  cid: string;
  txHash: `0x${string}`;
}

/**
 * Download an encrypted file from IPFS (via storage provider) and decrypt
 * it using the key from the CDR vault.
 *
 * Includes automatic retry logic for timeout scenarios.
 *
 * @returns The decrypted file content, IPFS CID, and read tx hash.
 */
export async function downloadCDRFile(
  client: CDRClient,
  params: DownloadFileParams,
): Promise<DownloadFileResult> {
  const {
    uuid,
    storageProvider,
    accessAuxData = "0x",
    timeoutMs = 120_000,
  } = params;

  try {
    return await client.consumer.downloadFile({
      uuid,
      storageProvider,
      accessAuxData,
      timeoutMs,
    });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.message.includes("timeout") ||
        err.message.includes("TIMEOUT") ||
        err.message.includes("PartialCollectionTimeout"));

    if (isTimeout) {
      console.warn(`[CDR] downloadFile timed out after ${timeoutMs}ms. Retrying with ${timeoutMs * 2}ms…`);
      return await client.consumer.downloadFile({
        uuid,
        storageProvider,
        accessAuxData,
        timeoutMs: timeoutMs * 2,
      });
    }

    throw err;
  }
}

// ---------------------------------------------------------------------------
// AES helpers (thin wrappers around CDR crypto)
// ---------------------------------------------------------------------------

export interface AesEncryptResult {
  ciphertext: Uint8Array;
  key: Uint8Array;
}

/**
 * AES-256-GCM encrypt raw content.
 * Returns `{ ciphertext, key }` where `key` is the 32-byte AES key.
 */
export function aesEncrypt(plaintext: Uint8Array): AesEncryptResult {
  return encryptFile(plaintext);
}

/**
 * AES-256-GCM decrypt content.
 * Expects `ciphertext` in CDR format: IV (12 bytes) || encrypted || GCM tag (16 bytes).
 */
export function aesDecrypt(params: {
  ciphertext: Uint8Array;
  key: Uint8Array;
}): Uint8Array {
  return decryptFile(params);
}

// ---------------------------------------------------------------------------
// accessAuxData builder
// ---------------------------------------------------------------------------

/**
 * Encode license token IDs into `accessAuxData` for CDR read conditions.
 *
 * This is what the `LicenseReadCondition` contract expects:
 * ```
 * abi.decode(accessAuxData, (uint256[]))
 * ```
 */
export function buildAccessAuxData(licenseTokenIds: bigint[]): `0x${string}` {
  return encodeAbiParameters(
    [{ type: "uint256[]" }],
    [licenseTokenIds],
  );
}
