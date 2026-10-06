import React, { useState } from 'react';
import { Network, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { ToolCallLog } from '../types/investigation';

interface McpActivityPanelProps {
  toolCalls: ToolCallLog[];
}

export const McpActivityPanel: React.FC<McpActivityPanelProps> = ({ toolCalls }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const totalDuration = toolCalls.reduce((acc, c) => acc + (c.duration || 0), 0);

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0b0e17] border border-indigo-500/30 p-5 sm:p-6 shadow-xl shadow-indigo-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
            <Network className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                MCP Activity Stream
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                Streamable HTTP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified Model Context Protocol tool execution pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
          <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
            {toolCalls.length} Tools Executed
          </span>
          <span className="flex items-center text-indigo-300">
            <Clock className="w-3 h-3 mr-1" />
            {totalDuration} ms
          </span>
        </div>
      </div>

      {/* Tool Call Log Items */}
      <div className="mt-4 space-y-2">
        {toolCalls.map(call => {
          const isExpanded = expandedId === call.id;

          return (
            <div
              key={call.id}
              className="rounded-xl border border-slate-800/80 bg-slate-950/60 hover:border-indigo-500/30 transition-all overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleExpand(call.id)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {call.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}

                  <span className="font-mono font-semibold text-cyan-300 truncate">
                    {call.tool_name}
                  </span>

                  <span className="text-slate-400 truncate hidden md:inline text-[11px]">
                    — {call.result_summary}
                  </span>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0 ml-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {call.duration}ms
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3.5 py-3 border-t border-slate-800/80 bg-slate-950/90 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                      Result Summary:
                    </span>
                    <p className="text-slate-300 font-mono text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-800 break-words">
                      {call.result_summary}
                    </p>
                  </div>

                  {call.input_summary && (
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                        Input Arguments:
                      </span>
                      <p className="text-slate-400 font-mono text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-800 break-words">
                        {call.input_summary}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                    <span>Call ID: {call.id}</span>
                    <span>Logged at: {new Date(call.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
