import React from 'react';
import { Sparkles, MessageSquareQuote, Bot } from 'lucide-react';

interface AskAIFloatingButtonProps {
  onClick: () => void;
  unreadCount?: number;
  hasCriticalAlert?: boolean;
}

export const AskAIFloatingButton: React.FC<AskAIFloatingButtonProps> = ({
  onClick,
  unreadCount,
  hasCriticalAlert,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {/* Tooltip hint that fades in */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 border border-cyan-500/40 text-xs font-mono text-cyan-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-300">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>Road safety question? <b>Ask AI</b></span>
      </div>

      {/* Main Floating Button */}
      <button
        onClick={onClick}
        id="ask-ai-floating-btn"
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 text-white font-medium text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.65)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-cyan-300/40"
      >
        {/* Glow halo */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 opacity-60 blur-sm group-hover:opacity-100 transition duration-300 -z-10" />

        {/* AI Icon Logo */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 border border-white/30 backdrop-blur-xs">
          <Sparkles className="w-4 h-4 text-cyan-100 group-hover:rotate-12 transition-transform duration-300" />
        </div>

        {/* Label */}
        <div className="flex flex-col text-left">
          <span className="text-xs uppercase tracking-wider font-extrabold leading-none text-cyan-100">
            Ask AI
          </span>
          <span className="text-[10px] text-cyan-100/90 leading-none mt-0.5 font-sans">
            Highway Advisor
          </span>
        </div>

        {/* Alert dot if unstable segments exist */}
        {hasCriticalAlert && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-slate-900" />
          </span>
        )}
      </button>
    </div>
  );
};
