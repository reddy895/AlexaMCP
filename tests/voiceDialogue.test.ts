import { createMockVoiceDialogueManager } from "../src/voice/mockAudio.js";
import assert from "node:assert";

console.log("=== Testing End-to-End Simulated Voice Dialogue Loop ===");

const { manager, mic, speaker } = createMockVoiceDialogueManager({
  investigationHandler: async (input) => {
    return {
      verdict: "HIGH RISK",
      riskScore: 92,
      redFlags: ["advance fee lottery demand", "urgency tactics"],
      recommendation: "Block sender and do not pay.",
    };
  },
});

// Turn 1: Greeting
mic.queueInput("Hello Detective");
const t1 = await manager.executeVoiceTurn();
assert.strictEqual(t1.intent, "SMALLTALK");
assert.ok(speaker.getLastSpoken()?.includes("Digital Detective"));
console.log("✓ Turn 1: Spoken greeting acknowledged");

// Turn 2: Voice persona change
mic.queueInput("Switch voice to advisor");
const t2 = await manager.executeVoiceTurn();
assert.strictEqual(t2.intent, "CONTROL");
assert.strictEqual(manager.session.activePersona, "advisor");
assert.ok(speaker.getLastSpoken()?.includes("Security Advisor"));
console.log("✓ Turn 2: Spoken voice persona switch acknowledged");

// Turn 3: Scam investigation
mic.queueInput("You won 10,000 dollars! Pay 500 to claim prize.");
const t3 = await manager.executeVoiceTurn();
assert.strictEqual(t3.intent, "INVESTIGATE");
assert.ok(speaker.getLastSpoken()?.includes("HIGH RISK"));
assert.ok(speaker.getLastSpoken()?.includes("92 out of 100"));
console.log("✓ Turn 3: Spoken scam investigation briefing delivered");

// Turn 4: Follow-up query
mic.queueInput("Why is it high risk?");
const t4 = await manager.executeVoiceTurn();
assert.strictEqual(t4.intent, "EXPLAIN");
assert.ok(speaker.getLastSpoken()?.includes("HIGH RISK"));
console.log("✓ Turn 4: Spoken follow-up explanation delivered");

// Turn 5: Farewell
mic.queueInput("Goodbye Detective");
const t5 = await manager.executeVoiceTurn();
assert.strictEqual(t5.intent, "EXIT");
assert.strictEqual(t5.shouldExit, true);
assert.ok(speaker.getLastSpoken()?.includes("Goodbye"));
console.log("✓ Turn 5: Spoken exit executed");

console.log("=== All Simulated Voice Dialogue Tests Passed ===");
