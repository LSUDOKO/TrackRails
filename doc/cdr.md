> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# CDR SDK Overview

> Learn how to integrate Confidential Data Rails (CDR) into your application using the CDR SDK.

<Note>
  These docs track the Aeneid release of `@piplabs/cdr-sdk` (`v0.2.1`),
  available on npm.
</Note>

<Card title="Building with an AI agent? Install the CDR Skill" icon="robot" href="https://github.com/jacob-tucker/cdr-skill">
  Drop-in skill for Claude and other agents, plus three end-to-end examples
  covering the on-chain secret, encrypted file, and IP-gated flows. The fastest
  way to get a working CDR integration.
</Card>

## What is CDR?

**Confidential Data Rails (CDR)** is Story's application layer for threshold-encrypted data on Story L1. Under the hood, it uses the validator network's DKG-generated public key so you can encrypt secrets such that no single party ever holds the complete decryption key. Data can only be decrypted when a threshold number of validators collectively provide partial decryptions, with access control enforced on-chain via smart contracts. The validator-side DKG and partial decryption flows run inside `story-kernel` TEEs (Intel SGX enclaves).

CDR enables powerful use cases like:

* **Secret sharing** - encrypt and share secrets that only specific wallets can decrypt
* **Encrypted file delivery** - keep large files off-chain while storing the encrypted file key on-chain
* **Data marketplaces** - sell access to encrypted data with on-chain payment enforcement
* **IP-gated content** - tie encrypted data to IP Assets and require license tokens to decrypt

## Security and Trust Model

* **Confidentiality** - Vault payloads stay encrypted unless a threshold number
  of validators participate in decryption and the read condition passes.
* **Metadata visibility** - Vault UUIDs, condition addresses, transactions, and
  any off-chain storage pointers you disclose are not hidden by CDR.
* **Availability** - Reads can fail if enough validators do not respond before
  timeout. In that case, retry the read request or increase `timeoutMs`.
* **Forward secrecy / revocation** - Treat CDR ciphertext as bound to the
  access rules and validator set in effect when you encrypted it. If your
  access model changes, rotate or re-encrypt the content at the application
  layer.
* **Release posture** - The current public release runs on Aeneid testnet.
  Build and test integrations there, but do not treat it as a production
  confidentiality environment.

## What Ships in the Aeneid Release

The current SDK surface is centered around two workflows:

* **Data key vaults** via `uploadCDR` / `accessCDR` for small secrets stored directly on-chain
* **Encrypted files** via `uploadFile` / `downloadFile` for off-chain content with on-chain key management

The Aeneid release also includes:

* `observer`, `uploader`, and `consumer` sub-clients
* DKG state reads over the Story-API REST endpoint (`apiUrl`)
* Storage providers for Helia, gateway-backed IPFS, Storacha, and Synapse
* Validator registration, attestation queries, and SGX attestation verification utilities

## How It Works

CDR revolves around **vaults**. Each vault stores encrypted data and has two configurable access control conditions:

* **Write Condition** - determines who can store encrypted data in the vault
* **Read Condition** - determines who can request decryption of the vault's data

<Note>
  When `msg.sender` equals the configured condition address, the CDR contract
  bypasses the condition check — so setting your own wallet address as the
  condition makes a vault owner-only (other callers revert, since an EOA does
  not implement `checkWriteCondition` / `checkReadCondition`). The SDK validates
  condition addresses by default; when you intentionally use an EOA this way,
  call `allocate()` with `skipConditionValidation: true`.
</Note>

There are two common ways to use a vault:

* **On-chain secret**: store the encrypted bytes directly in the vault
* **Off-chain file**: store an encrypted file in a storage backend and keep the
  encrypted AES key plus content pointer in the vault

### Data Key Vault Flow

1. **Allocate** a vault on-chain with your desired read/write conditions
2. **Fetch** the DKG global public key from the validator network
3. **Encrypt** your data locally using TDH2 threshold encryption
4. **Write** the encrypted ciphertext to the vault on-chain

