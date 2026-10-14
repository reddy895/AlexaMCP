import type { AssistantResult, Citation, ExecutedToolCall, ExecutionStatus } from "./types.js";

const MISSING_INFO_INDICATORS = [
  /i don't have enough information/i,
  /information is missing/i,
  /could not find any (documents|files|records|evidence)/i,
  /no information was found/i,
  /i do not have access to/i,
  /cannot be answered from the provided documents/i,
  /insufficient information/i,
];

export interface EvidenceEvaluation {
  status: ExecutionStatus;
  missingEvidence: string[];
}

export function evaluateEvidenceSufficiency(
  answer: string,
  citations: Citation[],
  executedTools: ExecutedToolCall[]
): EvidenceEvaluation {
  const missingEvidence: string[] = [];

  // Check if any tools returned empty search or not found
  for (const tool of executedTools) {
    if (tool.toolName === "search_knowledge" && Array.isArray(tool.output) && tool.output.length === 0) {
      missingEvidence.push(`No indexed documents matched query for tool ${tool.toolName}.`);
    }
    if (tool.toolName === "manage_memory" && tool.output === null) {
      missingEvidence.push("Requested memory key was not found.");
    }
  }

  // Check if answer explicitly states missing evidence
  for (const pattern of MISSING_INFO_INDICATORS) {
    if (pattern.test(answer)) {
      missingEvidence.push("Model indicated that sufficient evidence was not available to answer fully.");
      break;
    }
  }

  if (missingEvidence.length > 0 && citations.length === 0) {
    return {
      status: "missing_information",
      missingEvidence,
    };
  }

  return {
    status: "success",
    missingEvidence: [],
  };
}

export function finalizeAssistantResult(result: AssistantResult): AssistantResult {
  const evaluation = evaluateEvidenceSufficiency(
    result.answer,
    result.citations,
    result.executedTools
  );

  if (evaluation.status === "missing_information" && result.status === "success") {
    return {
      ...result,
      status: "missing_information",
      missingEvidence: evaluation.missingEvidence,
    };
  }

  return result;
}
