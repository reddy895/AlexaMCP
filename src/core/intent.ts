export type UserIntent =
  | "DIRECT_REASONING"
  | "KNOWLEDGE_RETRIEVAL"
  | "REPOSITORY_INSPECTION"
  | "ERROR_ANALYSIS"
  | "MEMORY_OPERATION"
  | "SYSTEM_STATUS"
  | "INVESTIGATION"
  | "CONSEQUENTIAL_ACTION";

export interface QueryClassification {
  intent: UserIntent;
  confidence: number;
  recommendedTools: string[];
  requiresConfirmation: boolean;
  explanation: string;
}

export function classifyQueryIntent(rawQuery: string): QueryClassification {
  const query = rawQuery.trim().toLowerCase();

  // 1. Consequential / Mutating actions
  if (
    /(delete all|remove memory|drop table|modify|overwrite|confirm before|make changes|execute action)/i.test(query)
  ) {
    return {
      intent: "CONSEQUENTIAL_ACTION",
      confidence: 0.9,
      recommendedTools: ["manage_memory"],
      requiresConfirmation: true,
      explanation: "Request involves data modification or explicit confirmation requirement.",
    };
  }

  // 2. Memory operations
  if (
    /(remember|what did i ask you to remember|recall preference|store preference|my preferences|save preference|forget preference)/i.test(
      query
    )
  ) {
    return {
      intent: "MEMORY_OPERATION",
      confidence: 0.95,
      recommendedTools: ["manage_memory"],
      requiresConfirmation: false,
      explanation: "Request queries or updates scoped persistent user memory.",
    };
  }

  // 3. System status / tool discovery
  if (
    /(what tools are available|list tools|system status|health check|service health|diagnostics|are you running)/i.test(
      query
    )
  ) {
    return {
      intent: "SYSTEM_STATUS",
      confidence: 0.95,
      recommendedTools: ["get_system_status"],
      requiresConfirmation: false,
      explanation: "Request asks for active tools, capabilities, or system operational status.",
    };
  }

  // 4. Error analysis
  if (
    /(find the root cause|analyze this error|stack trace|typeerror|referenceerror|unhandledrejection|failed test|debug error|exception)/i.test(
      query
    )
  ) {
    return {
      intent: "ERROR_ANALYSIS",
      confidence: 0.9,
      recommendedTools: ["analyze_error"],
      requiresConfirmation: false,
      explanation: "Request presents an error, log snippet, or stack trace for root cause analysis.",
    };
  }

  // 5. Repository inspection
  if (
    /(how my project works|structure of this repository|inspect repository|project files|codebase structure|what dependencies|package\.json|repo structure)/i.test(
      query
    )
  ) {
    return {
      intent: "REPOSITORY_INSPECTION",
      confidence: 0.9,
      recommendedTools: ["inspect_repository"],
      requiresConfirmation: false,
      explanation: "Request asks to inspect workspace architecture, files, or dependencies.",
    };
  }

  // 6. Knowledge retrieval / local documents
  if (
    /(summarize these documents|search.*documentation|search.*knowledge|according to docs|find in docs|compare these two pieces|project specification)/i.test(
      query
    )
  ) {
    return {
      intent: "KNOWLEDGE_RETRIEVAL",
      confidence: 0.85,
      recommendedTools: ["search_knowledge"],
      requiresConfirmation: false,
      explanation: "Request asks to retrieve or compare information from local indexed documents.",
    };
  }

  // 7. Scam / Fraud investigation (Digital Detective backwards compatibility)
  if (
    /(is this a scam|is this legitimate|verify this offer|fraud check|phishing check|job scam|lottery winner)/i.test(
      query
    )
  ) {
    return {
      intent: "INVESTIGATION",
      confidence: 0.85,
      recommendedTools: [
        "extract_claims",
        "analyze_message",
        "inspect_url",
        "search_evidence",
        "cross_reference",
        "calculate_risk",
        "generate_investigation_report",
      ],
      requiresConfirmation: false,
      explanation: "Request asks for digital fraud or scam investigation.",
    };
  }

  // 8. Direct Reasoning (Conceptual questions, language models, math, standard QA)
  return {
    intent: "DIRECT_REASONING",
    confidence: 0.8,
    recommendedTools: [],
    requiresConfirmation: false,
    explanation: "General conceptual question answerable directly by model reasoning.",
  };
}
