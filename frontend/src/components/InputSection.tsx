import React from 'react';
import { Search, Mic, MicOff, Sparkles } from 'lucide-react';

interface InputSectionProps {
  input: string;
  setInput: (value: string) => void;
  onInvestigate: (text?: string) => void;
  isInvestigating: boolean;
  isListening: boolean;
  onToggleVoice: () => void;
  hasSpeechSupport: boolean;
}

const DEMO_SCENARIOS = [
  {
    id: 'sbi-phishing',
    label: '🚨 Bank Account Phishing',
    preview: 'SBI Account Blocked Alert',
    content: `Your SBI account will be blocked today.
Verify immediately using this link:
https://onlinesbi-kyc-update.xyz/login`
  },
  {
    id: 'job-scam',
    label: '💼 Job Interview Upfront Fee',
    preview: 'Amazon Recruitment ₹999 Fee',
    content: `Amazon is offering a software engineer job with salary ₹18 LPA.
Pay ₹999 to register for the mandatory technical interview round.`
  },
  {
    id: 'coffee-lifespan',
    label: '☕ Viral Health Claim',
    preview: 'Coffee Lifespan +40%',
    content: `Scientists have discovered that drinking coffee increases lifespan by exactly 40%.`
  },
  {
    id: 'legit-product',
    label: '💻 Tech Hardware Launch',
    preview: 'Apple M4 Chip 3nm Architecture',
    content: `Apple officially announced the M4 chip built on 3nm architecture with hardware-accelerated ray tracing and 38 TOPS neural engine.`
  }
];

export const InputSection: React.FC<InputSectionProps> = ({
  input,
  setInput,
  onInvestigate,
  isInvestigating,
  isListening,
  onToggleVoice,
  hasSpeechSupport
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isInvestigating) return;
    onInvestigate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (input.trim() && !isInvestigating) {
        onInvestigate(input.trim());
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Quick Demo Scenarios */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1.5 font-medium text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Try Pre-Seeded Hackathon Scenarios:</span>
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">Click to populate</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DEMO_SCENARIOS.map(sc => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                setInput(sc.content);
              }}
              className="text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 group relative"
            >
              <div className="text-[11px] font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                {sc.label}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                {sc.preview}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Investigation Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0b0e17] border border-slate-800/90 focus-within:border-cyan-500/60 focus-within:shadow-[0_0_30px_rgba(0,210,255,0.15)] transition-all overflow-hidden">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="Paste a suspicious message, URL, email, job offer, or viral claim to investigate..."
            className="w-full bg-transparent px-4 py-3.5 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            disabled={isInvestigating}
          />

          {/* Action Toolbar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/60 border-t border-slate-900">
            <div className="flex items-center space-x-2">
              {hasSpeechSupport && (
                <button
                  type="button"
                  onClick={onToggleVoice}
                  disabled={isInvestigating}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isListening
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                  title="Voice dictation"
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>Stop Listening</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Voice</span>
                    </>
                  )}
                </button>
              )}
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">Ctrl + Enter</kbd> to run
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {input.length > 0 && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || isInvestigating}
                className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 ${
                  !input.trim() || isInvestigating
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/25 active:scale-95'
                }`}
              >
                <Search className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>INVESTIGATE</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
