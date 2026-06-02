// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice A minimal ERC-721 used as an SPG-compatible NFT for testing.
///         Matches the SimpleNFT from Story Protocol's boilerplate.
contract SimpleNFT is ERC721 {
    uint256 public nextTokenId;
    string private _baseTokenURI;

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        nextTokenId = 1;
    }

    function mint(address to) public returns (uint256 tokenId) {
        tokenId = nextTokenId;
        _mint(to, tokenId);
        nextTokenId++;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) external {
        _baseTokenURI = baseURI;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
