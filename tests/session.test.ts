import { VoiceSession } from "../src/voice/session.js";
import assert from "node:assert";

console.log("=== Testing Voice Session & Context Memory ===");

const session = new VoiceSession("test-session", "alexa");
assert.strictEqual(session.activePersona, "alexa");

// 1. Add turns
session.addTurn("user", "Hello Detective", { intent: "SMALLTALK" });
session.addTurn("agent", "Hello! How can I assist?", { intent: "SMALLTALK" });

assert.strictEqual(session.getTurns().length, 2);
assert.strictEqual(session.getLastSpokenText(), "Hello! How can I assist?");
console.log("✓ Turn recording and last spoken text verified");

// 2. Report memory
const dummyReport = { verdict: "HIGH RISK", riskScore: 90 };
session.addTurn("agent", "Investigation complete.", { report: dummyReport });
assert.deepStrictEqual(session.getLastReport(), dummyReport);
console.log("✓ Report memory retention verified");

// 3. Persona switching
session.switchPersona("forensics");
assert.strictEqual(session.activePersona, "forensics");
console.log("✓ Persona switching verified");

// 4. Clear
session.clear();
assert.strictEqual(session.getTurns().length, 0);
assert.strictEqual(session.getLastReport(), null);
console.log("✓ Session clear verified");

console.log("=== All Voice Session Tests Passed ===");
