import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { tracker } from './signaling/tracker.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 9001;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// REST Health and Debug API
app.get('/health', (_req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'PeerLink WebRTC Signaling & Swarm Tracker',
    protocol: 'BitTorrent-inspired P2P (Educational)',
    version: '1.0.0',
    stats: tracker.getStats(),
  });
});

app.get('/api/peers', (_req, res) => {
  res.json(tracker.getAllPeers());
});

app.get('/api/files', (_req, res) => {
  res.json(tracker.getAllFiles());
});

// Socket.IO Signaling Events for WebRTC Peer Discovery & Handshakes
io.on('connection', (socket: Socket) => {
  console.log(`[SIGNALING] New socket connected: ${socket.id}`);

  // Peer Registration
  socket.on('peer:register', ({ peerId }: { peerId: string }) => {
    const peer = tracker.registerPeer(socket.id, peerId);
    console.log(`[SWARM] Registered Peer: ${peerId} (socket: ${socket.id})`);

    // Broadcast updated peer list to all other clients
    socket.broadcast.emit('peer:joined', peer);

    // Send current swarm peer list to the newly connected peer
    socket.emit('peer:list', tracker.getAllPeers());

    // Also send currently announced swarm files
    socket.emit('file:list', tracker.getAllFiles());
  });

  // Relay WebRTC SDP Offer
  socket.on('signal:offer', ({ targetPeerId, fromPeerId, offer }) => {
    const targetPeer = tracker.getPeerByPeerId(targetPeerId);
    if (targetPeer) {
      console.log(`[SIGNAL] Relaying SDP Offer: ${fromPeerId} -> ${targetPeerId}`);
      io.to(targetPeer.socketId).emit('signal:offer', {
        fromPeerId,
        offer,
      });
    }
  });

  // Relay WebRTC SDP Answer
  socket.on('signal:answer', ({ targetPeerId, fromPeerId, answer }) => {
    const targetPeer = tracker.getPeerByPeerId(targetPeerId);
    if (targetPeer) {
      console.log(`[SIGNAL] Relaying SDP Answer: ${fromPeerId} -> ${targetPeerId}`);
      io.to(targetPeer.socketId).emit('signal:answer', {
        fromPeerId,
        answer,
      });
    }
  });

  // Relay WebRTC ICE Candidates
  socket.on('signal:ice-candidate', ({ targetPeerId, fromPeerId, candidate }) => {
    const targetPeer = tracker.getPeerByPeerId(targetPeerId);
    if (targetPeer) {
      io.to(targetPeer.socketId).emit('signal:ice-candidate', {
        fromPeerId,
        candidate,
      });
    }
  });

  // Swarm File Announcement (Metadata only - zero file bytes stored on server)
  socket.on('file:announce', (fileMetadata) => {
    console.log(`[SWARM] File Announced: "${fileMetadata.name}" (${fileMetadata.size} bytes, ${fileMetadata.totalChunks} chunks)`);
    const record = tracker.announceFile(fileMetadata);
    io.emit('file:announced', record);
  });

  // Socket Disconnection
  socket.on('disconnect', () => {
    const removedPeer = tracker.removePeer(socket.id);
    if (removedPeer) {
      console.log(`[SWARM] Peer Left: ${removedPeer.peerId} (socket: ${socket.id})`);
      io.emit('peer:left', { peerId: removedPeer.peerId });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  PEERLINK SIGNALING SERVER & TRACKER RUNNING          `);
  console.log(`  Port: http://localhost:${PORT}                      `);
  console.log(`  Status endpoint: http://localhost:${PORT}/health     `);
  console.log(`  Peer discovery & WebRTC relay active                 `);
  console.log(`=======================================================`);
});
