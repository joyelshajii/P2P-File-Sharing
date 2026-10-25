import { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, ArrowDown, Filter } from 'lucide-react';
import type { NetworkEvent } from '../types/p2p';

interface EventLogProps {
  events: NetworkEvent[];
  onClear: () => void;
  maxEvents?: number;
}

export const EventLog: React.FC<EventLogProps> = ({ events, onClear, maxEvents = 100 }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const filteredEvents = events.slice(0, maxEvents).filter((e) => {
    if (filter === 'ALL') return true;
    if (filter === 'VERIFY') return e.type.includes('INTEGRITY');
    if (filter === 'CHUNK') return e.type.includes('CHUNK');
    if (filter === 'PEER') return e.type.includes('PEER');
    return true;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-[#66ff66]';
      case 'warn':
        return 'text-[#ffff66]';
      case 'error':
        return 'text-[#ff5555]';
      case 'info':
      default:
        return 'text-[#58ca58]';
    }
  };

  return (
    <div className="border border-[#255325] bg-[#000000] p-3 font-mono flex flex-col h-full">
      {/* Log Header & Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#255325] pb-2 mb-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#66ff66]" />
          <span className="font-bold text-[#66ff66]">// REALTIME_EVENT_LOG</span>
          <span className="text-[#58ca58] text-[11px]">({filteredEvents.length} events)</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Filter Pills */}
          <div className="flex items-center border border-[#255325] text-[11px]">
            <span className="px-1.5 text-[#58ca58] flex items-center gap-1">
              <Filter className="w-3 h-3" />
            </span>
            {(['ALL', 'CHUNK', 'VERIFY', 'PEER'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-1.5 py-0.5 cursor-pointer ${
                  filter === f
                    ? 'bg-[#66ff66] text-[#000000] font-bold'
                    : 'text-[#58ca58] hover:text-[#ffffff]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Autoscroll toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-0.5 text-[11px] border cursor-pointer ${
              autoScroll
                ? 'border-[#66ff66] text-[#66ff66]'
                : 'border-[#255325] text-[#58ca58]'
            }`}
            title="Toggle auto-scroll to bottom"
          >
            <ArrowDown className={`w-3 h-3 inline ${autoScroll ? 'animate-bounce' : ''}`} />
          </button>

          {/* Clear button */}
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-0.5 text-[11px] border border-[#255325] text-[#58ca58] hover:text-[#ff5555] hover:border-[#ff5555] cursor-pointer"
            title="Clear event logs"
          >
            <Trash2 className="w-3 h-3 inline" />
          </button>
        </div>
      </div>

      {/* Log Stream Output */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto max-h-[300px] min-h-[160px] space-y-1 pr-1 text-xs select-text"
        role="log"
        aria-live="polite"
      >
        {filteredEvents.length === 0 ? (
          <div className="text-[#58ca58]/60 italic py-4 text-center">
            -- No network events logged yet. Start the demonstration to observe packet activity --
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="leading-tight py-0.5 flex items-start gap-2 border-b border-[#255325]/30 hover:bg-[#255325]/20 font-mono"
            >
              <span className="text-[#58ca58] text-[11px] shrink-0">
                [{event.timestamp}]
              </span>

              <span className="text-[10px] px-1 py-0.2 border border-[#255325] text-[#ffffff] shrink-0 font-bold">
                {event.isSimulated ? 'SIM' : 'RTC'}
              </span>

              <span className={`font-bold text-[11px] shrink-0 ${getLevelColor(event.level)}`}>
                {event.type}
              </span>

              <span className="text-[#ffffff] text-xs flex-1 break-words">
                {event.details}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