Walkthrough:
[Encrypt a Secret](/developers/cdr-sdk/encrypt-and-decrypt#encrypt-a-secret).

### Encrypted File Flow

**Upload (data owner):**

1. **Encrypt** the file locally with an AES key
2. **Upload** the encrypted file to a storage backend such as IPFS
3. **Encrypt** the AES key plus CID through CDR and write the resulting vault
   payload

**Download (authorized reader):**

1. **Read** the vault and recover the AES key payload through threshold
   decryption
2. **Download** the encrypted file from storage
3. **Decrypt** the file client-side with the recovered AES key

Walkthrough:
[Encrypt and Download a File](/developers/cdr-sdk/encrypt-and-decrypt#encrypt-and-download-a-file).

### Decryption Flow

1. **Generate** an ephemeral keypair for the decryption session
2. **Submit** a read request on-chain (validated against the read condition)
3. **Collect** partial decryptions from validators until you meet threshold
4. **Combine** the partials client-side to recover the original data key

Plaintext encryption and final decryption happen **client-side**. Validators only produce TEE-confined partial decryptions, and neither the CDR contract nor validators ever see your plaintext data.

## Access Control Patterns

### Wallet Address (Simple)

Set your wallet address as the read/write condition. Only you can encrypt/decrypt.

```typescript theme={null}
await uploader.allocate({
  updatable: false,
  writeConditionAddr: userAddress, // only you can write
  readConditionAddr: userAddress, // only you can read
  writeConditionData: "0x",
  readConditionData: "0x",
  skipConditionValidation: true,
});
```

For an end-to-end example, see
[Encrypt a Secret](/developers/cdr-sdk/encrypt-and-decrypt#encrypt-a-secret).

<Note>
  This EOA shortcut is most useful with `allocate()`. The high-level
  `uploadCDR()` / `uploadFile()` helpers validate condition contracts and
  therefore use the deployed owner-only condition contract in the examples.
</Note>

### License Token (IP-Gated)

Use the deployed `LicenseReadCondition` contract on Aeneid and encode
`abi.encode(licenseTokenAddress, ipId)` as `readConditionData`. The vault
writer typically uses the deployed `OwnerWriteCondition` contract so only the
uploader can write, while readers must present valid Story license token IDs in
`accessAuxData`.

Technical walkthrough:
[How the Story License Read Pattern Works](/developers/cdr-sdk/ip-asset-vaults#how-the-story-license-read-pattern-works).

### Custom Condition Contracts

Deploy your own condition contract implementing `checkReadCondition` and `checkWriteCondition` for advanced access control like:

* **Fixed fee** - pay a one-time fee to unlock read access
* **Time-based** - access only during a specific time window
* **Marketplace** - listing owner controls writes, purchasers can read

### Condition Helpers

The SDK includes helper encoders for common access patterns:

```typescript theme={null}
import { conditions } from "@piplabs/cdr-sdk";

conditions.ownerOnly({ address: conditionAddr, owner: "0x..." });
conditions.custom({ address: conditionAddr, conditionData: "0x..." });
conditions.open({ address: conditionAddr });
conditions.tokenGate({ address: conditionAddr, token: "0x...", minBalance: 1n });
conditions.merkle({ address: conditionAddr, root: "0x..." });
```

<Note>
  On Aeneid, `ownerOnly()` and `custom()` are the practical built-in patterns
  today. `open()`, `tokenGate()`, and `merkle()` help encode condition data,
  but you still need to deploy a matching condition contract yourself.
  `conditions.storyLicense()` is not available yet.
</Note>

For the deployed Story license-gated pattern, see
[How the Story License Read Pattern Works](/developers/cdr-sdk/ip-asset-vaults#how-the-story-license-read-pattern-works).

## Next Steps

<CardGroup cols={2}>
  <Card title="Setup" icon="gear" href="/developers/cdr-sdk/setup">
    Install the SDK from npm and initialize the client for Aeneid.
  </Card>

  <Card title="Runtime Config" icon="sliders" href="/developers/cdr-sdk/advanced-configuration">
    DKG backends, validation RPCs, system addresses, and release notes.
  </Card>

  <Card title="Encrypt & Decrypt" icon="lock" href="/developers/cdr-sdk/encrypt-and-decrypt">
    Use both the on-chain secret and encrypted-file workflows.
  </Card>

  <Card title="IP Asset Vaults" icon="certificate" href="/developers/cdr-sdk/ip-asset-vaults">
    Configure license-gated reads with Story license tokens on Aeneid.
  </Card>

  <Card title="SDK Reference" icon="book" href="/sdk-reference/cdr/overview">
    Full API reference for every CDR SDK method.
  </Card>

  <Card title="CDR Skill & Examples" icon="robot" href="https://github.com/jacob-tucker/cdr-skill">
    Install the CDR skill for your AI agent and explore three end-to-end examples.
  </Card>
</CardGroup>



> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Setup CDR Client

> Learn how to install and configure the CDR SDK.

<Note>
  These docs track the Aeneid release of `@piplabs/cdr-sdk` (`v0.2.1`).
</Note>

### Prerequisites

* Node.js 18+ and npm 8+
* Node.js 22+ if you plan to use `HeliaProvider`
* A funded wallet on Aeneid testnet
* [viem](https://www.npmjs.com/package/viem) (v2.21+) for blockchain interactions

## Install

<CodeGroup>
  ```bash npm theme={null}
  npm install @piplabs/cdr-sdk viem
  ```

  ```bash pnpm theme={null}
  pnpm add @piplabs/cdr-sdk viem
  ```

  ```bash yarn theme={null}
  yarn add @piplabs/cdr-sdk viem
  ```
</CodeGroup>

<Note>`viem` (v2.21+) is a required peer dependency.</Note>

<Note>
  Storage providers are optional and pull their own peer dependencies. Install
  them only for the backend you use: `helia`, `multiformats`, and
  `@helia/unixfs` for `HeliaProvider`, `@storacha/client` for `StorachaProvider`,
  or `@filoz/synapse-sdk` for `SynapseProvider`.
</Note>

<Note>
  If you plan to mint Story license tokens in an IP-gated flow, also install
  `@story-protocol/core-sdk`.
</Note>

## Initialize WASM

The CDR SDK uses a WebAssembly module for threshold cryptography. You must initialize it once before performing any encryption or decryption operations.

```typescript theme={null}
import { initWasm } from "@piplabs/cdr-sdk";

// Call once at application startup
await initWasm();
```

<Note>
  In a React application, initialize WASM in a provider component or top-level
  effect so it's ready before any CDR operations are attempted.
</Note>

## Browser and Bundler Guidance

* **Vite / webpack** - Import the SDK from normal ESM application code and call
  `initWasm()` before the first encryption or decryption. If your SSR build
  tries to evaluate the SDK server-side, move the import behind a client-only
  boundary.
* **Next.js / SSR** - Keep browser wallet flows in `"use client"` components.
  For route handlers or scripts that use CDR cryptography, run them in the Node
  runtime instead of Edge.
* **Edge runtime** - The current release is not documented for Edge runtimes.
  Prefer the browser or Node.js runtime on Aeneid.
* **TypeScript** - Use modern ESM resolution. `moduleResolution: "Bundler"` is
  a good default for browser apps; `moduleResolution: "NodeNext"` fits pure
  Node ESM projects.

```typescript theme={null}
// Next.js route handlers / server actions
export const runtime = "nodejs";
```

## Story-API REST Endpoint

Every `CDRClient` requires an `apiUrl` — the base URL of a Story-API REST
endpoint. The SDK reads all DKG state (active round, global public key,
threshold, participant count, registered validators, and validator
attestations) over this REST API. Contract state such as vaults and fees is
still read over the EVM `publicClient`.

| Network | Story-API REST URL          | Notes                                       |
| ------- | --------------------------- | ------------------------------------------- |
| Aeneid  | `http://172.192.41.96:1317` | Plain HTTP. May change between deployments. |

<Note>
  For production deployments you can point `apiUrl` at your own Story node's
  REST gateway instead of the shared endpoint. Configure it through an
  environment variable so it is easy to swap.
</Note>

## Create the CDR Client

The `CDRClient` provides three sub-clients:

* **`observer`** - Read-only queries (fees, vault data, DKG state). Always available.
* **`uploader`** - Encryption and vault allocation. Requires a `walletClient`.
* **`consumer`** - Decryption and read requests. Requires a `walletClient`.

### In React (Wallet Connector)

In a React app, you typically get the wallet from a connector like Privy, RainbowKit, or wagmi. Create a read-only `CDRClient` up front, and build a write-capable client on demand from the wallet's provider.

```typescript hooks/use-cdr-client.ts theme={null}
import { useMemo } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { CDRClient } from "@piplabs/cdr-sdk";

// Example using Privy — adapt for your wallet connector
import { usePrivy, useWallets } from "@privy-io/react-auth";

export function useCDRClient() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  // Read-only client — always available
  const publicClient = useMemo(
    () =>
      createPublicClient({ transport: http(process.env.NEXT_PUBLIC_RPC_URL) }),
    [],
  );

  const apiUrl = process.env.NEXT_PUBLIC_STORY_API_URL!;

  const client = useMemo(
    () => new CDRClient({ network: "testnet", publicClient, apiUrl }),
    [publicClient, apiUrl],
  );

  // Write client — created on demand from the wallet's provider
  const getWriteClient = async () => {
    if (!wallet) throw new Error("No wallet connected");
    const provider = await wallet.getEthereumProvider();
    const walletClient = createWalletClient({
      transport: custom(provider),
      account: wallet.address as `0x${string}`,
    });
    return new CDRClient({
      network: "testnet",
      publicClient,
      walletClient,
      apiUrl,
    });
  };

  return { client, publicClient, getWriteClient, address: wallet?.address };
}
```

Then in your components:

```typescript theme={null}
const { client, getWriteClient } = useCDRClient();

// Read-only operations work immediately
const vault = await client.observer.getVault(42);

// Write operations — get a write client first
const writeClient = await getWriteClient();
await writeClient.uploader.write({ uuid, accessAuxData: "0x", encryptedData });
```

### With Private Key (Backend / Scripts)

For server-side code, scripts, or CLI tools, you can use a private key directly:

```typescript theme={null}
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CDRClient } from "@piplabs/cdr-sdk";

const account = privateKeyToAccount(`0x${process.env.WALLET_PRIVATE_KEY}`);

const publicClient = createPublicClient({
  transport: http(process.env.RPC_PROVIDER_URL),
});

const walletClient = createWalletClient({
  account,
  transport: http(process.env.RPC_PROVIDER_URL),
});

const client = new CDRClient({
  network: "testnet",
  publicClient,
  walletClient,
  apiUrl: process.env.STORY_API_URL!,
});
```

### Read-Only (No Wallet)

If you only need to query vault data or DKG state, you can omit the `walletClient`:

```typescript theme={null}
const client = new CDRClient({
  network: "testnet",
  publicClient,
  apiUrl: process.env.STORY_API_URL!,
});

// observer methods work without a wallet
const vault = await client.observer.getVault(123);
const allocateFee = await client.observer.getAllocateFee();
```

<Warning>
  Attempting to use `client.uploader` or `client.consumer` without a
  `walletClient` will throw a `WalletClientRequiredError`.
</Warning>

## Network Configuration

### Supported Network

| Network | `network` param | Default RPC URL              | Story-API REST URL          | Description               |
| ------- | --------------- | ---------------------------- | --------------------------- | ------------------------- |
| Aeneid  | `"testnet"`     | `https://aeneid.storyrpc.io` | `http://172.192.41.96:1317` | Current supported release |

```typescript Testnet theme={null}
const publicClient = createPublicClient({
  transport: http("https://aeneid.storyrpc.io"),
});
const client = new CDRClient({
  network: "testnet",
  publicClient,
  apiUrl: "http://172.192.41.96:1317",
});
```

### Custom RPC URL

You can point the SDK to any Aeneid-compatible RPC endpoint by changing the
`http()` transport URL. This is useful for third-party RPC providers with
higher rate limits. The `apiUrl` is configured independently — point it at the
shared Story-API endpoint or your own Story node's REST gateway.

```typescript theme={null}
const publicClient = createPublicClient({
  transport: http("https://your-aeneid-rpc.example.com"),
});
const walletClient = createWalletClient({
  account,
  transport: http("https://your-aeneid-rpc.example.com"),
});

// Use "testnet"
const client = new CDRClient({
  network: "testnet",
  publicClient,
  walletClient,
  apiUrl: "http://172.192.41.96:1317",
});
```

### Using Environment Variables

A common pattern is to configure the network via environment variables:

```typescript config.ts theme={null}
const RPC_URL = process.env.RPC_URL ?? "https://aeneid.storyrpc.io";
const STORY_API_URL = process.env.STORY_API_URL ?? "http://172.192.41.96:1317";
const NETWORK = (process.env.NETWORK ?? "testnet") as "testnet";

const publicClient = createPublicClient({ transport: http(RPC_URL) });
const client = new CDRClient({
  network: NETWORK,
  publicClient,
  apiUrl: STORY_API_URL,
});
```

```bash .env theme={null}
# Testnet (default)
RPC_URL=https://aeneid.storyrpc.io
STORY_API_URL=http://172.192.41.96:1317
NETWORK=testnet

# Alternate Aeneid RPC
RPC_URL=https://your-aeneid-rpc.example.com
STORY_API_URL=http://your-story-node:1317
NETWORK=testnet
```

## Quick Start: End-to-End Secret Example

The script below creates an owner-only vault, writes a small secret, then reads
it back with the same wallet. It is fully runnable once `WALLET_PRIVATE_KEY` is
set.

```typescript quickstart-cdr.ts theme={null}
import { CDRClient, initWasm, uuidToLabel } from "@piplabs/cdr-sdk";
import {
  createPublicClient,
  createWalletClient,
  http,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = process.env.RPC_URL ?? "https://aeneid.storyrpc.io";
const STORY_API_URL = process.env.STORY_API_URL ?? "http://172.192.41.96:1317";
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY as `0x${string}` | undefined;

if (!PRIVATE_KEY) {
  throw new Error("Set WALLET_PRIVATE_KEY before running this script.");
}

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ transport: http(RPC_URL) });
const walletClient = createWalletClient({
  account,
  transport: http(RPC_URL),
});

await initWasm();

const client = new CDRClient({
  network: "testnet",
  publicClient,
  walletClient,
  apiUrl: STORY_API_URL,
});

// Use the wallet (EOA) address as both write and read condition. Only this
// EOA can encrypt to or decrypt from the vault.
const { uuid, txHash: allocateTx } = await client.uploader.allocate({
  updatable: false,
  writeConditionAddr: account.address,
  readConditionAddr: account.address,
  writeConditionData: "0x",
  readConditionData: "0x",
  skipConditionValidation: true,
});

const globalPubKey = await client.observer.getGlobalPubKey();
const ciphertext = await client.uploader.encryptDataKey({
  dataKey: new TextEncoder().encode("hello from CDR"),
  globalPubKey,
  label: uuidToLabel(uuid),
});

const { txHash: writeTx } = await client.uploader.write({
  uuid,
  accessAuxData: "0x",
  encryptedData: toHex(ciphertext.raw),
});

console.log("Vault UUID:", uuid);
console.log("Allocate tx:", allocateTx);
console.log("Write tx:", writeTx);

const { dataKey, txHash } = await client.consumer.accessCDR({
  uuid,
  accessAuxData: "0x",
  timeoutMs: 120_000,
});

console.log("Read tx:", txHash);
console.log("Recovered secret:", new TextDecoder().decode(dataKey));
```

<Note>
  This example sends three transactions total: `allocate()`, `write()`, and
  `read()`. For larger payloads, switch to `uploadFile()` / `downloadFile()`
  with deployed condition contracts (such as the Story license-gated pattern
  in [IP Asset Vaults](/developers/cdr-sdk/ip-asset-vaults)).
</Note>

<Note>
  Any EOA address works as a write or read condition — only that EOA can
  perform the matching action. The high-level `uploadCDR()` / `uploadFile()`
  helpers validate that condition addresses point at deployed contracts, so
  EOA conditions go through the low-level `allocate()` call with
  `skipConditionValidation: true`.
</Note>

## Next Steps

* For network-side runtime behavior, see
  [Runtime Configuration](/developers/cdr-sdk/advanced-configuration).
* For the main integration flows, continue to
  [Encrypt & Decrypt](/developers/cdr-sdk/encrypt-and-decrypt).

## Error Handling

The SDK throws typed errors you can catch and handle:

| Error Class                     | Code                         | When                                                                       |
| ------------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `CDRError`                      | varies                       | Base class for all SDK-specific errors                                     |
| `WalletClientRequiredError`     | `WALLET_CLIENT_REQUIRED`     | Accessing `uploader` or `consumer` without a `walletClient`                |
| `InvalidParamsError`            | `INVALID_PARAMS`             | Invalid parameter combinations, such as only passing one keypair parameter |
| `InvalidConditionContractError` | `INVALID_CONDITION_CONTRACT` | Condition address does not implement the required interface                |
| `LabelMismatchError`            | `LABEL_MISMATCH`             | Ciphertext label does not match the vault UUID                             |
| `ContentSizeExceededError`      | `CONTENT_SIZE_EXCEEDED`      | Encrypted data exceeds `maxEncryptedDataSize`                              |
| `EmptyVaultError`               | `EMPTY_VAULT`                | Reading a vault that has never been written to                             |
| `PartialCollectionTimeoutError` | `PARTIAL_COLLECTION_TIMEOUT` | `collectPartials` or `accessCDR` times out waiting for validator responses |
| `CidIntegrityError`             | `CID_INTEGRITY`              | Downloaded encrypted file does not match the vault CID                     |

<Note>
  On-chain transaction reverts (for example, a failed condition check) surface
  as the underlying `viem` contract errors, not a CDR-specific error class.
</Note>

All errors extend `CDRError`, which has a `code` property for programmatic handling:

```typescript theme={null}
import { CDRError, PartialCollectionTimeoutError } from "@piplabs/cdr-sdk";

try {
  const { dataKey } = await client.consumer.accessCDR({ ... });
} catch (err) {
  if (err instanceof PartialCollectionTimeoutError) {
    console.error("Not enough validators responded in time. Try increasing timeoutMs.");
  } else if (err instanceof CDRError) {
    console.error(`CDR error [${err.code}]: ${err.message}`);
  }
}
```

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Runtime Configuration

> Story-API endpoint, DKG state, threshold tuning, system addresses, and Aeneid runtime notes for the CDR SDK.

<Note>
  This page covers the release-specific and operational details that sit beyond
  basic setup. Start with [Setup CDR Client](/developers/cdr-sdk/setup) first.
</Note>

## DKG State and the Story-API Endpoint

The SDK reads state from two backends:

| Backend            | Configured by  | What it reads                                                                    |
| ------------------ | -------------- | -------------------------------------------------------------------------------- |
| **EVM**            | `publicClient` | CDR contract state — vaults, fees, `maxEncryptedDataSize`, operational threshold |
| **Story-API REST** | `apiUrl`       | DKG state — active round, global public key, threshold, validators, attestations |

The `apiUrl` is a **required** `CDRClient` parameter. It is the base URL of a
Story-API REST endpoint, and the `observer` uses it for every DKG read.

```typescript theme={null}
const client = new CDRClient({
  network: "testnet",
  publicClient,
  walletClient,
  apiUrl: "http://172.192.41.96:1317",
});
```

For production deployments, point `apiUrl` at your own Story node's REST
gateway rather than the shared endpoint. See
[Story-API REST Endpoint](/developers/cdr-sdk/setup#story-api-rest-endpoint)
for the per-network values.

<Note>
  The `observer` caches round-keyed DKG snapshots for rounds in the stable
  Active and Ended stages, with in-flight request deduplication. The active
  round itself is always re-fetched, since it can transition at any time.
</Note>

## Threshold Tuning

By default the SDK uses the network's own DKG threshold when combining partial
decryptions. You can raise the bar with the optional `minThresholdRatio`
parameter, a value in `[0, 1]`:

```typescript theme={null}
const client = new CDRClient({
  network: "testnet",
  publicClient,
  walletClient,
  apiUrl: "http://172.192.41.96:1317",
  minThresholdRatio: 0.67,
});
```

The effective threshold becomes
`max(network.threshold, ceil(participants * minThresholdRatio))`.

<Warning>
  Values above `1` would require more partials than there are participants,
  causing `collectPartials` / `accessCDR` to time out forever. The SDK rejects
  them.
</Warning>

## Contract Addresses

The current Aeneid release uses the following core system addresses:

| Contract | Address                                      |
| -------- | -------------------------------------------- |
| DKG      | `0xCcCcCC0000000000000000000000000000000004` |
| CDR      | `0xCcCcCC0000000000000000000000000000000005` |

The SDK already knows these addresses. For Story license-gated condition
contracts, see
[How the Story License Read Pattern Works](/developers/cdr-sdk/ip-asset-vaults#how-the-story-license-read-pattern-works).

## Release Posture and Availability

* Aeneid is the current public **testnet** release for the SDK.
* Confidentiality depends on the DKG threshold and validator / enclave trust
  assumptions described in the CDR overview.
* Availability depends on enough validators responding before timeout. If reads
  fail to reach threshold, retry or increase `timeoutMs`.
* DKG reads depend on the `apiUrl` Story-API endpoint being correct and
  reachable. Point it at a node you trust for production use.

## Current Release Notes

* Story license-gated vaults still require manual condition encoding.
* The CDR SDK does not auto-wrap IP to WIP or auto-approve WIP for license
  minting.
* `accessCDR()` can auto-generate the ephemeral keypair and query `threshold`
  when those params are omitted.
* `createVault` / `readVault` / `createFileVault` / `readFileVault` are
  available as high-level aliases.
* `getRegisteredValidators()` only includes validators whose registration is
  fully ratified (`status = Finalized`).
* `timeoutMs: 120_000` is a good starting point for `accessCDR()` and
  `downloadFile()`.


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Encrypt & Decrypt

> Learn how to encrypt a secret and decrypt it using CDR threshold decryption.

This guide walks through the two main CDR flows:

* `uploadCDR` / `accessCDR` for small secrets stored directly on-chain
* `uploadFile` / `downloadFile` for larger encrypted files stored off-chain

### Prerequisites

* [CDR SDK setup](/developers/cdr-sdk/setup) complete with WASM initialized and client created

## What Runs On-Chain vs Off-Chain

| Operation                    | Sends transaction?           | What happens                                                               |
| ---------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `observer.getGlobalPubKey()` | No                           | Pure read of DKG state over the Story-API REST endpoint                    |
| `uploadCDR()`                | Yes, 2 txs                   | Local TDH2 encryption plus `allocate()` and `write()`                      |
| `uploadFile()`               | Yes, 2 txs + storage upload  | Local AES encryption, storage upload, then `allocate()` and `write()`      |
| `accessCDR()`                | Yes, 1 tx                    | `read()` on-chain, then off-chain partial collection and local combination |
| `downloadFile()`             | Yes, 1 tx + storage download | `accessCDR()` plus encrypted file download and local AES decryption        |

## Encrypt a Secret

The diagram below shows the on-chain secret flow: allocate a vault, encrypt the
secret locally with TDH2, and write the ciphertext to the vault.

<Frame>
  <img src="https://mintcdn.com/story/3cCXy3jIAaxk6hza/images/developers/cdr-sdk/cdr-encryption-flow-text.png?fit=max&auto=format&n=3cCXy3jIAaxk6hza&q=85&s=d9622b896f0d1a9ba69939a13d34b4e5" alt="CDR encryption flow showing vault allocation, local encryption, and writing the ciphertext to the vault" width="1054" height="974" data-path="images/developers/cdr-sdk/cdr-encryption-flow-text.png" />
</Frame>

The simplest "owner-only" pattern uses your wallet (EOA) address as both the
write and read condition. The CDR contract bypasses the condition check when
`msg.sender` equals the configured condition address, so only that wallet can
write or read the vault. Because the high-level `uploadCDR()` helper validates
that condition addresses point at deployed condition contracts, EOA conditions
are configured through the low-level `allocate()` call with
`skipConditionValidation: true`.

```typescript theme={null}
import { initWasm, uuidToLabel } from "@piplabs/cdr-sdk";
import { toHex } from "viem";

await initWasm();

// Assumes `client` and `walletClient` are already created (see Setup)
const { uploader, observer } = client;
const walletAddress = walletClient.account!.address;

// Pure read: fetch the DKG global public key
const globalPubKey = await observer.getGlobalPubKey();

// Encode your secret as bytes
const secret = "my confidential data";
const dataKey = new TextEncoder().encode(secret);

// On-chain transaction: allocate a vault using the wallet address as the
// write AND read condition. Only this EOA can write or read.
const { uuid, txHash: allocateTx } = await uploader.allocate({
  updatable: false,
  writeConditionAddr: walletAddress,
  readConditionAddr: walletAddress,
  writeConditionData: "0x",
  readConditionData: "0x",
  skipConditionValidation: true,
});

// Local: TDH2-encrypt the secret, bound to this vault's UUID
const label = uuidToLabel(uuid);
const ciphertext = await uploader.encryptDataKey({
  dataKey,
  globalPubKey,
  label,
});

// On-chain transaction: write encrypted data to the vault
const { txHash: writeTx } = await uploader.write({
  uuid,
  accessAuxData: "0x",
  encryptedData: toHex(ciphertext.raw),
});

console.log(`Vault created with UUID: ${uuid}`);
console.log(`Allocate tx: ${allocateTx}`);
console.log(`Write tx: ${writeTx}`);
```

<Note>
  Any EOA address works as a write or read condition — only that EOA can
  perform the matching action. To gate just one side, set your wallet address
  on that side and a condition contract (such as `LicenseReadCondition`) on the
  other. The high-level `uploadCDR()` helper expects deployed condition
  contracts on both sides and does not support EOA conditions, so use it for
  patterns like Story license-gated reads (see [IP Asset
  Vaults](/developers/cdr-sdk/ip-asset-vaults)) and use the low-level
  `allocate()` + `write()` flow above for owner-only EOA conditions.
</Note>

<Note>The value of the transaction must be exactly the same as the fee.</Note>

<Note>
  `dataKey` is the historical parameter name. In `encryptDataKey()` it can be
  any secret bytes, not just a cryptographic key.
</Note>

<Warning>
  Vault encrypted data is limited to **1024 bytes** on Aeneid
  (`maxEncryptedDataSize`). TDH2 adds overhead, so the maximum plaintext is
  smaller. For larger content, use `uploadFile()` so only a small `{cid, key}`
  payload is written to the vault.
</Warning>

## Decrypt a Secret

Decryption requires submitting a read request on-chain, collecting partial
decryptions from validators, and combining them client-side.

<Frame>
  <img src="https://mintcdn.com/story/3cCXy3jIAaxk6hza/images/developers/cdr-sdk/cdr-decryption-flow-text.png?fit=max&auto=format&n=3cCXy3jIAaxk6hza&q=85&s=4c908e837c122d3a7f0dd04b0056053e" alt="CDR decryption flow showing ephemeral key generation, access control check, partial decryptions from validators, and client-side combination" width="1108" height="854" data-path="images/developers/cdr-sdk/cdr-decryption-flow-text.png" />
</Frame>

```typescript theme={null}
const { consumer } = client;

// Sends 1 transaction, then collects partials and combines them locally
const { dataKey, txHash } = await consumer.accessCDR({
  uuid,
  accessAuxData: "0x",
  timeoutMs: 120_000, // wait up to 2 minutes for validators
});

const secret = new TextDecoder().decode(dataKey);
console.log(`Read tx: ${txHash}`);
console.log(`Decrypted secret: ${secret}`);
```

<Note>
  `accessCDR()` auto-generates the ephemeral keypair and auto-queries
  `globalPubKey` when you omit them. The threshold is derived automatically
  from the partial-decryption bucket's DKG round.
</Note>

<Note>
  The timeout of the request on the server side is 200 blocks, which is
  approximately 7 minutes. If you're not able to collect enough partials within
  this timeout, try another read request.
</Note>

<Accordion title="Advanced: Manual Keypair Control" icon="key">
  ```typescript theme={null}
  import { secp256k1 } from "@noble/curves/secp256k1";
  import { toHex } from "viem";

  const { consumer, observer } = client;

  const globalPubKey = await observer.getGlobalPubKey();

  const recipientPrivKey = secp256k1.utils.randomPrivateKey();
  const requesterPubKey = toHex(
  secp256k1.getPublicKey(recipientPrivKey, false),
  );

  const { dataKey, txHash } = await consumer.accessCDR({
  uuid,
  accessAuxData: "0x",
  requesterPubKey,
  recipientPrivKey,
  globalPubKey,
  timeoutMs: 120_000,
  });

  console.log(`Read tx: ${txHash}`);
  console.log(new TextDecoder().decode(dataKey));

  ```
</Accordion>

## Encrypt and Download a File

<Columns cols={2}>
  <Frame>
    <img src="https://mintcdn.com/story/3cCXy3jIAaxk6hza/images/developers/cdr-sdk/cdr-encryption-flow-file.png?fit=max&auto=format&n=3cCXy3jIAaxk6hza&q=85&s=3d499a1c349e061ddcfde701f5f56b93" alt="CDR encryption flow showing vault allocation, local encryption, and writing the encrypted key plus data URL to the vault" width="1378" height="1234" data-path="images/developers/cdr-sdk/cdr-encryption-flow-file.png" />
  </Frame>

  <Frame>
    <img src="https://mintcdn.com/story/3cCXy3jIAaxk6hza/images/developers/cdr-sdk/cdr-decryption-flow-file.png?fit=max&auto=format&n=3cCXy3jIAaxk6hza&q=85&s=dd18da8faa8063a127799b09b3631030" alt="CDR decryption flow showing ephemeral key generation, access control check, partial decryptions from validators, and client-side combination" width="1560" height="1378" data-path="images/developers/cdr-sdk/cdr-decryption-flow-file.png" />
  </Frame>
</Columns>

Use the file workflow when the encrypted payload should live off-chain and only
the encrypted file key plus pointer should be stored in the vault.

Upload happens once by the data owner. Download happens later by an authorized
reader who recovers the vault payload and then decrypts the stored file.

The `uploadFile()` helper requires deployed condition contracts on both sides,
so the example below uses Story's `OwnerWriteCondition` for the write side and
`LicenseReadCondition` for the read side. License token holders can decrypt
the file (see [IP Asset Vaults](/developers/cdr-sdk/ip-asset-vaults) for the
end-to-end license setup). For an owner-only file flow, replicate the
low-level steps shown earlier with your wallet (EOA) address as both
conditions.

```typescript theme={null}
import { HeliaProvider } from "@piplabs/cdr-sdk";
import { readFile, writeFile } from "node:fs/promises";
import { createHelia } from "helia";
import { unixfs } from "@helia/unixfs";
import { CID } from "multiformats/cid";
import { encodeAbiParameters } from "viem";

const uploaderAddress = walletClient.account!.address;
const OWNER_WRITE_CONDITION = "0x4C9bFC96d7092b590D497A191826C3dA2277c34B";
const LICENSE_READ_CONDITION = "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3";
const LICENSE_TOKEN = "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC";

const writeConditionData = encodeAbiParameters(
  [{ type: "address" }],
  [uploaderAddress],
);

const readConditionData = encodeAbiParameters(
  [{ type: "address" }, { type: "address" }],
  [LICENSE_TOKEN, ipId],
);

// Pure read
const globalPubKey = await client.observer.getGlobalPubKey();

const helia = await createHelia();
const storage = new HeliaProvider({
  helia,
  unixfs: unixfs(helia),
  CID: (s) => CID.parse(s),
});

const sourceFile = await readFile("./example.pdf");

// Off-chain upload + 2 on-chain transactions
const { uuid, cid } = await client.uploader.uploadFile({
  content: new Uint8Array(sourceFile),
  storageProvider: storage,
  globalPubKey,
  updatable: false,
  writeConditionAddr: OWNER_WRITE_CONDITION,
  readConditionAddr: LICENSE_READ_CONDITION,
  writeConditionData,
  readConditionData,
  accessAuxData: "0x",
});

// 1 on-chain read transaction + off-chain download + local AES decryption
const { content, txHash } = await client.consumer.downloadFile({
  uuid,
  accessAuxData: "0x",
  storageProvider: storage,
  timeoutMs: 120_000,
});

console.log(`Stored at CID: ${cid}`);
console.log(`Read tx: ${txHash}`);
await writeFile("./example.decrypted.pdf", Buffer.from(content));
console.log("Decrypted file written to ./example.decrypted.pdf");
```

<Note>
  `HeliaProvider` is the only storage backend fully tested on Aeneid in the
  current release, and it requires Node.js 22+.
</Note>

<Note>
  `uploadFile()` and `downloadFile()` work with raw file bytes. In a browser,
  start from a `File` object and convert it with `new Uint8Array(await
      file.arrayBuffer())`.
</Note>

### Storage Providers

The encrypted-file workflow supports four storage backends:

* `HeliaProvider` for in-process IPFS. This is the best starting point for
  development and the only backend fully tested on Aeneid so far.
* `GatewayProvider` for an external IPFS HTTP API plus a gateway URL.
* `StorachaProvider` for Storacha / `web3.storage`.
* `SynapseProvider` for Filecoin-backed storage via Synapse.

<Note>
  If you use `HeliaProvider`, pass the `CID.parse` function into the constructor
  as shown above to avoid class mismatches.
</Note>

## Step-by-Step (Low-Level)

If you need more control over the process, you can call each step individually.

<Note>
  These snippets continue from the variables in the examples above:
  `walletClient`, `globalPubKey`, `requesterPubKey`, `recipientPrivKey`, and
  `dataKey`.
</Note>

### Encrypt (Low-Level)

```typescript theme={null}
import { uuidToLabel } from "@piplabs/cdr-sdk";
import { toHex } from "viem";

const walletAddress = walletClient.account!.address;

// On-chain transaction: allocate a vault using the wallet address as the
// write AND read condition. Only this EOA can write or read.
const { txHash: allocateTx, uuid } = await uploader.allocate({
  updatable: false,
  writeConditionAddr: walletAddress,
  readConditionAddr: walletAddress,
  writeConditionData: "0x",
  readConditionData: "0x",
  skipConditionValidation: true,
});

// Local: derive the label from the UUID
const label = uuidToLabel(uuid);

// Local: TDH2 encrypt the secret
const ciphertext = await uploader.encryptDataKey({
  dataKey,
  globalPubKey,
  label,
});

// On-chain transaction: write encrypted data to the vault
const { txHash: writeTx } = await uploader.write({
  uuid,
  accessAuxData: "0x",
  encryptedData: toHex(ciphertext.raw),
});
```

### Decrypt (Low-Level)

```typescript theme={null}
import { uuidToLabel } from "@piplabs/cdr-sdk";

// On-chain transaction: submit read request
const { txHash: readTx } = await consumer.read({
  uuid,
  accessAuxData: "0x",
  requesterPubKey,
});

// Off-chain: poll the Story-API endpoint for validator partial decryptions.
// The required threshold is derived from the bucket's own DKG round.
const partials = await consumer.collectPartials({
  uuid,
  requesterPubKey, // the secp256k1 pubkey used in the read request
  timeoutMs: 120_000,
});

// Pure read: fetch the vault ciphertext
const label = uuidToLabel(uuid);
const vault = await observer.getVault(uuid);

// Local: decrypt each partial, then combine them
const recoveredDataKey = await consumer.decryptDataKey({
  ciphertext: {
    raw: Uint8Array.from(Buffer.from(vault.encryptedData.slice(2), "hex")),
    label,
  },
  partials,
  recipientPrivKey,
  globalPubKey,
  label,
});
```

## Query DKG State

You can query DKG state and fees without a wallet or WASM initialization:

```typescript theme={null}
import { createPublicClient, http } from "viem";
import { CDRClient } from "@piplabs/cdr-sdk";

const publicClient = createPublicClient({
  transport: http("https://aeneid.storyrpc.io"),
});
const client = new CDRClient({
  network: "testnet",
  publicClient,
  apiUrl: "http://172.192.41.96:1317",
});

const threshold = await client.observer.getOperationalThreshold();
console.log("Operational threshold:", threshold);

const [allocateFee, writeFee, readFee] = await Promise.all([
  client.observer.getAllocateFee(),
  client.observer.getWriteFee(),
  client.observer.getReadFee(),
]);
console.log(
  `Fees — allocate: ${allocateFee}, write: ${writeFee}, read: ${readFee}`,
);

// Query a specific vault
const vault = await client.observer.getVault(1);
console.log("Vault:", vault);
```

## Understanding Fees

Each CDR operation has an on-chain fee:

| Operation | Fee Query                   | Description                      |
| --------- | --------------------------- | -------------------------------- |
| Allocate  | `observer.getAllocateFee()` | One-time cost to create a vault  |
| Write     | `observer.getWriteFee()`    | Cost per write to a vault        |
| Read      | `observer.getReadFee()`     | Cost per read/decryption request |

Fees are paid in native tokens (wei) and are sent as `msg.value` with each transaction.


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# IP Asset Vaults

> Learn how to create CDR vaults backed by IP Assets that require license tokens to decrypt.

CDR vaults can be gated behind Story Protocol license tokens so that only
license holders can decrypt the vault contents. In the current Aeneid release,
this is a manual integration: you encode the CDR condition data yourself and
mint Story license tokens separately.

### Prerequisites

* [CDR SDK setup](/developers/cdr-sdk/setup) complete
* `@story-protocol/core-sdk` installed if you plan to mint license tokens in code
* Familiarity with [IP Assets](/concepts/ip-asset) and [License Tokens](/concepts/licensing-module/license-token)

## Aeneid Contracts

| Contract             | Address                                      |
| -------------------- | -------------------------------------------- |
| OwnerWriteCondition  | `0x4C9bFC96d7092b590D497A191826C3dA2277c34B` |
| LicenseReadCondition | `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3` |
| LicenseToken         | `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC` |

## How the Story License Read Pattern Works

Every CDR vault has a `writeConditionAddr` and `readConditionAddr`. For a
Story license-gated vault on Aeneid:

* `writeConditionAddr` usually points at `OwnerWriteCondition`, with
  `writeConditionData = abi.encode(ownerAddress)`
* `readConditionAddr` points at `LicenseReadCondition`, with
  `readConditionData = abi.encode(licenseTokenAddress, ipId)`
* `accessAuxData` at read time is
  `abi.encode(uint256[] licenseTokenIds)`

The CDR SDK does not register the IP Asset or mint the license token for you.
Create the IP and obtain its `ipId` with Story tooling first, then configure
the vault.

If you have not registered the asset yet, start with
[Register IP Asset](/developers/typescript-sdk/register-ip-asset). If you need
to attach or inspect license terms before minting, see
[Attach Terms](/developers/typescript-sdk/attach-terms).

## Upload a License-Gated Vault

```typescript theme={null}
import { encodeAbiParameters } from "viem";

const globalPubKey = await client.observer.getGlobalPubKey();
const dataKey = new TextEncoder().encode("confidential IP content");

const writeCondData = encodeAbiParameters(
  [{ type: "address" }],
  [uploaderAddress],
);

const readCondData = encodeAbiParameters(
  [{ type: "address" }, { type: "address" }],
  [
    "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC",
    ipId,
  ],
);

await client.uploader.uploadCDR({
  dataKey,
  globalPubKey,
  updatable: false,
  writeConditionAddr: "0x4C9bFC96d7092b590D497A191826C3dA2277c34B",
  writeConditionData: writeCondData,
  readConditionAddr: "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3",
  readConditionData: readCondData,
  accessAuxData: "0x",
});
```

<Note>
  The same condition setup works with `uploadFile()` if the encrypted content
  lives off-chain.
</Note>

## Mint a License Token Before Reading

Before a user can read a Story license-gated vault, they still need to mint a
license token. The Story core SDK's `wipClient` handles the WIP wrap and
approval steps so the reader can wrap IP, approve the RoyaltyModule, and mint
in three short calls.

**WIP** is **Wrapped IP**, the ERC-20 wrapped form of the native `IP` token.
Story's royalty / license flows use WIP, so the reader first wraps IP, then
approves the RoyaltyModule to spend it.

```typescript theme={null}
import { parseEther, http } from "viem";
import { StoryClient } from "@story-protocol/core-sdk";

const ROYALTY_MODULE = "0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086";

const storyClient = StoryClient.newClient({
  transport: http("https://aeneid.storyrpc.io"),
  account: readerAccount,
  chainId: "aeneid",
});

// 1. Wrap 1 IP → 1 WIP so the mint fee can be paid in WIP.
await storyClient.wipClient.deposit({
  amount: parseEther("1"),
});

// 2. Approve the RoyaltyModule to spend WIP for the mint.
await storyClient.wipClient.approve({
  spender: ROYALTY_MODULE,
  amount: parseEther("1"),
});

// 3. Mint the Story license token.
const mintResult = await storyClient.license.mintLicenseTokens({
  licensorIpId: ipId,
  licenseTermsId: BigInt(2054),
  amount: 1,
});

const licenseTokenId = mintResult.licenseTokenIds![0];
```

<Note>
  `licenseTermsId: 2054` is only an example. Replace it with the license terms
  ID actually attached to your IP Asset. You receive that ID when you register
  the asset or attach terms.
</Note>

<Note>
  The wrap, approve, and mint calls above are all on-chain transactions. The
  later `accessCDR()` call adds one more on-chain read request.
</Note>

## Read with a License Token

At read time, pass the caller's license token ID through `accessAuxData`.

```typescript theme={null}
import { encodeAbiParameters } from "viem";

const accessAuxData = encodeAbiParameters(
  [{ type: "uint256[]" }],
  [[BigInt(licenseTokenId)]],
);

// Sends 1 read transaction, then collects partials and combines locally
const { dataKey } = await client.consumer.accessCDR({
  uuid,
  accessAuxData,
  timeoutMs: 120_000,
});

const content = new TextDecoder().decode(dataKey);
console.log(`Decrypted IP content: ${content}`);
```

<Warning>
  If the caller does not hold a valid license token for the vault's IP Asset,
  the read request reverts on-chain and validators will not produce partial
  decryptions.
</Warning>

## Custom Condition Contracts

License gating is just one pattern. You can deploy your own condition contract
for any access control logic by implementing one or both of these interfaces:

```solidity theme={null}
interface ICDRWriteCondition {
    function checkWriteCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata conditionData,
        address caller
    ) external view returns (bool);
}

interface ICDRReadCondition {
    function checkReadCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata conditionData,
        address caller
    ) external view returns (bool);
}
```

The CDR contract calls these functions before allowing a `write()` or `read()` operation. Return `true` to allow, `false` to deny. Then pass your contract's address as `readConditionAddr` or `writeConditionAddr` when allocating a vault.
