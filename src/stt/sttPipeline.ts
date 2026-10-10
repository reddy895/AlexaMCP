import fs from "node:fs";
import { ISTTEngine, AudioRecordOptions } from "./types.js";
import { AudioRecorder, defaultAudioRecorder } from "./recorder.js";
import { WhisperEngine, defaultWhisperEngine } from "./whisperEngine.js";
import { calculateAudioEnergy, trimSilence } from "./silence.js";
import { cleanTranscript, stripWakeWords, normalizeSpokenUrls, isNoiseOnly } from "./normalizer.js";

export interface ListenResult {
  text: string;
  rawText: string;
  isSilent: boolean;
  durationMs: number;
  audioPath?: string;
  error?: string;
}

export class STTPipeline {
  private recorder: AudioRecorder;
  private engine: ISTTEngine;

  constructor(
    recorder: AudioRecorder = defaultAudioRecorder,
    engine: ISTTEngine = defaultWhisperEngine
  ) {
    this.recorder = recorder;
    this.engine = engine;
  }

  public isAvailable(): boolean {
    return this.recorder.isAvailable() && this.engine.isAvailable();
  }

  /**
   * Complete pipeline: Records microphone audio, trims silence, transcribes with Whisper,
   * cleans transcript, and normalizes spoken URLs.
   */
  public async listen(opts: Partial<AudioRecordOptions> = {}): Promise<ListenResult> {
    const startTime = Date.now();

    // 1. Record audio from mic
    const recordedPath = await this.recorder.record(undefined, opts);
    if (!recordedPath || !fs.existsSync(recordedPath)) {
      return {
        text: "",
        rawText: "",
        isSilent: true,
        durationMs: Date.now() - startTime,
        error: "Microphone recording failed or was cancelled",
      };
    }

    try {
      const wavBuf = fs.readFileSync(recordedPath);
      const energy = calculateAudioEnergy(wavBuf);

      if (energy.isSilent) {
        return {
          text: "",
          rawText: "",
          isSilent: true,
          durationMs: Date.now() - startTime,
          audioPath: recordedPath,
        };
      }

      // 2. Trim silence
      const trimmedBuf = trimSilence(wavBuf);
      if (trimmedBuf.length < wavBuf.length) {
        fs.writeFileSync(recordedPath, trimmedBuf);
      }

      // 3. Transcribe with Whisper
      const stt = await this.engine.transcribe(recordedPath);
      const raw = stt.text;

      if (!raw || isNoiseOnly(raw)) {
        return {
          text: "",
          rawText: raw,
          isSilent: false,
          durationMs: Date.now() - startTime,
          audioPath: recordedPath,
        };
      }

      // 4. Clean transcript, strip wake words, normalize spoken URLs
      const cleaned = cleanTranscript(raw);
      const stripped = stripWakeWords(cleaned);
      const normalized = normalizeSpokenUrls(stripped);

      return {
        text: normalized,
        rawText: raw,
        isSilent: false,
        durationMs: Date.now() - startTime,
        audioPath: recordedPath,
      };
    } finally {
      // Temporary files can be retained or cleaned up by caller
    }
  }
}

export const defaultSTTPipeline = new STTPipeline();
