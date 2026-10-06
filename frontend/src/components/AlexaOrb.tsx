import React from 'react';
import { Mic, Search, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AlexaOrbProps {
  isListening: boolean;
  isInvestigating: boolean;
  verdict?: string;
  onClick: () => void;
  hasSpeechSupport: boolean;
}

export const AlexaOrb: React.FC<AlexaOrbProps> = ({
  isListening,
  isInvestigating,
  verdict,
  onClick,
  hasSpeechSupport
}) => {
  // Determine color scheme based on state
  let primaryColor = 'from-cyan-500 to-indigo-600';
  let glowColor = 'shadow-[0_0_50px_rgba(0,210,255,0.35)]';
  let ringBorder = 'border-cyan-500/40';

  if (isListening) {
    primaryColor = 'from-cyan-400 via-sky-300 to-blue-500';
    glowColor = 'shadow-[0_0_80px_rgba(0,210,255,0.7)]';
    ringBorder = 'border-cyan-300';
  } else if (isInvestigating) {
    primaryColor = 'from-indigo-500 via-purple-500 to-cyan-500';
    glowColor = 'shadow-[0_0_70px_rgba(121,40,202,0.5)]';
    ringBorder = 'border-indigo-400';
  } else if (verdict === 'LIKELY_PHISHING' || verdict === 'SUSPICIOUS') {
    primaryColor = 'from-rose-500 via-amber-600 to-rose-600';
    glowColor = 'shadow-[0_0_60px_rgba(244,63,94,0.45)]';
    ringBorder = 'border-rose-500/60';
  } else if (verdict === 'SUPPORTED' || verdict === 'LIKELY_TRUE') {
    primaryColor = 'from-emerald-500 to-teal-600';
    glowColor = 'shadow-[0_0_60px_rgba(16,185,129,0.45)]';
    ringBorder = 'border-emerald-500/60';
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 select-none">
      <div className="relative group cursor-pointer" onClick={onClick}>
        {/* Outer ambient glow */}
        <div
          className={`absolute -inset-6 rounded-full bg-gradient-to-tr ${primaryColor} opacity-20 blur-2xl transition-all duration-700 ${
            isListening || isInvestigating ? 'opacity-50 scale-110' : 'group-hover:opacity-30'
          }`}
        />

        {/* Rotating outer forensic ring (active when investigating) */}
        <div
          className={`absolute -inset-3 rounded-full border border-dashed ${ringBorder} transition-all duration-1000 ${
            isInvestigating
              ? 'animate-spin border-cyan-400/80 duration-3000'
              : isListening
              ? 'animate-ping duration-1500 opacity-60'
              : 'opacity-30 group-hover:opacity-60'
          }`}
        />

        {/* Concentric subtle radar pulse */}
        <div
          className={`absolute -inset-1 rounded-full border border-slate-700/60 ${
            isInvestigating ? 'animate-pulse' : ''
          }`}
        />

        {/* Main interactive spherical orb */}
        <div
          className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#0a0d14] border-2 ${ringBorder} ${glowColor} flex items-center justify-center relative overflow-hidden transition-all duration-500 transform group-hover:scale-105 active:scale-95`}
        >
          {/* Inner holographic gradient core */}
          <div
            className={`absolute inset-2 rounded-full bg-gradient-to-tr ${primaryColor} opacity-25 blur-sm transition-all duration-500 ${
              isListening ? 'opacity-70 scale-105' : isInvestigating ? 'opacity-50 scale-100' : ''
            }`}
          />

          {/* Core icon indicator */}
          <div className="relative z-10 flex flex-col items-center justify-center text-slate-100">
            {isInvestigating ? (
              <Search className="w-9 h-9 sm:w-10 sm:h-10 text-cyan-300 animate-pulse" />
            ) : isListening ? (
              <Mic className="w-9 h-9 sm:w-10 sm:h-10 text-cyan-200 animate-bounce" />
            ) : verdict === 'LIKELY_PHISHING' || verdict === 'SUSPICIOUS' ? (
              <AlertTriangle className="w-9 h-9 sm:w-10 sm:h-10 text-rose-400" />
            ) : verdict === 'SUPPORTED' || verdict === 'LIKELY_TRUE' ? (
              <ShieldCheck className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-400" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#00d2ff] mb-1.5 animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400/80 font-semibold">
                  ALEXA
                </span>
              </div>
            )}
          </div>

          {/* Sound wave visualizer when listening */}
          {isListening && (
            <div className="absolute bottom-4 flex items-center space-x-1">
              <span className="w-1 h-3 bg-cyan-300 rounded-full animate-pulse" />
              <span className="w-1 h-5 bg-cyan-200 rounded-full animate-bounce" />
              <span className="w-1 h-2 bg-cyan-300 rounded-full animate-pulse" />
              <span className="w-1 h-6 bg-cyan-100 rounded-full animate-bounce delay-100" />
              <span className="w-1 h-3 bg-cyan-300 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* State label below the orb */}
      <div className="mt-3 text-center">
        {isListening ? (
          <p className="text-xs font-medium text-cyan-300 tracking-wide animate-pulse">
            Listening... &quot;Alexa, investigate this...&quot;
          </p>
        ) : isInvestigating ? (
          <p className="text-xs font-medium text-indigo-300 tracking-wide animate-pulse">
            Forensic analysis in progress...
          </p>
        ) : hasSpeechSupport ? (
          <p className="text-[11px] text-slate-400 tracking-wide">
            Click orb or mic to speak &bull; or paste text below
          </p>
        ) : (
          <p className="text-[11px] text-slate-500 tracking-wide">
            Paste message or URL below to begin
          </p>
        )}
      </div>
    </div>
  );
};
