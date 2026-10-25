import { useState } from 'react';
import { Users, Activity, RefreshCw } from 'lucide-react';
import type { PeerNode } from '../types/p2p';
import { formatBytes, formatSpeed } from '../lib/crypto';

interface PeerExplorerPageProps {
  peers: PeerNode[];
  activeMode: 'simulation' | 'webrtc';
  onRefresh?: () => void;
}

export const PeerExplorerPage: React.FC<PeerExplorerPageProps> = ({
  peers,
  activeMode,
  onRefresh,
}) => {
  const [selectedPeer, setSelectedPeer] = useState<PeerNode | null>(peers[0] || null);

  const getStatusBadge = (status: PeerNode['status']) => {
    switch (status) {
      case 'connected':
        return 'text-[#66ff66] border-[#66ff66] bg-[#255325]/30';
      case 'handshaking':
        return 'text-[#ffff66] border-[#ffff66] bg-black animate-pulse';
      case 'choked':
        return 'text-[#ff5555] border-[#ff5555] bg-black';
      case 'disconnected':
      default:
        return 'text-[#58ca58]/60 border-[#255325] bg-black';
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Title Bar */}
      <div className="border border-[#255325] bg-[#000000] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#66ff66] flex items-center gap-2">
            <span>[03_PEER_EXPLORER]</span>
            <span className="text-[#ffffff]">SWARM TOPOLOGY & PEER STATUS</span>
          </h2>
          <p className="text-xs text-[#58ca58] mt-1 max-w-3xl">
            Inspect discovered swarm nodes, active WebRTC DataChannel states, piece availability bitfields, 
            and real-time transfer bandwidth.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="border border-[#255325] px-2.5 py-1 text-[#58ca58]">
            SWARM PROTOCOL: <span className="text-[#ffffff] font-bold">BITSTREAM/1.0</span>
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="border border-[#255325] hover:border-[#66ff66] text-[#58ca58] hover:text-[#ffffff] px-2.5 py-1 cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              [ REQUERY TRACKER ]
            </button>
          )}
        </div>
      </div>

      {/* Connected Peers Table */}
      <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#255325] pb-2 text-xs">
          <span className="font-bold text-[#66ff66] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#66ff66]" />
            CONNECTED SWARM PEERS ({peers.length})
          </span>
          <span className="text-[#58ca58]">
            MODE: <span className="text-[#ffffff] font-bold">{activeMode.toUpperCase()}</span>
          </span>
        </div>

        {peers.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#58ca58]/60 italic">
            -- No active peers connected. Click "Start Demo" to run simulation or open another browser tab in WebRTC mode --
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#255325] text-[#58ca58] text-[11px]">
                  <th scope="col" className="p-2">PEER_ID / NAME</th>
                  <th scope="col" className="p-2">ENDPOINT</th>
                  <th scope="col" className="p-2">STATUS</th>
                  <th scope="col" className="p-2">CONNECTION_TYPE</th>
                  <th scope="col" className="p-2">RTT (PING)</th>
                  <th scope="col" className="p-2">DOWN_RATE</th>
                  <th scope="col" className="p-2">UP_RATE</th>
                  <th scope="col" className="p-2">DATA_EXCHANGED</th>
                  <th scope="col" className="p-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#255325]/40">
                {peers.map((peer) => {
                  const isSelected = selectedPeer?.id === peer.id;

                  return (
                    <tr
                      key={peer.id}
                      onClick={() => setSelectedPeer(peer)}
                      className={`hover:bg-[#255325]/20 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#255325]/30 border-l-2 border-[#66ff66]' : ''
                      }`}
                    >
                      <td className="p-2 font-bold text-[#ffffff] flex items-center gap-1.5">
                        <span className="text-[#66ff66]">▶</span>
                        <span className="truncate max-w-[180px]">{peer.name}</span>
                      </td>

                      <td className="p-2 font-mono text-[#58ca58] text-[11px]">
                        {peer.ip}:{peer.port}
                      </td>

                      <td className="p-2">
                        <span className={`text-[10px] px-1.5 py-0.5 border font-bold ${getStatusBadge(peer.status)}`}>
                          {peer.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="p-2 text-[#58ca58]">
                        <span className="border border-[#255325] px-1.5 py-0.5 text-[10px] text-[#ffffff]">
                          {peer.connectionType === 'simulation' ? 'Simulated Loopback' : 'WebRTC DataChannel'}
                        </span>
                      </td>

                      <td className="p-2 text-[#58ca58]">
                        {peer.rtt} ms
                      </td>

                      <td className="p-2 text-[#66ff66]">
                        {formatSpeed(peer.downloadSpeed)}
                      </td>

                      <td className="p-2 text-[#58ca58]">
                        {formatSpeed(peer.uploadSpeed)}
                      </td>

                      <td className="p-2 text-[#ffffff] font-bold">
                        {formatBytes(peer.bytesExchanged)}
                      </td>

                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPeer(peer);
                          }}
                          className="px-2 py-0.5 border border-[#255325] hover:border-[#66ff66] text-[#58ca58] hover:text-[#ffffff] text-[10px]"
                        >
                          [ INSPECT ]
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Peer Bitfield & Details Inspection Card */}
      {selectedPeer && (
        <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-[#255325] pb-2 text-xs">
            <span className="font-bold text-[#66ff66] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#66ff66]" />
              PEER BITFIELD & PIECE MAP // {selectedPeer.name} ({selectedPeer.id})
            </span>
            <span className="text-[#58ca58] text-[11px]">
              POSSESSES {selectedPeer.availableChunks.length} PIECES IN SWARM
            </span>
          </div>

          <div className="text-xs text-[#58ca58] mb-1">
            In BitTorrent protocols, each peer advertises its piece possession via a <strong>bitfield message</strong>. 
            Below is the piece map offered by this node:
          </div>

          {/* Piece Bitfield Representation */}
          <div className="flex flex-wrap gap-1.5 p-3 border border-[#255325] bg-black">
            {Array.from({ length: 12 }).map((_, chunkIdx) => {
              const hasChunk = selectedPeer.availableChunks.includes(chunkIdx);

              return (
                <div
                  key={chunkIdx}
                  className={`w-9 h-8 border text-center flex flex-col items-center justify-center text-[10px] font-mono ${
                    hasChunk
                      ? 'border-[#66ff66] bg-[#66ff66] text-[#000000] font-bold'
                      : 'border-[#255325] bg-black text-[#58ca58]/40'
                  }`}
                  title={`Chunk #${chunkIdx}: ${hasChunk ? 'Available from this peer' : 'Not possessed'}`}
                >
                  <span>#{chunkIdx}</span>
                  <span className="text-[8px]">{hasChunk ? '1' : '0'}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[11px] text-[#58ca58] pt-1">
            <span>Bit 1 = Piece available to leech from this peer</span>
            <span>Bit 0 = Missing piece</span>
          </div>
        </div>
      )}
    </div>
  );
};
