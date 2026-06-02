// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ILicensingModule } from "@storyprotocol/core/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { ILicenseToken } from "@storyprotocol/core/interfaces/ILicenseToken.sol";
import { ILicenseRegistry } from "@storyprotocol/core/interfaces/registries/ILicenseRegistry.sol";
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IMintableNFT } from "./interfaces/IMintableNFT.sol";

/// @title Track Rails Protocol
/// @notice Register audio tracks as IP Assets on Story Protocol, link
///         CDR threshold-encrypted vaults, and manage license-based access.
contract TrackRailsProtocol is ERC721Holder, Ownable, ReentrancyGuard {

    // ── Aeneid protocol contracts ─────────────────────────────────────
    IIPAssetRegistry public immutable IP_ASSET_REGISTRY;
    ILicensingModule public immutable LICENSING_MODULE;
    IPILicenseTemplate public immutable PIL_TEMPLATE;
    ILicenseRegistry public immutable LICENSE_REGISTRY;
    ILicenseToken public immutable LICENSE_TOKEN;
    address public immutable ROYALTY_POLICY_LAP;
    address public immutable WIP;

    // ── Aeneid CDR condition contracts ────────────────────────────────
    /// @dev Hardcoded for Aeneid. Update when deploying to a different network.
    address public constant OWNER_WRITE_CONDITION = 0x4C9bFC96d7092b590D497A191826C3dA2277c34B;
    address public constant LICENSE_READ_CONDITION = 0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3;

    // ── NFT collection ────────────────────────────────────────────────
    /// ERC-721 collection whose tokens represent track ownership.
    /// Must implement `mint(address to) returns (uint256)` (IMintableNFT).
    IERC721 public immutable TRACK_NFT;
    IMintableNFT public immutable MINTABLE_NFT;

    // ── Track struct ──────────────────────────────────────────────────
    struct Track {
        address ipId;
        uint32 vaultUuid;
        address owner;
        string metadataURI;
        uint256 licenseTermsId;
        uint256 timestamp;
        bool vaultLinked;
    }

    // ── Storage ───────────────────────────────────────────────────────
    uint256[] internal _trackIds;
    mapping(uint256 => Track) internal _tracks;
    mapping(address => uint256) internal _ipIdToTokenId;
    mapping(address => uint256[]) internal _tracksByOwner;

    // ── Platform config ───────────────────────────────────────────────
    /// Platform fee in basis points (e.g. 250 = 2.5%).
    uint256 public platformFeeBPS = 250;
    /// Maximum platform fee allowed (10%).
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1_000;
    address public platformFeeRecipient;

    // ── Events ────────────────────────────────────────────────────────
    event TrackRegistered(
        uint256 indexed tokenId,
        address indexed ipId,
        address indexed owner,
        uint256 licenseTermsId,
        string metadataURI,
        uint256 timestamp
    );

    event VaultLinked(
        uint256 indexed tokenId,
        address indexed ipId,
        uint32 vaultUuid
    );

    event LicenseMinted(
        address indexed licensorIpId,
        uint256 indexed licenseTermsId,
        uint256 licenseTokenId,
        address indexed receiver
    );

    event PlatformFeeUpdated(uint256 oldFeeBPS, uint256 newFeeBPS);
    event PlatformFeeRecipientUpdated(address indexed recipient);

    // ── Errors ────────────────────────────────────────────────────────
    error NotTrackOwner();
    error TrackAlreadyLinked();
    error TrackNotFound();
    error InvalidFeeBPS();

    // ── Constructor ───────────────────────────────────────────────────

    /// @notice Initialise the protocol with Story Protocol and CDR contract addresses.
    constructor(
        address ipAssetRegistry,
        address licensingModule,
        address pilTemplate,
        address licenseRegistry,
        address licenseToken,
        address royaltyPolicyLAP,
        address wip,
        address trackNft,
        address platformFeeRecipient_,
        address initialOwner
    ) Ownable(initialOwner) {
        IP_ASSET_REGISTRY = IIPAssetRegistry(ipAssetRegistry);
        LICENSING_MODULE = ILicensingModule(licensingModule);
        PIL_TEMPLATE = IPILicenseTemplate(pilTemplate);
        LICENSE_REGISTRY = ILicenseRegistry(licenseRegistry);
        LICENSE_TOKEN = ILicenseToken(licenseToken);
        ROYALTY_POLICY_LAP = royaltyPolicyLAP;
        WIP = wip;
        TRACK_NFT = IERC721(trackNft);
        MINTABLE_NFT = IMintableNFT(trackNft);
        platformFeeRecipient = platformFeeRecipient_;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Track Registration
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Register a new audio track as an IP Asset.
    /// @param  receiver     Owner of the track (receives the NFT → becomes IPA owner)
    /// @param  revShare     Commercial revenue share (1e6 = 1%, 10_000_000 = 10%)
    /// @param  metadataURI  URI pointing to track metadata JSON (IPFS / Arweave)
    /// @return tokenId      Minted NFT token ID
    /// @return ipId         Registered IP Asset ID
    /// @return licenseTermsId Registered license terms ID
    function registerTrack(
        address receiver,
        uint32 revShare,
        string calldata metadataURI
    )
        external
        nonReentrant
        returns (uint256 tokenId, address ipId, uint256 licenseTermsId)
    {
        // 1. Mint NFT to this contract so it has permission to attach terms
        tokenId = MINTABLE_NFT.mint(address(this));

        // 2. Register the NFT as an IP Asset
        ipId = IP_ASSET_REGISTRY.register({
            chainid: block.chainid,
            tokenContract: address(TRACK_NFT),
            tokenId: tokenId
        });

        // 3. Register PIL commercial-remix license terms
        licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(
            PILFlavors.commercialRemix({
                mintingFee: 0,
                commercialRevShare: revShare,
                royaltyPolicy: ROYALTY_POLICY_LAP,
                currencyToken: WIP
            })
        );

        // 4. Attach license terms to the IP Asset (we own the NFT → we're the IPA owner)
        LICENSING_MODULE.attachLicenseTerms({
            ipId: ipId,
            licenseTemplate: address(PIL_TEMPLATE),
            licenseTermsId: licenseTermsId
        });

        // 5. Transfer NFT to the receiver, making them the IPA owner
        IERC721(TRACK_NFT).transferFrom(address(this), receiver, tokenId);

        // 6. Store track data
        Track storage track = _tracks[tokenId];
        track.ipId = ipId;
        track.owner = receiver;
        track.metadataURI = metadataURI;
        track.licenseTermsId = licenseTermsId;
        track.timestamp = block.timestamp;

        _trackIds.push(tokenId);
        _ipIdToTokenId[ipId] = tokenId;
        _tracksByOwner[receiver].push(tokenId);

        emit TrackRegistered(tokenId, ipId, receiver, licenseTermsId, metadataURI, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CDR Vault Linking
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Link an off-chain CDR vault to a registered track.
    /// @param  tokenId    NFT token ID of the track
    /// @param  vaultUuid  CDR vault UUID (allocated via CDR SDK)
    /// @dev Only the track owner can link. A vault can only be linked once.
    ///      The vault should be allocated with:
    ///        - writeCondition: OWNER_WRITE_CONDITION (abi.encode(owner))
    ///        - readCondition:  LICENSE_READ_CONDITION (abi.encode(LICENSE_TOKEN, ipId))
    function linkVault(uint256 tokenId, uint32 vaultUuid) external {
        Track storage track = _tracks[tokenId];
        if (track.owner == address(0)) revert TrackNotFound();
        if (IERC721(TRACK_NFT).ownerOf(tokenId) != msg.sender) revert NotTrackOwner();
        if (track.vaultLinked) revert TrackAlreadyLinked();

        track.vaultUuid = vaultUuid;
        track.vaultLinked = true;

        emit VaultLinked(tokenId, track.ipId, vaultUuid);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  License Token Minting
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Mint a license token from a registered IP Asset.
    /// @param  licensorIpId    The IP Asset to mint a license from
    /// @param  licenseTermsId  The license terms to use
    /// @param  receiver        Who receives the license token
    /// @return licenseTokenId  The minted license token ID
    /// @dev The caller must have WIP approved for the RoyaltyModule.
    function mintLicense(
        address licensorIpId,
        uint256 licenseTermsId,
        address receiver
    ) external nonReentrant returns (uint256 licenseTokenId) {
        licenseTokenId = LICENSING_MODULE.mintLicenseTokens({
            licensorIpId: licensorIpId,
            licenseTemplate: address(PIL_TEMPLATE),
            licenseTermsId: licenseTermsId,
            amount: 1,
            receiver: receiver,
            royaltyContext: "",
            maxMintingFee: 0,
            maxRevenueShare: 0
        });

        emit LicenseMinted(licensorIpId, licenseTermsId, licenseTokenId, receiver);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Queries
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Get track details by token ID.
    function getTrack(uint256 tokenId) external view returns (Track memory) {
        if (_tracks[tokenId].owner == address(0)) revert TrackNotFound();
        return _tracks[tokenId];
    }

    /// @notice Get the token ID for an IP Asset ID.
    function getTokenIdForIp(address ipId) external view returns (uint256) {
        return _ipIdToTokenId[ipId];
    }

    /// @notice Get all track token IDs owned by an address.
    function getTracksByOwner(address owner) external view returns (uint256[] memory) {
        return _tracksByOwner[owner];
    }

    /// @notice Total number of registered tracks.
    function getTrackCount() external view returns (uint256) {
        return _trackIds.length;
    }

    /// @notice Paginated list of all track IDs.
    function getTrackIds(uint256 offset, uint256 limit) external view returns (uint256[] memory ids) {
        uint256 total = _trackIds.length;
        if (offset >= total) return new uint256[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;
        ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = _trackIds[offset + i];
        }
    }

    /// @notice Check if an IPA has specific license terms attached.
    function hasLicenseTerms(address ipId, uint256 licenseTermsId) external view returns (bool) {
        return LICENSE_REGISTRY.hasIpAttachedLicenseTerms(ipId, address(PIL_TEMPLATE), licenseTermsId);
    }

    /// @notice Count attached license terms for an IPA.
    function getAttachedTermsCount(address ipId) external view returns (uint256) {
        return LICENSE_REGISTRY.getAttachedLicenseTermsCount(ipId);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Admin
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Update the platform fee (basis points, capped at 10%).
    function updatePlatformFee(uint256 newFeeBPS) external onlyOwner {
        if (newFeeBPS > MAX_PLATFORM_FEE_BPS) revert InvalidFeeBPS();
        emit PlatformFeeUpdated(platformFeeBPS, newFeeBPS);
        platformFeeBPS = newFeeBPS;
    }

    /// @notice Set the platform fee recipient address.
    function setPlatformFeeRecipient(address recipient) external onlyOwner {
        platformFeeRecipient = recipient;
        emit PlatformFeeRecipientUpdated(recipient);
    }
}
