import { formatSpokenBriefing, InvestigationReportData } from "../src/dialogue/spokenBriefing.js";
import assert from "node:assert";

console.log("=== Testing Spoken Briefing Generator ===");

// 1. High Risk Report
const highRiskReport: InvestigationReportData = {
  verdict: "HIGH RISK",
  riskScore: 95,
  redFlags: ["upfront fee demand of 999", "unrealistic earnings"],
  urlSignals: ["suspicious .xyz tld"],
  recommendation: "Do not pay the fee or visit the URL.",
};

const highRiskSpeech = formatSpokenBriefing(highRiskReport, { style: "concise" });
assert.ok(highRiskSpeech.includes("Alert! My investigation determined this is HIGH RISK"), "Must contain high risk alert");
assert.ok(highRiskSpeech.includes("risk score of 95 out of 100"), "Must state numeric risk score");
assert.ok(highRiskSpeech.includes("upfront fee demand"), "Must state top red flags");
assert.ok(highRiskSpeech.includes("Would you like me to inspect another message"), "Must include conversational follow-up");
console.log("✓ High Risk spoken briefing verified");

// 2. Likely Safe Report
const safeReport: InvestigationReportData = {
  verdict: "LIKELY SAFE",
  riskScore: 10,
  redFlags: [],
  recommendation: "Proceed normally with routine caution.",
};

const safeSpeech = formatSpokenBriefing(safeReport);
assert.ok(safeSpeech.includes("Good news"), "Must contain safe reassurance");
assert.ok(safeSpeech.includes("risk score of 10 out of 100"), "Must state score");
console.log("✓ Likely Safe spoken briefing verified");

// 3. Detailed style with web evidence
const suspiciousReport: InvestigationReportData = {
  verdict: "SUSPICIOUS",
  riskScore: 60,
  redFlags: ["unverified sender domain"],
  evidence: [{ title: "User complaints on Reddit scam forum" }],
  recommendation: "Verify sender independently.",
};

const detailedSpeech = formatSpokenBriefing(suspiciousReport, { style: "detailed" });
assert.ok(detailedSpeech.includes("Caution advised"), "Must contain suspicious caution");
assert.ok(detailedSpeech.includes("Web evidence reports"), "Must include web evidence");
console.log("✓ Detailed style with evidence verified");

console.log("=== All Spoken Briefing Tests Passed ===");
