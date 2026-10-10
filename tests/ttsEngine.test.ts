import { TTSEngine } from "../src/tts/ttsEngine.js";
import { ITTSBackend, TTSBackendType, TTSResult, TTSVoiceOptions } from "../src/tts/types.js";
import { AudioCache } from "../src/audio/cache.js";
import { AudioPlayer } from "../src/audio/player.js";
import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

console.log("=== Testing TTSEngine Composite & Fallback ===");

class MockFailingBackend implements ITTSBackend {
  public readonly name: TTSBackendType = "edge-tts";
  public isAvailable(): boolean { return true; }
  public async synthesizeToFile(): Promise<boolean> { return false; }
  public async speak(): Promise<TTSResult> {
    return { success: false, backendUsed: this.name, error: "Mock failure" };
  }
}

class MockSucceedingBackend implements ITTSBackend {
  public readonly name: TTSBackendType = "spd-say";
  public isAvailable(): boolean { return true; }
  public async synthesizeToFile(): Promise<boolean> { return true; }
  public async speak(): Promise<TTSResult> {
    return { success: true, backendUsed: this.name, durationMs: 50 };
  }
}

const mockCacheDir = path.join(os.tmpdir(), "test-tts-cache-" + Date.now());
const cache = new AudioCache(mockCacheDir);
const player = new AudioPlayer("mock");

// 1. Fallback cascade test
const engine = new TTSEngine([new MockFailingBackend(), new MockSucceedingBackend()], cache, player);
assert.strictEqual(engine.getActiveBackendName(), "edge-tts");
const res = await engine.speak("Test fallback speech");
assert.strictEqual(res.success, true, "Fallback should reach succeeding backend");
assert.strictEqual(res.backendUsed, "spd-say", "Must use spd-say when edge-tts fails");
console.log("✓ Automatic fallback cascade verified");

// 2. Mute functionality
engine.mute();
assert.strictEqual(engine.isMuted(), true);
const mutedRes = await engine.speak("Should not speak");
assert.strictEqual(mutedRes.success, true);
engine.unmute();
assert.strictEqual(engine.isMuted(), false);
console.log("✓ Mute and unmute controls verified");

// 3. Cache integration test
const cacheKey = AudioCache.hashKey("Cached phrase");
const dummyFile = path.join(mockCacheDir, "dummy.wav");
fs.writeFileSync(dummyFile, "RIFF...");
cache.put(cacheKey, dummyFile, "wav");

const cachedRes = await engine.speak("Cached phrase", { useCache: true });
assert.strictEqual(cachedRes.success, true);
assert.strictEqual(cachedRes.backendUsed, "mock");
console.log("✓ Audio cache hit playback verified");

fs.rmSync(mockCacheDir, { recursive: true, force: true });
console.log("=== All TTSEngine Tests Passed ===");
