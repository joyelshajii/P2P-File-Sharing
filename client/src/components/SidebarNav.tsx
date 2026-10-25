import { 
  Activity, 
  HardDrive, 
  Users, 
  DownloadCloud, 
  Binary, 
  BookOpen 
} from 'lucide-react';

export type NavTab = 
  | 'dashboard' 
  | 'files' 
  | 'peers' 
  | 'downloads' 
  | 'inspector' 
  | 'architecture';

interface SidebarNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeDownloadsCount: number;
  onlinePeersCount: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentTab,
  onTabChange,
  activeDownloadsCount,
  onlinePeersCount,
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      index: '01',
      label: 'DASHBOARD',
      icon: Activity,
      desc: 'Network summary & topology',
    },
    {
      id: 'files' as NavTab,
      index: '02',
      label: 'SWARM_FILES',
      icon: HardDrive,
      desc: 'Local seeding & file index',
    },
    {
      id: 'peers' as NavTab,
      index: '03',
      label: 'PEER_EXPLORER',
      icon: Users,
      badge: onlinePeersCount > 0 ? `${onlinePeersCount}` : undefined,
      desc: 'Active swarm connections',
    },
    {
      id: 'downloads' as NavTab,
      index: '04',
      label: 'DOWNLOADS',
      icon: DownloadCloud,
      badge: activeDownloadsCount > 0 ? `${activeDownloadsCount}` : undefined,
      desc: 'Transfer manager & queues',
    },
    {
      id: 'inspector' as NavTab,
      index: '05',
      label: 'TRANSFER_INSPECTOR',
      icon: Binary,
      desc: 'Bitfield & SHA-256 verifier',
    },
    {
      id: 'architecture' as NavTab,
      index: '06',
      label: 'ARCHITECTURE_LAB',
      icon: BookOpen,
      desc: 'P2P vs Client-Server theory',
    },
  ];

  return (
    <nav 
      aria-label="Main system commands" 
      className="w-full md:w-64 border-r border-[#255325] bg-[#000000] flex flex-col justify-between shrink-0 font-mono"
    >
      <div>
        {/* Command Gutter Header */}
        <div className="p-3 border-b border-[#255325] text-xs text-[#58ca58]">
          <span className="text-[#66ff66] font-bold">EXEC_INDEX</span> // SYSTEM COMMANDS
        </div>

        <ul className="list-none p-0 m-0">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;

            return (
              <li key={tab.id} className="border-b border-[#255325]/50">
                <button
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full text-left p-3 flex items-start gap-2.5 transition-colors cursor-pointer group ${
                    isActive
                      ? 'bg-[#66ff66] text-[#000000]'
                      : 'text-[#58ca58] hover:bg-[#255325]/40 hover:text-[#ffffff]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`text-xs font-bold font-mono ${isActive ? 'text-[#000000]' : 'text-[#66ff66]'}`}>
                    [{tab.index}]
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs tracking-wider font-mono flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </span>
                      {tab.badge && (
                        <span className={`text-[10px] px-1 font-bold ${
                          isActive ? 'bg-[#000000] text-[#66ff66]' : 'bg-[#255325] text-[#ffffff]'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-[#000000]/80' : 'text-[#58ca58]/80'}`}>
                      {tab.desc}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Terminal Node Info Footer */}
      <div className="p-3 border-t border-[#255325] text-xs text-[#58ca58] space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span>BITSTREAM:</span>
          <span className="text-[#66ff66] font-bold">256 KiB PIECES</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span>CIPHER:</span>
          <span className="text-[#66ff66]">SHA-256 SUBTLE</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span>PROTOCOL:</span>
          <span className="text-[#ffffff]">SCTP/DTLS/P2P</span>
        </div>
      </div>
    </nav>
  );
};
