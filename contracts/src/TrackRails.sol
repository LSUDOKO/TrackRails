// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ILicensingModule } from "@storyprotocol/core/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { ILicenseToken } from "@storyprotocol/core/interfaces/ILicenseToken.sol";
import { ILicenseRegistry } from "@storyprotocol/core/interfaces/registries/ILicenseRegistry.sol";
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";

import { SimpleNFT } from "./mocks/SimpleNFT.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

/// @notice Track Rails example contract demonstrating end-to-end IP lifecycle:
///         register IPA → attach license terms → mint license token → register derivative.
/// @dev Deploy with Story Protocol contract addresses for the Aeneid testnet.
contract TrackRails is ERC721Holder {
    // ── Protocol contracts ────────────────────────────────────────────
    IIPAssetRegistry public immutable IP_ASSET_REGISTRY;
    ILicensingModule public immutable LICENSING_MODULE;
    IPILicenseTemplate public immutable PIL_TEMPLATE;
    ILicenseRegistry public immutable LICENSE_REGISTRY;
    ILicenseToken public immutable LICENSE_TOKEN;
    address public immutable ROYALTY_POLICY_LAP;
    address public immutable WIP;

    // ── NFT collection ────────────────────────────────────────────────
    SimpleNFT public immutable SIMPLE_NFT;

    // ── Events ────────────────────────────────────────────────────────
    event TrackRegistered(
        uint256 indexed tokenId,
        address indexed ipId,
        address indexed owner,
        uint256 licenseTermsId,
        string metadataURI
    );

    event LicenseMinted(
        address indexed licensorIpId,
        uint256 indexed licenseTermsId,
        uint256 licenseTokenId,
        address indexed receiver
    );

    event DerivativeRegistered(
        address indexed parentIpId,
        address indexed childIpId,
        uint256 indexed licenseTokenId
    );

    /// @notice Initialise with deployed Story Protocol contract addresses.
    /// @param ipAssetRegistry  IPAssetRegistry address
    /// @param licensingModule  LicensingModule address
    /// @param pilTemplate      PILicenseTemplate address
    /// @param licenseRegistry  LicenseRegistry address
    /// @param licenseToken     LicenseToken address
    /// @param royaltyPolicyLAP RoyaltyPolicyLAP address
    /// @param wip              WIP token address
    constructor(
        address ipAssetRegistry,
        address licensingModule,
        address pilTemplate,
        address licenseRegistry,
        address licenseToken,
        address royaltyPolicyLAP,
        address wip
    ) {
        IP_ASSET_REGISTRY = IIPAssetRegistry(ipAssetRegistry);
        LICENSING_MODULE = ILicensingModule(licensingModule);
        PIL_TEMPLATE = IPILicenseTemplate(pilTemplate);
        LICENSE_REGISTRY = ILicenseRegistry(licenseRegistry);
        LICENSE_TOKEN = ILicenseToken(licenseToken);
        ROYALTY_POLICY_LAP = royaltyPolicyLAP;
        WIP = wip;

        // Deploy a new Simple NFT collection for Track Rails
        SIMPLE_NFT = new SimpleNFT("Track Rails", "RAILS");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  IPA Registration
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Mint an NFT, register it as an IP Asset, register license terms,
    ///         and attach those terms — all in one call.
    /// @param  receiver     Owner of the NFT/IPA
    /// @param  revShare     Commercial revenue share (e.g. 10_000_000 = 10%)
    /// @param  metadataURI  URI pointing to track metadata JSON
    /// @return tokenId      Minted NFT token ID
    /// @return ipId         Registered IP Asset ID
    /// @return licenseTermsId Registered license terms ID
    function mintAndRegisterTrack(
        address receiver,
        uint32 revShare,
        string calldata metadataURI
    )
        external
        returns (uint256 tokenId, address ipId, uint256 licenseTermsId)
    {
        // Mint NFT to this contract so it has permissions to attach terms
        tokenId = SIMPLE_NFT.mint(address(this));
        ipId = IP_ASSET_REGISTRY.register(
            block.chainid,
            address(SIMPLE_NFT),
            tokenId
        );

        // Register PIL commercial-remix license terms
        licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(
            PILFlavors.commercialRemix({
                mintingFee: 0,
                commercialRevShare: revShare,
                royaltyPolicy: ROYALTY_POLICY_LAP,
                currencyToken: WIP
            })
        );

        // Attach license terms to the IP Asset
        LICENSING_MODULE.attachLicenseTerms(
            ipId,
            address(PIL_TEMPLATE),
            licenseTermsId
        );

        // Transfer NFT to the receiver, who becomes the IPA owner
        SIMPLE_NFT.transferFrom(address(this), receiver, tokenId);

        emit TrackRegistered(tokenId, ipId, receiver, licenseTermsId, metadataURI);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  License Token Minting
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Mint a license token from an existing IP Asset.
    /// @param  licensorIpId    The IP Asset to mint a license from
    /// @param  licenseTermsId  The license terms to use
    /// @param  receiver        Who receives the license token
    /// @return licenseTokenId  The minted license token ID
    function mintLicense(
        address licensorIpId,
        uint256 licenseTermsId,
        address receiver
    ) external returns (uint256 licenseTokenId) {
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
    //  Derivative Registration
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Register a child IPA as a derivative of a parent IPA using
    ///         a pre-minted license token.
    /// @param  parentIpId      The parent IP Asset ID
    /// @param  licenseTermsId  License terms ID to mint from parent
    /// @param  receiver        Owner of the child IPA
    /// @return childTokenId    Child NFT token ID
    /// @return childIpId       Child IP Asset ID
    function mintAndRegisterDerivative(
        address parentIpId,
        uint256 licenseTermsId,
        address receiver
    ) external returns (uint256 childTokenId, address childIpId) {
        // Mint child NFT to this contract
        childTokenId = SIMPLE_NFT.mint(address(this));
        childIpId = IP_ASSET_REGISTRY.register(
            block.chainid,
            address(SIMPLE_NFT),
            childTokenId
        );

        // Mint a license token from the parent to this contract
        uint256 licenseTokenId = LICENSING_MODULE.mintLicenseTokens({
            licensorIpId: parentIpId,
            licenseTemplate: address(PIL_TEMPLATE),
            licenseTermsId: licenseTermsId,
            amount: 1,
            receiver: address(this),
            royaltyContext: "",
            maxMintingFee: 0,
            maxRevenueShare: 0
        });

        // Register child as derivative of parent
        uint256[] memory licenseTokenIds = new uint256[](1);
        licenseTokenIds[0] = licenseTokenId;

        LICENSING_MODULE.registerDerivativeWithLicenseTokens({
            childIpId: childIpId,
            licenseTokenIds: licenseTokenIds,
            royaltyContext: "",
            maxRts: 0
        });

        // Transfer child NFT to receiver
        SIMPLE_NFT.transferFrom(address(this), receiver, childTokenId);

        emit DerivativeRegistered(parentIpId, childIpId, licenseTokenId);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Queries
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Check whether an IPA has specific license terms attached.
    function hasLicenseTerms(
        address ipId,
        uint256 licenseTermsId
    ) external view returns (bool) {
        return
            LICENSE_REGISTRY.hasIpAttachedLicenseTerms(
                ipId,
                address(PIL_TEMPLATE),
                licenseTermsId
            );
    }

    /// @notice Count attached license terms for an IPA.
    function getAttachedTermsCount(
        address ipId
    ) external view returns (uint256) {
        return LICENSE_REGISTRY.getAttachedLicenseTermsCount(ipId);
    }
}
