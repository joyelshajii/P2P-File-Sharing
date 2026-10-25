import { DownloadCloud, Play, Pause, XCircle, ArrowRight, Save } from 'lucide-react';
import type { DownloadSession } from '../types/p2p';
import { formatBytes, formatDuration, formatSpeed } from '../lib/crypto';
import type { NavTab } from '../components/SidebarNav';

interface DownloadsPageProps {
  downloads: DownloadSession[];
  onPause: (fileId: string) => void;
  onResume: (fileId: string) => void;
  onCancel: (fileId: string) => void;
  onInspect: (session: DownloadSession) => void;
  onNavigate: (tab: NavTab) => void;
  onStartDemo: () => void;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({
  downloads,
  onPause,
  onResume,
  onCancel,
  onInspect,
  onNavigate,
  onStartDemo,
}) => {
  const renderAsciiProgressBar = (percent: number, length = 24) => {
    const filledLength = Math.round((percent / 100) * length);
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(Math.max(0, length - filledLength));
    return `[${filled}${empty}] ${percent}%`;
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Page Header */}
      <div className="border border-[#255325] bg-[#000000] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#66ff66] flex items-center gap-2">
            <span>[04_DOWNLOADS]</span>
            <span className="text-[#ffffff]">P2P TRANSFER MANAGER & QUEUE</span>
          </h2>
          <p className="text-xs text-[#58ca58] mt-1 max-w-3xl">
            Monitor real-time piece retrieval across swarm peers. Once all chunks pass SHA-256 integrity 
            checks, the reassembled file can be saved directly to your local file system.
          </p>
        </div>

        {downloads.length === 0 && (
          <button
            type="button"
            onClick={onStartDemo}
            className="bg-[#66ff66] text-[#000000] font-bold px-3 py-1.5 border border-[#66ff66] hover:bg-[#ffffff] transition-colors text-xs cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            [ LAUNCH DEMO TRANSFER ]
          </button>
        )}
      </div>

      {/* Downloads List */}
      <div className="space-y-3">
        {downloads.length === 0 ? (
          <div className="border border-[#255325] bg-[#000000] p-8 text-center text-xs space-y-3">
            <DownloadCloud className="w-8 h-8 text-[#58ca58]/40 mx-auto" />
            <div className="text-[#58ca58]">
              No active or completed downloads currently in queue.
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onStartDemo}
                className="bg-[#66ff66] text-[#000000] font-bold px-3 py-1.5 text-xs hover:bg-[#ffffff] transition-colors cursor-pointer"
              >
                [ START MULTI-PEER DEMO ]
              </button>
              <button
                type="button"
                onClick={() => onNavigate('files')}
                className="border border-[#255325] text-[#58ca58] hover:text-[#ffffff] px-3 py-1.5 text-xs cursor-pointer"
              >
                [ BROWSE SHARED FILES ]
              </button>
            </div>
          </div>
        ) : (
          downloads.map((session) => {
            const percent = session.totalChunks > 0 
              ? Math.round((session.receivedChunks / session.totalChunks) * 100)
              : 0;
            const isCompleted = session.status === 'completed';
            const isPaused = session.status === 'paused';
            const isDownloading = session.status === 'downloading';

            return (
              <div
                key={session.fileId}
                className="border border-[#255325] bg-[#000000] p-4 space-y-3 hover:border-[#66ff66]/70 transition-colors"
              >
                {/* Header: File Name, Size, Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#255325] pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#ffffff] text-sm">
                      {session.fileName}
                    </span>
                    <span className="text-[#58ca58]">
                      ({formatBytes(session.fileSize)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 border font-bold uppercase ${
                        isCompleted
                          ? 'border-[#66ff66] text-[#000000] bg-[#66ff66]'
                          : isPaused
                          ? 'border-[#ffff66] text-[#ffff66]'
                          : 'border-[#66ff66] text-[#66ff66] animate-pulse'
                      }`}
                    >
                      {session.status}
                    </span>

                    {session.blobUrl && (
                      <a
                        href={session.blobUrl}
                        download={session.fileName}
                        className="bg-[#ffffff] text-[#000000] font-bold px-2 py-0.5 text-[11px] border border-[#ffffff] hover:bg-[#66ff66] transition-colors flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        [ SAVE REASSEMBLED FILE ]
                      </a>
                    )}
                  </div>
                </div>

                {/* ASCII Progress Bar & Speed Stats */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#58ca58]">
                    <span className="font-mono text-[#66ff66]">
                      {renderAsciiProgressBar(percent, 32)}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#ffffff]">
                        RATE: <strong className="text-[#66ff66]">{formatSpeed(session.downloadSpeed)}</strong>
                      </span>
                      <span>
                        ETA: <strong className="text-[#ffffff]">{formatDuration(session.eta)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Visual HTML Progress Fill */}
                  <div className="w-full bg-[#000000] border border-[#255325] h-3 p-0.5">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isCompleted ? 'bg-[#66ff66]' : 'bg-[#66ff66]/80'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#255325]/50 text-xs">
                  <div>
                    <span className="text-[#58ca58] block text-[11px]">CHUNKS_RECEIVED:</span>
                    <span className="text-[#ffffff] font-bold">
                      {session.receivedChunks} / {session.totalChunks} ({(session.totalChunks * 256).toFixed(0)} KiB total)
                    </span>
                  </div>

                  <div>
                    <span className="text-[#58ca58] block text-[11px]">HASH_VERIFIED:</span>
                    <span className="text-[#66ff66] font-bold">
                      {session.verifiedChunks} pieces OK
                    </span>
                  </div>

                  <div>
                    <span className="text-[#58ca58] block text-[11px]">ACTIVE_SOURCES:</span>
                    <span className="text-[#ffffff] font-bold">
                      {session.activePeers.length} peers contributing
                    </span>
                  </div>

                  <div>
                    <span className="text-[#58ca58] block text-[11px]">SWARM_INTEGRITY:</span>
                    <span className="text-[#66ff66] font-bold">
                      {isCompleted ? '100% SHA-256 MATCH' : 'PARALLEL HASHING'}
                    </span>
                  </div>
                </div>

                {/* Control Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#255325]/50 text-xs">
                  <div className="flex items-center gap-2">
                    {isDownloading && (
                      <button
                        type="button"
                        onClick={() => onPause(session.fileId)}
                        className="px-2.5 py-1 border border-[#255325] hover:border-[#ffff66] text-[#58ca58] hover:text-[#ffff66] flex items-center gap-1 cursor-pointer"
                      >
                        <Pause className="w-3 h-3" />
                        [ PAUSE ]
                      </button>
                    )}

                    {isPaused && (
                      <button
                        type="button"
                        onClick={() => onResume(session.fileId)}
                        className="px-2.5 py-1 bg-[#66ff66] text-[#000000] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        [ RESUME ]
                      </button>
                    )}

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => onCancel(session.fileId)}
                        className="px-2.5 py-1 border border-[#255325] hover:border-[#ff5555] text-[#58ca58] hover:text-[#ff5555] flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" />
                        [ CANCEL ]
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onInspect(session)}
                    className="border border-[#255325] hover:border-[#66ff66] text-[#66ff66] px-3 py-1 flex items-center gap-1 cursor-pointer hover:bg-[#255325]/30"
                  >
                    <span>[ INSPECT CHUNK BITFIELD ]</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
