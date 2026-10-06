import React from 'react';
import { X, Clock, ShieldAlert, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { Investigation } from '../types/investigation';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  investigations: Investigation[];
  onSelectInvestigation: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  investigations,
  onSelectInvestigation
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#090b12] border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Investigation History
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {investigations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No past investigations recorded in SQLite database yet.
              </div>
            ) : (
              investigations.map(inv => {
                const isPhishing = inv.verdict === 'LIKELY_PHISHING' || (inv.risk_score && inv.risk_score >= 80);
                const isSuspicious = inv.verdict === 'SUSPICIOUS';

                return (
                  <div
                    key={inv.id}
                    onClick={() => {
                      onSelectInvestigation(inv.id);
                      onClose();
                    }}
                    className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {isPhishing ? (
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                        ) : isSuspicious ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        )}
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {inv.id}
                        </span>
                      </div>

                      {inv.risk_score !== undefined && (
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                            inv.risk_score >= 70
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {inv.risk_score}%
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {inv.input}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                      <span>{inv.verdict || inv.status}</span>
                      <span className="flex items-center group-hover:text-cyan-400 transition-colors">
                        View Report <ArrowRight className="w-3 h-3 ml-1" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
