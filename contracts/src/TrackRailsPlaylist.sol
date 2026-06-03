// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Track Rails Playlist Registry
/// @notice On-chain playlist registry for Track Rails.
///         Users can create playlists and add/remove tracks by token ID.
contract TrackRailsPlaylist is Ownable {
    struct Playlist {
        uint256 id;
        string name;
        string description;
        address owner;
        uint256[] trackTokenIds;
        uint256 createdAt;
    }

    uint256 public nextId;
    mapping(uint256 => Playlist) public playlists;
    mapping(address => uint256[]) internal _playlistsByOwner;

    event PlaylistCreated(uint256 indexed id, string name, address indexed owner);
    event TrackAdded(uint256 indexed playlistId, uint256 indexed tokenId);
    event TrackRemoved(uint256 indexed playlistId, uint256 indexed tokenId);

    error NotPlaylistOwner();
    error PlaylistNotFound();
    error TrackNotInPlaylist();
    error TrackAlreadyInPlaylist();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function createPlaylist(string calldata name, string calldata description) external returns (uint256 id) {
        id = nextId++;
        Playlist storage p = playlists[id];
        p.id = id;
        p.name = name;
        p.description = description;
        p.owner = msg.sender;
        p.createdAt = block.timestamp;
        _playlistsByOwner[msg.sender].push(id);
        emit PlaylistCreated(id, name, msg.sender);
    }

    function addTrack(uint256 playlistId, uint256 trackTokenId) external {
        Playlist storage p = playlists[playlistId];
        if (p.owner != msg.sender) revert NotPlaylistOwner();
        for (uint256 i = 0; i < p.trackTokenIds.length; i++) {
            if (p.trackTokenIds[i] == trackTokenId) revert TrackAlreadyInPlaylist();
        }
        p.trackTokenIds.push(trackTokenId);
        emit TrackAdded(playlistId, trackTokenId);
    }

    function removeTrack(uint256 playlistId, uint256 trackTokenId) external {
        Playlist storage p = playlists[playlistId];
        if (p.owner != msg.sender) revert NotPlaylistOwner();
        uint256 len = p.trackTokenIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (p.trackTokenIds[i] == trackTokenId) {
                p.trackTokenIds[i] = p.trackTokenIds[len - 1];
                p.trackTokenIds.pop();
                emit TrackRemoved(playlistId, trackTokenId);
                return;
            }
        }
        revert TrackNotInPlaylist();
    }

    function getPlaylist(uint256 id) external view returns (Playlist memory) {
        if (playlists[id].owner == address(0)) revert PlaylistNotFound();
        return playlists[id];
    }

    function getPlaylistsByOwner(address owner) external view returns (uint256[] memory) {
        return _playlistsByOwner[owner];
    }

    function getPlaylistCount() external view returns (uint256) {
        return nextId;
    }

    function getPlaylistIds(uint256 offset, uint256 limit) external view returns (uint256[] memory ids) {
        if (offset >= nextId) return new uint256[](0);
        uint256 end = offset + limit;
        if (end > nextId) end = nextId;
        uint256 count = end - offset;
        ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = offset + i;
        }
    }
}
