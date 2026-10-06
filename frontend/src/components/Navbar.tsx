import React from 'react';
import { ShieldCheck, Cpu, Network, History, CheckCircle2, AlertCircle } from 'lucide-react';
import { SystemHealth } from '../types/investigation';

interface NavbarProps {
  health: SystemHealth;
  onOpenHistory: () => void;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ health, onOpenHistory, historyCount }) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#07090e]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-cyan-400/30 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-cyan-400 via-indigo-300 to-cyan-200 bg-clip-text text-transparent">
                ALEXA + MCP
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                Digital Detective
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide font-medium">
              &quot;Don&apos;t just ask. <span className="text-cyan-300 font-semibold">Investigate.</span>&quot;
            </p>
          </div>
        </div>

        {/* Live System Diagnostics & Controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* MCP Server Badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">MCP Server:</span>
            {health.mcpServer ? (
              <span className="flex items-center text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Streamable HTTP
              </span>
            ) : (
              <span className="flex items-center text-amber-400 font-medium">
                <AlertCircle className="w-3 h-3 mr-1" /> Initializing
              </span>
            )}
          </div>

          {/* Ollama Engine Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Ollama:</span>
            {health.ollama.available ? (
              <span className="text-cyan-300 font-mono font-medium">
                {health.ollama.model}
              </span>
            ) : (
              <span className="text-amber-400 font-medium">Fallback Mode</span>
            )}
          </div>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-800 transition-colors text-xs font-medium"
            title="Past Investigations"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800/80 rounded-full text-[10px]">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
