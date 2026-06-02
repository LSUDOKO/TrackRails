// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @notice CDR write condition interface.
/// conditionData: abi.encode(address trackNft, uint256 tokenId)
interface ICDRWriteCondition {
    function checkWriteCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata conditionData,
        address caller
    ) external view returns (bool);
}

/// @title Track Rails Write Condition
/// @notice Custom CDR write condition for audio track vaults.
///         Only the owner of the track NFT can write/update the vault.
///
/// conditionData: abi.encode(address trackNft, uint256 tokenId)
///   - trackNft: The TrackRails NFT collection address
///   - tokenId:  The track's NFT token ID
contract TrackRailsWriteCondition is ICDRWriteCondition {
    address public immutable TRACK_NFT;

    error UnauthorizedWriter();

    constructor(address trackNft) {
        TRACK_NFT = trackNft;
    }

    /// @inheritdoc ICDRWriteCondition
    /// @dev Verifies that caller is the owner of the specified track NFT.
    ///      conditionData must be abi.encode(address trackNft, uint256 tokenId).
    function checkWriteCondition(
        uint32 /* uuid */,
        bytes calldata /* accessAuxData */,
        bytes calldata conditionData,
        address caller
    ) external view returns (bool) {
        (address expectedNft, uint256 tokenId) = abi.decode(conditionData, (address, uint256));
        if (expectedNft != TRACK_NFT) return false;
        address owner = IERC721(TRACK_NFT).ownerOf(tokenId);
        return owner == caller;
    }
}
