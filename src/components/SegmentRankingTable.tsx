import React, { useState, useMemo } from 'react';
import { HighwaySegment, SegmentRiskTelemetry, RiskTier } from '../types';
import { 
  ArrowUpDown, 
  Search, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Eye, 
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  AlertOctagon,
  Navigation
} from 'lucide-react';

interface SegmentRankingTableProps {
  segments: HighwaySegment[];
  telemetries: Map<string, SegmentRiskTelemetry>;
  selectedSegmentId: string | null;
  onSelectSegment: (id: string) => void;
  isEngineeringMode?: boolean;
}

type SortField = 'risk' | 'wetness' | 'steepness' | 'chainage';

export const SegmentRankingTable: React.FC<SegmentRankingTableProps> = ({
  segments,
  telemetries,
  selectedSegmentId,
  onSelectSegment,
  isEngineeringMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('risk');
  const [sortAsc, setSortAsc] = useState<boolean>(false); // Highest risk first by default

  const processedData = useMemo(() => {
    return segments.map((seg) => {
      const tel = telemetries.get(seg.id);
      const fos = tel ? tel.fos : 9.99;
      
      // Calculate a simple 0-100% Collapse Risk Score
      // If fos <= 0.8 => 95-100% danger
      // If fos = 1.0 => 80% danger
      // If fos = 1.25 => 45% danger
      // If fos >= 1.6 => 5% danger
      let dangerPercent = 0;
      if (fos <= 0.8) {
        dangerPercent = 95;
      } else if (fos < 1.0) {
        dangerPercent = Math.round(80 + ((1.0 - fos) / 0.2) * 15);
      } else if (fos <= 1.25) {
        dangerPercent = Math.round(45 + ((1.25 - fos) / 0.25) * 35);
      } else if (fos < 1.6) {
        dangerPercent = Math.round(10 + ((1.6 - fos) / 0.35) * 35);
      } else {
        dangerPercent = 5;
      }

      // Friendly travel advice
      let travelAdvice = 'Safe for normal travel';
      let travelAction = 'Normal speed';
      if (tel?.riskTier === 'UNSTABLE') {
        travelAdvice = '⛔ High landslide risk: Avoid travel / Road closure advised';
        travelAction = 'AVOID TRAVEL';
      } else if (tel?.riskTier === 'MARGINAL') {
        travelAdvice = '⚠️ Active slope movement: Drive slowly, watch for rocks';
        travelAction = 'DRIVE CAREFULLY';
      } else if (tel?.riskTier === 'DATA_DEFICIENT') {
        travelAdvice = '❓ Sensor unverified: Exercise caution';
        travelAction = 'PATROL REQUIRED';
      }

      return {
        seg,
        tel,
        fos,
        dangerPercent,
        travelAdvice,
        travelAction,
        wetness: tel ? tel.waterTableHeightM : 0,
        steepness: seg.slopeBeta,
        chainage: seg.chainageKm,
      };
    });
  }, [segments, telemetries]);

  // Filtering
  const filteredData = useMemo(() => {
    return processedData.filter((item) => {
      const matchesSearch =
        item.seg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.seg.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.seg.geology.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTier === 'ALL') return true;
      return item.tel?.riskTier === filterTier;
    });
  }, [processedData, searchQuery, filterTier]);

  // Sorting
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'risk') {
        comparison = a.dangerPercent - b.dangerPercent;
      } else if (sortField === 'wetness') {
        comparison = a.wetness - b.wetness;
      } else if (sortField === 'steepness') {
        comparison = a.steepness - b.steepness;
      } else if (sortField === 'chainage') {
        comparison = a.chainage - b.chainage;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'chainage');
    }
  };

  const getTierBadge = (tier?: RiskTier) => {
    switch (tier) {
      case 'UNSTABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            HIGH DANGER
          </span>
        );
      case 'MARGINAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            CAUTION
          </span>
        );
      case 'STABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            SAFE ROAD
          </span>
        );
      case 'DATA_DEFICIENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-500/50">
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            UNVERIFIED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-cyan-400" />
              Highway Road Sections Risk Status
            </h3>
            <p className="text-xs text-slate-400">
              Live safety ranking for {segments.length} sections along NH-58
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search town, stretch, KM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-500 text-[11px] shrink-0 mr-1">Filter:</span>
          {[
            { id: 'ALL', label: 'All Roads' },
            { id: 'UNSTABLE', label: 'High Danger' },
            { id: 'MARGINAL', label: 'Caution' },
            { id: 'STABLE', label: 'Safe' },
            { id: 'DATA_DEFICIENT', label: 'Unverified' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTier(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                filterTier === tab.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-slate-800/60">
        {sortedData.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No highway road sections match your filter criteria.
          </div>
        ) : (
          sortedData.map((item) => {
            const isSelected = selectedSegmentId === item.seg.id;
            const tier = item.tel?.riskTier;

            return (
              <div
                key={item.seg.id}
                onClick={() => onSelectSegment(item.seg.id)}
                className={`p-3.5 sm:p-4 hover:bg-slate-800/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected ? 'bg-slate-800/80 border-l-4 border-cyan-500' : ''
                }`}
              >
                {/* Left: Road Details & Travel Advisory */}
                <div className="space-y-1 sm:max-w-[55%]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100 text-sm hover:text-cyan-300 transition-colors">
                      {item.seg.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                      Km {item.seg.chainageKm}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                    <span>{item.travelAdvice}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Elevation: {item.seg.elevationM} m</span>
                    <span>•</span>
                    <span>
                      Slope: <b>{item.seg.slopeBeta}°</b> ({item.seg.slopeBeta > 45 ? 'Steep Cliff' : 'Gentle Mountain'})
                    </span>
                    {isEngineeringMode && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-cyan-400">FoS: {item.fos.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Risk Badge & Danger Meter */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <div>{getTierBadge(tier)}</div>

                    {/* Simple Danger Bar */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-400 text-[10px]">Threat Level:</span>
                      <div className="w-16 sm:w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.dangerPercent > 70
                              ? 'bg-rose-500'
                              : item.dangerPercent > 40
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${item.dangerPercent}%` }}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-bold ${
                          item.dangerPercent > 70
                            ? 'text-rose-400'
                            : item.dangerPercent > 40
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.dangerPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Open Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSegment(item.seg.id);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-colors"
                    title="View complete road safety details & engineering data"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info strip */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Showing {sortedData.length} road sections</span>
        <span className="text-[11px] text-cyan-400">Click any road section to inspect safety details</span>
      </div>
    </div>
  );
};
