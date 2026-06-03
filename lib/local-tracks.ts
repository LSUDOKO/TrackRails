"use client";

import type { TrackData, TrackMetadata } from "@/lib/queries";

const STORAGE_KEY = "trackrails:uploaded-tracks";

export interface StoredTrack {
  tokenId: string;
  ipId: `0x${string}`;
  vaultUuid: number;
  owner: `0x${string}`;
  metadataURI: string;
  licenseTermsId: string;
  timestamp: string;
  vaultLinked: boolean;
  meta?: TrackMetadata;
  txHashes?: {
    register?: `0x${string}`;
    vaultAllocate?: string;
    vaultWrite?: string;
    link?: `0x${string}`;
  };
}

export interface LocalTrackEntry extends TrackData {
  meta?: TrackMetadata;
  localOnly?: boolean;
  txHashes?: StoredTrack["txHashes"];
}

function readStoredTracks(): StoredTrack[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredTracks(tracks: StoredTrack[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
}

export function saveUploadedTrack(track: StoredTrack) {
  const tracks = readStoredTracks();
  const next = [
    track,
    ...tracks.filter(
      (item) =>
        item.tokenId !== track.tokenId &&
        item.ipId.toLowerCase() !== track.ipId.toLowerCase(),
    ),
  ].slice(0, 100);

  writeStoredTracks(next);
  window.dispatchEvent(new CustomEvent("trackrails:tracks-updated"));
}

export function getUploadedTracks(owner?: `0x${string}`): LocalTrackEntry[] {
  const tracks = readStoredTracks();
  const normalizedOwner = owner?.toLowerCase();

  return tracks
    .filter((track) => !normalizedOwner || track.owner.toLowerCase() === normalizedOwner)
    .map((track) => ({
      tokenId: BigInt(track.tokenId),
      ipId: track.ipId,
      vaultUuid: track.vaultUuid,
      owner: track.owner,
      metadataURI: track.metadataURI,
      licenseTermsId: BigInt(track.licenseTermsId),
      timestamp: BigInt(track.timestamp),
      vaultLinked: track.vaultLinked,
      meta: track.meta,
      txHashes: track.txHashes,
      localOnly: true,
    }));
}

export function mergeTracksWithLocal<T extends TrackData>(
  remoteTracks: T[],
  localTracks: LocalTrackEntry[],
): Array<T | LocalTrackEntry> {
  const seen = new Set(
    remoteTracks.flatMap((track) => [
      track.tokenId.toString(),
      track.ipId.toLowerCase(),
    ]),
  );

  return [
    ...localTracks.filter(
      (track) =>
        !seen.has(track.tokenId.toString()) &&
        !seen.has(track.ipId.toLowerCase()),
    ),
    ...remoteTracks,
  ];
}
