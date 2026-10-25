import { computeSHA256 } from './crypto';
import type { ChunkInfo, FileMetadata } from '../types/p2p';

export const DEFAULT_CHUNK_SIZE = 256 * 1024; // 256 KiB chunks (BitTorrent standard recommendation)

/**
 * Reads a File or Blob, slices it into fixed-size chunks,
 * computes SHA-256 for every chunk and for the whole file,
 * returning full FileMetadata and chunk records.
 */
export async function sliceFileIntoChunks(
  file: File | Blob,
  fileName: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  onProgress?: (progress: number) => void
): Promise<{ metadata: FileMetadata; chunksData: Map<number, Uint8Array> }> {
  const fileSize = file.size;
  const totalChunks = Math.ceil(fileSize / chunkSize) || 1;
  const chunksData = new Map<number, Uint8Array>();
  const chunksInfo: ChunkInfo[] = [];

  // Read complete buffer to compute root SHA-256
  const arrayBuffer = await file.arrayBuffer();
  const fileHash = await computeSHA256(arrayBuffer);

  for (let i = 0; i < totalChunks; i++) {
    const offset = i * chunkSize;
    const end = Math.min(offset + chunkSize, fileSize);
    const chunkSlice = arrayBuffer.slice(offset, end);
    const uint8 = new Uint8Array(chunkSlice);
    const hash = await computeSHA256(uint8);

    chunksData.set(i, uint8);
    chunksInfo.push({
      index: i,
      offset,
      size: chunkSlice.byteLength,
      hash,
      status: 'verified', // Seeder already has verified chunks
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  const metadata: FileMetadata = {
    id: fileHash,
    name: fileName,
    size: fileSize,
    type: file.type || 'application/octet-stream',
    chunkSize,
    totalChunks,
    fileHash,
    chunks: chunksInfo,
    seeders: [],
    isLocal: true,
    createdAt: Date.now(),
  };

  return { metadata, chunksData };
}

/**
 * Reassembles chunks into a single file and performs full SHA-256 verification.
 */
export async function reassembleFile(
  chunksData: Map<number, Uint8Array>,
  expectedTotalChunks: number,
  expectedFileHash: string,
  _fileName: string,
  mimeType: string
): Promise<{
  blob: Blob;
  blobUrl: string;
  verified: boolean;
  computedHash: string;
  error?: string;
}> {
  // Check if all chunks exist
  if (chunksData.size !== expectedTotalChunks) {
    return {
      blob: new Blob([]),
      blobUrl: '',
      verified: false,
      computedHash: '',
      error: `Missing chunks: have ${chunksData.size}/${expectedTotalChunks}`,
    };
  }

  // Calculate total byte size
  let totalBytes = 0;
  for (let i = 0; i < expectedTotalChunks; i++) {
    const chunk = chunksData.get(i);
    if (!chunk) {
      return {
        blob: new Blob([]),
        blobUrl: '',
        verified: false,
        computedHash: '',
        error: `Chunk #${i} is missing from chunk map.`,
      };
    }
    totalBytes += chunk.byteLength;
  }

  // Concatenate chunks in strict sequential order
  const combinedBuffer = new Uint8Array(totalBytes);
  let currentOffset = 0;
  for (let i = 0; i < expectedTotalChunks; i++) {
    const chunk = chunksData.get(i)!;
    combinedBuffer.set(chunk, currentOffset);
    currentOffset += chunk.byteLength;
  }

  // Compute final root SHA-256 of reconstructed buffer
  const computedHash = await computeSHA256(combinedBuffer);
  const verified = computedHash.toLowerCase() === expectedFileHash.toLowerCase();

  const blob = new Blob([combinedBuffer], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);

  return {
    blob,
    blobUrl,
    verified,
    computedHash,
    error: verified ? undefined : `Root hash mismatch! Expected: ${expectedFileHash}, Got: ${computedHash}`,
  };
}

/**
 * Generates deterministic synthetic test file data for presentations.
 * Generates an educational RFC-style document about P2P file sharing.
 */
export async function generateDemoP2PFile(
  totalChunks = 12,
  chunkSize = 256 * 1024
): Promise<{ metadata: FileMetadata; chunksData: Map<number, Uint8Array> }> {
  const fileName = 'PeerLink_RFC_Protocol_Spec_2026.txt';
  const chunksData = new Map<number, Uint8Array>();
  const chunksInfo: ChunkInfo[] = [];

  const totalBytes = totalChunks * chunkSize;
  const fullBuffer = new Uint8Array(totalBytes);

  // Generate deterministic content explaining computer networks concepts
  const headerText = `================================================================================
PEERLINK RFC-2026: BITSTREAM PROTOCOL SPECIFICATION & EXPERIMENTAL SUITE
Computer Networks Final Project — Peer-to-Peer File Sharing System
Standardization Track: Educational RFC for BitTorrent-Inspired Architecture
================================================================================

Abstract:
This document defines PeerLink, an educational peer-to-peer file distribution
protocol leveraging chunked transfers, distributed swarming, and cryptographic
data integrity verification via SHA-256.

1. Protocol Fundamentals:
In traditional client-server architecture, server bandwidth scales linearly O(N)
with the number of active clients. PeerLink distributes the upstream upload
burden across all downloading nodes (leechers and seeders), transforming the
network capacity to scale logarithmically or near-constant under swarm saturation.

2. Chunk Segmentation & Hash Trees:
Files are partitioned into discrete, uniform pieces (default size 256 KiB).
Each piece is individually hashed with SHA-256 to allow immediate validation
upon transmission over untrusted peer channels. Corrupt chunks are isolated
and purged before whole-file reassembly.

3. Swarm Coordination & WebRTC DataChannels:
Signaling servers (trackers) broker SDP offer/answer handshakes and ICE candidates.
Once established, SCTP-over-DTLS DataChannels provide low-latency direct
peer-to-peer byte delivery with zero intermediate storage on the signaling host.

--------------------------------------------------------------------------------
Payload verification block [DETERMINISTIC BITSTREAM GENERATED FOR SIMULATION]
--------------------------------------------------------------------------------
`;

  const headerBytes = new TextEncoder().encode(headerText);
  fullBuffer.set(headerBytes, 0);

  // Fill remainder with deterministic pattern
  for (let i = headerBytes.length; i < totalBytes; i++) {
    // Deterministic pseudo-random bytes based on index and chunk
    const chunkIdx = Math.floor(i / chunkSize);
    const pattern = ((i * 31) ^ (chunkIdx * 101) ^ (i % 256)) & 0xff;
    fullBuffer[i] = pattern;
  }

  const fileHash = await computeSHA256(fullBuffer);

  for (let i = 0; i < totalChunks; i++) {
    const offset = i * chunkSize;
    const chunkBytes = fullBuffer.slice(offset, offset + chunkSize);
    const hash = await computeSHA256(chunkBytes);

    chunksData.set(i, chunkBytes);
    chunksInfo.push({
      index: i,
      offset,
      size: chunkBytes.byteLength,
      hash,
      status: 'idle',
    });
  }

  const metadata: FileMetadata = {
    id: fileHash,
    name: fileName,
    size: totalBytes,
    type: 'text/plain',
    chunkSize,
    totalChunks,
    fileHash,
    chunks: chunksInfo,
    seeders: ['node-alpha', 'node-beta', 'node-gamma'],
    isLocal: false,
    createdAt: Date.now(),
  };

  return { metadata, chunksData };
}
