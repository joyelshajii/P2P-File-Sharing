import { useState } from 'react';
import { Users, Activity, RefreshCw, Copy, ExternalLink, Link2, Check, ArrowRight } from 'lucide-react';
import type { PeerNode } from '../types/p2p';
import { formatBytes, formatSpeed } from '../lib/crypto';

interface PeerExplorerPageProps {
  peers: PeerNode[];
  activeMode: 'simulation' | 'webrtc';
  localPeerId: string;
  onConnectToPeer: (peerId: string) => void;
  onOpenSecondPeer: () => void;
  onRefresh?: () => void;
}

export const PeerExplorerPage: React.FC<PeerExplorerPageProps> = ({
  peers,
  activeMode,
  localPeerId,
  onConnectToPeer,
  onOpenSecondPeer,
  onRefresh,
}) => {
  const [selectedPeer, setSelectedPeer] = useState<PeerNode | null>(peers[0] || null);
  const [manualPeerInput, setManualPeerInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(localPeerId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?connect=${localPeerId}&mode=webrtc`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPeerInput.trim()) return;
    onConnectToPeer(manualPeerInput.trim());
    setManualPeerInput('');
  };

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
            <span className="text-[#ffffff]">SWARM TOPOLOGY & PEER CONNECTIONS</span>
          </h2>
          <p className="text-xs text-[#58ca58] mt-1 max-w-3xl">
            In Peer-to-Peer architecture, computers connect directly without storing files on a server. 
            Connect to other peers in separate browser tabs or over your local Wi-Fi network below.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onOpenSecondPeer}
            className="bg-[#66ff66] text-[#000000] font-bold px-3 py-1.5 border border-[#66ff66] hover:bg-[#ffffff] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            [ + OPEN 2ND PEER TAB ]
          </button>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="border border-[#255325] hover:border-[#66ff66] text-[#58ca58] hover:text-[#ffffff] px-2.5 py-1.5 cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              [ REQUERY TRACKER ]
            </button>
          )}
        </div>
      </div>

      {/* HOW TO CONNECT TO A PEER GUIDE & CONTROLS */}
      <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#255325] pb-2 text-xs">
          <span className="font-bold text-[#66ff66] flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#66ff66]" />
            // HOW TO CONNECT PEERS (REAL P2P NETWORKING)
          </span>
          <span className="text-[11px] text-[#58ca58]">DIRECT WEBRTC DATACHANNELS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Left: Your Peer ID & Share Links */}
          <div className="space-y-2 border border-[#255325]/60 p-3 bg-black">
            <div className="text-[11px] text-[#58ca58]">YOUR UNIQUE PEER ID:</div>
            <div className="flex items-center gap-2">
              <span className="bg-[#255325]/30 border border-[#66ff66] text-[#ffffff] px-3 py-1 font-bold text-sm tracking-wide">
                {localPeerId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="border border-[#255325] hover:border-[#66ff66] text-[#58ca58] hover:text-[#ffffff] px-2.5 py-1 flex items-center gap-1 cursor-pointer"
              >
                {copiedId ? <Check className="w-3 h-3 text-[#66ff66]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId ? 'COPIED!' : 'COPY ID'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="border border-[#255325] hover:border-[#66ff66] text-[#58ca58] hover:text-[#ffffff] px-2.5 py-1 flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3 h-3 text-[#66ff66]" /> : <Link2 className="w-3 h-3" />}
                <span>{copiedLink ? 'LINK COPIED!' : 'INVITE LINK'}</span>
              </button>
            </div>
            <p className="text-[11px] text-[#58ca58] leading-relaxed">
              Send this link to another computer or phone on the same Wi-Fi network to transfer files directly!
            </p>
          </div>

          {/* Right: Manual Peer Connect Form */}
          <div className="space-y-2 border border-[#255325]/60 p-3 bg-black">
            <div className="text-[11px] text-[#58ca58]">DIRECT CONNECT TO REMOTE PEER:</div>
            <form onSubmit={handleManualConnect} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. peer-ABC123"
                value={manualPeerInput}
                onChange={(e) => setManualPeerInput(e.target.value)}
                className="bg-black border border-[#255325] focus:border-[#66ff66] text-[#ffffff] px-3 py-1 text-xs font-mono flex-1 outline-none"
              />
              <button
                type="submit"
                className="bg-[#255325] hover:bg-[#66ff66] hover:text-[#000000] text-[#ffffff] border border-[#66ff66] px-3 py-1 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>[ CONNECT ]</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </form>
            <p className="text-[11px] text-[#58ca58] leading-relaxed">
              Or click <strong>[ + OPEN 2ND PEER TAB ]</strong> above to test a 2-node P2P swarm right in your browser.
            </p>
          </div>
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
          <div className="text-center py-8 text-xs text-[#58ca58] space-y-3">
            <div className="text-[#ffff66] font-bold">
              -- No other peers connected yet --
            </div>
            <p className="max-w-md mx-auto text-[11px] text-[#58ca58]">
              Peer-to-Peer file sharing requires at least 2 peers. Click below to open a second tab and watch them connect directly!
            </p>
            <button
              type="button"
              onClick={onOpenSecondPeer}
              className="bg-[#66ff66] text-[#000000] font-bold px-4 py-2 border border-[#66ff66] hover:bg-[#ffffff] transition-colors cursor-pointer text-xs inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              [ OPEN 2ND PEER IN NEW TAB / WINDOW ]
            </button>
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
                          {peer.connectionType === 'simulation' ? 'Simulated Loopback' : 'Direct WebRTC DataChannel'}
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
