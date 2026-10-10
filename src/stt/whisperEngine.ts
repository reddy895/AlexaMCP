import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ISTTEngine, STTResult } from "./types.js";
import { hasBinary } from "../audio/player.js";

export class WhisperEngine implements ISTTEngine {
  private binaryPath: string = "";
  private modelPath: string = "";

  constructor(customBin?: string, customModel?: string) {
    this.binaryPath = customBin ?? this.resolveBinary();
    this.modelPath = customModel ?? this.resolveModel();
  }

  public resolveBinary(): string {
    const envBin = process.env.WHISPER_BIN ?? "";
    if (envBin && (hasBinary(envBin) || fs.existsSync(envBin))) return envBin;
    if (hasBinary("whisper-cli")) return "whisper-cli";

    const candidates = [
      path.resolve(process.cwd(), "whisper.cpp/build/bin/whisper-cli"),
      path.resolve(process.cwd(), "build/bin/whisper-cli"),
      path.resolve(process.env.HOME ?? "", "whisper.cpp/build/bin/whisper-cli"),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return "";
  }

  public resolveModel(): string {
    const envModel = process.env.WHISPER_MODEL ?? "";
    if (envModel && fs.existsSync(envModel)) return envModel;

    const candidates = [
      path.resolve(process.cwd(), "whisper.cpp/models/ggml-base.en.bin"),
      path.resolve(process.cwd(), "whisper.cpp/models/ggml-tiny.en.bin"),
      path.resolve(process.cwd(), "models/ggml-base.en.bin"),
      path.resolve(process.env.HOME ?? "", "whisper.cpp/models/ggml-base.en.bin"),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return "";
  }

  public isAvailable(): boolean {
    return this.binaryPath !== "" && this.modelPath !== "";
  }

  public getModelPath(): string {
    return this.modelPath;
  }

  public getBinaryPath(): string {
    return this.binaryPath;
  }

  public async transcribe(audioFilePath: string): Promise<STTResult> {
    const startTime = Date.now();
    if (!this.isAvailable()) {
      return {
        text: "",
        durationMs: 0,
        error: "Whisper binary or model not available",
      };
    }

    if (!fs.existsSync(audioFilePath)) {
      return {
        text: "",
        durationMs: 0,
        error: `Audio file not found: ${audioFilePath}`,
      };
    }

    const outPrefix = path.join(os.tmpdir(), `whisper-out-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    const txtFile = `${outPrefix}.txt`;

    const args = [
      "-m",
      this.modelPath,
      "-f",
      audioFilePath,
      "-nt",
      "-otxt",
      "-of",
      outPrefix,
      "-t",
      "4",
    ];

    return new Promise((resolve) => {
      const proc = spawn(this.binaryPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdoutData = "";
      let stderrData = "";

      proc.stdout.on("data", (chunk) => {
        stdoutData += chunk.toString();
      });
      proc.stderr.on("data", (chunk) => {
        stderrData += chunk.toString();
      });

      proc.on("close", (code) => {
        const durationMs = Date.now() - startTime;
        let text = "";

        if (fs.existsSync(txtFile)) {
          try {
            text = fs.readFileSync(txtFile, "utf-8").trim();
            fs.unlinkSync(txtFile);
          } catch {
            // ignore
          }
        }

        if (!text && stdoutData.trim()) {
          // Fallback parsing stdout lines (e.g. "[00:00:00.000 --> ...] text")
          text = stdoutData
            .split("\n")
            .map((l) => l.replace(/\[\d+:\d+:\d+\.\d+ --> \d+:\d+:\d+\.\d+\]/, "").trim())
            .filter(Boolean)
            .join(" ");
        }

        resolve({
          text,
          durationMs,
          error: code === 0 || text ? undefined : stderrData.slice(0, 200),
        });
      });

      proc.on("error", (err) => {
        resolve({
          text: "",
          durationMs: Date.now() - startTime,
          error: err.message,
        });
      });
    });
  }
}

export const defaultWhisperEngine = new WhisperEngine();
