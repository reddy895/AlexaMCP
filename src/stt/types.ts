export interface STTSegment {
  start: number;
  end: number;
  text: string;
}

export interface STTResult {
  text: string;
  confidence?: number;
  durationMs: number;
  segments?: STTSegment[];
  language?: string;
  error?: string;
}

export interface AudioRecordOptions {
  durationSeconds: number;
  device?: string;
  sampleRate?: number;
  channels?: number;
  detectSilence?: boolean;
}

export interface ISTTEngine {
  isAvailable(): boolean;
  transcribe(audioFilePath: string): Promise<STTResult>;
}
