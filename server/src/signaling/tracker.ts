// In-memory P2P signaling tracker for peer discovery and WebRTC coordination.
// ZERO file bytes or payload data are stored here.

export interface TrackerPeer {
  socketId: string;
  peerId: string;
  joinedAt: number;
}

export interface SwarmFileRecord {
  id: string; // File root SHA-256
  name: string;
  size: number;
  type: string;
  chunkSize: number;
  totalChunks: number;
  fileHash: string;
  seeders: string[]; // List of Peer IDs
  announcedAt: number;
}

export class P2PTracker {
  private peers: Map<string, TrackerPeer> = new Map(); // socketId -> TrackerPeer
  private files: Map<string, SwarmFileRecord> = new Map(); // fileId -> SwarmFileRecord

  public registerPeer(socketId: string, peerId: string): TrackerPeer {
    // Purge any stale socket entry with the exact same peerId
    for (const [sId, p] of this.peers.entries()) {
      if (p.peerId === peerId) {
        this.peers.delete(sId);
      }
    }

    const peer: TrackerPeer = {
      socketId,
      peerId,
      joinedAt: Date.now(),
    };
    this.peers.set(socketId, peer);
    return peer;
  }

  public removePeer(socketId: string): TrackerPeer | undefined {
    const peer = this.peers.get(socketId);
    if (peer) {
      this.peers.delete(socketId);
    }
    return peer;
  }

  public getPeerBySocketId(socketId: string): TrackerPeer | undefined {
    return this.peers.get(socketId);
  }

  public getPeerByPeerId(peerId: string): TrackerPeer | undefined {
    for (const peer of this.peers.values()) {
      if (peer.peerId === peerId) return peer;
    }
    return undefined;
  }

  public getAllPeers(): TrackerPeer[] {
    return Array.from(this.peers.values());
  }

  public announceFile(record: Omit<SwarmFileRecord, 'announcedAt'>): SwarmFileRecord {
    const existing = this.files.get(record.id);
    if (existing) {
      // Add new seeder if not already included
      for (const seeder of record.seeders) {
        if (!existing.seeders.includes(seeder)) {
          existing.seeders.push(seeder);
        }
      }
      return existing;
    } else {
      const newFile: SwarmFileRecord = {
        ...record,
        announcedAt: Date.now(),
      };
      this.files.set(record.id, newFile);
      return newFile;
    }
  }

  public getAllFiles(): SwarmFileRecord[] {
    return Array.from(this.files.values());
  }

  public getStats() {
    return {
      activePeers: this.peers.size,
      indexedFiles: this.files.size,
      uptime: process.uptime(),
    };
  }
}

export const tracker = new P2PTracker();
