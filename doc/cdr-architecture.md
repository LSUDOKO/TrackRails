# CDR Architecture — Track Rails

## 1. System Overview: All CDR Touchpoints

```mermaid
graph TB
    subgraph Client["Browser Client"]
        direction TB
        WP[WasmProvider<br/>initWasm] --> HK[useCDRClient Hook<br/>createCDRClient]
        UP[Upload Page<br/>page.tsx] --> HK
        TP[Track Detail Page<br/>page.tsx] --> HK
        CP[CDR Info Page<br/>page.tsx]
        NLP[Navbar / Footer]
    end

    subgraph CDR_Lib["lib/cdr.ts — Core CDR Library"]
        direction TB
        CF[createCDRClient<br/>new CDRClient()]
        BO[buildOwnerOnlyConditions<br/>OwnerWriteCondition + EOA read]
        BL[buildLicenseGatedConditions<br/>OwnerWriteCondition + LicenseReadCondition]
        AV[allocateVault<br/>client.uploader.allocate]
        CV[createCDRVault<br/>inline ≤1024 bytes]
        UF[uploadCDRFile<br/>file upload path]
        AC[accessCDR<br/>client.consumer.accessCDR]
        DF[downloadCDRFile<br/>client.consumer.downloadFile]
        AE[aesEncrypt / aesDecrypt<br/>encryptFile / decryptFile]
        BAA[buildAccessAuxData<br/>encode uint256[] token IDs]
        CC[CDR_CONTRACTS constants<br/>OwnerWriteCondition, LicenseReadCondition, LicenseToken]
    end

    subgraph Hooks["hooks/use-cdr.ts"]
        UC[useCDRClient<br/>returns { client, isConnected, address }]
    end

    subgraph SDK["@piplabs/cdr-sdk (v0.2.1)"]
        CDR[CDRClient]
        IW[initWasm]
        EF[encryptFile]
        DF_SDK[decryptFile]
        UTL[uuidToLabel]
    end

    subgraph Story_Chain["Story Protocol L1 — Aeneid Testnet"]
        OWC[OwnerWriteCondition<br/>0x4C9b...34B]
        LRC[LicenseReadCondition<br/>0xC064...7a3]
        LT[LicenseToken<br/>0xFe38...6bC]
        TRP[TrackRailsProtocol.sol<br/>linkVault()]
        TW[TrackRailsWriteCondition.sol<br/>checkWriteCondition]
        TR[TrackRailsReadCondition.sol<br/>checkReadCondition]
    end

    subgraph IPFS["IPFS / Pinata"]
        EC[(Encrypted Audio)]
        MD[(Track Metadata)]
    end

    subgraph Storage["Local Storage"]
        LTS[local-tracks.ts<br/>vaultUuid, vaultLinked, txHashes]
        LLS[license-tokens.ts<br/>token IDs per IP Asset]
    end

    subgraph API["Next.js API Routes"]
        SP[api/story-proxy/[...path]<br/>REST proxy for CDR DKG queries]
        TR[api/tracks<br/>vaultUuid + vaultLinked from contract]
    end

    subgraph Bot["Telegram Bot (bot/)"]
        BQ[bot/src/queries.ts<br/>reads vaultUuid, vaultLinked]
        BH[bot/src/handlers/help.ts<br/>"CDR threshold encryption"]
    end

    %% Connections
    IW --> WP
    WP --> UC
    CF -.-> CDR
    CF --> API
    UC --> CV
    UC --> AC
    UP --> CV
    UP --> EF
    TP --> AC
    TP --> BAA
    TP --> AE
    CV --> AV
    BO --> AV
    BL --> AV
    CV --> UTL
    CV --> CDR
    AC --> CDR

    CDR -->|observer.getGlobalPubKey| Story_Chain
    CDR -->|uploader.allocate| Story_Chain
    CDR -->|uploader.encryptDataKey| Story_Chain
    CDR -->|uploader.write| Story_Chain
    CDR -->|consumer.accessCDR| Story_Chain

    CV -->|license-gated path: uploadCDR| CDR
    CV -->|owner-only path: allocate→encrypt→write| CDR
    UF -->|license-gated path: uploadFile| CDR
    UF -->|owner-only path: encrypt→storage→allocate| CDR
    UF --> IPFS

    UP --> EC
    UP --> MD
    UP --> LTS
    TP --> EC
    TP --> LLS
    TP --> LTS

    TRP -->|stores vaultUuid| TL[(Track Storage)]
    LTS --> TL

    style WP fill:#9333ea,color:#fff
    style CDR_Lib fill:#2563eb,color:#fff
    style Hooks fill:#7c3aed,color:#fff
    style SDK fill:#059669,color:#fff
    style Story_Chain fill:#d97706,color:#fff
    style IPFS fill:#0891b2,color:#fff
    style Storage fill:#4f46e5,color:#fff
    style Bot fill:#dc2626,color:#fff
```

