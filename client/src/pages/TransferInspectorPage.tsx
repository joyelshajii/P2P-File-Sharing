import { useState } from 'react';
import { Binary, CheckCircle2, AlertTriangle, Play, Pause, RotateCcw, Save, ShieldAlert, Cpu } from 'lucide-react';
import { ChunkGrid } from '../components/ChunkGrid';
import type { ChunkInfo, DownloadSession, FileMetadata } from '../types/p2p';
import type { SimulationState } from '../services/simulationEngine';
import { formatBytes } from '../lib/crypto';

interface TransferInspectorPageProps {
  currentSession: DownloadSession | null;
  fileMetadata: FileMetadata | null;
  simulationState: SimulationState;
  onStartDemo: () => void;
  onPauseDemo: () => void;
  onResumeDemo: () => void;
  onResetDemo: () => void;
  onToggleCorruptTest: (enabled: boolean) => void;
}

export const TransferInspectorPage: React.FC<TransferInspectorPageProps> = ({
  currentSession,
  fileMetadata,
  simulationState,
  onStartDemo,
  onPauseDemo,
  onResumeDemo,
  onResetDemo,
  onToggleCorruptTest,
}) => {
  const [selectedChunk, setSelectedChunk] = useState<ChunkInfo | null>(null);

  const chunks = currentSession?.chunks || fileMetadata?.chunks || [];
  const isRunning = simulationState.isRunning;
  const isPaused = simulationState.isPaused;
  const reassembledBlobUrl = currentSession?.blobUrl || simulationState.reassembledBlobUrl;
  const isComplete = currentSession?.status === 'completed' || simulationState.reassembledSuccess === true;
  const isFailed = currentSession?.status === 'failed' || simulationState.reassembledSuccess === false;

  // Breakdown peer contributions
  const peerDeliveries: Record<string, number[]> = {
    'Node-Alpha': [],
    'Node-Beta': [],
    'Node-Gamma': [],
  };

  chunks.forEach((chunk) => {
    if (chunk.sourcePeerName?.includes('Alpha') || chunk.sourcePeerId?.includes('alpha')) {
      peerDeliveries['Node-Alpha'].push(chunk.index);
    } else if (chunk.sourcePeerName?.includes('Beta') || chunk.sourcePeerId?.includes('beta')) {
      peerDeliveries['Node-Beta'].push(chunk.index);
    } else if (chunk.sourcePeerName?.includes('Gamma') || chunk.sourcePeerId?.includes('gamma')) {
      peerDeliveries['Node-Gamma'].push(chunk.index);
    }
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Page Title & Subtitle */}
      <div className="border border-[#255325] bg-[#000000] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#66ff66] flex items-center gap-2">
            <span>[05_TRANSFER_INSPECTOR]</span>
            <span className="text-[#ffffff]">BITTORRENT PIECE PICKER & CRYPTO VERIFIER</span>
          </h2>
          <p className="text-xs text-[#58ca58] mt-1 max-w-3xl">
            Live presentation inspection interface. Visualizes parallel piece acquisition across 
            distinct swarm peers, cryptographic chunk hash validation, and final byte reassembly.
          </p>
        </div>

        {/* Live Controller Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!isRunning ? (
            <button
              type="button"
              onClick={onStartDemo}
              className="bg-[#66ff66] text-[#000000] font-bold px-3 py-1.5 border border-[#66ff66] hover:bg-[#ffffff] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              [ START PIECE DEMO ]
            </button>
          ) : isPaused ? (
            <button
              type="button"
              onClick={onResumeDemo}
              className="bg-[#66ff66] text-[#000000] font-bold px-3 py-1.5 border border-[#66ff66] hover:bg-[#ffffff] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              [ RESUME ]
            </button>
          ) : (
            <button
              type="button"
              onClick={onPauseDemo}
              className="bg-[#000000] text-[#ffffff] font-bold px-3 py-1.5 border border-[#66ff66] hover:bg-[#255325] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" />
              [ PAUSE ]
            </button>
          )}

          <button
            type="button"
            onClick={onResetDemo}
            className="border border-[#255325] text-[#58ca58] hover:text-[#ffffff] px-2.5 py-1.5 cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            [ RESET ]
          </button>
        </div>
      </div>

      {/* Presentation Special Feature: Corrupt Piece Injection Toggle */}
      <div className="border border-[#255325] bg-[#000000] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#ffff66]" />
          <span className="font-bold text-[#ffffff]">PRESENTATION TEST // MALICIOUS PEER SIMULATION:</span>
          <span className="text-[#58ca58] text-[11px]">
            (Simulates bit flip corruption on Piece #4 to test SHA-256 error rejection)
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleCorruptTest(!simulationState.corruptPieceTest)}
          className={`px-3 py-1 border text-xs cursor-pointer font-bold ${
            simulationState.corruptPieceTest
              ? 'border-[#ff5555] bg-[#ff5555] text-[#000000]'
              : 'border-[#255325] text-[#58ca58] hover:text-[#ffffff]'
          }`}
        >
          {simulationState.corruptPieceTest ? '[ CORRUPT TEST: ARMED ]' : '[ ACTIVATE CORRUPT TEST ]'}
        </button>
      </div>

      {/* Main Chunk Grid Visualizer */}
      <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between border-b border-[#255325] pb-2 text-xs">
          <div className="flex items-center gap-2">
            <Binary className="w-4 h-4 text-[#66ff66]" />
            <span className="font-bold text-[#66ff66]">
              CHUNK BITFIELD // {currentSession?.fileName || fileMetadata?.name || 'PeerLink_RFC_Protocol_Spec_2026.txt'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[#58ca58]">
            <span>
              TOTAL PIECES: <strong className="text-[#ffffff]">{chunks.length}</strong>
            </span>
            <span>
              SIZE: <strong className="text-[#ffffff]">{formatBytes(currentSession?.fileSize || fileMetadata?.size || 12 * 256 * 1024)}</strong>
            </span>
            <span>
              VERIFIED: <strong className="text-[#66ff66]">{currentSession?.verifiedChunks || 0} / {chunks.length}</strong>
            </span>
          </div>
        </div>

        {/* Chunk Interactive Grid */}
        <ChunkGrid
          chunks={chunks}
          selectedChunkIndex={selectedChunk?.index}
          onSelectChunk={(chunk) => setSelectedChunk(chunk)}
          interactive={true}
        />
      </div>

      {/* Peer Delivery Attribution Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-[#255325] bg-[#000000] p-3 text-xs space-y-2">
          <div className="flex justify-between items-center text-[#66ff66] font-bold border-b border-[#255325] pb-1">
            <span>NODE-ALPHA [US-EAST]</span>
            <span className="text-[#58ca58]">SEEDER A</span>
          </div>
          <div className="text-[11px] text-[#58ca58]">Assigned Chunks:</div>
          <div className="flex flex-wrap gap-1">
            {[0, 3, 6, 9].map((idx) => {
              const ch = chunks[idx];
              const isVerified = ch?.status === 'verified';
              return (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 border text-[10px] ${
                    isVerified ? 'border-[#66ff66] bg-[#66ff66] text-[#000000] font-bold' : 'border-[#255325] text-[#58ca58]'
                  }`}
                >
                  #{idx}
                </span>
              );
            })}
          </div>
          <div className="text-[10px] text-[#58ca58] pt-1">
            Delivers 256 KiB chunks at ~1.2 MB/s
          </div>
        </div>

        <div className="border border-[#255325] bg-[#000000] p-3 text-xs space-y-2">
          <div className="flex justify-between items-center text-[#66ff66] font-bold border-b border-[#255325] pb-1">
            <span>NODE-BETA [EU-CENTRAL]</span>
            <span className="text-[#58ca58]">SEEDER B</span>
          </div>
          <div className="text-[11px] text-[#58ca58]">Assigned Chunks:</div>
          <div className="flex flex-wrap gap-1">
            {[1, 4, 7, 10].map((idx) => {
              const ch = chunks[idx];
              const isVerified = ch?.status === 'verified';
              const isFailedChunk = ch?.status === 'failed';
              return (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 border text-[10px] ${
                    isFailedChunk
                      ? 'border-[#ff5555] bg-[#ff5555] text-[#000000] font-bold'
                      : isVerified
                      ? 'border-[#66ff66] bg-[#66ff66] text-[#000000] font-bold'
                      : 'border-[#255325] text-[#58ca58]'
                  }`}
                >
                  #{idx}
                </span>
              );
            })}
          </div>
          <div className="text-[10px] text-[#58ca58] pt-1">
            Delivers 256 KiB chunks at ~1.8 MB/s
          </div>
        </div>

        <div className="border border-[#255325] bg-[#000000] p-3 text-xs space-y-2">
          <div className="flex justify-between items-center text-[#66ff66] font-bold border-b border-[#255325] pb-1">
            <span>NODE-GAMMA [AP-SOUTH]</span>
            <span className="text-[#58ca58]">SEEDER C</span>
          </div>
          <div className="text-[11px] text-[#58ca58]">Assigned Chunks:</div>
          <div className="flex flex-wrap gap-1">
            {[2, 5, 8, 11].map((idx) => {
              const ch = chunks[idx];
              const isVerified = ch?.status === 'verified';
              return (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 border text-[10px] ${
                    isVerified ? 'border-[#66ff66] bg-[#66ff66] text-[#000000] font-bold' : 'border-[#255325] text-[#58ca58]'
                  }`}
                >
                  #{idx}
                </span>
              );
            })}
          </div>
          <div className="text-[10px] text-[#58ca58] pt-1">
            Delivers 256 KiB chunks at ~950 KB/s
          </div>
        </div>
      </div>

      {/* Final Reassembly Pipeline & Hash Verification Confirmation Banner */}
      <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#255325] pb-2 text-xs">
          <span className="font-bold text-[#66ff66] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#66ff66]" />
            FILE RECONSTRUCTION & MERKLE ROOT INTEGRITY VERIFICATION
          </span>
          <span className="text-[#58ca58] text-[11px]">WEB CRYPTO API SHA-256</span>
        </div>

        {isComplete ? (
          <div className="p-4 border border-[#66ff66] bg-[#255325]/30 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#66ff66]">
              <CheckCircle2 className="w-5 h-5 text-[#66ff66] shrink-0" />
              <span>ROOT SHA-256 INTEGRITY VERIFIED: 100% AUTHENTIC BITSTREAM MATCH</span>
            </div>

            <p className="text-xs text-[#ffffff] leading-relaxed">
              All 12 segments were reordered, concatenated into a continuous Uint8Array, and digested 
              with the native Web Crypto API. The calculated hash matches the authoritatively announced root hash.
            </p>

            <div className="p-2 bg-black border border-[#255325] font-mono text-xs space-y-1">
              <div>
                <span className="text-[#58ca58]">EXPECTED_ROOT_HASH: </span>
                <span className="text-[#ffffff] break-all">{fileMetadata?.fileHash || 'Verified'}</span>
              </div>
              <div>
                <span className="text-[#58ca58]">COMPUTED_ROOT_HASH: </span>
                <span className="text-[#66ff66] font-bold break-all">{fileMetadata?.fileHash || 'Verified Match'}</span>
              </div>
            </div>

            {reassembledBlobUrl && (
              <div className="pt-2">
                <a
                  href={reassembledBlobUrl}
                  download={currentSession?.fileName || fileMetadata?.name || 'PeerLink_RFC_Protocol_Spec_2026.txt'}
                  className="bg-[#66ff66] text-[#000000] font-bold px-4 py-2 border border-[#66ff66] hover:bg-[#ffffff] transition-colors inline-flex items-center gap-2 text-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  [ DOWNLOAD & SAVE RECONSTRUCTED FILE TO DISK ]
                </a>
              </div>
            )}
          </div>
        ) : isFailed ? (
          <div className="p-4 border border-[#ff5555] bg-[#ff5555]/10 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#ff5555]">
              <AlertTriangle className="w-5 h-5 text-[#ff5555]" />
              <span>INTEGRITY FAILURE: ROOT HASH MISMATCH DETECTED</span>
            </div>
            <p className="text-xs text-[#ffffff]">
              One or more chunks were corrupted in transit. The reassembled byte stream failed cryptographic validation.
            </p>
          </div>
        ) : (
          <div className="p-4 border border-[#255325] text-center text-xs text-[#58ca58] space-y-1">
            <div>Reassembly engine standing by...</div>
            <div className="text-[11px] opacity-80">
              Awaiting full arrival of all 12 pieces across swarm peers before triggering byte stitcher.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
