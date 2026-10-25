import { useState } from 'react';
import { BookOpen, Network, HelpCircle } from 'lucide-react';

export const ArchitecturePage: React.FC = () => {
  const [activeConcept, setActiveConcept] = useState<string>('chunking');

  const concepts = [
    {
      id: 'peer',
      term: 'Peer',
      summary: 'A symmetrical node acting simultaneously as both client (leecher) and server (seeder).',
      details: 'In traditional client-server networking, nodes are strictly asymmetric. In P2P swarms, every peer that downloads piece data concurrently serves verified pieces to other swarm participants, contributing upload bandwidth back to the network.',
    },
    {
      id: 'discovery',
      term: 'Peer Discovery',
      summary: 'The mechanism by which isolated nodes locate other peers possessing a desired file.',
      details: 'Before data transfer begins, nodes need a rendezvous mechanism. PeerLink uses a lightweight Socket.IO signaling tracker. In BitTorrent, this is handled via centralized HTTP/UDP trackers, Distributed Hash Tables (Kademlia DHT), or Peer Exchange (PEX).',
    },
    {
      id: 'chunking',
      term: 'Chunking / Piece Segmentation',
      summary: 'Dividing large binary payloads into uniform, individually addressable blocks (e.g. 256 KiB).',
      details: 'Chunking enables parallelization. Instead of streaming a monolithic file serially from a single host, a node can fetch Chunk #0 from Peer A, Chunk #1 from Peer B, and Chunk #2 from Peer C simultaneously, saturating the download pipe.',
    },
    {
      id: 'parallel',
      term: 'Parallel Transfers & Swarming',
      summary: 'Concurrent multi-source piece retrieval optimizing network link utilization.',
      details: 'A downloading leecher requests rare pieces from multiple seeders in parallel. As soon as a piece is verified, the leecher advertises its new bitfield and immediately begins uploading that piece to others, multiplying swarm capacity.',
    },
    {
      id: 'seeding',
      term: 'Seeding vs Leeching',
      summary: 'The dual states of participation in a BitTorrent-inspired network.',
      details: 'A "Leecher" is a peer actively downloading chunks who does not yet possess 100% of the file. A "Seeder" has completed all piece downloads and verified the root hash, remaining in the swarm solely to upload pieces to others.',
    },
    {
      id: 'integrity',
      term: 'Integrity Verification (SHA-256)',
      summary: 'Cryptographic hashing preventing corrupted or malicious piece injection.',
      details: 'Because chunks arrive over untrusted peer connections, each piece must be verified against an authoritative SHA-256 hash manifest. Any piece with a bit-flip or corrupt payload is immediately discarded and re-requested from an alternative peer.',
    },
    {
      id: 'signaling',
      term: 'Signaling & NAT Traversal',
      summary: 'Brokering connection metadata (SDP Offer/Answer & ICE Candidates).',
      details: 'WebRTC requires an out-of-band signaling channel to exchange network endpoints (IP, port, candidate types) through STUN/TURN servers. Once the SCTP/DTLS DataChannel is established, all communication is direct and the signaling server is completely bypassed.',
    },
    {
      id: 'tracker',
      term: 'Tracker & Swarm Index',
      summary: 'A coordination service maintaining active peer IP lists and file manifests.',
      details: 'The tracker does NOT store or transfer the file contents. It acts strictly as an address book for the swarm. If the tracker goes down after peers connect, active peer transfers continue uninterrupted.',
    },
  ];

  return (
    <div className="space-y-4 font-mono">
      {/* Page Title */}
      <div className="border border-[#255325] bg-[#000000] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#66ff66] flex items-center gap-2">
            <span>[06_ARCHITECTURE_LAB]</span>
            <span className="text-[#ffffff]">COMPUTER NETWORKS EDUCATIONAL SPECIFICATION</span>
          </h2>
          <p className="text-xs text-[#58ca58] mt-1 max-w-3xl">
            Theoretical analysis of Peer-to-Peer file distribution, WebRTC DataChannel signaling, 
            and architectural comparisons against traditional client-server paradigms.
          </p>
        </div>
      </div>

      {/* Architecture Flow Diagram */}
      <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#255325] pb-2 text-xs">
          <span className="font-bold text-[#66ff66] flex items-center gap-2">
            <Network className="w-4 h-4 text-[#66ff66]" />
            // PROTOCOL_ARCHITECTURE_DIAGRAM
          </span>
          <span className="text-[#58ca58] text-[11px]">HYBRID SIGNALING + MESH P2P</span>
        </div>

        {/* ASCII / Monospace Architecture Blueprint */}
        <div className="p-4 bg-black border border-[#255325] text-xs font-mono overflow-x-auto leading-relaxed select-text">
          <pre className="text-[#66ff66] text-[11px] sm:text-xs">
{`
                  +----------------------------------------------+
                  |     DISCOVERY & SIGNALING TRACKER (SERVER)   |
                  |          [Socket.IO / Port 9001]             |
                  |  - Maintains Swarm Registry & Peer IDs       |
                  |  - Relays SDP Offers / Answers & ICE         |
                  |  * ZERO FILE PAYLOAD STORED ON TRACKER *     |
                  +----------------------------------------------+
                                ^              ^
         1. Signaling Discovery |              | 1. Signaling Discovery
         & SDP Offer / Answer   |              | & SDP Offer / Answer
                                v              v
   +-------------------------+                    +-------------------------+
   |   USER BROWSER / PEER   | <================> |   REMOTE PEER B (SEED)  |
   |   (Local Node-Client)   |   Direct WebRTC    |   Provides Chunks 1,4,7 |
   +-------------------------+    DataChannel     +-------------------------+
                ^               (Binary Chunks)                ^
                |                                              |
                | Direct WebRTC                  Direct WebRTC |
                | DataChannel                    DataChannel   |
                v                                              v
   +-------------------------+                    +-------------------------+
   |   REMOTE PEER A (SEED)  | <================> |   REMOTE PEER C (SEED)  |
   |   Provides Chunks 0,3,6 |   Direct WebRTC    |   Provides Chunks 2,5,8 |
   +-------------------------+    DataChannel     +-------------------------+
`}
          </pre>
        </div>

        <div className="text-xs text-[#58ca58] space-y-1">
          <p>
            <strong className="text-[#ffffff]">Execution Steps:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
            <li><strong>Peer Registration:</strong> Local Node registers with the tracker over WebSocket.</li>
            <li><strong>Signaling Handshake:</strong> Peers exchange SDP Offer and SDP Answer payloads via tracker relay.</li>
            <li><strong>Direct Channel Establishment:</strong> SCTP/DTLS DataChannels establish browser-to-browser.</li>
            <li><strong>Chunk Swarming:</strong> Chunks flow concurrently across peer channels without passing through server.</li>
            <li><strong>Reassembly & Verification:</strong> Local peer verifies individual chunk SHA-256 hashes and reconstructs original file.</li>
          </ol>
        </div>
      </div>

      {/* Comparison Table: Client-Server vs Peer-to-Peer */}
      <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#255325] pb-2 text-xs">
          <span className="font-bold text-[#66ff66]">
            // ARCHITECTURAL COMPARISON: CLIENT-SERVER VS PEER-TO-PEER
          </span>
          <span className="text-[#58ca58] text-[11px]">PERFORMANCE & SCALABILITY METRICS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#255325] text-[#58ca58] text-[11px]">
                <th scope="col" className="p-2.5">EVALUATION METRIC</th>
                <th scope="col" className="p-2.5 text-[#ffff66]">CLIENT-SERVER (HTTP/FTP)</th>
                <th scope="col" className="p-2.5 text-[#66ff66]">PEER-TO-PEER (PEERLINK/BITTORRENT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#255325]/40 text-[11px]">
              <tr className="hover:bg-[#255325]/20">
                <td className="p-2.5 font-bold text-[#ffffff]">Bandwidth Scaling</td>
                <td className="p-2.5 text-[#58ca58]">
                  Server upload load scales linearly: <strong>O(N)</strong>. Server becomes congested as clients increase.
                </td>
                <td className="p-2.5 text-[#66ff66]">
                  Network upload capacity grows with swarm size: <strong>O(log N)</strong>. More downloaders = more upload capacity!
                </td>
              </tr>

              <tr className="hover:bg-[#255325]/20">
                <td className="p-2.5 font-bold text-[#ffffff]">Single Point of Failure</td>
                <td className="p-2.5 text-[#ff5555]">
                  High. If central server crashes or network link drops, all file distribution halts immediately.
                </td>
                <td className="p-2.5 text-[#66ff66]">
                  Low. If any individual peer disconnects, other peers in the swarm continue supplying missing pieces.
                </td>
              </tr>

              <tr className="hover:bg-[#255325]/20">
                <td className="p-2.5 font-bold text-[#ffffff]">Storage Requirements</td>
                <td className="p-2.5 text-[#58ca58]">
                  Central server must provision high-capacity storage for 100% of all hosted files.
                </td>
                <td className="p-2.5 text-[#66ff66]">
                  Signaling tracker stores 0 bytes of file payloads. Chunks reside exclusively in peer memory/disk.
                </td>
              </tr>

              <tr className="hover:bg-[#255325]/20">
                <td className="p-2.5 font-bold text-[#ffffff]">Infrastructure Cost</td>
                <td className="p-2.5 text-[#58ca58]">
                  Expensive high-bandwidth server egress fees (e.g. AWS S3 egress costs).
                </td>
                <td className="p-2.5 text-[#66ff66]">
                  Minimal. Server only relays lightweight JSON signaling handshakes (kilobytes vs gigabytes).
                </td>
              </tr>

              <tr className="hover:bg-[#255325]/20">
                <td className="p-2.5 font-bold text-[#ffffff]">Data Integrity Protection</td>
                <td className="p-2.5 text-[#58ca58]">
                  Often relies on Transport Layer Security (TLS); single corrupt download requires full restart.
                </td>
                <td className="p-2.5 text-[#66ff66]">
                  Piece-level SHA-256 verification. Corrupt pieces are isolated and re-requested without restarting transfer.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Networking Glossary */}
      <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#255325] pb-2 text-xs">
          <span className="font-bold text-[#66ff66] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#66ff66]" />
            KEY COMPUTER NETWORKS CONCEPTS // REFERENCE LAB
          </span>
          <span className="text-[#58ca58] text-[11px]">CLICK CONCEPT TO INSPECT</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {concepts.map((concept) => (
            <button
              key={concept.id}
              type="button"
              onClick={() => setActiveConcept(concept.id)}
              className={`p-2 border text-left text-xs transition-colors cursor-pointer ${
                activeConcept === concept.id
                  ? 'bg-[#66ff66] text-[#000000] font-bold border-[#66ff66]'
                  : 'border-[#255325] text-[#58ca58] hover:text-[#ffffff] hover:border-[#66ff66]'
              }`}
            >
              <div className="text-[10px] opacity-75">CONCEPT</div>
              <div className="truncate">{concept.term}</div>
            </button>
          ))}
        </div>

        {/* Selected Concept Deep Dive Drawer */}
        {(() => {
          const selected = concepts.find((c) => c.id === activeConcept) || concepts[0];
          return (
            <div className="p-3 border border-[#255325] bg-black text-xs space-y-2 mt-2">
              <div className="flex justify-between items-center border-b border-[#255325] pb-1">
                <span className="text-[#66ff66] font-bold text-sm">
                  {selected.term.toUpperCase()}
                </span>
                <span className="text-[#ffffff] text-[11px] font-bold">
                  {selected.summary}
                </span>
              </div>
              <p className="text-[#58ca58] leading-relaxed text-xs">
                {selected.details}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Scope Disclaimer */}
      <div className="p-3 border border-[#255325] bg-black text-xs text-[#58ca58] flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-[#66ff66] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#ffffff]">Educational Demonstration Scope:</strong> PeerLink is an 
          educational implementation built for a college Computer Networks project demonstration. It illustrates 
          core BitTorrent principles (piece chunking, parallel multi-source leeching, SHA-256 verification, and 
          WebRTC DataChannel signaling). It does not implement magnet link resolution, Kademlia DHT routing, 
          or backwards-compatibility with mainstream desktop torrent clients.
        </div>
      </div>
    </div>
  );
};
