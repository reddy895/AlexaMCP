import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ITTSBackend, TTSBackendType, TTSResult, TTSVoiceOptions } from "./types.js";
import { AudioPlayer, defaultAudioPlayer, hasBinary } from "../audio/player.js";

export class PiperBackend implements ITTSBackend {
  public readonly name: TTSBackendType = "piper";
  private player: AudioPlayer;
  private piperBin: string;
  private piperModel: string;

  constructor(player: AudioPlayer = defaultAudioPlayer) {
    this.player = player;
    this.piperBin = process.env.PIPER_BIN ?? "piper";
    this.piperModel = process.env.PIPER_MODEL ?? "";
  }

  public isAvailable(): boolean {
    const hasBin = hasBinary(this.piperBin) || fs.existsSync(this.piperBin);
    const hasModel = this.piperModel.trim() !== "" && fs.existsSync(this.piperModel);
    return hasBin && hasModel;
  }

  public async synthesizeToFile(
    text: string,
    outputPath: string,
    _opts?: TTSVoiceOptions
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const cleanText = text.slice(0, 800).replace(/"/g, '\\"');

    return new Promise((resolve) => {
      const proc = spawn(
        "sh",
        ["-c", `echo "${cleanText}" | "${this.piperBin}" --model "${this.piperModel}" --output_file "${outputPath}"`],
        { stdio: "ignore" }
      );
      proc.on("close", (code) => {
        resolve(code === 0 && fs.existsSync(outputPath));
      });
      proc.on("error", () => resolve(false));
    });
  }

  public async speak(text: string, opts: TTSVoiceOptions = {}): Promise<TTSResult> {
    const startTime = Date.now();
    if (!this.isAvailable()) {
      return { success: false, backendUsed: this.name, error: "piper or model not available" };
    }

    const tempFile = path.join(os.tmpdir(), `piper-${Date.now()}.wav`);
    const success = await this.synthesizeToFile(text, tempFile, opts);
    if (!success) {
      return { success: false, backendUsed: this.name, error: "piper synthesis failed" };
    }

    const played = await this.player.playFile(tempFile, { async: opts.async });
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch {
      // ignore
    }

    return {
      success: played,
      backendUsed: this.name,
      durationMs: Date.now() - startTime,
    };
  }
}
