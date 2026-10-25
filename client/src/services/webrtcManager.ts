import { io, Socket } from 'socket.io-client';
import type { DownloadSession, FileMetadata, NetworkEvent, PeerNode } from '../types/p2p';
import { computeSHA256 } from '../lib/crypto';
import { reassembleFile } from '../lib/chunker';

export type WebRTCEventCallback = (event: NetworkEvent) => void;
export type WebRTCStateCallback = (data: {
  localPeerId: string;
  isConnectedToSignaling: boolean;
  peers: PeerNode[];
  announcedFiles: FileMetadata[];
}) => void;

interface SignalingPeer {
  socketId: string;
  peerId: string;
  joinedAt: number;
}

export class WebRTCManager {
  private socket: Socket | null = null;
  private localPeerId: string;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private connectedPeers: Map<string, PeerNode> = new Map();
  private localFiles: Map<string, { metadata: FileMetadata; chunks: Map<number, Uint8Array> }> = new Map();
  private announcedFiles: Map<string, FileMetadata> = new Map();
  private activeDownloads: Map<string, {
    session: DownloadSession;
    chunksData: Map<number, Uint8Array>;
  }> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  private isConnectedToSignaling = false;
  private onEventCallback: WebRTCEventCallback | null = null;
  private onStateCallback: WebRTCStateCallback | null = null;
  private onDownloadUpdateCallback: ((session: DownloadSession) => void) | null = null;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor() {
    // Generate a unique peer ID for this browser tab
    // Persist per-tab in sessionStorage so page refreshes in the same tab keep the same Peer ID!
    const saved = sessionStorage.getItem('peerlink_peer_id');
    if (saved) {
      this.localPeerId = saved;
    } else {
      this.localPeerId = 'peer-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      sessionStorage.setItem('peerlink_peer_id', this.localPeerId);
    }
  }

  public getLocalPeerId(): string {
    return this.localPeerId;
  }

  public setEventCallback(cb: WebRTCEventCallback) {
    this.onEventCallback = cb;
  }

  public setStateCallback(cb: WebRTCStateCallback) {
    this.onStateCallback = cb;
  }

  public setDownloadUpdateCallback(cb: (session: DownloadSession) => void) {
    this.onDownloadUpdateCallback = cb;
  }

  public getLocalFiles(): FileMetadata[] {
    return Array.from(this.localFiles.values()).map(f => f.metadata);
  }

  public connectToSignaling(serverUrl = 'http://localhost:9001') {
    if (this.socket) {
      this.socket.disconnect();
    }

    try {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        this.isConnectedToSignaling = true;
        this.logEvent({
          type: 'PEER_CONNECTED',
          level: 'success',
          source: 'Signaling Client',
          target: serverUrl,
          details: `Signaling established with Tracker at ${serverUrl}. Node registered as ${this.localPeerId}`,
          isSimulated: false,
        });

        // Register local peer with tracker
        this.socket?.emit('peer:register', { peerId: this.localPeerId });
        this.notifyState();
      });

      this.socket.on('disconnect', () => {
        this.isConnectedToSignaling = false;
        this.logEvent({
          type: 'PEER_DISCONNECTED',
          level: 'warn',
          source: 'Signaling Client',
          details: 'Disconnected from signaling server. Standby for reconnection.',
          isSimulated: false,
        });
        this.notifyState();
      });

      this.socket.on('connect_error', () => {
        this.isConnectedToSignaling = false;
        this.notifyState();
      });

      // Swarm peer discovery
      this.socket.on('peer:list', (peers: SignalingPeer[]) => {
        peers.forEach(p => {
          if (p.peerId !== this.localPeerId && !this.connectedPeers.has(p.peerId)) {
            this.handleDiscoveredPeer(p.peerId);
          }
        });
      });

      this.socket.on('peer:joined', (peer: SignalingPeer) => {
        if (peer.peerId !== this.localPeerId) {
          this.handleDiscoveredPeer(peer.peerId);
        }
      });

      this.socket.on('peer:left', ({ peerId }: { peerId: string }) => {
        this.handlePeerLeft(peerId);
      });

