import React from 'react';
import { CheckCircle2, Loader2, Circle, ShieldAlert } from 'lucide-react';
import { Investigation } from '../types/investigation';

interface ProgressProps {
  investigation: Investigation;
  activityLogs: any[];
}

interface StepDef {
  tool: string;
  label: string;
  minProgress: number;
}

const STEPS: StepDef[] = [
  { tool: 'extract_claims', label: 'Extracting claims', minProgress: 15 },
  { tool: 'inspect_url', label: 'Inspecting URL & security', minProgress: 30 },
  { tool: 'analyze_message', label: 'Analyzing message indicators', minProgress: 45 },
  { tool: 'search_evidence', label: 'Searching independent evidence', minProgress: 60 },
  { tool: 'cross_reference', label: 'Cross-referencing evidence', minProgress: 75 },
  { tool: 'calculate_risk', label: 'Calculating transparent risk', minProgress: 85 },
  { tool: 'generate_investigation_report', label: 'Synthesizing verdict & report', minProgress: 95 }
];

export const InvestigationProgress: React.FC<ProgressProps> = ({ investigation, activityLogs }) => {
  const executedTools = new Set(activityLogs.map(l => l.tool_name));
  const isComplete = investigation.status === 'completed';
  const isFailed = investigation.status === 'failed';

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0b0e17] border border-cyan-500/30 p-5 sm:p-6 shadow-xl shadow-cyan-950/20 animate-fade-in">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            ) : isFailed ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase flex items-center space-x-2">
              <span>{isComplete ? 'INVESTIGATION COMPLETE' : isFailed ? 'INVESTIGATION FAILED' : 'INVESTIGATING'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 font-mono text-cyan-300 font-normal">
                {investigation.id}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Current stage: <span className="text-cyan-300 font-medium">{investigation.stage || 'Executing MCP pipeline'}</span>
            </p>
          </div>
        </div>

        {/* Progress percent badge */}
        <div className="text-right">
          <span className="text-lg font-mono font-bold text-cyan-400">
            {investigation.progress}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/80 rounded-full h-1.5 my-5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_#00d2ff]"
          style={{ width: `${Math.max(5, investigation.progress)}%` }}
        />
      </div>

      {/* Real-time Tool Stepper */}
      <div className="space-y-2.5">
        {STEPS.map((step) => {
          const hasRun = executedTools.has(step.tool) || (isComplete && investigation.progress >= step.minProgress);
          const isCurrentlyRunning =
            !isComplete &&
            !hasRun &&
            (investigation.progress >= step.minProgress - 15 && investigation.progress < step.minProgress + 10);

          return (
            <div
              key={step.tool}
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs transition-all duration-300 ${
                hasRun
                  ? 'bg-slate-950/60 border border-slate-800/80 text-slate-200'
                  : isCurrentlyRunning
                  ? 'bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 shadow-sm shadow-cyan-500/10'
                  : 'bg-transparent text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3">
                {hasRun ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : isCurrentlyRunning ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                )}
                <span className="font-medium tracking-wide">
                  {step.label}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {step.tool}
                </span>
                {hasRun && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ✓ Done
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
