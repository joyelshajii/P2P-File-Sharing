import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SidebarNav, type NavTab } from './components/SidebarNav';
import { DashboardPage } from './pages/DashboardPage';
import { SharedFilesPage } from './pages/SharedFilesPage';
import { PeerExplorerPage } from './pages/PeerExplorerPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { TransferInspectorPage } from './pages/TransferInspectorPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { simulationEngine, type SimulationState } from './services/simulationEngine';
import { webrtcManager } from './services/webrtcManager';
import type { DownloadSession, FileMetadata, NetworkEvent, PeerNode } from './types/p2p';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [activeMode, setActiveMode] = useState<'simulation' | 'webrtc'>('simulation');
  const [simulationState, setSimulationState] = useState<SimulationState>(simulationEngine.getState());
  const [events, setEvents] = useState<NetworkEvent[]>([]);

  // WebRTC real state
  const [webrtcPeers, setWebrtcPeers] = useState<PeerNode[]>([]);
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [webrtcAnnouncedFiles, setWebrtcAnnouncedFiles] = useState<FileMetadata[]>([]);
  const [localSharedFiles, setLocalSharedFiles] = useState<FileMetadata[]>([]);
  const [webrtcDownloads, setWebrtcDownloads] = useState<DownloadSession[]>([]);

  // Selected file for inspection in Transfer Inspector
  const [inspectedFile, setInspectedFile] = useState<FileMetadata | null>(null);

  // Initialize Simulation Engine file and subscribe
  useEffect(() => {
    // Check URL parameters: e.g. ?mode=webrtc or ?connect=peer-XXXX
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'webrtc') {
      setActiveMode('webrtc');
    }

    simulationEngine.setCallback((state, event) => {
      setSimulationState(state);
      if (event) {
        setEvents((prev) => [event, ...prev].slice(0, 150));
      }
    });

    // Initialize default demo file
    simulationEngine.initializeFile().then((metadata) => {
      setInspectedFile(metadata);
    });

    // Initialize WebRTC callbacks
    webrtcManager.setEventCallback((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 150));
    });

    webrtcManager.setStateCallback((state) => {
      setIsSignalingConnected(state.isConnectedToSignaling);
      setWebrtcPeers(state.peers);
      setWebrtcAnnouncedFiles(state.announcedFiles);
      setLocalSharedFiles(webrtcManager.getLocalFiles());

      // If remote peers are detected, auto-switch to WebRTC mode so the user sees real P2P!
      if (state.peers.length > 0) {
        setActiveMode('webrtc');
      }
    });

    webrtcManager.setDownloadUpdateCallback((updatedSession) => {
      setWebrtcDownloads((prev) => {
        const idx = prev.findIndex((s) => s.fileId === updatedSession.fileId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedSession;
          return next;
        }
        return [...prev, updatedSession];
      });
    });

    // Try connecting to signaling server
    webrtcManager.connectToSignaling();

    // Check if URL asked to connect directly to a peer
    const targetPeer = params.get('connect');
    if (targetPeer) {
      setActiveMode('webrtc');
      setTimeout(() => {
        webrtcManager.connectToPeer(targetPeer);
      }, 1000);
    }
  }, []);

  // Compute active peers & files based on mode
  const activePeers = activeMode === 'simulation' ? simulationState.peers : webrtcPeers;

  // Swarm files: combine local shared files, announced network files, and demo file
  const activeFiles: FileMetadata[] = (() => {
    const fileMap = new Map<string, FileMetadata>();

    // Add local shared files (seeding)
    localSharedFiles.forEach((f) => fileMap.set(f.id, f));

    // Add remote announced files
    webrtcAnnouncedFiles.forEach((f) => {
      if (!fileMap.has(f.id)) {
        fileMap.set(f.id, f);
      }
    });

    // Add demo file
    if (simulationState.fileMetadata && !fileMap.has(simulationState.fileMetadata.id)) {
      fileMap.set(simulationState.fileMetadata.id, simulationState.fileMetadata);
    }

    return Array.from(fileMap.values());
  })();

  const activeDownloads: DownloadSession[] = activeMode === 'simulation'
    ? (simulationState.downloadSession ? [simulationState.downloadSession] : [])
    : webrtcDownloads;

  const totalBytesExchanged = activePeers.reduce((acc, p) => acc + p.bytesExchanged, 0);

  // Demo Control Handlers
  const handleStartDemo = useCallback(() => {
    setActiveMode('simulation');
    simulationEngine.startDemo();
    setCurrentTab('inspector'); // Immediately navigate to Inspector to see live BitTorrent pieces!
  }, []);

  const handlePauseDemo = useCallback(() => {
    simulationEngine.pauseDemo();
  }, []);

  const handleResumeDemo = useCallback(() => {
    simulationEngine.resumeDemo();
  }, []);

  const handleResetDemo = useCallback(() => {
    simulationEngine.resetDemo();
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    simulationEngine.setSpeedMultiplier(speed);
  }, []);

  const handleToggleCorruptTest = useCallback((enabled: boolean) => {
    simulationEngine.setCorruptPieceTest(enabled);
  }, []);

  const handleClearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Open 2nd peer tab/window for instant P2P testing
  const handleOpenSecondPeer = useCallback(() => {
    window.open(`${window.location.origin}/?mode=webrtc&connect=${webrtcManager.getLocalPeerId()}`, '_blank');
  }, []);

  // Direct peer connect handler
  const handleConnectToPeer = useCallback((peerId: string) => {
    setActiveMode('webrtc');
    webrtcManager.connectToPeer(peerId);
  }, []);

  // File actions
  const handleShareLocalFile = useCallback((metadata: FileMetadata, chunksData: Map<number, Uint8Array>) => {
    setActiveMode('webrtc');
    webrtcManager.announceLocalFile(metadata, chunksData);
    setLocalSharedFiles(webrtcManager.getLocalFiles());
    setInspectedFile(metadata);
  }, []);

  const handleStartDownload = useCallback((file: FileMetadata) => {
    if (activeMode === 'simulation') {
      handleStartDemo();
    } else {
      const session = webrtcManager.startDownload(file);
      setWebrtcDownloads((prev) => [...prev, session]);
      setInspectedFile(file);
      setCurrentTab('downloads');
    }
  }, [activeMode, handleStartDemo]);

  const handleInspectFile = useCallback((file: FileMetadata) => {
    setInspectedFile(file);
    setCurrentTab('inspector');
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-[#66ff66] flex flex-col font-mono selection:bg-[#66ff66] selection:text-[#000000]">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:p-2 focus:bg-[#66ff66] focus:text-[#000000] focus:font-bold focus:border focus:border-[#ffffff]"
      >
        Skip to main content
      </a>

      {/* Terminal Top Session Bar & Header */}
      <Header
        localPeerId={webrtcManager.getLocalPeerId()}
        isSignalingConnected={isSignalingConnected}
        activeMode={activeMode}
        onModeChange={(mode) => setActiveMode(mode)}
        simulationState={simulationState}
        onStartDemo={handleStartDemo}
        onPauseDemo={handlePauseDemo}
        onResumeDemo={handleResumeDemo}
        onResetDemo={handleResetDemo}
        onSpeedChange={handleSpeedChange}
        onOpenSecondPeer={handleOpenSecondPeer}
      />

      {/* Main Layout: Numbered Command Gutter + Work Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <SidebarNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          activeDownloadsCount={activeDownloads.filter((d) => d.status === 'downloading').length}
          onlinePeersCount={activePeers.filter((p) => p.status === 'connected').length}
        />

        {/* Dynamic Page Views */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 md:p-6 overflow-y-auto max-w-full focus:outline-none"
        >
          {currentTab === 'dashboard' && (
            <DashboardPage
              localPeerId={webrtcManager.getLocalPeerId()}
              peers={activePeers}
              files={activeFiles}
              activeDownloadsCount={activeDownloads.filter((d) => d.status === 'downloading').length}
              totalBytesExchanged={totalBytesExchanged}
              events={events}
              onClearEvents={handleClearEvents}
              isSignalingConnected={isSignalingConnected}
              activeMode={activeMode}
              simulationState={simulationState}
              onNavigate={setCurrentTab}
              onStartDemo={handleStartDemo}
              onOpenSecondPeer={handleOpenSecondPeer}
            />
          )}

          {currentTab === 'files' && (
            <SharedFilesPage
              files={activeFiles}
              onShareLocalFile={handleShareLocalFile}
              onStartDownload={handleStartDownload}
              onInspectFile={handleInspectFile}
              localPeerId={webrtcManager.getLocalPeerId()}
            />
          )}

          {currentTab === 'peers' && (
            <PeerExplorerPage
              peers={activePeers}
              activeMode={activeMode}
              localPeerId={webrtcManager.getLocalPeerId()}
              onConnectToPeer={handleConnectToPeer}
              onOpenSecondPeer={handleOpenSecondPeer}
              onRefresh={() => webrtcManager.connectToSignaling()}
            />
          )}

          {currentTab === 'downloads' && (
            <DownloadsPage
              downloads={activeDownloads}
              onPause={handlePauseDemo}
              onResume={handleResumeDemo}
              onCancel={handleResetDemo}
              onInspect={() => setCurrentTab('inspector')}
              onNavigate={setCurrentTab}
              onStartDemo={handleStartDemo}
            />
          )}

          {currentTab === 'inspector' && (
            <TransferInspectorPage
              currentSession={simulationState.downloadSession}
              fileMetadata={simulationState.fileMetadata || inspectedFile}
              simulationState={simulationState}
              onStartDemo={handleStartDemo}
              onPauseDemo={handlePauseDemo}
              onResumeDemo={handleResumeDemo}
              onResetDemo={handleResetDemo}
              onToggleCorruptTest={handleToggleCorruptTest}
            />
          )}

          {currentTab === 'architecture' && <ArchitecturePage />}
        </main>
      </div>

      {/* Terminal Footer */}
      <footer className="border-t border-[#255325] bg-[#000000] px-4 py-2 text-xs flex flex-wrap items-center justify-between text-[#58ca58] select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-[#66ff66] rounded-none cursor-blink"></span>
            SYS_ONLINE
          </span>
          <span className="text-[#255325]">|</span>
          <span>PEERLINK // P2P FILE SHARING NETWORK</span>
          <span className="text-[#255325]">|</span>
          <span>COMPUTER NETWORKS PROJECT 2026</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span>CIPHER: SHA-256 (MERKLE VERIFICATION)</span>
          <span>CHANNELS: WEBRTC DATACHANNEL + SCTP</span>
          <span className="text-[#ffffff]">ZERO SERVER STORAGE</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