      // Swarm file announcements list (received on join)
      this.socket.on('file:list', (files: FileMetadata[]) => {
        files.forEach(metadata => {
          if (!this.announcedFiles.has(metadata.id)) {
            this.announcedFiles.set(metadata.id, metadata);
          }
        });
        this.notifyState();
      });

      // Swarm file announcement broadcast
      this.socket.on('file:announced', (metadata: FileMetadata) => {
        this.announcedFiles.set(metadata.id, metadata);
        this.logEvent({
          type: 'FILE_ANNOUNCED',
          level: 'info',
          source: metadata.seeders[0] || 'Swarm Peer',
          target: 'Local Peer',
          details: `New file announced in swarm: "${metadata.name}" (${(metadata.size / 1024).toFixed(1)} KiB, ${metadata.totalChunks} chunks)`,
          isSimulated: false,
        });
        this.notifyState();
      });

      // WebRTC Signaling Handshake (SDP Offer / Answer / ICE)
      this.socket.on('signal:offer', async ({ fromPeerId, offer }: { fromPeerId: string; offer: RTCSessionDescriptionInit }) => {
        await this.handleIncomingOffer(fromPeerId, offer);
      });

      this.socket.on('signal:answer', async ({ fromPeerId, answer }: { fromPeerId: string; answer: RTCSessionDescriptionInit }) => {
        await this.handleIncomingAnswer(fromPeerId, answer);
      });

