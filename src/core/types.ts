export type ExecutionStatus =
  | "success"
  | "partial_success"
  | "missing_information"
  | "confirmation_required"
  | "cancelled"
  | "failure";

export interface Citation {
  sourceId: string;
  title: string;
  excerpt: string;
  location?: string;
  score?: number;
}

export interface ExecutedToolCall {
  toolName: string;
  args: Record<string, unknown>;
  status: "success" | "error";
  output: unknown;
  outputSummary: string;
  durationMs: number;
}

export interface ProposedAction {
  actionId: string;
  description: string;
  resource: string;
  payload: Record<string, unknown>;
  requiresConfirmation: boolean;
}

export interface AssistantMetadata {
  durationMs: number;
  stepsCount: number;
  modelUsed?: string;
  intent?: string;
}

export interface AssistantResult {
  status: ExecutionStatus;
  answer: string;
  citations: Citation[];
  executedTools: ExecutedToolCall[];
  missingEvidence?: string[];
  proposedAction?: ProposedAction;
  metadata: AssistantMetadata;
}

export interface AssistantRequest {
  query: string;
  requestId?: string;
  scope?: string;
  userId?: string;
  confirmationToken?: string;
  maxSteps?: number;
  timeoutMs?: number;
}

export interface ExecutionContext {
  requestId: string;
  userId?: string;
  scope: string;
  deadlineMs: number;
  abortSignal: AbortSignal;
  confirmationToken?: string;
  isConfirmed(actionId: string): boolean;
  checkDeadline?(): void;
}
