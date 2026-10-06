import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { AlexaOrb } from './components/AlexaOrb';
import { InputSection } from './components/InputSection';
import { InvestigationProgress } from './components/InvestigationProgress';
import { McpActivityPanel } from './components/McpActivityPanel';
import { InvestigationResult } from './components/InvestigationResult';
import { HistoryDrawer } from './components/HistoryDrawer';
import { useSpeech } from './hooks/useSpeech';
import {
  checkSystemHealth,
  startInvestigation,
  getInvestigation,
  getInvestigationActivity,
  getInvestigationHistory
} from './services/api';
import { Investigation, SystemHealth } from './types/investigation';

export const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [health, setHealth] = useState<SystemHealth>({
    backend: false,
    mcpServer: false,
    ollama: { available: false, model: 'qwen2.5:1.5b', model_available: false }
  });
  const [currentInvestigation, setCurrentInvestigation] = useState<Investigation | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [history, setHistory] = useState<Investigation[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Voice speech hook
  const handleFinalVoiceInput = (speechText: string) => {
    if (!speechText) return;
    setInput(speechText);
    triggerInvestigation(speechText);
  };

  const {
    isListening,
    isSpeaking,
    hasSpeechSupport,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  } = useSpeech(handleFinalVoiceInput);

  // Poll health and history on mount
  useEffect(() => {
    const fetchDiagnostics = async () => {
      const h = await checkSystemHealth();
      setHealth(h);
      const hist = await getInvestigationHistory();
      setHistory(hist);
    };

    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 8000);
    return () => clearInterval(interval);
  }, []);

  // Poll investigation state when investigating
  useEffect(() => {
    if (!currentInvestigation || currentInvestigation.status === 'completed' || currentInvestigation.status === 'failed') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const poll = async () => {
      try {
        const inv = await getInvestigation(currentInvestigation.id);
        setCurrentInvestigation(inv);

        const logs = await getInvestigationActivity(currentInvestigation.id);
        setActivityLogs(logs);

        if (inv.status === 'completed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          const hist = await getInvestigationHistory();
          setHistory(hist);

          // Trigger speech readout automatically if user previously interacted or on demand
          if (inv.result?.voice_summary) {
            speak(inv.result.voice_summary);
          }
        } else if (inv.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch (err: any) {
        console.warn('Poll error:', err);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 1200);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentInvestigation?.id, currentInvestigation?.status, speak]);

  const triggerInvestigation = async (textToInvestigate?: string) => {
    const text = (textToInvestigate || input).trim();
    if (!text) return;

    setError(null);
    stopSpeaking();

    try {
      const resp = await startInvestigation(text);
      const initialInv: Investigation = {
        id: resp.investigation_id,
        input: text,
        type: 'pending_detection',
        status: 'started',
        progress: 5,
        stage: 'Initializing MCP investigation',
        created_at: new Date().toISOString()
      };
      setCurrentInvestigation(initialInv);
      setActivityLogs([]);
    } catch (err: any) {
      setError(err.message || 'Failed to start investigation');
    }
  };

  const handleOrbClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSelectHistorical = async (id: string) => {
    try {
      const inv = await getInvestigation(id);
      setCurrentInvestigation(inv);
      const logs = await getInvestigationActivity(id);
      setActivityLogs(logs);
      setInput(inv.input);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isInvestigating =
    currentInvestigation?.status === 'started' ||
    currentInvestigation?.status === 'investigating';

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Header */}
      <Navbar
        health={health}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>ALEXA FORENSIC REASONING ENGINE &bull; MODEL CONTEXT PROTOCOL</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Digital Detective
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            &quot;Don&apos;t just ask. <span className="text-cyan-400 font-semibold">Investigate.</span>&quot;
          </p>
        </div>

        {/* Centerpiece Interactive Orb */}
        <AlexaOrb
          isListening={isListening}
          isInvestigating={isInvestigating}
          verdict={currentInvestigation?.result?.verdict}
          onClick={handleOrbClick}
          hasSpeechSupport={hasSpeechSupport}
        />

        {/* Error Notification */}
        {error && (
          <div className="max-w-2xl mx-auto p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        {/* Input Form & Pre-seeded Scenarios */}
        <InputSection
          input={input}
          setInput={setInput}
          onInvestigate={triggerInvestigation}
          isInvestigating={isInvestigating}
          isListening={isListening}
          onToggleVoice={handleOrbClick}
          hasSpeechSupport={hasSpeechSupport}
        />

        {/* Live Stepper when Investigating */}
        {currentInvestigation && isInvestigating && (
          <InvestigationProgress
            investigation={currentInvestigation}
            activityLogs={activityLogs}
          />
        )}

        {/* Completed Investigation Result */}
        {currentInvestigation?.result && currentInvestigation.status === 'completed' && (
          <InvestigationResult
            result={currentInvestigation.result}
            isSpeaking={isSpeaking}
            onSpeak={speak}
            onStopSpeaking={stopSpeaking}
          />
        )}

        {/* Real MCP Tool Activity Panel (Judge Showcase) */}
        {activityLogs.length > 0 && (
          <McpActivityPanel toolCalls={activityLogs} />
        )}
      </main>

      {/* History Slide-Over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        investigations={history}
        onSelectInvestigation={handleSelectHistorical}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#05060a] py-6 px-4 text-center text-xs text-slate-500">
        <p>
          Alexa + MCP — Digital Detective &bull; Hackathon Project &bull; Powered by MCP Streamable HTTP &amp; Ollama
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Independent forensic AI implementation. Not affiliated with or endorsed by Amazon.
        </p>
      </footer>
    </div>
  );
};

export default App;
