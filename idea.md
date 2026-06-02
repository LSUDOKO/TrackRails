# Track Rails — Project Vision

> **Track Rails**: Audio tracks on Story Protocol's Confidential Data Rails.

## Concept

Track Rails is a decentralized audio platform where artists/labels upload encrypted audio tracks, register them as IP Assets on Story Protocol, and monetize access via license tokens. Listeners who purchase/hold a license token can decrypt and stream the track through CDR's threshold decryption — no single party ever holds the full decryption key.

## Core Flow

### Upload (Artist/Label)
1. Artist connects wallet (Dynamic/RainbowKit) → funded on Aeneid testnet
2. Uploads an audio file (MP3, WAV, FLAC)
3. File is AES-encrypted client-side & uploaded to IPFS (Helia)
4. An IP Asset is registered on Story Protocol (track becomes an IPA)
5. License Terms are created & attached to the IPA (e.g. "Commercial Remix — 5% rev share")
6. The AES encryption key + IPFS CID is stored in a CDR vault
7. Vault is license-gated: only holders of a License Token for that IPA can decrypt

### Listen (Consumer)
1. Listener connects wallet
2. Browses available tracks (on-chain IPA metadata)
3. Purchases/mints a License Token for the desired track
4. CDR read flow: submits license token ID → validators verify on-chain → partial decryptions collected → AES key recovered client-side
5. Encrypted file downloaded from IPFS → decrypted locally → played in-browser

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TypeScript |
| Wallet | RainbowKit / Dynamic + wagmi + viem |
| Blockchain | Story L1 (Aeneid testnet) |
| IP / Licensing | `@story-protocol/core-sdk` |
| Encryption / CDR | `@piplabs/cdr-sdk` (threshold-encrypted vaults) |
| File Storage | IPFS via Helia (`@helia/unixfs`) |
| Smart Contracts | Solidity (Foundry) — custom condition contracts if needed |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Next.js)              │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Upload   │  │ Browse   │  │ Player        │  │
│  │ (Artist) │  │ (Catalog)│  │ (Stream)      │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │               │           │
│  ┌────▼──────────────▼───────────────▼────────┐  │
│  │         CDRClient + StoryClient            │  │
│  │  (observer / uploader / consumer)          │  │
│  └────────────────┬───────────────────────────┘  │
└───────────────────┼──────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌────────┐   ┌────────────┐   ┌──────────┐
│Story L1│   │Story-API   │   │ IPFS     │
│ (CDR + │   │(DKG state) │   │(Helia)   │
│  IPA)  │   └────────────┘   └──────────┘
└────────┘
```

## Key Smart Contracts (Aeneid)

| Contract | Address | Purpose |
|----------|---------|---------|
| OwnerWriteCondition | `0x4C9bFC96d7092b590D497A191826C3dA2277c34B` | Write gating for CDR vaults |
| LicenseReadCondition | `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3` | License-gated reads |
| LicenseToken | `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC` | License token ERC-721 |
| IPAssetRegistry | `0x77319B4031e6eF1250907aa00018B8B1c67a244b` | IPA registration |
| LicensingModule | `0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f` | License minting/attaching |
| RoyaltyModule | `0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086` | Revenue sharing |

## Phases

### Phase 1: Foundation (this hackathon)
- Next.js app with wallet connection
- CDR integration: create vaults, encrypt/decrypt
- Story Protocol: register IPAs, attach license terms, mint license tokens
- Simple audio upload → encrypt → CDR vault flow
- Simple browse + license-gated playback
- Admin: track uploads/manage IPAs

### Phase 2: Polish
- Audio player UI with waveform visualization
- Track metadata (title, artist, artwork, genre, duration)
- License token marketplace/purchase UI
- Revenue claiming dashboard for artists

### Phase 3: Production
- Mainnet deployment
- Custom condition contracts
- Advanced license terms (time-based, subscription)
- Social features (collaborations, playlists)
- Mobile-responsive design

## Key Constraints
- CDR inline payloads capped at ~1024 bytes → always use `uploadFile` for audio
- Node 22+ required for Helia
- Aeneid is testnet — not production confidential
- Edge runtime not supported — use Node.js runtime
