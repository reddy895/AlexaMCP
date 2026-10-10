import { execSync, spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";

export type AudioPlayerBackend = "pw-play" | "aplay" | "paplay" | "mpv" | "mock" | "none";

export interface PlayOptions {
  volumePercent?: number; // 0 - 100
  async?: boolean;
}

export function hasBinary(bin: string): boolean {
  if (!bin) return false;
  try {
    execSync(`which ${bin}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export class AudioPlayer {
  private backend: AudioPlayerBackend;
  private currentProcess: ChildProcess | null = null;

  constructor(forcedBackend?: AudioPlayerBackend) {
    if (forcedBackend) {
      this.backend = forcedBackend;
    } else {
      this.backend = AudioPlayer.detectDefaultBackend();
    }
  }

  public static detectDefaultBackend(): AudioPlayerBackend {
    if (process.env.AUDIO_PLAYER_MOCK === "true") return "mock";
    if (hasBinary("pw-play")) return "pw-play";
    if (hasBinary("aplay")) return "aplay";
    if (hasBinary("paplay")) return "paplay";
    if (hasBinary("mpv")) return "mpv";
    return "none";
  }

  public getBackend(): AudioPlayerBackend {
    return this.backend;
  }

  public isAvailable(): boolean {
    return this.backend !== "none";
  }

  public stop(): void {
    if (this.currentProcess && !this.currentProcess.killed) {
      try {
        this.currentProcess.kill("SIGTERM");
      } catch {
        // ignore
      }
      this.currentProcess = null;
    }
  }

  /**
   * Plays an audio file asynchronously. Returns a promise that resolves when playback finishes.
   */
  public async playFile(filePath: string, opts: PlayOptions = {}): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    if (this.backend === "mock") {
      return true;
    }
    if (this.backend === "none") {
      return false;
    }

    this.stop();

    return new Promise((resolve) => {
      let command = "";
      let args: string[] = [];

      switch (this.backend) {
        case "pw-play":
          command = "pw-play";
          args = [filePath];
          if (opts.volumePercent !== undefined) {
            args.unshift("--volume", (opts.volumePercent / 100).toFixed(2));
          }
          break;
        case "aplay":
          command = "aplay";
          args = ["-q", filePath];
          break;
        case "paplay":
          command = "paplay";
          args = [filePath];
          break;
        case "mpv":
          command = "mpv";
          args = ["--no-video", "--really-quiet", filePath];
          break;
        default:
          return resolve(false);
      }

      try {
        const proc = spawn(command, args, { stdio: "ignore" });
        this.currentProcess = proc;

        proc.on("close", (code) => {
          if (this.currentProcess === proc) {
            this.currentProcess = null;
          }
          resolve(code === 0);
        });

        proc.on("error", () => {
          this.currentProcess = null;
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Synchronous audio playback using execSync. Blocks until sound finishes.
   */
  public playFileSync(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;
    if (this.backend === "mock") return true;
    if (this.backend === "none") return false;

    try {
      if (this.backend === "pw-play") {
        execSync(`pw-play "${filePath}"`, { stdio: "ignore" });
        return true;
      }
      if (this.backend === "aplay") {
        execSync(`aplay -q "${filePath}"`, { stdio: "ignore" });
        return true;
      }
      if (this.backend === "paplay") {
        execSync(`paplay "${filePath}"`, { stdio: "ignore" });
        return true;
      }
      if (this.backend === "mpv") {
        execSync(`mpv --no-video --really-quiet "${filePath}"`, { stdio: "ignore" });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const defaultAudioPlayer = new AudioPlayer();
