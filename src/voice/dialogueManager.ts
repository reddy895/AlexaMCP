import { STTPipeline, defaultSTTPipeline } from "../stt/sttPipeline.js";
import { TTSEngine, defaultTTSEngine } from "../tts/ttsEngine.js";
import { EarconManager, defaultEarcons } from "../audio/earcons.js";
import { AudioPlayer, defaultAudioPlayer } from "../audio/player.js";
import { VoiceSession } from "./session.js";
import { classifyVoiceIntent } from "../dialogue/intentClassifier.js";
import { handleVoiceCommand } from "../dialogue/voiceCommands.js";
import { handleSmalltalk } from "../dialogue/smalltalk.js";
import { formatSpokenBriefing, InvestigationReportData } from "../dialogue/spokenBriefing.js";
import { resolveVoiceForBackend } from "../tts/voices.js";

export type DialogueState =
  | "IDLE"
  | "LISTENING"
  | "PROCESSING"
  | "INVESTIGATING"
  | "SPEAKING"
  | "ERROR";

export type InvestigationHandler = (userInput: string) => Promise<InvestigationReportData | null>;

export interface DialogueManagerOptions {
  stt?: STTPipeline;
  tts?: TTSEngine;
  earcons?: EarconManager;
  player?: AudioPlayer;
  session?: VoiceSession;
  investigationHandler?: InvestigationHandler;
  enableEarcons?: boolean;
}

export class VoiceDialogueManager {
  private stt: STTPipeline;
  private tts: TTSEngine;
  private earcons: EarconManager;
  private player: AudioPlayer;
  public session: VoiceSession;
  private investigationHandler?: InvestigationHandler;
  private enableEarcons: boolean;
  private state: DialogueState = "IDLE";
  private isRunning = false;

  public onStateChange?: (state: DialogueState) => void;
  public onTranscript?: (text: string, speaker: "user" | "agent") => void;

  constructor(opts: DialogueManagerOptions = {}) {
    this.stt = opts.stt ?? defaultSTTPipeline;
    this.tts = opts.tts ?? defaultTTSEngine;
    this.earcons = opts.earcons ?? defaultEarcons;
    this.player = opts.player ?? defaultAudioPlayer;
    this.session = opts.session ?? new VoiceSession();
    this.investigationHandler = opts.investigationHandler;
    this.enableEarcons = opts.enableEarcons ?? true;
  }

  public getState(): DialogueState {
    return this.state;
  }

  private setState(newState: DialogueState): void {
    this.state = newState;
    this.onStateChange?.(newState);
  }

  public setInvestigationHandler(handler: InvestigationHandler): void {
    this.investigationHandler = handler;
  }

  private async playEarcon(type: any): Promise<void> {
    if (!this.enableEarcons) return;
    try {
      const earconPath = this.earcons.getWavPath(type);
      await this.player.playFile(earconPath);
    } catch {
      // ignore
    }
  }

  /**
   * Executes a single complete voice turn:
   * 1. Plays listening earcon
   * 2. Captures audio and transcribes
   * 3. Plays stop earcon
   * 4. Interprets intent and generates response
   * 5. Speaks response aloud
   */
  public async executeVoiceTurn(forcedInput?: string): Promise<{
    userText: string;
    agentSpeech: string;
    intent: string;
    shouldExit: boolean;
  }> {
    let userText = "";

    if (forcedInput !== undefined) {
      userText = forcedInput.trim();
    } else {
      this.setState("LISTENING");
      await this.playEarcon("listen_start");

      const listenRes = await this.stt.listen();
      await this.playEarcon("listen_stop");

      if (listenRes.isSilent || !listenRes.text) {
        this.setState("IDLE");
        return {
          userText: "",
          agentSpeech: "",
          intent: "SILENCE",
          shouldExit: false,
        };
      }
      userText = listenRes.text;
    }

    this.onTranscript?.(userText, "user");
    this.setState("PROCESSING");

    const hasPrevReport = this.session.getLastReport() !== null;
    const classification = classifyVoiceIntent(userText, hasPrevReport);

    this.session.addTurn("user", userText, { intent: classification.intent });

    // Handle EXIT
    if (classification.intent === "EXIT") {
      const farewell = "Goodbye. Stay safe from scams.";
      await this.speakResponse(farewell);
      this.setState("IDLE");
      return { userText, agentSpeech: farewell, intent: "EXIT", shouldExit: true };
    }

    // Handle REPEAT
    if (classification.intent === "REPEAT") {
      const lastText = this.session.getLastSpokenText() || "I haven't said anything yet.";
      await this.speakResponse(lastText);
      this.setState("IDLE");
      return { userText, agentSpeech: lastText, intent: "REPEAT", shouldExit: false };
    }

    // Handle CONTROL commands
    if (classification.intent === "CONTROL") {
      const cmdResult = handleVoiceCommand(classification);
      if (cmdResult.handled) {
        if (cmdResult.action === "mute") this.session.isMuted = true;
        if (cmdResult.action === "unmute") this.session.isMuted = false;
        if (cmdResult.action === "change_voice" && cmdResult.payload?.personaId) {
          this.session.switchPersona(cmdResult.payload.personaId);
        }
        await this.speakResponse(cmdResult.speechResponse);
        this.setState("IDLE");
        return { userText, agentSpeech: cmdResult.speechResponse, intent: "CONTROL", shouldExit: false };
      }
    }

    // Handle SMALLTALK
    if (classification.intent === "SMALLTALK") {
      const talkRes = handleSmalltalk(userText);
      if (talkRes.handled) {
        await this.speakResponse(talkRes.speechResponse);
        this.setState("IDLE");
        return { userText, agentSpeech: talkRes.speechResponse, intent: "SMALLTALK", shouldExit: false };
      }
    }

    // Handle EXPLAIN follow-up
    if (classification.intent === "EXPLAIN" && hasPrevReport) {
      const prevReport = this.session.getLastReport();
      const explanation = formatSpokenBriefing(prevReport, { style: "detailed" });
      await this.speakResponse(explanation);
      this.setState("IDLE");
      return { userText, agentSpeech: explanation, intent: "EXPLAIN", shouldExit: false };
    }

    // Handle INVESTIGATION
    this.setState("INVESTIGATING");
    await this.playEarcon("investigating");

    let agentSpeech = "";
    if (this.investigationHandler) {
      const report = await this.investigationHandler(userText);
      if (report) {
        this.session.setLastReport(report);
        if (report.verdict === "HIGH RISK") {
          await this.playEarcon("verdict_alert");
        } else if (report.verdict === "LIKELY SAFE") {
          await this.playEarcon("verdict_safe");
        }
        agentSpeech = formatSpokenBriefing(report, { style: "concise" });
      } else {
        agentSpeech = "Investigation finished, but no structured report was produced.";
      }
    } else {
      agentSpeech = `I received your message: "${userText}". Running investigation pipeline now.`;
    }

    await this.speakResponse(agentSpeech);
    this.session.addTurn("agent", agentSpeech);
    this.setState("IDLE");

    return {
      userText,
      agentSpeech,
      intent: "INVESTIGATE",
      shouldExit: false,
    };
  }

  private async speakResponse(text: string): Promise<void> {
    if (this.session.isMuted) return;
    this.setState("SPEAKING");
    this.onTranscript?.(text, "agent");

    const activeVoice = resolveVoiceForBackend(this.session.activePersona, this.tts.getActiveBackendName() as any);
    await this.tts.speak(text, { voice: activeVoice });
  }
}
