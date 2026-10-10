import { AudioCache } from "../src/audio/cache.js";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

console.log("=== Testing Audio Cache ===");

const testDir = path.join(os.tmpdir(), "alexa-test-audio-cache-" + Date.now());
const cache = new AudioCache(testDir);

// 1. Test key hashing
const k1 = AudioCache.hashKey("Hello world", "voice1", "+0%");
const k2 = AudioCache.hashKey("Hello world", "voice1", "+0%");
const k3 = AudioCache.hashKey("Different text", "voice1", "+0%");
assert.strictEqual(k1, k2, "Hashes for identical inputs must match");
assert.notStrictEqual(k1, k3, "Hashes for different inputs must differ");
console.log("✓ Audio cache key hashing valid");

// 2. Put and Get
const sampleData = Buffer.from("RIFF....WAVEdata12345");
const savedPath = cache.put(k1, sampleData, "wav");
assert.ok(fs.existsSync(savedPath), "Saved file must exist on disk");
assert.strictEqual(cache.has(k1), true, "Cache has must return true");

const retrievedPath = cache.get(k1);
assert.strictEqual(retrievedPath, savedPath, "Retrieved path must match saved path");
const readBack = fs.readFileSync(retrievedPath!);
assert.deepStrictEqual(readBack, sampleData, "Cached content must match original buffer");
console.log("✓ Put and get operations valid");

// 3. Pruning
for (let i = 0; i < 5; i++) {
  const k = AudioCache.hashKey(`Item ${i}`);
  cache.put(k, Buffer.from(`data ${i}`));
}
assert.ok(cache.size() >= 5, "Cache must contain multiple items");
cache.prune(2);
assert.strictEqual(cache.size(), 2, "Prune must cap cache entries to maxEntries");
console.log("✓ Cache pruning valid");

// 4. Clear
cache.clear();
assert.strictEqual(cache.size(), 0, "Cache size after clear must be 0");
console.log("✓ Cache clear valid");

// Cleanup test dir
fs.rmSync(testDir, { recursive: true, force: true });
console.log("=== All Audio Cache Tests Passed ===");
