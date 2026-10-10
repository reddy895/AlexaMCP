import { EarconManager, EarconType } from "../src/audio/earcons.js";
import assert from "node:assert";
import fs from "node:fs";

console.log("=== Testing Earcon Manager ===");

const manager = new EarconManager();
const types: EarconType[] = [
  "wake",
  "listen_start",
  "listen_stop",
  "investigating",
  "verdict_safe",
  "verdict_alert",
  "error",
];

for (const type of types) {
  const buf = manager.getWavBuffer(type);
  assert.ok(buf.length > 44, `Buffer for ${type} must be non-empty WAV`);
  assert.strictEqual(buf.toString("ascii", 0, 4), "RIFF");

  const filePath = manager.getWavPath(type);
  assert.ok(fs.existsSync(filePath), `File on disk for ${type} must exist`);
  console.log(`✓ Earcon '${type}' generated and verified (${buf.length} bytes)`);
}

manager.prewarm();
console.log("✓ Earcon prewarming completed successfully");
console.log("=== All Earcon Tests Passed ===");
