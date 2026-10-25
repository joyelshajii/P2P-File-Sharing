import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  badge?: string;
  index: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  badge,
  index,
}) => {
  return (
    <div className="border border-[#255325] bg-[#000000] p-3 font-mono flex flex-col justify-between hover:border-[#66ff66] transition-colors">
      <div className="flex items-center justify-between text-xs text-[#58ca58] mb-1">
        <span className="flex items-center gap-1.5 font-bold">
          <span className="text-[#66ff66]">[{index}]</span>
          <span>{label}</span>
        </span>
        <Icon className="w-4 h-4 text-[#66ff66]" />
      </div>

      <div className="my-1">
        <div className="text-2xl font-bold text-[#ffffff] tracking-tight">
          {value}
        </div>
        {subValue && (
          <div className="text-xs text-[#58ca58] mt-0.5 truncate">
            {subValue}
          </div>
        )}
      </div>

      {badge && (
        <div className="mt-2 pt-1 border-t border-[#255325]/50 flex justify-between items-center text-[10px]">
          <span className="text-[#58ca58]">MODE</span>
          <span className="text-[#66ff66] font-bold">{badge}</span>
        </div>
      )}
    </div>
  );
};
