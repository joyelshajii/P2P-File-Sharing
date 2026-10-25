import type { DownloadSession, FileMetadata, NetworkEvent, PeerNode } from '../types/p2p';
import { generateDemoP2PFile, reassembleFile } from '../lib/chunker';
import { computeSHA256 } from '../lib/crypto';

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  speedMultiplier: number; // 0.5, 1, 2, 5, 10
  corruptPieceTest: boolean; // Tamper test for presentation
  currentStep: number;
  totalSteps: number;
  fileMetadata: FileMetadata | null;
  downloadSession: DownloadSession | null;
  peers: PeerNode[];
  chunksData: Map<number, Uint8Array>;
  receivedChunksData: Map<number, Uint8Array>;
  reassembledBlobUrl: string | null;
  reassembledSuccess: boolean | null;
}

export type SimulationCallback = (state: SimulationState, event?: NetworkEvent) => void;

export class SimulationEngine {
  private state: SimulationState;
  private timer: number | null = null;
  private callback: SimulationCallback | null = null;
  private peersConfig: PeerNode[] = [];
  private chunkAssignments: Map<number, string> = new Map(); // chunkIndex -> peerId

  constructor() {
    this.state = {
      isRunning: false,
      isPaused: false,
      speedMultiplier: 1,
      corruptPieceTest: false,
      currentStep: 0,
      totalSteps: 12,
      fileMetadata: null,
      downloadSession: null,
      peers: [],
      chunksData: new Map(),
      receivedChunksData: new Map(),
      reassembledBlobUrl: null,
      reassembledSuccess: null,
    };
    this.initializeDefaultPeers();
  }

  public setCallback(cb: SimulationCallback) {
    this.callback = cb;
  }

  public getState(): SimulationState {
    return { ...this.state };
  }

  public setSpeedMultiplier(multiplier: number) {
    this.state.speedMultiplier = multiplier;
    this.notify();
  }

  public setCorruptPieceTest(enabled: boolean) {
    this.state.corruptPieceTest = enabled;
    this.notify();
  }

  private initializeDefaultPeers() {
    this.peersConfig = [
      {
        id: 'node-alpha',
        name: 'Node-Alpha [US-East Relay]',
        ip: '198.51.100.24',
        port: 6881,
        status: 'connected',
        connectionType: 'simulation',
        uploadSpeed: 0,
        downloadSpeed: 0,
        bytesExchanged: 0,
        availableChunks: [0, 3, 6, 9],
        rtt: 32,
      },
      {
        id: 'node-beta',
        name: 'Node-Beta [EU-Central Hub]',
        ip: '203.0.113.88',
        port: 6882,
        status: 'connected',
        connectionType: 'simulation',
        uploadSpeed: 0,
        downloadSpeed: 0,
        bytesExchanged: 0,
        availableChunks: [1, 4, 7, 10],
        rtt: 68,
      },
      {
        id: 'node-gamma',
        name: 'Node-Gamma [AP-South Node]',
        ip: '192.0.2.145',
        port: 6883,
        status: 'connected',
        connectionType: 'simulation',
        uploadSpeed: 0,
        downloadSpeed: 0,
        bytesExchanged: 0,
        availableChunks: [2, 5, 8, 11],
        rtt: 115,
      },
    ];

    // Assign chunks to peers:
    // Peer Alpha: 0, 3, 6, 9
    // Peer Beta: 1, 4, 7, 10
    // Peer Gamma: 2, 5, 8, 11
    [0, 3, 6, 9].forEach(idx => this.chunkAssignments.set(idx, 'node-alpha'));
    [1, 4, 7, 10].forEach(idx => this.chunkAssignments.set(idx, 'node-beta'));
    [2, 5, 8, 11].forEach(idx => this.chunkAssignments.set(idx, 'node-gamma'));

    this.state.peers = JSON.parse(JSON.stringify(this.peersConfig));
  }

  public async initializeFile(): Promise<FileMetadata> {
    const { metadata, chunksData } = await generateDemoP2PFile(12, 256 * 1024);
    this.state.fileMetadata = metadata;
    this.state.chunksData = chunksData;
    this.state.receivedChunksData = new Map();
    this.state.reassembledBlobUrl = null;
    this.state.reassembledSuccess = null;

    this.state.downloadSession = {
      fileId: metadata.id,
      fileName: metadata.name,
      fileSize: metadata.size,
      totalChunks: metadata.totalChunks,
      receivedChunks: 0,
      verifiedChunks: 0,
      status: 'idle',
      downloadSpeed: 0,
      eta: 0,
      chunks: metadata.chunks.map(c => ({ ...c, status: 'idle' })),
      activePeers: ['node-alpha', 'node-beta', 'node-gamma'],
    };

    this.notify({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'FILE_ANNOUNCED',
      level: 'info',
      source: 'Signaling Tracker',
      target: 'Swarm',
      details: `Discovered 12-chunk swarm manifest for ${metadata.name} (SHA-256: ${metadata.fileHash.slice(0, 16)}...)`,
      isSimulated: true,
    });

    return metadata;
  }

