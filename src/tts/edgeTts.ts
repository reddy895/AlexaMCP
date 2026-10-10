import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ITTSBackend, TTSBackendType, TTSResult, TTSVoiceOptions } from "./types.js";
import { AudioPlayer, defaultAudioPlayer } from "../audio/player.js";

export class EdgeTTSBackend implements ITTSBackend {
  public readonly name: TTSBackendType = "edge-tts";
  private player: AudioPlayer;
  private defaultVoice: string;
  private available: boolean | null = null;

  constructor(player: AudioPlayer = defaultAudioPlayer, defaultVoice = "en-US-AriaNeural") {
    this.player = player;
    this.defaultVoice = process.env.EDGE_TTS_VOICE ?? defaultVoice;
  }

  public isAvailable(): boolean {
    if (this.available !== null) return this.available;
    try {
      // Check if python3 -m edge_tts is accessible
      const { execSync } = require("node:child_process");
      execSync("python3 -m edge_tts --version", { stdio: "ignore" });
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  public async synthesizeToFile(
    text: string,
    outputPath: string,
    opts: TTSVoiceOptions = {}
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const voice = opts.voice ?? this.defaultVoice;
    const rate = opts.rate ?? "+0%";
    const cleanText = text.replace(/"/g, '\\"').trim();

    const args = [
      "-m",
      "edge_tts",
      "--text",
      cleanText,
      "--voice",
      voice,
      "--write-media",
      outputPath,
    ];

    if (rate && rate !== "+0%") {
      args.push("--rate", rate);
    }

    return new Promise((resolve) => {
      const proc = spawn("python3", args, { stdio: "ignore" });
      proc.on("close", (code) => {
        resolve(code === 0 && fs.existsSync(outputPath));
      });
      proc.on("error", () => resolve(false));
    });
  }

  public async speak(text: string, opts: TTSVoiceOptions = {}): Promise<TTSResult> {
    const startTime = Date.now();
    const tempFile = path.join(
      os.tmpdir(),
      `edge-tts-${Date.now()}-${Math.floor(Math.random() * 1000)}.mp3`
    );

    const success = await this.synthesizeToFile(text, tempFile, opts);
    if (!success) {
      return {
        success: false,
        backendUsed: this.name,
        error: "Synthesis failed",
      };
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
