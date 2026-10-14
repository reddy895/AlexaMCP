import { createHmac } from "node:crypto";
import { ConfirmationRequiredError } from "../core/errors.js";
import type { ProposedAction, ExecutionContext } from "../core/types.js";

const CONFIRMATION_SECRET = process.env.CONFIRMATION_SECRET || "alexa-mcp-internal-action-key";

export type ToolEffectClass = "read_only" | "locally_mutating" | "externally_consequential";

export interface ToolEffectMetadata {
  effectClass: ToolEffectClass;
  requiresExplicitConfirmation: boolean;
  resourcePattern?: string;
}

export function generateConfirmationToken(actionId: string, resource: string): string {
  return createHmac("sha256", CONFIRMATION_SECRET)
    .update(`${actionId}:${resource}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyConfirmationToken(token: string, actionId: string, resource: string): boolean {
  if (!token) return false;
  const expected = generateConfirmationToken(actionId, resource);
  return token === expected;
}

export function assertActionConfirmed(
  action: ProposedAction,
  context: ExecutionContext
): void {
  if (!action.requiresConfirmation) {
    return;
  }

  const token = context.confirmationToken;
  if (!token || !verifyConfirmationToken(token, action.actionId, action.resource)) {
    throw new ConfirmationRequiredError(
      `Action "${action.description}" on resource "${action.resource}" requires explicit confirmation.`,
      {
        actionId: action.actionId,
        resource: action.resource,
        payload: action.payload,
        confirmationToken: generateConfirmationToken(action.actionId, action.resource),
      }
    );
  }
}
