// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { MockIPGraph } from "@storyprotocol/test/mocks/MockIPGraph.sol";

import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ILicenseRegistry } from "@storyprotocol/core/interfaces/registries/ILicenseRegistry.sol";
import { ILicensingModule } from "@storyprotocol/core/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { ILicenseToken } from "@storyprotocol/core/interfaces/ILicenseToken.sol";
import { IRoyaltyModule } from "@storyprotocol/core/interfaces/modules/royalty/IRoyaltyModule.sol";

import { TrackRailsProtocol } from "../src/TrackRailsProtocol.sol";
import { TrackRailsNFT } from "../src/TrackRailsNFT.sol";
import { TrackRailsReadCondition } from "../src/conditions/TrackRailsReadCondition.sol";
import { TrackRailsWriteCondition } from "../src/conditions/TrackRailsWriteCondition.sol";

// Run with:
// forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/TrackRailsProtocol.t.sol -vvv

contract TrackRailsProtocolTest is Test {
    address internal alice = address(0xa11ce);
    address internal bob = address(0xb0b);

    // ── Aeneid Story Protocol contract addresses ──────────────────────
    IIPAssetRegistry internal IP_ASSET_REGISTRY =
        IIPAssetRegistry(0x77319B4031e6eF1250907aa00018B8B1c67a244b);
    ILicenseRegistry internal LICENSE_REGISTRY =
        ILicenseRegistry(0x529a750E02d8E2f15649c13D69a465286a780e24);
    ILicensingModule internal LICENSING_MODULE =
        ILicensingModule(0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f);
    IPILicenseTemplate internal PIL_TEMPLATE =
        IPILicenseTemplate(0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316);
    ILicenseToken internal LICENSE_TOKEN =
        ILicenseToken(0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC);
    IRoyaltyModule internal ROYALTY_MODULE =
        IRoyaltyModule(0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086);
    address internal ROYALTY_POLICY_LAP =
        0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E;
    address internal WIP =
        0x1514000000000000000000000000000000000000;
    address internal LICENSE_READ_CONDITION =
        0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3;
    TrackRailsNFT public nft;
    TrackRailsProtocol public protocol;
    TrackRailsReadCondition public readCondition;
    TrackRailsWriteCondition public writeCondition;

    function setUp() public {
        // Etch MockIPGraph at the precompile address for fork tests
        vm.etch(address(0x0101), address(new MockIPGraph()).code);

        // Deploy NFT collection (owned by this test contract initially)
        nft = new TrackRailsNFT("Track Rails", "RAILS", "https://ipfs.io/ipfs/", address(this));

        // Deploy condition contracts
        readCondition = new TrackRailsReadCondition(LICENSE_READ_CONDITION, address(0));
        writeCondition = new TrackRailsWriteCondition(address(nft));

        // Deploy protocol
        protocol = new TrackRailsProtocol(
            address(IP_ASSET_REGISTRY),
            address(LICENSING_MODULE),
            address(PIL_TEMPLATE),
            address(LICENSE_REGISTRY),
            address(LICENSE_TOKEN),
            ROYALTY_POLICY_LAP,
            WIP,
            address(nft),
            address(this),   // platform fee recipient = this test contract
            address(this)    // initial owner = this test contract
        );

        // Transfer NFT ownership to protocol so it can mint tracks
        nft.transferOwnership(address(protocol));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 1: Register a track (NFT + IPA + license terms)
    // ═══════════════════════════════════════════════════════════════════

    function test_registerTrack() public {
        uint256 expectedTokenId = nft.nextTokenId();
        address expectedIpId = IP_ASSET_REGISTRY.ipId(
            block.chainid,
            address(nft),
            expectedTokenId
        );

        vm.prank(alice);
        (uint256 tokenId, address ipId, uint256 licenseTermsId) = protocol.registerTrack(
            alice,
            10_000_000, // 10% rev share
            "https://ipfs.io/ipfs/QmTrackMetadata"
        );

        assertEq(tokenId, expectedTokenId);
        assertEq(ipId, expectedIpId);

        // Verify NFT ownership
        assertEq(nft.ownerOf(tokenId), alice);

        // Verify track data
        TrackRailsProtocol.Track memory track = protocol.getTrack(tokenId);
        assertEq(track.ipId, ipId);
        assertEq(track.owner, alice);
        assertEq(track.licenseTermsId, licenseTermsId);
        assertEq(track.metadataURI, "https://ipfs.io/ipfs/QmTrackMetadata");
        assertFalse(track.vaultLinked);

        // Verify license terms are attached
        assertTrue(protocol.hasLicenseTerms(ipId, licenseTermsId));
        assertEq(protocol.getAttachedTermsCount(ipId), 1);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 2: Link a CDR vault to a track
    // ═══════════════════════════════════════════════════════════════════

    function test_linkVault() public {
        vm.prank(alice);
        (uint256 tokenId, address ipId, ) = protocol.registerTrack(alice, 10_000_000, "");

        uint32 vaultUuid = 42;

        // Only the track owner can link
        vm.prank(alice);
        protocol.linkVault(tokenId, vaultUuid);

        TrackRailsProtocol.Track memory track = protocol.getTrack(tokenId);
        assertEq(track.vaultUuid, vaultUuid);
        assertTrue(track.vaultLinked);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 3: Revert when non-owner tries to link vault
    // ═══════════════════════════════════════════════════════════════════

    function test_linkVault_revertNotOwner() public {
        vm.prank(alice);
        (uint256 tokenId, , ) = protocol.registerTrack(alice, 10_000_000, "");

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(TrackRailsProtocol.NotTrackOwner.selector));
        protocol.linkVault(tokenId, 42);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 4: Revert when linking already-linked vault
    // ═══════════════════════════════════════════════════════════════════

    function test_linkVault_revertAlreadyLinked() public {
        vm.prank(alice);
        (uint256 tokenId, , ) = protocol.registerTrack(alice, 10_000_000, "");

        vm.startPrank(alice);
        protocol.linkVault(tokenId, 42);
        vm.expectRevert(abi.encodeWithSelector(TrackRailsProtocol.TrackAlreadyLinked.selector));
        protocol.linkVault(tokenId, 99);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 5: Mint a license token
    // ═══════════════════════════════════════════════════════════════════

    function test_mintLicense() public {
        vm.prank(alice);
        (, address ipId, uint256 licenseTermsId) = protocol.registerTrack(alice, 10_000_000, "");

        vm.prank(bob);
        uint256 licenseTokenId = protocol.mintLicense(ipId, licenseTermsId, bob);

        assertEq(LICENSE_TOKEN.ownerOf(licenseTokenId), bob);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 6: Register multiple tracks and query
    // ═══════════════════════════════════════════════════════════════════

    function test_multipleTracks() public {
        vm.startPrank(alice);
        (uint256 tokenId1, address ipId1, ) = protocol.registerTrack(alice, 10_000_000, "uri1");
        (uint256 tokenId2, address ipId2, ) = protocol.registerTrack(alice, 20_000_000, "uri2");
        vm.stopPrank();

        assertEq(protocol.getTrackCount(), 2);

        // Query by owner
        uint256[] memory aliceTracks = protocol.getTracksByOwner(alice);
        assertEq(aliceTracks.length, 2);
        assertEq(aliceTracks[0], tokenId1);
        assertEq(aliceTracks[1], tokenId2);

        // Paginated listing
        uint256[] memory ids = protocol.getTrackIds(0, 1);
        assertEq(ids.length, 1);
        assertEq(ids[0], tokenId1);

        ids = protocol.getTrackIds(1, 1);
        assertEq(ids.length, 1);
        assertEq(ids[0], tokenId2);

        // IPA to token ID lookup
        assertEq(protocol.getTokenIdForIp(ipId1), tokenId1);
        assertEq(protocol.getTokenIdForIp(ipId2), tokenId2);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 7: Platform fee admin
    // ═══════════════════════════════════════════════════════════════════

    function test_platformFee_admin() public {
        assertEq(protocol.platformFeeBPS(), 250);

        protocol.updatePlatformFee(500);
        assertEq(protocol.platformFeeBPS(), 500);

        // Non-owner cannot update
        vm.prank(alice);
        vm.expectRevert();
        protocol.updatePlatformFee(300);
    }

    function test_platformFee_revertTooHigh() public {
        vm.expectRevert(abi.encodeWithSelector(TrackRailsProtocol.InvalidFeeBPS.selector));
        protocol.updatePlatformFee(2000); // > 10%
    }

    function test_platformFeeRecipient() public {
        protocol.setPlatformFeeRecipient(alice);
        assertEq(protocol.platformFeeRecipient(), alice);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 8: Register track with different rev shares
    // ═══════════════════════════════════════════════════════════════════

    function test_registerTrack_revShare() public {
        vm.prank(alice);
        (, , uint256 licenseTermsId) = protocol.registerTrack(alice, 5_000_000, ""); // 5%

        // Verify terms exist — the licenseTermsId should match a registered commercial-remix term
        assertTrue(licenseTermsId > 0);
        assertTrue(protocol.hasLicenseTerms(
            IP_ASSET_REGISTRY.ipId(block.chainid, address(nft), nft.nextTokenId() - 1),
            licenseTermsId
        ));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 9: Query non-existent track
    // ═══════════════════════════════════════════════════════════════════

    function test_getTrack_revertNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(TrackRailsProtocol.TrackNotFound.selector));
        protocol.getTrack(999);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 10: CDR read condition contract
    // ═══════════════════════════════════════════════════════════════════

    function test_readCondition_delegatesToLicenseRead() public {
        // The deployed LicenseReadCondition will return false for non-valid reads
        // This tests that our contract delegates to it without reverting
        bool result = readCondition.checkReadCondition(
            0,
            "0x",
            abi.encode(LICENSE_TOKEN, address(0)),
            address(this)
        );
        assertFalse(result);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 11: CDR write condition contract
    // ═══════════════════════════════════════════════════════════════════

    function test_writeCondition_ownerWrite() public {
        vm.prank(alice);
        (uint256 tokenId, , ) = protocol.registerTrack(alice, 10_000_000, "");

        // Alice owns the token — should pass
        bytes memory conditionData = abi.encode(address(nft), tokenId);
        bool result = writeCondition.checkWriteCondition(0, "0x", conditionData, alice);
        assertTrue(result);

        // Bob does not own the token — should fail
        result = writeCondition.checkWriteCondition(0, "0x", conditionData, bob);
        assertFalse(result);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Test 12: Write condition rejects wrong NFT address
    // ═══════════════════════════════════════════════════════════════════

    function test_writeCondition_wrongNft() public {
        vm.prank(alice);
        (uint256 tokenId, , ) = protocol.registerTrack(alice, 10_000_000, "");

        // Use a different NFT address in condition data
        bytes memory conditionData = abi.encode(address(0x1234), tokenId);
        bool result = writeCondition.checkWriteCondition(0, "0x", conditionData, alice);
        assertFalse(result);
    }
}
