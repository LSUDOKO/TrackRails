<img width="1500" height="500" alt="Music Studio" src="https://github.com/user-attachments/assets/8f582149-8566-4b54-ba90-af4a867d2893" />

<div align="center">

# Track Rails

### Decentralized Audio on Story Protocol — AES-256 Encrypted, License-Gated, On-Chain Royalties

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Story Protocol](https://img.shields.io/badge/Story_Aeneid-7B3FE4?logo=story&logoColor=white)](https://docs.story.foundation/)
[![CDR](https://img.shields.io/badge/CDR-v0.2.1-FF0088)](https://docs.story.foundation/developers/cdr-sdk/overview)
[![Solidity](https://img.shields.io/badge/Solidity_0.8.26-363636?logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Foundry](https://img.shields.io/badge/Foundry-B3373?logo=ethereum&logoColor=white)](https://book.getfoundry.sh/)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**[Web App](https://audiorails.vercel.app) · [Telegram Bot](https://t.me/TrackRailsBot) · [Contracts (Aeneid)](https://aeneid.storyscan.io/)**

---

</div>

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works](#how-it-works)
- [Project Architecture](#project-architecture)
- [Smart Contracts](#-smart-contracts)
- [CDR Integration — Deep Dive](#-cdr-integration--deep-dive)
- [Frontend Pages](#-frontend-pages)
- [Telegram Bot](#-telegram-bot)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [Hackathon Submission](#-hackathon-submission)

---

## The Problem

Traditional music streaming platforms suffer from fundamental issues:

| Problem | Consequence |
|---------|------------|
| **Centralized control** | Platforms set pricing, decide payouts, and can delist content arbitrarily |
| **Opaque royalty accounting** | Artists receive pennies per stream with no visibility into how revenue is calculated |
| **Delayed payments** | Royalties settle months late, if at all |
| **No real ownership** | Listeners pay indefinitely without ever owning the content |
| **Single point of trust** | Every party — distributor, platform, payment processor — must be trusted with decryption keys |

> 🎯 **$5B+** in unclaimed mechanical royalties in the US alone. Artists are owed billions that the current system cannot efficiently distribute.

## The Solution

**Track Rails** reimagines music distribution from the ground up using three innovations:

### 1. ✅ Threshold-Encrypted Audio (CDR)

Every audio file is **AES-256-GCM encrypted in the browser** — the plaintext never leaves the artist's machine. The encryption key is then split across Story Protocol's validator network using **TDH2 threshold encryption**. No single party — not even Track Rails itself — holds the full decryption key.

### 2. ✅ IP Asset Registration on Story Protocol

Each track is registered as a **Story Protocol IP Asset (IPA)** with enforceable license terms. This creates a verifiable, on-chain record of ownership with programmable royalty policies.

### 3. ✅ License-Gated Access + Auto Royalties

Listeners mint **ERC-721 license tokens** to access decrypted audio. Each mint triggers an automatic **10% revenue share** to the artist via WIP (Wrapped IP). Revenue is **claimable at any time** with no minimum threshold — no middleman, no processing delays.

### Why CDR Specifically?

Track Rails uses **Confidential Data Rails (CDR)** by Story Protocol for three reasons:

1. **Threshold Security** — The AES key is encrypted using the DKG public key of Story's validator network. Decryption requires 3-of-5 validators to produce partial decryptions. No single validator can decrypt alone.

2. **On-Chain Access Control** — CDR vaults have programmable read/write conditions. Track Rails configures:
   - **Write**: Only the track NFT owner can encrypt/write to the vault (via `OwnerWriteCondition`)
   - **Read**: Only license token holders can trigger decryption (via `LicenseReadCondition`)

3. **Validator TEEs** — Partial decryptions are produced inside Intel SGX enclaves within `story-kernel` nodes, providing hardware-backed confidentiality.

---

## How It Works

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/b7a4ee87-3b4d-4cf9-8cad-a419a959b84e" />


### Upload Flow (Artist)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  1. Select  │     │  2. AES-256  │     │  3. Upload  │     │  4. Register │
│  Audio File │────>│  Encrypt in  │────>│  Encrypted  │────>│  as IP Asset │
│  + Metadata │     │  Browser     │     │  to IPFS    │     │  on Story L1  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────┬───────┘
                                                                    │
                    ┌────────────────────────────────────────────────┘
                    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  7. Link    │<────│  6. Create   │<────│  5. Register│
│  Vault to   │     │  CDR Vault   │     │  License    │
│  IPA        │     │  (TDH2)      │     │  Terms      │
└─────────────┘     └──────────────┘     └─────────────┘
```

**5 steps, ~4 blockchain transactions, ~60 seconds total.**

### Listen Flow (Consumer)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  1. Browse  │     │  2. Mint     │     │  3. Submit  │     │  4. Collect  │
│  Catalog    │────>│  License     │────>│  Read Req   │────>│  Partial     │
│  (on-chain) │     │  Token       │     │  (CDR)      │     │  Decryptions  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────┬───────┘
                                                                    │
                    ┌────────────────────────────────────────────────┘
                    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  7. Decrypt │<────│  6. Fetch    │<────│  5. Combine │
│  & Play     │     │  Encrypted   │     │  Partials   │
│  Locally    │     │  Audio (IPFS)│     │  → AES Key  │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Revenue Flow

```
Listener Mints License (0.01 WIP)
        │
        ▼
┌─────────────────────────────┐
│  Story Protocol Royalty     │
│  Module → Royalty Policy LAP│
│  → IP Royalty Vault         │
└────────────┬────────────────┘
             │
     ┌───────┴───────┐
     ▼               ▼
Artist (90%)    Platform (10%)
   ┌─────┐       ┌─────┐
   │Claim│       │Claim│
   │Any  │       │Any  │
   │Time │       │Time │
   └─────┘       └─────┘
```

---

## 🏗 Project Architecture

```
track-rails/
├── app/                          # Next.js 16 App Router
│   ├── api/
│   │   ├── tracks/route.ts       # Server-side contract read proxy
│   │   ├── story-proxy/[...path]/ # CDR DKG REST proxy
│   │   └── ipfs/upload/route.ts  # IPFS upload (Vercel fallback)
│   ├── page.tsx                  # Landing page with hero + features
│   ├── upload/page.tsx           # Audio upload + encrypt flow
│   ├── browse/page.tsx           # Catalog browser with search/filter
│   ├── track/[id]/page.tsx       # Track detail + player + mint
│   ├── dashboard/page.tsx        # Artist dashboard + revenue claims
│   ├── layout.tsx                # Root layout with providers
│   └── Web3Providers.tsx         # RainbowKit + wagmi config
│
├── components/                   # Reusable React components
│   ├── WasmProvider.tsx          # CDR WASM initialization
│   ├── Navbar.tsx                # Navigation with wallet connect
│   ├── Footer.tsx                # App footer
│   ├── TransactionToastProvider  # TX notification toasts
│   └── ui/                       # UI primitives
│
├── lib/                          # Core library code
│   ├── cdr.ts                    # CDR SDK wrapper (vaults, encrypt, decrypt)
│   ├── story.ts                  # Story Protocol SDK wrapper (IPA, license, royalty)
│   ├── contract.ts               # TrackRailsProtocol contract interactions
│   ├── env.ts                    # Client-safe env access with static map
│   ├── queries.ts                # Read-only contract queries
│   ├── playlist.ts               # Playlist contract interactions
│   ├── license-tokens.ts         # License token discovery + caching
│   ├── local-tracks.ts           # localStorage track cache
│   └── tx-error.ts               # Transaction error parser
│
├── hooks/                        # React hooks
│   ├── use-cdr.ts                # CDRClient hook (observer/uploader/consumer)
│   └── use-story.ts              # StoryClient hook
│
├── contracts/                    # Solidity smart contracts (Foundry)
│   └── src/
│       ├── TrackRailsProtocol.sol  # Main protocol contract
│       ├── TrackRails.sol          # Example/legacy contract
│       ├── TrackRailsNFT.sol       # ERC-721 track collection
│       ├── TrackRailsPlaylist.sol  # On-chain playlist registry
│       ├── conditions/
│       │   ├── TrackRailsWriteCondition.sol  # CDR write gating
│       │   └── TrackRailsReadCondition.sol   # CDR read gating
│       └── interfaces/
│   └── test/
│       └── TrackRailsProtocol.t.sol  # Comprehensive test suite
│   └── script/
│       └── DeployTrackRails.s.sol    # Deployment script
│
├── bot/                          # Telegram bot (grammy framework)
│   └── src/
│       ├── index.ts              # Bot entry point
│       ├── client.ts             # On-chain RPC client
│       ├── queries.ts            # Contract read helpers
│       ├── types.ts              # Bot context types
│       └── handlers/             # Command handlers
│           ├── browse.ts         # /browse command
│           ├── track.ts          # /track command
│           ├── search.ts         # /search command
│           ├── stats.ts          # /stats command
│           ├── dashboard.ts      # /dashboard command
│           ├── inline.ts         # Inline query mode
│           └── help.ts           # /help command
│
└── public/                       # Static assets
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Next.js 16)                         │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │  Upload   │  │  Browse  │  │   Track    │  │   Dashboard      │  │
│  │  Page     │  │  Page    │  │   Detail   │  │   Page           │  │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  └───────┬──────────┘  │
│       │              │              │                 │              │
│  ┌────▼──────────────▼──────────────▼─────────────────▼──────────┐  │
│  │                        lib/cdr.ts (CDRClient)                  │  │
│  │           observer | uploader | consumer + encrypt/decrypt     │  │
│  └───────────────────────────┬────────────────────────────────────┘  │
│                              │                                        │
│  ┌───────────────────────────▼────────────────────────────────────┐   │
│  │                     lib/story.ts (StoryClient)                  │   │
│  │     IPA Registration | License Minting | Revenue Claims         │   │
│  └───────────────────────────┬────────────────────────────────────┘   │
│                              │                                        │
│  ┌───────────────────────────▼────────────────────────────────────┐   │
│  │                    lib/env.ts (Static Env Map)                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│   NEXT.JS API ROUTES (Server)    │                                     │
│                                   │                                     │
│  ┌────────────────┐ ┌──────────────────────┐ ┌────────────────────┐    │
│  │ /api/tracks    │ │ /api/story-proxy/*   │ │ /api/ipfs/upload   │    │
│  │ Contract reads │ │ CDR DKG API proxy    │ │ Pinata IPFS proxy  │    │
│  └────────┬───────┘ └──────────┬───────────┘ └─────────┬──────────┘    │
└───────────┼────────────────────┼───────────────────────┼────────────────┘
            │                    │                       │
            ▼                    ▼                       ▼
┌──────────────────────┐ ┌──────────────┐ ┌────────────────────┐
│   Story Protocol L1  │ │  CDR DKG     │ │   IPFS / Pinata    │
│   (Aeneid Testnet)   │ │  Validator   │ │   (Encrypted       │
│                      │ │  Network     │ │    Audio Storage)  │
│  ┌────────────────┐  │ │              │ │                    │
│  │TrackRailsProto.│  │ │  Threshold   │ │   ┌──────────────┐ │
│  │   .sol         │  │ │  Decryption  │ │   │Encrypted .mp3│ │
│  │ ├ registerTrack  │  │  (3-of-5)    │ │   │Metadata JSON │ │
│  │ ├ linkVault      │  │              │ │   └──────────────┘ │
│  │ ├ mintLicense    │  │              │ │                    │
│  │ └ getTrack*      │  │              │ │                    │
│  └────────────────┘  │  └──────────────┘ └────────────────────┘
│  ┌────────────────┐  │
│  │TrackRailsNFT    │  │                     ┌────────────────────┐
│  │ .sol (ERC-721) │  │                     │   Telegram Bot     │
│  └────────────────┘  │                     │   @TrackRailsBot   │
│  ┌────────────────┐  │                     │                    │
│  │TrackRailsPlaylist│  │                     │ ┌────────────────┐│
│  │ .sol            │  │                     │ │ /browse        ││
│  └────────────────┘  │                     │ │ /track         ││
│                      │                     │ │ /search        ││
│  ┌────────────────┐  │                     │ │ /dashboard     ││
│  │CDR Vaults      │  │                     │ │ /stats         ││
│  │(AES key shards)│  │                     │ │ @ inline mode  ││
│  └────────────────┘  │                     │ └────────────────┘│
│                      │                     └────────────────────┘
└──────────────────────┘
```

---

## 📜 Smart Contracts

### Deployed Contracts (Aeneid Testnet)

| Contract | Address | Explorer | Purpose |
|----------|---------|----------|---------|
| **TrackRailsProtocol** | `0x8Ea69442fFeb34Cac9cE380A8B77E4b29DABe36c` | [🔗](https://aeneid.storyscan.io/address/0x8Ea69442fFeb34Cac9cE380A8B77E4b29DABe36c) | Core protocol: register tracks, link vaults, mint licenses |
| **TrackRailsNFT** | `0xA9A430252f62529BA699EE0B8DCe5e55433E5be3` | [🔗](https://aeneid.storyscan.io/address/0xA9A430252f62529BA699EE0B8DCe5e55433E5be3) | ERC-721 track ownership collection |
| **TrackRailsPlaylist** | `0x75a61B9AbC4aE662f6150D4E89E22d1561884B7c` | [🔗](https://aeneid.storyscan.io/address/0x75a61B9AbC4aE662f6150D4E89E22d1561884B7c) | On-chain playlist registry |

### Story Protocol Core Contracts (Aeneid)

These are the protocol-level contracts that Track Rails interacts with:

| Contract | Address | Explorer | Purpose |
|----------|---------|----------|---------|
| **IPAssetRegistry** | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` | [🔗](https://aeneid.storyscan.io/address/0x77319B4031e6eF1250907aa00018B8B1c67a244b) | Register NFT as IP Asset |
| **LicensingModule** | `0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f` | [🔗](https://aeneid.storyscan.io/address/0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f) | Attach terms, mint licenses |
| **PILicenseTemplate** | `0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316` | [🔗](https://aeneid.storyscan.io/address/0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316) | PIL terms registration |
| **LicenseRegistry** | `0x529a750E02d8E2f15649c13D69a465286a780e24` | [🔗](https://aeneid.storyscan.io/address/0x529a750E02d8E2f15649c13D69a465286a780e24) | License queries |
| **LicenseToken** | `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC` | [🔗](https://aeneid.storyscan.io/address/0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC) | ERC-721 license tokens |
| **RoyaltyPolicyLAP** | `0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E` | [🔗](https://aeneid.storyscan.io/address/0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E) | Liquidity Aggregation Protocol |
| **RoyaltyModule** | `0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086` | [🔗](https://aeneid.storyscan.io/address/0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086) | Revenue distribution |
| **RegistrationWorkflows** | `0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424` | [🔗](https://aeneid.storyscan.io/address/0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424) | SPG registration |

### CDR Condition Contracts (Aeneid)

| Contract | Address | Explorer | Purpose |
|----------|---------|----------|---------|
| **OwnerWriteCondition** | `0x4C9bFC96d7092b590D497A191826C3dA2277c34B` | [🔗](https://aeneid.storyscan.io/address/0x4C9bFC96d7092b590D497A191826C3dA2277c34B) | Gates CDR vault writes to NFT owner |
| **LicenseReadCondition** | `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3` | [🔗](https://aeneid.storyscan.io/address/0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3) | Gates CDR vault reads to license holders |

### Token Addresses (Aeneid)

| Token | Address | Purpose |
|-------|---------|---------|
| **WIP** | `0x1514000000000000000000000000000000000000` | Wrapped IP (native token) |
| **MERC20** | `0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E` | Mock ERC-20 for testing |
| **SPGNFT** | `0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc` | Default SPG NFT collection |

### Contract Architecture

```
TrackRailsProtocol.sol
├── registerTrack(receiver, revShare, metadataURI)
│   ├── Mints NFT via TrackRailsNFT.mint() [ERC-721]
│   ├── Registers as IP Asset via IPAssetRegistry [Story]
│   ├── Registers PIL commercial-remix license terms [Story]
│   ├── Attaches license terms to IPA [Story]
│   └── Transfers NFT to receiver
│   └── Emits: TrackRegistered(tokenId, ipId, owner, licenseTermsId, metadataURI, timestamp)
│
├── linkVault(tokenId, vaultUuid)
│   ├── Only track owner (IERC721.ownerOf)
│   ├── Only once (vaultLinked guard)
│   └── Emits: VaultLinked(tokenId, ipId, vaultUuid)
│
├── mintLicense(licensorIpId, licenseTermsId, receiver)
│   ├── Calls LicensingModule.mintLicenseTokens [Story]
│   └── Emits: LicenseMinted(licensorIpId, licenseTermsId, licenseTokenId, receiver)
│
├── Queries
│   ├── getTrack(tokenId) → Track struct
│   ├── getTokenIdForIp(ipId) → tokenId
│   ├── getTracksByOwner(owner) → tokenId[]
│   ├── getTrackCount() → count
│   └── getTrackIds(offset, limit) → tokenId[]
│
└── Admin (Ownable)
    ├── updatePlatformFee(newFeeBPS) [max 10%]
    └── setPlatformFeeRecipient(recipient)

TrackRailsNFT.sol
├── Mintable by protocol owner only
├── nextTokenId counter
├── tokenMetadataURIs mapping
└── batchMint support

TrackRailsPlaylist.sol
├── createPlaylist(name, description)
├── addTrack(playlistId, tokenId)
├── removeTrack(playlistId, tokenId)
└── Queries: getPlaylist, getPlaylistsByOwner, getPlaylistIds

Condition Contracts
├── TrackRailsWriteCondition
│   └── checkWriteCondition: caller must own the track NFT
└── TrackRailsReadCondition
    └── checkReadCondition: delegating to LicenseReadCondition
```

---

## 🔐 CDR Integration — Deep Dive

<img width="1408" height="768" alt="image" src="https://github.com/user-attachments/assets/2dd60b45-e52a-427a-82b9-cabff090e6e7" />

### What Makes CDR Different

CDR (Confidential Data Rails) is not just "encryption on a blockchain." It's a **threshold encryption system** integrated with Story L1's validator network:

| Property | Track Rails Implementation |
|----------|---------------------------|
| **Encryption** | AES-256-GCM client-side via `@piplabs/cdr-sdk` |
| **Key Protection** | TDH2 threshold encryption using DKG public key |
| **Validators Required** | 3-of-5 (configurable threshold) |
| **Read Access** | License token ownership (ERC-721) |
| **Write Access** | Track NFT ownership |
| **Key Splitting** | Shamir-like secret sharing across validators |
| **TEE** | Partial decryptions in Intel SGX enclaves |

### CDR Vault Lifecycle

#### 1. Allocation (`allocate()`)
A vault is created on-chain with configurable read/write conditions. Track Rails uses:
- **Write**: `OwnerWriteCondition` → only the track NFT owner can write
- **Read**: `LicenseReadCondition` → only license token holders can read

#### 2. Encryption (`encryptFile()` + `encryptDataKey()`)
- The audio file is AES-256-GCM encrypted client-side
- The AES key is TDH2-encrypted using Story's DKG global public key
- The encrypted key shards are bound to the vault UUID

#### 3. Storage (`write()`)
- The encrypted audio goes to IPFS (Pinata)
- The encrypted AES key shards are stored on-chain in the CDR vault
- The vault UUID is linked to the track's IP Asset via `linkVault()`

#### 4. Read (`accessCDR()`)
- License holder submits their token IDs as `accessAuxData`
- The `LicenseReadCondition` validates token ownership on-chain
- Validators produce partial decryptions (3-of-5 threshold)
- The SDK combines partials client-side to recover the AES key
- Encrypted audio downloaded from IPFS and decrypted locally

### CDR SDK Usage Map

```
@piplabs/cdr-sdk (v0.2.1)
├── initWasm()
│   └── components/WasmProvider.tsx → Called at app startup
│
├── CDRClient
│   ├── new CDRClient({ network, publicClient, walletClient, apiUrl })
│   │   └── lib/cdr.ts::createCDRClient()
│   │       └── hooks/use-cdr.ts::useCDRClient()
│   │
│   ├── observer (read-only, no wallet needed)
│   │   ├── getGlobalPubKey() → lib/cdr.ts :: createCDRVault()
│   │   └── getVault(uuid) → lib/cdr.ts :: accessCDR()
│   │
│   ├── uploader (requires wallet)
│   │   ├── allocate({ conditions }) → Vault UUID
│   │   │   └── lib/cdr.ts :: allocateVault(), createCDRVault()
│   │   ├── encryptDataKey({ dataKey, label }) → TDH2Ciphertext
│   │   │   └── lib/cdr.ts :: createCDRVault()
│   │   ├── write({ uuid, encryptedData }) → TX hash
│   │   │   └── lib/cdr.ts :: createCDRVault()
│   │   ├── uploadCDR({ dataKey, conditions }) → Full flow (license-gated)
│   │   │   └── lib/cdr.ts :: createCDRVault()
│   │   └── uploadFile({ content, storage, conditions }) → File flow
│   │       └── lib/cdr.ts :: uploadCDRFile()
│   │
│   └── consumer (requires wallet)
│       ├── accessCDR({ uuid, accessAuxData }) → { dataKey }
│       │   └── lib/cdr.ts :: accessCDR()
│       │       └── app/track/[id]/page.tsx :: handlePlayRequest()
│       ├── downloadFile({ uuid, storage }) → { content }
│       │   └── lib/cdr.ts :: downloadCDRFile()
│       └── collectPartials() → Low-level partial collection
│
├── encryptFile(plaintext) → { ciphertext, key }
│   └── lib/cdr.ts :: aesEncrypt()
│       └── app/upload/page.tsx
│
├── decryptFile({ ciphertext, key }) → plaintext
│   └── lib/cdr.ts :: aesDecrypt()
│       └── app/track/[id]/page.tsx
│
└── uuidToLabel(uuid) → Uint8Array label
    └── lib/cdr.ts :: createCDRVault()
```

### CDR Error Handling

The SDK throws typed errors that Track Rails catches and handles gracefully:

| Error | Handling |
|-------|----------|
| `PartialCollectionTimeoutError` | Automatic retry with 2× timeout |
| `EmptyVaultError` | Display "No encrypted audio found" |
| `InvalidConditionContractError` | Fall back to owner-only conditions |
| `LabelMismatchError` | Log + show generic error |

---

## 🖥 Frontend Pages

### Landing Page (`/`)
- Animated hero with paper shader background
- Stats marquee (live on-chain track count)
- "How It Works" steps section
- Feature cards with hover glow effects
- Telegram bot integration section
- CTA → Dashboard / Upload

### Upload Page (`/upload`)
- **Drag-and-drop** file upload (audio + artwork)
- Form: title, artist, genre, revenue share %
- **Confirmation modal** showing all 5 steps with gas fee estimates
- **Progress timeline** animating through each step:
  1. 🔐 Encrypting audio (AES-256)
  2. ☁️ Uploading to IPFS
  3. 📜 Registering IP Asset
  4. 🔒 Creating CDR vault (2 transactions)
  5. 🔗 Linking vault to IPA
- Success page with token ID, IP Asset ID, vault UUID, tx hashes

### Browse Page (`/browse`)
- Track grid with gradient artwork backgrounds
- **Live on-chain data** fetched via `/api/tracks`
- Search by title/artist
- Genre filter dropdown
- Per-track "Mint License" button
- Skeleton loading states
- Error handling (contracts not deployed, RPC issues)

### Track Detail Page (`/track/[id]`)
- Full-size artwork with info overlay
- **Audio player** with waveform visualization
- 3-step license minting (WIP deposit → approve → mint)
- **CDR threshold decrypt** → play/download decrypted audio
- On-chain details: owner, IP Asset ID, CDR vault UUID
- License status badge

### Dashboard Page (`/dashboard`)
- 3 stat cards: Tracks, Licenses Minted, Claimable WIP
- Tabbed interface: My Tracks / Licenses / Revenue
- **Revenue bar chart** visualization
- Per-track **Claim** buttons for WIP revenue
- Local track cache for pending-on-chain uploads

---

## 🤖 Telegram Bot

## Gallery 
<img width="720" height="1366" alt="image" src="https://github.com/user-attachments/assets/df701234-2bed-4d21-9c06-30a7f194469a" />

<img width="707" height="1420" alt="image" src="https://github.com/user-attachments/assets/154c781d-df53-4cf5-8f8f-78d4a11de304" />

<img width="696" height="1408" alt="image" src="https://github.com/user-attachments/assets/6dde15a2-56b8-48d9-830e-984e38b8bf31" />


Track Rails includes a **Telegram bot** (`@TrackRailsBot`) built with the [grammy](https://grammy.dev/) framework that reads directly from the blockchain — no database, no API, just live on-chain queries.

### Commands

| Command | Description |
|---------|-------------|
| `/browse` | Paginated track catalog with inline keyboard navigation |
| `/track <tokenId or ipId>` | Full track details: metadata, vault status, owner |
| `/search <query>` | Search tracks by title or artist |
| `/stats` | Platform stats: total tracks, licenses minted |
| `/dashboard <address>` | User's dashboard: uploads, licenses, revenue |
| `/help` | List all commands |

### Inline Mode

Type `@TrackRailsBot` in any chat to search and share tracks inline. Results include track title, artist, genre, and a "View on Web" button.

### Architecture

```
Telegram User → grammy Bot (@TrackRailsBot)
                    │
                    ▼
              bot/src/queries.ts
                    │
                    ▼
         Story Protocol RPC (viem)
                    │
                    ▼
         TrackRailsProtocol.sol (on-chain)
                    │
                    ├── getTrackCount()
                    ├── getTrackIds()
                    ├── getTrack()
                    ├── getTracksByOwner()
                    └── getTokenIdForIp()
```

No database, no cache — every command reads directly from the blockchain.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, React 19) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + Custom CSS |
| **Wallet** | [RainbowKit](https://www.rainbowkit.com/) + [wagmi](https://wagmi.sh/) + [viem](https://viem.sh/) |
| **Blockchain** | [Story Protocol Aeneid](https://docs.story.foundation/) |
| **Story SDK** | `@story-protocol/core-sdk` v1.4.4 |
| **CDR SDK** | `@piplabs/cdr-sdk` v0.2.1 |
| **Storage** | [Pinata](https://www.pinata.cloud/) IPFS pinning |
| **Smart Contracts** | Solidity 0.8.26 + [Foundry](https://book.getfoundry.sh/) |
| **Telegram Bot** | [grammy](https://grammy.dev/) framework |
| **Web3 Queries** | viem `publicClient` for read-only |
| **Animations** | CSS animations + `@paper-design/shaders-react` |
| **HTTP** | Next.js API Routes (server-side proxy) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (22+ for Helia storage)
- A funded wallet on **Aeneid testnet** (get IP from [faucet](https://docs.story.foundation/developers/aeneid-testnet))
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for contract deployment)
- [WalletConnect Project ID](https://cloud.walletconnect.com/)
- [Pinata JWT](https://app.pinata.cloud/developers/api-keys)

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/track-rails
cd track-rails
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your values (see below)

# 3. Deploy contracts (optional - use existing deployed ones)
cd contracts
forge script script/DeployTrackRails.s.sol \
  --rpc-url https://rpc.ankr.com/story_aeneid_testnet \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://aeneid.storyscan.xyz/api/
cd ..

# 4. Copy deployed addresses to .env.local
NEXT_PUBLIC_TRACK_RAILS_PROTOCOL=0x...
NEXT_PUBLIC_TRACK_NFT=0x...

# 5. Start dev server
npm run dev
# → http://localhost:3000

# 6. Start Telegram bot (optional)
cd bot
cp ../.env.local .env
npm install
npm start
```

### Environment Variables

```bash
# ── WalletConnect ──────────────────────────────────────────
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id

# ── RPC ────────────────────────────────────────────────────
NEXT_PUBLIC_RPC_URL=https://rpc.ankr.com/story_aeneid_testnet

# ── Story API ──────────────────────────────────────────────
# Option A: Local node
STORY_API_TARGET=http://172.192.41.96:1317
# Option B: Staging API
# STORY_API_TARGET=https://staging-api.storyprotocol.net/api/v4
# STORY_API_KEY=your-api-key

# ── Smart Contracts (after forge deploy) ──────────────────
NEXT_PUBLIC_TRACK_RAILS_PROTOCOL=0x8Ea69442fFeb34Cac9cE380A8B77E4b29DABe36c
NEXT_PUBLIC_TRACK_NFT=0xA9A430252f62529BA699EE0B8DCe5e55433E5be3
NEXT_PUBLIC_PLAYLIST_CONTRACT=0x75a61B9AbC4aE662f6150D4E89E22d1561884B7c

# ── Pinata IPFS ───────────────────────────────────────────
PINATA_JWT=your_server_side_jwt
NEXT_PUBLIC_PINATA_JWT=your_client_side_jwt

# ── Telegram Bot (optional) ────────────────────────────────
BOT_TOKEN=your_telegram_bot_token
BOT_MODE=polling

# ── Network ────────────────────────────────────────────────
NEXT_PUBLIC_NETWORK=testnet
```

### Run Tests

```bash
# Smart contract tests (requires forked RPC)
cd contracts
forge test --fork-url https://rpc.ankr.com/story_aeneid_testnet \
  --match-path test/TrackRailsProtocol.t.sol -vvv

# TypeScript type check
cd ..
npx tsc --noEmit
```

---

## 📦 Deployment

### Web App (Vercel)

```bash
vercel --prod
```

Set all environment variables in Vercel dashboard. Note:
- `NEXT_PUBLIC_*` vars are inlined at build time
- `PINATA_JWT` must be set as a Vercel environment variable
- Files > 4.5MB on Vercel Hobby plan must use direct Pinata uploads (requires `NEXT_PUBLIC_PINATA_JWT`)

### Telegram Bot

```bash
cd bot
npm install
BOT_TOKEN=xxx npm start
```

For production, run in **webhook mode**:

```bash
BOT_MODE=webhook WEBHOOK_URL=https://your-domain.com/api/bot npm start
```

---

## 📋 Hackathon Submission

### Key Features Demonstrated

1. **Full CDR Integration** — AES-256 encryption + TDH2 threshold decryption via Story Protocol's validator network. Audio files are encrypted client-side, uploaded encrypted to IPFS, and decryption requires a 3-of-5 validator threshold.

2. **IP Asset Registration** — Every track is registered as a Story Protocol IP Asset with PIL commercial-remix license terms (10% revenue share). Ownership is verifiable on-chain.

3. **License Token Economy** — Listeners mint ERC-721 license tokens to access audio. Each mint generates WIP revenue that flows to the artist via Story's royalty module.

4. **Revenue Claims** — Artists can claim WIP revenue at any time with no minimum threshold. The royalty pool is enforced by Story's RoyaltyPolicyLAP smart contract.

5. **Telegram Bot** — A fully functional Telegram bot that reads the blockchain directly, providing browse, search, dashboard, and inline sharing — all without a database.

### Unique CDR Advantages

- **No single point of trust**: The AES encryption key is split across validators. No single party can decrypt alone.
- **On-chain access control**: Read permissions are enforced by smart contracts, not API keys.
- **Validator TEEs**: Partial decryptions run inside Intel SGX enclaves.
- **License-gated vaults**: Only ERC-721 license token holders can trigger decryption.

---

## 📄 License

MIT

---

<div align="center">

**Built for the Story Protocol Hackathon**

[Report Bug](https://github.com/your-org/track-rails/issues) · [Request Feature](https://github.com/your-org/track-rails/issues) · [Join Telegram](https://t.me/TrackRailsBot)

</div>