## 2. Upload Flow — AES-256 + CDR Vault Creation

```mermaid
sequenceDiagram
    actor User
    participant Upload as app/upload/page.tsx
    participant CDRlib as lib/cdr.ts
    participant SDK as @piplabs/cdr-sdk
    participant IPFS as Pinata/IPFS
    participant Chain as Story Protocol L1
    participant Validators as CDR Validators

    User->>Upload: Select audio + metadata
    Upload->>Upload: Step: "encrypting"
    Upload->>SDK: encryptFile(audio)
    SDK-->>Upload: { ciphertext, key: aesKey }

    Upload->>IPFS: uploadToIPFS(encryptedAudio)
    IPFS-->>Upload: encryptedCID
    Upload->>IPFS: uploadToIPFS(metadata JSON)
    IPFS-->>Upload: metadataCID

    Upload->>Upload: Step: "registering"
    Upload->>Chain: registerTrackOnProtocol()
    Chain-->>Upload: { tokenId, ipId, licenseTermsId }

    Upload->>Upload: Step: "creating_vault"
    Upload->>CDRlib: createCDRVault({ dataKey: aesKey, gated: true, ipId })
    CDRlib->>CDRlib: buildLicenseGatedConditions(owner, ipId)
    Note over CDRlib: writeCondition=OwnerWriteCondition<br/>readCondition=LicenseReadCondition<br/>conditionData=abi.encode(LICENSE_TOKEN, ipId)

    CDRlib->>SDK: client.uploader.uploadCDR({ dataKey, conditions })
    SDK->>Chain: allocate vault
    Chain-->>SDK: { txHash, uuid }
    SDK->>SDK: encryptDataKey(dataKey, globalPubKey, label)
    Note over SDK: TDH2 encryption splits key<br/>across CDR validators
    SDK->>Chain: write vault (encrypted shards)
    Chain-->>SDK: { txHash }
    SDK-->>CDRlib: { uuid, ciphertext, txHashes }
    CDRlib-->>Upload: { uuid, txHashes: { allocate, write } }

    Upload->>Upload: Step: "linking"
    Upload->>Chain: linkVaultOnProtocol(tokenId, uuid)
    Note over Chain: TrackRailsProtocol.linkVault()<br/>emits VaultLinked event
    Chain-->>Upload: { txHash }

    Upload->>Upload: saveUploadedTrack()
    Note over Upload: localStorage: vaultUuid, txHashes
    Upload-->>User: Success! "CDR Vault #uuid"
```

## 3. Playback/Decryption Flow — Threshold Decryption

```mermaid
sequenceDiagram
    actor Listener
    participant Track as app/track/[id]/page.tsx
    participant CDRlib as lib/cdr.ts
    participant SDK as @piplabs/cdr-sdk
    participant Chain as Story Protocol L1
    participant Validators as CDR Validators
    participant IPFS as Pinata/IPFS

    Listener->>Track: Open track page
    Track->>Track: loadTrack(ipId) → get vaultUuid from contract
    Track->>Track: discoverOwnedLicenseTokenIds()
    Note over Track: Queries LicenseToken contract<br/>for listener's token IDs

    alt No license held
        Track-->>Listener: "Mint a license to play"
        Listener->>Track: Click "Mint License"
        Track->>Chain: mintLicenseToken(ipId, termsId)
        Chain-->>Track: licenseTokenIds
    end

    Listener->>Track: Click "Play" / "Download"
    Track->>Track: buildAccessAuxData(tokenIds)
    Note over Track: encodeAbiParameters(uint256[], tokenIds)

    Track->>CDRlib: accessCDR({ uuid, accessAuxData, timeoutMs: 120000 })
    CDRlib->>SDK: client.consumer.accessCDR({ uuid, accessAuxData })
    SDK->>Chain: Submit read transaction
    Chain->>Chain: checkReadCondition(uuid, accessAuxData, conditionData, caller)
    Note over Chain: LicenseReadCondition:<br/>validates caller holds license token for ipId
    alt Condition fails
        Chain-->>SDK: Revert
    else Condition passes
        Chain->>Validators: Request partial decryptions
        Note over Validators: Threshold (3-of-5) must respond
        Validators-->>SDK: Partial decryption shares
        SDK->>SDK: combinePartials() → recover AES key
        SDK-->>CDRlib: { dataKey: aesKey }
        CDRlib-->>Track: { dataKey: aesKey }
    end

    alt Timeout (retry)
        Note over CDRlib: Retries once with 240000ms timeout
    end

    Track->>IPFS: fetch(encryptedAudioCID)
    IPFS-->>Track: encryptedAudio (Uint8Array)

    Track->>SDK: decryptFile({ ciphertext: encryptedAudio, key: aesKey })
    SDK-->>Track: decrypted audio bytes

    Track->>Track: create Blob → Audio element
    Track-->>Listener: Play / Download decrypted track
```

