import type { PeerNode } from '../types/p2p';

interface NetworkVisualizerProps {
  localPeerId: string;
  peers: PeerNode[];
  isTransferActive: boolean;
  isSignalingConnected: boolean;
  isSimulation: boolean;
}

export const NetworkVisualizer: React.FC<NetworkVisualizerProps> = ({
  localPeerId,
  peers,
  isTransferActive,
  isSignalingConnected,
  isSimulation,
}) => {
  // SVG Canvas dimensions
  const width = 640;
  const height = 280;

  // Node Coordinates
  // Center: Local Peer
  const localX = 320;
  const localY = 175;

  // Top: Signaling Server (Tracker)
  const trackerX = 320;
  const trackerY = 45;

  // Remote Peers arranged in an arc/row across the bottom
  const remotePositions = [
    { x: 100, y: 175 }, // Peer Alpha
    { x: 540, y: 175 }, // Peer Beta
    { x: 320, y: 245 }, // Peer Gamma
  ];

  return (
    <div className="border border-[#255325] bg-[#000000] p-3 font-mono">
      <div className="flex items-center justify-between border-b border-[#255325] pb-2 mb-2 text-xs">
        <span className="font-bold text-[#66ff66] flex items-center gap-2">
          <span>// TOPOLOGY_MAP</span>
          <span className="text-[#58ca58] text-[11px]">
            [{isSimulation ? 'SIMULATED SWARM MESH' : 'WEBRTC P2P CHANNELS'}]
          </span>
        </span>
        <span className="text-xs text-[#58ca58]">
          STATUS: <span className="text-[#ffffff] font-bold">{isTransferActive ? 'TRANSFERRING PIECES' : 'SWARM IDLE'}</span>
        </span>
      </div>

      <div className="relative w-full overflow-hidden bg-black/90 flex justify-center items-center py-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[640px] h-auto select-none"
          role="img"
          aria-label="Peer-to-peer network topology diagram showing signaling server, local peer, and swarm peers"
        >
          <defs>
            {/* Grid pattern */}
            <pattern id="term-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#255325" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width={width} height={height} fill="url(#term-grid)" />

          {/* 1. Line: Tracker to Local Peer (Signaling channel) */}
          <line
            x1={trackerX}
            y1={trackerY + 18}
            x2={localX}
            y2={localY - 18}
            stroke={isSignalingConnected ? '#58ca58' : '#255325'}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* 2. Lines from Tracker to Remote Peers */}
          {peers.map((peer, idx) => {
            const pos = remotePositions[idx % remotePositions.length];
            return (
              <line
                key={`line-tracker-${peer.id}`}
                x1={trackerX}
                y1={trackerY + 18}
                x2={pos.x}
                y2={pos.y - 18}
                stroke="#255325"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* 3. Direct P2P Lines: Local Peer to Remote Peers (The Star of P2P!) */}
          {peers.map((peer, idx) => {
            const pos = remotePositions[idx % remotePositions.length];
            const isPeerActive = isTransferActive && peer.status === 'connected';

            return (
              <g key={`p2p-channel-${peer.id}`}>
                <line
                  x1={localX}
                  y1={localY}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={isPeerActive ? '#66ff66' : '#255325'}
                  strokeWidth={isPeerActive ? '2' : '1.5'}
                />

                {/* Animated data packet traveling from remote peer to local peer during transfer */}
                {isPeerActive && (
                  <circle r="4" fill="#ffffff">
                    <animateMotion
                      path={`M ${pos.x} ${pos.y} L ${localX} ${localY}`}
                      dur={idx === 0 ? '0.8s' : idx === 1 ? '1.1s' : '0.95s'}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Node: Signaling Server (Tracker) */}
          <g transform={`translate(${trackerX}, ${trackerY})`}>
            <rect
              x="-85"
              y="-16"
              width="170"
              height="32"
              fill="#000000"
              stroke="#255325"
              strokeWidth="1.5"
            />
            <text
              textAnchor="middle"
              y="-2"
              fill={isSignalingConnected ? '#66ff66' : '#58ca58'}
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              [ SIGNALING TRACKER ]
            </text>
            <text
              textAnchor="middle"
              y="10"
              fill="#58ca58"
              fontSize="8"
              fontFamily="monospace"
            >
              (SDP & Peer Discovery Only)
            </text>
          </g>

          {/* Node: Local Peer (YOU) */}
          <g transform={`translate(${localX}, ${localY})`}>
            <rect
              x="-75"
              y="-16"
              width="150"
              height="32"
              fill="#000000"
              stroke="#66ff66"
              strokeWidth="2"
            />
            <text
              textAnchor="middle"
              y="-2"
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              LOCAL PEER (YOU)
            </text>
            <text
              textAnchor="middle"
              y="10"
              fill="#66ff66"
              fontSize="9"
              fontFamily="monospace"
            >
              {localPeerId}
            </text>
          </g>

          {/* Nodes: Remote Swarm Peers */}
          {peers.map((peer, idx) => {
            const pos = remotePositions[idx % remotePositions.length];
            const isPeerActive = isTransferActive && peer.status === 'connected';

            return (
              <g key={`node-${peer.id}`} transform={`translate(${pos.x}, ${pos.y})`}>
                <rect
                  x="-70"
                  y="-18"
                  width="140"
                  height="36"
                  fill="#000000"
                  stroke={isPeerActive ? '#66ff66' : '#255325'}
                  strokeWidth="1.5"
                />
                <text
                  textAnchor="middle"
                  y="-4"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {peer.name.split(' ')[0]}
                </text>
                <text
                  textAnchor="middle"
                  y="10"
                  fill={isPeerActive ? '#66ff66' : '#58ca58'}
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {peer.connectionType === 'simulation' ? 'Sim DataChannel' : 'Direct WebRTC'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend and Architecture Callout */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#255325] text-[11px] text-[#58ca58]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#66ff66] inline-block"></span>
            Direct P2P DataChannel (File chunks)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-[#58ca58] inline-block"></span>
            Signaling only (No file payload)
          </span>
        </div>
        <span className="text-[#ffffff]">
          Zero file data passes through the server.
        </span>
      </div>
    </div>
  );
};
