// Types for PeerLink P2P File Sharing Network

export type ChunkStatus = 
  | 'idle' 
  | 'requested' 
  | 'downloading' 
  | 'received' 
  | 'verified' 
  | 'failed';

export interface ChunkInfo {
  index: number;
  offset: number;
  size: number;
  hash: string; // Expected SHA-256 hash (hex)
  computedHash?: string; // Actual calculated SHA-256 hash
  status: ChunkStatus;
  sourcePeerId?: string;
  sourcePeerName?: string;
  receivedAt?: number;
  data?: Uint8Array; // Raw bytes stored locally
}

export interface FileMetadata {
  id: string; // Unique file ID / Root SHA-256
  name: string;
  size: number; // Bytes
  type: string; // MIME type
  chunkSize: number; // Bytes per chunk (e.g. 256 KiB)
  totalChunks: number;
  fileHash: string; // SHA-256 root hash of complete file
  chunks: ChunkInfo[];
  seeders: string[]; // List of peer IDs with 100% file
  isLocal?: boolean; // Whether local peer is seeding this file
  createdAt: number;
}

export type PeerConnectionStatus = 'connected' | 'handshaking' | 'choked' | 'disconnected';
export type ConnectionType = 'webrtc' | 'simulation';

export interface PeerNode {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: PeerConnectionStatus;
  connectionType: ConnectionType;
  uploadSpeed: number; // Bytes/sec
  downloadSpeed: number; // Bytes/sec
  bytesExchanged: number; // Total bytes transferred
  availableChunks: number[]; // Indices of chunks possessed
  rtt: number; // Ping round-trip time in ms
  isLocal?: boolean;
}

export type EventLevel = 'info' | 'success' | 'warn' | 'error';
export type EventType = 
  | 'PEER_DISCOVERY'
  | 'PEER_CONNECTED'
  | 'PEER_DISCONNECTED'
  | 'FILE_ANNOUNCED'
  | 'CHUNK_REQUESTED'
  | 'CHUNK_RECEIVED'
  | 'INTEGRITY_VERIFIED'
  | 'INTEGRITY_FAILED'
  | 'DOWNLOAD_COMPLETED'
  | 'SEED_UPLOAD'
  | 'SIGNAL_SDP'
  | 'DATA_CHANNEL_OPEN';

export interface NetworkEvent {
  id: string;
  timestamp: string;
  type: EventType;
  level: EventLevel;
  source: string;
  target?: string;
  details: string;
  isSimulated: boolean;
}

export type DownloadStatus = 
  | 'idle' 
  | 'downloading' 
  | 'paused' 
  | 'verifying' 
  | 'completed' 
  | 'failed';

export interface DownloadSession {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: number;
  verifiedChunks: number;
  status: DownloadStatus;
  downloadSpeed: number; // Bytes/s
  eta: number; // Seconds
  chunks: ChunkInfo[];
  activePeers: string[];
  blobUrl?: string;
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
}