## 4. Smart Contract Layer — CDR Condition Contracts

```mermaid
graph TB
    subgraph Deployed_Aeneid["Pre-deployed on Aeneid"]
        OWC_D[OwnerWriteCondition<br/>0x4C9bFC96d7092b590D497A191826C3dA2277c34B]
        LRC_D[LicenseReadCondition<br/>0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3]
        LT_D[LicenseToken<br/>0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC]
    end

    subgraph Track_Rails["Custom Track Rails Contracts"]
        TRP[TrackRailsProtocol.sol]
        TWC[TrackRailsWriteCondition.sol]
        TRC[TrackRailsReadCondition.sol]
    end

    subgraph CDR_Flow["CDR Condition Enforcement"]
        W_CHECK[CDR: checkWriteCondition<br/>called during vault write]
        R_CHECK[CDR: checkReadCondition<br/>called during threshold decrypt]
    end

    TRP -->|"linkVault(tokenId, vaultUuid)"| TL[(Track Storage<br/>vaultUuid, vaultLinked)]
    TRP -->|"registerTrack()"| IPA[IP Asset Registry<br/>+ License Terms]
    TRP -->|constants| OWC_D
    TRP -->|constants| LRC_D

    TWC -->|"implements ICDRWriteCondition"| W_CHECK
    TWC -->|"checkWriteCondition: caller must own track NFT"| W_CHECK
    TRC -->|"implements ICDRReadCondition"| R_CHECK
    TRC -->|"delegates to LicenseReadCondition via staticcall"| LRC_D

    W_CHECK -->|"OwnerWriteCondition (default path)"| OWC_D
    R_CHECK -->|"LicenseReadCondition (default path)"| LRC_D
    R_CHECK -->|"validates license token ownership"| LT_D

    note_twc["
    TrackRailsWriteCondition:
    conditionData = abi.encode(trackNft, tokenId)
    Verifies: IERC721(trackNft).ownerOf(tokenId) == caller
    "]
    note_trc["
    TrackRailsReadCondition:
    conditionData = abi.encode(licenseToken, ipId)
    accessAuxData = abi.encode(uint256[] tokenIds)
    Forwards to LicenseReadCondition via delegatecall
    "]

    TWC -.-> note_twc
    TRC -.-> note_trc
```

## 5. Detailed Data Flow — Every CDR API Call

```mermaid
flowchart LR
    subgraph UPLOAD["UPLOAD PATH (createCDRVault)"]
        direction TB
        A1[owner address] --> A2{License-gated?}
        A2 -->|Yes| A3["buildLicenseGatedConditions()"]
        A2 -->|No| A4["buildOwnerOnlyConditions()"]
        A3 --> A5["SDK: uploadCDR({ dataKey, conditions })"]
        A4 --> A6["SDK: allocate({ conditions, skipConditionValidation })"]
        A6 --> A7["SDK: encryptDataKey({ dataKey, label })"]
        A7 --> A8["SDK: write({ uuid, encryptedData })"]
    end

    subgraph READ["READ PATH (accessCDR)"]
        direction TB
        B1[license token IDs] --> B2["buildAccessAuxData(ids)"]
        B2 --> B3["SDK: accessCDR({ uuid, accessAuxData })"]
        B3 --> B4["Chain: checkReadCondition"]
        B4 --> B5[Validators: partial decryptions]
        B5 --> B6["combine → AES key"]
    end

    subgraph FILE["FILE PATH (uploadCDRFile / downloadCDRFile)"]
        direction TB
        C1[audio file bytes] --> C2["encryptFile() → { ciphertext, key }"]
        C2 --> C3["storageProvider.upload(ciphertext) → CID"]
        C3 --> C4["Allocate vault + encrypt AES key via TDH2"]
        C4 --> C5["write() → store AES key shards on-chain"]

        D1[read request] --> D2["SDK: downloadFile({ uuid, storageProvider })"]
        D2 --> D3["accessCDR → recover AES key"]
        D3 --> D4["storageProvider.download(CID) → ciphertext"]
        D4 --> D5["decryptFile({ ciphertext, key }) → plaintext"]
    end

    subgraph CONDITION["CONDITION BUILDER OUTPUTS"]
        direction TB
        E1["Owner-Write: OwnerWriteCondition<br/>conditionData = abi.encode(owner)"]
        E2["Owner-Read: EOA address<br/>conditionData = 0x"]
        E3["License-Read: LicenseReadCondition<br/>conditionData = abi.encode(LICENSE_TOKEN, ipId)"]
    end

    subgraph CLIENT_MODES["CDRClient Modes"]
        F1["observer-only<br/>(no walletClient)<br/>read queries only"]
        F2["uploader enabled<br/>(with walletClient)<br/>vault create/write"]
        F3["consumer enabled<br/>(with walletClient)<br/>read + decrypt"]
    end

    UPLOAD --> CLIENT_MODES
    READ --> CLIENT_MODES
    FILE --> CONDITION
```

