import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import process from "node:process";

export const WHISPER_BIN = process.env.WHISPER_BIN ?? "";
export const WHISPER_MODEL = process.env.WHISPER_MODEL ?? "";
export const PIPER_BIN = process.env.PIPER_BIN ?? "piper";
export const PIPER_MODEL = process.env.PIPER_MODEL ?? "";

export function recordVoice(seconds: number): string | null {
  const wavPath = "/tmp/dd-input.wav";
  try {
    execSync(`arecord -d ${seconds} -f cd -t wav -q ${wavPath}`, { stdio: "ignore" });
    return wavPath;
  } catch (err: any) {
    const reason = err?.message ?? String(err);
    console.log(`⚠ Microphone unavailable (${reason}). Falling back to text.`);
    return null;
  }
}

export function transcribe(wavPath: string): string {
  try {
    const whisperBin = process.env.WHISPER_BIN ?? "";
    const whisperModel = process.env.WHISPER_MODEL ?? "";
    if (!whisperBin || !existsSync(whisperBin)) {
      return "";
    }
    execSync(`${whisperBin} -m ${whisperModel} -f ${wavPath} -nt -otxt -of /tmp/dd-out`, { stdio: "ignore" });
    const outPath = "/tmp/dd-out.txt";
    if (existsSync(outPath)) {
      const text = readFileSync(outPath, "utf-8").trim();
      return text;
    }
    return "";
  } catch {
    return "";
  }
}

export function speak(text: string): void {
  try {
    const trimmed = text.slice(0, 600).replace(/"/g, '\\"');
    const piperModel = process.env.PIPER_MODEL ?? "";
    const piperBin = process.env.PIPER_BIN ?? "piper";

    if (piperModel.trim() !== "") {
      try {
        execSync(`echo "${trimmed}" | ${piperBin} --model "${piperModel}" --output_file /tmp/dd-out.wav`, { stdio: "ignore" });
        execSync("aplay -q /tmp/dd-out.wav", { stdio: "ignore" });
        return;
      } catch {
        // Fall back if piper/aplay fails
      }
    }

    try {
      execSync(`espeak-ng -s 160 -v en-us "${trimmed}"`, { stdio: "ignore" });
    } catch {
      console.log("⚠ Text-to-speech unavailable.");
    }
  } catch {
    // Never throw
  }
}
