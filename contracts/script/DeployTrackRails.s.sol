// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { TrackRailsNFT } from "../src/TrackRailsNFT.sol";
import { TrackRailsProtocol } from "../src/TrackRailsProtocol.sol";
import { TrackRailsPlaylist } from "../src/TrackRailsPlaylist.sol";
import { TrackRailsReadCondition } from "../src/conditions/TrackRailsReadCondition.sol";
import { TrackRailsWriteCondition } from "../src/conditions/TrackRailsWriteCondition.sol";

/// @notice Deploy the full Track Rails protocol on Aeneid testnet.
///
/// Usage:
///   source .env
///   forge script script/DeployTrackRails.s.sol \
///     --rpc-url $RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast \
///     --verify \
///     --verifier blockscout \
///     --verifier-url https://aeneid.storyscan.xyz/api/
///
contract DeployTrackRails is Script {
    // ── Protocol addresses ────────────────────────────────────────────
    address constant IPA = 0x77319B4031e6eF1250907aa00018B8B1c67a244b;
    address constant LM = 0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f;
    address constant PIL = 0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316;
    address constant LR = 0x529a750E02d8E2f15649c13D69a465286a780e24;
    address constant LT = 0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC;
    address constant RPL = 0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E;
    address constant WIP = 0x1514000000000000000000000000000000000000;
    address constant LRC = 0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address dep = vm.addr(pk);
        address fr = vm.envAddress("PLATFORM_FEE_RECIPIENT");

        vm.startBroadcast(pk);

        TrackRailsNFT nft = new TrackRailsNFT("Track Rails", "RAILS", "https://ipfs.io/ipfs/", dep);
        console.log("TrackRailsNFT:", address(nft));

        TrackRailsReadCondition rc = new TrackRailsReadCondition(LRC, address(0));
        console.log("TrackRailsReadCondition:", address(rc));

        TrackRailsWriteCondition wc = new TrackRailsWriteCondition(address(nft));
        console.log("TrackRailsWriteCondition:", address(wc));

        TrackRailsProtocol proto = new TrackRailsProtocol(IPA, LM, PIL, LR, LT, RPL, WIP, address(nft), fr, dep);
        console.log("TrackRailsProtocol:", address(proto));

        nft.transferOwnership(address(proto));
        console.log("NFT ownership transferred to protocol");

        TrackRailsPlaylist playlist = new TrackRailsPlaylist(dep);
        console.log("TrackRailsPlaylist:", address(playlist));

        vm.stopBroadcast();

        // Write addresses to JSON for frontend consumption
        string memory json = string.concat(
            '{"TrackRailsProtocol":"', vm.toString(address(proto)),
            '","TrackRailsNFT":"', vm.toString(address(nft)),
            '","TrackRailsReadCondition":"', vm.toString(address(rc)),
            '","TrackRailsWriteCondition":"', vm.toString(address(wc)),
            '","TrackRailsPlaylist":"', vm.toString(address(playlist)),
            '"}'
        );
        vm.writeJson(json, "./deploy-out/addresses.json");
        console.log("Addresses written to deploy-out/addresses.json");
    }
}
