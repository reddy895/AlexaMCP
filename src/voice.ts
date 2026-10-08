import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

export interface VoiceDepsReport {
  arecord: boolean;
  whisper: boolean;
  espeak: boolean;
  piper: boolean;
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
  const envBin = process.env.WHISPER_BIN ?? "";
  if (envBin && (hasCommand(envBin) || existsSync(envBin))) return envBin;
  if (hasCommand("whisper-cli")) return "whisper-cli";
  const candidates = [
    path.resolve(process.cwd(), "whisper.cpp/build/bin/whisper-cli"),
    path.resolve(process.env.HOME ?? "", "whisper.cpp/build/bin/whisper-cli"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "";
}

export function resolveWhisperModel(): string {
  const envModel = process.env.WHISPER_MODEL ?? "";
  if (envModel && existsSync(envModel)) return envModel;
  const candidates = [
    path.resolve(process.cwd(), "whisper.cpp/models/ggml-base.en.bin"),
    path.resolve(process.cwd(), "whisper.cpp/models/ggml-tiny.en.bin"),
    path.resolve(process.env.HOME ?? "", "whisper.cpp/models/ggml-base.en.bin"),
    "models/ggml-base.en.bin",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "";
}

export function checkVoiceDeps(): VoiceDepsReport {
  const whisperBin = resolveWhisperBinary();
  const piperBin = process.env.PIPER_BIN ?? "piper";
  const piperModel = process.env.PIPER_MODEL ?? "";

  const report: VoiceDepsReport = {
    arecord: hasCommand("arecord"),
    whisper: whisperBin !== "",
    espeak: hasCommand("espeak-ng"),
    piper: hasCommand(piperBin) || (piperModel.trim() !== "" && existsSync(piperModel)),
  };

  if (!report.arecord) console.log("  ✗ arecord missing (install alsa-utils)");
  if (!report.whisper) console.log("  ✗ whisper-cli missing");
  if (!report.espeak) console.log("  ✗ espeak-ng missing (optional)");
  if (!report.piper) console.log("  ✗ piper missing (optional)");

  return report;
}

export function recordVoice(seconds: number): string | null {
  const wavPath = "/tmp/dd-input.wav";
  const devices = ["default", "plughw:1,0", "plughw:0,0"];

  for (const dev of devices) {
    try {
      execSync(`arecord -D ${dev} -d ${seconds} -f cd -t wav -q ${wavPath}`, {
        stdio: ["ignore", "ignore", "pipe"],
      });
      return wavPath;
    } catch (err: any) {
      const stderr = err?.stderr ? err.stderr.toString().trim() : (err?.message ?? String(err));
      console.log(`⚠ arecord (-D ${dev}) failed: ${stderr}`);
    }
  }

  console.log("⚠ Microphone unavailable on all devices. Falling back to text.");
  return null;
}

export function transcribe(wavPath: string): string {
  const whisperBin = resolveWhisperBinary();
  const whisperModel = resolveWhisperModel();

  if (!whisperBin) {
    return "";
  }

  const outPath = "/tmp/dd-out.txt";
  try {
    const rawStdout = execSync(`"${whisperBin}" -m "${whisperModel}" -f "${wavPath}" -nt -otxt -of /tmp/dd-out`, {
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

  const trimmed = text.slice(0, 600).replace(/"/g, '\\"');
  const piperModel = process.env.PIPER_MODEL ?? "";
  const piperBin = process.env.PIPER_BIN ?? "piper";

  if (piperModel.trim() !== "" && (hasCommand(piperBin) || existsSync(piperBin))) {
    try {
      execSync(`echo "${trimmed}" | ${piperBin} --model "${piperModel}" --output_file /tmp/dd-out.wav`, {
        stdio: ["ignore", "ignore", "pipe"],
      });
      execSync("aplay -q /tmp/dd-out.wav", { stdio: ["ignore", "ignore", "pipe"] });
      return;
    } catch (err: any) {
      const stderr = err?.stderr ? err.stderr.toString().trim() : (err?.message ?? String(err));
      console.log(`⚠ piper TTS failed: ${stderr}`);
    }
  }

  if (hasCommand("espeak-ng")) {
    try {
      execSync(`espeak-ng -s 160 -v en-us "${trimmed}"`, { stdio: ["ignore", "ignore", "pipe"] });
      return;
    } catch (err: any) {
      const stderr = err?.stderr ? err.stderr.toString().trim() : (err?.message ?? String(err));
      console.log(`⚠ espeak-ng TTS failed: ${stderr}`);
    }
  }

  console.log("⚠ Text-to-speech unavailable (both piper and espeak-ng failed or missing).");
  ttsDisabled = true;
}
