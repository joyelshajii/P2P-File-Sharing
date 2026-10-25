import { Users, HardDrive, DownloadCloud, Database, ArrowRight, Play, ExternalLink } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { NetworkVisualizer } from '../components/NetworkVisualizer';
import { EventLog } from '../components/EventLog';
import type { FileMetadata, NetworkEvent, PeerNode } from '../types/p2p';
import type { SimulationState } from '../services/simulationEngine';
import { formatBytes } from '../lib/crypto';
import type { NavTab } from '../components/SidebarNav';

interface DashboardPageProps {
  localPeerId: string;
  peers: PeerNode[];
  files: FileMetadata[];
  activeDownloadsCount: number;
  totalBytesExchanged: number;
  events: NetworkEvent[];
  onClearEvents: () => void;
  isSignalingConnected: boolean;
  activeMode: 'simulation' | 'webrtc';
  simulationState: SimulationState;
  onNavigate: (tab: NavTab) => void;
  onStartDemo: () => void;
  onOpenSecondPeer: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  localPeerId,
  peers,
  files,
  activeDownloadsCount,
  totalBytesExchanged,
  events,
  onClearEvents,
  isSignalingConnected,
  activeMode,
  simulationState,
  onNavigate,
  onStartDemo,
  onOpenSecondPeer,
}) => {
  const isTransferActive = simulationState.isRunning || activeDownloadsCount > 0;
  const connectedPeersCount = peers.filter((p) => p.status === 'connected').length;

  return (
    <div className="space-y-4 font-mono">
      {/* Top Session Callout Banner */}
      <div className="border border-[#255325] bg-[#000000] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#66ff66] font-bold text-sm">PEER NODE:</span>
            <span className="text-[#ffffff] bg-[#255325] px-2 py-0.5 text-xs font-bold">
              {localPeerId}
            </span>
            <span className="text-xs text-[#58ca58]">
              // {activeMode === 'simulation' ? 'SIMULATION MODE (OFFLINE DEMO READY)' : 'DIRECT WEBRTC SWARM'}
            </span>
          </div>
          <p className="text-xs text-[#58ca58] mt-1 max-w-2xl leading-relaxed">
            Direct peer-to-peer file transfer engine inspired by BitTorrent. Chunks are negotiated 
            via WebRTC DataChannels or deterministic simulation. Zero payload bytes are 
            stored on the signaling server.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenSecondPeer}
            className="bg-[#255325] hover:bg-[#66ff66] hover:text-[#000000] text-[#ffffff] font-bold px-3 py-2 border border-[#66ff66] transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            title="Open a 2nd peer tab/window to test real browser-to-browser P2P"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            [ + OPEN 2ND PEER TAB ]
          </button>
          <button
            type="button"
            onClick={onStartDemo}
            className="bg-[#66ff66] text-[#000000] font-bold px-4 py-2 border border-[#66ff66] hover:bg-[#ffffff] transition-colors cursor-pointer text-xs flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            [ QUICK MULTI-PEER DEMO ]
          </button>
          <button
            type="button"
            onClick={() => onNavigate('inspector')}
            className="border border-[#255325] text-[#58ca58] hover:text-[#ffffff] hover:border-[#66ff66] px-3 py-2 text-xs transition-colors cursor-pointer flex items-center gap-1"
          >
            [ OPEN INSPECTOR ]
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          index="01"
          label="ONLINE_PEERS"
          value={connectedPeersCount}
          subValue={activeMode === 'simulation' ? '3 Simulated Nodes' : `${connectedPeersCount} Direct WebRTC peers`}
          icon={Users}
          badge={activeMode.toUpperCase()}
        />

        <MetricCard
          index="02"
          label="FILES_AVAILABLE"
          value={files.length}
          subValue={`${files.reduce((acc, f) => acc + f.totalChunks, 0)} total swarm pieces`}
          icon={HardDrive}
          badge="SWARM"
        />

        <MetricCard
          index="03"
          label="ACTIVE_DOWNLOADS"
          value={activeDownloadsCount}
          subValue={isTransferActive ? 'Swarming pieces' : 'Idle standby'}
          icon={DownloadCloud}
          badge={isTransferActive ? 'IN PROGRESS' : 'IDLE'}
        />

        <MetricCard
          index="04"
          label="DATA_TRANSFERRED"
          value={formatBytes(totalBytesExchanged)}
          subValue="Direct P2P bandwidth"
          icon={Database}
          badge="P2P SCTP"
        />
      </div>

      {/* Main Grid: Network Topology Visualizer + Live Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Network Topology Visualizer */}
        <div className="lg:col-span-7 space-y-4">
          <NetworkVisualizer
            localPeerId={localPeerId}
            peers={peers}
            isTransferActive={isTransferActive}
            isSignalingConnected={isSignalingConnected}
            isSimulation={activeMode === 'simulation'}
          />

          {/* Explicit Networking Architecture Callout */}
          <div className="border border-[#255325] bg-[#000000] p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-[#66ff66] font-bold border-b border-[#255325] pb-1">
              <span>// HOW IS THIS PEER-TO-PEER? (NETWORKING CONCEPT EXPLAINED)</span>
              <span className="text-[#58ca58] text-[11px]">RFC-P2P</span>
            </div>
            <p className="text-[#ffffff] text-xs leading-relaxed">
              <strong>Why does a server exist?</strong> In WebRTC and BitTorrent, web browsers <em>cannot</em> discover 
              each other's IP addresses without an initial "rendezvous". The Node.js server (port 9001) acts strictly 
              as an address book (Signaling Tracker) for exchanging connection offers.
            </p>
            <p className="text-[#66ff66] text-xs leading-relaxed font-bold">
              ZERO FILE DATA PASSES THROUGH THE SERVER. All file chunks are transferred directly from 
              browser-to-browser across encrypted WebRTC DataChannels (SCTP/DTLS).
            </p>
          </div>
        </div>

        {/* Right: Live Real-time Event Feed */}
        <div className="lg:col-span-5 flex flex-col">
          <EventLog
            events={events}
            onClear={onClearEvents}
          />
        </div>
      </div>
    </div>
  );
};
