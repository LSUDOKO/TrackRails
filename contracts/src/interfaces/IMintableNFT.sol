// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal interface for an NFT collection that can mint tokens.
///         Used by TrackRailsProtocol to mint track ownership NFTs.
interface IMintableNFT {
    function mint(address to) external returns (uint256 tokenId);
}