      this.socket.on('signal:ice-candidate', async ({ fromPeerId, candidate }: { fromPeerId: string; candidate: RTCIceCandidateInit }) => {
        await this.handleIncomingIceCandidate(fromPeerId, candidate);
      });

    } catch (err) {
      console.warn('Signaling init warning:', err);
    }
  }

  public connectToPeer(targetPeerId: string) {
    if (!targetPeerId || targetPeerId === this.localPeerId) return;
    this.handleDiscoveredPeer(targetPeerId);
    this.initiateWebRTCConnection(targetPeerId);
  }

  private handleDiscoveredPeer(peerId: string) {
    if (this.connectedPeers.has(peerId)) return;

    const newPeer: PeerNode = {
      id: peerId,
      name: `Peer-${peerId.slice(-4)}`,
      ip: '127.0.0.1 (Direct P2P)',
      port: 50000 + Math.floor(Math.random() * 10000),
      status: 'handshaking',
      connectionType: 'webrtc',
      uploadSpeed: 0,
      downloadSpeed: 0,
      bytesExchanged: 0,
      availableChunks: [],
      rtt: 12 + Math.floor(Math.random() * 15),
    };

    this.connectedPeers.set(peerId, newPeer);
    this.logEvent({
      type: 'PEER_DISCOVERY',
      level: 'info',
      source: 'Signaling Tracker',
      target: peerId,
      details: `Discovered active swarm peer ${peerId}. Initiating WebRTC peer handshake.`,
      isSimulated: false,
    });

    this.notifyState();

    // Initiator rule: Peer with lower ID creates the SDP offer
    if (this.localPeerId < peerId) {
      this.initiateWebRTCConnection(peerId);
    }
  }

  private handlePeerLeft(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) pc.close();
    this.peerConnections.delete(peerId);
    this.dataChannels.delete(peerId);
    this.connectedPeers.delete(peerId);
    this.pendingCandidates.delete(peerId);

    this.logEvent({
      type: 'PEER_DISCONNECTED',
      level: 'warn',
      source: peerId,
      details: `Swarm peer ${peerId} disconnected. Cleaned up DataChannel and sockets.`,
      isSimulated: false,
    });
    this.notifyState();
  }

  private async initiateWebRTCConnection(targetPeerId: string) {
    try {
      const pc = new RTCPeerConnection(this.rtcConfig);
      this.peerConnections.set(targetPeerId, pc);

      // Create DataChannel (Ordered binary)
      const dc = pc.createDataChannel('peerlink-datachannel', { ordered: true });
      this.setupDataChannel(targetPeerId, dc);

      pc.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('signal:ice-candidate', {
            targetPeerId,
            fromPeerId: this.localPeerId,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.socket?.emit('signal:offer', {
        targetPeerId,
        fromPeerId: this.localPeerId,
        offer,
      });

      this.logEvent({
        type: 'SIGNAL_SDP',
        level: 'info',
        source: this.localPeerId,
        target: targetPeerId,
        details: `Sent WebRTC SDP Offer to ${targetPeerId} via Signaling Tracker`,
        isSimulated: false,
      });
    } catch (err) {
      console.error('Error initiating WebRTC offer:', err);
    }
  }

  private async handleIncomingOffer(fromPeerId: string, offer: RTCSessionDescriptionInit) {
    try {
      const pc = new RTCPeerConnection(this.rtcConfig);
      this.peerConnections.set(fromPeerId, pc);

      pc.ondatachannel = (event) => {
        this.setupDataChannel(fromPeerId, event.channel);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('signal:ice-candidate', {
            targetPeerId: fromPeerId,
            fromPeerId: this.localPeerId,
            candidate: event.candidate,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Process any pending ICE candidates
      const pending = this.pendingCandidates.get(fromPeerId) || [];
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingCandidates.delete(fromPeerId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket?.emit('signal:answer', {
        targetPeerId: fromPeerId,
        fromPeerId: this.localPeerId,
        answer,
      });

      this.logEvent({
        type: 'SIGNAL_SDP',
        level: 'info',
        source: this.localPeerId,
        target: fromPeerId,
        details: `Accepted SDP Offer & returned SDP Answer to ${fromPeerId}`,
        isSimulated: false,
      });
    } catch (err) {
      console.error('Error handling incoming offer:', err);
    }
  }

  private async handleIncomingAnswer(fromPeerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(fromPeerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Drain pending candidates
      const pending = this.pendingCandidates.get(fromPeerId) || [];
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('ICE drain error:', e);
        }
      }
      this.pendingCandidates.delete(fromPeerId);
    }
  }

  private async handleIncomingIceCandidate(fromPeerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(fromPeerId);
    if (!pc || !pc.remoteDescription) {
      // Queue until remote description is set
      const list = this.pendingCandidates.get(fromPeerId) || [];
      list.push(candidate);
      this.pendingCandidates.set(fromPeerId, list);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('ICE candidate addition error:', e);
    }
  }

  private setupDataChannel(remotePeerId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    this.dataChannels.set(remotePeerId, dc);

    dc.onopen = () => {
      const peer = this.connectedPeers.get(remotePeerId);
      if (peer) {
        peer.status = 'connected';
      }
      this.logEvent({
        type: 'DATA_CHANNEL_OPEN',
        level: 'success',
        source: 'WebRTC SCTP',
        target: remotePeerId,
        details: `DIRECT P2P DATACHANNEL OPENED with ${remotePeerId}. Server bypassed! Chunks will transfer directly between browsers.`,
        isSimulated: false,
      });
      this.notifyState();
    };

    dc.onclose = () => {
      const peer = this.connectedPeers.get(remotePeerId);
      if (peer) {
        peer.status = 'disconnected';
      }
      this.notifyState();
    };

    dc.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          this.handleControlMessage(remotePeerId, msg);
        } catch (e) {
          console.error('DataChannel JSON parse error:', e);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // Binary chunk payload received directly from remote peer!
        await this.handleBinaryChunk(remotePeerId, event.data);
      }
    };
  }

  private handleControlMessage(remotePeerId: string, msg: any) {
    switch (msg.type) {
      case 'CHUNK_REQUEST': {
        // Remote peer is requesting a chunk that we seed
        const { fileId, chunkIndex } = msg;
        const localFile = this.localFiles.get(fileId);
        if (!localFile) return;

        const chunkBytes = localFile.chunks.get(chunkIndex);
        if (!chunkBytes) return;

        const dc = this.dataChannels.get(remotePeerId);
        if (dc && dc.readyState === 'open') {
          // Send self-contained atomic binary chunk packet:
          // [4 bytes chunkIndex][4 bytes fileIdLength][N bytes fileId][chunkBytes]
          const enc = new TextEncoder();
          const fileIdBytes = enc.encode(fileId);
          const packet = new Uint8Array(8 + fileIdBytes.length + chunkBytes.length);
          const view = new DataView(packet.buffer);

          view.setUint32(0, chunkIndex, false);
          view.setUint32(4, fileIdBytes.length, false);
          packet.set(fileIdBytes, 8);
          packet.set(chunkBytes, 8 + fileIdBytes.length);

          dc.send(packet.buffer as ArrayBuffer);

          // Update metrics
          const peer = this.connectedPeers.get(remotePeerId);
          if (peer) {
            peer.uploadSpeed += chunkBytes.byteLength;
            peer.bytesExchanged += chunkBytes.byteLength;
          }

          this.logEvent({
            type: 'SEED_UPLOAD',
            level: 'info',
            source: 'Local Seeder',
            target: remotePeerId,
            details: `[DIRECT P2P] Transferred Chunk #${chunkIndex} (${(chunkBytes.byteLength / 1024).toFixed(1)} KiB) directly to peer over WebRTC DataChannel (No server involved!)`,
            isSimulated: false,
          });
          this.notifyState();
        }
        break;
      }
    }
  }

  private async handleBinaryChunk(remotePeerId: string, buffer: ArrayBuffer) {
    if (buffer.byteLength < 8) return;

    const view = new DataView(buffer);
    const chunkIndex = view.getUint32(0, false);
    const fileIdLength = view.getUint32(4, false);

    if (buffer.byteLength < 8 + fileIdLength) return;

    const dec = new TextDecoder();
    const fileIdBytes = new Uint8Array(buffer, 8, fileIdLength);
    const fileId = dec.decode(fileIdBytes);

    const chunkBytes = new Uint8Array(buffer, 8 + fileIdLength);

    const download = this.activeDownloads.get(fileId);
    if (!download) return;

    const computedHash = await computeSHA256(chunkBytes);
    const expectedHash = download.session.chunks[chunkIndex]?.hash;
    const targetChunk = download.session.chunks[chunkIndex];

    if (targetChunk) {
      if (expectedHash && computedHash.toLowerCase() === expectedHash.toLowerCase()) {
        targetChunk.status = 'verified';
        targetChunk.computedHash = computedHash;
        targetChunk.sourcePeerId = remotePeerId;
        targetChunk.sourcePeerName = `Peer-${remotePeerId.slice(-4)}`;
        download.chunksData.set(chunkIndex, chunkBytes);
        download.session.receivedChunks++;
        download.session.verifiedChunks++;

        // Update peer metrics
        const peer = this.connectedPeers.get(remotePeerId);
        if (peer) {
          peer.downloadSpeed += chunkBytes.byteLength;
          peer.bytesExchanged += chunkBytes.byteLength;
        }

        this.logEvent({
          type: 'INTEGRITY_VERIFIED',
          level: 'success',
          source: 'WebRTC Receiver',
          target: `Chunk #${chunkIndex}`,
          details: `[DIRECT P2P] Chunk #${chunkIndex} verified via SHA-256 (${computedHash.slice(0, 16)}...) from ${remotePeerId}`,
          isSimulated: false,
        });
      } else {
        targetChunk.status = 'failed';
        this.logEvent({
          type: 'INTEGRITY_FAILED',
          level: 'error',
          source: 'WebRTC Receiver',
          target: `Chunk #${chunkIndex}`,
          details: `Direct P2P Chunk #${chunkIndex} SHA-256 verification failed! Corrupted data discarded.`,
          isSimulated: false,
        });
      }

      if (this.onDownloadUpdateCallback) {
        this.onDownloadUpdateCallback({ ...download.session });
      }

      // Check if all chunks completed
      if (download.session.receivedChunks >= download.session.totalChunks) {
        await this.finalizeWebRTCDownload(fileId);
      }
    }
  }

  private async finalizeWebRTCDownload(fileId: string) {
    const download = this.activeDownloads.get(fileId);
    if (!download) return;

    download.session.status = 'verifying';
    if (this.onDownloadUpdateCallback) {
      this.onDownloadUpdateCallback({ ...download.session });
    }

    const result = await reassembleFile(
      download.chunksData,
      download.session.totalChunks,
      download.session.fileId,
      download.session.fileName,
      'application/octet-stream'
    );

    download.session.blobUrl = result.blobUrl;
    download.session.status = result.verified ? 'completed' : 'failed';
    download.session.completedAt = Date.now();

    this.logEvent({
      type: result.verified ? 'DOWNLOAD_COMPLETED' : 'INTEGRITY_FAILED',
      level: result.verified ? 'success' : 'error',
      source: 'Crypto Engine',
      target: 'Local Peer',
      details: result.verified 
        ? `Direct WebRTC download completed & root SHA-256 verified! Original file restored.`
        : `Reassembly failed: ${result.error}`,
      isSimulated: false,
    });

    if (this.onDownloadUpdateCallback) {
      this.onDownloadUpdateCallback({ ...download.session });
    }
  }

  public announceLocalFile(metadata: FileMetadata, chunksData: Map<number, Uint8Array>) {
    metadata.seeders = [this.localPeerId];
    this.localFiles.set(metadata.id, { metadata, chunks: chunksData });
    this.announcedFiles.set(metadata.id, metadata);

    // Broadcast file announcement to swarm via signaling tracker
    this.socket?.emit('file:announce', metadata);

    this.logEvent({
      type: 'FILE_ANNOUNCED',
      level: 'success',
      source: 'Local Peer (Seeder)',
      target: 'Swarm Tracker',
      details: `Announced file "${metadata.name}" (${(metadata.size / 1024).toFixed(1)} KiB, ${metadata.totalChunks} chunks, SHA-256: ${metadata.fileHash.slice(0, 16)}...) to the swarm. Ready to seed!`,
      isSimulated: false,
    });

    this.notifyState();
  }

  public startDownload(metadata: FileMetadata): DownloadSession {
    const session: DownloadSession = {
      fileId: metadata.id,
      fileName: metadata.name,
      fileSize: metadata.size,
      totalChunks: metadata.totalChunks,
      receivedChunks: 0,
      verifiedChunks: 0,
      status: 'downloading',
      downloadSpeed: 0,
      eta: 0,
      chunks: metadata.chunks.map(c => ({ ...c, status: 'idle' })),
      activePeers: Array.from(this.connectedPeers.keys()),
      startedAt: Date.now(),
    };

    const chunksData = new Map<number, Uint8Array>();
    this.activeDownloads.set(metadata.id, { session, chunksData });

    // Request chunks from available WebRTC connected peers
    const peers = Array.from(this.dataChannels.entries()).filter(([_, dc]) => dc.readyState === 'open');

    if (peers.length === 0) {
      this.logEvent({
        type: 'CHUNK_REQUESTED',
        level: 'warn',
        source: 'Downloader',
        details: 'No direct WebRTC peers currently open. Open a 2nd tab or connect another peer to transfer!',
        isSimulated: false,
      });
    } else {
      for (let i = 0; i < metadata.totalChunks; i++) {
        const [peerId, dc] = peers[i % peers.length];
        session.chunks[i].status = 'requested';
        session.chunks[i].sourcePeerId = peerId;
        dc.send(JSON.stringify({
          type: 'CHUNK_REQUEST',
          fileId: metadata.id,
          chunkIndex: i,
        }));
      }
    }

    this.logEvent({
      type: 'CHUNK_REQUESTED',
      level: 'info',
      source: 'Downloader',
      target: 'Swarm Peers',
      details: `Requested ${metadata.totalChunks} chunks in parallel across ${peers.length} active WebRTC DataChannels`,
      isSimulated: false,
    });

    return session;
  }

  private logEvent(event: Omit<NetworkEvent, 'id' | 'timestamp'>) {
    const fullEvent: NetworkEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    if (this.onEventCallback) {
      this.onEventCallback(fullEvent);
    }
  }

  private notifyState() {
    if (this.onStateCallback) {
      this.onStateCallback({
        localPeerId: this.localPeerId,
        isConnectedToSignaling: this.isConnectedToSignaling,
        peers: Array.from(this.connectedPeers.values()),
        announcedFiles: Array.from(this.announcedFiles.values()),
      });
    }
  }
}

export const webrtcManager = new WebRTCManager();
