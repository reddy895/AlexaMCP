import { execSync } from "node:child_process";

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     DIGITAL DETECTIVE — COMPREHENSIVE VOICE TEST SUITE        ║
╚═══════════════════════════════════════════════════════════════╝
`);

const testFiles = [
  "tests/tones.test.ts",
  "tests/earcons.test.ts",
  "tests/cache.test.ts",
  "tests/player.test.ts",
  "tests/ttsEngine.test.ts",
  "tests/silence.test.ts",
  "tests/normalizer.test.ts",
  "tests/spokenBriefing.test.ts",
  "tests/intentClassifier.test.ts",
  "tests/voiceCommands.test.ts",
  "tests/smalltalk.test.ts",
  "tests/session.test.ts",
  "tests/dialogueManager.test.ts",
  "tests/voiceDialogue.test.ts",
  "tests/voiceApi.test.ts",
];

let totalPassed = 0;
let totalFailed = 0;

for (const file of testFiles) {
  process.stdout.write(`▶ Running ${file.padEnd(32)} `);
  try {
    execSync(`npx tsx "${file}"`, { stdio: "pipe", encoding: "utf-8" });
    console.log("✓ PASSED");
    totalPassed++;
  } catch (err: any) {
    console.log("✗ FAILED");
    console.error(err.stdout || err.stderr || err.message);
    totalFailed++;
  }
}

console.log("\n" + "═".repeat(60));
console.log(`VOICE SUITE SUMMARY: ${totalPassed} passed, ${totalFailed} failed out of ${testFiles.length} suites.`);
console.log("═".repeat(60) + "\n");

if (totalFailed > 0) {
  process.exit(1);
}
