import { VoiceDialogueManager, DialogueState } from "../src/voice/dialogueManager.js";
import { TTSEngine } from "../src/tts/ttsEngine.js";
import { ITTSBackend, TTSResult } from "../src/tts/types.js";
import { AudioPlayer } from "../src/audio/player.js";
import { AudioCache } from "../src/audio/cache.js";
import assert from "node:assert";

console.log("=== Testing Voice Dialogue Manager Transitions ===");

class FastMockTTSBackend implements ITTSBackend {
  public readonly name = "mock" as const;
  public isAvailable(): boolean { return true; }
  public async synthesizeToFile(): Promise<boolean> { return true; }
  public async speak(): Promise<TTSResult> {
    return { success: true, backendUsed: "mock", durationMs: 1 };
  }
}

const player = new AudioPlayer("mock");
const cache = new AudioCache();
const tts = new TTSEngine([new FastMockTTSBackend()], cache, player);

const stateHistory: DialogueState[] = [];
const manager = new VoiceDialogueManager({
  tts,
  player,
  enableEarcons: false,
});
manager.onStateChange = (st) => stateHistory.push(st);

// 1. Smalltalk turn test
const turn1 = await manager.executeVoiceTurn("Hello Detective");
assert.strictEqual(turn1.intent, "SMALLTALK");
assert.ok(turn1.agentSpeech.includes("Digital Detective"));
assert.strictEqual(manager.getState(), "IDLE");
console.log("✓ Smalltalk turn handled with clean state transition back to IDLE");

// 2. Investigation handler test
manager.setInvestigationHandler(async (input) => {
  return {
    verdict: "HIGH RISK",
    riskScore: 99,
    redFlags: ["fake lottery claim"],
    recommendation: "Do not reply to this message.",
  };
});

const turn2 = await manager.executeVoiceTurn("You won 1,000,000 dollars! Claim here");
assert.strictEqual(turn2.intent, "INVESTIGATE");
assert.ok(turn2.agentSpeech.includes("HIGH RISK"));
assert.ok(turn2.agentSpeech.includes("99 out of 100"));
console.log("✓ Investigation pipeline and spoken briefing turn executed");

// 3. Repeat turn test
const turn3 = await manager.executeVoiceTurn("Can you repeat that?");
assert.strictEqual(turn3.intent, "REPEAT");
assert.strictEqual(turn3.agentSpeech, turn2.agentSpeech, "Must repeat previous agent speech");
console.log("✓ Repeat dialogue turn verified");

// 4. Exit turn test
const turn4 = await manager.executeVoiceTurn("Goodbye");
assert.strictEqual(turn4.intent, "EXIT");
assert.strictEqual(turn4.shouldExit, true);
console.log("✓ Exit turn signals shouldExit=true");

console.log("=== All Dialogue Manager Tests Passed ===");
