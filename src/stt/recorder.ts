import { execSync, spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { AudioRecordOptions } from "./types.js";
import { hasBinary } from "../audio/player.js";

export class AudioRecorder {
  private activeRecording: ChildProcess | null = null;
  private isMock = false;

  constructor(mock = false) {
    this.isMock = mock || process.env.AUDIO_RECORD_MOCK === "true";
  }

  public isAvailable(): boolean {
    if (this.isMock) return true;
    return hasBinary("arecord");
  }

  public listAudioInputDevices(): string[] {
    if (!this.isAvailable() || this.isMock) {
      return ["default"];
    }

    const devices = ["default", "pulse", "pipewire", "sysdefault"];
    try {
      const output = execSync("arecord -l", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
      const matches = output.match(/card \d+: [^,]+, device \d+/g);
      if (matches) {
        for (const m of matches) {
          const cardMatch = m.match(/card (\d+):.*device (\d+)/);
          if (cardMatch) {
            devices.push(`plughw:${cardMatch[1]},${cardMatch[2]}`);
            devices.push(`hw:${cardMatch[1]},${cardMatch[2]}`);
          }
        }
      }
    } catch {
      devices.push("plughw:1,0", "plughw:0,0");
    }

    return Array.from(new Set(devices));
  }

  public async record(
    outputPath?: string,
    opts: Partial<AudioRecordOptions> = {}
  ): Promise<string | null> {
    const duration = opts.durationSeconds ?? 6;
    const targetPath = outputPath ?? path.join(os.tmpdir(), `alexa-record-${Date.now()}.wav`);

    if (this.isMock) {
      // In mock mode, generate audio with audible speech energy
      const { generateTone } = await import("../audio/tones.js");
      fs.writeFileSync(targetPath, generateTone(440, duration * 1000, { volume: 0.5 }));
      return targetPath;
    }

    if (!this.isAvailable()) {
      return null;
    }

    const devicesToTry = opts.device ? [opts.device] : this.listAudioInputDevices();

    for (const dev of devicesToTry) {
      const success = await this.recordWithDevice(dev, targetPath, duration);
      if (success && fs.existsSync(targetPath) && fs.statSync(targetPath).size > 44) {
        return targetPath;
      }
    }

    return null;
  }

  private recordWithDevice(
    device: string,
    targetPath: string,
    durationSeconds: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const args = [
        "-D",
        device,
        "-d",
        String(durationSeconds),
        "-r",
        "16000",
        "-c",
        "1",
        "-f",
        "S16_LE",
        "-t",
        "wav",
        "-q",
        targetPath,
      ];

      try {
        const proc = spawn("arecord", args, { stdio: "ignore" });
        this.activeRecording = proc;

        proc.on("close", (code) => {
          if (this.activeRecording === proc) {
            this.activeRecording = null;
          }
          resolve(code === 0);
        });

        proc.on("error", () => {
          this.activeRecording = null;
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  public stop(): void {
    if (this.activeRecording && !this.activeRecording.killed) {
      try {
        this.activeRecording.kill("SIGTERM");
      } catch {
        // ignore
      }
      this.activeRecording = null;
    }
  }
}

export const defaultAudioRecorder = new AudioRecorder();
