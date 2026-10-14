import { getConfig } from "../config/env.js";
import { OllamaLanguageModelProvider } from "../providers/ollama/provider.js";
import { checkVoiceDeps } from "../voice.js";

export async function runDiagnostics(): Promise<boolean> {
  const config = getConfig();
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║         ALEXA + MCP ASSISTANT — OPERATIONAL DIAGNOSTIC        ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  let allHealthy = true;

  // 1. Configuration check
  console.log("⚙ Configuration:");
  console.log(`  Environment:     ${config.NODE_ENV}`);
  console.log(`  Server Port:     ${config.PORT}`);
  console.log(`  Database Path:   ${config.DATABASE_PATH}`);
  console.log(`  Ollama Base URL: ${config.OLLAMA_URL}`);
  console.log(`  Target Model:    ${config.OLLAMA_MODEL}`);

  // 2. Ollama Connectivity & Model Check
  console.log("\n🧠 Language Model Provider (Ollama):");
  const provider = new OllamaLanguageModelProvider();
  const health = await provider.healthCheck();

  if (health.isHealthy) {
    console.log(`  ✓ Ollama service reachable (${health.latencyMs}ms)`);
    console.log(`  ✓ Model "${health.model}" is installed and ready`);
  } else {
    allHealthy = false;
    console.log(`  ✗ Ollama check failed: ${health.error}`);
    if (health.availableModels && health.availableModels.length > 0) {
      console.log(`  ℹ Currently installed models: ${health.availableModels.join(", ")}`);
    } else {
      console.log("  ℹ Tip: Start Ollama with 'ollama serve' in a terminal");
    }
  }

  // 3. Voice Dependencies Check
  if (config.DD_MODE === "voice") {
    console.log("\n🎤 Voice Pipeline Dependencies:");
    const deps = checkVoiceDeps();
    console.log(`  arecord:         ${deps.arecord ? "✓ available" : "✗ missing (install: alsa-utils)"}`);
    console.log(`  whisper-cli:     ${deps.whisper ? "✓ available" : "✗ missing (compile: whisper.cpp)"}`);
    console.log(`  spd-say / tts:   ${deps.espeak ? "✓ available" : "✗ missing"}`);
  }

  console.log("\n════════════════════════════════════════════════════════════");
  if (allHealthy) {
    console.log("DIAGNOSTIC STATUS: ALL SYSTEMS OPERATIONAL ✓");
  } else {
    console.log("DIAGNOSTIC STATUS: ATTENTION REQUIRED ⚠");
  }
  console.log("════════════════════════════════════════════════════════════\n");

  return allHealthy;
}

const isMain = process.argv[1] && (process.argv[1].endsWith("diagnostic.ts") || process.argv[1].endsWith("diagnostic.js"));
if (isMain) {
  runDiagnostics().then((healthy) => {
    process.exit(healthy ? 0 : 1);
  });
}