  public async startDemo() {
    if (this.state.isRunning && !this.state.isPaused) return;

    if (this.state.isPaused) {
      this.resumeDemo();
      return;
    }

    // Fresh start
    if (!this.state.fileMetadata) {
      await this.initializeFile();
    }

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.currentStep = 0;
    this.state.receivedChunksData.clear();
    this.state.reassembledBlobUrl = null;
    this.state.reassembledSuccess = null;

    if (this.state.downloadSession) {
      this.state.downloadSession.status = 'downloading';
      this.state.downloadSession.startedAt = Date.now();
      this.state.downloadSession.receivedChunks = 0;
      this.state.downloadSession.verifiedChunks = 0;
      this.state.downloadSession.chunks = this.state.downloadSession.chunks.map(c => ({
        ...c,
        status: 'idle',
        sourcePeerId: undefined,
        sourcePeerName: undefined,
      }));
    }

    this.notify({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'PEER_CONNECTED',
      level: 'success',
      source: 'Local-Peer',
      target: 'Swarm (3 nodes)',
      details: 'Simulation started: Connected to Node-Alpha, Node-Beta, and Node-Gamma over simulated DataChannels',
      isSimulated: true,
    });

    this.scheduleNextStep();
  }

  public pauseDemo() {
    if (!this.state.isRunning || this.state.isPaused) return;
    this.state.isPaused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.state.downloadSession) {
      this.state.downloadSession.status = 'paused';
      this.state.downloadSession.downloadSpeed = 0;
    }
    this.notify({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'CHUNK_REQUESTED',
      level: 'warn',
      source: 'User Controller',
      details: 'Simulation execution paused by operator.',
      isSimulated: true,
    });
  }

  public resumeDemo() {
    if (!this.state.isRunning || !this.state.isPaused) return;
    this.state.isPaused = false;
    if (this.state.downloadSession) {
      this.state.downloadSession.status = 'downloading';
    }
    this.notify({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'CHUNK_REQUESTED',
      level: 'info',
      source: 'User Controller',
      details: 'Simulation execution resumed.',
      isSimulated: true,
    });
    this.scheduleNextStep();
  }

  public resetDemo() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.currentStep = 0;
    this.state.receivedChunksData.clear();
    this.state.reassembledBlobUrl = null;
    this.state.reassembledSuccess = null;

    this.initializeDefaultPeers();

    if (this.state.downloadSession && this.state.fileMetadata) {
      this.state.downloadSession.status = 'idle';
      this.state.downloadSession.receivedChunks = 0;
      this.state.downloadSession.verifiedChunks = 0;
      this.state.downloadSession.downloadSpeed = 0;
      this.state.downloadSession.eta = 0;
      this.state.downloadSession.chunks = this.state.fileMetadata.chunks.map(c => ({
        ...c,
        status: 'idle',
        sourcePeerId: undefined,
        sourcePeerName: undefined,
      }));
    }

    this.notify({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'PEER_DISCONNECTED',
      level: 'info',
      source: 'System',
      details: 'Simulation reset to pristine initial state. Chunks and sessions cleared.',
      isSimulated: true,
    });
  }

  private scheduleNextStep() {
    if (!this.state.isRunning || this.state.isPaused) return;

    // Base delay per step (scaled by speed multiplier)
    const baseDelay = 700;
    const delay = Math.max(80, Math.round(baseDelay / this.state.speedMultiplier));

    this.timer = window.setTimeout(async () => {
      await this.executeStep();
    }, delay);
  }

  private async executeStep() {
    if (!this.state.isRunning || this.state.isPaused) return;

    const chunkIdx = this.state.currentStep;
    const totalChunks = this.state.totalSteps;

    if (chunkIdx >= totalChunks) {
      // All chunks processed -> finalize reassembly
      await this.finalizeReassembly();
      return;
    }

    const peerId = this.chunkAssignments.get(chunkIdx) || 'node-alpha';
    const peer = this.state.peers.find(p => p.id === peerId);
    const peerName = peer ? peer.name : peerId;
    const session = this.state.downloadSession;

    if (!session) return;

    // Phase 1: Mark chunk requested & downloading
    const targetChunk = session.chunks[chunkIdx];
    targetChunk.status = 'downloading';
    targetChunk.sourcePeerId = peerId;
    targetChunk.sourcePeerName = peerName;

    // Update peer speeds & bandwidth
    const chunkSize = targetChunk.size;
    if (peer) {
      peer.downloadSpeed = Math.round(chunkSize * (1 + Math.random() * 0.3) * this.state.speedMultiplier);
      peer.uploadSpeed = Math.round(chunkSize * 0.1);
      peer.bytesExchanged += chunkSize;
    }

    const totalSpeed = this.state.peers.reduce((acc, p) => acc + p.downloadSpeed, 0);
    session.downloadSpeed = totalSpeed;
    const remainingChunks = totalChunks - (chunkIdx + 1);
    session.eta = Math.max(1, Math.round(remainingChunks / (this.state.speedMultiplier * 1.5)));

    this.notify({
      id: `evt-req-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'CHUNK_REQUESTED',
      level: 'info',
      source: 'Local-Peer',
      target: peerName,
      details: `Requested Chunk #${chunkIdx} (256 KiB) from ${peerId}`,
      isSimulated: true,
    });

    // Small delay for packet transit
    const transitDelay = Math.max(50, Math.round(350 / this.state.speedMultiplier));
    await new Promise(r => setTimeout(r, transitDelay));

    // Phase 2: Chunk Received & Hash Verification
    let rawChunk = this.state.chunksData.get(chunkIdx);

    // If corruptPieceTest is enabled and this is chunk 4, simulate tampering from Node-Beta!
    if (this.state.corruptPieceTest && chunkIdx === 4) {
      // Corrupt chunk bytes
      const corruptedBytes = new Uint8Array(rawChunk || new Uint8Array(256 * 1024));
      corruptedBytes[42] = (corruptedBytes[42] ^ 0xff); // Bit flip
      const badHash = await computeSHA256(corruptedBytes);
      targetChunk.status = 'failed';
      targetChunk.computedHash = badHash;

      this.notify({
        id: `evt-corrupt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'INTEGRITY_FAILED',
        level: 'error',
        source: peerName,
        target: 'Local-Peer',
        details: `INTEGRITY TAMPER DETECTED: Chunk #${chunkIdx} hash mismatch! Expected ${targetChunk.hash.slice(0, 12)}..., Received ${badHash.slice(0, 12)}... Dropping corrupted piece!`,
        isSimulated: true,
      });

      // Presenter recovery: re-request from backup peer Node-Alpha!
      await new Promise(r => setTimeout(r, 600));
      targetChunk.status = 'downloading';
      targetChunk.sourcePeerId = 'node-alpha';
      targetChunk.sourcePeerName = 'Node-Alpha [Backup Redundant Source]';

      this.notify({
        id: `evt-retry-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'CHUNK_REQUESTED',
        level: 'warn',
        source: 'Local-Peer',
        target: 'Node-Alpha',
        details: `Auto-Recovery: Re-requesting clean Chunk #${chunkIdx} from redundant seeder Node-Alpha`,
        isSimulated: true,
      });

      await new Promise(r => setTimeout(r, 400));
    }

    if (rawChunk) {
      this.state.receivedChunksData.set(chunkIdx, rawChunk);
    }

    targetChunk.status = 'verified';
    targetChunk.receivedAt = Date.now();
    targetChunk.computedHash = targetChunk.hash;
    session.receivedChunks++;
    session.verifiedChunks++;

    this.notify({
      id: `evt-recv-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'INTEGRITY_VERIFIED',
      level: 'success',
      source: 'Crypto-Engine',
      target: `Chunk #${chunkIdx}`,
      details: `SHA-256 Verified for Chunk #${chunkIdx} (${targetChunk.hash.slice(0, 16)}...) from ${targetChunk.sourcePeerName}`,
      isSimulated: true,
    });

    this.state.currentStep++;
    this.scheduleNextStep();
  }

  private async finalizeReassembly() {
    const session = this.state.downloadSession;
    const metadata = this.state.fileMetadata;
    if (!session || !metadata) return;

    session.status = 'verifying';
    session.downloadSpeed = 0;
    session.eta = 0;

    // Reset peer dynamic transfer speeds
    this.state.peers.forEach(p => {
      p.downloadSpeed = 0;
      p.uploadSpeed = 0;
    });

    this.notify({
      id: `evt-reassembly-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'CHUNK_RECEIVED',
      level: 'info',
      source: 'Reassembler',
      target: 'Local Memory',
      details: `All 12 chunks received! Stitching binary payload & calculating final root SHA-256...`,
      isSimulated: true,
    });

    await new Promise(r => setTimeout(r, 400));

    // Perform actual real concatenation & verification
    const result = await reassembleFile(
      this.state.receivedChunksData,
      metadata.totalChunks,
      metadata.fileHash,
      metadata.name,
      metadata.type
    );

    this.state.reassembledBlobUrl = result.blobUrl;
    this.state.reassembledSuccess = result.verified;
    session.blobUrl = result.blobUrl;
    session.status = result.verified ? 'completed' : 'failed';
    session.completedAt = Date.now();
    this.state.isRunning = false;
    this.state.isPaused = false;

    if (result.verified) {
      this.notify({
        id: `evt-complete-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'DOWNLOAD_COMPLETED',
        level: 'success',
        source: 'Crypto-Engine',
        target: 'Local-Peer',
        details: `ROOT HASH VERIFIED! [${result.computedHash.slice(0, 16)}...] File reconstruction 100% complete and authentic! Ready for disk download.`,
        isSimulated: true,
      });
    } else {
      this.notify({
        id: `evt-complete-fail-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'INTEGRITY_FAILED',
        level: 'error',
        source: 'Crypto-Engine',
        target: 'Local-Peer',
        details: `Root hash verification failed! ${result.error}`,
        isSimulated: true,
      });
    }
  }

  private notify(event?: NetworkEvent) {
    if (this.callback) {
      this.callback(this.getState(), event);
    }
  }
}

export const simulationEngine = new SimulationEngine();
