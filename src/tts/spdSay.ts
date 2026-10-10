import { execSync, spawn } from "node:child_process";
import { ITTSBackend, TTSBackendType, TTSResult, TTSVoiceOptions } from "./types.js";
import { hasBinary } from "../audio/player.js";

export class SpdSayBackend implements ITTSBackend {
  public readonly name: TTSBackendType = "spd-say";

  public isAvailable(): boolean {
    return hasBinary("spd-say");
  }

  public async synthesizeToFile(
    _text: string,
    _outputPath: string,
    _opts?: TTSVoiceOptions
  ): Promise<boolean> {
    // spd-say directly speaks to audio daemon and does not natively write files
    return false;
  }

  public async speak(text: string, opts: TTSVoiceOptions = {}): Promise<TTSResult> {
    if (!this.isAvailable()) {
      return { success: false, backendUsed: this.name, error: "spd-say not available" };
    }

    const startTime = Date.now();
    const cleanText = text.slice(0, 800).replace(/"/g, '\\"');
    const args = ["-w"]; // wait until speech finishes

    if (opts.voice) {
      args.push("-t", opts.voice); // male1, male2, female1, female2
    }

    args.push(cleanText);

    if (opts.async) {
      const child = spawn("spd-say", args.filter(a => a !== "-w"), { stdio: "ignore" });
      return {
        success: true,
        backendUsed: this.name,
        durationMs: Date.now() - startTime,
      };
    }

    return new Promise((resolve) => {
      const child = spawn("spd-say", args, { stdio: "ignore" });
      child.on("close", (code) => {
        resolve({
          success: code === 0,
          backendUsed: this.name,
          durationMs: Date.now() - startTime,
        });
      });
      child.on("error", (err) => {
        resolve({
          success: false,
          backendUsed: this.name,
          error: err.message,
        });
      });
    });
  }

  public speakSync(text: string): boolean {
    if (!this.isAvailable()) return false;
    try {
      const clean = text.slice(0, 800).replace(/"/g, '\\"');
      execSync(`spd-say -w "${clean}"`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}
