# Track Rails — Development TODO

## Phase 0: Project Setup & Rename

- [ ] **P0.1 — Rename project to "track-rails"**
  - Change `package.json` name from `audiorails` to `track-rails`
  - Update metadata in `app/layout.tsx`
  - Update `README.md`

- [ ] **P0.2 — Install core dependencies**
  ```bash
  npm install @piplabs/cdr-sdk viem wagmi @rainbow-me/rainbowkit @tanstack/react-query
  ```

- [ ] **P0.3 — Install Story Protocol SDK**
  ```bash
  npm install @story-protocol/core-sdk
  ```

- [ ] **P0.4 — Install IPFS/storage deps (Node 22+)**
  ```bash
  npm install helia @helia/unixfs multiformats
  ```

- [ ] **P0.5 — Create `.env.local` with config**
  ```
  NEXT_PUBLIC_RPC_URL=https://aeneid.storyrpc.io
  NEXT_PUBLIC_STORY_API_URL=http://172.192.41.96:1317
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<id>
  NEXT_PUBLIC_NETWORK=testnet
  ```

- [ ] **P0.6 — Set up Web3 provider (`app/Web3Providers.tsx`)**
  - Use RainbowKit (as per doc) with wagmi
  - Configure `aeneid` chain from `@story-protocol/core-sdk`
  - Wrap layout with `WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider`

---

## Phase 1: CDR Integration

- [ ] **P1.1 — Create CDR utility module (`lib/cdr.ts`)**
  - `initWasm()` wrapper called once at app startup
  - `createCDRClient()` factory (read-only + write-capable)
  - Environment variable config (RPC, API URL, network)

- [ ] **P1.2 — Create React hook (`hooks/use-cdr.ts`)**
  - `useCDRClient()` — returns observer client always, write client on-demand
  - WASM initialization in a top-level effect/provider
  - Handle wallet connection state

- [ ] **P1.3 — Create vault allocation flow**
  - `allocateVault()` — low-level allocate with EOA conditions or contract conditions
  - Support owner-only AND license-gated patterns
  - Handle `skipConditionValidation` for EOA conditions

- [ ] **P1.4 — Create file encryption flow**
  - `encryptAudioFile()` — AES-encrypt audio blob client-side
  - `uploadToIPFS()` — upload encrypted file via HeliaProvider
  - `createCDRVault()` — allocate vault + encrypt data key + write

- [ ] **P1.5 — Create file decryption flow**
  - `accessAudioFile()` — submit read request + collect partials
  - `downloadFromIPFS()` — download encrypted file
  - `decryptAudioFile()` — AES-decrypt with recovered key

---

## Phase 2: Story Protocol Integration

- [ ] **P2.1 — Create Story client hook (`hooks/use-story.ts`)**
  - `useStoryClient()` — initialize StoryClient with wagmi wallet
  - Helper functions for all core operations

- [ ] **P2.2 — IPA Registration flow**
  - Register audio track as IP Asset
  - Create and attach metadata (title, artist, artwork URI, genre, duration)
  - Store IP metadata on IPFS

- [ ] **P2.3 — License Terms creation**
  - Register PIL terms (commercial remix, commercial use, etc.)
  - Attach terms to the IPA
  - Define revenue share percentage

- [ ] **P2.4 — License Token minting**
  - WIP wrap → approve RoyaltyModule → mint license token
  - Handle minting fees
  - Display license token status

---

## Phase 3: Smart Contracts (Foundry)

- [ ] **P3.1 — Initialize Foundry project**
  - `forge init` in `contracts/` directory
  - Set up `foundry.toml` with Story remappings
  - Install dependencies: `@story-protocol/protocol-core-v1`, `@story-protocol/protocol-periphery-v1`

- [ ] **P3.2 — Write example/test contracts**
  - IPA Registration with SPG (`mintAndRegisterIp`)
  - License Terms registration + attachment
  - License Token minting
  - Derivative registration

- [ ] **P3.3 — Custom condition contracts (if needed)**
  - Track-specific access conditions
  - Time-based or subscription-based gating

---

## Phase 4: Frontend UI