## 6. Complete CDR API Surface Usage Map

```mermaid
mindmap
  root((CDR SDK v0.2.1<br/>Usage Map))
    initWasm
      WasmProvider.tsx
    CDRClient
      lib/cdr.ts::createCDRClient
      hooks/use-cdr.ts
    uploader
      allocate
        lib/cdr.ts::allocateVault
        lib/cdr.ts::createCDRVault (owner-only path)
        lib/cdr.ts::uploadCDRFile (owner-only path)
      encryptDataKey
        lib/cdr.ts::createCDRVault (owner-only path)
        lib/cdr.ts::uploadCDRFile (owner-only path)
      write
        lib/cdr.ts::createCDRVault (owner-only path)
        lib/cdr.ts::uploadCDRFile (owner-only path)
      uploadCDR
        lib/cdr.ts::createCDRVault (license-gated path)
      uploadFile
        lib/cdr.ts::uploadCDRFile (license-gated path)
    consumer
      accessCDR
        lib/cdr.ts::accessCDR
        app/track/[id]/page.tsx
      downloadFile
        lib/cdr.ts::downloadCDRFile
    encryptFile
      lib/cdr.ts::aesEncrypt
      app/upload/page.tsx (direct import)
    decryptFile
      lib/cdr.ts::aesDecrypt
    uuidToLabel
      lib/cdr.ts (createCDRVault, uploadCDRFile)
    Contract Addresses
      OWNER_WRITE_CONDITION
        lib/cdr.ts constant
        TrackRailsProtocol.sol constant
      LICENSE_READ_CONDITION
        lib/cdr.ts constant
        TrackRailsProtocol.sol constant
      LICENSE_TOKEN
        lib/cdr.ts constant
        license-tokens.ts import
    Story API Proxy
      api/story-proxy/[...path]
        Used as CDRClient apiUrl
    Condition Encoders
      buildOwnerOnlyConditions
        OwnerWriteCondition + EOA read + skipConditionValidation
      buildLicenseGatedConditions
        OwnerWriteCondition + LicenseReadCondition
      buildAccessAuxData
        Encodes uint256[] license token IDs
```

## 7. Cross-Cutting Concern: Vault UUID Flow

```mermaid
flowchart LR
    A["lib/cdr.ts<br/>createCDRVault()"] -->|returns uuid| B["app/upload/page.tsx"]
    B -->|uuid| C["lib/contract.ts<br/>linkVaultOnProtocol(tokenId, uuid)"]
    C -->|stores uuid| D["contracts/TrackRailsProtocol.sol<br/>mapping: tokenId → vaultUuid"]
    D -->|reads uuid| E["lib/queries.ts<br/>getTrack() returns vaultUuid"]
    E -->|uuid| F["app/track/[id]/page.tsx<br/>accessCDR({ uuid })"]
    D -->|uuid| G["app/api/tracks/route.ts<br/>ABI output"]
    B -->|stores uuid| H["lib/local-tracks.ts<br/>localStorage: vaultUuid"]
    H -->|uuid| I["app/cdr/page.tsx<br/>display user vaults"]
    D -->|uuid| J["bot/src/queries.ts<br/>on-chain read"]
```

## 8. Transaction Flow — Hashes Tracked per Upload

```mermaid
flowchart LR
    T1["1. Register Track<br/>lib/contract.ts::registerTrackOnProtocol"]
    T2["2. Allocate Vault<br/>SDK: uploader.allocate"]
    T3["3. Write Vault<br/>SDK: uploader.write"]
    T4["4. Link Vault to IPA<br/>lib/contract.ts::linkVaultOnProtocol"]

    T1 -->|txHash: register| S["local-tracks.ts<br/>txHashes"]
    T2 -->|txHash: vaultAllocate| S
    T3 -->|txHash: vaultWrite| S
    T4 -->|txHash: link| S

    S -->|display| TA["TransactionToastProvider.tsx<br/>detectType: 'vault' / 'register'"]
    S -->|display| CD["app/cdr/page.tsx<br/>vault listing"]

    style T2 fill:#2563eb,color:#fff
    style T3 fill:#2563eb,color:#fff
```
