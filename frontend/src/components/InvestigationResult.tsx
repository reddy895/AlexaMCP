import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  FileText,
  Lightbulb
} from 'lucide-react';
import { InvestigationResultData, VerdictType } from '../types/investigation';

interface ResultProps {
  result: InvestigationResultData;
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onStopSpeaking: () => void;
}

export const InvestigationResult: React.FC<ResultProps> = ({
  result,
  isSpeaking,
  onSpeak,
  onStopSpeaking
}) => {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [contradictionsOpen, setContradictionsOpen] = useState(true);

  // Verdict visual badges
  const getVerdictBadge = (verdict: VerdictType) => {
    switch (verdict) {
      case 'LIKELY_PHISHING':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
          label: 'LIKELY PHISHING',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-rose-950/50',
          riskClass: 'text-rose-400'
        };
      case 'SUSPICIOUS':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          label: 'SUSPICIOUS',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-amber-950/50',
          riskClass: 'text-amber-400'
        };
      case 'LIKELY_FALSE':
      case 'MISLEADING':
        return {
          icon: <XCircle className="w-5 h-5 text-orange-400" />,
          label: verdict.replace('_', ' '),
          badgeClass: 'bg-orange-950/80 text-orange-300 border-orange-500/50 shadow-orange-950/50',
          riskClass: 'text-orange-400'
        };
      case 'SUPPORTED':
      case 'LIKELY_TRUE':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          label: verdict.replace('_', ' '),
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50',
          riskClass: 'text-emerald-400'
        };
      default:
        return {
          icon: <HelpCircle className="w-5 h-5 text-sky-400" />,
          label: 'UNCERTAIN',
          badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-500/50 shadow-sky-950/50',
          riskClass: 'text-sky-400'
        };
    }
  };

  const badge = getVerdictBadge(result.verdict);

  const handleVoiceToggle = () => {
    if (isSpeaking) {
      onStopSpeaking();
    } else {
      const speechText = result.voice_summary || result.summary;
      onSpeak(speechText);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl bg-gradient-to-b from-[#0c0f18] via-[#090b12] to-[#06070a] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl shadow-cyan-950/40 space-y-6 animate-fade-in">
      {/* Header Result Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-semibold block mb-1">
            FORENSIC INVESTIGATION REPORT
          </span>
          <div className="flex items-center space-x-3 mt-1">
            <span
              className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold tracking-wider uppercase border shadow-md ${badge.badgeClass}`}
            >
              {badge.icon}
              <span>{badge.label}</span>
            </span>

            <span className="text-xs uppercase font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Confidence: <strong className="text-white">{result.confidence.toUpperCase()}</strong>
            </span>
          </div>
        </div>

        {/* Risk Score Circle Gauge */}
        <div className="flex items-center space-x-4 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800/80 self-start sm:self-auto">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              Risk Score
            </div>
            <div className="text-2xl font-mono font-black tracking-tight text-white">
              <span className={badge.riskClass}>{result.risk_score}</span>
              <span className="text-sm font-normal text-slate-500"> / 100</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center relative">
            <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={badge.riskClass}
                strokeDasharray={`${result.risk_score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-mono font-bold text-slate-200">
              {result.risk_score}%
            </span>
          </div>
        </div>
      </div>

      {/* Alexa Voice Readout Bar */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
        <div className="flex items-center space-x-3 min-w-0 pr-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
          <p className="text-xs text-cyan-200 italic truncate">
            &quot;{result.voice_summary || result.summary}&quot;
          </p>
        </div>
        <button
          onClick={handleVoiceToggle}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex-shrink-0 ${
            isSpeaking
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
              : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40'
          }`}
          title="Play voice readout"
        >
          {isSpeaking ? (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Voice</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>Alexa Voice</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Narrative */}
      <div>
        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold mb-2">
          Investigation Summary
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
          {result.summary}
        </p>
      </div>

      {/* WHY? Key Evidence Indicators Breakdown */}
      <div>
        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold mb-2.5">
          WHY? Evidence &amp; Behavioral Indicators
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {result.evidence.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200"
            >
              <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contradictions & Irregularities (if any) */}
      {result.contradictions && result.contradictions.length > 0 && (
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setContradictionsOpen(prev => !prev)}
            className="w-full p-3.5 flex items-center justify-between text-left text-xs font-semibold text-rose-300 hover:bg-rose-950/30 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Direct Contradictions with Independent Evidence ({result.contradictions.length})</span>
            </div>
            {contradictionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {contradictionsOpen && (
            <div className="px-4 pb-3.5 space-y-2 text-xs border-t border-rose-900/30 pt-2">
              {result.contradictions.map((c, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-slate-300">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actionable Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-amber-300 uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Recommended Actions</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
            {result.recommendations.map((rec, idx) => (
              <li key={idx} className="leading-relaxed">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable Sources & Independent Verification */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
        <button
          type="button"
          onClick={() => setSourcesOpen(prev => !prev)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>View Verified Independent Sources &amp; Advisories ({result.sources?.length || 0})</span>
          </div>
          {sourcesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {sourcesOpen && (
          <div className="px-4 pb-4 space-y-3 text-xs border-t border-slate-800 pt-3">
            {result.sources && result.sources.length > 0 ? (
              result.sources.map((src, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{src.title}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {src.source_type}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{src.summary}</p>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center space-x-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline pt-1"
                  >
                    <span>{src.url}</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic text-center py-2">
                No external sources corroborated for this item (insufficient_evidence).
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
