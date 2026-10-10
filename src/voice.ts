import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// Subsystem exports
export * from "./audio/tones.js";
export * from "./audio/earcons.js";
export * from "./audio/player.js";
export * from "./audio/cache.js";
export * from "./tts/types.js";
export * from "./tts/voices.js";
export * from "./tts/ttsEngine.js";
export * from "./stt/types.js";
export * from "./stt/silence.js";
export * from "./stt/normalizer.js";
export * from "./stt/recorder.js";
export * from "./stt/whisperEngine.js";
export * from "./stt/sttPipeline.js";
export * from "./dialogue/spokenBriefing.js";
export * from "./dialogue/intentClassifier.js";
export * from "./dialogue/voiceCommands.js";
export * from "./dialogue/smalltalk.js";
export * from "./voice/session.js";
export * from "./voice/dialogueManager.js";
export * from "./voice/mockAudio.js";

import { defaultTTSEngine } from "./tts/ttsEngine.js";
import { defaultWhisperEngine } from "./stt/whisperEngine.js";
import { defaultAudioPlayer, hasBinary } from "./audio/player.js";
import { defaultAudioRecorder } from "./stt/recorder.js";
import { defaultEarcons } from "./audio/earcons.js";

export interface VoiceDepsReport {
  arecord: boolean;
  whisper: boolean;
  espeak: boolean;
  piper: boolean;
  spdSay: boolean;
  edgeTts: boolean;
  pwPlay: boolean;
}

export function hasCommand(bin: string): boolean {
  if (!bin) return false;
  try {
    execSync(`which ${bin}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function resolveWhisperBinary(): string {
  return defaultWhisperEngine.resolveBinary();
}

export function resolveWhisperModel(): string {
  return defaultWhisperEngine.resolveModel();
}

export function checkVoiceDeps(): VoiceDepsReport {
  const whisperBin = resolveWhisperBinary();
  const piperBin = process.env.PIPER_BIN ?? "piper";
  const piperModel = process.env.PIPER_MODEL ?? "";

  const report: VoiceDepsReport = {
    arecord: hasCommand("arecord"),
    whisper: whisperBin !== "",
    espeak: hasCommand("espeak-ng") || hasCommand("espeak"),
    piper: hasCommand(piperBin) || (piperModel.trim() !== "" && existsSync(piperModel)),
    spdSay: hasCommand("spd-say"),
    edgeTts: hasCommand("python3"),
    pwPlay: hasCommand("pw-play") || hasCommand("aplay"),
  };

  if (!report.arecord) console.log("  ✗ arecord missing (install alsa-utils)");
  if (!report.whisper) console.log("  ✗ whisper-cli missing");
  if (!report.spdSay) console.log("  ✗ spd-say missing (speech-dispatcher)");
  if (!report.espeak) console.log("  ✗ espeak-ng missing (optional fallback)");
  if (!report.piper) console.log("  ✗ piper missing (optional fallback)");

  return report;
}

export function recordVoice(seconds: number): string | null {
  const wavPath = "/tmp/dd-input.wav";
  const devices = ["default", "pulse", "pipewire", "plughw:1,0", "plughw:0,0"];

  for (const dev of devices) {
    try {
      execSync(`arecord -D ${dev} -d ${seconds} -r 16000 -c 1 -f S16_LE -t wav -q ${wavPath}`, {
        stdio: ["ignore", "ignore", "pipe"],
      });
      return wavPath;
    } catch (err: any) {
      // try next device
    }
  }

  // Fallback to defaultAudioRecorder
  try {
    const res = execSync(`arecord -d ${seconds} -r 16000 -c 1 -f S16_LE -t wav -q ${wavPath}`, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    return wavPath;
  } catch {
    console.log("⚠ Microphone unavailable on all devices. Falling back to text.");
    return null;
  }
}

export function transcribe(wavPath: string): string {
  const whisperBin = resolveWhisperBinary();
  const whisperModel = resolveWhisperModel();

  if (!whisperBin || !whisperModel) {
    return "";
  }

  const outPath = "/tmp/dd-out.txt";
  try {
    const rawStdout = execSync(`"${whisperBin}" -m "${whisperModel}" -f "${wavPath}" -nt -otxt -of /tmp/dd-out -t 4`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (existsSync(outPath)) {
      const text = readFileSync(outPath, "utf-8").trim();
      return text;
    }

    if (rawStdout && typeof rawStdout === "string" && rawStdout.trim()) {
      return rawStdout.trim();
    }
    return "";
  } catch (err: any) {
    const stderr = err?.stderr ? err.stderr.toString().trim() : (err?.message ?? String(err));
    console.log(`⚠ whisper-cli transcription failed: ${stderr}`);
    return "";
  }
}

let ttsDisabled = false;

export function speak(text: string): void {
  if (ttsDisabled) return;

  const trimmed = text.slice(0, 800);

  // 1. Try unified TTSEngine sync first (spd-say)
  if (defaultTTSEngine.speakSync(trimmed)) {
    return;
  }

  // 2. Try TTSEngine async (EdgeTTS neural speech)
  defaultTTSEngine.speak(trimmed).catch(() => {});
}
