import { useState } from 'react';
import type { ChunkInfo } from '../types/p2p';
import { formatBytes, formatShortHash } from '../lib/crypto';
import { CheckCircle2, AlertTriangle, Clock, ArrowDown, HelpCircle } from 'lucide-react';

interface ChunkGridProps {
  chunks: ChunkInfo[];
  selectedChunkIndex?: number | null;
  onSelectChunk?: (chunk: ChunkInfo) => void;
  interactive?: boolean;
}

export const ChunkGrid: React.FC<ChunkGridProps> = ({
  chunks,
  selectedChunkIndex,
  onSelectChunk,
  interactive = true,
}) => {
  const [hoveredChunk, setHoveredChunk] = useState<ChunkInfo | null>(null);

  const getStatusBadge = (status: ChunkInfo['status']) => {
    switch (status) {
      case 'verified':
        return {
          bg: 'bg-[#66ff66] text-[#000000] border-[#66ff66]',
          label: 'VERIFIED',
          icon: CheckCircle2,
        };
      case 'received':
        return {
          bg: 'bg-[#255325] text-[#ffffff] border-[#66ff66]',
          label: 'RECEIVED',
          icon: CheckCircle2,
        };
      case 'downloading':
        return {
          bg: 'bg-[#000000] text-[#66ff66] border-[#66ff66] animate-pulse',
          label: 'IN_TRANSIT',
          icon: ArrowDown,
        };
      case 'requested':
        return {
          bg: 'bg-[#000000] text-[#ffff66] border-[#ffff66]',
          label: 'REQUESTED',
          icon: Clock,
        };
      case 'failed':
        return {
          bg: 'bg-[#ff5555] text-[#000000] border-[#ff5555]',
          label: 'CORRUPTED',
          icon: AlertTriangle,
        };
      case 'idle':
      default:
        return {
          bg: 'bg-[#000000] text-[#58ca58]/60 border-[#255325]',
          label: 'QUEUED',
          icon: HelpCircle,
        };
    }
  };

  const activeInspectChunk = chunks.find((c) => c.index === selectedChunkIndex) || hoveredChunk;

  return (
    <div className="font-mono">
      {/* Chunk Map Grid */}
      <div 
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2"
        role="grid"
        aria-label="BitTorrent piece availability and download status grid"
      >
        {chunks.map((chunk) => {
          const config = getStatusBadge(chunk.status);
          const isSelected = selectedChunkIndex === chunk.index;
          const Icon = config.icon;

          return (
            <button
              key={chunk.index}
              type="button"
              disabled={!interactive}
              onClick={() => onSelectChunk && onSelectChunk(chunk)}
              onMouseEnter={() => setHoveredChunk(chunk)}
              onMouseLeave={() => setHoveredChunk(null)}
              className={`p-2 border text-center transition-all cursor-pointer flex flex-col justify-between items-center h-20 ${config.bg} ${
                isSelected ? 'ring-2 ring-[#ffffff] outline-none' : ''
              }`}
              title={`Chunk #${chunk.index} (${formatBytes(chunk.size)}) - ${config.label} - Source: ${chunk.sourcePeerName || 'N/A'}`}
            >
              <div className="flex items-center justify-between w-full text-[10px]">
                <span className="font-bold">#{chunk.index.toString().padStart(2, '0')}</span>
                <Icon className="w-3 h-3" />
              </div>

              <div className="my-auto text-[9px] font-bold tracking-tight">
                {config.label}
              </div>

              <div className="text-[9px] truncate max-w-full opacity-80">
                {chunk.sourcePeerName ? chunk.sourcePeerName.split(' ')[0] : '---'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend & Summary Bar */}
      <div className="mt-3 pt-2 border-t border-[#255325] flex flex-wrap items-center justify-between gap-3 text-xs text-[#58ca58]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#66ff66] inline-block"></span>
            SHA-256 Verified
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border border-[#66ff66] bg-black inline-block animate-pulse"></span>
            In Transit (Downloading)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border border-[#ffff66] bg-black inline-block"></span>
            Requested
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#ff5555] inline-block"></span>
            Hash Failed (Tampered)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border border-[#255325] bg-black inline-block"></span>
            Unrequested
          </span>
        </div>
      </div>

      {/* Deep Inspection Drawer (Shows active hovered or selected chunk details) */}
      {activeInspectChunk && (
        <div className="mt-3 p-3 border border-[#255325] bg-[#000000] text-xs space-y-2">
          <div className="flex justify-between items-center border-b border-[#255325] pb-1 font-bold">
            <span className="text-[#66ff66]">
              CHUNK INSPECTOR // PIECE #{activeInspectChunk.index}
            </span>
            <span className="text-[#ffffff]">
              STATUS: {activeInspectChunk.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-[#58ca58] block">BYTE_OFFSET:</span>
              <span className="text-[#ffffff] font-bold">
                {activeInspectChunk.offset} - {activeInspectChunk.offset + activeInspectChunk.size - 1} ({formatBytes(activeInspectChunk.size)})
              </span>
            </div>
            <div>
              <span className="text-[#58ca58] block">SOURCE_PEER:</span>
              <span className="text-[#66ff66] font-bold">
                {activeInspectChunk.sourcePeerName || activeInspectChunk.sourcePeerId || 'Awaiting peer assignment'}
              </span>
            </div>
            <div>
              <span className="text-[#58ca58] block">EXPECTED_SHA256:</span>
              <span className="text-[#ffffff] font-mono break-all">
                {formatShortHash(activeInspectChunk.hash, 8)}
              </span>
            </div>
            <div>
              <span className="text-[#58ca58] block">COMPUTED_SHA256:</span>
              <span className={`font-mono break-all ${
                activeInspectChunk.computedHash === activeInspectChunk.hash ? 'text-[#66ff66]' : 'text-[#ff5555]'
              }`}>
                {activeInspectChunk.computedHash ? formatShortHash(activeInspectChunk.computedHash, 8) : 'Not calculated yet'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
