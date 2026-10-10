import { ISTTEngine, STTResult } from "../stt/types.js";
import { ITTSBackend, TTSResult, TTSVoiceOptions } from "../tts/types.js";
import { AudioRecorder } from "../stt/recorder.js";
import { AudioPlayer } from "../audio/player.js";
import { TTSEngine } from "../tts/ttsEngine.js";
import { STTPipeline } from "../stt/sttPipeline.js";
import { VoiceDialogueManager, InvestigationHandler } from "./dialogueManager.js";
import { AudioCache } from "../audio/cache.js";

export class MockMicrophone extends AudioRecorder {
  private queuedInputs: string[] = [];

  constructor() {
    super(true);
  }

  public queueInput(phrase: string): void {
    this.queuedInputs.push(phrase);
  }

  public getNextQueuedInput(): string | undefined {
    return this.queuedInputs.shift();
  }
}

export class MockWhisperEngine implements ISTTEngine {
  private mic: MockMicrophone;

  constructor(mic: MockMicrophone) {
    this.mic = mic;
  }

  public isAvailable(): boolean {
    return true;
  }

  public async transcribe(_audioFilePath: string): Promise<STTResult> {
    const next = this.mic.getNextQueuedInput();
    return {
      text: next ?? "",
      durationMs: 5,
    };
  }
}

export class MockSpeakerBackend implements ITTSBackend {
  public readonly name = "mock" as const;
  public spokenHistory: string[] = [];

  public isAvailable(): boolean {
    return true;
  }

  public async synthesizeToFile(): Promise<boolean> {
    return true;
  }

  public async speak(text: string, _opts?: TTSVoiceOptions): Promise<TTSResult> {
    this.spokenHistory.push(text);
    return {
      success: true,
      backendUsed: "mock",
      durationMs: 5,
    };
  }

  public getLastSpoken(): string | undefined {
    return this.spokenHistory[this.spokenHistory.length - 1];
  }

  public clearHistory(): void {
    this.spokenHistory = [];
  }
}

export function createMockVoiceDialogueManager(opts: {
  investigationHandler?: InvestigationHandler;
}): {
  manager: VoiceDialogueManager;
  mic: MockMicrophone;
  speaker: MockSpeakerBackend;
} {
  const mic = new MockMicrophone();
  const whisper = new MockWhisperEngine(mic);
  const stt = new STTPipeline(mic, whisper);

  const speaker = new MockSpeakerBackend();
  const player = new AudioPlayer("mock");
  const cache = new AudioCache();
  const tts = new TTSEngine([speaker], cache, player);

  const manager = new VoiceDialogueManager({
    stt,
    tts,
    player,
    enableEarcons: false,
    investigationHandler: opts.investigationHandler,
  });

  return { manager, mic, speaker };
}