- [ ] **P4.1 — App layout & navigation**
  - Rename app to "Track Rails"
  - Navigation: Home, Upload, Browse, My Tracks
  - Wallet connect button (RainbowKit)
  - Dark/light theme with Tailwind

- [ ] **P4.2 — Home page (`app/page.tsx`)**
  - Hero section explaining the platform
  - Featured tracks / recent uploads
  - Call-to-action: connect wallet + upload/browse

- [ ] **P4.3 — Upload page (`app/upload/page.tsx`)**
  - File picker (drag & drop) for audio files
  - Metadata form: title, artist, artwork image, genre, genre tags
  - License terms config: rev share %, minting fee
  - Upload progress: AES encrypt → IPFS upload → register IPA → create CDR vault
  - Transaction status display (tx hashes, confirmations)

- [ ] **P4.4 — Browse/Catalog page (`app/browse/page.tsx`)**
  - Grid/list of registered IP Assets
  - Track cards: artwork, title, artist, license info
  - Filtering by genre, artist
  - Sorting by recent, popular

- [ ] **P4.5 — Track detail page (`app/track/[ipId]/page.tsx`)**
  - Full track info + artwork
  - License token purchase/mint button
  - Audio player (shown after license verification)
  - Related tracks

- [ ] **P4.6 — Audio player component**
  - Web Audio API or HTML5 `<audio>` element
  - Decrypt audio in memory → create blob URL → play
  - Play/pause, seek, volume, track info display
  - Waveform visualization (nice-to-have)

- [ ] **P4.7 — My Tracks / Dashboard page (`app/dashboard/page.tsx`)**
  - For artists: uploaded tracks, license sales, revenue
  - For listeners: purchased license tokens, accessible tracks
  - Revenue claiming UI

- [ ] **P4.8 — WASM initialization provider (`components/WasmProvider.tsx`)**
  - Call `initWasm()` once at app mount
  - Show loading state until WASM ready
  - Error boundary for WASM failures

---

## Phase 5: Testing & Validation

- [ ] **P5.1 — CDR integration tests**
  - Test allocate → encrypt → write → read → decrypt cycle
  - Test with both EOA and license-gated conditions
  - Test file upload/download with Helia

- [ ] **P5.2 — Story Protocol integration tests**
  - Test IPA registration + metadata
  - Test license terms registration + attachment
  - Test license token minting

- [ ] **P5.3 — End-to-end flow tests**
  - Upload track → verify IPA created → verify CDR vault created
  - Mint license → verify license-gated access works
  - Revenue flow: pay IPA → claim revenue

- [ ] **P5.4 — UI/UX testing**
  - Mobile responsiveness
  - Loading/error states
  - Transaction feedback
  - Audio playback across browsers

---

## Phase 6: Polish & Launch

- [ ] **P6.1 — Error handling & edge cases**
  - WASM init failures
  - Network interruptions during encrypt/decrypt
  - Invalid license token errors
  - Timeout handling for CDR reads

- [ ] **P6.2 — Performance optimization**
  - Audio file chunking for large files
  - Caching decrypted keys (session-bound)
  - Lazy loading of Helia/CDR SDK

- [ ] **P6.3 — Documentation**
  - README with setup instructions
  - Environment variable documentation
  - Architecture overview

---

## Milestone Summary

| Milestone | Description | Key Deliverables |
|-----------|-------------|------------------|
| **M1** | Foundation | Renamed project, deps installed, Web3 provider, RainbowKit |
| **M2** | CDR Proof-of-Concept | Encrypt/decrypt flow, vault allocation, file upload |
| **M3** | Story Protocol PoC | IPA registration, license terms, token minting |
| **M4** | MVP Frontend | Upload page, browse catalog, audio player, track detail |
| **M5** | Smart Contracts | Foundry setup, test contracts, custom conditions |
| **M6** | Complete App | Dashboard, revenue claiming, error handling, polish |

---

## Priority Legend

- **P0** — Prerequisites / Setup
- **P1** — Core CDR functionality
- **P2** — Core Story Protocol functionality
- **P3** — Smart contract development
- **P4** — Frontend UI development
- **P5** — Testing & validation
- **P6** — Polish & deployment
