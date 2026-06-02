// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Track Rails NFT Collection
/// @notice SPG-compatible ERC-721 representing audio track ownership.
///         Only the TrackRailsProtocol (or owner) can mint new tokens.
contract TrackRailsNFT is ERC721, Ownable {
    uint256 public nextTokenId = 1;
    string private _baseTokenURI;

    /// @notice Track metadata stored per token.
    mapping(uint256 => string) public tokenMetadataURIs;

    event TokenMetadataUpdated(uint256 indexed tokenId, string uri);

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address initialOwner
    ) ERC721(name, symbol) Ownable(initialOwner) {
        _baseTokenURI = baseURI;
    }

    /// @notice Mint a new track NFT.
    /// @param  to  Recipient of the NFT
    /// @return tokenId  The minted token ID
    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        tokenId = nextTokenId;
        _mint(to, tokenId);
        nextTokenId++;
    }

    /// @notice Set the metadata URI for a token.
    function setTokenMetadataURI(uint256 tokenId, string calldata uri) external onlyOwner {
        tokenMetadataURIs[tokenId] = uri;
        emit TokenMetadataUpdated(tokenId, uri);
    }

    /// @notice Batch mint tokens.
    function batchMint(address to, uint256 amount) external onlyOwner returns (uint256[] memory tokenIds) {
        tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; i++) {
            tokenIds[i] = nextTokenId;
            _mint(to, nextTokenId);
            nextTokenId++;
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
