export type TTSBackendType =
  | "edge-tts"
  | "spd-say"
  | "piper"
  | "espeak"
  | "mock";

export interface TTSVoiceOptions {
  voice?: string;
  rate?: string; // e.g. "+0%", "+15%", "-10%"
  pitch?: string; // e.g. "+0Hz", "+50Hz"
  volume?: number; // 0.0 to 1.0
  useCache?: boolean;
  async?: boolean;
}

export interface TTSResult {
  success: boolean;
  audioPath?: string;
  backendUsed: TTSBackendType;
  durationMs?: number;
  error?: string;
}

export interface ITTSBackend {
  readonly name: TTSBackendType;
  isAvailable(): boolean;
  synthesizeToFile(
    text: string,
    outputPath: string,
    opts?: TTSVoiceOptions
  ): Promise<boolean>;
  speak(text: string, opts?: TTSVoiceOptions): Promise<TTSResult>;
}
