import { useState } from 'react';
import { UploadCloud, FileText, Download, CheckCircle, Database, Users } from 'lucide-react';
import type { FileMetadata } from '../types/p2p';
import { sliceFileIntoChunks } from '../lib/chunker';
import { formatBytes, formatShortHash } from '../lib/crypto';

interface SharedFilesPageProps {
  files: FileMetadata[];
  onShareLocalFile: (metadata: FileMetadata, chunksData: Map<number, Uint8Array>) => void;
  onStartDownload: (file: FileMetadata) => void;
  onInspectFile: (file: FileMetadata) => void;
  localPeerId: string;
}

export const SharedFilesPage: React.FC<SharedFilesPageProps> = ({
  files,
  onShareLocalFile,
  onStartDownload,
  onInspectFile,
  localPeerId,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunkProgress, setChunkProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    setSelectedFileName(file.name);
    setIsProcessing(true);
    setChunkProgress(0);
    setStatusMessage('Reading file bytes and computing SHA-256 chunk hashes locally...');

    try {
      // 1. Slice file locally
      // 2. Compute individual chunk hashes & root SHA-256
      // 3. Keep chunks in memory - NEVER upload to a central server!
      const { metadata, chunksData } = await sliceFileIntoChunks(
        file,
        file.name,
        256 * 1024,
        (progress) => setChunkProgress(progress)
      );

      onShareLocalFile(metadata, chunksData);
      setStatusMessage(`Successfully chunked into ${metadata.totalChunks} pieces. File announced to swarm!`);
    } catch (err: any) {
      console.error('File sharing error:', err);
      setStatusMessage(`Error processing file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Page Title & Subtitle */}
      <div className="border border-[#255325] bg-[#000000] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#66ff66] flex items-center gap-2">
            <span>[02_SWARM_FILES]</span>
            <span className="text-[#ffffff]">SHARED FILE REGISTRY & LOCAL SEEDER</span>
          </h2>
          <p className="text-xs text-[#58ca58] mt-1 max-w-3xl">
            Browse active files announced in the swarm or select any local file to seed directly from your browser. 
            All chunking and SHA-256 calculation executes client-side. Zero server storage required.
          </p>
        </div>
      </div>

      {/* Local Seeder Section: Pick Local File */}
      <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#255325] pb-2">
          <span className="text-sm font-bold text-[#66ff66] flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#66ff66]" />
            SEED NEW LOCAL FILE (BROWSER FILE API)
          </span>
          <span className="text-[11px] text-[#58ca58]">CLIENT-SIDE PIECE SLICING (256 KiB)</span>
        </div>

        <div className="border border-dashed border-[#255325] hover:border-[#66ff66] p-6 text-center transition-colors bg-black">
          <input
            type="file"
            id="p2p-file-input"
            onChange={handleFileInputChange}
            disabled={isProcessing}
            className="hidden"
          />
          <label
            htmlFor="p2p-file-input"
            className="cursor-pointer inline-flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 border border-[#66ff66] flex items-center justify-center bg-[#255325]/20">
              <UploadCloud className="w-6 h-6 text-[#66ff66]" />
            </div>
            <span className="text-sm font-bold text-[#ffffff] hover:underline">
              [ CLICK TO SELECT LOCAL FILE FROM YOUR COMPUTER ]
            </span>
            <span className="text-xs text-[#58ca58]">
              File will be chunked into 256 KiB segments with SHA-256 integrity verification
            </span>
          </label>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-[#58ca58]">
              <span>PROCESSING FILE: {selectedFileName}</span>
              <span className="text-[#66ff66] font-bold">{chunkProgress}%</span>
            </div>
            <div className="w-full bg-[#000000] border border-[#255325] h-3 p-0.5">
              <div
                className="bg-[#66ff66] h-full transition-all duration-150"
                style={{ width: `${chunkProgress}%` }}
              />
            </div>
          </div>
        )}

        {statusMessage && !isProcessing && (
          <div className="p-2 border border-[#255325] bg-[#255325]/20 text-xs text-[#66ff66] flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Available Swarm Files Table */}
      <div className="border border-[#255325] bg-[#000000] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#255325] pb-2">
          <span className="text-sm font-bold text-[#66ff66] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#66ff66]" />
            AVAILABLE FILES IN SWARM ({files.length})
          </span>
          <span className="text-xs text-[#58ca58]">P2P MANIFEST REGISTRY</span>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#58ca58]/60 italic">
            -- No files announced in swarm yet. Click "Start Demo" or select a local file to seed --
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#255325] text-[#58ca58] text-[11px]">
                  <th scope="col" className="p-2">FILE_NAME</th>
                  <th scope="col" className="p-2">SIZE</th>
                  <th scope="col" className="p-2">CHUNKS</th>
                  <th scope="col" className="p-2">ROOT_SHA256</th>
                  <th scope="col" className="p-2">SEEDERS / PEERS</th>
                  <th scope="col" className="p-2">AVAILABILITY</th>
                  <th scope="col" className="p-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#255325]/40">
                {files.map((file) => {
                  const isSeedingLocally = file.isLocal || file.seeders.includes(localPeerId);

                  return (
                    <tr key={file.id} className="hover:bg-[#255325]/20 transition-colors">
                      <td className="p-2 font-bold text-[#ffffff] flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#66ff66] shrink-0" />
                        <span className="truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </span>
                      </td>

                      <td className="p-2 text-[#58ca58]">
                        {formatBytes(file.size)}
                      </td>

                      <td className="p-2 text-[#58ca58]">
                        <span className="text-[#66ff66] font-bold">{file.totalChunks}</span> pieces (256 KiB)
                      </td>

                      <td className="p-2 font-mono text-[11px] text-[#58ca58]" title={file.fileHash}>
                        {formatShortHash(file.fileHash, 6)}
                      </td>

                      <td className="p-2 text-[#58ca58]">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#66ff66]" />
                          {file.seeders.length} seeders
                          {isSeedingLocally && (
                            <span className="text-[10px] bg-[#255325] text-[#ffffff] px-1 py-0.2 border border-[#66ff66]">
                              YOU
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="p-2">
                        <span className="text-[#66ff66] text-xs font-bold">
                          [ 100% COMPLETE ]
                        </span>
                      </td>

                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectFile(file)}
                            className="px-2 py-1 border border-[#255325] text-[#58ca58] hover:text-[#ffffff] hover:border-[#66ff66] text-[11px] cursor-pointer"
                          >
                            [ INSPECT ]
                          </button>
                          <button
                            type="button"
                            onClick={() => onStartDownload(file)}
                            className="bg-[#66ff66] text-[#000000] font-bold px-2.5 py-1 text-[11px] hover:bg-[#ffffff] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            [ DOWNLOAD ]
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
