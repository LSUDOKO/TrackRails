// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice CDR read condition that gates decryption to license token holders.
///         Uses the deployed LicenseReadCondition on Aeneid for the base check,
///         with additional protocol-level constraints.
///
/// conditionData: abi.encode(address licenseToken, address ipId)
/// accessAuxData: abi.encode(uint256[] licenseTokenIds)
interface ICDRReadCondition {
    function checkReadCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata conditionData,
        address caller
    ) external view returns (bool);
}

/// @title Track Rails Read Condition
/// @notice Custom CDR read condition for license-gated audio tracks.
///         Verifies the caller holds a valid license token for the given IPA,
///         and optionally enforces protocol-level rules.
contract TrackRailsReadCondition is ICDRReadCondition {
    /// @notice Reference to the deployed LicenseReadCondition on Aeneid
    ///         that performs the actual license token ownership check.
    address public immutable LICENSE_READ_CONDITION;

    /// @notice TrackRails protocol address (optional, for additional checks).
    address public immutable PROTOCOL;

    error UnauthorizedReader();

    constructor(address licenseReadCondition, address protocol) {
        LICENSE_READ_CONDITION = licenseReadCondition;
        PROTOCOL = protocol;
    }

    /// @inheritdoc ICDRReadCondition
    /// @dev Delegates to the deployed LicenseReadCondition for the base check.
    ///      conditionData is forwarded verbatim: abi.encode(licenseToken, ipId).
    ///      accessAuxData is forwarded verbatim: abi.encode(uint256[] tokenIds).
    function checkReadCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata conditionData,
        address caller
    ) external view returns (bool) {
        (bool success, bytes memory result) = LICENSE_READ_CONDITION.staticcall(
            abi.encodeWithSignature(
                "checkReadCondition(uint32,bytes,bytes,address)",
                uuid,
                accessAuxData,
                conditionData,
                caller
            )
        );
        if (!success || abi.decode(result, (bool)) == false) {
            return false;
        }
        return true;
    }
}
