import { ITTSBackend, TTSBackendType, TTSResult, TTSVoiceOptions } from "./types.js";
import { EdgeTTSBackend } from "./edgeTts.js";
import { SpdSayBackend } from "./spdSay.js";
import { PiperBackend } from "./piper.js";
import { EspeakBackend } from "./espeak.js";
import { AudioCache, defaultAudioCache } from "../audio/cache.js";
import { AudioPlayer, defaultAudioPlayer } from "../audio/player.js";

export class TTSEngine {
  private backends: ITTSBackend[] = [];
  private cache: AudioCache;
  private player: AudioPlayer;
  private muted = false;

  constructor(
    backends?: ITTSBackend[],
    cache: AudioCache = defaultAudioCache,
    player: AudioPlayer = defaultAudioPlayer
  ) {
    this.cache = cache;
    this.player = player;

    if (backends && backends.length > 0) {
      this.backends = backends;
    } else {
      // Default cascade priority: EdgeTTS (Neural) -> SpdSay (Linux standard) -> Piper -> Espeak
      this.backends = [
        new EdgeTTSBackend(this.player),
        new SpdSayBackend(),
        new PiperBackend(this.player),
        new EspeakBackend(),
      ];
    }
  }

  public getAvailableBackends(): TTSBackendType[] {
    return this.backends.filter((b) => b.isAvailable()).map((b) => b.name);
  }

  public getActiveBackendName(): TTSBackendType | "none" {
    for (const b of this.backends) {
      if (b.isAvailable()) return b.name;
    }
    return "none";
  }

  public mute(): void {
    this.muted = true;
  }

  public unmute(): void {
    this.muted = false;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public async speak(text: string, opts: TTSVoiceOptions = {}): Promise<TTSResult> {
    if (this.muted || !text.trim()) {
      return { success: true, backendUsed: "mock" };
    }

    const trimmed = text.trim();
    const useCache = opts.useCache !== false;

    // Check Audio Cache for instantaneous playback
    if (useCache) {
      const cacheKey = AudioCache.hashKey(trimmed, opts.voice, opts.rate);
      const cachedFile = this.cache.get(cacheKey);
      if (cachedFile) {
        const played = await this.player.playFile(cachedFile, { async: opts.async });
        if (played) {
          return { success: true, backendUsed: "mock", audioPath: cachedFile };
        }
      }
    }

    // Cascade through available backends
    for (const backend of this.backends) {
      if (!backend.isAvailable()) continue;
      try {
        const result = await backend.speak(trimmed, opts);
        if (result.success) {
          return result;
        }
      } catch {
        // Fallback to next backend
      }
    }

    return {
      success: false,
      backendUsed: "mock",
      error: "All TTS backends failed or unavailable",
    };
  }

  public speakSync(text: string): boolean {
    if (this.muted || !text.trim()) return true;

    for (const backend of this.backends) {
      if (!backend.isAvailable()) continue;
      if (backend instanceof SpdSayBackend) {
        if (backend.speakSync(text)) return true;
      }
    }
    return false;
  }
}

export const defaultTTSEngine = new TTSEngine();
