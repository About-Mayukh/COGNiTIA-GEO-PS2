import React from 'react';
import { 
  RefreshCw, 
  Radio, 
  Layers, 
  Zap,
  Info,
  SlidersHorizontal,
  AlertOctagon,
  User,
  Phone,
  ShieldCheck,
  Send,
  Database
} from 'lucide-react';
import { UserAuthProfile } from '../types';

interface TacticalHeaderProps {
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  refreshIntervalSec: number;
  setRefreshIntervalSec: (sec: number) => void;
  countdown: number;
  onManualRefresh: () => void;
  onOpenTerminal: () => void;
  onOpenIncidents: () => void;
  onOpenLimitations: () => void;
  onOpenSosModal?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenUserAuth?: () => void;
  onOpenSupabaseModal?: () => void;
  supabaseConnected?: boolean;
  currentUser?: UserAuthProfile | null;
  pendingSosCount?: number;
  isLiveApi: boolean;
  rain1h: number;
  rain24h: number;
  isEngineeringMode?: boolean;
  onToggleEngineeringMode?: () => void;
}

export const TacticalHeader: React.FC<TacticalHeaderProps> = ({
  autoRefresh,
  setAutoRefresh,
  refreshIntervalSec,
  setRefreshIntervalSec,
  countdown,
  onManualRefresh,
  onOpenTerminal,
  onOpenIncidents,
  onOpenLimitations,
  onOpenSosModal,
  onOpenAdminPanel,
  onOpenUserAuth,
  onOpenSupabaseModal,
  supabaseConnected = false,
  currentUser,
  pendingSosCount = 0,
  isLiveApi,
  rain1h,
  rain24h,
  isEngineeringMode = false,
  onToggleEngineeringMode,
}) => {
  return (
    <header className="bg-slate-900/65 border-b border-white/10 backdrop-blur-2xl sticky top-0 z-40 px-4 sm:px-6 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all duration-300">
      <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left: Branding & Corridor Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-950/80 to-slate-900/90 border border-rose-500/30 text-rose-400 shadow-[0_4px_16px_rgba(244,63,94,0.2)]">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold tracking-wider text-base sm:text-lg text-slate-100 flex items-center gap-2">
                Himalayan Highway Safety Shield
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/25 font-medium backdrop-blur-md">
                Live Landslide Warning
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span className="text-cyan-400 font-semibold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isLiveApi ? 'OpenWeatherMap Live Telemetry' : 'Hydro-Met Telemetry'}
              </span>
            </div>

          </div>
        </div>

        {/* Right: User-Friendly Controls & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Account / Sign Out */}
          {onOpenUserAuth && (
            <button
              id="header-account-btn"
              type="button"
              onClick={onOpenUserAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-xs font-medium border border-white/10 transition-all duration-200 cursor-pointer"
              title={currentUser ? 'Open profile and sign out' : 'Open login'}
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentUser ? (currentUser.name || 'Account') : 'Sign In'}</span>
            </button>
          )}

          {/* Emergency SOS Button (Pulsing Red) */}
          {onOpenSosModal && (
            <button
              id="header-sos-emergency-btn"
              type="button"
              onClick={onOpenSosModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(239,68,68,0.6)] border border-red-400 animate-pulse transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
              title="Report Disaster / Emergency Distress SOS with Live Camera"
            >
              <AlertOctagon className="w-4 h-4 text-white shrink-0" />
              <span className="tracking-wider">SOS</span>
            </button>
          )}

          {/* Current Rainfall Strip */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Rainfall:</span>
            <span className="text-cyan-300 font-bold font-mono">{rain1h.toFixed(1)} mm/h</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">24h:</span>
            <span className="text-cyan-300 font-bold font-mono">{rain24h.toFixed(1)} mm</span>
          </div>

          {/* Engineering Mode Toggle */}
          {onToggleEngineeringMode && (
            <button
              id="header-engineering-mode-toggle-btn"
              type="button"
              onClick={onToggleEngineeringMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer ${
                isEngineeringMode
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-800/60 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Toggle between simple traveler mode and advanced civil engineering formulas"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isEngineeringMode ? 'Eng View: ON' : 'Simple View'}</span>
            </button>
          )}

          {/* Incident Reporter */}
          <button
            id="header-incident-reports-btn"
            type="button"
            onClick={onOpenIncidents}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-xs font-medium border border-white/10 transition-all duration-200 cursor-pointer"
            title="Report or view verified road landslides"
          >
            <span>Field Reports</span>
          </button>

          {/* Limitations Disclosure */}
          <button
            id="header-limitations-btn"
            type="button"
            onClick={onOpenLimitations}
            className="flex items-center gap-1 p-1.5 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200 cursor-pointer"
            title="System Disclosures & Limitations"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Auto-Refresh Timer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-mono backdrop-blur-md">
            <button
              id="header-refresh-now-btn"
              type="button"
              onClick={onManualRefresh}
              className="text-slate-400 hover:text-cyan-300 transition-transform active:rotate-180 cursor-pointer"
              title="Refresh road safety data now"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <span className="text-cyan-400 font-bold">{countdown}s</span>
          </div>
        </div>
      </div>
    </header>
  );
};
