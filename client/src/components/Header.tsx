import { Play, Pause, RotateCcw, Wifi, WifiOff, Terminal as TerminalIcon } from 'lucide-react';
import type { SimulationState } from '../services/simulationEngine';

interface HeaderProps {
  localPeerId: string;
  isSignalingConnected: boolean;
  activeMode: 'simulation' | 'webrtc';
  onModeChange: (mode: 'simulation' | 'webrtc') => void;
  simulationState: SimulationState;
  onStartDemo: () => void;
  onPauseDemo: () => void;
  onResumeDemo: () => void;
  onResetDemo: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenSecondPeer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  localPeerId,
  isSignalingConnected,
  activeMode,
  onModeChange,
  simulationState,
  onStartDemo,
  onPauseDemo,
  onResumeDemo,
  onResetDemo,
  onSpeedChange,
  onOpenSecondPeer,
}) => {
  const isSimRunning = simulationState.isRunning;
  const isSimPaused = simulationState.isPaused;

  return (
    <header className="border-b border-[#255325] bg-[#000000] px-4 py-3 select-none" role="banner">
      {/* Top Session Status Line */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs tracking-wider border-b border-[#255325] pb-2 mb-2 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-[#ffffff]">
            <TerminalIcon className="w-4 h-4 text-[#66ff66]" />
            PEERLINK // V1.0-STABLE
          </span>
          <span className="text-[#255325]">|</span>
          <span className="text-[#58ca58]">
            NODE: <span className="text-[#ffffff] font-semibold">{localPeerId}</span>
          </span>
          <span className="text-[#255325]">|</span>
          <span className="flex items-center gap-1">
            SIGNALING:
            {isSignalingConnected ? (
              <span className="text-[#66ff66] flex items-center gap-1 font-semibold">
                <Wifi className="w-3.5 h-3.5 inline text-[#66ff66]" />
                ONLINE (9001)
              </span>
            ) : (
              <span className="text-[#58ca58] flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5 inline text-[#58ca58]" />
                STANDBY / LOCAL
              </span>
            )}
          </span>
        </div>

        {/* Mode Selector and Quick Indicators */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSecondPeer}
            className="bg-[#000000] text-[#66ff66] hover:bg-[#66ff66] hover:text-[#000000] border border-[#66ff66] px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="Open a 2nd peer tab/window to test direct browser-to-browser P2P transfers"
          >
            <span>[ + OPEN 2ND PEER TAB ]</span>
          </button>

          <div className="flex items-center border border-[#255325] p-0.5 text-xs">
            <span className="px-2 text-[#58ca58] text-[11px] uppercase tracking-wider">TRANSFER_MODE:</span>
            <button
              type="button"
              onClick={() => onModeChange('simulation')}
              className={`px-2.5 py-1 text-xs transition-colors font-mono cursor-pointer ${
                activeMode === 'simulation'
                  ? 'bg-[#66ff66] text-[#000000] font-bold'
                  : 'text-[#58ca58] hover:text-[#ffffff]'
              }`}
            >
              [ SIMULATION ]
            </button>
            <button
              type="button"
              onClick={() => onModeChange('webrtc')}
              className={`px-2.5 py-1 text-xs transition-colors font-mono cursor-pointer ${
                activeMode === 'webrtc'
                  ? 'bg-[#66ff66] text-[#000000] font-bold'
                  : 'text-[#58ca58] hover:text-[#ffffff]'
              }`}
            >
              [ REAL WEBRTC ]
            </button>
          </div>

          {activeMode === 'simulation' && (
            <span className="bg-[#255325] text-[#ffffff] px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase border border-[#66ff66]">
              SIMULATION ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Action Toolbar & Demo Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-2">
          <h1 className="text-sm md:text-base font-bold text-[#66ff66] tracking-tight">
            PEERLINK — P2P FILE SHARING NETWORK
          </h1>
          <span className="text-[#58ca58] text-xs hidden lg:inline">
            // Computer Networks Group Project Demonstration
          </span>
        </div>

        {/* Interactive Demo Controller */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#58ca58] text-xs hidden sm:inline">DEMO CONTROL:</span>

          {!isSimRunning ? (
            <button
              type="button"
              onClick={onStartDemo}
              className="bg-[#66ff66] text-[#000000] font-bold px-3 py-1.5 flex items-center gap-1.5 border border-[#66ff66] hover:bg-[#ffffff] hover:text-[#000000] transition-colors cursor-pointer"
              title="Start deterministic 3-peer 12-chunk download demonstration"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              [ ► START DEMO ]
            </button>
          ) : isSimPaused ? (
            <button
              type="button"
              onClick={onResumeDemo}
              className="bg-[#66ff66] text-[#000000] font-bold px-3 py-1.5 flex items-center gap-1.5 border border-[#66ff66] hover:bg-[#ffffff] transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              [ RESUME ]
            </button>
          ) : (
            <button
              type="button"
              onClick={onPauseDemo}
              className="bg-[#000000] text-[#ffffff] font-bold px-3 py-1.5 flex items-center gap-1.5 border border-[#66ff66] hover:bg-[#255325] transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              [ PAUSE ]
            </button>
          )}

          <button
            type="button"
            onClick={onResetDemo}
            className="bg-[#000000] text-[#58ca58] px-2.5 py-1.5 flex items-center gap-1 border border-[#255325] hover:text-[#ffffff] hover:border-[#66ff66] transition-colors cursor-pointer"
            title="Reset simulation to initial state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            [ RESET ]
          </button>

          {/* Speed Selector */}
          <div className="flex items-center border border-[#255325] text-xs">
            <span className="px-2 text-[#58ca58] text-[10px]">SPEED:</span>
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onSpeedChange(spd)}
                className={`px-2 py-1 font-mono transition-colors cursor-pointer ${
                  simulationState.speedMultiplier === spd
                    ? 'bg-[#66ff66] text-[#000000] font-bold'
                    : 'text-[#58ca58] hover:text-[#ffffff]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
